# Earth Forward

A database-backed community waste collection app with resident, administrator and truck-driver workflows. Runtime screens use PostgreSQL records only; there is no mock mode or sample-bin seeding.

## Run locally (Windows)

From D:\Desktop\hackathon:

1. Start the project database in PowerShell:
   `& .\scripts\start-database.ps1`
2. Start the API in a terminal:
   `npm run dev --prefix backend`
3. Start the frontend in another terminal:
   `npm run dev --prefix frontend -- --host 127.0.0.1`
4. Open the Vite URL, normally http://127.0.0.1:5173.

The API uses port 4000. Vite proxies /api to it, including when the frontend moves to another port. API_PROXY_TARGET in frontend/.env can change the local backend target. For a separately deployed frontend, set VITE_API_URL to the deployed API URL and CLIENT_ORIGIN on the API to the frontend origin.

Press Ctrl+C in both application terminals to stop them. To stop the project database:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" -D "D:\Desktop\hackathon\.local-postgres" -m fast stop
```

The separate project PostgreSQL data directory is .local-postgres on port 5433. Credentials are in the ignored backend/.env file. Starting and stopping preserves saved records.

## First-time setup

Install dependencies with `npm install --prefix backend` and `npm install --prefix frontend`. Set up the database connection and JWT secret in backend/.env, then run `npm run db:push`.

For an empty database, set ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters) in backend/.env and run `npm run db:bootstrap`. This creates the first administrator only. It does not create residents, drivers, trucks, bins, rewards or sample requests. Existing administrators are preserved. db:seed is a compatibility alias for this same non-destructive setup.

On Windows, stop the API before schema updates or production builds so Prisma can regenerate its native engine without a file lock. Restart the API afterwards.

## Accounts and profiles

- Residents and admins sign in at /auth/login.
- Drivers sign in separately at /auth/driver using accounts created by an administrator.
- Public registration accepts name, email and password and always creates a resident.
- My profile supports name, optional phone number, a profile photo, and saved addresses.
- Addresses support a map/search pin, automatic address/area lookup, editable house details, landmarks and access notes. The default address is preselected for pickup requests.
- Submitted pickups keep an address snapshot, so later profile edits do not change earlier collection instructions.
- Logout asks for confirmation and clears the app session and form state.

## Administrator workflow

1. Users & drivers: create driver accounts and open actual user details.
2. Trucks: add a truck, select its starting location, set its maximum stops per run and assign one driver.
3. Bins: register actual public/community bin locations, size and collection-needed status.
4. Routes: select available trucks and actual bins/pending household pickups, preview assignments, then assign them.
5. Review pickup requests, household/community bin requests, hotspots and rewards from their corresponding pages.

Trucks already working on active routes are excluded from new plans. Drivers cannot be assigned to multiple trucks. Busy trucks and assigned bins cannot be edited until their routes close.

## Driver workflow and planning

Drivers see only their own routes and can browse registered public bin locations. Each route shows ordered stops, addresses, landmarks/access notes and a map. Drivers start the route, open road navigation for each stop, and confirm collection or mark a stop inaccessible.

The planner assigns each selected point to a nearby truck with remaining capacity, then orders that truck's stops by proximity. Capacity means maximum collection stops per run. Unassigned points are explicitly shown in the preview when capacity is insufficient. Distances and durations are estimates based on straight-line proximity; the dashed map line shows stop order, not a road or traffic model. Navigation links open road directions.

Assignment and completion use database transactions with a dispatch lock to prevent overlapping assignments and duplicate collection rewards. Completing all stops releases the truck. Collected public bins are marked as no longer needing collection; admins can mark them ready for another collection when needed.

## Maps

Leaflet displays OpenStreetMap tiles and attribution. Photon provides submitted place searches and reverse lookup of selected points. Users can edit returned details, and manual address entry remains available when lookup fails.

Optional frontend environment settings:
- VITE_MAP_TILE_URL: OpenStreetMap-compatible tile template
- VITE_GEOCODER_URL: Photon-compatible search URL
- VITE_GEOCODER_REVERSE_URL: Photon-compatible reverse lookup URL

Public map/search services need internet access and are intended for modest traffic. Configure an appropriate provider or your own service for larger deployments. See https://operations.osmfoundation.org/policies/tiles/ and https://github.com/komoot/photon.

## Validation

```powershell
npm run typecheck --prefix backend
npm test --prefix backend
npm run test:integration --prefix backend
npm run build --prefix frontend
npm test --prefix frontend
```

Integration/browser tests require the local API, database and frontend. Set LIVE_APP_URL to use a different frontend port. Tests create temporary, uniquely identified records and clean up only their own data. External map search is intercepted in browser tests for deterministic results; the running app has no test-data fallback.
