const { test, expect } = require('./auth-fixture');
const { zipSync, strToU8 } = require('fflate');
const unique = () => 'test-' + require('node:crypto').randomBytes(7).toString('hex');

test('pasted HTML creates a persistent site with a custom URL, preview and working script', async ({page, request, baseURL}) => {
  const slug = unique();
  const origin = new URL(baseURL).origin;
  await page.goto('/tools/host-html.html?lang=en');await page.locator('#new-item').click();
  await page.getByRole('tab', {name:'Paste HTML'}).click();
  await page.locator('[name=html]').fill('<h1>My new website</h1><button onclick="document.querySelector(\'h1\').textContent=\'It works\'">Try it</button><script>try{parent.document.body.dataset.compromised="yes"}catch{}</script>');
  await page.locator('[name=slug]').fill(slug);
  await page.locator('#create-site').click();
  await expect(page.locator('#site-result')).toBeVisible();
  await expect(page.locator('#site-url')).toHaveText(`${origin}/${slug}/`);
  await expect(page.locator('#open-site')).toHaveAttribute('href', `${origin}/${slug}/`);
  await page.evaluate(() => { navigator.clipboard.writeText = async text => { window.copiedSite = text; }; });
  await page.locator('#copy-site').click();
  expect(await page.evaluate(() => window.copiedSite)).toBe(`${origin}/${slug}/`);
  const frame = page.frameLocator('#html-preview');
  await expect(frame.locator('h1')).toHaveText('My new website');
  await frame.getByRole('button', {name:'Try it'}).click();
  await expect(frame.locator('h1')).toHaveText('It works');
  await expect(page.locator('body')).not.toHaveAttribute('data-compromised', 'yes');
  const response = await request.get(`/${slug}/`);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-security-policy']).toContain('sandbox allow-scripts');
  const redirected = await request.get(`/sites/${slug}/`, { maxRedirects:0 });
  expect(redirected.status()).toBe(302);
  expect(redirected.headers().location).toBe(`/${slug}/`);
  await page.locator('#create-site').click();
  await expect(page.locator('#tool-status')).toContainText('already taken');
  await page.context().clearCookies();
  const site = await page.context().newPage();
  await site.goto(`${origin}/${slug}/`);
  await expect(site.locator('h1')).toHaveText('My new website');
  await site.reload(); await expect(site.locator('h1')).toHaveText('My new website');
});

test('ZIP with a wrapper folder keeps relative CSS, JS, images and nested pages working', async ({page}, info) => {
  const zip = zipSync({
    'my-site/index.html':strToU8('<link rel="stylesheet" href="./css/style.css"><h1>ZIP website</h1><img src="./images/logo.svg"><a href="./pages/about.html">About</a><script src="./js/app.js"></script>'),
    'my-site/css/style.css':strToU8('h1{color:rgb(12, 100, 45)}'),
    'my-site/js/app.js':strToU8('document.querySelector("h1").textContent="ZIP is working"'),
    'my-site/images/logo.svg':strToU8('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="green"/></svg>'),
    'my-site/pages/about.html':strToU8('<h1>About this site</h1>')
  });
  await page.goto('/tools/host-html.html?lang=en');await page.locator('#new-item').click();
  await page.locator('[name=file]').setInputFiles({name:'website.zip', mimeType:'application/zip', buffer:Buffer.from(zip)});
  await page.locator('#create-site').click();
  await expect(page.locator('#site-result')).toBeVisible();
  const frame = page.frameLocator('#html-preview');
  await expect(frame.locator('h1')).toHaveText('ZIP is working');
  await expect(frame.locator('h1')).toHaveCSS('color', 'rgb(12, 100, 45)');
  expect(await frame.locator('img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  await page.screenshot({path:`test-results/static-site-created-${info.project.name}.png`,fullPage:true});
  await frame.getByRole('link',{name:'About'}).click();
  await expect(frame.locator('h1')).toHaveText('About this site');
});

test('HTML uploads, empty inputs and unavailable backend have clear outcomes', async ({page}) => {
  await page.goto('/tools/host-html.html?lang=en');await page.locator('#new-item').click();
  await page.locator('#create-site').click();
  await expect(page.locator('#tool-status')).toContainText('Upload a file');
  await page.locator('[name=file]').setInputFiles({name:'hello.html',mimeType:'text/html',buffer:Buffer.from('<h1>Uploaded HTML</h1>')});
  await page.locator('#create-site').click();
  await expect(page.frameLocator('#html-preview').locator('h1')).toHaveText('Uploaded HTML');
  await page.route('**/api/static-sites?**', route => route.fulfill({status:404,contentType:'text/html',body:'Not found'}));
  await page.locator('#create-site').click();
  await expect(page.locator('#tool-status')).toContainText('This address does not provide the upload service');
  await expect(page.locator('#upload-service-link')).toHaveAttribute('href', new URL(page.url()).origin + '/tools/host-html.html?lang=en');
  await expect(page.locator('#upload-service-link')).toBeVisible();
  await page.route('**/api/static-sites?**', route => route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:'server'})}));
  await page.locator('#create-site').click();
  await expect(page.locator('#tool-status')).toContainText('server could not save your site');
  await expect(page.locator('#upload-service-link')).toBeHidden();
  await page.route('**/api/static-sites?**', route => route.abort());
  await page.locator('#create-site').click();
  await expect(page.locator('#tool-status')).toContainText('Could not reach the upload service');
  await expect(page.locator('#create-site')).toBeEnabled();
});

