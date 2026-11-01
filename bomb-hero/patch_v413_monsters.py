# -*- coding: utf-8 -*-
# v4.13 第三輪：小怪從 10 隻 → 20 隻 + 美術精緻化 + 四種技能
#   A 撿彈怪（scavenger）：撿起玩家放的炸彈 → 丟回玩家
#   B 拆彈怪（sapper）    ：把附近的炸彈拆掉（不會爆炸）
#   C 聰明怪（smart）      ：看到炸彈會找掩體躲（沿用 v4.8 的 fleeT 機制）
#   D 放彈怪（bomber）     ：會自己放炸彈，而且火焰只有 1 格
import io, os

HERE = os.path.dirname(os.path.abspath(__file__))
PATH = os.path.join(HERE, 'index.html')
src = io.open(PATH, encoding='utf-8', newline='').read()
text = src.replace('\r\n', '\n')

rules = []
def R(old, new):
    rules.append((old, new))

# ================================================================
# ① ENEMY_SPECIES：10 隻 → 20 隻（新增 10 隻，各有特色與技能）
# ================================================================
R(
"""const ENEMY_SPECIES = [
  { id: 'slime',  name: '史萊姆', kind: 'wander', wing: false, r: 14, spd: 42, color: '#7fd06a', color2: '#3f8f46' },
  { id: 'beetle', name: '鐵甲蟲', kind: 'chase',  wing: false, r: 15, spd: 50, color: '#b8794a', color2: '#6f4222' },
  { id: 'crab',   name: '螃蟹',   kind: 'wander', wing: false, r: 15, spd: 46, color: '#ff8f6b', color2: '#c04a30' },
  { id: 'skull',  name: '骷髏兵', kind: 'chase',  wing: false, r: 15, spd: 56, color: '#eef3ff', color2: '#96a6c0' },
  { id: 'mush',   name: '毒菇怪', kind: 'wander', wing: false, r: 14, spd: 38, color: '#e07ab0', color2: '#8d2f62' },
  { id: 'lizard', name: '疾風蜥', kind: 'chase',  wing: false, r: 13, spd: 84, color: '#79dba4', color2: '#2c8459' },
  { id: 'bat',    name: '蝙蝠',   kind: 'fly',    wing: true,  r: 13, spd: 30, color: '#9a86e8', color2: '#4c3d94' },
  { id: 'ghost',  name: '幽靈',   kind: 'fly',    wing: true,  r: 14, spd: 26, color: '#dfe9ff', color2: '#8fa6cc' },
  { id: 'bee',    name: '毒蜂',   kind: 'fly',    wing: true,  r: 12, spd: 36, color: '#ffd166', color2: '#a9761a' },
  { id: 'eye',    name: '眼球怪', kind: 'fly',    wing: true,  r: 13, spd: 29, color: '#f4f6ff', color2: '#b04a6a' }
];""",
"""// v4.13：小怪 10 隻 → 20 隻。
//   skill 欄位：
//     scavenger = 撿起玩家放的炸彈再丟回去（A）
//     sapper     = 拆掉附近的炸彈、不會爆炸（B）
//     smart      = 會找掩體躲炸彈（C，v4.8 起已有）
//     bomber     = 自己會放炸彈，火焰只有 1 格（D）
const ENEMY_SPECIES = [
  { id: 'slime',  name: '史萊姆', kind: 'wander', wing: false, r: 14, spd: 42, color: '#7fd06a', color2: '#3f8f46' },
  { id: 'beetle', name: '鐵甲蟲', kind: 'chase',  wing: false, r: 15, spd: 50, color: '#b8794a', color2: '#6f4222' },
  { id: 'crab',   name: '螃蟹',   kind: 'wander', wing: false, r: 15, spd: 46, color: '#ff8f6b', color2: '#c04a30' },
  { id: 'skull',  name: '骷髏兵', kind: 'chase',  wing: false, r: 15, spd: 56, color: '#eef3ff', color2: '#96a6c0' },
  { id: 'mush',   name: '毒菇怪', kind: 'wander', wing: false, r: 14, spd: 38, color: '#e07ab0', color2: '#8d2f62' },
  { id: 'lizard', name: '疾風蜥', kind: 'chase',  wing: false, r: 13, spd: 84, color: '#79dba4', color2: '#2c8459' },
  { id: 'bat',    name: '蝙蝠',   kind: 'fly',    wing: true,  r: 13, spd: 30, color: '#9a86e8', color2: '#4c3d94' },
  { id: 'ghost',  name: '幽靈',   kind: 'fly',    wing: true,  r: 14, spd: 26, color: '#dfe9ff', color2: '#8fa6cc' },
  { id: 'bee',    name: '毒蜂',   kind: 'fly',    wing: true,  r: 12, spd: 36, color: '#ffd166', color2: '#a9761a' },
  { id: 'eye',    name: '眼球怪', kind: 'fly',    wing: true,  r: 13, spd: 29, color: '#f4f6ff', color2: '#b04a6a' },
  // ── v4.13 新增 10 隻 ──
  { id: 'scavenger', name: '撿彈怪', kind: 'chase',  wing: false, r: 14, spd: 55, color: '#c9a227', color2: '#7a5c10', skill: 'scavenger' },
  { id: 'sapper',    name: '拆彈怪', kind: 'wander', wing: false, r: 15, spd: 44, color: '#5fbf9a', color2: '#2c6b54', skill: 'sapper' },
  { id: 'bomber',    name: '放彈怪', kind: 'chase',  wing: false, r: 15, spd: 47, color: '#e8615c', color2: '#8c2b28', skill: 'bomber' },
  { id: 'panda',     name: '貓熊',   kind: 'wander', wing: false, r: 17, spd: 31, color: '#f2f0e6', color2: '#33322c' },
  { id: 'penguin',   name: '企鵝',   kind: 'wander', wing: false, r: 14, spd: 62, color: '#4a6fa5', color2: '#22344f' },
  { id: 'octopus',   name: '章魚',   kind: 'wander', wing: false, r: 15, spd: 36, color: '#c76fd6', color2: '#7a3b8c' },
  { id: 'robot',     name: '機器人', kind: 'chase',  wing: false, r: 15, spd: 52, color: '#9fb0c6', color2: '#4d5a70' },
  { id: 'wisp',      name: '鬼火',   kind: 'fly',    wing: true,  r: 12, spd: 47, color: '#a6f5dc', color2: '#35a184' },
  { id: 'wizard',    name: '小巫師', kind: 'chase',  wing: false, r: 14, spd: 49, color: '#7f6fe0', color2: '#443a8c' },
  { id: 'hornet',    name: '大黃蜂', kind: 'fly',    wing: true,  r: 15, spd: 58, color: '#ffb02e', color2: '#a86a0c' }
];"""
)

