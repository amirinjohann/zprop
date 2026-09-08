const base = require('@playwright/test');
const crypto = require('node:crypto');
const test = base.test.extend({
  authenticated: [async ({ context, request, baseURL }, use) => {
    // Resolve public publishing links against this test server, without DNS
    // changes or sending uploads and test traffic to the real domain.
    await context.route('https://zprop.tech/**', async route => {
      const url = new URL(route.request().url());
      const response = await route.fetch({ url:baseURL + url.pathname + url.search, maxRedirects:0 });
      await route.fulfill({ response });
    });
    const response = await request.post('/api/auth/register', { data:{ email:`test-${crypto.randomUUID()}@example.com`, password:'Test-password-123!' } });
    base.expect(response.status()).toBe(201);
    await context.addCookies((await request.storageState()).cookies);
    await use();
  }, { auto:true }]
});
module.exports = { test, expect:base.expect };
