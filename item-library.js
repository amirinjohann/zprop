window.ZpropItemLibrary={mount({category,onCreate,onEdit,onDownload}){
  const $=selector=>document.querySelector(selector),esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const names={
    'transfer-files':{title:['Pautan fail anda','Your file links'],create:['Cipta pautan fail','Create file link'],empty:['Belum ada pautan fail','No file links yet'],help:['Cipta dan urus pautan fail anda di sini.','Create and manage your file links here.'],start:['Pilih Cipta pautan fail untuk menambah fail pertama anda.','Choose Create file link to add your first file.'],icon:'\u2197'},
    vcards:{title:['vCard anda','Your vCards'],create:['Cipta vCard','Create vCard'],empty:['Belum ada vCard','No vCards yet'],help:['Cipta, edit dan urus vCard anda di sini.','Create, edit and manage your vCards here.'],start:['Pilih Cipta vCard untuk menambah kad pertama anda.','Choose Create vCard to add your first card.'],icon:'\u25a3'},
    'host-html':{title:['Laman statik anda','Your static sites'],create:['Cipta laman statik','Create static site'],empty:['Belum ada laman statik','No static sites yet'],help:['Cipta dan urus laman statik anda di sini.','Create and manage your static sites here.'],start:['Pilih Cipta laman statik untuk menambah laman pertama anda.','Choose Create static site to add your first site.'],icon:'\u2302'}
  };
  const copy={...names[category],loading:['Memuatkan item anda...','Loading your items...'],error:['Item tidak dapat dimuatkan. Sila cuba lagi.','Could not load your items. Please try again.'],retry:['Cuba lagi','Retry'],open:['Buka','Open'],copy:['Salin pautan','Copy link'],download:['Muat turun','Download'],edit:['Edit vCard','Edit vCard'],remove:['Padam','Delete'],cancel:['Batal','Cancel'],deleteTitle:['Padam item ini?','Delete this item?'],deleteHelp:['Item dan pautan yang dihoskan akan dipadam. Fail yang sudah dimuat turun dikekalkan.','This removes the saved item and its hosted link. Previously downloaded files remain available.'],saved:['Disimpan','Saved'],published:['Diterbitkan','Published'],generated:['Dijana','Generated'],legacy:['Butiran vCard lama ini tidak disimpan.','Details were not saved for this older vCard.'],copied:['Pautan disalin.','Link copied.'],copyFail:['Tidak dapat menyalin pautan. Pilih alamat pautan dan salin.','Could not copy the link. Select its address and copy it.'],unsaved:['Perubahan belum disimpan','Unsaved changes'],discard:['Buang perubahan yang belum disimpan?','Discard your unsaved changes?'],conflict:['Item telah berubah. Buka semula sebelum menyimpan.','This item changed elsewhere. Reopen it before saving.'],notFound:['Item ini tidak lagi tersedia.','This item is no longer available.'],itemLimit:['Anda boleh menyimpan sehingga 5 item untuk alatan ini. Padam satu untuk menambah yang baharu.','You can save up to 5 items in this tool. Delete one to add another.']};
  const t=key=>copy[key]?.[document.documentElement.lang==='en'?1:0]||copy.error[1];
  const label=key=>`<span data-item-copy="${key}">${t(key)}</span>`;
  const workspace=$('#tool-workspace'),form=$('#tool-form'),editor=document.createElement('section');editor.id='item-editor';
  while(workspace.firstChild)editor.append(workspace.firstChild);workspace.append(editor);
  editor.insertAdjacentHTML('afterbegin',`<div class="short-editor-nav"><button type="button" id="back-item-library">\u2190 ${label('title')}</button><strong id="item-active-name"></strong><span id="item-dirty" hidden>${label('unsaved')}</span></div>`);
  workspace.insertAdjacentHTML('afterbegin',`<section id="item-library"><div class="short-library-heading"><div><h2 class="workspace-title">${label('title')}</h2><p class="short-hint">${label('help')}</p></div><button type="button" id="new-item" class="short-primary">+ ${label('create')}</button></div><p id="item-library-status" class="tool-status" role="status"></p><div id="item-list"></div></section>`);
  workspace.insertAdjacentHTML('beforeend',`<dialog id="delete-item-dialog" class="short-dialog" aria-labelledby="delete-item-title"><h2 id="delete-item-title">${label('deleteTitle')}</h2><p class="short-hint">${label('deleteHelp')}</p><strong id="delete-item-name"></strong><p id="delete-item-status" class="tool-status" role="status"></p><div class="tool-actions"><button type="button" id="cancel-delete-item">${label('cancel')}</button><button type="button" id="confirm-delete-item" class="short-danger">${label('remove')}</button></div></dialog>`);
  editor.hidden=true;
  let items=[],active=null,dirty=false,baseline='',busy=false,loaded=false,error='',loading=false,pending=false,stream=null,deleted=null;
  const snapshot=()=>JSON.stringify([...form.elements].filter(el=>el.name).map(el=>[el.name,el.type==='file'?[...el.files].map(file=>[file.name,file.size,file.lastModified]):el.value]));
  const isBusy=()=>busy||form.getAttribute('aria-busy')==='true';
  const atLimit=()=>loaded&&!error&&items.length>=5;
  const urlFor=item=>new URL(item.url,window.ZPROP_PUBLIC_ORIGIN).href;
  function query(id){const url=new URL(location.href);id?url.searchParams.set('item',id):url.searchParams.delete('item');history.replaceState(null,'',url);}
  async function api(url,options={}){const response=await window.ZpropAuth.fetch(url,{...options,signal:AbortSignal.timeout(15000)});let data;try{data=await response.json();}catch{throw Error('error');}if(!response.ok)throw Error(data.error||'error');return data;}
  function render(){
    $('#item-library-status').textContent=error?t(error):!loaded?t('loading'):atLimit()?t('itemLimit'):'';
    $('#new-item').disabled=isBusy()||atLimit();
    $('#item-list').innerHTML=error?`<button type="button" id="retry-items" class="short-primary">${t('retry')}</button>`:items.map(item=>`<article class="short-link-card" data-item-id="${esc(item.id)}"><div><span class="short-badge">${t(item.status)}</span><h3>${esc(item.name)}</h3>${item.url?`<a href="${esc(urlFor(item))}" target="_blank" rel="noopener noreferrer">${esc(urlFor(item))}</a>`:!item.manageUrl?`<p class="short-hint">${t('legacy')}</p>`:''}</div><div class="tool-actions">${item.url?`<a href="${esc(urlFor(item))}" target="_blank" rel="noopener noreferrer" data-item-action="open">${t('open')}</a><button type="button" data-item-action="copy">${t('copy')}</button>`:''}${category==='transfer-files'?`<a href="${esc(urlFor(item))}?download=1" data-item-action="download">${t('download')}</a>`:''}${category==='vcards'&&item.manageUrl?`<button type="button" data-item-action="edit">${t('edit')}</button><button type="button" data-item-action="download">${t('download')}</button>`:''}<button type="button" data-item-action="delete" class="short-danger">${t('remove')}</button></div></article>`).join('');
    if(loaded&&!error&&!items.length)$('#item-list').innerHTML=`<div class="short-library-empty"><span aria-hidden="true">${names[category].icon}</span><h3>${t('empty')}</h3><p class="short-hint">${t('start')}</p></div>`;
  }
  async function refresh(){if(loading){pending=true;return;}loading=true;error='';render();try{const data=await api('/api/dashboard-links');if(!Array.isArray(data.links))throw Error('error');items=data.links.filter(item=>item.category===category);loaded=true;}catch{error='error';}finally{loading=false;render();if(pending){pending=false;refresh();}}}
  function clean(record=active){active=record;dirty=false;baseline=snapshot();$('#item-dirty').hidden=true;$('#item-active-name').textContent=record?.state?.name||'';}
  function select(record){if(record)onEdit(record);else onCreate();clean(record);$('#item-library').hidden=true;editor.hidden=false;query(record?.id);form.querySelector('input:not([type=hidden]):not([readonly]),textarea')?.focus();}
  const canLeave=()=>!isBusy()&&(!dirty||window.confirm(t('discard')));
  async function open(id){if(!canLeave())return;busy=true;try{select(await api('/api/vcards/'+encodeURIComponent(id)));}catch(e){error=copy[e.message]?e.message:'error';render();}finally{busy=false;}}
  $('#new-item').addEventListener('click',()=>{if(!isBusy()&&!atLimit())select(null);});
  $('#back-item-library').addEventListener('click',async()=>{if(!canLeave())return;clean(null);editor.hidden=true;$('#item-library').hidden=false;query('');await refresh();$('#new-item').focus();});
  for(const event of ['input','change'])form.addEventListener(event,()=>{dirty=snapshot()!==baseline;$('#item-dirty').hidden=!dirty;});
  $('#item-list').addEventListener('click',async event=>{
    if(event.target.closest('#retry-items')){refresh();return;}
    const button=event.target.closest('[data-item-action]');if(!button||isBusy())return;
    const item=items.find(item=>item.id===button.closest('[data-item-id]').dataset.itemId);if(!item)return;
    const action=button.dataset.itemAction;
    if(action==='edit')open(item.id);
    if(action==='copy'){try{await navigator.clipboard.writeText(urlFor(item));$('#item-library-status').textContent=t('copied');}catch{$('#item-library-status').textContent=t('copyFail');}}
    if(action==='download'&&category==='vcards'){busy=true;try{onDownload(await api('/api/vcards/'+encodeURIComponent(item.id)));}catch(e){$('#item-library-status').textContent=t(e.message);}finally{busy=false;}}
    if(action==='delete'){deleted=item;$('#delete-item-name').textContent=item.name;$('#delete-item-status').textContent='';$('#delete-item-dialog').showModal();$('#cancel-delete-item').focus();}
  });
  $('#cancel-delete-item').addEventListener('click',()=>{if(!busy)$('#delete-item-dialog').close();});
  $('#delete-item-dialog').addEventListener('cancel',event=>{if(busy)event.preventDefault();});
  $('#confirm-delete-item').addEventListener('click',async()=>{
    if(isBusy()||!deleted)return;busy=true;$('#confirm-delete-item').disabled=true;$('#cancel-delete-item').disabled=true;
    try{await api('/api/dashboard-links/'+category+'/'+encodeURIComponent(deleted.id),{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:deleted.revision})});$('#delete-item-dialog').close();deleted=null;await refresh();$('#new-item').focus();}
    catch(e){$('#delete-item-status').textContent=t(e.message);}
    finally{busy=false;$('#confirm-delete-item').disabled=false;$('#cancel-delete-item').disabled=false;render();}
  });
  window.addEventListener('beforeunload',event=>{if(dirty||isBusy()){event.preventDefault();event.returnValue='';}});
  document.addEventListener('click',event=>{const anchor=event.target.closest('a[href]');if(!anchor||anchor.target==='_blank'||anchor.hasAttribute('download')||anchor.dataset.itemAction==='download'||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;if(!canLeave()){event.preventDefault();event.stopImmediatePropagation();}else dirty=false;},true);
  document.addEventListener('zprop:language',()=>{workspace.querySelectorAll('[data-item-copy]').forEach(el=>el.textContent=t(el.dataset.itemCopy));render();});
  function connect(){if(stream||document.hidden)return;stream=new EventSource('/api/dashboard-events');stream.addEventListener('change',refresh);}
  function disconnect(){stream?.close();stream=null;}
  document.addEventListener('visibilitychange',()=>{if(document.hidden)disconnect();else{refresh();connect();}});
  window.addEventListener('pagehide',disconnect);window.addEventListener('pageshow',event=>{if(event.persisted){refresh();connect();}});
  refresh();connect();
  const requested=new URL(location.href).searchParams.get('item');if(requested&&category==='vcards')open(requested);
  return {get active(){return active;},saved(record){clean(record);if(record?.id)query(record.id);refresh();},refresh};
}};
