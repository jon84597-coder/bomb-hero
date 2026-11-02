# -*- coding: utf-8 -*-
# v2.0：
#   1) 音樂開關旁邊多一個「全視窗 ON/OFF」圖示
#   2) 飛行怪物速度比玩家慢
#   3) 過關的門要靠炸壞磚塊才會出現
#   4) 標題紅光暈拿掉 → 改成標題字型外凸的紅底形狀
#   5) 丟炸彈的人自己不會頭暈（只有被丟到的才暈）
#   6) 紅龍身體邊緣紅光閃爍（不外擴）
#   7) 玩家角色預設隨機
#   8) 全視窗旁邊多一個信箱圖示 jon84597@gmail.com
import io

P = 'index.html'
s = io.open(P, encoding='utf-8').read()

def rep(old, new, tag):
    global s
    assert old in s, 'MISS ' + tag
    assert s.count(old) == 1, 'DUP(' + str(s.count(old)) + ') ' + tag
    s = s.replace(old, new)
    print('OK', tag)

# ---------- 版本 ----------
rep("const VERSION = '1.9';", "const VERSION = '2.0';", 'VERSION')
rep('<span id="verTxt">1.9</span>', '<span id="verTxt">2.0</span>', 'verTxt')

# ==================================================================
# 1) + 8) 工具列：全視窗開關 + 信箱
# ==================================================================
rep("""    <button class="navbtn tg on" id="btnSfx" type="button" title="開關遊戲音效">🔊 <b>音效</b></button>
  </div>""",
"""    <button class="navbtn tg on" id="btnSfx" type="button" title="開關遊戲音效">🔊 <b>音效</b></button>
    <button class="navbtn tg" id="btnFull" type="button" title="全視窗 開／關">⛶ <b>全視窗</b></button>
    <a class="navbtn mail" id="btnMail" href="mailto:jon84597@gmail.com?subject=%E7%88%86%E7%88%86%E8%8B%B1%E9%9B%84%20BOMB%20HERO%20%E6%84%8F%E8%A6%8B%E5%9B%9E%E9%A5%8B"
       title="寫信給作者：jon84597@gmail.com">✉️ <b>信箱</b></a>
  </div>""", '工具列 HTML')

rep("""  .navbtn.tg { padding: 8px 13px; font-size: 13.5px; }""",
"""  .navbtn.tg { padding: 8px 13px; font-size: 13.5px; }
  /* v2.0：全視窗開關（ON 時亮起來） */
  .navbtn.tg.on { border-color: rgba(255,200,120,.85); }
  #btnFull.on { background: rgba(60,42,20,.86); color: #ffe6c9; }
  /* v2.0：信箱（<a> 也要長得跟按鈕一樣） */
  .navbtn.mail { text-decoration: none; }
  /* 窄螢幕：全視窗／信箱只留圖示，才不會把工具列擠爆 */
  @media (max-width: 520px) {
    #btnFull b, #btnMail b { display: none; }
    #btnFull, #btnMail { padding: 8px 12px; font-size: 15px; }
  }""", '工具列 CSS')

rep("""(function wireNavBar() {
  const b = $id('btnBack'); if (b) b.addEventListener('click', function () { Screen.back(); });
  const m = $id('btnMusic'); if (m) m.addEventListener('click', toggleMusic);
  const sf = $id('btnSfx'); if (sf) sf.addEventListener('click', toggleSfx);
  updateNavUI();
})();""",
"""// v2.0：全視窗狀態（按鈕亮／暗）＋ 信箱複製
const MAIL_ADDR = 'jon84597@gmail.com';
function updateFullBtn() {
  const el = $id('btnFull');
  if (!el) return;
  var on = !!document.fullscreenElement;
  el.classList.toggle('on', on);
  el.setAttribute('aria-pressed', on ? 'true' : 'false');
  var lb = el.querySelector('b');
  if (lb) lb.textContent = on ? '全視窗 ON' : '全視窗';
}
function copyMail(addr) {
  var done = false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(addr); done = true;
    }
  } catch (e) {}
  if (!done) {
    try {
      var ta = document.createElement('textarea');
      ta.value = addr; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
    } catch (e) {}
  }
}

(function wireNavBar() {
  const b = $id('btnBack'); if (b) b.addEventListener('click', function () { Screen.back(); });
  const m = $id('btnMusic'); if (m) m.addEventListener('click', toggleMusic);
  const sf = $id('btnSfx'); if (sf) sf.addEventListener('click', toggleSfx);
  // v2.0：全視窗開關（就在音樂／音效旁邊）
  const fs = $id('btnFull');
  if (fs) fs.addEventListener('click', function () {
    AudioSys.ensure(); AudioSys.sfx('click');
    toggleFullscreen();
    setTimeout(updateFullBtn, 260);
  });
  // v2.0：信箱（點一下複製地址，同時會開邮件軟體）
  const ml = $id('btnMail');
  if (ml) ml.addEventListener('click', function () {
    AudioSys.sfx('click');
    copyMail(MAIL_ADDR);
    toast('✉️ ' + MAIL_ADDR + '　（已複製，可直接貼到信箱）', 2.8);
  });
  try {
    document.addEventListener('fullscreenchange', updateFullBtn);
    document.addEventListener('webkitfullscreenchange', updateFullBtn);
  } catch (e) {}
  updateFullBtn();
  updateNavUI();
})();""", '工具列綁定')

