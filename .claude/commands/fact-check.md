# Fact Check — Multi-Model Research & Verification

You are a rigorous fact-checker. Your job is to research a claim or topic using every available AI tool independently, then cross-verify their findings, highlight contradictions, and produce a sourced report saved to disk.

**Claim or topic to fact-check:** $ARGUMENTS

If no argument was provided, ask the user for a claim before proceeding.

---

## Step 0: Load Context

```bash
cat .claude.md 2>/dev/null || cat .gemini.md 2>/dev/null || cat agents.md 2>/dev/null || echo "NO_CONTEXT_FILE"
```

Note the project path and working rules. The report will be saved to the project root.

---

## Step 1: Probe Available Tools

Run these checks to know which models are available. Do not skip any.

```bash
# Gemini (use powershell on Windows — npm .sh wrappers break in Git Bash)
powershell -Command "gemini --version" 2>/dev/null && echo "GEMINI_INSTALLED=true" || echo "GEMINI_INSTALLED=false"
[ -f "$HOME/.gemini/oauth_creds.json" ] && echo "GEMINI_AUTH=oauth" || ([ -n "$GEMINI_API_KEY" ] && echo "GEMINI_AUTH=key" || echo "GEMINI_AUTH=none")

# Codex (use powershell on Windows — npm .sh wrappers break in Git Bash)
powershell -Command "codex --version" 2>/dev/null && echo "CODEX_INSTALLED=true" || echo "CODEX_INSTALLED=false"
[ -f "$HOME/.codex/auth.json" ] && echo "CODEX_AUTH=present" || echo "CODEX_AUTH=absent"

# OpenCode (use powershell on Windows — npm .sh wrappers break in Git Bash)
powershell -Command "opencode --version" 2>/dev/null && echo "OPENCODE_INSTALLED=true" || echo "OPENCODE_INSTALLED=false"
[ -n "$OPENAI_API_KEY" ] && echo "OPENCODE_AUTH=api_key" || \
  ([ -s "$HOME/.local/share/opencode/auth.json" ] && echo "OPENCODE_AUTH=configured" || echo "OPENCODE_AUTH=none")
```

Print a summary:
```
=== AVAILABLE MODELS ===
Claude:   ALWAYS AVAILABLE (you)
Gemini:   [READY / NO_AUTH / ABSENT]
Codex:    [READY / NO_AUTH / ABSENT]
OpenCode: [READY / NO_AUTH / ABSENT]
========================
```

---

## Step 2: Independent Research Phase

Each available model researches the claim **independently** — they must not see each other's output first. This prevents anchoring bias.

Create a slug from the claim for filenames: lowercase, spaces → hyphens, max 40 chars. Example: "Is coffee healthy" → `coffee-healthy`.

### 2a. Claude researches

You (Claude) conduct structured research now using your available tools. Execute each sub-step in order:

**2a-i. Web search — find primary sources**
Use WebSearch to run at least 3 targeted searches on the claim. Vary the angle:
- Search 1: the claim as stated
- Search 2: the strongest counter-argument or "myth vs fact" framing
- Search 3: primary source or official body most likely to have authoritative data (CDC / WHO / peer-reviewed journal / official docs / etc.)

**2a-ii. Read primary sources**
For the 2–3 most authoritative URLs found in your searches, use WebFetch to read the actual page content — not just the snippet. Look for:
- Data, statistics, or study results (note sample size, date, methodology if visible)
- Caveats, limitations, or nuance the headline might miss
- Whether the source is primary (original study) or secondary (reporting on a study)

**2a-iii. Contradiction check**
Actively search for evidence that contradicts your initial findings. Use WebSearch with terms like "criticism of [finding]", "[claim] debunked", or "[claim] controversy". If contradicting evidence exists, it must appear in your findings — do not bury it.

**2a-iv. Write findings to file**
Write your research to `.factcheck-claude.md` in this exact format:

```markdown
# Claude Research: [claim]
Date: [today]

## Sources consulted
[numbered list: URL + source type (peer-reviewed / official / news / expert org / anecdote) + date published if known]

## Findings
[numbered list — each finding states: the finding, the source it comes from, confidence: HIGH / MEDIUM / LOW, and a brief note on source quality]

## Contradicting evidence found
[list any evidence that opposes the main findings, with source — if none found, state "searched for contradictions, none found"]

## What I could not verify
[list specific sub-claims that couldn't be sourced — never fabricate]

## Preliminary verdict
[TRUE / FALSE / PARTIALLY TRUE / UNVERIFIED / DISPUTED] — [1-sentence reasoning citing the strongest evidence]
```

### 2b. Gemini researches (if READY)

