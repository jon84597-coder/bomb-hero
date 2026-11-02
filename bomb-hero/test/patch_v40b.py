# -*- coding: utf-8 -*-
"""
v4.0-b：RPG 模式核心
  1. 新的「RPG 模式」畫面（選角 → 四維配點 9 點 → 選地圖 → 出發）
  2. 32 張地圖資料（8 大主題 × 4 張地區小地圖）＋不規則有機地形生成器（含連通性檢核）
  3. RPG 傷害系統：玩家 HP／護甲、怪物 HP／防禦
  4. RPG 血條 HUD
"""
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(ROOT, 'index.html')
raw = open(P, 'rb').read()
EOL = b'\r\n' if b'\r\n' in raw else b'\n'
s = raw.decode('utf-8')


def sub(old, new, tag, count=1):
    o = old.replace('\n', EOL.decode())
    n = new.replace('\n', EOL.decode())
    if s.count(o) != count:
        print('  !! %s：出現 %d 次（預期 %d）' % (tag, s.count(o), count))
        sys.exit(1)
    globals()['s'] = s.replace(o, n, count)
    print('  ok %s' % tag)


# ============================================================
# 1. CSS：配點列 / 屬性燈 / 步驟鈕
# ============================================================
OLD_CSS = """  .vlog .vlog-item.hot li::before { background: #ffd166; }
"""
NEW_CSS = """  .vlog .vlog-item.hot li::before { background: #ffd166; }
  /* v4.0：RPG 模式畫面 */
  .betaTag2 {
    font-size: 10px; font-weight: 900; letter-spacing: .06em; vertical-align: middle;
    color: #3a1c00; background: linear-gradient(180deg, #ffe6a3, #ffb347);
    border-radius: 999px; padding: 2px 8px; margin-left: 6px;
  }
  .rpgrows { display: flex; flex-direction: column; gap: 9px; }
  .rpgrow {
    display: grid; grid-template-columns: 96px 1fr auto; align-items: center; gap: 9px;
    background: linear-gradient(180deg, #18223a, #131b2c);
    border: 1px solid #27334f; border-radius: 12px; padding: 9px 11px;
  }
  .rpgrow .rpgname { font-size: 13px; font-weight: 900; color: #dbe8ff; letter-spacing: .04em; }
  .rpgrow .rpgpips { display: flex; gap: 3px; }
  .rpgrow .rpgpips i {
    display: block; flex: 1 1 0; height: 11px; border-radius: 3px;
    background: #22304c; border: 1px solid #2e3d5e;
  }
  .rpgrow .rpgpips i.on { background: linear-gradient(180deg, #ffd166, #f4703c); border-color: #ffcf8a; }
  .rpgrow .rpgstep { display: flex; align-items: center; gap: 6px; }
  .rpgrow .rpgstep button {
    width: 30px; height: 30px; border-radius: 9px; cursor: pointer;
    background: #24314d; border: 1px solid #3a4a72; color: #dbe8ff;
    font-size: 15px; font-weight: 900; font-family: inherit; line-height: 1;
  }
  .rpgrow .rpgstep button:hover:not(:disabled) { background: #33456b; border-color: #6f8fd0; }
  .rpgrow .rpgstep button:disabled { opacity: .32; cursor: default; }
  .rpgrow .rpgstep b { min-width: 20px; text-align: center; font-size: 15px; color: #ffe6a3; }
  .rpgrow .rpgdesc { grid-column: 1 / -1; font-size: 11px; color: #6f7d9e; font-weight: 600; margin-top: -2px; }
  .rpgsum {
    margin-top: 10px; padding: 9px 12px; border-radius: 12px;
    background: rgba(255,209,102,.10); border: 1px solid rgba(255,209,102,.34);
    font-size: 12.5px; font-weight: 700; color: #ffe6a3; line-height: 1.8;
  }
  .rpgsum b { color: #fff; }
  .rowbtns { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: 14px; }
  .rowbtns .biggo { flex: 1 1 190px; }
  .rowbtns .ghostbtn { flex: 0 0 auto; }
"""
sub(OLD_CSS, NEW_CSS, 'CSS：RPG 配點')

# ============================================================
# 2. HTML：RPG 畫面
# ============================================================
OLD_HTML = """  <!-- 遊戲說明（v3.5） -->"""
NEW_HTML = """  <!-- RPG 模式（v4.0 測試版） -->
  <div class="screen" id="scr-rpg">
    <div class="card">
      <h2>🎲 RPG 模式<span class="betaTag2">測試版 Beta</span></h2>
      <div class="desc">
        跟一般闖關完全不同的養成規則：怪物有<b>血量</b>與<b>防禦</b>，炸一次不會死；
        你自己也有<b>生命</b>與<b>護甲</b>。先配點、再出發，一路打過 32 張地圖。
      </div>
      <div class="field"><label>① 選角色</label>
        <div class="chargrid" id="rpgCharRow"></div>
      </div>
      <div class="field"><label>② 能力配點（剩餘 <b id="rpgLeft" style="color:#ffe6a3">9</b> 點 · 每項上限 10 格）</label>
        <div class="rpgrows" id="rpgRows"></div>
        <div class="rpgsum" id="rpgSum"></div>
      </div>
      <div class="field"><label>③ 出發地圖（32 張 · 8 大主題 × 4 張地區）</label>
        <div class="seg wrap" id="segRpgTheme"></div>
        <div class="seg wrap" id="segRpgMap" style="margin-top:7px"></div>
      </div>
      <div class="rowbtns">
        <button class="ghostbtn" id="btnRpgRandom" type="button">🎲 電腦隨機分配</button>
        <button class="biggo" id="btnRpgStart" type="button">開始冒險 →</button>
      </div>
      <div class="backrow">
        <button class="ghostbtn" data-back="1">← 回主選單</button>
      </div>
    </div>
  </div>

  <!-- 遊戲說明（v3.5） -->"""
sub(OLD_HTML, NEW_HTML, 'HTML：RPG 畫面')

