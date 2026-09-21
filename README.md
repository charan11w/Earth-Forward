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
   npm run db:bootstrap
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


## Location maps and sign-in

Open http://127.0.0.1:5173/auth/login. All roles use the same sign-in page; the account role determines the dashboard. Public registration creates resident accounts only. The role switch has been replaced with a signed-in role indicator and a working sign-out button.

Local demo credentials:
- Resident: resident1@earthforward.demo
- Admin: admin@earthforward.demo
- Worker: worker1@earthforward.demo
- Password for all three: Demo@123

With VITE_USE_MOCKS=true (the default), registrations and requests are browser-local demonstrations, not server authentication. Use only demo passwords. Sessions survive refresh within the same tab. Newly created pickups persist in local storage per account and appear in My pickups with their saved coordinates.

With VITE_USE_MOCKS=false, login/register use the backend JWT endpoints, and API requests include the bearer token. The backend checks permissions; public registration cannot grant admin access. Admin accounts must be provisioned by the operator. The existing seed script creates the demo accounts above, but it deletes existing database records, so use it only with a disposable demo database. A running backend and configured PostgreSQL database are required for API mode.

Pickup forms support place search, clicking the map, dragging the pin, and browser geolocation. Enter a street address and area after selecting the exact point. API mode creates the address and then the pickup using that address ID. Nearby bins have selectable markers, distance from the chosen origin, and OpenStreetMap directions. Demo bin positions are illustrative Bengaluru locations.

Maps use Leaflet and OpenStreetMap tiles, with attribution. Search uses the public Photon demo service and requires no API key. Searches run only on explicit submission and cache repeated queries. Public services require internet access and are intended here for modest demo traffic; Photon offers no availability guarantee and may throttle heavy use. Configure your own provider for production volume:
- VITE_MAP_TILE_URL (default: https://tile.openstreetmap.org/{z}/{x}/{y}.png)
- VITE_GEOCODER_URL (default: https://photon.komoot.io/api/; Photon-compatible API)

Provider policies: https://operations.osmfoundation.org/policies/tiles/ and https://github.com/komoot/photon
Geolocation requires localhost or HTTPS and browser permission. If search or geolocation fails, manual map selection remains available.

Frontend validation: npm run build --prefix frontend
Browser tests: npm test --prefix frontend (first install the browser with: cd frontend; npx playwright install chromium).


## Running the local database-backed app

This workspace is now configured for API mode in the ignored frontend/.env file. The API uses a separate PostgreSQL cluster in .local-postgres on port 5433; the previously installed PostgreSQL service on port 5432 is unchanged. Generated connection credentials and JWT secret are stored only in the ignored backend/.env file.

After restarting Windows:
1. From the project directory in PowerShell, run: & .\scripts\start-database.ps1
2. Start the API in one terminal: npm run dev --prefix backend
3. Start the frontend in another: npm run dev --prefix frontend -- --host 127.0.0.1
4. Open http://127.0.0.1:5173/auth/login

On a fresh project database, run npm run db:push followed by npm run db:bootstrap before starting the API. Bootstrap adds missing local example accounts and public bins without deleting records or changing existing passwords. The older db:seed script is a destructive reset and should only be used deliberately against a disposable database.

The local starter credentials remain resident1@earthforward.demo and admin@earthforward.demo, both with password Demo@123. New registrations create real resident records. Residents' pickup addresses and selected coordinates persist in PostgreSQL; admins can see those requests under Pickups and open their saved map locations.

Verification:
- npm run build --prefix backend
- npm run build --prefix frontend
- npm run test:integration --prefix backend (requires the local API and database)
- npm test --prefix frontend (isolated demo server on port 5175)
- npm run test:live --prefix frontend (requires the live app on 5173 and API on 4000)

Live tests create temporary test accounts and clean up only their own records. Browser-local demo accounts and requests from earlier sessions are not migrated into PostgreSQL. Sign in again if an earlier demo session was open.

Local API requests now use VITE_API_URL=/api and Vite proxies them to http://127.0.0.1:4000. This works if Vite chooses another port, such as 5174. Set API_PROXY_TARGET to change the local backend port. For separately hosted production deployments, set VITE_API_URL to the deployed API URL and set the backend CLIENT_ORIGIN to the exact frontend origin. Extra loopback origins are allowed only with NODE_ENV=development. Registration asks for name, email, and password; no phone number is collected.
