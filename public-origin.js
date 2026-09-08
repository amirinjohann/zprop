// Shared by the publishing interface and the Node server.
(() => {
  const publicOrigin = 'https://zprop.tech';
  if (typeof module !== 'undefined' && module.exports) module.exports = { publicOrigin };
  else window.ZPROP_PUBLIC_ORIGIN = publicOrigin;
})();