# ==================================================================
# 2) 飛行怪速度比玩家慢
# ==================================================================
rep("""const FLY_SPEED_CAP = 0;""", """x""", 'nope') if False else None
rep("""function makeEnemy(x, y, type, stage, spdMul) {
  const M = spdMul || 1;
  const sp = speciesOf(type);""",
"""// v2.0：飛行怪再快也不能超過這個值（玩家基礎速度 146 → 飛行怪最高約 81%）
const FLY_SPEED_CAP = 118;
function makeEnemy(x, y, type, stage, spdMul) {
  const M = spdMul || 1;
  const sp = speciesOf(type);""", 'FLY_SPEED_CAP')

rep("""    speed: (sp.spd + stage * 2.6) * M, color: sp.color, color2: sp.color2,
    kind: sp.kind, r: sp.r, hp: 1,""",
"""    speed: (sp.spd + stage * 2.6) * M, color: sp.color, color2: sp.color2,
    kind: sp.kind, r: sp.r, hp: 1,""", 'speed 行（先占位）')

# 飛行種族基本速度調慢（原本 54~78，玩家是 146，但玩家只能走格子所以還是被追到）
rep("""  { id: 'bat',    name: '蝙蝠',   kind: 'fly',    wing: true,  r: 13, spd: 64, color: '#9a86e8', color2: '#4c3d94' },
  { id: 'ghost',  name: '幽靈',   kind: 'fly',    wing: true,  r: 14, spd: 54, color: '#dfe9ff', color2: '#8fa6cc' },
  { id: 'bee',    name: '毒蜂',   kind: 'fly',    wing: true,  r: 12, spd: 78, color: '#ffd166', color2: '#a9761a' },
  { id: 'eye',    name: '眼球怪', kind: 'fly',    wing: true,  r: 13, spd: 58, color: '#f4f6ff', color2: '#b04a6a' }""",
"""  { id: 'bat',    name: '蝙蝠',   kind: 'fly',    wing: true,  r: 13, spd: 46, color: '#9a86e8', color2: '#4c3d94' },
  { id: 'ghost',  name: '幽靈',   kind: 'fly',    wing: true,  r: 14, spd: 40, color: '#dfe9ff', color2: '#8fa6cc' },
  { id: 'bee',    name: '毒蜂',   kind: 'fly',    wing: true,  r: 12, spd: 56, color: '#ffd166', color2: '#a9761a' },
  { id: 'eye',    name: '眼球怪', kind: 'fly',    wing: true,  r: 13, spd: 44, color: '#f4f6ff', color2: '#b04a6a' }""",
'飛行種族降速')

# 飛行速度上限
rep("""  if (sp.id === 'beetle' || sp.id === 'skull') e.hp = 2;    // 有甲／硬骨頭：要炸兩次""",
"""  if (sp.id === 'beetle' || sp.id === 'skull') e.hp = 2;    // 有甲／硬骨頭：要炸兩次
  // v2.0：飛行怪一定比玩家慢（玩家基礎 146，飛行怪封頂 118）
  if (sp.kind === 'fly') e.speed = Math.min(e.speed, FLY_SPEED_CAP * M);""",
'飛行速度上限')

