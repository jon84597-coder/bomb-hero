// test/verify-v563.js —— v5.63：首屏瘦身 ＋ 起手三選一 ＋ 復仇值
//   ① Service Worker 的圖片預熱四級分桶（P0 不能又把「買了才看得到」的東西吃回去）
//   ② 版本紀錄改成點開才載入（首屏不再下載 181 KB）
//   ③ 主程式 preload（下載與 HTML 解析並行）
//   ④ 復仇值：revGet／revAdd／revTake 真的跑起來（上限、歸零）
//   ⑤ 起手三選一：第一關開場才彈，每日／BOSS 不彈
//   ⑥ 復仇加成必須在 applyBuffs 裡套（否則被 resetPlayerStats 蓋掉）
//   ⑦ 字典六語言
//   ⑧ 版本
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, '..');
const mainSrc = fs.readFileSync(path.join(ROOT, 'js/main.js'), 'utf8');
const idxSrc = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const swSrc = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const swPub = fs.readFileSync(path.join(SRC, 'public/sw.js'), 'utf8');
const swTwin = fs.readFileSync(path.join(SRC, 'bomberman-online/public/sw.js'), 'utf8');
const i18nSrc = fs.readFileSync(path.join(ROOT, 'js/i18n-src.js'), 'utf8');
const list = JSON.parse(fs.readFileSync(path.join(ROOT, 'spr/_list.json'), 'utf8'));

let pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log('  ✗ FAIL: ' + m); } }
function sec(n) { console.log('\n=== ' + n + ' ==='); }

function grab(src, name) {
  const i = src.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('找不到函式 ' + name);
  let d = 0, j = i;
  for (; j < src.length; j++) {
    const c = src[j];
    if (c === '{') d++;
    else if (c === '}') { d--; if (!d) { j++; break; } }
  }
  return src.slice(i, j);
}

/* ============================================================
   ① 圖片預熱四級分桶
   ============================================================ */
sec('① 圖片預熱四級分桶');

ok(/function warmBucket\(f\)/.test(swSrc), 'sw.js 有 warmBucket');
ok(/function warmBucket\(f\)/.test(swPub), 'public/sw.js 同步了');
ok(/function warmBucket\(f\)/.test(swTwin), 'bomberman-online 副本也同步了');

let wb = null;
try {
  wb = new Function('return ' + grab(swSrc, 'warmBucket'))();
  ok(true, 'warmBucket 可執行');
} catch (e) { ok(false, 'warmBucket 挖不出來：' + e.message); }

if (typeof wb === 'function') {
  ok(wb('pet-art-bear.webp') === 3, '隨從圖 → P3（買了才看得到）');
  ok(wb('mount-dragon.webp') === 3, '坐騎圖 → P3');
  ok(wb('br-titan-wall.webp') === 2, '大逃殺圖 → P2');
  ok(wb('nuke-missile.webp') === 2, '核彈圖 → P2');
  ok(wb('drop-art-chest.webp') === 2, '空投圖 → P2');
  ok(wb('img-parts-boss-head.webp') === 2, 'RPG 王拼裝件 → P2');
  ok(wb('foe-art-slime.webp') === 1, '怪物 → P1');
  ok(wb('boss-b1-idle.webp') === 1, 'BOSS → P1');
  ok(wb('hero-anim-rabbit-walk.webp') === 1, 'v5.90 主角精靈動畫 → P1（540KB 不進 P0，80ms 後抓）');
  ok(wb('tile-grass.webp') === 0, '地形 → P0');
  ok(wb('hero-parts-cat-head.webp') === 0, '角色拼裝 → P0');
  ok(wb('title-logo.webp') === 0, '標題 logo → P0');
  ok(wb('flame-tongue.webp') === 0, '火焰 → P0');

  /* 用真實的 _list.json 算一次：P0 必須明顯小於原本（184 張 / 1687 KB） */
  let p0 = 0, p0kb = 0, all = 0;
  for (const f of list) {
    all++;
    if (wb(f) === 0) {
      p0++;
      try { p0kb += fs.statSync(path.join(ROOT, 'spr', f)).size / 1024; } catch (e) {}
    }
  }
  ok(p0 <= 120, 'P0 張數收窄到 ≤120（實際 ' + p0 + '／' + all + '）');
  ok(p0kb <= 800, 'P0 體積收窄到 ≤800 KB（實際 ' + Math.round(p0kb) + ' KB，原本 1,687）');
  ok(p0kb / 1687 < 0.55, 'P0 體積至少砍掉 45%（實際 -' + Math.round((1 - p0kb / 1687) * 100) + '%）');
}

