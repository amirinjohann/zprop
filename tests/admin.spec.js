const { test:base, expect, request:requests } = require('@playwright/test');
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname,'..');
const password='Test-password-123!';
const adminCredentials={email:'zpropadmin@gmail.com',password:'admin1234567'};
const test=base.extend({
  adminServer:[async({},use)=>{
    const directory=path.join(root,'test-results','admin-storage-'+crypto.randomUUID());
    await fs.mkdir(directory,{recursive:true});
    const net=require('node:net');
    const port=await new Promise(resolve=>{const listener=net.createServer();listener.listen(0,'127.0.0.1',()=>{const port=listener.address().port;listener.close(()=>resolve(port));});});
    let processHandle;
    const start=async()=>{
      processHandle=spawn(process.execPath,['scripts/serve.cjs'],{cwd:root,windowsHide:true,env:{...process.env,PORT:String(port),HOST:'127.0.0.1',NODE_ENV:'test',AUTH_ORIGIN:'',AUTH_SECURE_COOKIE:'0',ADMIN_EMAIL:adminCredentials.email,ADMIN_PASSWORD:adminCredentials.password,ZPROP_ACCOUNTS_DIR:path.join(directory,'accounts'),ZPROP_ADMIN_DIR:path.join(directory,'admin'),ZPROP_DATA_DIR:path.join(directory,'data')}});
      await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error('Admin test server timeout: '+output)),15000);processHandle.stdout.on('data',chunk=>{output+=chunk;if(output.includes('ZPROP listening')){clearTimeout(timer);resolve();}});processHandle.stderr.on('data',chunk=>output+=chunk);processHandle.once('exit',code=>{clearTimeout(timer);reject(Error('Server exited '+code+': '+output));});});
    };
    const stop=async()=>{if(processHandle.exitCode!==null)return;await new Promise(resolve=>{processHandle.once('exit',resolve);processHandle.kill();});};
    await start();
    try{await use({url:'http://127.0.0.1:'+port,restart:async()=>{await stop();await start();},directory});}finally{await stop();}
  },{scope:'worker'}],
  baseURL:async({adminServer},use)=>use(adminServer.url)
});
async function login(client){const response=await client.post('/api/auth/sign-in',{data:adminCredentials});expect(response.status()).toBe(200);return (await response.json()).user;}
async function register(client){const email='admin-test-'+crypto.randomUUID()+'@example.com';const response=await client.post('/api/auth/register',{data:{email,password,role:'admin',toolsBlocked:false}});expect(response.status()).toBe(201);return (await response.json()).user;}

