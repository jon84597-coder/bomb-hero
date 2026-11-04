const fs = require('fs');
const s = fs.readFileSync('bomb-hero/index.html', 'utf8');

// 只在 <style> 區塊裡找 class 選擇器，避免誤抓 .addEventListener / .addGold
const cssStart = s.indexOf('<style>');
const cssEnd = s.indexOf('</style>');
const css = s.slice(cssStart, cssEnd);

const cls = new Set();
let m;
const reCls = /\.(ad[a-z][A-Za-z0-9_-]*)/g;
while ((m = reCls.exec(css))) cls.add(m[1]);

const ids = new Set();
const reId = /\$id\('(ad[A-Za-z0-9_]+)'\)/g;
while ((m = reId.exec(s))) ids.add(m[1]);
const reAttr = /id="(ad[A-Za-z0-9_]+)"/g;
while ((m = reAttr.exec(s))) ids.add(m[1]);

const count = (t) => (s.split(t).length - 1);

console.log('=== CSS classes (' + cls.size + ') ===');
[...cls].sort().forEach(t => console.log('  .' + t, ' 出現', count('.' + t), '次'));
console.log('=== ids (' + ids.size + ') ===');
[...ids].sort().forEach(t => console.log('  ' + t, ' 出現', count(t), '次'));