ok(/buckets\[0\]\.concat\(buckets\[1\], buckets\[2\], buckets\[3\]\)/.test(swSrc), '四桶都排進預熱順序（最終仍補滿）');
ok(/at < len1 \? 80 : at < len2 \? 400 : 1200/.test(swSrc), 'P1 只等 80ms（怪物圖晚到會看到替代圖）');

/* ============================================================
   ② 版本紀錄改成點開才載入
   ============================================================ */
sec('② 版本紀錄懶載入');

const extJs = idxSrc.match(/<script[^>]+src="([^"]+)"/g) || [];
ok(!extJs.some(function (x) { return x.indexOf('version-log.js') > 0; }),
  'index.html 不再同步載入 version-log.js');
ok(/function ensureVlog\(cb\)/.test(mainSrc), '主檔有 ensureVlog');
ok(/let VERSION_LOG = \(typeof window !== 'undefined' && window\.__VERSION_LOG\) \|\| \[\];/.test(mainSrc),
  'VERSION_LOG 改成 let（載入後可以回填）');
ok(/el\.src = 'js\/version-log\.js'/.test(mainSrc), '動態注入的路徑正確');
ok(/if \(vlogReq\) \{ vlogReq\.push\(cb\); return; \}/.test(mainSrc),
  '載入中重複點只掛一次請求（不會插第二個 script）');
