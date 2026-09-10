module.exports = navigation => `<div class="sidebar-heading"><span class="section-kicker" data-tool-copy="suite">ALATAN ZPROP</span><button type="button" id="sidebar-toggle" class="sidebar-toggle" aria-expanded="true" aria-controls="workspace-navigation" aria-label="Tutup menu" title="Tutup menu"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16m7-12-3 4 3 4"/></svg></button></div>
<div id="workspace-navigation" class="workspace-navigation"><nav aria-label="ZPROP tools">${navigation}</nav></div>
<div class="sidebar-account">
<section id="profile-panel" class="sidebar-profile-panel" aria-labelledby="profile-panel-title" hidden>
<div class="profile-panel-heading"><strong id="profile-panel-title" data-sidebar-copy="account">Akaun saya</strong><button type="button" id="profile-close" class="profile-close" aria-label="Tutup profil"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button></div>
<dl><dt data-sidebar-copy="email">E-mel</dt><dd data-profile-email>—</dd><dt data-sidebar-copy="role">Jenis akaun</dt><dd id="profile-role">—</dd></dl>
<p id="profile-status" role="status"></p>
<a href="profile.html" id="profile-settings-link" class="profile-settings-link" data-local data-sidebar-copy="settings">Urus akaun</a>
<button type="button" id="profile-sign-out" class="profile-sign-out"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4H5v16h5m4-12 4 4-4 4m-5-4h12"/></svg><span data-sidebar-copy="signOut">Log keluar</span></button>
</section>
<button type="button" id="profile-toggle" class="sidebar-profile-toggle" aria-expanded="false" aria-controls="profile-panel">
<span class="profile-avatar" aria-hidden="true"><img id="sidebar-avatar" alt="" hidden><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></svg></span>
<span class="profile-label"><strong data-sidebar-copy="profile">Profil</strong><small data-profile-email>—</small></span>
<svg class="profile-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 14 4-4 4 4"/></svg>
</button></div>`;
