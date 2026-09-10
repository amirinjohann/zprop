(() => {
  'use strict';
  const ms = {
    'Admin overview — ZPROP':'Ringkasan admin — ZPROP',
    'WORKSPACE':'RUANG KERJA', 'Admin navigation':'Navigasi admin', 'Overview':'Ringkasan',
    'User management':'Pengurusan pengguna', 'Access history':'Sejarah akses',
    'Administration':'Pentadbiran', 'Manage your ZPROP workspace.':'Urus ruang kerja ZPROP anda.',
    '← Back to website':'← Kembali ke laman web', 'Sign out':'Log keluar',
    'WORKSPACE / OVERVIEW':'RUANG KERJA / RINGKASAN', 'Admin overview':'Ringkasan admin',
    'A clear view of your users and the tools they use.':'Pantau pengguna dan penggunaan alatan mereka.',
    'Administrator':'Pentadbir', 'Manage account':'Urus akaun', 'Language':'Bahasa', 'Workspace activity':'Aktiviti ruang kerja',
    'Period':'Tempoh', 'Last 7 days':'7 hari terakhir', 'Last 30 days':'30 hari terakhir', 'Last 90 days':'90 hari terakhir',
    'Refresh':'Muat semula', 'Export users':'Eksport pengguna', 'Total users':'Jumlah pengguna',
    'Registered users; administrators excluded.':'Pengguna berdaftar; tidak termasuk pentadbir.',
    'Loading signups…':'Memuatkan pendaftaran…', 'Tool uses':'Penggunaan alatan',
    'Successful creates and saves':'Ciptaan dan simpanan yang berjaya', 'Active users':'Pengguna aktif',
    'Users with a recorded tool action':'Pengguna yang mempunyai rekod penggunaan alatan',
    'Restricted accounts':'Akaun disekat', 'Tool or sign-in restrictions':'Sekatan alatan atau log masuk',
    'Tool usage over time':'Penggunaan alatan mengikut masa', 'Successful creates and saves per day':'Ciptaan dan simpanan berjaya setiap hari',
    'Filter tool':'Tapis alatan', 'All tools':'Semua alatan', 'New signups':'Pendaftaran baharu',
    'New user accounts per day':'Akaun pengguna baharu setiap hari', '● Users':'● Pengguna',
    'Usage by tool':'Penggunaan mengikut alatan', 'All six tools · selected period':'Kesemua enam alatan · tempoh dipilih',
    'Most active users':'Pengguna paling aktif', 'Ranked by uses · selected period and tool':'Mengikut penggunaan · tempoh dan alatan dipilih',
    'Manage tool access and sign-in independently. Sign-in blocks end existing sessions.':'Urus akses alatan dan log masuk secara berasingan. Sekatan log masuk menamatkan sesi sedia ada.',
    'Search users by email':'Cari pengguna melalui e-mel', 'Search users by email…':'Cari pengguna melalui e-mel…',
    'Filter access status':'Tapis status akses', 'All accounts':'Semua akaun', 'Unrestricted':'Tanpa sekatan',
    'Tools blocked':'Alatan disekat', 'Sign-in blocked':'Log masuk disekat', 'Sort users':'Susun pengguna',
    'Most tool uses':'Penggunaan tertinggi', 'Newest signups':'Pendaftaran terkini', 'Email A–Z':'E-mel A–Z',
    'User':'Pengguna', 'Joined':'Tarikh daftar', 'Uses in period':'Penggunaan dalam tempoh',
    'Last tool use':'Penggunaan terakhir', 'Tools':'Alatan', 'Sign-in':'Log masuk', 'Manage access':'Urus akses',
    'Previous':'Sebelumnya', 'Next':'Seterusnya', 'Latest 50 account access changes':'50 perubahan akses akaun terkini',
    'Private admin workspace':'Ruang kerja admin peribadi', 'Reporting timezone: Asia/Kuala_Lumpur (UTC+8)':'Zon waktu laporan: Asia/Kuala_Lumpur (UTC+8)',
    'Change account access':'Ubah akses akaun', 'Cancel':'Batal', 'Confirm change':'Sahkan perubahan',
    'Never':'Belum pernah', 'Please sign in again.':'Sila log masuk semula.',
    'This action requires an administrator account and a request from this website.':'Tindakan ini memerlukan akaun pentadbir dan permintaan daripada laman ini.',
    'Administrator accounts cannot be restricted.':'Akaun pentadbir tidak boleh disekat.',
    'Unable to complete the request. Please try again.':'Permintaan tidak dapat diselesaikan. Sila cuba lagi.',
    'Unable to connect. Please try again.':'Tidak dapat menghubungi pelayan. Sila cuba lagi.',
    'No recorded tool uses in this period':'Tiada rekod penggunaan alatan dalam tempoh ini',
    'No recorded signups in this period':'Tiada rekod pendaftaran dalam tempoh ini',
    'View daily numbers':'Lihat angka harian', 'Date':'Tarikh', 'Signups':'Pendaftaran',
    '+{count} signed up in this period':'+{count} mendaftar dalam tempoh ini',
    '{count} across all tools since tracking began':'{count} merentas semua alatan sejak rekod bermula',
    '{tools} tools blocked · {signin} sign-in blocked':'{tools} sekatan alatan · {signin} sekatan log masuk',
    '({days} days)':'({days} hari)',
    'Usage tracking began {date}. A use is a successful create or save, including repeat saves; views, failed requests, deletions and admin activity are excluded. Earlier tool actions are unavailable. Older signup dates use account-file creation dates.':'Rekod penggunaan bermula pada {date}. Penggunaan ialah ciptaan atau simpanan berjaya, termasuk simpanan berulang; paparan, permintaan gagal, pemadaman dan aktiviti admin tidak dikira. Aktiviti alatan terdahulu tidak tersedia. Tarikh pendaftaran lama dianggarkan daripada tarikh penciptaan fail akaun.',
    'Daily tool uses in the selected period':'Penggunaan alatan harian dalam tempoh dipilih',
    'Daily user signups in the selected period':'Pendaftaran pengguna harian dalam tempoh dipilih',
    '{count} uses':'{count} penggunaan', 'No tool activity recorded in this period.':'Tiada aktiviti alatan direkodkan dalam tempoh ini.',
    'blocked':'disekat', 'restored':'dipulihkan', 'No access changes yet.':'Belum ada perubahan akses.',
    'Updated {time}':'Dikemas kini {time}', 'Estimated date':'Tarikh anggaran', 'Blocked':'Disekat', 'Allowed':'Dibenarkan',
    'Restore tools':'Pulihkan alatan', 'Block tools':'Sekat alatan', 'Restore sign-in':'Pulihkan log masuk', 'Block sign-in':'Sekat log masuk',
    '{action} for {email}':'{action} untuk {email}', 'No users match your filters.':'Tiada pengguna sepadan dengan tapisan anda.',
    '{start}–{end} of {count} users':'{start}–{end} daripada {count} pengguna', '0 users':'0 pengguna',
    'Block tool access?':'Sekat akses alatan?', 'Restore tool access?':'Pulihkan akses alatan?',
    'Block sign-in?':'Sekat log masuk?', 'Restore sign-in?':'Pulihkan log masuk?',
    'This ends all current sessions and prevents future sign-ins.':'Ini menamatkan semua sesi semasa dan menghalang log masuk seterusnya.',
    'This allows the user to sign in again. Their tool-access setting is kept.':'Pengguna boleh log masuk semula. Tetapan akses alatan mereka dikekalkan.',
    'The user can still sign in, but cannot open tools or use their APIs.':'Pengguna masih boleh log masuk, tetapi tidak boleh membuka atau menggunakan alatan.',
    'This allows tool access again. Their sign-in setting is kept.':'Akses alatan dibenarkan semula. Tetapan log masuk mereka dikekalkan.',
    'Updating access…':'Mengemas kini akses…',
    'Blocked tool access for {email}.':'Akses alatan untuk {email} disekat.', 'Restored tool access for {email}.':'Akses alatan untuk {email} dipulihkan.',
    'Blocked sign-in for {email}.':'Log masuk untuk {email} disekat.', 'Restored sign-in for {email}.':'Log masuk untuk {email} dipulihkan.',
    'Displayed data may be out of date.':'Data yang dipaparkan mungkin tidak terkini.',
    'Email':'E-mel', 'Signup date estimated':'Tarikh daftar dianggarkan', 'Uses in selected period':'Penggunaan dalam tempoh dipilih',
    'All-time tracked uses':'Jumlah penggunaan direkodkan', 'Yes':'Ya', 'No':'Tidak',
    'Bio pages':'Halaman bio', 'Short links':'Pautan pendek', 'File transfers':'Pemindahan fail',
    'HTML hosting':'Pengehosan HTML', 'QR codes':'Kod QR',
    'Account records checked {time} · {users} users · {admins} administrators.':'Rekod akaun disemak {time} · {users} pengguna · {admins} pentadbir.'
  };
  const language = () => document.documentElement.lang === 'en' ? 'en' : 'ms';
  const t = (key, values = {}) => (language() === 'ms' ? ms[key] || key : key).replace(/\{(\w+)\}/g, (_, name) => values[name] ?? '{' + name + '}');
  function apply(lang, persist = true, updateUrl = true) {
    document.documentElement.lang = lang === 'en' ? 'en' : 'ms';
    if (persist) { try { localStorage.setItem('zprop-language', language()); } catch {} }
    if (updateUrl) { const url = new URL(location.href); url.searchParams.set('lang', language()); history.replaceState(null, '', url); }
    document.querySelectorAll('[data-admin-copy]').forEach(element => { element.textContent = t(element.dataset.adminCopy); });
    for (const attribute of ['aria-label', 'placeholder']) document.querySelectorAll('[data-admin-' + attribute + ']').forEach(element => {
      element.setAttribute(attribute, t(element.getAttribute('data-admin-' + attribute)));
    });
    document.querySelectorAll('[data-language]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.language === language())));
    document.querySelectorAll('[data-admin-local]').forEach(link => { const target = new URL(link.href); target.searchParams.set('lang', language()); link.href = target; });
    document.title = t('Admin overview — ZPROP');
    window.ZpropLanguage?.ready();
    document.dispatchEvent(new Event('zprop:language'));
  }
  window.AdminI18n = { t, language, locale:() => language() === 'en' ? 'en-MY' : 'ms-MY' };
  document.querySelectorAll('[data-language]').forEach(button => button.addEventListener('click', () => apply(button.dataset.language)));
  window.addEventListener('storage', event => { if (event.key === 'zprop-language' || event.key === null) apply(event.newValue, false); });
  apply(language(), true, false);
})();
