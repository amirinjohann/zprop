const {test,expect}=require('./auth-fixture');
const unique=()=> 'short-'+require('node:crypto').randomBytes(6).toString('hex');

test('library creates, reopens, edits, renames and deletes the same item',async({page,request,context},info)=>{
  const slug=unique();
  await page.goto('/tools/short-links.html?lang=en');
  await expect(page.locator('#short-library')).toBeVisible();await expect(page.locator('#tool-form')).toBeHidden();
  await expect(page.locator('.short-library-empty')).toBeVisible();
  await page.locator('#new-short-link').click();
  await page.locator('[name=url]').fill('https://example.com/original');await page.locator('[name=slug]').fill(slug);
  await page.locator('#save-short-link').click();
  await expect(page.locator('#link-result')).toBeVisible();await expect(page.locator('#short-dirty')).toBeHidden();
  await expect(page.locator('#save-short-link')).toHaveText('Save changes');
  await page.reload();await expect(page.locator('[name=url]')).toHaveValue('https://example.com/original');
  await page.locator('#back-short-list').click();
  const card=page.locator(`[data-short-slug="${slug}"]`);await expect(card).toContainText('Active');
  await page.screenshot({path:`test-results/short-library-${info.project.name}.png`,fullPage:true});
  await page.locator('.theme-toggle').click();await page.screenshot({path:`test-results/short-library-dark-${info.project.name}.png`,fullPage:true});
  await card.locator('[data-short-action=edit]').click();
  await page.locator('[name=url]').fill('https://example.com/updated');await expect(page.locator('#short-dirty')).toBeVisible();
  await page.locator('#cancel-short-edit').click();await expect(page.locator('[name=url]')).toHaveValue('https://example.com/original');
  await page.locator('[name=url]').fill('https://example.com/updated');await page.locator('#save-short-link').click();
  await expect(page.locator('#tool-status')).toHaveText('Changes saved.');
  expect((await request.get('/'+slug,{maxRedirects:0})).headers().location).toBe('https://example.com/updated');
  expect((await (await request.get('/api/dashboard-stats')).json()).counts['short-links']).toBe(1);
  const renamed=unique();await page.locator('[name=slug]').fill(renamed);await page.locator('#save-short-link').click();
  await expect(page.locator('#short-address')).toHaveText('https://zprop.tech/'+renamed);
  expect((await request.get('/'+slug,{maxRedirects:0})).status()).toBe(404);
  expect((await request.get('/'+renamed,{maxRedirects:0})).headers().location).toBe('https://example.com/updated');
  await page.locator('#back-short-list').click();
  const renamedCard=page.locator(`[data-short-slug="${renamed}"]`);
  await renamedCard.locator('[data-short-action=delete]').click();await page.locator('#cancel-delete-short').click();await expect(renamedCard).toBeVisible();
  const dashboard=await context.newPage();await dashboard.goto('/tools/dashboard.html?lang=en');await expect(dashboard.locator('#links-total')).toHaveText('1');
  await page.bringToFront();await renamedCard.locator('[data-short-action=delete]').click();await page.locator('#confirm-delete-short').click();
  await expect(page.locator('[data-short-slug]')).toHaveCount(0);
  await dashboard.bringToFront();await expect(dashboard.locator('#links-total')).toHaveText('0');
  expect((await request.get('/'+renamed,{maxRedirects:0})).status()).toBe(404);await dashboard.close();
});

