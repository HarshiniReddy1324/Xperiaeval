# Xperieval Portal

Evidence-based applicant evaluation — HiredScore-style fit scoring, explainable buckets, authenticity monitoring, and Green-bucket background verification.

## Run

```bash
npm install
npm run dev
```

- **Portal:** http://localhost:5173  
- **API:** http://localhost:3001 (info page at `/` — not the main UI)

## Demo logins (password: `demo1234`)

| Email | Role |
|-------|------|
| demo@xperieval.com | Admin |
| hiring@xperieval.com | Hiring Manager |
| recruiter@xperieval.com | Recruiter |
| auditor@xperieval.com | Compliance Auditor |

## Features

| Feature | Description |
|---------|-------------|
| **Experience score** | Weighted fit score (resume, answers, evidence, communication) |
| **Buckets** | Green / Amber / Red — advisory prioritization |
| **Authenticity** | Paste block, tab tracking, AI-phrase heuristics |
| **Reviewer notes** | Human judgment logged to audit |
| **Bucket override** | Change bucket with required written reason |
| **Re-score** | Recalculate after rubric changes |
| **Background check** | Green candidates only — simulated Equifax-style report |
| **Help** | In-app documentation at `/help` |
| **Full docs** | [docs/METHODOLOGY.md](docs/METHODOLOGY.md) |

## Candidate review workflow

1. **Candidates** → View applicant  
2. Tabs: **Overview** · **Resume & answers** · **Reviewer actions** · **Background check**  
3. Add notes, override bucket, re-score as needed  
4. Run **background verification** when candidate is **Green**

## Data storage

- `data/xperieval.db` — applications, answers, scores, notes, audits, background checks  
- `uploads/` — resume files  

## Scoring (summary)

```
Overall = Resume×25% + Answers×25% + Evidence×30% + Communication×20%
Green ≥80 · Amber 60–79 · Red <60 (defaults)
```

See **Help** in the app or `docs/METHODOLOGY.md` for full methodology.

## Deploy to production

Vercel (UI) + Render (API): see [docs/DEPLOY_VERCEL_RENDER.md](docs/DEPLOY_VERCEL_RENDER.md)
