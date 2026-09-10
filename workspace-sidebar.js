(() => {
  'use strict';
  const root = document.documentElement;
  const key = 'zprop-sidebar-collapsed';
  let collapsed = false;
  try { collapsed = localStorage.getItem(key) === '1'; } catch {}
  root.dataset.sidebarCollapsed = String(collapsed);
  function mount() {
    const sidebar = document.querySelector('.tools-sidebar');
    if (!sidebar) return;
    const toggle = document.getElementById('sidebar-toggle');
    const navigation = document.getElementById('workspace-navigation');
    const profile = document.getElementById('profile-toggle');
    const panel = document.getElementById('profile-panel');
    const close = document.getElementById('profile-close');
    const signOut = document.getElementById('profile-sign-out');
    const mobile = matchMedia('(max-width:760px)');
    const copy = {
      open:['Buka menu','Open menu'], close:['Tutup menu','Close menu'],
      profile:['Profil','Profile'], openProfile:['Buka profil','Open profile'], closeProfile:['Tutup profil','Close profile'],
      account:['Akaun saya','My account'], email:['E-mel','Email'], role:['Jenis akaun','Account type'],
      settings:['Urus akaun','Manage account'],
      admin:['Pentadbir','Administrator'], user:['Pengguna','User'],
      signOut:['Log keluar','Sign out'], signingOut:['Sedang log keluar…','Signing out…'],
      error:['Log keluar tidak berjaya. Sila cuba lagi.','Could not sign out. Please try again.']
    };
    const t = name => copy[name][root.lang === 'en' ? 1 : 0];
    let busy = false, status = '';
    function render() {
      toggle.setAttribute('aria-expanded', String(!collapsed));
      toggle.setAttribute('aria-label', t(collapsed ? 'open' : 'close'));
      toggle.title = t(collapsed ? 'open' : 'close');
      // Desktop retains usable icon links; mobile closes the navigation entirely.
      navigation.inert = collapsed && mobile.matches;
      profile.setAttribute('aria-expanded', String(!panel.hidden));
      profile.setAttribute('aria-label', t(panel.hidden ? 'openProfile' : 'closeProfile'));
      profile.title = t('profile'); close.setAttribute('aria-label', t('closeProfile'));
      sidebar.querySelectorAll('[data-sidebar-copy]').forEach(element => { element.textContent = t(element.dataset.sidebarCopy); });
      sidebar.querySelectorAll('[data-tool-link]').forEach(link => { link.title = link.querySelector('span:nth-child(2)').textContent; });
      const user = window.ZpropAuth?.getUser();
      const avatar=document.getElementById('sidebar-avatar');
      avatar.hidden=!user?.avatarUrl;avatar.nextElementSibling.toggleAttribute('hidden',!!user?.avatarUrl);
      if(user?.avatarUrl){if(avatar.getAttribute('src')!==user.avatarUrl)avatar.src=user.avatarUrl;}else avatar.removeAttribute('src');
      if(document.body.dataset.tool==='profile')profile.setAttribute('aria-current','page');
      sidebar.querySelectorAll('[data-profile-email]').forEach(element => { element.textContent = user?.email || '—'; element.title = user?.email || ''; });
      document.getElementById('profile-role').textContent = user ? t(user.role === 'admin' ? 'admin' : 'user') : '—';
      signOut.disabled = busy || !user;
      signOut.querySelector('span').textContent = t(busy ? 'signingOut' : 'signOut');
      document.getElementById('profile-status').textContent = status ? t(status) : '';
    }
    function closeProfile(returnFocus = false) {
      panel.hidden = true; render();
      if (returnFocus) profile.focus();
    }
    function setCollapsed(value, persist = true) {
      collapsed = value;
      if (collapsed && (panel.contains(document.activeElement) || navigation.contains(document.activeElement) && mobile.matches)) toggle.focus();
      panel.hidden = true;
      root.dataset.sidebarCollapsed = String(collapsed);
      if (persist) { try { localStorage.setItem(key, collapsed ? '1' : '0'); } catch {} }
      render();
    }
    toggle.addEventListener('click', () => setCollapsed(!collapsed));
    profile.addEventListener('click', () => {
      const open = panel.hidden;
      if (open && collapsed && !mobile.matches) setCollapsed(false);
      panel.hidden = !open; status = ''; render();
    });
    close.addEventListener('click', () => closeProfile(true));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !panel.hidden) { event.preventDefault(); closeProfile(true); }
    });
    document.addEventListener('click', event => { if (!panel.hidden && !event.target.closest('.sidebar-account')) closeProfile(); });
    sidebar.addEventListener('focusout', event => {
      if (!panel.hidden && event.relatedTarget && !sidebar.contains(event.relatedTarget)) closeProfile();
    });
    signOut.addEventListener('click', async () => {
      if (busy) return;
      busy = true; status = ''; render();
      try {
        const response = await window.ZpropAuth.fetch(new URL('api/auth/sign-out', new URL('../', location.href)), { method:'POST' });
        if (!response.ok) throw Error();
        const target = new URL('../sign-in.html', location.href); target.searchParams.set('lang', root.lang); location.assign(target);
      } catch { status = 'error'; busy = false; render(); }
    });
    mobile.addEventListener('change', () => {
      if (collapsed && mobile.matches && navigation.contains(document.activeElement)) toggle.focus();
      render();
    });
    window.addEventListener('storage', event => { if (event.key === key || event.key === null) setCollapsed(event.newValue === '1', false); });
    window.addEventListener('pageshow', () => {
      try { setCollapsed(localStorage.getItem(key) === '1', false); } catch { render(); }
    });
    document.addEventListener('zprop:language', render);
    document.addEventListener('zprop:session', render);
    window.ZpropAuth?.ready.then(render);
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once:true }); else mount();
})();
