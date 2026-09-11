const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { promisify } = require('node:util');
const { publicOrigin } = require('../public-origin.js');
const production = process.env.NODE_ENV === 'production';
const scrypt = promisify(crypto.scrypt);
const storage = path.resolve(process.env.ZPROP_ACCOUNTS_DIR || path.join(__dirname, '../.accounts'));
const adminEmail = (process.env.ADMIN_EMAIL || 'zpropadmin@gmail.com').trim().toLowerCase();
const sessions = new Map();
const attempts = new Map();
let accountQueue = Promise.resolve();
const lifetime = 7 * 24 * 60 * 60 * 1000;
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const fail = (error, status = 400) => Object.assign(new Error(error), { status });
const json = (res, status, body) => res.writeHead(status, { 'Content-Type':'application/json', 'Cache-Control':'no-store' }).end(JSON.stringify(body));
const token = req => (req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith('zprop_session='))?.slice(14);
const publicUser = account => ({ id:account.id, email:account.email, role:account.role === 'admin' ? 'admin' : 'user', toolsBlocked:!!account.toolsBlocked, avatarUrl:account.avatar ? '/api/auth/avatar?v='+hash(account.avatar).slice(0,16) : null });
const mailEnabled = () => !!(process.env.ZPROP_MAIL_DIR || (process.env.SMTP_HOST && process.env.SMTP_FROM));
const journal = path.join(storage, '.profile-change.json');
async function atomicWrite(filename, value) {
  const temporary = filename + '.' + crypto.randomUUID() + '.tmp';
  try { await fs.writeFile(temporary, JSON.stringify(value), { flag:'wx', mode:0o600 }); await fs.rename(temporary, filename); }
  finally { await fs.rm(temporary, { force:true }); }
}
async function recoverProfileChange() {
  let change;
  try { change = JSON.parse(await fs.readFile(journal, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return; throw error; }
  if (![change.from,change.to].every(name => /^[a-f0-9]{64}\.json$/.test(name)) || change.to !== hash(change.account.email)+'.json') throw Error('Invalid profile change journal.');
  await atomicWrite(path.join(storage,change.to),change.account);
  if (change.from !== change.to) await fs.rm(path.join(storage,change.from), { force:true });
  for (const [key,record] of sessions) if (record.user.id === change.account.id) sessions.delete(key);
  await fs.rm(journal);
}
function queued(operation) {
  const next = accountQueue.then(async () => { await recoverProfileChange(); return operation(); });
  accountQueue = next.catch(() => {});
  return next;
}
function issueSession(req,res,account) {
  sessions.delete(hash(token(req) || ''));
  const value = crypto.randomBytes(32).toString('hex'), user = publicUser(account);
  sessions.set(hash(value), { user, expires:Date.now() + lifetime });
  res.setHeader('Set-Cookie',cookie(req,value,lifetime / 1000));
  return user;
}
function session(req) {
  const key = hash(token(req) || '');
  const record = sessions.get(key);
  if (!record || record.expires <= Date.now()) { sessions.delete(key); return null; }
  return record;
}
function sameOrigin(req) {
  return (!req.headers.origin || req.headers.origin === (process.env.AUTH_ORIGIN || (production ? publicOrigin : (req.socket.encrypted ? 'https' : 'http') + '://' + req.headers.host))) && req.headers['sec-fetch-site'] !== 'cross-site';
}
function cookie(req, value, maxAge) {
  return 'zprop_session=' + value + '; HttpOnly; SameSite=Lax; Path=/; Max-Age=' + maxAge + (req.socket.encrypted || production || process.env.AUTH_SECURE_COOKIE === '1' ? '; Secure' : '');
}
async function body(req, maxSize = 4096) {
  if (!(req.headers['content-type'] || '').startsWith('application/json')) throw fail('request', 415);
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxSize) throw fail('request', 413);
    chunks.push(chunk);
  }
  try { const data = JSON.parse(Buffer.concat(chunks).toString('utf8')); if (!data || typeof data !== 'object' || Array.isArray(data)) throw Error(); return data; }
  catch { throw fail('request'); }
}
async function initialize() {
  await fs.mkdir(storage, { recursive:true });
  await recoverProfileChange();
  const filename = path.join(storage, hash(adminEmail) + '.json');
  try {
    const existing = JSON.parse(await fs.readFile(filename, 'utf8'));
    if (existing.role !== 'admin') throw new Error('The configured admin email belongs to a regular account. Choose a different ADMIN_EMAIL.');
    return;
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  // An administrator can change their login email without recreating the seed account.
  if ((await readUsers()).some(user => user.role === 'admin')) return;
  const salt = crypto.randomBytes(16).toString('hex');
  const password = process.env.ADMIN_PASSWORD || 'admin1234567';
  if (password.length < 12 || password.length > 128) throw new Error('ADMIN_PASSWORD must contain 12-128 characters.');
  const account = { id:crypto.randomUUID(), email:adminEmail, salt, passwordHash:(await scrypt(password, salt, 64)).toString('hex'), role:'admin', createdAt:new Date().toISOString() };
  await fs.writeFile(filename, JSON.stringify(account), { flag:'wx', mode:0o600 });
}
async function readUsers() {
  const users = [];
  for (const name of await fs.readdir(storage)) {
    if (!/^[a-f0-9]{64}\.json$/.test(name)) continue;
    const filename = path.join(storage, name);
    const account = JSON.parse(await fs.readFile(filename, 'utf8'));
    users.push({ ...publicUser(account), signInBlocked:!!account.signInBlocked, createdAt:account.createdAt || (await fs.stat(filename)).birthtime.toISOString(), signupDateEstimated:!!account.signupDateEstimated || !account.createdAt });
  }
  return users;
}
const listUsers = () => queued(readUsers);
function setAccess(id, changes) {
  return queued(async () => {
    const user = (await readUsers()).find(user => user.id === id);
    if (!user) throw fail('notFound', 404);
    if (user.role === 'admin') throw fail('adminProtected', 403);
    const filename = path.join(storage, hash(user.email) + '.json');
    const account = JSON.parse(await fs.readFile(filename, 'utf8'));
    if (!account.createdAt) { account.createdAt=user.createdAt; account.signupDateEstimated=true; }
    Object.assign(account, changes);
    const temporary = filename + '.' + crypto.randomUUID() + '.tmp';
    try { await fs.writeFile(temporary, JSON.stringify(account), { flag:'wx', mode:0o600 }); await fs.rename(temporary, filename); }
    finally { await fs.rm(temporary, { force:true }); }
    for (const [key, record] of sessions) if (record.user.id === id) {
      if (account.signInBlocked) sessions.delete(key);
      else record.user = publicUser(account);
    }
    return { ...user, ...changes };
  });
}
function validateAvatar(value) {
  if (value === null) return null;
  if (typeof value !== 'string' || value.length > 700000 || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) throw fail('image');
  const bytes = Buffer.from(value.slice(22),'base64');
  if (bytes.length < 57 || bytes.length > 512*1024 || !bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'))) throw fail('image');
  let offset=8, width, height, channels, ended=false; const compressed=[];
  while (offset+12 <= bytes.length) {
    const size=bytes.readUInt32BE(offset), type=bytes.toString('ascii',offset+4,offset+8), end=offset+12+size;
    if(end>bytes.length)throw fail('image');
    if(offset===8 && type!=='IHDR')throw fail('image');
    if(type==='IHDR') {
      if(offset!==8 || size!==13)throw fail('image');
      width=bytes.readUInt32BE(offset+8);height=bytes.readUInt32BE(offset+12);
      channels=bytes[offset+17]===6?4:bytes[offset+17]===2?3:0;
      if(!width||!height||width>512||height>512||!channels||bytes[offset+16]!==8||bytes[offset+18]||bytes[offset+19]||bytes[offset+20])throw fail('image');
    } else if(type==='IDAT') compressed.push(bytes.subarray(offset+8,offset+8+size));
    else if(type==='IEND') { if(size || end!==bytes.length)throw fail('image'); ended=true; }
    else if(!/^[a-z]/.test(type))throw fail('image');
    offset=end;
  }
  if(!ended||!compressed.length)throw fail('image');
  try {
    const stride=width*channels+1, raw=require('node:zlib').inflateSync(Buffer.concat(compressed),{maxOutputLength:stride*height});
    if(raw.length!==stride*height)throw Error();
    for(let row=0;row<height;row++)if(raw[row*stride]>4)throw Error();
  } catch {throw fail('image');}
  return value;
}
function codeValid(record, value, email) {
  return !!record?.hash && record.email === email && record.hash === hash(value) && Date.parse(record.expires) > Date.now();
}
async function sendMail(message) {
  try {
    if (process.env.ZPROP_MAIL_DIR) {
      await fs.mkdir(process.env.ZPROP_MAIL_DIR, { recursive:true });
      await fs.writeFile(path.join(process.env.ZPROP_MAIL_DIR, Date.now() + '-' + crypto.randomBytes(4).toString('hex') + '.json'), JSON.stringify({ to:message.to, subject:message.subject, text:message.text }), { flag:'wx' });
      return true;
    }
    if (!process.env.SMTP_HOST || !process.env.SMTP_FROM) return false;
    const port = Number(process.env.SMTP_PORT || 587);
    await require('nodemailer').createTransport({
      host:process.env.SMTP_HOST, port, secure:port === 465,
      auth:process.env.SMTP_USER ? { user:process.env.SMTP_USER, pass:process.env.SMTP_PASS } : undefined
    }).sendMail({ from:process.env.SMTP_FROM, to:message.to, subject:message.subject, text:message.text });
    return true;
  } catch { return false; }
}
async function sendEmailChangeCode(email) {
  if (!mailEnabled()) throw fail('mailDisabled', 503);
  const value = String(crypto.randomInt(100000, 1000000));
  const sent = await sendMail({
    to:email,
    subject:'Your ZPROP email code / Kod e-mel ZPROP anda',
    text:'Your ZPROP email change code is ' + value + '.\nKod tukar e-mel ZPROP anda ialah ' + value + '.\n\nThis code expires in 15 minutes. / Kod ini tamat dalam 15 minit.'
  });
  if (!sent) throw fail('mailDisabled', 503);
  return { hash:hash(value), email, expires:new Date(Date.now() + 15 * 60 * 1000).toISOString() };
}
async function profileRequest(req,res,pathname) {
  if (!session(req)) throw fail('signInRequired',401);
  if (session(req).user.role==='admin' && req.method!=='GET') throw fail('adminAccountLocked',403);
  if (req.method==='GET') return queued(async () => {
    const actor=session(req)?.user;if(!actor)throw fail('signInRequired',401);
    const account=JSON.parse(await fs.readFile(path.join(storage,hash(actor.email)+'.json'),'utf8'));
    if(pathname==='/api/auth/avatar') {
      if(!account.avatar)throw fail('notFound',404);
      res.writeHead(200,{'Content-Type':'image/png','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}).end(Buffer.from(account.avatar.slice(22),'base64'));
    } else json(res,200,{user:publicUser(account)});
  });
  if(pathname!=='/api/auth/profile' || req.method!=='PATCH')throw fail('method',405);
  if(!sameOrigin(req))throw fail('origin',403);
  const data=await body(req,710000), keys=Object.keys(data);
  if(!keys.length || keys.some(key=>!['email','newPassword','currentPassword','avatar','code'].includes(key)))throw fail('request');
  if(!keys.some(key=>['email','newPassword','avatar'].includes(key)))throw fail('request');
  await queued(async () => {
    const actor=session(req)?.user;if(!actor)throw fail('signInRequired',401);
    if(actor.role==='admin')throw fail('adminAccountLocked',403);
    const filename=path.join(storage,hash(actor.email)+'.json');
    const account=JSON.parse(await fs.readFile(filename,'utf8'));
    const sensitive=Object.hasOwn(data,'email')||Object.hasOwn(data,'newPassword');
    if(sensitive) {
      const key='profile:'+actor.id;let limit=attempts.get(key);
      if(!limit||limit.until<=Date.now()){limit={count:0,until:Date.now()+15*60*1000};attempts.set(key,limit);}
      if(++limit.count>10)throw fail('rateLimit',429);
      if(typeof data.currentPassword!=='string'||!data.currentPassword.length||data.currentPassword.length>128)throw fail('currentPassword');
      const derived=await scrypt(data.currentPassword,account.salt,64);
      if(!crypto.timingSafeEqual(derived,Buffer.from(account.passwordHash,'hex')))throw fail('currentPassword');
      limit.count--;
    }
    if(Object.hasOwn(data,'email')) {
      const email=typeof data.email==='string'?data.email.trim().toLowerCase():'';
      if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw fail('email');
      if(email!==account.email) {
        if(email===adminEmail && account.role!=='admin')throw fail('exists',409);
        try {await fs.access(path.join(storage,hash(email)+'.json'));throw fail('exists',409);}
        catch(error){if(error.code!=='ENOENT')throw error;}
        const code=typeof data.code==='string'?data.code.replace(/\s/g,''):'';
        if(!code) {
          account.emailChange=await sendEmailChangeCode(email);
          account.updatedAt=new Date().toISOString();
          await atomicWrite(filename,account);
          json(res,202,{pending:true});
          return;
        }
        if(!codeValid(account.emailChange,code,email))throw fail('code');
        delete account.emailChange;
        account.email=email;
      } else delete account.emailChange;
    }
    if(Object.hasOwn(data,'newPassword')) {
      if(typeof data.newPassword!=='string'||data.newPassword.length<12||data.newPassword.length>128)throw fail('password');
      account.salt=crypto.randomBytes(16).toString('hex');account.passwordHash=(await scrypt(data.newPassword,account.salt,64)).toString('hex');
    }
    if(Object.hasOwn(data,'avatar'))account.avatar=validateAvatar(data.avatar);
    if(!account.createdAt){account.createdAt=(await fs.stat(filename)).birthtime.toISOString();account.signupDateEstimated=true;}
    account.updatedAt=new Date().toISOString();
    if(sensitive) {
      await atomicWrite(journal,{from:path.basename(filename),to:hash(account.email)+'.json',account});
      await recoverProfileChange();
      json(res,200,{user:issueSession(req,res,account)});
    } else {
      await atomicWrite(filename,account);
      for(const record of sessions.values())if(record.user.id===account.id)record.user=publicUser(account);
      json(res,200,{user:publicUser(account)});
    }
  });
}
async function handle(req, res, pathname) {
  if (!pathname.startsWith('/api/auth/')) return false;
  try {
    if (['/api/auth/profile','/api/auth/avatar'].includes(pathname)) { await profileRequest(req,res,pathname); return true; }
    if (pathname === '/api/auth/session' && req.method === 'GET') {
      json(res, 200, { user:session(req)?.user || null }); return true;
    }
    if (req.method !== 'POST') throw fail('method', 405);
    if (!sameOrigin(req)) throw fail('origin', 403);
    if (pathname === '/api/auth/sign-out') {
      sessions.delete(hash(token(req) || ''));
      res.setHeader('Set-Cookie', cookie(req, '', 0)); json(res, 200, { ok:true }); return true;
    }
    if (!['/api/auth/sign-in', '/api/auth/register'].includes(pathname)) throw fail('notFound', 404);
    if (pathname.endsWith('/register') && session(req)?.user.role === 'admin') throw fail('userAccountRequired',403);
    const ip = req.socket.remoteAddress;
    let limit = attempts.get(ip);
    if (!limit || limit.until <= Date.now()) { limit = { count:0, until:Date.now() + 15 * 60 * 1000 }; attempts.set(ip, limit); }
    if (++limit.count > 30) throw fail('rateLimit', 429);
    const data = await body(req);
    const email = typeof data?.email === 'string' ? data.email.trim().toLowerCase() : '';
    const password = data?.password;
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== 'string' || !password.length || password.length > 128) throw fail('request');
    await queued(async () => {
    const actor = session(req)?.user;
    if (actor?.role === 'admin' && (pathname.endsWith('/register') || email !== actor.email)) throw fail('userAccountRequired',403);
    const filename = path.join(storage, hash(email) + '.json');
    let account;
    if (pathname.endsWith('/register')) {
      if (email === adminEmail) throw fail('exists', 409);
      if (password.length < 12) throw fail('password');
      const salt = crypto.randomBytes(16).toString('hex');
      account = { id:crypto.randomUUID(), email, salt, passwordHash:(await scrypt(password, salt, 64)).toString('hex'), role:'user', createdAt:new Date().toISOString() };
      await fs.mkdir(storage, { recursive:true });
      try { await fs.writeFile(filename, JSON.stringify(account), { flag:'wx', mode:0o600 }); }
      catch (error) { if (error.code === 'EEXIST') throw fail('exists', 409); throw error; }
    } else {
      try { account = JSON.parse(await fs.readFile(filename, 'utf8')); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      const derived = await scrypt(password, account?.salt || 'zprop-unknown-account', 64);
      if (!account || !crypto.timingSafeEqual(derived, Buffer.from(account.passwordHash, 'hex'))) throw fail('credentials', 401);
    }
    // Serialize session creation with access changes to prevent a sign-in/block race.
      account = JSON.parse(await fs.readFile(filename, 'utf8'));
      if (account.signInBlocked) throw fail('signInBlocked', 403);
      limit.count--;
      const user = issueSession(req,res,account);
      json(res, pathname.endsWith('/register') ? 201 : 200, { user });
    });
  } catch (error) { json(res, error.status || 500, { error:error.status ? error.message : 'server' }); }
  return true;
}
setInterval(() => {
  for (const [key, value] of sessions) if (value.expires <= Date.now()) sessions.delete(key);
  for (const [key, value] of attempts) if (value.until <= Date.now()) attempts.delete(key);
}, 60000).unref();
module.exports = { handle, session, sameOrigin, initialize, listUsers, setAccess, body };
