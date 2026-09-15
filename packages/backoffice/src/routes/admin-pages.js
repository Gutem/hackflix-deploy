/**
 * Hackflix Admin — server-rendered HTML pages.
 * @module packages/backoffice/src/routes/admin
 */

const LOGIN_STYLE = `*{margin:0;padding:0;box-sizing:border-box}body{background:#141414;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center}.login-card{background:#1a1a1a;padding:3rem;border-radius:8px;max-width:400px;width:100%;text-align:center}.login-card h1{font-size:2rem;color:#e50914;letter-spacing:3px;margin-bottom:.5rem}.badge{font-size:.6em;background:#e50914;padding:2px 8px;border-radius:3px;vertical-align:middle;margin-left:8px}.subtitle{color:#b3b3b3;margin-bottom:2rem}.form-group{text-align:left;margin-bottom:1rem}.form-group label{display:block;color:#8c8c8c;font-size:.85rem;margin-bottom:.4rem}.form-group input{width:100%;padding:.875rem;background:#333;border:1px solid #444;border-radius:4px;color:#fff;font-size:1rem}.form-group input:focus{outline:none;border-color:#e50914}.btn{width:100%;padding:.875rem;border-radius:4px;font-size:1rem;font-weight:600;cursor:pointer;border:none;background:#e50914;color:#fff}.btn:hover{opacity:.9}.error{color:#e50914;font-size:.9rem;margin-top:.75rem;min-height:1.2rem}.back{display:inline-block;margin-top:1.5rem;color:#b3b3b3;text-decoration:none;font-size:.9rem}.back:hover{color:#fff}`;

