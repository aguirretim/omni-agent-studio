# Session Current

Display the current active session status.

Check for an active session file at `.claude/sessions/.current-session`. If none exists, notify the user and guide them to create one via `/project:session-start`.

**Active Session Display:**
When a session is present, output includes:
- Session identifier and associated filename
- Time elapsed since the session began
- Recent activity log entries
- Current objectives or tasks
- Reference to usable commands

**Design Principle:**
Keep output concise and informative, avoiding unnecessary verbosity while ensuring users have essential context about their work session.
