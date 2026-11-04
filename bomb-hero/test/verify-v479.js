// test/verify-v479.js —— v4.79 美術外部化
//   ① index.html 不再內嵌任何 base64 圖
//   ② 175 個 spr/*.webp 全部存在、檔頭合法、位元組與原始 base64 解碼一致（由 _x_report.json 對照）
//   ③ 命名不重複、可追溯（spr/_list.json 與實際檔案一致）
//   ④ 主檔大幅縮小、gzip 後 < 900KB
//   ⑤ Service Worker：CORE 有首頁 logo、有背景預熱、版本跟著升
//   ⑥ 載入守衛還在（沒載完退回程式繪製，不會破圖）
const { makeEnv } = require('./_sandbox');
const fs = require('fs'), path = require('path'), zlib = require('zlib'), crypto = require('crypto');
const env = makeEnv();
const P = env.BH;
const src = env.html;
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ FAIL: ' + m); } }
function head(t) { console.log('\n=== ' + t + ' ==='); }

// ---------- 1. 主檔不含內嵌圖 ----------
head('1. 主檔已無內嵌圖');
const inline = src.match(/data:image\/[a-z+]+;base64,/g) || [];
ok(inline.length === 0, 'index.html 內嵌 base64 圖 = ' + inline.length + '（應為 0）');
const refs = src.match(/spr\/[A-Za-z0-9_\-]+\.webp/g) || [];
ok(refs.length === 175, 'spr/ 引用 ' + refs.length + ' 處（應為 175）');
const uniq = Array.from(new Set(refs));
ok(uniq.length === uniq.length, '引用名稱可去重');
ok(uniq.length === 175, '175 個不同的貼圖檔名');

// ---------- 2. 檔案都存在且合法 ----------
head('2. 貼圖檔案');
const SPR = path.join(ROOT, 'spr');
const files = fs.readdirSync(SPR).filter(function (f) { return /\.webp$/.test(f); });
ok(files.length === 175, 'spr/ 內有 ' + files.length + ' 個 .webp');
const missing = uniq.filter(function (u) { return !fs.existsSync(path.join(ROOT, u)); });
ok(missing.length === 0, '每個引用都找得到檔案' + (missing.length ? '（缺 ' + missing.slice(0, 3) + '）' : ''));
let badMagic = 0, total = 0;
files.forEach(function (f) {
  const b = fs.readFileSync(path.join(SPR, f));
  total += b.length;
  if (b.slice(8, 12).toString() !== 'WEBP') badMagic++;
});
ok(badMagic === 0, '全部是合法 WEBP（壞檔 ' + badMagic + '）');
ok(total > 1200000 && total < 1500000, '二進位總量 ' + (total / 1048576).toFixed(2) + ' MB（原始 base64 1.79 MB）');

// ---------- 3. 位元組與原始 base64 完全一致 ----------
head('3. 抽出過程零損失');
const rep = JSON.parse(fs.readFileSync(path.join(__dirname, '_x_report.json'), 'utf8'));
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
let mismatch = 0;
rep.forEach(function (r) {
  const b = fs.readFileSync(path.join(SPR, r.name + '.webp'));
  if (b.length !== r.bytes || sha(b).slice(0, 12) !== r.sha) mismatch++;
});
ok(rep.length === 175, '對照表 175 筆');
ok(mismatch === 0, '全部位元組／雜湊與抽取當下一致（不一致 ' + mismatch + '）');

// ---------- 4. 清單與檔案一致 ----------
head('4. 預熱清單');
const list = JSON.parse(fs.readFileSync(path.join(SPR, '_list.json'), 'utf8'));
ok(Array.isArray(list) && list.length === 175, '_list.json 有 175 筆');
const notInList = files.filter(function (f) { return list.indexOf(f) < 0; });
ok(notInList.length === 0, '每個檔案都在清單裡' + (notInList.length ? '（漏 ' + notInList.slice(0, 3) + '）' : ''));
const missingFile = list.filter(function (f) { return !fs.existsSync(path.join(SPR, f)); });
ok(missingFile.length === 0, '清單沒有指向不存在的檔案');

