const { test, expect } = require('./auth-fixture');
const fs = require('node:fs/promises');
const path = require('node:path');

async function download(page, format) {
  const pending = page.waitForEvent('download');
  await page.locator('#download-qr-' + format).click();
  const file = await pending;
  return { name:file.suggestedFilename(), bytes:await fs.readFile(await file.path()) };
}
async function decode(page, bytes, type) {
  return page.evaluate(async ({ base64, type }) => {
    const image = new Image(); image.src = `data:${type};base64,${base64}`; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return { text:window.jsQR(pixels.data, pixels.width, pixels.height)?.data, width:canvas.width, height:canvas.height, corner:[...pixels.data.slice(0,4)] };
  }, { base64:bytes.toString('base64'), type });
}

const cases = [
  { type:'URL', values:{ url:'https://example.com/view?name=Aina&lang=ms' }, expected:'https://example.com/view?name=Aina&lang=ms' },
  { type:'WhatsApp', values:{ phone:'+60 (12) 345-6789', message:'Hai Aina 👋, rumah & lokasi?' }, expected:'https://wa.me/60123456789?text=' + encodeURIComponent('Hai Aina 👋, rumah & lokasi?') },
  { type:'Location', values:{ latitude:'0', longitude:'-73.9857' }, expected:'https://www.google.com/maps/search/?api=1&query=0%2C-73.9857' },
  { type:'Event', values:{ eventTitle:'Open house, ZPROP', start:'2026-10-10T09:00', end:'2026-10-10T11:00', eventLocation:'Melaka; Malaysia', description:'Lawatan pertama\nBawa keluarga 👋' } },
  { type:'Vcard', values:{ firstName:'Aina 爱娜', lastName:'ZPROP', company:'ZPROP; Team', contactPhone:'+60123456789', email:'aina@example.com', website:'https://example.com', address:'Level 1, Melaka\nMalaysia' } }
];
for (const item of cases) test(`${item.type} exports scannable PNG and SVG with the entered content`, async ({ page, baseURL }) => {
  const errors = [], external = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/^https?:/.test(request.url()) && !request.url().startsWith(baseURL + '/')) external.push(request.url()); });
  await page.goto('/tools/qr-codes.html?lang=en');
  await page.locator('#new-qr').click();
  await page.addScriptTag({ path:path.resolve('node_modules/jsqr/dist/jsQR.js') });
  await page.getByRole('tab', { name:item.type, exact:true }).click();
  await page.locator('[name=name]').fill('My QR');
  for (const [name, value] of Object.entries(item.values)) await page.locator(`#tool-form [name=${name}]`).fill(value);
  await expect(page.locator('#qr-preview svg')).toHaveCount(0);
  await expect(page.locator('#download-qr-png')).toBeDisabled();
  await page.locator('#create-qr').click();
  await expect(page.locator('#tool-status')).toHaveText('Your QR code is ready to download.');
  await expect(page.locator('#qr-preview svg')).toBeVisible();
  const png = await download(page,'png'), svg = await download(page,'svg');
  expect(png.name).toBe('My-QR.png'); expect(svg.name).toBe('My-QR.svg');
  const decoded = await decode(page,png.bytes,'image/png');
  expect(decoded.width).toBe(1024); expect(decoded.height).toBe(1024); expect(decoded.corner).toEqual([255,255,255,255]);
  const svgDecoded = await decode(page,svg.bytes,'image/svg+xml');
  expect(decoded.text).toBeTruthy(); expect(svgDecoded.text).toBe(decoded.text);
  if (item.expected) expect(decoded.text).toBe(item.expected);
  if (item.type === 'Event') {
    const utc = await page.evaluate(value => new Date(value).toISOString().replace(/[-:]/g,'').replace(/\.000Z$/,'Z'),item.values.start);
    expect(decoded.text).toContain('BEGIN:VCALENDAR\r\nVERSION:2.0');
    expect(decoded.text).toContain('DTSTART:' + utc);
    expect(decoded.text).toContain('SUMMARY:Open house\\, ZPROP');
    expect(decoded.text).toContain('LOCATION:Melaka\\; Malaysia');
    expect(decoded.text).toContain('DESCRIPTION:Lawatan pertama\\nBawa keluarga 👋');
    expect(decoded.text).toMatch(/UID:.*@zprop.tech\r\n/);
    expect(decoded.text).toContain('END:VEVENT\r\nEND:VCALENDAR');
  }
  if (item.type === 'Vcard') {
    expect(decoded.text).toContain('BEGIN:VCARD\r\nVERSION:3.0');
    expect(decoded.text).toContain('N:ZPROP;Aina 爱娜;;;');
    expect(decoded.text).toContain('FN:Aina 爱娜 ZPROP');
    expect(decoded.text).toContain('ORG:ZPROP\\; Team');
    expect(decoded.text).toContain('ADR;TYPE=WORK:;;Level 1\\, Melaka\\nMalaysia;;;;');
  }
  expect(errors).toEqual([]); expect(external).toEqual([]);
});

