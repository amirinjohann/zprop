const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { promisify } = require('node:util');
const { publicOrigin } = require('../public-origin.js');
const production = process.env.NODE_ENV === 'production';
const scrypt = promisify(crypto.scrypt);
const storage = path.resolve(__dirname, '../.accounts');
const sessions = new Map();
const attempts = new Map();
const lifetime = 7 * 24 * 60 * 60 * 1000;
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const fail = (error, status = 400) => Object.assign(new Error(error), { status });
const json = (res, status, body) => res.writeHead(status, { 'Content-Type':'application/json', 'Cache-Control':'no-store' }).end(JSON.stringify(body));
const token = req => (req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith('zprop_session='))?.slice(14);
function session(req) {
  const key = hash(token(req) || '');
  const record = sessions.get(key);
  if (!record || record.expires <= Date.now()) { sessions.delete(key); return null; }
  return record;
}
function sameOrigin(req) {
  return !req.headers.origin || req.headers.origin === (process.env.AUTH_ORIGIN || (production ? publicOrigin : `${req.socket.encrypted ? 'https' : 'http'}://${req.headers.host}`));
}
function cookie(req, value, maxAge) {
  return `zprop_session=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${req.socket.encrypted || production || process.env.AUTH_SECURE_COOKIE === '1' ? '; Secure' : ''}`;
}
async function body(req) {
  if (!(req.headers['content-type'] || '').startsWith('application/json')) throw fail('request', 415);
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 4096) throw fail('request', 413);
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw fail('request'); }
}
async function handle(req, res, pathname) {
  if (!pathname.startsWith('/api/auth/')) return false;
  try {
    if (pathname === '/api/auth/session' && req.method === 'GET') {
      json(res, 200, { user:session(req)?.user || null }); return true;
    }
    if (req.method !== 'POST') throw fail('method', 405);
    if (!sameOrigin(req) || req.headers['sec-fetch-site'] === 'cross-site') throw fail('origin', 403);
    if (pathname === '/api/auth/sign-out') {
      sessions.delete(hash(token(req) || ''));
      res.setHeader('Set-Cookie', cookie(req, '', 0)); json(res, 200, { ok:true }); return true;
    }
    if (!['/api/auth/sign-in', '/api/auth/register'].includes(pathname)) throw fail('notFound', 404);
    const ip = req.socket.remoteAddress;
    let limit = attempts.get(ip);
    if (!limit || limit.until <= Date.now()) { limit = { count:0, until:Date.now() + 15 * 60 * 1000 }; attempts.set(ip, limit); }
    if (++limit.count > 30) throw fail('rateLimit', 429);
    const data = await body(req);
    const email = typeof data?.email === 'string' ? data.email.trim().toLowerCase() : '';
    const password = data?.password;
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== 'string' || !password.length || password.length > 128) throw fail('request');
    const filename = path.join(storage, hash(email) + '.json');
    let account;
    if (pathname.endsWith('/register')) {
      if (password.length < 12) throw fail('password');
      const salt = crypto.randomBytes(16).toString('hex');
      account = { id:crypto.randomUUID(), email, salt, passwordHash:(await scrypt(password, salt, 64)).toString('hex') };
      await fs.mkdir(storage, { recursive:true });
      try { await fs.writeFile(filename, JSON.stringify(account), { flag:'wx', mode:0o600 }); }
      catch (error) { if (error.code === 'EEXIST') throw fail('exists', 409); throw error; }
    } else {
      try { account = JSON.parse(await fs.readFile(filename, 'utf8')); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      const derived = await scrypt(password, account?.salt || 'zprop-unknown-account', 64);
      if (!account || !crypto.timingSafeEqual(derived, Buffer.from(account.passwordHash, 'hex'))) throw fail('credentials', 401);
    }
    // Successful authentication rotates any existing session; only token hashes are retained.
    limit.count--;
    sessions.delete(hash(token(req) || ''));
    const value = crypto.randomBytes(32).toString('hex');
    const user = { id:account.id, email:account.email };
    sessions.set(hash(value), { user, expires:Date.now() + lifetime });
    res.setHeader('Set-Cookie', cookie(req, value, lifetime / 1000));
    json(res, pathname.endsWith('/register') ? 201 : 200, { user });
  } catch (error) { json(res, error.status || 500, { error:error.status ? error.message : 'server' }); }
  return true;
}
setInterval(() => {
  for (const [key, value] of sessions) if (value.expires <= Date.now()) sessions.delete(key);
  for (const [key, value] of attempts) if (value.until <= Date.now()) attempts.delete(key);
}, 60000).unref();
module.exports = { handle, session, sameOrigin };