// ---------- 5. 體積效益 ----------
head('5. 體積與 gzip');
const chars = src.length, bytes = Buffer.byteLength(src, 'utf8');
const gz = zlib.gzipSync(Buffer.from(src, 'utf8'), { level: 9 }).length;
ok(chars < 1600000, '主檔 ' + chars + ' 字元（原本 3,345,500）');
ok(gz < 900000, 'gzip 後 ' + Math.round(gz / 1024) + ' KB（原本 1.98 MB）');
ok(chars < 1800000 && bytes < 2000000, '新的容量上限 1,800,000 字元 / 2,000,000 位元組');
const crlf = (src.match(/\r/g) || []).length;
ok(crlf === 0, '整檔仍是 LF（\\r = ' + crlf + '）');

// ---------- 6. Service Worker ----------
head('6. Service Worker');
const swSrc = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
ok(/\.\/spr\/title-logo\.webp/.test(swSrc), 'CORE 預載首頁 logo');
ok(/function warmSprites\(/.test(swSrc), '有背景預熱函式 warmSprites');
ok(/warmSprites\(\)/.test(swSrc.replace(/function warmSprites\(\)/, '')), 'install 會呼叫 warmSprites');
ok(/spr\/_list\.json/.test(swSrc), '預熱讀 _list.json');
ok(/SW_VERSION = 'v4\.79\.0'/.test(swSrc), 'sw.js 版本 v4.79.0');
['../sw.js', '../../public/sw.js', '../../bomberman-online/public/sw.js'].forEach(function (p) {
  const t = fs.readFileSync(path.join(__dirname, p), 'utf8');
  ok(/SW_VERSION = 'v4\.79\.0'/.test(t), p + ' 同步');
});

// ---------- 7. 載入守衛（沒載完不會破圖） ----------
head('7. 載入守衛');
ok(/im\.onerror = function \(\) \{ ready\[k\] = false; \}/.test(src), '怪物／角色圖有 onerror 標記');
ok(/return has\(k\) \? imgs\[k\] : null;/.test(src), 'FoeArt.get 沒載完回 null');
ok(/function has\(k\) \{ return !!\(FOE_ART && FOE_ART\[k\] && ready\[k\] && imgs\[k\] && imgs\[k\]\.naturalWidth\); \}/.test(src),
  'has() 會檢查 naturalWidth（避免破圖）');
ok(/TILE_ART\[k\] \|\| \[\]/.test(src) && /im\.complete && im\.naturalWidth > 0/.test(src), '地板圖未載入時回 null（退回程序繪製）');
ok(/spr\/title-logo\.webp/.test(src), 'HTML 的 logo 直接指向 spr/');

// ---------- 8. 版本 ----------
head('8. 版本');
const V = /const VERSION = '([^']+)'/.exec(src)[1];
ok(V === '4.79', 'VERSION = ' + V);
ok(new RegExp('id="verTxt">' + V.replace(/\./g, '\\.')).test(src), '徽章文字同步 ' + V);
ok(P.VERSION_LOG[0].v === V, '版本紀錄最上面是本版 ' + V);
ok(P.VERSION_LOG[0].items.length === 3, '本版 3 條紀錄');
ok(P.VERSION_LOG[1].v === '4.78', '第二筆是 4.78');
const dl = P.I18N['zh-TW'];
['ver.4.79.1', 'ver.4.79.2', 'ver.4.79.3'].forEach(function (k) {
  ok(!!dl[k], '字典有 ' + k);
});
['en', 'ja', 'ko', 'de', 'ru', 'th', 'vi', 'it'].forEach(function (L) {
  const bad = ['ver.4.79.1', 'ver.4.79.2', 'ver.4.79.3'].filter(function (k) { return !P.I18N[L] || !P.I18N[L][k]; });
  ok(bad.length === 0, L + ' 版本紀錄 3 條都有');
});

console.log('\n' + (fail ? '❌' : '✅') + ' v4.79：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
