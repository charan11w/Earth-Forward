# Earth Forward API

Express, TypeScript, Prisma and PostgreSQL.

Set DATABASE_URL, JWT_SECRET and CLIENT_ORIGIN in .env, install dependencies, and run `npm run db:push`. For an empty database, set ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD and run `npm run db:bootstrap`. No sample data is created.

Run `npm run dev` for development. Stop the API before `npm run build` on Windows to avoid Prisma DLL locks. Start compiled code with `npm start`.

Residents/admins use POST /api/auth/login; drivers use POST /api/auth/driver/login. Public registration creates residents only. Authenticated routes require an Authorization: Bearer token.

Profile and address APIs are under /api/users/me and /api/addresses. Admin management is under /api/admin. Route planning uses /api/routes/planning, /preview and /generate. Driver operations are under /api/worker.

Truck capacity is maximum stops per run. Route assignment and completion are serialized with a PostgreSQL transaction advisory lock. Distances are geographic estimates; no traffic-aware or globally optimal road-routing guarantee is made.

Run `npm test` for unit/CORS tests and `npm run test:integration` against the local API/database. See the project README for the complete workflow.
