# -*- coding: utf-8 -*-
# v4.27 A 段：八大關卡小怪生態（48 隻）＋ 參數化小怪美術 ＋ 圖鑑分關
import io, sys

P = 'index.html'
raw = io.open(P, 'rb').read().decode('utf-8')
html = raw.replace('\r\n', '\n')
mode = 'crlf' if '\r\n' in raw else 'lf'

def once(old, new, label):
    global html
    n = html.count(old)
    assert n == 1, '%s -> %d' % (label, n)
    html = html.replace(old, new, 1)
    print('OK', label)

# ---------------------------------------------------------------
# 1. 新增 28 隻小怪（原本 20 隻 + 28 = 48）
# ---------------------------------------------------------------
NEW_SPECIES = """  { id: 'hornet',    name: '大黃蜂', kind: 'fly',    wing: true,  r: 15, spd: 58, color: '#ffb02e', color2: '#a86a0c' },
  // ===== v4.27：八大關卡生態系（新增 28 隻；20 + 28 = 8 關 × 6 隻 = 48 隻）=====
  //   art = 參數化繪製的原型（見 drawFoeArchetype）：
  //   blob／worm／critter／humanoid／bug／crystal／golem／machine／sprite／bird／shell／jelly／spike／ghost／ship
  // 第 1 大關 綠野草原（入門：全部地面怪、慢～中等）
  { id: 'frog',      name: '小青蛙',   en: 'Little Frog',  kind: 'wander', wing: false, r: 14, spd: 46, color: '#7ed957', color2: '#2f7a2a', art: 'critter', ears: 'none', trait: 'hop' },
  { id: 'bunny',     name: '蹦蹦兔',   en: 'Hopper Bunny', kind: 'chase',  wing: false, r: 14, spd: 56, color: '#f7e2ef', color2: '#c99ab5', art: 'critter', ears: 'long' },
  { id: 'cater',     name: '毛毛蟲',   en: 'Caterpillar',  kind: 'wander', wing: false, r: 13, spd: 32, color: '#9be15d', color2: '#4f8f2a', art: 'worm', segs: 4 },
  // 第 2 大關 沙漠遺跡（v4.26 互換後：慢～中等，開始會追人）
  { id: 'mummy',     name: '木乃伊小兵', en: 'Mummy Trooper', kind: 'chase', wing: false, r: 15, spd: 48, color: '#efe6cf', color2: '#b8a982', art: 'humanoid', band: true },
  { id: 'sandworm',  name: '流沙蟲',   en: 'Sand Worm',    kind: 'wander', wing: false, r: 14, spd: 30, color: '#dcb877', color2: '#8a6a38', art: 'worm', segs: 5 },
  { id: 'dune',      name: '沙丘獸',   en: 'Dune Beast',   kind: 'wander', wing: false, r: 16, spd: 42, color: '#e8cf9a', color2: '#b08a52', art: 'critter', ears: 'horn' },
  { id: 'scorp',     name: '沙地蠍子', en: 'Sand Scorpion', kind: 'chase', wing: false, r: 15, spd: 58, color: '#d9a03c', color2: '#8a5a18', art: 'bug', tail: true },
  // 第 3 大關 冰雪原（中等：飛行怪＋耐打）
  { id: 'snowball',  name: '雪球怪',   en: 'Snowball',     kind: 'wander', wing: false, r: 15, spd: 50, color: '#f6fbff', color2: '#bcd6ea', art: 'blob' },
  { id: 'seal',      name: '小海豹',   en: 'Baby Seal',    kind: 'wander', wing: false, r: 15, spd: 44, color: '#cfd9e8', color2: '#8c9db5', art: 'critter', ears: 'none' },
  { id: 'crystal',   name: '冰晶怪',   en: 'Ice Crystal',  kind: 'chase',  wing: false, r: 14, spd: 54, color: '#a8ecff', color2: '#3f8fc0', art: 'crystal' },
  // 第 4 大關 熔岩洞窟（中等偏難：硬、快、會放彈）
  { id: 'lavaslime', name: '熔岩史萊姆', en: 'Lava Slime', kind: 'wander', wing: false, r: 15, spd: 40, color: '#ff8a3c', color2: '#a8341a', art: 'blob', glow: true },
  { id: 'lavaworm',  name: '熔岩蠕蟲', en: 'Magma Grub',   kind: 'chase',  wing: false, r: 14, spd: 36, color: '#ff6a2a', color2: '#8c2a10', art: 'worm', segs: 4, glow: true },
  { id: 'rockling',  name: '岩石小怪', en: 'Rockling',     kind: 'chase',  wing: false, r: 16, spd: 38, color: '#8a6a5a', color2: '#4e3a30', art: 'golem' },
  // 第 5 大關 夜光彩城（進階：霓虹機械，快）
  { id: 'pulser',    name: '電音小怪', en: 'Pulse Sprite', kind: 'wander', wing: false, r: 14, spd: 60, color: '#ff5ce0', color2: '#8c1a7a', art: 'sprite', glow: true },
  { id: 'laserbee',  name: '雷射蜂',   en: 'Laser Bee',    kind: 'fly',    wing: true,  r: 13, spd: 40, color: '#b28cff', color2: '#5a2ea0', art: 'bird', glow: true },
  { id: 'neonbot',   name: '霓虹機器人', en: 'Neon Robot', kind: 'chase',  wing: false, r: 15, spd: 52, color: '#58f0d8', color2: '#1a8a9a', art: 'machine', glow: true },
  // 第 6 大關 深海遺跡（高難：緩慢但耐打、會追）
  { id: 'jelly',     name: '水母小怪', en: 'Jellyfish',    kind: 'fly',    wing: true,  r: 14, spd: 26, color: '#c8f0ff', color2: '#5f9ac0', art: 'jelly' },
  { id: 'hermit',    name: '寄居蟹兵', en: 'Hermit Trooper', kind: 'wander', wing: false, r: 16, spd: 34, color: '#e8b48a', color2: '#8a5a3a', art: 'shell' },
  { id: 'angler',    name: '燈籠魚',   en: 'Angler Fish',  kind: 'chase',  wing: false, r: 16, spd: 44, color: '#4a6fa5', color2: '#1f3552', art: 'critter', ears: 'fin', lure: true },
  { id: 'urchin',    name: '海膽怪',   en: 'Sea Urchin',   kind: 'wander', wing: false, r: 14, spd: 30, color: '#6b4a8c', color2: '#3a2050', art: 'spike' },
  // 第 7 大關 天空要塞（極難：全飛行、速度高）
  { id: 'airship',   name: '雲端小飛艇', en: 'Cloud Airship', kind: 'fly', wing: true,  r: 16, spd: 34, color: '#e8eef8', color2: '#9aa9c0', art: 'ship' },
  { id: 'windwisp',  name: '風精靈',   en: 'Wind Wisp',    kind: 'fly',    wing: true,  r: 13, spd: 50, color: '#d8fff4', color2: '#63c0a8', art: 'ghost', glow: true },
  { id: 'thunder',   name: '雷電球',   en: 'Thunder Orb',  kind: 'fly',    wing: true,  r: 13, spd: 46, color: '#fff28a', color2: '#b28c1a', art: 'spike', glow: true },
  { id: 'galehawk',  name: '疾風鷹',   en: 'Gale Hawk',    kind: 'fly',    wing: true,  r: 15, spd: 54, color: '#c9b28a', color2: '#7a5a2a', art: 'bird' },
  // 第 8 大關 暗黑魔王城（最難：追擊＋護甲＋會躲炸彈）
  { id: 'darkbat',   name: '暗黑蝙蝠', en: 'Dark Bat',     kind: 'fly',    wing: true,  r: 15, spd: 42, color: '#6a5a8c', color2: '#2a2040', art: 'bird' },
  { id: 'imp',       name: '暗黑小惡魔', en: 'Dark Imp',   kind: 'chase',  wing: false, r: 14, spd: 60, color: '#b06ef7', color2: '#4a1f7a', art: 'humanoid', ears: 'horn', tail: true },
  { id: 'royalguard', name: '魔王近衛軍', en: 'Royal Guard', kind: 'chase', wing: false, r: 17, spd: 46, color: '#7a2a3a', color2: '#2a0a12', art: 'humanoid', armor: true, ears: 'horn' },
  { id: 'deathknight', name: '死亡騎士', en: 'Death Knight', kind: 'chase', wing: false, r: 16, spd: 54, color: '#4a5a7a', color2: '#1a2230', art: 'humanoid', armor: true, skill: 'smart' }
];"""

