# Earth Forward

**Earth Forward is a community waste collection app that connects residents, administrators, and truck drivers.** Residents request pickups and report waste locations. Administrators manage bins and vehicles, then assign collection routes. Drivers follow their assigned stops and record collection outcomes.

The app brings the collection workflow into one place: a resident's saved address becomes a pickup request, an administrator assigns it to a truck, and the driver's completion updates the request and the resident's TrashPoints balance.

## Who uses it?

| Role | What they can do | Sign-in page |
| --- | --- | --- |
| Resident | Request pickups, find nearby bins, request household/community bins, report waste, manage saved addresses, and redeem TrashPoints. | `/auth/login` |
| Administrator | View users, create driver accounts, manage trucks and bins, assign routes, review requests and hotspots, and create rewards. | `/auth/login` |
| Truck driver | View their assigned routes, locate public bins, open directions, and mark stops collected or inaccessible. | `/auth/driver` |

Public registration at `/auth/register` creates a resident account using only a name, email, and password. Administrators create driver accounts. The first administrator is provisioned through the bootstrap command described below.

## Main features

- **Map-based addresses:** search for a place, use the current location, or select/drag a pin. Address and area details fill automatically when lookup succeeds; users can edit them and add landmarks and access instructions.
- **Profiles and saved locations:** name, photo, optional phone number, and multiple saved addresses. The default address is preselected when requesting a pickup. Submitted pickups retain an address snapshot so later profile edits do not change the original instructions.
- **Pickup tracking:** residents see request history, collection status, and assigned truck/driver details. Eligible requests can be cancelled before assignment.
- **Fleet and bin management:** administrators register real trucks and public/community bins, assign one driver to a truck, and mark bins that need collection.
- **Route planning:** preview how selected bins and pending pickups will be distributed across available trucks before assigning the routes.
- **Driver collection tools:** ordered stops, location maps, landmarks, road-navigation links, and collection/failure updates.
- **TrashPoints and rewards:** completed pickups earn points; residents can view transactions and redeem available rewards.
- **Community reporting:** residents submit waste reports; administrators review resulting hotspots and record follow-up actions.
- **Navigation and account handling:** role-specific dashboards, breadcrumbs, profile links, and confirmation before logout. Sign-in forms start empty on each visit and browser page restoration, with autofill suppression until a field is focused.

Screens use records from PostgreSQL. Empty accounts show empty states until users or administrators add actual data; there is no runtime mock-data mode.

## How a collection works

1. A resident saves an address using the map and submits a pickup request with waste details.
2. An administrator creates driver accounts, adds trucks and their starting positions, and registers public/community bins.
3. In **Routes**, the administrator selects available trucks and collection points, previews the plan, and confirms assignments.
4. A driver signs in through the driver portal, starts an assigned route, and follows its ordered stops.
5. The driver confirms collection or records an inaccessible stop. The app updates pickup/bin status and awards points for completed resident pickups.
6. Once all stops on a route have been handled, the truck becomes available for another route.

### What the route planner calculates

The planner assigns each selected collection point to a nearby truck with remaining capacity, then orders that truck's stops by proximity. Truck capacity currently means **maximum collection stops per run**, not weight or volume. Points that exceed the selected fleet's capacity are shown as unassigned in the preview.

Distances and durations are estimates based on geographic proximity. The dashed map line shows the stop sequence; it is not a traffic-aware road route or a guarantee of the shortest possible journey. Drivers open the navigation link for road directions.

Active trucks and drivers are excluded from new plans. Database transactions coordinate route assignment and completion to prevent duplicate assignments and repeated collection rewards. Collected public bins stop appearing as collection-needed until an administrator marks them ready again.

## Technology and structure

| Layer | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite, React Router |
| Client state and server data | Redux Toolkit, TanStack Query |
| Maps and place lookup | Leaflet, OpenStreetMap tiles, Photon |
| Backend | Node.js, Express, TypeScript, Zod |
| Authentication | JWT sessions, bcrypt password hashes, role/ownership checks |
| Database | PostgreSQL through Prisma |
| Verification | Vitest and Playwright |

```text
Browser (React)
  | HTTP requests with a session token
  v
Express API
  | Prisma queries and transactions
  v
PostgreSQL

Browser maps -> OpenStreetMap tiles + Photon place lookup
```

```text
frontend/
  src/components/features/   Resident, admin, driver, and authentication screens
  src/components/common/     Shared maps, address editor, and UI components
  src/components/layout/     Navigation, breadcrumbs, and logout
  src/services/              API, authentication, and geocoding clients
  src/store.ts               Session state
  tests/                     Browser workflow tests
  vercel.json                Frontend deployment and deep-link configuration
backend/
  src/modules/               API endpoints grouped by feature
  src/services/              Dispatch, allocation, points, and other business logic
  src/config/                Environment, database, and CORS settings
  prisma/schema.prisma       Data model
  prisma/bootstrap.ts        First-administrator setup
  tests/                     Unit and API integration tests
scripts/start-database.ps1    Local Windows PostgreSQL helper
DEPLOYMENT.md                Vercel, Render, Neon, and cron setup
```

