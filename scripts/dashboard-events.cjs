// Account-scoped invalidations: browsers fetch one fresh snapshot for cards and list.
const subscribers = new Map();
function subscribe(req, res, ownerId, authorized) {
  res.writeHead(200, { 'Content-Type':'text/event-stream', 'Cache-Control':'no-store', Connection:'keep-alive', 'X-Accel-Buffering':'no' });
  res.write('retry: 2000\nevent: change\ndata: {}\n\n');
  const send = () => {
    if (!authorized()) { res.end(); return; }
    if (!res.write('event: change\ndata: {}\n\n')) res.end();
  };
  let clients = subscribers.get(ownerId);
  if (!clients) subscribers.set(ownerId, clients = new Set());
  clients.add(send);
  const heartbeat = setInterval(() => {
    if (!authorized()) { res.end(); return; }
    if (!res.write(': keep-alive\n\n')) res.end();
  }, 15000);
  res.on('close', () => { clearInterval(heartbeat); clients.delete(send); if(!clients.size) subscribers.delete(ownerId); });
}
function changed(ownerId) { for (const send of subscribers.get(ownerId) || []) send(); }
module.exports = { subscribe, changed };
