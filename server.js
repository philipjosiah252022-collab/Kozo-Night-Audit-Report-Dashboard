// Kozo Night Audit Report Dashboard: serves /public behind a password page.
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const PORT = process.env.PORT || 10000;
const PASSWORD = process.env.DASHBOARD_PASSWORD || '';
const SECRET = process.env.SESSION_SECRET || crypto.createHash('sha256').update('kozo:' + PASSWORD).digest('hex');
const PUB = path.join(__dirname, 'public');
const DAYS = 30;
const TYPES = { '.html': 'text/html; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.ico': 'image/x-icon' };

const sign = v => crypto.createHmac('sha256', SECRET).update(v).digest('hex');
function makeToken() { const exp = String(Date.now() + DAYS * 864e5); return exp + '.' + sign(exp); }
function validToken(t) {
  if (!t) return false; const [exp, sig] = t.split('.'); if (!exp || !sig) return false;
  const good = sign(exp); if (sig.length !== good.length) return false;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good)) && Number(exp) > Date.now();
}
function cookie(req, name) { const m = (req.headers.cookie || '').match(new RegExp('(?:^|; )' + name + '=([^;]*)')); return m ? decodeURIComponent(m[1]) : null; }
function safeEqual(a, b) { const x = crypto.createHash('sha256').update(a).digest(), y = crypto.createHash('sha256').update(b).digest(); return crypto.timingSafeEqual(x, y); }

const tries = new Map();
function limited(ip) { const now = Date.now(), r = (tries.get(ip) || []).filter(t => now - t < 15 * 60e3); tries.set(ip, r); return r.length >= 10; }

function loginPage(msg) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Kozo Night Audit Report Dashboard</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,650&family=Figtree:wght@400;500;600&display=swap">
<style>:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0A1B29;color:#F4F2EC;font-family:Figtree,system-ui,sans-serif;padding:16px}
.box{width:100%;max-width:380px;background:#10263A;border:1px solid #22405A;border-radius:16px;padding:28px;display:flex;flex-direction:column;gap:16px}
h1{font-family:"Bricolage Grotesque",system-ui,sans-serif;font-size:22px;margin:0;line-height:1.2}p{margin:0;color:#9AABBA;font-size:14px}
label{display:flex;flex-direction:column;gap:6px;font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#9AABBA}
input{font:inherit;font-size:16px;color:#F4F2EC;background:#173149;border:1px solid #22405A;border-radius:10px;padding:11px 12px}input:focus{outline:2px solid #E6E1D4;outline-offset:1px}
button{font:inherit;font-weight:600;border:0;border-radius:999px;padding:12px;background:#E6E1D4;color:#0A1B29;cursor:pointer}
.err{color:#EE9D95;font-size:13.5px}</style></head><body>
<form class="box" method="post" action="/login"><h1>Kozo Night Audit Report Dashboard</h1><p>Enter the password to view the reports.</p>
${msg ? `<div class="err">${msg}</div>` : ''}<label for="pw">Password<input id="pw" name="password" type="password" autocomplete="current-password" autofocus required></label><button type="submit">View reports</button></form></body></html>`;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const send = (code, body, headers = {}) => { res.writeHead(code, { 'X-Frame-Options': 'DENY', 'X-Robots-Tag': 'noindex', 'Referrer-Policy': 'no-referrer', ...headers }); res.end(body); };

  if (url.pathname === '/healthz') return send(200, 'ok');
  if (!PASSWORD) return send(500, 'DASHBOARD_PASSWORD is not set on the server.');

  if (url.pathname === '/login' && req.method === 'POST') {
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    if (limited(ip)) return send(429, loginPage('Too many attempts. Try again in 15 minutes.'), { 'Content-Type': 'text/html; charset=utf-8' });
    let body = ''; req.on('data', c => { body += c; if (body.length > 4096) req.destroy(); });
    req.on('end', () => {
      const pw = new URLSearchParams(body).get('password') || '';
      if (safeEqual(pw, PASSWORD)) {
        tries.delete(ip);
        return send(303, '', { Location: '/', 'Set-Cookie': `kozo_session=${makeToken()}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${DAYS * 86400}` });
      }
      tries.get(ip).push(Date.now());
      send(401, loginPage('That password is not right. Please try again.'), { 'Content-Type': 'text/html; charset=utf-8' });
    });
    return;
  }
  if (url.pathname === '/logout') return send(303, '', { Location: '/', 'Set-Cookie': 'kozo_session=; Path=/; Max-Age=0' });

  if (!validToken(cookie(req, 'kozo_session'))) return send(200, loginPage(''), { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });

  let p = decodeURIComponent(url.pathname); if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(PUB, p));
  if (!file.startsWith(PUB + path.sep)) return send(404, 'Not found');
  fs.readFile(file, (err, data) => {
    if (err) return send(404, 'Not found');
    send(200, data, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'private, no-cache' });
  });
});
server.listen(PORT, () => console.log('Kozo dashboard on ' + PORT));
