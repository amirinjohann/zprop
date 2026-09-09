(() => {
  // Keep the existing controls, handlers and translated labels; only their
  // visual presentation changes. Dynamic libraries use the same icon set.
  const paths = {
    edit:'<path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15l-1 6Z"/>',
    open:'<path d="M14 3h7v7m0-7L10 14M10 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-5"/>',
    copy:'<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3"/>',
    delete:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
    download:'<path d="M12 3v12m-5-5 5 5 5-5M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5"/>',
    preview:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>'
  };
  const selectors = {
    edit:'[data-page-action="edit"], [data-short-action="edit"], [data-qr-action="edit"], .links-row-actions a:not([target])',
    open:'.bio-page-card .tool-actions a, .short-link-card .tool-actions a, .links-row-actions a[target="_blank"], #open-bio, #open-short-link, #open-file, #open-site',
    copy:'[data-short-action="copy"], [data-link-action="copy"], #copy-bio, #copy-short-link, #copy-file-link, #copy-site',
    delete:'[data-page-action="delete"], [data-short-action="delete"], [data-qr-action="delete"], [data-link-action="delete"]',
    download:'[data-action="downloadHtml"], [data-action="downloadVcard"], #download-file, #download-qr-png, #download-qr-svg, #links-export',
    preview:'[data-action="generate"]'
  };
  const masks = Object.fromEntries(Object.entries(paths).map(([name,path]) => [name,
    `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`)}")`]));
  const originalLabels = new WeakMap();
  const root = document.querySelector('#main');
  if (!root) return;
  function decorate() {
    for (const [name, selector] of Object.entries(selectors)) {
      root.querySelectorAll(selector).forEach(control => {
        if (!originalLabels.has(control)) originalLabels.set(control, control.hasAttribute('aria-label'));
        const label = control.textContent.replace(/[↗↖↙↘]/g,'').trim();
        if (!label) return;
        if (!originalLabels.get(control)) control.setAttribute('aria-label',label);
        control.title = label;
        if(control.dataset.actionIcon !== name) {
          control.dataset.actionIcon = name;
          control.classList.add('action-icon');
          control.style.setProperty('--action-icon-mask',masks[name]);
        }
      });
    }
  }
  // Localizers replace text nodes and libraries rebuild rows after saving.
  // Only observe content so our attribute updates cannot trigger a loop.
  new MutationObserver(decorate).observe(root,{childList:true,subtree:true,characterData:true});
  document.addEventListener('zprop:language',decorate);
  decorate();
})();
