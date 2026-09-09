const {test,expect}=require('./auth-fixture');
const fs=require('node:fs/promises');
const {zipSync,strToU8}=require('fflate');
const name=()=> 'file-'+require('node:crypto').randomBytes(6).toString('hex');
function pdf(){
  const stream='BT /F1 20 Tf 50 700 Td (ZPROP file link) Tj ET';
  const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
  let text='%PDF-1.4\n';const offsets=[0];
  objects.forEach((body,i)=>{offsets.push(Buffer.byteLength(text));text+=`${i+1} 0 obj\n${body}\nendobj\n`;});
  const xref=Buffer.byteLength(text);text+=`xref\n0 6\n0000000000 65535 f \n`+offsets.slice(1).map(offset=>String(offset).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(text);
}
const xlsx=()=>Buffer.from(zipSync({
  '[Content_Types].xml':strToU8('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'),
  '_rels/.rels':strToU8('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'),
  'xl/workbook.xml':strToU8('<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Example" sheetId="1" r:id="rId1"/></sheets></workbook>'),
  'xl/_rels/workbook.xml.rels':strToU8('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'),
  'xl/worksheets/sheet1.xml':strToU8('<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>ZPROP</t></is></c></row></sheetData></worksheet>')
}));

test('PDF upload creates a named link with exact bytes, inline viewing and download',async({page,request},info)=>{
  const slug=name(),bytes=pdf();
  await page.goto('/tools/transfer-files.html?lang=en');await page.locator('#new-item').click();
  await expect(page.locator('.tools-sidebar [aria-current=page]')).toContainText('File link');
  await page.locator('[name=files]').setInputFiles({name:'Résumé report.pdf',mimeType:'application/pdf',buffer:bytes});
  await page.locator('[name=slug]').fill(slug);
  await page.getByRole('button',{name:'Create file link',exact:true}).click();
  await expect(page.locator('#file-result')).toBeVisible();
  await expect(page.locator('#file-address')).toHaveText(`https://zprop.tech/${slug}`);
  const result=await request.get('/'+slug);expect(result.status()).toBe(200);expect(await result.body()).toEqual(bytes);
  expect(result.headers()['content-type']).toBe('application/pdf');expect(result.headers()['content-disposition']).toContain('inline;');
  const range=await request.get('/'+slug,{headers:{Range:'bytes=0-4'}});expect(range.status()).toBe(206);expect(await range.text()).toBe('%PDF-');
  const downloadPromise=page.waitForEvent('download');await page.locator('#download-file').click();const download=await downloadPromise;
  expect(download.suggestedFilename()).toBe('Résumé report.pdf');expect(await fs.readFile(await download.path())).toEqual(bytes);
  await page.evaluate(()=>{navigator.clipboard.writeText=async text=>{window.fileLinkCopied=text;};});
  await page.locator('#copy-file-link').click();expect(await page.evaluate(()=>window.fileLinkCopied)).toContain('/'+slug);
  await page.locator('[data-language=ms]').click();await expect(page.locator('#file-result .draft-label')).toHaveText('PAUTAN FAIL DICIPTA');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/file-link-${info.project.name}.png`,fullPage:true});
  await page.reload();expect((await request.get('/'+slug)).status()).toBe(200);
});

test('Excel upload generates a random link and downloads the original workbook',async({page,request})=>{
  const bytes=xlsx();await page.goto('/tools/transfer-files.html?lang=en');await page.locator('#new-item').click();
  await page.locator('[name=files]').setInputFiles({name:'Budget.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:bytes});
  await page.locator('[data-action=createFileLink]').click();await expect(page.locator('#file-result')).toBeVisible();
  const link=await page.locator('#file-address').getAttribute('href');const response=await request.get(new URL(link).pathname);
  expect(response.headers()['content-disposition']).toContain('attachment;');expect(await response.body()).toEqual(bytes);
  const promise=page.waitForEvent('download');await page.locator('#download-file').click();const download=await promise;
  expect(download.suggestedFilename()).toBe('Budget.xlsx');expect(await fs.readFile(await download.path())).toEqual(bytes);
});

test('file and redirect names share atomic uniqueness without replacing either target',async({request})=>{
  const slug=name(),bytes=pdf();
  const results=await Promise.all([
    request.post(`/api/file-links?name=document.pdf&slug=${slug}`,{data:bytes}),
    request.post('/api/short-links',{data:{slug:slug.toUpperCase(),destination:'https://example.com/original'}})
  ]);
  expect(results.map(r=>r.status()).sort()).toEqual([201,409]);
  const winner=results.findIndex(r=>r.status()===201);
  const resolved=await request.get('/'+slug,{maxRedirects:0});
  if(winner===0){expect(resolved.status()).toBe(200);expect(await resolved.body()).toEqual(bytes);}
  else{expect(resolved.status()).toBe(302);expect(resolved.headers().location).toBe('https://example.com/original');}
  const next=await request.post(`/api/file-links?name=new.pdf&slug=${slug.toUpperCase()}`,{data:bytes});
  expect(next.status()).toBe(409);expect((await next.json()).error).toBe('linkTaken');
});

test('invalid files release names, and upload errors remain recoverable',async({request,page})=>{
  const slug=name();
  for(const [filename,bytes,error] of [['bad.pdf',Buffer.from('<script>bad</script>'),'fileInvalid'],['bad.xlsx',Buffer.from(zipSync({'hello.txt':strToU8('hello')})),'fileInvalid'],['bad.exe',Buffer.from('bad'),'fileType'],['empty.pdf',Buffer.alloc(0),'fileEmpty']]){
    const response=await request.post(`/api/file-links?name=${filename}&slug=${slug}`,{data:bytes});expect(response.status()).toBe(400);expect((await response.json()).error).toBe(error);
  }
  expect((await request.post(`/api/file-links?name=good.pdf&slug=${slug}`,{data:pdf()})).status()).toBe(201);
  expect((await request.post('/api/file-links?name=good.pdf&slug=TOOLS',{data:pdf()})).status()).toBe(400);
  expect((await request.post('/api/file-links?name=good.pdf',{data:pdf(),headers:{Origin:'null'}})).status()).toBe(403);
  await page.goto('/tools/transfer-files.html?lang=en');await page.locator('#new-item').click();await page.locator('[data-action=createFileLink]').click();await expect(page.locator('#tool-status')).toContainText('Choose a non-empty file');
  await page.locator('[name=files]').setInputFiles({name:'good.pdf',mimeType:'application/pdf',buffer:pdf()});
  await page.route('**/api/file-links?**',route=>route.fulfill({status:404,body:'Not found'}));
  await page.locator('[data-action=createFileLink]').click();await expect(page.locator('#tool-status')).toContainText('upload service is unavailable');await expect(page.locator('[data-action=createFileLink]')).toBeEnabled();
  await page.locator('[data-action=clear]').click();await expect(page.locator('#file-summary')).toHaveText('No files selected.');await expect(page.locator('#file-result')).toBeHidden();
});
