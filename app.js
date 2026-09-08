(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const properties = window.ZPROP_PROPERTIES;
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const storage = { get(key) { try { return localStorage.getItem(key); } catch { return null; } }, set(key,value) { try { localStorage.setItem(key,value); } catch {} }, remove(key) { try { localStorage.removeItem(key); } catch {} } };
  const ms = {};
  $$('[data-i18n]').forEach(el => { ms[el.dataset.i18n] = el.innerHTML; });
  $$('[data-placeholder]').forEach(el => { ms[el.dataset.placeholder] = el.placeholder; });
  $$('[data-alt]').forEach(el => { ms[el.dataset.alt] = el.alt; });
  const dynamic = {
    ms: { sale:'UNTUK DIJUAL', rent:'Sewa', beds:'bilik', baths:'bilik air', details:'Lihat butiran', save:'Simpan', unsave:'Buang daripada simpanan', results:'hartanah ditemui', viewing:'Atur lawatan', close:'Tutup', property:'Hartanah kediaman', reference:'Rujukan hartanah', detailNote:'Berminat dengan hartanah ini? Hubungi kami untuk mengesahkan harga, butiran dan ketersediaan serta mengatur lawatan.', general:'Hai ZPROP, saya ingin mendapatkan maklumat tentang perkhidmatan hartanah anda.', viewingMessage:'Hai ZPROP, saya berminat dengan', viewingEnd:'Boleh kongsikan maklumat lanjut dan aturkan lawatan?', menuOpen:'Buka menu', menuClose:'Tutup menu', cleared:'Pilihan yang disimpan telah dipadam.', title:'ZPROP — Ruang baharu, cerita baharu.', description:'Temui rumah anda bersama ZPROP. Khidmat jual, beli dan sewa hartanah di Melaka dan sekitarnya.', nav:'Navigasi utama', searchLabel:'Cari hartanah', intentLabel:'Tujuan hartanah', filterLabel:'Tapis hartanah', month:'/ bulan' },
    en: { sale:'FOR SALE', rent:'Rent', beds:'beds', baths:'baths', details:'View details', save:'Save', unsave:'Remove from saved', results:'properties found', viewing:'Arrange a viewing', close:'Close', property:'Residential property', reference:'Property reference', detailNote:'Interested in this property? Contact us to confirm the price, details and availability, and arrange a viewing.', general:'Hi ZPROP, I would like to know more about your property services.', viewingMessage:'Hi ZPROP, I am interested in', viewingEnd:'Could you share more details and arrange a viewing?', menuOpen:'Open menu', menuClose:'Close menu', cleared:'Your saved preferences have been cleared.', title:'ZPROP — A new space. A new story.', description:'Find your next home with ZPROP. Buy, sell and rent properties in Melaka and the surrounding areas.', nav:'Main navigation', searchLabel:'Property search', intentLabel:'Property purpose', filterLabel:'Filter properties', month:'/ month' }
  };
  let lang = 'ms';
  let saved;
  try { const value = JSON.parse(storage.get('zprop-saved')); saved = new Set(Array.isArray(value) ? value.filter(id => properties.some(p => p.id === id)) : []); } catch { saved = new Set(); }
  let intent = 'sale';
  let filter = 'all';
  let limit = 3;
  let query = { location:'', state:'', budget:0 };
  let currentProperty = null;
  const t = key => dynamic[lang][key] ?? (lang === 'en' ? window.ZPROP_EN[key] : ms[key]) ?? key;
  const money = number => 'RM' + new Intl.NumberFormat('en-MY').format(number);
  const whatsapp = message => 'https://wa.me/60197775707?text=' + encodeURIComponent(message);
  const icon = name => {
    const paths = { pin:'<path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>', bed:'<path d="M3 19V5m18 14v-9H3m0 6h18M7 10V6h6v4"/>', bath:'<path d="M3 12h18v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Zm3 0V5a2 2 0 0 1 4 0M6 19v2m12-2v2"/>', area:'<rect x="4" y="4" width="16" height="16"/><path d="m8 16 8-8M8 12v4h4m0-8h4v4"/>', heart:'<path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z"/>' };
    return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
  };
  const specs = p => `<div class="property-specs"><span>${icon('bed')}${p.beds} ${t('beds')}</span><span>${icon('bath')}${p.baths} ${t('baths')}</span><span>${icon('area')}${p.area.toLocaleString('en-MY')} ft²</span></div>`;
  function render() {
    const results = properties.filter(p => p.status === intent && (filter === 'all' || (filter === 'saved' ? saved.has(p.id) : p.state === filter)) && (!query.state || p.state === query.state) && (!query.budget || p.price < query.budget) && (!query.location || (p.name+' '+p.location).toLowerCase().includes(query.location)));
    $('#result-count').textContent = `${results.length} ${t('results')}`;
    $('#saved-count').textContent = saved.size ? `(${saved.size})` : '';
    $('#property-grid').innerHTML = results.slice(0,limit).map(p => `<article class="property-card"><div class="property-image"><button type="button" data-detail="${p.id}" aria-label="${escape(t('details') + ': ' + p.name)}"><img src="${escape(p.image)}" alt="${escape(p.name)}" loading="lazy" width="600" height="400"></button><span class="property-badge">${t(p.status)}</span><button type="button" class="save-button" data-save="${p.id}" aria-pressed="${saved.has(p.id)}" aria-label="${escape((saved.has(p.id)?t('unsave'):t('save'))+': '+p.name)}">${icon('heart')}</button></div><div class="property-body"><div class="property-location">${icon('pin')}${escape(p.location)}</div><h3 class="property-title"><button type="button" data-detail="${p.id}">${escape(p.name)}</button></h3><div class="property-price">${money(p.price)}${p.status==='rent'?` <small>${t('month')}</small>`:''}</div>${specs(p)}<div class="property-bottom"><span>${t('property')}</span><button type="button" data-detail="${p.id}"><span>${t('details')}</span><span aria-hidden="true">↗</span></button></div></div></article>`).join('');
    $('#empty-state').hidden = results.length !== 0;
    $('#load-more').hidden = results.length <= limit;
    $$('[data-filter]').forEach(button => { const active = button.dataset.filter === filter; button.classList.toggle('active',active); button.setAttribute('aria-pressed',String(active)); });
    $$('[data-intent]').forEach(button => { const active = button.dataset.intent === intent; button.classList.toggle('active',active); button.setAttribute('aria-pressed',String(active)); });
  }
  function renderDetail(p) {
    $('#dialog-content').innerHTML = `<img class="detail-image" src="${escape(p.image)}" alt="${escape(p.name)}"><div class="detail-body"><div class="eyebrow">${t(p.status)}</div><h2 id="dialog-title">${escape(p.name)}</h2><div class="property-location">${icon('pin')}${escape(p.location)}</div><div class="property-price">${money(p.price)}${p.status==='rent'?` <small>${t('month')}</small>`:''}</div>${specs(p)}<p>${t('detailNote')}</p><a class="button button-dark" href="${whatsapp(`${t('viewingMessage')} ${p.name}, ${p.location} (${money(p.price)}, ZP-${p.id}). ${t('viewingEnd')}`)}" target="_blank" rel="noopener noreferrer"><span>${t('viewing')}</span><span aria-hidden="true">↗</span></a><div class="detail-ref">${t('reference')}: ZP-${p.id}</div></div>`;
  }
  function setLanguage(next, persist=true) {
    lang = next === 'en' ? 'en' : 'ms';
    document.documentElement.lang = lang;
    const portalLink = document.querySelector('[data-i18n="navPortal"]');
    if (portalLink) portalLink.href = `landing.html?lang=${lang}`;
    document.title = t('title');
    $('meta[name="description"]').content = t('description');
    $('meta[property="og:title"]').content = t('title');
    $('meta[property="og:description"]').content = t('description');
    $$('[data-i18n]').forEach(el => { el.innerHTML = t(el.dataset.i18n); });
    $$('[data-placeholder]').forEach(el => { el.placeholder = t(el.dataset.placeholder); });
    $$('[data-alt]').forEach(el => { el.alt = t(el.dataset.alt); });
    $$('[data-lang]').forEach(el => el.setAttribute('aria-pressed',String(el.dataset.lang===lang)));
    $$('[data-close]').forEach(el => el.setAttribute('aria-label',t('close')));
    $('#main-nav').setAttribute('aria-label',t('nav'));
    $('.search-section').setAttribute('aria-label',t('searchLabel'));
    $('.search-tabs').setAttribute('aria-label',t('intentLabel'));
    $('.filter-pills').setAttribute('aria-label',t('filterLabel'));
    $('.menu-toggle').setAttribute('aria-label',t($('#main-nav').classList.contains('open')?'menuClose':'menuOpen'));
    $('[data-whatsapp="general"]').href = whatsapp(t('general'));
    if(persist) storage.set('zprop-language',lang);
    try { const url = new URL(location.href); url.searchParams.set('lang',lang); history.replaceState(null,'',url); } catch {}
    render();
    if(currentProperty) renderDetail(currentProperty);
  }
  $$('[data-lang]').forEach(el => el.addEventListener('click',() => setLanguage(el.dataset.lang)));
  $$('[data-intent]').forEach(el => el.addEventListener('click',() => {
    if(el.dataset.intent==='sell') { $('#contact-interest').value='sell'; $('#contact').scrollIntoView({behavior:'smooth'}); $('#contact-form input').focus({preventScroll:true}); return; }
    intent=el.dataset.intent; limit=3; render();
  }));
  $('#search-form').addEventListener('submit',event => {
    event.preventDefault(); query = { location:$('#search-location').value.trim().toLowerCase(), state:$('#search-state').value, budget:Number($('#search-budget').value) }; filter='all'; limit=3; render(); $('#properties').scrollIntoView({behavior:'smooth'});
  });
  $$('[data-filter]').forEach(el => el.addEventListener('click',() => {
    filter=el.dataset.filter; limit=3;
    // A location pill starts a fresh location search; no hidden conflicting filters.
    query={location:'',state:'',budget:0}; $('#search-form').reset();
    if(filter==='saved') intent='sale';
    render();
  }));
  $('#reset-search').addEventListener('click',() => { intent='sale'; filter='all'; query={location:'',state:'',budget:0}; limit=3; $('#search-form').reset(); render(); });
  $('#load-more').addEventListener('click',() => { const previous=limit; limit=properties.length; render(); const next=$$('.property-card')[previous]?.querySelector('button'); next?.focus({preventScroll:true}); });
  $('#property-grid').addEventListener('click',event => {
    const saveButton=event.target.closest('[data-save]');
    if(saveButton) { const id=saveButton.dataset.save; saved.has(id)?saved.delete(id):saved.add(id); storage.set('zprop-saved',JSON.stringify([...saved])); render(); ($(`[data-save="${id}"]`) || $('[data-filter="saved"]')).focus({preventScroll:true}); return; }
    const detail=event.target.closest('[data-detail]');
    if(detail) { currentProperty=properties.find(p=>p.id===detail.dataset.detail); renderDetail(currentProperty); $('#property-dialog').showModal(); }
  });
  $$('dialog').forEach(dialog => {
    dialog.querySelector('[data-close]').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('click',event => { if(event.target===dialog) { const rect=dialog.getBoundingClientRect(); if(event.clientX<rect.left || event.clientX>rect.right || event.clientY<rect.top || event.clientY>rect.bottom) dialog.close(); } });
  });
  $('#property-dialog').addEventListener('close',()=> { currentProperty=null; });
  $('.menu-toggle').addEventListener('click',()=> { const open=$('#main-nav').classList.toggle('open'); $('.menu-toggle').setAttribute('aria-expanded',String(open)); $('.menu-toggle').setAttribute('aria-label',t(open?'menuClose':'menuOpen')); });
  $$('#main-nav a').forEach(el=>el.addEventListener('click',()=> { $('#main-nav').classList.remove('open'); $('.menu-toggle').setAttribute('aria-expanded','false'); $('.menu-toggle').setAttribute('aria-label',t('menuOpen')); }));
  document.addEventListener('keydown',event=> { if(event.key==='Escape' && $('#main-nav').classList.contains('open')) { $('#main-nav').classList.remove('open'); $('.menu-toggle').setAttribute('aria-expanded','false'); $('.menu-toggle').setAttribute('aria-label',t('menuOpen')); $('.menu-toggle').focus(); } });
  $$('[data-service]').forEach(el=>el.addEventListener('click',()=> { $('#contact-interest').value=el.dataset.service; }));
  $('#contact-form').addEventListener('submit',event=> {
    event.preventDefault();
    const form=event.currentTarget; const name=form.elements.name.value.trim();
    if(!name) { form.elements.name.setCustomValidity(lang==='ms'?'Sila masukkan nama anda.':'Please enter your name.'); form.elements.name.reportValidity(); return; }
    const interest=$('#contact-interest').selectedOptions[0].textContent;
    const message=lang==='ms'?`Hai ZPROP, saya ${name}.\nSaya berminat: ${interest}.`:`Hi ZPROP, my name is ${name}.\nI’m interested in: ${interest}.`;
    window.open(whatsapp(`${message}\n\n${form.elements.message.value.trim()}`),'_blank','noopener,noreferrer');
  });
  $('#contact-form input').addEventListener('input',event=>event.target.setCustomValidity(''));
  $('#privacy-button').addEventListener('click',()=> { $('#privacy-status').textContent=''; $('#privacy-dialog').showModal(); });
  $('#clear-preferences').addEventListener('click',()=> { storage.remove('zprop-saved'); storage.remove('zprop-language'); window.ZpropTheme?.reset(); saved.clear(); render(); $('#privacy-status').textContent=t('cleared'); });
  $('#year').textContent=new Date().getFullYear();
  const urlLang=new URLSearchParams(location.search).get('lang');
  setLanguage(['ms','en'].includes(urlLang)?urlLang:storage.get('zprop-language'),false);
})();
