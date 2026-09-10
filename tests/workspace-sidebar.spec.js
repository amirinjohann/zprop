const {test,expect}=require('./auth-fixture');

test('sidebar opens and closes, retaining its choice across tools and reloads',async({page},info)=>{
  await page.goto('/tools/host-html.html?lang=en');
  const toggle=page.locator('#sidebar-toggle');
  await expect(toggle).toHaveAttribute('aria-expanded','true');
  const width=(await page.locator('.tool-main').boundingBox()).width;
  await toggle.focus();await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded','false');
  await expect(toggle).toHaveAccessibleName('Open menu');
  if(info.project.name==='mobile') {
    await expect(page.locator('#workspace-navigation')).toBeHidden();
    expect(await page.locator('#workspace-navigation').evaluate(element=>element.inert)).toBe(true);
  } else {
    await expect(page.locator('[data-tool-link=host-html]')).toBeVisible();
    expect((await page.locator('.tool-main').boundingBox()).width).toBeGreaterThan(width);
  }
  await page.reload();await expect(toggle).toHaveAttribute('aria-expanded','false');
  if(info.project.name==='mobile')await page.goto('/tools/qr-codes.html?lang=en');
  else await page.locator('[data-tool-link=qr-codes]').click();
  await expect(page).toHaveURL(/qr-codes.html\?lang=en/);
  await expect(toggle).toHaveAttribute('aria-expanded','false');
  await toggle.click();await expect(toggle).toHaveAttribute('aria-expanded','true');
  await expect(page.locator('#workspace-navigation')).toBeVisible();
  await expect(page.locator('[aria-current=page]')).toHaveAttribute('data-tool-link','qr-codes');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('bottom profile shows the signed-in account and supports close, language and sign-out',async({page},info)=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/tools/dashboard.html?lang=en');
  const user=(await (await page.request.get('/api/auth/session')).json()).user;
  const profile=page.locator('#profile-toggle'), panel=page.locator('#profile-panel');
  const nav=await page.locator('#workspace-navigation').boundingBox();
  expect((await profile.boundingBox()).y).toBeGreaterThanOrEqual(nav.y+nav.height);
  await profile.click();await expect(panel).toBeVisible();
  await expect(panel.locator('[data-profile-email]')).toHaveText(user.email);
  await expect(page.locator('#profile-role')).toHaveText('User');
  await page.keyboard.press('Escape');await expect(panel).toBeHidden();await expect(profile).toBeFocused();
  await profile.click();await profile.click();await expect(panel).toBeHidden();
  await profile.click();await page.locator('#tool-title').click();await expect(panel).toBeHidden();
  await page.locator('[data-language=ms]').click();
  await page.locator('.theme-toggle').click();
  await profile.click();await expect(page.locator('#profile-panel-title')).toHaveText('Akaun saya');
  await expect(page.locator('#profile-role')).toHaveText('Pengguna');
  await expect(page.locator('#profile-sign-out')).toHaveText('Log keluar');
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/sidebar-profile-'+info.project.name+'.png',fullPage:true});
  await page.locator('#profile-sign-out').click();
  await expect(page).toHaveURL(/sign-in.html\?lang=ms/);
  expect((await (await page.request.get('/api/auth/session')).json()).user).toBeNull();
  expect(errors).toEqual([]);
});

test('profile is usable from the collapsed sidebar and without local storage',async({page},info)=>{
  await page.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw Error('Storage unavailable');}});});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/tools/bio-pages.html?lang=en');
  await page.locator('#sidebar-toggle').click();
  await page.locator('#profile-toggle').click();
  await expect(page.locator('#profile-panel')).toBeVisible();
  await expect(page.locator('#sidebar-toggle')).toHaveAttribute('aria-expanded',info.project.name==='mobile'?'false':'true');
  await page.locator('#profile-close').click();
  await expect(page.locator('#profile-panel')).toBeHidden();
  await expect(page.locator('#profile-toggle')).toBeFocused();
  expect(errors).toEqual([]);
});
