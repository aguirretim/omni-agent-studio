const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const PORT = 4007;
const OAUTH_PATH = path.join(os.homedir(), '.gemini', 'oauth_creds.json');

// Helper to get active access token, refreshing if needed
function getAccessToken() {
  if (!fs.existsSync(OAUTH_PATH)) {
    throw new Error(`OAuth credentials not found at ${OAUTH_PATH}. Please run "gemini" in a terminal to log in.`);
  }
  
  let oauth = JSON.parse(fs.readFileSync(OAUTH_PATH, 'utf8'));
  const isExpired = oauth.expiry_date && (Date.now() > oauth.expiry_date - 300000); // 5 min buffer
  
  if (isExpired && oauth.refresh_token) {
    console.log('[Proxy] Token expired or expiring soon, refreshing via gemini CLI...');
    try {
      execSync('gemini -p "READY"', { stdio: 'ignore', timeout: 8000 });
      oauth = JSON.parse(fs.readFileSync(OAUTH_PATH, 'utf8'));
      console.log('[Proxy] Token refreshed successfully.');
    } catch (err) {
      console.error('[Proxy] Failed to refresh token via CLI:', err.message);
    }
  }
  return oauth.access_token;
}

// Recursive helper to clean JSON Schema to only keys supported by Gemini API
function cleanSchema(schema) {
  if (!schema || typeof schema !== 'object') return schema;
  
  const allowedKeys = ['type', 'format', 'description', 'nullable', 'properties', 'required', 'items', 'enum'];
  const cleaned = {};
  
  for (const key of allowedKeys) {
    if (schema[key] !== undefined) {
      if (key === 'properties' && typeof schema.properties === 'object') {
        cleaned.properties = {};
        for (const [propName, propSchema] of Object.entries(schema.properties)) {
          cleaned.properties[propName] = cleanSchema(propSchema);
        }
      } else if (key === 'items' && typeof schema.items === 'object') {
        cleaned.items = cleanSchema(schema.items);
      } else {
        cleaned[key] = schema[key];
      }
    }
  }
  
  return cleaned;
}

// Map OpenAI messages to Gemini format
function mapMessages(openaiMessages) {
  const contents = [];
  let systemInstructionText = '';

  for (const msg of openaiMessages) {
    if (msg.role === 'system') {
      systemInstructionText += (systemInstructionText ? '\n' : '') + msg.content;
      continue;
    }

    const parts = [];
    if (msg.content && msg.role !== 'tool') {
      if (typeof msg.content === 'string') {
        parts.push({ text: msg.content });
      } else if (Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if (typeof part === 'string') {
            parts.push({ text: part });
          } else if (part && typeof part === 'object') {
            if (part.type === 'text' && typeof part.text === 'string') {
              parts.push({ text: part.text });
            }
          }
        }
      }
    }

    // Map tool calls from assistant to Gemini functionCall
    if (msg.tool_calls && Array.isArray(msg.tool_calls)) {
      for (const tc of msg.tool_calls) {
        if (tc.type === 'function' && tc.function) {
          let args = {};
          try {
            args = JSON.parse(tc.function.arguments || '{}');
          } catch {}
          parts.push({
            functionCall: {
              name: tc.function.name,
              args: args
            }
          });
        }
      }
    }

    // Map tool responses to Gemini functionResponse
    if (msg.role === 'tool') {
      let outputObj = { output: msg.content };
      try {
        outputObj = JSON.parse(msg.content);
        if (typeof outputObj !== 'object' || outputObj === null) {
          outputObj = { output: msg.content };
        }
      } catch {}
      parts.push({
        functionResponse: {
          name: msg.name || 'tool_call',
          response: outputObj
        }
      });
    }

    contents.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: parts
    });
  }

  const result = { contents };
  if (systemInstructionText) {
    result.systemInstruction = {
      role: 'user',
      parts: [{ text: systemInstructionText }]
    };
  }
  return result;
}

