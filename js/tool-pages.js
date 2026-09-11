(async () => {
  'use strict';
  const tool=window.ZPROP_TOOLS.find(t=>t.id===document.body.dataset.tool);
  if(!tool)return;
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let language=document.documentElement.lang==='en'?1:0;
  const copy={
    suite:['ALATAN ZPROP','ZPROP TOOLS'],sidebarNote:['Identiti sendiri.<br>Ruang milik anda.','Your own identity.<br>Your own space.'],allTools:['Semua alatan','All tools'],help:['Perlukan bantuan?','Need help?'],editor:['Sediakan maklumat anda','Set up your details'],preview:['Pratonton','Preview'],name:['Nama','Name'],bio:['Penerangan ringkas','Short introduction'],url:['URL destinasi','Destination URL'],label:['Teks butang','Button label'],company:['Syarikat','Company'],phone:['Nombor telefon','Phone number'],email:['E-mel','Email'],title:['Tajuk acara','Event title'],location:['Lokasi','Location'],start:['Masa mula','Start time'],end:['Masa tamat','End time'],slug:['Nama pautan','Link name'],domain:['Domain cadangan','Proposed domain'],files:['Pilih fail','Choose files'],html:['Kod HTML','HTML code'],qrText:['Pautan atau teks','Link or text'],text:['Teks anda','Your text'],generate:['Jana pratonton','Generate preview'],downloadHtml:['Muat turun HTML','Download HTML'],downloadVcard:['Muat turun vCard','Download vCard'],downloadEvent:['Muat turun .ics','Download .ics'],downloadQr:['Muat turun QR (SVG)','Download QR (SVG)'],exportConfig:['Eksport konfigurasi','Export configuration'],exportFiles:['Eksport senarai CSV','Export file list CSV'],upper:['HURUF BESAR','UPPERCASE'],lower:['huruf kecil','lowercase'],encode:['Kod URL','Encode URL'],decode:['Nyahkod URL','Decode URL'],clear:['Kosongkan','Clear'],words:['Perkataan','Words'],characters:['Aksara','Characters'],lines:['Baris','Lines'],draft:['DRAF · BELUM AKTIF','DRAFT · NOT LIVE'],noFiles:['Tiada fail dipilih.','No files selected.'],noQr:['Kod QR anda akan dipaparkan di sini.','Your QR code will appear here.'],noData:['Belum ada data','No data yet'],noDataText:['Sambungkan sistem analitik untuk melihat data sebenar. Halaman ini tidak merekod aktiviti pelawat.','Connect an analytics system to see real data. This page does not record visitor activity.'],views:['Paparan halaman','Page views'],clicks:['Klik pautan','Link clicks'],visitors:['Pelawat','Visitors'],contact:['Hubungi pasukan ZPROP','Contact the ZPROP team'],timezone:['Zon waktu peranti','Device time zone'],saved:['Fail telah disediakan untuk muat turun.','Your file is ready to download.'],invalidUrl:['Masukkan URL lengkap bermula dengan https:// atau http://.','Enter a full URL beginning with https:// or http://.'],invalidDate:['Masa tamat mesti selepas masa mula.','The end time must be after the start time.'],invalidText:['Teks ini bukan pengekodan URL yang sah.','This text is not valid URL-encoded content.'],qrError:['Kod QR tidak dapat dijana. Cuba teks yang lebih pendek.','Could not generate this QR code. Try shorter text.'],storageError:['Fail tidak dapat disediakan untuk muat turun. Cuba semula.','Could not prepare your download. Please try again.'],selected:['fail dipilih','files selected'],fileLimit:['Pilih sehingga 20 fail.','Select up to 20 files.'],fileEmpty:['Pilih fail sebelum mengeksport senarai.','Choose files before exporting the list.']
  };
  Object.assign(copy, {
    linkDomain:['Domain pautan','Link domain'], createLink:['Cipta pautan pendek','Create short link'], creatingLink:['Sedang mencipta pautan…','Creating your link…'], linkReady:['PAUTAN DICIPTA','LINK CREATED'], linkEmpty:['Pautan anda akan dipaparkan selepas dicipta.','Your link will appear here after creation.'], linkHint:['Nama pilihan: 2–50 huruf, nombor, sempang atau garis bawah. Biarkan kosong untuk nama rawak.','Optional name: 2–50 letters, numbers, hyphens or underscores. Leave empty for a random name.'], copyLink:['Salin pautan','Copy link'], openLink:['Buka pautan','Open link'], linkCopied:['Pautan disalin.','Link copied.'], linkCopyFailed:['Pilih dan salin alamat pautan di atas.','Select and copy the link address above.'], linkTaken:['Nama pautan sudah digunakan. Pilih nama lain.','This link name is already taken. Choose another name.'], linkSlug:['Gunakan 2–50 huruf, nombor, sempang atau garis bawah.','Use 2–50 letters, numbers, hyphens or underscores.'], linkLoop:['Destinasi tidak boleh menjadi pautan pendek itu sendiri.','The destination cannot be the short link itself.'], linkServer:['Pelayan tidak dapat menyimpan pautan. Cuba lagi.','The server could not save the link. Please try again.'], linkUnavailable:['Perkhidmatan pautan tidak tersedia buat masa ini. Sila cuba lagi.','The link service is unavailable right now. Please try again.'], linkNetwork:['Tidak dapat menghubungi pelayan. Semak sambungan anda dan cuba lagi.','Could not reach the server. Check your connection and try again.'], linkOrigin:['Permintaan ditolak. Buka alatan terus pada pelayan ZPROP.','Request rejected. Open the tool directly on the ZPROP server.'], linkSize:['URL terlalu panjang. Had ialah 4,096 aksara.','The URL is too long. The limit is 4,096 characters.'], linkRequest:['Maklumat pautan tidak sah. Semak dan cuba lagi.','The link details are invalid. Check them and try again.']
  });
  Object.assign(copy, {
    saveVcard:['Simpan vCard','Save vCard'],cardSaved:['vCard disimpan.','vCard saved.'],cardSaving:['Menyimpan vCard...','Saving vCard...'],conflict:['vCard telah berubah. Buka semula sebelum menyimpan.','This vCard changed elsewhere. Reopen it before saving.'],cardStorage:['Butiran disimpan secara peribadi dalam akaun anda untuk diedit dan dimuat turun semula.','Details are saved privately to your account so you can edit and download them again.'],
    itemLimit:['Anda boleh menyimpan sehingga 5 item untuk alatan ini. Padam satu untuk menambah yang baharu.','You can save up to 5 items in this tool. Delete one to add another.']
  });
  const t=key=>copy[key][language];
  copy.linkReserved=['Nama ini digunakan oleh laman web. Pilih nama pautan lain.','This name is used by the website. Choose another link name.'];
  copy.linkHint[0]+=' Nama mesti unik untuk semua pengguna. Huruf besar dan kecil dianggap sama.';
  copy.linkHint[1]+=' Names must be unique across all users. Uppercase and lowercase count as the same name.';
  Object.assign(copy, {
    fileChoose:['Pilih PDF atau Excel','Choose a PDF or Excel file'], fileHelp:['PDF, XLS atau XLSX. Maksimum 50 MB. Satu fail bagi setiap pautan.','PDF, XLS or XLSX. 50 MB maximum. One file per link.'], createFileLink:['Cipta pautan fail','Create file link'], fileCreating:['Sedang memuat naik fail…','Uploading your file…'], fileReady:['PAUTAN FAIL DICIPTA','FILE LINK CREATED'], filePreview:['Pautan fail anda akan dipaparkan di sini selepas muat naik.','Your file link will appear here after upload.'], fileType:['Pilih fail PDF, XLS atau XLSX.','Choose a PDF, XLS or XLSX file.'], fileSize:['Fail mesti berukuran 50 MB atau kurang.','Your file must be 50 MB or less.'], fileEmpty:['Pilih fail yang tidak kosong dahulu.','Choose a non-empty file first.'], fileInvalid:['Kandungan fail tidak sepadan dengan PDF atau Excel yang sah. Eksport semula fail dan cuba lagi.','The file contents do not match a supported PDF or Excel format. Export the file again and retry.'], fileName:['Nama fail tidak disokong. Namakan semula fail dan cuba lagi.','This filename is not supported. Rename the file and try again.'], fileUnavailable:['Perkhidmatan muat naik tidak tersedia buat masa ini. Sila cuba lagi.','The upload service is unavailable right now. Please try again.'], fileServer:['Pelayan tidak dapat menyimpan fail anda. Cuba lagi.','The server could not save your file. Please try again.'], fileOpen:['Buka fail','Open file'], fileDownload:['Muat turun fail','Download file'], fileBehavior:['PDF dibuka dalam pelayar yang menyokongnya. Fail Excel dimuat turun untuk dibuka dalam aplikasi hamparan.','PDFs open in supported browsers. Excel files download to open in a spreadsheet app.'], fileBusy:['Pelayan sedang sibuk. Cuba lagi sebentar.','The server is busy. Please try again shortly.']
  });
  localizeShell();
  window.ZpropLanguage?.ready();
  document.addEventListener('zprop:language',localizeShell);
  if (!window.ZpropAuth || !await window.ZpropAuth.ready) return;
  document.removeEventListener('zprop:language',localizeShell);
  localizeShell();
  const field=(key,type='text',value='',extra='')=>`<label><span data-tool-copy="${key}">${t(key)}</span><input name="${key}" type="${type}" value="${esc(value)}" ${extra} required></label>`;
  const area=(key,value='',extra='')=>`<label><span data-tool-copy="${key}">${t(key)}</span><textarea name="${key}" ${extra}>${esc(value)}</textarea></label>`;
  const action=(key,primary=false)=>`<button type="button" data-action="${key}" data-tool-copy="${key}" class="${primary?'primary':''}">${t(key)}</button>`;
  const val=name=>$('#tool-form').elements[name].value.trim();
  const input=name=>$('#tool-form').elements[name];
  let lastStatus='',selectedFiles=[],library=null;
  function status(key){lastStatus=key;$('#tool-status').textContent=key?t(key):'';}
  function valid(){return $('#tool-form').reportValidity();}
  function validUrl(value){try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)&&!!u.hostname&&!u.username&&!u.password;}catch{return false;}}
  function download(text,name,type){try{const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('saved');}catch{status('storageError');}}
  const defaultHtml='<!DOCTYPE html>\n<html lang="ms">\n<head><meta charset="UTF-8"><title>ZPROP</title></head>\n<body style="font-family:Georgia;padding:32px;background:#f8f8f2;color:#183e32">\n  <h1>ZPROP.</h1>\n  <p>Ruang baharu. Cerita baharu.</p>\n</body>\n</html>';
  let editor='',preview='';
  switch(tool.id){
    case 'bio-pages':editor=field('name','text','ZPROP','maxlength="100"')+area('bio',language?'Your property partner.':'Rakan hartanah anda.','maxlength="500"')+field('label','text',language?'Explore properties':'Terokai hartanah','maxlength="80"')+field('url','url',window.ZPROP_PUBLIC_ORIGIN)+`<div class="tool-actions">${action('generate')}${action('downloadHtml',true)}</div>`;preview='<div class="bio-preview" id="bio-preview"></div>';break;
    case 'short-links':editor=field('url','url','','placeholder="https://www.example.com/" maxlength="4096"')+field('linkDomain','text',window.ZPROP_PUBLIC_ORIGIN,'readonly')+`<label><span data-tool-copy="slug">${t('slug')}</span><input name="slug" pattern="[a-zA-Z0-9_-]{2,50}" maxlength="50" placeholder="your-linkname" aria-describedby="link-hint"></label><p id="link-hint" class="timezone-note" data-tool-copy="linkHint">${t('linkHint')}</p><div class="tool-actions">${action('createLink',true)}</div>`;preview=`<p id="link-empty" class="tool-empty" data-tool-copy="linkEmpty">${t('linkEmpty')}</p><div id="link-result" hidden><span class="draft-label" data-tool-copy="linkReady">${t('linkReady')}</span><a class="draft-address" id="short-address" target="_blank" rel="noopener noreferrer"></a><div class="tool-actions"><a id="open-short-link" target="_blank" rel="noopener noreferrer" data-tool-copy="openLink">${t('openLink')}</a><button type="button" id="copy-short-link" data-tool-copy="copyLink">${t('copyLink')}</button></div></div>`;break;
    case 'transfer-files':editor=`<label><span data-tool-copy="fileChoose">${t('fileChoose')}</span><input name="files" type="file" accept=".pdf,.xls,.xlsx" required aria-describedby="file-help"></label><p id="file-help" class="timezone-note" data-tool-copy="fileHelp">${t('fileHelp')}</p><p id="file-summary" class="file-summary"></p>`+field('linkDomain','text',window.ZPROP_PUBLIC_ORIGIN,'readonly')+`<label><span data-tool-copy="slug">${t('slug')}</span><input name="slug" pattern="[a-zA-Z0-9_-]{2,50}" maxlength="50" placeholder="your-linkname" aria-describedby="link-hint"></label><p id="link-hint" class="timezone-note" data-tool-copy="linkHint">${t('linkHint')}</p><div class="tool-actions">${action('clear')}${action('createFileLink',true)}</div>`;preview=`<p id="file-empty" class="tool-empty" data-tool-copy="filePreview">${t('filePreview')}</p><div id="file-result" hidden><span class="draft-label" data-tool-copy="fileReady">${t('fileReady')}</span><p id="uploaded-file-name" class="uploaded-file-name"></p><a id="file-address" class="draft-address" target="_blank" rel="noopener noreferrer"></a><div class="tool-actions"><a id="open-file" target="_blank" rel="noopener noreferrer" data-tool-copy="fileOpen">${t('fileOpen')}</a><a id="download-file" data-tool-copy="fileDownload">${t('fileDownload')}</a><button type="button" id="copy-file-link" data-tool-copy="copyLink">${t('copyLink')}</button></div><p class="file-behavior" data-tool-copy="fileBehavior">${t('fileBehavior')}</p></div>`;break;
    case 'vcards':editor=field('name','text','','maxlength="100"')+field('company','text','ZPROP','maxlength="100"')+field('phone','tel','','pattern="[+0-9() .-]{5,30}" maxlength="30"')+field('email','email','','maxlength="254"')+`<div class="tool-actions">${action('saveVcard',true)}${action('downloadVcard')}</div><p class="short-hint" data-tool-copy="cardStorage">${t('cardStorage')}</p>`;break;
    case 'host-html':editor=area('html',defaultHtml,'class="code-input" maxlength="100000" required')+`<div class="tool-actions">${action('generate')}${action('downloadHtml',true)}</div>`;preview='<iframe class="html-preview" id="html-preview" sandbox="" title="HTML preview" referrerpolicy="no-referrer"></iframe>';break;
  }
  $('#tool-workspace').innerHTML=`<div class="${preview?'workspace-grid':''}"><form id="tool-form" class="tool-editor"><h2 class="workspace-title" data-tool-copy="editor">${t('editor')}</h2>${editor}<p class="tool-status" id="tool-status" role="status"></p></form>${preview?`<section class="tool-preview"><h2 class="workspace-title" data-tool-copy="preview">${t('preview')}</h2>${preview}</section>`:''}</div>`;
  $('#tool-form').addEventListener('submit',e=>e.preventDefault());
  if(tool.id==='transfer-files'){
    const form=$('#tool-form'),button=$('[data-action=createFileLink]'),clear=$('[data-action=clear]');
    let uploading=false,fileUrl='';
    const resetResult=()=>{fileUrl='';$('#file-result').hidden=true;$('#file-empty').hidden=false;};
    const checkFile=file=>!file||!file.size?'fileEmpty':!/\.(pdf|xls|xlsx)$/i.test(file.name)?'fileType':file.size>50*1024*1024?'fileSize':'';
    async function createFileLink(){
      if(uploading)return;
      const file=input('files').files[0],error=checkFile(file);
      if(error){status(error);return;}
      if(!valid())return;
      const endpoint=new URL('../api/file-links',location.href);endpoint.searchParams.set('name',file.name);endpoint.searchParams.set('slug',val('slug'));
      uploading=true;resetResult();status('fileCreating');form.setAttribute('aria-busy','true');
      for(const control of [button,clear,input('files'),input('slug')])control.disabled=true;
      try{
        let response;try{response=await window.ZpropAuth.fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:file});}catch{throw new Error('linkNetwork');}
        if([404,405].includes(response.status))throw new Error('fileUnavailable');
        if(response.status===413)throw new Error('fileSize');
        if(response.status===429)throw new Error('fileBusy');
        let result;try{result=await response.json();}catch{throw new Error(response.ok?'fileUnavailable':'fileServer');}
        if(!response.ok)throw new Error(result.error==='origin'?'linkOrigin':result.error||'fileServer');
        if(!/^\/[a-zA-Z0-9_-]{2,50}$/.test(result.url))throw new Error('fileServer');
        fileUrl=new URL(result.url,window.ZPROP_PUBLIC_ORIGIN).href;
        $('#uploaded-file-name').textContent=result.filename;
        $('#file-address').textContent=fileUrl;$('#file-address').href=fileUrl;$('#open-file').href=fileUrl;$('#download-file').href=fileUrl+'?download=1';
        $('#file-result').hidden=false;$('#file-empty').hidden=true;status('fileReady');library.saved();
      }catch(error){status(copy[error.message]?error.message:'fileServer');}
      finally{uploading=false;form.removeAttribute('aria-busy');for(const control of [button,clear,input('files'),input('slug')])control.disabled=false;}
    }
    button.addEventListener('click',createFileLink);form.addEventListener('submit',createFileLink);
    clear.addEventListener('click',()=>{if(uploading)return;form.reset();selectedFiles=[];fileList();resetResult();status('');library.saved(null);});
    input('files').addEventListener('change',()=>{selectedFiles=[...input('files').files];fileList();resetResult();status(checkFile(selectedFiles[0]));});
    form.addEventListener('input',resetResult);
    $('#copy-file-link').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(fileUrl);status('linkCopied');}catch{status('linkCopyFailed');}});
  }
  if(tool.id==='short-links'){
    const form=$('#tool-form'),button=$('[data-action=createLink]');
    let saving=false,createdUrl='';
    async function createLink(){
      if(saving||!valid())return;
      if(!validUrl(val('url'))){status('invalidUrl');return;}
      saving=true;status('creatingLink');button.disabled=true;
      const details={destination:val('url'),slug:val('slug')};
      input('url').disabled=true;input('slug').disabled=true;
      try{
        let response;
        try{response=await window.ZpropAuth.fetch(new URL('../api/short-links',location.href),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(details)});}catch{throw new Error('linkNetwork');}
        if([404,405].includes(response.status))throw new Error('linkUnavailable');
        let result;try{result=await response.json();}catch{throw new Error(response.ok?'linkUnavailable':'linkServer');}
        if(!response.ok)throw new Error(result.error||'linkServer');
        if(!/^\/[a-zA-Z0-9_-]{2,50}$/.test(result.url))throw new Error('linkServer');
        createdUrl=new URL(result.url,window.ZPROP_PUBLIC_ORIGIN).href;
        $('#short-address').textContent=createdUrl;$('#short-address').href=createdUrl;$('#open-short-link').href=createdUrl;
        $('#link-result').hidden=false;$('#link-empty').hidden=true;status('linkReady');
      }catch(error){status(copy[error.message]?error.message:'linkServer');}
      finally{saving=false;button.disabled=false;input('url').disabled=false;input('slug').disabled=false;}
    }
    button.addEventListener('click',createLink);
    form.addEventListener('submit',createLink);
    form.addEventListener('input',()=>{createdUrl='';$('#link-result').hidden=true;$('#link-empty').hidden=false;});
    $('#copy-short-link').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(createdUrl);status('linkCopied');}catch{status('linkCopyFailed');}});
  }
  function bioMarkup(){return `<div class="bio-avatar">${esc(val('name').slice(0,1)||'Z')}</div><h3>${esc(val('name'))}</h3><p>${esc(val('bio'))}</p>${validUrl(val('url'))?`<a href="${esc(val('url'))}" target="_blank" rel="noopener noreferrer">${esc(val('label'))}</a>`:''}`;}
  function fileList(){const file=selectedFiles[0];$('#file-summary').textContent=file?`${file.name} · ${(file.size/1024).toFixed(1)} KB`:t('noFiles');}
  function updatePreview(){
    if(tool.id==='bio-pages')$('#bio-preview').innerHTML=bioMarkup();
    if(tool.id==='transfer-files')fileList();
    if(tool.id==='host-html')$('#html-preview').srcdoc=`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; form-action 'none'; base-uri 'none'">`+input('html').value;
  }
  $('#tool-form').addEventListener('input',()=>{status('');if(tool.id==='bio-pages')updatePreview();});
  $$('#tool-form [data-action]').forEach(button=>button.addEventListener('click',async()=>{
    if(['short-links','transfer-files'].includes(tool.id))return;
    const action=button.dataset.action;
    status('');
    if(!valid())return;
    if(['bio-pages','short-links'].includes(tool.id)&&!validUrl(val('url'))){status('invalidUrl');return;}
    updatePreview();
    if(['downloadVcard','saveVcard'].includes(action)) {
      const form=$('#tool-form');if(form.getAttribute('aria-busy')==='true')return;
      const state=Object.fromEntries(['name','company','phone','email'].map(key=>[key,val(key)]));
      form.setAttribute('aria-busy','true');for(const control of form.querySelectorAll('input,button'))control.disabled=true;
      status('cardSaving');
      try {
        const active=library.active;
        const response=await window.ZpropAuth.fetch('/api/vcards'+(active?'/'+active.id:''),{method:active?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({state,...(active?{revision:active.revision}:{})}),signal:AbortSignal.timeout(15000)});
        const saved=await response.json();if(!response.ok)throw Error(saved.error);
        library.saved(saved);
        if(action==='downloadVcard')download(window.ZpropVcard.format(saved.state),'zprop-contact.vcf','text/vcard;charset=utf-8');
        else status('cardSaved');
      } catch(error) { status(copy[error.message]?error.message:'storageError'); }
      finally {form.removeAttribute('aria-busy');for(const control of form.querySelectorAll('input,button'))control.disabled=false;}
    }
    if(action==='downloadHtml'){
      const html=tool.id==='host-html'?input('html').value:`<!DOCTYPE html><html lang="${language?'en':'ms'}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>${esc(val('name'))}</title><style>body{background:#f8f8f2;color:#183e32;font-family:Georgia,serif;padding:40px 20px;overflow-wrap:anywhere}img{max-width:100%;height:auto}.bio-preview{max-width:400px;margin:auto;background:white;border:1px solid #dce1d7;padding:35px;text-align:center}.bio-avatar{font-size:40px}h3{font-size:30px}p{white-space:pre-wrap;line-height:1.7}a{display:block;background:#183e32;color:white;padding:16px;text-decoration:none}</style></head><body><main class="bio-preview">${bioMarkup()}</main></body></html>`;
      download(html,'zprop-page.html','text/html;charset=utf-8');
    }
  }));
  function localizeShell(){
    language=document.documentElement.lang==='en'?1:0;
    document.title=tool.name[language]+' — ZPROP';
    $('meta[name="description"]').content=tool.description[language];
    $('#tool-title').textContent=tool.title[language];$('#tool-tag').textContent=tool.tag[language];$('#tool-description').textContent=tool.description[language];$('#tool-availability').textContent=tool.availability[language];
    $('#tool-capabilities').innerHTML=tool.features.map(f=>`<span>✓ ${esc(f[language])}</span>`).join('');
    $$('[data-tool-name]').forEach(el=>{el.textContent=window.ZPROP_TOOLS.find(t=>t.id===el.dataset.toolName).name[language];});
    $$('[data-tool-copy]').forEach(el=>{el.innerHTML=t(el.dataset.toolCopy);});
  }
  function localize(){
    localizeShell();
    if(lastStatus)$('#tool-status').textContent=t(lastStatus);
    if(tool.id==='transfer-files')updatePreview();
    if($('#html-preview'))$('#html-preview').title=language?'HTML preview':'Pratonton HTML';
  }
  document.addEventListener('zprop:language',localize);
  updatePreview();localize();
  if(['transfer-files','vcards'].includes(tool.id))library=window.ZpropItemLibrary.mount({category:tool.id,onCreate(){
    $('#tool-form').reset();selectedFiles=[];status('');
    if(tool.id==='transfer-files'){fileList();$('#file-result').hidden=true;$('#file-empty').hidden=false;}
  },onEdit(record){for(const key of ['name','company','phone','email'])input(key).value=record.state[key];status('');},onDownload(record){download(window.ZpropVcard.format(record.state),'zprop-contact.vcf','text/vcard;charset=utf-8');}});
  window.ZpropNavigation?.ready();
})();