test('admin authorization, all tool gates, session revocation, persistence and reporting',async({request,baseURL,adminServer})=>{
  expect((await request.get('/api/admin/overview')).status()).toBe(401);
  for(const route of ['/admin','/admin.html','/ADMIN.HTML','/%61dmin.html','/admin.js'])expect((await request.get(route,{maxRedirects:0})).status()).toBe(302);
  const regular=await requests.newContext({baseURL});
  try{
    const user=await register(regular);
    expect(user.role).toBe('user');
    expect((await regular.get('/api/admin/overview')).status()).toBe(403);
    expect((await regular.get('/ADMIN.HTML')).status()).toBe(403);
    const administrator=await login(request);
    const before=await (await request.get('/api/admin/overview')).json();
    expect(JSON.stringify(before)).not.toMatch(/passwordHash|salt|admin1234567/);
    const id=crypto.randomBytes(32).toString('hex');
    expect((await regular.post('/api/vcards',{data:{id}})).status()).toBe(200);
    expect((await regular.post('/api/vcards',{data:{id:'bad'}})).status()).toBe(400);
    expect((await regular.get('/api/dashboard-stats')).status()).toBe(200);
    let report=await (await request.get('/api/admin/overview')).json();
    expect(report.metrics.allTimeUses).toBe(before.metrics.allTimeUses+1);
    expect(report.users.find(item=>item.id===user.id).uses).toBe(1);
    expect(report.series.reduce((sum,point)=>sum+point.uses,0)).toBe(report.metrics.uses);
    const filtered=await (await request.get('/api/admin/overview?days=7&tool=short-links')).json();
    expect(filtered.users.find(item=>item.id===user.id).uses).toBe(0);
    expect(filtered.series).toHaveLength(7);
    for(const query of ['days=1','days=Infinity','tool=invalid'])expect((await request.get('/api/admin/overview?'+query)).status()).toBe(400);
    const access='/api/admin/users/'+user.id+'/access';
    expect((await regular.patch(access,{data:{toolsBlocked:true}})).status()).toBe(403);
    expect((await request.patch(access,{headers:{Origin:'https://evil.example'},data:{toolsBlocked:true}})).status()).toBe(403);
    expect((await request.patch(access,{data:{role:'admin'}})).status()).toBe(400);
    expect((await request.patch(access,{data:{toolsBlocked:'false'}})).status()).toBe(400);
    expect((await request.patch('/api/admin/users/'+administrator.id+'/access',{data:{signInBlocked:true}})).status()).toBe(403);
    expect((await request.patch(access,{data:{toolsBlocked:true}})).status()).toBe(200);
    expect((await (await regular.get('/api/auth/session')).json()).user.toolsBlocked).toBe(true);
    for(const tool of ['bio-pages','short-links','transfer-files','vcards','host-html','qr-codes']){
      const response=await regular.get('/tools/'+tool+'.html',{maxRedirects:0});expect(response.headers().location).toBe('/access-denied.html');
    }
    for(const route of ['bio-pages','short-links','file-links','vcards','static-sites','qr-codes','dashboard-links']){
      expect((await regular.post('/api/'+route,{data:{}})).status()).toBe(403);
    }
    expect((await regular.post('/api/auth/sign-in',{data:{email:user.email,password}})).status()).toBe(200);
    expect((await request.patch(access,{data:{signInBlocked:true}})).status()).toBe(200);
    expect((await (await regular.get('/api/auth/session')).json()).user).toBeNull();
    expect((await regular.post('/api/auth/sign-in',{data:{email:user.email,password}})).status()).toBe(403);
    await adminServer.restart();
    await login(request);
    expect((await regular.post('/api/auth/sign-in',{data:{email:user.email,password}})).status()).toBe(403);
    report=await (await request.get('/api/admin/overview')).json();
    expect(report.users.find(item=>item.id===user.id).allTimeUses).toBe(1);
    expect(report.audit.some(event=>event.userId===user.id&&event.changes.signInBlocked)).toBe(true);
    expect((await request.patch(access,{data:{signInBlocked:false,toolsBlocked:false}})).status()).toBe(200);
    expect((await regular.post('/api/auth/sign-in',{data:{email:user.email,password}})).status()).toBe(200);
    expect((await regular.get('/tools/vcards.html')).status()).toBe(200);
    expect((await regular.delete('/api/vcards/'+id)).status()).toBe(200);
    expect((await request.get('/.admin/metadata.json')).status()).toBe(403);
  }finally{await regular.dispose();}
});

