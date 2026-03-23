---
model: claude-opus-4-1
---

A comprehensive Test-Driven Development framework organized into six phases enforcing strict red-green-refactor discipline through coordinated agent orchestration.

## Core Requirements

- All tests written before implementation
- Minimum 80% line coverage
- Minimum 75% branch coverage
- 100% coverage for critical paths

## Phase 1: Test Specification and Architecture Design

Use agents: architect-review, test-automator

- Analyze requirements and define test architecture
- Design test structure before any implementation
- Establish coverage goals and test strategy

## Phase 2: RED Phase — Write Failing Tests

Write tests that fail initially. Do not proceed until all tests fail appropriately.

- Write unit tests for each requirement
- Write integration tests for component interactions
- Verify all tests fail before proceeding

## Phase 3: GREEN Phase — Minimal Implementation

Focus ONLY on making tests green. Do not add extra features or optimizations.

- Write minimal code to pass each test
- Verify all tests pass before proceeding
- No premature optimization

## Phase 4: REFACTOR Phase — Quality Improvements

Maintain green tests throughout all refactoring.

Refactoring triggers:
- Cyclomatic complexity thresholds exceeded
- Method length limits exceeded
- Duplicate code detected

## Phase 5: Integration Testing

- Write integration tests covering component interactions
- Verify end-to-end behavior

## Phase 6: Continuous Improvement

- Track coverage progression
- Measure defect escape rates
- Monitor phase timing

## Development Modes

- **Incremental**: One test at a time
- **Suite-based**: All tests before implementation

## Anti-Patterns to Avoid

- Writing implementation before tests
- Modifying tests to make them pass
- Skipping the refactor phase
- Over-engineering during GREEN phase

Feature/requirement: $ARGUMENTS