# ================================================================
# ② makeEnemy：帶入 skill + 血量（沿用 FOE_HP，但 BOSS 除外）
# ================================================================
R(
"""  if (sp.id === 'skull' || sp.id === 'crab' || sp.id === 'beetle' || sp.id === 'eye') e.smart = true;  // v4.8：聰明小怪會找掩體躲炸彈""",
"""  if (sp.id === 'skull' || sp.id === 'crab' || sp.id === 'beetle' || sp.id === 'eye') e.smart = true;   // v4.8：聰明小怪會找掩體躲炸彈
  // v4.13：技能（C 聰明躲炸彈 / A 撿彈 / B 拆彈 / D 放彈）
  if (sp.skill) e.skill = sp.skill;
  if (sp.skill === 'smart') e.smart = true;
  if (sp.skill === 'bomber') e.bombT = 1.2 + Math.random() * 1.6;    // 放彈冷卻
  if (sp.skill === 'sapper') e.defuseT = 1.5 + Math.random() * 1.5;  // 拆彈冷卻
  if (sp.skill === 'scavenger') e.grabT = 1.8 + Math.random() * 1.6;  // 撿彈冷卻"""
)

# ================================================================
# ③ 關卡出怪池：把新種也放進去
# ================================================================
R(
"""    const ground = ['slime', 'beetle', 'crab', 'skull', 'mush', 'lizard'];
    const flying = ['bat', 'ghost', 'bee', 'eye'];
    const types = stage <= 1 ? ['slime', 'slime', 'beetle']
      : stage <= 2 ? ground.slice(0, 3)
      : stage <= 3 ? ground.slice(0, 4).concat(['bat'])
      : stage <= 4 ? ground.slice(0, 4).concat(['bat', 'ghost'])
      : stage <= 5 ? ground.slice(0, 5).concat(['bat', 'ghost', 'bee'])
      : stage <= 6 ? ground.slice(0, 5).concat(flying.slice(0, 3))
      : ground.concat(flying);""",
"""    // v4.13：10 隻 → 20 隻（每隻都有特色與技能）
    const ground = ['slime', 'beetle', 'crab', 'skull', 'mush', 'lizard', 'panda', 'penguin', 'octopus', 'robot'];
    const flying = ['bat', 'ghost', 'bee', 'eye', 'wisp', 'hornet'];
    const skills = ['scavenger', 'sapper', 'bomber', 'wizard'];
    const types = stage <= 1 ? ['slime', 'slime', 'beetle']
      : stage <= 2 ? ground.slice(0, 3)
      : stage <= 3 ? ground.slice(0, 5).concat(['bat'])
      : stage <= 4 ? ground.slice(0, 6).concat(['bat', 'ghost'])
      : stage <= 5 ? ground.slice(0, 8).concat(['bat', 'ghost', 'bee'])
      : stage <= 6 ? ground.concat(flying.slice(0, 3))
      : ground.concat(flying).concat(skills);"""
)

