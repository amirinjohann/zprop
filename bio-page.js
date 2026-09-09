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
  Object.assign(copy, {
    templates:['Templat permulaan','Starter templates'], templatesHelp:['Pilih gaya sebagai permulaan, kemudian sesuaikan warna anda. Kandungan anda dikekalkan.','Start with a look, then customize your colors. Your content stays in place.'],
    botanical:['Botani','Botanical'], studio:['Studio','Studio'], midnight:['Tengah malam','Midnight'], rose:['Mawar','Rose'], ocean:['Lautan','Ocean'], sunset:['Senja','Sunset'],
    blockDetails:['Butiran blok','Block details'], detailsHelp:['Isi maklumat penting dahulu. Anda boleh menambah butiran lain selepas ini.','Fill in the essentials first. You can add other details later.'], back:['Kembali','Back'], requiredContent:['Isi ruangan ini.','Please fill in this field.']
  });
  Object.assign(copy, {
    social:['Media sosial','Social links'], socialHelp:['Tiga pautan bulat ke profil sosial anda.','Three circular links to your social profiles.'], socialNote:['Dipaparkan di bawah kandungan halaman. Isi pautan pertama; dua lagi adalah pilihan.','Shown below your page content. Add your first link; the other two are optional.'], socialSlot:['Pautan sosial','Social link'], platform:['Platform','Platform'], socialUrl:['URL profil','Profile URL'], optional:['pilihan','optional'], addSocial:['Tambah pautan sosial','Add social links'], editSocial:['Edit pautan sosial','Edit social links']
  });
  const socialPlatforms = window.ZpropBioModel.socialPlatforms;
  const socialDefaults = ['instagram','facebook','tiktok'];
  const socialPaths = {
    instagram:'<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none"/>',
    facebook:'<path d="M14 21v-8h3l.5-4H14V7c0-1.2.5-2 2-2h2V2h-3c-3 0-5 2-5 5v2H7v4h3v8"/>',
    tiktok:'<path d="M14 3v12a4 4 0 1 1-4-4M14 3c0 4 3 6 6 6"/>',
    x:'<path d="m4 3 16 18h-4L3 3h4l14 18M20 3 4 21"/>',
    linkedin:'<path d="M4 9v12M9 21V9h4v2c1-3 7-3 7 2v8M13 21v-7"/><circle cx="4" cy="4" r="1"/>',
    youtube:'<rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 5 3-5 3Z"/>'
  };
  const socialIcon = platform => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(socialPaths[platform] || socialPaths.instagram)+'</svg>';
  function socialFields(block = {}, editing = false) {
    return '<p class="bio-hint">'+label('socialNote')+'</p>'+[1,2,3].map(slot => {
      const platform = block['platform'+slot] || socialDefaults[slot-1];
      const attr = key => editing ? 'data-key="'+key+'"' : 'name="'+key+'"';
      return `<fieldset class="bio-social-slot"><legend>${t('socialSlot')} ${slot}${slot>1?' ('+t('optional')+')':''}</legend><label>${label('platform')}<select ${attr('platform'+slot)}>${Object.entries(socialPlatforms).map(([value,name]) => `<option value="${value}" ${value===platform?'selected':''}>${name}</option>`).join('')}</select></label><label>${label('socialUrl')}<input ${attr('url'+slot)} type="url" value="${esc(block['url'+slot] || '')}" placeholder="https://" maxlength="4096" ${slot===1?'required':''}></label></fieldset>`;
    }).join('');
  }
  function socialMarkup(preview = false) {
    const block = state.blocks.find(item => item.type === 'social');
    if (block?.enabled === false || (!block && !preview)) return '';
    const links = [1,2,3].map(slot => {
      const platform = block?.['platform'+slot] || socialDefaults[slot-1], url = block?.['url'+slot];
      if (validUrl(url)) return `<a class="bio-social-circle" href="${esc(url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(socialPlatforms[platform])}" title="${esc(socialPlatforms[platform])}">${socialIcon(platform)}</a>`;
      return preview ? `<button type="button" class="bio-social-circle bio-social-empty" data-setup-social="${slot}" aria-label="${t(block?'editSocial':'addSocial')}: ${socialPlatforms[platform]}" title="${t(block?'editSocial':'addSocial')}">${socialIcon(platform)}</button>` : '';
    }).join('');
    return links ? `<nav class="bio-page-social" aria-label="${t('social')}">${links}</nav>` : '';
  }
  const appearanceKeys = ['background','ink','accent','buttonText','shape'];
  const templates = [
    {id:'botanical',background:'#f6f5ef',ink:'#203e33',accent:'#203e33',buttonText:'#ffffff',shape:'rounded'},
    {id:'studio',background:'#ffffff',ink:'#202020',accent:'#202020',buttonText:'#ffffff',shape:'square'},
    {id:'midnight',background:'#141b2d',ink:'#f0f2ff',accent:'#bfcaff',buttonText:'#141b2d',shape:'rounded'},
    {id:'rose',background:'#fff1f2',ink:'#652d42',accent:'#9d3e60',buttonText:'#ffffff',shape:'pill'},
    {id:'ocean',background:'#edf8fb',ink:'#174459',accent:'#21647d',buttonText:'#ffffff',shape:'pill'},
    {id:'sunset',background:'#fff3e5',ink:'#653725',accent:'#a64728',buttonText:'#ffffff',shape:'rounded'}
  ];
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
  const blockTypes = ['profile','link','text','heading','image','divider','social'];
  const icons = {profile:'♙', link:'↗', text:'¶', heading:'T', image:'▧', divider:'—', social:'@'};
  const field = (key, value, attrs = '') => `<label>${label(key)}<input name="${key}" value="${esc(value)}" ${attrs}></label>`;
  $('#tool-workspace').innerHTML = `<div class="bio-builder"><form id="tool-form" class="tool-editor" novalidate><fieldset id="bio-fields"><h2 class="workspace-title">${label('editor')}</h2>
    <div class="bio-tabs" role="tablist" aria-label="Bio editor"><button type="button" role="tab" id="bio-content-tab" aria-controls="bio-content" aria-selected="true" data-tab="content">${label('content')}</button><button type="button" role="tab" id="bio-appearance-tab" aria-controls="bio-appearance" aria-selected="false" tabindex="-1" data-tab="appearance">${label('appearance')}</button></div>
    <section id="bio-content" role="tabpanel" aria-labelledby="bio-content-tab">
    <div class="bio-block-heading"><div><h3>${label('blocks')}</h3><p class="bio-hint">${label('blocksHelp')}</p></div><button type="button" id="add-block" class="bio-add">+ ${label('add')}</button></div><div id="bio-blocks"></div></section>
    <section id="bio-appearance" role="tabpanel" aria-labelledby="bio-appearance-tab" hidden><h3>${label('styleTitle')}</h3><p class="bio-hint">${label('styleHelp')}</p><section class="bio-templates" aria-labelledby="bio-templates-title"><h4 id="bio-templates-title">${label('templates')}</h4><p class="bio-hint">${label('templatesHelp')}</p><div id="bio-template-grid" class="bio-template-grid"></div></section><div class="bio-colors">${['background','ink','accent','buttonText'].map(key => field(key,state[key],'type="color"')).join('')}</div><label>${label('buttonStyle')}<select name="shape">${['rounded','square','pill'].map(key => `<option value="${key}" data-bio-copy="${key}">${t(key)}</option>`).join('')}</select></label></section>
    <div class="bio-publish"><label>${label('slug')}<div class="bio-address"><span>zprop.tech/sites/</span><input name="slug" maxlength="50" pattern="[a-z0-9][a-z0-9-]{1,48}[a-z0-9]" placeholder="my-bio" aria-describedby="bio-slug-help"></div></label><p class="bio-hint" id="bio-slug-help">${label('slugHelp')}</p><div class="tool-actions"><button type="button" data-action="downloadHtml">${label('downloadHtml')}</button><button type="submit" class="primary" id="publish-bio">${label('publish')} ↗</button></div></div></fieldset><p id="tool-status" class="tool-status" role="status" aria-live="polite"></p><section id="bio-result" class="bio-result" hidden><h3>${label('ready')}</h3><a id="bio-url" target="_blank" rel="noopener noreferrer"></a><div class="tool-actions"><a id="open-bio" target="_blank" rel="noopener noreferrer">${label('open')} ↗</a><button type="button" id="copy-bio">${label('copy')}</button></div></section></form>
    <aside class="bio-preview-column"><div class="bio-preview-heading"><span class="bio-live-dot"></span><h2>${label('preview')}</h2><span aria-hidden="true">↗</span></div><div class="bio-phone"><div class="bio-phone-camera" aria-hidden="true"></div><div class="bio-phone-screen"><main id="bio-preview" class="bio-document"></main></div></div><p class="bio-hint bio-preview-hint">${label('previewHint')}</p></aside></div>
    <dialog id="block-picker" class="bio-dialog" aria-labelledby="block-picker-title"><div class="bio-dialog-heading"><h2 id="block-picker-title">${label('choose')}</h2><button type="button" id="close-block-picker">×</button></div><div class="bio-block-types">${blockTypes.map(type => `<button type="button" data-add="${type}"><span class="bio-type-icon" aria-hidden="true">${icons[type]}</span><span><strong>${label(type)}</strong><small>${label(type === 'image' ? 'imageBlockHelp' : type + 'Help')}</small></span><span aria-hidden="true">+</span></button>`).join('')}</div><form id="block-details-form" hidden novalidate><button type="button" id="back-block-picker" class="bio-text-button">${label('back')}</button><h3 id="block-details-type"></h3><p class="bio-hint">${label('detailsHelp')}</p><fieldset id="block-details-fields"></fieldset><p id="block-details-status" class="tool-status" role="status"></p><button type="submit" id="confirm-add-block" class="bio-add bio-full-button">${label('add')}</button></form></dialog>`;
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
    return `<div class="bio-block-controls"><button type="button" data-block-action="minimize" aria-expanded="${!minimized.has(block.id)}" aria-controls="bio-block-fields-${block.id}" aria-label="${t(minimized.has(block.id)?'expand':'minimize')}" title="${t(minimized.has(block.id)?'expand':'minimize')}">${minimized.has(block.id)?'+':'−'}</button><button type="button" class="bio-status-toggle" data-block-action="toggle" role="switch" aria-checked="${block.enabled!==false}" aria-label="${t('blockStatus')}: ${t(block.type)} ${index+1}" title="${t('statusHelp')}"><span class="bio-switch-track" aria-hidden="true"></span><span>${t(block.enabled===false?'disabled':'enabled')}</span></button>${[['duplicate','⧉'],['remove','×']].map(([action,icon]) => `<button type="button" data-block-action="${action}" ${action==='duplicate' && block.type==='social'?'disabled':''} aria-label="${t(action)}" title="${t(action)}">${icon}</button>`).join('')}</div>`;
  }
  function renderBlocks() {
    $('#bio-blocks').innerHTML = state.blocks.length ? state.blocks.map((block,index) => {
      const input = (key, attrs='') => `<label>${label(key)}<input data-key="${key}" value="${esc(block[key] || '')}" ${attrs}></label>`;
      let fields = '';
      if (block.type === 'profile') fields = `<div class="bio-photo-row"><div data-profile-thumb class="bio-photo-thumb" aria-hidden="true"></div><div><label>${label('photo')}<input name="photo" data-key="photo" type="file" accept="image/png,image/jpeg,image/webp,image/gif" aria-describedby="bio-image-help-${block.id}"></label><button type="button" data-block-action="removePhoto" class="bio-text-button" ${block.photo?'':'hidden'}>${label('removePhoto')}</button></div></div><p class="bio-hint" id="bio-image-help-${block.id}">${label('imageHelp')}</p>` + input('name','name="name" maxlength="100" required') + `<label>${label('bio')}<textarea data-key="bio" name="bio" maxlength="1000">${esc(block.bio || '')}</textarea></label>`;
      if (block.type === 'link') fields = input('label','maxlength="100" required') + input('url','type="url" placeholder="https://" maxlength="4096" required');
      if (['text','heading'].includes(block.type)) fields = block.type === 'text' ? `<label>${label('text')}<textarea data-key="text" maxlength="3000" required>${esc(block.text || '')}</textarea></label>` : input('heading','maxlength="200" required');
      if (block.type === 'image') fields = `<label>${label('imageFile')}<input type="file" data-key="image" accept="image/png,image/jpeg,image/webp,image/gif"></label><p class="bio-hint">${label('imageHelp')}</p><img class="bio-image-thumb" ${block.src ? `src="${block.src}"` : 'hidden'} alt="">` + input('alt','maxlength="200"') + input('caption','maxlength="300"');
      if (block.type === 'social') fields = socialFields(block,true);
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
  function markup(preview = false) {
    return `<div class="bio-page-blocks">${state.blocks.map(block => {
      if (block.enabled === false) return '';
      if (block.type === 'profile') return `<header class="bio-page-profile">${block.photo ? `<img class="bio-avatar-image" src="${block.photo}" alt="${esc(block.name || '')}">` : `<div class="bio-avatar-letter">${esc((block.name || '').trim().slice(0,1) || 'Z')}</div>`}<h3>${esc(block.name || t('emptyName'))}</h3><p>${esc(block.bio || '')}</p></header>`;
      if (block.type === 'link') return `<a class="bio-page-link" ${validUrl(block.url)?`href="${esc(block.url)}" target="_blank" rel="noopener noreferrer"`:''}>${esc(block.label || t('link'))}<span aria-hidden="true">↗</span></a>`;
      if (block.type === 'heading') return `<h2 class="bio-page-heading">${esc(block.heading || t('heading'))}</h2>`;
      if (block.type === 'text') return `<p class="bio-page-text">${esc(block.text || t('text'))}</p>`;
      if (block.type === 'divider') return '<hr class="bio-page-divider">';
      if (block.type === 'image') return `<figure class="bio-page-image">${block.src ? `<img src="${block.src}" alt="${esc(block.alt || '')}">` : `<div class="bio-image-placeholder">▧<span>${t('previewImage')}</span></div>`}${block.caption?`<figcaption>${esc(block.caption)}</figcaption>`:''}</figure>`;
      return '';
    }).join('')}</div>${socialMarkup(preview)}<footer class="bio-page-footer">Made with <a href="${window.ZPROP_PUBLIC_ORIGIN}" target="_blank" rel="noopener noreferrer">ZPROP.</a></footer>`;
  }
  const pageStyles = `.bio-document{box-sizing:border-box;background:var(--bio-bg);color:var(--bio-ink);font-family:Arial,sans-serif;font-size:14px;line-height:1.6;padding:40px 24px 24px;overflow-wrap:anywhere;min-height:100%}.bio-document *{box-sizing:border-box}.bio-document h2,.bio-document h3,.bio-document p,.bio-document figure{margin:0}.bio-page-profile{text-align:center;padding:8px 0}.bio-avatar-image,.bio-avatar-letter{display:block;width:88px;height:88px;border-radius:50%;margin:0 auto 17px;object-fit:cover}.bio-avatar-letter{display:grid;place-items:center;background:var(--bio-accent);color:var(--bio-button-text);font-size:34px}.bio-document .bio-page-profile h3{font-size:25px;font-weight:700;line-height:1.25;margin-bottom:10px;color:inherit}.bio-page-profile p{white-space:pre-wrap;font-size:13px;opacity:.85}.bio-page-blocks{display:flex;flex-direction:column;gap:16px}.bio-document .bio-page-link{display:flex;align-items:center;justify-content:center;gap:12px;position:relative;background:var(--bio-accent);color:var(--bio-button-text);border-radius:var(--bio-radius);padding:15px 32px;text-decoration:none;min-height:50px;font-weight:600;font-size:13px}.bio-page-link>span{position:absolute;right:14px}.bio-page-heading{font-size:20px;font-weight:700;text-align:center;line-height:1.4}.bio-page-text{white-space:pre-wrap;text-align:center}.bio-page-divider{width:100%;border:0;border-top:1px solid currentColor;opacity:.22;margin:6px 0}.bio-page-image img{display:block;max-width:100%;width:100%;height:auto;border-radius:12px}.bio-page-image figcaption{font-size:12px;text-align:center;margin-top:8px;white-space:pre-wrap}.bio-image-placeholder{display:grid;place-content:center;min-height:150px;border:1px dashed currentColor;border-radius:12px;text-align:center;font-size:32px;opacity:.65}.bio-image-placeholder span{font-size:12px}.bio-page-footer{text-align:center;font-size:10px;margin-top:34px;opacity:.65}.bio-page-footer a{color:inherit;font-weight:700;text-decoration:none}.bio-page-social{display:flex;justify-content:center;gap:14px;margin:28px 0 0}.bio-document .bio-social-circle{display:grid;place-items:center;flex-shrink:0;width:44px;height:44px;padding:11px;border:1px solid transparent;border-radius:50%;background:var(--bio-accent);color:var(--bio-button-text);text-decoration:none;cursor:pointer}.bio-social-circle svg{display:block;width:20px;height:20px}.bio-social-circle:hover{opacity:.8}.bio-social-circle:focus-visible{outline:2px solid var(--bio-ink);outline-offset:4px}.bio-document .bio-social-empty{border:1px dashed currentColor;background:transparent;color:var(--bio-ink);opacity:.6}`;
  const previewStyles = document.createElement('style'); previewStyles.textContent = pageStyles; document.head.append(previewStyles);
  function variables() { return `--bio-bg:${state.background};--bio-ink:${state.ink};--bio-accent:${state.accent};--bio-button-text:${state.buttonText};--bio-radius:${{rounded:'12px',square:'2px',pill:'40px'}[state.shape]}`; }
  function renderTemplates() {
    $('#bio-template-grid').innerHTML = templates.map(template => `<button type="button" class="bio-template" data-template="${template.id}" aria-pressed="${appearanceKeys.every(key => state[key] === template[key])}"><span class="bio-template-sample" aria-hidden="true" style="--sample-bg:${template.background};--sample-ink:${template.ink};--sample-accent:${template.accent};--sample-button-text:${template.buttonText};--sample-radius:${{rounded:'6px',square:'1px',pill:'20px'}[template.shape]}"><span class="bio-template-avatar">A</span><span class="bio-template-line"></span><span class="bio-template-link">Aa</span><span class="bio-template-link">Aa</span><span class="bio-template-social">${socialDefaults.map(platform => `<span>${socialIcon(platform)}</span>`).join('')}</span></span><span>${t(template.id)}</span></button>`).join('');
  }
  $('#bio-template-grid').addEventListener('click', event => {
    const template = templates.find(item => item.id === event.target.closest('[data-template]')?.dataset.template);
    if (!template || publishing) return;
    for (const key of appearanceKeys) { state[key] = template[key]; form.elements[key].value = template[key]; }
    changed();
    $('#bio-template-grid [data-template="'+template.id+'"]').focus();
  });
  function renderPreview() {
    $('#bio-preview').style.cssText = variables(); $('#bio-preview').innerHTML = markup(true);
    renderProfileThumbs(); renderTemplates();
  }
  function renderProfileThumbs() {
    for (const block of state.blocks.filter(item => item.type === 'profile')) {
      const editor = $(`[data-block-id="${block.id}"]`);
      editor.querySelector('[data-profile-thumb]').innerHTML = block.photo ? `<img src="${block.photo}" alt="">` : esc((block.name || '').trim().slice(0,1) || 'Z');
      editor.querySelector('[data-block-action=removePhoto]').hidden = !block.photo;
    }
  }
  $('#bio-preview').addEventListener('click', event => {
    const setup = event.target.closest('[data-setup-social]');
    if (setup && !publishing) {
      const block = state.blocks.find(item => item.type === 'social');
      if (block) { tab('content'); setMinimized(block.id,false); $('[data-block-id="'+block.id+'"] [data-key=url'+setup.dataset.setupSocial+']').focus(); }
      else { tab('content'); $('#add-block').click(); if(picker.open)picker.querySelector('[data-add=social]').click(); }
    }
    if (event.target.closest('a') && !event.target.closest('.bio-page-social')) event.preventDefault();
  });
  function tab(name, focus = false) {
    for (const button of document.querySelectorAll('[data-tab]')) { const selected = button.dataset.tab === name; button.setAttribute('aria-selected', selected); button.tabIndex = selected ? 0 : -1; if (selected && focus) button.focus(); }
    $('#bio-content').hidden = name !== 'content'; $('#bio-appearance').hidden = name !== 'appearance';
  }
  for (const button of document.querySelectorAll('[data-tab]')) {
    button.addEventListener('click', () => tab(button.dataset.tab));
    button.addEventListener('keydown', event => { if (['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) { event.preventDefault(); tab(event.key === 'Home' ? 'content' : event.key === 'End' ? 'appearance' : button.dataset.tab === 'content' ? 'appearance' : 'content', true); } });
  }
  const picker = $('#block-picker'), detailsForm = $('#block-details-form');
  let pendingBlock = null;
  function resetPicker() {
    pendingBlock = null;
    detailsForm.hidden = true; detailsForm.reset(); $('#block-details-fields').replaceChildren();
    $('.bio-block-types').hidden = false;
    picker.querySelector('[data-add=social]').disabled = state.blocks.some(block => block.type === 'social');
    $('#block-picker-title').innerHTML = label('choose');
    $('#block-details-status').textContent = '';
    $('#block-details-fields').disabled = false; $('#confirm-add-block').disabled = false;
  }
  $('#add-block').addEventListener('click', () => {
    if (state.blocks.length >= 30) return status('blockLimit',true);
    resetPicker(); picker.showModal();
  });
  $('#close-block-picker').addEventListener('click', () => picker.close());
  picker.addEventListener('close', resetPicker);
  $('#back-block-picker').addEventListener('click', () => {
    const type = pendingBlock?.type; resetPicker();
    picker.querySelector('[data-add="'+type+'"]').focus();
  });
  picker.addEventListener('click', event => {
    const type = event.target.closest('[data-add]')?.dataset.add;
    if (!type || publishing || (type === 'social' && state.blocks.some(block => block.type === 'social'))) return;
    pendingBlock = {type};
    $('.bio-block-types').hidden = true; detailsForm.hidden = false;
    $('#block-picker-title').innerHTML = label('blockDetails');
    $('#block-details-type').innerHTML = label(type);
    const input = (key, attrs = '') => `<label>${label(key)}<input name="${key}" ${attrs} required></label>`;
    let fields = '';
    if (type === 'profile') fields = input('name','maxlength="100" autocomplete="name"');
    if (type === 'link') fields = input('label','maxlength="100"') + input('url','type="url" placeholder="https://" maxlength="4096"');
    if (type === 'text') fields = `<label>${label('text')}<textarea name="text" maxlength="3000" required></textarea></label>`;
    if (type === 'heading') fields = input('heading','maxlength="200"');
    if (type === 'image') fields = input('imageFile','type="file" accept="image/png,image/jpeg,image/webp,image/gif"') + `<p class="bio-hint">${label('imageHelp')}</p>`;
    if (type === 'social') fields = socialFields();
    if (type === 'divider') fields = `<p class="bio-hint">${label('dividerNote')}</p>`;
    $('#block-details-fields').innerHTML = fields;
    (detailsForm.querySelector('input,textarea') || $('#confirm-add-block')).focus();
  });
  detailsForm.addEventListener('input', event => { event.target.setCustomValidity?.(''); $('#block-details-status').textContent = ''; });
  detailsForm.addEventListener('submit', async event => {
    event.preventDefault();
    const draft = pendingBlock;
    if (!draft || publishing || $('#confirm-add-block').disabled) return;
    for (const input of detailsForm.querySelectorAll('input:not([type=file]),textarea')) {
      input.setCustomValidity(input.required && !input.value.trim() ? t('requiredContent') : input.type === 'url' && input.value.trim() && !validUrl(input.value) ? t('invalidUrl') : '');
    }
    if (!detailsForm.reportValidity()) return;
    const block = {type:draft.type};
    for (const input of detailsForm.querySelectorAll('input:not([type=file]),textarea,select')) block[input.name] = input.value.trim();
    if (draft.type === 'profile') Object.assign(block,{bio:'',photo:''});
    if (draft.type === 'image') {
      const file = detailsForm.elements.imageFile.files[0];
      $('#confirm-add-block').disabled = true; $('#block-details-fields').disabled = true;
      $('#block-details-status').textContent = t('imageLoading');
      try {
        block.src = await readImage(file);
        if (pendingBlock !== draft) return;
        const total = state.blocks.reduce((sum,item) => sum + imageBytes(item.type === 'profile' ? item.photo : item.src),imageBytes(block.src));
        if (total > 20*1024*1024) throw new Error('imageTotal');
        Object.assign(block,{alt:'',caption:''});
      } catch (error) {
        if (pendingBlock === draft) $('#block-details-status').textContent = t(copy[error.message] ? error.message : 'imageError');
        return;
      } finally {
        if (pendingBlock === draft) { $('#confirm-add-block').disabled = false; $('#block-details-fields').disabled = false; }
      }
    }
    if (pendingBlock !== draft || !picker.open) return;
    if (state.blocks.length >= 30) { $('#block-details-status').textContent = t('blockLimit'); return; }
    block.id = nextId++; state.blocks.push(block); minimized.add(block.id);
    picker.close(); renderBlocks(); changed();
    $('[data-block-id="'+block.id+'"] [data-block-action=minimize]').focus();
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
    if (action === 'duplicate') { if(state.blocks[index].type === 'social')return; if (state.blocks.length >= 30) return status('blockLimit',true); const block = {...state.blocks[index],id:nextId++}; state.blocks.splice(index+1,0,block); minimized.add(block.id); focusId=block.id; }
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
    for (const input of form.querySelectorAll('input[type=url]')) input.setCustomValidity((!input.required && !input.value.trim()) || validUrl(input.value) ? '' : t('invalidUrl'));
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
    state.blocks.forEach(block => minimized.add(block.id));
    for(const key of appearanceKeys)form.elements[key].value=state[key];
    form.elements.slug.value=record.slug;form.querySelectorAll('input,textarea').forEach(input=>input.setCustomValidity(''));
    renderBlocks();renderPreview();tab('content');status('');publishLabel();
    publishedUrl=new URL(record.url,publishBase).href;
    $('#bio-url').href=publishedUrl;$('#bio-url').textContent=publishedUrl;$('#open-bio').href=publishedUrl;$('#bio-result').hidden=!record.published;
  }});
  window.ZpropBioDrag({container:$('#bio-blocks'),onOrder(ids){
    const blocks=new Map(state.blocks.map(block=>[block.id,block]));state.blocks=ids.map(id=>blocks.get(id));changed();
  },onFinish:renderBlocks,announce(position){$('#bio-reorder-status').textContent=t('moved')+' '+position;}});
  state.blocks.forEach(block => minimized.add(block.id));
  renderBlocks(); renderPreview(); $('#close-block-picker').setAttribute('aria-label',t('close'));
  window.ZpropNavigation?.ready();
  library.load();
})();
