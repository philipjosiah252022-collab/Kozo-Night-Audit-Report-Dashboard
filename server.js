// Kozo Night Audit Report Dashboard server.
// Serves /public to signed-in viewers. Each person has an 8-character access key
// (made with: node scripts/new-key.js "Name"), typed on the login page or opened as /access/<key>.
// Keys live in the ACCESS_TOKENS environment variable:  Name One:KEY12345,Name Two:KEY67890
// Keys are not case-sensitive, and spaces or dashes are ignored, so "ab3k-7mqz" = "AB3K7MQZ".
// Remove someone's entry and redeploy to revoke their access; their open sessions stop working too.
// DASHBOARD_PASSWORD (optional) is an extra admin login.
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');

const PORT = process.env.PORT || 10000;
const PASSWORD = process.env.DASHBOARD_PASSWORD || '';
const SECRET = process.env.SESSION_SECRET || crypto.createHash('sha256').update('kozo:' + PASSWORD + ':' + (process.env.ACCESS_TOKENS || '')).digest('hex');
const PUB = path.join(__dirname, 'public');
const DAYS = 30;
const ADMIN = 'Night auditor';
const TYPES = { '.html': 'text/html; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.ico': 'image/x-icon' };

const sha = s => crypto.createHash('sha256').update(String(s)).digest();
const norm = k => String(k || '').toUpperCase().replace(/[^A-Z0-9_]/g, '');
// name -> sha256(token)
const TOKENS = new Map((process.env.ACCESS_TOKENS || '').split(',').map(s => s.trim()).filter(Boolean).map(entry => {
  const i = entry.lastIndexOf(':'); return [entry.slice(0, i).trim(), sha(norm(entry.slice(i + 1)))];
}).filter(([n, h]) => n));

function whoForSecret(secret) {
  if (!secret) return null;
  const h = sha(norm(secret));
  for (const [name, th] of TOKENS) if (crypto.timingSafeEqual(h, th)) return name;
  if (PASSWORD && crypto.timingSafeEqual(sha(secret), sha(PASSWORD))) return ADMIN;
  return null;
}
// A session is tied to the person's current key: change or remove their key and the session ends.
function keyPrint(name) {
  const h = name === ADMIN ? (PASSWORD ? sha(PASSWORD) : null) : TOKENS.get(name);
  return h ? crypto.createHash('sha256').update(h).digest('hex').slice(0, 16) : null;
}

const sign = v => crypto.createHmac('sha256', SECRET).update(v).digest('hex');
function makeSession(name) {
  const v = String(Date.now() + DAYS * 864e5) + '.' + Buffer.from(name).toString('base64url') + '.' + keyPrint(name);
  return v + '.' + sign(v);
}
function readSession(t) {
  if (!t) return null; const parts = t.split('.'); if (parts.length !== 4) return null;
  const v = parts.slice(0, 3).join('.'), good = sign(v);
  if (parts[3].length !== good.length || !crypto.timingSafeEqual(Buffer.from(parts[3]), Buffer.from(good))) return null;
  if (Number(parts[0]) < Date.now()) return null;
  const name = Buffer.from(parts[1], 'base64url').toString();
  const print = keyPrint(name);
  return print && print === parts[2] ? name : null;
}
function cookie(req, name) { const m = (req.headers.cookie || '').match(new RegExp('(?:^|; )' + name + '=([^;]*)')); return m ? decodeURIComponent(m[1]) : null; }
const sessionCookie = name => `kozo_session=${makeSession(name)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${DAYS * 86400}`;

