============================================================
  OmniAgent Studio — Setup & Quick Start Guide
============================================================

WHAT IS THIS?
-------------
OmniAgent Studio is a dashboard that lets you run multiple
AI coding assistants (Claude, Gemini, OpenCode, Codex) from
one place, keeping them all in sync with your project.


HOW TO RUN IT
-------------
1. Double-click  run.bat
2. If Node.js is not on your computer, it will install
   automatically — you may see a security prompt, click Yes
3. Wait for the app to open in your browser (takes ~1 min
   the first time while it installs app files)
4. That's it — the app runs at http://localhost:3000

To stop the app, close the black command window that opened.
To start it again, double-click run.bat again (fast after
the first time).


REQUIREMENTS
------------
Nothing to install manually — run.bat handles everything.

If the automatic install fails (no internet, security
software blocking it), you can install Node.js manually:

  Download: https://nodejs.org/en/download
  Choose the version labelled "LTS"
  Run the installer, accept all defaults, then run run.bat again.


AI TOOLS — OPTIONAL BUT RECOMMENDED
-------------------------------------
OmniAgent Studio coordinates AI tools that must be installed
separately. Install whichever ones you want to use:

  Claude Code (Anthropic)
    npm install -g @anthropic-ai/claude-code
    Then: claude login

  Gemini CLI (Google — free with a Google account)
    npm install -g @google/gemini-cli
    Then: gemini (follow login prompt)

  Codex CLI (OpenAI — requires OpenAI account)
    npm install -g @openai/codex

  OpenCode (requires OpenAI API key)
    npm install -g opencode-ai

To run these commands, open PowerShell (search "PowerShell"
in the Windows start menu) and paste them one at a time.


FIRST-TIME SETUP IN THE APP
----------------------------
1. Open the app (run.bat)
2. On the Home page, click "Browse" and select your project folder
3. Go to "Shared Context" and fill in the template
   (describe your project — the AI tools will read this)
4. Go to "Agent Teams" to install the AI coordination skills
5. Go to "Tools" to launch AI assistants in your project


TROUBLESHOOTING
---------------
App won't start?
  - Make sure Node.js is installed
  - Try closing and re-running run.bat
  - Check that nothing else is using port 3000

npm install failed?
  - Check your internet connection
  - Temporarily disable antivirus and try again

AI tool not working?
  - Make sure you installed and logged in to that tool
  - See the AI Tools section above

Browser doesn't open automatically?
  - Manually open http://localhost:3000 in any browser


============================================================
