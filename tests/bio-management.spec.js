const {test,expect}=require('./auth-fixture');
const {createBio,expandBlocks,addBlock}=require('./bio-helper');
const unique=()=> 'managed-'+require('node:crypto').randomBytes(5).toString('hex');
test('requires a name, saves pages, updates the same live link, keeps names immutable and deletes',async({page,request,baseURL,browser},info)=>{
  await page.goto('/tools/bio-pages.html?lang=en');
  await expect(page.locator('#tool-form')).toBeHidden();
  await page.locator('#new-bio').click();
  await page.locator('#confirm-create-bio').click();
  await expect(page.locator('#create-bio-dialog')).toBeVisible();
  expect(await page.locator('[name=newSlug]').evaluate(input=>input.validity.valueMissing)).toBe(true);
  const slug=unique();await page.locator('[name=newSlug]').fill(slug);await page.locator('#confirm-create-bio').click();
  await expect(page.locator('#tool-form')).toBeVisible();
  await expandBlocks(page);
  expect((await request.get(`/${slug}/`)).status()).toBe(404);
  await page.locator('[name=name]').fill('Saved studio');
  await page.locator('[data-key=url]').fill(baseURL+'/landing.html');
  await page.locator('#save-bio-draft').click();
  await expect(page.locator('#tool-status')).toHaveText('Draft saved.');
  await page.reload();await expect(page.locator('[name=name]')).toHaveValue('Saved studio');
  await page.locator('#publish-bio').click();await expect(page.locator('#bio-result')).toBeVisible();
  expect(await (await request.get(`/${slug}/`)).text()).toContain('Saved studio');
  const viewer=await browser.newContext();
  try{
    const publicPage=await viewer.newPage();await publicPage.goto(`${baseURL}/${slug}/`);
    const popupPromise=publicPage.waitForEvent('popup');await publicPage.locator('.bio-page-link').click();
    const popup=await popupPromise;await expect(popup).toHaveURL(/\/landing.html/);
  }finally{await viewer.close();}
  await page.locator('#back-bio-list').click();
  const card=page.locator(`[data-page-slug="${slug}"]`);
  await expect(card).toContainText('Published');
  await page.screenshot({path:`test-results/bio-library-${info.project.name}.png`,fullPage:true});
  await card.locator('[data-page-action=edit]').click();await expect(page.locator('#tool-form')).toBeVisible();await expandBlocks(page);
  await page.locator('[name=name]').fill('Updated studio');
  await expect(page.locator('#publish-bio')).toContainText('Save changes');
  await page.locator('#publish-bio').click();await expect(page.locator('#bio-dirty')).toBeHidden();
  await expect(page.locator('#bio-url')).toHaveText(`${baseURL}/${slug}/`);
  expect(await (await request.get(`/${slug}/`)).text()).toContain('Updated studio');
  await expect(page.locator('#tool-form [name=slug]')).toHaveCount(0);
  const record=await (await request.get('/api/bio-pages/'+slug)).json();
  const rename=await request.put('/api/bio-pages/'+slug,{data:{...record,slug:unique(),publish:false}});
  expect(rename.status()).toBe(400);expect(await rename.json()).toEqual({error:'slugLocked'});
  expect((await request.get('/'+slug+'/')).status()).toBe(200);
  await page.locator('#back-bio-list').click();await page.locator(`[data-page-slug="${slug}"] [data-page-action=delete]`).click();
  await expect(page.locator('#delete-bio-name')).toContainText(slug);
  await page.locator('#cancel-delete-bio').click();expect((await request.get(`/${slug}/`)).status()).toBe(200);
  await page.locator(`[data-page-slug="${slug}"] [data-page-action=delete]`).click();await page.locator('#confirm-delete-bio').click();
  await expect(page.locator('[data-page-slug]')).toHaveCount(0);
  expect((await request.get(`/${slug}/`)).status()).toBe(404);
  await page.reload();await expect(page.locator('.bio-library-empty')).toBeVisible();
});
test('ownership, unique names and revision checks protect saved pages',async({page,request,browser,baseURL})=>{
  const slug=await createBio(page);
  await expandBlocks(page);
  const record=await (await request.get(`/api/bio-pages/${slug}`)).json();
  const other=await browser.newContext();
  try{
    expect((await other.request.get(baseURL+'/api/bio-pages')).status()).toBe(401);
    await other.request.post(baseURL+'/api/auth/register',{data:{email:unique()+'@example.com',password:'Test-password-123!'}});
    expect((await (await other.request.get(baseURL+'/api/bio-pages')).json()).pages).toEqual([]);
    for(const method of ['get','put','delete'])expect((await other.request[method](baseURL+`/api/bio-pages/${slug}`,{data:{...record,publish:true,html:'intruder'}})).status()).toBe(404);
    expect((await request.post('/api/bio-pages',{data:{slug,state:record.state}})).status()).toBe(409);
    expect((await request.post('/api/bio-pages',{data:{slug:'',state:record.state}})).status()).toBe(400);
    expect((await request.post('/api/bio-pages',{data:{slug:unique(),state:record.state},headers:{Origin:'null'}})).status()).toBe(403);
    const updated=await request.put(`/api/bio-pages/${slug}`,{data:{...record,publish:true,html:'<h1>Owner</h1>'}});expect(updated.status()).toBe(200);
    expect((await request.put(`/api/bio-pages/${slug}`,{data:{...record,publish:true,html:'stale'}})).status()).toBe(409);
    expect(await (await other.request.get(baseURL+`/${slug}/`)).text()).toBe('<h1>Owner</h1>');
    const conflict=unique();const latest=await updated.json();
    const claims=await Promise.all([request.post(`/api/static-sites?type=html&slug=${conflict}`,{data:'<h1>Static</h1>'}),request.post('/api/bio-pages',{data:{slug:conflict,state:record.state}})]);
    expect(claims.map(result=>result.status()).sort()).toEqual([201,409]);
    expect((await request.put(`/api/bio-pages/${slug}`,{data:{...latest,slug:conflict,publish:false}})).status()).toBe(400);
    expect((await request.get(`/api/bio-pages/${slug}`)).status()).toBe(200);
    expect((await request.get(`/${slug}/.bio.json`)).status()).toBe(404);
  }finally{await other.close();}
});
test('expanded fields stay visible and blocks drag with mouse or touch',async({page,context},info)=>{
  await createBio(page);
  await expandBlocks(page);
  // Use compact divider blocks for a drag gesture within the viewport.
  while(await page.locator('.bio-block').count())await page.locator('.bio-block [data-block-action=remove]').first().click();
  for(let i=0;i<3;i++){await addBlock(page,'heading',{heading:'Heading '+i});await expandBlocks(page);}
  await expect(page.locator('[data-block-action=up], [data-block-action=down], .bio-block details')).toHaveCount(0);
  for(const field of await page.locator('.bio-block [data-key]').all())await expect(field).toBeVisible();
  const firstId=await page.locator('.bio-block').first().getAttribute('data-block-id');
  await page.locator('.bio-block').nth(1).scrollIntoViewIfNeeded();
  const handle=await page.locator('.bio-block').first().locator('.bio-drag-handle').boundingBox();
  const target=await page.locator('.bio-block').nth(1).boundingBox();
  const start={x:handle.x+handle.width/2,y:handle.y+handle.height/2},end={x:start.x,y:target.y+target.height-10};
  if(info.project.name==='mobile'){
    const cdp=await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[start]});
    for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x,y:start.y+(end.y-start.y)*i/8}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
  }else{await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:12});await page.mouse.up();}
  await expect(page.locator('.bio-block').nth(1)).toHaveAttribute('data-block-id',firstId);
  await expect(page.locator('.bio-page-heading').nth(1)).toHaveText('Heading 0');
  await page.locator('#save-bio-draft').click();await expect(page.locator('#tool-status')).toHaveText('Draft saved.');
  await page.reload();await expect(page.locator('.bio-page-heading').nth(1)).toHaveText('Heading 0');await expandBlocks(page);
  await expect(page.locator('.bio-block [data-key=heading]')).toHaveCount(3);
  for(const field of await page.locator('.bio-block [data-key]').all())await expect(field).toBeVisible();
});