once("""  { id: 'hornet',    name: '大黃蜂', kind: 'fly',    wing: true,  r: 15, spd: 58, color: '#ffb02e', color2: '#a86a0c' }
];""", NEW_SPECIES, '新增 28 隻小怪')

# ---------------------------------------------------------------
# 2. 關卡生態表（每關 6 隻）+ 分關 helper
# ---------------------------------------------------------------
ROSTER = """function speciesOf(id) {
  for (let i = 0; i < ENEMY_SPECIES.length; i++) { if (ENEMY_SPECIES[i].id === id) return ENEMY_SPECIES[i]; }
  return ENEMY_SPECIES[0];
}

// ================================================================
//   v4.27：八大關卡小怪生態（每關 6 隻，共 48 隻）
//   · 清單順序 = 登場順序 = 難度順序（前面的先出現）
//   · 32 張地圖切成 8 大關（每大關 4 張）：第 1~4 小關共用同一份名單，
//     但「登場種類」一關一關解鎖 —— 第 1 小關 4 種、第 2 小關 5 種、之後全員出場
//   · 第 2 大關是沙漠遺跡、第 4 大關是熔岩洞窟（v4.26 的關卡互換）
// ================================================================
const STAGE_ROSTER = [
  ['slime', 'bunny', 'frog', 'cater', 'mush', 'beetle'],                   // 1 綠野草原（全部地面怪：新手關不會被穿牆的追）
  ['crab', 'mummy', 'eye', 'sandworm', 'dune', 'scorp'],                   // 2 沙漠遺跡
  ['penguin', 'crystal', 'bat', 'snowball', 'seal', 'panda'],              // 3 冰雪原
  ['lavaslime', 'lavaworm', 'bee', 'bomber', 'lizard', 'rockling'],        // 4 熔岩洞窟
  ['wisp', 'scavenger', 'robot', 'pulser', 'laserbee', 'neonbot'],          // 5 夜光彩城
  ['octopus', 'angler', 'ghost', 'hermit', 'jelly', 'urchin'],              // 6 深海遺跡
  ['hornet', 'airship', 'sapper', 'thunder', 'windwisp', 'galehawk'],       // 7 天空要塞
  ['skull', 'imp', 'darkbat', 'wizard', 'royalguard', 'deathknight']        // 8 暗黑魔王城
];
// 把「第幾大關」寫回每一隻小怪（圖鑑分組、驗證都用這份，不要另外手寫）
STAGE_ROSTER.forEach(function (list, bi) {
  list.forEach(function (id) { const sp = speciesOf(id); if (sp) sp.stage = bi + 1; });
});
// 這張地圖屬於第幾大關（1~8）
function blockOf(stage) { return Math.max(1, Math.min(8, Math.ceil(((stage | 0) || 1) / 4))); }
// 這一關會出現的小怪名單（6 隻）
function stageRoster(stage) { return STAGE_ROSTER[blockOf(stage) - 1] || []; }
// 這一關實際會登場的種類（前 4 隻 → 全 6 隻）
function stageTypes(stage) {
  const list = stageRoster(stage);
  if (!list.length) return ['slime', 'beetle'];
  const sub = ((((stage | 0) || 1) - 1) % 4) + 1;   // 大關裡的第幾小關
  return list.slice(0, Math.max(2, Math.min(list.length, 3 + sub)));
}"""
once("""function speciesOf(id) {
  for (let i = 0; i < ENEMY_SPECIES.length; i++) { if (ENEMY_SPECIES[i].id === id) return ENEMY_SPECIES[i]; }
  return ENEMY_SPECIES[0];
}""", ROSTER, '關卡生態表')

