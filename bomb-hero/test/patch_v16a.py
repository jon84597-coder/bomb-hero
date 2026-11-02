# -*- coding: utf-8 -*-
"""v1.6 第一批補丁：重複暱稱 / 全域工具列 / 畫面堆疊 / 環形·條狀機關 / 10 種小怪。"""
import re, sys, io

P = 'index.html'
s = io.open(P, encoding='utf-8').read()
n0 = s.count('\n')

def rep(old, new, tag, cnt=1):
    global s
    assert old in s, 'NOT FOUND: ' + tag
    s = s.replace(old, new, cnt)
    print('  ok:', tag)

# ---------------------------------------------------------------- 1. 重複暱稱
rep('''      <div class="field"><label>你的暱稱</label>
        <input class="tinput" id="netName" maxlength="8" placeholder="輸入暱稱（最多 8 字）" style="width:100%">
      </div>
      <div class="field" id="netEntry">''',
    '''      <div class="field" id="netEntry">''', 'remove dup nickname')

# ---------------------------------------------------------------- 2. 全域工具列
rep('''<div id="titleBg" aria-hidden="true"></div>
<div class="wrap">''',
    '''<div id="titleBg" aria-hidden="true"></div>

<!-- 全域工具列：明顯的「上一頁」＋ 音樂／音效開關（固定在畫面角落，不隨遊戲畫面旋轉） -->
<div id="navBar">
  <button class="navbtn" id="btnBack" type="button"><span class="ar">←</span> 上一頁</button>
  <div class="navright">
    <button class="navbtn tg on" id="btnMusic" type="button" title="開關主音樂">🎵 <b>音樂</b></button>
    <button class="navbtn tg on" id="btnSfx" type="button" title="開關遊戲音效">🔊 <b>音效</b></button>
  </div>
</div>

<div class="wrap">''', 'navbar html')

rep('''  /* ===== 按鍵設定 ===== */''',
    '''  /* ===== 全域工具列（上一頁＋音樂開關） ===== */
  #navBar {
    position: fixed; left: 0; right: 0; top: 0; z-index: 1200;
    display: flex; align-items: center; justify-content: space-between; gap: 8px;
    padding: calc(7px + env(safe-area-inset-top, 0px)) 10px 7px;
    pointer-events: none;
  }
  #navBar.hide { display: none; }
  #navBar .navright { display: flex; gap: 7px; }
  .navbtn {
    pointer-events: auto; cursor: pointer; font-family: inherit; font-weight: 900;
    display: inline-flex; align-items: center; gap: 4px;
    background: rgba(28,20,42,.86); color: #ffe6c9;
    border: 1.5px solid rgba(255,180,120,.66); border-radius: 999px;
    padding: 8px 15px 8px 12px; font-size: 14px; line-height: 1;
    box-shadow: 0 6px 18px -8px rgba(0,0,0,.8), inset 0 1px 0 rgba(255,255,255,.14);
    backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    transition: transform .1s, background .15s;
  }
  .navbtn:active { transform: scale(.94); }
  .navbtn .ar { font-size: 17px; line-height: 1; margin-top: -1px; }
  .navbtn.tg { padding: 8px 13px; font-size: 13.5px; }
  .navbtn.tg.off { background: rgba(24,18,32,.7); color: #7d7790; border-color: rgba(120,110,140,.55); }
  .navbtn.tg.off b { text-decoration: line-through; opacity: .8; }
  #navBar.atTitle #btnBack { visibility: hidden; }
  /* 工具列會佔掉上方空間 → 內容往下讓開 */
  .wrap { padding-top: 52px; }
  .wrap.game { padding-top: 0; }

  /* ===== 按鍵設定 ===== */''', 'navbar css')