# ==================================================================
# 3) 過關的門要靠炸壞磚塊才會出現
# ==================================================================
rep("""    // 過關：敵人清光就強制把門露出來（就算還壓在軟磚下面），保證每關都走得到下一關
    if (Game.enemies.length === 0 && p.alive) {
      openDoorForce();
      if (Game.door && !Game.door.open) {
        Game.door.open = true;
        doorOpenFx(Game.door);
      }
    }""",
"""    // v2.0：門只能「炸開軟磚」才會出現 —— 不再自動掀開
    if (Game.enemies.length === 0 && p.alive) {
      const dr = Game.door;
      if (dr && !dr.revealed) {
        // 只剩硬牆、沒有軟磚可炸了（不然玩家會卡死）→ 才自動露門
        let softLeft = 0;
        for (let yy = 1; yy < G0.rows - 1; yy++)
          for (let xx = 1; xx < G0.cols - 1; xx++) if (G0.grid[yy][xx] === 2) softLeft++;
        if (softLeft === 0) openDoorForce();
        else if (!G0.doorHinted) {
          G0.doorHinted = true;
          banner('敵人清光了！炸開剩下的軟磚找出傳送門 🚪');
        }
      }
      if (dr && dr.revealed && !dr.open) { dr.open = true; doorOpenFx(dr); }
    }""", '門靠炸磚出現')

# G0 別名（上面那段用到）→ 直接用 Game 避免混亂
s = s.replace("""        for (let yy = 1; yy < G0.rows - 1; yy++)
          for (let xx = 1; xx < G0.cols - 1; xx++) if (G0.grid[yy][xx] === 2) softLeft++;
        if (softLeft === 0) openDoorForce();
        else if (!G0.doorHinted) {
          G0.doorHinted = true;""",
"""        for (let yy = 1; yy < Game.rows - 1; yy++)
          for (let xx = 1; xx < Game.cols - 1; xx++) if (Game.grid[yy][xx] === 2) softLeft++;
        if (softLeft === 0) openDoorForce();
        else if (!Game.doorHinted) {
          Game.doorHinted = true;""")
print('OK 門邏輯別名修正')

# 每關重新蓋地圖時清掉提示旗標
rep("""  Game.door = null;""",
"""  Game.door = null;
  Game.doorHinted = false;      // v2.0：新的地圖 → 重新允許「去炸磚找門」提示""",
'doorHinted 重置')

# ==================================================================
# 4) 標題：拿掉大光暈 → 改成字型外凸的紅底形狀
# ==================================================================
rep("""      <div class="titlewrap">
        <h1 class="title-en">BOMB HERO</h1>
        <div class="title-zh">爆爆英雄</div>
      </div>""",
"""      <div class="titlewrap">
        <h1 class="title-en" data-t="BOMB HERO">BOMB HERO</h1>
        <div class="title-zh" data-t="爆爆英雄">爆爆英雄</div>
      </div>""", 'data-t 屬性')

# --- 深色主題：整段替換 ---
i0 = s.index("""  /* v1.9：標題底下的深紅色噴發光芒（放射狀，會慢慢轉） */""")
i1 = s.index("""  .ver.beta { font-size: clamp(9px, 2.4vw, 11.5px); letter-spacing: .16em; opacity: .9; }""")
s = s[:i0] + """  /* v2.0：拿掉一整圈大光暈 → 改成「標題字型外凸出去的紅底形狀」 */
  .titlewrap { position: relative; padding: 8px 0 4px; }
  .titlewrap > * { position: relative; }
  .title-en, .title-zh { isolation: isolate; }
  .title-en::before, .title-zh::before {
    content: attr(data-t);
    position: absolute; left: 0; top: 0; width: 100%; z-index: -1;
    color: #7d0518; -webkit-text-fill-color: #7d0518;
    -webkit-text-stroke: clamp(8px, 1.9vw, 17px) #7d0518;
    paint-order: stroke fill;
    pointer-events: none;
    filter: drop-shadow(0 3px 0 rgba(60,0,12,.85));
  }
  .title-zh::before {
    color: #8a0a1e; -webkit-text-fill-color: #8a0a1e;
    -webkit-text-stroke: clamp(6px, 1.35vw, 12px) #8a0a1e;
    filter: drop-shadow(0 2px 0 rgba(60,0,12,.8));
  }
""" + s[i1:]
print('OK 標題紅底形狀（深）')

