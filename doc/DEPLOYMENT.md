# Deploy Earth Forward step by step: Neon, Render, and Vercel

This guide deploys the existing app without paid hosting plans or a custom domain. Use **Vercel Hobby** for `frontend`, a **Render Free Web Service** for `backend`, and **Neon Free** for PostgreSQL. Provider details checked on 21 September 2026; check the linked plan pages when signing up.

## Start here: use your existing accounts

Sign in to your existing accounts and follow this guide in order. No hosting CLI is required. Dashboard labels may vary slightly.

**Repository:** [charan11w/Earth-Forward](https://github.com/charan11w/Earth-Forward)
**Production branch:** `main`

1. **Neon:** obtain the database connection URL (section 3).
2. **Render:** deploy the API with that URL (section 4).
3. **Vercel:** deploy the frontend with the Render API URL (section 5).
4. **Render again:** allow the Vercel URL in CORS, then test login (section 6).
5. **Optional:** schedule a health check (section 7).

Keep the following values in your password manager or private notes. Never replace placeholders in this committed document with real secrets.

| Value | Where to obtain it | Where to enter it |
| --- | --- | --- |
| Database connection URL | Neon Connect dialog | Render `DATABASE_URL` only |
| JWT secret | Random-secret command in section 4 | Render `JWT_SECRET` only |
| Admin email/password | Choose your own | First Render bootstrap and app login |
| Backend URL | Render service page | Vercel `VITE_API_URL`, adding `/api` |
| Frontend URL | Vercel production deployment | Render `CLIENT_ORIGIN` |

Replace `YOUR-API` and `YOUR-FRONTEND` with the actual addresses shown by your accounts. Build commands belong in Render/Vercel settings, not in Neon SQL Editor.

## 1. Choose the free plans

| Component | Host / plan | Relevant limits |
| --- | --- | --- |
| React frontend | Vercel Hobby | Intended for personal, non-commercial projects; usage limits apply. |
| Express API | Render Free | Sleeps after 15 minutes without inbound traffic; waking can take about a minute. The workspace shares 750 free instance hours per month. |
| PostgreSQL | Neon Free | Currently includes 0.5 GB database storage and 100 CU-hours of compute per project per month. Leave scale-to-zero enabled. |
| Optional HTTP schedule | cron-job.org | Free scheduled HTTP requests. |

Sources: [Vercel Hobby usage rules](https://vercel.com/docs/limits/fair-use-guidelines), [Render Free limits](https://render.com/docs/free), [Neon's current Free plan announcement](https://neon.com/blog/neon-backend-is-ga), [Neon pricing](https://neon.com/pricing), [cron-job.org](https://cron-job.org/en/).

Use Neon for persistent database hosting: Render's free PostgreSQL databases expire after 30 days. Select the free plans explicitly, avoid paid add-ons, and monitor usage. This setup is suitable for a small personal/hackathon app; it does not promise unlimited capacity or always-on availability. Profile photos are stored in this app's database and count toward its storage allowance.

## 2. Prepare the repository

Open [the repository](https://github.com/charan11w/Earth-Forward), select `main`, and confirm `frontend/vercel.json` and this guide are visible. The source, lockfiles, and Prisma schema are included.

When importing the repository into Render/Vercel, connect the GitHub account that can access **charan11w/Earth-Forward**. If the repository is missing, grant that platform's GitHub integration access to **Earth-Forward** and refresh the import list.

Keep `.env` files, JWT secrets, database credentials, and `.local-postgres` out of Git. The repository already ignores them. Your local PostgreSQL data does not automatically move to Neon; these instructions create a fresh hosted database with only the administrator you provision.

Deployment layout:

```text
Browser -> https://YOUR-FRONTEND.vercel.app
        -> https://YOUR-API.onrender.com/api -> Neon PostgreSQL
Cron    -> https://YOUR-API.onrender.com/health
```

## 3. Create PostgreSQL on Neon

1. Sign in to the [Neon console](https://console.neon.tech/).
2. Click **New project**, name it `earth-forward`, and keep the **Free** plan. If you already have a dedicated project for this app, open it instead; do not reset it.
3. Choose a supported PostgreSQL version and a region close to your planned Render region, then create the project.
4. Open **Connect** / **Connection details** on the project dashboard.
5. Select the branch, database, and role intended for the deployed app. Keep those same selections throughout setup; the default database is often `neondb`.
6. Turn **Connection pooling off**. Copy the direct connection URL. If a `psql 'postgresql://...'` command is shown, copy only the URL inside the quotes.
7. Preserve SSL parameters and append `connection_limit=5`, `pool_timeout=30`, and `connect_timeout=30`. If the URL already contains `?`, append with `&`.
8. Keep the resulting URL privately for Render. Do not create tables manually or enable Neon Auth; Prisma and the app's existing authentication handle those parts.

Example shape only; replace it with your actual Neon URL:

```text
postgresql://USER:PASSWORD@YOUR-ENDPOINT.neon.tech/neondb?sslmode=require&connection_limit=5&pool_timeout=30&connect_timeout=30
```

The existing Prisma schema reads `DATABASE_URL` for both app queries and schema setup. A direct connection avoids needing a second migration URL; five connections keep this one API's pool small. Keep any additional SSL parameters Neon supplied. See [Neon's Prisma guide](https://neon.com/docs/guides/prisma).

Save the actual URL as a secret in Render in the next step. Do not put it in Vercel or any `VITE_` variable.

## 4. Deploy the backend on Render

### 4A. Create or configure the API service

1. Sign in to the [Render dashboard](https://dashboard.render.com/).
2. Click **New + > Web Service**. For an existing Earth Forward API service, open its **Settings** instead of creating a duplicate.
3. Connect GitHub if prompted and choose **charan11w/Earth-Forward**.
4. Set the name to something like `earth-forward-api`, select branch `main`, and choose a region close to Neon.
5. Enter these settings; check **Advanced** for options that are not immediately visible.

[Render dashboard walkthrough](https://render.com/docs/your-first-deploy)

| Setting | Value |
| --- | --- |
| Branch | `main` |
| Runtime | Node |
| Root Directory | `backend` |
| Instance Type | **Free** |
| Build Command, first deployment | `npm ci --include=dev && npm run build && npm run db:push && npm run db:bootstrap` |
| Start Command | `npm start` |
| Health Check Path | `/health` |

The first build creates the tables in the new Neon database and provisions the first admin. This repository currently uses Prisma schema push and has no migration history. Do not add `--force-reset` or `--accept-data-loss`. If a later schema change raises a data-loss warning, stop and review that change separately.

### 4B. Add backend environment variables

Before creating/deploying the service, expand **Environment Variables** and use **Add Environment Variable** for each row. For an existing service, open **Environment** from the sidebar. Enter values without surrounding quotation marks; you do not need to upload your local `.env` file.

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Your complete Neon URL from step 3 |
| `JWT_SECRET` | A newly generated long random secret |
| `JWT_EXPIRES_IN` | `7d` |
| `CLIENT_ORIGIN` | Temporarily `https://frontend-not-configured.invalid`; replace it with the real Vercel origin in section 6. |
| `ADMIN_NAME` | Your administrator's name |
| `ADMIN_EMAIL` | Your administrator's email |
| `ADMIN_PASSWORD` | A unique password between 12 and 72 characters |

Generate your own JWT secret locally:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Render supplies `PORT`; the server already reads it. Do not copy your local `PORT=4000` setting. `--include=dev` installs TypeScript, Prisma CLI, and tsx needed for this repository's build/bootstrap, even with `NODE_ENV=production`.

### 4C. Deploy and check the result

1. Click **Create Web Service**, or save/deploy the existing service.
2. Open deployment events and **Logs**. Wait until the service is live.
3. The first build should generate Prisma, create tables, and report that an administrator was created or already exists.
4. Startup should print `Earth Forward API listening on ...`.
5. Copy the actual `https://...onrender.com` address shown on the service page. This is your **backend URL**.
6. Append `/health` and open it in your browser:

```text
https://YOUR-API.onrender.com/health
```

Expected: HTTP **200** and `{"status":"ok","timestamp":"..."}`. No account, cookie, or authorization header is required.

Checkpoint: the health URL returns JSON. In Neon's table browser, check the same branch/database for tables such as `User`, `Truck`, and `Bin`. A fresh database has only the admin until real data is added.

### 4D. Remove one-time setup

After the first successful deployment:

1. Open **Settings > Build Command**, change it to `npm ci --include=dev && npm run build`, and save this change first.
2. Then open **Environment** and remove `ADMIN_PASSWORD`, `ADMIN_EMAIL`, and `ADMIN_NAME`. Keep the login privately in your password manager. The stored account remains; bootstrap never resets an existing administrator. Keep all the other environment settings.
3. Save the settings and redeploy as prompted.

For a future reviewed schema update, temporarily append `&& npm run db:push` to the build command, deploy, then restore the normal build command. Back up existing data before schema changes. Render's pre-deploy command is a paid-service feature, so this guide does not depend on it. See [Render deployment commands](https://render.com/docs/deploys) and [web service setup](https://render.com/docs/web-services).

## 5. Deploy the frontend on Vercel

### 5A. Import the frontend

1. Sign in to the [Vercel dashboard](https://vercel.com/dashboard) and choose your **Hobby** workspace.
2. Click **Add New... > Project**.
3. Under **Import Git Repository**, connect GitHub if needed, find **Earth-Forward**, and click **Import**.
4. Choose a project name such as `earth-forward`, using `main` for production.
5. Click **Edit** beside **Root Directory**, select `frontend`, and confirm. Do not select the repository root or `backend`.
6. Use the settings below. For an existing Vercel project, update them under **Settings** rather than importing a duplicate.

[Vercel Git import guide](https://vercel.com/docs/git)

| Setting | Value |
| --- | --- |
| Root Directory | `frontend` |
| Framework Preset | Vite |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

### 5B. Point the frontend at Render

Expand **Environment Variables**, add `VITE_API_URL`, and enter your actual Render backend URL followed by `/api`. Apply it to **Production**. For an existing project, use **Settings > Environment Variables**. Example:

```text
VITE_API_URL=https://YOUR-API.onrender.com/api
```

Keep `/api` at the end, with no trailing slash. Vite embeds this public API URL at build time; redeploy the frontend whenever it changes. The local `API_PROXY_TARGET` setting only applies to the Vite development/preview server and is not used by Vercel hosting.

The included `frontend/vercel.json` sends frontend deep links such as `/profile`, `/admin/routes`, and `/auth/driver` to `index.html`, allowing React Router to handle them on refresh. API requests go directly to Render using the absolute URL above. See [Vercel's Vite deployment documentation](https://vercel.com/docs/frameworks/frontend/vite).

### 5C. Deploy and copy the frontend URL

1. Click **Deploy** and wait for **Ready**.
2. Click **Visit**, or open the production domain on the project overview.
3. Copy the stable production URL, for example `https://earth-forward.vercel.app`, rather than a one-off preview URL. This is your **frontend URL**.
4. The sign-in page should open. Complete section 6 before trying to sign in.

If you edited environment variables on an existing project, open **Deployments**, use the latest production deployment's menu, and choose **Redeploy**. Editing a variable does not update already-built JavaScript. See [Vercel environment variables](https://vercel.com/docs/environment-variables).

## 6. Connect CORS and verify accounts

1. Return to **Render > your API service > Environment**, edit `CLIENT_ORIGIN`, and replace the temporary value with the exact Vercel production origin, including `https://`, without a path or trailing slash.
2. Save and let Render redeploy/restart with the new value.
3. Open the frontend's `/auth/login` and sign in using the administrator credentials from step 4.
4. Register a resident, save an address, and create a pickup to verify database access. The health endpoint alone does not test PostgreSQL.
5. In the admin dashboard, create driver accounts and assign trucks. Drivers sign in at `/auth/driver`.
6. Refresh `/profile` or a dashboard deep link to verify the Vercel rewrite.

Finish checklist:

- [ ] Render `/health` returns HTTP 200 JSON.
- [ ] Vercel loads the sign-in page.
- [ ] Admin login works and resident registration saves to Neon.
- [ ] Driver login opens the driver portal.
- [ ] Refresh works on dashboard URLs.
- [ ] Logout returns to an empty login form.
- [ ] One-time `ADMIN_*` values are removed from Render.
- [ ] All three projects remain on the selected free plans.

For multiple intended origins, `CLIENT_ORIGIN` accepts a comma-separated list of exact origins. A Vercel preview deployment has a different origin: give that deployment its API environment variable and explicitly allow its origin if you intend to use it. Production does not automatically trust every `*.vercel.app` site.

## 7. Public health/ping endpoint and optional cron

All these backend paths return the same liveness response:

| Method | Path |
| --- | --- |
| GET / HEAD | `/health` |
| GET / HEAD | `/ping` |
| GET / HEAD | `/api/health` |
| GET / HEAD | `/api/ping` |

GET returns HTTP 200 with a current UTC timestamp; HEAD returns the same status without a body. Responses use `Cache-Control: no-store`. These routes run before authentication and API rate limiting, perform no database query, and expose no user data. A successful response confirms that the HTTP server is running, not that PostgreSQL is available. Other protected API routes still require authentication.

Test locally or after deployment:

```powershell
curl.exe --fail --show-error --max-time 90 https://YOUR-API.onrender.com/health
```

To schedule a free HTTP check using [cron-job.org](https://cron-job.org/en/):

1. Create an account and a new cron job.
2. URL: `https://YOUR-API.onrender.com/health` (the Render URL, not the Vercel URL).
3. Method: **GET**. Leave authentication, request body, and custom headers empty.
4. Choose your monitoring interval, for example every 10 minutes, and enable failure notifications if desired.
5. Run the service's test execution and check for HTTP 200 and the JSON body.

A conventional cron scheduler can use:

```cron
*/10 * * * * curl --fail --silent --show-error --max-time 90 https://YOUR-API.onrender.com/health > /dev/null
```

Render's idle shutdown can cause a monitor's first request to time out; retry once startup finishes. Frequent pings can increase running hours and do not guarantee uptime or override free-plan limits. Because this endpoint does not query Neon, the check itself does not keep the database compute awake. This setup uses an external HTTP scheduler; you do not need to create a separate Render Cron Job service.

## Updating the app later

Keep the same Neon database, Render service, and Vercel project.

1. Commit and push reviewed changes to `main`.
2. If Git auto-deployment is enabled, the connected services build the changes. Otherwise use **Render > Manual Deploy > Deploy latest commit** and the Vercel deployment controls.
3. Ordinary code updates use the normal build commands; do not repeat the admin bootstrap.
4. If `schema.prisma` changes, review and back up the database before the schema update described in section 4D. Do not recreate or reset Neon for ordinary deployments.
5. A changed Render URL requires updating Vercel `VITE_API_URL` and rebuilding the frontend. A changed frontend domain requires updating Render `CLIENT_ORIGIN` and restarting/redeploying the API.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Browser reports CORS failure | Compare the browser's exact origin with Render `CLIENT_ORIGIN`; restart after changing it. |
| Login/API response is HTML or JSON parsing fails | Set Vercel `VITE_API_URL` to the full Render URL ending in `/api`, then redeploy. |
| Refreshing `/profile` gives 404 | Vercel Root Directory must be `frontend`, with `frontend/vercel.json` committed. |
| Missing tables or database connection error | Check Neon credentials and SSL parameters, then the first deployment's `db:push` logs. |
| `tsc`, `prisma`, or `tsx` not found during build | Use `npm ci --include=dev` in Render's build command. |
| Administrator not created | Check bootstrap logs and initial `ADMIN_*` values. Bootstrap does nothing if an admin already exists. |
| API is slow after inactivity | Wait for Render/Neon to wake; review their free-tier usage dashboards if failures continue. |
| Health is OK but pickup/login fails | Health only checks the server; inspect Render application logs and Neon availability. |

The repository provides the application and configuration. Complete the dashboard steps in your existing accounts, enter secrets privately, and use the finish checklist to verify the live deployment.
