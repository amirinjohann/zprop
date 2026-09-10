const { defineConfig } = require('@playwright/test');
const path = require('node:path');
const crypto = require('node:crypto');
const testStorage = path.join(__dirname,'.test-data',crypto.randomUUID());
const baseURL = 'http://127.0.0.1:4174';
module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  use: { baseURL, channel: 'msedge', headless: true },
  // Never reuse the live app: every run has its own accounts and admin history.
  webServer: {
    command: 'node scripts/serve.cjs', url:baseURL, reuseExistingServer:false,
    env: { PORT:'4174', HOST:'127.0.0.1', NODE_ENV:'test', AUTH_ORIGIN:'', AUTH_SECURE_COOKIE:'0',
      ZPROP_ACCOUNTS_DIR:path.join(testStorage,'accounts'), ZPROP_ADMIN_DIR:path.join(testStorage,'admin') }
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } }
  ]
});