test('admin dashboard charts, search, access controls, export and mobile layout',async({page,request,baseURL},info)=>{
  const member=await requests.newContext({baseURL});const user=await register(member);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  try{
    await page.goto('/admin');
    await expect(page).toHaveURL(/sign-in.html/);
    await page.locator('#email').fill(adminCredentials.email);
    await page.locator('#password').fill(adminCredentials.password);
    await page.locator('#sign-in-submit').click();
    await expect(page).toHaveURL(/\/admin\.html\?lang=en$/);
    await expect(page.locator('#total-users')).not.toHaveText('\u2014');
    await expect(page.locator('#usage-chart svg')).toBeVisible();
    await expect(page.locator('#signup-chart svg')).toBeVisible();
    await page.locator('#search').fill(user.email);
    await expect(page.locator('#user-rows tr')).toHaveCount(1);
    await page.getByRole('button',{name:'Block tools for '+user.email,exact:true}).click();
    await page.getByRole('button',{name:'Cancel',exact:true}).click();
    expect((await (await member.get('/api/auth/session')).json()).user.toolsBlocked).toBe(false);
    await page.getByRole('button',{name:'Block tools for '+user.email,exact:true}).click();
    await page.locator('#confirm-access').click();
    await expect(page.getByRole('button',{name:'Restore tools for '+user.email,exact:true})).toBeVisible();
    expect((await member.post('/api/vcards',{data:{}})).status()).toBe(403);
    await page.getByRole('button',{name:'Restore tools for '+user.email,exact:true}).click();
    await page.locator('#confirm-access').click();
    await expect(page.getByRole('button',{name:'Block tools for '+user.email,exact:true})).toBeVisible();
    await page.locator('#period').selectOption('7');
    await expect(page.locator('.period-label').first()).toHaveText('(7 days)');
    await page.locator('#tool').selectOption('vcards');
    await page.locator('#refresh').click();
    await expect(page.locator('#refresh')).toBeEnabled();
    const download=page.waitForEvent('download');await page.locator('#export').click();
    expect((await download).suggestedFilename()).toBe('zprop-users-7days-vcards.csv');
    await page.locator('#search').fill('nobody-matches-this');
    await expect(page.locator('#user-rows')).toContainText('No users match');
    await page.locator('#search').fill('');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.screenshot({path:'test-results/admin-'+info.project.name+'.png',fullPage:true});
    expect(errors).toEqual([]);
    await page.locator('#sign-out').click();await expect(page).toHaveURL(/sign-in.html/);
  }finally{await member.dispose();}
});
test('usage counts all six tools, saves and repeat actions while excluding deletes and admins',async({request,baseURL})=>{
  const member=await requests.newContext({baseURL});const user=await register(member);await login(request);
  const before=await (await request.get('/api/admin/overview')).json();
  const slug='admin-metrics-'+crypto.randomBytes(6).toString('hex');
  const qrInput={type:'url',timeZone:'Asia/Kuala_Lumpur',state:{name:'Admin tracking check',url:'https://example.com',foreground:'#183e32',background:'#ffffff',size:'1024'}};
  const fingerprint=crypto.randomBytes(32).toString('hex');
  try{
    expect((await member.post('/api/bio-pages',{data:{slug,state:{schemaVersion:2,shape:'rounded',background:'#ffffff',ink:'#183e32',accent:'#183e32',buttonText:'#ffffff',blocks:[]}}})).status()).toBe(201);
    const qr=await member.post('/api/qr-codes',{data:qrInput});expect(qr.status()).toBe(201);const code=await qr.json();
    expect((await member.post('/api/short-links',{data:{slug,destination:'https://example.com'}})).status()).toBe(201);
    expect((await member.post('/api/file-links?name=admin-test.pdf',{data:Buffer.from('%PDF-1.4\nTest'),headers:{'Content-Type':'application/pdf'}})).status()).toBe(201);
    expect((await member.post('/api/static-sites?type=html',{data:'<h1>Admin test</h1>',headers:{'Content-Type':'text/html'}})).status()).toBe(201);
    expect((await member.post('/api/vcards',{data:{id:fingerprint}})).status()).toBe(200);
    let report=await (await request.get('/api/admin/overview')).json();
    expect(report.users.find(item=>item.id===user.id).uses).toBe(6);
    for(const tool of report.tools)expect(tool.uses).toBe(before.tools.find(item=>item.id===tool.id).uses+1);
    expect((await member.put('/api/qr-codes/'+code.id,{data:{...qrInput,revision:code.revision}})).status()).toBe(200);
    expect((await member.post('/api/vcards',{data:{id:fingerprint}})).status()).toBe(200);
    expect((await request.post('/api/vcards',{data:{id:fingerprint}})).status()).toBe(403);
    expect((await request.delete('/api/vcards/'+fingerprint)).status()).toBe(403);
    const links=(await (await member.get('/api/dashboard-links')).json()).links;
    for(const link of links)expect((await member.delete('/api/dashboard-links/'+link.category+'/'+link.id,{data:{revision:link.revision}})).status()).toBe(200);
    report=await (await request.get('/api/admin/overview')).json();
    expect(report.users.find(item=>item.id===user.id).uses).toBe(8);
    expect(report.metrics.allTimeUses).toBe(before.metrics.allTimeUses+8);
  }finally{await member.dispose();}
});

test('archived test activity does not inflate user totals or usage charts',async({request,adminServer})=>{
  await login(request);
  const before=await (await request.get('/api/admin/overview')).json();
  const unknownId=crypto.randomUUID();
  await fs.appendFile(path.join(adminServer.directory,'admin','events.ndjson'),JSON.stringify({id:crypto.randomUUID(),at:new Date().toISOString(),type:'usage',userId:unknownId,tool:'vcards',action:'create'})+'\n');
  const after=await (await request.get('/api/admin/overview')).json();
  expect(after.metrics).toEqual(before.metrics);
  expect(after.tools).toEqual(before.tools);
  expect(after.series).toEqual(before.series);
  expect(after.users).toEqual(before.users);
});

