const fs = require('fs');
const html = fs.readFileSync(__dirname + '/../index.html', 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.log('no script'); process.exit(1); }
try { new Function(m[1]); console.log('syntax OK, 行數', html.split('\n').length); }
catch (e) { console.log('SYNTAX ERROR:', e.message); process.exit(1); }