# ---------------------------------------------------------------
# 3. 階級表：補上 28 隻
# ---------------------------------------------------------------
once("""  lizard: 'high', robot: 'high', bomber: 'high', wizard: 'high', hornet: 'high'
};""",
"""  lizard: 'high', robot: 'high', bomber: 'high', wizard: 'high', hornet: 'high',
  // v4.27：八大關卡新增的 28 隻（難度隨大關遞增）
  frog: 'low', bunny: 'low', cater: 'low',
  sandworm: 'low', dune: 'low', mummy: 'mid', scorp: 'mid',
  snowball: 'low', seal: 'low', crystal: 'mid',
  lavaslime: 'mid', lavaworm: 'low', rockling: 'mid',
  pulser: 'mid', laserbee: 'mid', neonbot: 'high',
  jelly: 'low', hermit: 'mid', urchin: 'mid', angler: 'mid',
  airship: 'mid', thunder: 'mid', windwisp: 'high', galehawk: 'high',
  darkbat: 'mid', imp: 'high', royalguard: 'high', deathknight: 'high'
};""", '階級表補 28 隻')

# ---------------------------------------------------------------
# 4. 生成邏輯改用生態表
# ---------------------------------------------------------------
once("""    // 20 種小怪：地面 10 種（會被牆擋住）＋ 飛行 6 種（有翅膀、可以越過牆）＋ 4 種技能怪
    const ground = ['slime', 'beetle', 'crab', 'skull', 'mush', 'lizard', 'panda', 'penguin', 'octopus', 'robot'];
    const flying = ['bat', 'ghost', 'bee', 'eye', 'wisp', 'hornet'];
    const skills = ['scavenger', 'sapper', 'bomber', 'wizard'];
    // v4.14：登場種類看「第幾關」（不是第幾大關）→ 前 8 關的節奏跟以前一樣，
    //   之後每 4~6 關再多放一批，最後階段 20 種全部出場
    const reg = stage <= 1 ? 0 : stage <= 2 ? 1 : stage <= 4 ? 2 : stage <= 7 ? 3
      : stage <= 12 ? 4 : stage <= 18 ? 5 : stage <= 24 ? 6 : 7;
    const types = reg <= 0 ? ['slime', 'slime', 'beetle']
      : reg === 1 ? ground.slice(0, 3)
      : reg === 2 ? ground.slice(0, 5).concat(['bat'])
      : reg === 3 ? ground.slice(0, 6).concat(['bat', 'ghost'])
      : reg === 4 ? ground.slice(0, 8).concat(['bat', 'ghost', 'bee'])
      : reg === 5 ? ground.concat(flying.slice(0, 3))
      : ground.concat(flying).concat(skills);""",
"""    // v4.27：小怪名單全部來自「八大關卡生態表」—— 同一個大關的 4 張地圖只會出現那 6 隻，
    //   玩家看主題就知道會遇到什麼，難度也隨大關一階一階上去。
    const types = stageTypes(stage);
    Game.roster = stageRoster(stage).slice();""", '生成改用生態表')

