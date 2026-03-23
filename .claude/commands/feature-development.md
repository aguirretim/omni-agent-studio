---
model: claude-opus-4-1
---

Implement a feature using specialized agents with explicit Task tool invocations:

[Extended thinking: This workflow orchestrates multiple specialized agents to implement features end-to-end. It supports both traditional development and TDD-driven approaches.]

## Development Mode Selection

### Traditional Development
Sequential agent execution:
1. backend-architect: Design APIs and data models
2. frontend-developer: Implement UI components using API contracts
3. test-automator: Write comprehensive test coverage
4. deployment-engineer: Prepare production environment

### TDD-Driven Development (use --tdd flag)
Test-first approach following red-green-refactor cycle strictly:
1. tdd-orchestrator: Define test specifications
2. test-automator: Write failing tests (RED phase)
3. backend-architect: Implement minimal passing code (GREEN phase)
4. frontend-developer: Implement UI with tests
5. tdd-orchestrator: Guide refactoring (REFACTOR phase)
6. deployment-engineer: Prepare environment

## Agent Execution

Each agent receives context from previous agents to ensure coherent implementation.

### Backend Architecture
- Use Task tool with subagent_type="backend-architect"
- Prompt: "Design backend architecture for feature: $ARGUMENTS. Create API contracts, data models, and service boundaries."

### Frontend Implementation
- Use Task tool with subagent_type="frontend-developer"
- Prompt: "Implement frontend for: $ARGUMENTS. Use the API contracts from backend architect. Create UI components, state management, and user flows."

### Test Coverage
- Use Task tool with subagent_type="test-automator"
- Prompt: "Write comprehensive tests for: $ARGUMENTS. Cover unit tests, integration tests, and end-to-end scenarios."

### Deployment Readiness
- Use Task tool with subagent_type="deployment-engineer"
- Prompt: "Prepare deployment configuration for: $ARGUMENTS. Include environment setup, CI/CD pipeline updates, and rollback procedures."

## Configuration Options

- **--tdd**: Enable test-driven development mode
- **--strict-tdd**: Enforce rigorous TDD cycles
- **--test-coverage-min**: Set minimum coverage threshold (default: 80%)

Feature to implement: $ARGUMENTS
