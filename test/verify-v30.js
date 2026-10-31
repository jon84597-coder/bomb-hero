// 無頭測試 v30：v2.4 的三項需求
//   1. 多人對戰 → 自己的角色頭上顯示醒目的「我」
//   2. BOSS 血條 → 打 5 下就贏
//   3. 小怪體積放大（判定半徑不變）
const { makeEnv, html } = require('./_sandbox');

const env = makeEnv();
const BH = env.BH, G = BH.Game, P = BH, rec = env.rec;

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}
function freshSolo(stage) {
  P.settings.size = 'M';
  P.settings.hazards = 'off';
  P.settings.sd = 'off';
  P.settings.ctrl = 'kb';
  P.settings.soloDiff = 'normal';
  P.settings.soloTime = 300;
  P.startSolo(stage || 1, false);
  G.state = 'play';
  if (G.players[0]) G.players[0].invuln = 0;
  return G.players[0];
}
function openField() {
  for (let y = 1; y < G.rows - 1; y++)
    for (let x = 1; x < G.cols - 1; x++) G.grid[y][x] = 0;
  G.bombs.length = 0; G.flames.length = 0; G.items.length = 0;
  G.enemies.length = 0; G.particles.length = 0; G.bubbles.length = 0;
  if (G.eggs) G.eggs.length = 0;
}
function textsDrawn() {
  return rec.calls.filter(function (c) { return c[0] === 'fillText'; })
                  .map(function (c) { return String(c[1]); });
}

// v2.6：小怪美術尺寸會跟著格子縮放（tileArtK）→ 量測一律用 PC 尺寸（T=62）
(function () {
  const sbx = env.sandbox, wrapEl = sbx.document.getElementById('stageWrap');
  const cvEl = sbx.document.getElementById('cv');
  wrapEl.clientWidth = 1280; wrapEl.clientHeight = 600;
  cvEl.clientWidth = 1280; cvEl.clientHeight = 600;
  P.resizeView();
  G.T = P.tileSize();
})();
ok(G.T === 62, '量測基準：格子 = PC 的 62（實測 T=' + G.T + '）');
ok(P.tileArtK() === 1, 'PC 尺寸下 tileArtK = 1（不縮放）');

console.log('\n=== 0. 版本 ===');
ok(P.VERSION === '4.0', '版本 = 4.0');
ok(/<span id="verTxt">4\.0<\/span>/.test(html), '徽章版本號同步 4.0');

// ================================================================
console.log('\n=== 1. 多人對戰：自己的角色頭上顯示「我」 ===');