# ---------------------------------------------------------------
# 5. 參數化小怪美術
# ---------------------------------------------------------------
ART = r"""
// ================================================================
//   v4.27：新小怪的「參數化」繪製
//   48 隻不可能每隻手繪 30 行（那要 1,400 行），所以拆成 15 種身體原型 ＋ 配色 ＋
//   配件（耳朵／角／翅膀／殼／尾巴／護甲／發光）。每隻只要在 ENEMY_SPECIES 宣告
//   art: 'xxx'，就會長成那個樣子 —— 輪廓差異大、遠看也分得出來。
// ================================================================
function drawFoeArchetype(sp, x, y, R, col, dk, flash, kit) {
  const art = (sp && sp.art) || 'blob';
  const t = kit.t || 0, look = kit.look || 1, step = kit.step || 0;
  const fly = !!kit.fly;
  const w = kit.w || 0;
  const Y = y + (fly ? Math.sin(t * 3 + (sp.spd || 40) * .07) * R * .12 : 0);
  const glow = sp.glow && !flash;

  // 共用：眼睛（黑底＋高光；發光怪用亮瞳）
  function eyes(dx, dy, rx, ry, pupil) {
    ctx.fillStyle = flash ? '#fff' : '#141826';
    ctx.beginPath(); ctx.ellipse(x - rx * 1.25 + dx, Y + dy, rx, ry, 0, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + rx * 1.25 + dx, Y + dy, rx, ry, 0, 0, 6.283); ctx.fill();
    if (!flash) {
      ctx.fillStyle = pupil || '#fff';
      ctx.beginPath(); ctx.arc(x - rx * 1.45 + dx, Y + dy - ry * .34, rx * .32, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(x + rx * 1.05 + dx, Y + dy - ry * .34, rx * .32, 0, 6.283); ctx.fill();
    }
  }
  // 共用：頭上的光暈（熔岩／霓虹／風精靈）
  function halo(rad, color) {
    if (flash || !ctx.createRadialGradient) return;
    let g = null;
    try { g = ctx.createRadialGradient(x, Y, rad * .2, x, Y, rad); } catch (e) { return; }
    if (!g || !g.addColorStop) return;
    g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, Y, rad, 0, 6.283); ctx.fill();
  }
  function blobFoot() {
    ctx.fillStyle = dk;
    ctx.beginPath(); ctx.ellipse(x, Y + R * .80, R * .86, R * .17, 0, 0, 6.283); ctx.fill();
  }
  if (glow) halo(R * 1.35, 'rgba(255,220,140,.20)');

  // ---------- 果凍（雪球、熔岩史萊姆）----------
  if (art === 'blob') {
    const sq = 1 + Math.sin(t * 6 + w) * .08;
    blobFoot();
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(x, Y + R * .18, R * .96 / sq, R * .84 * sq, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.36)';
    ctx.beginPath(); ctx.ellipse(x - R * .30, Y - R * .18, R * .26, R * .16, -.5, 0, 6.283); ctx.fill();
    eyes(0, -R * .02, R * .12, R * .18);
    ctx.strokeStyle = '#141826'; ctx.lineWidth = Math.max(1, R * .09);
    ctx.beginPath(); ctx.arc(x, Y + R * .26, R * .17, .3, 2.84); ctx.stroke();
    ctx.lineWidth = 1;
    return;
  }

  // ---------- 蠕蟲（毛毛蟲、流沙蟲、熔岩蠕蟲）----------
  if (art === 'worm') {
    const n = sp.segs || 4;
    ctx.strokeStyle = dk; ctx.lineWidth = Math.max(1.2, R * .08); ctx.lineCap = 'round';
    for (let i = 0; i < n - 1; i++) {
      const lx = x - R * .55 + i * (R * 1.0 / (n - 1));
      const ly = Y + R * .44 + Math.sin(t * 5 + i) * R * .05;
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + step * 1.6, ly + R * .26); ctx.stroke();
    }
    ctx.lineWidth = 1;
    for (let i = n - 1; i >= 0; i--) {
      const sx = x + R * .58 - i * (R * 1.16 / (n - 1));
      const sy = Y + Math.sin(t * 5 + i * .9) * R * .10 + R * .12;
      const rr = R * (.42 - i * (.14 / n));
      ctx.fillStyle = (i % 2 === 0) ? col : dk;
      ctx.beginPath(); ctx.arc(sx, sy, rr, 0, 6.283); ctx.fill();
      if (i === 0) {
        ctx.fillStyle = 'rgba(255,255,255,.34)';
        ctx.beginPath(); ctx.arc(sx - rr * .3, sy - rr * .34, rr * .30, 0, 6.283); ctx.fill();
      }
    }
    eyes(R * .42, R * .04, R * .10, R * .14);
    return;
  }

  // ---------- 小動物（青蛙、兔、沙丘獸、海豹、燈籠魚）----------
  if (art === 'critter') {
    // 腳
    ctx.fillStyle = dk;
    [-1, 1].forEach(function (sd) {
      ctx.beginPath(); ctx.ellipse(x + sd * R * .40, Y + R * .56, R * .17, R * .11, 0, 0, 6.283); ctx.fill();
    });
    // 尾巴
    if (sp.ears === 'horn' || sp.tail) {
      ctx.strokeStyle = dk; ctx.lineWidth = Math.max(1.4, R * .10); ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - R * .62, Y + R * .18);
      ctx.quadraticCurveTo(x - R * 1.02, Y + R * .04, x - R * .96, Y - R * .26);
      ctx.stroke(); ctx.lineWidth = 1;
    }
    // 身體
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(x, Y + R * .20, R * .74, R * .62, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    ctx.beginPath(); ctx.ellipse(x - R * .18, Y - R * .02, R * .30, R * .18, -.4, 0, 6.283); ctx.fill();
    // 頭
    const hx = x + look * R * .24, hy = Y - R * .34;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(hx, hy, R * .54, 0, 6.283); ctx.fill();
    // 耳朵／鰭
    if (sp.ears === 'long') {
      ctx.fillStyle = col;
      [-1, 1].forEach(function (sd) {
        ctx.beginPath();
        ctx.ellipse(hx + sd * R * .20, hy - R * .56, R * .12, R * .42, sd * .18, 0, 6.283);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,150,180,.55)';
        ctx.beginPath();
        ctx.ellipse(hx + sd * R * .20, hy - R * .56, R * .06, R * .26, sd * .18, 0, 6.283);
        ctx.fill();
        ctx.fillStyle = col;
      });
    } else if (sp.ears === 'horn') {
      ctx.fillStyle = dk;
      [-1, 1].forEach(function (sd) {
        ctx.beginPath();
        ctx.moveTo(hx + sd * R * .30, hy - R * .34);
        ctx.lineTo(hx + sd * R * .46, hy - R * .86);
        ctx.lineTo(hx + sd * R * .10, hy - R * .44);
        ctx.closePath(); ctx.fill();
      });
    } else if (sp.ears === 'fin') {
      ctx.fillStyle = dk;
      [-1, 1].forEach(function (sd) {
        ctx.beginPath();
        ctx.moveTo(hx + sd * R * .42, hy - R * .10);
        ctx.lineTo(hx + sd * R * .74, hy - R * .34);
        ctx.lineTo(hx + sd * R * .44, hy + R * .16);
        ctx.closePath(); ctx.fill();
      });
    }
    // 眼睛（燈籠魚一大一小）
    eyes(look * R * .12, -R * .36, R * .12, R * .16);
    // 嘴
    ctx.fillStyle = dk;
    ctx.beginPath(); ctx.ellipse(hx, hy + R * .26, R * .16, R * .09, 0, 0, 6.283); ctx.fill();
    // 燈籠魚的提燈
    if (sp.lure) {
      ctx.strokeStyle = dk; ctx.lineWidth = Math.max(1.2, R * .07); ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hx + look * R * .10, hy - R * .48);
      ctx.quadraticCurveTo(hx + look * R * .44, hy - R * 1.02, hx + look * R * .16, hy - R * 1.16);
      ctx.stroke(); ctx.lineWidth = 1;
      if (!flash) {
        ctx.fillStyle = '#fff6b0';
        ctx.beginPath(); ctx.arc(hx + look * R * .16, hy - R * 1.16, R * .14, 0, 6.283); ctx.fill();
        ctx.fillStyle = 'rgba(255,240,140,.28)';
        ctx.beginPath(); ctx.arc(hx + look * R * .16, hy - R * 1.16, R * .32, 0, 6.283); ctx.fill();
      }
    }
    return;
  }

  // ---------- 人形（木乃伊、小惡魔、近衛軍、死亡騎士）----------
  if (art === 'humanoid') {
    // 腿
    ctx.fillStyle = dk;
    [-1, 1].forEach(function (sd) {
      ctx.fillRect(x + sd * R * .30 - R * .12, Y + R * .40, R * .24, R * .42 + (sd > 0 ? step * .6 : -step * .6));
    });
    // 身體
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x - R * .46, Y + R * .44);
    ctx.lineTo(x - R * .34, Y - R * .30);
    ctx.lineTo(x + R * .34, Y - R * .30);
    ctx.lineTo(x + R * .46, Y + R * .44);
    ctx.closePath(); ctx.fill();
    // 手臂
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, R * .18); ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - R * .40, Y - R * .16);
    ctx.lineTo(x - R * .72, Y + R * .20 + step);
    ctx.moveTo(x + R * .40, Y - R * .16);
    ctx.lineTo(x + R * .72, Y + R * .20 - step);
    ctx.stroke();
    ctx.lineWidth = 1;
    // 護甲
    if (sp.armor) {
      ctx.fillStyle = dk;
      ctx.beginPath();
      ctx.moveTo(x - R * .40, Y - R * .10);
      ctx.lineTo(x + R * .40, Y - R * .10);
      ctx.lineTo(x + R * .30, Y + R * .18);
      ctx.lineTo(x - R * .30, Y + R * .18);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.18)';
      ctx.fillRect(x - R * .28, Y - R * .06, R * .56, R * .05);
    }
    // 繃帶
    if (sp.band) {
      ctx.strokeStyle = 'rgba(180,160,120,.85)'; ctx.lineWidth = Math.max(1, R * .06);
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(x - R * .36, Y - R * .18 + i * R * .18);
        ctx.lineTo(x + R * .36, Y - R * .14 + i * R * .18);
        ctx.stroke();
      }
      ctx.lineWidth = 1;
    }
    // 頭
    const hy = Y - R * .58;
    ctx.fillStyle = sp.band ? '#f7f2e4' : col;
    ctx.beginPath(); ctx.arc(x, hy, R * .44, 0, 6.283); ctx.fill();
    // 角
    if (sp.ears === 'horn') {
      ctx.fillStyle = dk;
      [-1, 1].forEach(function (sd) {
        ctx.beginPath();
        ctx.moveTo(x + sd * R * .26, hy - R * .28);
        ctx.quadraticCurveTo(x + sd * R * .60, hy - R * .62, x + sd * R * .30, hy - R * .80);
        ctx.quadraticCurveTo(x + sd * R * .40, hy - R * .52, x + sd * R * .10, hy - R * .30);
        ctx.closePath(); ctx.fill();
      });
    }
    eyes(0, -R * .60, R * .10, R * .14, sp.armor ? '#ff6a6a' : '#fff');
    return;
  }

  // ---------- 甲蟲／蠍子 ----------
  if (art === 'bug') {
    ctx.strokeStyle = dk; ctx.lineWidth = Math.max(1.6, R * .12); ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i++) {
      const lx = x + i * R * .40;
      ctx.beginPath();
      ctx.moveTo(lx, Y + R * .40);
      ctx.quadraticCurveTo(lx + step * 1.4, Y + R * .74, lx + step * 2.4, Y + R * .92);
      ctx.stroke();
    }
    ctx.lineWidth = 1;
    // 尾巴（蠍子毒鉤）
    if (sp.tail) {
      ctx.strokeStyle = dk; ctx.lineWidth = Math.max(1.8, R * .14); ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - R * .70, Y + R * .16);
      ctx.quadraticCurveTo(x - R * 1.26, Y + R * .06, x - R * 1.06, Y - R * .52);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(x - R * 1.00, Y - R * .60, R * .16, 0, 6.283); ctx.fill();
    }
    ctx.fillStyle = dk;
    ctx.beginPath(); ctx.ellipse(x, Y + R * .14, R * 1.00, R * .88, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(x, Y + R * .06, R * .90, R * .76, 0, 0, 6.283); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.30)'; ctx.lineWidth = Math.max(1, R * .09);
    ctx.beginPath(); ctx.moveTo(x, Y - R * .66); ctx.lineTo(x, Y + R * .76); ctx.stroke();
    ctx.lineWidth = 1;
    // 螯
    ctx.fillStyle = dk;
    [-1, 1].forEach(function (sd) {
      ctx.beginPath();
      ctx.moveTo(x + sd * R * .82, Y - R * .10);
      ctx.lineTo(x + sd * R * 1.24, Y - R * .30 - step);
      ctx.lineTo(x + sd * R * .86, Y + R * .10);
      ctx.closePath(); ctx.fill();
    });
    eyes(0, -R * .10, R * .11, R * .15);
    return;
  }

  // ---------- 冰晶 ----------
  if (art === 'crystal') {
    for (let i = 0; i < 3; i++) {
      const hh = R * (i === 1 ? 1.42 : .96);
      const ox = (i - 1) * R * .44;
      ctx.fillStyle = i === 1 ? col : dk;
      ctx.beginPath();
      ctx.moveTo(x + ox, Y - hh * .72);
      ctx.lineTo(x + ox + R * .26, Y - hh * .10);
      ctx.lineTo(x + ox, Y + hh * .56);
      ctx.lineTo(x + ox - R * .26, Y - hh * .10);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      ctx.beginPath();
      ctx.moveTo(x + ox, Y - hh * .70);
      ctx.lineTo(x + ox + R * .10, Y - hh * .12);
      ctx.lineTo(x + ox, Y + hh * .10);
      ctx.closePath(); ctx.fill();
    }
    eyes(0, -R * .06, R * .10, R * .13);
    return;
  }

  // ---------- 岩石怪 ----------
  if (art === 'golem') {
    ctx.fillStyle = dk;
    ctx.beginPath();
    ctx.moveTo(x - R * .84, Y + R * .58);
    ctx.lineTo(x - R * .70, Y - R * .34);
    ctx.lineTo(x - R * .16, Y - R * .82);
    ctx.lineTo(x + R * .60, Y - R * .52);
    ctx.lineTo(x + R * .84, Y + R * .28);
    ctx.lineTo(x + R * .30, Y + R * .68);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x - R * .64, Y + R * .40);
    ctx.lineTo(x - R * .54, Y - R * .26);
    ctx.lineTo(x - R * .12, Y - R * .62);
    ctx.lineTo(x + R * .44, Y - R * .38);
    ctx.lineTo(x + R * .62, Y + R * .20);
    ctx.lineTo(x + R * .22, Y + R * .50);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = Math.max(1, R * .07);
    ctx.beginPath();
    ctx.moveTo(x - R * .30, Y - R * .52); ctx.lineTo(x - R * .10, Y - R * .10);
    ctx.lineTo(x + R * .22, Y + R * .06);
    ctx.moveTo(x + R * .10, Y + R * .44); ctx.lineTo(x + R * .30, Y + R * .12);
    ctx.stroke();
    ctx.lineWidth = 1;
    eyes(0, -R * .10, R * .11, R * .14);
    return;
  }

  // ---------- 機械（霓虹機器人）----------
  if (art === 'machine') {
    ctx.fillStyle = dk;
    ctx.fillRect(x - R * .56, Y + R * .46, R * 1.12, R * .30);
    ctx.fillStyle = 'rgba(255,255,255,.20)';
    ctx.fillRect(x - R * .50, Y + R * .52, R * 1.00, R * .06);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x - R * .62, Y + R * .46);
    ctx.lineTo(x - R * .54, Y - R * .42);
    ctx.lineTo(x + R * .54, Y - R * .42);
    ctx.lineTo(x + R * .62, Y + R * .46);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    ctx.fillRect(x - R * .42, Y - R * .34, R * .34, R * .70);
    // 面罩
    ctx.fillStyle = '#101a28';
    ctx.fillRect(x - R * .34, Y - R * .22, R * .68, R * .30);
    if (!flash) {
      ctx.fillStyle = '#8ffff0';
      ctx.fillRect(x - R * .26, Y - R * .16, R * .18, R * .10);
      ctx.fillRect(x + R * .08, Y - R * .16, R * .18, R * .10);
    }
    // 天線
    ctx.strokeStyle = dk; ctx.lineWidth = Math.max(1.2, R * .08);
    ctx.beginPath(); ctx.moveTo(x, Y - R * .42); ctx.lineTo(x, Y - R * .78); ctx.stroke();
    ctx.lineWidth = 1;
    if (!flash) {
      ctx.fillStyle = '#ff6a9a';
      ctx.beginPath(); ctx.arc(x, Y - R * .82, R * .10, 0, 6.283); ctx.fill();
    }
    return;
  }

  // ---------- 電音精靈 ----------
  if (art === 'sprite') {
    const pulse = .5 + Math.abs(Math.sin(t * 5)) * .5;
    if (!flash) {
      ctx.strokeStyle = 'rgba(255,120,230,' + (.30 + pulse * .40).toFixed(2) + ')';
      ctx.lineWidth = Math.max(1.4, R * .09);
      ctx.beginPath(); ctx.ellipse(x, Y + R * .06, R * (.86 + pulse * .12), R * .30, .5, 0, 6.283); ctx.stroke();
      ctx.lineWidth = 1;
    }
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(x, Y, R * .56, 0, 6.283); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.44)';
    ctx.beginPath(); ctx.arc(x - R * .16, Y - R * .18, R * .20, 0, 6.283); ctx.fill();
    eyes(0, -R * .04, R * .10, R * .14);
    // 音符火花
    if (!flash) {
      ctx.fillStyle = 'rgba(255,220,255,.85)';
      for (let i = 0; i < 3; i++) {
        const a = t * 2.4 + i * 2.1;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * R * .86, Y + Math.sin(a) * R * .56, R * .09, 0, 6.283);
        ctx.fill();
      }
    }
    return;
  }

  // ---------- 鳥／蝙蝠／蜂 ----------
  if (art === 'bird') {
    const flap = Math.sin(t * 14 + (sp.spd || 40)) ;
    ctx.fillStyle = flash ? '#fff' : 'rgba(255,255,255,.55)';
    [-1, 1].forEach(function (sd) {
      ctx.beginPath();
      ctx.moveTo(x + sd * R * .24, Y - R * .04);
      ctx.quadraticCurveTo(x + sd * R * .96, Y - R * (.34 + flap * .26), x + sd * R * 1.10, Y + R * .16);
      ctx.quadraticCurveTo(x + sd * R * .70, Y + R * .16, x + sd * R * .26, Y + R * .20);
      ctx.closePath(); ctx.fill();
    });
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(x, Y + R * .06, R * .60, R * .54, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = dk;
    ctx.beginPath();
    ctx.moveTo(x - R * .50, Y + R * .12);
    ctx.lineTo(x - R * .96, Y - R * .10);
    ctx.lineTo(x - R * .92, Y + R * .34);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f2b23c';
    ctx.beginPath();
    ctx.moveTo(x + look * R * .52, Y + R * .02);
    ctx.lineTo(x + look * R * .92, Y + R * .14);
    ctx.lineTo(x + look * R * .52, Y + R * .24);
    ctx.closePath(); ctx.fill();
    eyes(0, -R * .10, R * .10, R * .13);
    return;
  }

  // ---------- 寄居蟹（殼）----------
  if (art === 'shell') {
    ctx.strokeStyle = dk; ctx.lineWidth = Math.max(1.4, R * .10); ctx.lineCap = 'round';
    [-1, 1].forEach(function (sd) {
      for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        ctx.moveTo(x + sd * R * .30, Y + R * .30 + i * R * .14);
        ctx.lineTo(x + sd * R * .74, Y + R * .52 + i * R * .16 + step);
        ctx.stroke();
      }
    });
    ctx.lineWidth = 1;
    // 殼（螺旋）
    ctx.fillStyle = dk;
    ctx.beginPath(); ctx.arc(x - R * .16, Y - R * .10, R * .76, 0, 6.283); ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(x - R * .16, Y - R * .10, R * .64, 0, 6.283); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = Math.max(1.2, R * .08);
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.arc(x - R * .16, Y - R * .10, R * (.30 + i * .22), i * 1.2, i * 1.2 + 3.6);
      ctx.stroke();
    }
    ctx.lineWidth = 1;
    // 眼柄
    [-1, 1].forEach(function (sd) {
      ctx.strokeStyle = dk; ctx.lineWidth = Math.max(1.2, R * .08);
      ctx.beginPath();
      ctx.moveTo(x + R * .34, Y + R * .06);
      ctx.lineTo(x + sd * R * .34 + R * .10, Y - R * .46);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(x + sd * R * .34 + R * .10, Y - R * .50, R * .12, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#141826';
      ctx.beginPath(); ctx.arc(x + sd * R * .34 + R * .10, Y - R * .50, R * .06, 0, 6.283); ctx.fill();
    });
    return;
  }

  // ---------- 水母 ----------
  if (art === 'jelly') {
    const pulse = .5 + Math.abs(Math.sin(t * 2.6)) * .5;
    ctx.strokeStyle = dk; ctx.lineWidth = Math.max(1.2, R * .07); ctx.lineCap = 'round';
    for (let i = -2; i <= 2; i++) {
      const bx = x + i * R * .26;
      ctx.beginPath();
      ctx.moveTo(bx, Y + R * .30);
      ctx.quadraticCurveTo(bx + Math.sin(t * 3 + i) * R * .16, Y + R * .70, bx + Math.sin(t * 3 + i) * R * .22, Y + R * .96);
      ctx.stroke();
    }
    ctx.lineWidth = 1;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x - R * (.62 + pulse * .06), Y + R * .30);
    ctx.quadraticCurveTo(x - R * .70, Y - R * .62, x, Y - R * .66);
    ctx.quadraticCurveTo(x + R * .70, Y - R * .62, x + R * (.62 + pulse * .06), Y + R * .30);
    ctx.quadraticCurveTo(x, Y + R * .46, x - R * (.62 + pulse * .06), Y + R * .30);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.42)';
    ctx.beginPath(); ctx.ellipse(x - R * .22, Y - R * .34, R * .20, R * .12, -.3, 0, 6.283); ctx.fill();
    eyes(0, -R * .12, R * .10, R * .13);
    return;
  }

  // ---------- 尖刺球（海膽、雷電球）----------
  if (art === 'spike') {
    const sp2 = 8;
    ctx.strokeStyle = dk; ctx.lineWidth = Math.max(1.4, R * .10); ctx.lineCap = 'round';
    for (let i = 0; i < sp2; i++) {
      const a = i * (6.283 / sp2) + t * .8;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * R * .52, Y + Math.sin(a) * R * .52);
      ctx.lineTo(x + Math.cos(a) * R * 1.02, Y + Math.sin(a) * R * 1.02);
      ctx.stroke();
    }
    ctx.lineWidth = 1;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(x, Y, R * .60, 0, 6.283); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.34)';
    ctx.beginPath(); ctx.arc(x - R * .16, Y - R * .18, R * .18, 0, 6.283); ctx.fill();
    eyes(0, 0, R * .10, R * .13);
    return;
  }

  // ---------- 幽靈／風精靈 ----------
  if (art === 'ghost') {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(x, Y - R * .12, R * .62, 3.1416, 0);
    ctx.lineTo(x + R * .62, Y + R * .44);
    for (let i = 2; i >= -2; i--) {
      const wx = x + i * R * .248;
      const wy = Y + R * .44 + ((i % 2 === 0) ? R * .16 : -R * .06) + Math.sin(t * 6 + i) * R * .06;
      ctx.lineTo(wx, wy);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.30)';
    ctx.beginPath(); ctx.ellipse(x - R * .20, Y - R * .34, R * .18, R * .12, -.4, 0, 6.283); ctx.fill();
    eyes(0, -R * .16, R * .10, R * .13);
    return;
  }

  // ---------- 飛艇 ----------
  if (art === 'ship') {
    ctx.fillStyle = 'rgba(255,255,255,.30)';
    ctx.beginPath(); ctx.ellipse(x, Y - R * .30, R * .88, R * .56, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(x, Y - R * .32, R * .72, R * .48, 0, 0, 6.283); ctx.fill();
    ctx.strokeStyle = dk; ctx.lineWidth = Math.max(1.2, R * .07);
    ctx.beginPath(); ctx.moveTo(x - R * .72, Y - R * .32); ctx.lineTo(x + R * .72, Y - R * .32); ctx.stroke();
    ctx.lineWidth = 1;
    // 吊籃
    ctx.fillStyle = dk;
    ctx.beginPath();
    ctx.moveTo(x - R * .36, Y + R * .06);
    ctx.lineTo(x + R * .36, Y + R * .06);
    ctx.lineTo(x + R * .26, Y + R * .46);
    ctx.lineTo(x - R * .26, Y + R * .46);
    ctx.closePath(); ctx.fill();
    // 螺旋槳
    const p2 = Math.sin(t * 18) * R * .16;
    ctx.strokeStyle = 'rgba(230,240,255,.9)'; ctx.lineWidth = Math.max(1.2, R * .07);
    ctx.beginPath();
    ctx.moveTo(x + R * .36, Y + R * .26); ctx.lineTo(x + R * .36, Y + R * .26 + p2);
    ctx.stroke(); ctx.lineWidth = 1;
    // 窗
    ctx.fillStyle = '#8ffff0';
    ctx.beginPath(); ctx.arc(x, Y + R * .24, R * .12, 0, 6.283); ctx.fill();
    return;
  }

  // 保險：未知的 art → 畫成最基本的小果凍
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.ellipse(x, Y, R * .86, R * .78, 0, 0, 6.283); ctx.fill();
  eyes(0, 0, R * .12, R * .16);
}
"""
once("""    ctx.beginPath(); ctx.moveTo(x + look * R * .34, yb - R * .34); ctx.lineTo(x + look * R * .56, yb - R * .2); ctx.stroke();
    ctx.lineWidth = 1;
    return;
  }
  // 眼球怪""",
"""    ctx.beginPath(); ctx.moveTo(x + look * R * .34, yb - R * .34); ctx.lineTo(x + look * R * .56, yb - R * .2); ctx.stroke();
    ctx.lineWidth = 1;
    return;
  }

  // v4.27：以上都是手繪分支；新加入的 28 隻在 ENEMY_SPECIES 帶 art 欄位 → 走「參數化原型」。
  //   一定要放在下面「眼球怪」那段之前 —— 眼球怪是【無條件】繪製的預設款，
  //   若放在它後面，新怪會先被畫成一顆眼球、再疊上原型（兩張圖疊在一起）。
  //   舊的 20 隻沒有 art 欄位 → 直接穿過，照原樣走下面的手繪／眼球怪分支。
  const _asp = speciesOf(sp);
  if (_asp && _asp.art) {
    drawFoeArchetype(_asp, x, y, R, col, dk, flash, { t: t, w: w, look: look, step: step, fly: fly });
    return;
  }
  // 眼球怪""", '新小怪走參數化原型（插在眼球怪之前）')