# ============================================================
# 3. JS：RPG 核心（插在 __BH 之前，此時所有 const 都已初始化）
# ============================================================
OLD_JS = """window.__BH = {"""
NEW_JS = """// ================================================================
//   v4.0：版本更新紀錄（面板資料 —— 之後每發布一版，往陣列最前面加一筆）
// ================================================================
const VERSION_LOG = [
  { v: '4.0', date: '2026-11-01', now: true, items: [
    '<b>全新模式</b>：新增「RPG 模式（測試版）」，獨立於一般闖關 —— 屬性、地圖、傷害規則完全分開，互不干擾',
    '<b>數值系統</b>：HP（生命）、防禦（護甲）、速度、攻擊 四維屬性，上限 10 格；創角時自由配 9 點，也可按「🎲 電腦隨機分配」',
    '<b>怪物平衡</b>：小怪全面導入血量與防禦 —— 基礎 1~2 格、中階 2~4 格、飛行 1~3 格、BOSS 10 格以上；BOSS 血量低於 40% 進入暴走（更快、丟彈更兇），被炸彈砸到會暈眩',
    '<b>32 張動態地圖</b>：8 大主題 × 4 張地區小地圖；同主題嚴格共用色系與元素；不規則有機地形（島嶼／迷宮／L 型／洞穴／環形…），對應小 13×11、中 15×13、大 17×15、超大 21×15，生成後自動做路徑檢核',
    '<b>首頁擴充</b>：左上角新增「版本更新內容」面板（就是這一頁，每次改版都會補上）；新增「🛒 商店」鈕（未來開放）'
  ] },
  { v: '3.9', date: '2026-10-31', items: [
    '手機右下角三顆按鈕不再用表情符號：放彈＝黑亮圓球炸彈、遙控＝LED 遙控彈、吐火＝四層水滴火焰（跟場上的道具同一套畫法）',
    '按鈕外加三層同心金屬圓框（盤面／金屬環／深色外圈）＋外緣細白線＋上緣玻璃反光，放彈橘銅、遙控青色、吐火火紅'
  ] },
  { v: '3.8', date: '2026-10-30', items: [
    '💣 炸彈／遙控彈／火焰圖示重繪：黑色圓型炸彈＋點燃火苗與火星、快爆時透紅；遙控彈多一塊青色 LED 面板',
    '💬 頭上對話框台詞換新（死亡 3 句、擊殺 3 句），10 國語言同步',
    '🏆 對戰勝利過場由 1.8 秒加長到約 4.2 秒，並加上全新 8-bit 勝利音樂',
    '🌋 第二關熔岩洞窟配色提亮：硬牆改冷調紫黑曜石、軟磚改暖亮橙，一眼分出炸得動／炸不動',
    '🗑️ 移除「瀏覽人數／按讚」功能（前端＋後端 API 整組刪除）'
  ] },
  { v: '3.7', date: '2026-10-30', items: [
    '統計功能針對雲端平台更耐用：請求逾時＋背景自動重試、支援持久磁碟、結束訊號同步落盤',
    '（此功能已於 v3.8 依需求移除）'
  ] },
  { v: '3.6', date: '2026-10-30', items: [
    '首頁左上角新增「👁 實際瀏覽人數 ＋ 👍 按讚」，沒有後端時自動退回本機統計（已於 v3.8 移除）'
  ] },
  { v: '3.5', date: '2026-10-30', items: [
    '首頁新增「📖 遊戲說明」六大分頁教學：基本操作／道具總覽／坐騎招式／場景機關／怪物圖鑑／實戰訣竅',
    '說明頁的小圖直接用遊戲自己的繪圖函式畫出來，跟實機一模一樣'
  ] },
  { v: '3.4', date: '2026-10-30', items: [
    '修正手機的系統返回手勢會在玩到一半誤觸、跳出暫停選單的問題'
  ] },
  { v: '3.3', date: '2026-10-30', items: [
    '線上配對的錯誤訊息全部改成人話（開檔案模式／沒有後端時都給明確指引）'
  ] },
  { v: '3.2', date: '2026-10-30', items: [
    '玩家資訊欄移到最上方工具列左側，遊戲可視範圍再放大'
  ] },
  { v: '3.1', date: '2026-10-30', items: [
    '獲獎人物縮小、右上角新增「下一步」快捷鈕'
  ] },
  { v: '3.0', date: '2026-10-30', items: [
    '首頁左上角新增作者公告欄（含 FB 連結、可收合）'
  ] }
];

const VersionLog = (function () {
  let built = false;
  function build() {
    const box = $id('verLogBody');
    if (!box || built) return;
    built = true;
    box.innerHTML = VERSION_LOG.map(function (e) {
      return '<div class="vlog-item' + (e.now ? ' hot' : '') + '">' +
        '<div class="vlog-v">' + (e.now ? '<span class="tagnow">當前版本</span>' : '') +
        'Ver ' + e.v + ' <span class="vdate">' + e.date + '</span></div>' +
        '<ul>' + e.items.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>' +
        '</div>';
    }).join('');
  }
  function show() { build(); const p = $id('verLog'); if (p) p.classList.remove('hide'); }
  function hide() { const p = $id('verLog'); if (p) p.classList.add('hide'); }
  return { show: show, hide: hide, build: build, list: function () { return VERSION_LOG; } };
})();
(function () {
  const open = $id('verLogBtn'), close = $id('verLogClose'), panel = $id('verLog');
  if (open) open.addEventListener('click', function () {
    AudioSys.ensure(); AudioSys.sfx('click'); VersionLog.show();
  });
  if (close) close.addEventListener('click', function () { AudioSys.sfx('click'); VersionLog.hide(); });
  if (panel) panel.addEventListener('click', function (e) { if (e.target === panel) VersionLog.hide(); });
  const store = $id('btnStore');
  if (store) store.addEventListener('click', function () {
    AudioSys.ensure(); AudioSys.sfx('click');
    toast('🛒 商店正在準備中 —— 之後可以用金幣換道具與造型，敬請期待！', 2.8);
  });
})();

// ================================================================
//   v4.0：RPG 模式
// ================================================================
const RPG_POINTS = 9;                 // 創角只能自由配 9 點
const RPG_CAP = 10;                   // 每項屬性上限 10 格
const RPG_ATTRS = [
  { k: 'hp',  n: '生命 HP',  ico: '❤️', desc: '每點 +1 點生命（基礎 2 點）；生命歸零就結束冒險' },
  { k: 'def', n: '防禦 ARM', ico: '🛡️', desc: '每點 +1 點護甲；護甲先替你擋傷害，每過一關補滿' },
  { k: 'spd', n: '速度 SPD', ico: '👟', desc: '每點 +5% 移動速度（走位、躲爆炸都看這個）' },
  { k: 'atk', n: '攻擊 ATK', ico: '💥', desc: '每 2 點 +1 格爆炸範圍；每 3 點 +1 點火焰傷害' }
];
const RPG = {
  alloc: { hp: 3, def: 2, spd: 2, atk: 2 },
  char: 0,
  theme: 0,
  sub: 0
};
function rpgSum(a) { return (a.hp || 0) + (a.def || 0) + (a.spd || 0) + (a.atk || 0); }
function rpgLeft() { return RPG_POINTS - rpgSum(RPG.alloc); }
function rpgDerive(a) {
  a = a || RPG.alloc;
  const hp = a.hp || 0, def = a.def || 0, spd = a.spd || 0, atk = a.atk || 0;
  return {
    maxHp: 2 + hp,                    // 生命點數 → 實際生命值
    armor: def,                       // 防禦點數 → 護甲點數
    spdMul: 1 + spd * .05,            // 速度 +5% / 點
    range: Math.min(RPG_CAP, 1 + Math.floor(atk / 2)),   // 攻擊 → 爆炸範圍
    dmg: 1 + Math.floor(atk / 3)      // 攻擊 → 火焰傷害
  };
}
function rpgRandomAlloc() {
  const keys = ['hp', 'def', 'spd', 'atk'];
  const a = { hp: 1, def: 1, spd: 1, atk: 1 };     // 先各給 1 點，避免全押同一項
  let left = RPG_POINTS - 4;
  let guard = 0;
  while (left > 0 && guard++ < 400) {
    const k = keys[Math.floor(Math.random() * keys.length)];
    if (a[k] >= RPG_CAP) continue;
    a[k] += 1; left -= 1;
  }
  RPG.alloc = a;
  return a;
}

// ---------- 32 張地圖：8 大主題 × 4 張地區小地圖 ----------
const MAP32 = [
  { n: '微風草原', shape: 'open' },   { n: '灌木迷宮', shape: 'maze' },
  { n: '蘑菇林道', shape: 'bend' },   { n: '湖畔空地', shape: 'island' },
  { n: '熔岩入口', shape: 'caves' },  { n: '岩漿吊橋', shape: 'bend' },
  { n: '火山口',   shape: 'rings' },  { n: '熔核深處', shape: 'arena' },
  { n: '雪原邊界', shape: 'open' },   { n: '冰柱森林', shape: 'pillars' },
  { n: '凍湖裂隙', shape: 'island' }, { n: '極光台地', shape: 'arena' },
  { n: '流沙沙丘', shape: 'open' },   { n: '金字塔迴廊', shape: 'maze' },
  { n: '綠洲遺跡', shape: 'island' }, { n: '法老王廳', shape: 'rings' },
  { n: '霓虹大街', shape: 'bend' },   { n: '電路迷宮', shape: 'maze' },
  { n: '夜店廣場', shape: 'arena' },  { n: '雲端高塔', shape: 'pillars' },
  { n: '珊瑚礁群', shape: 'island' }, { n: '沉船貨艙', shape: 'caves' },
  { n: '海底神殿', shape: 'rings' },  { n: '深淵裂口', shape: 'bend' },
  { n: '浮空平台', shape: 'pillars' },{ n: '齒輪高塔', shape: 'rings' },
  { n: '風之迴廊', shape: 'maze' },   { n: '要塞核心', shape: 'arena' },
  { n: '魔城大門', shape: 'caves' },  { n: '血池沼窟', shape: 'island' },
  { n: '詛咒迴廊', shape: 'bend' },   { n: '魔王之間', shape: 'open' }
].map(function (m, i) {
  return { idx: i, theme: Math.floor(i / 4), sub: i % 4, n: m.n, shape: m.shape };
});
function map32Name(i) {
  const m = MAP32[((i % 32) + 32) % 32];
  return m.theme + 1 + '-' + (m.sub + 1) + '　' + m.n;
}
// 固定種子的亂數（同一張地圖每次長得一樣，玩家可以記圖）
function rngFrom(seed) {
  let a = (seed | 0) >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- 不規則有機地形生成 ----------
// shape：open 洞穴 / island 破碎島嶼 / maze 迷宮 / bend L 型 / pillars 樑柱陣
//        rings 環形 / caves 雙洞穴 / arena 中央競技場
function organicGrid(cols, rows, shape, rnd) {
  const g = [];
  for (let y = 0; y < rows; y++) g.push(new Array(cols).fill(1));
  const inn = function (x, y) { return x > 0 && y > 0 && x < cols - 1 && y < rows - 1; };
  const dig = function (x, y) { if (inn(x, y)) g[y][x] = 0; };
  const digR = function (x, y, w) {
    w = w || 0;
    for (let dy = -w; dy <= w; dy++) for (let dx = -w; dx <= w; dx++) dig(x + dx, y + dy);
  };
  const ri = function (a, b) { return a + Math.floor(rnd() * (b - a + 1)); };
  // 有機圓房間：邊緣用 sin/cos 擾動 → 不是死板的正圓或方形
  function room(cx, cy, rx, ry) {
    rx = Math.max(1.6, rx); ry = Math.max(1.6, ry);
    for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) {
      for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
        const nx = (x - cx) / rx, ny = (y - cy) / ry;
        const wob = .82 + .18 * Math.sin(x * 1.9 + cy * 1.3) * Math.cos(y * 1.5 + cx * .7);
        if (nx * nx + ny * ny <= wob) dig(x, y);
      }
    }
  }
  // L 型通道（先水平再垂直），寬度 w（0 = 單格）
  function corridor(x1, y1, x2, y2, w) {
    w = w || 0;
    let x = Math.round(x1), y = Math.round(y1), guard = 0;
    const tx = Math.round(x2), ty = Math.round(y2);
    while (x !== tx && guard++ < 400) { digR(x, y, w); x += tx > x ? 1 : -1; }
    guard = 0;
    while (y !== ty && guard++ < 400) { digR(x, y, w); y += ty > y ? 1 : -1; }
    digR(tx, ty, w);
  }
  const cx = Math.floor(cols / 2), cy = Math.floor(rows / 2);
  const rMaxX = Math.floor((cols - 3) / 2), rMaxY = Math.floor((rows - 3) / 2);

  if (shape === 'island') {
    const n = 3 + Math.floor(rnd() * 3);
    const pts = [];
    for (let i = 0; i < n; i++) {
      const px = ri(3, Math.max(3, cols - 4)), py = ri(3, Math.max(3, rows - 4));
      room(px, py, ri(2, 3), ri(2, 3));
      pts.push([px, py]);
    }
    for (let i = 1; i < pts.length; i++) corridor(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], 0);
  } else if (shape === 'maze') {
    const step = 2;
    const cellsX = Math.max(2, Math.floor((cols - 1) / step));
    const cellsY = Math.max(2, Math.floor((rows - 1) / step));
    const vis = {}; vis['0,0'] = true;
    dig(1, 1);
    const stack = [[0, 0]];
    while (stack.length) {
      const cur = stack[stack.length - 1];
      const opts = [];
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        const nx = cur[0] + d[0], ny = cur[1] + d[1];
        if (nx < 0 || ny < 0 || nx >= cellsX || ny >= cellsY) return;
        if (vis[nx + ',' + ny]) return;
        opts.push([nx, ny]);
      });
      if (!opts.length) { stack.pop(); continue; }
      const nx = opts[Math.floor(rnd() * opts.length)];
      const ax = 1 + cur[0] * step, ay = 1 + cur[1] * step;
      const bx = 1 + nx[0] * step, by = 1 + nx[1] * step;
      dig(ax, ay); dig(bx, by);
      dig(Math.round((ax + bx) / 2), Math.round((ay + by) / 2));
      vis[nx[0] + ',' + nx[1]] = true;
      stack.push(nx);
    }
    // 隨機敲掉一些牆 → 迷宮變「有機」、不再一整排死板方格
    for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) {
      if (g[y][x] === 1 && rnd() < .18) dig(x, y);
    }
  } else if (shape === 'bend') {
    const ax = 2 + Math.floor(rMaxX * .35), ay = 2 + Math.floor(rMaxY * .35);
    const bx = cols - 3 - Math.floor(rMaxX * .35), by = rows - 3 - Math.floor(rMaxY * .35);
    room(ax, ay, 3, 2);
    room(bx, by, 3, 2);
    corridor(ax, ay, bx, ay, 1);
    corridor(bx, ay, bx, by, 1);
  } else if (shape === 'pillars') {
    for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) dig(x, y);
    for (let y = 2; y < rows - 2; y += 2) for (let x = 2; x < cols - 2; x += 2) {
      if (rnd() < .72) g[y][x] = 1;
    }
  } else if (shape === 'rings') {
    for (let x = 1; x < cols - 1; x++) { dig(x, 1); dig(x, 2); dig(x, rows - 2); dig(x, rows - 3); }
    for (let y = 1; y < rows - 1; y++) { dig(1, y); dig(2, y); dig(cols - 2, y); dig(cols - 3, y); }
    room(cx, cy, Math.max(2, rMaxX - 3), Math.max(2, rMaxY - 3));
    corridor(cx, cy, cx, 2, 0); corridor(cx, cy, cx, rows - 3, 0);
    corridor(cx, cy, 2, cy, 0); corridor(cx, cy, cols - 3, cy, 0);
  } else if (shape === 'caves') {
    room(cx - rMaxX * .45, cy, rMaxX * .45, rMaxY * .62);
    room(cx + rMaxX * .45, cy, rMaxX * .40, rMaxY * .55);
    room(cx, cy + rMaxY * .55, rMaxX * .30, rMaxY * .30);
    corridor(Math.round(cx - rMaxX * .45), cy, Math.round(cx + rMaxX * .45), cy, 1);
    corridor(cx, cy, cx, Math.round(cy + rMaxY * .55), 0);
  } else if (shape === 'arena') {
    room(cx, cy, rMaxX * .58, rMaxY * .58);
    [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(function (d) {
      const ex = cx + d[0] * (rMaxX - 1), ey = cy + d[1] * (rMaxY - 1);
      corridor(cx, cy, ex, ey, 1);
      room(ex, ey, 2, 2);
    });
  } else {   // open：一大顆有機洞穴 + 幾個小瘤
    room(cx, cy, rMaxX - ri(1, 3), rMaxY - ri(1, 2));
    for (let i = 0; i < 3; i++) {
      const a = rnd() * 6.283, d = .5 + rnd() * .35;
      room(cx + Math.cos(a) * rMaxX * d, cy + Math.sin(a) * rMaxY * d, ri(2, 3), ri(2, 3));
    }
  }
  // 出生點一定挖開，並接到地圖中央（保證開局走得出）
  dig(1, 1); dig(2, 1); dig(1, 2); dig(2, 2);
  corridor(2, 2, cx, cy, 0);
  return g;
}
// 從 (sx,sy) 做 BFS：軟磚(2) 視為可通行（炸得開），岩層(1) 擋住
function bfsReach(g, cols, rows, sx, sy) {
  const seen = [];
  for (let y = 0; y < rows; y++) seen.push(new Array(cols).fill(false));
  const q = [[sx, sy]];
  seen[sy][sx] = true;
  let n = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const x = q[qi][0], y = q[qi][1];
    n++;
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
      const nx = x + d[0], ny = y + d[1];
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) return;
      if (seen[ny][nx]) return;
      if (g[ny][nx] === 1) return;
      seen[ny][nx] = true;
      q.push([nx, ny]);
    });
  }
  seen.count = n;
  return seen;
}

// 把不規則地形灌進 Game.grid（含軟磚、道具、出口門、機關）
function buildOrganicMap(cols, rows, theme, info, rnd, opts) {
  opts = opts || {};
  Game.cols = cols; Game.rows = rows;
  Game.T = tileSize();
  Game.ox = Math.floor((VIEW_W - Game.T * cols) / 2);
  Game.oy = Math.floor((VIEW_H - Game.T * rows) / 2);
  Game.camSnap = true;
  Game.hazards = []; Game.warps = []; Game.bubbles = []; Game.eggs = [];
  Game.hidden = {};

  // 1) 長地形 → 連通檢核 → 孤島封成岩層（避免走不到的區域浪費空間）
  let g = null, tries = 0;
  const floorNeed = Math.floor((cols - 2) * (rows - 2) * .34);
  while (tries < 6) {
    const r2 = rngFrom((opts.seed || 12345) + tries * 7919);
    g = organicGrid(cols, rows, info.shape, r2);
    const reach = bfsReach(g, cols, rows, 1, 1);
    let ok = reach.count >= floorNeed;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (g[y][x] !== 1 && !reach[y][x]) { g[y][x] = 1; }      // 封掉走不到的孤島
    }
    if (ok) break;
    tries++;
  }
  // 保底：地形真的太破碎 → 回到經典棋盤（一定有路）
  if (!g) g = organicGrid(cols, rows, 'open', rndFrom(opts.seed || 12345));
  Game.grid = g;

  // 2) 軟磚：空地隨機鋪（出生點 4x4 保持淨空）
  const softRate = opts.softRate == null ? .46 : opts.softRate;
  const softs = [];
  for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) {
    if (g[y][x] !== 0) continue;
    if (x <= 3 && y <= 3) continue;
    if (rnd() < softRate) { g[y][x] = 2; softs.push({ x: x, y: y }); }
  }

  // 3) 道具藏在軟磚底下
  const pool = ITEM_POOL.slice();
  let itemCount = Math.min(opts.items || 14, softs.length);
  for (let i = 0; i < itemCount; i++) {
    const idx = Math.floor(rnd() * softs.length);
    const s = softs.splice(idx, 1)[0];
    Game.hidden[s.y + ',' + s.x] = pool[Math.floor(rnd() * pool.length)];
  }

  // 4) 出口門：放在「離出生點最遠」的可達格（軟磚下就藏著）
  Game.door = null;
  Game.doorHinted = false;
  const reach2 = bfsReach(Game.grid, cols, rows, 1, 1);
  let best = null, bd = -1;
  for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) {
    if (Game.grid[y][x] === 1 || !reach2[y][x]) continue;
    const d = Math.abs(x - 1) + Math.abs(y - 1);
    if (d > bd) { bd = d; best = { x: x, y: y }; }
  }
  if (best) {
    const isSoft = Game.grid[best.y][best.x] === 2;
    Game.door = { x: best.x, y: best.y, revealed: !isSoft, open: false };
    if (isSoft) Game.hidden[best.y + ',' + best.x] = 'door';
  } else {
    ensureDoor({ spawns: [{ x: 1, y: 1 }] });
  }

  // 5) 地形機關（同主題共用元素：冰面／輸送帶／傳送門）
  if (settings.hazards === 'on' && theme.hazards && theme.hazards.length) {
    const hz = theme.hazards;
    const put = function (x, y, obj) {
      if (x <= 0 || y <= 0 || x >= cols - 1 || y >= rows - 1) return false;
      if (Game.grid[y][x] === 1) return false;
      if (Game.door && Game.door.x === x && Game.door.y === y) return false;
      if (Game.hazards[y][x]) return false;
      Game.grid[y][x] = 0;
      Game.hazards[y][x] = obj;
      return true;
    };
    if (hz.indexOf('ice') >= 0) {
      const blobs = 2 + Math.floor(rnd() * 3);
      for (let b = 0; b < blobs; b++) {
        const bx = 3 + Math.floor(rnd() * Math.max(1, cols - 6));
        const by = 3 + Math.floor(rnd() * Math.max(1, rows - 6));
        const r = 1 + Math.floor(rnd() * 2);
        for (let y = by - r; y <= by + r; y++) for (let x = bx - r; x <= bx + r; x++) put(x, y, { type: 'ice' });
      }
    }
    if (hz.indexOf('convey') >= 0) {
      const cnt = 1 + Math.floor(rnd() * 2);
      for (let i = 0; i < cnt; i++) {
        const y = 2 + Math.floor(rnd() * Math.max(1, rows - 4));
        const dir = rnd() < .5 ? 'right' : 'left';
        for (let x = 1; x < cols - 1; x++) put(x, y, { type: 'convey', dir: dir });
      }
    }
    if (hz.indexOf('warp') >= 0) {
      const floors = [];
      for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) {
        if (Game.grid[y][x] === 0 && !Game.hazards[y][x]) floors.push({ x: x, y: y });
      }
      const pairs = Math.max(1, Math.min(3, Math.floor(floors.length / 16)));
      for (let i = 0; i < pairs && floors.length > 1; i++) {
        const f = floors.splice(Math.floor(rnd() * floors.length), 1)[0];
        const f2 = floors.splice(Math.floor(rnd() * floors.length), 1)[0];
        const ci = i % WARP_COLORS.length, wc = WARP_COLORS[ci];
        Game.hazards[f.y][f.x] = { type: 'warp', link: f2, cool: 0, ci: ci, color: wc.hex };
        Game.hazards[f2.y][f2.x] = { type: 'warp', link: f, cool: 0, ci: ci, color: wc.hex };
        Game.warps.push([f, f2]);
      }
    }
  }
}

// ---------- RPG 怪物數值（血量／防禦／速度倍率）----------
const RPG_FOE = {
  slime:  { hp: 2, def: 0, spd: .82 },   // 基礎小怪
  mush:   { hp: 1, def: 0, spd: .88 },
  crab:   { hp: 2, def: 0, spd: .94 },
  beetle: { hp: 3, def: 1, spd: 1.00 },  // 中階：硬殼，防禦 1
  skull:  { hp: 3, def: 1, spd: 1.06 },
  lizard: { hp: 4, def: 0, spd: 1.28 },  // 疾風蜥：血多又快
  bat:    { hp: 1, def: 0, spd: 1.00 },  // 飛行：穿牆
  ghost:  { hp: 2, def: 0, spd: 1.00 },
  bee:    { hp: 1, def: 0, spd: 1.12 },
  eye:    { hp: 3, def: 0, spd: 1.00 }
};
function rpgFoePool(stage) {
  const ground = ['slime', 'beetle', 'crab', 'skull', 'mush', 'lizard'];
  const flying = ['bat', 'ghost', 'bee', 'eye'];
  if (stage <= 2) return ground.slice(0, 3);
  if (stage <= 5) return ground.slice(0, 4).concat(['bat']);
  if (stage <= 9) return ground.slice(0, 5).concat(flying.slice(0, 2));
  if (stage <= 16) return ground.concat(flying.slice(0, 3));
  return ground.concat(flying);
}
// 火焰對怪物的傷害：RPG 模式看玩家的「攻擊」點數與怪物防禦
function flameHitDamage(e) {
  if (!Game.rpg) return 1;
  const p = Game.players[0];
  const atk = (p && p.rpg) ? p.rpg.atk : 0;
  return Math.max(1, (1 + Math.floor(atk / 3)) - ((e && e.def) || 0));
}

// ---------- RPG 受傷（生命 → 護甲 → 倒地）----------
function rpgHurt(p, silent, killer) {
  if (!p || !p.alive || p.invuln > 0) return;
  if (p.dino) { breakDino(p); return; }              // 坐騎先擋一次
  let dmg = (killer && killer.type === 'boss') ? 2 : 1;
  let left = dmg;
  if (p.armorCur > 0) {                              // 護甲先擋
    const a = Math.min(p.armorCur, left);
    p.armorCur -= a; left -= a;
  }
  if (left > 0) p.hpCur = Math.max(0, p.hpCur - left);
  p.invuln = 1.15;
  p.cry = 1.3;
  Game.shake = Math.max(Game.shake || 0, .32);
  burst(p.x, p.y, p.ch.color, 12, 180);
  AudioSys.sfx('hurt');
  if (p.hpCur <= 0) {                                // 生命歸零 → 冒險失敗
    p.alive = false; p.dead = true; p.lives = 0; p.respawnT = 1.2; p.cry = 2.8;
    AudioSys.sfx('die');
    burst(p.x, p.y, p.ch.color, 22, 220);
    startGloat(killer, p);
    bubbleDeathPair(p, killer, Game.T * 1.98, (killer && killer.r) ? killer.r + 18 : Game.T * 1.98);
  } else {
    banner('❤️ ' + p.hpCur + ' / ' + p.hpMax + (p.armorMax > 0 ? '　🛡️ ' + p.armorCur + ' / ' + p.armorMax : ''), 1.1);
  }
}

// ---------- RPG 關卡 ----------
function buildRpgStage(stage, fresh) {
  const size = SIZES[settings.size] || SIZES.M;
  const cols = size[0], rows = size[1];
  const info = MAP32[((stage - 1) % 32 + 32) % 32];
  const theme = THEMES[info.theme];
  const p = Game.players[0];
  Game.theme = theme;
  Game.mapInfo = info;
  const seed = 1000 + info.idx * 7919 + cols * 37 + rows * 11;
  buildOrganicMap(cols, rows, theme, info, rngFrom(seed), { seed: seed, items: 14 + Math.round(stage * 1.1) });
  p.x = 1 * Game.T + Game.T / 2;
  p.y = 1 * Game.T + Game.T / 2;
  p.alive = true; p.invuln = 2; p.carry = null; p.slide = null; p.warpLock = '';
  if (fresh) {
    resetPlayerStats(p);
    p.power = rpgDerive(p.rpg).range;
  }
  p.hpCur = p.hpMax;
  p.armorCur = p.armorMax;                 // 每過一關護甲補滿
  // ---- 敵人 ----
  Game.enemies = [];
  const pool = rpgFoePool(stage);
  const n = Math.max(4, Math.round((5 + stage * .7) * (cols * rows) / (15 * 13)));
  for (let i = 0; i < n; i++) {
    let x = 1, y = 1, tries = 0;
    do {
      x = 1 + Math.floor(Math.random() * (cols - 2));
      y = 1 + Math.floor(Math.random() * (rows - 2));
      tries++;
    } while ((cellAt(x, y) !== 0 || (x < 4 && y < 4) || bombAt(x, y)) && tries < 200);
    const type = pool[i % pool.length];
    const e = makeEnemy(x, y, type, Math.min(8, Math.floor(stage / 4) + 1), 1);
    const F = RPG_FOE[type] || { hp: 1, def: 0, spd: 1 };
    e.hp = F.hp; e.maxHp = F.hp; e.def = F.def;
    e.speed = e.speed * F.spd;
    Game.enemies.push(e);
  }
  // 第 32 張（魔王之間）＝ BOSS 關
  if (stage >= 32) {
    const by = Math.max(1, rows - 3), bx = clamp(Math.floor(cols / 2), 1, cols - 2);
    Game.grid[by][bx] = 0;
    const boss = makeBoss(bx, by, 12 + Math.round(stage * .35));
    boss.def = 1;
    boss.dirName = 'up';
    Game.enemies.push(boss);
  }
  spawnEggs(1);
  Game.timer = Infinity;
  Game.bombs = []; Game.flames = []; Game.items = []; Game.particles = [];
  Game.sdIndex = 0; Game.sdList = [];
  hideOverlay();
  buildSdList();
}

function startRpg(stage) {
  Game.mode = 'rpg';
  Game.rpg = true;
  Game.bossRush = false;
  Game.stage = stage || 1;
  Game.endShown = false;
  Game.state = 'idle';
  Game.players = [];
  paused = false;
  const scheme = settings.ctrl === 'auto' ? Input.schemes.auto
    : ctrlMode() === 'touch' ? Input.schemes.touch
    : ctrlMode() === 'pad' ? Input.schemes.pad(0) : Input.schemes.kb1;
  const p = makePlayer(0, RPG.char, scheme, { px: 0, py: 0 });
  p.isHuman = true;
  p.rpg = { hp: RPG.alloc.hp, def: RPG.alloc.def, spd: RPG.alloc.spd, atk: RPG.alloc.atk };
  const d = rpgDerive(p.rpg);
  p.hpMax = d.maxHp; p.hpCur = d.maxHp;
  p.armorMax = d.armor; p.armorCur = d.armor;
  p.rpgSpd = d.spdMul;
  p.power = d.range;
  p.lives = 1;
  p.score = 0;
  Game.players.push(p);
  Screen.show('game');
  resizeView();
  buildRpgStage(Game.stage, true);
  showOverlay({
    title: '🎲 RPG 模式　第 ' + Game.stage + ' / 32 關',
    sub: map32Name(Game.stage - 1) + '\n' +
      '❤️ 生命 ' + p.hpMax + '　🛡️ 護甲 ' + p.armorMax + '　👟 速度 ' + Math.round((d.spdMul - 1) * 100) +
      '%　💥 火力 ' + d.range + ' 格（傷害 ' + d.dmg + '）',
    btn: '出發！',
    action: function () { beginCountdown('battle'); }
  });
  AudioSys.startBGM(stageBGM(Math.min(8, Math.floor((Game.stage - 1) / 4) + 1)));
  updateHud();
  enterImmersive();
}

// ---------- RPG 血條 HUD ----------
function drawRpgHud(T) {
  if (!Game.rpg) return;
  // 敵人頭上的血量條（受過傷才顯示）
  for (let i = 0; i < Game.enemies.length; i++) {
    const e = Game.enemies[i];
    if (!e.maxHp || e.maxHp <= 1) continue;
    if (e.hp >= e.maxHp && e.type !== 'boss') continue;
    const w = Math.max(16, T * .58), h = Math.max(3, T * .07);
    const x = e.x - w / 2, y = e.y - enemyArtR(e) - h - 5;
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.fillRect(x - 1.2, y - 1.2, w + 2.4, h + 2.4);
    ctx.fillStyle = e.type === 'boss' ? '#ffd166' : '#7fe08a';
    ctx.fillRect(x, y, w * clamp(e.hp / e.maxHp, 0, 1), h);
  }
  const p = Game.players[0];
  if (!p || !p.alive) return;
  // 玩家腳下的「生命條 ＋ 護甲條」
  const w = Math.max(30, T * 1.05), h = Math.max(4, T * .10);
  const x = p.x - w / 2, y = p.y + T * .44;
  const hpF = clamp(p.hpCur / Math.max(1, p.hpMax), 0, 1);
  ctx.fillStyle = 'rgba(6,10,20,.75)';
  ctx.fillRect(x - 1.5, y - 1.5, w + 3, h + 3);
  let g = null;
  if (ctx.createLinearGradient) { try { g = ctx.createLinearGradient(x, y, x + w, y); } catch (e) { g = null; } }
  if (g && g.addColorStop) {
    g.addColorStop(0, hpF > .5 ? '#7cf08c' : hpF > .25 ? '#ffd166' : '#ff6a7a');
    g.addColorStop(1, hpF > .5 ? '#2c9c4c' : hpF > .25 ? '#d8892a' : '#b02234');
    ctx.fillStyle = g;
  } else ctx.fillStyle = hpF > .5 ? '#5fd070' : '#e0533f';
  ctx.fillRect(x, y, w * hpF, h);
  if (p.armorMax > 0) {
    const af = clamp(p.armorCur / p.armorMax, 0, 1);
    ctx.fillStyle = 'rgba(6,10,20,.75)';
    ctx.fillRect(x - 1.5, y - h - 3, w + 3, h * .8 + 1.5);
    ctx.fillStyle = '#7fd0ff';
    ctx.fillRect(x, y - h - 2.4, w * af, h * .8);
  }
}

// ---------- RPG 創角畫面 ----------
const Rpg = (function () {
  let inited = false;
  function sumHtml() {
    const d = rpgDerive(RPG.alloc);
    return '實際能力 → ❤️ 生命 <b>' + d.maxHp + '</b>　🛡️ 護甲 <b>' + d.armor +
      '</b>　👟 速度 <b>+' + Math.round((d.spdMul - 1) * 100) + '%</b>　💥 火力 <b>' + d.range +
      ' 格</b>（傷害 ' + d.dmg + '）';
  }
  function renderStats() {
    const box = $id('rpgRows');
    if (!box) return;
    const left = rpgLeft();
    box.innerHTML = RPG_ATTRS.map(function (a) {
      const v = RPG.alloc[a.k] || 0;
      let pips = '';
      for (let i = 0; i < RPG_CAP; i++) pips += '<i class="' + (i < v ? 'on' : '') + '"></i>';
      return '<div class="rpgrow" data-k="' + a.k + '">' +
        '<div class="rpgname">' + a.ico + ' ' + a.n + '</div>' +
        '<div class="rpgpips">' + pips + '</div>' +
        '<div class="rpgstep">' +
        '<button type="button" data-d="-1"' + (v <= 0 ? ' disabled' : '') + '>−</button>' +
        '<b>' + v + '</b>' +
        '<button type="button" data-d="1"' + ((v >= RPG_CAP || left <= 0) ? ' disabled' : '') + '>＋</button>' +
        '</div>' +
        '<div class="rpgdesc">' + a.desc + '</div>' +
        '</div>';
    }).join('');
    const lf = $id('rpgLeft');
    if (lf) lf.textContent = String(left);
    const sm = $id('rpgSum');
    if (sm) sm.innerHTML = sumHtml();
  }
  function renderChar() {
    const grid = $id('rpgCharRow');
    if (!grid) return;
    grid.innerHTML = CHARACTERS.map(function (c, i) {
      return '<button class="chcard' + (i === RPG.char ? ' sel' : '') + '" data-i="' + i + '" ' +
        'title="' + charName(c) + '（' + c.en + '）· ' + charTag(c) + '">' +
        '<canvas class="chpv" width="132" height="120" data-ch="' + i + '"></canvas>' +
        '<span class="ck">✓</span>' +
        '<span class="cn" style="color:' + shadeHex(c.color, .52) + '">' + charName(c) + '</span>' +
        '<span class="ct">' + charTag(c) + '</span></button>';
    }).join('');
    grid.querySelectorAll('.chcard').forEach(function (b) {
      b.addEventListener('click', function () {
        AudioSys.sfx('click');
        RPG.char = parseInt(b.getAttribute('data-i'), 10) % CHARACTERS.length;
        grid.querySelectorAll('.chcard').forEach(function (x) {
          x.classList.toggle('sel', parseInt(x.getAttribute('data-i'), 10) === RPG.char);
        });
        CharPreview.hop(RPG.char);
      });
    });
    CharPreview.mount(grid);
  }
  function renderMaps() {
    const th = $id('segRpgTheme'), sb = $id('segRpgMap');
    if (!th || !sb) return;
    th.innerHTML = THEMES.map(function (x, i) {
      return '<button type="button" data-v="' + i + '" class="' + (i === RPG.theme ? 'sel' : '') + '">' + x.name + '</button>';
    }).join('');
    sb.innerHTML = [0, 1, 2, 3].map(function (i) {
      const m = MAP32[RPG.theme * 4 + i];
      return '<button type="button" data-v="' + i + '" class="' + (i === RPG.sub ? 'sel' : '') + '">' +
        (RPG.theme + 1) + '-' + (i + 1) + '　' + m.n + '</button>';
    }).join('');
  }
  function wire() {
    if (inited) return;
    inited = true;
    const rows = $id('rpgRows');
    if (rows) rows.addEventListener('click', function (e) {
      const b = e.target && e.target.closest ? e.target.closest('button') : null;
      if (!b || b.disabled) return;
      const row = b.closest('.rpgrow');
      if (!row) return;
      const k = row.getAttribute('data-k');
      const d = parseInt(b.getAttribute('data-d'), 10);
      const v = RPG.alloc[k] || 0;
      if (d > 0) {
        if (rpgLeft() <= 0 || v >= RPG_CAP) return;
        RPG.alloc[k] = v + 1;
      } else {
        if (v <= 0) return;
        RPG.alloc[k] = v - 1;
      }
      AudioSys.sfx('click');
      renderStats();
    });
    const th = $id('segRpgTheme'), sb = $id('segRpgMap');
    if (th) th.addEventListener('click', function (e) {
      const b = e.target && e.target.closest ? e.target.closest('button') : null;
      if (!b) return;
      RPG.theme = parseInt(b.getAttribute('data-v'), 10) || 0;
      RPG.sub = 0;
      AudioSys.sfx('click');
      renderMaps();
    });
    if (sb) sb.addEventListener('click', function (e) {
      const b = e.target && e.target.closest ? e.target.closest('button') : null;
      if (!b) return;
      RPG.sub = parseInt(b.getAttribute('data-v'), 10) || 0;
      AudioSys.sfx('click');
      renderMaps();
    });
    const rndBtn = $id('btnRpgRandom');
    if (rndBtn) rndBtn.addEventListener('click', function () {
      AudioSys.ensure(); AudioSys.sfx('click');
      rpgRandomAlloc();
      renderStats();
    });
    const go = $id('btnRpgStart');
    if (go) go.addEventListener('click', function () {
      AudioSys.ensure(); AudioSys.sfx('click');
      startRpg(RPG.theme * 4 + RPG.sub + 1);
    });
    const btn = $id('btnRpg');
    if (btn) btn.addEventListener('click', function () {
      AudioSys.ensure(); AudioSys.sfx('click');
      Screen.show('rpg');
      render();
    });
  }
  function render() {
    wire();
    renderChar();
    renderStats();
    renderMaps();
  }
  return { render: render, renderStats: renderStats, renderMaps: renderMaps, renderChar: renderChar };
})();

window.__BH = {"""
sub(OLD_JS, NEW_JS, 'JS：RPG 核心')

