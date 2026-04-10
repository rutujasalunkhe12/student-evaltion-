# EvalPortal - Academic Project Evaluation System

## Overview

A professional guide login and student evaluation web portal. Guides evaluate student project presentations; students peer-evaluate each other. Final scores use the formula:

**Final Score = (Guide + Peer Avg) − |Guide − Peer Avg|**

This penalizes bias: if a student gives unrealistically high or low marks compared to the guide, the difference is subtracted from the final score.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/eval-portal)
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: express-session (cookie-based)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **UI**: Tailwind CSS + shadcn/ui + framer-motion + lucide-react
 - **Deploy env**: set `VITE_API_BASE_URL` in frontend to point at your API domain

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   └── eval-portal/        # React + Vite frontend
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/
└── ...
```

## Database Schema

- **users** — guides and students (role: guide | student)
- **batches** — project batches assigned to a guide
- **evaluations** — marks given (guide or peer) for each student per batch

## Sample Credentials (after seeding)

- **Guide**: guide1 / password123
- **Students**: CS2021001 through CS2021011 / password123

## API Routes

- `POST /api/auth/login` — login
- `GET /api/auth/me` — get current user
- `POST /api/auth/logout` — logout
- `GET /api/batches` — list batches (guide sees all theirs; student sees their own)
- `GET /api/batches/:id` — batch detail with student scores
- `POST /api/batches/:id/evaluate` — submit evaluation marks
- `GET /api/students/:id/evaluation` — full student evaluation breakdown
- `POST /api/seed` — seed sample data

## Frontend Pages

1. **Login** (`/`) — username/password form with sample credentials shown
2. **Dashboard** (`/dashboard`) — batch cards grid for guide
3. **Batch Detail** (`/batches/:id`) — formula card, student evaluations table, evaluate modal
4. **Forms** (`/forms`) — Microsoft Forms integration link for adding more students

## Evaluation Formula

```
Final Score = (Guide + Peer Avg) - |Guide - Peer Avg|
Example: Guide=6, PeerAvg=10 → (6+10) - |6-10| = 16 - 4 = 12
```