# ---------------------------------------------------------------- 3. Screen 堆疊
rep('''const Screen = (function () {
  let cur = 'title';
  function show(name) {
    document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('on'); });
    $id('scr-' + name).classList.add('on');
    document.querySelector('.wrap').classList.toggle('game', name === 'game');
    cur = name;
  }
  return { show: show, get current() { return cur; } };
})();''',
    '''// 畫面切換＋「上一頁」堆疊。
// 手機瀏覽器的上一頁會直接把整個遊戲關掉 → 每進一個畫面就 push 一個 history 狀態，
// 按上一頁只會退回上一層畫面（遊戲中則是先暫停），不會離開遊戲。
const Screen = (function () {
  let cur = 'title';
  const stack = ['title'];
  function apply(name) {
    document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('on'); });
    const el = $id('scr-' + name);
    if (!el) return;
    el.classList.add('on');
    document.querySelector('.wrap').classList.toggle('game', name === 'game');
    cur = name;
    try { updateNavUI(); } catch (e) {}
    try { window.scrollTo(0, 0); } catch (e) {}
    try { if (typeof refreshers !== 'undefined') refreshers.forEach(function (f) { try { f(); } catch (e) {} }); } catch (e) {}
  }
  function show(name) {
    if (!name || !$id('scr-' + name)) return;
    if (name === cur) { apply(name); return; }
    if (name === 'title') { stack.length = 0; stack.push('title'); }
    else stack.push(name);
    apply(name);
    try { history.pushState({ bh: name }, ''); } catch (e) {}
  }
  function back() {
    if (cur === 'game') { try { togglePause(); } catch (e) {} return; }
    if (stack.length > 1) { try { history.back(); } catch (e) { stack.pop(); apply(stack[stack.length - 1]); } }
    else { apply('title'); }
  }
  function onPop() {
    if (cur === 'game') { try { togglePause(); } catch (e) {} try { history.pushState({ bh: 'game' }, ''); } catch (e) {} return; }
    if (stack.length > 1) stack.pop();
    apply(stack[stack.length - 1] || 'title');
  }
  return {
    show: show, back: back, onPop: onPop,
    get current() { return cur; },
    get depth() { return stack.length; },
    stack: function () { return stack.slice(); }
  };
})();
window.addEventListener('popstate', function () { Screen.onPop(); });

// ---------- 全域工具列：上一頁 ＋ 音樂／音效開關 ----------
function updateNavUI() {
  const bar = $id('navBar');
  if (!bar) return;
  const cur = Screen.current;
  bar.classList.toggle('hide', cur === 'game');
  bar.classList.toggle('atTitle', cur === 'title');
  const m = $id('btnMusic'), sf = $id('btnSfx');
  if (m) m.classList.toggle('off', !(settings.bgm > 0));
  if (sf) sf.classList.toggle('off', !(settings.sfx > 0));
}
function toggleMusic() {
  if (settings.bgm > 0) { settings.bgmLast = settings.bgm; settings.bgm = 0; }
  else { settings.bgm = settings.bgmLast || .6; }
  try { AudioSys.ensure(); AudioSys.applyVolumes(); } catch (e) {}
  if (settings.bgm > 0) {
    try { AudioSys.startBGM(Screen.current === 'game' ? (Game.bossRush ? 'boss' : 'battle') : 'menu'); } catch (e) {}
  }
  saveSettings(); updateNavUI();
  try { toast(settings.bgm > 0 ? '🎵 主音樂：開' : '🎵 主音樂：關', 1.2); } catch (e) {}
}
function toggleSfx() {
  if (settings.sfx > 0) { settings.sfxLast = settings.sfx; settings.sfx = 0; }
  else { settings.sfx = settings.sfxLast || 1; }
  try { AudioSys.applyVolumes(); } catch (e) {}
  if (settings.sfx > 0) { try { AudioSys.sfx('place'); } catch (e) {} }
  saveSettings(); updateNavUI();
  try { toast(settings.sfx > 0 ? '🔊 音效：開' : '🔊 音效：關', 1.2); } catch (e) {}
}
(function wireNavBar() {
  const b = $id('btnBack'); if (b) b.addEventListener('click', function () { Screen.back(); });
  const m = $id('btnMusic'); if (m) m.addEventListener('click', toggleMusic);
  const sf = $id('btnSfx'); if (sf) sf.addEventListener('click', toggleSfx);
  updateNavUI();
})();''', 'screen stack')

