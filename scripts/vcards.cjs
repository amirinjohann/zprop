const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const model=require('../vcard-model.js');
const { assertRoom, created, removed } = require('./item-limit.cjs');
const root=path.join(require('./data-root.cjs')(),'.created-vcards');
const fail=(key,status=400)=>Object.assign(new Error(key),{status});
function filename(owner,id){if(!/^[a-f0-9]{64}$/.test(id||''))throw fail('notFound',404);return path.join(root,owner,id+'.json');}
async function read(owner,id){try{return JSON.parse(await fs.readFile(filename(owner,id),'utf8'));}catch(error){if(error.code==='ENOENT')throw fail('notFound',404);throw error;}}
async function body(req){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>8192)throw fail('size',413);chunks.push(chunk);}try{const value=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!value||typeof value!=='object'||Array.isArray(value))throw Error();return value;}catch{throw fail('request');}}
async function write(owner,id,data){const file=filename(owner,id),temp=file+'.'+crypto.randomUUID()+'.tmp';await fs.mkdir(path.dirname(file),{recursive:true});try{await fs.writeFile(temp,JSON.stringify(data),{flag:'wx',mode:0o600});await fs.rename(temp,file);}finally{await fs.rm(temp,{force:true});}}
async function handle(req,id,owner){
  if(req.method==='GET'&&id){const saved=await read(owner,id);if(!saved.state)throw fail('legacy',409);return {id,...saved};}
  if(req.method==='DELETE'&&id){const saved=await read(owner,id);if(saved.state){const input=await body(req);if(input.revision!==saved.revision)throw fail('conflict',409);}await fs.unlink(filename(owner,id));removed(owner,'vcards');return {ok:true};}
  if(!['POST','PUT'].includes(req.method)||req.method==='PUT'&&!id||req.method==='POST'&&id)throw fail('method',405);
  const input=await body(req);
  // Keep existing fingerprint-only tracking requests compatible.
  if(req.method==='POST'&&input.state===undefined){
    if(typeof input.id!=='string'||!/^[a-f0-9]{64}$/.test(input.id))throw fail('request');
    const file=filename(owner,input.id);await fs.mkdir(path.dirname(file),{recursive:true});
    try{await fs.access(file);}catch(error){
      if(error.code!=='ENOENT')throw error;
      await assertRoom(owner,'vcards');
    }
    try{await fs.writeFile(file,'{}',{flag:'wx',mode:0o600});created(owner,'vcards');}catch(error){if(error.code!=='EEXIST')throw error;}
    return {ok:true};
  }
  let state;try{state=model.validate(input.state);}catch{throw fail('request');}
  const fingerprint=crypto.createHash('sha256').update(model.format(state)).digest('hex');
  let previous=null;
  if(req.method==='PUT'){
    previous=await read(owner,id);if(!previous.state)throw fail('legacy',409);
    if(input.revision!==previous.revision)throw fail('conflict',409);
  }else{
    id=fingerprint;
    try{previous=await read(owner,id);}catch(error){if(error.status!==404)throw error;}
    // A repeated download must not overwrite a card subsequently edited in place.
    if(previous?.state&&model.format(previous.state)!==model.format(state)){
      previous=null;id=crypto.randomBytes(32).toString('hex');
      for(const entry of await fs.readdir(path.join(root,owner))){
        if(!/^[a-f0-9]{64}\.json$/.test(entry))continue;
        const candidate=await read(owner,entry.slice(0,-5));
        if(candidate.state&&model.format(candidate.state)===model.format(state)){id=entry.slice(0,-5);previous=candidate;break;}
      }
    }
  }
  if(!previous)await assertRoom(owner,'vcards');
  const saved={state,revision:(previous?.revision||0)+1,updatedAt:new Date().toISOString()};
  await write(owner,id,saved);
  if(!previous)created(owner,'vcards');
  return {id,...saved};
}
module.exports={handle};
