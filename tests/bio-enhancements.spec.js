const {test,expect}=require('./auth-fixture');
const {createBio,addBlock}=require('./bio-helper');
const path=require('node:path');
const fs=require('node:fs/promises');

test('complete profile and image details are available before adding and survive reopening',async({page,request})=>{
  const slug=await createBio(page);
  await page.locator('#add-block').click();await page.locator('[data-add=profile]').click();
  const setup=page.locator('#block-details-form');
  for(const name of ['photo','name','bio'])await expect(setup.locator('[name='+name+']')).toBeVisible();
  await setup.locator('[name=photo]').setInputFiles(path.resolve('assets/zprop-tech-logo.png'));
  await setup.locator('[name=name]').fill('Festival team');
  await setup.locator('[name=bio]').fill('Art, music and community.');
  await expect(page.locator('.bio-block')).toHaveCount(2);
  await page.locator('#confirm-add-block').click();await expect(page.locator('#block-picker')).toBeHidden();
  await expect(page.locator('.bio-page-profile').last()).toContainText('Art, music and community.');
  await expect(page.locator('.bio-page-profile').last().locator('img')).toBeVisible();
  await addBlock(page,'image',{alt:'Festival artwork',caption:'Join us this summer'});
  await expect(page.locator('.bio-page-image img')).toHaveAttribute('alt','Festival artwork');
  await expect(page.locator('.bio-page-image figcaption')).toHaveText('Join us this summer');
  await page.locator('#save-bio-draft').click();await expect(page.locator('#tool-status')).toHaveText('Draft saved.');
  const record=await (await request.get('/api/bio-pages/'+slug)).json();
  expect(record.state.blocks[2]).toMatchObject({name:'Festival team',bio:'Art, music and community.'});
  expect(record.state.blocks[2].photo).toMatch(/^data:image\/png;base64,/);
  expect(record.state.blocks[3]).toMatchObject({alt:'Festival artwork',caption:'Join us this summer'});
  await page.reload();await expect(page.locator('.bio-page-image figcaption')).toHaveText('Join us this summer');
  await expect(page.locator('.bio-block-fields:visible')).toHaveCount(0);
});

test('close icon is centered and cancels either step without inserting a block',async({page},info)=>{
  await createBio(page);
  for(const details of [false,true]) {
    await page.locator('#add-block').click();
    if(details){await page.locator('[data-add=text]').click();await page.locator('#block-details-form textarea').fill('Discard me');}
    const close=page.locator('#close-block-picker');
    const button=await close.boundingBox(),icon=await close.locator('svg').boundingBox();
    expect(Math.abs(button.x+button.width/2-icon.x-icon.width/2)).toBeLessThan(1);
    expect(Math.abs(button.y+button.height/2-icon.y-icon.height/2)).toBeLessThan(1);
    await page.locator('#block-picker').screenshot({path:'test-results/bio-close-'+info.project.name+'.png'});
    await close.click();await expect(page.locator('#block-picker')).toBeHidden();
    await expect(page.locator('#add-block')).toBeFocused();await expect(page.locator('.bio-block')).toHaveCount(2);
  }
  await expect(page.locator('#bio-dirty')).toBeHidden();
});

