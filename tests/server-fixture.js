const base = require('@playwright/test');
const test = base.test.extend({
  isolatedLocalPreview: [async ({ context, baseURL }, use) => {
    // file:// previews intentionally navigate to localhost:4173. Keep that
    // browser behavior while forwarding requests to the isolated test server.
    const target = new URL(baseURL);
    if (target.port === '4173') throw new Error('Authentication tests must not use the live app server.');
    await context.route(/^http:\/\/(?:localhost|127\.0\.0\.1):4173\//, async route => {
      const original = new URL(route.request().url());
      const headers = { ...route.request().headers() };
      if (headers.origin === original.origin) headers.origin = target.origin;
      delete headers.host;
      const response = await route.fetch({ url:target.origin+original.pathname+original.search, headers, maxRedirects:0 });
      await route.fulfill({ response });
    });
    try { await use(); }
    finally { await context.unrouteAll({ behavior:'ignoreErrors' }); }
  }, { auto:true }]
});
module.exports = { test, expect:base.expect };
