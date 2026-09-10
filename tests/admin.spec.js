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
      processHandle=spawn(process.execPath,['scripts/serve.cjs'],{cwd:root,windowsHide:true,env:{...process.env,PORT:String(port),HOST:'127.0.0.1',NODE_ENV:'test',AUTH_ORIGIN:'',AUTH_SECURE_COOKIE:'0',ADMIN_EMAIL:adminCredentials.email,ADMIN_PASSWORD:adminCredentials.password,ZPROP_ACCOUNTS_DIR:path.join(directory,'accounts'),ZPROP_ADMIN_DIR:path.join(directory,'admin')}});
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
    await expect(page).toHaveURL(/\/admin.html$/);
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
    expect((await request.post('/api/vcards',{data:{id:fingerprint}})).status()).toBe(200);
    expect((await request.delete('/api/vcards/'+fingerprint)).status()).toBe(200);
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
