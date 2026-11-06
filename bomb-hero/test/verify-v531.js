// verify-v531.js — v5.31：灑水式淚水 ／ 表情頭像放大＋停留更久
//   ① 眼淚改成「從兩眼外側往外灑」：多顆水珠、扇形散開、有相位循環（不是固定水柱）
//   ② 實際繪製：水珠會超出臉的左右邊界（大範圍），而且數量足夠形成「一直灑」的感覺
//   ③ 情緒頭像放大 34%（H*.16 → H*.215）並往上挪
//   ④ 表情停留時間：cry 3.8 秒、gloat 3.0 秒、歡呼 2.6 秒
const fs = require('fs');
const path = require('path');
const { makeEnv } = require('./_sandbox');

const env = makeEnv();
const P = env.BH, G = P.Game, rec = env.rec;
const src = env.html.replace(/\r/g, '');
const mk = () => env.mkCtx2D();

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }
function clearRec() { rec.calls.length = 0; rec.sets.length = 0; }

// ================================================================
head('1. 眼淚原始碼：灑水式（多顆水珠＋扇形＋循環相位）');
{
  ok(/v5\.31：灑水式淚水/.test(src), '有標註灑水式淚水');
  ok(/for \(let q2 = 0; q2 < 8; q2\+\+\)/.test(src), '每一側 8 顆水珠輪流往外飛');
  ok(/const ph = \(t \* \.95 \+ q2 \/ 8 \+/.test(src), '水珠有相位 → 一直往外灑（不是靜止）');
  ok(/const spread = \.52 \+ \(q2 % 3\) \* \.21/.test(src), '每顆張角不同 → 扇形散開');
  ok(/const dx = dir \* hw \* \(\.14 \+ \.78 \* ph\) \* spread/.test(src), '橫向位移隨相位往外推');
  ok(/Math\.sin\(t \* 6 \+ q2 \* 1\.7\) \* hw \* \.055 \* ph/.test(src), '飛出去的過程會左右飄（灑水感）');
  ok(/rgba\(160,215,255/.test(src), '有三道往外拋的水痕（細弧線，不是實心扇形）');
  ok(!/const drop = \(t \* 1\.5/.test(src), '舊的「一顆往下掉的水珠」已移除');
  ok(!/const top = ey \+ er \* 1\.15;/.test(src), '舊的兩條固定淚柱已移除');
}

// ================================================================
head('2. 實際畫一次：水珠分佈往兩側散開');
{
  clearRec();
  P.drawFaceExpr(mk(), 'cry', 100, 100, 40, 40, 1.2, '#fff');
  const ell = rec.calls.filter(function (c) { return c[0] === 'ellipse'; });
  ok(ell.length >= 16, '兩側各 8 顆水珠（實際 ellipse ' + ell.length + ' 次）');
  const xs = ell.map(function (c) { return c[1]; });
  const minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
  ok(minX < 100, '水珠飛到臉的左外側（最小 x=' + minX.toFixed(1) + '，臉框 100~140）');
  ok(maxX > 140, '水珠飛到臉的右外側（最大 x=' + maxX.toFixed(1) + '）');
  const blobs = rec.sets.filter(function (s) { return s[0] === 'fillStyle' && String(s[1]).indexOf('rgba(178,226,255') === 0; });
  ok(blobs.length >= 4, '不只一顆水珠（藍白水珠填色 ' + blobs.length + ' 次）');
  const glint = rec.sets.filter(function (s) { return s[0] === 'fillStyle' && String(s[1]).indexOf('rgba(242,251,255') === 0; });
  ok(glint.length >= 2, '水珠有高光（遠看會閃）');
  // 大嘴與八字眉還在
  const mouth = rec.sets.filter(function (s) { return s[0] === 'fillStyle' && s[1] === '#6d2130'; });
  ok(mouth.length >= 1, '哇哇大哭的大嘴仍在');
}

// ================================================================
head('3. 情緒頭像放大並往上挪');
{
  ok(/heroEmoteIcon\(g, mood, hbx \+ hbw \* \.5, hby - H \* \.135, H \* \.215, a\.idle \|\| 0, 1\)/.test(src),
     '頭像半徑 H*.215（原 H*.16，放大 34%）');
  ok(/v5\.31：情緒頭像放大 34%/.test(src), '有標註放大原因');
  ok(!/hby - H \* \.10, H \* \.16,/.test(src), '舊的小尺寸已移除');
}

// ================================================================
head('4. 表情停留更久');
{
  // 玩家被炸倒 → 大哭 3.8 秒
  P.settings.soloDiff = 'normal';
  P.settings.ctrl = 'kb';
  P.startSolo(1, false);
  G.state = 'play';
  G.enemies.length = 0;
  const p = G.players[0];
  p.invuln = 0; p.sHpMax = 1; p.sHp = 1;
  P.killPlayer(p, false, null);
  ok(p.cry === 3.8, '倒下大哭 3.8 秒（原本 2.8）');
  ok(p.cry >= 2, '哭臉停留超過 2 秒');
  // 炸到人 → 奸笑 3.0 秒
  const k = { alive: true, chIdx: 1, gloat: 0, x: 5 * G.T, y: 5 * G.T, r: 14 };
  const p2 = P.makePlayer(0, 0, null, { px: 120, py: 120 });
  p2.sHpMax = 1; p2.sHp = 1; p2.invuln = 0; p2.alive = true;
  G.players = [p2];
  P.killPlayer(p2, false, k);
  ok(k.gloat === 3.0, '兇手奸笑 3.0 秒（原本 2.2）');
  // 歡呼 2.6 秒
  ok(/cheerT = 2\.6/.test(src), '獲勝歡呼 2.6 秒（原本 1.8）');
  ok(!/cheerT = 1\.8/.test(src) && !/p\.cry = 2\.8/.test(src) && !/gloat = 2\.2/.test(src), '舊的秒數已清乾淨');
}

// ================================================================
head('5. 版本');
{
  const vm = src.match(/const VERSION = '([\d.]+)'/);
  const v = vm ? vm[1].split('.').map(Number) : [0, 0];
  ok(v[0] > 5 || (v[0] === 5 && v[1] >= 31), '主檔版號 ≥ 5.31（目前 ' + (vm && vm[1]) + '）');
  ok(/v: '5\.31'/.test(src), 'VERSION_LOG 有 5.31 條目');
  const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  ok(/var SW_VERSION = 'v5\.31\.\d+'/.test(sw), 'sw.js 是 v5.31.x');
}

console.log('\n' + (fail === 0 ? '✅' : '❌') + ' v5.31：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