const tries = new Map();
const ipOf = req => (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
function limited(ip) { const now = Date.now(), r = (tries.get(ip) || []).filter(t => now - t < 15 * 60e3); tries.set(ip, r); return r.length >= 10 || globallyLimited(); }
let globalFails = [];
function fail(ip) {
  (tries.get(ip) || tries.set(ip, []).get(ip)).push(Date.now());
  globalFails.push(Date.now());
}
// Short keys need a site-wide brake too: after 60 wrong attempts in an hour from anywhere, pause logins.
function globallyLimited() { const now = Date.now(); globalFails = globalFails.filter(t => now - t < 60 * 60e3); return globalFails.length >= 60; }

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function loginPage(msg) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Kozo Night Audit Report Dashboard</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,650&family=Figtree:wght@400;500;600&display=swap">
<style>:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0A1B29;color:#F4F2EC;font-family:Figtree,system-ui,sans-serif;padding:16px}
.box{width:100%;max-width:400px;background:#10263A;border:1px solid #22405A;border-radius:16px;padding:28px;display:flex;flex-direction:column;gap:16px}
h1{font-family:"Bricolage Grotesque",system-ui,sans-serif;font-size:22px;margin:0;line-height:1.2}p{margin:0;color:#9AABBA;font-size:14px;line-height:1.5}
label{display:flex;flex-direction:column;gap:6px;font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#9AABBA}
input{font:inherit;font-size:18px;letter-spacing:.12em;text-transform:uppercase;color:#F4F2EC;background:#173149;border:1px solid #22405A;border-radius:10px;padding:11px 12px;font-family:ui-monospace,Menlo,monospace}input:focus{outline:2px solid #E6E1D4;outline-offset:1px}
button{font:inherit;font-weight:600;border:0;border-radius:999px;padding:12px;background:#E6E1D4;color:#0A1B29;cursor:pointer}
.err{color:#EE9D95;font-size:13.5px}</style></head><body>
<form class="box" method="post" action="/login"><h1>Kozo Night Audit Report Dashboard</h1>
<p>Enter your 8-character access key. If you were sent a link, opening it signs you in.</p>
${msg ? `<div class="err">${esc(msg)}</div>` : ''}
<label for="tk">Access key<input id="tk" name="token" type="password" inputmode="text" autocomplete="current-password" autocapitalize="characters" spellcheck="false" maxlength="40" placeholder="e.g. AB3K7MQZ" autofocus required></label>
<button type="submit">View reports</button></form></body></html>`;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const send = (code, body, headers = {}) => { res.writeHead(code, { 'X-Frame-Options': 'DENY', 'X-Robots-Tag': 'noindex', 'Referrer-Policy': 'no-referrer', ...headers }); res.end(body); };
  const html = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' };

  if (url.pathname === '/healthz') return send(200, 'ok');
  if (!PASSWORD && !TOKENS.size) return send(500, 'Set DASHBOARD_PASSWORD or ACCESS_TOKENS on the server.');

  // One-tap link: /access/<token>
  if (url.pathname.startsWith('/access/')) {
    const ip = ipOf(req); if (limited(ip)) return send(429, loginPage('Too many attempts. Try again in 15 minutes.'), html);
    const who = whoForSecret(decodeURIComponent(url.pathname.slice(8)));
    if (!who) { fail(ip); return send(401, loginPage('This access link is not valid or has been withdrawn. Ask the night auditor for a new one.'), html); }
    return send(303, '', { Location: '/', 'Set-Cookie': sessionCookie(who) });
  }
  if (url.pathname === '/login' && req.method === 'POST') {
    const ip = ipOf(req); if (limited(ip)) return send(429, loginPage('Too many attempts. Try again in 15 minutes.'), html);
    let body = ''; req.on('data', c => { body += c; if (body.length > 4096) req.destroy(); });
    req.on('end', () => {
      const who = whoForSecret((new URLSearchParams(body).get('token') || '').trim());
      if (!who) { fail(ip); return send(401, loginPage('That access key is not right. Check it and try again.'), html); }
      tries.delete(ip); send(303, '', { Location: '/', 'Set-Cookie': sessionCookie(who) });
    });
    return;
  }
  if (url.pathname === '/logout') return send(303, '', { Location: '/', 'Set-Cookie': 'kozo_session=; Path=/; Max-Age=0' });

  const who = readSession(cookie(req, 'kozo_session'));
  if (!who) return send(200, loginPage(''), html);
  if (url.pathname === '/me') return send(200, JSON.stringify({ name: who }), { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });

  let p = decodeURIComponent(url.pathname); if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(PUB, p));
  if (!file.startsWith(PUB + path.sep)) return send(404, 'Not found');
  fs.readFile(file, (err, data) => {
    if (err) return send(404, 'Not found');
    send(200, data, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'private, no-cache' });
  });
});
server.listen(PORT, () => console.log(`Kozo dashboard on ${PORT} · ${TOKENS.size} access token(s)${PASSWORD ? ' + admin password' : ''}`));
