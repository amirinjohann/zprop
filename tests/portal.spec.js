const {test,expect}=require('@playwright/test');

test('portal preserves language, links to sign-in and loads only local assets',async({page},testInfo)=>{
  const errors=[]; const external=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if(!request.url().startsWith('http://127.0.0.1:4173/'))external.push(request.url());});
  await page.goto('/landing.html?lang=en');
  await expect(page.locator('html')).toHaveAttribute('lang','en');
  await expect(page.locator('#portal-title')).toContainText('One place.');
  await page.locator('[data-language=ms]').click();
  await expect(page.locator('#portal-title')).toContainText('Satu tempat.');
  await page.reload();
  await expect(page.locator('[data-language=ms]')).toHaveAttribute('aria-pressed','true');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('.portal-faq summary').first().click();
  await expect(page.locator('.portal-faq details').first()).toHaveAttribute('open','');
  await page.locator('.nav-sign-in').click();
  await expect(page).toHaveURL(/sign-in.html\?lang=ms/);
  await expect(page.locator('.sign-in-subtitle')).toContainText('lima alatan');
  expect(external).toEqual([]);expect(errors).toEqual([]);
});

test('portal screens fit mobile widths and translations are complete',async({page},testInfo)=>{
  for(const route of ['landing.html','sign-in.html']){
    await page.goto('/'+route+'?lang=en');
    await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(img=>img.decode()));});
    expect(await page.locator('[data-copy]').evaluateAll(els=>els.every(el=>el.textContent.trim()&&el.textContent!=='undefined'))).toBe(true);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:`test-results/${route.replace('.html','')}-${testInfo.project.name}.png`,fullPage:true});
    if(testInfo.project.name==='mobile'){
      await page.setViewportSize({width:320,height:740});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await page.setViewportSize({width:390,height:844});
    }
  }
});

test('sign-in fields stay disabled without JavaScript',async({browser,baseURL})=>{
  const context=await browser.newContext({javaScriptEnabled:false});
  const page=await context.newPage();
  await page.goto(baseURL+'/sign-in.html');
  await expect(page.locator('#email')).toBeDisabled();
  await expect(page.locator('#password')).toBeDisabled();
  await expect(page.locator('#sign-in-submit')).toBeDisabled();
  await context.close();
});
