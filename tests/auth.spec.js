const { test, expect } = require('@playwright/test');
const crypto = require('node:crypto');
const email = () => `auth-${crypto.randomUUID()}@example.com`;
const password = 'Correct-horse-123!';

test('local-file tool links and direct tool pages reach server-backed sign-in', async ({ page }) => {
  const path = require('node:path');
  const { pathToFileURL } = require('node:url');
  const base = pathToFileURL(path.resolve(__dirname, '..') + path.sep);
  const ids=['bio-pages','short-links','transfer-files','vcards','host-html'];
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const id of ids) {
    await page.goto(new URL('landing.html?lang=en', base).href);
    await page.locator(`.portal-features a[href*="${id}.html"]`).click();
    await expect(page).toHaveURL(/^http:\/\/localhost:4173\/sign-in.html\?/);
    await expect(page.locator('#sign-in-form')).toBeVisible();
    const current = new URL(page.url());
    expect(current.pathname).toBe('/sign-in.html');
    expect(current.searchParams.get('next')).toBe(`/tools/${id}.html?lang=en`);
  }
  await page.goto(new URL('index.html?lang=en', base).href);
  await page.locator('[data-language=ms]').click();
  await page.locator('.portal-hero .portal-primary-button').click();
  await expect(page).toHaveURL(/^http:\/\/localhost:4173\/sign-in.html\?/);
  await expect(page.locator('#sign-in-form')).toBeVisible();
  expect(new URL(page.url()).searchParams.get('next')).toContain('/tools/host-html.html?lang=ms');
  await page.goto(new URL('tools/bio-pages.html?lang=en', base).href);
  await expect(page).toHaveURL(/^http:\/\/localhost:4173\/sign-in.html\?/);
  await expect(page.locator('#sign-in-form')).toBeVisible();
  expect(new URL(page.url()).pathname).toBe('/sign-in.html');
  expect(errors).toEqual([]);
});

test('registration works when starting from a local HTML file and returns to the chosen tool', async ({ page }) => {
  const path = require('node:path');
  const { pathToFileURL } = require('node:url');
  const base = pathToFileURL(path.resolve(__dirname, '..') + path.sep);
  const start = new URL('sign-in.html?lang=en&mode=register', base);
  start.searchParams.set('next', new URL('tools/vcards.html?lang=en', base).pathname + '?lang=en');
  await page.goto(start.href);
  await expect(page).toHaveURL(/^http:\/\/localhost:4173\/sign-in.html\?/);
  await expect(page.locator('#sign-in-title')).toHaveText('Create your account.');
  expect(new URL(page.url()).searchParams.get('next')).toBe('/tools/vcards.html?lang=en');
  const credentialsSent = [];
  page.on('request', request => { if (request.method() === 'POST') credentialsSent.push(request.url()); });
  await page.locator('#email').fill(email());
  await page.locator('#password').fill(password);
  await page.locator('#confirm-password').fill(password);
  await page.locator('#sign-in-submit').click();
  await expect(page).toHaveURL('http://localhost:4173/tools/vcards.html?lang=en');
  await expect(page.locator('#tool-workspace')).not.toBeEmpty();
  expect(credentialsSent).toEqual(['http://localhost:4173/api/auth/register']);
});

test('local static hosting without an account API opens server-backed registration', async ({ page }) => {
  const path = require('node:path');
  for (const status of [404,200]) {
    await page.route('http://zprop.test/**', async route => {
      const relative = new URL(route.request().url()).pathname.slice(1);
      if (relative === 'api/auth/session') return route.fulfill({ status, contentType:'text/html', body:'Static hosting has no API' });
      await route.fulfill({ path:path.resolve(__dirname, '..', relative) });
    });
    await page.goto('http://zprop.test/sign-in.html?lang=en&mode=register&next=/tools/bio-pages.html');
    await expect(page).toHaveURL(/^http:\/\/localhost:4173\/sign-in.html\?/);
    await expect(page.locator('#sign-in-title')).toHaveText('Create your account.');
    expect(new URL(page.url()).searchParams.get('next')).toBe('/tools/bio-pages.html?lang=en');
    await page.unroute('http://zprop.test/**');
  }
});