# ---------------------------------------------------------------- 4. 環形／條狀機關
rep('''  // 地形機關
  const hz = settings.hazards === 'on' ? theme.hazards : [];
  if (hz.length && !opts.noHazards) {
    const floors = [];
    for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) {
      if (Game.grid[y][x] === 0 && !(x % 2 === 0 && y % 2 === 0)) floors.push({ x: x, y: y });
    }
    const count = Math.floor(floors.length * .1);
    let warpIdx = 0;
    for (let i = 0; i < count; i++) {
      const f = floors.splice(rand(floors.length), 1)[0];
      const type = pick(hz);
      if (type === 'warp') {
        if (floors.length === 0) break;
        const f2 = floors.splice(rand(floors.length), 1)[0];
        // 一對門同色（紅↔紅、藍↔藍…）；不同顏色互不相通
        const ci = warpIdx % WARP_COLORS.length;
        const wc = WARP_COLORS[ci];
        warpIdx++;
        Game.hazards[f.y][f.x] = { type: 'warp', link: f2, cool: 0, ci: ci, color: wc.hex };
        Game.hazards[f2.y][f2.x] = { type: 'warp', link: f, cool: 0, ci: ci, color: wc.hex };
        Game.warps.push([f, f2]);
      } else if (type === 'ice') {
        Game.hazards[f.y][f.x] = { type: 'ice' };
      } else if (type === 'convey') {
        Game.hazards[f.y][f.x] = { type: 'convey', dir: pick(['up', 'down', 'left', 'right']) };
      }
    }
  }
}''',
    '''  // ---------- 地形機關：繞地圖一整圈的跑道，或一條一條的直線跑道 ----------
  const hz = settings.hazards === 'on' ? theme.hazards : [];
  if (hz.length && !opts.noHazards) {
    const hasConvey = hz.indexOf('convey') >= 0;
    const hasIce = hz.indexOf('ice') >= 0;
    // 奇數關＝環形（繞一圈）、偶數關＝條狀（一排一排）
    const ring = opts.hazardShape === 'ring' ? true
      : opts.hazardShape === 'rows' ? false
      : (Game.stage % 2 === 1);
    const put = function (x, y, obj) {
      if (x <= 0 || y <= 0 || x >= cols - 1 || y >= rows - 1) return false;
      if (Game.grid[y][x] === 1) return false;                                 // 石牆不動
      if (Game.door && Game.door.x === x && Game.door.y === y) return false;   // 別把出口挖出來
      if (Game.hazards[y][x]) return false;                                    // 已經有機關／傳送門
      Game.grid[y][x] = 0;                                                     // 清掉軟磚，跑道才會連成一整條
      Game.hazards[y][x] = obj;
      return true;
    };
    // 奇數座標不會碰到「偶數×偶數」的柱子 → 一整條都不會被牆打斷
    const y0 = 1, y1 = rows - 2, x0 = 1, x1 = cols - 2;

    function paintRing(kind) {
      // 順時針繞一圈：上緣→右、右緣→下、下緣→左、左緣→上
      for (let x = x0; x <= x1; x++) {
        put(x, y0, kind === 'convey' ? { type: 'convey', dir: 'right' } : { type: 'ice' });
        put(x, y1, kind === 'convey' ? { type: 'convey', dir: 'left' } : { type: 'ice' });
      }
      for (let y = y0; y <= y1; y++) {
        put(x0, y, kind === 'convey' ? { type: 'convey', dir: 'up' } : { type: 'ice' });
        put(x1, y, kind === 'convey' ? { type: 'convey', dir: 'down' } : { type: 'ice' });
      }
    }
    function paintRows(kind, vertical) {
      // 條狀：每隔 4 排鋪一整條，方向左右（或上下）交錯
      let flip = 1;
      if (!vertical) {
        for (let y = y0; y <= y1; y += 4) {
          const dir = flip > 0 ? 'right' : 'left';
          for (let x = 1; x < cols - 1; x++) put(x, y, kind === 'convey' ? { type: 'convey', dir: dir } : { type: 'ice' });
          flip = -flip;
        }
      } else {
        for (let x = x0; x <= x1; x += 4) {
          const dir = flip > 0 ? 'down' : 'up';
          for (let y = 1; y < rows - 1; y++) put(x, y, kind === 'convey' ? { type: 'convey', dir: dir } : { type: 'ice' });
          flip = -flip;
        }
      }
    }
    const paintBelt = function (kind, shape) {
      if (shape === 'ring') paintRing(kind);
      else paintRows(kind, Game.stage % 4 === 0);
    };
    if (hasConvey && hasIce) {
      paintBelt('convey', ring ? 'ring' : 'rows');
      paintBelt('ice', ring ? 'rows' : 'ring');
    } else {
      paintBelt(hasConvey ? 'convey' : 'ice', ring ? 'ring' : 'rows');
    }

    // 傳送門：成對同色，只放在沒鋪跑道的空格（少量，不會蓋掉跑道）
    if (hz.indexOf('warp') >= 0) {
      const floors = [];
      for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) {
        if (Game.grid[y][x] === 0 && !Game.hazards[y][x] && !(x % 2 === 0 && y % 2 === 0)) floors.push({ x: x, y: y });
      }
      const pairs = Math.max(1, Math.min(3, Math.floor(floors.length / 18)));
      for (let i = 0; i < pairs; i++) {
        if (floors.length < 2) break;
        const f = floors.splice(rand(floors.length), 1)[0];
        const f2 = floors.splice(rand(floors.length), 1)[0];
        const ci = i % WARP_COLORS.length;
        const wc = WARP_COLORS[ci];
        Game.hazards[f.y][f.x] = { type: 'warp', link: f2, cool: 0, ci: ci, color: wc.hex };
        Game.hazards[f2.y][f2.x] = { type: 'warp', link: f, cool: 0, ci: ci, color: wc.hex };
        Game.warps.push([f, f2]);
      }
    }
  }
}''', 'hazard shapes')

