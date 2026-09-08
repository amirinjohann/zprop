const fs = require('node:fs/promises');
const { createReadStream } = require('node:fs');
const path = require('node:path');
const { unzipSync } = require('fflate');
const links = require('./short-links.cjs');
const MAX_BYTES = 50 * 1024 * 1024;
const fail = (code, status = 400) => Object.assign(new Error(code), { status });
const types = { '.pdf':'application/pdf', '.xls':'application/vnd.ms-excel', '.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };

async function validate(file, extension) {
  const handle = await fs.open(file, 'r');
  const prefix = Buffer.alloc(8);
  try { await handle.read(prefix, 0, 8, 0); } finally { await handle.close(); }
  if (extension === '.pdf' && prefix.subarray(0,5).toString() === '%PDF-') return;
  if (extension === '.xls' && prefix.equals(Buffer.from('d0cf11e0a1b11ae1', 'hex'))) return;
  if (extension === '.xlsx' && prefix.readUInt32LE(0) === 0x04034b50) {
    const names = new Set(); let count = 0;
    try {
      unzipSync(await fs.readFile(file), { filter(entry) {
        if (++count > 2000) throw fail('fileInvalid');
        names.add(entry.name);
        return false;
      } });
      if (names.has('[Content_Types].xml') && names.has('xl/workbook.xml')) return;
    } catch { throw fail('fileInvalid'); }
  }
  throw fail('fileInvalid');
}

async function create(req, url) {
  const filename = url.searchParams.get('name') || '';
  const extension = path.extname(filename).toLowerCase();
  if (!types[extension]) throw fail('fileType');
  if (filename.length > 180 || /[\x00-\x1f\x7f/\\]/.test(filename)) throw fail('fileName');
  if (Number(req.headers['content-length']) > MAX_BYTES) throw fail('fileSize', 413);
  const claim = await links.reserve(url.searchParams.get('slug') || '');
  const file = path.join(claim.target, 'file.bin');
  let size = 0;
  try {
    const handle = await fs.open(file, 'wx');
    try {
      for await (const chunk of req) {
        size += chunk.length;
        if (size > MAX_BYTES) throw fail('fileSize', 413);
        await handle.writeFile(chunk);
      }
    } finally { await handle.close(); }
    if (!size) throw fail('fileEmpty');
    await validate(file, extension);
    const record = { kind:'file', slug:claim.slug, filename, mime:types[extension], size };
    // Publish only after the complete upload has been checked.
    await fs.writeFile(path.join(claim.target, 'link.json'), JSON.stringify(record), { flag:'wx' });
    return { ...record, url:`/${claim.slug}` };
  } catch (error) { await links.release(claim.target); throw error; }
}

async function serve(req, res, record) {
  const file = path.join(links.directory(record.slug), 'file.bin');
  const stat = await fs.stat(file);
  let start = 0, end = stat.size - 1, status = 200;
  if (req.headers.range) {
    const match = req.headers.range.match(/^bytes=(\d*)-(\d*)$/);
    if (!match || (!match[1] && !match[2])) {
      res.writeHead(416, {'Content-Range':`bytes */${stat.size}`}).end(); return;
    }
    start = match[1] ? Number(match[1]) : Math.max(0, stat.size - Number(match[2]));
    end = match[1] && match[2] ? Math.min(Number(match[2]), end) : end;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= stat.size) {
      res.writeHead(416, {'Content-Range':`bytes */${stat.size}`}).end(); return;
    }
    status = 206;
  }
  const download = new URL(req.url, 'http://localhost').searchParams.get('download') === '1';
  const disposition = record.mime === 'application/pdf' && !download ? 'inline' : 'attachment';
  const fallback = record.filename.replace(/[^a-zA-Z0-9._ -]/g, '_');
  const encoded = encodeURIComponent(record.filename).replace(/['()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  const headers = { 'Content-Type':record.mime, 'Content-Disposition':`${disposition}; filename="${fallback}"; filename*=UTF-8''${encoded}`, 'Content-Length':end-start+1, 'Accept-Ranges':'bytes', 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'no-referrer', 'Cache-Control':'no-store' };
  if (status === 206) headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
  res.writeHead(status, headers);
  if (req.method === 'HEAD') { res.end(); return; }
  const stream = createReadStream(file, { start, end });
  stream.on('error', () => res.destroy());
  res.on('close', () => stream.destroy());
  stream.pipe(res);
}
module.exports = { create, serve };