test('library edit reopens HTML and replaces the published site',async({page,request,browser,baseURL})=>{
  const slug=unique();
  expect((await request.post('/api/static-sites?type=html&slug='+slug,{data:'<h1>Original site</h1>'})).status()).toBe(201);
  const meta=await (await request.get('/api/static-sites/'+slug)).json();
  expect(meta.html).toContain('Original site');expect(meta.revision).toBe(1);
  expect((await request.put('/api/static-sites/'+slug+'?type=html&revision=0',{data:'<h1>Nope</h1>'})).status()).toBe(409);
  expect((await request.put('/api/static-sites/'+slug+'?type=html&revision=1',{data:'<h1>Nope</h1>',headers:{Origin:'null'}})).status()).toBe(403);
  const other=await browser.newContext();
  try{
    await other.request.post(baseURL+'/api/auth/register',{data:{email:unique()+'@example.com',password:'Test-password-123!'}});
    for(const method of ['get','put'])expect((await other.request[method](baseURL+'/api/static-sites/'+slug,{data:'<h1>Nope</h1>'})).status()).toBe(404);
  }finally{await other.close();}
  await page.goto('/tools/host-html.html?lang=en');
  const card=page.locator('[data-item-id="'+slug+'"]');
  await expect(card.locator('[data-item-action=edit]')).toBeVisible();
  await card.locator('[data-item-action=edit]').click();
  await expect(page.locator('[name=html]')).toHaveValue('<h1>Original site</h1>');
  await expect(page.locator('[name=slug]')).toHaveJSProperty('readOnly',true);
  await expect(page.locator('#create-site')).toContainText('Update static site');
  await page.locator('[name=html]').fill('<h1>Edited site</h1>');
  await page.locator('#create-site').click();
  await expect(page.locator('#tool-status')).toContainText('updated');
  expect(await (await request.get('/'+slug+'/')).text()).toContain('Edited site');
  expect((await (await request.get('/api/static-sites/'+slug)).json()).revision).toBe(2);
});

test('server rejects invalid ZIPs, unsafe paths, active backend files and conflicting names', async ({request}) => {
  const fixtures = [
    [Buffer.from('broken zip'), 'invalidZip'],
    [zipSync({'style.css':strToU8('body{}')}), 'missingIndex'],
    [zipSync({'../index.html':strToU8('<h1>Bad</h1>')}), 'unsafePath'],
    [zipSync({'index.html':strToU8('ok'),'run.php':strToU8('<?php echo 1;')}), 'fileType'],
    [zipSync({'index.html':strToU8('ok'),'INDEX.HTML':strToU8('duplicate')}), 'duplicate']
  ];
  for (const [data, error] of fixtures) {
    const response = await request.post('/api/static-sites?type=zip', {data:Buffer.from(data)});
    expect(response.status()).toBe(400); expect((await response.json()).error).toBe(error);
  }
  const forbidden = await request.post('/api/static-sites?type=html', {data:'<h1>Bad origin</h1>',headers:{Origin:'null'}});
  expect(forbidden.status()).toBe(403);
  const invalidSlug = await request.post('/api/static-sites?type=html&slug=../bad', {data:'hello'});
  expect(invalidSlug.status()).toBe(400);
  expect((await request.get('/.generated-sites/')).status()).toBe(403);
});

test('root names are shared with short links and app routes', async ({request}) => {
  expect((await request.post('/api/static-sites?type=html&slug=tools', { data:'<h1>Nope</h1>' })).status()).toBe(409);
  const taken = unique();
  expect((await request.post('/api/short-links', { data:{ slug:taken, destination:'https://example.com/' } })).status()).toBe(201);
  expect((await request.post('/api/static-sites?type=html&slug='+taken, { data:'<h1>Nope</h1>' })).status()).toBe(409);
  const site = unique();
  const created = await request.post('/api/static-sites?type=html&slug='+site, { data:'<h1>Live</h1>' });
  expect(created.status()).toBe(201);
  expect((await created.json()).url).toBe('/'+site+'/');
  const blocked = await request.post('/api/short-links', { data:{ slug:site, destination:'https://example.com/' } });
  expect(blocked.status()).toBe(400);
  expect((await blocked.json()).error).toBe('linkReserved');
  const nested = await request.get('/sites/'+site+'/index.html', { maxRedirects:0 });
  expect(nested.status()).toBe(302);
  expect(nested.headers().location).toBe('/'+site+'/index.html');
});
