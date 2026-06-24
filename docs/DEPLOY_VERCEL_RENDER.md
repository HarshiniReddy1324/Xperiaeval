# Deploy: Vercel (UI) + Render (API)

Split setup — React on **Vercel**, Express + SQLite + uploads on **Render**.

```
https://your-app.vercel.app     →  React (Vercel)
https://xperieval-api.onrender.com  →  API (Render)
```

---

## Step 1 — Push to GitHub

```bash
cd /Users/reddy/Downloads/xperieval-portal-review
git add .
git commit -m "Vercel + Render deploy config"
git push -u origin main
```

---

## Step 2 — Deploy API on Render

1. [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint**
2. Connect your GitHub repo (Render reads `render.yaml`)
3. Or manually: **New Web Service** → repo → **Docker** → Dockerfile path: `Dockerfile.api`
4. **Add a disk** (required — free tier cannot use disks; use **Starter $7/mo** for persistent data):
   - Mount path: `/var/data`
   - Size: 1 GB
5. Environment variables:

   | Key | Value |
   |-----|--------|
   | `NODE_ENV` | `production` |
   | `DATA_DIR` | `/var/data/data` |
   | `UPLOADS_DIR` | `/var/data/uploads` |
   | `JWT_SECRET` | `openssl rand -hex 32` |
   | `PUBLIC_APP_URL` | Your Vercel URL (set after step 3) |
   | `ALLOWED_ORIGINS` | Same as `PUBLIC_APP_URL` (+ custom domain if any) |

6. Deploy → copy URL: `https://xperieval-api.onrender.com`
7. Test: `https://YOUR-API.onrender.com/api/health` → `{"ok":true}`

> **Render free tier:** Web service spins down after 15 min idle (~1 min cold start). **No persistent disk** on free — database resets. Use **Starter ($7/mo)** + disk for a real demo.

---

## Step 3 — Deploy frontend on Vercel

1. [vercel.com/new](https://vercel.com/new) → Import GitHub repo
2. Framework: **Vite**
3. Build: `npm run build` · Output: `dist`
4. Environment variable:

   | Name | Value |
   |------|--------|
   | `VITE_API_BASE` | `https://YOUR-API.onrender.com` |

5. Deploy → open `https://your-app.vercel.app`
6. Login: `demo@xperieval.com` / `demo1234`

---

## Step 4 — Link the two services

Back on **Render**, update:

```
PUBLIC_APP_URL=https://your-app.vercel.app
ALLOWED_ORIGINS=https://your-app.vercel.app
```

Redeploy Render. Vercel preview URLs (`*.vercel.app`) are allowed automatically for CORS.

---

## Step 5 — Custom domain (optional)

| Where | What |
|-------|------|
| **Vercel** | Add `yourdomain.com` → DNS records Vercel shows |
| **Render** | Optional `api.yourdomain.com` for API |
| **Vercel env** | `VITE_API_BASE=https://api.yourdomain.com` |
| **Render env** | `PUBLIC_APP_URL=https://yourdomain.com` |

---

## Daily updates

```bash
git add .
git commit -m "your change"
git push
```

Both **Vercel** and **Render** auto-redeploy from `main`.

---

## Local dev (unchanged)

```bash
npm run dev
```

Uses Vite proxy — no `VITE_API_BASE` needed.

To test split stack locally:

```bash
# .env.local
VITE_API_BASE=http://localhost:3001
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| API CORS error | Set `ALLOWED_ORIGINS` on Render to your Vercel URL |
| Login fails | `JWT_SECRET` on Render |
| Resumes/audio 404 | `VITE_API_BASE` must be Render URL; redeploy Vercel after changing |
| Data lost on Render | Add persistent disk on Starter plan |
| Slow first load | Render free/starter cold start — wait ~1 min |
