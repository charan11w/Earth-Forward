# Earth Forward API

Express, TypeScript, PostgreSQL and Prisma backend for the Earth Forward hackathon demo.

## Local setup

1. Copy `.env.example` to `.env` and set `DATABASE_URL` and a strong `JWT_SECRET`.
2. Run `npm install`.
3. Run `npm run db:push` (or create a migration with `npm run db:migrate`).
4. Run `npm run db:bootstrap` for demo data.
5. Run `npm run dev`. The health endpoint is `GET /api/health`.

All protected endpoints use `Authorization: Bearer <token>`. Demo seed accounts share password `Demo@123`.

## Vercel

Set `DATABASE_URL`, `JWT_SECRET`, and `CLIENT_ORIGIN` in the Vercel project. Use a pooled PostgreSQL connection URL for serverless deployments. `api/index.ts` exports the Express app without starting a persistent listener.
