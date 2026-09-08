const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const sites = require('./static-sites.cjs');
const links = require('./short-links.cjs');
const fileLinks = require('./file-links.cjs');
const auth = require('./auth.cjs');
const bioPages = require('./bio-pages.cjs');
const qrCodes = require('./qr-codes.cjs');
const { publicOrigin } = require('../public-origin.js');
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || '127.0.0.1';
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2' };
Object.assign(types, { '.jpeg':'image/jpeg', '.gif':'image/gif', '.webp':'image/webp', '.avif':'image/avif', '.ico':'image/x-icon', '.woff':'font/woff', '.ttf':'font/ttf', '.otf':'font/otf', '.eot':'application/vnd.ms-fontobject', '.xml':'application/xml', '.mp3':'audio/mpeg', '.wav':'audio/wav', '.mp4':'video/mp4', '.webm':'video/webm', '.pdf':'application/pdf', '.txt':'text/plain; charset=utf-8' });
let creationQueue = Promise.resolve(), pendingCreates = 0;
http.createServer(async (req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400).end(); return; }
  // Reject ambiguous Windows paths before routing or resolving a file.
  if (pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').some(part => part === '..' || /[. ]$/.test(part))) { res.writeHead(400).end(); return; }
  if (await auth.handle(req, res, pathname)) return;
  const protectedPage = /^\/tools(?:\/|$)/i.test(pathname) || /^\/(tool-pages|static-site|bio-page|bio-library|qr-page)\.js$/i.test(pathname);
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
  const bioRoute = pathname.match(/^\/api\/bio-pages(?:\/([a-z0-9-]+))?$/);
  const qrRoute = pathname.match(/^\/api\/qr-codes(?:\/([^/]+))?$/);
  if (bioRoute || qrRoute) {
    const json = (status, data) => res.writeHead(status, {'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify(data));
    if (req.method !== 'GET' && !auth.sameOrigin(req)) {json(403,{error:'origin'});return;}
    if (pendingCreates >= 8) {json(429,{error:'busy'});return;}
    const previous=creationQueue; let release;
    creationQueue=new Promise(resolve=>{release=resolve;});pendingCreates++;
    await previous;
    try{json(req.method==='POST'?201:200,await (qrRoute?qrCodes:bioPages).handle(req,(qrRoute||bioRoute)[1],auth.session(req).user.id));}
    catch(error){json(error.status||(qrRoute&&error.key?400:500),{error:error.status?error.message:qrRoute&&error.key?error.key:'server',...(qrRoute&&error.field?{field:error.field}:{})});}
    finally{pendingCreates--;release();}
    return;
  }
  if (pathname === '/api/short-links' && req.method === 'POST') {
    const json = (status, data) => res.writeHead(status, { 'Content-Type':'application/json', 'Cache-Control':'no-store' }).end(JSON.stringify(data));
    if (!auth.sameOrigin(req)) { json(403, { error:'linkOrigin' }); return; }
    try { json(201, await links.create(req)); }
    catch (error) { json(error.status || 500, { error:error.status ? error.message : 'linkServer' }); }
    return;
  }
  if (['/api/static-sites','/api/file-links'].includes(pathname) && req.method === 'POST') {
    const json = (status, data) => { res.writeHead(status, { 'Content-Type':'application/json', 'Cache-Control':'no-store' }).end(JSON.stringify(data)); };
    // Uploaded scripts run with an opaque origin and cannot call this endpoint.
    if (!auth.sameOrigin(req)) { json(403, { error:'origin' }); return; }
    if (pendingCreates >= 8) { json(429, { error:'busy' }); return; }
    const previous = creationQueue;
    let release;
    creationQueue = new Promise(resolve => { release = resolve; });
    pendingCreates++;
    await previous;
    try { json(201, await (pathname === '/api/file-links' ? fileLinks : sites).create(req, new URL(req.url, 'http://localhost'))); }
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
      res.writeHead(200, { 'Content-Type':types[result.extension] || 'application/octet-stream', 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'no-referrer', 'Content-Security-Policy':`${sandbox}; default-src 'self' data: blob:; script-src ${scripts}; style-src 'self' 'unsafe-inline'; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'` });
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
  if (relative.startsWith('..') || path.isAbsolute(relative) || relative.split(/[\\/]/).some(p => p.startsWith('.') || ['node_modules', 'scripts', 'tests'].includes(p))) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end('Not found'); return; }
    if (protectedPage && path.extname(file).toLowerCase() === '.html') {
      // The tool document already passed the session gate. Reuse that result
      // for its first render instead of making the editor wait for another GET.
      const state = JSON.stringify({ user:auth.session(req)?.user || null }).replace(/</g, '\\u003c');
      data = data.toString('utf8').replace('</head>', `<script type="application/json" id="zprop-session">${state}</script></head>`);
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
    res.end(data);
  });
}).listen(port, host, () => console.log(`ZPROP listening on ${host}:${port}. Public domain: ${publicOrigin}`));
