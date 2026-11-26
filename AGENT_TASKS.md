# Agent Team Tasks — MiroFish Localization to English
Status: IN PROGRESS
Date: 2026-04-14

## Selected Skills
- `/refactor-clean` — mechanical translation of comments/strings across 30+ files
- `/commit` — final step after all translations verified

## Task List

### Phase 1 — Instant (lead does inline)
- [x] frontend/src/i18n/index.js — change default locale 'zh' → 'en' + fallback 'zh' → 'en'

### Phase 2 — Backend Python translation (parallel agents)
- [ ] [agent-backend-api] Translate: app/api/*.py + app/config.py + app/__init__.py + run.py
- [ ] [agent-backend-models-utils] Translate: app/models/*.py + app/utils/*.py
- [ ] [agent-backend-services-1] Translate: app/services/graph_builder.py + oasis_profile_generator.py + ontology_generator.py + report_agent.py + simulation_config_generator.py
- [ ] [agent-backend-services-2] Translate: app/services/simulation_ipc.py + simulation_manager.py + simulation_runner.py + text_processor.py + zep_entity_reader.py + zep_graph_memory_updater.py + zep_tools.py
- [ ] [agent-backend-scripts] Translate: backend/scripts/*.py

### Phase 3 — Rebuild container
- [ ] Rebuild Docker image so translated backend is live

## Contract
Each agent: translate ALL Chinese (中文) text in assigned files to natural English.
Scope: comments, docstrings, log messages, error strings, dict keys/values that are UI-facing.
Do NOT change logic, variable names, or function signatures.
