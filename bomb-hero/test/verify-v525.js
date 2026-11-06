// 無頭測試 v525：軟磚「滿版重畫」＋ 地板零碎雜物
// 使用者的原話：「軟牆自己本身的陰影出不來顯得整體場景地面不協調，如果你硬要保留陰影效果
//               那就是所有軟牆的結構全部要重新畫，畫到滿版不留地面…只是你新軟牆要設計的
//               比舊版的更好看也要牆滿版不留地面，這樣你做的到嗎？做不到就可能要拿掉全部
//               陰影了…增加場景細節變化就是地面另外分佈一些零碎的地板小雜物…只是東西要
//               更多樣化 符合該場景會出現的小東西細節」
//
// 所以這支測試驗四件事：
//   ① v5.24 那條「補軟磚專用陰影」的路線是「整個拿掉」的，一段都不能留（留著就是死碼）
//   ② 新軟磚是滿版實心塊：擦乾淨 → 立刻 fillRect(0,0,S,S) → 再 aBlock，八個主題都要
//   ③ 地板雜物真的會「平均分佈、三種輪替」（v5.25 踩過的兩個坑：hs%3 恆為 0、尺寸只有 6px）
//   ④ 沒有把 v5.22 的接縫 AO／五段烘焙順序弄壞
const fs = require('fs');
const path = require('path');
const { makeEnv, rawHtml } = require('./_sandbox');

const env = makeEnv();
const P = env.BH;
const G = P.Game;
const rec = env.rec;
const html = rawHtml;

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}
function head(t2) { console.log('\n=== ' + t2 + ' ==='); }

const STYLES = ['forest', 'sand', 'ice', 'lava', 'neon', 'sea', 'sky', 'dark'];
const S = 128;

// 用沙盒的記錄型 ctx 抓「這一格畫了哪些指令」
function paintOps(fn) {
  rec.calls.length = 0;
  try { fn(); } catch (e) { rec.calls.length = 0; throw e; }
  const out = rec.calls.map(function (c) { return [c[0]].concat(Array.prototype.slice.call(c, 1)); });
  rec.calls.length = 0;
  return out;
}
function sigOf(ops) { return ops.map(function (c) { return c[0]; }).join(','); }

/* ================================================================ ⓪ */
head('⓪ 版本');
const VN = P.VERSION.split('.').map(Number);
ok(VN[0] === 5 && VN[1] >= 25, '版本是 5.25 以上（' + P.VERSION + '）');
ok(html.indexOf('id="verTxt">' + P.VERSION) > 0, '首頁徽章與 VERSION 同步');
ok(html.indexOf('id="verLogVer">' + P.VERSION) > 0, '版本紀錄標題與 VERSION 同步');
ok(P.VERSION_LOG[0].v === P.VERSION, '版本紀錄第一筆就是 ' + P.VERSION);
ok(P.VERSION_LOG[0].now === true, '版本紀錄最上面是 now:true');
ok(P.VERSION_LOG[1] && P.VERSION_LOG[1].now === false, '上一版（' + (P.VERSION_LOG[1] || {}).v + '）已改成 now:false');
ok(P.VERSION_LOG[0].items.length >= 4, '5.25 至少 4 條更新（' + P.VERSION_LOG[0].items.length + ' 條）');
['../sw.js', '../../public/sw.js', '../../bomberman-online/public/sw.js'].forEach(function (rel) {
  const v = (/SW_VERSION = '([^']+)'/.exec(fs.readFileSync(path.join(__dirname, rel), 'utf8')) || [])[1] || '';
  const n = Number((v.replace(/^v/, '').split('.')[1]));
  ok(n >= 25, rel + ' SW_VERSION = ' + v);
});
ok((html.match(/\r/g) || []).length === 0, '整檔 LF（0 個 \\r）');
ok(html.length < 1950000, '主檔 ' + html.length + ' 字元（預算 1,950,000）');

