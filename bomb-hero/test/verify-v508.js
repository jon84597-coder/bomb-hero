// v5.8 驗證：自己的位置標示（頭上的「我」牌子 ＋ 縮小時的定位環）
//   ① 版號 5.8
//   ② meBadgeMode()：前 5 秒閃（含倒數）；五秒後只有大逃殺留著
//   ③ meTick()：換地圖／重新進場歸零，只有 play 會累加
//   ④ 縮放 42%~100%、閃爍 alpha .38~1.0
//   ⑤ 徽章真的照模式畫／收
//   ⑥ 定位環套同一套規則（前 5 秒不管縮放都看得到）
// 跑法：node test/verify-v508.js
const fs = require('fs');
const path = require('path');
const { makeEnv } = require('./_sandbox');

let pass = 0, fail = 0;
function ok(cond, msg, extra) {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ FAIL: ' + msg + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}
function head(s) { console.log('\n' + s); }

const SRC = require('./_sandbox').rawHtml;
const SW1 = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
const SW2 = fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'sw.js'), 'utf8');
const env = makeEnv();
const B = env.BH, G = env.G, rec = env.rec;

// ---------------------------------------------------------------
head('① 版號 ≥ 5.8（本版功能留下的，不寫死版號）');

// v5.9 教訓：這幾條原本寫死 '5.8'／'v5.8.0'，一升版就整支紅。
//   改成「不低於 5.8」的元組比較，且與 VERSION 自我一致。
const VT = function (s) { return String(s || '').replace(/^v/, '').split('.').map(function (n) { return parseInt(n, 10) || 0; }); };
const VGE = function (a, b) {
  const x = VT(a), y = VT(b);
  for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); }
  return true;
};
const VSTR = String(B.VERSION || '').replace(/\./g, '\\.');

ok(/^\d+\.\d+$/.test(B.VERSION) && VGE(B.VERSION, '5.8'), 'VERSION 是 x.y 且不低於 5.8（' + B.VERSION + '）');
ok(new RegExp('<span id="verTxt">' + VSTR + '<\\/span>').test(SRC), '首頁版號同步（' + B.VERSION + '）');
ok(new RegExp('<span id="verLogVer">' + VSTR + '<\\/span>').test(SRC), '版本日誌標題同步');
ok(new RegExp("var SW_VERSION = 'v" + VSTR + "\\.0';").test(SW1), 'bomb-hero/sw.js = v' + B.VERSION + '.0');
ok(new RegExp("var SW_VERSION = 'v" + VSTR + "\\.0';").test(SW2), 'public/sw.js = v' + B.VERSION + '.0');
ok(B.VERSION_LOG[0].v === B.VERSION && B.VERSION_LOG[0].now === true, '日誌最新一筆 = 當前版本且標 now');
// v5.10 教訓：不要假設「5.8 一定在第二筆」——每升一版它就被往後推一格。
//   改成「5.8 那一筆還在，而且不再是 now」＋「除了第一筆以外沒有任何 now」。
const v58 = (B.VERSION_LOG || []).filter(function (e) { return e.v === '5.8'; })[0];
ok(!!v58 && v58.now === false, '5.8 那一筆還在，且 now 已取消');
ok((B.VERSION_LOG || []).slice(1).every(function (e) { return e.now !== true; }), '只有最新一筆標 now（其餘都已取消）');
ok(B.VERSION_LOG.length >= 2 && B.VERSION_LOG[0].items.length >= 2, '本版有寫更新內容');

// ---------------------------------------------------------------
head('② meBadgeMode()：前 5 秒閃，五秒後只有大逃殺留著');

ok(B.ME_BLINK_SEC === 5, '前 5 秒（ME_BLINK_SEC = 5）');

G.mode = 'solo'; G.state = 'countdown'; G._meT = 0;
ok(B.meBadgeMode() === 'blink', '倒數階段就開始閃（那時候還不能動，正好找自己）');
G._meT = 99;
ok(B.meBadgeMode() === 'blink', '倒數階段不論過多久都還在（5 秒從 GO 起算）');

G.state = 'play';
G._meT = 0;    ok(B.meBadgeMode() === 'blink', '剛開始（0 秒）→ 閃爍');
G._meT = 4.99; ok(B.meBadgeMode() === 'blink', '4.99 秒還在閃');
G._meT = 5;    ok(B.meBadgeMode() === 'off', '滿 5 秒 → 單人收掉');

G.mode = 'battle'; ok(B.meBadgeMode() === 'off', '對戰滿 5 秒 → 收掉');
G.mode = 'rpg';    ok(B.meBadgeMode() === 'off', 'RPG 滿 5 秒 → 收掉');
G.mode = 'br';     ok(B.meBadgeMode() === 'br', '大逃殺滿 5 秒 → 繼續顯示（br）');
G._meT = 0.2;      ok(B.meBadgeMode() === 'blink', '大逃殺前 5 秒也一樣會閃');
G._meT = 600;      ok(B.meBadgeMode() === 'br', '大逃殺十分鐘後還在');

