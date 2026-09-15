const {test,expect}=require('./auth-fixture');
const crypto=require('node:crypto');
const fs=require('node:fs/promises');
const unique=()=> 'links-'+crypto.randomBytes(6).toString('hex');
const bioState={schemaVersion:2,shape:'rounded',background:'#ffffff',ink:'#183e32',accent:'#183e32',buttonText:'#ffffff',blocks:[]};
const qrInput={type:'url',timeZone:'Asia/Kuala_Lumpur',state:{name:'Dashboard QR',url:'https://example.com',foreground:'#183e32',background:'#ffffff',size:'1024'}};
async function createAll(request) {
  const slug=unique();
  const bio=await request.post('/api/bio-pages',{data:{slug,state:bioState}});expect(bio.status()).toBe(201);
  const qr=await request.post('/api/qr-codes',{data:qrInput});expect(qr.status()).toBe(201);
  expect((await request.post('/api/short-links',{data:{slug:unique(),destination:'https://example.com'}})).status()).toBe(201);
  expect((await request.post('/api/file-links?name=report.pdf',{data:Buffer.from('%PDF-1.4\nTest'),headers:{'Content-Type':'application/pdf'}})).status()).toBe(201);
  expect((await request.post('/api/static-sites?type=html',{data:'<h1>Live dashboard</h1>',headers:{'Content-Type':'text/html'}})).status()).toBe(201);
  expect((await request.post('/api/vcards',{data:{id:crypto.randomBytes(32).toString('hex')}})).status()).toBe(200);
}