# --- 淺色主題：整段替換 ---
i0 = s.index("""  /* v1.9：標題底下的深紅色噴發光芒（米黃底上要壓得淡一點才不髒） */""")
i1 = s.index("""  .title-card .sub { color: #a97c52; font-size: 14.5px; letter-spacing: .3em; }""")
s = s[:i0] + """  /* v2.0：淺色底一樣是「字型外凸的紅底形狀」，顏色略深一點才看得清 */
  .title-en::before, .title-zh::before { filter: drop-shadow(0 2px 0 rgba(96,16,16,.55)); }
""" + s[i1:]
print('OK 標題紅底形狀（淺）')

# ==================================================================
# 5) 丟炸彈的人自己不會頭暈
# ==================================================================
rep("""function canDizzy(who) {
  if (!who) return false;
  if (who.cart) return false;                    // 已經坐在推車上的人不算
  if (who.dead) return false;
  if (who.alive === false) return false;
  return true;
}""",
"""function canDizzy(who) {
  if (!who) return false;
  if (who.cart) return false;                    // 已經坐在推車上的人不算
  if (who.dead) return false;
  if (who.alive === false) return false;
  return true;
}
// v2.0：誰丟的炸彈砸到誰都不算 —— 只有「被丟到的那個人」才會頭暈
function dizzyImmune(who, b) {
  return !!(b && b.owner && who === b.owner);
}""", 'dizzyImmune')

rep("""  for (let i = 0; i < Game.players.length; i++) {
    const p = Game.players[i];
    if (!canDizzy(p)) continue;
    if (dist2(p.x, p.y, b.px, b.py) > hit) continue;
    setDizzy(p, T);
  }
  for (let i = 0; i < Game.enemies.length; i++) {
    const e = Game.enemies[i];
    if (!canDizzy(e)) continue;
    if (dist2(e.x, e.y, b.px, b.py) > hit) continue;
    setDizzy(e, T);
  }""",
"""  for (let i = 0; i < Game.players.length; i++) {
    const p = Game.players[i];
    if (!canDizzy(p)) continue;
    if (dizzyImmune(p, b)) continue;             // v2.0：丟的人自己不會暈
    if (dist2(p.x, p.y, b.px, b.py) > hit) continue;
    setDizzy(p, T);
  }
  for (let i = 0; i < Game.enemies.length; i++) {
    const e = Game.enemies[i];
    if (!canDizzy(e)) continue;
    if (dizzyImmune(e, b)) continue;             // v2.0：BOSS／小怪丟的彈砸到自己也不暈
    if (dist2(e.x, e.y, b.px, b.py) > hit) continue;
    setDizzy(e, T);
  }""", 'v2.0 頭暈免疫')

# ==================================================================
# 6) 紅龍：紅光只在身體邊緣閃（不外擴）
# ==================================================================
rep("""  // 紅龍：身上一圈火紅氣場（一眼就能分辨）
  if (red) {
    const pulse = .5 + Math.sin(Game.gameT * 5) * .16;
    const gr = ctx.createRadialGradient(x, y + T * .08, T * .1, x, y + T * .08, T * 1.0);
    gr.addColorStop(0, 'rgba(255,120,60,' + (pulse * .6).toFixed(3) + ')');
    gr.addColorStop(1, 'rgba(255,60,60,0)');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.ellipse(x, y + T * .08, T * 1.0, T * .84, 0, 0, 6.283); ctx.fill();
  }""",
"""  // v2.0：紅龍紅光只沿著身體邊緣閃一下（不再往外擴成一整團）
  if (red) {
    const pulse = .55 + Math.sin(Game.gameT * 6.6) * .30 + Math.sin(Game.gameT * 3.1) * .15;
    const a = Math.max(0, Math.min(.85, pulse));
    const gr = ctx.createRadialGradient(x, y + T * .06, T * .30, x, y + T * .06, T * .74);
    gr.addColorStop(0, 'rgba(255,90,50,0)');
    gr.addColorStop(.55, 'rgba(255,80,45,' + (a * .30).toFixed(3) + ')');
    gr.addColorStop(.84, 'rgba(255,64,48,' + (a * .72).toFixed(3) + ')');
    gr.addColorStop(1, 'rgba(255,50,40,0)');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.ellipse(x, y + T * .06, T * .74, T * .62, 0, 0, 6.283); ctx.fill();
    // 邊緣那一圈細細的紅線在閃
    ctx.strokeStyle = 'rgba(255,92,56,' + (a * .85).toFixed(3) + ')';
    ctx.lineWidth = Math.max(1.2, T * .045);
    ctx.beginPath(); ctx.ellipse(x, y + T * .06, T * .70, T * .585, 0, 0, 6.283); ctx.stroke();
    ctx.lineWidth = 1;
  }""", '紅龍邊緣紅光')

