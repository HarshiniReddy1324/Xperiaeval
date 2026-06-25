# Deploy: Vercel (UI) + Oracle Cloud (API) — $0 long-term

Your code runs **unchanged**. Vercel hosts React; Oracle Always Free VM runs Express + SQLite + uploads.

```
https://your-app.vercel.app          →  Vercel (React)
https://api.yourdomain.com           →  Oracle VM (Express API)
   or https://xxxx.trycloudflare.com  →  temporary HTTPS (testing only)
```

**Important:** Vercel is **HTTPS**. Your API must also be **HTTPS**, or the browser will block requests (mixed content). See [Step 4 — HTTPS for the API](#step-4--https-for-the-api-required).

---

## What you need before starting

### Accounts (all free to create)

| # | Service | URL | Why |
|---|---------|-----|-----|
| 1 | **GitHub** | [github.com](https://github.com) | Code already here: `HarshiniReddy1324/Xperiaeval` |
| 2 | **Vercel** | [vercel.com](https://vercel.com) | Hosts React UI (free) |
| 3 | **Oracle Cloud** | [oracle.com/cloud/free](https://www.oracle.com/cloud/free/) | Hosts API + database + files ($0 Always Free) |
| 4 | **Domain** (recommended) | Namecheap, Cloudflare, etc. | HTTPS for API (`api.yourdomain.com`) — ~$10/year optional for year 1 |

### On your Mac (local)

| Tool | Install |
|------|---------|
| Terminal | Built in |
| `git` | `xcode-select --install` if needed |
| `openssl` | Built in — for `JWT_SECRET` |

### Secrets to generate (save in a password manager)

```bash
openssl rand -hex 32
```

Use that output as `JWT_SECRET` on the Oracle VM (never commit it to GitHub).

### Optional

| Item | Purpose |
|------|---------|
| `GROQ_API_KEY` | Audio transcription + LLM narratives ([console.groq.com](https://console.groq.com)) |
| Custom domain | `yourdomain.com` on Vercel + `api.yourdomain.com` on Oracle |

---

## Architecture

| Part | Where | Persists? |
|------|-------|-----------|
| React app | Vercel | Rebuilt on each deploy |
| Express API | Oracle VM (Docker) | Yes |
| SQLite `xperieval.db` | VM disk → `/opt/xperieval/data` | Yes |
| Resumes / audio | VM disk → `/opt/xperieval/uploads` | Yes |

**Important:** Vercel only hosts the React UI. Your candidates, jobs, resumes, and recordings live in the **Oracle API database and disk** — not on your laptop after deploy. A fresh Oracle VM starts with a minimal seed (3 applications). On API startup the server now auto-seeds **6 jobs and 18 demo candidates** with resumes and intelligence scores. To copy everything from your Mac (including real test applications and audio recordings), run:

```bash
ORACLE_HOST=ubuntu@YOUR_VM_IP ./scripts/sync-local-to-oracle.sh
```

---

## Step 1 — Oracle Cloud VM (Always Free)

### 1.1 Sign up

1. [oracle.com/cloud/free](https://www.oracle.com/cloud/free/) → **Start for free**
2. Complete signup (card may be required; **stay on Always Free** resources only)
3. Pick a **home region** close to you (cannot change later)

### 1.2 Create an ARM VM

1. Oracle Console → **Compute** → **Instances** → **Create instance**
2. **Name:** `xperieval-api`
3. **Image:** Ubuntu 22.04 or 24.04 (aarch64)
4. **Shape:** **Ampere** → `VM.Standard.A1.Flex` → **1 OCPU**, **6 GB RAM** (enough for Docker)
5. **Networking:** assign a **public IPv4**
6. **SSH keys:** paste your Mac public key

   ```bash
   # On Mac — create key if you don't have one
   ssh-keygen -t ed25519 -f ~/.ssh/oracle_xperieval -N ""
   cat ~/.ssh/oracle_xperieval.pub
   # Paste output into Oracle "SSH public key" field
   ```

7. **Boot volume:** 50 GB (default is fine)
8. **Create**

### 1.3 Open firewall (Oracle + Ubuntu)

**A) Oracle Security List (network)**

1. Instance → **Subnet** → **Security List** → **Add ingress rule**
2. Source `0.0.0.0/0`, TCP port **22** (SSH)
3. Add rule: TCP **80** and **443** (for HTTPS later)

**B) Ubuntu firewall on the VM**

```bash
ssh -i ~/.ssh/oracle_xperieval ubuntu@YOUR_VM_PUBLIC_IP

sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo apt-get update && sudo apt-get install -y iptables-persistent
# Save rules when prompted
```

### 1.4 Install Docker on the VM

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
# Log out and back in
exit
```

SSH in again:

```bash
ssh -i ~/.ssh/oracle_xperieval ubuntu@YOUR_VM_PUBLIC_IP
```

### 1.5 Clone your repo and build API

```bash
sudo mkdir -p /opt/xperieval/data /opt/xperieval/uploads
sudo chown -R ubuntu:ubuntu /opt/xperieval

git clone https://github.com/HarshiniReddy1324/Xperiaeval.git
cd Xperiaeval

docker build -f Dockerfile.api -t xperieval-api .
```

### 1.6 Run the API container

Replace values in ALL CAPS:

```bash
docker run -d \
  --name xperieval-api \
  --restart unless-stopped \
  -p 127.0.0.1:3001:3001 \
  -v /opt/xperieval/data:/var/data/data \
  -v /opt/xperieval/uploads:/var/data/uploads \
  -e NODE_ENV=production \
  -e PORT=3001 \
  -e JWT_SECRET=PASTE_OPENSSL_OUTPUT_HERE \
  -e PUBLIC_APP_URL=https://YOUR-APP.vercel.app \
  -e ALLOWED_ORIGINS=https://YOUR-APP.vercel.app \
  -e GROQ_API_KEY= \
  xperieval-api
```

Check logs:

```bash
docker logs -f xperieval-api
# Should see: Xperieval API running at ...
curl -s http://127.0.0.1:3001/api/health
# {"ok":true}
```

Note: API listens on **localhost:3001** only; HTTPS proxy in Step 4 exposes it publicly.

---

## Step 2 — Deploy frontend on Vercel

1. [vercel.com/new](https://vercel.com/new) → **Import** `HarshiniReddy1324/Xperiaeval`
2. Framework: **Vite** (auto)
3. **Environment variable** (add before first deploy):

   | Name | Value |
   |------|--------|
   | `VITE_API_BASE` | `https://api.yourdomain.com` (after Step 4) |

   For first test with Cloudflare tunnel, use the `https://....trycloudflare.com` URL.

4. **Deploy**
5. Copy your URL: `https://xperiaeval.vercel.app` (example)

### Update Oracle env with Vercel URL

```bash
docker stop xperieval-api && docker rm xperieval-api
# Re-run docker run from Step 1.6 with correct PUBLIC_APP_URL and ALLOWED_ORIGINS
```

Or use `docker update` — easier to re-run `docker run` with fixed env.

**Redeploy Vercel** after `VITE_API_BASE` is final (Settings → Environment Variables → Redeploy).

---

## Step 3 — Test login

1. Open your Vercel URL
2. Login: `demo@xperieval.com` / `demo1234`
3. Apply flow, candidates, uploads should hit Oracle API

---

## Step 4 — HTTPS for the API (required)

Browsers block `https://vercel.app` → `http://IP:3001`. You need **HTTPS** on the API.

### Option A — Domain + Caddy (best for long-term demo)

1. Buy/use a domain (e.g. `xperieval.com`)
2. DNS: **A record** `api` → your Oracle VM **public IP**
3. On the VM:

```bash
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update && sudo apt-get install -y caddy

sudo tee /etc/caddy/Caddyfile <<'EOF'
api.yourdomain.com {
    reverse_proxy 127.0.0.1:3001
}
EOF

sudo systemctl reload caddy
```

4. Set `VITE_API_BASE=https://api.yourdomain.com` on Vercel → redeploy

### Option B — Cloudflare Tunnel (free HTTPS, no open ports)

1. Create free [Cloudflare](https://cloudflare.com) account
2. On VM:

```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -o cloudflared
chmod +x cloudflared
sudo mv cloudflared /usr/local/bin/

# Quick test URL (changes if process restarts):
cloudflared tunnel --url http://127.0.0.1:3001
```

3. Copy the `https://....trycloudflare.com` URL → set as `VITE_API_BASE` on Vercel

For a **fixed** URL, create a named Cloudflare Tunnel in the Cloudflare dashboard (Zero Trust → Tunnels).

---

## Step 5 — Custom domain on Vercel (optional)

1. Vercel project → **Settings → Domains** → add `yourdomain.com`
2. Add DNS records Vercel shows
3. Update Oracle: `PUBLIC_APP_URL=https://yourdomain.com`, `ALLOWED_ORIGINS=https://yourdomain.com,https://your-app.vercel.app`

---

## Environment variables cheat sheet

### Vercel

| Variable | Example |
|----------|---------|
| `VITE_API_BASE` | `https://api.yourdomain.com` |

### Oracle (Docker `-e` flags)

| Variable | Example |
|----------|---------|
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `JWT_SECRET` | output of `openssl rand -hex 32` |
| `PUBLIC_APP_URL` | `https://your-app.vercel.app` |
| `DATA_DIR` | `/var/data/data` (inside container; volumes mounted) |
| `UPLOADS_DIR` | `/var/data/uploads` |
| `ALLOWED_ORIGINS` | `https://your-app.vercel.app` |
| `GROQ_API_KEY` | optional |

---

## Updating the app after code changes

**Vercel:** automatic on `git push` to `main`.

**Oracle VM:**

```bash
ssh -i ~/.ssh/oracle_xperieval ubuntu@YOUR_VM_IP
cd ~/Xperiaeval
git pull
docker build -f Dockerfile.api -t xperieval-api .
docker stop xperieval-api && docker rm xperieval-api
# Re-run the same docker run command from Step 1.6
```

Data in `/opt/xperieval/data` and `/opt/xperieval/uploads` survives rebuilds.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| CORS error in browser | Set `ALLOWED_ORIGINS` to exact Vercel URL on Docker env |
| Login fails | `JWT_SECRET` must be set; recreate container if you change it |
| Mixed content / blocked API | API must be **HTTPS** — complete Step 4 |
| Resumes/audio 404 | `VITE_API_BASE` must be API URL; check `/uploads` via API host |
| Can't SSH to VM | Check Oracle security list port 22; check VM is running |
| `demo` users missing | First API start runs migrations and seeds demo data automatically |
| Out of memory | Use 1 OCPU / 6GB ARM shape; `docker stats` to check |

---

## Cost summary

| Service | Cost |
|---------|------|
| Vercel (hobby) | **$0** |
| Oracle Always Free VM | **$0** (stay within Always Free limits) |
| Domain (optional) | ~$10/year |
| Groq API (optional) | Free tier available |

**Stay on Always Free:** use Ampere A1 shape only, one small VM, don't attach paid block volumes beyond free 200 GB pool.

---

## Quick checklist

- [ ] GitHub repo pushed (`Xperiaeval`)
- [ ] Oracle account + ARM VM created
- [ ] SSH works
- [ ] Docker installed
- [ ] Repo cloned, image built, container running
- [ ] `curl http://127.0.0.1:3001/api/health` → `{"ok":true}`
- [ ] HTTPS on API (Caddy or Cloudflare Tunnel)
- [ ] Vercel deployed with `VITE_API_BASE`
- [ ] Oracle `PUBLIC_APP_URL` + `ALLOWED_ORIGINS` match Vercel URL
- [ ] Login works on production URL