```bash
powershell -Command "gemini -p 'You are a rigorous fact-checker. Research this claim independently.

Claim: $ARGUMENTS

Instructions:
1. Search for primary sources, official data, peer-reviewed research, and expert consensus
2. For each finding note: source type (peer-reviewed/official/news/expert consensus), confidence (HIGH/MEDIUM/LOW)
3. Flag anything you cannot verify — never fabricate
4. Give a preliminary verdict: TRUE / FALSE / PARTIALLY TRUE / UNVERIFIED / DISPUTED with 1-sentence reasoning

Output ONLY in this exact markdown format:

## Findings
[numbered list]

## What I could not verify
[list]

## Preliminary verdict
[verdict] — [reasoning]'" > .factcheck-gemini.md 2>&1
echo "Gemini research saved"
```

If Gemini is not available, note the absence and skip this step.

### 2c. Codex researches (if READY)

```bash
powershell -Command "codex --approval-mode full-auto -q 'You are a rigorous fact-checker. Research this claim independently. Claim: $ARGUMENTS. For each finding note source type and confidence (HIGH/MEDIUM/LOW). Flag anything you cannot verify. Give a preliminary verdict: TRUE / FALSE / PARTIALLY TRUE / UNVERIFIED / DISPUTED with 1-sentence reasoning. Format your output as markdown with sections: ## Findings, ## What I could not verify, ## Preliminary verdict. Write the output to the file .factcheck-codex.md'" 2>&1
echo "Codex research saved"
```

If Codex is not available, note the absence and skip this step.

---

## Step 3: Cross-Verification

Read all available research files:

```bash
echo "=== CLAUDE ===" && cat .factcheck-claude.md 2>/dev/null || echo "(not found)"
echo "=== GEMINI ===" && cat .factcheck-gemini.md 2>/dev/null || echo "(not found)"
echo "=== CODEX ===" && cat .factcheck-codex.md 2>/dev/null || echo "(not found)"
```

Now compare the outputs. For each distinct claim or sub-finding:

**Agreement analysis:**
- If 2+ models agree on a finding with HIGH confidence → mark as **CONFIRMED**
- If 2+ models agree but with MEDIUM confidence → mark as **LIKELY**
- If models disagree → mark as **DISPUTED** and note what differs
- If only one model found it → mark as **UNVERIFIED BY OTHERS**

**Contradiction analysis:**
For each contradiction:
1. State exactly what each model claimed
2. Identify the likely source of disagreement (outdated data, hallucination, ambiguity in the claim, genuine scientific dispute)
3. Note what evidence would resolve it

**Verdict reconciliation:**
- Tally verdicts across models: TRUE / FALSE / PARTIALLY TRUE / UNVERIFIED / DISPUTED
- If verdicts differ, explain why and lean toward the most evidence-backed position

---

## Step 4: Generate Final Report

Create a slug from the claim (lowercase, spaces → hyphens, max 40 chars).

Write the final report to `FACT_CHECK_[slug].md` in the project root:

```markdown
# Fact Check Report: [claim]
**Date:** [today's date]
**Models used:** [list which models contributed]
**Claim:** [exact claim as given]

---

## Final Verdict
**[TRUE / FALSE / PARTIALLY TRUE / UNVERIFIED / DISPUTED]**

[2–3 sentence summary of the verdict with the strongest evidence.]

---

## Evidence Summary

### Confirmed findings (2+ models agree, HIGH confidence)
[numbered list]

### Likely findings (2+ models agree, MEDIUM confidence)
[numbered list]

### Disputed findings (models disagree)
| Finding | Claude says | Gemini says | Codex says | Likely reason |
|---------|-------------|-------------|------------|---------------|

### Unverified claims (only 1 model found, or all flagged as uncertain)
[numbered list]

---

## Source Quality Notes
[For the strongest evidence above, note: source type, recency, and authority]

---

## What Remains Unresolved
[List specific questions that would require primary research, expert consultation, or newer data to resolve]

---

## Models Consulted
[For each model that contributed: name, confidence in its output (based on source quality), any hallucination flags]
```

---

## Step 5: Cleanup & Summary

```bash
# Remove temp research files (keep only the final report)
rm -f .factcheck-claude.md .factcheck-gemini.md .factcheck-codex.md
echo "Temp files removed"
echo "Report saved to: FACT_CHECK_[slug].md"
```

Tell the user:
- The file name where the report was saved
- The final verdict in one line
- How many models contributed
- Any major contradictions found

---

## Rules

- **Never fabricate sources** — if you cannot cite a real source, say "could not verify"
- **Independence is mandatory** — run each model before reading any other model's output
- **Contradictions are features** — they reveal where knowledge is genuinely uncertain; surface them, don't paper over them
- **Confidence calibration** — a PARTIALLY TRUE verdict with clear evidence is more valuable than a confident FALSE based on weak sources
- **If only Claude is available** — still produce the full report, but note it was single-model and flag all findings as requiring external verification

---

## Context Update (MANDATORY)

After the report is saved, update all three context files:

1. Edit `.claude.md` — append to **Session Log** and add any follow-up research goals:
   - Session log format: `YYYY-MM-DD · /fact-check · [models used] · [claim slug] · [final verdict]`
2. Sync to the other two files:

```bash
cp .claude.md .gemini.md && cp .claude.md agents.md && echo "Context synced → .gemini.md + agents.md"
```
