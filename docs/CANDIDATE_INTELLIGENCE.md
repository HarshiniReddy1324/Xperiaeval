# Candidate Intelligence Scoring Engine

HiredScore-style evaluation that runs automatically when an applicant submits (or when a recruiter clicks **Re-score intelligence**).

## Architecture

```
Apply submit / Rescore
        │
        ▼
┌───────────────────────┐
│  runScoring()         │
│  server/index.js      │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────────────────────────┐
│  buildCandidateIntelligenceReport()       │
│  server/candidateIntelligence.js            │
│  • Per-question dimension heuristics      │
│  • Behavioral profile (context-only)      │
│  • Weighted overall (7 dimensions)        │
│  • Optional Groq LLM refinement           │
└───────────┬───────────────────────────────┘
            │
            ▼
┌───────────────────────┐     ┌────────────────────────┐
│  scores table       │     │  answers.score_points  │
│  intelligence_json  │     │  per-question 0–100    │
│  tier, recommendation│     └────────────────────────┘
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  Recruiter UI         │
│  CandidateIntelligence│
│  Report.jsx           │
└───────────────────────┘
```

## Database schema (extensions)

| Table | Column | Purpose |
|-------|--------|---------|
| `rubric_categories` | `category_type` | Technical, Behavioral, Problem Solving, etc. |
| `rubric_categories` | `ideal_answer` | Rubric / ideal answer text (hidden from applicants) |
| `scores` | `intelligence_json` | Full structured report (JSON) |
| `scores` | `tier` | Exceptional / Strong / Potential / Needs Review / Low |
| `scores` | `recommendation` | Hiring recommendation string |
| `scores` | `confidence_level` | High / Medium / Low |
| `answers` | `transcript_text` | Audio transcription for scoring |
| `answers` | `media_path` | Stored audio/video |
| `answers` | `time_taken_seconds`, `idle_seconds`, `focus_loss_count` | Behavioral signals |

Job posting skills come from `jobs.posting_json` (`requiredQualifications`, `preferredQualifications`, `techStack`).

## API

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/public/jobs/:slug/apply` | Triggers scoring after submit |
| POST | `/api/applications/:id/rescore` | Regenerates intelligence report |
| GET | `/api/applications/:id` | Returns `intelligenceReport` + `candidateIntelligence` |
| GET | `/api/applications` | Includes `recommendation`, `tier`, `confidence_level` |
| GET | `/api/dashboard` | Top applicants ranked by intelligence score |

## Scoring workflow

1. **Merge answer text** — typed + audio transcript (`audioTranscription.js`).
2. **Per question** — score 7 dimensions (0–100) + question score + strengths/concerns.
3. **Behavioral profile** — session time, tab switches, paste (context only, no auto-reject).
4. **Aggregate** — weighted overall using fixed weights (30% technical, 20% problem solving, …).
5. **AI layer** (optional) — Groq adjusts overall and per-question notes when `GROQ_API_KEY` is set.
6. **Persist** — `intelligence_json` + legacy `scores.overall` / bucket for dashboards.

## Overall weights

| Dimension | Weight |
|-----------|--------|
| Technical Competency | 30% |
| Problem Solving | 20% |
| Communication | 10% |
| Project Ownership | 10% |
| Authenticity | 10% |
| Resume Consistency | 10% |
| Behavioral Confidence | 10% |

## Tiers & recommendations

| Score | Tier | Typical recommendation |
|-------|------|------------------------|
| 90–100 | Exceptional Match | Strongly Recommend Interview |
| 80–89 | Strong Match | Recommend Interview |
| 70–79 | Potential Match | Recruiter Review Needed |
| 60–69 | Needs Review | Recruiter Review Needed |
| &lt;60 | Low Match | Not Recommended |

## React UI

| Component | Location |
|-----------|----------|
| `CandidateIntelligenceReport` | Candidate detail → Overview tab |
| Candidates table | Recommendation column |
| Dashboard | Top applicants with tier + confidence |

## Explainability

Recruiters can expand **Per-question breakdown** to see dimension scores, rubric match, strengths, and concerns. Audit note clarifies that tab switches are not automatic rejections.

## Existing applications

Open a candidate and click **Re-score intelligence** to generate a report for submissions scored before this engine shipped.