# ============================================================
# 4. 掛載：updateSolo 支援 RPG、killPlayer 走 rpgHurt、speed、火焰傷害、HUD
# ============================================================
OLD_DISPATCH = """    } else if (Game.mode === 'solo') updateSolo(dt); else updateBattle(dt);"""
NEW_DISPATCH = """    } else if (Game.mode === 'solo' || Game.mode === 'rpg') updateSolo(dt); else updateBattle(dt);"""
sub(OLD_DISPATCH, NEW_DISPATCH, '掛載：RPG 共用 updateSolo')

OLD_KILL = """function killPlayer(p, silent, killer) {
  if (!p.alive || p.invuln > 0) return;"""
NEW_KILL = """function killPlayer(p, silent, killer) {
  // v4.0：RPG 模式不是「炸一下就死」，改成扣生命／護甲
  if (Game.rpg) { rpgHurt(p, silent, killer); return; }
  if (!p.alive || p.invuln > 0) return;"""
sub(OLD_KILL, NEW_KILL, '掛載：killPlayer → rpgHurt')

OLD_SPD = """function playerSpeed(p) {
  // 起始速度調快（原 118 → 146），每顆滑冰鞋 +20
  const base = 146 + p.speedLv * 20;
  return p.skull === 'slow' ? base * .45 : base;
}"""
NEW_SPD = """function playerSpeed(p) {
  // 起始速度調快（原 118 → 146），每顆滑冰鞋 +20
  const base = (146 + p.speedLv * 20) * (p.rpgSpd || 1);   // v4.0：RPG 的速度點數加成
  return p.skull === 'slow' ? base * .45 : base;
}"""
sub(OLD_SPD, NEW_SPD, '掛載：速度加成')

