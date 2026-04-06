# Agent Team Tasks
Status: IN PROGRESS
Date: 2026-04-06
Task: Ollama launch — auto-pull model if none installed

## Selected Skills
- `/review-pr` — review after implementation before commit
- `/commit` — final conventional commit

## Changes
- [ ] `app/api/terminal/route.ts` — replace launchOverride string with batScript/psScript maps for Ollama; generate full custom bat + ps1 that check `ollama list` and auto-pull qwen2.5-coder:7b if no models found
- [ ] `app/tools/page.tsx` — update Ollama card detail text to mention auto-pull behaviour