const APP_STYLE = `:root{--bg:#0a0a0a;--bg-elevated:#141414;--bg-card:#1a1a1a;--bg-card-hover:#222;--bg-surface:#1a1a2e;--text:#fff;--text-secondary:#a8a8a8;--text-muted:#6b6b6b;--accent:#e50914;--accent-dim:rgba(229,9,20,.15);--green:#2ecc40;--green-dim:rgba(46,204,64,.15);--orange:#e87c2c;--orange-dim:rgba(232,124,44,.15);--blue:#3b82f6;--blue-dim:rgba(59,130,246,.15);--purple:#8b5cf6;--purple-dim:rgba(139,92,246,.15);--border:#2a2a2a;--border-light:#333;--radius:6px;--radius-lg:10px;--font:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',sans-serif;--mono:'SF Mono','Cascadia Code',Monaco,monospace}
*{margin:0;padding:0;box-sizing:border-box}
body{background:var(--bg);color:var(--text);font-family:var(--font);font-size:14px;line-height:1.6;-webkit-font-smoothing:antialiased}
*:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:2px}
.header{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;justify-content:space-between;align-items:center;padding:0 2rem;height:56px;background:rgba(0,0,0,.85);border-bottom:1px solid var(--border);backdrop-filter:blur(12px)}
.logo{font-size:1.15rem;font-weight:700;color:var(--text);letter-spacing:-.5px;user-select:none;display:flex;align-items:center;gap:.5rem}
.logo-dot{width:8px;height:8px;background:var(--accent);border-radius:50%;flex-shrink:0}
.nav{display:flex;gap:.25rem;align-items:center}
.nav a{color:var(--text-secondary);text-decoration:none;font-size:.875rem;padding:.4rem .75rem;border-radius:6px;transition:all .15s}
.nav a:hover{color:var(--text);background:rgba(255,255,255,.06)}
.nav a.active{color:var(--text);background:rgba(255,255,255,.08);font-weight:600}
.nav .sep{width:1px;height:20px;background:var(--border);margin:0 .5rem}
.user-info{color:var(--text-secondary);font-size:.8rem;margin-left:.5rem}.logout{color:var(--text-muted);cursor:pointer;background:none;border:none;font-size:.8rem;padding:.25rem .5rem;border-radius:4px;transition:all .15s}.logout:hover{color:var(--accent);background:rgba(255,255,255,.05)}
.main{padding:80px 2rem 3rem;min-height:100vh}
.page-title{font-size:1.4rem;font-weight:700;margin-bottom:1.75rem;letter-spacing:-.3px}
.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1rem;margin-bottom:2rem}
.stat-card{background:var(--bg-card);border-radius:var(--radius-lg);padding:1.25rem 1.5rem;border:1px solid var(--border);transition:border-color .15s,transform .1s;position:relative;overflow:hidden}
.stat-card::before{content:'';position:absolute;top:0;left:0;width:4px;height:100%}
.stat-card.accent::before{background:var(--accent)}.stat-card.green::before{background:var(--green)}.stat-card.orange::before{background:var(--orange)}.stat-card.blue::before{background:var(--blue)}.stat-card.purple::before{background:var(--purple)}
.stat-card:hover{border-color:var(--border-light)}
.stat-icon{font-size:1.25rem;margin-bottom:.5rem;opacity:.7}
.stat-value{font-size:2rem;font-weight:800;line-height:1.1;letter-spacing:-1px}
.stat-label{color:var(--text-secondary);font-size:.8rem;margin-top:.3rem;text-transform:uppercase;letter-spacing:.5px}
.stat-sub{font-size:.75rem;color:var(--text-muted);margin-top:.25rem}
.section{margin-bottom:1.5rem}
.section-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:.75rem}
.section-header h2{font-size:1.05rem;font-weight:600;color:var(--text);letter-spacing:-.2px}
.section-header h2 span{font-weight:400;color:var(--text-muted);font-size:.85rem;margin-left:.5rem}
.table-wrap{background:var(--bg-card);border-radius:var(--radius-lg);border:1px solid var(--border);overflow:hidden}
table{width:100%;border-collapse:collapse}
th{text-align:left;padding:.6rem 1rem;font-size:.75rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;background:rgba(255,255,255,.02);border-bottom:1px solid var(--border)}
td{padding:.6rem 1rem;border-bottom:1px solid var(--border);font-size:.875rem;vertical-align:middle}
tr:last-child td{border-bottom:none}
tbody tr:hover{background:rgba(255,255,255,.025)}
td.title-cell{max-width:400px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.empty-row td{text-align:center;padding:3rem 1rem;color:var(--text-muted)}
.empty-row .empty-icon{font-size:2rem;display:block;margin-bottom:.5rem;opacity:.4}
.bt{display:inline-flex;align-items:center;padding:1px 8px;border-radius:3px;font-size:.75rem;font-weight:600;white-space:nowrap;line-height:1.6}
.bt-active{background:var(--green-dim);color:var(--green)}.bt-blocked{background:var(--accent-dim);color:var(--accent)}
.bt-admin{background:var(--orange-dim);color:var(--orange)}.bt-premium{background:var(--accent-dim);color:var(--accent)}.bt-basic{background:rgba(109,109,110,.2);color:var(--text-secondary)}
.bt-ccc{background:rgba(26,107,60,.2);color:#2ecc40}.bt-peertube{background:rgba(184,91,20,.2);color:#e87c2c}.bt-infocon{background:rgba(26,58,107,.2);color:#3b82f6}.bt-youtube{background:rgba(179,27,27,.2);color:#e50914}
.btn{display:inline-flex;align-items:center;gap:.4rem;padding:.5rem .9rem;border-radius:var(--radius);text-decoration:none;font-weight:600;border:none;cursor:pointer;font-size:.85rem;font-family:inherit;transition:all .15s;white-space:nowrap}
.btn:active{transform:scale(.97)}.btn:disabled{opacity:.4;cursor:not-allowed;transform:none}
.btn-primary{background:var(--text);color:#000}.btn-primary:hover{background:#e0e0e0}
.btn-secondary{background:rgba(255,255,255,.08);color:var(--text);border:1px solid var(--border)}.btn-secondary:hover{background:rgba(255,255,255,.12);border-color:var(--border-light)}
.btn-danger{background:var(--accent-dim);color:var(--accent);border:1px solid transparent}.btn-danger:hover{background:var(--accent);color:#fff}
.btn-xs{padding:.25rem .6rem;font-size:.75rem}
.btn.loading{color:transparent!important;position:relative;pointer-events:none}
.btn.loading::after{content:'';position:absolute;inset:0;margin:auto;width:14px;height:14px;border:2px solid transparent;border-top-color:currentColor;border-radius:50%;animation:spin .6s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:200;animation:fadeIn .15s;backdrop-filter:blur(4px)}
.modal{background:var(--bg-card);border-radius:var(--radius-lg);padding:1.75rem;width:90%;max-width:460px;max-height:85vh;overflow-y:auto;animation:slideUp .15s;box-shadow:0 20px 60px rgba(0,0,0,.5);border:1px solid var(--border);position:relative}
.modal h3{font-size:1.1rem;font-weight:700;margin-bottom:1.25rem;letter-spacing:-.2px}
.modal-close{position:absolute;top:.75rem;right:.75rem;background:none;border:none;color:var(--text-secondary);font-size:1.25rem;cursor:pointer;padding:.25rem;border-radius:4px;line-height:1;transition:all .15s}
.modal-close:hover{color:var(--text);background:rgba(255,255,255,.05)}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
.form-group{margin-bottom:1rem}.form-group label{display:block;margin-bottom:.35rem;color:var(--text-secondary);font-size:.8rem;font-weight:500}
.form-group .required::after{content:' *';color:var(--accent)}
.form-group input,.form-group select,.form-group textarea{width:100%;padding:.55rem .75rem;border-radius:var(--radius);border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:.875rem;font-family:inherit;transition:border-color .15s}
.form-group input:focus,.form-group select:focus,.form-group textarea:focus{border-color:var(--accent);outline:none}
.form-group input::placeholder{color:var(--text-muted)}
.form-actions{display:flex;gap:.5rem;justify-content:flex-end;margin-top:1.25rem}
.key-preview{font-family:var(--mono);font-size:.8rem;background:var(--bg);padding:1px 6px;border-radius:3px;color:#60a5fa;border:1px solid var(--border)}
.key-reveal{background:var(--bg);border:1px solid var(--green);border-radius:var(--radius);padding:.75rem 1rem;font-family:var(--mono);font-size:.85rem;word-break:break-all;margin:.75rem 0;color:var(--green);position:relative}
.key-reveal .copy-btn{position:absolute;top:.35rem;right:.35rem;background:var(--bg-card);border:1px solid var(--border);color:var(--text-secondary);font-size:.75rem;padding:2px 8px;border-radius:4px;cursor:pointer;transition:all .15s}
.key-reveal .copy-btn:hover{color:var(--text);border-color:var(--text-secondary)}
.toast-container{position:fixed;bottom:1.5rem;right:1.5rem;z-index:300;display:flex;flex-direction:column;gap:.5rem}
.toast{background:var(--bg-card);border-radius:var(--radius-lg);padding:.65rem 1rem;min-width:260px;max-width:400px;box-shadow:0 8px 30px rgba(0,0,0,.4);animation:slideIn .2s ease;font-size:.85rem;border:1px solid var(--border);display:flex;align-items:center;gap:.5rem}
.toast.success{border-left:3px solid var(--green)}.toast.error{border-left:3px solid var(--accent)}.toast.removing{animation:slideOut .15s forwards}
@keyframes slideIn{from{opacity:0;transform:translateX(80px)}to{opacity:1;transform:translateX(0)}}@keyframes slideOut{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(80px)}}
.loading{text-align:center;padding-top:40vh;font-size:1rem;color:var(--text-secondary)}.loading .loading-spinner{display:inline-block;vertical-align:middle;margin-right:.5rem}
.loading-spinner{width:18px;height:18px;border:2px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin .6s linear infinite}
.error-state{display:flex;flex-direction:column;align-items:center;justify-content:center;height:50vh;text-align:center;gap:1rem}.error-state h2{font-size:1.2rem;color:var(--accent)}.error-state p{color:var(--text-secondary)}.error-state .btn{margin-top:.5rem}
.setup-info{background:var(--bg-card);border-radius:var(--radius-lg);padding:1.25rem 1.5rem;border:1px solid var(--border)}.setup-info pre{background:var(--bg);border-radius:var(--radius);padding:1rem;overflow-x:auto;margin:.4rem 0;border:1px solid var(--border)}.setup-info code{font-family:var(--mono);font-size:.8rem}
.ingest-controls{display:flex;gap:1rem;align-items:flex-end;flex-wrap:wrap}
.ingest-result{background:var(--bg-card);border-radius:var(--radius-lg);padding:1rem 1.25rem;margin-top:1rem;border:1px solid var(--border)}
.actions-cell{display:flex;gap:.35rem;flex-wrap:wrap}
select.filter{background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:var(--radius);padding:.45rem .75rem;font-size:.8rem;font-family:inherit;cursor:pointer}
.quick-actions{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:.75rem;margin-bottom:2rem}
.quick-card{background:var(--bg-card);border-radius:var(--radius-lg);padding:1rem 1.25rem;border:1px solid var(--border);text-decoration:none;color:var(--text);transition:all .15s;display:flex;align-items:center;gap:.75rem}
.quick-card:hover{border-color:var(--border-light);background:var(--bg-card-hover)}
.quick-card-icon{width:36px;height:36px;border-radius:var(--radius);display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0}
.quick-card-label{font-size:.85rem;font-weight:600}.quick-card-desc{font-size:.75rem;color:var(--text-secondary);margin-top:1px}
@media(max-width:768px){.header{padding:0 1rem}.nav a{font-size:.8rem;padding:.3rem .5rem}.user-info{display:none}.main{padding:72px 1rem 2rem}.stats-grid{grid-template-columns:repeat(auto-fit,minmax(160px,1fr))}.stat-value{font-size:1.6rem}.modal{padding:1.25rem;width:95%}.ingest-controls{flex-direction:column;align-items:stretch}.toast-container{left:1rem;right:1rem;bottom:1rem}.toast{min-width:0;max-width:none}}
@media(max-width:480px){.logo{font-size:1rem}.nav{gap:0}.badge{display:none}.stats-grid{grid-template-columns:1fr}.quick-actions{grid-template-columns:1fr}}`;