## Set up locally

You need Node.js with npm and a reachable PostgreSQL database. Run the commands below from the repository root. The optional Windows helper expects PostgreSQL 18 in `C:\Program Files\PostgreSQL\18\bin`; edit its `postgresBin` setting if your installation differs.

### 1. Install dependencies

```powershell
npm ci --prefix backend
npm ci --prefix frontend
```

### 2. Configure PostgreSQL and environment variables

Choose one database setup:

- **Project-local database on Windows:** run `& .\scripts\start-database.ps1`. On first use, it creates `.local-postgres`, generates database/JWT secrets in `backend/.env`, and starts PostgreSQL on `127.0.0.1:5433`. It refuses to overwrite an existing backend environment file when initializing a new cluster.
- **Existing local or hosted PostgreSQL:** copy `backend/.env.example` to `backend/.env` only if the file does not already exist. Set `DATABASE_URL` to your database and replace `JWT_SECRET` with a long random value. Use your existing database service instead of the Windows helper.

Create `frontend/.env` from `frontend/.env.example` if needed. For local development, keep `VITE_API_URL=/api`.

| Setting | Location | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `backend/.env` | PostgreSQL connection string |
| `JWT_SECRET` | `backend/.env` | Secret for signing session tokens |
| `PORT` | `backend/.env` | API port; defaults to `4000` locally |
| `CLIENT_ORIGIN` | `backend/.env` | Allowed frontend origins; comma-separated when needed |
| `VITE_API_URL` | `frontend/.env` | `/api` locally; full backend URL ending in `/api` when deployed |
| `API_PROXY_TARGET` | `frontend/.env` | Local Vite proxy target; defaults to `http://127.0.0.1:4000` |

Keep environment files and database credentials out of Git. The repository's `.gitignore` already excludes them.

### 3. Create tables and the first administrator

With PostgreSQL running, apply the schema:

```powershell
npm run db:push --prefix backend
```

For a new database, add `ADMIN_NAME`, `ADMIN_EMAIL`, and a unique `ADMIN_PASSWORD` of 12-72 characters to `backend/.env`, then run:

```powershell
npm run db:bootstrap --prefix backend
```

This creates the first administrator only. If one already exists, it leaves the account unchanged. It does not create sample drivers, trucks, bins, or requests. Remove the `ADMIN_*` setup values after provisioning. `db:seed` is a compatibility alias for this same bootstrap process.

On Windows, stop the API before commands that regenerate Prisma, such as schema updates and backend production builds, to avoid locking its native engine file.

## Start and stop the app

Start your PostgreSQL service first. If using the project-local Windows database:

```powershell
& .\scripts\start-database.ps1
```

Start the API in one terminal:

```powershell
npm run dev --prefix backend
```

Start the frontend in another terminal:

```powershell
npm run dev --prefix frontend -- --host 127.0.0.1
```

Open the URL printed by Vite, normally **http://127.0.0.1:5173**. The API listens on port **4000**. Vite proxies `/api` requests to the backend, including when Vite chooses a different available frontend port.

To stop the frontend and API, press **Ctrl+C** in each terminal. To stop the project-local database, run from the repository root:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" -D "$PWD\.local-postgres" -m fast stop
```

Stopping preserves saved records. If you use a different PostgreSQL service, stop it through that service's own controls.

## Maps and external services

Leaflet displays OpenStreetMap tiles; Photon provides place search and reverse lookup. Map selection keeps the exact chosen coordinates, and users can enter address details manually if lookup fails. Geolocation requires browser permission and a secure context such as HTTPS or localhost.

Optional frontend settings are `VITE_MAP_TILE_URL`, `VITE_GEOCODER_URL`, and `VITE_GEOCODER_REVERSE_URL`. The map/search services require internet access; deployment and provider considerations are covered in [DEPLOYMENT.md](DEPLOYMENT.md).

## Health checks

The backend exposes public `GET` and `HEAD` routes at `/health`, `/ping`, `/api/health`, and `/api/ping`. They require no authentication and sit outside the API rate limit.

```powershell
curl.exe http://127.0.0.1:4000/health
```

GET returns `{"status":"ok","timestamp":"..."}`. This checks that the HTTP server is running; it does not query or validate PostgreSQL. See the deployment guide for scheduled HTTP checks.

## Tests and builds

```powershell
npm run typecheck --prefix backend
npm test --prefix backend
npm run test:integration --prefix backend
npm run build --prefix frontend
npm test --prefix frontend
```

The API integration tests need PostgreSQL and the API running. Browser tests also need the frontend; set `LIVE_APP_URL` if it runs on another URL. Tests create temporary records and clean up their own data. Map lookups are intercepted in browser tests so checks do not depend on external search results.

To build the backend, stop its development server on Windows and run `npm run build --prefix backend`. Run the compiled API with `npm start --prefix backend`.

## Deploy

Follow **[DEPLOYMENT.md](DEPLOYMENT.md)** for the Vercel frontend, Render API, and Neon PostgreSQL setup. It includes the current free-plan constraints, build commands, secrets, administrator provisioning, CORS settings, and optional cron monitoring.
