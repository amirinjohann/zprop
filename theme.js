// Apply the saved choice before styles paint, then mount the shared header control.
(() => {
  'use strict';
  const key = 'zprop-theme';
  const root = document.documentElement;
  // This script runs in the head, before the BM HTML can paint. The page's
  // translator releases the shell once all of its initial copy is ready.
  let language = new URLSearchParams(location.search).get('lang');
  if (!['ms', 'en'].includes(language)) {
    try { language = localStorage.getItem('zprop-language'); } catch {}
  }
  root.lang = language === 'en' ? 'en' : 'ms';
  if (root.lang === 'en') root.dataset.languagePending = '';
  window.ZpropLanguage = { ready() { delete root.dataset.languagePending; } };
  window.ZpropNavigation = {
    ready() {
      root.dataset.toolReady = '';
      const nav = document.querySelector('.tools-sidebar nav');
      const active = nav?.querySelector('[aria-current=page]');
      if (active && matchMedia('(max-width:760px)').matches) {
        // Move only the horizontal navigation, keeping the page's scroll intact.
        nav.scrollLeft = active.offsetLeft - nav.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2;
      }
      if (location.protocol === 'file:' || document.querySelector('#tool-transition-opt-in')) return;
      const style = document.createElement('style');
      style.id = 'tool-transition-opt-in';
      style.textContent = '@media(prefers-reduced-motion:no-preference){@view-transition{navigation:auto}}';
      document.head.append(style);
    }
  };
  // A fast second navigation or a sign-in redirect can cancel a transition.
  // Cancellation is normal and must not surface as an unhandled page error.
  for (const type of ['pageswap', 'pagereveal']) {
    window.addEventListener(type, event => {
      event.viewTransition?.ready.catch(() => {});
      event.viewTransition?.updateCallbackDone.catch(() => {});
      event.viewTransition?.finished.catch(() => {});
    });
  }
  let theme = 'light';
  try { if (localStorage.getItem(key) === 'dark') theme = 'dark'; } catch {}
  root.dataset.theme = theme;
  let button;
  function updateControl() {
    const dark = theme === 'dark';
    const english = root.lang === 'en';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = document.body?.matches('.tool-page, .dashboard-page, .sign-in-page') ? (dark ? '#101114' : '#f5f3ee') : (dark ? '#101a15' : '#183e32');
    if (!button) return;
    button.setAttribute('aria-label', english ? 'Dark mode' : 'Mod gelap');
    button.setAttribute('aria-pressed', String(dark));
    button.title = english ? (dark ? 'Switch to light mode' : 'Switch to dark mode') : (dark ? 'Tukar ke mod cerah' : 'Tukar ke mod gelap');
  }
  function apply(next, persist = true) {
    theme = next === 'dark' ? 'dark' : 'light';
    root.dataset.theme = theme;
    if (persist) { try { localStorage.setItem(key, theme); } catch {} }
    updateControl();
  }
  window.ZpropTheme = { reset() { try { localStorage.removeItem(key); } catch {} apply('light', false); } };
  window.addEventListener('storage', event => { if (event.key === key || event.key === null) apply(event.newValue, false); });
  function mount() {
    const target = document.querySelector('.header-actions, .portal-nav');
    if (!target) return;
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-toggle';
    button.innerHTML = '<svg class="theme-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.6 13.3A8.7 8.7 0 0 1 10.7 3.4 8.7 8.7 0 1 0 20.6 13.3Z"/></svg><svg class="theme-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>';
    const language = target.querySelector('.language-switch, .portal-language');
    if (language) language.after(button); else target.append(button);
    button.addEventListener('click', () => apply(theme === 'dark' ? 'light' : 'dark'));
    new MutationObserver(updateControl).observe(root, {attributes:true, attributeFilter:['lang']});
    updateControl();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, {once:true}); else mount();
})();