# ==================================================================
# 7) 角色預設隨機
# ==================================================================
rep("""function randomChar() {""", """function randomChar() {""", 'nope2') if False else None
rep("""const DEF_TPAD = { side: 'left', act: 'right', size: 0.8 };""",
"""const DEF_TPAD = { side: 'left', act: 'right', size: 0.8 };
// v2.0：玩家角色預設「隨機」—— 每次進選單都換一隻，玩家自己挑過就照玩家的
let charPickedByUser = false;
function randomChar() { return Math.floor(Math.random() * (CHARACTERS.length || 1)); }""",
'randomChar')

rep("""  // v1.9：首度升級就幫忙調成「小」（用過自己的設定就不再動）""",
"""  // v2.0：沒自己挑過角色 → 預設隨機一隻
  try { if (!localStorage.getItem('bombhero-char-picked')) settings.soloChar = randomChar(); } catch (e) {}
  // v1.9：首度升級就幫忙調成「小」（用過自己的設定就不再動）""",
'啟動時隨機角色')

rep("""      b.addEventListener('click', function () {
        AudioSys.sfx('click');
        settings.soloChar = parseInt(b.getAttribute('data-i'), 10) % CHARACTERS.length;
        saveSettings();
        refresh();
        CharPreview.hop(settings.soloChar);     // 選到的那隻跳一下
      });""",
"""      b.addEventListener('click', function () {
        AudioSys.sfx('click');
        settings.soloChar = parseInt(b.getAttribute('data-i'), 10) % CHARACTERS.length;
        charPickedByUser = true;                // v2.0：玩家自己選過 → 之後都照這隻
        try { localStorage.setItem('bombhero-char-picked', '1'); } catch (e) {}
        saveSettings();
        refresh();
        CharPreview.hop(settings.soloChar);     // 選到的那隻跳一下
      });""", '角色點擊記住')

rep("""$id('btnSolo').addEventListener('click', function () { AudioSys.ensure(); AudioSys.sfx('click'); Screen.show('solo'); Solo.renderGrid(); });""",
"""$id('btnSolo').addEventListener('click', function () {
  AudioSys.ensure(); AudioSys.sfx('click');
  // v2.0：還沒自己挑過 → 每次進來都給一隻隨機角色（有挑過就沿用玩家選的）
  if (!charPickedByUser) { settings.soloChar = randomChar(); saveSettings(); }
  Screen.show('solo');
  Solo.renderGrid(); Solo.renderChar();
});""", '進選單隨機角色')

# 對戰槽位角色也隨機
rep("""        ch: (pv && typeof pv.ch === 'number') ? pv.ch : i % CHARACTERS.length,""",
"""        // v2.0：預設隨機角色（玩家用 ◀ ▶ 換過就照玩家的）
        ch: (pv && typeof pv.ch === 'number') ? pv.ch : randomChar(),""",
'對戰隨機角色')

# ==================================================================
# 匯出（測試用）
# ==================================================================
rep("""  DIZZY_TIME: DIZZY_TIME, setDizzy: setDizzy, flyingDizzyCheck: flyingDizzyCheck,""",
"""  DIZZY_TIME: DIZZY_TIME, setDizzy: setDizzy, flyingDizzyCheck: flyingDizzyCheck,
  // v2.0
  FLY_SPEED_CAP: FLY_SPEED_CAP, MAIL_ADDR: MAIL_ADDR, randomChar: randomChar,
  updateFullBtn: updateFullBtn, copyMail: copyMail, openDoorForce: openDoorForce,""",
'匯出 v2.0')

io.open(P, 'w', encoding='utf-8', newline='\n').write(s)
print('bytes', len(s.encode('utf-8')))
