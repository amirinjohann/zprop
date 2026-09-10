const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const storage = path.join(root, '.accounts');
// Exact address formats used by this repository's automated tests and previews.
// This is a one-time archive, not an email-domain filter in signup reporting.
const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const patterns = [
  new RegExp('^(?:test|auth|service-check|admin-test)-' + uuid + '@example\\.com$'),
  /^(?:link|library|nav|stats|links|short)-[0-9a-f]{12}@example\.com$/,
  /^nav-\d{13}@example\.com$/,
  /^managed-[0-9a-f]{10}@example\.com$/,
  /^preview-\d{13}-(?:name|animation|all|gutter|normal)@example\.com$/
];
async function main() {
  const matches = [], retained = [];
  for (const name of await fs.readdir(storage)) {
    if (!/^[a-f0-9]{64}\.json$/.test(name)) continue;
    const account = JSON.parse(await fs.readFile(path.join(storage,name),'utf8'));
    if (account.role !== 'admin' && patterns.some(pattern=>pattern.test(account.email))) matches.push({ filename:name,id:account.id,email:account.email });
    else retained.push({ role:account.role || 'user' });
  }
  console.log(JSON.stringify({ testAccounts:matches.length, regularUsers:retained.filter(user=>user.role!=='admin').length, administrators:retained.filter(user=>user.role==='admin').length }));
  if (!process.argv.includes('--apply') || !matches.length) return;
  const archive = path.resolve(storage, '.test-archive', new Date().toISOString().replace(/[:.]/g,'-') + '-' + crypto.randomUUID());
  if (!archive.startsWith(storage + path.sep)) throw new Error('Archive must remain inside private account storage.');
  await fs.mkdir(archive,{recursive:true});
  await fs.writeFile(path.join(archive,'manifest.json'),JSON.stringify({createdAt:new Date().toISOString(),reason:'Automated test accounts previously mixed with real signups',accounts:matches},null,2),{flag:'wx',mode:0o600});
  for (const item of matches) {
    const source=path.resolve(storage,item.filename),destination=path.resolve(archive,item.filename);
    if (path.dirname(source)!==storage || path.dirname(destination)!==archive) throw new Error('Unexpected account path.');
    await fs.rename(source,destination);
  }
  console.log('Archived '+matches.length+' test accounts in '+path.relative(root,archive)+'. No accounts were deleted.');
}
if (require.main===module) main().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports = { patterns };
