(async () => {
  const $=selector=>document.querySelector(selector);
  const tool=window.ZPROP_TOOLS.find(item=>item.id==='short-links');
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const copy={
    suite:['ALATAN ZPROP','ZPROP TOOLS'],sidebarNote:['Identiti sendiri.<br>Ruang milik anda.','Your own identity.<br>Your own space.'],allTools:['Semua alatan','All tools'],help:['Perlukan bantuan?','Need help?'],
    myLinks:['Pautan pendek anda','Your short links'],manageHelp:['Cipta, edit dan urus pautan pendek anda di sini.','Create, edit and manage your short links here.'],createLink:['Cipta pautan pendek','Create short link'],editLink:['Edit pautan','Edit link'],saveChanges:['Simpan perubahan','Save changes'],cancelEditing:['Batal suntingan','Cancel editing'],cancel:['Batal','Cancel'],deleteLink:['Padam pautan','Delete link'],deleteHelp:['Pautan ini akan dipadam dan tidak lagi membawa pelawat ke destinasi anda.','This link will be deleted and will no longer redirect visitors to your destination.'],noLinks:['Belum ada pautan pendek','No short links yet'],createHelp:['Pilih Cipta pautan pendek untuk menambah pautan pertama anda.','Choose Create short link to add your first link.'],loading:['Memuatkan pautan…','Loading links…'],loadError:['Pautan tidak dapat dimuatkan. Cuba lagi.','Could not load your links. Please try again.'],retry:['Cuba lagi','Retry'],active:['Aktif','Active'],unsaved:['Perubahan belum disimpan','Unsaved changes'],discard:['Buang perubahan yang belum disimpan?','Discard your unsaved changes?'],
    editor:['Sediakan maklumat pautan','Set up your link'],preview:['Pautan anda','Your link'],url:['URL destinasi','Destination URL'],linkDomain:['Domain pautan','Link domain'],slug:['Nama pautan','Link name'],linkHint:['Nama pilihan: 2–50 huruf, nombor, sempang atau garis bawah. Biarkan kosong untuk nama rawak. Nama mesti unik untuk semua pengguna. Huruf besar dan kecil dianggap sama.','Optional name: 2–50 letters, numbers, hyphens or underscores. Leave empty for a random name. Names must be unique across all users. Uppercase and lowercase count as the same name.'],renameHint:['Menukar nama pautan akan menamatkan URL lama selepas perubahan disimpan.','Changing the link name retires the old URL after saving.'],linkEmpty:['Pautan anda akan dipaparkan selepas dicipta.','Your link will appear here after creation.'],linkReady:['PAUTAN DICIPTA','LINK CREATED'],updated:['Perubahan disimpan.','Changes saved.'],saving:['Menyimpan pautan…','Saving your link…'],copyLink:['Salin pautan','Copy link'],openLink:['Buka pautan','Open link'],linkCopied:['Pautan disalin.','Link copied.'],linkCopyFailed:['Pilih dan salin alamat pautan di atas.','Select and copy the link address above.'],
    linkTaken:['Nama pautan sudah digunakan. Pilih nama lain.','This link name is already taken. Choose another name.'],linkReserved:['Nama ini digunakan oleh laman web. Pilih nama pautan lain.','This name is used by the website. Choose another link name.'],linkSlug:['Gunakan 2–50 huruf, nombor, sempang atau garis bawah.','Use 2–50 letters, numbers, hyphens or underscores.'],invalidUrl:['Masukkan URL lengkap bermula dengan https:// atau http://.','Enter a full URL beginning with https:// or http://.'],linkLoop:['Destinasi tidak boleh menjadi pautan pendek itu sendiri.','The destination cannot be the short link itself.'],linkServer:['Pelayan tidak dapat menyimpan pautan. Cuba lagi.','The server could not save the link. Please try again.'],linkUnavailable:['Perkhidmatan pautan tidak tersedia buat masa ini. Sila cuba lagi.','The link service is unavailable right now. Please try again.'],linkOrigin:['Permintaan ditolak. Buka alatan terus pada pelayan ZPROP.','Request rejected. Open the tool directly on the ZPROP server.'],linkSize:['URL terlalu panjang. Had ialah 4,096 aksara.','The URL is too long. The limit is 4,096 characters.'],linkRequest:['Maklumat pautan tidak sah. Semak dan cuba lagi.','The link details are invalid. Check them and try again.'],notFound:['Pautan tidak dijumpai dalam akaun anda.','This link was not found in your account.'],conflict:['Pautan telah berubah di tempat lain. Kembali ke senarai dan buka semula pautan sebelum menyimpan.','This link changed elsewhere. Return to the list and reopen it before saving.'],busy:['Pelayan sedang sibuk. Cuba lagi sebentar.','The server is busy. Please try again shortly.'],itemLimit:['Anda boleh menyimpan sehingga 5 item untuk alatan ini. Padam satu untuk menambah yang baharu.','You can save up to 5 items in this tool. Delete one to add another.']
  };
  const lang=()=>document.documentElement.lang==='en'?1:0;
  const t=key=>copy[key]?.[lang()]||copy.linkServer[lang()];
  const label=key=>`<span data-short-copy="${key}">${t(key)}</span>`;
  const urlFor=slug=>new URL('/'+slug,window.ZPROP_PUBLIC_ORIGIN).href;
  let records=[],active=null,busy=false,dirty=false,loaded=false,listError='',statusKey='',deleteRecord=null,stream=null;
  function shell() {
    document.title=tool.name[lang()]+' — ZPROP';
    $('meta[name=description]').content=tool.description[lang()];
    $('#tool-title').textContent=tool.title[lang()];$('#tool-tag').textContent=tool.tag[lang()];$('#tool-description').textContent=tool.description[lang()];$('#tool-availability').textContent=tool.availability[lang()];
    $('#tool-capabilities').innerHTML=tool.features.map(item=>`<span>✓ ${esc(item[lang()])}</span>`).join('');
    document.querySelectorAll('[data-tool-name]').forEach(el=>{el.textContent=window.ZPROP_TOOLS.find(item=>item.id===el.dataset.toolName).name[lang()];});
    document.querySelectorAll('[data-tool-copy]').forEach(el=>{el.innerHTML=t(el.dataset.toolCopy);});
  }
  shell();window.ZpropLanguage?.ready();
  document.addEventListener('zprop:language',shell);
  if(!await window.ZpropAuth.ready)return;
  $('#tool-workspace').innerHTML=`<section id="short-library"><div class="short-library-heading"><div><h2 class="workspace-title">${label('myLinks')}</h2><p class="short-hint">${label('manageHelp')}</p></div><button type="button" id="new-short-link" class="short-primary">+ ${label('createLink')}</button></div><p id="short-library-status" class="tool-status" role="status"></p><div id="short-link-list"></div></section>
  <section id="short-editor" hidden><div class="short-editor-nav"><button type="button" id="back-short-list">← ${label('myLinks')}</button><strong id="short-active-name"></strong><span id="short-dirty" hidden>${label('unsaved')}</span></div><div class="workspace-grid"><form id="tool-form" class="tool-editor"><h2 class="workspace-title" id="short-editor-title"></h2><label>${label('url')}<input type="url" name="url" required maxlength="4096" placeholder="https://www.example.com/"></label><label>${label('linkDomain')}<input name="linkDomain" value="${esc(window.ZPROP_PUBLIC_ORIGIN)}" readonly></label><label>${label('slug')}<input name="slug" pattern="[a-zA-Z0-9_-]{2,50}" maxlength="50" placeholder="your-linkname" aria-describedby="link-hint short-rename-hint" autocomplete="off"></label><p class="short-hint" id="link-hint">${label('linkHint')}</p><p class="short-hint" id="short-rename-hint" hidden>${label('renameHint')}</p><div class="tool-actions"><button type="submit" id="save-short-link" data-action="createLink" class="primary"></button><button type="button" id="cancel-short-edit">${label('cancelEditing')}</button></div><p id="tool-status" class="tool-status" role="status"></p></form><section class="tool-preview"><h2 class="workspace-title">${label('preview')}</h2><p id="link-empty" class="tool-empty">${label('linkEmpty')}</p><div id="link-result" hidden><span class="draft-label">${label('linkReady')}</span><a class="draft-address" id="short-address" target="_blank" rel="noopener noreferrer"></a><div class="tool-actions"><a id="open-short-link" target="_blank" rel="noopener noreferrer">${label('openLink')}</a><button type="button" id="copy-short-link">${label('copyLink')}</button></div></div></section></div></section>
  <dialog id="delete-short-dialog" class="short-dialog" aria-labelledby="delete-short-title"><h2 id="delete-short-title">${label('deleteLink')}</h2><p class="short-hint">${label('deleteHelp')}</p><strong id="delete-short-name"></strong><p id="delete-short-status" class="tool-status" role="status"></p><div class="tool-actions"><button type="button" id="cancel-delete-short">${label('cancel')}</button><button type="button" id="confirm-delete-short" class="short-danger">${label('deleteLink')}</button></div></dialog>`;
  const form=$('#tool-form');
  function query(slug) {const url=new URL(location.href);slug?url.searchParams.set('link',slug):url.searchParams.delete('link');history.replaceState(null,'',url);}
  async function api(slug='',options={}) {
    const response=await window.ZpropAuth.fetch('/api/short-links'+(slug?'/'+encodeURIComponent(slug):''),{...options,signal:AbortSignal.timeout(15000)});
    let data;try{data=await response.json();}catch{throw new Error('linkUnavailable');}
    if(!response.ok)throw new Error(data.error||'linkServer');return data;
  }
  const atLimit=()=>loaded&&!listError&&records.length>=5;
  function renderList() {
    $('#short-library-status').textContent=listError?t(listError):!loaded?t('loading'):atLimit()?t('itemLimit'):'';
    $('#new-short-link').disabled=busy||atLimit();
    $('#short-link-list').innerHTML=listError?`<button type="button" id="retry-short-list" class="short-primary">${t('retry')}</button>`:records.map(item=>`<article class="short-link-card" data-short-slug="${esc(item.slug)}"><div><span class="short-badge">${t('active')}</span><h3>${esc(item.slug)}</h3><a href="${esc(urlFor(item.slug))}" target="_blank" rel="noopener noreferrer">${esc(urlFor(item.slug))}</a><p class="short-destination">→ ${esc(item.destination)}</p></div><div class="tool-actions"><button type="button" data-short-action="edit">${t('editLink')}</button><a href="${esc(urlFor(item.slug))}" target="_blank" rel="noopener noreferrer">${t('openLink')} ↗</a><button type="button" data-short-action="copy">${t('copyLink')}</button><button type="button" data-short-action="delete" class="short-danger">${t('deleteLink')}</button></div></article>`).join('');
    if(!listError&&loaded&&!records.length)$('#short-link-list').innerHTML=`<div class="short-library-empty"><span aria-hidden="true">↗</span><h3>${t('noLinks')}</h3><p class="short-hint">${t('createHelp')}</p></div>`;
  }
  function renderEditor() {
    $('#short-dirty').hidden=!dirty;
    $('#short-editor-title').textContent=t(active?'editLink':'editor');
    $('#save-short-link').textContent=t(active?'saveChanges':'createLink');
    $('#short-active-name').textContent=active?.slug||'';
    $('#short-rename-hint').hidden=!active;
    $('#cancel-short-edit').hidden=!active;
    $('#tool-status').textContent=statusKey?t(statusKey):'';
    $('#link-result').hidden=!active||dirty;$('#link-empty').hidden=!!active&&!dirty;
    if(active) {const url=urlFor(active.slug);$('#short-address').textContent=url;$('#short-address').href=url;$('#open-short-link').href=url;}
  }
  function localize() {document.querySelectorAll('[data-short-copy]').forEach(el=>{el.textContent=t(el.dataset.shortCopy);});renderList();renderEditor();}
  function setBusy(value) {busy=value;form.setAttribute('aria-busy',String(value));form.querySelectorAll('input,button').forEach(el=>{el.disabled=value;});$('#confirm-delete-short').disabled=value;$('#cancel-delete-short').disabled=value;$('#new-short-link').disabled=value||atLimit();}
  let loading=false,refreshPending=false;
  async function refresh() {
    if(loading) {refreshPending=true;return;}loading=true;listError='';renderList();
    try{records=(await api()).links;loaded=true;}catch(error){listError=error.message==='linkUnavailable'?'linkUnavailable':'loadError';}
    finally{loading=false;renderList();if(refreshPending){refreshPending=false;refresh();}}
  }
  function select(record) {
    active=record;dirty=false;statusKey='';form.elements.url.value=record?.destination||'';form.elements.slug.value=record?.slug||'';
    $('#short-library').hidden=true;$('#short-editor').hidden=false;query(record?.slug);renderEditor();form.elements.url.focus();
  }
  const canLeave=()=>!busy&&(!dirty||window.confirm(t('discard')));
  async function back() {if(!canLeave())return;active=null;dirty=false;statusKey='';$('#short-editor').hidden=true;$('#short-library').hidden=false;query('');await refresh();$('#new-short-link').focus();}
  $('#new-short-link').addEventListener('click',()=>{if(!busy&&!atLimit())select(null);});
  $('#back-short-list').addEventListener('click',back);
  $('#cancel-short-edit').addEventListener('click',()=>{if(!busy&&active)select(active);});
  async function open(slug) {if(!canLeave())return;setBusy(true);try{select(await api(slug));}catch(error){listError=copy[error.message]?error.message:'linkServer';renderList();}finally{setBusy(false);}}
  $('#short-link-list').addEventListener('click',async event=>{
    if(event.target.closest('#retry-short-list')){refresh();return;}
    const button=event.target.closest('[data-short-action]');if(!button||busy)return;
    const record=records.find(item=>item.slug===button.closest('[data-short-slug]').dataset.shortSlug);if(!record)return;
    if(button.dataset.shortAction==='edit')open(record.slug);
    else if(button.dataset.shortAction==='copy') {try{await navigator.clipboard.writeText(urlFor(record.slug));$('#short-library-status').textContent=t('linkCopied');}catch{$('#short-library-status').textContent=t('linkCopyFailed');}}
    else {deleteRecord=record;$('#delete-short-name').textContent=urlFor(record.slug);$('#delete-short-status').textContent='';$('#delete-short-dialog').showModal();$('#cancel-delete-short').focus();}
  });
  form.addEventListener('input',()=>{dirty=form.elements.url.value!==(active?.destination||'')||form.elements.slug.value!==(active?.slug||'');statusKey='';renderEditor();});
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy||!form.reportValidity())return;
    const input={destination:form.elements.url.value.trim(),slug:form.elements.slug.value.trim(),...(active?{revision:active.revision}:{})};
    try{const url=new URL(input.destination);if(!['https:','http:'].includes(url.protocol)||!url.hostname||url.username||url.password)throw new Error();}catch{statusKey='invalidUrl';renderEditor();return;}
    const editing=!!active;setBusy(true);statusKey='saving';renderEditor();
    try{const saved=await api(active?.slug,{method:editing?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});select(saved);statusKey=editing?'updated':'linkReady';refresh();}
    catch(error){statusKey=copy[error.message]?error.message:'linkServer';}
    finally{setBusy(false);renderEditor();}
  });
  $('#copy-short-link').addEventListener('click',async()=>{if(!active||dirty)return;try{await navigator.clipboard.writeText(urlFor(active.slug));statusKey='linkCopied';}catch{statusKey='linkCopyFailed';}renderEditor();});
  $('#cancel-delete-short').addEventListener('click',()=>{if(!busy)$('#delete-short-dialog').close();});
  $('#delete-short-dialog').addEventListener('cancel',event=>{if(busy)event.preventDefault();});
  $('#confirm-delete-short').addEventListener('click',async()=>{
    if(busy||!deleteRecord)return;setBusy(true);
    try{await api(deleteRecord.slug,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:deleteRecord.revision})});$('#delete-short-dialog').close();deleteRecord=null;await refresh();}
    catch(error){$('#delete-short-status').textContent=t(error.message);}
    finally{setBusy(false);}
  });
  window.addEventListener('beforeunload',event=>{if(dirty||busy){event.preventDefault();event.returnValue='';}});
  document.addEventListener('click',event=>{const anchor=event.target.closest('a[href]');if(!anchor||anchor.target==='_blank'||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;if(!canLeave()){event.preventDefault();event.stopImmediatePropagation();}else dirty=false;},true);
  document.addEventListener('zprop:language',localize);
  function connect(){if(stream||document.hidden)return;stream=new EventSource('/api/dashboard-events');stream.addEventListener('change',refresh);}
  function disconnect(){stream?.close();stream=null;}
  document.addEventListener('visibilitychange',()=>{if(document.hidden)disconnect();else{refresh();connect();}});
  window.addEventListener('pagehide',disconnect);window.addEventListener('pageshow',event=>{if(event.persisted){refresh();connect();}});
  localize();window.ZpropNavigation?.ready();
  await refresh();const requested=new URL(location.href).searchParams.get('link');if(requested)await open(requested);connect();
})();