# ---------------------------------------------------------------- 5. 10 種小怪
rep('''    const base = [3, 4, 4, 5, 5, 6, 6, 0][stage - 1];
    const n = Math.max(0, Math.round(base * diff.enemy * (cols * rows) / (15 * 13)));
    const types = stage <= 2 ? ['walker']
      : stage <= 4 ? ['walker', 'chaser']
      : stage <= 6 ? ['walker', 'chaser', 'speeder']
      : ['walker', 'chaser', 'speeder', 'flyer'];
    const pool = types.slice();     // 先輪流出一輪，保證每種都登場''',
    '''    const base = [4, 5, 6, 7, 8, 9, 10, 0][stage - 1];
    const n = Math.max(0, Math.round(base * diff.enemy * (cols * rows) / (15 * 13)));
    // 10 種小怪：地面 6 種（會被牆擋住）＋ 飛行 4 種（有翅膀、可以越過牆）
    const ground = ['slime', 'beetle', 'crab', 'skull', 'mush', 'lizard'];
    const flying = ['bat', 'ghost', 'bee', 'eye'];
    const types = stage <= 1 ? ['slime', 'slime', 'beetle']
      : stage <= 2 ? ground.slice(0, 3)
      : stage <= 3 ? ground.slice(0, 4).concat(['bat'])
      : stage <= 4 ? ground.slice(0, 4).concat(['bat', 'ghost'])
      : stage <= 5 ? ground.slice(0, 5).concat(['bat', 'ghost', 'bee'])
      : stage <= 6 ? ground.slice(0, 5).concat(flying.slice(0, 3))
      : ground.concat(flying);
    const pool = types.slice();     // 先輪流出一輪，保證每種都登場''', 'enemy spawn table')

