# Xperieval Methodology

Full technical documentation for scoring, buckets, authenticity, interviews, and background verification.

## Two-stage scoring

| Stage | When | Scale | Purpose |
|-------|------|-------|---------|
| **Application** | Pre-interview | 0–100 | Sort high-volume applications (resume + written answers) |
| **Interview** | Post-interview | 0–100 | Score live Q&A from AI notetaker against interview rubric |

Humans finalize hiring decisions using both scores. Red application buckets are deprioritized for interview slots but remain visible for human review.

## Application score (pre-interview)

Inspired by **HiredScore-style** candidate fit ranking: weighted evidence dimensions, explainable output, human-in-the-loop.

### Formula

```
Application overall = (Resume match × 25%) + (Answer quality × 25%) + (Evidence strength × 30%) + (Communication × 20%)
```

## Interview score (post-interview)

```
Interview overall = (Depth × 30%) + (Relevance × 25%) + (Genuineness × 30%) + (Communication × 15%)
```

Interview responses are parsed from pasted transcript/notes. Genuineness checks AI-style phrasing and consistency with application materials.

### Dimensions

| Dimension | Weight | Signals |
|-----------|--------|---------|
| Resume match | 25% | Job title keyword overlap, metrics, resume length |
| Answer quality | 25% | Ownership verbs (led, built, shipped), specificity, word count |
| Evidence strength | 30% | Numbers/outcomes, rubric questions answered substantively |
| Communication | 20% | Response length, structure (bullets, paragraphs) |

### Buckets

| Bucket | Default threshold | Meaning |
|--------|-------------------|---------|
| Green | ≥ 80 | Prioritize; eligible for background check |
| Amber | 60–79 | Human review recommended |
| Red | < 60 | Low match; never auto-reject |

Configurable in **Settings → Scoring policy**.

## Answer authenticity

Session monitoring on public apply forms (when enabled):

- Paste/copy blocked
- Tab/window blur counted
- Keystroke vs character length
- AI phrase patterns (furthermore, leverage, holistic, etc.)

**Score:** 0–100, starts at 100, deductions for flags.

**Verdicts:** Likely genuine (≥75) · Review needed (50–74) · High risk (<50)

## Background verification

**Green bucket only.** Simulated report checks:

1. Identity consistency
2. Email/contact
3. Employment timeline signals
4. Role alignment
5. Quantified claims

Status: `clear` · `review` · `fail`

**Not** a replacement for Equifax or official screening vendors.

## Reviewer workflow

1. Candidate applies → auto-scored
2. Recruiter reviews queue (sorted by score)
3. Add **reviewer notes** (audit logged)
4. **Override bucket** if needed (requires reason)
5. **Re-score** after rubric changes
6. **Background check** if Green

## Data storage

- SQLite: `data/xperieval.db`
- Files: `uploads/`
