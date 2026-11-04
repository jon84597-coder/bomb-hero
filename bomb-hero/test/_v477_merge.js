// test/_v477_merge.js —— 把 _v477_tr*.json 併進 index.html 的 i18n 壓縮表
// 用法：node test/_v477_merge.js
const fs = require('fs');
const FILE = __dirname + '/../index.html';
const LANGS = ['zh-TW', 'zh-CN', 'en', 'ja', 'ko', 'th', 'vi', 'ru', 'de', 'it'];

const files = fs.readdirSync(__dirname).filter(function (f) { return /^_v477_tr\d+\.json$/.test(f); }).sort();
// 兩種寫法：
//   ① 具名 key：["tw","cn","en","ja","ko","th","vi","ru","de","it"]
//   ② 原文 key（含中文）：[cn,en,ja,ko,th,vi,ru,de,it]，tw 欄位自動等於 key
// 值可以是 null（＝這個語言先不翻，執行期會退英文）
let entries = {};       // key → 10 欄
let zz = [];
for (const f of files) {
  const j = JSON.parse(fs.readFileSync(__dirname + '/' + f, 'utf8'));
  for (const k in j) {
    if (k === '_note') continue;
    const arr = j[k];
    if (!Array.isArray(arr)) { console.error('!! ' + f + ' / ' + k + ' 不是陣列'); process.exit(1); }
    if (/[\u3400-\u9fff]/.test(k)) {
      if (arr.length > 9) { console.error('!! ' + f + ' / 原文 key 最多 9 欄：' + k.slice(0, 20)); process.exit(1); }
      while (arr.length < 9) arr.push(null);          // 不足的語言留空 → 執行期退英文
      zz.push([k, [k].concat(arr)]);
    } else {
      if (arr.length > 10) { console.error('!! ' + f + ' / ' + k + ' 最多 10 欄'); process.exit(1); }
      while (arr.length < 10) arr.push(null);
      entries[k] = arr;
    }
  }
}
console.log('來源檔', files.join(', '), '｜條目', Object.keys(entries).length);

let html = fs.readFileSync(FILE, 'utf8');
const m = /const I18N_SRC = `\n([\s\S]*?)\n`;\n\(function/.exec(html);
if (!m) { console.error('找不到 I18N_SRC'); process.exit(1); }
const body = m[1];
const rows = body.split('\n');

// 值 → 模板字串裡安全的寫法：換行寫成 \n（兩字元），反斜線翻倍（否則模板字串會把它吃掉）
const esc = function (v) {
  const R = String(v).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\r/g, '');
  return R.replace(/`/g, "'").replace(/\$\{/g, '$ {').replace(/\\/g, '\\\\');
};
const idx = {};
rows.forEach(function (r, i) {
  const k = r.slice(0, r.indexOf('|'));
  if (k) idx[k] = i;
});
let added = 0, changed = 0;
function put(k, arr) {
  if (idx[k] != null) {
    // 只補「這次有給值」的語言，null 保留原本那一欄（避免把先前翻好的語言洗掉）
    const cells = rows[idx[k]].split('|');
    while (cells.length < 11) cells.push('');
    for (let i = 0; i < 10; i++) if (arr[i] != null) cells[i + 1] = esc(arr[i]);
    const row = cells.slice(0, 11).join('|');
    if (row !== rows[idx[k]]) { rows[idx[k]] = row; changed++; }
  } else {
    const row = [k].concat(arr.map(function (v) { return v == null ? '' : esc(v); })).join('|');
    idx[k] = rows.length; rows.push(row); added++;
  }
}
for (const k in entries) put(k, entries[k]);
// 原文 key → 沿用既有的 z 編號（同原文重跑不會一直長新行）
let zNext = 1;
rows.forEach(function (r) { const m2 = /^z(\d+)\|/.exec(r); if (m2) zNext = Math.max(zNext, parseInt(m2[1], 10) + 1); });
for (const pair of zz) {
  const src = pair[0];
  let found = null;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const p1 = r.indexOf('|');
    if (p1 < 0) continue;
    const p2 = r.indexOf('|', p1 + 1);
    if (p2 < 0) continue;
    if (r.slice(p1 + 1, p2) === esc(src)) { found = r.slice(0, p1); break; }
  }
  if (found) put(found, pair[1]);
  else { put('z' + zNext, pair[1]); zNext++; }
}
const next = rows.join('\n');
if (next === body) { console.log('沒有變動'); process.exit(0); }
html = html.slice(0, m.index) + 'const I18N_SRC = `\n' + next + '\n`;\n(function' + html.slice(m.index + m[0].length);
fs.writeFileSync(FILE, html);
console.log('新增 ' + added + ' 條、覆蓋 ' + changed + ' 條；總行數 ' + rows.length);
console.log('bytes', Buffer.byteLength(html), 'chars', html.length);