OLD_FLAME1 = """      e.hp = (e.hp || 1) - 1;
      if (e.hp > 0) {
        e.hitT = .55;"""
NEW_FLAME1 = """      e.hp = (e.hp || 1) - flameHitDamage(e);
      if (e.hp > 0) {
        e.hitT = .55;"""
sub(OLD_FLAME1, NEW_FLAME1, '掛載：火焰傷害 1')

OLD_FLAME2 = """      e.hp = (e.hp || 1) - 1;
      if (e.hp > 0) {                       // 鐵甲蟲 / 骷髏兵要炸兩次"""
NEW_FLAME2 = """      e.hp = (e.hp || 1) - flameHitDamage(e);
      if (e.hp > 0) {                       // 鐵甲蟲 / 骷髏兵要炸兩次"""
sub(OLD_FLAME2, NEW_FLAME2, '掛載：火焰傷害 2')

OLD_HUD = """  // 對話框氣泡（死亡／擊殺台詞）
  drawBubbles(T);"""
NEW_HUD = """  // v4.0：RPG 模式的血條（玩家生命／護甲）
  drawRpgHud(T);
  // 對話框氣泡（死亡／擊殺台詞）
  drawBubbles(T);"""
sub(OLD_HUD, NEW_HUD, '掛載：RPG HUD')

