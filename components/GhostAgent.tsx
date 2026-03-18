'use client';

import { useState, useRef, useEffect } from 'react';
import { Activity, Send, Loader2 } from 'lucide-react';

interface GhostAgentProps {
  projectPath: string;
  setSyncStatus: (msg: string | null) => void;
}

export default function GhostAgent({ projectPath, setSyncStatus }: GhostAgentProps) {
  const [ghostPrompt, setGhostPrompt] = useState('');
  const [ghostModel, setGhostModel] = useState('gemini');
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll output
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [output]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectPath || !ghostPrompt.trim()) return;

    setIsRunning(true);
    setOutput('');
    setSyncStatus(`Running ${ghostModel} task...`);

    try {
      const res = await fetch('/api/ghost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: ghostModel, prompt: ghostPrompt, projectPath }),
      });

      if (!res.ok) {
        let errorMsg = res.statusText;
        try {
          const data = await res.json();
          if (data.error) errorMsg = data.error;
        } catch {}
        setOutput(`Error: ${errorMsg}`);
        setSyncStatus('Background task failed');
        return;
      }

      if (!res.body) throw new Error('ReadableStream not supported');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setOutput(prev => prev + chunk);
      }

      setSyncStatus('Background task completed');
    } catch {
      setOutput(prev => prev + '\n\nNetwork error communicating with background agent');
      setSyncStatus('Background task failed');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="bg-[#18181b] border border-[#27272a] rounded-xl flex flex-col overflow-hidden shadow-sm">
      {/* Header */}
      <div className="h-10 border-b border-[#27272a] bg-[#121214] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
          <Activity size={15} className="text-violet-400" />
          Quick Task (Headless)
        </div>
        <select
          value={ghostModel}
          onChange={(e) => setGhostModel(e.target.value)}
          className="bg-[#09090b] border border-[#27272a] rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-zinc-500"
        >
          <option value="gemini">Gemini</option>
          <option value="claude">Claude</option>
          <option value="opencode">Open Code</option>
          <option value="codex">OpenAI Codex</option>
        </select>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col p-3 gap-3 bg-[#09090b] min-h-[200px]">
        <div
          ref={scrollRef}
          className="flex-1 bg-[#18181b] border border-[#27272a] rounded overflow-y-auto p-3 text-xs font-mono text-zinc-400 min-h-[120px] max-h-[300px]"
        >
          {output ? (
            <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed">{output}</pre>
          ) : (
            <div className="h-full flex items-center justify-center text-zinc-600 opacity-50">
              Background agent console waiting for task...
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2 shrink-0">
          <input
            type="text"
            placeholder="Enter prompt for the background agent (e.g., 'Research XYZ and add to context')..."
            className="flex-1 bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-violet-500/50"
            value={ghostPrompt}
            onChange={(e) => setGhostPrompt(e.target.value)}
            disabled={isRunning || !projectPath}
          />
          <button
            type="submit"
            disabled={isRunning || !projectPath || !ghostPrompt.trim()}
            className="bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/20 px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 disabled:hover:bg-violet-500/10 shrink-0"
          >
            {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Run Task
          </button>
        </form>
      </div>
    </div>
  );
}