# 原型繪製器本身插在 drawEnemyArt 【外面】（頂層函式），不可塞進函式體內
once("function drawEnemyArt(e, x, y, flash, wob) {", ART.strip() + "\n\nfunction drawEnemyArt(e, x, y, flash, wob) {", '原型繪製器（drawEnemyArt 之前）')

# ---------------------------------------------------------------
# 6. 圖鑑：改成八大關卡生態
# ---------------------------------------------------------------
HELPERS = r"""function foeName(id) {
  const k = id === 'mush' ? 'sp.shroom' : 'sp.' + id;
  const v = t(k);
  if (v && v !== k) return v;                 // 有翻譯就用翻譯
  const sp = speciesOf(id);                   // v4.27：新怪沒有逐語系翻譯 → 退回物種表的名字
  if (LANG === 'en' && sp && sp.en) return sp.en;
  return (sp && sp.name) || id;
}
// 速度用「人話」講，圖鑑比數字好懂（門檻對應 ENEMY_SPECIES 的 spd）
function foeSpeedWord(spd) {
  const v = spd || 0;
  if (v >= 62) return '極快';
  if (v >= 54) return '快';
  if (v >= 44) return '中';
  if (v >= 36) return '慢';
  return '很慢';
}
// 圖鑑說明：舊的 20 隻用手寫稿（含三語翻譯）；v4.27 新的 28 隻用行為自動組句
function foeDesc(id) {
  for (let i = 0; i < HELP_FOES.length; i++) {
    if (HELP_FOES[i].id === id) return hp(HELP_FOES[i].d);
  }
  const sp = speciesOf(id), tr = foeTier(id);
  let s = sp.wing ? '飛在空中（可以越過牆壁），' : '走在地上（會被牆擋住），';
  s += sp.kind === 'chase' ? '會主動追人' : '自己亂走';
  if (sp.skill === 'scavenger') s += '，還會把你放的炸彈撿起來丟回去';
  else if (sp.skill === 'sapper') s += '，會拆掉附近的炸彈';
  else if (sp.skill === 'bomber') s += '，自己會放炸彈（火焰只有 1 格）';
  else if (sp.skill === 'smart') s += '，還會找掩體躲炸彈';
  s += tr === 'high' ? '。被盯上會先蓄力再加速撲過來 —— 不好惹。'
    : tr === 'mid' ? '。被盯上會先生氣、再加速撲過來。'
      : '。節奏慢，適合練手感。';
  return s;
}"""
once("""function foeName(id) { return t(id === 'mush' ? 'sp.shroom' : 'sp.' + id); }""", HELPERS, '圖鑑輔助函式')

