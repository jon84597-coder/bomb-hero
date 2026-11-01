# -*- coding: utf-8 -*-
# v4.14 第二輪：單人闖關從 8 關擴充成 32 張地圖（跟 RPG 模式同一份 MAP32）
#
# · MAP32（8 大主題 × 4 張地區小地圖）原本宣告在檔案很後面，
#   但 Solo.init() 在初始載入時就要用它畫選關格 → 先把 MAP32 整段搬到 Solo 前面
#   （const 有 TDZ，宣告在使用處之後會直接 ReferenceError）。
# · 每一區的第 4 張（sub==3）＝ 該區的魔王關：第 4 / 8 / 12 … / 32 關都會出魔王。
# · 地圖改用跟 RPG 同一套 organicGrid（固定種子 → 同一張圖每次進去都一樣）。
import io

PATH = 'index.html'
src = io.open(PATH, encoding='utf-8', newline='').read()
text = src.replace('\r\n', '\n')

# ================================================================
# 0) MAP32 整段搬到 const Solo 前面
# ================================================================
_start = '// ---------- 32 張地圖：8 大主題 × 4 張地區小地圖 ----------'
_end = '// 固定種子的亂數（同一張地圖每次長得一樣，玩家可以記圖）'
i0 = text.index(_start)
i1 = text.index(_end, i0)
block = text[i0:i1]
text = text[:i0] + text[i1:]
anchor = 'const Solo = {'
ia = text.index(anchor)
text = text[:ia] + block + text[ia:]

rules = []
def R(old, new):
    rules.append((old, new))

# ================================================================
# 1) 32 關常數 + 取得某關 MAP32 資料
# ================================================================
R(
"""const Solo = {
  unlocked: 1,""",
"""// v4.14：單人闖關 8 關 → 32 關（8 大主題 × 4 張地區小地圖），與 RPG 模式共用同一份 MAP32。
//   每一區的第 4 張（sub === 3）＝ 該區的魔王關；第 32 張「魔王之間」＝ 最終魔王。
const SOLO_STAGES = 32;
function soloInfo(stage) { return MAP32[((((stage | 0) - 1) % 32) + 32) % 32]; }

const Solo = {
  unlocked: 1,"""
)

# ================================================================
# 2) Solo 內部所有 THEMES.length → SOLO_STAGES
# ================================================================
R(
"""  maxUnlocked() { return Solo.dev ? THEMES.length : Solo.unlocked; },""",
"""  maxUnlocked() { return Solo.dev ? SOLO_STAGES : Solo.unlocked; },"""
)
R(
"""    Solo.unlocked = Math.max(1, Math.min(THEMES.length, Solo.unlocked));""",
"""    Solo.unlocked = Math.max(1, Math.min(SOLO_STAGES, Solo.unlocked));"""
)
R(
"""    Solo.sel = Math.max(1, Math.min(THEMES.length, Solo.unlocked));
    Solo.renderGrid();
    Solo.renderChar();""",
"""    Solo.sel = Math.max(1, Math.min(SOLO_STAGES, Solo.unlocked));
    Solo.renderGrid();
    Solo.renderChar();"""
)
R(
"""    Solo.sel = Math.max(1, Math.min(THEMES.length, n));""",
"""    Solo.sel = Math.max(1, Math.min(SOLO_STAGES, n));"""
)

# ================================================================
# 3) renderGo：關卡名改成「主題 + 地圖名」
# ================================================================
R(
"""  renderGo() {
    const btn = $id('btnSoloGo'), txt = $id('soloGoTxt'), sub = $id('soloGoSub');
    if (!btn) return;
    const n = Math.max(1, Math.min(THEMES.length, Solo.sel || 1));
    const th = THEMES[n - 1];
    const lock = n > Solo.maxUnlocked();
    btn.classList.toggle('locked', lock);
    btn.disabled = !!lock;
    if (txt) txt.textContent = lock ? t('solo.locked') : t('solo.go', { n: n });
    if (sub) sub.textContent = lock ? t('solo.lockedhint')
      : themeName(n - 1) + (n === THEMES.length ? t('boss.suffix') : '');
  },""",
"""  renderGo() {
    const btn = $id('btnSoloGo'), txt = $id('soloGoTxt'), sub = $id('soloGoSub');
    if (!btn) return;
    const n = Math.max(1, Math.min(SOLO_STAGES, Solo.sel || 1));
    const info = soloInfo(n);
    const lock = n > Solo.maxUnlocked();
    btn.classList.toggle('locked', lock);
    btn.disabled = !!lock;
    if (txt) txt.textContent = lock ? t('solo.locked') : t('solo.go', { n: n });
    if (sub) sub.textContent = lock ? t('solo.lockedhint')
      : themeName(info.theme) + ' · ' + info.n + (info.sub === 3 ? t('boss.suffix') : '');
  },"""
)

