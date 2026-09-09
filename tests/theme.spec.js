const {test,expect}=require('./auth-fixture');
const tools=['dashboard','bio-pages','short-links','transfer-files','vcards','host-html','qr-codes'];

test('theme persists across every page and has bilingual keyboard controls',async({page},info)=>{
  await page.goto('/?lang=en');
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  const toggle=page.getByRole('button',{name:'Dark mode',exact:true});
  await toggle.focus();await page.keyboard.press('Space');
  await expect(toggle).toHaveAttribute('aria-pressed','true');
  for(const route of ['index.html','landing.html','sign-in.html',...tools.map(t=>'tools/'+t+'.html')]){
    await page.goto('/'+route+'?lang=en');
    await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
    await expect(page.locator('.theme-toggle')).toHaveAttribute('aria-pressed','true');
    expect(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor)).toBe('rgb(16, 17, 20)');
    if(info.project.name==='mobile')await page.setViewportSize({width:320,height:740});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await page.goto('/landing.html?lang=ms');
  await expect(page.getByRole('button',{name:'Mod gelap',exact:true})).toBeVisible();
  await page.locator('[data-language=en]').click();
  await expect(page.getByRole('button',{name:'Dark mode',exact:true})).toBeVisible();
  await page.locator('.theme-toggle').click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');
});

test('theme syncs between tabs and can be reset',async({context,page})=>{
  await page.goto('/?lang=en');
  const other=await context.newPage();await other.goto('/landing.html?lang=en');
  await page.locator('.theme-toggle').click();
  await expect(other.locator('html')).toHaveAttribute('data-theme','dark');
  await page.evaluate(() => window.ZpropTheme.reset());
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  await expect(other.locator('html')).toHaveAttribute('data-theme','light');
  expect(await page.evaluate(()=>localStorage.getItem('zprop-theme'))).toBeNull();
});

test('theme works when local storage is unavailable',async({page})=>{
  await page.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new Error('Storage blocked');}});});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/landing.html');
  await page.locator('.theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.locator('.theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  expect(errors).toEqual([]);
});

test('dark theme screenshots cover forms, tools and public content',async({page},info)=>{
  await page.goto('/landing.html?lang=en');await page.locator('.theme-toggle').click();
  for(const route of ['index.html','landing.html','sign-in.html','tools/bio-pages.html','tools/vcards.html']){
    await page.goto('/'+route+'?lang=en');
    await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(img=>{img.loading='eager';return img.decode();}));});

    await page.screenshot({path:`test-results/dark-${route.replace('tools/','').replace('.html','')}-${info.project.name}.png`,fullPage:true});
  }
});
