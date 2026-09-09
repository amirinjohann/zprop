const {test,expect}=require('./auth-fixture');
const slug=()=> 'link-'+require('node:crypto').randomBytes(6).toString('hex');

test('creates a working short link, copies it and keeps results aligned with the form',async({page,request,baseURL},info)=>{
  const name=slug();
  const destination=baseURL+'/landing.html?from=short-link';
  await page.goto('/tools/short-links.html?lang=en');
  await page.locator('#new-short-link').click();
  await expect(page.locator('[name=linkDomain]')).toHaveAttribute('readonly','');
  await expect(page.locator('[name=linkDomain]')).toHaveValue('https://zprop.tech');
  await page.locator('[name=url]').fill(destination);
  await page.locator('[name=slug]').fill(name);
  await page.getByRole('button',{name:'Create short link',exact:true}).click();
  await expect(page.locator('#link-result')).toBeVisible();
  await expect(page.locator('#short-address')).toHaveText(`https://zprop.tech/${name}`);
  const response=await request.get(`/${name}`,{maxRedirects:0});
  expect(response.status()).toBe(302);expect(response.headers().location).toBe(destination);
  // Keep the redirect destination on the test server as browser routing does
  // not intercept subsequent requests in an already intercepted redirect.
  const popupPromise=page.waitForEvent('popup');await page.locator('#open-short-link').click();
  const popup=await popupPromise;await expect(popup).toHaveURL(new RegExp('/landing.html\\?from=short-link'));await popup.close();
  await page.evaluate(()=>{navigator.clipboard.writeText=async text=>{window.copiedLink=text;};});
  await page.locator('#copy-short-link').click();
  expect(await page.evaluate(()=>window.copiedLink)).toBe(`https://zprop.tech/${name}`);
  await page.locator('[data-language=ms]').click();
  await expect(page.locator('#link-result .draft-label')).toHaveText('PAUTAN DICIPTA');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/short-link-${info.project.name}.png`,fullPage:true});
  await page.locator('[name=url]').fill('https://example.com/new');
  await expect(page.locator('#link-result')).toBeHidden();
  await page.locator('[data-action=createLink]').click();
  await expect(page.locator('#tool-status')).toHaveText('Perubahan disimpan.');
  expect((await request.get(`/s/${name.toUpperCase()}`,{maxRedirects:0})).headers().location).toBe('https://example.com/new');
  expect((await request.get(`/${name.toUpperCase()}/`,{maxRedirects:0})).headers().location).toBe('https://example.com/new');
});

test('server validates links, handles simultaneous alias claims and saves random aliases',async({request})=>{
  const name=slug();
  const claims=Array.from({length:8},(_,i)=>({slug:i%2?`  ${name.toUpperCase()}  `:name,destination:`https://example.com/user-${i}?q=hello#part`}));
  const results=await Promise.all(claims.map(data=>request.post('/api/short-links',{data})));
  expect(results.filter(r=>r.status()===201)).toHaveLength(1);
  expect(results.filter(r=>r.status()===409)).toHaveLength(7);
  const winner=claims[results.findIndex(r=>r.status()===201)];
  for(const response of results.filter(r=>r.status()===409))expect((await response.json()).error).toBe('linkTaken');
  expect((await request.get('/'+name,{maxRedirects:0})).headers().location).toBe(winner.destination);
  for(const destination of ['javascript:alert(1)','data:text/html,hello','https://user:pass@example.com/','https://example.com/\r\nInjected: yes']){
    expect((await request.post('/api/short-links',{data:{destination}})).status()).toBe(400);
  }
  expect((await request.post('/api/short-links',{data:{slug:'../bad',destination:'https://example.com/'}})).status()).toBe(400);
  expect((await request.post('/api/short-links',{data:{destination:'https://example.com/'},headers:{Origin:'null'}})).status()).toBe(403);
  const random=await request.post('/api/short-links',{data:{destination:'https://example.com/'}});
  expect(random.status()).toBe(201);const saved=await random.json();expect(saved.url).toMatch(/^\/[a-z0-9]+$/);
  expect((await request.get(saved.url,{maxRedirects:0})).headers().location).toBe('https://example.com/');
  expect((await request.get('/s/'+slug())).status()).toBe(404);
  expect((await request.get('/.short-links/')).status()).toBe(403);
});

