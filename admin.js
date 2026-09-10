(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const { t, language, locale } = window.AdminI18n;
  let pendingAccess = null;
  const number = value => new Intl.NumberFormat(locale()).format(value);
  const date = value => value ? new Intl.DateTimeFormat(locale(),{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kuala_Lumpur'}).format(new Date(value)) : t('Never');
  let data = null, receivedAt = null, page = 1, loading = false, changing = false, requestId = 0;
  const pageSize = 10;
  function node(tag, text, className) { const element = document.createElement(tag); if (text !== undefined) element.textContent = text; if (className) element.className = className; return element; }
  async function api(url, options) {
    let response;
    try { response = await fetch(url, { credentials:'same-origin', cache:'no-store', ...options }); }
    catch { throw Error(t('Unable to connect. Please try again.')); }
    if (response.status === 401) { location.replace('/sign-in.html?lang='+language()+'&next=/admin.html'); throw Error(t('Please sign in again.')); }
    if (response.status === 403) throw Error(t('This action requires an administrator account and a request from this website.'));
    const result = await response.json();
    if (!response.ok) throw Error(t(result.error === 'adminProtected' ? 'Administrator accounts cannot be restricted.' : 'Unable to complete the request. Please try again.'));
    return result;
  }
  function chart(target, key, title) {
    const series = data.series, width = Math.max(300,$(target).clientWidth-32), height = 230, left = 42, right = 18, top = 24, bottom = 36;
    const peak = Math.max(1,...series.map(point => point[key])), max = Math.max(4,Math.ceil(peak / 4) * 4);
    const x = index => left + index * (width-left-right) / Math.max(1,series.length-1);
    const y = value => height-bottom-value * (height-top-bottom) / max;
    const points = series.map((point,index) => x(index)+','+y(point[key])).join(' ');
    let svg = '<svg viewBox="0 0 '+width+' '+height+'" role="img" aria-label="'+title+'"><title>'+title+'</title>';
    for (let tick=0; tick<=4; tick++) {
      const value=max*tick/4;
      svg += '<line x1="'+left+'" y1="'+y(value)+'" x2="'+(width-right)+'" y2="'+y(value)+'" stroke="var(--border)" stroke-dasharray="3 4"/><text x="'+(left-10)+'" y="'+(y(value)+4)+'" text-anchor="end">'+number(value)+'</text>';
    }
    svg += '<polygon points="'+left+','+y(0)+' '+points+' '+x(series.length-1)+','+y(0)+'" fill="var(--accent-soft)" opacity=".7"/><polyline points="'+points+'" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>';
    series.forEach((point,index) => {
      svg += '<circle cx="'+x(index)+'" cy="'+y(point[key])+'" r="'+(series.length<=7?4:2)+'" fill="var(--accent)"><title>'+point.date+': '+point[key]+' '+t(key==='uses'?'Tool uses':'Signups')+'</title></circle>';
    });
    const labels = new Set([0,Math.floor((series.length-1)/3),Math.floor((series.length-1)*2/3),series.length-1]);
    for (const index of labels) svg += '<text x="'+x(index)+'" y="'+(height-10)+'" text-anchor="'+(index===0?'start':index===series.length-1?'end':'middle')+'">'+new Date(series[index].date+'T00:00:00Z').toLocaleDateString(locale(),{day:'numeric',month:'short',timeZone:'UTC'})+'</text>';
    if (!series.some(point => point[key])) svg += '<text class="empty-chart" x="'+(width/2)+'" y="95" text-anchor="middle">'+t(key==='uses'?'No recorded tool uses in this period':'No recorded signups in this period')+'</text>';
    svg+='</svg>';
    $(target).innerHTML=svg;
    const details=node('details'), summary=node('summary',t('View daily numbers'));
    summary.className='small muted';
    details.append(summary);
    const scroll=node('div',undefined,'table-scroll'), table=node('table'), head=node('thead'), hr=node('tr');
    hr.append(node('th',t('Date')),node('th',t(key==='uses'?'Tool uses':'Signups')));head.append(hr);table.append(head);
    const body=node('tbody');
    for (const point of series) { const row=node('tr');row.append(node('td',point.date),node('td',number(point[key])));body.append(row); }
    table.append(body);scroll.append(table);details.append(scroll);$(target).append(details);
  }
  function render() {
    const m=data.metrics;
    $('total-users').textContent=number(m.totalUsers);
    $('new-users').textContent=t('+{count} signed up in this period',{count:number(m.newUsers)});
    $('total-uses').textContent=number(m.uses);
    $('all-time').textContent=t('{count} across all tools since tracking began',{count:number(m.allTimeUses)});
    $('active-users').textContent=number(m.activeUsers);
    $('blocked-users').textContent=number(data.users.filter(user=>user.toolsBlocked||user.signInBlocked).length);
    $('blocked-detail').textContent=t('{tools} tools blocked · {signin} sign-in blocked',{tools:number(m.toolsBlocked),signin:number(m.signInBlocked)});
    document.querySelectorAll('.period-label').forEach(label=>label.textContent=t('({days} days)',{days:data.days}));
    $('tracking-note').textContent=t('Usage tracking began {date}. A use is a successful create or save, including repeat saves; views, failed requests, deletions and admin activity are excluded. Earlier tool actions are unavailable. Older signup dates use account-file creation dates.',{date:date(data.startedAt)});
    chart('usage-chart','uses',t('Daily tool uses in the selected period'));
    chart('signup-chart','signups',t('Daily user signups in the selected period'));
    $('tool-breakdown').replaceChildren();
    const max=Math.max(1,...data.tools.map(tool=>tool.uses));
    for (const tool of data.tools) {
      const row=node('div',undefined,'tool-row'), bar=node('div',undefined,'bar'), fill=node('span');
      fill.style.width=(tool.uses/max*100)+'%';bar.append(fill);
      row.append(node('span',t(tool.name),'tool-name'),bar,node('strong',number(tool.uses)));$('tool-breakdown').append(row);
    }
    $('leaderboard').replaceChildren();
    const leaders=data.users.filter(user=>user.uses>0).slice(0,5);
    leaders.forEach((user,index) => { const row=node('li');row.append(node('span',String(index+1).padStart(2,'0'),'rank'),node('span',user.email,'email'),node('strong',t('{count} uses',{count:number(user.uses)})));$('leaderboard').append(row); });
    if (!leaders.length) $('leaderboard').append(node('li',t('No tool activity recorded in this period.'),'empty'));
    for (const option of $('tool').options) option.textContent=t(option.value==='all'?'All tools':data.tools.find(tool=>tool.id===option.value)?.name || option.textContent);
    $('account-note').textContent=t('Account records checked {time} · {users} users · {admins} administrators.',{time:new Date(receivedAt).toLocaleString(locale(),{timeZone:'Asia/Kuala_Lumpur'}),users:number(m.totalUsers),admins:number(m.administrators)});
    renderUsers();
    $('audit-list').replaceChildren();
    for (const event of data.audit) {
      const row=node('div',undefined,'audit-row'), description=node('div');
      description.append(node('p',event.email),node('small',Object.entries(event.changes).map(([key,value])=>t(key==='toolsBlocked'?'Tools':'Sign-in')+': '+t(value?'blocked':'restored')).join(' · ')+' · '+event.actor));
      const time=node('time',new Date(event.at).toLocaleString(locale(),{timeZone:'Asia/Kuala_Lumpur'}));time.dateTime=event.at;
      row.append(description,time);$('audit-list').append(row);
    }
    if (!data.audit.length) $('audit-list').append(node('p',t('No access changes yet.'),'empty'));
    $('updated').textContent=t('Updated {time}',{time:new Date(receivedAt).toLocaleTimeString(locale(),{hour:'2-digit',minute:'2-digit'})});
  }
  function filteredUsers() {
    const search=$('search').value.trim().toLowerCase(), filter=$('access-filter').value, sort=$('sort').value;
    return data.users.filter(user=>user.email.toLowerCase().includes(search) && (filter==='all'||filter==='active'&&!user.toolsBlocked&&!user.signInBlocked||filter==='tools'&&user.toolsBlocked||filter==='signin'&&user.signInBlocked))
      .sort((a,b)=>sort==='newest'?b.createdAt.localeCompare(a.createdAt):sort==='email'?a.email.localeCompare(b.email):b.uses-a.uses||a.email.localeCompare(b.email));
  }
  function renderUsers() {
    if (!data) return;
    const users=filteredUsers(), pages=Math.max(1,Math.ceil(users.length/pageSize));
    page=Math.min(page,pages);$('user-rows').replaceChildren();
    for (const user of users.slice((page-1)*pageSize,page*pageSize)) {
      const row=node('tr'), email=node('td',user.email), joined=node('td',date(user.createdAt));
      email.title=user.email;
      if (user.signupDateEstimated) joined.append(node('small',t('Estimated date')));
      row.append(email,joined,node('td',number(user.uses)),node('td',date(user.lastUsedAt)));
      for (const key of ['toolsBlocked','signInBlocked']) { const cell=node('td');cell.append(node('span',t(user[key]?'Blocked':'Allowed'),'badge'+(user[key]?' blocked':'')));row.append(cell); }
      const actions=node('td'), buttons=node('div',undefined,'row-actions');
      for (const key of ['toolsBlocked','signInBlocked']) {
        const label=t((user[key]?'Restore ':'Block ')+(key==='toolsBlocked'?'tools':'sign-in'));
        const button=node('button',label,'secondary');
        button.disabled=changing;button.setAttribute('aria-label',t('{action} for {email}',{action:label,email:user.email}));
        button.addEventListener('click',()=>changeAccess(user,key));buttons.append(button);
      }
      actions.append(buttons);row.append(actions);$('user-rows').append(row);
    }
    if (!users.length) { const row=node('tr'), cell=node('td',t('No users match your filters.'),'empty');cell.colSpan=7;row.append(cell);$('user-rows').append(row); }
    $('page-info').textContent=users.length?t('{start}–{end} of {count} users',{start:number((page-1)*pageSize+1),end:number(Math.min(page*pageSize,users.length)),count:number(users.length)}):t('0 users');
    $('previous').disabled=page<=1;$('next').disabled=page>=pages;
  }
  function renderDialog() {
    if (!pendingAccess) return;
    const {user,key,blocked}=pendingAccess;
    const subject=key==='toolsBlocked'?'tool access':'sign-in';
    $('dialog-title').textContent=t((blocked?'Block ':'Restore ')+subject+'?');
    $('dialog-description').textContent=user.email+'. '+t(key==='signInBlocked'?(blocked?'This ends all current sessions and prevents future sign-ins.':'This allows the user to sign in again. Their tool-access setting is kept.'):(blocked?'The user can still sign in, but cannot open tools or use their APIs.':'This allows tool access again. Their sign-in setting is kept.'));
  }
  async function changeAccess(user,key) {
    if (changing) return;
    const blocked=!user[key], subject=key==='toolsBlocked'?'tool access':'sign-in';
    pendingAccess={user,key,blocked};renderDialog();
    const dialog=$('access-dialog');dialog.returnValue='';dialog.showModal();
    const answer=await new Promise(resolve=>dialog.addEventListener('close',()=>resolve(dialog.returnValue),{once:true}));
    pendingAccess=null;
    if(answer!=='confirm')return;
    changing=true;renderUsers();$('status').textContent=t('Updating access…');
    try {
      await api('/api/admin/users/'+user.id+'/access',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({[key]:blocked})});
      await refresh();
      $('status').textContent=t((blocked?'Blocked ':'Restored ')+subject+' for {email}.',{email:user.email});
    } catch(error) { $('status').textContent=error.message; }
    finally { changing=false;renderUsers(); }
  }
  async function refresh() {
    const id=++requestId;loading=true;$('refresh').disabled=true;
    $('export').disabled=true;
    try {
      const result=await api('/api/admin/overview?days='+$('period').value+'&tool='+$('tool').value);
      if (id!==requestId) return;
      data=result;receivedAt=result.generatedAt || new Date().toISOString();render();$('status').textContent='';
    } catch(error) { if(id===requestId)$('status').textContent=error.message+' '+t('Displayed data may be out of date.'); throw error; }
    finally { if(id===requestId){loading=false;$('refresh').disabled=false;$('export').disabled=!data;} }
  }
  function reload(){refresh().catch(()=>{});}
  $('refresh').addEventListener('click',reload);
  ['period','tool'].forEach(id=>$(id).addEventListener('change',()=>{page=1;reload();}));
  ['search','access-filter','sort'].forEach(id=>$(id).addEventListener(id==='search'?'input':'change',()=>{page=1;renderUsers();}));
  $('previous').addEventListener('click',()=>{page--;renderUsers();});
  $('next').addEventListener('click',()=>{page++;renderUsers();});
  $('export').disabled=true;
  $('export').addEventListener('click',()=>{
    if(!data)return;
    const cell=value=>'"'+String(value??'').replace(/^[=+\-@\t\r]/,"'$&").replace(/"/g,'""')+'"';
    const rows=[['Email','Joined','Signup date estimated','Uses in selected period','All-time tracked uses','Last tool use','Tools blocked','Sign-in blocked'].map(key=>t(key)),...filteredUsers().map(user=>[user.email,user.createdAt,t(user.signupDateEstimated?'Yes':'No'),user.uses,user.allTimeUses,user.lastUsedAt,t(user.toolsBlocked?'Yes':'No'),t(user.signInBlocked?'Yes':'No')])];
    const blob=new Blob(['\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob), link=node('a');link.href=url;link.download='zprop-users-'+data.days+'days-'+data.toolFilter+'.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  $('sign-out').addEventListener('click',async()=>{
    try {await api('/api/auth/sign-out',{method:'POST'});location.assign('/sign-in.html?lang='+language());}catch(error){$('status').textContent=error.message;}
  });
  document.querySelectorAll('nav a').forEach(link=>link.addEventListener('click',()=>{document.querySelectorAll('nav a').forEach(item=>item.classList.toggle('active',item===link));}));
  async function start(){
    try {
      const session=await api('/api/auth/session');
      if (!session.user) {location.replace('/sign-in.html?lang='+language()+'&next=/admin.html');return;}
      if (session.user.role!=='admin'){location.replace('/landing.html?lang='+language());return;}
      $('admin-email').textContent=session.user.email;
      if(session.user.avatarUrl){const avatar=document.querySelector('.avatar');const picture=node('img');picture.src=session.user.avatarUrl;picture.alt='';avatar.replaceChildren(picture);}
      await refresh();
      for(const tool of data.tools){const option=node('option',t(tool.name));option.value=tool.id;$('tool').append(option);}
      setInterval(()=>{if(!document.hidden&&!loading&&!changing&&!$('access-dialog').open)reload();},30000);
    } catch(error){$('status').textContent=error.message;}
  }
  document.addEventListener('zprop:language',()=>{if(data)render();renderDialog();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!changing&&!$('access-dialog').open)reload();});
  start();
})();
