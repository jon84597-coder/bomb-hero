const fs = require('fs');
const f = 'test/verify-v493.js';
let s = fs.readFileSync(f, 'utf8');

// 版本相關斷言改成「跟著 VERSION 走」，升版不用再回頭改測試
s = s.replace(
  `ok((SRC.match(/const VERSION = '4\\.93'/) || []).length === 1, "VERSION = '4.93'");`,
  `const VERSION = (SRC.match(/const VERSION = '([0-9.]+)'/) || [])[1] || '';
function vnum(v) { return String(v).split('.').map(Number); }
function vge(a, b) { const x = vnum(a), y = vnum(b); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return true; }
ok(/const VERSION = '[0-9.]+'/.test(SRC) && vge(VERSION, '4.93'), 'VERSION >= 4.93', VERSION);`
);

s = s.replace(
  `ok(/var SW_VERSION = 'v4\\.93\\.0';/.test(s), rel + ' SW_VERSION = v4.93.0');`,
  `ok(new RegExp("var SW_VERSION = 'v" + VERSION.replace(/\\./g, '\\\\.') + "\\\\.0';").test(s), rel + ' SW_VERSION = v' + VERSION + '.0');`
);

s = s.replace(
  `ok(pkg.version === '4.93.0', 'package.json 4.93.0', pkg.version);`,
  `ok(pkg.version === VERSION + '.0', 'package.json = VERSION.0', pkg.version);`
);

s = s.replace(
  `ok(/v: '4\\.93'/.test(log), 'VERSION_LOG 有 4.93');`,
  `ok(new RegExp("v: '" + VERSION.replace(/\\./g, '\\\\.') + "'").test(log), 'VERSION_LOG 有最新版號', VERSION);`
);

s = s.replace(`console.log('\\n--- v4.93: '`, `console.log('\\n--- v4.93+: '`);

fs.writeFileSync(f, s);
console.log('patched');