# ---- updateSolo：關數上限與下一關分流 ----
OLD_CLEAR = """        const cleared = Game.stage;
        if (cleared >= Solo.unlocked && cleared < 8) {"""
NEW_CLEAR = """        const cleared = Game.stage;
        const maxStage = (Game.mode === 'rpg') ? 32 : 8;
        if (Game.mode === 'solo' && cleared >= Solo.unlocked && cleared < maxStage) {"""
sub(OLD_CLEAR, NEW_CLEAR, '掛載：關數上限')

OLD_NEXT = """          if (Game.stage >= 8) {
            showEnd(Game.bossRush ? t('solo.bossWinTitle') : t('solo.winTitle'),"""
NEW_NEXT = """          if (Game.stage >= maxStage) {
            showEnd(Game.bossRush ? t('solo.bossWinTitle') : t('solo.winTitle'),"""
sub(OLD_NEXT, NEW_NEXT, '掛載：最後一關判定')

OLD_ADV = """              action: function () {
                Game.stage += 1;
                Game.theme = THEMES[Game.stage - 1];
                buildSoloStage(Game.stage, false);
                beginCountdown('battle');
                AudioSys.startBGM(stageBGM(Game.stage));
              }"""
NEW_ADV = """              action: function () {
                Game.stage += 1;
                if (Game.mode === 'rpg') {
                  const info = MAP32[(Game.stage - 1) % 32];
                  Game.theme = THEMES[info.theme];
                  buildRpgStage(Game.stage, false);
                  AudioSys.startBGM(stageBGM(Math.min(8, info.theme + 1)));
                } else {
                  Game.theme = THEMES[Game.stage - 1];
                  buildSoloStage(Game.stage, false);
                  AudioSys.startBGM(stageBGM(Game.stage));
                }
                beginCountdown('battle');
              }"""
