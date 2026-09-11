const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const model = require('../js/qr-model.js');
const { assertRoom, created, removed } = require('./item-limit.cjs');
const qrcode = require('qrcode-generator');
const storage = path.join(require('./data-root.cjs')(), '.qr-codes');
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const fail = (code, status = 400) => Object.assign(new Error(code), {status});
const fields = {
  url:['url'], whatsapp:['phone','message'], location:['latitude','longitude'],
  event:['eventTitle','start','end','eventLocation','description'],
  vcard:['firstName','lastName','company','jobTitle','contactPhone','email','website','address']
};
function directory(owner) {
  if (!uuid.test(owner)) throw fail('notFound',404);
  return path.join(storage,owner);
}
function filename(owner,id) {
  if (typeof id !== 'string' || !uuid.test(id)) throw fail('notFound',404);
  return path.join(directory(owner),id+'.json');
}
async function body(req) {
  if (!(req.headers['content-type'] || '').startsWith('application/json')) throw fail('request',415);
  const chunks=[]; let size=0;
  for await (const chunk of req) { size+=chunk.length; if(size>16384) throw fail('request',413); chunks.push(chunk); }
  try { const result=JSON.parse(Buffer.concat(chunks).toString('utf8')); if(!result || typeof result !== 'object' || Array.isArray(result)) throw new Error(); return result; }
  catch {throw fail('request');}
}
function state(type,value) {
  if (typeof type !== 'string' || !Object.hasOwn(fields,type) || !value || typeof value !== 'object' || Array.isArray(value)) throw fail('request');
  const result={};
  for (const key of ['name','foreground','background','size',...fields[type]]) {
    const text=value[key] ?? '';
    if (typeof text !== 'string' || text.length>(['message','description'].includes(key)?600:300)) throw fail('request');
    result[key]=text;
  }
  result.name=result.name.trim() || ({url:'URL',whatsapp:'WhatsApp',location:'Location',event:'Event',vcard:'Vcard'}[type]+' QR');
  if (!['512','1024','2048'].includes(result.size)) throw fail('request');
  model.colors(result.foreground,result.background);
  return result;
}
async function read(owner,id) {
  try {return JSON.parse(await fs.readFile(filename(owner,id),'utf8'));}
  catch(error) {if(error.code==='ENOENT') throw fail('notFound',404); throw error;}
}
const summary = record => ({id:record.id,type:record.type,name:record.state.name,updatedAt:record.updatedAt,revision:record.revision});
async function write(owner,record) {
  const target=filename(owner,record.id), temporary=target+'.'+crypto.randomUUID()+'.tmp';
  await fs.mkdir(directory(owner),{recursive:true});
  try {await fs.writeFile(temporary,JSON.stringify(record),{flag:'wx',mode:0o600});await fs.rename(temporary,target);}
  finally {await fs.rm(temporary,{force:true});}
}
async function handle(req,id,owner) {
  if (req.method==='GET') {
    if (id) return read(owner,id);
    let entries; try {entries=await fs.readdir(directory(owner));} catch(error) {if(error.code==='ENOENT') return {codes:[]};throw error;}
    const codes=[];
    for(const entry of entries) if(entry.endsWith('.json') && uuid.test(entry.slice(0,-5))) codes.push(summary(await read(owner,entry.slice(0,-5))));
    return {codes:codes.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))};
  }
  if (!['POST','PUT','DELETE'].includes(req.method) || (req.method==='POST' ? !!id : !id)) throw fail('method',405);
  const previous=id?await read(owner,id):null;
  const input=await body(req);
  if (previous && input.revision!==previous.revision) throw fail('conflict',409);
  if (req.method==='DELETE') {await fs.unlink(filename(owner,id));removed(owner,'qr-codes');return {ok:true};}
  const nextState=state(input.type,input.state), now=new Date().toISOString();
  const recordId=id || crypto.randomUUID();
  const event=previous?.event || {uid:recordId+'@zprop.tech',created:now,timeZone:input.timeZone};
  if (typeof event.timeZone!=='string' || event.timeZone.length>100) throw fail('request');
  try {new Intl.DateTimeFormat('en',{timeZone:event.timeZone}).format();} catch {throw fail('request');}
  const payload=model.payload(input.type,nextState,{...event,created:new Date(event.created)});
  try {qrcode.stringToBytes=text=>Array.from(Buffer.from(text,'utf8'));const qr=qrcode(0,'M');qr.addData(payload,'Byte');qr.make();} catch {throw fail('tooLong');}
  if (!previous) await assertRoom(owner,'qr-codes');
  const record={id:recordId,type:input.type,state:nextState,event,payload,revision:(previous?.revision || 0)+1,createdAt:previous?.createdAt || now,updatedAt:now};
  await write(owner,record);
  if (!previous) created(owner,'qr-codes');
  return record;
}
module.exports={handle};
