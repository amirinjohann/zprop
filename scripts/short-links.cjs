const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { publicOrigin } = require('../public-origin.js');
const storage = path.resolve(__dirname, '../.short-links');
const fail = (code, status = 400) => Object.assign(new Error(code), { status });
const validSlug = slug => /^[a-zA-Z0-9_-]{2,50}$/.test(slug);
const directory = slug => path.join(storage, crypto.createHash('sha256').update(slug.toLowerCase()).digest('hex'));
const reservedNames = new Set(['api', 'sites', 's', 'assets', 'tools', 'scripts', 'tests', 'node_modules', 'test-results']);
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

async function create(req) {
  let size = 0; const chunks = [];
  if (Number(req.headers['content-length']) > 8192) throw fail('linkSize', 413);
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 8192) throw fail('linkSize', 413);
    chunks.push(chunk);
  }
  let body;
  try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw fail('linkRequest'); }
  if (!body || typeof body.destination !== 'string' || (body.slug !== undefined && typeof body.slug !== 'string')) throw fail('linkRequest');
  const destination = body.destination.trim();
  let parsed;
  try { parsed = new URL(destination); } catch { throw fail('invalidUrl'); }
  if (destination.length > 4096 || /[\x00-\x1f\x7f]/.test(destination) || !['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) throw fail('invalidUrl');
  const slug = body.slug?.trim() || crypto.randomBytes(6).toString('hex');
  if (!validSlug(slug)) throw fail('linkSlug');
  if (await isReserved(slug)) throw fail('linkReserved');
  let destinationPath;
  try { destinationPath = decodeURIComponent(parsed.pathname).toLowerCase().replace(/\/$/, ''); } catch { throw fail('invalidUrl'); }
  const ownOrigins = new Set([publicOrigin, `http://${req.headers.host}`, `https://${req.headers.host}`, process.env.AUTH_ORIGIN]);
  if (ownOrigins.has(parsed.origin) && ['/' + slug.toLowerCase(), '/s/' + slug.toLowerCase()].includes(destinationPath)) throw fail('linkLoop');
  const { target } = await reserve(slug);
  try {
    await fs.writeFile(path.join(target, 'link.json'), JSON.stringify({ slug, destination:parsed.href }), { flag:'wx' });
  } catch (error) {
    // The request only owns this newly reserved hash directory.
    await release(target);
    throw error;
  }
  return { slug, url:`/${slug}`, destination:parsed.href };
}

async function read(slug) {
  if (!validSlug(slug)) throw fail('notFound', 404);
  return JSON.parse(await fs.readFile(path.join(directory(slug), 'link.json'), 'utf8'));
}
module.exports = { create, read, isReserved, reserve, release, directory };
