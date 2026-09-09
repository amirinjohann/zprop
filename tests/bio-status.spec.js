const {test,expect}=require('./auth-fixture');
const {createBio,expandBlocks,addBlock}=require('./bio-helper');
const fs=require('node:fs/promises');
test('each block status survives saving and controls preview, exports and publishing',async({page,request},info)=>{
  const slug=await createBio(page);
  await expandBlocks(page);
  await page.locator('[data-key=name]').fill('Hidden profile name');
  await page.locator('[data-key=bio]').fill('Hidden biography');
  for(const type of ['heading','text','image','divider']){
    await addBlock(page,type);
  }
  await expect(page.getByRole('switch')).toHaveCount(6);
  for(const toggle of await page.getByRole('switch').all()){
    await expect(toggle).toBeChecked();await toggle.click();await expect(toggle).not.toBeChecked();
  }
  await expect(page.locator('.bio-page-blocks > *')).toHaveCount(0);
  await page.locator('[data-key=label]').fill('Saved hidden link');
  await page.locator('[data-key=url]').fill('unfinished url');
  await page.locator('#publish-bio').click();await expect(page.locator('#bio-result')).toBeVisible();
  const html=await (await request.get('/sites/'+slug+'/')).text();
  expect(html).not.toContain('Hidden profile name');expect(html).not.toContain('Hidden biography');
  expect(html).not.toContain('Saved hidden link');expect(html).not.toContain('unfinished url');
  const downloadPromise=page.waitForEvent('download');await page.locator('[data-action=downloadHtml]').click();
  const download=await downloadPromise;expect(await fs.readFile(await download.path(),'utf8')).toBe(html);
  await page.reload();await expect(page.getByRole('switch')).toHaveCount(6);
  for(const toggle of await page.getByRole('switch').all())await expect(toggle).not.toBeChecked();
  await expect(page.locator('[data-key=label]')).toHaveValue('Saved hidden link');
  const profile=page.locator('[data-block-type=profile]');
  await profile.getByRole('switch').focus();await page.keyboard.press('Space');
  await expect(profile.getByRole('switch')).toBeChecked();await expect(profile.getByRole('switch')).toBeFocused();
  await expect(page.locator('.bio-page-profile h3')).toHaveText('Hidden profile name');
  await page.locator('#save-bio-draft').click();await expect(page.locator('#tool-status')).toHaveText('Draft saved.');
  expect(await (await request.get('/sites/'+slug+'/')).text()).toBe(html);
  await page.reload();await expect(profile.getByRole('switch')).toBeChecked();
  await page.locator('[data-language=ms]').click();await expect(profile.getByRole('switch')).toContainText('Aktif');
  await page.locator('[data-language=en]').click();await expect(profile.getByRole('switch')).toContainText('On');
  await page.locator('#publish-bio').click();await expect(page.locator('#bio-result')).toBeVisible();
  expect(await (await request.get('/sites/'+slug+'/')).text()).toContain('Hidden profile name');
  const link=page.locator('[data-block-type=link]');await link.getByRole('switch').click();
  await page.locator('#publish-bio').click();expect(await page.locator('[data-key=url]').evaluate(el=>el.validity.valid)).toBe(false);
  await page.locator('[data-key=url]').fill('https://example.com/');
  await link.locator('[data-block-action=duplicate]').click();
  await expect(page.locator('[data-block-type=link]')).toHaveCount(2);
  await page.locator('[data-block-type=link]').last().getByRole('switch').click();
  await page.locator('[data-block-type=link]').last().locator('.bio-drag-handle').focus();await page.keyboard.press('ArrowUp');
  await expect(page.locator('[data-block-type=link]').first().getByRole('switch')).not.toBeChecked();
  await page.locator('#publish-bio').click();await expect(page.locator('#bio-dirty')).toBeHidden();
  const record=await (await request.get('/api/bio-pages/'+slug)).json();
  expect(record.state.blocks.filter(block=>block.enabled===false)).toHaveLength(5);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('[data-block-type=profile]').scrollIntoViewIfNeeded();
  await page.screenshot({path:'test-results/block-status-'+info.project.name+'.png'});
});
test('block status accepts only booleans and older blocks remain enabled',async({page,request})=>{
  const slug=await createBio(page);
  await expandBlocks(page);
  const record=await (await request.get('/api/bio-pages/'+slug)).json();
  await expect(page.getByRole('switch').first()).toBeChecked();
  record.state.blocks[0].enabled='false';
  expect((await request.put('/api/bio-pages/'+slug,{data:{...record,publish:false}})).status()).toBe(400);
});