# ================================================================
# 4) renderGrid：8 格 → 32 格（魔王關加 👑）
# ================================================================
R(
"""  renderGrid() {
    const g = $id('stageGrid');
    if (!g) return;
    g.innerHTML = '';
    THEMES.forEach(function (th, i) {
      const n = i + 1;
      const b = document.createElement('button');
      b.className = 'stg' + (n < Solo.maxUnlocked() ? ' done' : '') + (n === Solo.sel ? ' sel' : '');
      b.disabled = n > Solo.maxUnlocked();
      if (typeof b.setAttribute === 'function') b.setAttribute('data-stage', String(n));
      b.innerHTML = '<b>' + n + '</b><span>' + themeName(i) + (i === THEMES.length - 1 ? t('boss.suffix') : '') + '</span>';
      b.addEventListener('click', function () {
        AudioSys.sfx('click');
        if (Solo.sel === n) { Solo.go(); return; }   // 再點一次＝直接出發
        Solo.pick(n);
      });
      g.appendChild(b);
    });
    Solo.renderGo();
  }""",
"""  renderGrid() {
    const g = $id('stageGrid');
    if (!g) return;
    g.innerHTML = '';
    // v4.14：32 張地圖（8 大主題 × 4 張）；每一區的第 4 張是魔王關，標上 👑
    MAP32.forEach(function (m, i) {
      const n = i + 1;
      const boss = m.sub === 3;
      const b = document.createElement('button');
      b.className = 'stg' + (n < Solo.maxUnlocked() ? ' done' : '') + (n === Solo.sel ? ' sel' : '') + (boss ? ' boss' : '');
      b.disabled = n > Solo.maxUnlocked();
      if (typeof b.setAttribute === 'function') {
        b.setAttribute('data-stage', String(n));
        b.setAttribute('title', (m.theme + 1) + '-' + (m.sub + 1) + '　' + m.n + (boss ? '　👑 魔王關' : ''));
      }
      b.innerHTML = '<b>' + n + '</b><span>' + (boss ? '👑' : '') + m.n + '</span>';
      b.addEventListener('click', function () {
        AudioSys.sfx('click');
        if (Solo.sel === n) { Solo.go(); return; }   // 再點一次＝直接出發
        Solo.pick(n);
      });
      g.appendChild(b);
    });
    Solo.renderGo();
  }"""
)

# ================================================================
# 5) startSolo：合法範圍夾住 + 主題／關卡名改看 MAP32
# ================================================================
R(
"""  Game.mode = 'solo';
  Game.bossRush = !!bossRush;
  Game.stage = stage;
  Game.theme = THEMES[stage - 1];""",
"""  Game.mode = 'solo';
  Game.bossRush = !!bossRush;
  // v4.14：單人闖關變成 32 張地圖 → 先把關號夾在合法範圍，主題改成看 MAP32
  stage = Math.max(1, Math.min(SOLO_STAGES, stage || 1));
  Game.stage = stage;
  Game.theme = THEMES[soloInfo(stage).theme] || THEMES[0];
  Game.mapInfo = soloInfo(stage);"""
)
R(
"""    title: Game.bossRush ? t('solo.ovBossTitle', { name: themeName(stage - 1) }) : t('solo.ovTitle', { n: stage, name: themeName(stage - 1) }),
    sub: (Game.bossRush ? t('solo.ovBossSub') : (stage === 8 ? t('solo.ovBossSub2') : t('solo.ovSub'))) +""",
"""    title: Game.bossRush ? t('solo.ovBossTitle', { name: soloInfo(stage).n }) : t('solo.ovTitle', { n: stage, name: soloInfo(stage).n }),
    sub: (Game.bossRush ? t('solo.ovBossSub') : (soloInfo(stage).sub === 3 ? t('solo.ovBossSub2') : t('solo.ovSub'))) +"""
)
R(
"""// 首頁「挑戰 BOSS」：直接打第八關魔王，場上沒有小怪
function startBossRush() { startSolo(8, true); }""",
"""// 首頁「挑戰 BOSS」：直接打最終魔王（第 32 張地圖「魔王之間」），場上沒有小怪
function startBossRush() { startSolo(SOLO_STAGES, true); }"""
)