ok(P.ME_BADGE_TXT === '我', '徽章文字是「我」');
ok(/const ME_BADGE_TXT = '我';/.test(html), '原始碼有 ME_BADGE_TXT = 我');
ok(/function isMyPlayer\(p\)/.test(html), '有 isMyPlayer() 判定誰是「我」');
ok(/function drawMeBadge\(x, y, R, T\)/.test(html), '有 drawMeBadge() 繪製牌子');
ok(/if \(Game\.mode === 'battle' && p\.alive && isMyPlayer\(p\)\) drawMeBadge\(/.test(html),
   'drawPlayer 在「對戰模式 + 存活 + 是我」時才畫牌子');

// --- isMyPlayer 行為 ---
ok(P.isMyPlayer(null) === false, 'null 不是我');
ok(P.isMyPlayer({ ai: true, slot: 0 }) === false, 'AI 電腦不是我');
ok(P.isMyPlayer({ ai: false, slot: 0 }) === true, '本機對戰：非 AI 的就是我');

// --- 線上對戰只認自己的座位 ---
const Net = P.Net;
const savedNet = { on: Net.on, pid: Net.pid, slotOf: Net.slotOf, mySlot: Net.mySlot };
Net.on = true; Net.pid = 'myPid'; Net.slotOf = { myPid: 2 }; Net.mySlot = 2;
ok(P.isMyPlayer({ ai: false, slot: 2 }) === true, '線上對戰：自己的座位（slot 2）顯示「我」');
ok(P.isMyPlayer({ ai: false, slot: 0 }) === false, '線上對戰：別的玩家不顯示「我」');
ok(P.isMyPlayer({ ai: true, slot: 2 }) === false, '線上對戰：AI 仍然不顯示');
Net.on = savedNet.on; Net.pid = savedNet.pid; Net.slotOf = savedNet.slotOf; Net.mySlot = savedNet.mySlot;

// --- 真的畫出來 ---
(function () {
  const p = freshSolo(1); openField();
  p.invuln = 0; p.alive = true; p.ai = false; p.slot = 0;
  G.mode = 'battle';
  rec.calls.length = 0;
  P.drawPlayer(p, G.T);
  const t = textsDrawn();
  ok(t.indexOf('我') >= 0, '對戰模式：自己的角色頭上真的畫出「我」');
  ok(t.filter(function (x) { return x === '我'; }).length >= 2,
     '「我」畫兩次（陰影 + 本體），任何背景都清楚');

  // 位置要在「名字名牌」上方
  const ft = rec.calls.filter(function (c) { return c[0] === 'fillText'; });
  const me = ft.filter(function (c) { return String(c[1]) === '我'; })[0];
  const name = ft.filter(function (c) { return String(c[1]) !== '我'; })[0];
  ok(!!me && !!name && me[3] < name[3],
     '「我」在名字名牌上方（y ' + (me && me[3].toFixed(0)) + ' < ' + (name && name[3].toFixed(0)) + '）');

  // 有柔光 + 牌子本體
  ok(rec.calls.some(function (c) { return c[0] === 'ellipse'; }) &&
     rec.calls.some(function (c) { return c[0] === 'quadraticCurveTo'; }),
     '牌子有圓角外框 + 底下柔光（混戰中也醒目）');

  // 會隨時間上下浮動（不會死板）
  const y1 = (function () {
    G.gameT = 0; rec.calls.length = 0; P.drawPlayer(p, G.T);
    const m = rec.calls.filter(function (c) { return c[0] === 'fillText' && String(c[1]) === '我'; })[0];
    return m ? m[3] : 0;
  })();
  const y2 = (function () {
    G.gameT = 0.3; rec.calls.length = 0; P.drawPlayer(p, G.T);
    const m = rec.calls.filter(function (c) { return c[0] === 'fillText' && String(c[1]) === '我'; })[0];
    return m ? m[3] : 0;
  })();
  ok(Math.abs(y1 - y2) > 0.5, '「我」牌子會輕微上下浮動（吸引注意）');
})();

// --- 不該出現的時候 ---
(function () {
  const p = freshSolo(1); openField();
  p.invuln = 0; p.alive = true; p.slot = 0;
  G.mode = 'battle'; p.ai = true;
  rec.calls.length = 0; P.drawPlayer(p, G.T);
  ok(textsDrawn().indexOf('我') < 0, '對戰模式：AI 角色頭上不出現「我」');

  p.ai = false; G.mode = 'solo';
  rec.calls.length = 0; P.drawPlayer(p, G.T);
  ok(textsDrawn().indexOf('我') < 0, '單人闖關：不出現「我」（只有一個人，不用標）');

  G.mode = 'battle'; p.alive = false;
  rec.calls.length = 0; P.drawPlayer(p, G.T);
  ok(textsDrawn().indexOf('我') < 0, '已淘汰（坐推車）的角色不出現「我」');
})();

// ================================================================
console.log('\n=== 2. BOSS 血條：打 5 下就贏 ===');

ok(P.BOSS_HITS === 5, 'BOSS_HITS = 5');
ok(P.SOLO_DIFF.easy.bossHp === 5 && P.SOLO_DIFF.normal.bossHp === 5 && P.SOLO_DIFF.hard.bossHp === 5,
   '三種難度的 BOSS 血量都改成 5（簡單 5／普通 5／困難 5）');
ok(/bossHp: BOSS_HITS/.test(html), '難度表直接引用 BOSS_HITS（單一來源，不會漏改）');
ok(P.SOLO_DIFF.easy.eggs === 3 && P.SOLO_DIFF.hard.eggs === 1, '難度差異保留在敵人數／恐龍蛋（不是靠血量）');

(function () {
  const b = P.makeBoss(5, 5, P.BOSS_HITS);
  ok(b.hp === 5 && b.maxHp === 5, 'makeBoss 產生 5 血的 BOSS（hp=' + b.hp + ' maxHp=' + b.maxHp + '）');
  ok(b.maxHp <= 5, '血條滿格最多 5 格');
})();

// 實測：用真的火焰傷害流程打 BOSS
(function () {
  const p = freshSolo(1); openField();
  G.enemies.length = 0;
  const boss = P.makeBoss(5, 5, P.BOSS_HITS);
  G.enemies.push(boss);
  p.invuln = 999;                       // 別讓玩家被 BOSS 撞死
  let hits = 0;
  function burnOnce() {
    boss.hitT = 0;                      // 上一發的短暫無敵結束
    G.flames.length = 0;
    G.flames.push({
      cx: Math.floor(boss.x / G.T), cy: Math.floor(boss.y / G.T),
      owner: p, t: .5, life: .5, type: 'c', dir: 0, src: null
    });
    P.updateBoss(boss, 1 / 60);
    if (boss.hitT > 0) hits++;
    G.flames.length = 0;
  }
  for (let i = 0; i < 4; i++) burnOnce();
  ok(hits === 4 && boss.hp === 1 && !boss.dead,
     '打 4 下：BOSS 還活著（hp=' + boss.hp + '）');
  burnOnce();
  ok(hits === 5 && boss.dead === true,
     '打第 5 下：BOSS 倒下（累計 ' + hits + ' 下）✓ 打五下就贏');
})();

// ================================================================
console.log('\n=== 3. 小怪體積放大 ===');

ok(typeof P.ENEMY_ART_MUL === 'number' && P.ENEMY_ART_MUL >= 1.35,
   '小怪外型放大倍率 ENEMY_ART_MUL = ' + P.ENEMY_ART_MUL + '（≥1.35）');
ok(/function enemyArtR\(e\) \{[\s\S]{0,200}base \* ENEMY_ART_MUL \* tileArtK\(\)/.test(html),
   '有 enemyArtR()：外型半徑 = 判定半徑 × 倍率 × 格子縮放（v2.6）');
ok(/const R = enemyArtR\(e\), sp = e\.spec/.test(html), 'drawEnemyArt 用放大後的半徑繪製');
ok(/const ar = enemyArtR\(e\);/.test(html) && /const sr = e\.boss \? e\.r \* \(e\.sizeMul \|\| 1\) \* tileArtK\(\) : ar;/.test(html),
   '影子也跟著放大（小怪看起來更結實，BOSS 影子也跟著格子縮放）');
ok(/drawDizzyMark\(x, y - ar \* 1\.15, T\)/.test(html), '頭暈標記跟著體型往上移');

// 判定半徑維持不變（不會因為變大就變難躲）
(function () {
  const ids = ['slime', 'beetle', 'crab', 'skull', 'mush', 'lizard', 'bat', 'ghost', 'bee', 'eye'];
  let same = true, minR = 99, maxR = 0;
  ids.forEach(function (id) {
    const sp = P.speciesOf(id);
    if (sp.r < 12 || sp.r > 16) same = false;
    minR = Math.min(minR, sp.r); maxR = Math.max(maxR, sp.r);
  });
  ok(same, '10 種小怪的判定半徑都維持原尺寸（' + minR + '~' + maxR + '，沒被放大 → 不會變難躲）');

  const e = P.makeEnemy(3, 3, 'slime', 1, 1);
  ok(e.r === P.speciesOf('slime').r, 'makeEnemy 產生的判定半徑 e.r 仍然是 ' + e.r);
  ok(Math.abs(P.enemyArtR(e) - e.r * P.ENEMY_ART_MUL) < 1e-9,
     '外型半徑 = ' + P.enemyArtR(e).toFixed(1) + '（e.r ' + e.r + ' × ' + P.ENEMY_ART_MUL + '）');
})();

// 真的畫出來：同一隻怪「舊尺寸 vs 新尺寸」的實際圖形半徑
(function () {
  function maxRadiusOf(e) {
    rec.calls.length = 0;
    P.drawEnemyArt(e, 200, 200, false, 0);
    let mx = 0;
    rec.calls.forEach(function (c) {
      if (c[0] === 'arc') mx = Math.max(mx, Math.abs(c[3] || 0));
      else if (c[0] === 'ellipse') mx = Math.max(mx, Math.abs(c[3] || 0), Math.abs(c[4] || 0));
      else if (c[0] === 'fillRect' || c[0] === 'strokeRect') mx = Math.max(mx, Math.abs(c[3] || 0) / 2, Math.abs(c[4] || 0) / 2);
    });
    return mx;
  }
  const ids = P.ENEMY_SPECIES.map(function (s) { return s.id; });
  let allBigger = true, worst = { id: '', ratio: 99 };
  ids.forEach(function (id) {
    const e = P.makeEnemy(3, 3, id, 1, 1);
    const now = maxRadiusOf(e);                               // v2.4 放大後
    const old = JSON.parse(JSON.stringify(e));
    old.r = e.r / P.ENEMY_ART_MUL;                            // 還原成 v2.3 的畫法
    const before = maxRadiusOf(old);
    const ratio = before > 0 ? now / before : 99;
    if (!(ratio > 1.3)) allBigger = false;
    if (ratio < worst.ratio) worst = { id: id, ratio: ratio };
  });
  ok(allBigger, '全部 ' + ids.length + ' 種小怪畫面體型都放大 1.4 倍左右（最小的一種：' +
     worst.id + ' ×' + worst.ratio.toFixed(2) + '）');
})();

console.log('\n' + (fail === 0 ? '✅' : '❌') + ' v2.4：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
