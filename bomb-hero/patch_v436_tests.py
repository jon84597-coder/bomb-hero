# -*- coding: utf-8 -*-
"""v4.36：把「舊行為基線」的測試斷言更新成 v4.36 的新設計
   —— 這些不是 bug，是測試還在驗 v4.17/v4.33 的舊規格。
"""
import io, sys

def edit(path, pairs):
    s = io.open(path, encoding='utf-8', newline='').read()
    crlf = '\r\n' in s
    t = s.replace('\r\n', '\n')
    for old, new, tag in pairs:
        c = t.count(old)
        assert c == 1, '%s [%s] 預期 1 次，實際 %d 次' % (path, tag, c)
        t = t.replace(old, new)
        print('  ok [%s]' % tag)
    out = t.replace('\n', '\r\n') if crlf else t
    io.open(path, 'w', encoding='utf-8', newline='').write(out)

# ── 1. verify-v24：第 4 關改成章節魔王關，小怪減量 → 種類數不再遞增 ──
edit('test/verify-v24.js', [(
"""ok(t4.size > t1.size, '第 4 關種類比第 1 關多（' + t4.size + ' > ' + t1.size + '）');""",
"""// v4.36：第 4 關改成「章節魔王關」，小怪只留 6 成 → 種類數不能拿來跟前幾關比
ok(t7.size > t1.size, '第 7 關種類比第 1 關多（' + t7.size + ' > ' + t1.size + '）');
ok(t4.size >= 2, '第 4 關（章節魔王關）仍有小怪陪打（' + t4.size + ' 種）');""",
'v24-types')])

# ── 2. verify-v26：小龍吐火 2 格 → 扇形 3 格；紅龍 8 格 → 四方向扇形 ──
edit('test/verify-v26.js', [
(
"""// 吐火：只有面前 2 格
G.flames.length = 0; p7.fireCd = 0; p7.facing = 'right';
P.fireBreath(p7);
const oneDir = cellsOfFlames();
ok(oneDir.length === 2, '小龍只燒面前一個方向 2 格（' + oneDir.length + ' 格）');
ok(oneDir.every(function (k) { return k.indexOf((pcx + 1) + ',') === 0 || k.indexOf((pcx + 2) + ',') === 0; }),
  '小龍火焰在右側（面朝右）');""",
"""// 吐火：v4.36 改成「扇形 3 格」——正的 3 格 ＋ 前 2 格左右各溢 1 格
G.flames.length = 0; p7.fireCd = 0; p7.facing = 'right';
P.fireBreath(p7);
const oneDir = cellsOfFlames();
const RANGE26 = P.DINO_FIRE_RANGE;
ok(RANGE26 >= 3, '小龍吐火範圍 ≥ 3 格（DINO_FIRE_RANGE=' + RANGE26 + '）');
const straight26 = [];
for (let i = 1; i <= RANGE26; i++) straight26.push((pcx + i) + ',' + pcy);
ok(straight26.every(function (k) { return oneDir.indexOf(k) >= 0; }),
  '小龍正前方 ' + RANGE26 + ' 格都燒到（面朝右）');
ok(oneDir.indexOf((pcx + 1) + ',' + (pcy - 1)) >= 0 && oneDir.indexOf((pcx + 1) + ',' + (pcy + 1)) >= 0,
  '小龍前 2 格左右有溢火（對手斜著站也燒得到）');
ok(oneDir.length >= RANGE26 + 2, '小龍火焰共 ' + oneDir.length + ' 格（≥ ' + (RANGE26 + 2) + '）');""",
'v26-one-dir'),
(
"""ok(fourDir.length === 8, '剛好 8 格火焰（' + fourDir.length + '）');""",
"""ok(fourDir.length >= 24, '紅龍火焰鋪滿四方向扇形（' + fourDir.length + ' 格）');""",
'v26-four-count'),
(
"""  ok(cellsOfFlames().length === 8, '朝 ' + dn + ' 時一樣是四方向 8 格');""",
"""  const fc26 = cellsOfFlames();
  const hit26 = [
    (pcx + 1) + ',' + pcy, (pcx - 1) + ',' + pcy,
    pcx + ',' + (pcy + 1), pcx + ',' + (pcy - 1)
  ].filter(function (k) { return fc26.indexOf(k) >= 0; }).length;
  ok(hit26 === 4 && fc26.length >= 24,
    '朝 ' + dn + ' 時一樣是四方向（四格都燒到、共 ' + fc26.length + ' 格）');""",
'v26-four-dir'),
])