# ================================================================
# 6) buildSoloStage：改用 organicGrid（跟 RPG 同一套），每區第 4 張出魔王
# ================================================================
_s = 'function buildSoloStage(stage, fresh) {'
_e = '// ---------- 10 種小怪 ----------'
isx = text.index(_s)
iex = text.index(_e, isx)
NEW_BODY = """function buildSoloStage(stage, fresh) {
  const size = SIZES[settings.size] || SIZES.M;
  const cols = size[0], rows = size[1];
  const diff = soloDiffCfg();
  const p = Game.players[0];
  const info = soloInfo(stage);
  const theme = THEMES[info.theme] || THEMES[0];
  Game.theme = theme;
  Game.mapInfo = info;
  // v4.14：單人闖關跟 RPG 一樣走「有機地形」（洞穴／迷宮／環形／樑柱…）。
  //   固定種子 → 同一張地圖每次進去長得都一樣，玩家可以記圖、練路線。
  const seed = 3000 + info.idx * 6151 + cols * 31 + rows * 13;
  buildOrganicMap(cols, rows, theme, info, rngFrom(seed), {
    seed: seed, items: 14 + Math.round(stage * 1.1)
  });
  p.x = 1 * Game.T + Game.T / 2;
  p.y = 1 * Game.T + Game.T / 2;
  p.alive = true; p.invuln = 2; p.carry = null; p.slide = null; p.warpLock = '';
  if (fresh) resetPlayerStats(p);
  // 敵人（多樣化：亂走／快速亂走／追人／飛行穿牆＋技能怪）
  Game.enemies = [];
  if (!Game.bossRush) {
    // v4.14：關卡 8 → 32，怪物量改成連續成長曲線（第 1 關 6 隻 → 第 32 關 18 隻）
    const base = Math.min(18, 5 + Math.round(stage * .55));
    const n = Math.max(0, Math.round(base * diff.enemy * (cols * rows) / (15 * 13)));
    // 20 種小怪：地面 10 種（會被牆擋住）＋ 飛行 6 種（有翅膀、可以越過牆）＋ 4 種技能怪
    const ground = ['slime', 'beetle', 'crab', 'skull', 'mush', 'lizard', 'panda', 'penguin', 'octopus', 'robot'];
    const flying = ['bat', 'ghost', 'bee', 'eye', 'wisp', 'hornet'];
    const skills = ['scavenger', 'sapper', 'bomber', 'wizard'];
    // v4.14：依「第幾大關」決定登場的怪物種類（越後面越多、越雜）
    const reg = Math.max(0, Math.min(7, info.theme));
    const types = reg <= 0 ? ['slime', 'slime', 'beetle']
      : reg === 1 ? ground.slice(0, 3)
      : reg === 2 ? ground.slice(0, 5).concat(['bat'])
      : reg === 3 ? ground.slice(0, 6).concat(['bat', 'ghost'])
      : reg === 4 ? ground.slice(0, 8).concat(['bat', 'ghost', 'bee'])
      : reg === 5 ? ground.concat(flying.slice(0, 3))
      : ground.concat(flying).concat(skills);
    const pool = types.slice();     // 先輪流出一輪，保證每種都登場
    // 怪的成長等級封頂在 8（原本只有 8 關，現在 32 關不能讓速度一路漲到追不到）
    const lv = Math.min(8, Math.ceil(stage / 4));
    for (let i = 0; i < n; i++) {
      let x, y, tries = 0;
      do {
        x = 1 + rand(cols - 2); y = 1 + rand(rows - 2);
        tries++;
      } while ((cellAt(x, y) !== 0 || (x < 4 && y < 4) || bombAt(x, y)) && tries < 200);
      Game.enemies.push(makeEnemy(x, y, pool.length ? pool.shift() : pick(types), lv, diff.speed));
    }
  }
  // v4.14：每一大關的第 4 張地圖（sub === 3）＝ 該區的魔王關（第 4 / 8 / … / 32 關）
  if (Game.bossRush || info.sub === 3) {
    const by = Math.max(1, rows - 2);
    let bx = clamp(Math.floor(cols / 2), 1, cols - 2);
    // 別剛好坐在傳送門上；下方空間不足就往左／右退一格
    if (Game.door && Game.door.x === bx && Game.door.y === by) bx = (bx > 1 ? bx - 1 : bx + 1);
    Game.grid[by][bx] = 0;                       // 登場那一格先清空，保證站得住
    // 魔王血量：第 1 大關 5 下 → 第 8 大關 12 下（BOSS 連戰固定 5 下）
    const bossHp = Game.bossRush ? diff.bossHp : Math.min(12, 4 + info.theme + 1);
    const boss = makeBoss(bx, by, bossHp);
    boss.dirName = 'up';                         // 從下方上來 → 面朝上方
    Game.enemies.push(boss);
  }
  // 恐龍蛋：炸得到，走上蛋格就會孵出恐龍
  spawnEggs(Game.bossRush ? 2 : diff.eggs);
  const tSec = soloTimeVal();
  Game.timer = tSec > 0 ? tSec : Infinity;
  Game.bombs = []; Game.flames = []; Game.items = []; Game.particles = [];
  Game.pops = []; Game.edgeFx = 0;          // v4.5：換場清掉上次殘留的受傷反饋
  Game.sdIndex = 0; Game.sdList = [];
  hideOverlay();
  buildSdList();
}

"""
text = text[:isx] + NEW_BODY + text[iex:]

