const {test,expect}=require('./auth-fixture');
const {createBio}=require('./bio-helper');
test('minimizing preserves content, preview and publishing while keeping controls usable',async({page,request},info)=>{
  const slug=await createBio(page);
  const profile=page.locator('[data-block-type=profile]');
  await profile.locator('[data-key=name]').fill('Minimized profile');
  await page.locator('#save-bio-draft').click();await expect(page.locator('#tool-status')).toHaveText('Draft saved.');
  const collapse=profile.locator('[data-block-action=minimize]');
  await collapse.focus();await page.keyboard.press('Space');
  await expect(collapse).toHaveAttribute('aria-expanded','false');
  await expect(collapse).toBeFocused();
  await expect(profile.locator('.bio-block-fields')).toBeHidden();
  await expect(profile.getByRole('switch')).toBeChecked();
  await expect(page.locator('.bio-page-profile h3')).toHaveText('Minimized profile');
  await expect(page.locator('#bio-dirty')).toBeHidden();
  await profile.locator('.bio-drag-handle').focus();await page.keyboard.press('ArrowDown');
  await expect(profile.locator('.bio-block-fields')).toBeHidden();
  await expect(page.locator('.bio-block').last()).toHaveAttribute('data-block-type','profile');
  await page.locator('[data-language=ms]').click();await expect(collapse).toHaveAttribute('aria-label','Kembangkan blok');
  await page.locator('[data-language=en]').click();await expect(collapse).toHaveAttribute('aria-label','Expand block');
  await profile.getByRole('switch').click();await expect(page.locator('.bio-page-profile')).toHaveCount(0);
  await expect(profile.locator('.bio-block-fields')).toBeHidden();
  await profile.getByRole('switch').click();
  await page.locator('#publish-bio').click();await expect(page.locator('#bio-result')).toBeVisible();
  expect(await (await request.get('/sites/'+slug+'/')).text()).toContain('Minimized profile');
  await page.locator('[data-block-type=link] [data-block-action=minimize]').click();
  await page.locator('#bio-blocks').scrollIntoViewIfNeeded();
  await page.screenshot({path:'test-results/minimized-blocks-'+info.project.name+'.png'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await collapse.click();await expect(profile.locator('[data-key=name]')).toHaveValue('Minimized profile');
  await expect(profile.locator('[data-key=name]')).toBeVisible();
  await page.reload();await expect(profile.locator('[data-key=name]')).toHaveValue('Minimized profile');
});
test('publishing expands a minimized block with invalid content or a missing image',async({page})=>{
  await createBio(page);
  const link=page.locator('[data-block-type=link]');
  await link.locator('[data-key=url]').fill('invalid');
  await link.locator('[data-block-action=minimize]').click();
  await page.locator('#publish-bio').click();
  await expect(link.locator('[data-key=url]')).toBeVisible();
  await expect(link.locator('[data-key=url]')).toBeFocused();
  await link.locator('[data-key=url]').fill('https://example.com/');
  await page.locator('#add-block').click();await page.locator('[data-add=image]').click();
  const image=page.locator('[data-block-type=image]');
  await image.locator('[data-block-action=minimize]').click();
  await page.locator('#publish-bio').click();
  await expect(image.locator('input[type=file]')).toBeVisible();
  await expect(image.locator('input[type=file]')).toBeFocused();
  await expect(page.locator('#tool-status')).toContainText('Add an image');
});
test('minimized blocks still float and swap using mouse or touch',async({page,context},info)=>{
  await createBio(page);
  for(const button of await page.locator('[data-block-action=minimize]').all())await button.click();
  await page.locator('#bio-blocks').scrollIntoViewIfNeeded();
  const firstId=await page.locator('.bio-block').first().getAttribute('data-block-id');
  const handle=await page.locator('.bio-drag-handle').first().boundingBox();
  const target=await page.locator('.bio-block').last().boundingBox();
  const start={x:handle.x+handle.width/2,y:handle.y+handle.height/2},end={x:handle.x+handle.width/2,y:target.y+target.height-8};
  const cdp=info.project.name==='mobile'?await context.newCDPSession(page):null;
  if(cdp)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[start]});
  else{await page.mouse.move(start.x,start.y);await page.mouse.down();}
  await expect(page.locator('.is-dragging')).toHaveClass(/is-minimized/);
  if(cdp){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[end]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
  else{await page.mouse.move(end.x,end.y,{steps:8});await page.mouse.up();}
  await expect(page.locator('.bio-block').last()).toHaveAttribute('data-block-id',firstId);
  await expect(page.locator('.bio-block-fields:visible')).toHaveCount(0);
  await expect(page.locator('.bio-drop-slot,.is-dragging')).toHaveCount(0);
});

