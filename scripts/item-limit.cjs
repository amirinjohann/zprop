const { countFor } = require('./dashboard-stats.cjs');
const LIMIT = 5;
const cache = new Map();
const fail = () => Object.assign(new Error('itemLimit'), { status:403 });
const key = (ownerId, category) => ownerId + '\0' + category;

async function assertRoom(ownerId, category) {
  if (require('./auth.cjs').isAdminOwner(ownerId)) return;
  const k = key(ownerId, category);
  let n = cache.get(k);
  if (n === undefined) {
    n = await countFor(ownerId, category, LIMIT);
    cache.set(k, n);
  }
  if (n >= LIMIT) throw fail();
}

function created(ownerId, category) {
  const k = key(ownerId, category);
  const n = cache.get(k);
  if (n !== undefined) cache.set(k, n + 1);
}

function removed(ownerId, category) {
  const k = key(ownerId, category);
  const n = cache.get(k);
  if (n === undefined) return;
  // stopAt may have capped the cached value at LIMIT for owners who already
  // have more than 5 items; recount before allowing another create.
  if (n >= LIMIT) cache.delete(k);
  else cache.set(k, Math.max(0, n - 1));
}

module.exports = { LIMIT, assertRoom, created, removed };
