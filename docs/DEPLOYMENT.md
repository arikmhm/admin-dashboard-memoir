# Deployment Guide — Admin Dashboard

## Production

|                  |                                                  |
| ---------------- | ------------------------------------------------ |
| **URL**          | _(set after Vercel deploy)_                      |
| **Platform**     | Vercel (Hobby plan)                              |
| **Region**       | sin1 (Singapore)                                 |
| **Framework**    | Next.js 16 (App Router)                          |
| **CI/CD**        | GitHub Actions (quality gates) + Vercel (deploy) |
| **Health check** | `GET /api/health` → `{"status":"ok"}`            |

---

## Environment Variables

This dashboard is a **client-side SPA** that proxies API requests through Next.js rewrites.
Only **one** environment variable is needed:

| Variable              | Required | Default                        | Description                          | Example                                    |
| --------------------- | -------- | ------------------------------ | ------------------------------------ | ------------------------------------------ |
| `NEXT_PUBLIC_API_URL` | **Yes**  | `http://localhost:3000/api/v1` | Backend API base URL (rewrite proxy) | `https://backend-memoir.vercel.app/api/v1` |

### Where to set

1. **Vercel Dashboard**: Project → Settings → Environment Variables
   - Add `NEXT_PUBLIC_API_URL` for **Production**, **Preview**, **Development**
2. **Local**: Copy `.env.example` → `.env.local` and fill in value

> **Note**: `NEXT_PUBLIC_` prefix means this value is embedded at build time. Changes require a redeploy.

---

## CI/CD Pipeline

### Architecture

```
push to main / PR
       │
       ▼
GitHub Actions (ci.yml)
  ┌─ Lint (eslint)
  ├─ Typecheck (tsc --noEmit)
  └─ Build (next build)
       │
       ▼ (if push to main)
Vercel GitHub Integration
  └─ Auto-deploy to production
```

### Triggers

| Event              | Action                                   |
| ------------------ | ---------------------------------------- |
| Push to `main`     | CI runs → Vercel auto-deploys production |
| PR to `main`       | CI runs → Vercel creates preview deploy  |
| Push to any branch | No CI (only main + PRs)                  |

---

## Setup from Scratch

### 1. Prerequisites

- Node.js 22 LTS
- npm
- Vercel account (Hobby plan)
- GitHub repository

### 2. Push to GitHub

```bash
git remote add origin git@github.com:arikmhm/admin-dashboard-memoir.git
git branch -M main
git push -u origin main
```

### 3. Connect to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import `arikmhm/admin-dashboard-memoir`
3. Vercel auto-detects Next.js — no config changes needed
4. Add environment variable:
   - `NEXT_PUBLIC_API_URL` = your backend API URL (e.g., `https://backend-memoir.vercel.app/api/v1`)
5. Click **Deploy**

### 4. Verify

After deploy:

- Visit `https://<your-domain>/api/health` → should return `{"status":"ok"}`
- Visit `https://<your-domain>/login` → should show login page
- CI badge in GitHub Actions should be green

---

## Security Headers

Applied via both `next.config.ts` (headers) and `vercel.json`:

| Header                 | Value                                     |
| ---------------------- | ----------------------------------------- |
| X-Content-Type-Options | `nosniff`                                 |
| X-Frame-Options        | `DENY`                                    |
| X-XSS-Protection       | `1; mode=block`                           |
| Referrer-Policy        | `strict-origin-when-cross-origin`         |
| Permissions-Policy     | `camera=(), microphone=(), geolocation()` |
| X-Powered-By           | _(removed)_                               |

---

## Vercel Hobby Plan Limits

| Resource             | Limit         |
| -------------------- | ------------- |
| Bandwidth            | 100 GB/month  |
| Serverless execution | 100 GB-hrs/mo |
| Build time           | 45 min/build  |
| Deployments          | Unlimited     |
| Preview deployments  | Unlimited     |

---

## Troubleshooting

### API calls fail (404 or CORS)

- Verify `NEXT_PUBLIC_API_URL` is set correctly in Vercel dashboard
- The rewrite in `next.config.ts` proxies `/api/v1/*` → backend — ensure backend URL includes `/api/v1`
- After changing env var, **redeploy** (env vars are embedded at build time)

### Login redirects to /login loop

- Check that the backend is accessible from the Vercel edge
- Verify the `proxy.ts` middleware is working (cookie-based auth check)

### Build fails on Vercel

- Check GitHub Actions CI output first — it catches lint/type errors before deploy
- Ensure Node.js version matches (22.x)