# ================================================================
# 7) updateSolo：上限 32 關、過關文案看 MAP32
# ================================================================
R(
"""        const maxStage = (Game.mode === 'rpg') ? 32 : 8;""",
"""        const maxStage = SOLO_STAGES;   // v4.14：單人與 RPG 都是 32 關"""
)
R(
"""          Solo.sel = Math.max(1, Math.min(THEMES.length, Solo.unlocked));""",
"""          Solo.sel = Math.max(1, Math.min(SOLO_STAGES, Solo.unlocked));"""
)
R(
"""              sub: t('solo.clearSub', { s: p.score, n: (Game.stage + 1), name: (Game.mode === 'rpg' ? (MAP32[(Game.stage - 1) % 32].n) : themeName(Game.stage)) }),""",
"""              sub: t('solo.clearSub', { s: p.score, n: (Game.stage + 1), name: (Game.mode === 'rpg' ? (MAP32[(Game.stage - 1) % 32].n) : soloInfo(Game.stage + 1).n) }),"""
)
R(
"""                } else {
                  Game.theme = THEMES[Game.stage - 1];
                  buildSoloStage(Game.stage, false);
                  AudioSys.startBGM(stageBGM(Game.stage));
                }""",
"""                } else {
                  Game.theme = THEMES[soloInfo(Game.stage).theme] || THEMES[0];
                  buildSoloStage(Game.stage, false);
                  AudioSys.startBGM(stageBGM(Game.stage));
                }"""
)

# ================================================================
# 8) BGM：32 關 → 每 4 張共用一首主題曲
# ================================================================
R(
"""function stageBGM(stage) {
  if (Game && Game.bossRush) return 'boss';
  const st = Math.max(1, Math.min(8, stage || (Game && Game.stage) || 1));
  return 'stage' + st;
}""",
"""function stageBGM(stage) {
  if (Game && Game.bossRush) return 'boss';
  // v4.14：關卡 8 → 32（每 4 張地圖＝一個大主題，共用同一首主題曲）
  const raw = Math.max(1, stage || (Game && Game.stage) || 1);
  const st = Math.max(1, Math.min(8, Math.floor((raw - 1) / 4) + 1));
  return 'stage' + st;
}"""
)

# ================================================================
# 9) HUD 的關卡名：單人也要看 MAP32 的主題（不是 stage-1）
# ================================================================
R(
"""    const thIdx = (rpgMode && Game.mapInfo) ? Game.mapInfo.theme : Game.stage - 1;""",
"""    const thIdx = Game.mapInfo ? Game.mapInfo.theme : Game.stage - 1;"""
)

# ================================================================
# 10) 重試／暫停重新開始：BOSS 連戰回到第 32 關
# ================================================================
R(
"""    if (Game.mode === 'solo') { if (Game.bossRush) startSolo(8, true); else startSolo(Game.stage); }
    else startBattle();
  });
  $id('btnHome').addEventListener('click', function () {""",
"""    if (Game.mode === 'solo') { if (Game.bossRush) startSolo(SOLO_STAGES, true); else startSolo(Game.stage); }
    else startBattle();
  });
  $id('btnHome').addEventListener('click', function () {"""
)
R(
"""    if (Game.mode === 'solo') { if (Game.bossRush) startSolo(8, true); else startSolo(Game.stage); }
    else startBattle();
  });
  $id('pmSettingsBtn').addEventListener('click', function () {""",
"""    if (Game.mode === 'solo') { if (Game.bossRush) startSolo(SOLO_STAGES, true); else startSolo(Game.stage); }
    else startBattle();
  });
  $id('pmSettingsBtn').addEventListener('click', function () {"""
)

# ================================================================
# 11) CSS：32 格要能捲、名字太長省略、魔王關標色
# ================================================================
R(
"""  .stagegrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 9px; margin-bottom: 16px; }""",
"""  .stagegrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 9px; margin-bottom: 16px; }
  /* v4.14：選關從 8 格變 32 格 → 限高可捲動，地圖名太長就省略 */
  .stagegrid { max-height: min(46vh, 430px); overflow-y: auto; padding-right: 3px; }
  .stg span {
    display: block; max-width: 100%; white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis;
  }
  .stg.boss b { color: #ff9f43; }"""
)
R(
"""    body.touch #scr-solo .stagegrid { grid-template-columns: repeat(8, 1fr); gap: 6px; margin-bottom: 8px; }""",
"""    body.touch #scr-solo .stagegrid {
      grid-template-columns: repeat(8, 1fr); gap: 6px; margin-bottom: 8px;
      max-height: 34vh;
    }"""
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
