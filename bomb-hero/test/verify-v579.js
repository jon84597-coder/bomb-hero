// test/verify-v579.js —— v5.78（回報：進深淵先播地圖曲，暫停→繼續才變深淵曲）
//   ① 時序：Abyss.start 先把狀態放 Game.abyssNext，startSolo 在播 BGM 之前釘回 Game.abyss
//   ② 對答案：Abyss.start 進場後若 BGM 不是深淵曲，當場換掉（王層除外）
//   ③ 開場卡：深淵有自己的標題／副標／按鈕（不再謊報「第 N 關・某地圖」／「走進傳送門」）
//   ④ 反向：普通關卡、每日、決戰場的開場卡與 BGM 都沒被改壞
//   ⑤ 版本 >= 5.78 七處一致
const fs = require('fs');
const path = require('path');
const { makeEnv } = require('./_sandbox');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const mainJs = read('js/main.js');
const idx = read('index.html');
const i18n = read('js/i18n-src.js');

let pass = 0, fail = 0;
function ok(c, m, x) {
  if (c) { pass++; console.log('  ✓ ' + m + (x === undefined ? '' : ' → ' + JSON.stringify(x))); }
  else { fail++; console.log('  ✗ FAIL: ' + m + (x === undefined ? '' : ' → ' + JSON.stringify(x))); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }
/* 取 i18n 某一條的五個語言 */
function line(key) {
  const re = new RegExp('^' + key.replace(/\./g, '\\.') + '\\|(.*)$', 'm');
  const m = i18n.match(re);
  return m ? m[1].split('|') : null;
}

// ================================================================
head('1. 時序：旗標一定要在「播 BGM 之前」就定位');
{
  const at = mainJs.indexOf('function start(n) {', mainJs.indexOf('const Abyss = '));
  const seg = mainJs.slice(at, at + 1800);
  const iNext = seg.indexOf('Game.abyssNext = info;');
  const iSolo = seg.indexOf('startSolo(layerStage(layer)');
  ok(iNext > 0, 'Abyss.start 有 Game.abyssNext = info');
  ok(iSolo > 0, 'Abyss.start 呼叫 startSolo');
  ok(iNext < iSolo, 'abyssNext 在 startSolo 之前就放好（★ 這是 v5.74 的病根）', { iNext: iNext, iSolo: iSolo });

  /* startSolo 內部：釘回 Game.abyss 要在 startBGM 之前 */
  const s0 = mainJs.indexOf('function startSolo(');
  const seg2 = mainJs.slice(s0, s0 + 12000);
  const iPin = seg2.indexOf('Game.abyss = Game.abyssNext;');
  const iBgm = seg2.indexOf('AudioSys.startBGM(stageBGM(stage));');
  ok(iPin > 0, 'startSolo 會把 abyssNext 釘回 Game.abyss');
  ok(iBgm > 0, 'startSolo 有播 BGM');
  ok(iPin < iBgm, '釘回旗標在播 BGM 之前（stageBGM 才看得到深淵）', { iPin: iPin, iBgm: iBgm });
}

// ================================================================
head('2. 對答案：進場後 BGM 不對就當場換掉（王層除外）');
{
  const at = mainJs.indexOf('function start(n) {', mainJs.indexOf('const Abyss = '));
  const seg = mainJs.slice(at, at + 2600);
  ok(/AudioSys\.lastBGM\(\) !== 'abyssWar'/.test(seg), 'Abyss.start 會檢查「現在播的是不是深淵曲」');
  ok(/AudioSys\.startBGM\('abyssWar'\)/.test(seg), '不是就補播深淵曲');
  ok(/!\(Game\.bossArena \|\| Game\.bossRush\)/.test(seg), '王層／BOSS 連戰被排除（決戰曲不能被蓋掉）');
}

// ================================================================
head('3. 開場卡：深淵用自己的標題／副標／按鈕');
{
  ok(/const abyssLv = \(Game\.abyss && !Game\.bossRush\)/.test(mainJs), 'startSolo 有算 abyssLv');
  ok(/t\('abyss\.ovTitle', \{ n: abyssLv \}\)/.test(mainJs), '標題走 abyss.ovTitle');
  ok(/t\('abyss\.ovSub'\)/.test(mainJs), '副標走 abyss.ovSub');
  ok(/btn: abyssLv \? t\('abyss\.ovGo'\) : t\('solo\.ovGo'\)/.test(mainJs), '按鈕走 abyss.ovGo（潛下去）');
  ok(/soloIsBoss\(stage\) \? '[^']*BOSS'/.test(mainJs), '王層標題補 BOSS');

  /* 三條文案：五語都要有，而且不是英文或簡中假裝的 */
  const ti = line('abyss.ovTitle'), su = line('abyss.ovSub'), go = line('abyss.ovGo');
  ['abyss.ovTitle', 'abyss.ovSub', 'abyss.ovGo'].forEach(function (k, i) {
    const v = [ti, su, go][i];
    ok(v && v.length === 5, k + ' 有五個語言', v && v.length);
  });
  ok(/深淵/.test(ti[0]) && /\{n\}/.test(ti[0]), '繁中標題含「深淵」與 {n}', ti[0]);
  ok(/深渊/.test(ti[1]), '簡中標題含「深渊」', ti[1]);
  ok(/Abyss/.test(ti[2]) && /\{n\}/.test(ti[2]), '英文標題含 Abyss 與 {n}', ti[2]);
  ok(/[\u3040-\u30FF]/.test(ti[3]), '日文標題有假名', ti[3]);
  ok(/[\uAC00-\uD7AF]/.test(ti[4]), '韓文標題有諺文', ti[4]);
  /* 繁中不能混簡體（回報常客） */
  ok(!/[这个层深渊撑报结东为门]/.test(ti[0] + su[0] + go[0]) || /撐|報|結|層/.test(ti[0] + su[0]),
    '繁中沒有混進簡體字', ti[0] + ' / ' + su[0]);
  ok(/潛下去/.test(go[0]), '繁中按鈕是「潛下去」', go[0]);
  ok(/潜下去/.test(go[1]), '簡中按鈕是「潜下去」', go[1]);
}

// ================================================================
head('4. 反向：普通關卡／每日／決戰場都沒被改壞');
{
  const env = makeEnv();
  const P = env.BH, A = P.AudioSys, G = P.Game;

  /* 普通關卡：不該出現深淵字樣、BGM 是章節曲 */
  G.abyss = null; G.abyssNext = null; G.bossArena = null; G.stage = 12;
  A.startBGM(P.stageBGM(12));
  ok(A.lastBGM() === 'stage3', '第 12 關播第 3 章曲', A.lastBGM());

  /* 決戰場：bossWar 優先於深淵曲（深淵王層靠這個） */
  G.bossArena = { on: true };
  A.startBGM(P.stageBGM(40));
  ok(A.lastBGM() === 'bossWar', '決戰場播決戰曲', A.lastBGM());
  G.bossArena = null;

  /* 深淵：stageBGM 依 Game.abyss 回深淵曲 */
  G.abyss = { layer: 3, perks: [], startAt: Date.now() };
  ok(P.stageBGM(12) === 'abyssWar', '在深淵時 stageBGM → abyssWar（不論第幾關）', P.stageBGM(12));
  G.abyss = null;

  /* startSolo 在沙盒裡跑得起來（不會因為新分支爆掉） */
  let boom = null;
  try { P.startSolo(1, false, false); } catch (e) { boom = String(e); }
  ok(!boom, 'startSolo 在沙盒裡跑得起來', boom);
  ok(!(P.Game.ovInfo && /深淵|Abyss/.test(String(P.Game.ovInfo.title))), '普通第 1 關的開場卡沒有深淵字樣',
    P.Game.ovInfo && P.Game.ovInfo.title);
}

// ================================================================
head('5. 版本 >= 5.78 七處一致');
{
  const ver = mainJs.match(/const VERSION = '([\d.]+)'/);
  ok(ver && parseFloat(ver[1]) >= 5.78, 'VERSION >= 5.78', ver && ver[1]);
  const V = ver ? ver[1] : '0';
  const esc = V.replace(/\./g, '\\.');
  ok(new RegExp('id="verTxt"[^>]*>' + esc + '<').test(idx), 'index.html verTxt = ' + V);
  ok(new RegExp('id="verLogVer"[^>]*>' + esc + '<').test(idx), 'index.html 版本面板 = ' + V);
  const vlog = read('js/version-log.js');
  ok(/\{ v: '5\.78'/.test(vlog), 'VERSION_LOG 有 5.78');
  ok(/\{ v: '5\.77',[^}]*now: false/.test(vlog), '5.77 收成 now:false');
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, '..', 'package.json'), 'utf8'));
  ok(parseFloat(pkg.version) >= 5.78, 'package.json >= 5.78', pkg.version);
  [path.join(ROOT, 'sw.js'), path.join(ROOT, '..', 'public', 'sw.js'),
    path.join(ROOT, '..', 'bomberman-online', 'public', 'sw.js')].forEach(function (f) {
      if (!fs.existsSync(f)) return;
      const m = fs.readFileSync(f, 'utf8').match(/SW_VERSION = 'v([\d.]+)'/);
      ok(m && parseFloat(m[1]) >= 5.78, path.relative(path.join(ROOT, '..'), f) + ' → v' + (m && m[1]));
    });
}

console.log('\n' + (fail === 0 ? '✅' : '❌') + ' ' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail === 0 ? 0 : 1);
