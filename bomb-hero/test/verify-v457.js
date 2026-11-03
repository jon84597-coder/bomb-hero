// verify-v457.js — v4.57 專屬驗證：八大關各自的環境氛圍層
//   ① AMB：八個主題各一組，效果種類互不重複
//   ② 純函式式：不存粒子、不 push 陣列（記憶體零成長）
//   ③ 淡入淡出：透明度走 sin(phase·π)
//   ④ 分層：燈光／雲影／沙霧在角色底下，其餘在角色之上
//   ⑤ 實跑：八個主題都真的畫出東西，而且只在自己的圖層畫
const { makeEnv, html } = require('./_sandbox');

const env = makeEnv();
const P = env.BH, G = P.Game, rec = env.rec;
const src = html.replace(/\r/g, '');

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }

const styles = P.THEMES.map(function (t) { return t.style; });
const block = (src.match(/const AMB = \{[\s\S]*?\n\};/) || [''])[0];
const keys = (block.match(/^\s{2}(\w+):\s*\{/gm) || []).map(function (s) {
  return s.trim().replace(/\s*:\s*\{$/, '').replace(':', '');
});

// ================================================================
head('1. AMB：八個大關各一組環境氛圍');
{
  ok(!!block, '有 AMB 氛圍表');
  ok(keys.length === 8, '八組（實際 ' + keys.length + '）');
  const miss = styles.filter(function (s) { return keys.indexOf(s) < 0; });
  ok(miss.length === 0, '每個大關的主題都有一組（缺：' + miss.join(',') + '）');
  const extra = keys.filter(function (k) { return styles.indexOf(k) < 0; });
  ok(extra.length === 0, '沒有多餘／拼錯的鍵（多：' + extra.join(',') + '）');
}

// ================================================================
head('2. 八種效果互不重複（不是同一個粒子換顏色）');
{
  const kinds = {};
  Object.keys(P.AMB).forEach(function (k) { kinds[P.AMB[k].k] = k; });
  const uniq = Object.keys(kinds).length;
  ok(uniq === 8, '八種不同的粒子型別（實際 ' + uniq + ' 種）');
  const want = { leaf: 'forest', dust: 'sand', snow: 'ice', spark: 'lava', glow: 'neon', bubble: 'sea', cloud: 'sky', bat: 'dark' };
  let bad = [];
  Object.keys(want).forEach(function (k) {
    if (P.AMB[want[k]].k !== k) bad.push(want[k] + '→' + P.AMB[want[k]].k);
  });
  ok(bad.length === 0, '草原落葉／沙漠吹沙／冰雪飄雪／熔岩火花／霓虹燈光／水中氣泡／空中雲層／魔城蝙蝠 對得上（錯：' + bad.join(',') + '）');
  ok(P.AMB.sea.k === 'bubble' && P.AMB.dark.k === 'bat', '水中是往上浮的氣泡、魔城是飛過的蝙蝠');
}

// ================================================================
head('3. 純函式式：沒有粒子物件、記憶體零成長');
{
  const fn = (src.match(/function drawAmbient\(T, layer\) \{[\s\S]*?\n\}/) || [''])[0];
  ok(!!fn, '有 drawAmbient(T, layer)');
  ok(!/\.push\(/.test(fn), '沒有 push（不累積粒子）');
  ok(!/new Array|=\s*\[\]/.test(fn), '沒有新建陣列（不配置記憶體）');
  ok(/dhash\(/.test(fn), '位置由雜湊推導（每帧重算，不存狀態）');
  ok(/Math\.sin\(ph \* Math\.PI\)/.test(fn), '透明度走 sin(phase·π) → 淡入再淡出');
  ok(/AMB_LOW\[d\.k\]/.test(fn), '有圖層分類（地面層 vs 角色之上）');
}

// ================================================================
head('4. 分層：地面效果在角色底下，飄浮物在角色之上');
{
  const lowKeys = Object.keys(P.AMB).filter(function (k) {
    return P.AMB[k].k === 'glow' || P.AMB[k].k === 'cloud' || P.AMB[k].k === 'dust';
  });
  ok(lowKeys.length === 3, '地面層三種：霓虹燈光／空中雲影／沙漠沙霧（' + lowKeys.join(',') + '）');
  const i0 = src.indexOf('drawAmbient(T, 0)');
  const i1 = src.indexOf('drawAmbient(T, 1)');
  const iItem = src.indexOf('drawItemBadge(px, py');
  const iPlayer = src.indexOf('drawPlayer(p, T)');
  ok(i0 > 0 && i1 > 0 && i0 !== i1, 'render 有兩層呼叫');
  ok(i0 < iItem, '地面層畫在道具／角色之前');
  ok(i1 > iPlayer, '飄浮層畫在角色之後');
  ok(i1 < src.indexOf('Tut.drawWorld(ctx)'), '飄浮層在教學卡之前（不會蓋住提示）');
}

// ================================================================
head('5. 實跑：八個主題都畫得出東西，且只在自己的圖層出現');
{
  const pick = function (fn) { return rec.calls.filter(function (c) { return c[0] === fn; }).length; };
  const TOKEN = { leaf: 'ellipse', snow: 'arc', spark: 'arc', bubble: 'arc', glow: 'ellipse', dust: 'ellipse', cloud: 'ellipse', bat: 'quadraticCurveTo' };
  let bad = [];
  for (let i = 0; i < P.THEMES.length; i++) {
    const th = P.THEMES[i];
    G.theme = th;
    G.gameT = 7.3;
    G.camX = 0; G.camY = 0;
    G.zoom = 1;
    const layer = (th.style === 'neon' || th.style === 'sky' || th.style === 'sand') ? 0 : 1;
    const other = 1 - layer;
    // 該圖層：要有繪製
    rec.calls.length = 0;
    P.drawAmbient(G.T || 48, layer);
    const got = pick(TOKEN[P.AMB[th.style].k] || 'arc');
    const total = rec.calls.length;
    if (got < 1) bad.push(th.style + ' 沒畫出 ' + TOKEN[P.AMB[th.style].k]);
    // 另一圖層：不能有繪製
    rec.calls.length = 0;
    P.drawAmbient(G.T || 48, other);
    if (rec.calls.length > 0) bad.push(th.style + ' 跑錯圖層(' + other + ')');
    if (total < 1) bad.push(th.style + ' 完全沒畫');
  }
  ok(bad.length === 0, '八個主題都正常（' + bad.join('；') + '）');
}

// ================================================================
head('6. 數量與強度：淡淡的、偶爾同時 2~3 個');
{
  const ns = Object.keys(P.AMB).map(function (k) { return P.AMB[k].n; });
  ok(Math.min.apply(null, ns) >= 3, '每關至少 3 個（不會空景）');
  ok(Math.max.apply(null, ns) <= 30, '最多 30 個（只有雪花例外，其餘都 ≤ 11）');
  const as = Object.keys(P.AMB).map(function (k) { return P.AMB[k].a; });
  ok(Math.max.apply(null, as) <= 1, '最大不透明度 ≤ 1（不過度搶戲）');
  ok(P.AMB.ice.n >= 12, '冰雪的雪量夠（' + P.AMB.ice.n + ' 片）');
  const rare = ['forest', 'lava', 'sea', 'dark', 'sky', 'sand'].filter(function (k) { return P.AMB[k].n <= 11; });
  ok(rare.length === 6, '落葉／火花／氣泡／蝙蝠／雲／沙霧都是「偶爾出現」級（3~11 個）');
}

// ================================================================
head('7. 版本與接線');
{
  ok(P.VERSION === '4.57', 'VERSION = 4.57');
  ok(P.VERSION_LOG[0].v === '4.57', '版本記錄第一條是 4.57');
  ok(P.VERSION_LOG[0].items.join(' ').indexOf('氛圍') >= 0, '版本記錄說明了場景氛圍');
  ok(P.VERSION_LOG[1].now === false, '上一版已取消 now');
  ok(typeof P.drawAmbient === 'function' && typeof P.AMB === 'object', '__BH 有匯出（可被後續版本驗證）');
}

console.log('\n----------------------------------------');
console.log('v4.57 氛圍層：' + pass + ' 項通過、' + fail + ' 項失敗');
process.exit(fail ? 1 : 0);
