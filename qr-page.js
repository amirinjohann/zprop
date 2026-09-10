(async () => {
  'use strict';
  const base = new URL('.', document.currentScript.src);
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const tool = window.ZPROP_TOOLS.find(item => item.id === 'qr-codes');
  const copy = {
    myCodes:['Kod QR anda','Your QR codes'], manageHelp:['Cipta, edit dan urus semua kod QR anda.','Create, edit and manage all your QR codes.'], createNew:['Cipta kod QR','Create QR code'], edit:['Edit','Edit'], remove:['Padam kod QR','Delete QR code'], saved:['Disimpan','Saved'], noCodes:['Belum ada kod QR.','No QR codes yet.'], noCodesHelp:['Cipta kod QR pertama anda untuk bermula.','Create your first QR code to get started.'], loading:['Memuatkan kod QR…','Loading QR codes…'], retry:['Cuba semula','Try again'], loadError:['Kod QR tidak dapat dimuatkan. Cuba semula.','Could not load your QR codes. Try again.'], server:['Kod QR tidak dapat disimpan. Semak sambungan dan cuba semula.','Could not save your QR code. Check your connection and try again.'], saving:['Menyimpan kod QR…','Saving QR code…'], update:['Kemas kini kod QR','Update QR code'], updated:['Kod QR dikemas kini. Muat turun semula untuk menggunakan versi baharu.','QR code updated. Download it again to use the new version.'], cancel:['Batal','Cancel'], cancelEdit:['Batal edit','Cancel editing'], unsaved:['Perubahan belum disimpan','Unsaved changes'], discard:['Buang perubahan yang belum disimpan?','Discard unsaved changes?'], deleteHelp:['Padam kod QR ini daripada akaun anda? Fail QR yang telah dimuat turun masih boleh diimbas.','Delete this QR code from your account? Previously downloaded QR files can still be scanned.'], deleteError:['Kod QR tidak dapat dipadam. Cuba semula.','Could not delete your QR code. Try again.'], conflict:['Kod QR telah diubah di tempat lain. Kembali ke senarai dan buka semula sebelum mengedit.','This QR code was changed elsewhere. Return to the list and reopen it before editing.'], notFound:['Kod QR ini tidak lagi tersedia. Kembali ke senarai kod QR anda.','This QR code is no longer available. Return to your QR code list.'], origin:['Buka alatan pada pelayan ZPROP dan cuba semula.','Open the tool on the ZPROP server and try again.'], busy:['Pelayan sedang sibuk. Cuba lagi sebentar.','The server is busy. Try again shortly.'], itemLimit:['Anda boleh menyimpan sehingga 5 item untuk alatan ini. Padam satu untuk menambah yang baharu.','You can save up to 5 items in this tool. Delete one to add another.'], editingHint:['Ubah maklumat dan tekan Kemas kini kod QR untuk menyimpan dan melihat pratonton.','Edit your details and press Update QR code to save and preview.'],
    suite:['ALATAN ZPROP','ZPROP TOOLS'], sidebarNote:['Identiti sendiri.<br>Ruang milik anda.','Your own identity.<br>Your own space.'], allTools:['Semua alatan','All tools'], help:['Perlukan bantuan?','Need help?'],
    editor:['Cipta kod QR','Create QR code'], types:['Jenis kod QR','QR code type'], url:['URL','URL'], whatsapp:['WhatsApp','WhatsApp'], location:['Location','Location'], event:['Event','Event'], vcard:['Vcard','Vcard'],
    name:['Nama kod QR','QR code name'], nameHint:['Pilihan. Digunakan sebagai nama fail muat turun.','Optional. Used as the download filename.'], destination:['URL destinasi','Destination URL'], urlHint:['Masukkan pautan lengkap bermula dengan https:// atau http://.','Enter a full link starting with https:// or http://.'],
    phone:['Nombor WhatsApp','WhatsApp number'], phoneHint:['Sertakan kod negara, contoh +60123456789.','Include the country code, for example +60123456789.'], message:['Mesej (pilihan)','Message (optional)'],
    latitude:['Latitud','Latitude'], longitude:['Longitud','Longitude'], locationHint:['Masukkan koordinat destinasi. Imbasan membuka lokasi dalam Google Maps.','Enter your destination coordinates. Scanning opens the location in Google Maps.'],
    eventTitle:['Tajuk acara','Event title'], start:['Tarikh & masa mula','Start date & time'], end:['Tarikh & masa tamat','End date & time'], eventLocation:['Lokasi acara (pilihan)','Event location (optional)'], description:['Penerangan (pilihan)','Description (optional)'], timezone:['Zon waktu peranti:','Device time zone:'],
    firstName:['Nama pertama','First name'], lastName:['Nama akhir (pilihan)','Last name (optional)'], company:['Syarikat (pilihan)','Company (optional)'], jobTitle:['Jawatan (pilihan)','Job title (optional)'], contactPhone:['Telefon (pilihan)','Phone (optional)'], email:['E-mel (pilihan)','Email (optional)'], website:['Laman web (pilihan)','Website (optional)'], address:['Alamat (pilihan)','Address (optional)'],
    appearance:['Warna & saiz','Colors & size'], foreground:['Warna kod','Code color'], background:['Warna latar','Background color'], size:['Saiz PNG','PNG size'], colorHint:['Gunakan kod gelap pada latar cerah untuk memudahkan imbasan.','Use a dark code on a light background for easier scanning.'],
    create:['Cipta kod QR','Create QR code'], preview:['Pratonton','Preview'], empty:['Kod QR anda bermula di sini.','Your QR code starts here.'], emptyHint:['Pilih jenis, isi maklumat dan tekan Cipta kod QR untuk melihat pratonton.','Choose a type, enter your details and press Create QR code to see a preview.'], scanHint:['Imbas untuk semak sebelum mencetak atau berkongsi.','Scan to check before printing or sharing.'], content:['Kandungan QR','QR content'], png:['Muat turun PNG','Download PNG'], svg:['Muat turun SVG','Download SVG'], ready:['Kod QR sedia untuk dimuat turun.','Your QR code is ready to download.'], downloaded:['Fail QR telah disediakan untuk muat turun.','Your QR file is ready to download.'],
    required:['Lengkapkan maklumat yang diperlukan.','Complete the required details.'], invalidUrl:['Masukkan URL http:// atau https:// yang sah tanpa nama pengguna atau kata laluan.','Enter a valid http:// or https:// URL without a username or password.'], invalidPhone:['Masukkan nombor dengan kod negara, 7–15 digit, tanpa sifar di hadapan.','Enter a number with country code, 7–15 digits, without a leading zero.'], invalidCoordinates:['Latitud mestilah antara −90 dan 90, longitud antara −180 dan 180.','Latitude must be between −90 and 90; longitude between −180 and 180.'], invalidDate:['Masukkan tarikh dan masa yang sah.','Enter a valid date and time.'], invalidEnd:['Masa tamat mesti selepas masa mula.','The end time must be after the start time.'], invalidEmail:['Masukkan alamat e-mel yang sah.','Enter a valid email address.'], invalidColors:['Pilih kod lebih gelap dan latar lebih cerah dengan kontras yang mencukupi.','Choose a darker code and a lighter background with enough contrast.'], tooLong:['Kandungan terlalu panjang untuk kod QR. Pendekkan maklumat anda.','The content is too long for a QR code. Shorten your details.'], downloadError:['Muat turun gagal. Sila cuba lagi.','Download failed. Please try again.']
  };
  let language = document.documentElement.lang === 'en' ? 1 : 0;
  const t = key => copy[key][language];
  const text = key => `<span data-qr-copy="${key}">${t(key)}</span>`;
  let statusKey = '', errorField = '', active = 'url', current = null, activeRecord = null, dirty = false, busy = false;
  let eventIdentity = { uid:crypto.randomUUID() + '@zprop.tech', created:new Date(), timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone };
  function localizeShell() {
    language = document.documentElement.lang === 'en' ? 1 : 0;
    document.title = tool.name[language] + ' — ZPROP';
    $('meta[name="description"]').content = tool.description[language];
    for (const [id, key] of [['title','title'],['tag','tag'],['description','description'],['availability','availability']]) $('#tool-' + id).textContent = tool[key][language];
    $('#tool-capabilities').replaceChildren(...tool.features.map(feature => { const span = document.createElement('span'); span.textContent = '✓ ' + feature[language]; return span; }));
    $$('[data-tool-name]').forEach(el => el.textContent = window.ZPROP_TOOLS.find(item => item.id === el.dataset.toolName).name[language]);
    $$('[data-tool-copy]').forEach(el => el.innerHTML = t(el.dataset.toolCopy));
  }
  localizeShell();
  window.ZpropLanguage?.ready();
  document.addEventListener('zprop:language', localizeShell);
  if (!window.ZpropAuth || !await window.ZpropAuth.ready) return;
  document.removeEventListener('zprop:language', localizeShell);
  const field = (name, label = name, type = 'text', extra = '') => `<label>${text(label)}<input name="${name}" type="${type}" maxlength="300" ${extra}></label>`;
  const area = (name, max = 600) => `<label>${text(name)}<textarea name="${name}" maxlength="${max}" rows="3"></textarea></label>`;
  const hint = key => `<p class="qr-hint" id="${key}">${text(key)}</p>`;
  const types = ['url','whatsapp','location','event','vcard'];
  const icons = ['↗','◉','⌖','▦','♙'];
  $('#tool-workspace').innerHTML = `<h2 class="workspace-title">${text('editor')}</h2>
    <div class="qr-types" role="tablist" aria-label="${t('types')}">${types.map((type, i) => `<button type="button" role="tab" id="qr-tab-${type}" data-qr-type="${type}" aria-selected="${i === 0}" aria-controls="qr-panel-${type}" tabindex="${i === 0 ? 0 : -1}"><span aria-hidden="true">${icons[i]}</span>${text(type)}</button>`).join('')}</div>
    <div class="workspace-grid qr-workspace"><form id="tool-form" class="tool-editor" novalidate>
    ${field('name', 'name', 'text', 'placeholder="my-qr-code" aria-describedby="nameHint"')}${hint('nameHint')}
    <fieldset id="qr-panel-url" role="tabpanel" aria-labelledby="qr-tab-url">${field('url','destination','url','required placeholder="https://example.com" aria-describedby="urlHint"')}${hint('urlHint')}</fieldset>
    <fieldset id="qr-panel-whatsapp" role="tabpanel" aria-labelledby="qr-tab-whatsapp" hidden disabled>${field('phone','phone','tel','required placeholder="+60123456789" aria-describedby="phoneHint"')}${hint('phoneHint')}${area('message')}</fieldset>
    <fieldset id="qr-panel-location" role="tabpanel" aria-labelledby="qr-tab-location" hidden disabled><div class="qr-field-row">${field('latitude','latitude','number','required min="-90" max="90" step="any" placeholder="3.1579" aria-describedby="locationHint"')}${field('longitude','longitude','number','required min="-180" max="180" step="any" placeholder="101.7116" aria-describedby="locationHint"')}</div>${hint('locationHint')}</fieldset>
    <fieldset id="qr-panel-event" role="tabpanel" aria-labelledby="qr-tab-event" hidden disabled>${field('eventTitle','eventTitle','text','required')}<div class="qr-field-row">${field('start','start','datetime-local','required')}${field('end','end','datetime-local','required')}</div><p class="qr-hint">${text('timezone')} <b id="qr-timezone"></b></p>${field('eventLocation')}${area('description')}</fieldset>
    <fieldset id="qr-panel-vcard" role="tabpanel" aria-labelledby="qr-tab-vcard" hidden disabled><div class="qr-field-row">${field('firstName','firstName','text','required autocomplete="given-name"')}${field('lastName','lastName','text','autocomplete="family-name"')}</div>${field('company')}${field('jobTitle')}${field('contactPhone','contactPhone','tel')}${field('email','email','email')}${field('website','website','url','placeholder="https://"')}${area('address',300)}</fieldset>
    <details class="qr-appearance"><summary>${text('appearance')}</summary><div class="qr-field-row">${field('foreground','foreground','color','value="#183e32"')}${field('background','background','color','value="#ffffff"')}</div><label>${text('size')}<select name="size"><option value="512">512 × 512 px</option><option value="1024" selected>1024 × 1024 px</option><option value="2048">2048 × 2048 px</option></select></label>${hint('colorHint')}</details>
    <div class="tool-actions"><button type="submit" class="primary" id="create-qr">${text('create')} <span aria-hidden="true">↗</span></button></div><p id="tool-status" class="tool-status" role="status" aria-live="polite"></p></form>
    <section class="tool-preview qr-result"><h2 class="workspace-title">${text('preview')}</h2><div id="qr-empty" class="qr-empty"><span aria-hidden="true">▦</span><h3>${text('empty')}</h3><p>${text('emptyHint')}</p></div><div id="qr-preview" class="qr-preview" hidden></div><p class="qr-hint qr-scan-hint">${text('scanHint')}</p><div class="tool-actions"><button type="button" id="download-qr-png" disabled>${text('png')}</button><button type="button" id="download-qr-svg" disabled>${text('svg')}</button></div><details id="qr-content" hidden><summary>${text('content')}</summary><pre id="qr-payload"></pre></details></section></div>`;
  const form = $('#tool-form');
  const workspace = $('#tool-workspace'), editor = document.createElement('section');
  editor.id = 'qr-editor'; editor.hidden = true;
  editor.append(...workspace.childNodes); workspace.append(editor);
  editor.insertAdjacentHTML('afterbegin', `<div class="qr-editor-nav"><button type="button" id="back-qr-list">← ${text('myCodes')}</button><span id="qr-active-name"></span><span id="qr-dirty" hidden>${text('unsaved')}</span></div>`);
  $('#create-qr').insertAdjacentHTML('afterend', `<button type="button" id="cancel-qr-edit" hidden>${text('cancelEdit')}</button>`);
  workspace.insertAdjacentHTML('afterbegin', `<section id="qr-library"><div class="qr-library-heading"><div><h2 class="workspace-title">${text('myCodes')}</h2><p class="qr-hint">${text('manageHelp')}</p></div><button type="button" id="new-qr" class="qr-add">+ ${text('createNew')}</button></div><p id="qr-library-status" class="tool-status" role="status"></p><div id="qr-code-list"></div></section>`);
  workspace.insertAdjacentHTML('beforeend', `<dialog id="delete-qr-dialog" class="qr-dialog" aria-labelledby="delete-qr-title"><h2 id="delete-qr-title">${text('remove')}</h2><p class="qr-hint">${text('deleteHelp')}</p><strong id="delete-qr-name"></strong><p id="delete-qr-status" class="tool-status" role="status"></p><div class="tool-actions"><button type="button" id="cancel-delete-qr">${text('cancel')}</button><button type="button" id="confirm-delete-qr" class="qr-danger">${text('remove')}</button></div></dialog>`);
  $('#qr-timezone').textContent = eventIdentity.timeZone;
  // Encode all characters, including Malay, non-Latin contact names and emoji.
  window.qrcode.stringToBytes = value => Array.from(new TextEncoder().encode(value));
  function status(key = '', field = '') {
    statusKey = key; errorField = field;
    $('#tool-status').textContent = key ? t(key) : '';
    $('#tool-status').classList.toggle('is-error', !!field || ['tooLong','downloadError','server','conflict','notFound','origin','busy'].includes(key));
    $$('[aria-invalid]').forEach(el => { el.removeAttribute('aria-invalid'); el.removeAttribute('aria-errormessage'); });
    if (field) { form.elements[field].setAttribute('aria-invalid','true'); form.elements[field].setAttribute('aria-errormessage','tool-status'); }
  }
  function clearPreview() {
    current = null;
    $('#qr-preview').replaceChildren(); $('#qr-preview').hidden = true; $('#qr-empty').hidden = false;
    $('#qr-payload').textContent = ''; $('#qr-content').hidden = true;
    $('#download-qr-png').disabled = $('#download-qr-svg').disabled = true;
  }
  function result(payload, data) {
    const qr = window.qrcode(0, 'M'); qr.addData(payload, 'Byte'); qr.make();
    const count = qr.getModuleCount(), dimension = count + 8;
    let path = '';
    for (let row = 0; row < count; row++) for (let col = 0; col < count; col++) if (qr.isDark(row, col)) path += `M${col + 4},${row + 4}h1v1h-1z`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dimension} ${dimension}" width="${data.size}" height="${data.size}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="${data.background}"/><path fill="${data.foreground}" d="${path}"/></svg>`;
    return {qr,svg,data,payload};
  }
  function showResult(value) {
    current = value;
    $('#qr-preview').innerHTML = value.svg;
    $('#qr-preview svg').setAttribute('role','img'); $('#qr-preview svg').setAttribute('aria-label',t('preview'));
    $('#qr-preview').hidden = false; $('#qr-empty').hidden = true; $('#qr-content').hidden = false;
    $('#qr-payload').textContent = value.payload;
    $('#download-qr-png').disabled = $('#download-qr-svg').disabled = false;
  }
  function syncEditor() {
    const label = $('#create-qr [data-qr-copy]'); label.dataset.qrCopy = activeRecord ? 'update' : 'create'; label.textContent = t(label.dataset.qrCopy);
    const hint = $('#qr-empty p [data-qr-copy]'); hint.dataset.qrCopy = activeRecord ? 'editingHint' : 'emptyHint'; hint.textContent = t(hint.dataset.qrCopy);
    $('#qr-active-name').textContent = activeRecord?.state.name || '';
    $('#qr-dirty').hidden = !dirty; $('#cancel-qr-edit').hidden = !dirty || !activeRecord;
  }
  function setBusy(value) {
    busy = value; editor.inert = value; $('#qr-library').inert = value;
    $('#confirm-delete-qr').disabled = value; $('#cancel-delete-qr').disabled = value;
    $('#new-qr').disabled = value || atLimit();
  }
  async function api(id = '', options = {}) {
    const response = await window.ZpropAuth.fetch(new URL('api/qr-codes' + (id ? '/' + encodeURIComponent(id) : ''), base), options);
    let data; try {data = await response.json();} catch {throw new Error('server');}
    if (!response.ok) throw Object.assign(new Error(data.error || 'server'), {key:data.error, field:data.field});
    return data;
  }
  const json = (method, data) => ({method,headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  const errorKey = error => Object.hasOwn(copy,error.key || error.message) ? (error.key || error.message) : 'server';
  function setQuery(id = '') {const url=new URL(location.href);id?url.searchParams.set('qr',id):url.searchParams.delete('qr');history.replaceState(null,'',url);}
  async function generate() {
    if (busy) return;
    status();
    const data = Object.fromEntries(new FormData(form));
    try {
      const payload = window.ZpropQr.payload(active, data, eventIdentity);
      window.ZpropQr.colors(data.foreground, data.background);
      const invalid = [...form.elements].find(el => el.willValidate && !el.validity.valid);
      if (invalid) throw { key:invalid.validity.valueMissing ? 'required' : 'invalidUrl', field:invalid.name };
      result(payload, data); // Check capacity before saving a record.
    } catch (error) {
      clearPreview();
      status(error.key || 'tooLong', error.field || '');
      if (error.field) {
        if (error.field === 'foreground') $('.qr-appearance').open = true;
        form.elements[error.field].focus();
      }
      return false;
    }
    const updating = !!activeRecord;
    setBusy(true); status('saving');
    try {
      const record = await api(activeRecord?.id, json(updating?'PUT':'POST',{type:active,state:data,timeZone:eventIdentity.timeZone,revision:activeRecord?.revision}));
      loadRecord(record); status(updating?'updated':'ready'); return true;
    } catch(error) {clearPreview(); status(errorKey(error),error.field || ''); return false;}
    finally {setBusy(false);}
  }
  function switchType(type) {
    if (type === active) return;
    active = type;
    types.forEach(id => {
      const selected = id === type, tab = $('#qr-tab-' + id), panel = $('#qr-panel-' + id);
      tab.setAttribute('aria-selected',String(selected)); tab.tabIndex = selected ? 0 : -1;
      panel.hidden = panel.disabled = !selected;
    });
    clearPreview(); status(); dirty=true; syncEditor();
  }
  $$('[data-qr-type]').forEach(button => {
    button.addEventListener('click', () => switchType(button.dataset.qrType));
    button.addEventListener('keydown', event => {
      const index = types.indexOf(active);
      const next = { ArrowRight:(index + 1) % 5, ArrowLeft:(index + 4) % 5, Home:0, End:4 }[event.key];
      if (next === undefined) return;
      event.preventDefault(); switchType(types[next]); $('#qr-tab-' + types[next]).focus();
    });
  });
  form.addEventListener('submit', event => { event.preventDefault(); generate(); });
  form.addEventListener('input', () => {
    clearPreview(); status(); dirty=true; syncEditor();
  });
  function loadRecord(record) {
    form.reset(); activeRecord = record;
    switchType(record.type);
    for (const [name,value] of Object.entries(record.state)) if(form.elements[name]) form.elements[name].value=value;
    eventIdentity={...record.event,created:new Date(record.event.created)};
    $('#qr-timezone').textContent=eventIdentity.timeZone;
    dirty=false; status(); syncEditor(); showResult(result(record.payload,record.state));
    $('#qr-library').hidden=true; editor.hidden=false; setQuery(record.id);
  }
  let codes=[], loaded=false, listStatus='loading', pendingDelete=null;
  const atLimit=()=>loaded&&!listStatus&&codes.length>=5;
  function renderList() {
    $('#qr-library-status').textContent=listStatus?t(listStatus):atLimit()?t('itemLimit'):'';
    $('#new-qr').disabled=busy||atLimit();
    const list=$('#qr-code-list'); list.replaceChildren();
    if (listStatus==='loadError') {const button=document.createElement('button');button.type='button';button.className='qr-add';button.textContent=t('retry');button.addEventListener('click',refresh);list.append(button);return;}
    for (const code of codes) {
      const card=document.createElement('article');card.className='qr-code-card';card.dataset.qrId=code.id;
      card.innerHTML=`<div><span class="qr-code-badge"></span><h3></h3><p></p></div><div class="tool-actions"><button type="button" data-qr-action="edit">${t('edit')}</button><button type="button" data-qr-action="delete" class="qr-danger">${t('remove')}</button></div>`;
      card.querySelector('.qr-code-badge').textContent=t(code.type)+' · '+t('saved');
      card.querySelector('h3').textContent=code.name;
      card.querySelector('p').textContent=new Date(code.updatedAt).toLocaleString(language?'en-GB':'ms-MY');
      list.append(card);
    }
    if(loaded && !codes.length) list.innerHTML=`<div class="qr-library-empty"><span aria-hidden="true">▦</span><h3>${t('noCodes')}</h3><p class="qr-hint">${t('noCodesHelp')}</p></div>`;
  }
  async function refresh() {
    loaded=false;codes=[];listStatus='loading';renderList();
    try {codes=(await api()).codes;loaded=true;listStatus='';} catch {listStatus='loadError';} renderList();
  }
  async function openRecord(id) {
    if(busy)return;setBusy(true);
    try {loadRecord(await api(id));} catch(error) {listStatus=errorKey(error);renderList();}
    finally {setBusy(false);}
  }
  $('#new-qr').addEventListener('click',()=>{
    if(busy||atLimit())return;activeRecord=null;form.reset();switchType('url');clearPreview();status();dirty=false;
    eventIdentity={uid:crypto.randomUUID()+'@zprop.tech',created:new Date(),timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone};
    $('#qr-timezone').textContent=eventIdentity.timeZone;syncEditor();setQuery();
    $('#qr-library').hidden=true;editor.hidden=false;form.elements.name.focus();
  });
  $('#back-qr-list').addEventListener('click',async()=>{
    if(busy || (dirty&&!window.confirm(t('discard'))))return;
    dirty=false;activeRecord=null;clearPreview();setQuery();editor.hidden=true;$('#qr-library').hidden=false;await refresh();
  });
  $('#cancel-qr-edit').addEventListener('click',()=>{if(!busy&&activeRecord)loadRecord(activeRecord);});
  $('#qr-code-list').addEventListener('click',event=>{
    const button=event.target.closest('[data-qr-action]');if(!button||busy)return;
    const code=codes.find(item=>item.id===button.closest('[data-qr-id]').dataset.qrId);if(!code)return;
    if(button.dataset.qrAction==='edit') {openRecord(code.id);return;}
    pendingDelete=code;$('#delete-qr-name').textContent=code.name;$('#delete-qr-status').textContent='';$('#delete-qr-dialog').showModal();$('#cancel-delete-qr').focus();
  });
  $('#cancel-delete-qr').addEventListener('click',()=>{if(!busy)$('#delete-qr-dialog').close();});
  $('#delete-qr-dialog').addEventListener('cancel',event=>{if(busy)event.preventDefault();});
  $('#confirm-delete-qr').addEventListener('click',async()=>{
    if(busy||!pendingDelete)return;setBusy(true);
    try {await api(pendingDelete.id,json('DELETE',{revision:pendingDelete.revision}));$('#delete-qr-dialog').close();pendingDelete=null;await refresh();}
    catch(error) {$('#delete-qr-status').textContent=t(error.key==='conflict'?'conflict':'deleteError');}
    finally {setBusy(false);}
  });
  window.addEventListener('beforeunload',event=>{if(dirty||busy){event.preventDefault();event.returnValue='';}});
  function save(blob, extension, data) {
    const href = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = href;
    link.download = (data.name.trim().replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-+|-+$/g,'').slice(0,80) || 'zprop-' + active) + '.' + extension;
    link.click(); setTimeout(() => URL.revokeObjectURL(href), 1000); status('downloaded');
  }
  $('#download-qr-svg').addEventListener('click', () => {
    if (!current) return;
    try { save(new Blob([current.svg], { type:'image/svg+xml' }), 'svg', current.data); } catch { status('downloadError'); }
  });
  $('#download-qr-png').addEventListener('click', () => {
    if (!current) return;
    const { qr, data } = current;
    try {
      const canvas = document.createElement('canvas'), size = Number(data.size), count = qr.getModuleCount();
      canvas.width = canvas.height = size;
      const context = canvas.getContext('2d');
      // Whole pixels and a quiet zone of at least four modules keep exports sharp.
      const cell = Math.floor(size / (count + 8)), offset = Math.floor((size - count * cell) / 2);
      context.fillStyle = data.background; context.fillRect(0, 0, size, size); context.fillStyle = data.foreground;
      for (let row = 0; row < count; row++) for (let col = 0; col < count; col++) if (qr.isDark(row, col)) context.fillRect(offset + col * cell, offset + row * cell, cell, cell);
      canvas.toBlob(blob => { try { if (!blob) throw new Error(); save(blob,'png',data); } catch { status('downloadError'); } },'image/png');
    } catch { status('downloadError'); }
  });
  function localize() {
    localizeShell(); $$('[data-qr-copy]').forEach(el => el.textContent = t(el.dataset.qrCopy));
    $('.qr-types').setAttribute('aria-label',t('types'));
    $('#qr-preview svg')?.setAttribute('aria-label',t('preview'));
    status(statusKey, errorField);
    syncEditor(); renderList();
  }
  document.addEventListener('zprop:language',localize);
  localize(); window.ZpropNavigation?.ready();
  await refresh();
  const id=new URL(location.href).searchParams.get('qr');if(id)await openRecord(id);
})();
