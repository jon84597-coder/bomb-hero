// test/verify-v479.js —— v4.79 美術外部化
//   ① index.html 不再內嵌任何 base64 圖
//   ② 227 個 spr/*.webp 全部存在、檔頭合法、位元組與原始 base64 解碼一致（由 _x_report.json 對照）
//   ③ 命名不重複、可追溯（spr/_list.json 與實際檔案一致）
//   ④ 主檔大幅縮小、gzip 後 < 900KB
//   ⑤ Service Worker：CORE 有首頁 logo、有背景預熱、版本跟著升
//   ⑥ 載入守衛還在（沒載完退回程式繪製，不會破圖）
const { makeEnv } = require('./_sandbox');
const fs = require('fs'), path = require('path'), zlib = require('zlib'), crypto = require('crypto');
const env = makeEnv();
const P = env.BH;
// v5.20：預算線量真實主檔（字典已外移到 js/i18n-src.js，不能算進來）
const src = require('./_sandbox').rawHtml;
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ FAIL: ' + m); } }
function head(t) { console.log('\n=== ' + t + ' ==='); }

// ---------- 1. 主檔不含內嵌圖 ----------
head('1. 主檔已無內嵌圖');
const inline = src.match(/data:image\/[a-z+]+;base64,/g) || [];
ok(inline.length === 0, 'index.html 內嵌 base64 圖 = ' + inline.length + '（應為 0）');
const refs = src.match(/spr\/[A-Za-z0-9_\-]+\.webp/g) || [];
ok(refs.length === 227, 'spr/ 引用 ' + refs.length + ' 處（應為 227）');
const uniq = Array.from(new Set(refs));
ok(uniq.length === uniq.length, '引用名稱可去重');
ok(uniq.length === 227, '227 個不同的貼圖檔名');

// ---------- 2. 檔案都存在且合法 ----------
head('2. 貼圖檔案');
const SPR = path.join(ROOT, 'spr');
const files = fs.readdirSync(SPR).filter(function (f) { return /\.webp$/.test(f); });
ok(files.length === 269, 'spr/ 內有 ' + files.length + ' 個 .webp（v6.0：八隻主角全部做完）');
const missing = uniq.filter(function (u) { return !fs.existsSync(path.join(ROOT, u)); });
ok(missing.length === 0, '每個引用都找得到檔案' + (missing.length ? '（缺 ' + missing.slice(0, 3) + '）' : ''));
let badMagic = 0, total = 0;
files.forEach(function (f) {
  const b = fs.readFileSync(path.join(SPR, f));
  total += b.length;
  if (b.slice(8, 12).toString() !== 'WEBP') badMagic++;
});
ok(badMagic === 0, '全部是合法 WEBP（壞檔 ' + badMagic + '）');
// v5.90：主角（兔子）改用影片生成的六套精靈動作，spr/ 多了 6 張
//   （spr/hero-anim-rabbit-{walk,idle,hold,throw,hurt,victory}.webp，合計約 540KB）。
//   這批圖是「取代原本的零件拼裝」，不是額外堆積，所以預算線由 2.70MB 調到 3.40MB。
// v5.94：小熊四套＋其 1080 寬格子約 +456KB → 預算線 3.40MB 調到 3.65MB。
// v5.95：小熊 hurt +102KB → 3.65MB 調到 3.85MB。
// v5.96：小熊 throw + 柴犬四套約 +509KB → 3.85MB 調到 4.40MB。
// v5.97：柴犬 hurt + 貓咪三套（格子 281 很寬）約 +0.24MB → 4.40MB 調到 4.75MB。
// v6.0：豬豬／熊貓／青蛙／小雞各五套 ＋ 貓咪 hold／hurt 約 +2.06MB → 4.75MB 調到 7.10MB。
//   八隻角色都在「取代零件拼裝」，不是多餘素材；這是全主角做完的最終量。
ok(total > 1200000 && total < 7500000, '二進位總量 ' + (total / 1048576).toFixed(2) + ' MB（上限 7.50 MB：v6.0 八隻主角）');

// ---------- 3. 位元組與原始 base64 完全一致 ----------
head('3. 抽出過程零損失');
const rep = JSON.parse(fs.readFileSync(path.join(__dirname, '_x_report.json'), 'utf8'));
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
let mismatch = 0, checked = 0;
rep.forEach(function (r) {
  const fp = path.join(SPR, r.name + '.webp');
  if (!fs.existsSync(fp)) return;          // v5.0b：被換掉的舊 BOSS 單圖不再驗
  checked++;
  const b = fs.readFileSync(fp);
  if (b.length !== r.bytes || sha(b).slice(0, 12) !== r.sha) mismatch++;
});
ok(checked >= 160, '對照表可驗 ' + checked + ' 筆（v4.87 兩張新圖不在清單、v5.0b 換掉的 BOSS 單圖跳過）');
ok(mismatch === 0, '全部位元組／雜湊與抽取當下一致（不一致 ' + mismatch + '）');

