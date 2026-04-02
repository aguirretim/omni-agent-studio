# Agent Team Tasks
Status: IN PROGRESS
Date: 2026-04-01

## Goal
Add terminal type selector to the Agent Teams Launch tab so users can choose which terminal to use instead of relying on auto-detection.

## Selected Skills
- /commit — final step after implementation
- /review-pr — quality gate before commit

## Changes Required

### 1. app/api/agent-teams/route.ts
- destructure terminalType from body
- add terminalType override in launch-terminal handler

### 2. components/features/AgentTeams.tsx
- Add terminalType state
- Add terminal selector UI in Launch tab
- Pass terminalType in handleLaunch fetch body