test('validation clears stale QR exports, handles overflow and rejects invalid content', async ({ page }) => {
  await page.goto('/tools/qr-codes.html?lang=en');
  await page.locator('#new-qr').click();
  await expect(page.locator('#download-qr-png')).toBeDisabled();
  await page.locator('#create-qr').click();
  await expect(page.locator('[name=url]')).toBeFocused();
  await page.locator('[name=url]').fill('https://example.com');
  await page.locator('#create-qr').click();
  await expect(page.locator('#download-qr-png')).toBeEnabled();
  await page.locator('[name=url]').fill('javascript:alert(1)');
  await expect(page.locator('#download-qr-png')).toBeDisabled();
  await expect(page.locator('#qr-preview svg')).toHaveCount(0);
  await expect(page.locator('#tool-status')).toBeEmpty();
  await page.locator('#create-qr').click();
  await expect(page.locator('#tool-status')).toContainText('valid http://');
  await page.getByRole('tab',{name:'WhatsApp',exact:true}).click();
  await page.locator('[name=phone]').fill('0123456789');
  await page.locator('#create-qr').click();
  await expect(page.locator('#tool-status')).toContainText('country code');
  await page.locator('[name=phone]').fill('+60123456789');
  await page.locator('[name=message]').fill('👋'.repeat(250));
  await page.locator('#create-qr').click();
  await expect(page.locator('#tool-status')).toContainText('too long');
  await expect(page.locator('#download-qr-svg')).toBeDisabled();
  await page.getByRole('tab',{name:'Location',exact:true}).click();
  await page.locator('[name=latitude]').fill('91'); await page.locator('[name=longitude]').fill('0');
  await page.locator('#create-qr').click();
  await expect(page.locator('#tool-status')).toContainText('Latitude must');
  await page.getByRole('tab',{name:'Event',exact:true}).click();
  for (const [name, value] of Object.entries({eventTitle:'Test',start:'2026-10-10T11:00',end:'2026-10-10T09:00'})) await page.locator(`[name=${name}]`).fill(value);
  await page.locator('#create-qr').click();
  await expect(page.locator('#tool-status')).toContainText('end time must be after');
  await expect(page.locator('[name=end]')).toBeFocused();
});

test('tabs retain input, support keyboard navigation and translate without losing the QR', async ({ page }, info) => {
  await page.clock.install();
  await page.goto('/tools/qr-codes.html?lang=en');
  await page.locator('#new-qr').click();
  await page.locator('[name=url]').fill('https://example.com');
  await page.clock.fastForward(500);
  await expect(page.locator('#qr-preview svg')).toHaveCount(0);
  await expect(page.locator('#qr-empty')).toContainText('Create QR code');
  await page.locator('#create-qr').click();
  await expect(page.locator('#qr-preview svg')).toBeVisible();
  await page.getByRole('tab',{name:'URL',exact:true}).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab',{name:'WhatsApp',exact:true})).toBeFocused();
  await expect(page.locator('#qr-panel-whatsapp')).toBeVisible();
  await page.keyboard.press('End');
  await expect(page.getByRole('tab',{name:'Vcard',exact:true})).toHaveAttribute('aria-selected','true');
  await page.keyboard.press('Home');
  await expect(page.locator('[name=url]')).toHaveValue('https://example.com');
  await page.clock.fastForward(500);
  await expect(page.locator('#qr-preview svg')).toHaveCount(0);
  await expect(page.locator('#download-qr-svg')).toBeDisabled();
  await page.locator('#create-qr').click();
  await expect(page.locator('#qr-preview svg')).toBeVisible();
  const original = await page.locator('#qr-preview path').getAttribute('d');
  await page.locator('[data-language=ms]').click();
  await expect(page.locator('#create-qr')).toContainText('Kemas kini kod QR');
  expect(await page.locator('#qr-preview path').getAttribute('d')).toBe(original);
  await page.locator('.theme-toggle').click();
  await expect(page.locator('#qr-preview rect')).toHaveAttribute('fill','#ffffff');
  await page.locator('.qr-appearance summary').click();
  await page.locator('[name=foreground]').fill('#ffffff');
  await page.locator('#create-qr').click();
  await expect(page.locator('#download-qr-png')).toBeDisabled();
  await expect(page.locator('#tool-status')).toContainText('kontras');
  await page.locator('[name=foreground]').fill('#183e32');
  await page.locator('[name=size]').selectOption('512');
  await page.clock.fastForward(500);
  await expect(page.locator('#qr-preview svg')).toHaveCount(0);
  await expect(page.locator('#download-qr-png')).toBeDisabled();
  await page.locator('#create-qr').click();
  await expect(page.locator('#qr-preview svg')).toHaveAttribute('width','512');
  if (info.project.name === 'mobile') await page.setViewportSize({width:320,height:740});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/qr-codes-${info.project.name}.png`,fullPage:true});
});
