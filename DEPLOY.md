# Deploy EvalPortal (Internet Access)

This guide gets the app running from anywhere by deploying the API + database and the frontend separately.

## 1) Deploy the API + Postgres

Use Render, Railway, Fly, or a VPS. You need a Postgres database and a Node service.

### Render (one-click via render.yaml)
This repo includes `render.yaml` for the API + database.
1. Create a new Render Blueprint from this repo.
2. Render will provision the database and API automatically.
3. Note the deployed API URL for the frontend step.

### CI deploy (optional)
This repo includes a GitHub Action that triggers Render:
- `main` -> production
- `develop` -> staging

1. In Render, create Deploy Hooks for both services.
2. In GitHub repo secrets, add:
   - `RENDER_DEPLOY_HOOK_PROD`
   - `RENDER_DEPLOY_HOOK_STAGING`

### Required environment variables
- `DATABASE_URL` (from your hosted Postgres)
- `PORT` (often set by the host automatically)
- `SESSION_SECRET` (recommended)

### Build/Start commands
```
pnpm --filter @workspace/api-server build
node artifacts/api-server/dist/index.mjs
```

After deploy, confirm:
```
GET /api/healthz
```

## 2) Deploy the Frontend

Use Vercel, Render Static, Netlify, or similar.

### Vercel (project in eval-portal)
This repo includes `artifacts/eval-portal/vercel.json`.
1. Import the repo in Vercel.
2. Set the **Root Directory** to `artifacts/eval-portal`.
3. Add env var: `VITE_API_BASE_URL=https://your-api-domain.com`
4. Deploy.

### CI deploy (optional)
This repo includes a GitHub Action to deploy the frontend:
- `main` -> production
- `develop` -> staging

Add these GitHub secrets:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID_PROD`
- `VERCEL_PROJECT_ID_STAGING`

### Required environment variables
- `VITE_API_BASE_URL=https://your-api-domain.com`

### Build command (root)
```
pnpm --filter @workspace/eval-portal build
```

### Output folder
```
artifacts/eval-portal/dist
```

## 3) Verify from another laptop

Open the frontend URL and log in:
- `guide1 / password123`
- `CS2021001 / password123`

If login fails, make sure:
- API is running and reachable
- `VITE_API_BASE_URL` is correct
- Database is seeded (`POST /api/seed`)