test('management API protects owners, file links, names and revisions',async({request,browser,baseURL})=>{
  const slug=unique();const created=await (await request.post('/api/short-links',{data:{slug,destination:'https://example.com'}})).json();
  const other=await browser.newContext();
  try{
    expect((await other.request.get(baseURL+'/api/short-links')).status()).toBe(401);
    await other.request.post(baseURL+'/api/auth/register',{data:{email:unique()+'@example.com',password:'Test-password-123!'}});
    expect((await (await other.request.get(baseURL+'/api/short-links')).json()).links).toEqual([]);
    for(const method of ['get','put','delete']) expect((await other.request[method](baseURL+'/api/short-links/'+slug,{data:created})).status()).toBe(404);
    expect((await request.put('/api/short-links/'+slug,{data:{...created,destination:'https://example.com/new'},headers:{Origin:'null'}})).status()).toBe(403);
    expect((await request.put('/api/short-links/'+slug,{data:{...created,destination:'javascript:alert(1)'}})).status()).toBe(400);
    const fileSlug=unique();expect((await request.post('/api/file-links?name=test.pdf&slug='+fileSlug,{data:Buffer.from('%PDF-1.4\nTest')})).status()).toBe(201);
    expect((await (await request.get('/api/short-links')).json()).links).toHaveLength(1);
    for(const method of ['get','put','delete'])expect((await request[method]('/api/short-links/'+fileSlug,{data:created})).status()).toBe(404);
    expect((await request.put('/api/short-links/'+slug,{data:{...created,slug:fileSlug}})).status()).toBe(409);
    const updated=await (await request.put('/api/short-links/'+slug,{data:{...created,slug:slug.toUpperCase(),destination:'https://example.com/new'}})).json();
    expect(updated.revision).toBe(2);
    expect((await request.put('/api/short-links/'+slug,{data:created})).status()).toBe(409);
    expect((await request.delete('/api/short-links/'+slug,{data:created})).status()).toBe(409);
    expect((await (await request.get('/api/short-links')).json()).links).toHaveLength(1);
    expect((await request.get('/'+slug,{maxRedirects:0})).headers().location).toBe('https://example.com/new');
    expect((await request.put('/api/short-links/'+slug,{data:{...updated,destination:baseURL+'/'+slug}})).status()).toBe(400);
    expect((await request.delete('/api/short-links/'+slug,{data:{revision:updated.revision}})).status()).toBe(200);
  }finally{await other.close();}
});

test('unsaved changes and failed requests preserve edits with retry and bilingual copy',async({page,request})=>{
  // Exercise manual retry without a live event recovering the list first.
  await page.route('**/api/dashboard-events',route=>route.abort());
  const created=await (await request.post('/api/short-links',{data:{slug:unique(),destination:'https://example.com'}})).json();
  await page.route('**/api/short-links',route=>route.fulfill({status:500,contentType:'application/json',body:'{"error":"linkServer"}'}));
  await page.goto('/tools/short-links.html?lang=en');await expect(page.locator('#retry-short-list')).toBeVisible();
  await page.unroute('**/api/short-links');await page.locator('#retry-short-list').click();
  await page.locator('[data-short-action=edit]').click();await page.locator('[name=url]').fill('https://example.com/unsaved');
  page.once('dialog',dialog=>dialog.dismiss());await page.locator('#back-short-list').click();await expect(page.locator('#tool-form')).toBeVisible();
  page.once('dialog',dialog=>dialog.dismiss());await page.locator('[data-tool-link=bio-pages]').click();await expect(page).toHaveURL(/short-links/);
  await page.route('**/api/short-links/'+created.slug,route=>route.request().method()==='PUT'?route.fulfill({status:500,contentType:'application/json',body:'{"error":"linkServer"}'}):route.continue());
  await page.locator('#save-short-link').click();await expect(page.locator('#tool-status')).toContainText('could not save');
  await expect(page.locator('[name=url]')).toHaveValue('https://example.com/unsaved');await expect(page.locator('#short-dirty')).toBeVisible();
  await page.unroute('**/api/short-links/'+created.slug);await page.locator('#save-short-link').click();await expect(page.locator('#short-dirty')).toBeHidden();
  await page.locator('[data-language=ms]').click();await expect(page.locator('#save-short-link')).toHaveText('Simpan perubahan');
  await page.locator('#back-short-list').click();await expect(page.locator('#short-library h2')).toHaveText('Pautan pendek anda');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
