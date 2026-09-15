const {test,expect}=require('./auth-fixture');
const fs=require('node:fs/promises');
const unique=()=> 'library-'+require('crypto').randomBytes(6).toString('hex');
const state={name:'Aina Studio',company:'ZPROP',phone:'+60123456789',email:'aina@example.com'};

test('all three libraries start empty with matching Create actions and bilingual layouts',async({page},info)=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  for(const [category,title] of [['transfer-files','Your file links'],['vcards','Your vCards'],['host-html','Your static sites']]){
    await page.goto('/tools/'+category+'.html?lang=en');
    await expect(page.locator('#item-library h2')).toHaveText(title);
    await expect(page.locator('.short-library-empty')).toBeVisible();await expect(page.locator('#tool-form')).toBeHidden();
    await page.locator('.theme-toggle').click();
    await page.screenshot({path:'test-results/library-'+category+'-'+info.project.name+'.png',fullPage:true});
    await page.locator('[data-language=ms]').click();await expect(page.locator('#new-item')).toContainText('Cipta');
    await page.locator('[data-language=en]').click();
    await page.locator('#new-item').click();await expect(page.locator('#tool-form')).toBeVisible();
    await page.locator('#back-item-library').click();await expect(page.locator('.short-library-empty')).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  expect(errors).toEqual([]);
});

test('file and static libraries list existing items, copy, download, and confirm deletion',async({page,request})=>{
  const file=unique(),site=unique(),bytes=Buffer.from('%PDF-1.4\nLibrary file');
  expect((await request.post('/api/file-links?name=report.pdf&slug='+file,{data:bytes})).status()).toBe(201);
  expect((await request.post('/api/static-sites?type=html&slug='+site,{data:'<h1>Saved website</h1>'})).status()).toBe(201);
  for(const [category,id,url] of [['transfer-files',file,'/'+file],['host-html',site,'/'+site+'/']]){
    await page.goto('/tools/'+category+'.html?lang=en');
    const card=page.locator('[data-item-id="'+id+'"]');await expect(card).toBeVisible();
    await expect(page.locator('[data-item-id]')).toHaveCount(1);
    await page.evaluate(()=>{navigator.clipboard.writeText=async text=>window.copiedItem=text;});
    await card.locator('[data-item-action=copy]').click();expect(new URL(await page.evaluate(()=>window.copiedItem)).pathname).toBe(url);
    if(category==='transfer-files'){const downloaded=page.waitForEvent('download');await card.locator('[data-item-action=download]').click();expect(await fs.readFile(await (await downloaded).path())).toEqual(bytes);}
    else{const popupPromise=page.waitForEvent('popup');await card.locator('[data-item-action=open]').click();const popup=await popupPromise;await expect(popup.locator('h1')).toHaveText('Saved website');await popup.close();}
    await card.locator('[data-item-action=delete]').click();await page.locator('#cancel-delete-item').click();await expect(card).toBeVisible();
    await card.locator('[data-item-action=delete]').click();await page.locator('#confirm-delete-item').click();
    await expect(page.locator('.short-library-empty')).toBeVisible();expect((await request.get(url)).status()).toBe(404);
    await page.reload();await expect(page.locator('.short-library-empty')).toBeVisible();
  }
});

test('saved vCards reopen, edit in place, download, protect unsaved changes and delete',async({page,request})=>{
  await page.goto('/tools/vcards.html?lang=en');await page.locator('#new-item').click();
  for(const [key,value] of Object.entries(state))await page.locator('[name='+key+']').fill(value);
  await page.locator('[data-action=saveVcard]').click();await expect(page.locator('#tool-status')).toHaveText('vCard saved.');
  await page.locator('#back-item-library').click();await expect(page.locator('[data-item-id]')).toHaveCount(1);
  const id=await page.locator('[data-item-id]').getAttribute('data-item-id');
  await page.reload();await expect(page.locator('[data-item-id] h3')).toHaveText(state.name);
  await page.locator('[data-item-action=edit]').click();await expect(page.locator('[name=email]')).toHaveValue(state.email);
  await page.locator('[name=name]').fill('Unsaved name');page.once('dialog',dialog=>dialog.dismiss());await page.locator('#back-item-library').click();await expect(page.locator('#tool-form')).toBeVisible();
  await page.locator('[name=name]').fill('Updated contact');await page.locator('[data-action=saveVcard]').click();await expect(page.locator('#tool-status')).toHaveText('vCard saved.');
  const summary=await (await request.get('/api/dashboard-links')).json();expect(summary.counts.vcards).toBe(1);expect(summary.links[0].id).toBe(id);
  await page.reload();await expect(page.locator('[name=name]')).toHaveValue('Updated contact');
  await page.locator('#back-item-library').click();const downloaded=page.waitForEvent('download');await page.locator('[data-item-action=download]').click();
  expect(await fs.readFile(await (await downloaded).path(),'utf8')).toContain('FN:Updated contact');
  await page.locator('[data-item-action=delete]').click();await page.locator('#confirm-delete-item').click();await expect(page.locator('.short-library-empty')).toBeVisible();
  expect((await request.get('/api/vcards/'+id)).status()).toBe(404);
});

