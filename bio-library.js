window.ZpropBioLibrary = {
  mount({base,publishBase,t,label,esc,initialState,onSelect}) {
    const root=document.querySelector('#tool-workspace'),builder=root.querySelector('.bio-builder');
    const $=selector=>root.querySelector(selector);
    let active=null,pages=[],dirty=false,busy=false,deleteSlug='',loaded=false,listError='';
    const urlFor=slug=>new URL(`/sites/${slug}/`,publishBase).href;
    root.insertAdjacentHTML('afterbegin',`<section id="bio-library"><div class="bio-library-heading"><div><h2 class="workspace-title">${label('myPages')}</h2><p class="bio-hint">${label('manageHelp')}</p></div><button type="button" id="new-bio" class="bio-add">+ ${label('createPage')}</button></div><p id="bio-library-status" class="tool-status" role="status"></p><div id="bio-page-list"></div></section><div id="bio-editor-nav" class="bio-editor-nav" hidden><button type="button" id="back-bio-list">← ${label('myPages')}</button><span id="bio-active-name"></span><span id="bio-dirty" hidden>${label('unsaved')}</span></div>`);
    root.insertAdjacentHTML('beforeend',`<dialog id="create-bio-dialog" class="bio-dialog" aria-labelledby="create-bio-title"><form id="create-bio-form"><div class="bio-dialog-heading"><h2 id="create-bio-title">${label('createPage')}</h2><button type="button" id="cancel-create-bio">×</button></div><label class="bio-create-label">${label('slug')}<div class="bio-address"><span>${esc(publishBase.host)}/sites/</span><input name="newSlug" placeholder="my-bio" required minlength="3" maxlength="50" pattern="[a-z0-9][a-z0-9-]{1,48}[a-z0-9]" autocomplete="off"></div></label><p class="bio-hint">${label('slugHelp')}</p><p class="bio-hint">${label('createHelp')}</p><p id="create-bio-status" class="tool-status" role="status"></p><button type="submit" class="bio-add bio-full-button" id="confirm-create-bio">${label('createPage')} ↗</button></form></dialog><dialog id="delete-bio-dialog" class="bio-dialog" aria-labelledby="delete-bio-title"><h2 id="delete-bio-title">${label('deletePage')}</h2><p class="bio-hint">${label('deleteHelp')}</p><strong id="delete-bio-name"></strong><p id="delete-bio-status" class="tool-status" role="status"></p><div class="tool-actions"><button type="button" id="cancel-delete-bio">${label('cancel')}</button><button type="button" id="confirm-delete-bio" class="bio-danger">${label('deletePage')}</button></div></dialog>`);
    builder.hidden=true;
    function setQuery(slug) {const url=new URL(location.href);slug?url.searchParams.set('page',slug):url.searchParams.delete('page');history.replaceState(null,'',url);}
    async function api(slug,options={}) {
      const response=await window.ZpropAuth.fetch(new URL('api/bio-pages'+(slug?'/'+encodeURIComponent(slug):''),base),options);
      let data;try{data=await response.json();}catch{throw new Error('server');}
      if(!response.ok)throw new Error(data.error||'server');return data;
    }
    const errorText=error=>t(['taken','slugError','notFound','conflict','invalidUrl','imageError','imageTotal','busy'].includes(error.message)?error.message:'server');
    function renderList() {
      $('#bio-library-status').textContent=listError?t(listError):loaded?'':t('loadingPages');
      $('#bio-page-list').innerHTML=pages.length?pages.map(page=>`<article class="bio-page-card" data-page-slug="${esc(page.slug)}"><div><span class="bio-page-badge">${t(page.published?'published':'draft')}</span><h3>${esc(page.name || page.slug)}</h3><p>${esc(urlFor(page.slug))}</p></div><div class="tool-actions"><button type="button" data-page-action="edit">${t('editPage')}</button>${page.published?`<a href="${esc(urlFor(page.slug))}" target="_blank" rel="noopener noreferrer">${t('open')} ↗</a>`:''}<button type="button" data-page-action="delete" class="bio-danger">${t('deletePage')}</button></div></article>`).join(''):loaded&&!listError?`<div class="bio-library-empty"><span aria-hidden="true">▣</span><h3>${t('noPages')}</h3><p class="bio-hint">${t('createHelp')}</p></div>`:'';
      if(listError)$('#bio-page-list').innerHTML=`<button type="button" id="retry-bio-list" class="bio-add">${t('retry')}</button>`;
    }
    async function refresh() {
      listError='';loaded=false;renderList();
      try{pages=(await api()).pages;loaded=true;}catch{listError='loadError';}renderList();
    }
    function select(record) {
      active=record;dirty=false;$('#bio-dirty').hidden=true;$('#bio-library').hidden=true;builder.hidden=false;$('#bio-editor-nav').hidden=false;$('#bio-active-name').textContent=record.slug;
      setQuery(record.slug);onSelect(record);
    }
    async function open(slug) {
      if(busy)return;busy=true;
      try{select(await api(slug));}catch(error){$('#bio-library-status').textContent=errorText(error);}
      finally{busy=false;}
    }
    $('#new-bio').addEventListener('click',()=>{if(busy)return;$('#create-bio-form').reset();$('#create-bio-status').textContent='';$('#create-bio-dialog').showModal();$('#create-bio-form [name=newSlug]').focus();});
    $('#cancel-create-bio').addEventListener('click',()=>{if(!busy)$('#create-bio-dialog').close();});
    $('#create-bio-dialog').addEventListener('cancel',event=>{if(busy)event.preventDefault();});
    $('#create-bio-form').addEventListener('submit',async event=>{
      event.preventDefault();if(busy)return;
      const form=event.currentTarget,slug=form.elements.newSlug.value;
      if(!form.reportValidity())return;
      busy=true;$('#confirm-create-bio').disabled=true;$('#create-bio-status').textContent=t('saving');
      try{const record=await api('',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug,state:structuredClone(initialState)})});$('#create-bio-dialog').close();select(record);}
      catch(error){$('#create-bio-status').textContent=errorText(error);}
      finally{busy=false;$('#confirm-create-bio').disabled=false;}
    });
    $('#back-bio-list').addEventListener('click',async()=>{
      if(busy || (dirty&&!window.confirm(t('discard'))))return;
      dirty=false;active=null;builder.hidden=true;$('#bio-editor-nav').hidden=true;$('#bio-library').hidden=false;setQuery('');await refresh();
    });
    $('#bio-page-list').addEventListener('click',event=>{
      if(event.target.closest('#retry-bio-list')){refresh();return;}
      const button=event.target.closest('[data-page-action]');if(!button||busy)return;
      const slug=button.closest('[data-page-slug]').dataset.pageSlug;
      if(button.dataset.pageAction==='edit')open(slug);
      else{deleteSlug=slug;$('#delete-bio-name').textContent=urlFor(slug);$('#delete-bio-status').textContent='';$('#delete-bio-dialog').showModal();$('#cancel-delete-bio').focus();}
    });
    $('#cancel-delete-bio').addEventListener('click',()=>{if(!busy)$('#delete-bio-dialog').close();});
    $('#delete-bio-dialog').addEventListener('cancel',event=>{if(busy)event.preventDefault();});
    $('#confirm-delete-bio').addEventListener('click',async()=>{
      if(busy)return;busy=true;$('#confirm-delete-bio').disabled=true;
      try{await api(deleteSlug,{method:'DELETE'});$('#delete-bio-dialog').close();await refresh();}
      catch(error){$('#delete-bio-status').textContent=errorText(error);}
      finally{busy=false;$('#confirm-delete-bio').disabled=false;}
    });
    window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
    function localize(){renderList();$('#cancel-create-bio').setAttribute('aria-label',t('close'));}
    localize();document.addEventListener('zprop:language',localize);
    return {
      get active(){return active;},
      changed(){dirty=true;$('#bio-dirty').hidden=false;},
      async load(){await refresh();const slug=new URL(location.href).searchParams.get('page');if(slug)await open(slug);},
      async save({state,html,publish}) {
        if(!active||busy)throw new Error('busy');busy=true;
        try{const record=await api(active.slug,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug:active.slug,state,html,publish,revision:active.revision})});active=record;dirty=false;$('#bio-dirty').hidden=true;$('#bio-active-name').textContent=record.slug;setQuery(record.slug);return record;}
        finally{busy=false;}
      }
    };
  }
};