# ── 3. verify-v34：v4.17 的 SOLO_WAVE 表 → v4.36 的平滑成長＋上限 12 ──
edit('test/verify-v34.js', [
(
"""ok(/const SOLO_WAVE = \\[8, 11, 12, 15, 16, 19, 20\\];/.test(html),
  'v4.17：小怪變多 —— 前 7 關 [8,11,12,15,16,19,20]（第 8 關後連續成長，上限 26）');""",
"""ok(/const base0 = Math\\.round\\(4 \\+ stage \\* \\.25\\);/.test(html),
  'v4.36：小怪量改成隨關卡平滑成長（4 + stage × .25）');""",
'v34-wave'),
(
"""ok(G.enemies.length === 8, '普通・第 1 關 = 8 隻小怪（v4.17：原本 6，實測 ' + G.enemies.length + '）');
freshSolo(3);
ok(G.enemies.length === 12, '普通・第 3 關 = 12 隻（v4.17：原本 9，實測 ' + G.enemies.length + '）');
freshSolo(7);
ok(G.enemies.length === 20, '普通・第 7 關 = 20 隻（v4.17：原本 15，實測 ' + G.enemies.length + '）');""",
"""const mobsOf = function () {
  return G.enemies.filter(function (e) { return e.type !== 'boss'; }).length;
};
ok(P.FOE_MAX_LIVE === 12, '每場最多 12 隻小怪（FOE_MAX_LIVE=' + P.FOE_MAX_LIVE + '）');
const c34 = [];
for (let st = 1; st <= 32; st++) { freshSolo(st); c34.push(mobsOf()); }
ok(c34.every(function (n) { return n <= P.FOE_MAX_LIVE; }),
  '32 關全部不超過 12 隻（最大 ' + Math.max.apply(null, c34) + '）');
ok(c34[0] >= 2 && c34[0] <= 6, '普通・第 1 關 2～6 隻小怪（實測 ' + c34[0] + '）');
ok(Math.max.apply(null, c34) >= 9, '後段關卡仍有 9 隻以上（最大 ' + Math.max.apply(null, c34) + '）');
const bossLow = [4, 8, 12, 16, 20, 24, 28].filter(function (st) { return !(c34[st - 1] < c34[st - 2]); });
ok(bossLow.length === 0,
  '章節魔王關的小怪比前一關少（留力氣打王）' + (bossLow.length ? '：' + bossLow.join(',') : ''));""",
'v34-count'),
])

# ── 4. verify-v59：炸彈多 0.35 秒保護期 + 章節魔王 ──
edit('test/verify-v59.js', [
(
"""    mine: false, mineLife: 10, moving: null, flying: null, held: false, ownerLeft: true, seed: 1, armT: 40
  };""",
"""    mine: false, mineLife: 10, moving: null, flying: null, held: false, ownerLeft: true, seed: 1, armT: 40,
    age: 1                                     // v4.36：1 秒 = 超過 0.35 秒保護期，視為「放一陣子了」
  };""",
'v59-putbomb'),
(
"""      const wantBoss = st >= 32 ? 1 : 0;        // v4.16：只有第 32 關有 BOSS""",
"""      // v4.36：每大關第 4 張（4／8…28）是章節魔王，第 32 關是最終魔王
      const wantBoss = (st >= 32 || (st % 4 === 0)) ? 1 : 0;""",
'v59-wantboss'),
(
"""      if (wantBoss) {
        const b = G.enemies.filter(function (e) { return e.type === 'boss'; })[0];
        const want = 12;
        if (b.maxHp !== want) bad.push(st + ':hp' + b.maxHp + '/' + want);
      }""",
"""      if (wantBoss) {
        const b = G.enemies.filter(function (e) { return e.type === 'boss'; })[0];
        const want = st >= 32 ? 12 : (4 + Math.ceil(st / 4));   // 章節魔王 5～11、最終 12
        if (b.maxHp !== want) bad.push(st + ':hp' + b.maxHp + '/' + want);
      }""",
'v59-hp'),
])

# ── 5. verify-v61：只有第 32 關有 BOSS → 章節魔王也出王 ──
edit('test/verify-v61.js', [
(
"""    const want = st === 32 ? 1 : 0;
    if (bosses.length !== want) bad.push(st + ':boss' + bosses.length + '/' + want);""",
"""    // v4.36：章節魔王（4／8…28）也出王，第 32 關是最終魔王
    const want = (st === 32 || (st % 4 === 0)) ? 1 : 0;
    if (bosses.length !== want) bad.push(st + ':boss' + bosses.length + '/' + want);""",
'v61-want'),
(
"""  ok(bad.length === 0, '32 關實際生成：只有第 32 關有 BOSS' + (bad.length ? '（' + bad.join(',') + '）' : ''));""",
"""  ok(bad.length === 0, '32 關實際生成：章節魔王（4／8…28）＋最終魔王（32）都有 BOSS' +
    (bad.length ? '（' + bad.join(',') + '）' : ''));""",
'v61-msg'),
])

