---
model: claude-opus-4-1
---

Implement security hardening using specialized agents with explicit Task tool invocations:

[Extended thinking: Security at every layer of the application stack. Security findings from each phase inform subsequent implementations.]

## Phase 1: Security Assessment

### Step 1: Security Audit
- Use Task tool with subagent_type="security-auditor"
- Prompt: "Perform comprehensive security assessment of: $ARGUMENTS. Identify vulnerabilities, OWASP Top 10 issues, and security gaps."

### Step 2: Architecture Security Review
- Use Task tool with subagent_type="architect-reviewer"
- Prompt: "Review security architecture for: $ARGUMENTS. Evaluate trust boundaries, data flow security, and isolation patterns."

## Phase 2: Implementation

### Step 3: Backend Security Hardening
- Use Task tool with subagent_type="backend-architect"
- Prompt: "Implement security hardening for backend: $ARGUMENTS. Include authentication, authorization, input validation, and secrets management."

### Step 4: Infrastructure Security
- Use Task tool with subagent_type="devops-troubleshooter"
- Prompt: "Harden infrastructure for: $ARGUMENTS. Configure access controls, network security, and secrets management."

### Step 5: Frontend Security
- Use Task tool with subagent_type="frontend-developer"
- Prompt: "Implement frontend security for: $ARGUMENTS. Add Content Security Policy, XSS prevention, and secure cookie handling."

## Phase 3: Validation

### Step 6: Compliance Verification
- Use Task tool with subagent_type="security-auditor"
- Prompt: "Verify compliance for: $ARGUMENTS. Check against OWASP Top 10, GDPR requirements, and security best practices."

### Step 7: Security Testing
- Use Task tool with subagent_type="test-automator"
- Prompt: "Create security test suite for: $ARGUMENTS. Include penetration testing scenarios, fuzzing, and authentication bypass tests."

## Phase 4: Continuous Security

### Step 8: Secure Deployment Pipeline
- Use Task tool with subagent_type="deployment-engineer"
- Prompt: "Configure secure CI/CD pipeline for: $ARGUMENTS. Include security gates, SAST/DAST scanning, and dependency vulnerability checks."

### Step 9: Monitoring and Alerting
- Configure intrusion detection
- Set up automated security alerting
- Implement continuous vulnerability scanning

## Coordination Notes

- Security findings from each phase inform subsequent implementations
- Prioritize defense in depth strategies
- All agents must prioritize security in their recommendations
- Document all security decisions

Target: $ARGUMENTS
