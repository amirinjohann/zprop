(() => {
  'use strict';
  const all = selector => [...document.querySelectorAll(selector)];
  const ms = {};
  all('[data-copy]').forEach(el => { ms[el.dataset.copy] = el.innerHTML; });
  all('[data-placeholder-copy]').forEach(el => { ms[el.dataset.placeholderCopy] = el.placeholder; });
  all('[data-alt-copy]').forEach(el => { ms[el.dataset.altCopy] = el.alt; });
  const en = {
    skip:'Skip to content', brandLine:'A new space. A new story.', tutorial:'Guide & FAQ', signIn:'Sign in', getInTouch:'Contact ZPROP',
    badge:'Your property world, connected by ZPROP', heroTitle:'One place.<br>More possibilities.<br><span>Your ZPROP.</span>', heroIntro:'Discover properties, meet our team and start your next chapter. All with a digital identity that’s distinctly ZPROP.',
    feature1:'Bio pages', feature2:'Short links', feature3:'File link', feature4:'Share vcards', feature5:'Static site', portalSignIn:'Sign in to your portal', browse:'Explore ZPROP tools', previewNote:'Admin & agent portal preview · Sign-in is not yet enabled.',
    phoneBackLabel:'A SPACE FOR YOU', phoneBackTitle:'A new home.<br>A new story.', phoneSearch:'Find your home', phoneTitle:'Your property<br>partner.', phoneSubtitle:'Melaka & beyond', phoneProperties:'Explore properties', phoneContact:'Talk to our team', phoneSaved:'Places you love', phoneFooter:'Your next chapter starts here.', sceneCaption:'Your own identity. Closer connections.',
    guideKicker:'A SIMPLE PLACE TO START', guideTitle:'Small steps. New beginnings.', guideIntro:'Discover what you can do with ZPROP today.', guide1:'Explore your options', guide1Text:'Search properties by location and budget. Save the places you love to revisit later.', guide2:'Connect directly', guide2Text:'Talk to the ZPROP team about buying, selling, renting or a career in real estate.', guide3:'Meet your new portal', guide3Text:'Preview the new sign-in experience. Account access will be available once the account system is connected.',
    faqTitle:'A few things to know.', faq1:'Do I need to sign in to view properties?', faq1Text:'No. You can explore properties, search listings and contact the ZPROP team directly from the main website.', faq2:'Can I sign in now?', faq2Text:'Not yet. This is a design preview for ZPROP administrators and agents. Accounts and user authentication are not connected yet. Contact ZPROP with any access enquiries.', faq3:'How do I change the language?', faq3Text:'Select BM or EN at the top. Your choice will be remembered in the same browser.', rights:'All rights reserved.', backWebsite:'Visit the ZPROP website', footerLine:'Your identity. Your ZPROP.',
    backPortal:'Back to the portal', signBadge:'ZPROP ADMIN & AGENT PORTAL', signHero:'Your story.<br>Your space.<br><span>Your ZPROP.</span>', signIntro:'A space for closer connections and a more meaningful property journey.', signImage:'A modern living space', signImageCaption:'Every beginning has a place.', welcome:'WELCOME BACK, TEAM ZPROP', signTitle:'Sign in to ZPROP.', signSubtitle:'A dedicated space for ZPROP administrators and agents.', authNotice:'One account for all your tools. Sign in or create an account to get started.', email:'Email address', emailPlaceholder:'name@example.com', password:'Password', passwordPlaceholder:'Enter your password', forgot:'Forgot password?', needAccess:'Need help with access?', contactTeam:'Guide & FAQ', justBrowsing:'Want to try the tools first?', exploreNow:'Explore tools'
  };
  // All local links preserve the chosen language across the portal and public site.
  all('[data-local]').forEach(el => { el.dataset.destination = el.getAttribute('href'); });
  let language = 'ms';
  const form = document.querySelector('#sign-in-form');
  const toggle = document.querySelector('#toggle-password');
  const password = document.querySelector('#password');
  function updateToggle() {
    if (!toggle) return;
    const shown = password.type === 'text';
    toggle.setAttribute('aria-pressed', String(shown));
    toggle.setAttribute('aria-label', language === 'en' ? (shown ? 'Hide password' : 'Show password') : (shown ? 'Sembunyikan kata laluan' : 'Tunjukkan kata laluan'));
  }
  function setLanguage(next, persist = true) {
    language = next === 'en' ? 'en' : 'ms';
    const copy = language === 'en' ? en : ms;
    document.documentElement.lang = language;
    document.title = form ? (language === 'en' ? 'Sign in — ZPROP' : 'Log masuk — ZPROP') : (language === 'en' ? 'ZPROP — Your portal. Your next chapter.' : 'ZPROP — Portal anda, langkah seterusnya.');
    document.querySelector('meta[name="description"]').content = form ? (language === 'en' ? 'Sign in to use ZPROP tools.' : 'Log masuk untuk menggunakan alatan ZPROP.') : (language === 'en' ? 'Discover ZPROP. Your properties, team and connections in one place.' : 'Kenali ZPROP. Hartanah, pasukan dan hubungan anda dalam satu tempat.');
    all('[data-copy]').forEach(el => { el.innerHTML = copy[el.dataset.copy]; });
    all('[data-placeholder-copy]').forEach(el => { el.placeholder = copy[el.dataset.placeholderCopy]; });
    all('[data-alt-copy]').forEach(el => { el.alt = copy[el.dataset.altCopy]; });
    all('[data-language]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.language === language)));
    all('[data-local]').forEach(el => { const url = new URL(el.dataset.destination, location.href); url.searchParams.set('lang', language); el.href = url.href; });
    if (persist) { try { localStorage.setItem('zprop-language', language); } catch {} }
    try { const url = new URL(location.href); url.searchParams.set('lang', language); if (url.href !== location.href) history.replaceState(null, '', url); } catch {}
    updateToggle();
    document.dispatchEvent(new CustomEvent('zprop:language', {detail:{language}}));
  }
  all('[data-language]').forEach(el => el.addEventListener('click', () => setLanguage(el.dataset.language)));
  all('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
  if (form) {
    toggle.addEventListener('click', () => { password.type = password.type === 'password' ? 'text' : 'password'; updateToggle(); });

  }
  let storedLanguage;
  try { storedLanguage = localStorage.getItem('zprop-language'); } catch {}
  const requestedLanguage = new URLSearchParams(location.search).get('lang');
  setLanguage(['ms','en'].includes(requestedLanguage) ? requestedLanguage : storedLanguage, false);
})();
