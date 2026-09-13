(() => {
  'use strict';
  // Resolve against this shared script so file:// and subdirectory installs
  // keep navigation inside the app instead of the drive or web-server root.
  const appBase = new URL('../', document.currentScript.src);
  const isToolUrl = url => url.origin === appBase.origin && url.pathname.startsWith(appBase.pathname + 'tools/');
  const isTool = isToolUrl(new URL(location.href));
  const isProfile = document.body.dataset.tool === 'profile';
  const isAdminArea = /^admin(?:-account)?\.html$/i.test(location.pathname.slice(appBase.pathname.length));
  const isProtected = isTool || isAdminArea;
  const toolLinks = [...document.querySelectorAll('a[href]')]
    .map(link => ({ link, target:new URL(link.href) }))
    .filter(({ target }) => isToolUrl(target));
  const form = document.querySelector('#sign-in-form');
  let user = null, register = new URLSearchParams(location.search).get('mode') === 'register', reset = false, resetSent = false, busy = false, statusKey = '';
  // Only protected documents served by Node include this initial state.
  // Later visibility checks and every API request still validate the session.
  const initialSession = document.querySelector('#zprop-session');
  if (initialSession) {
    try { user = JSON.parse(initialSession.textContent).user; } catch {}
    initialSession.remove();
  }
  const messages = {
    en:{ title:'Sign in to ZPROP.', registerTitle:'Create your account.', subtitle:'Sign in to access all six ZPROP tools.', notice:'One account for all your tools. Sign in or create an account to get started.', register:'Create account', signIn:'Sign in', signOut:'Sign out', switchRegister:'New here? Create an account', switchSignIn:'Already have an account? Sign in',     passwordHint:'Use 12–128 characters for a new account.', placeholder:'Enter your password', credentials:'Email or password is incorrect.', exists:'An account with this email already exists. Sign in instead.', password:'Use at least 12 characters for your password.', request:'Enter a valid email and password (up to 128 characters).', rateLimit:'Too many attempts. Please try again in 15 minutes.', server:'Unable to connect. Check your connection and try again.', origin:'Open this page directly on the ZPROP server and try again.', working:'Please wait…', browsing:'Explore the tools before signing in.',     welcome:'YOUR ZPROP WORKSPACE' },
    ms:{ title:'Log masuk ke ZPROP.', registerTitle:'Cipta akaun anda.', subtitle:'Log masuk untuk menggunakan kesemua enam alatan ZPROP.', notice:'Satu akaun untuk semua alatan anda. Log masuk atau cipta akaun untuk bermula.', register:'Cipta akaun', signIn:'Log masuk', signOut:'Log keluar', switchRegister:'Pengguna baharu? Cipta akaun', switchSignIn:'Sudah mempunyai akaun? Log masuk', passwordHint:'Gunakan 12–128 aksara untuk akaun baharu.', placeholder:'Masukkan kata laluan anda', credentials:'E-mel atau kata laluan tidak betul.', exists:'Akaun dengan e-mel ini sudah wujud. Sila log masuk.', password:'Gunakan sekurang-kurangnya 12 aksara untuk kata laluan.', request:'Masukkan e-mel dan kata laluan yang sah (sehingga 128 aksara).', rateLimit:'Terlalu banyak percubaan. Cuba lagi dalam 15 minit.', server:'Tidak dapat menghubungi pelayan. Semak sambungan anda dan cuba lagi.', origin:'Buka halaman ini terus pada pelayan ZPROP dan cuba lagi.', working:'Sila tunggu…', browsing:'Terokai alatan sebelum log masuk.', welcome:'RUANG KERJA ZPROP ANDA' }
  };
  Object.assign(messages.en, {
    userAccountRequired:'Sign out of the administrator account before using a regular user account.',
    signInBlocked:'Your account has been blocked from signing in. Contact your administrator.',
    newPassword:'New password', confirmPassword:'Confirm password',
    confirmPlaceholder:'Enter your new password again',
    passwordMismatch:'Passwords do not match. Please enter the same password in both fields.',
    resetTitle:'Reset your password.', resetSubtitle:'Enter your email to receive a 6-digit code.',
    resetNotice:'We will email a code if this address has an account.', sendCode:'Send code',
    resetPassword:'Reset password', backToSignIn:'Back to sign in', codeLabel:'Email code',
    codeSent:'A 6-digit code was sent if this email has an account. It expires in 15 minutes.',
    code:'That code is incorrect or has expired.', email:'Enter a valid email address.',
    mailDisabled:'Email sending is not configured. Ask the host to set SMTP.',
    mailFailed:'Could not send the email. Check the Gmail App Password and restart the server.'
  });
  Object.assign(messages.ms, {
    userAccountRequired:'Log keluar daripada akaun pentadbir sebelum menggunakan akaun pengguna biasa.',
    signInBlocked:'Akaun anda disekat daripada log masuk. Hubungi pentadbir anda.',
    newPassword:'Kata laluan baharu', confirmPassword:'Sahkan kata laluan',
    confirmPlaceholder:'Masukkan kata laluan baharu sekali lagi',
    passwordMismatch:'Kata laluan tidak sepadan. Masukkan kata laluan yang sama dalam kedua-dua ruangan.',
    resetTitle:'Tetapkan semula kata laluan.', resetSubtitle:'Masukkan e-mel anda untuk menerima kod 6 digit.',
    resetNotice:'Kami akan e-melkan kod jika alamat ini mempunyai akaun.', sendCode:'Hantar kod',
    resetPassword:'Tetapkan semula kata laluan', backToSignIn:'Kembali ke log masuk', codeLabel:'Kod e-mel',
    codeSent:'Kod 6 digit dihantar jika e-mel ini mempunyai akaun. Kod tamat dalam 15 minit.',
    code:'Kod itu tidak betul atau telah tamat tempoh.', email:'Masukkan alamat e-mel yang sah.',
    mailDisabled:'Penghantaran e-mel belum dikonfigurasi. Minta hos menetapkan SMTP.',
    mailFailed:'Tidak dapat menghantar e-mel. Semak kata laluan aplikasi Gmail dan mulakan semula pelayan.'
  });
  const language = () => document.documentElement.lang === 'en' ? 'en' : 'ms';
  const t = key => messages[language()][key] || messages[language()].server;
  function signInUrl(next) {
    const url = new URL('sign-in.html', appBase);
    url.searchParams.set('lang', language());
    if (next) url.searchParams.set('next', next.pathname + next.search + next.hash);
    return url.href;
  }
  function adminDestination() {
    return new URL('admin.html?lang='+language(),appBase).href;
  }
  function routeAdmin() {
    if (user?.role !== 'admin' || isAdminArea) return false;
    const relative = location.pathname.slice(appBase.pathname.length);
    if (isProfile || /^(?:index\.html|landing\.html|sign-in\.html)?$/i.test(relative)) {
      document.body.style.visibility = 'hidden'; location.replace(adminDestination()); return true;
    }
    return false;
  }
  function destination() {
    const next = new URLSearchParams(location.search).get('next');
    try {
      const url = new URL(next || 'landing.html', appBase);
      const relative = url.pathname.startsWith(appBase.pathname) ? url.pathname.slice(appBase.pathname.length) : null;
      if (url.origin === appBase.origin && relative !== null && /^(?:tools\/[a-z-]+\.html|landing\.html|index\.html|admin(?:-account)?\.html)?$/.test(relative)) {
        url.searchParams.set('lang', language()); return url.href;
      }
    } catch {}
    return new URL('landing.html?lang=' + language(), appBase).href;
  }
  function localServerSignIn() {
    const url = new URL('http://localhost:4173/sign-in.html');
    url.searchParams.set('lang', language());
    if (register) url.searchParams.set('mode', 'register');
    // Carry only an allowed app destination to the server, never credentials
    // or the local filesystem path.
    const target = new URL(destination());
    const next = new URL(target.pathname.slice(appBase.pathname.length), url);
    next.search = target.search;
    next.hash = target.hash;
    url.searchParams.set('next', next.pathname + next.search + next.hash);
    return url.href;
  }
  if (form && appBase.protocol === 'file:') {
    location.replace(localServerSignIn());
    return;
  }
  function redirect() {
    if (isProtected) document.body.style.visibility = 'hidden';
    location.replace(signInUrl(new URL(location.href)));
  }
  async function authFetch(url, options) {
    const response = await fetch(url, { credentials:'same-origin', ...options });
    if (response.status === 401 && isProtected) redirect();
    if (response.status === 403 && isTool) {
      const data = await response.clone().json().catch(() => ({}));
      if (data.error === "toolsBlocked") location.replace(new URL("access-denied.html", appBase));
    }
    return response;
  }
  function render() {
    if (routeAdmin()) return;
    toolLinks.forEach(({ link, target }) => {
      const url = new URL(target);
      url.searchParams.set('lang', language());
      link.href = user ? url.href : signInUrl(url);
    });
    document.querySelectorAll('.nav-sign-in').forEach(link => {
      if (user) { link.textContent = t('signOut'); link.href = '#sign-out'; link.setAttribute('role', 'button'); }
      else { link.textContent = t('signIn'); link.href = signInUrl(); link.removeAttribute('role'); }
    });
    if (user?.role === "admin" && !isAdminArea && !document.querySelector("[data-admin-link]")) {
      const anchor = document.querySelector(".nav-sign-in");
      if (anchor) { const link = document.createElement("a"); link.href = new URL("admin.html", appBase); link.textContent = "Admin"; link.dataset.adminLink = "true"; anchor.before(link); }
    }
    if (user?.role !== "admin") document.querySelector("[data-admin-link]")?.remove();
    document.dispatchEvent(new Event('zprop:session'));
    if (!form) return;
    const needPassword = !reset || resetSent;
    const confirmVisible = register || resetSent;
    document.querySelector('#sign-in-title').textContent = t(register ? 'registerTitle' : reset ? 'resetTitle' : 'title');
    document.querySelector('.sign-in-subtitle').textContent = t(reset ? 'resetSubtitle' : 'subtitle');
    document.querySelector('[data-copy=authNotice]').textContent = t(reset ? 'resetNotice' : 'notice');
    document.querySelector('[data-copy=welcome]').textContent = t('welcome');
    document.querySelector('[data-copy=justBrowsing]').textContent = t('browsing');
    document.querySelector('#forgot-password').hidden = reset;
    document.querySelector('#password').placeholder = t(resetSent ? 'newPassword' : 'placeholder');
    document.querySelector('#password').autocomplete = register || resetSent ? 'new-password' : 'current-password';
    document.querySelector('#password').minLength = register || resetSent ? 12 : 1;
    document.querySelector('#password').required = needPassword;
    document.querySelector('#password').disabled = !needPassword;
    document.querySelector('.password-field').hidden = !needPassword;
    document.querySelector('label[for="password"]').closest('.password-label').hidden = !needPassword;
    document.querySelector('label[for="password"]').textContent = register || resetSent ? t('newPassword') : (language() === 'en' ? 'Password' : 'Kata laluan');
    document.querySelector('#reset-code-group').hidden = !resetSent;
    const code = document.querySelector('#email-code');
    code.disabled = !resetSent;
    code.required = resetSent;
    document.querySelector('label[for="email-code"]').textContent = t('codeLabel');
    document.querySelector('#confirm-password-group').hidden = !confirmVisible;
    const confirmation = document.querySelector('#confirm-password');
    confirmation.disabled = !confirmVisible;
    confirmation.required = confirmVisible;
    confirmation.placeholder = t('confirmPlaceholder');
    confirmation.setAttribute('aria-invalid', String(statusKey === 'passwordMismatch'));
    document.querySelector('label[for="confirm-password"]').textContent = t('confirmPassword');
    document.querySelector('#password-hint').textContent = register || resetSent ? t('passwordHint') : '';
    document.querySelector('#auth-mode').textContent = t(reset ? 'backToSignIn' : register ? 'switchSignIn' : 'switchRegister');
    document.querySelector('#sign-in-submit').textContent = t(busy ? 'working' : reset ? resetSent ? 'resetPassword' : 'sendCode' : register ? 'register' : 'signIn');
    document.querySelector('#sign-in-submit').disabled = busy;
    document.querySelector('#auth-status').textContent = statusKey ? t(statusKey) : '';
    window.ZpropLanguage?.ready();
  }
  if (form) {
    form.querySelectorAll('input').forEach(input => { input.disabled = false; });
    document.querySelector('#email').autocomplete = 'username';
    document.querySelector('#auth-mode').addEventListener('click', () => {
      if (busy) return;
      form.elements.confirmPassword.value = '';
      form.elements.code.value = '';
      if (reset) { reset = false; resetSent = false; register = false; }
      else register = !register;
      statusKey = ''; render(); document.querySelector('#email').focus();
    });
    [form.elements.password, form.elements.confirmPassword].forEach(input => input.addEventListener('input', () => {
      if (statusKey === 'passwordMismatch') { statusKey = ''; render(); }
    }));
    document.querySelector('#forgot-password').addEventListener('click', () => {
      if (busy) return;
      register = false; reset = true; resetSent = false; statusKey = '';
      form.elements.password.value = '';
      form.elements.confirmPassword.value = '';
      form.elements.code.value = '';
      render(); document.querySelector('#email').focus();
    });
    form.addEventListener('submit', async event => {
      event.preventDefault(); if (busy) return;
      if ((register || resetSent) && form.elements.password.value !== form.elements.confirmPassword.value) {
        statusKey = 'passwordMismatch'; render(); form.elements.confirmPassword.focus(); return;
      }
      busy = true; statusKey = ''; render();
      try {
        if (appBase.protocol === 'file:') throw new Error('server');
        const payload = reset && !resetSent
          ? { email:form.email.value }
          : reset
            ? { email:form.email.value, code:form.elements.code.value, newPassword:form.password.value }
            : { email:form.email.value, password:form.password.value };
        const action = reset && !resetSent ? 'forgot-password' : reset ? 'reset-password' : register ? 'register' : 'sign-in';
        const response = await authFetch(new URL('api/auth/' + action, appBase), { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(payload) });
        const data = await response.json();
        if (reset && !resetSent && response.status === 202) { resetSent = true; statusKey = 'codeSent'; return; }
        if (!response.ok) { statusKey = data.error; return; }
        form.reset(); location.assign(data.user?.role === "admin" ? new URL("admin.html?lang=" + language(), appBase).href : destination());
      } catch { statusKey = 'server'; }
      finally { busy = false; render(); if (statusKey) document.querySelector('#auth-status').focus(); }
    });
    render();
  }
  document.querySelectorAll('.nav-sign-in').forEach(link => link.addEventListener('click', async event => {
    if (!user) return;
    event.preventDefault();
    try {
      const response = await authFetch(new URL('api/auth/sign-out', appBase), { method:'POST' });
      if (!response.ok) throw new Error();
      location.assign(signInUrl());
    } catch { alert(t('server')); }
  }));
  async function check() {
    try {
      if (appBase.protocol === 'file:') throw new Error('server');
      const response = await authFetch(new URL('api/auth/session', appBase), { cache:'no-store' });
      // Laragon/Apache and static preview servers can serve the form without
      // running the Node API. Move local previews to the working app origin.
      const localPreview = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(appBase.hostname) || /\.(test|localhost)$/.test(appBase.hostname);
      const missingApi = [404,405].includes(response.status) || !response.headers.get('content-type')?.includes('application/json');
      if (form && localPreview && appBase.origin !== 'http://localhost:4173' && appBase.origin !== 'http://127.0.0.1:4173' && missingApi) {
        location.replace(localServerSignIn());
        return false;
      }
      if (!response.ok) throw new Error();
      user = (await response.json()).user;
      if (isProtected && !user) { redirect(); return false; }
      if (isAdminArea && user?.role !== 'admin') { location.replace(new URL('landing.html?lang='+language(),appBase)); return false; }
      if (routeAdmin()) return false;
      if (isTool && !isProfile && user?.toolsBlocked) { location.replace(new URL("access-denied.html", appBase)); return false; }
      render(); return !!user;
    } catch {
      user = null;
      render();
      if (isProtected) redirect();
      return false;
    }
  }
  render();
  window.ZpropAuth = { ready:user ? Promise.resolve(!routeAdmin()) : check(), fetch:authFetch, getUser:() => user, refresh:check, unlimited:() => user?.role === 'admin' };
  window.addEventListener('storage',event=>{if(event.key==='zprop-profile-updated')check();});
  toolLinks.forEach(({ link }) => link.addEventListener('click', async event => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    await window.ZpropAuth.ready;
    if (link.href === location.href) return;
    location.assign(link.href);
  }));
  document.addEventListener('zprop:language', render);
  window.addEventListener('pageshow', event => { if (event.persisted) check(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  if (isProtected) setInterval(check, 60000);
})();