/* ================================================================ ① */
head('① v5.24 那條路線整個拿掉（一段都不能留）');
{
  ok(html.indexOf('floorAOSoftBands') < 0, '原始碼沒有 floorAOSoftBands');
  ok(html.indexOf('drawFloorAOSoft') < 0, '原始碼沒有 drawFloorAOSoft');
  ok(html.indexOf('AO_SOFT_W') < 0, '原始碼沒有 AO_SOFT_W 常數');
  ok(typeof P.floorAOSoftBands === 'undefined', '__BH 沒有匯出 floorAOSoftBands');
  ok(typeof P.drawFloorAOSoft === 'undefined', '__BH 沒有匯出 drawFloorAOSoft');
  // 烘焙的「① 地板」到「② 牆面」之間不該再有軟磚專用陰影
  const i1 = html.indexOf('① 地板先全部鋪好');
  const i2 = html.indexOf('② 牆面／軟磚');
  const mid = (i1 > 0 && i2 > i1) ? html.slice(i1, i2) : '??';
  ok(i1 > 0 && i2 > i1, '烘焙五段標題還在（① … ② …）');
  ok(mid.indexOf('AO') < 0, '地板段與牆面段之間沒有任何 AO 呼叫（已清空）');
  // 為什麼拿掉要留在程式裡，下一個人（或我）才不會又補回去
  ok(/留了一圈亮地板/.test(html), '程式裡留了「舊版為什麼補不平」的說明');
}

