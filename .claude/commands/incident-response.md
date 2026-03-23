---
model: claude-opus-4-1
---

Manage production incident using specialized agents with explicit Task tool invocations:

[Extended thinking: Speed is critical in early phases — parallel agent execution where possible. All actions should be safe and reversible.]

## Phase 1: Immediate Response

### Step 1: Incident Assessment
- Use Task tool with subagent_type="incident-responder"
- Prompt: "Assess severity and impact of incident: $ARGUMENTS. Identify affected systems, user impact, and initial symptoms."

### Step 2: Initial Troubleshooting
- Use Task tool with subagent_type="devops-troubleshooter"
- Prompt: "Investigate infrastructure and deployment issues for: $ARGUMENTS. Check logs, metrics, and recent deployments."

## Phase 2: Root Cause Analysis

### Step 3: Debug Analysis
- Use Task tool with subagent_type="debugger"
- Prompt: "Analyze root cause for incident: $ARGUMENTS. Review error logs, stack traces, and code paths."

### Step 4: Performance Evaluation (if performance-related)
- Use Task tool with subagent_type="performance-engineer"
- Prompt: "Profile performance degradation for: $ARGUMENTS. Identify bottlenecks and resource exhaustion."

### Step 5: Database Investigation (if data-related)
- Use Task tool with subagent_type="database-optimizer"
- Prompt: "Investigate database issues for: $ARGUMENTS. Check slow queries, locks, and connection pool exhaustion."

## Phase 3: Resolution

### Step 6: Fix Design
- Use Task tool with subagent_type="backend-architect"
- Prompt: "Design emergency fix for incident: $ARGUMENTS. Ensure fix is safe for immediate production deployment."

### Step 7: Emergency Deployment
- Use Task tool with subagent_type="deployment-engineer"
- Prompt: "Deploy emergency fix for: $ARGUMENTS. Include rollback procedure and deployment verification steps."

## Phase 4: Stabilization

### Step 8: System Recovery Monitoring
- Monitor system metrics post-fix
- Verify incident is resolved

### Step 9: Security Review (if security-related)
- Use Task tool with subagent_type="security-auditor"
- Prompt: "Review security implications of incident: $ARGUMENTS. Assess breach scope and hardening needed."

## Phase 5: Post-Incident Activities

### Step 10: Enhanced Monitoring
- Implement monitoring improvements to prevent recurrence

### Step 11: Regression Testing
- Use Task tool with subagent_type="test-automator"
- Prompt: "Create regression tests for incident: $ARGUMENTS. Prevent future recurrence."

### Step 12: Blameless Postmortem
- Document timeline, root cause, resolution, and lessons learned
- Focus on improvement, not blame
- Create action items with owners

## Coordination Notes

- Speed is critical in early phases — parallel agent execution where possible
- All fixes must be safe and reversible
- Maintain clear communication throughout
- Document all actions taken

Incident: $ARGUMENTS