once("""    h += '<div class="hsub">🌱 地面怪（會被牆擋住）</div><div class="hgrid">';
    HELP_FOES.forEach(function (f) {
      if (f.k !== 'ground') return;
      h += '<div class="hcard"><canvas class="hico" data-sp="foe:' + f.id + '" data-size="86"></canvas><div class="htx">' +
        '<div class="hn">' + hesc(foeName(f.id)) + '<span class="hen">' + hesc(f.en) + '</span></div>' +
        '<div><span class="hbadge hot">❤️ ' + f.hp + '</span><span class="hbadge info">速度 ' + hesc(hp(f.spd)) + '</span>' + tb(f.id) + '</div>' +
        '<div class="hd">' + hp(f.d) + '</div></div></div>';
    });
    h += '</div>';
    h += '<div class="hsub">🕊️ 飛行怪（有翅膀、可穿牆）</div><div class="hgrid">';
    HELP_FOES.forEach(function (f) {
      if (f.k !== 'fly') return;
      h += '<div class="hcard"><canvas class="hico" data-sp="foe:' + f.id + '" data-size="86"></canvas><div class="htx">' +
        '<div class="hn">' + hesc(foeName(f.id)) + '<span class="hen">' + hesc(f.en) + '</span></div>' +
        '<div><span class="hbadge hot">❤️ ' + f.hp + '</span><span class="hbadge info">速度 ' + hesc(hp(f.spd)) + '</span>' + tb(f.id) +
        '<span class="hbadge bad">' + (LANG === 'zh-CN' ? '穿墙' : (LANG === 'en' ? 'Through walls' : '穿牆')) + '</span></div>' +
        '<div class="hd">' + hp(f.d) + '</div></div></div>';
    });
    h += '</div>';""",
"""    // v4.27：圖鑑改成「八大關卡生態」—— 一關一張卡，看得到難度是怎麼一階一階上去的
    const BLOCK_EN = ['Grassland', 'Desert Ruins', 'Frozen Field', 'Lava Cave',
      'Neon City', 'Sunken Ruins', 'Sky Fortress', 'Demon Castle'];
    STAGE_ROSTER.forEach(function (list, bi) {
      const th = THEMES[bi] || THEMES[0];
      const sw = 'background:linear-gradient(140deg,' + th.bg1 + ' 0%,' + th.floor + ' 52%,' + th.soft + ' 100%)';
      h += '<div class="hsub">' + (bi + 1) + '. ' + hesc(themeName(bi)) +
        '<span class="hen">' + BLOCK_EN[bi] + '</span>' +
        '<span class="hsw" style="width:34px;height:18px;' + sw + '"></span></div>';
      h += '<div class="hgrid">';
      list.forEach(function (id) {
        const sp = speciesOf(id), tr = foeTier(id);
        h += '<div class="hcard"><canvas class="hico" data-sp="foe:' + id + '" data-size="76"></canvas><div class="htx">' +
          '<div class="hn">' + hesc(foeName(id)) + '<span class="hen">' + hesc(sp.en || '') + '</span></div>' +
          '<div><span class="hbadge info">' + (sp.wing ? '🕊️ 穿牆' : '🌱 地面') + '</span>' +
          '<span class="hbadge info">' + hesc(foeSpeedWord(sp.spd)) + '</span>' + tb(id) + '</div>' +
          '<div class="hd">' + foeDesc(id) + '</div></div></div>';
      });
      h += '</div>';
    });""", '圖鑑改成分關')

# 圖鑑說明文字（舊的導言）也要改：48 隻 / 8 關
once("""    let h = '<div class="hlead">小怪分兩大類：<b>地面怪</b>（會被牆擋住，可以躲）與 <b>飛行怪</b>（有翅膀，<b>可以越過牆壁</b>）。碰到任何一隻就扣一條命。<br>' +""",
"""    let h = '<div class="hlead">小怪共 <b>48 隻</b>：八大關卡各 6 隻，<b>難度一關一階往上</b>（第 1 關只有慢吞吞的草原小動物，第 8 關是會追人、會躲炸彈的魔王近衛軍）。<br>' +
      '地面怪<b>會被牆擋住</b>、飛行怪<b>可以越過牆壁</b>；碰到任何一隻就扣一條命。<br>' +""", '圖鑑導言')

io.open(P, 'wb').write(html.replace('\n', '\r\n').encode('utf-8'))
print('written', len(html), mode)
