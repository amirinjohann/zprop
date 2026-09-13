const { test, expect } = require('./server-fixture');
const { request: requests } = require('@playwright/test');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const password = 'Correct-horse-123!';
const nextPassword = 'Updated-reset-123!';
const email = () => `reset-${crypto.randomUUID()}@example.com`;
async function latestCode(to) {
  const names = (await fs.readdir(process.env.ZPROP_MAIL_DIR).catch(() => [])).sort();
  let last = null;
  for (const name of names) {
    const message = JSON.parse(await fs.readFile(path.join(process.env.ZPROP_MAIL_DIR, name), 'utf8'));
    if (!to || message.to === to) last = message;
  }
  return last?.text.match(/\b(\d{6})\b/)?.[1];
}

test('forgot password always looks successful for unknown email and rejects a bad origin', async ({ request }) => {
  const address = email();
  expect((await request.post('/api/auth/forgot-password', { headers:{ Origin:'https://other.example' }, data:{ email:address } })).status()).toBe(403);
  expect((await request.post('/api/auth/forgot-password', { data:{ email:'not-an-email' } })).status()).toBe(400);
  const pending = await request.post('/api/auth/forgot-password', { data:{ email:address } });
  expect(pending.status()).toBe(202);
  expect(await pending.json()).toEqual({ pending:true });
  expect(await latestCode(address)).toBeUndefined();
  expect((await request.post('/api/auth/reset-password', { data:{ email:address, code:'123456', newPassword:nextPassword } })).status()).toBe(400);
});

test('reset code signs the user in, drops other sessions, and rejects a blocked account', async ({ request, baseURL }) => {
  const address = email();
  const other = await requests.newContext({ baseURL });
  try {
    expect((await request.post('/api/auth/register', { data:{ email:address, password } })).status()).toBe(201);
    await other.post('/api/auth/sign-in', { data:{ email:address, password } });
    expect((await (await other.get('/api/auth/session')).json()).user.email).toBe(address);
    await request.post('/api/auth/sign-out');
    expect((await request.post('/api/auth/forgot-password', { data:{ email:address } })).status()).toBe(202);
    const code = await latestCode(address);
    expect(code).toMatch(/^\d{6}$/);
    expect((await request.post('/api/auth/reset-password', { data:{ email:address, code:'000000', newPassword:nextPassword } })).status()).toBe(400);
    expect((await request.post('/api/auth/reset-password', { data:{ email:address, code, newPassword:'short' } })).status()).toBe(400);
    const reset = await request.post('/api/auth/reset-password', { data:{ email:address, code, newPassword:nextPassword } });
    expect(reset.status()).toBe(200);
    expect((await reset.json()).user.email).toBe(address);
    expect((await (await request.get('/api/auth/session')).json()).user.email).toBe(address);
    expect((await (await other.get('/api/auth/session')).json()).user).toBeNull();
    expect((await other.post('/api/auth/sign-in', { data:{ email:address, password } })).status()).toBe(401);
    expect((await other.post('/api/auth/sign-in', { data:{ email:address, password:nextPassword } })).status()).toBe(200);
    const filename = path.join(process.env.ZPROP_ACCOUNTS_DIR, crypto.createHash('sha256').update(address).digest('hex') + '.json');
    const account = JSON.parse(await fs.readFile(filename, 'utf8'));
    account.signInBlocked = true;
    delete account.passwordReset;
    await fs.writeFile(filename, JSON.stringify(account));
    expect((await request.post('/api/auth/forgot-password', { data:{ email:address } })).status()).toBe(202);
    expect(await latestCode(address)).toBe(code);
    expect((await request.post('/api/auth/reset-password', { data:{ email:address, code, newPassword:'Blocked-reset-123!' } })).status()).toBe(403);
  } finally { await other.dispose(); }
});

test('sign-in forgot password form sends a code and resets the password', async ({ page }) => {
  const address = email();
  expect((await page.request.post('/api/auth/register', { data:{ email:address, password } })).status()).toBe(201);
  await page.request.post('/api/auth/sign-out');
  await page.goto('/sign-in.html?lang=en');
  await page.locator('#forgot-password').click();
  await expect(page.locator('#sign-in-title')).toHaveText('Reset your password.');
  await expect(page.locator('#password')).toBeHidden();
  await page.locator('#email').fill(address);
  await page.locator('#sign-in-submit').click();
  await expect(page.locator('#auth-status')).toContainText('6-digit code');
  await expect(page.locator('#email-code')).toBeVisible();
  await expect.poll(() => latestCode(address)).toMatch(/^\d{6}$/);
  await page.locator('#email-code').fill(await latestCode(address));
  await page.locator('#password').fill(nextPassword);
  await page.locator('#confirm-password').fill(nextPassword);
  await page.locator('#sign-in-submit').click();
  await expect(page).toHaveURL(/\/landing.html\?lang=en$/);
  await page.locator('.nav-sign-in').click();
  await expect(page).toHaveURL(/sign-in.html/);
  await page.locator('#email').fill(address);
  await page.locator('#password').fill(nextPassword);
  await page.locator('#sign-in-submit').click();
  await expect(page).toHaveURL(/\/landing.html\?lang=en$/);
});
