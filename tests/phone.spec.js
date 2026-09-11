const { test, expect } = require('./auth-fixture');

const phones = [
  { name: 'iPhone SE', width: 320, height: 568 },
  { name: 'Android compact', width: 360, height: 800 },
  { name: 'iPhone', width: 390, height: 844 },
  { name: 'iPhone Pro Max', width: 430, height: 932 },
  { name: 'landscape', width: 844, height: 390 }
];

async function fitsPhone(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const viewport = await page.locator('meta[name=viewport]').getAttribute('content');
  expect(viewport).toMatch(/width=device-width/);
  expect(viewport).toMatch(/viewport-fit=cover/);
}

test('public pages stay on-screen across phone sizes', async ({ page }) => {
  for (const phone of phones) {
    await page.setViewportSize({ width: phone.width, height: phone.height });
    for (const route of ['/', '/landing.html', '/sign-in.html']) {
      await page.goto(route + '?lang=en');
      await expect(page.locator('.portal-shell')).toBeVisible();
      await fitsPhone(page);
      await expect(page.locator('.nav-sign-in, #sign-in-submit, .portal-primary-button').first()).toBeVisible();
    }
  }
});

test('signed-in tools stay on-screen across phone sizes', async ({ page }) => {
  for (const phone of phones) {
    await page.setViewportSize({ width: phone.width, height: phone.height });
    for (const route of ['/tools/dashboard.html', '/tools/bio-pages.html', '/tools/host-html.html', '/tools/qr-codes.html']) {
      await page.goto(route + '?lang=en');
      await expect(page.locator('.tool-workspace, .dashboard-summary')).toBeVisible();
      await fitsPhone(page);
    }
  }
});
