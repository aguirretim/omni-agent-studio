# Session End

Conclude the current development session with a comprehensive wrap-up.

Check for an active session file at `.claude/sessions/.current-session`. If one exists, generate a wrap-up document capturing:

**Session Metrics & Changes:**
- Total files changed (added/modified/deleted)
- Detailed breakdown of each modified file and its change type
- Total number of commits created

**Work Completion:**
- Total tasks completed/remaining
- Specific lists of finished items
- Outstanding work with current status indicators

**Development Details:**
- Accomplishments and implemented features
- Encountered obstacles with their resolutions
- Breaking changes
- Dependency modifications
- Configuration adjustments
- Deployment actions taken

**Knowledge Transfer:**
Documentation thorough enough that another developer (or AI) can understand everything that happened without reading the entire session, plus lessons learned and guidance for future contributors.

**Cleanup:**
Upon completion, clear the active session file (not delete it), then confirm proper documentation to the user.

Summary: $ARGUMENTS
