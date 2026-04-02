# Create PRD — Product Requirements Document Generator

Given a task or feature description, produce a detailed PRD with right-sized user stories for the Ralph autonomous development loop.

## Your Task

1. Analyze the provided description: `$ARGUMENTS`
2. Break it into **right-sized user stories** — each story must:
   - Fit within a single AI context window (~2000 lines of code changes max)
   - Be independently testable
   - Have a clear pass/fail definition
   - Examples of good sizes: "Add X column to Y table", "Create Z component", "Wire up A endpoint"
   - Examples too large: "Build the entire dashboard", "Refactor all services"
3. Order stories by dependency (things that must be built first get priority 1, 2, etc.)
4. Output a markdown PRD followed by a `prd.json` code block

## Output Format

First, write a readable markdown PRD:

```
# PRD: [Feature Name]

## Overview
[2-3 sentence description]

## Branch
ralph/[kebab-case-feature-name]

## User Stories

### S1: [Story Title] (Priority 1)
**As a** [user type], **I want** [goal], **so that** [benefit].

**Acceptance Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2

**Implementation hints:** [optional: files to modify, patterns to follow]

---
[repeat for each story]
```

Then output the machine-readable prd.json:

```json
{
  "branchName": "ralph/[kebab-case-feature-name]",
  "stories": [
    {
      "id": "S1",
      "title": "[Story Title]",
      "description": "[Full story description including acceptance criteria]",
      "passes": false,
      "priority": 1
    }
  ]
}
```

## Tips for Good PRDs

- 3–8 stories is the sweet spot for most features
- Database/schema changes first (priority 1), then backend, then UI
- Each story title should be a verb phrase: "Add X", "Create Y", "Wire up Z"
- Description should include enough context for an AI agent with no prior knowledge
- If the task is already small enough for one story, one story is fine
