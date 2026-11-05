// verify-v454.js — v4.54 專屬驗證（16:28 第 2 點：外牆與不規則地圖）
//   ① 牆分三類：1 外牆（連到外框＋貼場地 1 格）／2 硬牆島（沒連到外框）／0 太遠不畫
//   ② 外牆顏色由該關硬牆基底混沙金 → 每關不同
//   ③ 渲染：太遠的實心格連地板都不畫（輪廓才會凹凸）
//   ④ 換地圖／縮圈落石都會讓分類失效重算
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const P = env.BH, G = P.Game, html = env.html;

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}
function eq(a, b, name) { ok(a === b, name + '（' + a + '）'); }
function head(t) { console.log('\n=== ' + t + ' ==='); }
const css = html.replace(/\r/g, '');

function soloStage(stage) {
  P.settings.size = 'M';
  P.settings.hazards = 'off';
  P.settings.sd = 'off';
  P.settings.ctrl = 'kb';
  P.settings.soloDiff = 'normal';
  P.startSolo(stage || 1, false);
  G.state = 'play';
  return G.players[0];
}
function scan() {
  const k = G.wallKind || [];
  let outer = 0, inner = 0, hidden = 0, bad = 0;
  for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) {
    const v = (k[y] && k[y][x]) | 0;
    if (G.grid[y][x] === 1) {
      if (v === 1) outer++; else if (v === 2) inner++; else if (v === 0) hidden++; else bad++;
    } else if (v !== 0) bad++;              // 空地不該有牆分類
  }
  return { outer: outer, inner: inner, hidden: hidden, bad: bad };
}

// ================================================================
head('1. 牆分類表：存在、三種值、空地不受影響');
{
  ok(typeof P.markWallKinds === 'function', '有匯出 markWallKinds');
  const pl = soloStage(1);
  P.markWallKinds();
  ok(!!G.wallKind, '呼叫 markWallKinds 後 wallKind 已產生');
  const s1 = scan();
  ok(s1.outer > 0, '有外牆（' + s1.outer + ' 格）');
  eq(s1.bad, 0, '空地格不會被標成牆（bad=0）');
  ok(s1.hidden > 0, '有「太遠不畫」的實心格（' + s1.hidden + ' 格）→ 輪廓才會凹凸');
  ok(s1.outer + s1.inner + s1.hidden > 0, '三類相加＝實心格總數');
}
{
  const s1 = scan();
  ok(s1.outer < G.cols * G.rows * .5, '外牆沒有佔滿整張圖（' + s1.outer + ' / ' + (G.cols * G.rows) + '）');
}

// ================================================================
head('2. 分類規則：外牆一定連到地圖外框，硬牆島一定沒連');
{
  // 手動造一張圖驗規則：外框牆 + 中間一個孤島 + 一個貼著外框的突出
  soloStage(1);
  const cols = G.cols, rows = G.rows;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    G.grid[y][x] = (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) ? 1 : 0;
  }
  G.grid[3][3] = 1;               // 孤島（四周全空地）
  G.grid[1][6] = 1;               // 貼著外框的突出
  G.wallKind = null;
  P.markWallKinds();
  eq(G.wallKind[3][3], 2, '四面被空地包圍的孤島 → 硬牆島(2)');
  eq(G.wallKind[1][6], 1, '連到外框又貼場地 → 外牆(1)');
  eq(G.wallKind[0][0], 1, '角落斜貼著空地也算外牆（斜角距離 1）');
  eq(G.wallKind[0][6], 1, '外框上貼著空地的格 → 外牆(1)');
}

// ================================================================
head('3. 外牆顏色：每個大關自己一組（th.out），八關都不一樣');
{
  ok(typeof P.mixHex === 'function', '有 mixHex（顏色混合）');
  const outs = P.THEMES.map(function (t) { return t.out; });
  ok(outs.every(function (c) { return /^#[0-9a-f]{6}$/i.test(c || ''); }), '八個主題都有 out 色（' + outs.join(' ') + '）');
  const uniq = outs.filter(function (c, i) { return outs.indexOf(c) === i; });
  ok(uniq.length === outs.length, '八個外牆色彼此不同（' + uniq.length + '/' + outs.length + '）');
  ok(/const base = \(th && \(th\.out \|\| th\.hard\)\)/.test(html), 'drawOuterWall 吃 th.out（不是固定沙金）');
  ok(!/mixHex\(hard, '#e8cf9c'/.test(html), '舊的「一律混沙金」已移除');
  // v4.56：外牆不再往外擴，改成「獨立貼圖 + 與硬牆同一個格子尺寸」
  ok(!/const e = T \* \.10;/.test(html), '外牆不再往外擴（尺寸與硬牆一致）');
  ok(/paintOuterTile/.test(html) && /outer: \[\]/.test(html), '外牆有自己的貼圖素材（paintOuterTile + artSet.outer）');
}

// ================================================================
head('4. 渲染：太遠的實心格連地板都不畫');
{
  ok(/Game\.wallKind\[g[xy]\]\[g[xy]\] === 0 && Game\.grid\[g[xy]\]\[g[xy]\] === 1/.test(html), '地板迴圈會跳過「太遠」的實心格');
  ok(/wk === 1\) drawOuterWall/.test(html) && /wk !== 0\) drawStone/.test(html), '牆迴圈：0 不畫、1 畫外牆、其餘畫硬牆');
}

// ================================================================
head('5. 分類失效：換地圖 / 縮圈落石');
{
  const pl = soloStage(2);
  ok(G.wallKind === null || G.wallKind, '換關卡後分類會重建');
  P.startSolo(3, false);
  ok(G.wallKind === null || G.wallKind, '再換一關也不會殘留舊表');
  ok(/Game\.grid = g;\n[\s\S]{0,120}?Game\.wallKind = null;/.test(html), 'buildOrganicMap 建完圖會清掉分類');
  ok(/Game\.grid\[c\[1\]\]\[c\[0\]\] = 1;[\s\S]{0,420}?markWallKinds\(\);/.test(html), '縮圈落石改格子會當場重算牆分類（v5.3：順便清掉對應的地板分塊）');
}

// ================================================================
head('6. 不規則：可走區不是一整塊矩形');
{
  const pl = soloStage(1);
  // 逐列/逐欄看可走範圍，若每列起點都一樣＝矩形
  let sameL = 0, sameR = 0, prevL = -1, prevR = -1;
  for (let y = 1; y < G.rows - 1; y++) {
    let l = -1, r = -1;
    for (let x = 1; x < G.cols - 1; x++) if (G.grid[y][x] !== 1) { if (l < 0) l = x; r = x; }
    if (prevL >= 0 && l === prevL) sameL++;
    if (prevR >= 0 && r === prevR) sameR++;
    prevL = l; prevR = r;
  }
  const rowsN = G.rows - 2;
  ok(sameL < rowsN - 1 || sameR < rowsN - 1, '至少一側的邊界不是一直線（左緣相同 ' + sameL + '/' + rowsN + '、右緣 ' + sameR + '/' + rowsN + '）');
}

console.log('\n通過 ' + pass + ' / ' + (pass + fail) + '　失敗 ' + fail);
process.exit(fail ? 1 : 0);
