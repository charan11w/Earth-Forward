import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import path from 'node:path';

const requireBackend = createRequire(path.resolve('../backend/package.json'));
requireBackend('dotenv').config({ path: '../backend/.env', quiet: true });
const { PrismaClient } = requireBackend('@prisma/client');
const bcrypt = requireBackend('bcryptjs');
const db = new PrismaClient();
const tag = 'logout-' + Date.now();
const password = 'LogoutCheck123!';
const accounts = [
  { role: 'RESIDENT', portal: '/auth/login', home: '/app/dashboard' },
  { role: 'ADMIN', portal: '/auth/login', home: '/admin/dashboard' },
  { role: 'WORKER', portal: '/auth/driver', home: '/worker' },
].map(account => ({ ...account, email: `${tag}-${account.role.toLowerCase()}@example.test` }));

test.beforeAll(async () => {
  const passwordHash = await bcrypt.hash(password, 10);
  await db.user.createMany({
    data: accounts.map(({ email, role }) => ({ name: `${tag} ${role}`, email, role, passwordHash })),
  });
});

test.afterAll(async () => {
  await db.user.deleteMany({ where: { email: { in: accounts.map(account => account.email) } } });
  await db.$disconnect();
});

test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
});

for (const account of accounts) {
  test(`${account.role}: logout clears credentials and reload keeps the login empty`, async ({ page }) => {
    await page.goto(account.portal, { waitUntil: 'domcontentloaded' });
    const email = page.getByLabel('Email', { exact: true });
    const secret = page.getByLabel('Password', { exact: true });
    await expect(email).toHaveValue('');
    await expect(secret).toHaveValue('');
    await expect(email).not.toBeEditable();
    await expect(secret).not.toBeEditable();

    // Both pointer and keyboard access must unlock entry; paste/fill remains usable.
    await email.click();
    await email.fill(account.email);
    await email.press('Tab');
    await expect(secret).toBeFocused();
    await expect(secret).toBeEditable();
    await secret.fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(account.home + '$'));

    page.once('dialog', dialog => dialog.dismiss());
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(new RegExp(account.home + '$'));

    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(new RegExp(account.portal + '$'));
    await expect(email).toHaveValue('');
    await expect(secret).toHaveValue('');
    await expect(email).not.toBeEditable();
    await expect(secret).not.toBeEditable();
    expect(await page.evaluate(() => sessionStorage.getItem('ef-session'))).toBeNull();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(email).toHaveValue('');
    await expect(secret).toHaveValue('');
    await expect(secret).not.toBeEditable();

    // Credentials must still be accepted after the post-logout field guards unlock.
    await email.click();
    await email.fill(account.email);
    await secret.click();
    await secret.fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(account.home + '$'));
    await page.getByRole('link', { name: 'My profile', exact: true }).click();
    await expect(page).toHaveURL(/\/profile$/);
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(new RegExp(account.portal + '$'));
    await expect(email).toHaveValue('');
    await expect(secret).toHaveValue('');
  });
}

test('restoring browser history and switching login portals clear form values', async ({ page }) => {
  await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });
  const email = page.getByLabel('Email', { exact: true });
  const secret = page.getByLabel('Password', { exact: true });
  await email.click();
  await email.fill('remembered@example.test');
  await secret.click();
  await secret.fill(password);

  // Reproduce a browser back/forward cache restore without storing real credentials.
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await expect(email).toHaveValue('');
  await expect(secret).toHaveValue('');
  await expect(secret).not.toBeEditable();

  await email.click();
  await email.fill('another@example.test');
  await page.getByRole('link', { name: 'Truck driver sign in' }).click();
  await expect(page).toHaveURL(/\/auth\/driver$/);
  await expect(email).toHaveValue('');
  await expect(secret).toHaveValue('');
  await page.getByRole('link', { name: 'Resident / admin sign in' }).click();
  await expect(email).toHaveValue('');
  await expect(secret).toHaveValue('');
});