test('signed-out tool clicks go directly to sign-in at the root and in a subdirectory', async ({ page }) => {
  const path = require('node:path');
  await page.route('**/preview/zprop/**', async route => {
    const relative = new URL(route.request().url()).pathname.slice('/preview/zprop/'.length);
    if (relative === 'api/auth/session') return route.fulfill({ json:{ user:null } });
    await route.fulfill({ path:path.resolve(__dirname, '..', relative) });
  });
  for (const prefix of ['/', '/preview/zprop/']) {
    await page.goto(prefix + 'landing.html?lang=en');
    const toolRequests = [];
    const capture = request => { if (new URL(request.url()).pathname.includes('/tools/')) toolRequests.push(request.url()); };
    page.on('request', capture);
    await page.locator('.portal-features a').first().click();
    await expect(page.locator('#sign-in-form')).toBeVisible();
    expect(new URL(page.url()).pathname).toBe(prefix + 'sign-in.html');
    expect(new URL(page.url()).searchParams.get('next')).toBe(prefix + 'tools/bio-pages.html?lang=en');
    expect(toolRequests).toEqual([]);
    page.off('request', capture);
  }
});

test('all tools and APIs require a server session, including encoded and uppercase routes', async ({ request }) => {
  for (const route of ['/tools/bio-pages.html','/tools/short-links.html','/tools/transfer-files.html','/tools/vcards.html','/tools/host-html.html','/TOOLS/bio-pages.html','/%74ools/bio-pages.html','/tool-pages.js','/static-site.js','/bio-page.js','/bio-library.js']) {
    const response = await request.get(route, { maxRedirects:0 });
    expect(response.status()).toBe(302); expect(response.headers().location).toContain('/sign-in.html?');
  }
  for (const route of ['/api/static-sites','/api/file-links','/api/short-links','/api/bio-pages']) expect((await request.post(route, { data:{} })).status()).toBe(401);
  expect((await request.get('/.accounts/anything.json')).status()).toBe(403);
  expect((await request.get('/api/auth/session')).status()).toBe(200);
});

test('register, return to requested tool, sign out, and sign in again', async ({ page, context }, info) => {
  const address = email();
  await page.goto('/tools/bio-pages.html?lang=en');
  await expect(page).toHaveURL(/sign-in.html.*next=/);
  await expect(page.locator('#auth-notice')).toContainText('One account');
  await page.locator('#auth-mode').click();
  await page.locator('#email').fill(address);
  await page.locator('#password').fill(password);
  await page.locator('#confirm-password').fill(password);
  await page.locator('#toggle-password').click();
  await expect(page.locator('#password')).toHaveAttribute('type','text');
  await page.locator('#sign-in-submit').click();
  await expect(page).toHaveURL(/tools\/bio-pages.html\?lang=en/);
  await expect(page.locator('#tool-workspace')).not.toBeEmpty();
  const cookie = (await context.cookies()).find(c => c.name === 'zprop_session');
  expect(cookie.httpOnly).toBe(true); expect(cookie.sameSite).toBe('Lax');
  expect(await page.evaluate(() => document.cookie)).not.toContain('zprop_session');
  await page.reload(); await expect(page.locator('#tool-workspace')).not.toBeEmpty();
  await page.locator('.nav-sign-in').click();
  await expect(page).toHaveURL(/sign-in.html/);
  expect((await context.request.get('/api/auth/session')).ok()).toBe(true);
  expect((await (await context.request.get('/api/auth/session')).json()).user).toBeNull();
  await page.locator('#email').fill(address);
  await page.locator('#password').fill('wrong-password');
  await page.locator('#sign-in-submit').click();
  await expect(page.locator('#auth-status')).toContainText('incorrect');
  await page.locator('[data-language=ms]').click();
  await expect(page.locator('#auth-status')).toContainText('tidak betul');
  await page.locator('[data-language=en]').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path:`test-results/auth-${info.project.name}.png`, fullPage:true });
  await page.locator('#password').fill(password);
  await page.locator('#sign-in-submit').click();
  await expect(page).toHaveURL(/landing.html/);
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain(password);
});