test('saved vCards validate input and isolate accounts; old fingerprints remain manageable',async({page,request,browser,baseURL})=>{
  const saved=await request.post('/api/vcards',{data:{state}});expect(saved.status()).toBe(200);const card=await saved.json();
  expect((await request.post('/api/vcards',{data:{state}})).status()).toBe(200);
  const latest=await (await request.get('/api/vcards/'+card.id)).json();
  expect((await request.put('/api/vcards/'+card.id,{data:{state,revision:card.revision}})).status()).toBe(409);
  expect((await request.delete('/api/dashboard-links/vcards/'+card.id,{data:{revision:card.revision}})).status()).toBe(409);
  expect((await request.post('/api/vcards',{data:{state:{...state,email:'invalid'}}})).status()).toBe(400);
  expect((await request.put('/api/vcards/'+card.id,{data:{state,revision:latest.revision},headers:{Origin:'null'}})).status()).toBe(403);
  const other=await browser.newContext();try{
    expect((await other.request.get(baseURL+'/api/vcards/'+card.id)).status()).toBe(401);
    await other.request.post(baseURL+'/api/auth/register',{data:{email:unique()+'@example.com',password:'Test-password-123!'}});
    for(const method of ['get','put','delete'])expect((await other.request[method](baseURL+'/api/vcards/'+card.id,{data:{state,revision:latest.revision}})).status()).toBe(404);
  }finally{await other.close();}
  const legacy=require('crypto').randomBytes(32).toString('hex');await request.post('/api/vcards',{data:{id:legacy}});
  await page.goto('/tools/vcards.html?lang=en');const row=page.locator('[data-item-id="'+legacy+'"]');
  await expect(row).toContainText('Details were not saved');await expect(row.locator('[data-item-action=edit]')).toHaveCount(0);
  await row.locator('[data-item-action=delete]').click();await page.locator('#confirm-delete-item').click();await expect(row).toHaveCount(0);
});

test('new file links and static sites appear in their libraries after creation',async({page})=>{
  for(const category of ['transfer-files','host-html']){
    const id=unique();await page.goto('/tools/'+category+'.html?lang=en');await page.locator('#new-item').click();
    if(category==='transfer-files'){
      await page.locator('[name=files]').setInputFiles({name:'new-report.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\nNew saved file')});
      await page.locator('[name=slug]').fill(id);await page.locator('[data-action=createFileLink]').click();await expect(page.locator('#file-result')).toBeVisible();
    }else{
      await page.locator('[data-mode=paste]').click();await page.locator('[name=html]').fill('<h1>New saved site</h1>');
      await page.locator('[name=slug]').fill(id);await page.locator('#create-site').click();await expect(page.locator('#site-result')).toBeVisible();
    }
    await expect(page.locator('#item-dirty')).toBeHidden();
    await page.locator('#back-item-library').click();await expect(page.locator('[data-item-id="'+id+'"]')).toBeVisible();
    await page.reload();await expect(page.locator('[data-item-id="'+id+'"]')).toBeVisible();
    await page.locator('#new-item').click();await expect(page.locator('[name=slug]')).toBeEmpty();
    await expect(page.locator(category==='transfer-files'?'#file-result':'#site-result')).toBeHidden();
  }
});

test('vCard creation rejects malformed bodies and deduplicates a recreated card without overwriting edits',async({request})=>{
  for(const data of ['null','[]','"invalid"'])expect((await request.post('/api/vcards',{data,headers:{'Content-Type':'application/json'}})).status()).toBe(400);
  const original=await (await request.post('/api/vcards',{data:{state}})).json();
  expect((await request.put('/api/vcards/'+original.id,{data:{state:{...state,name:'Edited contact'},revision:original.revision}})).status()).toBe(200);
  const recreated=await (await request.post('/api/vcards',{data:{state}})).json();
  const repeated=await (await request.post('/api/vcards',{data:{state}})).json();
  expect(recreated.id).not.toBe(original.id);expect(repeated.id).toBe(recreated.id);
  expect((await (await request.get('/api/vcards/'+original.id)).json()).state.name).toBe('Edited contact');
  expect((await (await request.get('/api/dashboard-links')).json()).counts.vcards).toBe(2);
});
