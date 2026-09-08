(async () => {
  'use strict';
  const base = new URL('.', document.currentScript.src);
  const testingLocally = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(base.hostname) || base.hostname.endsWith('.localhost');
  const publishBase = new URL(testingLocally ? base.origin : window.ZPROP_PUBLIC_ORIGIN);
  const tool = window.ZPROP_TOOLS.find(item => item.id === 'bio-pages');
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  let language = document.documentElement.lang === 'en' ? 1 : 0;
  const copy = {
    suite:['ALATAN ZPROP','ZPROP TOOLS'], sidebarNote:['Identiti sendiri.<br>Ruang milik anda.','Your own identity.<br>Your own space.'], allTools:['Semua alatan','All tools'], help:['Perlukan bantuan?','Need help?'],
    editor:['Bina halaman bio anda','Build your bio page'], content:['Kandungan','Content'], appearance:['Penampilan','Appearance'], profile:['Profil anda','Your profile'], name:['Nama paparan','Display name'], bio:['Penerangan ringkas','Short introduction'], photo:['Foto profil','Profile photo'], removePhoto:['Buang foto','Remove photo'], imageHelp:['PNG, JPG, WEBP atau GIF. Maksimum 5 MB setiap imej.','PNG, JPG, WEBP or GIF. Up to 5 MB per image.'],
    blocks:['Blok anda','Your blocks'], blocksHelp:['Tambah kandungan dan susun mengikut pilihan anda.','Add your content and arrange it your way.'], add:['Tambah blok','Add block'], choose:['Apakah yang ingin ditambah?','What would you like to add?'], close:['Tutup','Close'], link:['Pautan','Link'], text:['Teks','Text'], heading:['Tajuk','Heading'], image:['Imej','Image'], divider:['Pemisah','Divider'],
    linkHelp:['Butang ke mana-mana laman web.','A button to any website.'], textHelp:['Kongsi cerita atau pesanan anda.','Share your story or a message.'], headingHelp:['Perkenalkan bahagian baharu.','Introduce a new section.'], imageBlockHelp:['Paparkan foto, produk atau karya.','Show a photo, product or project.'], dividerHelp:['Pisahkan bahagian dengan garisan.','Separate sections with a line.'],
    label:['Teks butang','Button label'], url:['URL destinasi','Destination URL'], imageFile:['Muat naik imej','Upload image'], alt:['Penerangan imej','Image description'], caption:['Kapsyen (pilihan)','Caption (optional)'], up:['Alih ke atas','Move up'], down:['Alih ke bawah','Move down'], duplicate:['Salin blok','Duplicate block'], remove:['Buang blok','Remove block'], noBlocks:['Belum ada blok. Tambah blok pertama anda.','No blocks yet. Add your first block.'], dividerNote:['Garisan ringkas untuk memisahkan kandungan anda.','A simple line to separate your content.'],
    preview:['Pratonton langsung','Live preview'], previewHint:['Pratonton dikemas kini semasa anda mengedit.','Your preview updates as you edit.'], previewImage:['Imej anda di sini','Your image goes here'], emptyName:['Nama anda','Your name'],
    styleTitle:['Jadikan milik anda','Make it yours'], styleHelp:['Pilih warna dan gaya butang halaman anda.','Choose your page colors and button style.'], background:['Warna latar','Background color'], ink:['Warna teks','Text color'], accent:['Warna butang','Button color'], buttonText:['Warna teks butang','Button text color'], rounded:['Bulat','Rounded'], square:['Segi empat','Square'], pill:['Kapsul','Pill'], buttonStyle:['Bentuk butang','Button shape'],
    downloadHtml:['Muat turun HTML','Download HTML'], publish:['Terbitkan halaman','Publish page'], publishing:['Sedang menerbitkan…','Publishing…'], slug:['Nama pautan (pilihan)','Link name (optional)'], slugHelp:['3–50 huruf kecil, nombor atau sempang. Kosongkan untuk nama rawak.','3–50 lowercase letters, numbers or hyphens. Leave empty for a random name.'], ready:['Halaman bio anda telah diterbitkan','Your bio page is published'], open:['Buka halaman','Open page'], copy:['Salin pautan','Copy link'], copied:['Pautan disalin.','Link copied.'], copyFailed:['Pilih dan salin pautan di atas.','Select and copy the link above.'], saved:['HTML anda sedia untuk dimuat turun.','Your HTML is ready to download.'],
    imageError:['Pilih imej PNG, JPG, WEBP atau GIF yang sah, sehingga 5 MB.','Choose a valid PNG, JPG, WEBP or GIF image, up to 5 MB.'], imageTotal:['Jumlah imej maksimum ialah 20 MB. Buang imej atau pilih fail lebih kecil.','Images can total up to 20 MB. Remove an image or choose a smaller file.'], imageMissing:['Tambah imej pada setiap blok imej dahulu.','Add an image to each image block first.'], imageLoading:['Sila tunggu imej selesai dimuatkan.','Please wait for your images to finish loading.'], blockLimit:['Anda boleh menambah sehingga 30 blok.','You can add up to 30 blocks.'], invalidUrl:['Masukkan URL lengkap bermula dengan https:// atau http://.','Enter a complete URL starting with https:// or http://.'], taken:['Nama pautan ini sudah digunakan. Pilih nama lain.','This link name is already taken. Choose another name.'], server:['Halaman tidak dapat diterbitkan. Sila cuba lagi.','Could not publish your page. Please try again.'], busy:['Pelayan sedang sibuk. Cuba lagi sebentar.','The server is busy. Please try again shortly.'], slugError:['Gunakan 3–50 huruf kecil atau nombor, dengan sempang di tengah sahaja.','Use 3–50 lowercase letters or numbers, with hyphens only in the middle.'], downloadError:['Muat turun tidak dapat disediakan. Sila cuba lagi.','Could not prepare your download. Please try again.']
  };
  Object.assign(copy, {
    slug:['Nama pautan','Link name'],slugHelp:['Wajib. Gunakan 3–50 huruf kecil, nombor atau sempang.','Required. Use 3–50 lowercase letters, numbers or hyphens.'],myPages:['Halaman bio anda','Your bio pages'],manageHelp:['Cipta, edit dan urus semua halaman bio anda.','Create, edit and manage all your bio pages.'],createPage:['Cipta halaman bio','Create bio page'],createHelp:['Pilih nama pautan dahulu. Kemudian sesuaikan kandungan dan terbitkan halaman anda.','Choose a link name first. Then customize your content and publish your page.'],editPage:['Edit','Edit'],deletePage:['Padam halaman','Delete page'],deleteHelp:['Halaman dan kandungannya akan dipadam. Pautan yang diterbitkan tidak lagi boleh dibuka.','This removes the page and its content. Its published link will no longer open.'],cancel:['Batal','Cancel'],noPages:['Halaman pertama anda bermula di sini.','Your first page starts here.'],draft:['Draf','Draft'],published:['Diterbitkan','Published'],saveDraft:['Simpan draf','Save draft'],saveChanges:['Simpan perubahan','Save changes'],saving:['Sedang menyimpan…','Saving…'],draftSaved:['Draf disimpan.','Draft saved.'],unsaved:['Perubahan belum disimpan','Unsaved changes'],discard:['Tinggalkan perubahan yang belum disimpan?','Discard your unsaved changes?'],loadingPages:['Memuatkan halaman anda…','Loading your pages…'],loadError:['Halaman tidak dapat dimuatkan. Sila cuba lagi.','Could not load your pages. Please try again.'],retry:['Cuba lagi','Retry'],notFound:['Halaman ini tidak tersedia untuk akaun anda.','This page is not available for your account.'],conflict:['Halaman telah diubah dalam tab lain. Muat semula sebelum menyimpan.','This page changed in another tab. Reload it before saving.'],drag:['Seret untuk menyusun. Papan kekunci: anak panah atas atau bawah.','Drag to reorder. Keyboard: use the up or down arrow keys.'],moved:['Blok dialihkan ke kedudukan','Block moved to position'],blocksHelp:['Seret pemegang untuk menyusun blok anda.','Drag the handles to arrange your blocks.']
  });
  copy.profileHelp = ['Tambah foto, nama dan pengenalan anda.', 'Add your photo, name and introduction.'];
  Object.assign(copy,{blockStatus:['Status blok','Block status'],enabled:['Aktif','On'],disabled:['Tidak aktif','Off'],statusHelp:['Simpan perubahan untuk mengemas kini status pada halaman langsung.','Save changes to update the status on your live page.']});
  Object.assign(copy,{minimize:['Minimumkan blok','Minimize block'],expand:['Kembangkan blok','Expand block']});
  const minimized = new Set();
  const t = key => copy[key]?.[language] || key;
  const label = key => `<span data-bio-copy="${key}">${t(key)}</span>`;
  function shell() {
    language = document.documentElement.lang === 'en' ? 1 : 0;
    document.title = tool.name[language] + ' — ZPROP';
    $('meta[name=description]').content = tool.description[language];
    for (const key of ['title','tag','description','availability']) $('#tool-' + key).textContent = tool[key][language];
    $('#tool-capabilities').innerHTML = tool.features.map(item => `<span>✓ ${esc(item[language])}</span>`).join('');
    document.querySelectorAll('[data-tool-name]').forEach(el => { el.textContent = window.ZPROP_TOOLS.find(item => item.id === el.dataset.toolName).name[language]; });
    document.querySelectorAll('[data-tool-copy], [data-bio-copy]').forEach(el => { el.innerHTML = t(el.dataset.toolCopy || el.dataset.bioCopy); });
  }
  shell(); window.ZpropLanguage?.ready();
  document.addEventListener('zprop:language', shell);
  if (!window.ZpropAuth || !await window.ZpropAuth.ready) return;
  document.removeEventListener('zprop:language', shell);
  let nextId = 1, statusKey = '', publishing = false, loading = 0, publishedUrl = '';
  const state = { schemaVersion:2, background:'#f6f5ef', ink:'#203e33', accent:'#203e33', buttonText:'#ffffff', shape:'rounded', blocks:[{id:nextId++,type:'profile',name:'ZPROP',bio:language ? 'Your story. Your space.' : 'Cerita anda. Ruang anda.',photo:''},{id:nextId++, type:'link', label:language ? 'Visit my website' : 'Lawati laman web saya', url:window.ZPROP_PUBLIC_ORIGIN}] };
  const blockTypes = ['profile','link','text','heading','image','divider'];
  const icons = {profile:'♙', link:'↗', text:'¶', heading:'T', image:'▧', divider:'—'};
  const field = (key, value, attrs = '') => `<label>${label(key)}<input name="${key}" value="${esc(value)}" ${attrs}></label>`;
  $('#tool-workspace').innerHTML = `<div class="bio-builder"><form id="tool-form" class="tool-editor" novalidate><fieldset id="bio-fields"><h2 class="workspace-title">${label('editor')}</h2>
    <div class="bio-tabs" role="tablist" aria-label="Bio editor"><button type="button" role="tab" id="bio-content-tab" aria-controls="bio-content" aria-selected="true" data-tab="content">${label('content')}</button><button type="button" role="tab" id="bio-appearance-tab" aria-controls="bio-appearance" aria-selected="false" tabindex="-1" data-tab="appearance">${label('appearance')}</button></div>
    <section id="bio-content" role="tabpanel" aria-labelledby="bio-content-tab">
    <div class="bio-block-heading"><div><h3>${label('blocks')}</h3><p class="bio-hint">${label('blocksHelp')}</p></div><button type="button" id="add-block" class="bio-add">+ ${label('add')}</button></div><div id="bio-blocks"></div></section>
    <section id="bio-appearance" role="tabpanel" aria-labelledby="bio-appearance-tab" hidden><h3>${label('styleTitle')}</h3><p class="bio-hint">${label('styleHelp')}</p><div class="bio-colors">${['background','ink','accent','buttonText'].map(key => field(key,state[key],'type="color"')).join('')}</div><label>${label('buttonStyle')}<select name="shape">${['rounded','square','pill'].map(key => `<option value="${key}" data-bio-copy="${key}">${t(key)}</option>`).join('')}</select></label></section>
    <div class="bio-publish"><label>${label('slug')}<div class="bio-address"><span>zprop.tech/sites/</span><input name="slug" maxlength="50" pattern="[a-z0-9][a-z0-9-]{1,48}[a-z0-9]" placeholder="my-bio" aria-describedby="bio-slug-help"></div></label><p class="bio-hint" id="bio-slug-help">${label('slugHelp')}</p><div class="tool-actions"><button type="button" data-action="downloadHtml">${label('downloadHtml')}</button><button type="submit" class="primary" id="publish-bio">${label('publish')} ↗</button></div></div></fieldset><p id="tool-status" class="tool-status" role="status" aria-live="polite"></p><section id="bio-result" class="bio-result" hidden><h3>${label('ready')}</h3><a id="bio-url" target="_blank" rel="noopener noreferrer"></a><div class="tool-actions"><a id="open-bio" target="_blank" rel="noopener noreferrer">${label('open')} ↗</a><button type="button" id="copy-bio">${label('copy')}</button></div></section></form>
    <aside class="bio-preview-column"><div class="bio-preview-heading"><span class="bio-live-dot"></span><h2>${label('preview')}</h2><span aria-hidden="true">↗</span></div><div class="bio-phone"><div class="bio-phone-camera" aria-hidden="true"></div><div class="bio-phone-screen"><main id="bio-preview" class="bio-document"></main></div></div><p class="bio-hint bio-preview-hint">${label('previewHint')}</p></aside></div>
    <dialog id="block-picker" class="bio-dialog" aria-labelledby="block-picker-title"><div class="bio-dialog-heading"><h2 id="block-picker-title">${label('choose')}</h2><button type="button" id="close-block-picker">×</button></div><div class="bio-block-types">${blockTypes.map(type => `<button type="button" data-add="${type}"><span class="bio-type-icon" aria-hidden="true">${icons[type]}</span><span><strong>${label(type)}</strong><small>${label(type === 'image' ? 'imageBlockHelp' : type + 'Help')}</small></span><span aria-hidden="true">+</span></button>`).join('')}</div></dialog>`;
  const form = $('#tool-form');
  form.elements.slug.required=true;
  $('[data-action=downloadHtml]').insertAdjacentHTML('afterend',`<button type="button" id="save-bio-draft">${label('saveDraft')}</button>`);
  $('#bio-blocks').insertAdjacentHTML('afterend','<p id="bio-reorder-status" class="bio-sr-only" role="status"></p>');
  $('.bio-address > span').textContent = publishBase.host + '/sites/';
  function status(key, error = false) { statusKey = key; $('#tool-status').textContent = key ? t(key) : ''; $('#tool-status').classList.toggle('is-error', error); }
  function changed() { library.changed(); status(''); renderPreview(); }
  function validUrl(value) { try { const url = new URL(value); return ['http:','https:'].includes(url.protocol) && !!url.hostname && !url.username && !url.password; } catch { return false; } }
  function setMinimized(id, collapse) {
    if(collapse)minimized.add(id);else minimized.delete(id);
    const card = $('[data-block-id="'+id+'"]');
    if(!card)return;
    card.classList.toggle('is-minimized',collapse);
    card.querySelector('.bio-block-fields').hidden=collapse;
    const button=card.querySelector('[data-block-action=minimize]');
    button.setAttribute('aria-expanded',String(!collapse));
    button.setAttribute('aria-label',t(collapse?'expand':'minimize'));
    button.title=t(collapse?'expand':'minimize');
    button.textContent=collapse?'+':'−';
  }
  function controls(block, index) {
    return `<div class="bio-block-controls"><button type="button" data-block-action="minimize" aria-expanded="${!minimized.has(block.id)}" aria-controls="bio-block-fields-${block.id}" aria-label="${t(minimized.has(block.id)?'expand':'minimize')}" title="${t(minimized.has(block.id)?'expand':'minimize')}">${minimized.has(block.id)?'+':'−'}</button><button type="button" class="bio-status-toggle" data-block-action="toggle" role="switch" aria-checked="${block.enabled!==false}" aria-label="${t('blockStatus')}: ${t(block.type)} ${index+1}" title="${t('statusHelp')}"><span class="bio-switch-track" aria-hidden="true"></span><span>${t(block.enabled===false?'disabled':'enabled')}</span></button>${[['duplicate','⧉'],['remove','×']].map(([action,icon]) => `<button type="button" data-block-action="${action}" aria-label="${t(action)}" title="${t(action)}">${icon}</button>`).join('')}</div>`;
  }
  function renderBlocks() {
    $('#bio-blocks').innerHTML = state.blocks.length ? state.blocks.map((block,index) => {
      const input = (key, attrs='') => `<label>${label(key)}<input data-key="${key}" value="${esc(block[key] || '')}" ${attrs}></label>`;
      let fields = '';
      if (block.type === 'profile') fields = `<div class="bio-photo-row"><div data-profile-thumb class="bio-photo-thumb" aria-hidden="true"></div><div><label>${label('photo')}<input name="photo" data-key="photo" type="file" accept="image/png,image/jpeg,image/webp,image/gif" aria-describedby="bio-image-help-${block.id}"></label><button type="button" data-block-action="removePhoto" class="bio-text-button" ${block.photo?'':'hidden'}>${label('removePhoto')}</button></div></div><p class="bio-hint" id="bio-image-help-${block.id}">${label('imageHelp')}</p>` + input('name','name="name" maxlength="100" required') + `<label>${label('bio')}<textarea data-key="bio" name="bio" maxlength="1000">${esc(block.bio || '')}</textarea></label>`;
      if (block.type === 'link') fields = input('label','maxlength="100" required') + input('url','type="url" placeholder="https://" maxlength="4096" required');
      if (['text','heading'].includes(block.type)) fields = block.type === 'text' ? `<label>${label('text')}<textarea data-key="text" maxlength="3000" required>${esc(block.text || '')}</textarea></label>` : input('heading','maxlength="200" required');
      if (block.type === 'image') fields = `<label>${label('imageFile')}<input type="file" data-key="image" accept="image/png,image/jpeg,image/webp,image/gif"></label><p class="bio-hint">${label('imageHelp')}</p><img class="bio-image-thumb" ${block.src ? `src="${block.src}"` : 'hidden'} alt="">` + input('alt','maxlength="200"') + input('caption','maxlength="300"');
      if (block.type === 'divider') fields = `<p class="bio-hint">${label('dividerNote')}</p>`;
      return `<article class="bio-block" data-block-id="${block.id}" data-block-type="${block.type}"><div class="bio-block-top"><button type="button" class="bio-drag-handle" aria-label="${t('drag')}" title="${t('drag')}">⠿</button><span class="bio-block-number">${String(index+1).padStart(2,'0')}</span><h4>${icons[block.type]} ${t(block.type)}</h4>${controls(block,index)}</div><div class="bio-block-fields" id="bio-block-fields-${block.id}" ${minimized.has(block.id)?'hidden':''}>${fields}</div></article>`;
    }).join('') : `<p class="bio-empty">${t('noBlocks')}</p>`;
    for (const block of state.blocks) {
      $(`[data-block-id="${block.id}"]`).classList.toggle('is-off',block.enabled===false);
      setMinimized(block.id,minimized.has(block.id));
    }
    renderProfileThumbs();
  }
  // This same markup is used for the preview, HTML download and published page.
  function markup() {
    return `<div class="bio-page-blocks">${state.blocks.map(block => {
      if (block.enabled === false) return '';
      if (block.type === 'profile') return `<header class="bio-page-profile">${block.photo ? `<img class="bio-avatar-image" src="${block.photo}" alt="${esc(block.name || '')}">` : `<div class="bio-avatar-letter">${esc((block.name || '').trim().slice(0,1) || 'Z')}</div>`}<h3>${esc(block.name || t('emptyName'))}</h3><p>${esc(block.bio || '')}</p></header>`;
      if (block.type === 'link') return `<a class="bio-page-link" ${validUrl(block.url)?`href="${esc(block.url)}" target="_blank" rel="noopener noreferrer"`:''}>${esc(block.label || t('link'))}<span aria-hidden="true">↗</span></a>`;
      if (block.type === 'heading') return `<h2 class="bio-page-heading">${esc(block.heading || t('heading'))}</h2>`;
      if (block.type === 'text') return `<p class="bio-page-text">${esc(block.text || t('text'))}</p>`;
      if (block.type === 'divider') return '<hr class="bio-page-divider">';
      if (block.type === 'image') return `<figure class="bio-page-image">${block.src ? `<img src="${block.src}" alt="${esc(block.alt || '')}">` : `<div class="bio-image-placeholder">▧<span>${t('previewImage')}</span></div>`}${block.caption?`<figcaption>${esc(block.caption)}</figcaption>`:''}</figure>`;
      return '';
    }).join('')}</div><footer class="bio-page-footer">Made with <a href="${window.ZPROP_PUBLIC_ORIGIN}" target="_blank" rel="noopener noreferrer">ZPROP.</a></footer>`;
  }
  const pageStyles = `.bio-document{box-sizing:border-box;background:var(--bio-bg);color:var(--bio-ink);font-family:Arial,sans-serif;font-size:14px;line-height:1.6;padding:40px 24px 24px;overflow-wrap:anywhere;min-height:100%}.bio-document *{box-sizing:border-box}.bio-document h2,.bio-document h3,.bio-document p,.bio-document figure{margin:0}.bio-page-profile{text-align:center;padding:8px 0}.bio-avatar-image,.bio-avatar-letter{display:block;width:88px;height:88px;border-radius:50%;margin:0 auto 17px;object-fit:cover}.bio-avatar-letter{display:grid;place-items:center;background:var(--bio-accent);color:var(--bio-button-text);font-size:34px}.bio-document .bio-page-profile h3{font-size:25px;font-weight:700;line-height:1.25;margin-bottom:10px;color:inherit}.bio-page-profile p{white-space:pre-wrap;font-size:13px;opacity:.85}.bio-page-blocks{display:flex;flex-direction:column;gap:16px}.bio-document .bio-page-link{display:flex;align-items:center;justify-content:center;gap:12px;position:relative;background:var(--bio-accent);color:var(--bio-button-text);border-radius:var(--bio-radius);padding:15px 32px;text-decoration:none;min-height:50px;font-weight:600;font-size:13px}.bio-page-link>span{position:absolute;right:14px}.bio-page-heading{font-size:20px;font-weight:700;text-align:center;line-height:1.4}.bio-page-text{white-space:pre-wrap;text-align:center}.bio-page-divider{width:100%;border:0;border-top:1px solid currentColor;opacity:.22;margin:6px 0}.bio-page-image img{display:block;max-width:100%;width:100%;height:auto;border-radius:12px}.bio-page-image figcaption{font-size:12px;text-align:center;margin-top:8px;white-space:pre-wrap}.bio-image-placeholder{display:grid;place-content:center;min-height:150px;border:1px dashed currentColor;border-radius:12px;text-align:center;font-size:32px;opacity:.65}.bio-image-placeholder span{font-size:12px}.bio-page-footer{text-align:center;font-size:10px;margin-top:34px;opacity:.65}.bio-page-footer a{color:inherit;font-weight:700;text-decoration:none}`;
  const previewStyles = document.createElement('style'); previewStyles.textContent = pageStyles; document.head.append(previewStyles);
  function variables() { return `--bio-bg:${state.background};--bio-ink:${state.ink};--bio-accent:${state.accent};--bio-button-text:${state.buttonText};--bio-radius:${{rounded:'12px',square:'2px',pill:'40px'}[state.shape]}`; }
  function renderPreview() {
    $('#bio-preview').style.cssText = variables(); $('#bio-preview').innerHTML = markup();
    renderProfileThumbs();
  }
  function renderProfileThumbs() {
    for (const block of state.blocks.filter(item => item.type === 'profile')) {
      const editor = $(`[data-block-id="${block.id}"]`);
      editor.querySelector('[data-profile-thumb]').innerHTML = block.photo ? `<img src="${block.photo}" alt="">` : esc((block.name || '').trim().slice(0,1) || 'Z');
      editor.querySelector('[data-block-action=removePhoto]').hidden = !block.photo;
    }
  }
  $('#bio-preview').addEventListener('click', event => { if (event.target.closest('a')) event.preventDefault(); });
  function tab(name, focus = false) {
    for (const button of document.querySelectorAll('[data-tab]')) { const selected = button.dataset.tab === name; button.setAttribute('aria-selected', selected); button.tabIndex = selected ? 0 : -1; if (selected && focus) button.focus(); }
    $('#bio-content').hidden = name !== 'content'; $('#bio-appearance').hidden = name !== 'appearance';
  }
  for (const button of document.querySelectorAll('[data-tab]')) {
    button.addEventListener('click', () => tab(button.dataset.tab));
    button.addEventListener('keydown', event => { if (['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) { event.preventDefault(); tab(event.key === 'Home' ? 'content' : event.key === 'End' ? 'appearance' : button.dataset.tab === 'content' ? 'appearance' : 'content', true); } });
  }
  const picker = $('#block-picker');
  $('#add-block').addEventListener('click', () => picker.showModal());
  $('#close-block-picker').addEventListener('click', () => picker.close());
  picker.addEventListener('click', event => {
    const type = event.target.closest('[data-add]')?.dataset.add;
    if (!type || publishing) return;
    if (state.blocks.length >= 30) { picker.close(); status('blockLimit', true); return; }
    const block = {id:nextId++,type,...(type==='profile'?{name:'',bio:'',photo:''}:{})}; state.blocks.push(block); picker.close(); renderBlocks(); changed();
    $(`[data-block-id="${block.id}"] .bio-drag-handle`).focus();
  });
  $('#bio-blocks').addEventListener('click', event => {
    const button = event.target.closest('[data-block-action]'); if (!button || publishing) return;
    const id = Number(button.closest('[data-block-id]').dataset.blockId), index = state.blocks.findIndex(block => block.id === id), action = button.dataset.blockAction;
    if (action === 'minimize') { setMinimized(id,!minimized.has(id)); return; }
    let focusId = id;
    if (action === 'toggle') {
      state.blocks[index].enabled = state.blocks[index].enabled === false;
      renderBlocks(); changed(); $(`[data-block-id="${id}"] [data-block-action=toggle]`).focus(); return;
    }
    if (action === 'removePhoto') state.blocks[index].photo = '';
    if (action === 'remove') { minimized.delete(id); state.blocks.splice(index,1); focusId = state.blocks[Math.min(index,state.blocks.length-1)]?.id; }
    if (action === 'duplicate') { if (state.blocks.length >= 30) return status('blockLimit',true); const block = {...state.blocks[index],id:nextId++}; state.blocks.splice(index+1,0,block); focusId=block.id; }
    renderBlocks(); changed(); (focusId ? $(`[data-block-id="${focusId}"] .bio-drag-handle`) : $('#add-block')).focus();
  });
  form.addEventListener('input', event => {
    const input = event.target; if (input.type === 'file') return;
    input.setCustomValidity?.('');
    if (input.dataset.key) { const block = state.blocks.find(item => item.id === Number(input.closest('[data-block-id]').dataset.blockId)); block[input.dataset.key] = input.value; }
    else if (Object.hasOwn(state,input.name) && !['photo','blocks'].includes(input.name)) state[input.name] = input.value;
    changed();
  });
  function imageBytes(value) { return Math.ceil((value?.length || 0) * .75); }
  async function readImage(file) {
    if (!file || !['image/png','image/jpeg','image/webp','image/gif'].includes(file.type) || !file.size || file.size > 5*1024*1024) throw new Error('imageError');
    const data = await new Promise((resolve,reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('imageError')); reader.readAsDataURL(file); });
    const image = new Image(); image.src = data;
    try { await image.decode(); } catch { throw new Error('imageError'); }
    return data;
  }
  form.addEventListener('change', async event => {
    const input = event.target; if (input.type !== 'file' || !input.files[0]) return;
    const activeSlug = library.active?.slug;
    const block = state.blocks.find(item => item.id === Number(input.closest('[data-block-id]').dataset.blockId));
    loading++; $('#publish-bio').disabled = true;
    try {
      const data = await readImage(input.files[0]);
      if (library.active?.slug !== activeSlug) return;
      if (!state.blocks.includes(block)) return;
      const total = state.blocks.reduce((sum,item) => sum + imageBytes(item === block ? data : item.type === 'profile' ? item.photo : item.src),0);
      if (total > 20*1024*1024) throw new Error('imageTotal');
      block[block.type === 'profile' ? 'photo' : 'src'] = data;
      if (block.type === 'image') { const thumb = $(`[data-block-id="${block.id}"] .bio-image-thumb`); thumb.src = data; thumb.hidden = false; }
      changed();
    } catch (error) { status(copy[error.message] ? error.message : 'imageError',true); }
    finally { input.value = ''; loading--; $('#publish-bio').disabled = publishing || loading > 0; }
  });
  function validate() {
    if (loading) { status('imageLoading',true); return false; }
    for (const input of form.querySelectorAll('[data-key=url]')) input.setCustomValidity(validUrl(input.value) ? '' : t('invalidUrl'));
    form.elements.slug.setCustomValidity(form.elements.slug.value && !/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(form.elements.slug.value) ? t('slugError') : '');
    for (const input of form.querySelectorAll('input,textarea,select')) {
      const blockId = input.closest('[data-block-id]')?.dataset.blockId;
      if (blockId && state.blocks.find(block => block.id === Number(blockId))?.enabled === false) continue;
      if (!input.checkValidity()) { tab('content'); if(blockId)setMinimized(Number(blockId),false); input.reportValidity(); return false; }
    }
    const missingImage=state.blocks.find(block => block.enabled !== false && block.type === 'image' && !block.src);
    if (missingImage) { tab('content'); setMinimized(missingImage.id,false); $('[data-block-id="'+missingImage.id+'"] input[type=file]').focus(); status('imageMissing',true); return false; }
    if (state.blocks.reduce((sum,block)=>sum+imageBytes(block.type === 'profile' ? block.photo : block.src),0)>20*1024*1024) { status('imageTotal',true); return false; }
    return true;
  }
  function documentHtml() { const profile = state.blocks.find(block => block.type === 'profile' && block.enabled !== false); return `<!DOCTYPE html><html lang="${language?'en':'ms'}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${esc(profile?.bio || '')}"><title>${esc(profile?.name || form.elements.slug.value || 'Bio page')} — ZPROP</title><style>${pageStyles}html{height:100%;background:${state.background}}body{margin:0;min-height:100%;${variables()}}.bio-document{max-width:520px;margin:auto;min-height:100vh}</style></head><body><main class="bio-document">${markup()}</main></body></html>`; }
  $('[data-action=downloadHtml]').addEventListener('click', () => {
    if (!validate()) return;
    try { const url = URL.createObjectURL(new Blob([documentHtml()],{type:'text/html;charset=utf-8'})); const a = document.createElement('a'); a.href=url; a.download='zprop-page.html'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); status('saved'); } catch { status('downloadError',true); }
  });
  function publishLabel() { $('#publish-bio').firstElementChild.textContent=t(library.active?.published?'saveChanges':'publish'); }
  async function savePage(publish) {
    if (publishing || loading || (publish && !validate())) return;
    if (!form.elements.slug.reportValidity()) return;
    publishing=true; $('#bio-fields').disabled=true; $('#publish-bio').firstElementChild.textContent=t('publishing'); status(''); $('#bio-result').hidden=true;
    try {
      const result = await library.save({slug:form.elements.slug.value,state,html:publish?documentHtml():undefined,publish});
      if (!/^\/sites\/[a-z0-9-]{3,50}\/$/.test(result.url)) throw new Error('server');
      publishedUrl = new URL(result.url,publishBase).href;
      $('#bio-url').href=publishedUrl; $('#bio-url').textContent=publishedUrl; $('#open-bio').href=publishedUrl; $('#bio-result').hidden=!result.published; status(publish?'ready':'draftSaved');
    } catch (error) { status(['taken','busy','notFound','conflict','invalidUrl','imageTotal'].includes(error.message)?error.message:'server',true); }
    finally { publishing=false; $('#bio-fields').disabled=false; publishLabel(); }
  }
  form.addEventListener('submit',event=>{event.preventDefault();savePage(true);});
  $('#save-bio-draft').addEventListener('click',()=>savePage(false));
  $('#copy-bio').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(publishedUrl);status('copied');}catch{status('copyFailed');}});
  document.addEventListener('zprop:language', () => {
    shell(); renderBlocks(); renderPreview(); $('#close-block-picker').setAttribute('aria-label',t('close'));
    if (statusKey) $('#tool-status').textContent=t(statusKey);
    if (publishing) $('#publish-bio').firstElementChild.textContent=t('publishing'); else publishLabel();
  });
  const library=window.ZpropBioLibrary.mount({base,publishBase,t,label,esc,initialState:structuredClone(state),onSelect(record){
    minimized.clear();
    Object.assign(state,window.ZpropBioModel.upgrade(record.state));nextId=Math.max(0,...state.blocks.map(block=>block.id))+1;
    for(const key of ['background','ink','accent','buttonText','shape'])form.elements[key].value=state[key];
    form.elements.slug.value=record.slug;form.querySelectorAll('input,textarea').forEach(input=>input.setCustomValidity(''));
    renderBlocks();renderPreview();tab('content');status('');publishLabel();
    publishedUrl=new URL(record.url,publishBase).href;
    $('#bio-url').href=publishedUrl;$('#bio-url').textContent=publishedUrl;$('#open-bio').href=publishedUrl;$('#bio-result').hidden=!record.published;
  }});
  window.ZpropBioDrag({container:$('#bio-blocks'),onOrder(ids){
    const blocks=new Map(state.blocks.map(block=>[block.id,block]));state.blocks=ids.map(id=>blocks.get(id));changed();
  },onFinish:renderBlocks,announce(position){$('#bio-reorder-status').textContent=t('moved')+' '+position;}});
  renderBlocks(); renderPreview(); $('#close-block-picker').setAttribute('aria-label',t('close'));
  window.ZpropNavigation?.ready();
  library.load();
})();
