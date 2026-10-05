// Make an 8-character access key for someone.
// Usage: node scripts/new-key.js "Director Name" [https://your-dashboard.onrender.com]
// Keys use letters and digits that are hard to confuse (no 0/O, 1/I/L).
const crypto = require('crypto');
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const name = (process.argv[2] || '').trim();
if (!name || /[,:]/.test(name)) { console.error('Give a name without commas or colons, e.g. node scripts/new-key.js "Kwame Asante"'); process.exit(1); }
let key = ''; while (key.length < 8) { const b = crypto.randomBytes(1)[0]; if (b < 248) key += ALPHABET[b % 31]; }
const site = (process.argv[3] || '').replace(/\/$/, '');
console.log(`\nAccess key for ${name}:  ${key}\n`);
if (site) console.log(`One-tap link to send them:\n  ${site}/access/${key}\n`);
console.log(`Add this entry to ACCESS_TOKENS on Render (separate people with commas):\n  ${name}:${key}\n`);
