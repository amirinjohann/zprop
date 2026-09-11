(() => {
  const copy = {
    tag:['RINGKASAN AKAUN','ACCOUNT OVERVIEW'],
    description:['Jumlah item yang telah anda cipta, mengikut kategori.','Your created items, counted by category.'],
    summary:['Ringkasan item','Item summary'], total:['jumlah item','total items'],
    totalLinks:['Jumlah Links','Total Links'], totalDescription:['Semua link anda. Satu ruang.','All your links. One workspace.'], categories:['Kategori digunakan','Categories in use'],
    refresh:['Muat semula','Refresh'], loading:['Mengira item anda…','Counting your items…'],
    updated:['Dikemas kini secara automatik.','Updated automatically.'],
    empty:['Belum ada item. Pilih kategori untuk mencipta item pertama anda.','No items yet. Choose a category to create your first item.'],
    error:['Jumlah tidak dapat dimuatkan. Cuba muat semula.','Could not load your counts. Please refresh to try again.'],
    note:['Termasuk draf halaman bio dan kod QR yang disimpan. Setiap vCard unik dikira sekali selepas dijana untuk muat turun.','Includes bio page drafts and saved QR codes. Each unique vCard is counted once when generated for download.'],
    suite:['ALATAN ZPROP','ZPROP TOOLS'], sidebarNote:['Identiti sendiri.<br>Ruang milik anda.','Your own identity.<br>Your own space.'], allTools:['Semua alatan','All tools'], help:['Perlukan bantuan?','Need help?']
  };
  let data = null, state = 'loading', busy = false, pending = false, stream = null;
  const grid = document.querySelector('#summary-grid');
  const refresh = document.querySelector('#summary-refresh');
  function render() {
    const language = document.documentElement.lang === 'en' ? 1 : 0;
    document.title = 'Dashboard — ZPROP';
    document.querySelector('meta[name=description]').content = copy.description[language];
    document.querySelector('#tool-tag').textContent = copy.tag[language];
    document.querySelector('#tool-description').textContent = copy.description[language];
    document.querySelectorAll('[data-summary-copy]').forEach(el => { el.textContent = copy[el.dataset.summaryCopy][language]; });
    document.querySelectorAll('[data-tool-copy]').forEach(el => { el.innerHTML = copy[el.dataset.toolCopy][language]; });
    document.querySelectorAll('[data-tool-name]').forEach(el => {
      el.textContent = window.ZPROP_TOOLS.find(tool => tool.id === el.dataset.toolName)?.name[language] || 'Dashboard';
    });
    const format = new Intl.NumberFormat(language ? 'en-MY' : 'ms-MY');
    document.querySelectorAll('[data-summary-count]').forEach(el => { el.textContent = data ? format.format(data.counts[el.dataset.summaryCount]) : '—'; });
    document.querySelector('#summary-total').textContent = data ? format.format(data.total) : '—';
    document.querySelector('#summary-active-categories').textContent = data ? `${Object.values(data.counts).filter(count => count > 0).length} / ${window.ZPROP_TOOLS.length}` : `— / ${window.ZPROP_TOOLS.length}`;
    document.querySelectorAll('[data-distribution]').forEach(el => {
      el.style.width = `${data?.total ? data.counts[el.dataset.distribution] / data.total * 100 : 0}%`;
    });
    document.querySelector('#summary-status').textContent = copy[state][language];
    document.querySelector('#summary-status').classList.toggle('summary-error', state === 'error');
    grid.setAttribute('aria-busy', String(busy));
    refresh.disabled = busy;
    window.ZpropDashboardLinks.render(data,state);
  }
  async function update() {
    if (document.hidden) return;
    if (busy) { pending = true; return; }
    busy = true; state = 'loading'; render();
    try {
      if (!await window.ZpropAuth.ready) return;
      const response = await window.ZpropAuth.fetch('/api/dashboard-links', { cache:'no-store', signal:AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error('stats');
      const next = await response.json();
      if (!next.counts || !Array.isArray(next.links) || next.links.length!==next.total || !Number.isSafeInteger(next.total) || next.total < 0 || window.ZPROP_TOOLS.some(tool => !Number.isSafeInteger(next.counts[tool.id]) || next.counts[tool.id] < 0)) throw new Error('stats');
      data = next;
      state = data.total ? 'updated' : 'empty';
    } catch { data = null; state = 'error'; }
    finally { busy = false; render(); if(pending) {pending=false;update();} }
  }
  async function connect() {
    if(stream || document.hidden || !await window.ZpropAuth.ready) return;
    if(stream || document.hidden) return;
    stream=new EventSource('/api/dashboard-events');
    stream.addEventListener('change',update);
    stream.onerror=()=>{ update(); };
  }
  function disconnect() {stream?.close();stream=null;}
  refresh.addEventListener('click', update);
  document.addEventListener('zprop:links-changed',update);
  document.addEventListener('zprop:language', render);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) {update();connect();} else disconnect(); });
  window.addEventListener('pageshow', event => { if (event.persisted) {update();connect();} });
  window.addEventListener('pagehide',disconnect);
  setInterval(update, 30000);
  render(); update(); connect();
  window.ZpropNavigation?.ready();
  window.ZpropLanguage?.ready();
})();
