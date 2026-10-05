// Make a personal access token for someone.
// Usage: node scripts/new-token.js "Director Name" [https://your-dashboard.onrender.com]
const crypto = require('crypto');
const name = (process.argv[2] || '').trim();
if (!name || /[,:]/.test(name)) { console.error('Give a name without commas or colons, e.g. node scripts/new-token.js "Kwame Asante"'); process.exit(1); }
const token = 'kozo_' + crypto.randomBytes(18).toString('base64url');
const site = (process.argv[3] || '').replace(/\/$/, '');
console.log(`\nAccess token for ${name}:\n  ${token}\n`);
if (site) console.log(`One-tap link to send them:\n  ${site}/access/${token}\n`);
console.log(`Add this entry to the ACCESS_TOKENS setting on Render (separate entries with commas):\n  ${name}:${token}\n`);
