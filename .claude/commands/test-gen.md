# Test Generator

You are a senior engineer writing thorough, idiomatic tests. Your goal is to generate tests that will actually catch bugs — not tests that pass by construction or only verify the happy path.

**What to generate tests for:** $ARGUMENTS

If $ARGUMENTS is empty, ask the user which function, file, or module they want tested before proceeding.

---

## Step 1: Understand the project's test conventions

Before writing a single test, understand the testing stack in use.

```bash
# Detect test framework and runner
cat package.json 2>/dev/null | grep -E '"(jest|vitest|mocha|jasmine|ava|tape|@testing-library|cypress|playwright)"'
ls jest.config.* vitest.config.* .mocharc.* 2>/dev/null
# Python
ls pytest.ini setup.cfg pyproject.toml 2>/dev/null | head -3
# Rust
ls Cargo.toml 2>/dev/null
```

Read one existing test file that is closest in type to what you're about to test (unit vs. integration, same module/package):

```bash
# Find existing tests near the target file
find . -name "*.test.*" -o -name "*.spec.*" -o -name "*_test.*" -o -name "test_*.py" 2>/dev/null | grep -v node_modules | grep -v ".git" | head -10
```

Read the most relevant existing test file in full. Note:
- Import style (named imports, default, CommonJS)
- Assertion style (expect/assert/should)
- How mocks/stubs are set up (jest.mock, vi.mock, unittest.mock, sinon, etc.)
- How async tests are handled (async/await, done callbacks, Promises)
- File naming convention (co-located vs. `__tests__` folder vs. `tests/` directory)
- Whether `describe` blocks are used and how they are nested

---

## Step 2: Read the code under test

Read the target function, file, or module completely. If $ARGUMENTS is a file path, read it. If it's a function name, find and read it:

```bash
grep -r "$ARGUMENTS" --include="*.ts" --include="*.js" --include="*.py" --include="*.rs" -l . 2>/dev/null | grep -v node_modules | head -5
```

For each public function or exported symbol, identify:
1. **Signature** — inputs (types, optionality), outputs, side effects
2. **Happy path** — the normal, expected flow
3. **Error conditions** — what can go wrong? What does the function promise to do when input is invalid?
4. **Edge cases** — empty string, null/undefined, zero, negative numbers, empty array, max values, concurrent calls
5. **State dependencies** — does it depend on external state (DB, file system, network, env vars, time)?
6. **Async behavior** — does it return a Promise? Can it reject? Does it have retry logic?

---

## Step 3: Identify the test matrix

Before writing code, list the specific scenarios to cover. For each scenario, note:
- Input(s)
- Expected output or behavior
- Category: happy path / edge case / error path / boundary

Aim for coverage of:
- At least 1 happy path test per distinct code path
- Every explicit error condition documented in the code or types
- Boundary values (min, max, empty, null)
- Any interaction with external dependencies (mocked)

Do not write tests just to hit a coverage number. Every test must verify a real behavior.

---

## Step 4: Write the tests

Write tests that match the conventions discovered in Step 1 exactly — same import style, same assertion library, same mock setup pattern, same file location convention.

Structure rules:
- One `describe` block per function under test (if the project uses describe blocks)
- Descriptive test names that state the scenario and expected outcome: `"returns null when user is not found"` not `"test 2"`
- Arrange-Act-Assert structure within each test — separate setup, invocation, and assertion clearly
- Mock only external dependencies (network, DB, filesystem, time) — do not mock the code under test or its pure dependencies
- Each test should be independent: no shared mutable state between tests

For async functions, always test the rejection path:
```typescript
// Example pattern — adapt to project style
it("rejects with AuthError when token is expired", async () => {
  await expect(validateToken("expired-token")).rejects.toThrow(AuthError);
});
```

For functions with side effects (DB writes, file writes, events), verify the side effect occurred — don't just check the return value.

---

## Step 5: Write the test file

Create the test file in the correct location following the project convention discovered in Step 1. Use the Write tool to create the file — do not just print the content.

After writing, run the tests to verify they pass (and fail for the right reasons when testing error paths):

```bash
# Adapt to project
npm test -- --testPathPattern="<new_test_file>" 2>&1 | tail -40
# or: python -m pytest <new_test_file> -v 2>&1 | tail -40
```

If any tests fail unexpectedly, debug them before reporting. A test that was written incorrectly and always passes is worse than no test.

---

## Step 6: Report

Tell the user:
- File created (absolute path)
- Number of tests written
- Coverage breakdown: N happy path, N edge case, N error path
- Any behaviors you could NOT safely test without changing the implementation (e.g., private methods, untestable coupling) — flag these for the user rather than working around them
- Any gaps: behaviors that exist in the code that you did not generate tests for, and why

---

## Rules

- **Match project conventions exactly** — a test file in a foreign style is worse than no test
- **Never test implementation details** — test public behavior and observable outputs, not internal variables
- **Never remove the code under test** to make tests pass
- **Never write tautological tests** (assert that true === true, or return value equals what you just hardcoded)
- **Mock at the boundary** — mock external I/O, not internal logic
- **If the code has no tests at all**, start with the 3 most critical paths rather than trying to cover everything in one pass; note what's left
- **If $ARGUMENTS contains a file path**, generate tests for all exported functions in that file, not just the first one
