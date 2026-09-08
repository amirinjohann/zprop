const { test, expect } = require('./auth-fixture');

test('homepage keeps the phone landing design and links to all five tools without listings', async ({page}, info) => {
  const errors = [], bad = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) bad.push(response.url()); });
  await page.goto('/?lang=en');
  await expect(page.locator('.phone-scene')).toBeVisible();
  await expect(page.locator('.phone')).toHaveCount(2);
  await expect(page.locator('.portal-features a')).toHaveCount(5);
  await expect(page.locator('.portal-features a > span')).toHaveText(['Bio pages','Short links','File link','Share vcards','Static site']);
  await expect(page.locator('.property-card, #properties, #search-form')).toHaveCount(0);
  await expect(page.locator('.portal-hero .portal-primary-button')).toContainText('Create a static site');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('[data-language=ms]').click();
  await expect(page.locator('.portal-hero .portal-primary-button')).toContainText('Cipta laman statik');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ms');
  await page.screenshot({path:`test-results/zprop-${info.project.name}.png`, fullPage:true});
  await page.locator('.portal-hero .portal-primary-button').click();
  await expect(page).toHaveURL(/tools\/host-html.html\?lang=ms/);
  await expect(page.locator('#create-site')).toBeVisible();
  expect(errors).toEqual([]); expect(bad).toEqual([]);
});
