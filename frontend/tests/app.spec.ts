import { test, expect, Page } from '@playwright/test';
test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.route('https://fonts.gstatic.com/**', route => route.abort());
});
async function login(page: Page, email = 'resident1@earthforward.demo') {
  await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill('Demo@123');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}
test('credentials, role guards, persistent session and logout', async ({ page }) => {
  await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/auth\/login/);
  await page.getByLabel('Email', { exact: true }).fill('admin@earthforward.demo');
  await page.getByLabel('Password', { exact: true }).fill('wrongpass');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Invalid email or password');
  await login(page, 'admin@earthforward.demo');
  await expect(page).toHaveURL(/admin\/dashboard/);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Admin account', { exact: true })).toBeVisible();
  await page.goto('/app/pickups/new', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/admin\/dashboard/);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/auth\/login/);
  await login(page);
  await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/app\/dashboard/);
});
test('resident registration validates passwords and permits later login', async ({ page }) => {
  await page.goto('/auth/register', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Full name').fill('Test Resident');
  await page.getByLabel('Email', { exact: true }).fill('test@example.com');
  await page.getByLabel('Password', { exact: true }).fill('TestPass123');
  await page.getByLabel('Confirm password').fill('Mismatch123');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Passwords do not match');
  await page.getByLabel('Confirm password').fill('TestPass123');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page).toHaveURL(/app\/dashboard/);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.getByLabel('Email', { exact: true }).fill('test@example.com');
  await page.getByLabel('Password', { exact: true }).fill('TestPass123');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText('Resident account', { exact: true })).toBeVisible();
});
test('search, map selection, pickup persistence and bin location', async ({ page }) => {
  await page.route('https://photon.komoot.io/**', route => route.fulfill({ json: { features: [{ geometry: { coordinates: [77.5946, 12.9716] }, properties: { name: 'Test Park', city: 'Bengaluru' } }] } }));
  await login(page);
  await page.goto('/app/pickups/new', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Pickup address').fill('12 Test Road');
  await page.getByLabel('Area / neighborhood').fill('Bengaluru');
  await page.getByRole('button', { name: 'Submit request' }).click();
  await expect(page.getByRole('alert')).toContainText('Choose a location');
  await page.getByRole('textbox', { name: 'Search for a place' }).fill('Test Park');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByRole('button', { name: 'Test Park, Bengaluru', exact: true }).click();
  await expect(page.getByLabel('Pickup address')).toHaveValue('Test Park, Bengaluru');
  await expect(page.getByText('Selected: 12.971600, 77.594600')).toBeVisible();
  await page.locator('.leaflet-map').click({ position: { x: 130, y: 140 } });
  await page.getByLabel('Pickup address').fill('12 Test Road');
  await page.getByRole('button', { name: 'Submit request' }).click();
  await expect(page.getByRole('heading', { name: 'Request submitted!' })).toBeVisible();
  await page.getByRole('link', { name: 'View my pickups' }).click();
  await expect(page.getByText('12 Test Road', { exact: false }).first()).toBeVisible();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: 'View details' }).first().click();
  await expect(page.getByRole('heading', { name: '12 Test Road' })).toBeVisible();
  await expect(page.locator('.map-coordinates')).toBeVisible();
  await page.goto('/app/bins/nearby', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'View location' }).first().click();
  await expect(page.locator('.selected-bin')).toBeVisible();
  await expect(page.getByText('Shown on map:', { exact: false })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Directions' }).first()).toHaveAttribute('href', /openstreetmap.org\/directions/);
});
test('search failure and denied geolocation provide usable fallback', async ({ page }) => {
  await page.route('https://photon.komoot.io/**', route => route.fulfill({ status: 503 }));
  await page.addInitScript(() => { navigator.geolocation.getCurrentPosition = (_ok, fail) => fail?.({ code: 1, message: 'Denied', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 }); });
  await login(page);
  await page.goto('/app/pickups/new', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Use my location' }).click();
  await expect(page.getByRole('alert')).toContainText('Could not access');
  await page.getByRole('textbox', { name: 'Search for a place' }).fill('Bengaluru');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Search unavailable');
  await page.locator('.leaflet-map').click({ position: { x: 130, y: 140 } });
  await expect(page.locator('.map-coordinates')).toBeVisible();
});


test('current location and mobile map layout', async ({ page, context }) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 12.98, longitude: 77.60 });
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.goto('/app/pickups/new', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Use my location' }).click();
  await expect(page.getByText('Selected: 12.980000, 77.600000')).toBeVisible();
  await expect(page.locator('.leaflet-marker-draggable')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await page.screenshot({ path: 'test-results/mobile-pickup.png', fullPage: true });
});


test('API mode sends bearer tokens and the chosen coordinates to the backend contract', async ({ page }) => {
  await page.route('**/src/services/api.ts*', async route => {
    const response = await route.fetch();
    const body = (await response.text()).replaceAll('import.meta.env.VITE_USE_MOCKS', '"false"');
    await route.fulfill({ response, body });
  });
  const calls: { path: string; body: any; token?: string }[] = [];
  await page.route('http://localhost:4000/api/**', async route => {
    const req = route.request(), path = new URL(req.url()).pathname;
    if (req.method() === 'OPTIONS') { await route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization,content-type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' } }); return; }
    calls.push({ path, body: req.postDataJSON(), token: req.headers().authorization });
    const user = { id: 'real-resident', name: 'API Resident', role: 'RESIDENT', trashPoints: 20 };
    const data = path.endsWith('/auth/login') ? { user, token: 'server-issued-token' } : path.endsWith('/users/me') ? user : path.endsWith('/addresses') ? { id: 'saved-address' } : path.endsWith('/pickups/my') ? [] : { id: 'saved-pickup' };
    await route.fulfill({ json: data, headers: { 'Access-Control-Allow-Origin': '*' } });
  });
  await login(page);
  await expect(page).toHaveURL(/app\/dashboard/);
  await page.goto('/app/pickups/new', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Pickup address').fill('12 API Road');
  await page.getByLabel('Area / neighborhood').fill('Bengaluru');
  await page.locator('.leaflet-map').click({ position: { x: 130, y: 140 } });
  await page.getByRole('button', { name: 'Submit request' }).click();
  await expect(page.getByRole('heading', { name: 'Request submitted!' })).toBeVisible();
  const address = calls.find(c => c.path.endsWith('/addresses'));
  expect(address?.token).toBe('Bearer server-issued-token');
  expect(address?.body).toMatchObject({ addressLine: '12 API Road', area: 'Bengaluru', latitude: expect.any(Number), longitude: expect.any(Number) });
  expect(calls.find(c => c.path.endsWith('/pickups'))?.body).toMatchObject({ addressId: 'saved-address', wasteType: 'MIXED', quantity: 1 });
});

