/* ================================================================
   爆爆英雄 — 按鍵控制面板（v5.52）
   ---------------------------------------------------------------
   使用者要的：「照經典《爆爆王》的按鍵配置做一個按鍵控制面板，
   放在明顯處，讓玩家快速點進去切換。」

   為什麼要獨立一支檔案：
     主檔 index.html 已經頂到 1,950,000 字元的預算（只剩一千多字），
     塞不下新的 UI。這一支只依賴主檔匯出的 __BH
     （settings / saveSettings / keyName / renderKeyRow / toast / AudioSys），
     完全不碰遊戲邏輯。

   兩套鍵位：
     經典《爆爆王》 方向鍵移動 · Space 放炸彈 · Shift 衝刺 · Ctrl 引爆 · Alt 坐騎
     現代 WASD      WASD 移動 · 滑鼠左鍵放彈 · 右鍵引爆 · Space 坐騎（v5.11 起的預設）
   同機對戰時 1P／2P 自動互補（一套吃方向鍵，另一套就吃 WASD），不會撞鍵。
   ================================================================ */
(function () {
  'use strict';

  /* ---------------- 鍵位定義 ---------------- */
  var K_ORDER = ['up', 'down', 'left', 'right', 'act', 'det', 'fire'];
  var K_LABEL = {
    up: '上', down: '下', left: '左', right: '右',
    act: '放炸彈', det: '引爆', fire: '坐騎招式'
  };

  var CLASSIC = {
    1: { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight',
         act: 'Space', det: 'ControlLeft', fire: 'AltLeft' },
    2: { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD',
         act: 'Enter', det: 'Numpad0', fire: 'Numpad1' }
  };
  var MODERN = {
    1: { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD',
         act: 'Mouse0', det: 'Mouse2', fire: 'Space' },
    2: { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight',
         act: 'Enter', det: 'Numpad0', fire: 'Numpad1' }
  };

  /* 對照表：功能 / 預設按鍵 / 說明（照使用者給的圖排） */
  var ROWS = {
    classic: [
      ['移動方向', '↑ ↓ ← →', '控制角色上下左右走位'],
      ['放炸彈', 'Space 空白鍵', '放置水球／炸彈'],
      ['衝刺', 'Shift', '加速衝刺（本作新增，原版沒有）'],
      ['引爆', 'Ctrl', '引爆遙控中的水球（道具格 1）'],
      ['坐騎招式', 'Alt', '騎寵吐火（道具格 2）']
    ],
    modern: [
      ['移動方向', 'W A S D', '控制角色上下左右走位'],
      ['放炸彈', '滑鼠左鍵', '放置水球／炸彈'],
      ['引爆', '滑鼠右鍵', '引爆遙控中的水球'],
      ['坐騎招式', 'Space 空白鍵', '騎寵吐火'],
      ['衝刺', 'Shift 或滑鼠中鍵', '加速衝刺']
    ]
  };

  /* ---------------- 純函式（測試可以直接 require） ---------------- */
  function sameMap(a, b) {
    if (!a || !b) return false;
    for (var i = 0; i < K_ORDER.length; i++) {
      var k = K_ORDER[i];
      var x = a[k] == null ? null : String(a[k]);
      var y = b[k] == null ? null : String(b[k]);
      if (x !== y) return false;
    }
    return true;
  }
  /** 依 keys1 判斷目前是哪一套；都不是就是 custom */
  function presetOf(keys1) {
    if (sameMap(keys1, CLASSIC[1])) return 'classic';
    if (sameMap(keys1, MODERN[1])) return 'modern';
    return 'custom';
  }
  /** 套用某一套（回傳新的 { keys1, keys2 }，不改傳入的東西） */
  function presetMaps(which) {
    var set = which === 'classic' ? CLASSIC : MODERN;
    var o = {};
    for (var i = 0; i < K_ORDER.length; i++) o[K_ORDER[i]] = set[1][K_ORDER[i]];
    var t = {};
    for (var j = 0; j < K_ORDER.length; j++) t[K_ORDER[j]] = set[2][K_ORDER[j]];
    return { keys1: o, keys2: t };
  }

  /* 給 node 測試用 —— 瀏覽器裡 module 是 undefined，這段直接跳過 */
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      K_ORDER: K_ORDER, CLASSIC: CLASSIC, MODERN: MODERN, ROWS: ROWS,
      sameMap: sameMap, presetOf: presetOf, presetMaps: presetMaps
    };
    return;
  }

  /* ---------------- 瀏覽器端 ---------------- */
  var P = null, root = null, capKey = null, capEl = null, isOpen = false, tries = 0;

  var CSS = [
    /* 四顆 chip 會比三顆擠（430px 時「線上玩家」會被擠成兩行）→ 只有多了「按鍵」這顆時才收一點 */
    '#quickRow.many{gap:5px}',
    '#quickRow.many .qchip{font-size:11.5px;padding:8px 3px;gap:4px}',
    '#quickRow.many .qchip .qico2{font-size:12.5px}',
    '#quickRow.many .qchip b{white-space:nowrap}',
    '#quickRow.many .qdot-num{min-width:13px;height:13px;line-height:13px;font-size:9px;top:2px;right:3px;padding:0 3px}',
    '#quickRow #btnKeys{color:#1f5f8b;border-color:#b7d8ef;background:#f1faff;',
    'box-shadow:0 2px 0 rgba(60,140,200,.20),inset 0 0 0 1px rgba(255,255,255,.75)}',
    '#bhkSetBtn{display:flex;align-items:center;gap:9px;width:100%;padding:11px 13px;border-radius:13px;',
    'border:2px solid #e6c8a0;background:#fff8ea;color:#8a5b2c;font-family:inherit;font-size:12.5px;',
    'font-weight:900;cursor:pointer;text-align:left;box-shadow:0 2px 0 rgba(180,130,60,.16)}',
    '#bhkSetBtn .ki{font-size:17px}',
    '#bhkSetBtn b{color:#c2410c}',
    '#bhkSetBtn:active{transform:translateY(1px);box-shadow:none}',

    '#bhKeys{position:fixed;inset:0;z-index:1310;display:none;align-items:center;justify-content:center;',
    'padding:12px;background:rgba(26,15,6,.76)}',
    '#bhKeys.on{display:flex}',
    '#bhKeys .kcard{width:min(580px,100%);max-height:calc(100vh - 24px);overflow-y:auto;',
    '-webkit-overflow-scrolling:touch;background:#fffaf0;border:3px solid #e6c8a0;border-radius:20px;',
    'box-shadow:0 20px 48px rgba(40,20,6,.5);color:#5b3a1e;padding-bottom:12px}',
    '#bhKeys .khead{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:8px;',
    'padding:11px 14px;background:linear-gradient(#fff6e3,#ffeacd);border-bottom:2px solid #e6c8a0;',
    'border-radius:16px 16px 0 0}',
    '#bhKeys .kt{flex:1 1 auto;font-size:15.5px;font-weight:900;color:#7a4318}',
    '#bhKeys .kx{width:32px;height:32px;border-radius:10px;border:2px solid #e6c8a0;background:#fff;',
    'color:#a6805a;font-size:14px;font-weight:900;cursor:pointer;font-family:inherit}',
    '#bhKeys .klead{padding:10px 14px 0;font-size:12px;line-height:1.6;color:#8a6a48}',

    '#bhKeys .kpick{display:grid;grid-template-columns:1fr 1fr;gap:9px;padding:10px 14px 3px}',
    '#bhKeys .kopt{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:2px;',
    'padding:10px 11px;border-radius:14px;border:2px solid #e6c8a0;background:#fffdf7;color:#8a5b2c;',
    'font-family:inherit;text-align:left;cursor:pointer}',
    '#bhKeys .kopt .kico{font-size:18px;line-height:1.1}',
    '#bhKeys .kopt b{font-size:13.5px}',
    '#bhKeys .kopt small{font-size:10.5px;color:#a98a68;font-weight:700;line-height:1.4}',
    '#bhKeys .kopt.on{border-color:#2fa85a;background:#f0fff4;box-shadow:0 0 0 2px rgba(47,168,90,.20)}',
    '#bhKeys .kok{position:absolute;top:6px;right:8px;display:none;font-style:normal;',
    'font-size:9.5px;font-weight:900;color:#1f8a45}',
    '#bhKeys .kopt.on .kok{display:block}',
    '#bhKeys .knote{margin:8px 14px 0;padding:7px 11px;border-radius:10px;background:#fff4e2;',
    'border:1.5px dashed #efc9a0;font-size:11px;font-weight:700;color:#a05a22}',
    '#bhKeys .knote.hide{display:none}',

    '#bhKeys .ktb{margin:10px 14px 0;border:2px solid #efdcc0;border-radius:14px;overflow:hidden}',
    '#bhKeys .kl{display:grid;grid-template-columns:5.2em minmax(0,8.2em) minmax(0,1fr);align-items:center;',
    'gap:5px;padding:9px 11px;font-size:12px}',
    '#bhKeys .kl+.kl{border-top:1px solid #f2e3cc}',
    '#bhKeys .kl:nth-child(odd){background:#fffdf7}',
    '#bhKeys .klf{font-weight:900;color:#7a4318}',
    '#bhKeys .klk{font-weight:900;color:#c2410c;line-height:1.35}',
    '#bhKeys .klk em{font-style:normal;display:inline-block;padding:2px 6px;border-radius:6px;',
    'background:#fff3dd;border:1.5px solid #f0cb9b;font-size:11.5px}',
    '#bhKeys .kld{color:#8a6a48;line-height:1.5}',

    '#bhKeys .kfoot{margin:9px 14px 0;padding:9px 11px;border-radius:12px;background:#f4fbff;',
    'border:1.5px dashed #bcd9ee;font-size:11px;line-height:1.65;color:#4a6a86}',
    '#bhKeys .kmore{margin:9px 14px 0}',
    '#bhKeys .kmore summary{cursor:pointer;font-size:12px;font-weight:900;color:#a05a22;padding:8px 0}',
    '#bhKeys .krow{display:flex;flex-wrap:wrap;gap:6px;margin-top:2px}',
    '#bhKeys .kb{flex:1 1 64px;min-width:64px;padding:7px 4px;border-radius:10px;border:2px solid #e6c8a0;',
    'background:#fffdf7;color:#7b4a1f;font-family:inherit;cursor:pointer}',
    '#bhKeys .kb small{display:block;font-size:10px;color:#a98a68;font-weight:700}',
    '#bhKeys .kb b{font-size:12.5px;color:#d2691e}',
    '#bhKeys .kb.listen{background:#fff0d6;border-color:#f4703c}',
    '#bhKeys .kbtns{display:flex;gap:8px;margin-top:8px}',
    '#bhKeys .kmini{flex:1 1 0;padding:8px;border-radius:10px;border:2px solid #e6c8a0;background:#fff;',
    'color:#8a5b2c;font-family:inherit;font-size:12px;font-weight:900;cursor:pointer}',

    '@media (max-width:430px){',
    '#bhKeys .kpick{grid-template-columns:1fr}',
    '#bhKeys .kl{grid-template-columns:4.6em minmax(0,1fr);gap:3px 5px}',
    '#bhKeys .kld{grid-column:1/-1;font-size:11px}',
    '}',
    'body.touch #bhKeys .kb,body.touch #bhKeys .kmini{min-height:40px}'
  ].join('');

  function injectCSS() {
    if (document.getElementById('bhkCSS')) return;
    var st = document.createElement('style');
    st.id = 'bhkCSS';
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  function kn(code) {
    if (!code) return '—';
    try { if (P && P.keyName) return P.keyName(code); } catch (e) {}
    return code;
  }
  function say(msg) { try { if (P && P.toast) P.toast(msg); } catch (e) {} }
  function sfx(n) { try { if (P && P.AudioSys && P.AudioSys.sfx) P.AudioSys.sfx(n); } catch (e) {} }
  function save() { try { if (P && P.saveSettings) P.saveSettings(); } catch (e) {} }
  function repaintSettings() { try { if (P && P.renderKeyRow) P.renderKeyRow(); } catch (e) {} }

  function curPreset() {
    var k = (P && P.settings && P.settings.keys1) || {};
    return presetOf(k);
  }

  /* ---------------- 建立面板 ---------------- */
  function build() {
    root = document.createElement('div');
    root.id = 'bhKeys';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', '按鍵控制');
    root.innerHTML =
      '<div class="kcard">' +
        '<div class="khead"><span class="kt">🎮 按鍵控制</span>' +
          '<button class="kx" type="button" aria-label="關閉">✕</button></div>' +
        '<div class="klead">點一張卡就切換 —— <b>只影響鍵盤</b>，手把與手機觸控不受影響，' +
          '也不用離開現在這一頁。</div>' +
        '<div class="kpick">' +
          '<button class="kopt" type="button" data-p="classic">' +
            '<span class="kico">🕹️</span><b>爆爆王經典</b>' +
            '<small>方向鍵移動 · Space 放彈</small><i class="kok">✓ 使用中</i></button>' +
          '<button class="kopt" type="button" data-p="modern">' +
            '<span class="kico">⌨️</span><b>現代 WASD</b>' +
            '<small>WASD 移動 · 滑鼠左右鍵</small><i class="kok">✓ 使用中</i></button>' +
        '</div>' +
        '<div class="knote hide" id="bhkNote">目前是<b>自訂鍵位</b>（不是上面兩套）—— ' +
          '點任一張卡就會整組覆蓋過去。</div>' +
        '<div class="ktb" id="bhkTable"></div>' +
        '<div class="kfoot">同機對戰時兩套自動互補：<b>1P 吃方向鍵，2P 就自動換成 WASD</b>' +
          '（反之亦然），兩人不會撞鍵。方向鍵／Space／Ctrl／Alt 在遊戲中都不會觸發瀏覽器預設行為。</div>' +
        '<details class="kmore"><summary>✏️ 想自己改？點按鈕 → 再按你要的鍵（ESC 取消）</summary>' +
          '<div class="krow" id="bhkRow"></div>' +
          '<div class="kbtns">' +
            '<button class="kmini" type="button" data-a="reset">回復本方案預設</button>' +
            '<button class="kmini" type="button" data-a="cancel">取消設定</button>' +
          '</div>' +
        '</details>' +
      '</div>';
    document.body.appendChild(root);
    paint();
  }

  function paint() {
    if (!root) return;
    var p = curPreset();
    var picks = root.querySelectorAll('.kopt');
    for (var i = 0; i < picks.length; i++) {
      var on = picks[i].getAttribute('data-p') === p;
      picks[i].classList[on ? 'add' : 'remove']('on');
      picks[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    var note = document.getElementById('bhkNote');
    if (note) note.classList[p === 'custom' ? 'remove' : 'add']('hide');
    paintTable(p === 'modern' ? 'modern' : 'classic');
    paintRow();
  }

  function paintTable(which) {
    var tb = document.getElementById('bhkTable');
    if (!tb) return;
    tb.innerHTML = ROWS[which].map(function (r) {
      return '<div class="kl"><div class="klf">' + r[0] + '</div>' +
        '<div class="klk"><em>' + r[1] + '</em></div>' +
        '<div class="kld">' + r[2] + '</div></div>';
    }).join('');
  }

  function paintRow() {
    var row = document.getElementById('bhkRow');
    if (!row) return;
    var map = (P && P.settings && P.settings.keys1) || {};
    row.innerHTML = K_ORDER.map(function (k) {
      return '<button class="kb" type="button" data-k="' + k + '">' +
        '<small>' + K_LABEL[k] + '</small><b>' + kn(map[k]) + '</b></button>';
    }).join('');
    var btns = row.querySelectorAll('.kb');
    for (var i = 0; i < btns.length; i++) {
      bindKeyBtn(btns[i]);
    }
  }

  function bindKeyBtn(btn) {
    var k = btn.getAttribute('data-k');
    btn.addEventListener('click', function () { startCap(k, btn); });
  }

  /* ---------------- 自訂改鍵 ---------------- */
  function startCap(k, el) {
    if (capKey === k) { stopCap(); return; }
    if (capEl) capEl.classList.remove('listen');
    capKey = k; capEl = el;
    el.classList.add('listen');
    el.innerHTML = '<small>' + K_LABEL[k] + '</small><b>按下…</b>';
    sfx('click');
  }
  function stopCap() {
    if (capEl) capEl.classList.remove('listen');
    capKey = null; capEl = null;
    paintRow();
  }
  function applyCap(code) {
    var k = capKey;
    var map = P.settings.keys1;
    for (var i = 0; i < K_ORDER.length; i++) {
      var o = K_ORDER[i];
      if (o !== k && map[o] === code) map[o] = null;   // 撞鍵 → 舊的先清掉（跟設定頁一致）
    }
    map[k] = code;
    P.settings.keyPreset = 'custom';
    save();
    capKey = null; capEl = null;                        // 先斷開，paintRow 才不會被 stopCap 蓋掉
    paint();
    repaintSettings();
    sfx('item');
  }

  /* ---------------- 套用方案 ---------------- */
  function applyPreset(which) {
    if (!P || !P.settings) return;
    var m = presetMaps(which);
    P.settings.keys1 = m.keys1;
    P.settings.keys2 = m.keys2;
    P.settings.keyPreset = which;
    save();
    repaintSettings();
    paint();
    sfx('item');
    say(which === 'classic' ? '🕹️ 已切換：爆爆王經典鍵位' : '⌨️ 已切換：現代 WASD 鍵位');
  }

  /* ---------------- 開關 ---------------- */
  function open() {
    if (!root) build();
    stopCap();
    paint();
    root.classList.add('on');
    isOpen = true;
    sfx('click');
  }
  function close() {
    if (!root) return;
    stopCap();
    root.classList.remove('on');
    isOpen = false;
  }

  function wire() {
    root.addEventListener('click', function (e) {
      var t = e.target;
      if (t === root) { close(); return; }                       // 點背景關掉
      if (t.closest('.kx')) { close(); return; }
      var pick = t.closest('.kopt');
      if (pick) { applyPreset(pick.getAttribute('data-p')); return; }
      var act = t.closest('[data-a]');
      if (act) {
        var a = act.getAttribute('data-a');
        if (a === 'reset') {
          var p = curPreset();
          if (p === 'custom') {
            say('目前是自訂鍵位，先點上面其中一張卡');
          } else {
            applyPreset(p);
            say('已回復「' + (p === 'classic' ? '爆爆王經典' : '現代 WASD') + '」預設');
          }
        } else { stopCap(); }
        return;
      }
    });

    window.addEventListener('keydown', function (e) {
      if (capKey) {
        e.preventDefault(); e.stopPropagation();
        if (e.code === 'Escape') { stopCap(); return; }
        applyCap(e.code);
        return;
      }
      if (isOpen && e.key === 'Escape') { e.preventDefault(); close(); }
    }, true);
  }

  /* 首頁快捷 chip */
  function addChip() {
    var qr = document.getElementById('quickRow');
    if (!qr || document.getElementById('btnKeys')) return;
    var b = document.createElement('button');
    b.className = 'qchip';
    b.id = 'btnKeys';
    b.type = 'button';
    b.title = '按鍵控制：爆爆王經典 / 現代 WASD 一鍵切換';
    b.innerHTML = '<span class="qico2">🕹️</span><b>按鍵</b>';
    b.addEventListener('click', open);
    qr.appendChild(b);
    qr.classList.add('many');       // 四顆要收一點，不然「線上玩家」會被擠成兩行
  }

  /* 設定頁（操作設定）也放一顆入口，兩邊都進得去 */
  function addSetBtn() {
    var pane = document.getElementById('paneCtrl');
    if (!pane || document.getElementById('bhkSetBtn')) return;
    var box = document.createElement('div');
    box.className = 'field';
    box.innerHTML = '<label>按鍵方案（一鍵切換）</label>' +
      '<button id="bhkSetBtn" type="button"><span class="ki">🎮</span>' +
      '<span>爆爆王經典 ／ 現代 WASD <b>點這裡換</b></span></button>' +
      '<div class="hint">想逐鍵微調，下面「鍵盤按鍵」也可以改；兩邊改的是同一份設定。</div>';
    pane.insertBefore(box, pane.firstChild);
    document.getElementById('bhkSetBtn').addEventListener('click', open);
  }

  function boot() {
    P = window.__BH;
    if (!P || !P.settings) {
      if (++tries < 40) setTimeout(boot, 50);
      return;
    }
    injectCSS();
    addChip();
    addSetBtn();
    build();
    wire();
    /* 舊存檔沒有 keyPreset → 依現有 keys1 補一個，面板才能正確標「使用中」 */
    try {
      if (!P.settings.keyPreset) {
        P.settings.keyPreset = curPreset();
        save();
      }
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