# ── 6. verify-v62：小怪量公式 ──
edit('test/verify-v62.js', [
(
"""  ok(G.enemies.length === 8, '單人第 1 關 8 隻（原本 6，實測 ' + G.enemies.length + '）');
  ok(/const SOLO_WAVE = \\[8, 11, 12, 15, 16, 19, 20\\];/.test(css), '小怪量曲線往上調');
  ok(/Math\\.min\\(26, 17 \\+ Math\\.round\\(\\(stage - 7\\) \\* \\.55\\)\\)/.test(css), '第 8 關後改成 17 起跳、上限 26');""",
"""  ok(G.enemies.length >= 2 && G.enemies.length <= P.FOE_MAX_LIVE,
    '單人第 1 關 2～' + P.FOE_MAX_LIVE + ' 隻（實測 ' + G.enemies.length + '）');
  ok(/const base0 = Math\\.round\\(4 \\+ stage \\* \\.25\\);/.test(css),
    'v4.36：小怪量改成隨關卡平滑成長（4 + stage × .25）');
  ok(/Math\\.min\\(FOE_MAX_LIVE, Math\\.round\\(base \\* diff\\.enemy/.test(css),
    '每場都夾在 FOE_MAX_LIVE（12 隻）以內');""",
'v62-count'),
])

# ── 7. verify-v67：FOE_FX_STYLE 也有 `ice: {` → 材質表 regex 要指名 hard ──
edit('test/verify-v67.js', [
(
"""  const iceMat = /ice: \\{[\\s\\S]*?\\n  \\},/.exec(noCmt);""",
"""  // v4.36：FOE_FX_STYLE 也有一行 `ice: { glow: ... }` → 這裡要指名「下面接 hard:」才是 MAT.ice
  const iceMat = /ice: \\{\\s*\\n    hard: [\\s\\S]*?\\n  \\},/.exec(noCmt);""",
'v67-icemat'),
])

# ── 8. verify-v433：主角高度多乘一個角色體型係數 ──
edit('test/verify-v433.js', [
(
"""ok(src(/const rigH = R \\* 3\\.75 \\* HERO_ART_SCALE;/), '零件骨架高度乘上 HERO_ART_SCALE');
ok(src(/const H = R \\* 3\\.75 \\* HERO_ART_SCALE;/), '整張圖 fallback 也乘上 HERO_ART_SCALE');""",
"""// v4.36：豬／青蛙／小雞再縮 5% → 高度算式尾巴多一個 heroSizeK()
ok(src(/const rigH = R \\* 3\\.75 \\* HERO_ART_SCALE \\* heroSizeK\\(c\\.animal\\);/),
  '零件骨架高度乘上 HERO_ART_SCALE（再乘角色體型係數）');
ok(src(/const H = R \\* 3\\.75 \\* HERO_ART_SCALE \\* heroSizeK\\(c\\.animal\\);/),
  '整張圖 fallback 也乘上 HERO_ART_SCALE（再乘角色體型係數）');
ok(P.HERO_SIZE_K.pig === .95 && P.HERO_SIZE_K.frog === .95 && P.HERO_SIZE_K.chick === .95,
  '豬／青蛙／小雞都是 0.95（縮 5%）');
ok(P.heroSizeK('pig') === .95 && P.heroSizeK('dragon') === 1, 'heroSizeK() 只縮那三隻，其他不動');""",
'v433-scale'),
])

# ── 9. verify.js：撿彈要走真正的動作鍵路徑（v4.34 起 placeBomb 不再順手撿） ──
edit('test/verify.js', [
(
"""// 再按一次動作鍵（撿起）→ 用 edges 模擬：直接呼叫 placeBomb 第二次會撿起
BH.placeBomb(P);
ok(P.carry === G.bombs[0], '手套撿起炸彈');""",
"""// 再按一次動作鍵（撿起）。v4.36：剛放下的 0.35 秒內不撿、站在自己炸彈上也不撿
//   → 這裡模擬「放了一陣子、離開過這一格」，走真正的動作鍵分派（carry → 撿 → 放）
G.bombs[0].age = 1; G.bombs[0].ownerLeft = true;
key('Space', true); BH.controlHuman(P, 1 / 60); key('Space', false);
ok(P.carry === G.bombs[0], '手套撿起炸彈');""",
'v-glove1'),
(
"""G.bombs.length = 0;
BH.placeBomb(P); BH.placeBomb(P);
ok(P.carry, '撿起炸彈');""",
"""G.bombs.length = 0;
BH.placeBomb(P);
G.bombs[0].age = 1; G.bombs[0].ownerLeft = true;
key('Space', true); BH.controlHuman(P, 1 / 60); key('Space', false);
ok(P.carry, '撿起炸彈');""",
'v-glove2'),
])

print('all done')
