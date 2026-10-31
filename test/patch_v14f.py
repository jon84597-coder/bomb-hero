# -*- coding: utf-8 -*-
import io
p = 'index.html'
s = io.open(p, encoding='utf-8').read()

# ---------- 1. 把控制模式套用到場上玩家（暫停中切換也能立刻生效） ----------
old = "function applyCtrl() {"
new = r"""// 依目前設定算出「第 i 位玩家」該用哪套操作
function schemeForPlayer(i) {
  if (settings.ctrl === 'auto') return Input.schemes.auto;
  const m = ctrlMode();
  if (m === 'touch') return Input.schemes.touch;
  if (m === 'pad') return Input.schemes.pad(i);
  return i === 0 ? Input.schemes.kb1 : Input.schemes.kb2;
}
// 遊戲進行中切換控制方式 → 立刻重綁場上玩家
function applyCtrlToPlayers() {
  if (Net.on) return;                       // 線上對戰由房主統一，不動
  (Game.players || []).forEach(function (p, i) {
    if (!p || p.ai) return;
    p.scheme = schemeForPlayer(i);
  });
}
function applyCtrl() {"""
assert old in s
s = s.replace(old, new, 1)

# ---------- 2. 暫停選單：設定內容與首頁一致 ----------
i0 = s.index("// ----- 暫停（含繼續／重新開始／設定／回首頁） -----")
i1 = s.index("// ================================================================\n//   渲染")
old_pause = s[i0:i1]

