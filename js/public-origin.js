// Shared by the publishing interface and the Node server.
(() => {
  const hostedOrigin = 'https://zprop.tech';
  const localHost = hostname => /^(localhost|127\.0\.0\.1|\[::1\])$/.test(hostname) || /\.(test|localhost)$/.test(hostname || '');
  let publicOrigin = hostedOrigin;
  if (typeof location === 'object' && location.protocol !== 'file:' && location.origin && localHost(location.hostname)) {
    publicOrigin = location.origin;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { publicOrigin: hostedOrigin };
  else window.ZPROP_PUBLIC_ORIGIN = publicOrigin;
})();
