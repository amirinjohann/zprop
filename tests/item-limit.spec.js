const {test,expect}=require('./auth-fixture');
const crypto=require('node:crypto');
const {LIMIT}=require('../scripts/item-limit.cjs');
test.setTimeout(60000);
const unique=(prefix='x')=>prefix+crypto.randomBytes(4).toString('hex');
const bioState={schemaVersion:2,shape:'rounded',background:'#ffffff',ink:'#183e32',accent:'#183e32',buttonText:'#ffffff',blocks:[]};
const qrBody=()=>({type:'url',timeZone:'Asia/Kuala_Lumpur',state:{name:'QR '+unique('n'),url:'https://example.com/'+unique('p'),foreground:'#183e32',background:'#ffffff',size:'1024'}});
const vcard=i=>({name:'Contact '+i,company:'ZPROP',phone:`+6012345678${i}`,email:`limit${i}@example.com`});
const pdf=Buffer.from('%PDF-1.4\nLimit');
async function send(request,method,url,options){
  for(let i=0;i<12;i++){
    const response=await request[method](url,options);
    if(response.status()!==429)return response;
    await new Promise(resolve=>setTimeout(resolve,150*(i+1)));
  }
  return request[method](url,options);
}
async function limited(response){
  expect(response.status()).toBe(403);
  expect((await response.json()).error).toBe('itemLimit');
}
async function otherCreates(browser,baseURL,create){
  const other=await browser.newContext();
  try{
    expect((await send(other.request,'post',baseURL+'/api/auth/register',{data:{email:unique('u')+'@example.com',password:'Test-password-123!'}})).status()).toBe(201);
    await create(other.request,baseURL);
  }finally{await other.close();}
}
async function expectCapped(page,button){
  await expect(page.locator(button)).toBeDisabled({timeout:20000});
  await expect(page.getByText('You can save up to 5 items in this tool. Delete one to add another.')).toBeVisible();
}

test('bio pages cap at 5, allow updates, isolate accounts and reopen after delete',async({request,browser,baseURL,page})=>{
  const pages=[];
  for(let i=0;i<LIMIT;i++){
    const created=await send(request,'post','/api/bio-pages',{data:{slug:unique('bio'),state:bioState}});
    expect(created.status()).toBe(201);
    pages.push(await created.json());
  }
  await limited(await send(request,'post','/api/bio-pages',{data:{slug:unique('bio'),state:bioState}}));
  expect((await send(request,'post','/api/short-links',{data:{slug:unique('s'),destination:'https://example.com'}})).status()).toBe(201);
  const first=pages[0];
  expect((await send(request,'put','/api/bio-pages/'+first.slug,{data:{state:first.state,publish:false,revision:first.revision}})).status()).toBe(200);
  await otherCreates(browser,baseURL,async req=>{
    expect((await send(req,'post',baseURL+'/api/bio-pages',{data:{slug:unique('bio'),state:bioState}})).status()).toBe(201);
  });
  expect((await send(request,'delete','/api/bio-pages/'+first.slug)).status()).toBe(200);
  expect((await send(request,'post','/api/bio-pages',{data:{slug:unique('bio'),state:bioState}})).status()).toBe(201);
  await page.goto('/tools/bio-pages.html?lang=en');
  await expectCapped(page,'#new-bio');
});

test('short links cap at 5, allow updates, isolate accounts and reopen after delete',async({request,browser,baseURL,page})=>{
  const links=[];
  for(let i=0;i<LIMIT;i++){
    const created=await send(request,'post','/api/short-links',{data:{slug:unique('s'),destination:'https://example.com/'+i}});
    expect(created.status()).toBe(201);
    links.push(await created.json());
  }
  await limited(await send(request,'post','/api/short-links',{data:{slug:unique('s'),destination:'https://example.com/extra'}}));
  const first=links[0];
  expect((await send(request,'put','/api/short-links/'+first.slug,{data:{...first,destination:'https://example.com/updated'}})).status()).toBe(200);
  await otherCreates(browser,baseURL,async req=>{
    expect((await send(req,'post',baseURL+'/api/short-links',{data:{slug:unique('s'),destination:'https://example.com'}})).status()).toBe(201);
  });
  expect((await send(request,'delete','/api/short-links/'+links[1].slug,{data:{revision:links[1].revision}})).status()).toBe(200);
  expect((await send(request,'post','/api/short-links',{data:{slug:unique('s'),destination:'https://example.com/again'}})).status()).toBe(201);
  await page.goto('/tools/short-links.html?lang=en');
  await expectCapped(page,'#new-short-link');
});

