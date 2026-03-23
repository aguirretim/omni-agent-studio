@echo off
cd /d "C:\Users\aguir\OneDrive\Documents\omni-agent-studio"
where gemini >nul 2>nul || (echo gemini is not installed. Auto-installing... && npm install -g @google/gemini-cli)
gemini