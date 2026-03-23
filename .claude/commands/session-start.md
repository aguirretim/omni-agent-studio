# Session Start

Start a new Claude Code development session by creating a timestamped markdown file in `.claude/sessions/` using the naming convention `YYYY-MM-DD-HHMM-$ARGUMENTS.md` (or `YYYY-MM-DD-HHMM.md` without arguments).

The file structure includes:
- A title with session name and timestamp
- An overview section documenting the start time
- A goals section prompting users for their intended objectives
- A progress section initially left blank for later updates

Also maintain a `.current-session` file in `.claude/sessions/` to identify which session is currently active. Users can then manage their session through:
- `/project:session-update` for progress updates
- `/project:session-end` to conclude the work

Session name: $ARGUMENTS
