# Xperieval Portal — End-to-End Test Plan

Use this checklist to verify the product works from candidate apply through interview confirmation.

**Run app:** `npm run dev` → http://localhost:5173 (API :3001)

**Demo logins** (password `demo1234`):

| Email | Role |
|-------|------|
| demo@xperieval.com | Admin |
| hiring@xperieval.com | Hiring Manager |
| recruiter@xperieval.com | Recruiter |

---

## 1. Job & screening setup

| # | Steps | Expected |
|---|--------|----------|
| 1.1 | Login as Admin → Jobs → open a job with **approved** rubric | Job detail loads |
| 1.2 | Screening question builder: set Q1 **mandatory + text**, Q2 **audio**, add keywords, max time 300s | Saves without error |
| 1.3 | Weights total **100%** → Approve rubric | Status “approved”, apply link works |

---

## 2. Candidate application + screening

| # | Steps | Expected |
|---|--------|----------|
| 2.1 | Open `/apply/{job-slug}` (incognito) | Step 1 profile form |
| 2.2 | Fill name/email, resume, Continue → screening | One question per screen |
| 2.3 | Answer text questions; on audio Q record clip | Timer shows elapsed (not limit); can advance |
| 2.4 | Review & Submit | Success + advisory score |
| 2.5 | Login → Candidates | New row; completion %; screening category |

---

## 3. Hiring review (anonymized)

| # | Steps | Expected |
|---|--------|----------|
| 3.1 | Login as **recruiter@** → open candidate | Name = **CAND-####**; no Reveal button |
| 3.2 | Login as **hiring@** → same candidate at `application_review` | Still anonymized; may say "Complete screening review first" |
| 3.3 | **Shortlist for interview** (pipeline) → refresh as hiring@ | **Reveal identity** button appears |
| 3.4 | Click Reveal | Real name, email, resume visible |
| 3.5 | **OR** confirm interview schedule → identity auto-unlocks for Hiring Manager | Name visible without manual reveal |
| 3.6 | Login as **auditor@** | Always CAND-#### only |

---

## 3b. Voice verification

| # | Steps | Expected |
|---|--------|----------|
| 3b.1 | Job detail → set Q2 to **Audio** → approve rubric | Saved |
| 3b.2 | Apply as new candidate (incognito) → record audio on Q2 | Submit succeeds |
| 3b.3 | Candidate detail → Voice verification → **Index voice from screening** | "Reference voice on file" + audio player |
| 3b.4 | **Record compare clip** (same mic) → Compare | ~100% match, "Likely same speaker" |
| 3b.5 | Upload a **different** audio file → Compare | Lower score, possible mismatch warning |

**No audio screening?** Use **Upload reference voice sample** on candidate detail instead.

---

## 4. Interview scheduling (full flow)

| # | Steps | Expected |
|---|--------|----------|
| 4.1 | Candidate detail → Interview tab → enter Meet URL → **Send scheduling invite** | Toast + **booking link copied** |
| 4.2 | Copy shows URL `/schedule/{token}` | Link in scheduling panel |
| 4.3 | Open booking link **as candidate** (incognito) | Grid of time slots |
| 4.4 | Pick slot → Confirm | “Pending confirmation” screen |
| 4.5 | Login as hiring@ → bell icon shows notification | “Candidate chose interview time” |
| 4.6 | Candidate detail → Interview scheduling → **Accept time** | Status **confirmed**; pipeline **Interview scheduled** |
| 4.7 | Re-open candidate booking link | “Interview confirmed” + time shown |

**Decline path (4b):**

| 4b.1 | After 4.4, click **Decline / reschedule** + reason | Status declined |
| 4b.2 | Send new invite | New token/link; candidate can book again |

---

## 5. Interview scoring

| # | Steps | Expected |
|---|--------|----------|
| 5.1 | After confirmed interview, paste Q/A transcript → Score interview | Interview /100 + bucket |
| 5.2 | Overview shows **Application** and **Interview** scores | Both visible |
| 5.3 | Advisory combined average (if both scored) | Shown in hero |

---

## 6. Integrations & ATS

| # | Steps | Expected |
|---|--------|----------|
| 6.1 | Integrations → Test webhook | 202 + event in recent events |
| 6.2 | Submit application | Writeback queue row appears |

---

## 7. LLM (optional)

| # | Steps | Expected |
|---|--------|----------|
| 7.1 | Create `.env` with `GROQ_API_KEY=...` (console.groq.com) | Restart server |
| 7.2 | GET `/api/system/llm-status` (logged in) | `configured: true` |
| 7.3 | Re-score or new application | Explanation may update after ~2s (async LLM) |

Without key: heuristic scoring still works.

---

## 8. Regression smoke

| # | Area | Expected |
|---|------|----------|
| 8.1 | Audit log | Scheduling events logged |
| 8.2 | Reports page | Loads |
| 8.3 | Background check (Green only) | Locked for Red |
| 8.4 | Incomplete filter on Candidates | `?screening=incomplete` works |
| 8.5 | AI Used filter | `?screening=ai_used` works |

---

## Known MVP limits

- No real email — **copy booking link** to candidate manually
- Voice verification is demo fingerprint, not production biometrics
- LLM requires free Groq API key
- Time limits enforced in browser only

---

## Quick API checks (optional)

```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@xperieval.com","password":"demo1234"}' | jq -r .token)

# Send invite
curl -s -X POST http://localhost:3001/api/applications/XP-1042/schedule/invite \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"meeting_url":"https://meet.google.com/abc-defg-hij"}' | jq .scheduling.booking_url
```
