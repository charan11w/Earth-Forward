# Earth Forward

Earth Forward is a hackathon-ready smart community waste collection platform. It includes a resident experience, worker route workflow, admin operations, geographic pickup clustering, nearest-neighbor route generation, hotspot detection, and a transaction-safe TrashPoints wallet.

## Repository

- `frontend/` — React, TypeScript, Vite, TanStack Query, Redux Toolkit
- `backend/` — Node.js, Express, TypeScript, PostgreSQL, Prisma
- `docker-compose.yml` — optional local PostgreSQL 16 database

## Local setup

Prerequisites: Node.js 20+, npm, and PostgreSQL (your installed PostgreSQL is fine).

1. Install dependencies:

   ```bash
   npm install
   npm run install:all
   ```

2. Copy the environment templates:

   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

   On Windows PowerShell, use `Copy-Item` instead of `cp` if desired. Put your local PostgreSQL connection string in `backend/.env`; never commit that file.

3. Create and seed the database:

   ```bash
   npm run db:push
   npm run db:seed
   ```

4. Run both applications:

   ```bash
   npm run dev
   ```

The frontend runs at `http://localhost:5173`; the API runs at `http://localhost:4000/api`. The frontend defaults to demo/mock mode so it works before PostgreSQL is connected. Set `VITE_USE_MOCKS=false` to use the API.

## Deployment

Deploy `backend/` and `frontend/` as separate Vercel projects with their respective directory as the project root.

For the backend, create a free PostgreSQL database (for example Neon or Supabase) and configure `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `CORS_ORIGIN`, and `NODE_ENV=production`. Run Prisma migrations against that database before the demo.

For the frontend, configure `VITE_API_URL` to the deployed backend URL ending in `/api` and set `VITE_USE_MOCKS=false`. For a frontend-only demo, leave mock mode enabled.

## Demo accounts

The seed script creates admin, worker, and resident accounts. See `backend/prisma/seed.ts` for the current emails and demo password.

## Security notes

- Passwords are hashed and authentication uses JWT bearer tokens.
- Roles and ownership are enforced server-side.
- Point awards, deductions, and reward stock changes are transaction-safe and recorded in a ledger.
- Secrets are loaded only from environment variables.