new_pause = r"""// ----- 暫停（含繼續／重新開始／設定／回首頁） -----
let paused = false;

// 暫停選單用的小工具：一組分段按鈕
function pmSeg(box, key, label, opts, getter, onPick) {
  const wrap = document.createElement('div');
  wrap.className = 'field';
  wrap.innerHTML = '<label>' + label + '</label><div class="seg"></div>';
  const seg = wrap.querySelector('.seg');
  opts.forEach(function (o) {
    const b = document.createElement('button');
    b.textContent = o.t;
    b.setAttribute('data-v', o.v);
    b.addEventListener('click', function () {
      onPick(o.v);
      AudioSys.sfx('click');
      seg.querySelectorAll('button').forEach(function (x) {
        x.classList.toggle('sel', x.getAttribute('data-v') === String(getter()));
      });
      const hintEl = box.querySelector('#' + key + 'Hint');
      if (hintEl && o.hint) hintEl.innerHTML = o.hint;
    });
    seg.appendChild(b);
  });
  seg.querySelectorAll('button').forEach(function (x) {
    x.classList.toggle('sel', x.getAttribute('data-v') === String(getter()));
  });
  box.appendChild(wrap);
  return wrap;
}

function togglePause() {
  if (Screen.current !== 'game' || Game.state === 'over') return;
  if (Net.on && Net.role === 'guest') { guestPause(); return; }
  paused = !paused;
  if (!paused) {
    // 收起暫停選單，恢復音樂
    hideOverlay();
    AudioSys.startBGM(Game.mode === 'solo' && Game.stage === 8 ? 'boss' : 'battle');
    return;
  }
  AudioSys.stopBGM();
  const box = $id('ovBox');
  box.innerHTML = '<h3>⏸ 遊戲暫停</h3>' +
    '<div class="row" style="justify-content:center;gap:10px;flex-wrap:wrap;margin-top:4px">' +
    '<button class="mbtn warm" id="pmResume" style="width:auto;padding:12px 26px;">▶ 繼續遊戲</button>' +
    '<button class="mbtn" id="pmRestart" style="width:auto;padding:12px 26px;">🔄 重新開始</button>' +
    '<button class="ghostbtn" id="pmSettingsBtn">⚙️ 設定</button>' +
    '<button class="ghostbtn" id="pmHome">🏠 回首頁</button>' +
    '</div>' +
    '<div id="pmSettings" style="display:none" class="pm-panel">' +
    '<div class="pmhint" style="margin:8px 0 2px">這裡的設定跟首頁「設定」完全一樣，改了馬上生效，不用重開。</div>' +
    '<div class="pmset" id="pmSetGrid"></div>' +
    '<div class="pmhint" id="pmCtrlHint"></div>' +
    '</div>';
  $id('pmResume').addEventListener('click', function () {
    AudioSys.sfx('click');
    paused = false; hideOverlay();
    AudioSys.startBGM(Game.mode === 'solo' && Game.stage === 8 ? 'boss' : 'battle');
  });
  $id('pmRestart').addEventListener('click', function () {
    AudioSys.sfx('click');
    paused = false; hideOverlay();
    Game.state = 'idle';
    if (Game.mode === 'solo') { if (Game.bossRush) startSolo(8, true); else startSolo(Game.stage); }
    else startBattle();
  });
  $id('pmSettingsBtn').addEventListener('click', function () {
    AudioSys.sfx('click');
    const pn = $id('pmSettings');
    pn.style.display = pn.style.display === 'none' ? 'block' : 'none';
  });
  $id('pmHome').addEventListener('click', function () {
    AudioSys.sfx('click');
    paused = false; hideOverlay();
    Game.state = 'idle';
    AudioSys.startBGM('menu');
    Screen.show('title');
  });

  // ---- 設定內容（與首頁一致） ----
  const grid = $id('pmSetGrid');
  function ctrlHintNow() {
    const mode = ctrlMode();
    return mode === 'touch'
      ? '目前：<b>手機觸控</b>——虛擬搖桿 ＋ 💥放彈鍵（🧨 遙控引爆、🔥 吐火）。'
      : mode === 'pad'
        ? '目前：<b>手把</b>——' + (Pad.name() || '已偵測到手把') + '（A 放彈、X 引爆、Y 吐火、Start 暫停）。'
        : '目前：<b>鍵盤</b>——' + (settings.ctrl === 'auto' ? '（自動偵測）' : '') + 'WASD／方向鍵移動、空白鍵放彈、E 引爆、F 吐火。';
  }
  pmSeg(grid, 'pmCtrl', '控制模式', [
    { v: 'auto', t: '自動' }, { v: 'kb', t: '鍵盤' }, { v: 'pad', t: '手把' }, { v: 'touch', t: '手機觸控' }
  ], function () { return settings.ctrl; }, function (v) {
    settings.ctrl = v; saveSettings(); applyCtrl(); applyCtrlToPlayers(); updateHud();
    $id('pmCtrlHint').innerHTML = ctrlHintNow();
  });
  $id('pmCtrlHint').innerHTML = ctrlHintNow();

  pmSeg(grid, 'pmPadSide', '觸控搖桿位置', [
    { v: 'left', t: '在左' }, { v: 'right', t: '在右' }
  ], function () { return settings.tpad.side; }, function (v) {
    settings.tpad.side = v; saveSettings(); applyTouchLayout();
  });
  pmSeg(grid, 'pmActSide', '放彈鍵位置', [
    { v: 'right', t: '在右' }, { v: 'left', t: '在左' }
  ], function () { return settings.tpad.act; }, function (v) {
    settings.tpad.act = v; saveSettings(); applyTouchLayout();
  });
  pmSeg(grid, 'pmTSize', '觸控按鈕大小', [
    { v: '0.8', t: '小' }, { v: '1', t: '中' }, { v: '1.2', t: '大' }
  ], function () { return settings.tpad.size; }, function (v) {
    settings.tpad.size = parseFloat(v) || 1; saveSettings(); applyTouchLayout();
  });
  pmSeg(grid, 'pmBgm', '音樂音量', [
    { v: '0', t: '關' }, { v: '0.5', t: '小' }, { v: '1', t: '大' }
  ], function () { return settings.bgm; }, function (v) {
    settings.bgm = parseFloat(v); AudioSys.applyVolumes(); saveSettings();
    if (settings.bgm > 0) AudioSys.startBGM(Game.mode === 'solo' && Game.stage === 8 ? 'boss' : 'battle');
    else AudioSys.stopBGM();
  });
  pmSeg(grid, 'pmSfx', '音效音量', [
    { v: '0', t: '關' }, { v: '0.5', t: '小' }, { v: '1', t: '大' }
  ], function () { return settings.sfx; }, function (v) {
    settings.sfx = parseFloat(v); applyVolumesSafe(); saveSettings();
  });
  $id('ovIn').classList.remove('hide');
}
function applyVolumesSafe() { try { AudioSys.applyVolumes(); } catch (e) {} }

"""
s = s[:i0] + new_pause + s[i1:]

io.open(p, 'w', encoding='utf-8').write(s)
print('ok')