G.state = 'roundover'; G.mode = 'br'; G._meT = 9;
ok(B.meBadgeMode() === 'br', '回合結算中也還看得到（大逃殺）');
G.state = 'over';   ok(B.meBadgeMode() === 'off', '結束畫面不畫');
G.state = 'idle';   ok(B.meBadgeMode() === 'off', '大廳不畫');

// ---------------------------------------------------------------
head('③ meTick()：計時器什麼時候歸零、什麼時候累加');

G.state = 'idle'; G._meSt = 'idle'; G._meT = 0; G._meSeq = G.mapSeq;
B.meTick(0.5);
ok(G._meT === 0, '在大廳不計時');

G.state = 'play';
B.meTick(0.5);
ok(Math.abs(G._meT - 0.5) < 1e-9, '進地圖後開始累加（0.5）');
B.meTick(0.5);
ok(Math.abs(G._meT - 1) < 1e-9, '繼續累加（1.0）');

G.state = 'countdown';
B.meTick(2);
ok(Math.abs(G._meT - 1) < 1e-9, '倒數階段不累加（5 秒從 GO 起算）');

G.state = 'play';
const seq0 = G.mapSeq;
G.mapSeq = (G.mapSeq | 0) + 1;
B.meTick(0.1);
ok(Math.abs(G._meT - 0.1) < 1e-9, '換地圖（mapSeq 變）一定歸零');
ok(G._meSeq === G.mapSeq, '記住新的 mapSeq');

G.mapSeq = seq0;
G.state = 'over'; B.meTick(0.1);          // 先讓它記住 over
G._meT = 9;
G.state = 'play'; B.meTick(1);
ok(Math.abs(G._meT - 1) < 1e-9, '結算完重進地圖 → 重新算 5 秒');

ok(/meTick\(dt\);/.test(SRC) && /v5\.8：「我」標示的前 5 秒計時/.test(SRC), '主迴圈每幀呼叫 meTick()');
ok(/if \(paused\)[^\n]*return; \}\n\s*meTick\(dt\);/.test(SRC),
  'meTick 在 paused 的 early return 之後（暫停時不會偷跑）');

// ---------------------------------------------------------------
head('④ 縮放 42%~100%、閃爍 alpha .38~1.0');

let zMin = 9, zMax = -9, bMin = 9, bMax = -9;
for (let i = 0; i <= 4000; i++) {
  const t = i * 0.005;
  const z = B.meBadgeZoom(t), b = B.meBadgeBlink(t);
  if (z < zMin) zMin = z;
  if (z > zMax) zMax = z;
  if (b < bMin) bMin = b;
  if (b > bMax) bMax = b;
}
ok(Math.abs(zMin - 0.42) < 0.002, '縮放下限 = 42%（實際 ' + (zMin * 100).toFixed(1) + '%）');
ok(Math.abs(zMax - 1.00) < 0.002, '縮放上限 = 100%（實際 ' + (zMax * 100).toFixed(1) + '%）');
ok(Math.abs(bMin - 0.38) < 0.002, '閃爍最暗 = 0.38');
ok(Math.abs(bMax - 1.00) < 0.002, '閃爍最亮 = 1.00');

ok(/const zoom = br \? meBadgeZoom\(t\) : 1;/.test(SRC), '只有大逃殺做縮放（其他模式固定大小）');
ok(/const fade = \(mode === 'blink'\) \? meBadgeBlink\(t\) : 1;/.test(SRC), '只有前 5 秒做閃爍');
ok(/ctx\.scale\(zoom, zoom\)/.test(SRC), '牌子真的套用縮放');
ok(/const zx = x, zy = top \+ h \* \.62;/.test(SRC), '以牌子中心縮放（不會上下漂）');

// ---------------------------------------------------------------
head('⑤ 徽章真的照模式畫／收（真跑 drawPlayer）');

function meTexts(mode, meT) {
  B.buildMap(15, 13, B.THEMES[0], {});
  G.mode = mode; G.state = 'play'; G._meT = meT; G.gameT = 0.3;
  const p = B.makePlayer(0, 0, null, { x: 5, y: 5, px: 5.5 * G.T, py: 5.5 * G.T });
  p.alive = true; p.invuln = 0; p.ai = false; p.moving = false; p.ch = B.CHARACTERS[0];
  G.players = [p]; G.mySlot = 0;
  rec.calls.length = 0;
  B.drawPlayer(p, G.T);
  return rec.calls.filter(function (c) { return c[0] === 'fillText' && String(c[1]) === '我'; }).length;
}