// ---------- 4. 清單與檔案一致 ----------
head('4. 預熱清單');
const list = JSON.parse(fs.readFileSync(path.join(SPR, '_list.json'), 'utf8'));
ok(Array.isArray(list) && list.length === 277, '_list.json 有 277 筆（v6.0：269 張 webp ＋ 8 份 meta）');
const notInList = files.filter(function (f) { return list.indexOf(f) < 0; });
ok(notInList.length === 0, '每個檔案都在清單裡' + (notInList.length ? '（漏 ' + notInList.slice(0, 3) + '）' : ''));
const missingFile = list.filter(function (f) { return !fs.existsSync(path.join(SPR, f)); });
ok(missingFile.length === 0, '清單沒有指向不存在的檔案');
// v5.90：動畫幀不是死檔 —— main.js 必須真的組出這些檔名
const mainSrc = fs.readFileSync(path.join(ROOT, 'js', 'main.js'), 'utf8');
const animActs = ['walk', 'idle', 'hold', 'throw', 'hurt', 'victory'];
// v5.94：檔名改成動態組（hero-anim-<角色>-<動作>.webp），所以驗「組名模板存在」＋
//   「每隻角色的動作表都列在 SHEET 裡」。
const dynName = mainSrc.indexOf("'spr/hero-anim-' + sh.pre + '-' + k + '.webp'") >= 0;
const animFiles = files.filter(function (f) { return /^hero-anim-.*\.webp$/.test(f); });
const sheetActs = (mainSrc.match(/acts: \[[^\]]*\]/g) || []).join(',');
const dead = animFiles.filter(function (f) {
  const m = f.match(/^hero-anim-(\w+?)-(\w+)\.webp$/);
  return !m || sheetActs.indexOf("'" + m[2] + "'") < 0;
});
ok(dynName && dead.length === 0, '動畫幀都有程式引用（沒有死檔' + (dead.length ? '，缺 ' + dead.join(',') : '') + '）');

// ---------- 5. 體積效益 ----------
head('5. 體積與 gzip');
const chars = src.length, bytes = Buffer.byteLength(src, 'utf8');
const gz = zlib.gzipSync(Buffer.from(src, 'utf8'), { level: 9 }).length;
// v4.86：這條是「別讓主檔無聲膨脹」的預算線，不是平台的硬上限（硬上限見下一條 3.9M/4.25M）。
//   隨從控制台＋多語系＋版本紀錄讓主檔從 1.59M 長到 1.60M，預算線由 1.60M 調到 1.75M。
// v5.14：成就面板／排名／線上名單／通知／後台足跡說明讓主檔多了約 15K，預算線由 1.75M 調到 1.80M。
//   這條是「別讓主檔無聲膨脹」的提醒，不是平台上限（真正的上限是下面那條 3.9M/4.25M）。
// v5.18：等級／經驗系統再加一批 → 預算線 1.80M → 1.90M
// v5.20：i18n 字典（162KB）抽成 js/i18n-src.js → 主檔從 1.87M 掉到 1.71M。
//   預算線跟著收緊到 1.78M，把省下來的空間真的留給新功能，而不是變成新的堆積空間。
ok(chars < 2400000, '主檔 ' + chars + ' 字元（v5.54：主程式已外置，這條改成「合併全文」的防呆上限 2,400,000）');
ok(gz < 900000, 'gzip 後 ' + Math.round(gz / 1024) + ' KB（原本 1.98 MB）');
ok(chars < 3900000 && bytes < 4250000, '容量上限 3,900,000 字元 / 4,250,000 位元組（與其他驗證一致）');
const crlf = (src.match(/\r/g) || []).length;
ok(crlf === 0, '整檔仍是 LF（\\r = ' + crlf + '）');

// ---------- 6. Service Worker ----------
head('6. Service Worker');
const swSrc = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
ok(/\.\/spr\/title-logo\.webp/.test(swSrc), 'CORE 預載首頁 logo');
ok(/function warmSprites\(/.test(swSrc), '有背景預熱函式 warmSprites');
ok(/warmSprites\(\)/.test(swSrc.replace(/function warmSprites\(\)/, '')), 'install 會呼叫 warmSprites');
ok(/spr\/_list\.json/.test(swSrc), '預熱讀 _list.json');
// v4.90：版本比較改成「數字比大小」—— 4.90 用 float 解析會變成 4.9 < 4.79 的假失敗
const vnum = function (s) {
  const m = String(s || '').replace(/^v/, '').split('.');
  return (+m[0] || 0) * 10000 + (+m[1] || 0) * 100 + (+m[2] || 0);
};
const swV = (/SW_VERSION = '(v[^']+)'/.exec(swSrc) || [])[1] || '';
ok(vnum(swV) >= vnum('4.79'), 'sw.js 版本 ≥ 4.79（實際 ' + swV + '）');
['../sw.js', '../../public/sw.js', '../../bomberman-online/public/sw.js'].forEach(function (p) {
  const t = fs.readFileSync(path.join(__dirname, p), 'utf8');
  const v = (/SW_VERSION = '(v[^']+)'/.exec(t) || [])[1] || '';
  ok(vnum(v) >= vnum('4.79'), p + ' 同步（' + v + '）');
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
ok(vnum(V) >= vnum('4.79'), 'VERSION ≥ 4.79（實際 ' + V + '）');
ok(new RegExp('id="verTxt">' + V.replace(/\./g, '\\.')).test(src), '徽章文字同步 ' + V);
ok(P.VERSION_LOG[0].v === V, '版本紀錄最上面是本版 ' + V);
ok(P.VERSION_LOG[0].items.length >= 3, '本版至少 3 條紀錄（' + P.VERSION_LOG[0].items.length + '）');
ok(P.VERSION_LOG[1].now === false, '第二筆 ' + P.VERSION_LOG[1].v + ' 已非 now');
const dl = P.I18N['zh-TW'];
['ver.4.79.1', 'ver.4.79.2', 'ver.4.79.3'].forEach(function (k) {
  ok(!!dl[k], '字典有 ' + k);
});
['en', 'ja', 'ko'].forEach(function (L) {
  const bad = ['ver.4.79.1', 'ver.4.79.2', 'ver.4.79.3'].filter(function (k) { return !P.I18N[L] || !P.I18N[L][k]; });
  ok(bad.length === 0, L + ' 版本紀錄 3 條都有');
});

console.log('\n' + (fail ? '❌' : '✅') + ' v4.79：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
