(async () => {
  'use strict';
  const base = new URL('../', document.currentScript.src);
  const publicBase = new URL(window.ZPROP_PUBLIC_ORIGIN);
  const $ = selector => document.querySelector(selector);
  const tool = window.ZPROP_TOOLS.find(item => item.id === 'host-html');
  const copy = {
    suite:['ALATAN ZPROP','ZPROP TOOLS'], sidebarNote:['Idea anda.<br>Alatan anda.','Your ideas.<br>Your tools.'], allTools:['Semua alatan','All tools'], help:['Perlukan bantuan?','Need help?'],
    editor:['Cipta laman statik','Create a static site'], upload:['Muat naik fail','Upload a file'], paste:['Tampal HTML','Paste HTML'], file:['Fail HTML atau ZIP','HTML or ZIP file'],
    limit:['.html, .zip dibenarkan. Maksimum 256 MB.','Supports .html and .zip. 256 MB maximum.'], types:['Fail dalam ZIP:','Files allowed inside a ZIP:'], index:['ZIP mesti mengandungi index.html. Satu folder pembungkus juga diterima.','Your ZIP must contain index.html. A single enclosing folder is also supported.'], relative:['Gunakan laluan relatif untuk imej, CSS dan JavaScript, contohnya:','Use relative paths for images, CSS and JavaScript, for example:'],
    html:['Kod HTML','HTML code'], slug:['URL ringkas','Short URL'], random:['Biarkan kosong untuk nama rawak. Gunakan 3–50 huruf kecil, nombor atau sempang.','Leave empty for a random name. Use 3–50 lowercase letters, numbers or hyphens.'],
    create:['Cipta laman statik','Create static site'], update:['Kemas kini laman statik','Update static site'], creating:['Sedang mencipta laman…','Creating your site…'], updating:['Sedang mengemas kini laman…','Updating your site…'], updated:['Laman statik dikemas kini.','Static site updated.'], preview:['Pratonton','Preview'], generate:['Jana pratonton','Generate preview'], downloadHtml:['Muat turun HTML','Download HTML'],
    emptyPreview:['Laman anda bermula di sini.','Your site starts here.'], previewHelp:['Muat naik laman web atau tampal HTML, kemudian cipta laman anda untuk melihat hasilnya.','Upload your website or paste HTML, then create your site to see it here.'],
    ready:['Laman statik anda telah dicipta','Your static site is ready'], open:['Buka laman','Open site'], copy:['Salin pautan','Copy link'], copied:['Pautan disalin.','Link copied.'], copyFail:['Pilih dan salin pautan di atas.','Select and copy the link above.'],
    note:['Terbitkan laman anda di zprop.tech dan kongsi pautannya.','Publish your site on zprop.tech and share its link.'], selected:['Fail dipilih','File selected'],
    fileType:['Pilih fail .html atau .zip dengan jenis aset yang dibenarkan sahaja.','Choose an .html or .zip file containing only the allowed asset types.'], size:['Had fail dan jumlah kandungan ZIP yang diekstrak ialah 256 MB.','The file and total extracted ZIP contents must each be 256 MB or less.'], empty:['Muat naik fail atau tampal HTML dahulu.','Upload a file or paste HTML first.'], missingIndex:['ZIP mesti mengandungi satu index.html pada akar laman.','Your ZIP needs an index.html at the site root.'], invalidZip:['ZIP tidak sah atau rosak. Cuba eksport semula fail ZIP anda.','This ZIP is invalid or damaged. Try exporting your ZIP again.'],
    unsafePath:['ZIP mengandungi laluan fail yang tidak disokong.','The ZIP contains an unsafe or unsupported file path.'], duplicate:['ZIP mengandungi nama fail pendua.','The ZIP contains duplicate file names.'], tooMany:['ZIP boleh mengandungi maksimum 2,000 entri.','The ZIP can contain up to 2,000 entries.'], taken:['Nama URL ini sudah digunakan. Pilih nama lain.','This URL name is already taken. Choose another name.'], itemLimit:['Anda boleh menyimpan sehingga 5 item untuk alatan ini. Padam satu untuk menambah yang baharu.','You can save up to 5 items in this tool. Delete one to add another.'], busy:['Pelayan sedang memproses laman lain. Cuba lagi sebentar.','The server is processing another site. Please try again shortly.'], processing:['Fail tidak dapat diproses. Cuba ZIP yang lebih kecil.','Could not process this file. Try a smaller ZIP.'], server:['Penciptaan laman tidak tersedia buat masa ini. Sila cuba lagi.','Site creation is temporarily unavailable. Please try again.'], origin:['Permintaan muat naik ditolak. Buka semula alat pada pelayan ZPROP.','Upload request rejected. Reopen the tool on the ZPROP server.'], saved:['HTML dimuat turun.','HTML downloaded.'], slugError:['Gunakan 3–50 huruf kecil atau nombor, dengan sempang di tengah sahaja.','Use 3–50 lowercase letters or numbers, with hyphens only in the middle.']
  };
  Object.assign(copy, {
    unavailable:['Alamat ini tidak menyediakan perkhidmatan muat naik. Buka alatan pada pelayan ZPROP untuk mencipta laman.','This address does not provide the upload service. Open the tool on the ZPROP server to create your site.'],
    network:['Tidak dapat menghubungi perkhidmatan muat naik. Semak sambungan anda dan cuba lagi.','Could not reach the upload service. Check your connection and try again.'],
    server:['Pelayan tidak dapat menyimpan laman anda. Cuba lagi atau hubungi pentadbir pelayan.','The server could not save your site. Try again or contact the server administrator.'],
    openService:['Buka halaman muat naik ZPROP','Open the ZPROP upload page'],
    editTitle:['Edit laman statik','Edit static site'], locked:['Nama URL dikunci supaya pautan yang diterbitkan kekal sama.','The URL name is locked so the published link stays the same.'],
    conflict:['Laman telah berubah. Buka semula sebelum menyimpan.','This site changed elsewhere. Reopen it before saving.'], notFound:['Laman ini tidak lagi tersedia.','This site is no longer available.']
  });
  let mode = 'upload', busy = false, statusKey = '', siteUrl = '', library;
  let language = document.documentElement.lang === 'en' ? 1 : 0;
  const t = key => copy[key][language];
  const text = key => `<span data-static-copy="${key}">${t(key)}</span>`;
  localizeShell();
  window.ZpropLanguage?.ready();
  document.addEventListener('zprop:language',localizeShell);
  if (!window.ZpropAuth || !await window.ZpropAuth.ready) return;
  document.removeEventListener('zprop:language',localizeShell);
  localizeShell();
  $('#tool-workspace').innerHTML = `<div class="workspace-grid static-workspace"><form id="tool-form" class="tool-editor">
    <h2 class="workspace-title">${text('editor')}</h2>
    <div class="source-tabs" role="tablist" aria-label="HTML source"><button type="button" id="upload-tab" role="tab" aria-selected="true" aria-controls="upload-panel" data-mode="upload">${text('upload')}</button><button type="button" id="paste-tab" role="tab" aria-selected="false" aria-controls="paste-panel" tabindex="-1" data-mode="paste">${text('paste')}</button></div>
    <div id="upload-panel" role="tabpanel" aria-labelledby="upload-tab"><label class="site-upload"><span data-static-copy="file">${t('file')}</span><input name="file" type="file" accept=".html,.zip" aria-describedby="file-limit"></label><p class="site-hint" id="file-limit">${text('limit')}</p><p class="site-hint">${text('types')} .css, .js, .html, .jpg, .jpeg, .png, .ico, .svg, .gif, .webp, .ttf, .woff, .woff2, .eot, .otf, .xml, .json, .mp3, .wav, .mp4, .webm, .pdf, .txt, .avif</p><p class="site-hint">${text('index')}</p><p class="site-hint">${text('relative')} <code>&lt;link rel="stylesheet" href="./css/styles.css"&gt;</code></p></div>
    <div id="paste-panel" role="tabpanel" aria-labelledby="paste-tab" hidden><label>${text('html')}<textarea name="html" class="code-input" spellcheck="false" placeholder="<!DOCTYPE html>&#10;<html>&#10;  <body>&#10;    <h1>Hello, world!</h1>&#10;  </body>&#10;</html>"></textarea></label><div class="tool-actions secondary-actions"><button type="button" data-action="generate">${text('generate')}</button><button type="button" data-action="downloadHtml">${text('downloadHtml')}</button></div></div>
    <label class="slug-label">${text('slug')}<div class="site-address"><span id="site-prefix"></span><input name="slug" autocomplete="off" placeholder="my-website" maxlength="50" pattern="[a-z0-9][a-z0-9-]{1,48}[a-z0-9]" aria-describedby="slug-hint"></div></label><p class="site-hint" id="slug-hint">${text('random')}</p>
    <p class="site-storage-note">${text('note')}</p><div class="tool-actions"><button type="submit" class="primary site-create" id="create-site"><span data-static-copy="create">${t('create')}</span> <span aria-hidden="true">↗</span></button></div><p id="tool-status" class="tool-status" role="status" aria-live="polite"></p>
    <section class="site-result" id="site-result" hidden><h3>${text('ready')}</h3><a id="site-url" target="_blank" rel="noopener noreferrer"></a><div class="tool-actions"><a id="open-site" target="_blank" rel="noopener noreferrer">${text('open')} ↗</a><button type="button" id="copy-site">${text('copy')}</button></div></section>
    </form><section class="tool-preview site-preview"><div class="preview-toolbar"><h2 class="workspace-title">${text('preview')}</h2><span class="preview-dots" aria-hidden="true">● ● ●</span></div><div id="preview-empty" class="site-preview-empty"><span class="preview-code" aria-hidden="true">&lt;/&gt;</span><h3>${text('emptyPreview')}</h3><p>${text('previewHelp')}</p></div><iframe class="html-preview" id="html-preview" sandbox="" title="HTML preview" referrerpolicy="no-referrer" hidden></iframe></section></div>`;
  const form = $('#tool-form');
  const serviceLink = document.createElement('a');
  serviceLink.id = 'upload-service-link';
  serviceLink.hidden = true;
  serviceLink.style.cssText = 'display:inline-block;margin-top:12px;text-decoration:underline;font-size:12px';
  $('#tool-status').after(serviceLink);
  const localPage = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.hostname.endsWith('.test');
  function updateServiceLink() {
    serviceLink.hidden = !localPage || !['unavailable','network'].includes(statusKey);
    serviceLink.textContent = t('openService');
    serviceLink.href = window.ZPROP_PUBLIC_ORIGIN + '/tools/host-html.html?lang=' + (language ? 'en' : 'ms');
  }
  $('#site-prefix').textContent = publicBase.host + '/';
  function status(key, error = false) { statusKey = key; $('#tool-status').textContent = key ? t(key) : ''; $('#tool-status').classList.toggle('is-error', error); updateServiceLink(); }
  function switchMode(next) {
    mode = next;
    document.querySelectorAll('[data-mode]').forEach(button => { button.setAttribute('aria-selected', String(button.dataset.mode === mode)); button.tabIndex = button.dataset.mode === mode ? 0 : -1; });
    $('#upload-panel').hidden = mode !== 'upload'; $('#paste-panel').hidden = mode !== 'paste';
    status('');
  }
  document.querySelectorAll('[data-mode]').forEach(button => {
    button.addEventListener('click', () => switchMode(button.dataset.mode));
    button.addEventListener('keydown', event => { if (['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) { event.preventDefault(); switchMode(event.key === 'Home' ? 'upload' : event.key === 'End' ? 'paste' : mode === 'upload' ? 'paste' : 'upload'); $(`[data-mode="${mode}"]`).focus(); } });
  });
  form.elements.file.addEventListener('change', () => { status(''); const file = form.elements.file.files[0]; if (file && !/\.(html|zip)$/i.test(file.name)) status('fileType', true); else if (file?.size > 256*1024*1024) status('size', true); });
  form.elements.slug.addEventListener('input', () => form.elements.slug.setCustomValidity(''));
  form.elements.slug.addEventListener('invalid', () => form.elements.slug.setCustomValidity(t('slugError')));
  function showPreview() { $('#preview-empty').hidden = true; $('#html-preview').hidden = false; }
  $('[data-action="generate"]').addEventListener('click', () => {
    if (!form.elements.html.value.trim()) return status('empty', true);
    showPreview(); $('#html-preview').setAttribute('sandbox', ''); $('#html-preview').removeAttribute('src');
    $('#html-preview').srcdoc = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; form-action 'none'; base-uri 'none'">` + form.elements.html.value;
  });
  $('[data-action="downloadHtml"]').addEventListener('click', () => {
    if (!form.elements.html.value.trim()) return status('empty', true);
    const url = URL.createObjectURL(new Blob([form.elements.html.value], { type:'text/html' })); const a = document.createElement('a'); a.href = url; a.download = 'index.html'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); status('saved');
  });
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (busy) return;
    const file = form.elements.file.files[0];
    const body = mode === 'upload' ? file : new Blob([form.elements.html.value], { type:'text/html' });
    if (!body?.size || (mode === 'paste' && !form.elements.html.value.trim())) return status('empty', true);
    if (body.size > 256*1024*1024) return status('size', true);
    if (mode === 'upload' && !/\.(html|zip)$/i.test(file.name)) return status('fileType', true);
    const type = mode === 'upload' && /\.zip$/i.test(file.name) ? 'zip' : 'html';
    const editing = !!library.active;
    const endpoint = new URL(editing ? 'api/static-sites/' + encodeURIComponent(library.active.slug) : 'api/static-sites', base);
    endpoint.searchParams.set('type', type);
    if (editing) endpoint.searchParams.set('revision', library.active.revision);
    else endpoint.searchParams.set('slug', form.elements.slug.value.trim());
    busy = true; for(const control of form.querySelectorAll('input,textarea,button'))control.disabled=true; form.setAttribute('aria-busy', 'true'); $('#create-site').disabled = true; syncSave(editing); status(''); $('#site-result').hidden = true;
    try {
      let response;
      try { response = await window.ZpropAuth.fetch(endpoint, { method:editing?'PUT':'POST', headers:{'Content-Type':'application/octet-stream'}, body }); }
      catch { throw new Error(location.protocol === 'file:' ? 'unavailable' : 'network'); }
      if ([404, 405].includes(response.status)) throw new Error(editing && response.status===404 ? 'notFound' : 'unavailable');
      if (response.status === 413) throw new Error('size');
      let result; try { result = await response.json(); } catch { throw new Error(response.ok ? 'unavailable' : 'server'); }
      if (!response.ok) throw new Error(result.error === 'slug' ? 'slugError' : result.error);
      if (!result.url) throw new Error('server');
      siteUrl = new URL(result.url, publicBase).href;
      $('#site-url').href = siteUrl; $('#site-url').textContent = siteUrl; $('#open-site').href = siteUrl; $('#site-result').hidden = false;
      showPreview(); $('#html-preview').removeAttribute('srcdoc'); $('#html-preview').setAttribute('sandbox', 'allow-scripts'); $('#html-preview').src = new URL(result.url, base).href;
      status(editing?'updated':'ready');library.saved(editing?result:undefined);
    } catch (error) { status(copy[error.message] ? error.message : 'server', true); }
    finally { busy = false; for(const control of form.querySelectorAll('input,textarea,button'))control.disabled=false; form.removeAttribute('aria-busy'); $('#create-site').disabled = false; syncSave(); }
  });
  $('#copy-site').addEventListener('click', async () => { try { await navigator.clipboard.writeText(siteUrl); status('copied'); } catch { status('copyFail'); } });
  function syncSave(editing = !!library?.active) {
    const key = busy ? (editing ? 'updating' : 'creating') : (editing ? 'update' : 'create');
    const label = $('#create-site')?.firstElementChild;
    if (label) { label.dataset.staticCopy = key; label.textContent = t(key); }
    const title = $('#tool-form > .workspace-title');
    if (title) { title.dataset.staticCopy = editing ? 'editTitle' : 'editor'; title.textContent = t(title.dataset.staticCopy); }
    if (form?.elements.slug) form.elements.slug.readOnly = !!editing;
    const hint = $('#slug-hint');
    if (hint) { hint.dataset.staticCopy = editing ? 'locked' : 'random'; hint.textContent = t(hint.dataset.staticCopy); }
  }
  function showPublished(record) {
    siteUrl = new URL(record.url, publicBase).href;
    $('#site-url').href = siteUrl; $('#site-url').textContent = siteUrl; $('#open-site').href = siteUrl; $('#site-result').hidden = false;
    showPreview();
    if (record.html) {
      $('#html-preview').removeAttribute('src'); $('#html-preview').setAttribute('sandbox', '');
      $('#html-preview').srcdoc = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; form-action 'none'; base-uri 'none'">` + record.html;
    } else {
      $('#html-preview').removeAttribute('srcdoc'); $('#html-preview').setAttribute('sandbox', 'allow-scripts');
      $('#html-preview').src = new URL(record.url, base).href;
    }
  }
  function localizeShell() {
    language = document.documentElement.lang === 'en' ? 1 : 0;
    document.title = tool.name[language] + ' — ZPROP';
    $('meta[name="description"]').content = tool.description[language];
    for (const key of ['title','tag','description','availability']) $('#tool-'+key).textContent = tool[key][language];
    $('#tool-capabilities').innerHTML = tool.features.map(item => `<span>✓ ${item[language]}</span>`).join('');
    document.querySelectorAll('[data-tool-name]').forEach(el => { el.textContent = window.ZPROP_TOOLS.find(item => item.id === el.dataset.toolName).name[language]; });
    document.querySelectorAll('[data-static-copy], [data-tool-copy]').forEach(el => { el.innerHTML = t(el.dataset.staticCopy || el.dataset.toolCopy); });
  }
  function localize() {
    localizeShell();
    syncSave();
    if (statusKey) $('#tool-status').textContent = t(statusKey);
    updateServiceLink();
    $('#html-preview').title = language ? 'HTML preview' : 'Pratonton HTML';
  }
  document.addEventListener('zprop:language', localize); localize();
  library=window.ZpropItemLibrary.mount({category:'host-html',onCreate(){
    form.reset();form.elements.slug.setCustomValidity('');form.elements.slug.readOnly=false;switchMode('upload');status('');siteUrl='';
    $('#site-result').hidden=true;$('#html-preview').hidden=true;$('#preview-empty').hidden=false;
    $('#html-preview').removeAttribute('src');$('#html-preview').removeAttribute('srcdoc');$('#html-preview').setAttribute('sandbox','');
    syncSave(false);
  },onEdit(record){
    form.reset();form.elements.slug.setCustomValidity('');form.elements.slug.value=record.slug;form.elements.slug.readOnly=true;
    if (record.html) { switchMode('paste'); form.elements.html.value = record.html; }
    else { switchMode('upload'); form.elements.html.value = ''; }
    showPublished(record);status('');syncSave(true);
  }});
  window.ZpropNavigation?.ready();
})();
