(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const copy={
    tag:['AKAUN ANDA','YOUR ACCOUNT'],title:['Urus akaun','Manage account'],
    description:['Urus gambar profil, alamat e-mel dan kata laluan anda.','Manage your profile photo, email address and password.'],
    suite:['ALATAN ZPROP','ZPROP TOOLS'],allTools:['Semua alatan','All tools'],help:['Perlukan bantuan?','Need help?'],
    photoTitle:['Gambar profil','Profile photo'],photoHelp:['PNG, JPG atau WEBP, sehingga 5 MB. Gambar dipotong kepada bentuk segi empat.','PNG, JPG or WEBP, up to 5 MB. Your photo is cropped to a square.'],
    choosePhoto:['Pilih gambar','Choose photo'],removePhoto:['Buang gambar','Remove photo'],savePhoto:['Simpan gambar','Save photo'],cancel:['Batal','Cancel'],
    emailTitle:['Alamat e-mel','Email address'],emailHelp:['Gunakan e-mel baharu untuk log masuk selepas disimpan. Item anda kekal dalam akaun yang sama.','Use your new email to sign in after saving. Your items stay in the same account.'],
    email:['E-mel baharu','New email'],currentPassword:['Kata laluan semasa','Current password'],saveEmail:['Simpan e-mel','Save email'],
    passwordTitle:['Kata laluan','Password'],passwordHelp:['Gunakan 12–128 aksara. Perubahan e-mel atau kata laluan akan menamatkan sesi log masuk lain.','Use 12–128 characters. Changing your email or password ends other sign-in sessions.'],
    newPassword:['Kata laluan baharu','New password'],confirmPassword:['Sahkan kata laluan baharu','Confirm new password'],savePassword:['Simpan kata laluan','Save password'],
    loading:['Memuatkan profil…','Loading profile…'],saving:['Menyimpan…','Saving…'],retry:['Cuba lagi','Try again'],
    savedPhoto:['Gambar profil disimpan.','Profile photo saved.'],savedEmail:['E-mel disimpan. Gunakan e-mel baharu untuk log masuk seterusnya.','Email saved. Use your new email next time you sign in.'],savedPassword:['Kata laluan ditukar. Sesi log masuk lain telah ditamatkan.','Password changed. Other sign-in sessions have ended.'],
    mismatch:['Kata laluan baharu tidak sepadan.','New passwords do not match.'],password:['Gunakan kata laluan sepanjang 12–128 aksara.','Use a password with 12–128 characters.'],
    wrongPassword:['Kata laluan semasa tidak betul.','Current password is incorrect.'],exists:['E-mel ini sudah digunakan oleh akaun lain.','This email is already used by another account.'],
    invalidEmail:['Masukkan alamat e-mel yang sah.','Enter a valid email address.'],image:['Pilih gambar PNG, JPG atau WEBP yang sah, sehingga 5 MB.','Choose a valid PNG, JPG or WEBP image, up to 5 MB.'],
    rateLimit:['Terlalu banyak percubaan. Cuba lagi dalam 15 minit.','Too many attempts. Try again in 15 minutes.'],
    server:['Tidak dapat menyimpan atau memuatkan profil. Sila cuba lagi.','Could not save or load your profile. Please try again.'],
    photoPending:['Pratonton sahaja. Tekan Simpan gambar untuk menyimpan.','Preview only. Select Save photo to keep this change.'],
    discard:['Perubahan profil belum disimpan. Tinggalkan halaman ini?','Your profile changes are not saved. Leave this page?']
  };
  const language=()=>document.documentElement.lang==='en'?1:0;
  const t=key=>(copy[key]||copy.server)[language()];
  let user=null,busy=false,photoDirty=false,pendingPhoto=null,photoTask=0;
  const messages={settings:'loading',photo:'',email:'',password:''};
  function render() {
    document.title=t('title')+' — ZPROP';$('tool-title').textContent=t('title');$('tool-tag').textContent=t('tag');$('tool-description').textContent=t('description');
    document.querySelector('meta[name=description]').content=t('description');
    document.querySelectorAll('[data-profile-copy]').forEach(element=>element.textContent=t(element.dataset.profileCopy));
    document.querySelectorAll('[data-tool-copy]').forEach(element=>element.textContent=t(element.dataset.toolCopy));
    document.querySelectorAll('[data-tool-name]').forEach(element=>{element.textContent=element.dataset.toolName==='profile'?t('title'):window.ZPROP_TOOLS.find(tool=>tool.id===element.dataset.toolName)?.name[language()]||'Dashboard';});
    for(const [key,message] of Object.entries(messages))$(key==='settings'?'settings-status':key+'-status').textContent=message?t(message):'';
    $('profile-settings').setAttribute('aria-busy',String(busy||!user));
    document.querySelectorAll('.profile-settings fieldset').forEach(fieldset=>fieldset.disabled=busy||!user);
    $('save-photo').disabled=!photoDirty;$('cancel-photo').disabled=!photoDirty;
    $('remove-photo').disabled=!(photoDirty?pendingPhoto:user?.avatarUrl);
    $('settings-retry').hidden=!!user||busy;
    const source=photoDirty?pendingPhoto:user?.avatarUrl;
    if(source){if($('settings-avatar').getAttribute('src')!==source)$('settings-avatar').src=source;}
    else $('settings-avatar').removeAttribute('src');
    $('settings-avatar').hidden=!source;$('settings-avatar-placeholder').toggleAttribute('hidden',!!source);
    window.ZpropLanguage?.ready();window.ZpropNavigation?.ready();
  }
  async function api(options) {
    const response=await window.ZpropAuth.fetch('/api/auth/profile',{cache:'no-store',...options});
    const data=await response.json();
    if(!response.ok)throw Error(({currentPassword:'wrongPassword',email:'invalidEmail',exists:'exists',password:'password',image:'image',rateLimit:'rateLimit'})[data.error]||'server');
    return data.user;
  }
  async function load() {
    busy=true;messages.settings='loading';render();
    try {if(!await window.ZpropAuth.ready)return;user=await api();$('profile-email').value=user.email;messages.settings='';}
    catch{messages.settings='server';}finally{busy=false;render();}
  }
  async function save(section,data,success) {
    if(busy||!user)return;
    busy=true;messages[section]='saving';render();
    try {
      user=await api({method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
      if(section==='photo'){photoDirty=false;pendingPhoto=null;$('profile-photo').value='';}
      if(section==='email'){$('profile-email').value=user.email;$('email-current-password').value='';}
      if(section==='password')$('password-form').reset();
      await window.ZpropAuth.refresh();
      try{localStorage.setItem('zprop-profile-updated',String(Date.now()));}catch{}
      messages[section]=success;
    } catch(error){messages[section]=Object.hasOwn(copy,error.message)?error.message:'server';}
    finally{busy=false;render();}
  }
  $('email-form').addEventListener('submit',event=>{event.preventDefault();save('email',{email:$('profile-email').value,currentPassword:$('email-current-password').value},'savedEmail');});
  $('password-form').addEventListener('submit',event=>{
    event.preventDefault();
    if($('password-new').value!==$('password-confirm').value){messages.password='mismatch';render();$('password-confirm').focus();return;}
    save('password',{currentPassword:$('password-current').value,newPassword:$('password-new').value},'savedPassword');
  });
  $('photo-form').addEventListener('submit',event=>{event.preventDefault();if(photoDirty)save('photo',{avatar:pendingPhoto},'savedPhoto');});
  $('profile-photo').addEventListener('change',async()=>{
    const file=$('profile-photo').files[0], task=++photoTask;if(!file)return;
    try {
      if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5*1024*1024)throw Error();
      const image=await createImageBitmap(file);
      try {
        if(image.width*image.height>25000000)throw Error();
        const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
        const size=Math.min(image.width,image.height);
        canvas.getContext('2d').drawImage(image,(image.width-size)/2,(image.height-size)/2,size,size,0,0,256,256);
        if(task!==photoTask)return;
        pendingPhoto=canvas.toDataURL('image/png');photoDirty=true;messages.photo='photoPending';
      } finally {image.close();}
    }catch{if(task===photoTask)messages.photo='image';}finally{render();}
  });
  $('remove-photo').addEventListener('click',()=>{photoTask++;pendingPhoto=null;photoDirty=true;messages.photo='photoPending';$('profile-photo').value='';render();});
  $('cancel-photo').addEventListener('click',()=>{photoTask++;pendingPhoto=null;photoDirty=false;messages.photo='';$('profile-photo').value='';render();});
  $('settings-retry').addEventListener('click',load);
  const dirty=()=>photoDirty||!!user&&($('profile-email').value.trim()!==user.email||$('password-new').value||$('password-current').value||$('email-current-password').value);
  window.addEventListener('beforeunload',event=>{if(dirty()||busy&&user){event.preventDefault();event.returnValue='';}});
  document.addEventListener('zprop:language',render);
  document.addEventListener('zprop:session',()=>{
    const next=window.ZpropAuth?.getUser();
    if(user&&next){const editingEmail=$('profile-email').value.trim()!==user.email;user=next;if(!editingEmail)$('profile-email').value=user.email;render();}
  });
  render();load();
})();
