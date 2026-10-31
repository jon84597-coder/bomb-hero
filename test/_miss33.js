const { makeEnv, html } = require('./_sandbox');
const P = makeEnv().BH;
const body = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
const base = P.I18N['zh-TW'];
const vals = Object.keys(base).map(k => base[k]);
const found = [];
(body.match(/>([^<>]{1,160})</g) || []).forEach(m => {
  const t = m.slice(1, -1).trim();
  if (!t) return;
  if (!/[\u4e00-\u9fff]/.test(t)) return;
  if (found.indexOf(t) < 0) found.push(t);
});
const miss = found.filter(t => vals.indexOf(t) < 0);
console.log('total', found.length, 'miss', miss.length, 'pct', Math.round((found.length - miss.length) / found.length * 100));
miss.forEach(t => console.log('  - ' + JSON.stringify(t)));
