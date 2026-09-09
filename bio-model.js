// Upgrade saved pages without changing their published HTML until the owner saves.
(() => {
  const socialPlatforms = {instagram:'Instagram',facebook:'Facebook',tiktok:'TikTok',x:'X',linkedin:'LinkedIn',youtube:'YouTube'};
  function upgrade(state) {
    if (state.schemaVersion === 2) return state;
    const nextId = Math.max(0,...state.blocks.map(block => block.id)) + 1;
    const { name, bio, photo, ...rest } = state;
    return {...rest,schemaVersion:2,blocks:[{id:nextId,type:'profile',name:name||'',bio:bio||'',photo:photo||''},...state.blocks]};
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = {upgrade,socialPlatforms};
  else window.ZpropBioModel = {upgrade,socialPlatforms};
})();