# RPG 的怪池也加新種
R(
"""  const ground = ['slime', 'beetle', 'crab', 'skull', 'mush', 'lizard'];
  const flying = ['bat', 'ghost', 'bee', 'eye'];
  if (stage <= 2) return ground.slice(0, 3);
  if (stage <= 5) return ground.slice(0, 4).concat(['bat']);
  if (stage <= 9) return ground.slice(0, 5).concat(flying.slice(0, 2));
  if (stage <= 16) return ground.concat(flying.slice(0, 3));
  return ground.concat(flying);""",
"""  // v4.13：新增的 10 隻也進 RPG 怪池
  const ground = ['slime', 'beetle', 'crab', 'skull', 'mush', 'lizard', 'panda', 'penguin', 'octopus', 'robot'];
  const flying = ['bat', 'ghost', 'bee', 'eye', 'wisp', 'hornet'];
  const skills = ['scavenger', 'sapper', 'bomber', 'wizard'];
  if (stage <= 2) return ground.slice(0, 3);
  if (stage <= 5) return ground.slice(0, 4).concat(['bat']);
  if (stage <= 9) return ground.slice(0, 5).concat(flying.slice(0, 2));
  if (stage <= 16) return ground.concat(flying.slice(0, 3)).concat(skills.slice(0, 2));
  return ground.concat(flying).concat(skills);"""
)

# ================================================================
# ④ 四種技能的 AI（在 updateEnemy 裡）
# ================================================================
R(
"""  // v4.8：聰明小怪看到炸彈會找最近的「安全格」躲（牆會擋爆炸＝掩體）
  if (e.smart) {""",
"""  // v4.13：四種技能的 AI
  if (e.skill) enemySkillTick(e, dt);
  // v4.8：聰明小怪看到炸彈會找最近的「安全格」躲（牆會擋爆炸＝掩體）
  if (e.smart) {"""
)