test('sign-up requires matching passwords and sign-in hides confirmation', async ({ page }, info) => {
  await page.goto('/sign-in.html?lang=en&mode=register');
  const confirmation = page.locator('#confirm-password');
  const submissions = [];
  page.on('request', request => { if (request.url().includes('/api/auth/register')) submissions.push(request.url()); });
  await expect(page.getByLabel('New password', { exact:true })).toBeVisible();
  await expect(confirmation).toBeVisible();
  await expect(confirmation).toHaveAttribute('required', '');
  await page.locator('#email').fill(email());
  await page.locator('#password').fill(password);
  await page.locator('#sign-in-submit').click();
  expect(await confirmation.evaluate(input => input.validity.valueMissing)).toBe(true);
  expect(submissions).toEqual([]);
  await confirmation.fill('Different-password-123!');
  await page.locator('#sign-in-submit').click();
  await expect(page.locator('#auth-status')).toContainText('Passwords do not match');
  await expect(confirmation).toBeFocused();
  await expect(confirmation).toHaveAttribute('aria-invalid', 'true');
  expect(submissions).toEqual([]);
  await page.locator('[data-language=ms]').click();
  await expect(page.getByLabel('Sahkan kata laluan', { exact:true })).toBeVisible();
  await expect(page.locator('#auth-status')).toContainText('Kata laluan tidak sepadan');
  await page.locator('[data-language=en]').click();
  await page.locator('#auth-mode').click();
  await expect(confirmation).toBeHidden();
  await expect(confirmation).toBeDisabled();
  await expect(confirmation).not.toHaveAttribute('required', '');
  await expect(page.locator('#auth-status')).toBeEmpty();
  await page.locator('#auth-mode').click();
  await expect(confirmation).toHaveValue('');
  await confirmation.fill(password);
  await expect(confirmation).toHaveAttribute('aria-invalid', 'false');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path:`test-results/confirm-password-${info.project.name}.png`, fullPage:true });
  await page.locator('#sign-in-submit').click();
  await expect(page).toHaveURL(/\/landing.html\?lang=en$/);
  expect(submissions).toHaveLength(1);
});

test('validation, duplicate accounts, origin rejection, safe redirect and session revocation', async ({ request, page }) => {
  const address = email();
  expect((await request.post('/api/auth/register', { data:{ email:address, password:'short' } })).status()).toBe(400);
  expect((await request.post('/api/auth/register', { headers:{ Origin:'https://other.example' }, data:{ email:address, password } })).status()).toBe(403);
  expect((await request.post('/api/auth/register', { data:{ email:address, password } })).status()).toBe(201);
  const oldCookie = (await request.storageState()).cookies.find(c => c.name === 'zprop_session');
  expect((await request.post('/api/auth/register', { data:{ email:address.toUpperCase(), password } })).status()).toBe(409);
  await request.post('/api/auth/sign-out');
  expect((await request.get('/tools/bio-pages.html', { headers:{ Cookie:`zprop_session=${oldCookie.value}` }, maxRedirects:0 })).status()).toBe(302);
  await page.goto('/sign-in.html?lang=en&next=https://other.example');
  await page.locator('#email').fill(address); await page.locator('#password').fill(password);
  await page.locator('#sign-in-submit').click();
  await expect(page).toHaveURL(/\/landing.html\?lang=en$/);
});
