const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { publicOrigin } = require('../js/public-origin.js');
const { assertRoom, created, removed } = require('./item-limit.cjs');
const storage = path.join(require('./data-root.cjs')(), '.short-links');
const fail = (code, status = 400) => Object.assign(new Error(code), { status });
const validSlug = slug => /^[a-zA-Z0-9_-]{2,50}$/.test(slug);
const directory = slug => path.join(storage, crypto.createHash('sha256').update(slug.toLowerCase()).digest('hex'));
const reservedNames = new Set(['admin', 'api', 'sites', 's', 'assets', 'css', 'js', 'tools', 'scripts', 'tests', 'node_modules', 'test-results']);
async function isReserved(slug) {
  if (reservedNames.has(slug.toLowerCase())) return true;
  try { await fs.access(path.resolve(__dirname, '..', slug)); return true; }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

// Both file links and redirects claim names in the same shared namespace.
async function reserve(requested) {
  if (requested !== undefined && typeof requested !== 'string') throw fail('linkSlug');
  const slug = requested?.trim() || crypto.randomBytes(6).toString('hex');
  if (!validSlug(slug)) throw fail('linkSlug');
  if (await isReserved(slug)) throw fail('linkReserved');
  await fs.mkdir(storage, { recursive:true });
  const target = directory(slug);
  try { await fs.mkdir(target); } catch (error) { if (error.code === 'EEXIST') throw fail('linkTaken', 409); throw error; }
  return { slug, target };
}
async function release(target) {
  if (path.dirname(target) === storage) await fs.rm(target, { recursive:true, force:true });
}

async function body(req) {
  let size = 0; const chunks = [];
  if (Number(req.headers['content-length']) > 8192) throw fail('linkSize', 413);
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 8192) throw fail('linkSize', 413);
    chunks.push(chunk);
  }
  let body;
  try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw fail('linkRequest'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw fail('linkRequest');
  return body;
}
async function validate(req, input, fallbackSlug) {
  if (typeof input.destination !== 'string' || (input.slug !== undefined && typeof input.slug !== 'string')) throw fail('linkRequest');
  const destination = input.destination.trim();
  let parsed;
  try { parsed = new URL(destination); } catch { throw fail('invalidUrl'); }
  if (destination.length > 4096 || /[\x00-\x1f\x7f]/.test(destination) || !['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) throw fail('invalidUrl');
  const slug = input.slug?.trim() || fallbackSlug || crypto.randomBytes(6).toString('hex');
  if (!validSlug(slug)) throw fail('linkSlug');
  if (await isReserved(slug)) throw fail('linkReserved');
  let destinationPath;
  try { destinationPath = decodeURIComponent(parsed.pathname).toLowerCase().replace(/\/$/, ''); } catch { throw fail('invalidUrl'); }
  const ownOrigins = new Set([publicOrigin, `http://${req.headers.host}`, `https://${req.headers.host}`, process.env.AUTH_ORIGIN]);
  if (ownOrigins.has(parsed.origin) && ['/' + slug.toLowerCase(), '/s/' + slug.toLowerCase()].includes(destinationPath)) throw fail('linkLoop');
  return { slug, destination:parsed.href };
}
const view = record => ({ slug:record.slug, url:`/${record.slug}`, destination:record.destination, revision:record.revision || 1, createdAt:record.createdAt || null, updatedAt:record.updatedAt || null });
async function create(req, ownerId) {
  const { slug, destination } = await validate(req, await body(req));
  const { target } = await reserve(slug);
  const now = new Date().toISOString();
  const record = { slug, destination, ownerId, revision:1, createdAt:now, updatedAt:now };
  try {
    await assertRoom(ownerId, 'short-links');
    await fs.writeFile(path.join(target, 'link.json'), JSON.stringify(record), { flag:'wx' });
    created(ownerId, 'short-links');
  } catch (error) {
    // The request only owns this newly reserved hash directory.
    await release(target);
    throw error;
  }
  return view(record);
}

async function read(slug) {
  if (!validSlug(slug)) throw fail('notFound', 404);
  return JSON.parse(await fs.readFile(path.join(directory(slug), 'link.json'), 'utf8'));
}
async function owned(slug, ownerId) {
  let record;
  try { record = await read(slug); } catch(error) { if(error.code==='ENOENT') throw fail('notFound',404); throw error; }
  if(record.ownerId!==ownerId || record.kind==='file') throw fail('notFound',404);
  return record;
}
async function handle(req, slug, ownerId) {
  if(req.method==='GET') {
    if(slug) return view(await owned(slug,ownerId));
    let entries;try {entries=await fs.readdir(storage,{withFileTypes:true});} catch(error) {if(error.code==='ENOENT') return {links:[]};throw error;}
    const links=[];
    for(const entry of entries) {
      if(!entry.isDirectory())continue;
      let record;try {record=JSON.parse(await fs.readFile(path.join(storage,entry.name,'link.json'),'utf8'));} catch(error) {if(error.code==='ENOENT')continue;throw error;}
      if(record.ownerId===ownerId && record.kind!=='file') links.push(view(record));
    }
    return {links:links.sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||'')||a.slug.localeCompare(b.slug))};
  }
  if(req.method==='POST'&&!slug)return create(req,ownerId);
  if(!slug || !['PUT','DELETE'].includes(req.method))throw fail('method',405);
  const previous=await owned(slug,ownerId), input=await body(req);
  if(input.revision!==(previous.revision||1))throw fail('conflict',409);
  if(req.method==='DELETE') {await release(directory(slug)); removed(ownerId,'short-links'); return {ok:true};}
  const next=await validate(req,input,previous.slug);
  const record={...previous,...next,revision:(previous.revision||1)+1,updatedAt:new Date().toISOString()};
  const source=directory(previous.slug),renamed=source!==directory(next.slug);
  const target=renamed?(await reserve(next.slug)).target:source;
  const temporary=path.join(target,`link-${crypto.randomUUID()}.tmp`);
  try {
    await fs.writeFile(temporary,JSON.stringify(record),{flag:'wx',mode:0o600});
    await fs.rename(temporary,path.join(target,'link.json'));
    if(renamed) await release(source);
  } catch(error) {
    if(renamed) await release(target);
    throw error;
  } finally {await fs.rm(temporary,{force:true});}
  return view(record);
}
module.exports = { create, read, handle, isReserved, reserve, release, directory };