test('a separate browser cannot claim another visitors link name or replace its destination',async({browser,baseURL})=>{
  const first=await browser.newContext(),second=await browser.newContext();
  try{
    for (const context of [first,second]) {
      const response = await context.request.post(baseURL+'/api/auth/register', {data:{email:slug()+'@example.com',password:'Test-password-123!'}});
      expect(response.status()).toBe(201);
    }
    const name=slug();
    const owner=await first.newPage(),visitor=await second.newPage();
    await owner.goto(baseURL+'/tools/short-links.html?lang=en');
    await owner.locator('#new-short-link').click();
    await owner.locator('[name=url]').fill('https://example.com/original-owner');
    await owner.locator('[name=slug]').fill(name);
    await owner.locator('[data-action=createLink]').click();
    await expect(owner.locator('#link-result')).toBeVisible();
    await owner.reload();
    await visitor.goto(baseURL+'/tools/short-links.html?lang=en');
    await visitor.locator('#new-short-link').click();
    await visitor.locator('[name=url]').fill('https://example.com/another-user');
    await visitor.locator('[name=slug]').fill(name.toUpperCase());
    await visitor.locator('[data-action=createLink]').click();
    await expect(visitor.locator('#tool-status')).toHaveText('This link name is already taken. Choose another name.');
    await expect(visitor.locator('#link-result')).toBeHidden();
    expect((await second.request.get(baseURL+'/'+name,{maxRedirects:0})).headers().location).toBe('https://example.com/original-owner');
  }finally{await first.close();await second.close();}
});

test('root aliases protect website routes and reject redirects to themselves',async({request,baseURL})=>{
  for(const name of ['api','tools','assets','sites','scripts','node_modules','TOOLS']){
    const response=await request.post('/api/short-links',{data:{slug:name,destination:'https://example.com/'}});
    expect(response.status()).toBe(400);expect((await response.json()).error).toBe('linkReserved');
  }
  const name=slug();
  const publicLoop=await request.post('/api/short-links',{data:{slug:name,destination:`https://zprop.tech/${name}`}});
  expect(publicLoop.status()).toBe(400);expect((await publicLoop.json()).error).toBe('linkLoop');
  for(const route of [`/${name}`,`/${name}/`,`/s/${name}`,`/%6c${name.slice(1)}`]){
    const response=await request.post('/api/short-links',{data:{slug:name,destination:baseURL+route}});
    expect(response.status()).toBe(400);expect((await response.json()).error).toBe('linkLoop');
  }
  expect((await request.get('/')).status()).toBe(200);
  expect((await request.get('/tools/short-links.html')).status()).toBe(200);
  expect((await request.get('/assets/favicon.svg')).status()).toBe(200);
  expect((await request.get('/'+slug())).status()).toBe(404);
});

test('short-link creation reports a missing backend and recovers for retry',async({page})=>{
  await page.goto('/tools/short-links.html?lang=en');
  await page.locator('#new-short-link').click();
  await page.locator('[name=url]').fill('https://example.com/');
  await page.route('**/api/short-links',route=>route.fulfill({status:404,body:'Not found'}));
  await page.locator('[data-action=createLink]').click();
  await expect(page.locator('#tool-status')).toContainText('link service is unavailable');
  await expect(page.locator('#link-result')).toBeHidden();
  await expect(page.locator('[data-action=createLink]')).toBeEnabled();
  await page.unroute('**/api/short-links');
  await page.locator('[data-action=createLink]').click();
  await expect(page.locator('#link-result')).toBeVisible();
});