test('file links cap at 5, isolate accounts and reopen after delete',async({request,browser,baseURL,page})=>{
  const files=[];
  for(let i=0;i<LIMIT;i++){
    const created=await send(request,'post','/api/file-links?name=report.pdf&slug='+unique('f'),{data:pdf,headers:{'Content-Type':'application/pdf'}});
    expect(created.status()).toBe(201);
    files.push(await created.json());
  }
  await limited(await send(request,'post','/api/file-links?name=report.pdf&slug='+unique('f'),{data:pdf,headers:{'Content-Type':'application/pdf'}}));
  await otherCreates(browser,baseURL,async req=>{
    expect((await send(req,'post',baseURL+'/api/file-links?name=report.pdf&slug='+unique('f'),{data:pdf,headers:{'Content-Type':'application/pdf'}})).status()).toBe(201);
  });
  expect((await send(request,'delete','/api/dashboard-links/transfer-files/'+files[0].slug)).status()).toBe(200);
  expect((await send(request,'post','/api/file-links?name=report.pdf&slug='+unique('f'),{data:pdf,headers:{'Content-Type':'application/pdf'}})).status()).toBe(201);
  await page.goto('/tools/transfer-files.html?lang=en');
  await expectCapped(page,'#new-item');
});

test('static sites cap at 5, isolate accounts and reopen after delete',async({request,browser,baseURL,page})=>{
  const sites=[];
  for(let i=0;i<LIMIT;i++){
    const created=await send(request,'post','/api/static-sites?type=html&slug='+unique('site'),{data:'<h1>Limit '+i+'</h1>',headers:{'Content-Type':'text/html'}});
    expect(created.status()).toBe(201);
    sites.push(await created.json());
  }
  await limited(await send(request,'post','/api/static-sites?type=html&slug='+unique('site'),{data:'<h1>Extra</h1>',headers:{'Content-Type':'text/html'}}));
  await otherCreates(browser,baseURL,async req=>{
    expect((await send(req,'post',baseURL+'/api/static-sites?type=html&slug='+unique('site'),{data:'<h1>Other</h1>',headers:{'Content-Type':'text/html'}})).status()).toBe(201);
  });
  expect((await send(request,'delete','/api/dashboard-links/host-html/'+sites[0].slug)).status()).toBe(200);
  expect((await send(request,'post','/api/static-sites?type=html&slug='+unique('site'),{data:'<h1>Again</h1>',headers:{'Content-Type':'text/html'}})).status()).toBe(201);
  await page.goto('/tools/host-html.html?lang=en');
  await expectCapped(page,'#new-item');
});

test('QR codes cap at 5, allow updates, isolate accounts and reopen after delete',async({request,browser,baseURL,page})=>{
  const codes=[];
  for(let i=0;i<LIMIT;i++){
    const created=await send(request,'post','/api/qr-codes',{data:qrBody()});
    expect(created.status()).toBe(201);
    codes.push(await created.json());
  }
  await limited(await send(request,'post','/api/qr-codes',{data:qrBody()}));
  const first=codes[0];
  expect((await send(request,'put','/api/qr-codes/'+first.id,{data:{type:first.type,state:first.state,timeZone:first.event.timeZone,revision:first.revision}})).status()).toBe(200);
  await otherCreates(browser,baseURL,async req=>{
    expect((await send(req,'post',baseURL+'/api/qr-codes',{data:qrBody()})).status()).toBe(201);
  });
  const latest=await (await send(request,'get','/api/qr-codes/'+first.id)).json();
  expect((await send(request,'delete','/api/qr-codes/'+first.id,{data:{revision:latest.revision}})).status()).toBe(200);
  expect((await send(request,'post','/api/qr-codes',{data:qrBody()})).status()).toBe(201);
  await page.goto('/tools/qr-codes.html?lang=en');
  await expectCapped(page,'#new-qr');
});

test('vCards cap at 5, allow updates and repeats, isolate accounts and reopen after delete',async({request,browser,baseURL,page})=>{
  const cards=[];
  for(let i=0;i<LIMIT;i++){
    const created=await send(request,'post','/api/vcards',{data:{state:vcard(i)}});
    expect(created.status()).toBe(200);
    cards.push(await created.json());
  }
  await limited(await send(request,'post','/api/vcards',{data:{state:vcard(9)}}));
  const first=cards[0];
  expect((await send(request,'post','/api/vcards',{data:{state:first.state}})).status()).toBe(200);
  await limited(await send(request,'post','/api/vcards',{data:{id:crypto.randomBytes(32).toString('hex')}}));
  const latest=await (await send(request,'get','/api/vcards/'+first.id)).json();
  expect((await send(request,'put','/api/vcards/'+first.id,{data:{state:{...latest.state,name:'Updated contact'},revision:latest.revision}})).status()).toBe(200);
  await otherCreates(browser,baseURL,async req=>{
    expect((await send(req,'post',baseURL+'/api/vcards',{data:{state:vcard(0)}})).status()).toBe(200);
  });
  const after=await (await send(request,'get','/api/vcards/'+first.id)).json();
  expect((await send(request,'delete','/api/vcards/'+first.id,{data:{revision:after.revision}})).status()).toBe(200);
  expect((await send(request,'post','/api/vcards',{data:{state:vcard(8)}})).status()).toBe(200);
  await page.goto('/tools/vcards.html?lang=en');
  await expectCapped(page,'#new-item');
});
