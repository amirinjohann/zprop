const {test,expect}=require('./auth-fixture');
const fs=require('node:fs/promises');
const {createBio,expandBlocks}=require('./bio-helper');
const ids=['bio-pages','short-links','transfer-files','vcards','host-html','qr-codes'];
async function downloaded(page,button){const promise=page.waitForEvent('download');await button.click();const d=await promise;return {name:d.suggestedFilename(),text:await fs.readFile(await d.path(),'utf8')};}

test('all six tools navigate to dedicated local bilingual pages',async({page,request},info)=>{
  const errors=[],bad=[],external=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)bad.push(r.url());});
  page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:4173/'))external.push(r.url());});
  for(const id of ids){
    await page.goto('/landing.html?lang=en');
    await expect(page.locator('.portal-features a')).toHaveCount(6);
    await page.locator(`.portal-features a[href*="${id}.html"]`).click();
    await expect(page).toHaveURL(new RegExp(`/tools/${id}.html\\?lang=en`));
    await expect(page.locator('body')).toHaveAttribute('data-tool',id);
    await expect(page.locator('.tools-sidebar [aria-current=page]')).toHaveCount(1);
    await expect(page.locator('#tool-title')).not.toBeEmpty();
    await page.locator('[data-language=ms]').click();
    await expect(page.locator('html')).toHaveAttribute('lang','ms');
    expect(await page.locator('.tools-sidebar a').evaluateAll(links=>links.every(a=>a.href.includes('lang=ms')))).toBe(true);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    expect(await page.locator('[data-tool-copy]').evaluateAll(els=>els.every(el=>el.textContent.trim()&&el.textContent!=='undefined'))).toBe(true);
  }
  expect(errors).toEqual([]);expect(bad).toEqual([]);expect(external).toEqual([]);
  for (const removed of ['event-links','web-tools','analytics']) {
    expect((await request.get(`/tools/${removed}.html`)).status()).toBe(404);
  }
  await page.goto('/tools/bio-pages.html?lang=en');
  await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:`test-results/tools-${info.project.name}.png`,fullPage:true});
});

test('bio HTML escapes user supplied text',async({page})=>{
  await createBio(page);
  await expandBlocks(page);
  await page.locator('[name=name]').fill('<img src=x onerror=alert(1)>');
  await expect(page.locator('#bio-preview h3')).toHaveText('<img src=x onerror=alert(1)>');
  await expect(page.locator('#bio-preview img')).toHaveCount(0);
  const html=await downloaded(page,page.locator('[data-action=downloadHtml]'));
  expect(html.text).toContain('&lt;img');expect(html.name).toBe('zprop-page.html');
});

test('vCard exports contain the entered details',async({page})=>{
  await page.goto('/tools/vcards.html?lang=en');await page.locator('#new-item').click();
  await page.locator('[name=name]').fill('Aina, ZPROP');
  await page.locator('[name=phone]').fill('+60123456789');
  await page.locator('[name=email]').fill('aina@example.com');
  const card=await downloaded(page,page.locator('[data-action=downloadVcard]'));
  expect(card.name).toBe('zprop-contact.vcf');expect(card.text).toContain('FN:Aina\\, ZPROP');expect(card.text).toContain('END:VCARD');

});

test('HTML preview is isolated',async({page})=>{
  await page.goto('/tools/host-html.html?lang=en');await page.locator('#new-item').click();
  await page.getByRole('tab',{name:'Paste HTML'}).click();
  await page.locator('[name=html]').fill('<h1>Test home</h1><script>parent.document.body.dataset.compromised="yes"</script>');
  await page.locator('[data-action=generate]').click();
  await expect(page.frameLocator('#html-preview').locator('h1')).toHaveText('Test home');
  await expect(page.locator('#html-preview')).toHaveAttribute('sandbox','');
  await expect(page.locator('body')).not.toHaveAttribute('data-compromised','yes');
});