['solo', 'rpg', 'battle', 'br'].forEach(function (m) {
  ok(meTexts(m, 0) > 0, m + '：前 5 秒看得到「我」');
});
['solo', 'rpg', 'battle'].forEach(function (m) {
  ok(meTexts(m, 9) === 0, m + '：五秒後收掉');
});
ok(meTexts('br', 9) > 0, 'br：五秒後還看得到');

// 直接畫：off 完全不畫、大逃殺會縮放、其他模式不會
rec.calls.length = 0;
B.drawMeBadge(100, 300, 16, 40, 200, 'off');
ok(rec.calls.length === 0, 'mode = off → 一個繪圖呼叫都不做');

G.mode = 'br'; G.gameT = Math.PI / 2.6;   // cos = -1 → 縮到 42%
rec.calls.length = 0;
B.drawMeBadge(100, 300, 16, 40, 200, 'br');
const sc = rec.calls.filter(function (c) { return c[0] === 'scale'; });
ok(sc.length === 1 && Math.abs(sc[0][1] - 0.42) < 0.01, '大逃殺牌子縮到 42%（實際 ' + (sc[0] ? sc[0][1].toFixed(2) : '—') + '）');

G.mode = 'solo';
rec.calls.length = 0;
B.drawMeBadge(100, 300, 16, 40, 200, 'blink');
ok(rec.calls.filter(function (c) { return c[0] === 'scale'; }).length === 0, '其他模式不做縮放');

// 閃爍：同一時間點比 alpha
function lastAlpha(t, mode, gameMode) {
  G.gameT = t; G.mode = gameMode || 'solo';
  rec.sets.length = 0;
  B.drawMeBadge(100, 300, 16, 40, 200, mode);
  const a = rec.sets.filter(function (s) { return s[0] === 'globalAlpha'; });
  return a.length ? a[a.length - 1][1] : null;
}
const aDark = lastAlpha(Math.PI * 1.5 / 9.4, 'blink');    // sin = -1 → 最暗
const aBright = lastAlpha(Math.PI * 0.5 / 9.4, 'blink');  // sin = +1 → 最亮
ok(aDark < 0.45, '閃爍最暗時 alpha ≈ 0.38（實際 ' + (aDark === null ? '—' : aDark.toFixed(2)) + '）');
ok(aBright > 0.98, '閃爍最亮時 alpha = 1（實際 ' + (aBright === null ? '—' : aBright.toFixed(2)) + '）');
ok(lastAlpha(1, 'br', 'br') === 1, '大逃殺五秒後不再閃（alpha 固定 1）');

// ---------------------------------------------------------------
head('⑥ 定位環套同一套規則');

G.state = 'play'; G.zoom = 1;
G.mode = 'solo'; G._meT = 0;
ok(B.selfPinAlpha() === 1, '單人前 5 秒：連 100% 都看得到');
G.mode = 'rpg'; ok(B.selfPinAlpha() === 1, 'RPG 前 5 秒也看得到');
G.mode = 'battle'; ok(B.selfPinAlpha() === 1, '對戰前 5 秒也看得到');

G.mode = 'solo'; G._meT = 9; G.zoom = 0.42;
ok(B.selfPinAlpha() === 0, '單人五秒後：縮到 42% 也不畫');
G.mode = 'battle'; ok(B.selfPinAlpha() === 0, '對戰五秒後也不畫');

G.mode = 'br'; G._meT = 9; G.zoom = 1;
ok(B.selfPinAlpha() === 0, '大逃殺五秒後 100% 還是不畫（角色本來就看得見）');
G.zoom = 0.42;
ok(B.selfPinAlpha() === 1, '大逃殺五秒後縮到 42% → 全亮（原本的規則）');
G.zoom = 0.9;
const a90 = B.selfPinAlpha();
ok(a90 > 0 && a90 < 1, '大逃殺五秒後 90% 淡入中（' + a90.toFixed(2) + '）');

ok(/const mm = meBadgeMode\(\);/.test(SRC) && /if \(mm === 'blink'\) return 1;/.test(SRC),
  '定位環用同一個 meBadgeMode()（前 5 秒直接全亮）');
ok(/const blink = \(meBadgeMode\(\) === 'blink'\) \? meBadgeBlink\(Game\.gameT \|\| 0\) : 1;/.test(SRC),
  '定位環前 5 秒會跟著閃（五秒後不閃）');
ok(/return \(v \* a \* blink\)\.toFixed\(3\);/.test(SRC), '閃爍有乘進環／箭頭／光暈的 alpha');

console.log('\n' + (fail === 0 ? '✅' : '❌') + ' v5.8：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail === 0 ? 0 : 1);