// Map OpenAI tools to Gemini format
function mapTools(openaiTools) {
  if (!openaiTools || !Array.isArray(openaiTools)) return undefined;
  
  const functionDeclarations = [];
  for (const t of openaiTools) {
    if (t.type === 'function' && t.function) {
      functionDeclarations.push({
        name: t.function.name,
        description: t.function.description || '',
        parameters: cleanSchema(t.function.parameters)
      });
    }
  }
  
  return functionDeclarations.length > 0 ? [{ functionDeclarations }] : undefined;
}

// Map Gemini response content to OpenAI chunk/format
function mapGeminiCandidate(candidate, isStream = false) {
  const choice = {
    index: 0,
    finish_reason: candidate.finishReason === 'STOP' ? 'stop' : (candidate.finishReason === 'MAX_TOKENS' ? 'length' : null)
  };

  const delta = {};
  const message = { role: 'assistant' };

  if (candidate.content && candidate.content.parts) {
    let text = '';
    const toolCalls = [];

    for (const part of candidate.content.parts) {
      if (part.text) {
        text += part.text;
      }
      if (part.functionCall) {
        toolCalls.push({
          id: 'call_' + Math.random().toString(36).substr(2, 9),
          type: 'function',
          function: {
            name: part.functionCall.name,
            arguments: JSON.stringify(part.functionCall.args || {})
          }
        });
      }
    }

    if (text) {
      if (isStream) delta.content = text;
      else message.content = text;
    }

    if (toolCalls.length > 0) {
      if (isStream) delta.tool_calls = toolCalls;
      else message.tool_calls = toolCalls;
    }
  }

  if (isStream) {
    choice.delta = delta;
    return choice;
  } else {
    choice.message = message;
    return choice;
  }
}