rep('''function makeEnemy(x, y, type, stage, spdMul) {
  const M = spdMul || 1;
  const base = {
    walker: { speed: 34 + stage * 2.4, color: '#e0689f', kind: 'wander', r: 14 },
    chaser: { speed: 40 + stage * 2.6, color: '#e0475e', kind: 'chase', r: 15 },
    speeder: { speed: 62 + stage * 3, color: '#8a6ef7', kind: 'wander', r: 12 },
    flyer: { speed: 40 + stage * 2.6, color: '#3fd4c0', kind: 'fly', r: 13 }
  }[type];
  const e = {
    type: type, x: x * Game.T + Game.T / 2, y: y * Game.T + Game.T / 2,
    speed: base.speed * M, color: base.color, kind: base.kind, r: base.r,
    dirT: 0, dirName: pick(['up', 'down', 'left', 'right']), dead: false, walkT: 0
  };
  if (base.kind === 'fly') {
    // 飛行怪：直線飛＋穿牆，隨機轉向、邊界反彈
    const a = Math.random() * 6.283;
    e.vx = Math.cos(a) * base.speed * M; e.vy = Math.sin(a) * base.speed * M;
    e.bobP = Math.random() * 6.283;
    e.turnT = 1 + Math.random() * 2;
  }
  return e;
}''',
    '''// ---------- 10 種小怪 ----------
// wing:true = 有翅膀，飛在空中可以越過石牆／軟磚；wing:false = 地面怪，會被牆擋住。
const ENEMY_SPECIES = [
  { id: 'slime',  name: '史萊姆', kind: 'wander', wing: false, r: 14, spd: 42, color: '#7fd06a', color2: '#3f8f46' },
  { id: 'beetle', name: '鐵甲蟲', kind: 'chase',  wing: false, r: 15, spd: 50, color: '#b8794a', color2: '#6f4222' },
  { id: 'crab',   name: '螃蟹',   kind: 'wander', wing: false, r: 15, spd: 46, color: '#ff8f6b', color2: '#c04a30' },
  { id: 'skull',  name: '骷髏兵', kind: 'chase',  wing: false, r: 15, spd: 56, color: '#eef3ff', color2: '#96a6c0' },
  { id: 'mush',   name: '毒菇怪', kind: 'wander', wing: false, r: 14, spd: 38, color: '#e07ab0', color2: '#8d2f62' },
  { id: 'lizard', name: '疾風蜥', kind: 'chase',  wing: false, r: 13, spd: 84, color: '#79dba4', color2: '#2c8459' },
  { id: 'bat',    name: '蝙蝠',   kind: 'fly',    wing: true,  r: 13, spd: 64, color: '#9a86e8', color2: '#4c3d94' },
  { id: 'ghost',  name: '幽靈',   kind: 'fly',    wing: true,  r: 14, spd: 54, color: '#dfe9ff', color2: '#8fa6cc' },
  { id: 'bee',    name: '毒蜂',   kind: 'fly',    wing: true,  r: 12, spd: 78, color: '#ffd166', color2: '#a9761a' },
  { id: 'eye',    name: '眼球怪', kind: 'fly',    wing: true,  r: 13, spd: 58, color: '#f4f6ff', color2: '#b04a6a' }
];
function speciesOf(id) {
  for (let i = 0; i < ENEMY_SPECIES.length; i++) { if (ENEMY_SPECIES[i].id === id) return ENEMY_SPECIES[i]; }
  return ENEMY_SPECIES[0];
}

function makeEnemy(x, y, type, stage, spdMul) {
  const M = spdMul || 1;
  const sp = speciesOf(type);
  const e = {
    type: sp.id, spec: sp.id, eName: sp.name, wing: sp.wing,
    x: x * Game.T + Game.T / 2, y: y * Game.T + Game.T / 2,
    speed: (sp.spd + stage * 2.6) * M, color: sp.color, color2: sp.color2,
    kind: sp.kind, r: sp.r, hp: 1,
    dirT: 0, dirName: pick(['up', 'down', 'left', 'right']), dead: false, walkT: 0
  };
  if (sp.id === 'beetle' || sp.id === 'skull') e.hp = 2;    // 有甲／硬骨頭：要炸兩次
  if (sp.kind === 'fly') {
    // 飛行怪：直線飛＋穿牆，會慢慢往玩家靠，邊界反彈
    const a = Math.random() * 6.283;
    e.vx = Math.cos(a) * e.speed; e.vy = Math.sin(a) * e.speed;
    e.bobP = Math.random() * 6.283;
    e.turnT = .8 + Math.random() * 1.4;
  }
  return e;
}''', 'species table')

io.open(P, 'w', encoding='utf-8').write(s)
print('lines %d -> %d' % (n0, s.count('\n')))
