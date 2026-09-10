const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const auth = require('./auth.cjs');
const storage = path.resolve(process.env.ZPROP_ADMIN_DIR || path.join(__dirname, '../.admin'));
const logFile = path.join(storage, 'events.ndjson');
const metadataFile = path.join(storage, 'metadata.json');
const tools = { 'bio-pages':'Bio pages', 'short-links':'Short links', 'transfer-files':'File transfers', vcards:'vCards', 'host-html':'HTML hosting', 'qr-codes':'QR codes' };
const aliases = { 'file-links':'transfer-files', 'static-sites':'host-html' };
let startedAt;
function initialize() {
  fs.mkdirSync(storage, { recursive:true });
  try { startedAt = JSON.parse(fs.readFileSync(metadataFile, 'utf8')).startedAt; }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    startedAt = new Date().toISOString();
    fs.writeFileSync(metadataFile, JSON.stringify({ startedAt }), { flag:'wx', mode:0o600 });
  }
}
function append(event) {
  fs.appendFileSync(logFile, JSON.stringify({ id:crypto.randomUUID(), at:new Date().toISOString(), ...event }) + '\n', { mode:0o600 });
}
function track(req, res, pathname, user) {
  const match = pathname.match(/^\/api\/(bio-pages|short-links|file-links|vcards|static-sites|qr-codes)(?:\/[^/]+)?$/);
  if (!user || user.role === 'admin' || !match || !['POST','PUT'].includes(req.method)) return;
  res.once('finish', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      try { append({ type:'usage', userId:user.id, tool:aliases[match[1]] || match[1], action:req.method === 'POST' ? 'create' : 'save' }); }
      catch (error) { console.error('Unable to persist admin usage event:', error.message); }
    }
  });
}
function day(value) { return new Date(new Date(value).getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0,10); }
async function events() {
  try {
    const contents = await fs.promises.readFile(logFile, 'utf8');
    const lines = contents.split('\n');
    return lines.filter(Boolean).map(line => JSON.parse(line));
  } catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}
async function summary(days, toolFilter) {
  const [accounts, history] = await Promise.all([auth.listUsers(), events()]);
  const users = accounts.filter(user => user.role !== 'admin').map(user => ({ ...user, uses:0, allTimeUses:0, lastUsedAt:null }));
  const byId = new Map(users.map(user => [user.id, user]));
  const series = [];
  const today = day(Date.now());
  for (let offset = days - 1; offset >= 0; offset--) {
    const date = new Date(today + 'T00:00:00Z'); date.setUTCDate(date.getUTCDate() - offset);
    series.push({ date:date.toISOString().slice(0,10), uses:0, signups:0, tools:Object.fromEntries(Object.keys(tools).map(key => [key,0])) });
  }
  const byDate = new Map(series.map(point => [point.date, point]));
  const totals = Object.fromEntries(Object.keys(tools).map(key => [key,0]));
  let allTimeUses = 0;
  for (const event of history) {
    if (event.type !== 'usage' || !Object.hasOwn(tools,event.tool)) continue;
    const user = byId.get(event.userId);
    if (!user) continue; // Archived test accounts must not contribute to reports.
    if (user) {
      user.allTimeUses++;
      if (!user.lastUsedAt || event.at > user.lastUsedAt) user.lastUsedAt = event.at;
    }
    allTimeUses++;
    const point = byDate.get(day(event.at));
    if (!point) continue;
    totals[event.tool]++;
    point.tools[event.tool]++;
    if (toolFilter === 'all' || toolFilter === event.tool) {
      point.uses++;
      if (user) user.uses++;
    }
  }
  for (const user of users) {
    const point = byDate.get(day(user.createdAt)); if (point) point.signups++;
  }
  users.sort((a,b) => b.uses-a.uses || a.email.localeCompare(b.email));
  return {
    startedAt, generatedAt:new Date().toISOString(), days, toolFilter, timezone:'Asia/Kuala_Lumpur', series,
    metrics:{ totalUsers:users.length, administrators:accounts.filter(user => user.role === 'admin').length, newUsers:series.reduce((sum,p) => sum+p.signups,0), uses:series.reduce((sum,p) => sum+p.uses,0), allTimeUses, activeUsers:users.filter(user => user.uses > 0).length, toolsBlocked:users.filter(user => user.toolsBlocked).length, signInBlocked:users.filter(user => user.signInBlocked).length },
    tools:Object.entries(tools).map(([id,name]) => ({ id,name,uses:totals[id] })),
    users,
    audit:history.filter(event => event.type === 'access').slice(-50).reverse().map(event => ({ ...event, email:byId.get(event.userId)?.email || event.userId }))
  };
}
const json = (res,status,data) => res.writeHead(status, { 'Content-Type':'application/json', 'Cache-Control':'no-store', Vary:'Cookie' }).end(JSON.stringify(data));
async function handle(req,res,pathname) {
  if (!/^\/api\/admin(?:\/|$)/i.test(pathname)) return false;
  const actor = auth.session(req)?.user;
  if (!actor) { json(res,401,{error:'signInRequired'}); return true; }
  if (actor.role !== 'admin') { json(res,403,{error:'adminRequired'}); return true; }
  try {
    if (pathname === '/api/admin/overview' && req.method === 'GET') {
      const query = new URL(req.url,'http://localhost').searchParams;
      const days = Number(query.get('days') || 30), tool = query.get('tool') || 'all';
      if (![7,30,90].includes(days) || (tool !== 'all' && !Object.hasOwn(tools,tool))) { json(res,400,{error:'request'}); return true; }
      json(res,200,await summary(days,tool)); return true;
    }
    const target = pathname.match(/^\/api\/admin\/users\/([a-f0-9-]{36})\/access$/);
    if (target && req.method === 'PATCH') {
      if (!auth.sameOrigin(req)) { json(res,403,{error:'origin'}); return true; }
      const changes = await auth.body(req);
      const keys = Object.keys(changes);
      if (!keys.length || keys.some(key => !['toolsBlocked','signInBlocked'].includes(key) || typeof changes[key] !== 'boolean')) { json(res,400,{error:'request'}); return true; }
      const user = await auth.setAccess(target[1], changes);
      append({ type:'access', actor:actor.email, userId:user.id, changes });
      json(res,200,{user}); return true;
    }
    json(res,404,{error:'notFound'});
  } catch (error) { json(res,error.status || 500,{error:error.status ? error.message : 'server'}); }
  return true;
}
module.exports = { initialize, track, handle };