const server = http.createServer(async (req, res) => {
  console.log(`[Proxy] ${req.method} ${req.url}`);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Handle Model list
  if (req.method === 'GET' && (req.url === '/v1/models' || req.url === '/v1beta/openai/models')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      object: 'list',
      data: [
        { id: 'gemini-2.5-flash', object: 'model', created: 1717977600, owned_by: 'google' },
        { id: 'gemini-2.5-pro', object: 'model', created: 1717977600, owned_by: 'google' }
      ]
    }));
    return;
  }

  // Handle Chat Completions
  if (req.method === 'POST' && (req.url === '/v1/chat/completions' || req.url === '/v1beta/openai/chat/completions')) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const token = getAccessToken();
        
        // Map model name: default to gemini-2.5-flash which is supported
        let targetModel = 'gemini-2.5-flash';
        if (payload.model && payload.model.includes('pro')) {
          targetModel = 'gemini-2.5-pro';
        }

        const mappedPayload = {
          model: targetModel,
          project: 'bright-mission-bzftk', // The default CLI project ID
          request: mapMessages(payload.messages || [])
        };

        const tools = mapTools(payload.tools);
        if (tools) {
          mappedPayload.request.tools = tools;
        }

        const isStream = payload.stream === true;
        const endpoint = isStream ? 'streamGenerateContent' : 'generateContent';
        
        console.log(`[Proxy] Forwarding to Cloud Code API (${endpoint}, model: ${targetModel})...`);

        let apiRes;
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
          apiRes = await fetch(`https://cloudcode-pa.googleapis.com/v1internal:${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(mappedPayload)
          });
          
          if (apiRes.status === 429) {
            attempts++;
            let retryDelay = 5000; // default 5 seconds
            try {
              const cloneRes = apiRes.clone();
              const errJson = await cloneRes.json();
              const message = errJson[0]?.error?.message || errJson.error?.message || '';
              const match = message.match(/reset after (\d+)\s*s/i);
              if (match && match[1]) {
                retryDelay = (parseInt(match[1], 10) + 1) * 1000;
              }
            } catch {}
            
            console.log(`[Proxy] Rate limited (429). Retrying in ${retryDelay / 1000}s (attempt ${attempts}/${maxAttempts})...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            continue;
          }
          
          break;
        }

        if (!apiRes.ok) {
          const errText = await apiRes.text();
          console.error('[Proxy] API error:', apiRes.status, errText);
          res.writeHead(apiRes.status, { 'Content-Type': 'application/json' });
          res.end(errText);
          return;
        }

        const createdTime = Math.floor(Date.now() / 1000);
        const reqId = 'chatcmpl-' + Math.random().toString(36).substr(2, 16);

        if (!isStream) {
          const apiJson = await apiRes.json();
          const candidate = apiJson.response?.candidates?.[0] || { finishReason: 'STOP' };
          const choice = mapGeminiCandidate(candidate, false);

          const responsePayload = {
            id: reqId,
            object: 'chat.completion',
            created: createdTime,
            model: targetModel,
            choices: [choice],
            usage: {
              prompt_tokens: apiJson.response?.usageMetadata?.promptTokenCount || 0,
              completion_tokens: apiJson.response?.usageMetadata?.candidatesTokenCount || 0,
              total_tokens: apiJson.response?.usageMetadata?.totalTokenCount || 0
            }
          };

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(responsePayload));
        } else {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          });

          const reader = apiRes.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          // Stream parser for Google's streaming JSON array format
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            
            // Clean up the stream array characters ([, ], ,) to parse individual objects
            let match;
            // Matches any valid JSON object representing a chunk response
            while (true) {
              buffer = buffer.trim();
              if (buffer.startsWith('[')) {
                buffer = buffer.slice(1).trim();
              }
              if (buffer.startsWith(',')) {
                buffer = buffer.slice(1).trim();
              }
              if (buffer.startsWith(']')) {
                buffer = buffer.slice(1).trim();
                break;
              }
              
              if (!buffer.startsWith('{')) {
                break; // Not enough data or malformed
              }

              // Find matching closing brace
              let braceCount = 0;
              let inString = false;
              let escapeNext = false;
              let endIndex = -1;

              for (let i = 0; i < buffer.length; i++) {
                const char = buffer[i];
                if (escapeNext) {
                  escapeNext = false;
                  continue;
                }
                if (char === '\\') {
                  escapeNext = true;
                  continue;
                }
                if (char === '"') {
                  inString = !inString;
                  continue;
                }
                if (!inString) {
                  if (char === '{') braceCount++;
                  else if (char === '}') {
                    braceCount--;
                    if (braceCount === 0) {
                      endIndex = i;
                      break;
                    }
                  }
                }
              }

              if (endIndex === -1) {
                break; // Incomplete object
              }

              const objStr = buffer.slice(0, endIndex + 1);
              buffer = buffer.slice(endIndex + 1).trim();

              try {
                const chunkJson = JSON.parse(objStr);
                const candidate = chunkJson.response?.candidates?.[0];
                if (candidate) {
                  const choice = mapGeminiCandidate(candidate, true);
                  const sseChunk = {
                    id: reqId,
                    object: 'chat.completion.chunk',
                    created: createdTime,
                    model: targetModel,
                    choices: [choice]
                  };
                  res.write(`data: ${JSON.stringify(sseChunk)}\n\n`);
                }
              } catch (parseErr) {
                console.error('[Proxy] Failed to parse stream chunk:', parseErr.message, objStr);
              }
            }
          }

          // Write final [DONE] chunk
          const finalChoice = {
            index: 0,
            delta: {},
            finish_reason: 'stop'
          };
          const finalSseChunk = {
            id: reqId,
            object: 'chat.completion.chunk',
            created: createdTime,
            model: targetModel,
            choices: [finalChoice]
          };
          res.write(`data: ${JSON.stringify(finalSseChunk)}\n\n`);
          res.write('data: [DONE]\n\n');
          res.end();
        }
      } catch (err) {
        console.error('[Proxy] Handler error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: err.message } }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log('[Proxy] Port already in use. Proxy is already running.');
    process.exit(0);
  } else {
    console.error('[Proxy] Server error:', err);
    process.exit(1);
  }
});

server.listen(PORT, () => {
  console.log(`[Proxy] Server listening on http://localhost:${PORT}`);
});

