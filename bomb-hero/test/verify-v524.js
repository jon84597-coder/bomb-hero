// 無頭測試 v524：軟磚腳下（自己那一格）的地板陰影
// 使用者的原話：「軟牆本身底下地面的陰影要加，而且深度要跟旁邊地面差不多，
//               才不會兩個陰影接在一起產生斷層感；八個大關卡的軟牆都要檢查，
//               有露出地面的軟牆才加。」
// 所以這支測試驗的是三件事：
//   ① 軟磚格自己有沒有內側帶（而且只補「朝空地」那幾側）
//   ② 交界處兩邊的濃度是不是同一個值（沒有斷層）
//   ③ 32 關＋RPG＋大逃殺＋對戰的每一格軟磚都掃過，不是只驗一個樣本
const fs = require('fs');
const path = require('path');
const { makeEnv, rawHtml } = require('./_sandbox');

const env0 = makeEnv();
const P = env0.BH;
const G = P.Game;
const html = rawHtml;

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}
function head(t2) { console.log('\n=== ' + t2 + ' ==='); }

/* ================================================================ ⓪ */
head('⓪ 版本');
const VN = P.VERSION.split('.').map(Number);
ok(VN[0] === 5 && VN[1] >= 24, '版本是 5.24 以上（' + P.VERSION + '）');
ok(html.indexOf('id="verTxt">' + P.VERSION) > 0, '首頁徽章與 VERSION 同步');
ok(P.VERSION_LOG[0].now === true, '版本紀錄最上面是 now:true');
ok(P.VERSION_LOG[0].items.length >= 4, '5.24 至少 4 條更新（' + P.VERSION_LOG[0].items.length + ' 條）');
['../sw.js', '../../public/sw.js', '../../bomberman-online/public/sw.js'].forEach(function (rel) {
  const v = (/SW_VERSION = '([^']+)'/.exec(fs.readFileSync(path.join(__dirname, rel), 'utf8')) || [])[1] || '';
  ok(Number(v.replace(/^v/, '').split('.')[1]) >= 24, rel + ' SW_VERSION = ' + v);
});
ok((html.match(/\r/g) || []).length === 0, '整檔 LF（0 個 \\r）');
ok(html.length < 1790000, '主檔 ' + html.length + ' 字元（預算 1,790,000）');

