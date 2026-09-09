const { test, expect } = require('./auth-fixture');
const crypto = require('node:crypto');
const empty = { 'bio-pages':0, 'short-links':0, 'transfer-files':0, vcards:0, 'host-html':0, 'qr-codes':0 };
const bioState = { schemaVersion:2, shape:'rounded', background:'#ffffff', ink:'#183e32', accent:'#183e32', buttonText:'#ffffff', blocks:[] };
const qrInput = { type:'url', timeZone:'Asia/Kuala_Lumpur', state:{ name:'Dashboard QR', url:'https://example.com', foreground:'#183e32', background:'#ffffff', size:'1024' } };
const unique = () => 'stats-' + crypto.randomBytes(6).toString('hex');
async function stats(request) {
  const response = await request.get('/api/dashboard-stats');
  expect(response.status()).toBe(200);
  expect(response.headers()['cache-control']).toBe('no-store');
  return response.json();
}

test('dashboard counts each category, excludes failures and other accounts, and follows updates and deletions', async ({ page, request, browser, baseURL }, info) => {
  expect(await stats(request)).toEqual({ counts:empty, total:0 });
  const slug = unique();
  const bio = await request.post('/api/bio-pages', { data:{ slug, state:bioState } });
  expect(bio.status()).toBe(201);
  const qr = await request.post('/api/qr-codes', { data:qrInput });
  expect(qr.status()).toBe(201);
  const code = await qr.json();
  const linkSlug = unique();
  expect((await request.post('/api/short-links', { data:{ slug:linkSlug, destination:'https://example.com' } })).status()).toBe(201);
  expect((await request.post('/api/short-links', { data:{ slug:linkSlug, destination:'https://example.com' } })).status()).toBe(409);
  expect((await request.post('/api/file-links?name=test.pdf', { data:Buffer.from('%PDF-1.4\nTest'), headers:{ 'Content-Type':'application/pdf' } })).status()).toBe(201);
  expect((await request.post('/api/static-sites?type=html', { data:'<h1>Stats site</h1>', headers:{ 'Content-Type':'text/html' } })).status()).toBe(201);
  const fingerprint = crypto.randomBytes(32).toString('hex');
  for (let i = 0; i < 2; i++) expect((await request.post('/api/vcards', { data:{ id:fingerprint } })).status()).toBe(200);
  expect(await stats(request)).toEqual({ counts:Object.fromEntries(Object.keys(empty).map(key => [key, 1])), total:6 });

  await page.goto('/tools/dashboard.html?lang=en');
  await expect(page.locator('.summary-card')).toHaveCount(6);
  await expect(page.locator('#summary-total')).toHaveText('6');
  await expect(page.locator('[data-tool-link=dashboard]')).toHaveAttribute('aria-current', 'page');
  await page.screenshot({ path:`test-results/dashboard-${info.project.name}.png`, fullPage:true });
  await page.locator('.theme-toggle').click();
  await page.screenshot({ path:`test-results/dashboard-dark-${info.project.name}.png`, fullPage:true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  const original = await bio.json();
  expect((await request.put('/api/bio-pages/' + slug, { data:{ ...original, state:bioState, publish:false } })).status()).toBe(200);
  expect((await request.put('/api/qr-codes/' + code.id, { data:{ ...qrInput, revision:code.revision } })).status()).toBe(200);
  expect((await stats(request)).total).toBe(6);
  const updatedBio = await (await request.get('/api/bio-pages/' + slug)).json();
  const updatedQr = await (await request.get('/api/qr-codes/' + code.id)).json();
  expect((await request.delete('/api/bio-pages/' + slug, { data:{ revision:updatedBio.revision } })).status()).toBe(200);
  expect((await request.delete('/api/qr-codes/' + code.id, { data:{ revision:updatedQr.revision } })).status()).toBe(200);
  await page.locator('#summary-refresh').click();
  await expect(page.locator('#summary-total')).toHaveText('4');
  await expect(page.locator('[data-summary-count=bio-pages]')).toHaveText('0');
  await expect(page.locator('[data-summary-count=qr-codes]')).toHaveText('0');
  await page.reload();
  await expect(page.locator('#summary-total')).toHaveText('4');

  const other = await browser.newContext();
  try {
    expect((await other.request.get(baseURL + '/api/dashboard-stats')).status()).toBe(401);
    const redirect = await other.request.get(baseURL + '/tools/dashboard.html', { maxRedirects:0 });
    expect(redirect.status()).toBe(302);
    expect((await other.request.post(baseURL + '/api/auth/register', { data:{ email:unique() + '@example.com', password:'Test-password-123!' } })).status()).toBe(201);
    expect(await (await other.request.get(baseURL + '/api/dashboard-stats')).json()).toEqual({ counts:empty, total:0 });
  } finally { await other.close(); }
  expect((await request.post('/api/vcards', { data:{ id:fingerprint }, headers:{ Origin:'https://example.com' } })).status()).toBe(403);
  expect((await request.post('/api/vcards', { data:{ id:'../invalid' } })).status()).toBe(400);
});

test('dashboard has translated empty, loading and retry states with automatic refresh', async ({ page, request }) => {
  await page.clock.install();
  await page.goto('/landing.html?lang=en');
  await page.locator('.portal-nav [data-copy=dashboard]').click();
  await expect(page.locator('#summary-total')).toHaveText('0');
  await expect(page.locator('#summary-status')).toContainText('No items yet');
  await page.locator('[data-language=ms]').click();
  await expect(page.locator('#summary-title')).toHaveText('Ringkasan item');
  await expect(page.locator('#summary-status')).toContainText('Belum ada item');
  await page.route('**/api/dashboard-links', route => route.fulfill({ status:500, contentType:'application/json', body:'{}' }));
  await page.locator('#summary-refresh').click();
  await expect(page.locator('#summary-status')).toContainText('Jumlah tidak dapat dimuatkan');
  await expect(page.locator('#summary-total')).toHaveText('—');
  await page.unroute('**/api/dashboard-links');
  await page.locator('#summary-refresh').click();
  await expect(page.locator('#summary-total')).toHaveText('0');
  expect((await request.post('/api/qr-codes', { data:qrInput })).status()).toBe(201);
  await page.clock.fastForward(31000);
  await expect(page.locator('#summary-total')).toHaveText('1');
  await page.locator('.summary-card[data-category=qr-codes]').click();
  await expect(page).toHaveURL(/qr-codes.html\?lang=ms/);
});

test('vCard downloads are counted once per distinct card', async ({ page, request }) => {
  await page.goto('/tools/vcards.html?lang=en');
  await page.locator('[name=name]').fill('Dashboard contact');
  await page.locator('[name=phone]').fill('+60123456789');
  await page.locator('[name=email]').fill('contact@example.com');
  for (let i = 0; i < 2; i++) {
    const downloaded = page.waitForEvent('download');
    await page.locator('[data-action=downloadVcard]').click();
    expect((await downloaded).suggestedFilename()).toBe('zprop-contact.vcf');
    expect((await stats(request)).counts.vcards).toBe(1);
  }
  await page.locator('[name=name]').fill('Another contact');
  const downloaded = page.waitForEvent('download');
  await page.locator('[data-action=downloadVcard]').click();
  await downloaded;
  await page.locator('[data-tool-link=dashboard]').click();
  await expect(page.locator('[data-summary-count=vcards]')).toHaveText('2');
});
