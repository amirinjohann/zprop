(() => {
  const $ = selector => document.querySelector(selector);
  const copy = {
    intro:['Semua kategori dalam satu senarai.','All categories in one list.'],create:['+ Cipta link','+ Create link'],export:['Eksport CSV','Export CSV'],search:['Cari link','Search links'],category:['Kategori','Category'],all:['Semua kategori','All categories'],link:['Link','Link'],status:['Status','Status'],updated:['Dikemas kini','Updated'],actions:['Tindakan','Actions'],previous:['Sebelumnya','Previous'],next:['Seterusnya','Next'],
    published:['Diterbitkan','Published'],draft:['Draf','Draft'],saved:['Disimpan','Saved'],generated:['Dijana','Generated'],noUrl:['Tiada URL awam','No public URL'],open:['Buka','Open'],edit:['Edit','Edit'],copy:['Salin','Copy'],delete:['Padam','Delete'],cancel:['Batal','Cancel'],deleteTitle:['Padam link?','Delete link?'],deleteHelp:['Item ini akan dikeluarkan daripada akaun anda. Pautan awam yang dihoskan di sini tidak lagi boleh dibuka. Fail yang sudah dimuat turun tidak terjejas.','This item will be removed from your account. Public links hosted here will stop working. Previously downloaded files are unaffected.'],
    loading:['Memuatkan link…','Loading links…'],empty:['Belum ada link. Pilih Cipta link untuk bermula.','No links yet. Choose Create link to get started.'],noMatches:['Tiada link sepadan dengan carian ini.','No links match your search.'],error:['Senarai tidak dapat dimuatkan. Cuba muat semula.','Could not load the list. Please refresh to try again.'],copyOk:['Pautan disalin.','Link copied.'],copyError:['Tidak dapat menyalin pautan. Cuba lagi.','Could not copy the link. Please try again.'],deleteError:['Tidak dapat memadam item. Muat semula senarai dan cuba lagi.','Could not delete the item. Refresh the list and try again.'],deleted:['Item dipadam.','Item deleted.'],showing:['Dipaparkan','Showing'],of:['daripada','of'],items:['item','items']
  };
  const lang = () => document.documentElement.lang === 'en' ? 1 : 0;
  const t = key => copy[key]?.[lang()] || key;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const tool = category => window.ZPROP_TOOLS.find(item => item.id === category);
  let snapshot = null, state = 'loading', page = 1, pendingDelete = null, deleting = false, actionStatus = '';
  const pageSize = 20;
  function publicUrl(item) {
    if (!item.url) return null;
    try { const url = new URL(item.url, window.ZPROP_PUBLIC_ORIGIN); return ['http:','https:'].includes(url.protocol) ? url.href : null; } catch { return null; }
  }
  function matches() {
    const query = $('#links-search').value.trim().toLocaleLowerCase();
    const category = $('#links-category').value;
    return (snapshot?.links || []).filter(item => (!category || item.category===category) && (!query || [item.name,publicUrl(item),tool(item.category)?.name[lang()]].join(' ').toLocaleLowerCase().includes(query)));
  }
  function render() {
    document.querySelectorAll('[data-links-copy]').forEach(el => { el.textContent = t(el.dataset.linksCopy); });
    const number = new Intl.NumberFormat(lang()?'en-MY':'ms-MY');
    $('#links-total').textContent = snapshot ? number.format(snapshot.total) : '—';
    $('#links-action-status').textContent = actionStatus ? t(actionStatus) : '';
    $('#links-export').disabled = !snapshot?.links.length;
    const filtered = matches(), pages = Math.max(1,Math.ceil(filtered.length/pageSize));
    page = Math.min(page,pages);
    const rows = filtered.slice((page-1)*pageSize,page*pageSize);
    const date = new Intl.DateTimeFormat(lang()?'en-MY':'ms-MY',{day:'numeric',month:'short',year:'numeric'});
    const focused = document.activeElement?.closest('[data-link-action]');
    const focusKey = focused ? [focused.dataset.linkAction,focused.dataset.category,focused.dataset.id] : null;
    $('#links-rows').innerHTML = rows.map(item => {
      const category = tool(item.category), url = publicUrl(item);
      const attrs = `data-category="${esc(item.category)}" data-id="${esc(item.id)}"`;
      const manage = item.manageUrl ? new URL(item.manageUrl,location.origin) : null;
      if(manage) manage.searchParams.set('lang',lang()?'en':'ms');
      const stamp = item.updatedAt && !Number.isNaN(Date.parse(item.updatedAt)) ? `<time datetime="${esc(item.updatedAt)}">${esc(date.format(new Date(item.updatedAt)))}</time>` : '—';
      return `<tr ${attrs}><td><div class="links-identity"><span class="summary-icon" aria-hidden="true">${esc(category.icon)}</span><div><strong>${esc(item.name)}</strong>${url?`<a class="links-url" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(url)}</a>`:`<span class="links-url">${t('noUrl')}</span>`}</div></div></td><td data-label="${t('category')}">${esc(category.name[lang()])}</td><td data-label="${t('status')}"><span class="links-badge links-${esc(item.status)}">${t(item.status)}</span></td><td data-label="${t('updated')}">${stamp}</td><td><div class="links-row-actions">${manage?`<a href="${esc(manage.href)}">${t('edit')}</a>`:''}${url?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${t('open')} ↗</a><button type="button" data-link-action="copy" ${attrs} aria-label="${esc(t('copy')+' '+item.name)}">${t('copy')}</button>`:''}<button type="button" data-link-action="delete" ${attrs} class="links-danger" aria-label="${esc(t('delete')+' '+item.name)}">${t('delete')}</button></div></td></tr>`;
    }).join('');
    if(focusKey) [...document.querySelectorAll('[data-link-action]')].find(el=>el.dataset.linkAction===focusKey[0]&&el.dataset.category===focusKey[1]&&el.dataset.id===focusKey[2])?.focus({preventScroll:true});
    $('#links-empty').hidden = rows.length>0;
    $('#links-empty').textContent = t(!snapshot ? (state==='error'?'error':'loading') : snapshot.links.length?'noMatches':'empty');
    $('#links-previous').disabled = page===1;
    $('#links-next').disabled = page===pages;
    $('#links-page-info').textContent = snapshot ? `${t('showing')} ${number.format(filtered.length?(page-1)*pageSize+1:0)}–${number.format(Math.min(page*pageSize,filtered.length))} ${t('of')} ${number.format(filtered.length)} ${t('items')}` : '';
  }
  $('#links-search').addEventListener('input',()=>{page=1;render();});
  $('#links-category').addEventListener('change',()=>{page=1;render();});
  $('#links-previous').addEventListener('click',()=>{page--;render();});
  $('#links-next').addEventListener('click',()=>{page++;render();});
  $('#links-create').addEventListener('click',()=>{
    const options=$('#links-create-options');options.hidden=!options.hidden;
    $('#links-create').setAttribute('aria-expanded',String(!options.hidden));
  });
  $('#links-rows').addEventListener('click',async event=>{
    const button=event.target.closest('[data-link-action]');if(!button)return;
    const item=snapshot?.links.find(item=>item.category===button.dataset.category&&item.id===button.dataset.id);if(!item)return;
    if(button.dataset.linkAction==='copy') {
      try {await navigator.clipboard.writeText(publicUrl(item));actionStatus='copyOk';}
      catch {actionStatus='copyError';} render();
    } else {
      pendingDelete=item;$('#links-delete-name').textContent=item.name;$('#links-delete-error').textContent='';$('#links-delete-dialog').showModal();
    }
  });
  $('#links-delete-dialog').addEventListener('cancel',event=>{if(deleting)event.preventDefault();});
  $('#links-confirm-delete').addEventListener('click',async()=>{
    if(!pendingDelete||deleting)return;
    deleting=true;$('#links-delete-dialog').querySelectorAll('button').forEach(button=>{button.disabled=true;});
    try {
      const response=await window.ZpropAuth.fetch(`/api/dashboard-links/${pendingDelete.category}/${encodeURIComponent(pendingDelete.id)}`,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:pendingDelete.revision}),signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw new Error('delete');
      $('#links-delete-dialog').close();pendingDelete=null;actionStatus='deleted';
      document.dispatchEvent(new Event('zprop:links-changed'));
    } catch {$('#links-delete-error').textContent=t('deleteError');}
    finally {deleting=false;$('#links-delete-dialog').querySelectorAll('button').forEach(button=>{button.disabled=false;});render();}
  });
  $('#links-export').addEventListener('click',()=>{
    const cell = value => '"'+String(value??'').replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"';
    const rows=[[t('link'),t('category'),'URL',t('status'),t('updated')],...matches().map(item=>[item.name,tool(item.category).name[lang()],publicUrl(item)||'',t(item.status),item.updatedAt||''])];
    const url=URL.createObjectURL(new Blob(['\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='zprop-links.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  window.ZpropDashboardLinks={render(next,nextState){snapshot=next;state=nextState;render();}};
  render();
})();
