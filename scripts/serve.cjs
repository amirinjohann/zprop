const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
if (process.env.NODE_ENV !== 'test') {
  try {
    for (const line of fs.readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match || process.env[match[1]] !== undefined) continue;
      let value = match[2].replace(/^["']|["']$/g, '');
      if (match[1] === 'SMTP_PASS') value = value.replace(/\s+/g, '');
      process.env[match[1]] = value;
    }
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
}
const sites = require('./static-sites.cjs');
const links = require('./short-links.cjs');
const fileLinks = require('./file-links.cjs');
const auth = require('./auth.cjs');
const admin = require('./admin.cjs');
const bioPages = require('./bio-pages.cjs');
const qrCodes = require('./qr-codes.cjs');
const dashboardStats = require('./dashboard-stats.cjs');
const dashboardEvents = require('./dashboard-events.cjs');
const { publicOrigin } = require('../js/public-origin.js');
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || '127.0.0.1';
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2' };
Object.assign(types, { '.jpeg':'image/jpeg', '.gif':'image/gif', '.webp':'image/webp', '.avif':'image/avif', '.ico':'image/x-icon', '.woff':'font/woff', '.ttf':'font/ttf', '.otf':'font/otf', '.eot':'application/vnd.ms-fontobject', '.xml':'application/xml', '.mp3':'audio/mpeg', '.wav':'audio/wav', '.mp4':'video/mp4', '.webm':'video/webm', '.pdf':'application/pdf', '.txt':'text/plain; charset=utf-8' });
function requireToolAccess(req) {
  const user = auth.session(req)?.user;
  if (!user || user.toolsBlocked) throw Object.assign(new Error(user ? "toolsBlocked" : "signInRequired"), {status:user ? 403 : 401});
}
let creationQueue = Promise.resolve(), pendingCreates = 0;
function lockWrites() {
  const previous = creationQueue;
  let release;
  creationQueue = new Promise(resolve => { release = resolve; });
  return { previous, release };
}
const server = http.createServer(async (req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400).end(); return; }
  // Reject ambiguous Windows paths before routing or resolving a file.
  if (pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').some(part => part === '..' || /[. ]$/.test(part))) { res.writeHead(400).end(); return; }
  if (await auth.handle(req, res, pathname)) return;
  if (await admin.handle(req, res, pathname)) return;
  const adminTarget = target => {
    const lang = new URL(req.url, 'http://localhost').searchParams.get('lang');
    return target + (['en','ms'].includes(lang) ? '?lang=' + lang : '');
  };
  if (/^\/admin(?:-account)?(?:\.html|\/)?$/i.test(pathname) || /^\/(?:js\/)?admin(?:-account)?\.js$/i.test(pathname)) {
    res.setHeader('Cache-Control','no-store');
    res.setHeader('Vary','Cookie');
    const user = auth.session(req)?.user;
    if (!user) { const target = '/admin.html'; res.writeHead(302,{Location:'/sign-in.html?lang='+(new URL(req.url,'http://localhost').searchParams.get('lang') === 'ms' ? 'ms' : 'en')+'&next='+encodeURIComponent(target)}).end(); return; }
    if (user.role !== 'admin') { res.writeHead(403,{'Content-Type':'text/plain; charset=utf-8'}).end('Administrator access required.'); return; }
    if (/^\/(?:js\/)?admin-account\.js$/i.test(pathname)) { res.writeHead(404).end('Not found'); return; }
    if (/^\/admin-account(?:\.html|\/)?$/i.test(pathname) || /^\/admin\/?$/i.test(pathname)) { res.writeHead(302,{Location:adminTarget('/admin.html')}).end(); return; }
  }
  const protectedPage = /^\/tools(?:\/|$)/i.test(pathname) || /^\/js\/(tool-pages|static-site|bio-page|bio-library|qr-page|short-links-page)\.js$/i.test(pathname);
  if (protectedPage || pathname.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Vary', 'Cookie');
    if (!auth.session(req)) {
      if (pathname.startsWith('/api/')) { res.writeHead(401, { 'Content-Type':'application/json' }).end(JSON.stringify({ error:'signInRequired' })); }
      else {
        const language = new URL(req.url, 'http://localhost').searchParams.get('lang') === 'en' ? 'en' : 'ms';
        res.writeHead(302, { Location:`/sign-in.html?lang=${language}&next=${encodeURIComponent(req.url)}` }).end();
      }
      return;
    }
  }
  const actor = auth.session(req)?.user;
  if (actor?.role === 'admin' && (/^\/(?:index\.html|landing\.html|sign-in\.html)?$/i.test(pathname) || /^\/tools\/profile\.html$/i.test(pathname))) {
    res.writeHead(302,{'Cache-Control':'no-store',Vary:'Cookie',Location:adminTarget('/admin.html')}).end(); return;
  }
  if (actor?.toolsBlocked && !/^\/tools\/profile\.html$/i.test(pathname) && (protectedPage || /^\/api\/(bio-pages|qr-codes|short-links|file-links|static-sites|vcards|dashboard-links)(\/|$)/.test(pathname))) {
    if (pathname.startsWith('/api/')) res.writeHead(403,{'Content-Type':'application/json'}).end(JSON.stringify({error:'toolsBlocked'}));
    else res.writeHead(302,{Location:'/access-denied.html'}).end();
    return;
  }
  admin.track(req, res, pathname, actor);
  const actingOwner = actor?.id;
  if (actingOwner && ['POST','PUT','DELETE'].includes(req.method) && /^\/api\/(bio-pages|qr-codes|short-links|file-links|static-sites|vcards|dashboard-links)(\/|$)/.test(pathname)) {
    res.once('finish', () => { if(res.statusCode>=200 && res.statusCode<300) dashboardEvents.changed(actingOwner); });
  }
  if (pathname === '/api/dashboard-events') {
    if(req.method!=='GET') {res.writeHead(405).end();return;}
    dashboardEvents.subscribe(req,res,actingOwner,()=>auth.session(req)?.user.id===actingOwner);
    return;
  }
  const dashboardDelete = pathname.match(/^\/api\/dashboard-links\/([a-z-]+)\/([a-zA-Z0-9_-]+)$/);
  if (dashboardDelete) {
    const json = (status,data)=>res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify(data));
    if(req.method!=='DELETE') {json(405,{error:'method'});return;}
    if(!auth.sameOrigin(req)) {json(403,{error:'origin'});return;}
    const {previous,release}=lockWrites();
    await previous;
    try {
      requireToolAccess(req);json(200,await dashboardStats.remove(req,dashboardDelete[1],dashboardDelete[2],actingOwner));}
    catch(error) {json(error.status||500,{error:error.status?error.message:'server'});}
    finally {release();}
    return;
  }
  const vcardRoute=pathname.match(/^\/api\/vcards(?:\/([a-f0-9]{64}))?$/);
  if (['/api/dashboard-stats','/api/dashboard-links'].includes(pathname)||vcardRoute) {
    const json = (status, data) => res.writeHead(status, { 'Content-Type':'application/json', 'Cache-Control':'no-store' }).end(JSON.stringify(data));
    const tracking = !!vcardRoute;
    if (!tracking && req.method !== 'GET') { json(405, { error:'method' }); return; }
    if (tracking && req.method!=='GET' && !auth.sameOrigin(req)) { json(403, { error:'origin' }); return; }
    // Writes stay serialized. Reads wait for the same snapshot without a busy slot.
    const {previous,release}=lockWrites();
    await previous;
    try {
      requireToolAccess(req);
      const ownerId = auth.session(req).user.id;
      json(200, await (tracking ? require('./vcards.cjs').handle(req,vcardRoute[1],ownerId) : dashboardStats.summary(ownerId, pathname==='/api/dashboard-links')));
    } catch (error) { json(error.status || 500, { error:error.status ? error.message : 'server' }); }
    finally {release();}
    return;
  }
  const bioRoute = pathname.match(/^\/api\/bio-pages(?:\/([a-z0-9-]+))?$/);
  const qrRoute = pathname.match(/^\/api\/qr-codes(?:\/([^/]+))?$/);
  if (bioRoute || qrRoute) {
    const json = (status, data) => res.writeHead(status, {'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify(data));
    if (req.method !== 'GET' && !auth.sameOrigin(req)) {json(403,{error:'origin'});return;}
    const {previous,release}=lockWrites();
    await previous;
    try {
      requireToolAccess(req);json(req.method==='POST'?201:200,await (qrRoute?qrCodes:bioPages).handle(req,(qrRoute||bioRoute)[1],auth.session(req).user.id));}
    catch(error){json(error.status||(qrRoute&&error.key?400:500),{error:error.status?error.message:qrRoute&&error.key?error.key:'server',...(qrRoute&&error.field?{field:error.field}:{})});}
    finally{release();}
    return;
  }
  const shortRoute = pathname.match(/^\/api\/short-links(?:\/([a-zA-Z0-9_-]+))?$/);
  if (shortRoute) {
    const json = (status, data) => res.writeHead(status, { 'Content-Type':'application/json', 'Cache-Control':'no-store' }).end(JSON.stringify(data));
    if (req.method!=='GET' && !auth.sameOrigin(req)) { json(403, { error:'linkOrigin' }); return; }
    const {previous,release}=lockWrites();
    await previous;
    try {
      requireToolAccess(req); json(req.method==='POST'?201:200, await links.handle(req,shortRoute[1],actingOwner)); }
    catch (error) { json(error.status || 500, { error:error.status ? error.message : 'linkServer' }); }
    finally {release();}
    return;
  }
  if (['/api/static-sites','/api/file-links'].includes(pathname) && req.method === 'POST') {
    const json = (status, data) => { res.writeHead(status, { 'Content-Type':'application/json', 'Cache-Control':'no-store' }).end(JSON.stringify(data)); };
    // Uploaded scripts run with an opaque origin and cannot call this endpoint.
    if (!auth.sameOrigin(req)) { json(403, { error:'origin' }); return; }
    if (pendingCreates >= 8) { json(429, { error:'busy' }); return; }
    const { previous, release } = lockWrites();
    pendingCreates++;
    await previous;
    try {
      requireToolAccess(req); json(201, await (pathname === '/api/file-links' ? fileLinks : sites).create(req, new URL(req.url, 'http://localhost'), auth.session(req).user.id)); }
    catch (error) { json(error.status || 500, { error:error.status ? error.message : 'server' }); }
    finally { pendingCreates--; release(); }
    return;
  }
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
  if (pathname.startsWith('/s/')) {
    try {
      const link = await links.read(pathname.slice(3).replace(/\/$/, ''));
      if (link.kind === 'file') { await fileLinks.serve(req, res, link); return; }
      res.writeHead(302, { Location:link.destination, 'Cache-Control':'no-store', 'Referrer-Policy':'no-referrer' }).end();
    } catch { res.writeHead(404, { 'Content-Type':'text/plain; charset=utf-8' }).end('Short link not found'); }
    return;
  }
  if (pathname.startsWith('/sites/')) {
    res.setHeader('Cache-Control','no-store');
    if (/^\/sites\/[a-z0-9-]+$/.test(pathname)) { res.writeHead(302, { Location:pathname+'/' }).end(); return; }
    try {
      const result = await sites.read(pathname.endsWith('/') ? pathname+'index.html' : pathname);
      const sandbox = result.bio ? 'sandbox allow-popups allow-popups-to-escape-sandbox' : 'sandbox allow-scripts';
      const scripts = result.bio ? "'none'" : "'self' 'unsafe-inline'";
      res.writeHead(200, { 'Content-Type':types[result.extension] || 'application/octet-stream', 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'no-referrer', 'Content-Security-Policy':`${sandbox}; default-src 'self' data: blob:; script-src ${scripts}; style-src 'self' 'unsafe-inline'; connect-src 'none'; frame-src ${result.bio ? "'self'" : "'none'"}; ${result.bio ? "img-src 'self' https: data:;" : ''} object-src 'none'; base-uri 'none'; form-action 'none'` });
      res.end(req.method === 'HEAD' ? undefined : result.data);
    } catch { res.writeHead(404).end('Site or file not found'); }
    return;
  }
  const shortMatch = pathname.match(/^\/([a-zA-Z0-9_-]{2,50})\/?$/);
  if (shortMatch) {
    try {
      if (!await links.isReserved(shortMatch[1])) {
        const link = await links.read(shortMatch[1]);
        if (link.kind === 'file') { await fileLinks.serve(req, res, link); return; }
        res.writeHead(302, { Location:link.destination, 'Cache-Control':'no-store', 'Referrer-Policy':'no-referrer' }).end();
        return;
      }
    } catch { res.writeHead(404, { 'Content-Type':'text/plain; charset=utf-8' }).end('Short link not found'); return; }
  }
  const file = path.resolve(root, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname));
  const relative = path.relative(root, file);
  const blockedNames = new Set(['reference.html', 'listings-reference.html']);
  if (relative.startsWith('..') || path.isAbsolute(relative) || relative.split(/[\\/]/).some(p => p.startsWith('.') || ['node_modules', 'scripts', 'tests'].includes(p) || blockedNames.has(p.toLowerCase()))) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end('Not found'); return; }
    const ext = path.extname(file).toLowerCase();
    if (ext === '.html') {
      data = data.toString('utf8').replace(/auth\.js"/g, 'auth.js?v=4"');
      if (protectedPage) {
        // The tool document already passed the session gate. Reuse that result
        // for its first render instead of making the editor wait for another GET.
        const state = JSON.stringify({ user:auth.session(req)?.user || null }).replace(/</g, '\\u003c');
        data = data.replace('</head>', `<script type="application/json" id="zprop-session">${state}</script></head>`);
      }
    }
    const headers = { 'Content-Type': types[ext] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' };
    if (ext === '.js') headers['Cache-Control'] = 'no-store';
    res.writeHead(200, headers);
    res.end(data);
  });
});
auth.initialize().then(() => {
  admin.initialize();
  server.listen(port, host, () => console.log(`ZPROP listening on ${host}:${port}. Public domain: ${publicOrigin}`));
}).catch(error => { console.error('Unable to initialize ZPROP:', error.message); process.exitCode = 1; });
