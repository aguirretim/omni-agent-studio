# Incident Commander

Comprehensive incident response framework for technology teams.

## Core Tools

### 1. Incident Classifier
Analyzes incidents and outputs:
- Severity level (SEV1-SEV4)
- Recommended response teams
- Initial response actions

### 2. Timeline Reconstructor
Processes timestamped events to create coherent incident narratives from scattered logs.

### 3. PIR Generator
Creates post-incident review documents using multiple root cause analysis frameworks.

## Severity Classification

| Level | Description | Response Time |
|-------|-------------|---------------|
| SEV1 (Critical) | Complete service failure affecting all users or critical business functions | Immediate — establish war room, executive notification |
| SEV2 (Major) | Significant degradation impacting subset of users | Within 15 minutes |
| SEV3 (Minor) | Limited impact with available workarounds | Within 2 hours |
| SEV4 (Low) | Cosmetic issues, non-critical problems | Standard development cycle |

## Incident Commander Responsibilities

- Command and control authority (scales with severity)
- Serve as communication hub between teams
- Manage incident process and timeline
- Lead post-incident activities
- Bias toward action over analysis during emergencies

## Communication Framework

Pre-built templates for:
- Initial notifications (per severity level)
- Executive summaries
- Customer communications
- Stakeholder updates (frequency varies by severity)

## Response Workflows

### Initial Response
1. Classify severity using Incident Classifier
2. Establish communication channel
3. Assemble response team
4. Initiate customer communication if SEV1/SEV2

### Active Incident Management
1. Regular status updates to stakeholders
2. Coordinate technical responders
3. Track timeline of actions
4. Make escalation decisions
5. Authorize emergency changes

### Resolution
1. Confirm service restored
2. Send all-clear communication
3. Begin postmortem scheduling

## Post-Incident Review (PIR)

**Blameless Culture:**
- Focus on systems and processes, not individuals
- "Five Whys" and other RCA frameworks
- Action items with assigned owners and deadlines
- Pattern recognition across incidents for organizational learning

**PIR Document Sections:**
- Incident summary and timeline
- Root cause analysis
- Contributing factors
- Resolution steps taken
- Action items (prevention, detection, response improvements)
- Lessons learned

## Dynamic Runbook Generation

Framework generates runbooks with three components:
- Detection criteria and alerting
- Response procedures
- Recovery steps