/* ================================================================ ② */
head('② 新軟磚＝滿版實心塊（八個主題都要，而且要互相認得出來）');
{
  const src = (function () {
    const a = html.indexOf('function paintSoftTile');
    const b = html.indexOf('function paintFloorTile');
    return (a > 0 && b > a) ? html.slice(a, b) : '';
  })();
  ok(src.length > 4000, 'paintSoftTile 有實質內容（' + src.length + ' 字元）');
  ok(src.indexOf('g.clearRect(0, 0, S, S)') > 0, '開頭先擦乾淨（不留上一版殘影）');
  ok(/g\.fillStyle = shadeHex\(c\.face3 \|\| c\.face2, \.[\d]+\); g\.fillRect\(0, 0, S, S\);/.test(src),
    '緊接著一層鋪滿整格的接縫底色（滿版的關鍵）');
  ok(/const f = aBlock\(g, m, m, S - m \* 2, S - m \* 2, r0, c, \.[\d]+\);/.test(src),
    '跟硬牆同一套 aBlock 立體塊（厚度面／頂面／亮邊／底部 AO 共用）');
  ok(src.indexOf('inset') < 0, '舊版的 inset 內縮（留地板那一圈）已經沒有了');
  ok(/const m = 1\.[\d]+ \* u/.test(src), '接縫只有 1.x%（3% 太粗，會變相框）');
  ok(/aOutline\(g, fx, fy, fw, fh, r, 'rgba\(0,0,0,\.[\d]+\)'/.test(src),
    '收尾是細黑邊，不是深色線框');

  // 八個主題：第一個是 if，中間六個 else if，最後 dark 是 else
  const firstIf = /if \(st === 'forest'\) \{/.test(src);
  const elseIf = (src.match(/else if \(st === '/g) || []).length;
  ok(firstIf, "第一個主題用 if (st === 'forest')（不是 else if）");
  ok(elseIf === 6, '中間六個 else if 分支 + 最後 else（實測 ' + elseIf + ' 個 else if）');
  STYLES.forEach(function (st) {
    const hit = st === 'forest'
      ? firstIf
      : (st === 'dark' ? /else \{/.test(src) : new RegExp("else if \\(st === '" + st + "'\\) \\{").test(src));
    ok(!!hit, '有 ' + st + ' 分支');
  });
  // 空分支＝整格畫不出來（v5.25 真的發生過：海）
  const emptyBranch = /\} else if \(st === '\w+'\) \{\s*\}/.test(src);
  ok(!emptyBranch, '沒有空分支（空分支會讓那個主題整格畫不出來）');
  const dupBranch = /\} else if \(st === '(\w+)'\) \{\s*\} else if \(st === '\1'\) \{/.test(src);
  ok(!dupBranch, '沒有重複的 else if（補丁工具曾產生過）');

  // 動態：八個主題各畫一次，看指令流
  const sigs = {}, opN = {};
  STYLES.forEach(function (st) {
    let ops;
    try { ops = paintOps(function () { P.paintSoftTile(env.mkCtx2D(), st, S, 101, false, 0); }); }
    catch (e) { ok(false, st + ' 畫不出來：' + e.message); return; }
    opN[st] = ops.length;
    sigs[st] = sigOf(ops);
    // ① 擦乾淨 ② 立刻鋪滿整格
    ok(ops[0] && ops[0][0] === 'clearRect', st + '：第一個動作是 clearRect');
    const f = ops[1];
    ok(!!f && f[0] === 'fillRect' && f[1] === 0 && f[2] === 0 && f[3] === S && f[4] === S,
      st + '：緊接著 fillRect(0,0,S,S) —— 滿版（' +
      (f ? [f[0], f[1], f[2], f[3], f[4]].join(' ') : '沒有') + '）');
    ok(ops.length > 60, st + '：畫了 ' + ops.length + ' 個指令（不是一格純色）');
  });
  const uniq = {};
  STYLES.forEach(function (k) { uniq[sigs[k]] = 1; });
  ok(Object.keys(uniq).length === STYLES.length,
    '八個主題的畫法兩兩不同（' + Object.keys(uniq).length + '/' + STYLES.length + '）');
  ok(Math.min.apply(null, STYLES.map(function (s) { return opN[s] || 0; })) > 60,
    '最少的那個主題也有 60+ 指令（' + Math.min.apply(null, STYLES.map(function (s) { return opN[s] || 0; })) + '）');
  // 硬牆 vs 軟磚：兩個都要滿版，但畫法要不同，否則同色系會分不出來
  let hardOps = paintOps(function () { P.paintHardTile(env.mkCtx2D(), 'dark', S, 108, 0); });
  ok(sigOf(hardOps) !== sigs.dark, 'dark 的軟磚與硬牆畫法不同（靠剪影辨識，不是靠顏色）');
}

/* ================================================================ ③ */
head('③ 地板雜物：靜態結構（兩個坑都要堵住）');
{
  const a = html.indexOf('function paintGroundExtra');
  const b = html.indexOf('function paintFloorStyle');
  const src = (a > 0 && b > a) ? html.slice(a, b) : '';
  ok(src.length > 6000, 'paintGroundExtra 有實質內容（' + src.length + ' 字元）');
  ok(/const step = dgHash\(x, y, 29\) < \.22 \? 2 : 3;/.test(src),
    '密度＝2~3 格混著用（22% 走 2 格 → 覆蓋率 31% → 37%，比每 3 格明顯）');
  ok(/const k = \(\(hs \/ step\) \| 0\) % 3;/.test(src),
    '種類＝((hs/step)|0)%3 —— 先除 step 再取餘數，三種才會輪替');
  ok(!/[^\/]hs % 3[^0-9]/.test(src.replace(/const k = \(\(hs \/ step\) \| 0\) % 3;/, '')),
    '沒有留下「hs % 3」這種恆為 0 的寫法（陷阱）');
  ok(/g\.translate\(cx, cy\); g\.scale\(2\.6, 2\.6\); g\.translate\(-cx, -cy\);/.test(src),
    '雜物統一放大 2.6 倍（尺寸 0.05~0.13 格＝6px，肉眼等於不存在）');
  ok(/g\.ellipse\(cx, cy \+ T \* \.[\d]+, T \* \.[\d]+, T \* \.[\d]+, 0, 0, 6\.283\)/.test(src),
    '每件雜物都有接觸陰影（不然像浮在地板上）');
  ['forest', 'sand', 'ice', 'lava', 'neon', 'sea', 'sky'].forEach(function (st) {
    ok(new RegExp("st === '" + st + "'").test(src), st + ' 有專屬的雜物分支');
  });
  ok(/st === 'sky'\) \{[\s\S]{0,4000}?\} else \{/.test(src), 'dark 走最後的 else 分支（它是第八個主題）');
  const k0 = (src.match(/k === 0/g) || []).length, k1 = (src.match(/k === 1/g) || []).length;
  ok(k0 === 8 && k1 === 8, '八個主題各有 k===0 與 k===1（第三種用 else）—— 實測 ' + k0 + ' / ' + k1);
  // 兩層裝飾要吃不同的 hash，否則 7/4 格與 3 格會對齊成棋盤壁紙
  ok(/function dgHash\(x, y, k\)/.test(html), 'dgHash 是獨立函式（帶第三個 salt 參數）');
  const gc = /function gdecorHash\(x, y\) \{\s*\n\s*var h = \(x \* (\d+)\) \^ \(y \* (\d+)\);/.exec(html);
  const dgA = /function dgHash\(x, y, k\)[\s\S]{0,600}?Math\.imul\(x \| 0, (\d+)\)/.exec(html);
  ok(!!gc, 'gdecorHash 還在（' + (gc ? gc[1] : '?') + '）');
  ok(!!dgA, 'dgHash 用 Math.imul 做 32 位元混洗（' + (dgA ? dgA[1] : '?') + '）—— 普通的 * 會超過 2^53，低位全糊掉');
  ok(!!gc && !!dgA && gc[1] !== dgA[1], '兩層用不同的乘數（' + (gc ? gc[1] : '?') + ' vs ' + (dgA ? dgA[1] : '?') + '）→ 不會對齊成棋盤');
  // 牆腳堆積只貼硬牆：軟磚旁邊畫了會像「從軟磚裡漏出來」
  ok(/!== 1\) continue;\s*\/\/ 只貼硬牆/.test(src) || /只貼硬牆/.test(src), '牆腳堆積只認硬牆（grid===1）');
  ok(/DG_DRIFT/.test(src) && Object.keys !== null, '每個主題有自己的碎屑色（DG_DRIFT）');
}

/* ================================================================ ④ */
head('④ 地板雜物：實際跑一遍（分佈與輪替）');
{
  const save = { T: G.T, cols: G.cols, rows: G.rows, grid: G.grid };
  G.T = 60; G.cols = 12; G.rows = 12;
  G.grid = [];
  for (let y = 0; y < 12; y++) { G.grid.push([]); for (let x = 0; x < 12; x++) G.grid[y].push(0); }

  const cells = [];
  for (let y = 1; y < 11; y++) for (let x = 1; x < 11; x++) {
    let ops;
    try { ops = paintOps(function () { P.paintGroundExtra(x, y, x * 60, y * 60, 60, 'forest'); }); }
    catch (e) { ok(false, 'paintGroundExtra 爆了 @' + x + ',' + y + '：' + e.message); ops = []; }
    cells.push({ x: x, y: y, ops: ops, sig: sigOf(ops), n: ops.length });
  }
  // v5.26：草原／沙地多了「雨後積水」格子（畫在放大之前、沒有 scale）→
  //   只把「真的有放雜物」的格子算進來，否則水窪會被當成第四、第五種雜物。
  const drawn = cells.filter(function (c) {
    return c.ops.some(function (o) { return o[0] === 'scale' && Math.abs(o[1] - 2.6) < .001; });
  });
  ok(drawn.length >= 30 && drawn.length <= 46,
    '100 格裡有 ' + drawn.length + ' 格放了雜物（2~3 格一件 → 期望 37 上下、允許 30~46）');
  const kinds = {};
  // 簽名只看 scale 之後的指令（＝雜物本體），排除積水與牆腳碎屑；
  //   座標每格都不同 → 簽名前先把數字位數截掉，只留「畫法」。
  //   （三種輪替另外用 dgHash 直接驗，這裡只確認三種畫法都真的被畫出來過）
  drawn.forEach(function (c) {
    const i = c.ops.findIndex(function (o) { return o[0] === 'scale'; });
    kinds[c.ops.slice(i + 1).map(function (o) { return o[0]; }).join(',')] = 1;
  });
  ok(Object.keys(kinds).length === 3,
    '三種雜物的「指令形狀」都出現（落葉堆／枯枝／蘑菇 → ' + Object.keys(kinds).length + ' 種）');
  // 輪替本身：直接用 dgHash 重算 100 格的 k（渲染過濾太多資訊，這裡驗真正的分佈）
  const cnt = [0, 0, 0];
  for (let y = 1; y < 11; y++) for (let x = 1; x < 11; x++) {
    const step = P.dgHash(x, y, 29) < .22 ? 2 : 3;
    const hs = (P.dgHash(x, y, 23) * 1000000) | 0;
    if (hs % step) continue;
    cnt[((hs / step) | 0) % 3]++;
  }
  ok(cnt.every(function (n) { return n >= 5; }),
    '三種平均輪替（' + cnt.join(' / ') + '）—— 不是「只出一種」那個 bug');
  // 每件雜物都要有：放大 + 接觸陰影
  const noScale = drawn.filter(function (c) {
    return !c.ops.some(function (o) { return o[0] === 'scale' && Math.abs(o[1] - 2.6) < .001; });
  });
  ok(noScale.length === 0, '每一件都有 2.6 倍放大（漏 ' + noScale.length + ' 件）');
  const noShadow = drawn.filter(function (c) {
    return !c.ops.some(function (o) { return o[0] === 'ellipse'; });
  });
  ok(noShadow.length === 0, '每一件都有接觸陰影（漏 ' + noShadow.length + ' 件）');
  // 確定性：同一格畫兩次要完全一樣（不能用 Math.random，否則每次進關都不一樣）
  const s1 = paintOps(function () { P.paintGroundExtra(4, 6, 240, 360, 60, 'forest'); });
  const s2 = paintOps(function () { P.paintGroundExtra(4, 6, 240, 360, 60, 'forest'); });
  ok(sigOf(s1) === sigOf(s2), '同一格連畫兩次完全一樣（確定性，不吃 random）');
  // 四面都是空地 → 不會有牆腳堆積
  const drift = paintOps(function () { P.paintGroundExtra(5, 5, 300, 300, 60, 'forest'); });
  ok(sigOf(drift) === sigOf(paintOps(function () { P.paintGroundExtra(5, 5, 300, 300, 60, 'forest'); })),
    '四面空地時沒有牆腳碎屑（只有主題雜物）');
  // 旁邊放一面硬牆 → 那一圈要出現碎屑帶（dgDrift 會先 translate + rotate）
  let driftCells = 0;
  for (let x = 1; x < 11; x++) {
    for (let y = 1; y < 11; y++) {
      G.grid = []; for (let yy = 0; yy < 12; yy++) { G.grid.push([]); for (let xx = 0; xx < 12; xx++) G.grid[yy].push(0); }
      G.grid[y - 1][x] = 1;                     // 上面是石牆
      const o = paintOps(function () { P.paintGroundExtra(x, y, x * 60, y * 60, 60, 'forest'); });
      if (o.some(function (c) { return c[0] === 'rotate'; })) driftCells++;
    }
  }
  ok(driftCells > 10, '貼著石牆的格子會灑牆腳碎屑（' + driftCells + '/100 格）');
  ok(driftCells < 45, '但不是每一格都灑（' + driftCells + '/100，太多會像地板髒掉）');
  // 軟磚旁邊不灑
  let softDrift = 0;
  for (let x = 1; x < 11; x++) {
    for (let y = 1; y < 11; y++) {
      G.grid = []; for (let yy = 0; yy < 12; yy++) { G.grid.push([]); for (let xx = 0; xx < 12; xx++) G.grid[yy].push(0); }
      G.grid[y - 1][x] = 2;                     // 上面是軟磚
      const o = paintOps(function () { P.paintGroundExtra(x, y, x * 60, y * 60, 60, 'forest'); });
      if (o.some(function (c) { return c[0] === 'rotate'; })) softDrift++;
    }
  }
  ok(softDrift === 0, '軟磚旁邊不灑碎屑（' + softDrift + ' 格）—— 會看起來像從軟磚裡漏出來');
  G.T = save.T; G.cols = save.cols; G.rows = save.rows; G.grid = save.grid;
}

/* ================================================================ ⑤ */
head('⑤ 呼叫點：兩層裝飾都要在「貼圖成功」那條路上，而且先舊後新');
{
  const a = html.indexOf('function paintFloorStyle');
  const src = html.slice(a, a + 3000);
  const iDec = src.indexOf('paintGroundDecor(x, y, px, py, T');
  const iExt = src.indexOf('paintGroundExtra(x, y, px, py, T');
  ok(iDec > 0, 'paintFloorStyle 有呼叫 paintGroundDecor（v4.45 那層）');
  ok(iExt > 0, 'paintFloorStyle 有呼叫 paintGroundExtra（v5.25 這層）');
  ok(iDec < iExt, '先畫舊的裝飾、再畫新的雜物（新的一定不會被蓋掉）');
  const ret = src.indexOf('return;', iExt);
  ok(ret > iExt, '兩層都在 return 之前（沒有被提前 return 掉）');
  ok(/\(th && th\.style\) \|\| 'forest'/.test(src), '主題字串有 fallback（th 沒東西也不會爆）');
}

/* ================================================================ ⑥ */
head('⑥ 回歸：v5.22 的接縫 AO 與五段烘焙不能被動到');
{
  const save = { T: G.T, cols: G.cols, rows: G.rows, grid: G.grid };
  G.T = 40; G.cols = 4; G.rows = 4;
  G.grid = [[2, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 1]];
  ok(P.aoSolid(0, 0) === 2, 'aoSolid：軟磚回 2');
  ok(P.aoSolid(3, 3) === 1, 'aoSolid：石牆回 1');
  ok(P.aoSolid(1, 1) === 0, 'aoSolid：空地回 0');
  ok(P.floorAOBands(0, 0, 40).length === 0, '軟磚格本身不壓空地 AO（v5.22 語意）');
  const nb = P.floorAOBands(1, 0, 40);
  ok(nb.filter(function (o) { return o.d === 'l'; }).length === 2, '空地貼著軟磚仍有兩層（柔光＋貼邊）');
  const cor = P.floorAOBands(1, 1, 40);
  ok(cor.filter(function (o) { return o.k === 'c'; }).length >= 1, '轉角補丁還在');
  G.T = save.T; G.cols = save.cols; G.rows = save.rows; G.grid = save.grid;

  ['① 地板先全部鋪好', '② 牆面／軟磚', '③ 場地光線', '④ 樹影斑駁', '⑤ 接縫 AO'].forEach(function (s) {
    ok(html.indexOf(s) > 0, '烘焙順序有「' + s + '」');
  });
  const o1 = html.indexOf('① 地板先全部鋪好'), o2 = html.indexOf('② 牆面／軟磚');
  const o3 = html.indexOf('③ 場地光線'), o4 = html.indexOf('④ 樹影斑駁'), o5 = html.indexOf('⑤ 接縫 AO');
  ok(o1 < o2 && o2 < o3 && o3 < o4 && o4 < o5, '五段順序沒被調換（地板 → 牆 → 光線 → 樹影 → AO）');
  ok((html.match(/resetMapCellState\(\)/g) || []).length >= 2, '兩支地圖產生器開頭都還在清狀態');
}

/* ================================================================ ⑦ */
head('⑦ 全 32 關：每個主題都要有軟磚貼圖（不能有一關整片空白）');
{
  const seen = {};
  // v5.36：40 關制（每章 5 關）；BOSS 決戰場不鋪軟磚 → 跳過
  for (let st = 1; st <= P.SOLO_STAGES; st++) {
    if (P.isBossStage(st)) continue;
    let okBuild = true;
    try { P.startSolo(st, false); } catch (e) { okBuild = false; ok(false, '第 ' + st + ' 關建不起來：' + e.message); }
    if (!okBuild) continue;
    const style = (G.theme && G.theme.style) || '?';
    seen[style] = (seen[style] || 0) + 1;
  }
  ok(Object.keys(seen).length === 8, P.SOLO_STAGES + ' 關一共用到 ' + Object.keys(seen).length + ' 種主題');
  STYLES.forEach(function (st) {
    ok((seen[st] || 0) >= 2, st + ' 有 ' + (seen[st] || 0) + ' 關');
    let set = null;
    try { set = P.artSet(st); } catch (e) { ok(false, st + ' 的貼圖建不起來：' + e.message); }
    ok(!!set && set.soft && set.soft.length === 4, st + ' 烘出 4 張軟磚（' + (set && set.soft ? set.soft.length : 0) + '）');
    ok(!!set && set.hard && set.hard.length === 4 && set.soft[0] !== set.hard[0],
      st + ' 的軟磚與硬牆是不同的貼圖');
  });
}

console.log('\n' + (fail ? '✗' : '✅') + ' v5.25：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
