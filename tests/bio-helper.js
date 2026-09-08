const { expect } = require('@playwright/test');
const crypto = require('node:crypto');
async function createBio(page, slug='bio-'+crypto.randomBytes(6).toString('hex')) {
  await page.goto('/tools/bio-pages.html?lang=en');
  await page.locator('#new-bio').click();
  await page.locator('[name=newSlug]').fill(slug);
  await page.locator('#confirm-create-bio').click();
  await expect(page.locator('#tool-form')).toBeVisible();
  return slug;
}
module.exports={createBio};
