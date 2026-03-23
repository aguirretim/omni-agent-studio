# Session Update

Update the current development session with a timestamped progress entry.

Check for `.claude/sessions/.current-session` to locate an active session. If none exists, direct users to start one via `/project:session-start`. When a session is found, append an entry containing:

**Required Entry Components:**
- Timestamp notation
- User-provided updates or automatic activity summaries
- Git repository status (modified/added/deleted files, branch, commit hash)
- Task tracking metrics (completed, in-progress, pending counts)
- Newly accomplished tasks
- Encountered obstacles and their resolutions
- Implementation details

**Format:** Structured sections for summaries, git modifications, todo metrics, and technical specifics. Updates remain focused while maintaining sufficient detail for future project context.

This methodology ensures development sessions maintain clear, retrievable documentation of progress, changes, and blockers throughout project lifecycles.

Update notes: $ARGUMENTS
