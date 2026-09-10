// Regenerate the static tool shells after changing the shared catalogue.
const fs=require('node:fs');
const path=require('node:path');
global.window={};
require('../tools-catalog.js');
const root=path.resolve(__dirname,'..');
const catalogue=window.ZPROP_TOOLS;
const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
fs.mkdirSync(path.join(root,'tools'),{recursive:true});
fs.copyFileSync(require.resolve('qrcode-generator'), path.join(root,'assets/vendor/qrcode.js'));
const overview = { id:'dashboard', icon:'▦', name:['Dashboard','Dashboard'], tag:['RINGKASAN AKAUN','ACCOUNT OVERVIEW'], title:['Dashboard','Dashboard'], description:['Jumlah item yang telah anda cipta, mengikut kategori.','Your created items, counted by category.'], features:[], availability:['',''] };
const profile = {id:'profile',icon:'',name:['Urus akaun','Manage account'],tag:['AKAUN ANDA','YOUR ACCOUNT'],title:['Urus akaun','Manage account'],description:['Urus gambar profil, alamat e-mel dan kata laluan anda.','Manage your profile photo, email address and password.'],features:[],availability:['','']};
for(const tool of [overview, ...catalogue, profile]){
  const sidebar=`<a href="dashboard.html" data-local data-tool-link="dashboard" ${tool.id==='dashboard'?'aria-current="page"':''}><span aria-hidden="true">▦</span><span>Dashboard</span><span class="tool-nav-arrow" aria-hidden="true">↗</span></a>`+catalogue.map(t=>`<a href="${t.id}.html" data-local data-tool-link="${t.id}" ${t.id===tool.id?'aria-current="page"':''}><span aria-hidden="true">${t.icon}</span><span data-tool-name="${t.id}">${t.name[0]}</span><span class="tool-nav-arrow" aria-hidden="true">↗</span></a>`).join('\n');
  const page=`<!DOCTYPE html>
<html lang="ms"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#183e32"><meta name="description" content="${esc(tool.description[0])}"><title>${tool.name[0]} — ZPROP</title><script src="../theme.js"></script><link rel="icon" type="image/png" href="../assets/zprop-tech-logo-clean.png"><link rel="stylesheet" href="../portal.css"><link rel="stylesheet" href="../tool-pages.css"><script src="../public-origin.js" defer></script><script src="../tools-catalog.js" defer></script><script src="../portal.js" defer></script><script src="../auth.js" defer></script><script src="../tool-pages.js" defer></script></head>
<body class="portal-page tool-page" data-tool="${tool.id}"><a class="portal-skip" href="#main" data-copy="skip">Langkau ke kandungan</a><div class="portal-shell">
<header class="portal-header"><a class="portal-brand" href="../landing.html" data-local aria-label="ZPROP TECH"><img class="portal-logo" src="../assets/zprop-tech-logo-clean.png" alt="ZPROP TECH" width="48" height="48"><span><strong>ZPROP<span>. TECH</span></strong><small data-copy="brandLine">Ruang baharu. Cerita baharu.</small></span></a><nav class="portal-nav" aria-label="Portal"><a href="../landing.html" data-local class="back-portal"><span aria-hidden="true">←</span><span data-copy="backPortal">Kembali ke portal</span></a><div class="portal-language" role="group" aria-label="Bahasa / Language"><button data-language="ms" aria-pressed="true">BM</button><span>/</span><button data-language="en" aria-pressed="false">EN</button></div><a href="../sign-in.html" data-local class="nav-sign-in"><span aria-hidden="true">⇥</span><span data-copy="signIn">Log masuk</span></a></nav></header>
<div class="tools-layout"><aside class="tools-sidebar"><span class="section-kicker" data-tool-copy="suite">ALATAN ZPROP</span><nav aria-label="ZPROP tools">${sidebar}</nav><div class="sidebar-note"><span aria-hidden="true">⌂</span><p data-tool-copy="sidebarNote">Identiti sendiri.<br>Ruang milik anda.</p></div></aside>
<main id="main" class="tool-main"><div class="tool-breadcrumb"><a href="../landing.html" data-local>Portal</a><span aria-hidden="true">/</span><span data-tool-name="${tool.id}">${tool.name[0]}</span></div><div class="tool-heading"><span class="tool-heading-icon" aria-hidden="true">${tool.icon}</span><span class="section-kicker" id="tool-tag">${tool.tag[0]}</span><h1 id="tool-title">${tool.title[0]}</h1><p id="tool-description">${tool.description[0]}</p></div><div class="tool-capabilities" id="tool-capabilities">${tool.features.map(f=>`<span>✓ ${f[0]}</span>`).join('')}</div>
<div class="tool-workspace" id="tool-workspace"></div><p class="tool-availability" id="tool-availability">${tool.availability[0]}</p><noscript><p>Aktifkan JavaScript untuk menggunakan alatan ini. / Enable JavaScript to use this tool.</p></noscript>
<div class="tool-bottom"><a href="../landing.html" data-local><span aria-hidden="true">←</span> <span data-tool-copy="allTools">Semua alatan</span></a><a href="../index.html#contact" data-local><span data-tool-copy="help">Perlukan bantuan?</span> ↗</a></div></main></div>
<footer class="portal-footer"><span>© <span data-year>2026</span> ZPROPTECH. <span data-copy="rights">Hak cipta terpelihara.</span></span><a href="../index.html" data-local><span data-copy="backWebsite">Ke laman web ZPROP</span> ↗</a><span data-copy="footerLine">Identiti ZPROP. Ruang milik anda.</span></footer></div></body></html>`;
  let output=page.replaceAll('../index.html#contact','../landing.html#how-it-works');
  output=output.replace(/<aside class="tools-sidebar">[\s\S]*?<\/aside>/, '<aside class="tools-sidebar">'+require('./workspace-sidebar-shell.cjs')(sidebar)+'</aside>');
  output=output.replace('<script src="../theme.js"></script>', '<script src="../theme.js"></script><script src="../workspace-sidebar.js"></script>');
  if(tool.id==='profile') output=output.replace('../tool-pages.js','../profile-settings.js').replace('</head>','<link rel="stylesheet" href="../profile-settings.css"></head>').replace('<div class="tool-workspace" id="tool-workspace"></div>','<div class="tool-workspace" id="tool-workspace">'+require('./profile-settings-shell.cjs')()+'</div>');
  if(tool.id==='dashboard') output=output.replace('../tool-pages.js','../dashboard-summary.js').replace('</head>','<link rel="stylesheet" href="../dashboard-summary.css"></head>')
    .replace('<div class="tool-workspace" id="tool-workspace"></div>', require('./dashboard-summary-shell.cjs')(catalogue));
  if(tool.id==='dashboard') output=output.replace('<div class="tool-bottom">',require('./dashboard-links-shell.cjs')(catalogue)+'<div class="tool-bottom">').replace('<script src="../dashboard-summary.js" defer></script>','<script src="../dashboard-links.js" defer></script><script src="../dashboard-summary.js" defer></script>');
  if(tool.id==='qr-codes') output=output.replace('<script src="../tool-pages.js" defer></script>','<script src="../assets/vendor/qrcode.js" defer></script><script src="../qr-model.js" defer></script><script src="../qr-page.js" defer></script>').replace('</head>','<link rel="stylesheet" href="../qr-page.css"></head>');
  if(tool.id==='host-html') output=output.replace('../tool-pages.js','../static-site.js').replace('</head>','<link rel="stylesheet" href="../static-site.css"></head>');
  if(tool.id==='short-links') output=output.replace('../tool-pages.js','../short-links-page.js').replace('</head>','<link rel="stylesheet" href="../short-links-page.css"></head>');
  if(tool.id==='bio-pages') output=output.replace('<script src="../tool-pages.js" defer></script>','<script src="../bio-model.js" defer></script><script src="../bio-library.js" defer></script><script src="../bio-drag.js" defer></script><script src="../bio-page.js" defer></script>').replace('</head>','<link rel="stylesheet" href="../bio-page.css"></head>');
  if(['transfer-files','vcards','host-html'].includes(tool.id)) {
    const editor=tool.id==='host-html'?'static-site':'tool-pages';
    output=output.replace('<script src="../'+editor+'.js" defer></script>','<script src="../vcard-model.js" defer></script><script src="../item-library.js" defer></script><script src="../'+editor+'.js" defer></script>').replace('</head>','<link rel="stylesheet" href="../short-links-page.css"><link rel="stylesheet" href="../item-library.css"></head>');
  }
  // Finish translating and mounting the editor before the incoming page is
  // captured for a transition. Ordinary links and browser history stay native.
  output = output.replace('</head>', '<link rel="stylesheet" href="../action-icons.css"><link rel="stylesheet" href="../premium-ui.css"></head>');
  output = output.replace('<script src="../public-origin.js" defer></script>', '<script src="../action-icons.js" defer></script><script src="../public-origin.js" defer></script>');
  const pageScripts = [];
  output = output.replace(/<script src="[^"]+" defer><\/script>/g, script => { pageScripts.push(script.replace(' defer', '')); return ''; });
  output = output.replace('</head>', '<link rel="stylesheet" href="../tool-navigation.css"><link rel="expect" blocking="render" href="#tool-page-ready"></head>');
  output = output.replace('</body>', pageScripts.join('') + '<div id="tool-page-ready" aria-hidden="true"></div></body>');
  fs.writeFileSync(path.join(root,'tools',tool.id+'.html'),output);
}
require('./build-dashboard.cjs');
console.log(`Generated ${catalogue.length} ZPROP tool pages and landing links.`);