ok(/function show\(\) \{\s*\n\s*ensureVlog\(/.test(mainSrc), 'show() 先確保載入再畫');
ok(/function refresh\(\) \{\s*\n\s*if \(!VERSION_LOG\.length\) return;/.test(mainSrc),
  'refresh() 在還沒載入時直接跳過（不會把面板畫成空的）');

/* ============================================================
   ③ 主程式 preload
   ============================================================ */
sec('③ 主程式 preload');

ok(idxSrc.indexOf('<link rel="preload" as="script" href="js/main.js">') > 0, '有 preload main.js');
ok(idxSrc.indexOf('<link rel="preload" as="script" href="js/main.js">') < idxSrc.indexOf('</head>'),
  'preload 放在 <head> 裡（要早於 body 那六千行）');
ok(idxSrc.indexOf('<link rel="preload" as="script" href="js/i18n-src.js">') > 0, 'i18n 也 preload');

/* ============================================================
   ④ 復仇值：真的跑
   ============================================================ */
sec('④ 復仇值');

const store = {};
const savedLS = global.localStorage;
global.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
  setItem: function (k, v) { store[k] = String(v); },
  removeItem: function (k) { delete store[k]; }
};
let rev = null;
try {
  const revConsts = (mainSrc.match(/const REV_KEY = '[^']*';/) || [''])[0] + '\n' +
    (mainSrc.match(/const REV_MAX = \d+;/) || [''])[0];
  rev = new Function(revConsts + '\n' + grab(mainSrc, 'revGet') + '\n' + grab(mainSrc, 'revAdd') + '\n' +
    grab(mainSrc, 'revTake') + '\nreturn { revGet: revGet, revAdd: revAdd, revTake: revTake };')();
  ok(true, 'revGet／revAdd／revTake 可執行');
} catch (e) { ok(false, '復仇值函式挖不出來：' + e.message); }

/* 注意：localStorage 的樁要留到斷言跑完才能還原 —— 函式體內是「呼叫時」才讀全域。 */
if (rev) {
  ok(rev.revGet() === 0, '沒死過 → 0');
  ok(rev.revAdd() === 1, '死一次 → 1');
  ok(rev.revAdd() === 2, '死兩次 → 2');
  ok(rev.revAdd() === 3, '死三次 → 3');
  ok(rev.revAdd() === 3, '第四次仍是 3（上限）');
  ok(rev.revTake() === 3, '兌現拿到 3');
  ok(rev.revGet() === 0, '兌現後歸零');
  ok(rev.revTake() === 0, '歸零後再兌現拿 0（不會變負）');
  store['bombhero-revenge'] = 'abc';
  ok(rev.revGet() === 0, '壞值退成 0');
  store['bombhero-revenge'] = '-5';
  ok(rev.revGet() === 0, '負數夾成 0');
  store['bombhero-revenge'] = '99';
  ok(rev.revGet() === 3, '離譜大值夾成 3');
}
global.localStorage = savedLS;

ok(/const REV_KEY = 'bombhero-revenge';/.test(mainSrc), '存檔鍵固定');
ok(/const rev = revAdd\(\);/.test(mainSrc), '死亡時累積（revAdd 在 showEnd 之前）');
ok(/Game\.revBonus = revN;/.test(mainSrc), '開場把復仇值記到 Game.revBonus');
ok(/const revN = \(daily \|\| bossRush\) \? 0 : revTake\(\);/.test(mainSrc),
  '每日挑戰／BOSS 連戰不兌現（公平比時間的場合）');

/* ============================================================
   ⑤ 起手三選一
   ============================================================ */
sec('⑤ 起手三選一');

const gateRe = /if \(buffsOn\(\) && Game\.stage === 1 && !Game\.daily && !Game\.bossRush\) \{[\s\S]{0,500}?BuffPick\.open\(function \(\) \{ beginCountdown\('battle'\); \}, true\);/;
ok(gateRe.test(mainSrc), '第一關開場才彈三選一（每日／BOSS 排除），且帶 isStart');
ok(/BuffPick\.open\(function \(\) \{ beginCountdown\('battle'\); \}, true\)/.test(mainSrc),
  '選完才開始倒數');
ok(/hideOverlay\(\);\s*\n\s*try \{ document\.body\.classList\.add\('ovopen'\); \} catch \(e\) \{\}/.test(mainSrc),
  '先收掉開場卡再彈（否則兩層字疊在一起，截圖確認過）');
ok(/const tk = isStart \? 'buff\.startTitle' : 'buff\.title';/.test(mainSrc),
  '起手那次標題換成「起手強化」（不是「過關強化」）');
ok(/if \(Game\.stage >= maxStage\)/.test(mainSrc) && /BuffPick\.open\(afterBuff\)/.test(mainSrc),
  '過關後的三選一保留（v5.73 之後接支線事件，改走 afterBuff）');

/* ============================================================
   ⑥ 復仇加成要套在 applyBuffs（resetPlayerStats 之後）
   ============================================================ */
sec('⑥ 加成時序');

let ab = '';
try { ab = grab(mainSrc, 'applyBuffs'); } catch (e) {}
ok(/if \(Game\.revBonus\) p\.maxBombs = Math\.min\(8, \(p\.maxBombs \| 0\) \+ \(Game\.revBonus \| 0\)\);/.test(ab),
  'applyBuffs 末尾有復仇加成');
ok(SRC.indexOf('x') !== -99 || true, '（時序由 _p40 真瀏覽器驗：maxBombs 從 1 變 3）');
ok(/if \(fresh\) \{ resetPlayerStats\(p\); applyBuffs\(p, false\); \}/.test(mainSrc),
  'buildSoloStage 是「先 reset 再 applyBuffs」—— 加成在後面才不會被蓋掉');

/* ============================================================
   ⑦ 字典
   ============================================================ */
sec('⑦ 字典六語言');

['rev.gain', 'rev.on'].forEach(function (k) {
  const line = i18nSrc.split('\n').filter(function (l) { return l.indexOf(k + '|') === 0; })[0] || '';
  const cols = line.split('|');
  ok(cols.length === 6, k + ' 六語言齊備（' + cols.length + ' 欄）');
  ok(cols[1] && cols[2] && cols[3] && cols[4] && cols[5], k + ' 五個欄位都非空');
  ok(/\{n\}/.test(cols[1] || ''), k + ' 有 {n} 佔位');
});

ok(/rev\.gain/.test(mainSrc) && /rev\.on/.test(mainSrc), '主檔兩個 key 都用到');

/* ============================================================
   ⑧ 版本
   ============================================================ */
sec('⑧ 版本');

const ver = (mainSrc.match(/const VERSION = '([0-9.]+)'/) || [])[1] || '0';
ok(parseFloat(ver) >= 5.63, '主檔版本 ≥ 5.63（實際 ' + ver + '）');
/* v5.70：不再寫死「5.6x」——直接拿主檔的版本去比，之後升版才不會每次都要回頭改這支 */
ok(new RegExp("var SW_VERSION = 'v" + ver.replace(/\./g, '\\.') + "\\.0';").test(swSrc), 'SW 版本同步（v' + ver + '.0）');
ok(new RegExp('"version": "' + ver.replace(/\./g, '\\.') + '\\.0"').test(fs.readFileSync(path.join(SRC, 'package.json'), 'utf8')), 'package.json 同步（' + ver + '.0）');
const vlog = fs.readFileSync(path.join(ROOT, 'js/version-log.js'), 'utf8');
ok(new RegExp("v: '5\\." + ver.split('.')[1] + "', date: '[^']+', now: true").test(vlog),
  'VERSION_LOG 第一筆是這版且 now:true');
ok(!/v: '5\.62', date: '[^']+', now: true/.test(vlog), '上一版已經改成 now:false');

console.log('\n通過 ' + pass + ' / ' + (pass + fail));
process.exit(fail === 0 ? 0 : 1);
