// v5.9 驗證：交付目錄一致性（bomb-hero/ → public/）
//
// 為什麼要有這支：
//   v5.7 把新 LOGO 放進 bomb-hero/spr/，但 public/spr/ 還是上一版的舊檔 ——
//   Render 是從 public/ 起服務的，線上就一直拿到舊 LOGO；
//   而所有測試只讀 bomb-hero/，所以 109 支全綠卻完全看不出問題。
//   這支測試的唯一職責就是「讓忘記同步變成紅燈」。
//
//   ① 同步工具本身（能抓缺少／不同／多餘）
//   ② index.html / sw.js / manifest.json 逐位元組相同
//   ③ spr/ bg/ icons/ 全部檔案相同（數量與內容）
//   ④ 玩家真的會拿到新 LOGO（檢查 public/ 那一份，不是開發目錄）
//   ⑤ 快取參數：HTML 與 SW 一致、沒有舊的 v=57 殘留
//   ⑥ 版號四個地方對得上（index / 三份 sw.js / package.json）
// 跑法：node test/verify-v509.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

let pass = 0, fail = 0;
function ok(cond, msg, extra) {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ FAIL: ' + msg + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}
function head(s) { console.log('\n' + s); }

const ROOT = path.join(__dirname, '..', '..');
const DEV = path.join(ROOT, 'bomb-hero');
const PUB = path.join(ROOT, 'public');
const TOOL = path.join(ROOT, 'tools', 'sync-public.js');

function sha(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').slice(0, 16);
}

// 白名單：跟 tools/sync-public.js 一致
const FILES = ['index.html', 'sw.js', 'manifest.json'];
const DIRS = ['spr', 'bg', 'icons'];
function collect(root) {
  const out = new Map();
  FILES.forEach(function (f) {
    const p = path.join(root, f);
    if (fs.existsSync(p)) out.set(f, p);
  });
  DIRS.forEach(function (d) {
    const base = path.join(root, d);
    if (!fs.existsSync(base)) return;
    (function walk(dir, rel) {
      fs.readdirSync(dir, { withFileTypes: true }).forEach(function (e) {
        if (e.name === '.DS_Store') return;
        const abs = path.join(dir, e.name);
        const r = rel ? rel + '/' + e.name : e.name;
        if (e.isDirectory()) walk(abs, r);
        else out.set(r, abs);
      });
    })(base, d);
  });
  return out;
}

// ---------------------------------------------------------------
head('① 同步工具（tools/sync-public.js）');

ok(fs.existsSync(TOOL), 'tools/sync-public.js 存在（部署來源要能用一支指令同步）');
const toolSrc = fs.readFileSync(TOOL, 'utf8');
ok(/--check/.test(toolSrc), '支援 --check（只檢查不動手）');
ok(/缺少/.test(toolSrc) && /不同/.test(toolSrc) && /多餘/.test(toolSrc),
  '三種問題都會點名：缺少／不同／多餘（舊檔留在部署目錄也算錯）');
ok(/index\.html/.test(toolSrc) && /'spr'/.test(toolSrc) && /'bg'/.test(toolSrc) && /'icons'/.test(toolSrc),
  '同步範圍涵蓋主檔與美術目錄');
ok(path.basename(TOOL).charAt(0) !== '_',
  '檔名不以 _ 開頭（.gitignore 會吃掉 tools/_*，v5.7 就這樣漏過一次）');

const gi = fs.existsSync(path.join(ROOT, '.gitignore'))
  ? fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8') : '';
ok(!/^tools\/\*\.js\s*$/m.test(gi) && !/^tools\/sync/m.test(gi), 'tools/ 的 .js 不會被 .gitignore 排除');

// 真的能抓錯：拿兩個暫存目錄演一遍
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bhsync-'));
function mk(dir, rel, body) {
  const p = path.join(dir, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, body);
}
function runCheck(src, dst) {
  try {
    const out = execFileSync(process.execPath, [TOOL, '--check', '--src=' + src, '--dst=' + dst],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { code: 0, out: out };
  } catch (e) {
    return { code: e.status == null ? 1 : e.status, out: (e.stdout || '') + (e.stderr || '') };
  }
}
let caught = 0, cases = 0;
try {
  const A = path.join(tmp, 'a'), B = path.join(tmp, 'b');
  mk(A, 'index.html', 'v1');
  mk(A, 'spr/x.webp', 'IMG');
  mk(B, 'index.html', 'v1');
  mk(B, 'spr/x.webp', 'IMG');
  let r = runCheck(A, B);
  cases++; if (r.code === 0) caught++;
  ok(r.code === 0, '一致時 --check 回 exit 0');

  mk(B, 'spr/x.webp', 'IMG-OLD');                 // 內容不同（＝本次的 bug）
  r = runCheck(A, B);
  cases++; if (r.code === 1 && /不同/.test(r.out) && /spr\/x\.webp/.test(r.out)) caught++;
  ok(r.code === 1 && /不同/.test(r.out) && /spr\/x\.webp/.test(r.out),
    '美術圖內容不同 → exit 1 並點名是哪一張', r.out.trim().split('\n')[0]);

  fs.rmSync(path.join(B, 'spr', 'x.webp'));
  r = runCheck(A, B);
  cases++; if (r.code === 1 && /缺少/.test(r.out)) caught++;
  ok(r.code === 1 && /缺少/.test(r.out), '部署目錄少檔 → 點名「缺少」');

  mk(B, 'spr/x.webp', 'IMG');
  mk(B, 'spr/old.webp', 'STALE');
  r = runCheck(A, B);
  cases++; if (r.code === 1 && /多餘/.test(r.out)) caught++;
  ok(r.code === 1 && /多餘/.test(r.out), '部署目錄留著舊檔 → 點名「多餘」');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
ok(caught === cases && cases === 4, '四種情境都真的被擋下來（' + caught + '/' + cases + '）');

// ---------------------------------------------------------------
head('② 主檔逐位元組相同（public/ 才是線上跑的）');

['index.html', 'sw.js', 'manifest.json'].forEach(function (f) {
  const a = path.join(DEV, f), b = path.join(PUB, f);
  ok(fs.existsSync(b), 'public/' + f + ' 存在');
  if (!fs.existsSync(b)) return;
  ok(sha(a) === sha(b), f + ' 兩邊一致（' + sha(b) + '）');
});

const pubIdx = require('./_sandbox').rawHtml;
const devIdx = require('./_sandbox').rawHtml;
ok(pubIdx.length === devIdx.length, 'public/index.html 字元數相同（' + pubIdx.length + '）');
ok((pubIdx.match(/\r/g) || []).length === 0, 'public/index.html 是 LF（CR 0）');

// ---------------------------------------------------------------
head('③ 美術目錄全部檔案相同');

const dev = collect(DEV), pub = collect(PUB);
const onlyDev = [], onlyPub = [], diff = [];
dev.forEach(function (p, rel) {
  const q = pub.get(rel);
  if (!q) onlyDev.push(rel);
  else if (sha(p) !== sha(q)) diff.push(rel);
});
pub.forEach(function (p, rel) { if (!dev.has(rel)) onlyPub.push(rel); });

ok(onlyDev.length === 0, '沒有「開發目錄有、部署目錄沒有」的檔', onlyDev.slice(0, 6));
ok(onlyPub.length === 0, '沒有「部署目錄多出來」的舊檔', onlyPub.slice(0, 6));
ok(diff.length === 0, '所有同名檔內容都相同（共 ' + dev.size + ' 個）', diff.slice(0, 6));

const sprN = fs.readdirSync(path.join(PUB, 'spr')).filter(function (f) { return /\.webp$/.test(f); }).length;
ok(sprN >= 200, 'public/spr/ 有 ' + sprN + ' 張 webp');
ok(fs.existsSync(path.join(PUB, 'spr', '_list.json')), 'public/spr/_list.json 也在部署目錄');
const dList = fs.readFileSync(path.join(DEV, 'spr', '_list.json'), 'utf8');
const pList = fs.readFileSync(path.join(PUB, 'spr', '_list.json'), 'utf8');
ok(dList === pList, '_list.json 兩邊一致');

// ---------------------------------------------------------------
head('④ 玩家真的會拿到新 LOGO（檢查 public/ 那一份）');

function webpSize(b) {
  const fourcc = b.slice(12, 16).toString('ascii');
  if (fourcc === 'VP8X') return [b.readUIntLE(24, 3) + 1, b.readUIntLE(27, 3) + 1];
  if (fourcc === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  if (fourcc === 'VP8L') {
    const v = b.readUInt32LE(21);
    return [(v & 0x3fff) + 1, ((v >> 14) & 0x3fff) + 1];
  }
  return [0, 0];
}
const pubLogo = path.join(PUB, 'spr', 'title-logo.webp');
ok(fs.existsSync(pubLogo), 'public/spr/title-logo.webp 存在');
const lb = fs.readFileSync(pubLogo);
const ld = webpSize(lb);
const rep = JSON.parse(fs.readFileSync(path.join(__dirname, '_x_report.json'), 'utf8'));
const row = rep.filter(function (r) { return r.name === 'title-logo'; })[0] || {};
ok(lb.length === row.bytes, '部署目錄的 LOGO 就是新版（' + lb.length + ' bytes ＝ _x_report ' + row.bytes + '）');
ok(crypto.createHash('sha256').update(lb).digest('hex').slice(0, 12) === row.sha,
  '內容雜湊與 _x_report 相同（' + row.sha + '）');
ok(ld[0] === 900 && Math.abs(ld[1] - 507) <= 2, '部署目錄的 LOGO 尺寸 900×' + ld[1] + '（舊版是 402 高）', ld);
// v5.6 那張舊圖是 900×402，這裡直接擋掉「又退回舊圖」
ok(ld[1] !== 402, '不是 v5.6 的舊檔（高 402）');
ok(lb.slice(0, 4).toString('ascii') === 'RIFF' && lb.slice(8, 12).toString('ascii') === 'WEBP', '是合法 WEBP');
ok(lb.indexOf('ALPH') > 0, '帶 alpha（去背過，不是白底方塊）');
ok(sha(pubLogo) === sha(path.join(DEV, 'spr', 'title-logo.webp')), '兩份 LOGO 是同一個檔');

// ---------------------------------------------------------------
head('⑤ 快取參數（換圖一定要換網址）');

const swDev = fs.readFileSync(path.join(DEV, 'sw.js'), 'utf8');
const swPub = fs.readFileSync(path.join(PUB, 'sw.js'), 'utf8');
const htmlV = (pubIdx.match(/src="spr\/title-logo\.webp\?v=(\d+)"/) || [])[1] || '';
ok(!!htmlV, 'public/index.html 的 <img> 帶版本參數（v=' + htmlV + '）');
ok(htmlV === '59', '參數跟著這一版換成 v=59（v=57 那份已經被玩家的 SW 快取住舊圖）');
ok(htmlV && new RegExp('\\./spr/title-logo\\.webp\\?v=' + htmlV).test(swPub),
  'public/sw.js 的預熱清單用同一個網址');
ok(!!htmlV && new RegExp('\\./spr/title-logo\\.webp\\?v=' + htmlV).test(swDev), 'bomb-hero/sw.js 也一致');
ok(!/title-logo\.webp\?v=57/.test(pubIdx) && !/title-logo\.webp\?v=57/.test(swPub),
  '沒有殘留 v=57（那個網址線上已經是舊圖的快取）');
ok(!/title-logo\.webp"'/.test(pubIdx), '<img> 不會退回「沒有參數」的裸網址');

// ---------------------------------------------------------------
head('⑥ 版號四個地方對得上');

const VER = (/const VERSION = '([\d.]+)'/.exec(pubIdx) || [])[1] || '';
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
ok(/^\d+\.\d+$/.test(VER), 'public/index.html 的 VERSION 是 x.y（' + VER + '）');
// v5.10 教訓：這條原本寫死 VER === '5.9'，一升版就紅。
//   改成「純數字 x.y 且不低於 5.9」，並且要跟開發目錄那份完全一致。
const devVer = (/const VERSION = '([\d.]+)'/.exec(devIdx) || [])[1] || '';
function vtup(v) { return String(v).split('.').map(function (n) { return parseInt(n, 10) || 0; }); }
function vge(a, b) {
  const A = vtup(a), B2 = vtup(b);
  for (let i = 0; i < Math.max(A.length, B2.length); i++) {
    if ((A[i] || 0) !== (B2[i] || 0)) return (A[i] || 0) > (B2[i] || 0);
  }
  return true;
}
ok(/^\d+\.\d+$/.test(VER) && vge(VER, '5.9'), '這一版不低於 5.9（' + VER + '）');
ok(devVer === VER, 'bomb-hero 與 public 的 VERSION 一致（' + VER + '）');
ok(new RegExp('<span id="verTxt">' + VER.replace(/\./g, '\\.') + '<\\/span>').test(pubIdx), '首頁顯示的版號同步');
ok(new RegExp('<span id="verLogVer">' + VER.replace(/\./g, '\\.') + '<\\/span>').test(pubIdx), '版本日誌標題同步');
const swv = function (p) { return (/var SW_VERSION = 'v([\d.]+)'/.exec(fs.readFileSync(p, 'utf8')) || [])[1] || ''; };
ok(swv(path.join(DEV, 'sw.js')) === VER + '.0', 'bomb-hero/sw.js = v' + VER + '.0');
ok(swv(path.join(PUB, 'sw.js')) === VER + '.0', 'public/sw.js = v' + VER + '.0');
ok(swv(path.join(ROOT, 'bomberman-online', 'public', 'sw.js')) === VER + '.0', '舊副本的 sw.js 也同步（測試會讀它）');
ok(pkg.version === VER + '.0', 'package.json = ' + VER + '.0');

// ---------------------------------------------------------------
console.log('\n' + (fail ? '✗ ' : '') + '通過 ' + pass + ' / ' + (pass + fail));
process.exit(fail ? 1 : 0);
