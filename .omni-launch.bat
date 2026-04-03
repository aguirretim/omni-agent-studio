@echo off
cd /d "C:\Users\aguir\OneDrive\Documents\omni-agent-studio"
where openclaude >nul 2>nul || (echo openclaude is not installed. Auto-installing... && npm install -g @gitlawb/openclaude)
openclaude