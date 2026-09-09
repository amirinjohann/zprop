const {test,expect}=require('./auth-fixture');
const {createBio,expandBlocks,addBlock}=require('./bio-helper');
async function setup(page) {
  await createBio(page);
  await expandBlocks(page);
  while(await page.locator('.bio-block').count())await page.locator('[data-block-action=remove]').first().click();
  for(let i=0;i<3;i++){await addBlock(page,'heading',{heading:'Block '+i});await expandBlocks(page);}
  await page.locator('.bio-block').nth(1).scrollIntoViewIfNeeded();
}
async function pointer(page,context,mobile) {
  const cdp=mobile?await context.newCDPSession(page):null;
  return {
    async down(point){if(cdp)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});else{await page.mouse.move(point.x,point.y);await page.mouse.down();}},
    async move(point){if(cdp)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point]});else await page.mouse.move(point.x,point.y,{steps:5});},
    async up(){if(cdp){await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}else await page.mouse.up();}
  };
}
test('held block floats with the pointer, swaps through a placeholder and settles on release',async({page,context},info)=>{
  await setup(page);
  const first=page.locator('.bio-block').first(),id=await first.getAttribute('data-block-id');
  const target=await page.locator('.bio-block').nth(1).boundingBox();
  const handle=await first.locator('.bio-drag-handle').boundingBox();
  const start={x:handle.x+handle.width/2,y:handle.y+handle.height/2};
  const input=await pointer(page,context,info.project.name==='mobile');
  await input.down(start);
  const lifted=page.locator('.is-dragging');
  await expect(lifted).toHaveAttribute('data-block-id',id);
  await expect(lifted).toHaveCSS('position','fixed');
  await expect(page.locator('.bio-drop-slot')).toBeVisible();
  const before=await lifted.boundingBox();
  await input.move({x:start.x+10,y:start.y+25});
  const after=await lifted.boundingBox();
  expect(after.y-before.y).toBeCloseTo(25,0);expect(after.x-before.x).toBeCloseTo(10,0);
  await input.move({x:start.x,y:target.y+target.height-10});
  await expect(page.locator('.bio-page-heading').nth(1)).toHaveText('Block 0');
  await expect(page.locator('.bio-drop-slot')).toBeVisible();
  await page.screenshot({path:'test-results/floating-block-'+info.project.name+'.png'});
  await input.up();
  await expect(page.locator('.is-dragging,.bio-drop-slot')).toHaveCount(0);
  await expect(page.locator('.bio-block').nth(1)).toHaveAttribute('data-block-id',id);
  await expect(page.locator('.bio-block').nth(1).locator('.bio-drag-handle')).toBeFocused();
  await page.locator('#save-bio-draft').click();await expect(page.locator('#tool-status')).toHaveText('Draft saved.');
  await page.reload();await expect(page.locator('.bio-page-heading')).toHaveText(['Block 1','Block 0','Block 2']);
});
test('cancel restores the original order and reduced motion disables swap animations',async({page,context},info)=>{
  await setup(page);await page.emulateMedia({reducedMotion:'reduce'});
  const original=await page.locator('.bio-block').evaluateAll(els=>els.map(el=>el.dataset.blockId));
  const box=await page.locator('.bio-drag-handle').first().boundingBox();
  const next=await page.locator('.bio-block').nth(1).boundingBox();
  const input=await pointer(page,context,info.project.name==='mobile');
  const start={x:box.x+box.width/2,y:box.y+box.height/2};
  await input.down(start);await input.move({x:start.x,y:next.y+next.height-10});
  await expect(page.locator('.bio-page-heading').nth(1)).toHaveText('Block 0');
  expect(await page.locator('.bio-block').evaluateAll(els=>els.flatMap(el=>el.getAnimations()).length)).toBe(0);
  await page.keyboard.press('Escape');await input.up();
  await expect(page.locator('.bio-drop-slot,.is-dragging')).toHaveCount(0);
  expect(await page.locator('.bio-block').evaluateAll(els=>els.map(el=>el.dataset.blockId))).toEqual(original);
  await expect(page.locator('.bio-page-heading')).toHaveText(['Block 0','Block 1','Block 2']);
});


test('dragging near the screen edges scrolls the editor in both directions',async({page,context},info)=>{
  await setup(page);
  for(let i=3;i<8;i++){await addBlock(page,'heading',{heading:'Block '+i});await expandBlocks(page);}
  await page.locator('.bio-drag-handle').first().scrollIntoViewIfNeeded();
  const box=await page.locator('.bio-drag-handle').first().boundingBox();
  const start={x:box.x+box.width/2,y:box.y+box.height/2};
  const input=await pointer(page,context,info.project.name==='mobile');
  await input.down(start);
  const initialScroll=await page.evaluate(()=>scrollY);
  await input.move({x:start.x,y:(await page.evaluate(()=>innerHeight))-12});
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(initialScroll+100);
  const lowerScroll=await page.evaluate(()=>scrollY);
  await input.move({x:start.x,y:12});
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBeLessThan(lowerScroll-60);
  await page.keyboard.press('Escape');await input.up();
  await expect(page.locator('.bio-drop-slot,.is-dragging')).toHaveCount(0);
  await expect(page.locator('.bio-page-heading').first()).toHaveText('Block 0');
});

