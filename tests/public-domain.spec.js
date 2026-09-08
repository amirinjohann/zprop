const { test, expect } = require('./auth-fixture');
test('publishing forms use the public domain and both languages omit development notices', async ({ page }) => {
  for (const route of ['landing.html', 'tools/host-html.html', 'tools/short-links.html', 'tools/transfer-files.html']) {
    await page.goto('/' + route + '?lang=en');
    for (const language of ['en', 'ms']) {
      await page.locator(`[data-language=${language}]`).click();
      await expect(page.locator('.portal-shell')).toBeVisible();
      expect(await page.locator('body').innerText()).not.toMatch(/localhost|127\.0\.0\.1|npm start|pautan tempatan|only (?:open|work) on this device/i);
      if (route.includes('host-html')) await expect(page.locator('#site-prefix')).toHaveText('zprop.tech/sites/');
      if (route.includes('short-links') || route.includes('transfer-files')) await expect(page.locator('[name=linkDomain]')).toHaveValue('https://zprop.tech');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});
