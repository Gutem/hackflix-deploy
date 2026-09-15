/**
 * Hackflix Admin SPA — dashboard, users, content, ingest management.
 * Loaded by admin-pages.js template.
 */

function e(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;')}
function ea(s){return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#039;')}
const API=location.origin;
const H={};
H.token=()=>localStorage.getItem('hackflix_token');
H.headers=()=>{return{'Authorization':'Bearer '+H.token(),'Content-Type':'application/json'}};
async function api(p,o={}){const r=await fetch(API+p,{...o,headers:{...H.headers(),...o.headers}});if(r.status===401||r.status===403){localStorage.clear();location.href='/admin';return null}return r.json()}
function modal(t){document.getElementById('modal-root').innerHTML='<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal">'+t+'</div></div>'}
window.closeModal=()=>{document.getElementById('modal-root').innerHTML=''};

const appEl=document.getElementById('app');
const PAGE=appEl?.dataset?.page||'/';
appEl?.classList.remove('loading');

async function renderDashboard(){
  const[me,ingest,content]=await Promise.all([api('/api/auth/verify'),api('/api/admin/ingest/status'),api('/api/admin/content')]);
  if(!me)return;
  const stats=ingest?.sourceStats||{};
  document.getElementById('app').innerHTML=`
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value">${content?.total||0}</div><div class="stat-label">Total Content</div></div>
      <div class="stat-card"><div class="stat-value">${(ingest?.connectors||[]).length}</div><div class="stat-label">Connectors</div></div>
      <div class="stat-card"><div class="stat-value">${Object.entries(stats).map(([s,c])=>s+': '+c).join(', ')||'none'}</div><div class="stat-label">Source Breakdown</div></div>
      <div class="stat-card"><div class="stat-value">${(()=>{const dates=Object.values(ingest?.lastRun||{});return dates.length?new Date(dates.reduce((a,b)=>a>b?a:b)).toLocaleString():'Never'})()}</div><div class="stat-label">Last Ingest</div></div>
    </div>
    <div class="section"><h2>Quick Actions</h2><div class="actions">
      <a href="/admin/users" class="btn btn-primary">Manage Users</a>
      <a href="/admin/content" class="btn btn-secondary">Browse Content</a>
      <a href="/admin/ingest" class="btn btn-secondary">Run Ingest</a>
    </div></div>`;
}

async function renderUsers(){
  const data=await api('/api/admin/users');
  if(!data)return;
  const users=data.users||[];
  document.getElementById('app').innerHTML=`<div class="section">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem"><h2 style="margin:0;border:none;padding:0">Users</h2><button class="btn btn-primary" id="create-btn">+ Create User</button></div>
    <table><thead><tr><th>Username</th><th>Email</th><th>Tier</th><th>Status</th><th>Content</th><th>Actions</th></tr></thead><tbody>
    ${users.map(u=>`<tr><td>${e(u.username||'')}</td><td>${e(u.email||'')}</td><td><span class="bt bt-${e(u.tier)}">${e(u.tier)}</span></td><td><span class="bt bt-${e(u.status)}">${e(u.status)}</span></td><td><code>${e(u.contentIds.length<=2?u.contentIds.join(', '):u.contentIds.slice(0,2).join(', ')+'...')}</code></td>
    <td><button class="btn btn-sm btn-secondary" onclick="editUser('${e(u.id)}')">Edit</button>${u.status==='active'?`<button class="btn btn-sm btn-danger" onclick="blockUser('${e(u.id)}')">Block</button>`:`<button class="btn btn-sm btn-success" onclick="unblockUser('${e(u.id)}')">Unblock</button>`}<button class="btn btn-sm btn-secondary" onclick="resetPassword('${e(u.id)}')">Reset Pwd</button><button class="btn btn-sm btn-danger" onclick="deleteUser('${e(u.id)}','${ea(u.email)}')">Delete</button></td></tr>`).join('')}
    </tbody></table></div>`;

  document.getElementById('create-btn').onclick=()=>{
    modal('<h3>Create User</h3><div class="form-group"><label>Username</label><input id="m-username"></div><div class="form-group"><label>Email</label><input id="m-email" type="email"></div><div class="form-group"><label>Password</label><input id="m-password" type="password"></div><div class="form-group"><label>Tier</label><select id="m-tier"><option value="basic">Basic</option><option value="premium">Premium</option><option value="admin">Admin</option></select></div><div class="form-group"><label>Content IDs (comma-separated, * for all)</label><input id="m-cids" placeholder="39c3, 38c3"></div><div class="form-actions"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="createUser()">Create</button></div>');
  };
}

window.createUser=async()=>{
  const r=await api('/api/admin/users',{method:'POST',body:JSON.stringify({username:document.getElementById('m-username').value,email:document.getElementById('m-email').value,password:document.getElementById('m-password').value,tier:document.getElementById('m-tier').value,contentIds:document.getElementById('m-cids').value.split(',').map(s=>s.trim()).filter(Boolean)})});
  closeModal();renderUsers()
};
window.editUser=async id=>{const data=await api('/api/admin/users');const u=data?.users?.find(x=>x.id===id);if(!u)return;modal('<h3>Edit User</h3><div class="form-group"><label>Username</label><input id="m-username" value="'+ea(u.username||'')+'"></div><div class="form-group"><label>Email</label><input id="m-email" value="'+ea(u.email||'')+'"></div><div class="form-group"><label>New Password (blank = keep)</label><input id="m-password" type="password"></div><div class="form-group"><label>Tier</label><select id="m-tier"><option value="basic"'+(u.tier==='basic'?' selected':'')+'>Basic</option><option value="premium"'+(u.tier==='premium'?' selected':'')+'>Premium</option><option value="admin"'+(u.tier==='admin'?' selected':'')+'>Admin</option></select></div><div class="form-group"><label>Content IDs</label><input id="m-cids" value="'+ea(u.contentIds.join(', '))+'"></div><div class="form-actions"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveUser(\''+id+'\')">Save</button></div>')};
window.saveUser=async id=>{const p=document.getElementById('m-password').value;const u={username:document.getElementById('m-username').value,email:document.getElementById('m-email').value,tier:document.getElementById('m-tier').value,contentIds:document.getElementById('m-cids').value.split(',').map(s=>s.trim()).filter(Boolean)};if(p)u.password=p;await api('/api/admin/users/'+id,{method:'PATCH',body:JSON.stringify(u)});closeModal();renderUsers()};
window.blockUser=async id=>{if(!confirm('Block this user?'))return;await api('/api/admin/users/'+id+'/status',{method:'PATCH',body:JSON.stringify({status:'blocked'})});renderUsers()};
window.unblockUser=async id=>{await api('/api/admin/users/'+id+'/status',{method:'PATCH',body:JSON.stringify({status:'active'})});renderUsers()};
window.resetPassword=async id=>{if(!confirm('Reset password? User will need to set a new one.'))return;await api('/api/admin/users/'+id+'/reset-password',{method:'POST'});renderUsers()};
window.deleteUser=async(id,email)=>{if(!confirm('Delete '+e(email)+'?'))return;await api('/api/admin/users/'+id,{method:'DELETE'});renderUsers()};

async function renderContent(){
  const[src,data]=await Promise.all([api('/api/admin/content/sources'),api('/api/admin/content')]);
  if(!data)return;
  const items=data.items||[];
  document.getElementById('app').innerHTML=`<div class="section"><h2>Content Library</h2><div class="stats-grid">${Object.entries(src?.sources||{}).map(([n,i])=>'<div class="stat-card"><div class="stat-value">'+e(i.count)+'</div><div class="stat-label">'+e(n)+'</div></div>').join('')}</div></div>
  <div class="section"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem"><h3 style="margin:0">All Content</h3><select id="src-filter" style="padding:.5rem;border-radius:4px;border:1px solid #444;background:#141414;color:#fff"><option value="">All Sources</option>${Object.entries(src?.sources||{}).map(([n])=>'<option value="'+ea(n)+'">'+e(n)+'</option>').join('')}</select></div>
  <table><thead><tr><th>Title</th><th>Source</th><th>Conference</th><th>Year</th><th>Duration</th><th>Actions</th></tr></thead><tbody id="content-body">
  ${items.slice(0,100).map(i=>'<tr><td style="max-width:400px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+e(i.title)+'</td><td><span class="bt bt-'+e(i.source)+'">'+e(i.source)+'</span></td><td>'+e(i.conference||'-')+'</td><td>'+(i.year||'-')+'</td><td>'+(i.duration||0)+' min</td><td><button class="btn btn-sm btn-danger" onclick="delContent(\''+e(i.id)+'\',\''+ea(i.title)+'\')">Delete</button></td></tr>').join('')}
  </tbody></table>${items.length>100?'<p style="color:#b3b3b3;margin-top:1rem">Showing 100 of '+items.length+'</p>':''}</div>`;
  document.getElementById('src-filter').onchange=e=>{const s=e.target.value;const f=s?items.filter(i=>i.source===s):items;document.getElementById('content-body').innerHTML=f.slice(0,100).map(i=>'<tr><td style="max-width:400px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+e(i.title)+'</td><td><span class="bt bt-'+e(i.source)+'">'+e(i.source)+'</span></td><td>'+e(i.conference||'-')+'</td><td>'+(i.year||'-')+'</td><td>'+(i.duration||0)+' min</td><td><button class="btn btn-sm btn-danger" onclick="delContent(\''+e(i.id)+'\',\''+ea(i.title)+'\')">Delete</button></td></tr>').join('')};
}
window.delContent=async(id,t)=>{if(!confirm('Delete "'+e(t)+'"?'))return;await api('/api/admin/content/'+encodeURIComponent(id),{method:'DELETE'});renderContent()};

async function renderIngest(){
  const status=await api('/api/admin/ingest/status');
  if(!status)return;
  document.getElementById('app').innerHTML=`<div class="section"><h2>Content Ingest</h2><div class="stats-grid">
    <div class="stat-card"><div class="stat-value">${status.totalItems||0}</div><div class="stat-label">Total Items</div></div>
    ${Object.entries(status.sourceStats||{}).map(([s,c])=>'<div class="stat-card"><div class="stat-value">'+e(c)+'</div><div class="stat-label">'+e(s)+'</div></div>').join('')}
  </div><table><thead><tr><th>Connector</th><th>Last Run</th></tr></thead><tbody>
    ${(status.connectors||[]).map(c=>'<tr><td>'+e(c)+'</td><td>'+(status.lastRun?.[c]?new Date(status.lastRun[c]).toLocaleString():'Never')+'</td></tr>').join('')}
  </tbody></table></div>
  <div class="section"><h3>Run Ingest</h3><div class="ingest-controls"><div class="form-group"><label>Source</label><select id="ingest-src"><option value="">All Sources</option><option value="ccc">CCC</option><option value="peertube">PeerTube</option><option value="infocon">InfoCon</option></select></div>
  <div class="form-group"><label>Options</label><label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;color:#b3b3b3"><input type="checkbox" id="ingest-upsert"> Upsert</label></div>
  <button class="btn btn-primary" id="run-btn">Run Ingest</button></div><div id="ingest-result" style="margin-top:1rem"></div></div>
  <div class="section"><h3>Setup</h3><div class="setup-info"><p><strong>CLI:</strong></p><pre><code>bun run ingest\nbun run ingest --source ccc --upsert</code></pre><p style="margin-top:1rem"><strong>Cron:</strong></p><pre><code>bun run ingest:cron\nINTERVAL=3600 bun run ingest:cron</code></pre></div></div>`;
  document.getElementById('run-btn').onclick=async()=>{const btn=document.getElementById('run-btn');btn.disabled=true;btn.textContent='Running...';const b={};const s=document.getElementById('ingest-src').value;if(s)b.source=s;if(document.getElementById('ingest-upsert').checked)b.upsert=true;const r=await api('/api/admin/ingest/run',{method:'POST',body:JSON.stringify(b)});btn.disabled=false;btn.textContent='Run Ingest';if(r?.results){document.getElementById('ingest-result').innerHTML='<div style="background:#1a1a2e;border-radius:8px;padding:1rem"><h4>Results</h4>'+r.results.map(x=>'<div style="margin:.5rem 0;padding:.5rem;border-left:3px solid '+(x.error?'#e50914':'#46d369')+'"><strong>'+x.source+'</strong>:'+(x.error?'<span style="color:#e50914">Error: '+x.error+'</span>':'+'+x.added+' added, '+x.duplicates+' dupes, '+x.updated+' updated (total: '+x.total+')')+'</div>').join('')+'</div>'}};
}

({"/":renderDashboard,"/users":renderUsers,"/content":renderContent,"/ingest":renderIngest})[PAGE]?.()||renderDashboard();
