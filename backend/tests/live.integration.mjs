import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
const base = 'http://127.0.0.1:4000/api';
async function call(path, body, token) {
  const response = await fetch(base + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  return { status: response.status, data: await response.json() };
}
test('live authentication, access control and location persistence', async t => {
  const users = [];
  let resident, outsider, address, pickup, admin;
  const email = 'integration-' + Date.now() + '@example.test';
  try {
    await t.test('anonymous and invalid requests are rejected', async () => {
      assert.equal((await call('/pickups/my')).status, 401);
      assert.equal((await call('/auth/register', { email: 'bad', password: 'short' })).status, 400);
      assert.equal((await call('/auth/login', { email: 'admin@earthforward.demo', password: 'WrongPassword123' })).status, 401);
    });
    await t.test('public registration cannot grant admin access', async () => {
      const result = await call('/auth/register', { name: 'Integration Resident', email: email.toUpperCase(), password: 'TestPass123', role: 'ADMIN' });
      assert.equal(result.status, 201);
      resident = result.data; users.push(resident.user.id);
      assert.equal(resident.user.role, 'RESIDENT');
      assert.equal(resident.user.email, email);
      assert.equal(resident.user.passwordHash, undefined);
      assert.equal((await call('/admin/dashboard', undefined, resident.token)).status, 403);
      const second = await call('/auth/register', { name: 'Other Resident', email: 'other-' + email, password: 'TestPass123' });
      outsider = second.data; users.push(outsider.user.id);
    });
    await t.test('login is case-insensitive and duplicate registration is rejected', async () => {
      assert.equal((await call('/auth/register', { name: 'Duplicate', email, password: 'TestPass123' })).status, 409);
      const login = await call('/auth/login', { email: email.toUpperCase(), password: 'TestPass123' });
      assert.equal(login.status, 200);
      assert.equal((await call('/auth/me', undefined, login.data.token)).data.id, resident.user.id);
    });
    await t.test('pickup coordinates persist and address ownership is enforced', async () => {
      assert.equal((await call('/addresses', { addressLine: 'Test House', area: 'Test Area', latitude: 100, longitude: 77 }, resident.token)).status, 400);
      const created = await call('/addresses', { addressLine: 'Test House', area: 'Test Area', latitude: 12.974321, longitude: 77.598765 }, resident.token);
      assert.equal(created.status, 201); address = created.data;
      assert.equal((await call('/pickups', { addressId: address.id, wasteType: 'DRY', quantity: 2 }, outsider.token)).status, 404);
      const result = await call('/pickups', { addressId: address.id, wasteType: 'DRY', quantity: 2 }, resident.token);
      assert.equal(result.status, 201); pickup = result.data;
      assert.equal(pickup.latitude, address.latitude);
      assert.equal(pickup.longitude, address.longitude);
      const saved = await db.pickupRequest.findUniqueOrThrow({ where: { id: pickup.id } });
      assert.equal(saved.latitude, 12.974321);
      assert.ok((await call('/pickups/my', undefined, resident.token)).data.some(p => p.id === pickup.id));
      assert.ok(!(await call('/pickups/my', undefined, outsider.token)).data.some(p => p.id === pickup.id));
    });
    await t.test('admin sees resident pickups and dashboard counts', async () => {
      const result = await call('/auth/login', { email: 'admin@earthforward.demo', password: 'Demo@123' });
      assert.equal(result.status, 200); admin = result.data;
      const overview = await call('/admin/dashboard', undefined, admin.token);
      assert.equal(overview.status, 200);
      assert.ok(overview.data.counts.pendingPickups >= 1);
      assert.ok((await call('/admin/pickups', undefined, admin.token)).data.some(p => p.id === pickup.id));
    });
    await t.test('nearby bins are public and coordinates are validated', async () => {
      const bins = await call('/bins/nearby?lat=12.9716&lng=77.5946&radius=5000', undefined, resident.token);
      assert.equal(bins.status, 200);
      assert.ok(bins.data.length >= 3);
      assert.ok(bins.data.every(b => b.type === 'PUBLIC' || b.type === 'COMMUNITY'));
      assert.equal((await call('/bins/nearby?lat=100&lng=77', undefined, resident.token)).status, 400);
    });
  } finally {
    await db.pickupRequest.deleteMany({ where: { userId: { in: users } } });
    await db.address.deleteMany({ where: { userId: { in: users } } });
    await db.user.deleteMany({ where: { id: { in: users } } });
    await db.$disconnect();
  }
});