sub(OLD_ADV, NEW_ADV, '掛載：下一關分流')

# ---- __BH 導出 ----
OLD_EXP = """  VERSION: VERSION, Help: (typeof Help !== 'undefined' ? Help : null),"""
NEW_EXP = """  VERSION: VERSION, Help: (typeof Help !== 'undefined' ? Help : null),
  // v4.0：RPG 模式
  RPG: RPG, RPG_ATTRS: RPG_ATTRS, RPG_POINTS: RPG_POINTS, RPG_CAP: RPG_CAP, RPG_FOE: RPG_FOE,
  MAP32: MAP32, VERSION_LOG: VERSION_LOG, VersionLog: VersionLog, Rpg: Rpg,
  rpgDerive: rpgDerive, rpgRandomAlloc: rpgRandomAlloc, rpgLeft: rpgLeft, rpgSum: rpgSum,
  organicGrid: organicGrid, bfsReach: bfsReach, buildOrganicMap: buildOrganicMap,
  buildRpgStage: buildRpgStage, startRpg: startRpg, rpgHurt: rpgHurt,
  flameHitDamage: flameHitDamage, drawRpgHud: drawRpgHud, rngFrom: rngFrom, map32Name: map32Name,"""
sub(OLD_EXP, NEW_EXP, '導出：RPG 介面')

open(P, 'wb').write(s.encode('utf-8'))
print('\n[patch_v40b] 完成 ' + str(len(s.encode('utf-8'))) + ' bytes')
