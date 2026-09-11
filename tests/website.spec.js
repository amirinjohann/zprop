const { test, expect } = require('./auth-fixture');

test('homepage keeps the phone landing design and links to all six tools without listings', async ({page}, info) => {
  const errors = [], bad = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) bad.push(response.url()); });
  await page.goto('/?lang=en');
  await expect(page.locator('.phone-scene')).toBeVisible();
  await expect(page.locator('.phone')).toHaveCount(2);
  await expect(page.locator('.portal-features a')).toHaveCount(6);
  await expect(page.locator('.portal-features a > span')).toHaveText(['Bio pages','Short links','File link','Share vcards','Static site','QR Codes']);
  await expect(page.locator('.property-card, #properties, #search-form')).toHaveCount(0);
  expect(await page.content()).not.toMatch(/klik\.vip/i);
  await expect(page.locator('.portal-hero .portal-primary-button')).toContainText('Create a static site');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('[data-language=ms]').click();
  await expect(page.locator('.portal-hero .portal-primary-button')).toContainText('Cipta laman statik');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ms');
  await page.screenshot({path:`test-results/zprop-${info.project.name}.png`, fullPage:true});
  await page.locator('.portal-hero .portal-primary-button').click();
  await expect(page).toHaveURL(/tools\/host-html.html\?lang=ms/);
  await page.locator('#new-item').click();
  await expect(page.locator('#create-site')).toBeVisible();
  expect(errors).toEqual([]); expect(bad).toEqual([]);
});

test('saved third-party dumps are not served', async ({ request, page }) => {
  expect((await request.get('/reference.html')).status()).toBe(403);
  expect((await request.get('/listings-reference.html')).status()).toBe(403);
  expect((await request.get('/app.js')).status()).toBe(404);
  expect((await request.get('/data.js')).status()).toBe(404);
  expect((await request.get('/styles.css')).status()).toBe(404);
  expect((await request.get('/theme.css')).status()).toBe(404);
  await page.goto('/?lang=en');
  expect(await page.content()).not.toMatch(/klik\.vip|Klik VIP|zproplisting\.com/i);
});