# ================================================================
# ⑤ enemySkillTick：新增函式
# ================================================================
R(
"""// BFS 找最近的「不是危險格」的格子，回傳第一步方向（牆會擋爆炸＝掩體）""",
"""// v4.13：小怪技能 AI
//   A scavenger：撿起玩家放的炸彈 → 往玩家方向丟回去
//   B sapper    ：拆掉附近玩家的炸彈（拆掉不會爆炸）
//   D bomber    ：自己放炸彈，火焰只有 1 格
function enemySkillTick(e, dt) {
  const T = Game.T;
  const cx = Math.floor(e.x / T), cy = Math.floor(e.y / T);

  // ---- A. 撿彈怪：撿起炸彈再丟回去 ----
  if (e.skill === 'scavenger') {
    e.grabT = (e.grabT || 0) - dt;
    if (e.grabT <= 0 && !e.carryBomb) {
      // 找最近的、不是自己放的炸彈
      let best = null, bestD = 1e9;
      for (let i = 0; i < Game.bombs.length; i++) {
        const b = Game.bombs[i];
        if (b.held || b.flying || b.moving) continue;
        if (b.owner === e) continue;
        const d = Math.abs(b.cx - cx) + Math.abs(b.cy - cy);
        if (d <= 2 && d < bestD) { bestD = d; best = b; }
      }
      if (best) {
        // 撿起來（從場上移除，放進小怪手上）
        const idx = Game.bombs.indexOf(best);
        if (idx >= 0) Game.bombs.splice(idx, 1);
        e.carryBomb = { cx: best.cx, cy: best.cy, power: best.power || 2, timer: 2.4,
                        owner: e, passers: [], remoteArmed: false, mine: false, mineLife: 10,
                        moving: null, flying: null, held: false, seed: Math.random() * 6.28, armT: 40 };
        e.grabT = 1.4;
        burst(e.x, e.y, '#ffd166', 8, 140);
      }
    }
    // 手上有炸彈 → 往最近玩家丟回去
    if (e.carryBomb) {
      let best = null, bd = 1e9;
      Game.players.forEach(function (p) {
        if (!p.alive) return;
        const d = Math.abs(p.x - e.x) + Math.abs(p.y - e.y);
        if (d < bd) { bd = d; best = p; }
      });
      if (best) {
        const dx = Math.sign(best.x - e.x), dy = Math.sign(best.y - e.y);
        const d = (Math.abs(best.x - e.x) > Math.abs(best.y - e.y))
          ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        const dir = DIRS[d] || DIRS.right;
        const land = findLanding(cx, cy, dir.x, dir.y, false, true, e);
        if (land) {
          const cb = e.carryBomb;
          e.carryBomb = null;
          cb.cx = land.x; cb.cy = land.y;
          cb.flying = { fx: cx, fy: cy, tx: land.x, ty: land.y, t: 0, dur: .34,
                        path: land.path || [{ x: cx, y: cy }, { x: land.x, y: land.y }] };
          cb.px = (cx + .5) * T; cb.py = (cy + .5) * T;
          Game.bombs.push(cb);
          e.grabT = 2.6;
        }
      }
    }
    return;
  }

  // ---- B. 拆彈怪：拆掉附近的炸彈（不會爆炸）----
  if (e.skill === 'sapper') {
    e.defuseT = (e.defuseT || 0) - dt;
    if (e.defuseT <= 0) {
      let target = null, bestD = 1e9;
      for (let i = 0; i < Game.bombs.length; i++) {
        const b = Game.bombs[i];
        if (b.held || b.flying || b.moving) continue;
        if (b.owner === e) continue;
        const d = Math.abs(b.cx - cx) + Math.abs(b.cy - cy);
        if (d <= 1 && d < bestD) { bestD = d; target = b; }
      }
      if (target) {
        const idx = Game.bombs.indexOf(target);
        if (idx >= 0) Game.bombs.splice(idx, 1);   // 直接消失 → 不會爆炸
        burst(target.cx * T + T / 2, target.cy * T + T / 2, '#7ee0a5', 10, 120);
        e.defuseT = 2.4;
      }
    }
    return;
  }

  // ---- D. 放彈怪：自己放炸彈，火焰只有 1 格 ----
  if (e.skill === 'bomber') {
    e.bombT = (e.bombT || 0) - dt;
    if (e.bombT <= 0) {
      // 找身邊一個空格放彈
      const opts = [];
      ['up', 'down', 'left', 'right'].forEach(function (dn) {
        const d = DIRS[dn];
        const nx = cx + d.x, ny = cy + d.y;
        if (cellAt(nx, ny) === 0 && !bombAt(nx, ny)) opts.push([nx, ny]);
      });
      if (opts.length) {
        const pickc = opts[Math.floor(Math.random() * opts.length)];
        Game.bombs.push({
          cx: pickc[0], cy: pickc[1], px: pickc[0] * T + T / 2, py: pickc[1] * T + T / 2,
          timer: 2.2, power: 1,                 // v4.13：放彈怪的火焰只有 1 格
          owner: e, passers: [], remoteArmed: false, mine: false, mineLife: 10,
          moving: null, flying: null, held: false, seed: Math.random() * 6.28, armT: 40
        });
        e.bombT = 3.4 + Math.random() * 2.2;
      }
    }
    return;
  }
}
// BFS 找最近的「不是危險格」的格子，回傳第一步方向（牆會擋爆炸＝掩體）"""
)

