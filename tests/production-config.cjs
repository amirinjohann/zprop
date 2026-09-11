const assert = require('node:assert/strict');
process.env.NODE_ENV = 'production';
delete process.env.AUTH_ORIGIN;
delete process.env.AUTH_SECURE_COOKIE;
const auth = require('../scripts/auth.cjs');
const { publicOrigin } = require('../js/public-origin.js');
(async () => {
  assert.equal(publicOrigin, 'https://zprop.tech');
  // HTTPS terminates at the proxy; the app's internal connection is HTTP.
  const req = { method:'POST', headers:{ host:'127.0.0.1:4173', origin:publicOrigin }, socket:{} };
  assert.equal(auth.sameOrigin(req), true);
  assert.equal(auth.sameOrigin({ ...req, headers:{ ...req.headers, origin:'https://other.example' } }), false);
  assert.equal(auth.sameOrigin({ ...req, headers:{ ...req.headers, origin:'http://zprop.tech' } }), false);
  const headers = {};
  let status;
  const res = {
    setHeader(key, value) { headers[key] = value; },
    writeHead(code) { status = code; return this; },
    end() {}
  };
  await auth.handle(req, res, '/api/auth/sign-out');
  assert.equal(status, 200);
  assert.match(headers['Set-Cookie'], /; Secure$/);
  assert.match(headers['Set-Cookie'], /HttpOnly; SameSite=Lax/);
  console.log('Production HTTPS origin and cookie checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