test('live Links list and cards follow creates and deletes in every category without refresh',async({page,request},info)=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.clock.install();
  await page.goto('/tools/dashboard.html?lang=en');
  await expect(page.locator('#links-total')).toHaveText('0');
  // Stop the 30-second fallback timer: updates must arrive over the live stream.
  await page.clock.pauseAt(new Date(Date.now()+60000));
  await createAll(request);
  await expect(page.locator('#links-total')).toHaveText('6',{timeout:5000});
  await expect(page.locator('#summary-total')).toHaveText('6');
  await expect(page.locator('#summary-active-categories')).toHaveText('6 / 6');
  await expect(page.locator('#links-rows tr')).toHaveCount(6);
  await expect(page.locator('#links-rows tr[data-category=bio-pages]')).toContainText('Draft');
  await expect(page.locator('#links-rows tr[data-category=vcards]')).toContainText('No public URL');
  await page.screenshot({path:`test-results/dashboard-links-${info.project.name}.png`,fullPage:true});
  await page.locator('.theme-toggle').click();
  await page.screenshot({path:`test-results/dashboard-links-dark-${info.project.name}.png`,fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const result=await (await request.get('/api/dashboard-links')).json();
  expect(result.links).toHaveLength(result.total);
  for(const [index,item] of result.links.entries()) {
    const response=await request.delete(`/api/dashboard-links/${item.category}/${item.id}`,{data:{revision:item.revision}});
    expect(response.status()).toBe(200);
    await expect(page.locator('#links-total')).toHaveText(String(5-index),{timeout:5000});
    await expect(page.locator('#summary-total')).toHaveText(String(5-index));
    await expect(page.locator('#summary-active-categories')).toHaveText(`${5-index} / 6`);
    if(['host-html','short-links','transfer-files'].includes(item.category)) expect((await request.get(item.url,{maxRedirects:0})).status()).toBe(404);
  }
  await expect(page.locator('#links-empty')).toContainText('No links yet');
  expect(errors).toEqual([]);
});

test('Links search, category filter, copy, export, create menu and delete confirmation work',async({page,request})=>{
  await createAll(request);
  await page.goto('/tools/dashboard.html?lang=en');
  await expect(page.locator('#links-total')).toHaveText('6');
  await page.locator('#links-category').selectOption('transfer-files');
  await expect(page.locator('#links-rows tr')).toHaveCount(1);
  await expect(page.locator('#links-total')).toHaveText('6');
  await page.evaluate(()=>{navigator.clipboard.writeText=async text=>{window.copiedLink=text;};});
  await page.locator('[data-link-action=copy]').click();
  expect(await page.evaluate(()=>window.copiedLink)).toMatch(/^http:\/\/127\.0\.0\.1:\d+\//);
  const download=page.waitForEvent('download');await page.locator('#links-export').click();
  const exported=await download;const csv=await fs.readFile(await exported.path(),'utf8');
  expect(csv).toContain('report.pdf');expect(csv).not.toContain('Dashboard QR');
  await page.locator('#links-search').fill('nothing-matches');
  await expect(page.locator('#links-empty')).toContainText('No links match');
  await page.locator('#links-search').fill('report');
  await page.locator('[data-link-action=delete]').click();
  await expect(page.locator('#links-delete-name')).toHaveText('report.pdf');
  await page.locator('#links-delete-dialog button[value=cancel]').click();
  await expect(page.locator('#links-total')).toHaveText('6');
  await page.locator('[data-link-action=delete]').click();
  await page.locator('#links-confirm-delete').click();
  await expect(page.locator('#links-total')).toHaveText('5');
  await page.locator('[data-language=ms]').click();
  await expect(page.locator('#links-category option[value=""]')).toHaveText('Semua kategori');
  await page.locator('#links-create').click();
  await expect(page.locator('#links-create-options a')).toHaveCount(6);
  await page.locator('#links-create-options a[href*="qr-codes"]').click();
  await expect(page).toHaveURL(/qr-codes.html\?lang=ms/);
});

test('Links API and live changes stay isolated to the owner, with origins and revisions checked',async({page,request,browser,baseURL})=>{
  await createAll(request);
  const original=await (await request.get('/api/dashboard-links')).json();
  const other=await browser.newContext();
  try {
    for(const route of ['dashboard-links','dashboard-events']) expect((await other.request.get(baseURL+'/api/'+route)).status()).toBe(401);
    expect((await other.request.post(baseURL+'/api/auth/register',{data:{email:unique()+'@example.com',password:'Test-password-123!'}})).status()).toBe(201);
    const otherList=await (await other.request.get(baseURL+'/api/dashboard-links')).json();expect(otherList.links).toEqual([]);expect(otherList.total).toBe(0);
    for(const item of original.links) expect((await other.request.delete(baseURL+`/api/dashboard-links/${item.category}/${item.id}`,{data:{revision:item.revision}})).status()).toBe(404);
    await page.goto('/tools/dashboard.html?lang=en');
    await expect(page.locator('#links-total')).toHaveText('6');
    expect((await other.request.post(baseURL+'/api/short-links',{data:{slug:unique(),destination:'https://example.com'}})).status()).toBe(201);
    expect((await (await request.get('/api/dashboard-links')).json()).total).toBe(6);
    const qr=original.links.find(item=>item.category==='qr-codes');
    expect((await request.delete(`/api/dashboard-links/qr-codes/${qr.id}`,{data:{revision:qr.revision-1}})).status()).toBe(409);
    expect((await request.delete(`/api/dashboard-links/qr-codes/${qr.id}`,{data:{revision:qr.revision},headers:{Origin:'https://example.com'}})).status()).toBe(403);
    await expect(page.locator('#links-total')).toHaveText('6');
    await request.post('/api/auth/sign-out');
    expect((await request.get('/api/dashboard-events')).status()).toBe(401);
  } finally {await other.close();}
});

test('published bio edits update the existing row and unsafe names render as text',async({page,request})=>{
  const slug=unique();
  const created=await (await request.post('/api/bio-pages',{data:{slug,state:bioState}})).json();
  await page.goto('/tools/dashboard.html?lang=en');await expect(page.locator('#links-total')).toHaveText('1');
  const state={...bioState,blocks:[{id:1,type:'profile',name:'<img src=x onerror=alert(1)>',bio:''}]};
  expect((await request.put('/api/bio-pages/'+slug,{data:{...created,state,publish:true,html:'<h1>Published</h1>'}})).status()).toBe(200);
  await expect(page.locator('#links-rows')).toContainText('<img src=x onerror=alert(1)>');
  await expect(page.locator('#links-rows img')).toHaveCount(0);
  await expect(page.locator('#links-rows')).toContainText('Published');
  await expect(page.locator('#links-total')).toHaveText('1');
  await expect(page.locator('#links-rows .links-url')).toHaveAttribute('href',new RegExp('/'+slug+'/$'));
});
