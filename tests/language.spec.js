const { test, expect } = require('./auth-fixture');
const tools=['bio-pages','short-links','transfer-files','vcards','host-html','qr-codes'];

test('English tool navigation paints a complete editor without BM or an extra session round trip', async ({ page }) => {
  await page.addInitScript(() => {
    window.languageFrames = { visible:0, wrong:[] };
    function sample() {
      const title = document.querySelector('#tool-title');
      if (title && getComputedStyle(title).visibility === 'visible') {
        const expected = window.ZPROP_TOOLS?.find(tool => tool.id === document.body.dataset.tool)?.title[1];
        window.languageFrames.visible++;
        if (document.documentElement.lang !== 'en' || title.textContent !== expected || !document.querySelector('#tool-form') || document.querySelector('.nav-sign-in')?.textContent !== 'Sign out' || document.querySelector('[data-copy=backPortal]')?.textContent !== 'Back to the portal' || document.querySelector('[data-language=en]')?.getAttribute('aria-pressed') !== 'true') {
          window.languageFrames.wrong.push(title.textContent);
        }
      }
      requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  });
  await page.route(/\/(portal|tool-pages|static-site)\.js$/, async route => {
    await new Promise(resolve => setTimeout(resolve, 150));
    await route.continue();
  });
  let sessionRequests = 0;
  await page.route('**/api/auth/session', async route => {
    sessionRequests++;
    await route.continue();
  });
  for (const [index, id] of tools.entries()) {
    if (!index) await page.goto(`/tools/${id}.html?lang=en`);
    else await page.locator(`[data-tool-link="${id}"]`).click();
    await expect(page).toHaveURL(new RegExp(`/tools/${id}.html\\?lang=en`));
    await expect(page.locator('#tool-title')).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.languageFrames.visible)).toBeGreaterThan(0);
    await expect(page.locator('#tool-form:visible, #bio-library:visible, #qr-library:visible, #short-library:visible')).toBeVisible();
    expect(await page.evaluate(() => window.languageFrames.wrong)).toEqual([]);
  }
  expect(sessionRequests).toBe(0);
});

test('saved English is used on first render and an explicit BM choice takes precedence', async ({ page }) => {
  await page.goto('/landing.html?lang=en');
  await page.locator('[data-language=en]').click();
  await page.goto('/tools/bio-pages.html');
  await expect(page.locator('#tool-title')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang','en');
  await expect(page.locator('[data-language=en]')).toHaveAttribute('aria-pressed','true');
  await page.goto('/tools/bio-pages.html?lang=ms');
  await expect(page.locator('#tool-title')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang','ms');
  await expect(page.locator('[data-language=ms]')).toHaveAttribute('aria-pressed','true');
});

test('English pages display correctly when browser storage is unavailable', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage blocked'); } }));
  for (const route of ['landing.html','sign-in.html','tools/bio-pages.html','tools/host-html.html']) {
    await page.goto('/' + route + '?lang=en');
    await expect(page.locator('.portal-shell')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang','en');
    await expect(page.locator('[data-language=en]')).toHaveAttribute('aria-pressed','true');
  }
});