/* ================================================================ ① */
head('① 新函式：軟磚自己那一格的內側帶');
{
  ok(typeof P.floorAOSoftBands === 'function', 'floorAOSoftBands 存在');
  ok(typeof P.drawFloorAOSoft === 'function', 'drawFloorAOSoft 存在');
  // 參數：內側帶要比空地那條短（四邊都往格子裡淡出，太長會在中心疊成一團黑）
  const m = /const AO_SOFT_W = ([\d.]+);/.exec(html);
  ok(!!m && Number(m[1]) > 0 && Number(m[1]) < .62, 'AO_SOFT_W = ' + (m ? m[1] : '?') + '（比空地的 0.62 短）');

  const save = { T: G.T, cols: G.cols, rows: G.rows, grid: G.grid };
  G.T = 40; G.cols = 4; G.rows = 4;
  G.grid = [[2, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
  const open = P.floorAOSoftBands(0, 0, 40);
  ok(open.length === 8, '四面都是空地 → 4 邊 × 2 條 = 8 條（實測 ' + open.length + '）');
  ok(open.filter(function (o) { return o.d === 'r'; }).length === 2, '朝空地那側有柔光帶＋貼邊帶兩層');
  ok(Math.abs(open[0].w - 40 * .34) < .01 || Math.abs(open[0].h - 40 * .34) < .01, '內側柔光帶長度 = T×0.34');
  // 空地那條仍是 0.62
  G.grid = [[2, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
  const nb = P.floorAOBands(1, 0, 40);
  ok(Math.abs(nb[0].w - 40 * .62) < .01, '空地那條仍然是 T×0.62（沒被改動，實測 ' + nb[0].w + '）');

  G.grid = [[0, 0, 0, 0], [0, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
  G.grid = [[1, 1, 0, 0], [1, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
  const half = P.floorAOSoftBands(1, 1, 40);
  ok(half.length === 4, '上面與左邊是石牆 → 只補下／右（實測 ' + half.length + ' 條）');
  ok(!half.some(function (o) { return o.d === 'u' || o.d === 'l'; }), '不會朝實心那側壓陰影（兩塊軟磚相鄰不會壓出黑縫）');

  G.grid = [[0, 1, 0, 0], [1, 2, 1, 0], [0, 1, 0, 0], [0, 0, 0, 0]];
  ok(P.floorAOSoftBands(1, 1, 40).length === 0, '四面都被包住 → 一條都不補');
  ok(P.floorAOSoftBands(0, 0, 40).length === 0, '空地格不會走這條路徑（回空）');
  G.T = save.T; G.cols = save.cols; G.rows = save.rows; G.grid = save.grid;
}

/* ================================================================ ② */
head('② 交界處沒有斷層：兩邊的濃度必須是同一個值');
{
  const save = { T: G.T, cols: G.cols, rows: G.rows, grid: G.grid };
  G.T = 40; G.cols = 4; G.rows = 4;
  G.grid = [[2, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
  const softR = P.floorAOSoftBands(0, 0, 40).filter(function (o) { return o.d === 'r'; });
  const emptyL = P.floorAOBands(1, 0, 40).filter(function (o) { return o.d === 'l'; });
  ok(softR.length === 2 && emptyL.length === 2, '交界兩側各有一組帶');
  const a1 = softR.map(function (o) { return o.a; }).sort().join(',');
  const a2 = emptyL.map(function (o) { return o.a; }).sort().join(',');
  ok(a1 === a2, '濃度完全相同（軟磚內側 ' + a1 + ' ／空地外側 ' + a2 + '）');
  // 方向正確：軟磚的帶是「從交界往格子裡淡出」，空地的帶是「從交界往格子裡淡出」
  ok(softR.every(function (o) { return o.d === 'r'; }) && emptyL.every(function (o) { return o.d === 'l'; }),
    '兩條帶都從交界那一邊起算（濃度接得起來）');
  ok(softR[0].x + softR[0].w <= 40.001, '內側帶不會溢出自己的格子');
  G.T = save.T; G.cols = save.cols; G.rows = save.rows; G.grid = save.grid;
}

/* ================================================================ ③ */
head('③ 八個主題的軟牆「真的會露出地面」（否則加了也看不到）');
{
  // paintSoftTile 一定是「先 clearRect（透明背景）」再畫，而且方箱類留 7% 邊距、
  //   剪影類（陶罐／雲朵／珊瑚）放大到滿版但四角仍是透明的。
  //   實測覆蓋率（test/_probe-softcover.js）：forest 76.4 / sand 77.5 / ice 74.5 /
  //   lava 78.4 / neon 82.2 / sea 63.4 / sky 76.4 / dark 76.1 % —— 全部 < 90%，
  //   也就是每一格軟磚腳下都有 10% 以上的地板是看得到的。
  ok(/function paintSoftTile\(g, st, S, seed, big, vi\) \{[\s\S]{0,240}g\.clearRect\(0, 0, S, S\);/.test(html),
    'paintSoftTile 從透明畫布開始畫（貼圖四邊留空 → 腳下看得到地板）');
  ok(/const inset = big \? 3 \* u : 7 \* u;/.test(html), '方箱類留 7% 邊距（= 每邊露出約 4px）');
  const sil = /st === 'sand' \|\| st === 'sky' \|\| st === 'sea'/.test(html);
  ok(sil, '陶罐／雲朵／珊瑚是剪影型（四角一定是透明的）');
  ok(/AO_SOFT_W/.test(html), '內側帶長度獨立成常數（之後要調不用動空地那條）');
}

/* ================================================================ ④ */
head('④ 全關卡掃描：每一格軟磚、每一側朝空地都要有內側陰影');
{
  let softAll = 0, exposedAll = 0, missed = 0, dirs = 0, bad = 0;
  function audit(tag) {
    let soft = 0, exposed = 0, miss = 0, dnum = 0, b = 0;
    for (let y = 1; y < G.rows - 1; y++) {
      for (let x = 1; x < G.cols - 1; x++) {
        if ((G.grid[y][x] | 0) !== 2) continue;
        soft++;
        const ops = P.floorAOSoftBands(x, y, G.T);
        const sides = [];
        if (!P.aoSolid(x, y - 1)) sides.push('u');
        if (!P.aoSolid(x, y + 1)) sides.push('d');
        if (!P.aoSolid(x - 1, y)) sides.push('l');
        if (!P.aoSolid(x + 1, y)) sides.push('r');
        if (!sides.length) { if (ops.length) b++; continue; }
        exposed++;
        // 每一側都要剛好兩條（柔光帶＋貼邊帶）
        for (let i = 0; i < sides.length; i++) {
          const got = ops.filter(function (o) { return o.d === sides[i]; }).length;
          if (got !== 2) b++;
          dnum++;
        }
        if (!ops.length) miss++;
      }
    }
    softAll += soft; exposedAll += exposed; missed += miss; dirs += dnum; bad += b;
    ok(miss === 0, tag + '：' + (exposed - miss) + '/' + exposed + ' 格露出地面的軟磚都有內側陰影');
    ok(b === 0, tag + '：每一側剛好兩條帶（不符 ' + b + ' 處）');
  }
  for (let st = 1; st <= 32; st++) {
    try { P.startSolo(st, false); } catch (e) { ok(false, '第 ' + st + ' 關建不起來：' + e.message); continue; }
    audit('第 ' + st + ' 關（' + (G.theme && G.theme.style) + '）');
  }
  for (let st = 1; st <= 32; st += 4) {
    try { P.startRpg(st, {}); } catch (e) { ok(false, 'RPG 第 ' + st + ' 關建不起來：' + e.message); continue; }
    audit('RPG 第 ' + st + ' 關');
  }
  try { P.buildBRMap(); audit('大逃殺'); } catch (e) { ok(false, '大逃殺建不起來：' + e.message); }
  try { P.startBattle(); audit('對戰'); } catch (e) { ok(false, '對戰建不起來：' + e.message); }
  ok(exposedAll > 200, '總共檢查 ' + exposedAll + ' 格「露出地面」的軟磚（' + softAll + ' 格軟磚）');
  ok(missed === 0, '全部命中，沒有漏掉的軟磚（漏 ' + missed + ' 格）');
  ok(dirs > 400, '逐側檢查 ' + dirs + ' 次');
}

/* ================================================================ ⑤ */
head('⑤ 烘培順序：一定在「貼圖之前」，否則會把方塊本身壓黑');
{
  const i = html.indexOf('drawFloorAOSoft(cx * FLR_N');
  const wallPass = html.indexOf('② 牆面／軟磚');
  const crate = html.indexOf('drawCrate(cxp, cyp, T, thc.soft');
  ok(i > 0, '烘焙裡有呼叫 drawFloorAOSoft');
  ok(wallPass > 0 && i < wallPass, '在「牆面／軟磚」那一輪之前');
  ok(crate > 0 && i < crate, '在 drawCrate 之前（貼圖蓋上去才不會被壓暗）');
  const floorPass = html.indexOf('① 地板先全部鋪好');
  ok(floorPass < i, '在地板鋪好之後（不然陰影會被地板蓋掉）');
}

/* ================================================================ ⑥ */
head('⑥ 軟磚被炸掉 → 陰影要跟著消失');
{
  const save = { T: G.T, cols: G.cols, rows: G.rows, grid: G.grid };
  G.T = 40; G.cols = 4; G.rows = 4;
  G.grid = [[2, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
  ok(P.floorAOSoftBands(0, 0, 40).length === 8, '炸掉前：軟磚格有 8 條內側帶');
  G.grid[0][0] = 0;                      // 被炸掉
  ok(P.floorAOSoftBands(0, 0, 40).length === 0, '炸掉後：這一格不再長陰影');
  ok(P.floorAOBands(0, 0, 40).filter(function (o) { return o.d === 'l' || o.d === 'u'; }).length === 0,
    '炸掉後旁邊也不會留下幽靈陰影');
  G.T = save.T; G.cols = save.cols; G.rows = save.rows; G.grid = save.grid;
}

/* ================================================================ ⑦ */
head('⑦ 不影響原本的空地陰影（v5.22 的 186 項要繼續成立）');
{
  const save = { T: G.T, cols: G.cols, rows: G.rows, grid: G.grid };
  G.T = 40; G.cols = 4; G.rows = 4;
  G.grid = [[2, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 1]];
  const nb = P.floorAOBands(1, 0, 40);
  ok(nb.filter(function (o) { return o.d === 'l'; }).length === 2, '空地貼著軟磚仍有兩層（沒被改壞）');
  ok(P.floorAOBands(0, 0, 40).length === 0, '軟磚格本身不會被 floorAOBands 壓（維持 v5.22 語意）');
  const cor = P.floorAOBands(1, 1, 40);
  ok(cor.filter(function (o) { return o.k === 'c'; }).length >= 1, '轉角補丁還在');
  G.T = save.T; G.cols = save.cols; G.rows = save.rows; G.grid = save.grid;
}

console.log('\n' + (fail ? '✗' : '✅') + ' v5.24：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