test('admin language and dark mode persist, with translated data and access dialogs',async({page,request},info)=>{
  await register(request);
  await login(page.request);
  await page.goto('/admin.html?lang=en');
  await expect(page.locator('#total-users')).not.toHaveText('\u2014');
  const total=await page.locator('#total-users').textContent();
  await page.locator('.theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.getByRole('button',{name:'BM',exact:true}).click();
  await expect(page.locator('html')).toHaveAttribute('lang','ms');
  await expect(page.locator('h1')).toContainText('Ringkasan admin');
  await expect(page.locator('[data-admin-copy="Total users"]')).toHaveText('Jumlah pengguna');
  await expect(page.locator('#total-users')).toHaveText(total);
  await expect(page.locator('#account-note')).toContainText('pentadbir');
  await expect(page.locator('#new-users')).toContainText('mendaftar');
  await expect(page.locator('#usage-chart summary')).toHaveText('Lihat angka harian');
  await expect(page.locator('#tool option[value="bio-pages"]')).toHaveText('Halaman bio');
  await expect(page.locator('.theme-toggle')).toHaveAttribute('aria-label','Mod gelap');
  await page.locator('#period').selectOption('7');
  await expect(page.locator('.period-label').first()).toHaveText('(7 hari)');
  await page.locator('#user-rows button').first().click();
  await expect(page.locator('#dialog-title')).toContainText(/akses alatan/);
  await expect(page.locator('#confirm-access')).toHaveText('Sahkan perubahan');
  await page.getByRole('button',{name:'Batal',exact:true}).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await expect(page.locator('html')).toHaveAttribute('lang','ms');
  await expect(page.locator('#total-users')).toHaveText(total);
  expect(await page.locator('.panel').first().evaluate(element=>getComputedStyle(element).backgroundColor)).toBe('rgb(25, 27, 32)');
  await page.locator('#search').fill('no-matching-account');
  await expect(page.locator('#user-rows')).toContainText('Tiada pengguna');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/admin-dark-bm-'+info.project.name+'.png',fullPage:true});
  await page.getByRole('button',{name:'EN',exact:true}).click();
  await expect(page.locator('h1')).toContainText('Admin overview');
  await expect(page.locator('#user-rows')).toContainText('No users match');
  await expect(page.locator('#search')).toHaveValue('no-matching-account');
  await page.locator('.theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang','en');
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');
});

test('user totals match stored accounts across filters, restrictions, archives and restarts',async({request,baseURL,adminServer})=>{
  await login(request);
  const before=await (await request.get('/api/admin/overview')).json();
  const member=await requests.newContext({baseURL});
  try {
    const user=await register(member);
    const after=await (await request.get('/api/admin/overview')).json();
    expect(after.metrics.totalUsers).toBe(before.metrics.totalUsers+1);
    expect(after.metrics.administrators).toBe(1);
    expect(after.metrics.totalUsers).toBe(after.users.length);
    expect(Number.isFinite(Date.parse(after.generatedAt))).toBe(true);
    await request.patch('/api/admin/users/'+user.id+'/access',{data:{toolsBlocked:true,signInBlocked:true}});
    for(const days of [7,30,90]) {
      const report=await (await request.get('/api/admin/overview?days='+days+'&tool=vcards')).json();
      expect(report.metrics.totalUsers).toBe(after.metrics.totalUsers);
      expect(report.users.find(account=>account.id===user.id)).toMatchObject({toolsBlocked:true,signInBlocked:true});
      expect(report.metrics.activeUsers).toBe(report.users.filter(account=>account.uses>0).length);
    }
    const accounts=path.join(adminServer.directory,'accounts');
    const filename=crypto.createHash('sha256').update(user.email).digest('hex')+'.json';
    const archive=path.join(accounts,'.test-archive');await fs.mkdir(archive,{recursive:true});
    await fs.rename(path.join(accounts,filename),path.join(archive,filename));
    await adminServer.restart();await login(request);
    const final=await (await request.get('/api/admin/overview')).json();
    expect(final.metrics.totalUsers).toBe(before.metrics.totalUsers);
    expect(final.users.some(account=>account.id===user.id)).toBe(false);
    const stored=[];
    for(const name of await fs.readdir(accounts))if(/^[a-f0-9]{64}\.json$/.test(name))stored.push(JSON.parse(await fs.readFile(path.join(accounts,name),'utf8')));
    expect(final.metrics.totalUsers).toBe(stored.filter(account=>account.role!=='admin').length);
  } finally {await member.dispose();}
});

test('admin account changes are denied without changing stored credentials or sessions',async({request,adminServer})=>{
  const administrator=await login(request);
  const directory=path.join(adminServer.directory,'accounts');
  const snapshot=async()=>{const files=await fs.readdir(directory);return Promise.all(files.filter(name=>name.endsWith('.json')).sort().map(async name=>[name,await fs.readFile(path.join(directory,name),'utf8')]));};
  const before=await snapshot();
  for(const data of [
    {email:'changed-admin@example.com',currentPassword:adminCredentials.password},
    {newPassword:'Changed-admin-123!',currentPassword:adminCredentials.password},
    {avatar:null},
    {avatar:'data:image/png;base64,'+await fs.readFile(path.join(root,'assets/zprop-tech-logo-clean.png'),'base64')}
  ]) {
    const response=await request.patch('/api/auth/profile',{data});
    expect(response.status()).toBe(403);expect(await response.json()).toEqual({error:'adminAccountLocked'});
  }
  for(const method of ['POST','PUT','DELETE']) {
    const response=await request.fetch('/api/auth/profile',{method,data:{email:'denied@example.com'}});
    expect(response.status()).toBe(403);
  }
  expect(await snapshot()).toEqual(before);
  expect((await (await request.get('/api/auth/session')).json()).user).toMatchObject({id:administrator.id,email:adminCredentials.email,role:'admin'});
  expect((await request.get('/api/admin/overview')).status()).toBe(200);
  await adminServer.restart();
  expect(await login(request)).toMatchObject({id:administrator.id,email:adminCredentials.email,role:'admin'});
  expect(await snapshot()).toEqual(before);
});

test('admins cannot access user APIs, mutate tool storage, or switch to a user without signing out',async({request,baseURL,adminServer})=>{
  const member=await requests.newContext({baseURL});
  const user=await register(member);
  const administrator=await login(request);
  const slug='roles-'+crypto.randomBytes(6).toString('hex');
  const fingerprint=crypto.randomBytes(32).toString('hex');
  const dataDir=path.join(adminServer.directory,'data');
  const legacyDirectory=path.join(dataDir,'.created-vcards',administrator.id);
  await fs.mkdir(legacyDirectory,{recursive:true});
  const legacyFile=path.join(legacyDirectory,fingerprint+'.json');
  await fs.writeFile(legacyFile,'{}');
  const previousData=process.env.ZPROP_DATA_DIR;
  process.env.ZPROP_DATA_DIR=dataDir;
  const stats=require('../scripts/dashboard-stats.cjs');
  const beforeStorage=await stats.summary(administrator.id,true);
  const beforeReport=await (await request.get('/api/admin/overview')).json();
  try {
    const routes=['bio-pages','short-links','file-links','static-sites','qr-codes','vcards','dashboard-links','dashboard-stats','dashboard-events'];
    for(const route of routes)for(const method of ['GET','POST','PUT','PATCH','DELETE']) {
      const response=await request.fetch('/api/'+route,{method,data:method==='GET'?undefined:{id:fingerprint,slug,destination:'https://example.com'}});
      expect(response.status(),method+' '+route).toBe(403);
      expect(await response.json()).toEqual({error:'userAccountRequired'});
    }
    for(const route of ['vcards/'+fingerprint,'bio-pages/'+slug,'qr-codes/'+crypto.randomUUID(),'short-links/'+slug,'dashboard-links/vcards/'+fingerprint]) {
      for(const method of ['GET','PUT','DELETE']) {
        const response=await request.fetch('/api/'+route,{method,data:method==='GET'?undefined:{revision:1}});
        expect(response.status()).toBe(403);expect((await response.json()).error).toBe('userAccountRequired');
      }
    }
    expect((await request.post('/api/file-links?name=roles.pdf',{data:Buffer.from('%PDF-1.4\nTest'),headers:{'Content-Type':'application/pdf'}})).status()).toBe(403);
    expect((await request.post('/api/static-sites?type=html',{data:'<h1>Denied</h1>',headers:{'Content-Type':'text/html'}})).status()).toBe(403);
    const registration=await request.post('/api/auth/register',{data:{email:'roles-'+crypto.randomUUID()+'@example.com',password}});
    expect(registration.status()).toBe(403);expect((await registration.json()).error).toBe('userAccountRequired');
    expect((await request.post('/api/auth/sign-in',{data:{email:user.email,password}})).status()).toBe(403);
    expect((await (await request.get('/api/auth/session')).json()).user.role).toBe('admin');
    expect((await request.get('/api/auth/profile')).status()).toBe(200);
    expect(await stats.summary(administrator.id,true)).toEqual(beforeStorage);
    expect(await fs.readFile(legacyFile,'utf8')).toBe('{}');
    const afterReport=await (await request.get('/api/admin/overview')).json();
    expect(afterReport.metrics).toEqual(beforeReport.metrics);
    expect(afterReport.series).toEqual(beforeReport.series);
    expect(afterReport.audit).toEqual(beforeReport.audit);
    expect((await member.post('/api/short-links',{data:{slug,destination:'https://example.com'}})).status()).toBe(201);
    expect((await request.get('/'+slug,{maxRedirects:0})).headers().location).toBe('https://example.com/');
    expect((await request.get('/s/'+slug,{maxRedirects:0})).status()).toBe(302);
    await request.post('/api/auth/sign-out');
    expect((await request.post('/api/auth/sign-in',{data:{email:user.email,password}})).status()).toBe(200);
    expect((await request.get('/tools/vcards.html')).status()).toBe(200);
    expect((await request.get('/admin-account.html')).status()).toBe(403);
    const owned=(await (await member.get('/api/dashboard-links')).json()).links;
    for(const link of owned)await member.delete('/api/dashboard-links/'+link.category+'/'+link.id,{data:{revision:link.revision}});
  } finally {
    if(previousData===undefined)delete process.env.ZPROP_DATA_DIR;else process.env.ZPROP_DATA_DIR=previousData;
    await member.dispose();
    // Remove only the synthetic file created by this test, never existing content.
    await fs.unlink(legacyFile);
  }
});

test('admin navigation excludes account settings and preserves language and theme',async({page,request,baseURL},info)=>{
  const anonymous=await requests.newContext({baseURL});
  const regular=await requests.newContext({baseURL});
  await register(regular);
  try {
    expect((await anonymous.get('/admin-account.html',{maxRedirects:0})).status()).toBe(302);
    expect((await regular.get('/admin-account.html')).status()).toBe(403);
    await login(page.request);
    const paths=['/','/index.html','/landing.html','/sign-in.html','/tools/dashboard.html','/tools/bio-pages.html','/tools/short-links.html','/tools/transfer-files.html','/tools/vcards.html','/tools/host-html.html','/tools/qr-codes.html','/TOOLS/VCARDS.HTML','/%74ools/vcards.html'];
    for(const path of paths) {
      const response=await page.request.get(path+'?lang=ms',{maxRedirects:0});
      expect(response.status(),path).toBe(302);expect(response.headers().location).toBe('/admin.html?lang=ms');
      expect(response.headers()['cache-control']).toBe('no-store');
    }
    expect((await page.request.get('/tools/profile.html?lang=en',{maxRedirects:0})).headers().location).toBe('/admin.html?lang=en');
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto('/landing.html?lang=en');
    await expect(page).toHaveURL(/\/admin.html\?lang=en$/);
    await expect(page.locator('a[href*="tools/"], a[href*="landing.html"], a[href*="index.html"]')).toHaveCount(0);
    await expect(page.getByRole('link',{name:'Manage account',exact:true})).toHaveCount(0);
    await expect(page.locator('a[href*="admin-account"], a[href*="profile.html"]')).toHaveCount(0);
    for(const path of ['/admin-account.html','/admin-account','/admin-account/','/ADMIN-ACCOUNT.HTML']) {
      const response=await page.request.get(path+'?lang=en',{maxRedirects:0});
      expect(response.status()).toBe(302);expect(response.headers().location).toBe('/admin.html?lang=en');
    }
    expect((await page.request.get('/admin-account.js')).status()).toBe(404);
    await page.goto('/admin-account.html?lang=en');await expect(page).toHaveURL(/\/admin.html\?lang=en$/);
    await expect(page.locator('#profile-email')).toHaveCount(0);
    expect((await (await page.request.get('/api/auth/session')).json()).user.role).toBe('admin');
    await page.locator('.theme-toggle').click();
    await page.getByRole('button',{name:'BM',exact:true}).click();
    await expect(page.locator('html')).toHaveAttribute('lang','ms');
    await page.reload();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
    await expect(page.locator('html')).toHaveAttribute('lang','ms');
    await expect(page.locator('a[href*="admin-account"], a[href*="profile.html"]')).toHaveCount(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.goto('/tools/profile.html?lang=ms');await expect(page).toHaveURL(/\/admin.html\?lang=ms$/);
    await page.goBack();await expect(page).toHaveURL(/\/admin.html/);
    expect(errors).toEqual([]);
    await page.locator('#sign-out').click();await expect(page).toHaveURL(/sign-in.html/);
    expect((await page.request.get('/admin-account.html',{maxRedirects:0})).status()).toBe(302);
  } finally {await anonymous.dispose();await regular.dispose();}
});
