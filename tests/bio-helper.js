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
async function expandBlocks(page) {
  const buttons=page.locator('[data-block-action=minimize][aria-expanded=false]');
  while(await buttons.count())await buttons.first().click();
}
async function addBlock(page,type,values={}) {
  await page.locator('#add-block').click();
  await page.locator('[data-add='+type+']').click();
  const form=page.locator('#block-details-form');
  const defaults={profile:{name:'New profile'},link:{label:'New link',url:'https://example.com/'},text:{text:'New text'},heading:{heading:'New heading'}};
  for(const [key,value] of Object.entries({...defaults[type],...values})) await form.locator('[name='+key+']').fill(value);
  if(type==='image')await form.locator('[type=file]').setInputFiles(require('node:path').resolve('assets/zprop-tech-logo.png'));
  await page.locator('#confirm-add-block').click();
  await expect(page.locator('#block-picker')).toBeHidden();
  const block=page.locator('.bio-block').last();
  await expect(block.locator('.bio-block-fields')).toBeHidden();
  return block;
}
module.exports={createBio,expandBlocks,addBlock};