export function renderAdminLogin(frontendUrl) {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hackflix Admin - Login</title>
<style>${LOGIN_STYLE}</style>
</head><body>
<div class="login-card">
  <h1>HACKFLIX <span class="badge">ADMIN</span></h1>
  <p class="subtitle">Admin access only</p>
  <form id="login-form">
    <div class="form-group"><label for="username">Username</label><input type="text" id="username" autocomplete="username" required></div>
    <div class="form-group"><label for="password">Password</label><input type="password" id="password" autocomplete="current-password" required></div>
    <button type="submit" class="btn">Sign In</button>
  </form>
  <div id="error" class="error"></div>
  <a href="${frontendUrl || 'http://localhost:3001'}" class="back">← Back to site</a>
</div>
<script>
document.getElementById('login-form').addEventListener('submit',async e=>{
  e.preventDefault();
  var username=document.getElementById('username').value;
  var password=document.getElementById('password').value;
  var err=document.getElementById('error');
  try{
    var res=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
    var data=await res.json();
    if(!res.ok){err.textContent=data.error||'Login failed';return}
    if(data.user.tier!=='admin'){err.textContent='Admin access required';return}
    localStorage.setItem('hackflix_token',data.token);
    localStorage.setItem('hackflix_user',JSON.stringify(data.user));
    window.location.href='/admin';
  }catch{err.textContent='Connection error'}
});
</script>
</body></html>`;
}

export function renderAdminApp(page, user, frontendUrl) {
  var navLink = function(href, label, path) {
    var active = page === path ? ' class="active"' : '';
    return '<a href="' + href + '"' + active + '>' + label + '</a>';
  };

  return '<!DOCTYPE html>\n<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hackflix Admin</title>\n<style>' + APP_STYLE + '</style>\n</head><body>\n' +
    '<header class="header">' +
      '<div class="logo"><span class="logo-dot"></span>HACKFLIX <span class="badge" style="font-size:.6em;background:var(--accent);padding:1px 6px;border-radius:3px;vertical-align:middle;margin-left:6px">ADMIN</span></div>' +
      '<nav class="nav">' +
        navLink('/admin', 'Dashboard', '/') +
        navLink('/admin/users', 'Users', '/users') +
        navLink('/admin/content', 'Content', '/content') +
        navLink('/admin/ingest', 'Ingest', '/ingest') +
        '<span class="sep"></span>' +
        '<a href="' + (frontendUrl || 'http://localhost:3001') + '">← Site</a>' +
        '<span class="user-info">' + (user.username || user.email) + '</span>' +
        '<button class="logout" onclick="localStorage.clear();document.cookie=\'hackflix_token=; path=/; max-age=0\';window.location.href=\'/admin\'">Logout</button>' +
      '</nav>' +
    '</header>\n' +
    '<main class="main"><div id="app" class="loading" data-page=' + JSON.stringify(page) + '><div class="loading-spinner"></div>Loading...</div></main>\n' +
    '<div id="modal-root"></div>\n' +
    '<script src="/admin-app.js"></script>\n' +
    '</body></html>';
}
