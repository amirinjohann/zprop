const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { Worker, isMainThread, parentPort, workerData } = require('node:worker_threads');
const { unzipSync } = require('fflate');

const MAX_BYTES = 256 * 1024 * 1024;
const extensions = new Set('css js html jpg jpeg png ico svg gif webp ttf woff woff2 eot otf xml json mp3 wav mp4 webm pdf txt avif'.split(' '));
const storage = path.join(require('./data-root.cjs')(), '.generated-sites');
const fail = (code, status = 400) => Object.assign(new Error(code), { status });
function safeName(name) {
  return name.length < 240 && !name.includes('\\') && name.split('/').every(part =>
    part && !part.startsWith('.') && !/[<>:"|?*\x00-\x1f]/.test(part) && !/[. ]$/.test(part) && !/^(con|prn|aux|nul|com\d|lpt\d)(\.|$)/i.test(part));
}
function extract(data, type) {
  if (type === 'html') {
    if (!Buffer.from(data).toString('utf8').trim()) throw fail('empty');
    return { 'index.html': data };
  }
  let total = 0, count = 0;
  const names = new Set();
  // Inspect the full directory before allocating any decompressed files.
  unzipSync(data, { filter(file) {
    if (++count > 2000) throw fail('tooMany');
    if (file.name.startsWith('__MACOSX/') || file.name.split('/').pop() === '.DS_Store') return false;
    const name = file.name.replace(/\/$/, '');
    if (!safeName(name)) throw fail('unsafePath');
    if (file.name.endsWith('/')) return false;
    if (!extensions.has(path.extname(name).slice(1).toLowerCase())) throw fail('fileType');
    if (names.has(name.toLowerCase())) throw fail('duplicate');
    names.add(name.toLowerCase());
    total += file.originalSize;
    if (!Number.isSafeInteger(total) || total > MAX_BYTES) throw fail('size', 413);
    return false;
  } });
  const files = unzipSync(data, { filter: file => names.has(file.name.toLowerCase()) });
  let prefix = '';
  if (!files['index.html']) {
    const entries = Object.keys(files).filter(name => name.endsWith('/index.html'));
    const roots = entries.filter(name => Object.keys(files).every(key => key.startsWith(name.slice(0, -10))));
    if (roots.length !== 1) throw fail('missingIndex');
    prefix = roots[0].slice(0, -10);
  }
  return Object.fromEntries(Object.entries(files).map(([name, bytes]) => [name.slice(prefix.length), bytes]));
}
if (!isMainThread) {
  try { parentPort.postMessage({ files: extract(new Uint8Array(workerData.data), workerData.type) }); }
  catch (error) { parentPort.postMessage({ error: error.status ? error.message : 'invalidZip', status: error.status || 400 }); }
} else {
  const { assertRoom, created } = require('./item-limit.cjs');
  const links = require('./short-links.cjs');
  const publicUrl = slug => `/${slug}/`;
  async function exists(slug) {
    if (!/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(slug)) return false;
    try { await fs.access(path.join(storage, slug, '.ready')); return true; }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    try { await fs.access(path.join(storage, slug, '.bio.json')); return true; }
    catch (error) { if (error.code === 'ENOENT') return false; throw error; }
  }
  async function claim(slug) {
    if (await links.isReserved(slug) || await links.takenByLink(slug)) throw fail('taken', 409);
  }
  async function create(req, url, ownerId) {
    const type = url.searchParams.get('type');
    if (!['html', 'zip'].includes(type)) throw fail('fileType');
    const requested = url.searchParams.get('slug') || '';
    if (requested && !/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(requested)) throw fail('slug');
    if (Number(req.headers['content-length']) > MAX_BYTES) throw fail('size', 413);
    await assertRoom(ownerId, 'host-html');
    const chunks = []; let length = 0;
    for await (const chunk of req) {
      length += chunk.length;
      if (length > MAX_BYTES) throw fail('size', 413);
      chunks.push(chunk);
    }
    if (!length) throw fail('empty');
    const files = await new Promise((resolve, reject) => {
      const worker = new Worker(__filename, { workerData: { data: Buffer.concat(chunks), type }, resourceLimits: { maxOldGenerationSizeMb: 512 } });
      const timer = setTimeout(() => { worker.terminate(); reject(fail('processing')); }, 30000);
      worker.once('message', result => { clearTimeout(timer); result.error ? reject(fail(result.error, result.status)) : resolve(result.files); });
      worker.once('error', () => { clearTimeout(timer); reject(fail('processing')); });
      worker.once('exit', code => { if (code) { clearTimeout(timer); reject(fail('processing')); } });
    });
    await fs.mkdir(storage, { recursive: true });
    const slug = requested || crypto.randomBytes(8).toString('hex');
    await claim(slug);
    const directory = path.join(storage, slug);
    try { await fs.mkdir(directory); } catch (error) { if (error.code === 'EEXIST') throw fail('taken', 409); throw error; }
    try {
      for (const [name, bytes] of Object.entries(files)) {
        const target = path.join(directory, name);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, bytes, { flag: 'wx' });
      }
      await fs.writeFile(path.join(directory, '.site.json'), JSON.stringify({ ownerId }), { flag:'wx' });
      await fs.writeFile(path.join(directory, '.ready'), 'ready');
    } catch (error) {
      // Only this request's newly reserved directory can be removed.
      if (path.dirname(directory) === storage) await fs.rm(directory, { recursive: true, force: true });
      throw error;
    }
    created(ownerId, 'host-html');
    return { slug, url: publicUrl(slug), files: Object.keys(files).length };
  }
  async function read(pathname) {
    const parts = pathname.replace(/^\/sites(?=\/)/, '').replace(/^\//, '').split('/');
    const slug = parts.shift();
    if (!/^[a-z0-9-]{3,50}$/.test(slug)) throw fail('notFound', 404);
    const name = parts.join('/') || 'index.html';
    if (!safeName(name)) throw fail('notFound', 404);
    let bio;
    try { bio = JSON.parse(await fs.readFile(path.join(storage, slug, '.bio.json'), 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (bio) {
      if (name !== 'index.html' || !bio.html) throw fail('notFound', 404);
      return { data:bio.html, extension:'.html', bio:true };
    }
    await fs.access(path.join(storage, slug, '.ready'));
    return { data: await fs.readFile(path.join(storage, slug, name)), extension: path.extname(name).toLowerCase() };
  }
  module.exports = { create, read, exists, publicUrl };
}
