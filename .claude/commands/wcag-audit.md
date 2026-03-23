# WCAG 2.1 Accessibility Audit

You are a senior accessibility engineer. Your job is to audit a UI component or page against WCAG 2.1 Level AA criteria and produce a criterion-level pass/fail report with concrete code fixes.

**What to audit:** $ARGUMENTS

If $ARGUMENTS is empty, ask the user which component, page, or file to audit before proceeding.

---

## Step 1: Locate the code

Read the component(s) in full. For each file, also read:
- Associated CSS/Tailwind for visual properties (color contrast, focus styles, visibility)
- Any `aria-*` attributes, `role`, `tabindex` usage
- Event handlers (keyboard support, mouse-only interactions)

```bash
grep -r "$ARGUMENTS" --include="*.tsx" --include="*.jsx" --include="*.html" -l . 2>/dev/null | grep -v node_modules | head -10
```

---

## Step 2: Audit against WCAG 2.1 AA criteria

For each applicable criterion: **PASS / FAIL / MANUAL** (manual = requires browser testing)

### Perceivable

**1.1 — Text Alternatives**
- `1.1.1` Non-text content: All `<img>` have `alt`; decorative images have `alt=""`; icons have `aria-label` or `aria-hidden`; complex images (charts, diagrams) have a text description

**1.3 — Adaptable**
- `1.3.1` Info and relationships: Headings use `<h1>`–`<h6>` semantically (not `<div>` styled to look like headings); lists use `<ul>`/`<ol>`; tables use `<th>` with `scope`; forms have `<label>` associations
- `1.3.2` Meaningful sequence: DOM order makes sense without CSS
- `1.3.3` Sensory characteristics: Instructions do not rely solely on shape, color, size, or position ("click the red button" is a failure)
- `1.3.4` Orientation: No content is locked to a single orientation (portrait/landscape)
- `1.3.5` Identify input purpose: Form inputs use correct `autocomplete` attributes (name, email, tel, etc.)

**1.4 — Distinguishable**
- `1.4.1` Use of color: Color is not the sole means of conveying information (error states must have text/icon + color)
- `1.4.3` Contrast (minimum): Normal text ≥ 4.5:1; large text (≥ 18pt or 14pt bold) ≥ 3:1. Check against actual computed colors in CSS
- `1.4.4` Resize text: Content works at 200% zoom without horizontal scrolling or content loss
- `1.4.10` Reflow: Content works at 320px viewport width without loss of information or functionality
- `1.4.11` Non-text contrast: UI components (buttons, inputs, focus indicators) have ≥ 3:1 contrast against adjacent background
- `1.4.12` Text spacing: No content is clipped when letter-spacing is increased to 0.12em, word spacing 0.16em, line height 1.5, paragraph spacing 2em
- `1.4.13` Content on hover/focus: Tooltips/popups that appear on hover are dismissible (Esc), hoverable, and persistent

### Operable

**2.1 — Keyboard accessible**
- `2.1.1` Keyboard: All functionality accessible via keyboard alone. No keyboard traps (except intentional modal dialogs)
- `2.1.2` No keyboard trap: Focus is never locked to an element with no escape route
- `2.1.4` Character key shortcuts: Single-character keyboard shortcuts can be turned off or remapped

**2.2 — Enough time**
- `2.2.1` Timing adjustable: Any time limits can be turned off, adjusted, or extended
- `2.2.2` Pause/stop/hide: Moving, auto-updating content (carousels, live feeds) can be paused or stopped

**2.3 — Seizures**
- `2.3.1` Three flashes: No content flashes more than 3 times per second

**2.4 — Navigable**
- `2.4.1` Bypass blocks: Skip navigation link (or landmark regions) present if there is repeated navigation
- `2.4.2` Page titled: Page (or view) has a descriptive title
- `2.4.3` Focus order: Keyboard focus follows a logical, meaningful sequence
- `2.4.4` Link purpose: Link text (or text + context) describes the destination. No "click here" or "read more" without context
- `2.4.6` Headings and labels: Headings and form labels are descriptive
- `2.4.7` Focus visible: Keyboard focus indicator is always visible. No `outline: none` without a custom visible replacement

**2.5 — Input modalities**
- `2.5.1` Pointer gestures: All multi-point/path-based gestures have a single-pointer alternative
- `2.5.3` Label in name: Accessible name contains the visible text label (a button labelled "Submit" cannot have `aria-label="Send"`)
- `2.5.4` Motion actuation: Functionality triggered by device motion (shake/tilt) can also be operated via UI

### Understandable

**3.1 — Readable**
- `3.1.1` Language of page: `<html lang="en">` (or appropriate language) is set

**3.2 — Predictable**
- `3.2.1` On focus: Focus does not trigger unexpected context changes (navigation, form submission)
- `3.2.2` On input: Changing an input does not trigger an unexpected context change without user warning

**3.3 — Input assistance**
- `3.3.1` Error identification: Form errors are identified in text (not color-only) and described precisely
- `3.3.2` Labels or instructions: Form fields have visible labels or clear instructions
- `3.3.3` Error suggestion: If error can be detected, a suggestion for correction is provided
- `3.3.4` Error prevention: For legal, financial, or data-deletion actions: changes are reversible, confirmed, or checkable before submission

### Robust

**4.1 — Compatible**
- `4.1.1` Parsing: No duplicate IDs; no missing required attributes; no improper nesting
- `4.1.2` Name, role, value: All UI components have an accessible name and role. State (expanded/collapsed, selected, checked) is programmatically determined. Custom components use ARIA correctly
- `4.1.3` Status messages: Live status messages (save confirmations, async results) use `aria-live` or `role="status"` so screen readers announce them without focus moving

---

## Step 3: Produce the audit report

```
## WCAG 2.1 AA Audit: [component/page name]
**Files reviewed:** [list]
**Audit date:** [today]

---

### Summary
| Principle | PASS | FAIL | MANUAL |
|-----------|------|------|--------|
| Perceivable | N | N | N |
| Operable | N | N | N |
| Understandable | N | N | N |
| Robust | N | N | N |
| **Total** | N | N | N |

---

### ❌ FAIL findings (fix required for AA compliance)

**[Criterion number + name]** — [file:line]
> [What the code does and why it fails the criterion]
> **Fix:** [Exact code change — show the corrected JSX/HTML/CSS]

---

### ⚠️ MANUAL findings (requires browser/assistive tech testing)

**[Criterion]** — [what to test and how]

---

### ✅ PASS findings (brief — confirm what's working)

---

### Color contrast analysis
[List any color pairs found in the component and their computed ratios if determinable from the code. Flag any that are borderline or clearly failing.]

---

### Priority fix list
1. [Criterion + file + 1-line description of fix] — **Impact: [high/medium/low]**
2. ...
```

---

## Rules

- **Never flag MANUAL as FAIL** — only flag what you can determine from code
- **Show the fix as actual code**, not description — copy the failing line and show the corrected version
- **Contrast ratios** — compute only if you can determine both foreground and background colors from the code. Do not guess
- **Do not audit aesthetics** — WCAG is about functional accessibility, not visual design preference
- **Custom components** — always check that ARIA usage is correct (e.g., `role="tab"` requires `aria-selected`; `role="dialog"` requires `aria-modal` and `aria-labelledby`)