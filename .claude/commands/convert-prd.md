# Convert PRD — Markdown to prd.json

Convert a markdown Product Requirements Document into the structured prd.json format required by the Ralph autonomous development loop.

## Your Task

1. Read the markdown PRD provided in `$ARGUMENTS` (or ask the user to paste it if no argument given)
2. Extract:
   - Branch name (look for a "Branch:" line or derive from the feature title as `ralph/kebab-case-name`)
   - All user stories with their IDs, titles, descriptions, and implied priority order
3. Output the prd.json to the project root

## prd.json Schema

```json
{
  "branchName": "ralph/feature-name",
  "stories": [
    {
      "id": "S1",
      "title": "Story title — short verb phrase",
      "description": "Full description including acceptance criteria from the markdown",
      "passes": false,
      "priority": 1
    }
  ]
}
```

## Rules

- All stories start with `"passes": false`
- `priority` is an integer: 1 = highest priority (implement first)
- Keep descriptions comprehensive — an AI agent will read these with no other context
- Branch name format: `ralph/[feature-name-in-kebab-case]`
- Write the file to `{projectRoot}/prd.json`
- After writing, confirm: "prd.json written with N stories. Run `/ralph` to start the autonomous loop."
