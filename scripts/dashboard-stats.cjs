const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

async function entries(directory) {
  try { return await fs.readdir(directory, { withFileTypes:true }); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}
async function record(filename) {
  try { return JSON.parse(await fs.readFile(filename, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

async function summary(ownerId, includeLinks = false) {
  const counts = { 'bio-pages':0, 'short-links':0, 'transfer-files':0, vcards:0, 'host-html':0, 'qr-codes':0 };
  const links = [];
  const add = (category, item) => { counts[category]++; if (includeLinks) links.push({ category, ...item }); };
  const modified = async filename => { try { return (await fs.stat(filename)).mtime.toISOString(); } catch(error) { if(error.code==='ENOENT') return null; throw error; } };
  await Promise.all([
    (async () => {
      const directory = path.join(root, '.generated-sites');
      for (const entry of await entries(directory)) {
        if (!entry.isDirectory()) continue;
        const target = path.join(directory, entry.name);
        const bio = await record(path.join(target, '.bio.json'));
        if (bio) {
          if (bio.ownerId === ownerId) add('bio-pages', { id:entry.name, name:bio.state.schemaVersion===2?(bio.state.blocks.find(block=>block.type==='profile')?.name || entry.name):(bio.state.name || entry.name), url:bio.html?`/sites/${entry.name}/`:null, status:bio.html?'published':'draft', updatedAt:bio.updatedAt, revision:bio.revision, manageUrl:`/tools/bio-pages.html?page=${entry.name}` });
          continue;
        }
        const site = await record(path.join(target, '.site.json'));
        if (site?.ownerId !== ownerId) continue;
        try { await fs.access(path.join(target, '.ready')); add('host-html', { id:entry.name, name:entry.name, url:`/sites/${entry.name}/`, status:'published', updatedAt:includeLinks?await modified(path.join(target,'.ready')):null }); }
        catch (error) { if (error.code !== 'ENOENT') throw error; }
      }
    })(),
    (async () => {
      const directory = path.join(root, '.short-links');
      for (const entry of await entries(directory)) {
        if (!entry.isDirectory()) continue;
        const link = await record(path.join(directory, entry.name, 'link.json'));
        if (link?.ownerId === ownerId) add(link.kind === 'file' ? 'transfer-files' : 'short-links', { id:link.slug, name:link.filename || link.slug, url:`/${link.slug}`, status:'published', updatedAt:link.updatedAt || (includeLinks?await modified(path.join(directory,entry.name,'link.json')):null), ...(link.kind!=='file'?{revision:link.revision||1,manageUrl:`/tools/short-links.html?link=${encodeURIComponent(link.slug)}`}:{}) });
      }
    })(),
    (async () => {
      for (const entry of await entries(path.join(root, '.qr-codes', ownerId))) {
        if (!entry.isFile() || !/^[0-9a-f-]{36}\.json$/.test(entry.name)) continue;
        const qr = await record(path.join(root,'.qr-codes',ownerId,entry.name));
        if (!qr) continue;
        add('qr-codes', { id:qr.id, name:qr.state.name, url:/^https?:\/\//i.test(qr.payload)?qr.payload:null, status:'saved', updatedAt:qr.updatedAt, revision:qr.revision, manageUrl:`/tools/qr-codes.html?qr=${qr.id}` });
      }
      for (const entry of await entries(path.join(root, '.created-vcards', ownerId))) {
        if (!entry.isFile() || !/^[a-f0-9]{64}\.json$/.test(entry.name)) continue;
        add('vcards', { id:entry.name.slice(0,-5), name:'vCard · '+entry.name.slice(0,8), url:null, status:'generated', updatedAt:includeLinks?await modified(path.join(root,'.created-vcards',ownerId,entry.name)):null });
      }
    })()
  ]);
  links.sort((a,b)=>(b.updatedAt || '').localeCompare(a.updatedAt || '') || a.category.localeCompare(b.category) || a.id.localeCompare(b.id));
  return { counts, total:Object.values(counts).reduce((sum, count) => sum + count, 0), ...(includeLinks?{links}:{}) };
}

// Only a content fingerprint is recorded; contact fields stay in the browser.
// Repeated downloads of the same card count as one item for this account.
async function trackVcard(req, ownerId) {
  let body = '', size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 256) throw Object.assign(new Error('size'), { status:413 });
    body += chunk.toString('utf8');
  }
  let id;
  try { id = JSON.parse(body).id; } catch {}
  if (typeof id !== 'string' || !/^[a-f0-9]{64}$/.test(id)) throw Object.assign(new Error('request'), { status:400 });
  const directory = path.join(root, '.created-vcards', ownerId);
  await fs.mkdir(directory, { recursive:true });
  try { await fs.writeFile(path.join(directory, id + '.json'), '{}', { flag:'wx', mode:0o600 }); }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
  return { ok:true };
}
async function remove(req, category, id, ownerId) {
  const fail = () => Object.assign(new Error('notFound'), { status:404 });
  if (category === 'bio-pages') return require('./bio-pages.cjs').handle(req,id,ownerId);
  if (category === 'qr-codes') return require('./qr-codes.cjs').handle(req,id,ownerId);
  if (category === 'short-links') return require('./short-links.cjs').handle(req,id,ownerId);
  if (['short-links','transfer-files'].includes(category)) {
    const registry = require('./short-links.cjs');
    let item; try { item = await registry.read(id); } catch(error) { if(error.code==='ENOENT') throw fail(); throw error; }
    if (item.ownerId !== ownerId || (item.kind==='file') !== (category==='transfer-files')) throw fail();
    await registry.release(registry.directory(id));
  } else if (category === 'host-html') {
    if (!/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(id)) throw fail();
    const storage = path.join(root,'.generated-sites'), target = path.join(storage,id);
    if (path.dirname(target)!==storage || (await record(path.join(target,'.site.json')))?.ownerId!==ownerId || await record(path.join(target,'.bio.json'))) throw fail();
    await fs.rm(target,{recursive:true});
  } else if (category === 'vcards') {
    if (!/^[a-f0-9]{64}$/.test(id)) throw fail();
    try { await fs.unlink(path.join(root,'.created-vcards',ownerId,id+'.json')); }
    catch(error) { if(error.code==='ENOENT') throw fail(); throw error; }
  } else throw fail();
  return { ok:true };
}
module.exports = { summary, trackVcard, remove };