test('new templates change layouts, keep social circles, and persist to published pages',async({page,request},info)=>{
  const slug=await createBio(page);
  await page.locator('[data-tab=appearance]').click();
  await expect(page.locator('#bio-templates-title')).toHaveCSS('font-weight','800');
  await expect(page.getByText('Start with a look, then customize your colors. Your content stays in place.',{exact:true})).toHaveCount(0);
  await expect(page.getByText('Create your page, then publish on zprop.tech or download the HTML.',{exact:true})).toHaveCount(0);
  for(const layout of ['poster','event','editorial']) {
    await page.locator('[data-template='+layout+']').click();
    await expect(page.locator('#bio-preview')).toHaveAttribute('data-layout',layout);
    await expect(page.locator('[data-template='+layout+'] .bio-template-social svg')).toHaveCount(3);
    await expect(page.locator('#bio-preview .bio-page-profile h3')).toHaveText('ZPROP');
    await page.locator('#publish-bio').click();await expect(page.locator('#bio-result')).toBeVisible();
    expect(await (await request.get('/sites/'+slug+'/')).text()).toContain('data-layout="'+layout+'"');
    await page.reload();await expect(page.locator('#bio-preview')).toHaveAttribute('data-layout',layout);
    await page.locator('[data-tab=appearance]').click();
    await expect(page.locator('[data-template='+layout+']')).toHaveAttribute('aria-pressed','true');
  }
  await page.locator('.bio-templates').screenshot({path:'test-results/bio-new-templates-'+info.project.name+'.png'});
  await page.locator('#bio-result').screenshot({path:'test-results/bio-published-'+info.project.name+'.png'});
  await expect(page.locator('.bio-phone')).toHaveCSS('border-top-color','rgb(8, 8, 8)');
  await expect(page.locator('.bio-phone-screen')).toHaveCSS('scrollbar-width','none');
  await page.locator('[data-tab=content]').click();
  await addBlock(page,'text',{text:'A long event programme.\n'.repeat(60)});
  const screen=page.locator('.bio-phone-screen');
  expect(await screen.evaluate(el=>{el.scrollTop=200;return el.scrollTop;})).toBeGreaterThan(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('custom HTML renders styles in isolation, persists, publishes and exports',async({page,request,browser},info)=>{
  const slug=await createBio(page);
  const code='<style>body{background:rgb(220, 230, 240);padding:16px}h2{color:rgb(90, 30, 130)}</style><h2>Summer gathering</h2><p>Doors open at 7pm.</p><script>window.customRan=true;parent.customRan=true;</script><img src="data:image/png;base64,AA==" onerror="window.customRan=true">';
  await page.locator('#add-block').click();await page.locator('[data-add=html]').click();
  await page.locator('#confirm-add-block').click();await expect(page.locator('#block-picker')).toBeVisible();
  await expect(page.locator('#block-details-form [name=html]')).toBeFocused();
  await page.locator('#block-details-form [name=html]').fill(code);
  await page.locator('#block-details-form [name=title]').fill('Event invitation');
  await page.locator('#block-details-form [name=height]').fill('79');
  await page.locator('#confirm-add-block').click();await expect(page.locator('#block-picker')).toBeVisible();
  await page.locator('#block-details-form [name=height]').fill('260');
  await page.locator('#confirm-add-block').click();await expect(page.locator('#block-picker')).toBeHidden();
  const frame=page.frameLocator('.bio-custom-html');
  await expect(frame.locator('h2')).toHaveText('Summer gathering');
  await expect(frame.locator('h2')).toHaveCSS('color','rgb(90, 30, 130)');
  expect(await frame.locator('body').evaluate(()=>window.customRan)).toBeUndefined();
  expect(await page.evaluate(()=>window.customRan)).toBeUndefined();
  await expect(page.locator('#bio-preview')).toHaveCSS('background-color','rgb(246, 245, 239)');
  await expect(page.locator('.bio-custom-html')).toHaveAttribute('height','260');
  await page.locator('#publish-bio').click();await expect(page.locator('#bio-result')).toBeVisible();
  const record=await (await request.get('/api/bio-pages/'+slug)).json();
  expect(record.state.blocks.at(-1)).toMatchObject({type:'html',html:code,title:'Event invitation',height:260});
  await page.reload();await expect(page.frameLocator('.bio-custom-html').locator('h2')).toHaveText('Summer gathering');
  const downloadPromise=page.waitForEvent('download');await page.locator('[data-action=downloadHtml]').click();
  const html=await fs.readFile(await (await downloadPromise).path(),'utf8');
  const viewer=await browser.newContext();
  try{
    const publicPage=await viewer.newPage();await publicPage.goto('/sites/'+slug+'/');
    await expect(publicPage.frameLocator('.bio-custom-html').locator('h2')).toHaveText('Summer gathering');
    await expect(publicPage.frameLocator('.bio-custom-html').locator('h2')).toHaveCSS('color','rgb(90, 30, 130)');
    expect(await publicPage.frameLocator('.bio-custom-html').locator('body').evaluate(()=>window.customRan)).toBeUndefined();
    await publicPage.setContent(html);
    await expect(publicPage.frameLocator('.bio-custom-html').locator('h2')).toHaveText('Summer gathering');
    expect(await publicPage.frameLocator('.bio-custom-html').locator('body').evaluate(()=>window.customRan)).toBeUndefined();
  }finally{await viewer.close();}
  await page.locator('.bio-phone').screenshot({path:'test-results/bio-html-'+info.project.name+'.png'});
});

test('custom HTML bounds and layouts are validated by the server',async({page,request})=>{
  const slug=await createBio(page),record=await (await request.get('/api/bio-pages/'+slug)).json();
  for(const block of [{html:'<p>Hi</p>',height:79},{html:'<p>Hi</p>',height:1601},{html:'<p>Hi</p>',height:240.5},{html:'x'.repeat(20001),height:240},{html:' ',height:240}]) {
    const result=await request.put('/api/bio-pages/'+slug,{data:{...record,state:{...record.state,blocks:[{id:1,type:'html',...block}]},publish:true,html:'test'}});
    expect(result.status()).toBe(400);
  }
  expect((await request.put('/api/bio-pages/'+slug,{data:{...record,state:{...record.state,layout:'unknown'},publish:false}})).status()).toBe(400);
  expect((await (await request.get('/api/bio-pages/'+slug)).json()).revision).toBe(record.revision);
});
