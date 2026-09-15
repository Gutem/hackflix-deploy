/**
 * Hackflix Admin SPA — dashboard, users, content, ingest.
 */
function e(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;')}
function ea(s){return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#039;')}
var API=location.origin;
var H={};
H.token=function(){return localStorage.getItem('hackflix_token')};
H.headers=function(){var t=H.token();return t?{'Authorization':'Bearer '+t,'Content-Type':'application/json'}:{'Content-Type':'application/json'}};

async function api(p,o){
  o=o||{};
  try{var r=await fetch(API+p,Object.assign({},o,{headers:Object.assign({},H.headers(),o.headers),credentials:'include'}));if(r.status===401||r.status===403){localStorage.clear();location.href='/admin';return null}return r.json()}catch(e){return null}
}

function toast(msg,type){
  type=type||'info';
  var c=document.getElementById('toast-container');
  if(!c){c=document.createElement('div');c.id='toast-container';c.className='toast-container';document.body.appendChild(c)}
  var el=document.createElement('div');el.className='toast '+type;el.textContent=msg;c.appendChild(el);
  setTimeout(function(){el.classList.add('removing');setTimeout(function(){el.remove()},200)},3500)
}

function modal(t){
  var root=document.getElementById('modal-root');
  root.innerHTML='<div class="modal-overlay" id="modal-overlay"><div class="modal"><button class="modal-close" onclick="closeModal()" aria-label="Close">&times;</button>'+t+'</div></div>';
  document.addEventListener('keydown',onModalKey);
  document.getElementById('modal-overlay').addEventListener('click',function(ev){if(ev.target===this)closeModal()})
}
window.closeModal=function(){document.getElementById('modal-root').innerHTML='';document.removeEventListener('keydown',onModalKey)};
function onModalKey(ev){if(ev.key==='Escape')closeModal()}

function btnLoading(el,loading){
  if(loading){el.classList.add('loading');el.disabled=true}else{el.classList.remove('loading');el.disabled=false}
}

function renderSourceBreakdown(stats){
  var entries=Object.entries(stats);if(!entries.length)return'<li>No data</li>';
  var total=entries.reduce(function(s,x){return s+x[1]},0);
  return entries.map(function(x){
    var pct=total?Math.round(x[1]/total*100):0;
    return'<li><span class="bt bt-'+e(x[0])+'" style="font-size:0.75rem">'+e(x[0])+'</span><span class="source-bar"><span class="source-bar-fill" style="width:'+pct+'%;background:var(--accent)"></span></span><span class="source-count">'+x[1]+'</span></li>'
  }).join('')
}

var appEl=document.getElementById('app');
var PAGE=appEl.dataset.page||'/';
appEl.classList.remove('loading');
(function(){
  var links=document.querySelectorAll('.nav a');
  for(var i=0;i<links.length;i++){
    var a=links[i];var href=a.getAttribute('href');
    if(href==='/admin'+PAGE||(PAGE==='/'&&href==='/admin'))a.classList.add('active')
  }
})();

async function renderDashboard(){
  var results=await Promise.all([api('/api/auth/verify'),api('/api/admin/ingest/status'),api('/api/admin/content')]);
  var me=results[0],ingest=results[1],content=results[2];
  if(!me){document.getElementById('app').innerHTML='<div class="error-state"><h2>Conexao perdida</h2><p>Servidor na porta '+location.port+'</p><button class="btn btn-primary" onclick="location.reload()">Tentar novamente</button></div>';return}
  var stats=ingest.sourceStats||{},total=content?content.total:0,connectors=(ingest.connectors||[]).length;
  document.getElementById('app').innerHTML=
    '<h1 class="page-title">Dashboard</h1>'+
    '<div class="stats-grid">'+
      '<div class="stat-card accent"><div class="stat-icon">&#x1f4c0;</div><div class="stat-value">'+total+'</div><div class="stat-label">Total Content</div><div class="stat-sub">across all sources</div></div>'+
      '<div class="stat-card green"><div class="stat-icon">&#x1f517;</div><div class="stat-value">'+connectors+'</div><div class="stat-label">Connectors</div><div class="stat-sub">data sources active</div></div>'+
      '<div class="stat-card purple"><div class="stat-value" style="font-size:1.1rem;line-height:1.6"><ul class="source-list">'+renderSourceBreakdown(stats)+'</ul></div><div class="stat-label">Source Breakdown</div></div>'+
      '<div class="stat-card blue"><div class="stat-icon">&#x1f552;</div><div class="stat-value" style="font-size:1rem">'+(function(){var dates=Object.values(ingest.lastRun||{});return dates.length?new Date(dates.reduce(function(a,b){return a>b?a:b})).toLocaleString():'Never'})()+'</div><div class="stat-label">Last Ingest</div></div>'+
    '</div>'+
    '<div class="quick-actions">'+
      '<a href="/admin/users" class="quick-card"><div class="quick-card-icon" style="background:var(--blue-dim);color:var(--blue);font-size:1.2rem">&#x1f465;</div><div><div class="quick-card-label">Manage Users</div><div class="quick-card-desc">Add, edit, block or delete accounts</div></div></a>'+
      '<a href="/admin/content" class="quick-card"><div class="quick-card-icon" style="background:var(--green-dim);color:var(--green)">&#x1f4c4;</div><div><div class="quick-card-label">Browse Content</div><div class="quick-card-desc">Edit or remove content items</div></div></a>'+
      '<a href="/admin/ingest" class="quick-card"><div class="quick-card-icon" style="background:var(--orange-dim);color:var(--orange)">&#x2b07;</div><div><div class="quick-card-label">Run Ingest</div><div class="quick-card-desc">Fetch new videos from sources</div></div></a>'+
    '</div>'
}

async function renderUsers(){
  var data=await api('/api/admin/users');
  if(!data){document.getElementById('app').innerHTML='<div class="error-state"><h2>Conexao perdida</h2><p>Servidor na porta '+location.port+'</p><button class="btn btn-primary" onclick="location.reload()">Tentar novamente</button></div>';return}
  var users=data.users||[];
  var rows=users.length?users.map(function(u){
    return'<tr><td>'+e(u.username||'')+'</td><td>'+e(u.email||'')+'</td><td><span class="bt bt-'+e(u.tier)+'">'+e(u.tier)+'</span></td><td><span class="key-preview">'+(u.apiKeyPreview?e(u.apiKeyPreview)+'…':'<em>no key</em>')+'</span> <button class="btn btn-sm btn-secondary btn-icon" onclick="resetKey(\''+e(u.id)+'\')" title="Regenerate API Key" aria-label="Regenerate key">&#x21bb;</button></td><td><span class="bt bt-'+e(u.status)+'">'+e(u.status)+'</span></td><td><code>'+(u.contentIds.length<=2?e(u.contentIds.join(', ')):e(u.contentIds.slice(0,2).join(', '))+'…')+'</code></td><td><div class="actions-cell"><button class="btn btn-sm btn-secondary" onclick="editUser(\''+e(u.id)+'\')">Edit</button>'+(u.status==='active'?'<button class="btn btn-sm btn-danger" onclick="blockUser(\''+e(u.id)+'\')">Block</button>':'<button class="btn btn-sm btn-success" onclick="unblockUser(\''+e(u.id)+'\')">Unblock</button>')+'<button class="btn btn-sm btn-secondary" onclick="resetPassword(\''+e(u.id)+'\')">Reset Pwd</button><button class="btn btn-sm btn-danger" onclick="deleteUser(\''+e(u.id)+'\',\''+ea(u.email)+'\')">Delete</button></div></td></tr>'
  }).join(''):'<tr class="empty-row"><td colspan="7"><span class="empty-icon">&#x1f465;</span>No users yet. Click <strong>+ Create User</strong> to add one.</td></tr>';
  document.getElementById('app').innerHTML=
    '<h1 class="page-title">Users</h1>'+
    '<div class="section"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-lg)"><h2 style="margin:0;border:none;padding:0">All Users <span style="font-weight:400;color:var(--text-tertiary);font-size:0.9rem">('+users.length+')</span></h2><button class="btn btn-primary" id="create-btn">+ Create User</button></div><div class="table-wrap"><table><thead><tr><th>Username</th><th>Email</th><th>Tier</th><th>API Key</th><th>Status</th><th>Content</th><th>Actions</th></tr></thead><tbody>'+rows+'</tbody></table></div></div>';
  document.getElementById('create-btn').onclick=function(){
    modal('<h3>Create User</h3><div class="form-group"><label class="required">Username</label><input id="m-username" placeholder="johndoe"></div><div class="form-group"><label class="required">Email</label><input id="m-email" type="email" placeholder="john@example.com"></div><div class="form-group"><label class="required">Password</label><input id="m-password" type="password" placeholder="Min 8 characters"></div><div class="form-group"><label>Tier</label><select id="m-tier"><option value="basic">Basic</option><option value="premium">Premium</option><option value="admin">Admin</option></select></div><div class="form-group"><label>Content IDs <span style="font-weight:400;color:var(--text-tertiary)">(comma-separated, * for all)</span></label><input id="m-cids" placeholder="39c3, 38c3"></div><div class="form-actions"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" id="modal-submit" onclick="createUser(this)">Create</button></div>')
  }
}

window.createUser=async function(btn){
  btnLoading(btn,true);
  var r=await api('/api/admin/users',{method:'POST',body:JSON.stringify({username:document.getElementById('m-username').value,email:document.getElementById('m-email').value,password:document.getElementById('m-password').value,tier:document.getElementById('m-tier').value,contentIds:document.getElementById('m-cids').value.split(',').map(function(s){return s.trim()}).filter(Boolean)})});
  btnLoading(btn,false);
  if(r&&r.apiKey){
    var kb='<div class="key-reveal">'+r.apiKey+'<button class="copy-btn" onclick="navigator.clipboard.writeText(\''+r.apiKey+'\');this.textContent=\'Copied!\';var b=this;setTimeout(function(){b.textContent=\'Copy\'},2000)">Copy</button></div>';
    closeModal();modal('<h3>User Created</h3><p style="color:var(--text-secondary);margin-bottom:var(--space-md)">Copy this API key now — shown only once.</p>'+kb+'<div class="form-actions"><button class="btn btn-primary" onclick="closeModal()">Done</button></div>');
    toast('User created successfully','success')
  }else{toast(r&&r.error?r.error:'Failed to create user','error')}
  renderUsers()
};

window.resetKey=async function(id){
  modal('<h3>Regenerate API Key</h3><p style="color:var(--text-secondary);margin-bottom:var(--space-lg)">The old key will stop working immediately. Continue?</p><div class="form-actions"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-danger" id="modal-submit" onclick="doResetKey(\''+e(id)+'\',this)">Regenerate</button></div>')
};
window.doResetKey=async function(id,btn){
  btnLoading(btn,true);
  var r=await api('/api/admin/users/'+id+'/reset-key',{method:'POST'});
  btnLoading(btn,false);
  if(r&&r.apiKey){
    closeModal();
    modal('<h3>New API Key</h3><p style="color:var(--text-secondary);margin-bottom:var(--space-md)">Copy it now — shown only once.</p><div class="key-reveal">'+r.apiKey+'<button class="copy-btn" onclick="navigator.clipboard.writeText(\''+r.apiKey+'\');this.textContent=\'Copied!\';var b=this;setTimeout(function(){b.textContent=\'Copy\'},2000)">Copy</button></div><div class="form-actions"><button class="btn btn-primary" onclick="closeModal()">Done</button></div>');
    toast('API key regenerated','success')
  }
  renderUsers()
};

window.editUser=async function(id){
  var data=await api('/api/admin/users');var u=data&&data.users?data.users.find(function(x){return x.id===id}):null;if(!u)return;
  modal('<h3>Edit User</h3><div class="form-group"><label class="required">Username</label><input id="m-username" value="'+ea(u.username||'')+'"></div><div class="form-group"><label>Email</label><input id="m-email" value="'+ea(u.email||'')+'"></div><div class="form-group"><label>New Password <span style="font-weight:400;color:var(--text-tertiary)">(leave blank to keep)</span></label><input id="m-password" type="password"></div><div class="form-group"><label>Tier</label><select id="m-tier"><option value="basic"'+(u.tier==='basic'?' selected':'')+'>Basic</option><option value="premium"'+(u.tier==='premium'?' selected':'')+'>Premium</option><option value="admin"'+(u.tier==='admin'?' selected':'')+'>Admin</option></select></div><div class="form-group"><label>Content IDs</label><input id="m-cids" value="'+ea(u.contentIds.join(', '))+'"></div><div class="form-actions"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" id="modal-submit" onclick="saveUser(\''+id+'\',this)">Save</button></div>')
};
window.saveUser=async function(id,btn){
  btnLoading(btn,true);
  var pw=document.getElementById('m-password').value;
  var u={username:document.getElementById('m-username').value,email:document.getElementById('m-email').value,tier:document.getElementById('m-tier').value,contentIds:document.getElementById('m-cids').value.split(',').map(function(s){return s.trim()}).filter(Boolean)};
  if(pw)u.password=pw;
  var r=await api('/api/admin/users/'+id,{method:'PATCH',body:JSON.stringify(u)});
  btnLoading(btn,false);closeModal();
  toast(r&&!r.error?'User updated':(r&&r.error||'Update failed'),r&&!r.error?'success':'error');
  renderUsers()
};

window.blockUser=async function(id){
  modal('<h3>Block User</h3><p style="color:var(--text-secondary);margin-bottom:var(--space-lg)">This user will lose access immediately. Continue?</p><div class="form-actions"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-danger" id="modal-submit" onclick="doBlockUser(\''+e(id)+'\',this)">Block</button></div>')
};
window.doBlockUser=async function(id,btn){
  btnLoading(btn,true);await api('/api/admin/users/'+id+'/status',{method:'PATCH',body:JSON.stringify({status:'blocked'})});
  btnLoading(btn,false);closeModal();toast('User blocked','success');renderUsers()
};
window.unblockUser=async function(id){
  var r=await api('/api/admin/users/'+id+'/status',{method:'PATCH',body:JSON.stringify({status:'active'})});
  toast(r&&!r.error?'User unblocked':'Failed',r&&!r.error?'success':'error');renderUsers()
};
window.resetPassword=async function(id){
  modal('<h3>Reset Password</h3><p style="color:var(--text-secondary);margin-bottom:var(--space-lg)">A new random password will be generated. Continue?</p><div class="form-actions"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" id="modal-submit" onclick="doResetPwd(\''+e(id)+'\',this)">Reset</button></div>')
};
window.doResetPwd=async function(id,btn){
  btnLoading(btn,true);await api('/api/admin/users/'+id+'/reset-password',{method:'POST'});
  btnLoading(btn,false);closeModal();toast('Password reset','success');renderUsers()
};
window.deleteUser=async function(id,email){
  modal('<h3>Delete User</h3><p style="color:var(--text-secondary);margin-bottom:var(--space-lg)">Permanently delete <strong>'+e(email)+'</strong>? This cannot be undone.</p><div class="form-actions"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-danger" id="modal-submit" onclick="doDeleteUser(\''+e(id)+'\',this)">Delete</button></div>')
};
window.doDeleteUser=async function(id,btn){
  btnLoading(btn,true);await api('/api/admin/users/'+id,{method:'DELETE'});
  btnLoading(btn,false);closeModal();toast('User deleted','success');renderUsers()
};

async function renderContent(){
  var results=await Promise.all([api('/api/admin/content/sources'),api('/api/admin/content')]);
  var src=results[0],data=results[1];
  if(!data){document.getElementById('app').innerHTML='<div class="error-state"><h2>Conexao perdida</h2><p>Servidor na porta '+location.port+'</p><button class="btn btn-primary" onclick="location.reload()">Tentar novamente</button></div>';return}
  var allItems=data.items||[],sources=src&&src.sources?src.sources:{};
  var pageSize=50,currentPage=0,filteredItems=allItems,currentSource='';

  function renderPage(){
    var total=filteredItems.length,totalPages=Math.ceil(total/pageSize);
    if(currentPage>=totalPages)currentPage=Math.max(0,totalPages-1);
    var start=currentPage*pageSize,end=Math.min(start+pageSize,total);
    document.getElementById('content-body').innerHTML=renderContentRows(filteredItems.slice(start,end));
    document.getElementById('page-info').textContent=(total?start+1:0)+'–'+end+' de '+total;
    document.getElementById('prev-btn').disabled=currentPage===0;
    document.getElementById('next-btn').disabled=currentPage>=totalPages-1;
  }

  document.getElementById('app').innerHTML=
    '<h1 class="page-title">Content Library</h1>'+
    '<div class="section"><div class="stats-grid">'+Object.entries(sources).map(function(x){return'<div class="stat-card"><div class="stat-value">'+x[1].count+'</div><div class="stat-label">'+e(x[0])+'</div></div>'}).join('')+'</div></div>'+
    '<div class="section"><div class="section-header"><h2>All Content <span>('+allItems.length+')</span></h2>'+
    '<select id="src-filter" class="filter"><option value="">All Sources</option>'+Object.entries(sources).map(function(x){return'<option value="'+ea(x[0])+'">'+e(x[0])+'</option>'}).join('')+'</select></div>'+
    '<div class="table-wrap"><table><thead><tr><th>Title</th><th>Source</th><th>Conference</th><th>Year</th><th>Duration</th><th>Actions</th></tr></thead><tbody id="content-body"></tbody></table></div>'+
    '<div style="display:flex;align-items:center;justify-content:space-between;padding:.75rem 1rem;border-top:1px solid var(--border);flex-wrap:wrap;gap:.5rem">'+
      '<span id="page-info" style="font-size:.8rem;color:var(--text-secondary)"></span>'+
      '<div style="display:flex;gap:.35rem">'+
        '<button class="btn btn-xs btn-secondary" id="prev-btn">Anterior</button>'+
        '<button class="btn btn-xs btn-secondary" id="next-btn">Próxima</button>'+
      '</div>'+
    '</div></div>';
  document.getElementById('src-filter').onchange=function(ev){
    currentSource=ev.target.value;currentPage=0;
    filteredItems=currentSource?allItems.filter(function(i){return i.source===currentSource}):allItems;
    renderPage()
  };
  document.getElementById('prev-btn').onclick=function(){if(currentPage>0){currentPage--;renderPage()}};
  document.getElementById('next-btn').onclick=function(){var tp=Math.ceil(filteredItems.length/pageSize);if(currentPage<tp-1){currentPage++;renderPage()}};
  renderPage()
}
function renderContentRows(items){
  if(!items.length)return'<tr class="empty-row"><td colspan="6"><span class="empty-icon">&#x1f4c1;</span>No content found. Run an ingest first.</td></tr>';
  return items.slice(0,100).map(function(i){
    return'<tr><td style="max-width:360px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+ea(i.title)+'">'+e(i.title)+'</td><td><span class="bt bt-'+e(i.source)+'">'+e(i.source)+'</span></td><td>'+e(i.conference||'–')+'</td><td>'+(i.year||'–')+'</td><td>'+(i.duration||0)+' min</td><td><div class="actions-cell"><button class="btn btn-sm btn-secondary" onclick="editContent(\''+e(i.id)+'\',\''+ea(i.title||'')+'\',\''+ea((i.speakers||[]).join(', '))+'\',\''+ea(i.conference||'')+'\','+(i.year||0)+','+(i.duration||0)+',\''+ea((i.tags||[]).join(', '))+'\',\''+ea(i.description||'')+'\')">Edit</button><button class="btn btn-sm btn-danger" onclick="delContent(\''+e(i.id)+'\',\''+ea(i.title)+'\')">Delete</button></div></td></tr>'
  }).join('')
}
window.delContent=async function(id,t){
  modal('<h3>Delete Content</h3><p style="color:var(--text-secondary);margin-bottom:var(--space-lg)">Delete <strong>"'+e(t)+'"</strong>? This cannot be undone.</p><div class="form-actions"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-danger" id="modal-submit" onclick="doDelContent(\''+e(id)+'\',this)">Delete</button></div>')
};
window.doDelContent=async function(id,btn){
  btnLoading(btn,true);await api('/api/admin/content/'+encodeURIComponent(id),{method:'DELETE'});
  btnLoading(btn,false);closeModal();toast('Content deleted','success');renderContent()
};
window.editContent=async function(id,title,speakers,conference,year,duration,tags,description){
  modal('<h3>Edit Content</h3><div class="form-group"><label>Title</label><input id="m-title" value="'+ea(title)+'"></div><div class="form-group"><label>Speakers</label><input id="m-speakers" value="'+ea(speakers)+'"></div><div class="form-group"><label>Conference</label><input id="m-conference" value="'+ea(conference)+'"></div><div class="form-group"><label>Year</label><input id="m-year" type="number" value="'+year+'"></div><div class="form-group"><label>Duration (min)</label><input id="m-duration" type="number" value="'+duration+'"></div><div class="form-group"><label>Tags</label><input id="m-tags" value="'+ea(tags)+'"></div><div class="form-group"><label>Description</label><textarea id="m-description" rows="3">'+ea(description)+'</textarea></div><div class="form-actions"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" id="modal-submit" onclick="saveContent(\''+id+'\',this)">Save</button></div>')
};
window.saveContent=async function(id,btn){
  btnLoading(btn,true);
  var r=await api('/api/admin/content/'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({title:document.getElementById('m-title').value,speakers:document.getElementById('m-speakers').value,conference:document.getElementById('m-conference').value,year:document.getElementById('m-year').value,duration:document.getElementById('m-duration').value,tags:document.getElementById('m-tags').value,description:document.getElementById('m-description').value})});
  btnLoading(btn,false);closeModal();
  toast(r&&!r.error?'Content updated':'Update failed',r&&!r.error?'success':'error');renderContent()
};

async function renderIngest(){
  var status=await api('/api/admin/ingest/status');
  if(!status){document.getElementById('app').innerHTML='<div class="error-state"><h2>Conexao perdida</h2><p>Servidor na porta '+location.port+'</p><button class="btn btn-primary" onclick="location.reload()">Tentar novamente</button></div>';return}
  var sourceEntries=Object.entries(status.sourceStats||{});
  var srcCards=sourceEntries.map(function(x){return'<div class="stat-card"><div class="stat-value">'+x[1]+'</div><div class="stat-label">'+e(x[0])+'</div></div>'}).join('');
  var srcOptions=sourceEntries.map(function(x){return'<option value="'+ea(x[0])+'">'+e(x[0])+'</option>'}).join('');
  document.getElementById('app').innerHTML=
    '<h1 class="page-title">Content Ingest</h1>'+
    '<div class="section"><h2>Status</h2><div class="stats-grid"><div class="stat-card"><div class="stat-value">'+(status.totalItems||0)+'</div><div class="stat-label">Total Items</div></div>'+srcCards+'</div></div>'+
    '<div class="section"><h3>Add YouTube Playlist</h3><div class="ingest-controls"><div class="form-group" style="flex:1;max-width:500px;min-width:250px"><label>Playlist ID or URL</label><input id="yt-playlist" placeholder="PLcrUMxzVpi6..." style="width:100%;padding:var(--space-md);border-radius:var(--radius-sm);border:1px solid var(--border-input);background:var(--bg-input);color:var(--text-primary)"></div><button class="btn btn-primary" id="yt-btn">Ingest Playlist</button></div><div id="yt-result" style="margin-top:var(--space-lg)"></div></div>'+
    '<div class="section"><h3>Run Ingest</h3><div class="ingest-controls"><div class="form-group"><label>Source</label><select id="ingest-src" style="padding:var(--space-md);border-radius:var(--radius-sm);border:1px solid var(--border-input);background:var(--bg-input);color:var(--text-primary)"><option value="">All Sources</option><option value="ccc">CCC</option><option value="peertube">PeerTube</option><option value="infocon">InfoCon</option><option value="youtube">YouTube</option></select></div><div class="form-group"><label>Options</label><label style="display:flex;align-items:center;gap:var(--space-sm);cursor:pointer;color:var(--text-secondary)"><input type="checkbox" id="ingest-upsert"> Upsert</label></div><button class="btn btn-primary" id="run-btn">Run Ingest</button></div><div id="ingest-result" style="margin-top:var(--space-lg)"></div></div>'+
    '<div class="section"><h3>Setup</h3><div class="setup-info"><p><strong>CLI:</strong></p><pre><code>bun run ingest\nbun run ingest --source ccc --upsert</code></pre><p style="margin-top:var(--space-lg)"><strong>Cron:</strong></p><pre><code>bun run ingest:cron\nINTERVAL=3600 bun run ingest:cron</code></pre></div></div>';
  document.getElementById('yt-btn').onclick=async function(){
    var btn=document.getElementById('yt-btn');var pl=document.getElementById('yt-playlist').value.trim();
    if(!pl){toast('Enter a playlist ID or URL','error');return}
    btnLoading(btn,true);btn.textContent='Ingesting…';
    var r=await api('/api/admin/ingest/youtube',{method:'POST',body:JSON.stringify({playlistId:pl})});
    btnLoading(btn,false);btn.textContent='Ingest Playlist';
    if(r&&r.results){document.getElementById('yt-result').innerHTML='<div class="ingest-result"><h4 style="margin-bottom:var(--space-md)">Results</h4>'+r.results.map(function(x){return'<div style="margin:var(--space-sm) 0;padding:var(--space-sm);border-left:3px solid '+(x.error?'var(--accent)':'var(--success)')+'"><strong>'+x.source+'</strong>: '+(x.error?'<span style="color:var(--accent)">Error: '+x.error+'</span>':'+'+x.added+' added, '+x.duplicates+' dupes, '+x.updated+' updated (total: '+x.total+')')+'</div>'}).join('')+'</div>';toast('YouTube ingest complete','success')}else{toast('Ingest failed','error')}
  };
  document.getElementById('run-btn').onclick=async function(){
    var btn=document.getElementById('run-btn');var b={};var s=document.getElementById('ingest-src').value;if(s)b.source=s;if(document.getElementById('ingest-upsert').checked)b.upsert=true;
    btnLoading(btn,true);btn.textContent='Running…';
    var r=await api('/api/admin/ingest/run',{method:'POST',body:JSON.stringify(b)});
    btnLoading(btn,false);btn.textContent='Run Ingest';
    if(r&&r.results){document.getElementById('ingest-result').innerHTML='<div class="ingest-result"><h4 style="margin-bottom:var(--space-md)">Results</h4>'+r.results.map(function(x){return'<div style="margin:var(--space-sm) 0;padding:var(--space-sm);border-left:3px solid '+(x.error?'var(--accent)':'var(--success)')+'"><strong>'+x.source+'</strong>: '+(x.error?'<span style="color:var(--accent)">Error: '+x.error+'</span>':'+'+x.added+' added, '+x.duplicates+' dupes, '+x.updated+' updated (total: '+x.total+')')+'</div>'}).join('')+'</div>';toast('Ingest complete','success')}else{toast('Ingest failed','error')}
  }
}

var pages={'/':renderDashboard,'/users':renderUsers,'/content':renderContent,'/ingest':renderIngest};
(pages[PAGE]||renderDashboard)();