# ================================================================
# ⑥ 美術：新增 10 隻的精緻造型（加在 eye 之後、預設分支之前）
# ================================================================
R(
"""  // 眼球怪
  wings(yb - R * .1, 1.25, .5);""",
"""  // ── v4.13 新增 10 隻的精緻造型 ──
  if (sp === 'scavenger') {
    // 撿彈怪：金色小精靈＋背上的大布袋（手上抱著炸彈）
    ctx.fillStyle = dk;
    ctx.beginPath(); ctx.ellipse(x + look * R * .55, yb + R * .18, R * .62, R * .58, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(x + look * R * .55, yb + R * .18, R * .54, R * .5, 0, 0, 6.283); ctx.fill();
    // 布袋
    ctx.fillStyle = '#6b4a1e';
    ctx.beginPath(); ctx.ellipse(x - look * R * .55, yb + R * .34, R * .48, R * .44, 0, 0, 6.283); ctx.fill();
    ctx.strokeStyle = '#c9a227'; ctx.lineWidth = Math.max(1.2, R * .07);
    ctx.beginPath(); ctx.moveTo(x - look * R * .78, yb + R * .12); ctx.lineTo(x - look * R * .4, yb + R * .04); ctx.stroke();
    ctx.lineWidth = 1;
    // 頭
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(x, yb - R * .48, R * .48, 0, 6.283); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.32)';
    ctx.beginPath(); ctx.ellipse(x - R * .16, yb - R * .66, R * .2, R * .11, -.5, 0, 6.283); ctx.fill();
    eyes(0, -R * .52, R * .1, R * .13);
    // 尖耳
    [-1, 1].forEach(function (sd) {
      ctx.fillStyle = dk;
      ctx.beginPath();
      ctx.moveTo(x + sd * R * .26, yb - R * .82);
      ctx.lineTo(x + sd * R * .46, yb - R * 1.24);
      ctx.lineTo(x + sd * R * .1, yb - R * .92);
      ctx.closePath(); ctx.fill();
    });
    return;
  }
  if (sp === 'sapper') {
    // 拆彈怪：墨綠工具兵＋頭上的工具與扳手
    ctx.strokeStyle = dk; ctx.lineWidth = Math.max(1.4, R * .1); ctx.lineCap = 'round';
    [-1, 1].forEach(function (sd) {
      ctx.beginPath();
      ctx.moveTo(x + sd * R * .34, yb + R * .18);
      ctx.lineTo(x + sd * R * .5, yb + R * .82);
      ctx.stroke();
    });
    ctx.lineWidth = 1;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - R * .5, yb - R * .04, R, R * .92, R * .26) : ctx.arc(x, yb + R * .42, R * .5, 0, 6.283);
    if (!ctx.roundRect) ctx.fill(); else ctx.fill();
    // 工具腰帶
    ctx.fillStyle = '#3b2a18';
    ctx.fillRect(x - R * .5, yb + R * .38, R, R * .16);
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(x - R * .12, yb + R * .38, R * .24, R * .16);
    // 頭 + 安全帽
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(x, yb - R * .4, R * .46, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#ffc247';
    ctx.beginPath(); ctx.arc(x, yb - R * .52, R * .48, Math.PI, 0); ctx.fill();
    ctx.fillRect(x - R * .54, yb - R * .54, R * 1.08, R * .13);
    // 頭燈
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x + look * R * .2, yb - R * .62, R * .13, 0, 6.283); ctx.fill();
    eyes(0, -R * .34, R * .09, R * .11);
    // 扳手
    ctx.strokeStyle = '#b9c4d6'; ctx.lineWidth = Math.max(1.3, R * .09);
    ctx.beginPath(); ctx.moveTo(x + look * R * .58, yb + R * .42); ctx.lineTo(x + look * R * .78, yb - R * .1); ctx.stroke();
    ctx.lineWidth = 1;
    return;
  }
  if (sp === 'bomber') {
    // 放彈怪：紅色小惡魔＋背上的炸彈包
    ctx.fillStyle = dk;
    ctx.beginPath(); ctx.ellipse(x, yb + R * .24, R * .78, R * .68, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(x, yb + R * .2, R * .7, R * .6, 0, 0, 6.283); ctx.fill();
    // 背上的炸彈
    ctx.fillStyle = '#2a2e38';
    ctx.beginPath(); ctx.arc(x - look * R * .52, yb - R * .1, R * .34, 0, 6.283); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.3)';
    ctx.beginPath(); ctx.ellipse(x - look * R * .6, yb - R * .2, R * .12, R * .07, -.5, 0, 6.283); ctx.fill();
    ctx.strokeStyle = '#c9a06a'; ctx.lineWidth = Math.max(1, R * .06);
    ctx.beginPath(); ctx.moveTo(x - look * R * .5, yb - R * .4); ctx.quadraticCurveTo(x - look * R * .3, yb - R * .72, x - look * R * .44, yb - R * .8); ctx.stroke();
    ctx.lineWidth = 1;
    // 頭 + 角
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(x, yb - R * .5, R * .5, 0, 6.283); ctx.fill();
    [-1, 1].forEach(function (sd) {
      ctx.fillStyle = dk;
      ctx.beginPath();
      ctx.moveTo(x + sd * R * .22, yb - R * .88);
      ctx.lineTo(x + sd * R * .5, yb - R * 1.26);
      ctx.lineTo(x + sd * R * .04, yb - R * .96);
      ctx.closePath(); ctx.fill();
    });
    eyes(0, -R * .54, R * .1, R * .14);
    // 嘴 + 牙
    ctx.fillStyle = '#3a1010';
    ctx.beginPath(); ctx.ellipse(x, yb - R * .2, R * .26, R * .12, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(x - R * .14, yb - R * .3); ctx.lineTo(x - R * .04, yb - R * .12); ctx.lineTo(x + R * .06, yb - R * .3); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + R * .04, yb - R * .3); ctx.lineTo(x + R * .14, yb - R * .12); ctx.lineTo(x + R * .22, yb - R * .3); ctx.closePath(); ctx.fill();
    return;
  }
  if (sp === 'panda') {
    // 貓熊：黑白圓身＋黑眼圈
    ctx.fillStyle = dk;
    ctx.beginPath(); ctx.ellipse(x, yb + R * .24, R * .96, R * .84, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(x, yb + R * .2, R * .86, R * .76, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = dk;
    ctx.beginPath(); ctx.arc(x, yb - R * .38, R * .58, 0, 6.283); ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(x, yb - R * .22, R * .3, R * .24, 0, 0, 6.283); ctx.fill();
    // 黑眼圈
    [-1, 1].forEach(function (sd) {
      ctx.fillStyle = 'rgba(40,40,36,.85)';
      ctx.beginPath(); ctx.ellipse(x + sd * R * .24, yb - R * .44, R * .15, R * .19, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(x + sd * R * .24, yb - R * .46, R * .06, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#22201c';
      ctx.beginPath(); ctx.arc(x + sd * R * .25, yb - R * .46, R * .03, 0, 6.283); ctx.fill();
    });
    // 圓耳
    [-1, 1].forEach(function (sd) {
      ctx.fillStyle = dk;
      ctx.beginPath(); ctx.arc(x + sd * R * .42, yb - R * .82, R * .2, 0, 6.283); ctx.fill();
    });
    // 鼻
    ctx.fillStyle = '#22201c';
    ctx.beginPath(); ctx.ellipse(x, yb - R * .16, R * .1, R * .07, 0, 0, 6.283); ctx.fill();
    return;
  }
  if (sp === 'penguin') {
    // 企鵝：圓胖身＋白肚皮＋左右腳
    ctx.fillStyle = dk;
    ctx.beginPath(); ctx.ellipse(x, yb + R * .2, R * .82, R * .92, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(x, yb + R * .16, R * .74, R * .84, 0, 0, 6.283); ctx.fill();
    // 白肚皮
    ctx.fillStyle = '#f4f7fb';
    ctx.beginPath(); ctx.ellipse(x, yb + R * .38, R * .48, R * .54, 0, 0, 6.283); ctx.fill();
    // 頭
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(x, yb - R * .52, R * .48, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#f4f7fb';
    ctx.beginPath(); ctx.ellipse(x + look * R * .08, yb - R * .46, R * .34, R * .34, 0, 0, 6.283); ctx.fill();
    eyes(look * R * .1, -R * .5, R * .08, R * .11);
    // 橘喙
    ctx.fillStyle = '#ffa32e';
    ctx.beginPath(); ctx.moveTo(x + look * R * .06, yb - R * .34); ctx.lineTo(x + look * R * .48, yb - R * .26);
    ctx.lineTo(x + look * R * .06, yb - R * .18); ctx.closePath(); ctx.fill();
    // 腳
    ctx.fillStyle = '#ffa32e';
    [-1, 1].forEach(function (sd) {
      ctx.beginPath(); ctx.ellipse(x + sd * R * .28, yb + R * .92, R * .18, R * .08, 0, 0, 6.283); ctx.fill();
    });
    return;
  }
  if (sp === 'octopus') {
    // 章魚：圓頭＋八條會彎曲的觸手
    ctx.strokeStyle = dk; ctx.lineWidth = Math.max(1.6, R * .13); ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const sd = i < 4 ? -1 : 1;
      const k = i % 4;
      const bx = x + sd * (R * .3 + k * R * .2);
      const wig = Math.sin(t * 4 + i * 1.1) * R * .16;
      ctx.beginPath();
      ctx.moveTo(bx, yb + R * .3);
      ctx.quadraticCurveTo(bx + wig, yb + R * .68, bx + wig * .6, yb + R * 1.02);
      ctx.stroke();
    }
    ctx.lineWidth = 1;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(x, yb - R * .16, R * .78, 0, 6.283); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.24)';
    ctx.beginPath(); ctx.ellipse(x - R * .26, yb - R * .38, R * .24, R * .13, -.4, 0, 6.283); ctx.fill();
    eyes(0, -R * .24, R * .13, R * .18);
    return;
  }
  if (sp === 'robot') {
    // 機器人：方頭＋天線＋紅色單眼
    ctx.fillStyle = dk;
    ctx.fillRect(x - R * .54, yb - R * .3, R * 1.08, R * 1.02);
    ctx.fillStyle = col;
    ctx.fillRect(x - R * .46, yb - R * .22, R * .92, R * .86);
    // 頭（方形）
    ctx.fillStyle = dk;
    ctx.fillRect(x - R * .56, yb - R * .98, R * 1.12, R * .7);
    ctx.fillStyle = col;
    ctx.fillRect(x - R * .48, yb - R * .92, R * .96, R * .58);
    // 天線 + 紅眼
    ctx.strokeStyle = '#8b97ad'; ctx.lineWidth = Math.max(1.2, R * .08);
    ctx.beginPath(); ctx.moveTo(x, yb - R * .92); ctx.lineTo(x, yb - R * 1.24); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = '#ff5a4a';
    ctx.beginPath(); ctx.arc(x, yb - R * 1.3, R * .1, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#ff5a4a';
    ctx.beginPath(); ctx.arc(x, yb - R * .64, R * .16, 0, 6.283); ctx.fill();
    // 面板線
    ctx.strokeStyle = 'rgba(40,50,70,.6)'; ctx.lineWidth = 1;
    ctx.strokeRect(x - R * .3, yb - R * .06, R * .6, R * .34);
    ctx.beginPath(); ctx.moveTo(x - R * .22, yb + R * .04); ctx.lineTo(x - R * .22, yb + R * .22); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, yb + R * .04); ctx.lineTo(x, yb + R * .22); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + R * .22, yb + R * .04); ctx.lineTo(x + R * .22, yb + R * .22); ctx.stroke();
    // 手臂
    ctx.strokeStyle = dk; ctx.lineWidth = Math.max(1.4, R * .11);
    [-1, 1].forEach(function (sd) {
      ctx.beginPath();
      ctx.moveTo(x + sd * R * .52, yb + R * .12);
      ctx.lineTo(x + sd * R * .74, yb + R * .5);
      ctx.stroke();
    });
    ctx.lineWidth = 1;
    return;
  }
  if (sp === 'wisp') {
    // 鬼火：小火焰＋跳動的核心＋飄散的火星
    const wig = Math.sin(t * 5 + w) * R * .1;
    ctx.fillStyle = 'rgba(120,255,210,.24)';
    ctx.beginPath(); ctx.ellipse(x, yb - R * .1, R * .8, R * .92, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(x, yb - R * .16, R * .44, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#f2fffb';
    ctx.beginPath(); ctx.arc(x, yb - R * .2, R * .24, 0, 6.283); ctx.fill();
    // 火焰尾巴
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x - R * .3, yb - R * .24);
    ctx.quadraticCurveTo(x + wig, yb + R * .3, x + R * .3, yb - R * .24);
    ctx.quadraticCurveTo(x + wig * .5, yb - R * .06, x - R * .3, yb - R * .24);
    ctx.fill();
    // 火星
    for (let i = 0; i < 4; i++) {
      const ph = t * 2.6 + i * 1.6;
      const mx = x + Math.sin(ph * 2.1) * R * .6;
      const my = yb + R * .3 + ((ph % 1) * R * .5);
      ctx.fillStyle = 'rgba(180,255,225,.7)';
      ctx.beginPath(); ctx.arc(mx, my, R * .06, 0, 6.283); ctx.fill();
    }
    return;
  }
  if (sp === 'wizard') {
    // 小巫師：尖帽＋鬍鬚＋法杖
    ctx.fillStyle = dk;
    ctx.beginPath(); ctx.ellipse(x, yb + R * .3, R * .68, R * .56, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(x, yb + R * .26, R * .6, R * .48, 0, 0, 6.283); ctx.fill();
    // 尖帽
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x - R * .56, yb - R * .46);
    ctx.quadraticCurveTo(x - R * .1, yb - R * 1.42, x + R * .42, yb - R * .74);
    ctx.lineTo(x + R * .58, yb - R * .42);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = dk;
    ctx.beginPath(); ctx.ellipse(x, yb - R * .44, R * .62, R * .13, 0, 0, 6.283); ctx.fill();
    // 帽上的星星
    ctx.fillStyle = '#ffe08a';
    ctx.beginPath(); ctx.arc(x - R * .02, yb - R * .86, R * .1, 0, 6.283); ctx.fill();
    // 臉 + 鬍鬚
    ctx.fillStyle = '#f3d9b8';
    ctx.beginPath(); ctx.arc(x, yb - R * .3, R * .34, 0, 6.283); ctx.fill();
    eyes(0, -R * .34, R * .08, R * .1);
    ctx.fillStyle = '#f2f2f2';
    ctx.beginPath();
    ctx.moveTo(x - R * .3, yb - R * .16);
    ctx.quadraticCurveTo(x, yb + R * .34, x + R * .3, yb - R * .16);
    ctx.quadraticCurveTo(x, yb + R * .04, x - R * .3, yb - R * .16);
    ctx.fill();
    // 法杖
    ctx.strokeStyle = '#8a6b46'; ctx.lineWidth = Math.max(1.3, R * .09);
    ctx.beginPath(); ctx.moveTo(x + look * R * .74, yb + R * .9); ctx.lineTo(x + look * R * .8, yb - R * .7); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = '#8ef0d8';
    ctx.beginPath(); ctx.arc(x + look * R * .8, yb - R * .82, R * .16, 0, 6.283); ctx.fill();
    return;
  }
  if (sp === 'hornet') {
    // 大黃蜂：粗壯身體＋黑黃條紋＋尖針
    wings(yb - R * .34, 1.34, .58);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(x, yb + R * .06, R * .64, R * .54, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#2a2118';
    [-.2, .14, .44].forEach(function (o) {
      ctx.beginPath(); ctx.ellipse(x, yb + R * o, R * .64 * Math.sqrt(Math.max(.1, 1 - o * o * 1.2)), R * .11, 0, 0, 6.283); ctx.fill();
    });
    // 尾針
    ctx.fillStyle = '#3a2d1c';
    ctx.beginPath(); ctx.moveTo(x, yb + R * .58); ctx.lineTo(x - R * .1, yb + R * 1.0); ctx.lineTo(x + R * .12, yb + R * .58); ctx.closePath(); ctx.fill();
    // 頭
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(x + look * R * .1, yb - R * .42, R * .4, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#2a2118';
    ctx.beginPath(); ctx.ellipse(x + look * R * .28, yb - R * .48, R * .26, R * .22, 0, 0, 6.283); ctx.fill();
    eyes(look * R * .12, -R * .46, R * .1, R * .13);
    // 螫針
    ctx.strokeStyle = '#3a2d1c'; ctx.lineWidth = Math.max(1.1, R * .07);
    ctx.beginPath(); ctx.moveTo(x + look * R * .34, yb - R * .34); ctx.lineTo(x + look * R * .56, yb - R * .2); ctx.stroke();
    ctx.lineWidth = 1;
    return;
  }
  // 眼球怪
  wings(yb - R * .1, 1.25, .5);"""
)

# ================================================================
# ⑦ 匯出 enemySkillTick
# ================================================================
R(
"  controlAI: controlAI, dangerAt: dangerAt, findLanding: findLanding, playerAtCell: playerAtCell, playerAhead: playerAhead,",
"  controlAI: controlAI, dangerAt: dangerAt, findLanding: findLanding, playerAtCell: playerAtCell, playerAhead: playerAhead,\n"
"  enemySkillTick: enemySkillTick, ENEMY_SPECIES: ENEMY_SPECIES,"
)

# ---- 套用並斷言 ----
failed = []
for i, (old, new) in enumerate(rules, 1):
    c = text.count(old)
    if c != 1:
        failed.append((i, c, old[:100]))
        continue
    text = text.replace(old, new)

if failed:
    print("FAILED rules:")
    for i, c, ctx in failed:
        print("  #%d count=%d ctx=%r" % (i, c, ctx))
    print("No file written.")
else:
    out = text.replace('\n', '\r\n')
    io.open(PATH, 'w', encoding='utf-8', newline='').write(out)
    print("OK: all %d rules applied" % len(rules))
