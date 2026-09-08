const { test, expect } = require('./auth-fixture');

test('tools transition with stable navigation and native back/forward history', async ({ page }) => {
  await page.emulateMedia({ reducedMotion:'no-preference' });
  await page.addInitScript(() => {
    window.addEventListener('pagereveal', event => {
      window.transitionDetected = !!event.viewTransition;
      window.transitionReady = event.viewTransition?.ready.then(() => true, () => false);
      window.transitionFinished = event.viewTransition?.finished;
    });
  });
  await page.goto('/tools/bio-pages.html?lang=en');
  await expect(page.locator('#bio-library')).toBeVisible();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const sidebar = await page.locator('.tools-sidebar').boundingBox();
  await page.locator('[data-tool-link=vcards]').click();
  await expect(page).toHaveURL(/\/tools\/vcards.html\?lang=en$/);
  await expect(page.locator('#tool-form')).toBeVisible();
  // Browsers can skip a cross-document transition (for example when a tab is
  // backgrounded). The incoming editor still gets its lightweight fade-in.
  await expect.poll(() => page.evaluate(async () => {
    if (window.transitionReady) return await window.transitionReady;
    return getComputedStyle(document.querySelector('.tool-main')).animationName === 'tool-fade';
  })).toBe(true);
  await page.evaluate(() => window.transitionFinished);
  await page.evaluate(() => Promise.all(document.querySelector('.tool-main').getAnimations().map(animation => animation.finished)));
  const nextSidebar = await page.locator('.tools-sidebar').boundingBox();
  expect(nextSidebar.x).toBeCloseTo(sidebar.x, 0);
  expect(nextSidebar.y).toBeCloseTo(sidebar.y, 0);
  expect(nextSidebar.width).toBeCloseTo(sidebar.width, 0);
  await expect(page.locator('.nav-sign-in')).toHaveText('Sign out');
  await page.goBack();
  await expect(page).toHaveURL(/\/tools\/bio-pages.html\?lang=en$/);
  await expect(page.locator('#bio-library')).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(/\/tools\/vcards.html\?lang=en$/);
  await expect(page.locator('#tool-form')).toBeVisible();
  const navigations = [];
  page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations.push(frame.url()); });
  await page.locator('[data-tool-link=vcards]').click();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(navigations).toEqual([]);
});

test('reduced motion skips animation and expired sessions still go to sign-in', async ({ page, context }) => {
  await page.emulateMedia({ reducedMotion:'reduce' });
  await page.addInitScript(() => window.addEventListener('pagereveal', event => { window.transitionDetected = !!event.viewTransition; }));
  await page.goto('/tools/bio-pages.html?lang=en');
  await page.locator('[data-tool-link=host-html]').click();
  await expect(page.locator('#create-site')).toBeVisible();
  expect(await page.evaluate(() => window.transitionDetected)).toBe(false);
  expect(await page.locator('.tool-main').evaluate(element => getComputedStyle(element).animationName)).toBe('none');
  await context.request.post('/api/auth/sign-out');
  await page.locator('[data-tool-link=bio-pages]').click();
  await expect(page).toHaveURL(/sign-in.html/);
  await expect(page.locator('#sign-in-form')).toBeVisible();
});
