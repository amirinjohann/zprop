const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const {upgrade,socialPlatforms} = require('../js/bio-model.js');
const { assertRoom, created, removed } = require('./item-limit.cjs');
const links = require('./short-links.cjs');
const storage = path.join(require('./data-root.cjs')(), '.generated-sites');
const fail = (code, status = 400) => Object.assign(new Error(code), {status});
function directory(slug) {
  if (typeof slug !== 'string' || !/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(slug)) throw fail('slugError');
  return path.join(storage, slug);
}
async function body(req) {
  if (!(req.headers['content-type'] || '').startsWith('application/json')) throw fail('request',415);
  const chunks=[]; let size=0;
  for await (const chunk of req) { size+=chunk.length; if(size>64*1024*1024) throw fail('imageTotal',413); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw fail('request'); }
}
function model(value, publish, limit=30) {
  if (!value || typeof value !== 'object' || !Array.isArray(value.blocks) || value.blocks.length>(value.schemaVersion===2?limit:30) || value.blocks.some(block=>!block)) throw fail('request');
  const legacy=value.schemaVersion!==2;
  value=upgrade(value);
  if(value.blocks.length>limit+(legacy?1:0))throw fail('request');
  const string = (text,max) => { if(typeof text!=='string' || text.length>max) throw fail('request'); return text; };
  let total=0;
  const image = value => {
    const text=string(value || '',7*1024*1024);
    if(!text)return '';
    if(!/^data:image\/(png|jpeg|webp|gif);base64,[a-zA-Z0-9+/]+={0,2}$/.test(text))throw fail('imageError');
    const data=Buffer.from(text.slice(text.indexOf(',')+1),'base64'); total+=data.length;
    if(data.length>5*1024*1024)throw fail('imageError');
    if(total>20*1024*1024)throw fail('imageTotal');
    return text;
  };
  const result={schemaVersion:2,shape:value.shape,layout:value.layout || 'classic'};
  if(!['classic','poster','event','editorial'].includes(result.layout))throw fail('request');
  for(const key of ['background','ink','accent','buttonText']) {
    if(typeof value[key]!=='string'||!/^#[0-9a-f]{6}$/i.test(value[key]))throw fail('request'); result[key]=value[key];
  }
  if(!['rounded','square','pill'].includes(result.shape))throw fail('request');
  if(value.blocks.filter(block => block.type === 'social').length > 1)throw fail('request');
  const ids=new Set();
  result.blocks=value.blocks.map(block=>{
    if(!block || !Number.isSafeInteger(block.id) || block.id<1 || ids.has(block.id))throw fail('request'); ids.add(block.id);
    const out={id:block.id,type:block.type};
    if(block.enabled!==undefined && typeof block.enabled!=='boolean')throw fail('request');
    if(block.enabled!==undefined)out.enabled=block.enabled;
    const publishBlock=publish&&block.enabled!==false;
    const fields={profile:{name:100,bio:1000},link:{label:100,url:4096},text:{text:3000},heading:{heading:200},image:{alt:200,caption:300},html:{html:20000,title:100},divider:{},social:{platform1:20,url1:4096,platform2:20,url2:4096,platform3:20,url3:4096}};
    if(!Object.hasOwn(fields,block.type))throw fail('request');
    for(const [key,max] of Object.entries(fields[block.type]))out[key]=string(block[key] || '',max);
    if(block.type==='social') {
      for(const slot of [1,2,3]) {
        if(!Object.hasOwn(socialPlatforms,out['platform'+slot]))throw fail('request');
        const link=out['url'+slot];
        if(link && block.enabled!==false) {
          let url;try{url=new URL(link);}catch{throw fail('invalidUrl');}
          if(!['http:','https:'].includes(url.protocol)||!url.hostname||url.username||url.password)throw fail('invalidUrl');
        }
      }
      if(publishBlock&&!out.url1.trim())throw fail('invalidUrl');
    }
    if(block.type==='html') {
      out.height=block.height ?? 240;
      if(!Number.isInteger(out.height)||out.height<80||out.height>1600)throw fail('request');
      if(publishBlock&&!out.html.trim())throw fail('request');
    }
    if(block.type==='image') {out.src=image(block.src); if(publishBlock&&!out.src)throw fail('imageMissing');}
    if(block.type==='profile') {out.photo=image(block.photo);if(publishBlock&&!out.name.trim())throw fail('request');}
    if(publishBlock&&['link','text','heading'].includes(block.type)&&!out[block.type==='link'?'label':block.type].trim())throw fail('request');
    if(out.type==='link'&&out.url&&block.enabled!==false) {
      let url;try{url=new URL(out.url);}catch{throw fail('invalidUrl');}
      if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw fail('invalidUrl');
    } else if(publishBlock&&out.type==='link')throw fail('invalidUrl');
    return out;
  });
  return result;
}
async function owned(slug, ownerId) {
  let record;
  try{record=JSON.parse(await fs.readFile(path.join(directory(slug),'.bio.json'),'utf8'));}
  catch(error){if(error.code==='ENOENT')throw fail('notFound',404);throw error;}
  if(record.ownerId!==ownerId)throw fail('notFound',404);
  return record;
}
const summary=(slug,record)=>({slug,url:`/${slug}/`,name:record.state.schemaVersion===2?(record.state.blocks.find(block=>block.type==='profile')?.name||slug):record.state.name,published:!!record.html,updatedAt:record.updatedAt,revision:record.revision});
const full=(slug,record)=>({...summary(slug,record),state:upgrade(record.state)});
async function write(target,record) {
  const temporary=path.join(target,`.bio-${crypto.randomUUID()}.tmp`);
  try {await fs.writeFile(temporary,JSON.stringify(record),{flag:'wx',mode:0o600});await fs.rename(temporary,path.join(target,'.bio.json'));}
  finally{await fs.rm(temporary,{force:true});}
}
async function handle(req,slug,ownerId) {
  if(req.method==='GET') {
    if(slug)return full(slug,await owned(slug,ownerId));
    await fs.mkdir(storage,{recursive:true}); const pages=[];
    for(const item of await fs.readdir(storage,{withFileTypes:true})) {
      if(!item.isDirectory()||!/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(item.name))continue;
      try{pages.push(summary(item.name,await owned(item.name,ownerId)));}catch(error){if(error.status!==404)throw error;}
    }
    return {pages:pages.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))};
  }
  if(req.method==='POST'&&!slug) {
    const data=await body(req),target=directory(data?.slug),state=model(data.state,false);
    await assertRoom(ownerId,'bio-pages');
    if (await links.isReserved(data.slug) || await links.takenByLink(data.slug)) throw fail('taken', 409);
    const record={ownerId,state,html:null,revision:1,updatedAt:new Date().toISOString()};
    await fs.mkdir(storage,{recursive:true});
    try{await fs.mkdir(target);}catch(error){if(error.code==='EEXIST')throw fail('taken',409);throw error;}
    try{await write(target,record);}catch(error){await fs.rmdir(target);throw error;}
    created(ownerId,'bio-pages');
    return full(data.slug,record);
  }
  if(!slug)throw fail('method',405);
  const record=await owned(slug,ownerId);
  if(req.method==='DELETE') {
    // Ownership was verified and directory() confines this exact named page to storage.
    await fs.rm(directory(slug),{recursive:true}); removed(ownerId,'bio-pages'); return {ok:true};
  }
  if(req.method!=='PUT')throw fail('method',405);
  const data=await body(req),target=directory(slug);
  if(data?.slug!==undefined&&data.slug!==slug)throw fail('slugLocked');
  if(typeof data.publish!=='boolean')throw fail('request');
  if(data.revision!==record.revision)throw fail('conflict',409);
  const state=model(data.state,data.publish===true,Math.max(30,upgrade(record.state).blocks.length));
  if(data.publish && (typeof data.html!=='string'||!data.html.trim()||Buffer.byteLength(data.html)>30*1024*1024))throw fail('request');
  const updated={...record,state,html:data.publish?data.html:record.html,revision:record.revision+1,updatedAt:new Date().toISOString()};
  await write(target,updated);
  return full(slug,updated);
}
module.exports={handle};
