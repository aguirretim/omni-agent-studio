# Code Reviewer

Automated code review tools for analyzing pull requests, detecting code quality issues, and generating review reports.

---

## Tools

### PR Analyzer

Analyzes git diff between branches to assess review complexity and identify risks.

**What it detects:**
- Hardcoded secrets (passwords, API keys, tokens)
- SQL injection patterns (string concatenation in queries)
- Debug statements (debugger, console.log)
- ESLint rule disabling
- TypeScript `any` types
- TODO/FIXME comments

**Output includes:**
- Complexity score (1-10)
- Risk categorization (critical, high, medium, low)
- File prioritization for review order
- Commit message validation

---

### Code Quality Checker

Analyzes source code for structural issues, code smells, and SOLID violations.

**What it detects:**
- Long functions (>50 lines)
- Large files (>500 lines)
- God classes (>20 methods)
- Deep nesting (>4 levels)
- Too many parameters (>5)
- High cyclomatic complexity
- Missing error handling
- Unused imports
- Magic numbers

**Thresholds:**

| Issue | Threshold |
|-------|-----------|
| Long function | >50 lines |
| Large file | >500 lines |
| God class | >20 methods |
| Too many params | >5 |
| Deep nesting | >4 levels |
| High complexity | >10 branches |

---

### Review Report Generator

Combines PR analysis and code quality findings into structured review reports.

**Report includes:**
- Review verdict (approve, request changes, block)
- Score (0-100)
- Prioritized action items
- Issue summary by severity
- Suggested review order

**Verdicts:**

| Score | Verdict |
|-------|---------|
| 90+ with no high issues | Approve |
| 75+ with ≤2 high issues | Approve with suggestions |
| 50-74 | Request changes |
| <50 or critical issues | Block |

---

## Reference Guides

### Code Review Checklist
Systematic checklists covering:
- Pre-review checks (build, tests, PR hygiene)
- Correctness (logic, data handling, error handling)
- Security (input validation, injection prevention)
- Performance (efficiency, caching, scalability)
- Maintainability (code quality, naming, structure)
- Testing (coverage, quality, mocking)
- Language-specific checks

### Coding Standards
Language-specific standards for TypeScript, JavaScript, Python, Go, Swift, Kotlin.

### Common Antipatterns
Antipattern catalog with examples and fixes:
- Structural (god class, long method, deep nesting)
- Logic (boolean blindness, stringly typed code)
- Security (SQL injection, hardcoded credentials)
- Performance (N+1 queries, unbounded collections)
- Testing (duplication, testing implementation)
- Async (floating promises, callback hell)

---

## Languages Supported

| Language | Extensions |
|----------|------------|
| Python | `.py` |
| TypeScript | `.ts`, `.tsx` |
| JavaScript | `.js`, `.jsx`, `.mjs` |
| Go | `.go` |
| Swift | `.swift` |
| Kotlin | `.kt`, `.kts` |
