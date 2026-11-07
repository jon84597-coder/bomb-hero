// verify-v526.js — v5.26 專屬驗證：場景第二層環境特效（慢的大氣）＋ 雜物加大
//   ① AMB2：八個主題各一組，型別與第一層完全不重複
//   ② 分層：地面層（角色之前）／飄浮層（角色之後），每組只在自己的圖層出現
//   ③ 純函式：不存粒子、不 push、不 random（逐幀重算）
//   ④ 實跑：八個主題都畫得出東西，而且八組的指令簽名兩兩不同
//   ⑤ 接線順序：慢的大氣疊在快粒子之後、教學卡之前
const { makeEnv, html, vlog } = require('./_sandbox');

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
const block = (src.match(/const AMB2 = \{[\s\S]*?\n\};/) || [''])[0];
const fnSrc = (src.match(/function drawAmbient2\(T, layer\) \{[\s\S]*?\n\}\n/) || [''])[0];

// ================================================================
head('1. AMB2：八個大關各一組慢速大氣');
{
  ok(!!block, '有 AMB2 氛圍表');
  const keys = (block.match(/^\s{2}(\w+):\s*\{/gm) || []).map(function (s) {
    return s.trim().replace(/\s*:\s*\{$/, '').replace(':', '');
  });
  ok(keys.length === 8, '八組（實際 ' + keys.length + '）');
  const miss = styles.filter(function (s) { return keys.indexOf(s) < 0; });
  ok(miss.length === 0, '八個主題都有（缺：' + miss.join(',') + '）');
  // 八種效果互不重複，而且沒有一種跟第一層撞
  const k2 = {}, k1 = {};
  Object.keys(P.AMB2).forEach(function (k) { k2[P.AMB2[k].k] = k; });
  Object.keys(P.AMB).forEach(function (k) { k1[P.AMB[k].k] = k; });
  const u2 = Object.keys(k2).length;
  ok(u2 === 8, '第二層八種型別互不重複（實際 ' + u2 + ' 種：' + Object.keys(k2).join(',') + '）');
  const clash = Object.keys(k2).filter(function (k) { return k1[k]; });
  ok(clash.length === 0, '跟第一層不撞型別（撞：' + clash.join(',') + '）');
  // 每個主題的兩層都要不一樣
  const same = styles.filter(function (s) { return P.AMB[s].k === P.AMB2[s].k; });
  ok(same.length === 0, '同一主題的兩層是不同的東西（重複：' + same.join(',') + '）');
}

// ================================================================
head('2. 分層：貼地的光走地面層，飄的東西走角色之後');
{
  const low = styles.filter(function (s) { return P.AMB2[s].ly === 0; });
  const high = styles.filter(function (s) { return P.AMB2[s].ly === 1; });
  ok(low.length === 3 && high.length === 5,
    '地面層 3 組／飄浮層 5 組（實測 ' + low.length + '/' + high.length + '）');
  // 地面層就是「貼在地面上的光」：林間光斑／熱氣／水下光網
  ok(P.AMB2.forest.k === 'dapple' && P.AMB2.sand.k === 'heat' && P.AMB2.sea.k === 'caustic',
    '地面層三組＝林間光斑／沙地熱氣／水下光網（正好都是貼地的光）');
  // 往上的東西（煙、鬼火）該在角色之後，不然會蓋住角色
  ok(P.AMB2.lava.ly === 1 && P.AMB2.dark.ly === 1, '煙與鬼火在角色之後（蓋住角色會很怪）');
  styles.forEach(function (s) {
    ok(P.AMB2[s].ly === 0 || P.AMB2[s].ly === 1, s + ' 的 ly 只有 0 或 1（' + P.AMB2[s].ly + '）');
  });
}

// ================================================================
head('3. 純函式：不存粒子、不累積、每幀重算');
{
  ok(!!fnSrc, '有 drawAmbient2(T, layer)');
  ok(!/\.push\(/.test(fnSrc), '沒有 push');
  ok(!/new Array|=\s*\[\]/.test(fnSrc), '沒有新建陣列');
  ok(!/Math\.random/.test(fnSrc), '沒有 Math.random（同一個 t 每次畫得一樣，不會抖）');
  ok(/Math\.sin\(ph \* Math\.PI\)/.test(fnSrc), '透明度走 sin(phase·π) → 淡入再淡出');
  ok(/isFinite\(px\)/.test(fnSrc), '有 NaN 防護（縮放算出 NaN 只跳過那一顆）');
  ok(/d\.ly !== layer/.test(fnSrc), '不是自己的圖層就直接 return（零成本）');
  // 兩層的速度要錯開，否則看起來是同一層
  const slow = styles.filter(function (s) {
    const a = P.AMB[s], b = P.AMB2[s];
    return Math.abs(b.vx) + Math.abs(b.vy) < Math.abs(a.vx) + Math.abs(a.vy);
  });
  ok(slow.length >= 5, '至少 5 個主題的第二層比第一層慢（實測 ' + slow.length + '/8）—— 速度差才有景深');
}

// ================================================================
head('4. 實跑：八個主題各畫一次（只在自己的圖層）');
{
  G.zoom = 1; G.camX = 120; G.camY = 90; G.gameT = 17.4;
  const sigs = {};
  styles.forEach(function (st) {
    const th = P.THEMES.filter(function (t) { return t.style === st; })[0];
    G.theme = th;
    const want = P.AMB2[st].ly;
    [0, 1].forEach(function (ly) {
      rec.calls.length = 0; rec.sets.length = 0;
      P.drawAmbient2(60, ly);
      const n = rec.calls.length;
      if (ly === want) {
        ok(n > 0, st + ' 在自己那層畫出東西（' + n + ' 個指令）');
        ok(rec.calls.some(function (c) { return c[0] === 'save'; }) &&
           rec.calls.some(function (c) { return c[0] === 'restore'; }), st + '：save/restore 成對');
        // 簽名＝「呼叫次數 + 方法名序列 + 用到的 fillStyle」：
        //   只比方法名不夠（dapple 與 smoke 都是 ellipse→fill），
        //   加上次數與顏色就能分辨出是不同畫法。
        sigs[st] = n + '|' + rec.calls.map(function (c) { return c[0]; }).join(',') + '|' +
          rec.sets.filter(function (s) { return s[0] === 'fillStyle' && typeof s[1] === 'string'; })
            .map(function (s) { return s[1]; }).join(';') + '|' +
          // 漸層物件在沙盒裡是同一個 mock（toString 都是 [object Object]）→
          //   補上每顆的 globalAlpha（每個場景的 a 不同、相位也不同）
          rec.sets.filter(function (s) { return s[0] === 'globalAlpha' && typeof s[1] === 'number'; })
            .map(function (s) { return s[1].toFixed(3); }).join(';');
      } else {
        ok(n === 0, st + ' 不在另一層畫（' + n + ' 個指令）');
      }
    });
  });
  const uniq = Object.keys(sigs).filter(function (k, i, a) {
    return a.map(function (x) { return sigs[x]; }).indexOf(sigs[k]) === i;
  });
  ok(uniq.length === 8, '八組的繪製指令簽名兩兩不同（' + uniq.length + '/8）');
  // 加法混合只用在「光是加亮」的效果上，而且都有還原
  const light = ['dapple', 'heat', 'ray', 'caustic', 'beam', 'wisp'];
  const useLighter = rawComposite(fnSrc);
  ok(light.every(function (k) { return useLighter.indexOf(k) >= 0; }),
    '六種光效果都用 lighter（加亮，不會把底下的畫面糊掉）：' + useLighter.join(','));
  const offs = (fnSrc.match(/globalCompositeOperation = 'source-over'/g) || []).length;
  ok(offs >= 5, 'lighter 用完都有切回 source-over（' + offs + ' 處）—— 漏了會讓後面全部變加亮');
}

// 從原始碼裡找出「哪些效果用了 lighter」：看每個分支裡有沒有 globalCompositeOperation = 'lighter'
function rawComposite(fn) {
  const out = [];
  const parts = fn.split(/d\.k === '/).slice(1);
  parts.forEach(function (p) {
    const k = p.slice(0, p.indexOf("'"));
    if (/globalCompositeOperation = 'lighter'/.test(p)) out.push(k);
  });
  return out;
}

// ================================================================
head('5. 接線：慢的大氣疊在快粒子之後、教學卡之前');
{
  const i0 = src.indexOf('drawAmbient2(T, 0)');
  const i1 = src.indexOf('drawAmbient2(T, 1)');
  const a0 = src.indexOf('drawAmbient(T, 0)');
  const a1 = src.indexOf('drawAmbient(T, 1)');
  const iPlayer = src.indexOf('drawPlayer(p, T)');
  const iTut = src.indexOf('Tut.drawWorld(ctx)');
  ok(i0 > a0 && i1 > a1, '兩層都是「先快粒子、再慢大氣」');
  ok(i0 < iPlayer, '地面層在角色之前');
  ok(i1 > iPlayer, '飄浮層在角色之後');
  ok(i1 < iTut, '飄浮層在教學卡之前（不蓋住提示）');
  ok(/__BH/.test(src) && !!P.AMB2 && !!P.drawAmbient2, '__BH 有匯出（可被測試呼叫）');
}

// ================================================================
head('6. 雜物再放大（使用者：可以再明顯一點、大一點）');
{
  const a = html.indexOf('function paintGroundExtra');
  const b = html.indexOf('function paintFloorStyle');
  const g = html.slice(a, b);
  ok(/g\.scale\(2\.6, 2\.6\)/.test(g), '雜物從 2.1 倍放大到 2.6 倍（60px 的格子 → 雜物 16~20px）');
  ok(/ellipse\(cx, cy \+ T \* \.048, T \* \.100, T \* \.034/.test(g), '接觸陰影同步放大（不然放大後像浮著）');
  ok(/const step = dgHash\(x, y, 29\) < \.22 \? 2 : 3;/.test(g),
    '密度 2~3 格混著用（覆蓋率 31% → 37%，但沒有整張變密）');
  ok(/const k = \(\(hs \/ step\) \| 0\) % 3;/.test(g), '三種輪替的寫法沒被改壞');
  // 雨後積水：只有草原／沙地，約 5.5% 的格子（最便宜的「自然感」，不會被誤認成機關）
  ok(/\(st === 'forest' \|\| st === 'sand'\) && dgHash\(x, y, 67\) < \.055/.test(g),
    '草原／沙地有雨後積水（5.5% 的格子）');
  ok(/const an = i \/ 9 \* 6\.283, rr = wr \* \(\.72 \+ dgHash\(x \+ i, y, 89\) \* \.5\)/.test(g),
    '積水是不規則邊（9 個頂點各自擾動）—— 正圓看起來像水溝蓋');
  ok(!/wr[\s\S]{0,400}?fillRect/.test(g.slice(g.indexOf('①-b 雨後積水'), g.indexOf('② 主題小雜物'))),
    '積水不用 fillRect（才不會被「牆腳碎屑」的偵測誤判）');
  // 熔岩灰燼堆：橢圓放大後是一坨灰圓 → 改成不規則土堆 + 餘燼光
  ok(/灰燼堆：暗灰的不規則土堆/.test(g) && /for \(let i = 0; i < 7; i\+\+\)/.test(g),
    '熔岩灰燼堆是 7 頂點的不規則土堆（不是兩顆橢圓疊起來的灰圓）');
  ok(/const eg = g\.createRadialGradient\(cx \+ T \* \.010, cy, 0/.test(g),
    '灰燼堆中間有一點橘色餘燼（看得出是「燒過的」而不是「髒污」）');
}

// ================================================================
head('7. 順手修：切回音樂的曲目判斷');
{
  ok(/function curBGM\(\) \{/.test(src), '有 curBGM()（目前畫面該播哪一首）');
  ok(/if \(Screen\.current !== 'game'\) return 'menu';/.test(src), '不在遊戲畫面 → 主選單曲');
  ok(/if \(Game\.mode === 'battle'\) return 'battle';/.test(src), '對戰 → 對戰曲');
  ok(/return stageBGM\(Game\.stage\);/.test(src), '其餘（單人／RPG／大逃殺）→ 該關卡的主題曲');
  const n = (src.match(/startBGM\(curBGM\(\)\)/g) || []).length;
  ok(n === 2, '兩條路徑（關掉再開／拖音量）都走同一個判斷（實測 ' + n + ' 處）');
  ok(!/startBGM\(Screen\.current === 'game' \?/.test(src), '沒有留下寫死曲目的舊寫法');
}

// ================================================================
head('8. 版本');
{
  const m = /const VERSION = '(\d+)\.(\d+)'/.exec(src);
  ok(!!m, 'VERSION 格式');
  ok(!!m && (+m[1] > 5 || (+m[1] === 5 && +m[2] >= 26)), 'VERSION ≥ 5.26（' + (m ? m[1] + '.' + m[2] : '?') + '）');
  // v5.38：紀錄搬到 js/version-log.js
  const log0 = /VERSION_LOG = \[\s*\{\s*v: '([\d.]+)'/.exec(vlog);
  ok(!!log0 && log0[1] === (m ? m[1] + '.' + m[2] : ''), '版本記錄第一筆＝目前版本');
}

console.log('\n----------------------------------------');
console.log('v5.26 場景特效：' + pass + ' 項通過、' + fail + ' 項失敗');
process.exit(fail ? 1 : 0);
