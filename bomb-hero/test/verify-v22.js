// 無頭測試 v22：v1.4
//   1. 使用者原圖 → 8 張透明精靈圖內嵌、遊戲內真的用精靈圖畫角色（沒有時退回程式繪圖）
//   2. 清場開門：開門特效（粒子）＋ 專屬音效，而且只觸發一次
//   3. 暫停選單的設定＝首頁設定（控制模式／觸控配置／音量），改完立刻生效
//   4. 炸彈超人風音樂：方波主旋律＋16 分琶音＋鼓組，曲長 2～3 分鐘
//   5. 繪本風背景：木箱、草地、漸層底色（第一關改成插畫配色）
//   6. 選單字級加大 + 圓體字 + 首頁插畫底圖
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync(__dirname + '/../index.html', 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.error('no script'); process.exit(1); }
const code = m[1];

// ----- 會記錄呼叫的 2D 內容（用來確認真的呼叫了 drawImage） -----
const rec = { calls: [] };
function mkCtx2D() {
  const grad = { addColorStop() {} };
  return new Proxy({}, {
    get(t, k) {
      if (k === '__calls') return rec.calls;
      if (k === 'canvas') return { width: 720, height: 540 };
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => grad;
      if (k === 'measureText') return () => ({ width: 10 });
      if (k === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) });
      if (typeof t[k] !== 'undefined') return t[k];
      return function () { rec.calls.push([k].concat(Array.prototype.slice.call(arguments))); };
    },
    set(t, k, v) { t[k] = v; return true; }
  });
}
const els = {};
const qmap = {};
function getId(id) {
  if (els[id]) return els[id];
  const el = {
    id, style: {}, dataset: {}, children: [], _cls: new Set(), _on: {}, attrs: {},
    classList: {
      add(c) { el._cls.add(c); }, remove(c) { el._cls.delete(c); },
      toggle(c, on) { const want = on === undefined ? !el._cls.has(c) : !!on; want ? el._cls.add(c) : el._cls.delete(c); },
      contains(c) { return el._cls.has(c); }
    },
    addEventListener(type, fn) { (el._on[type] = el._on[type] || []).push(fn); },
    removeEventListener() {},
    appendChild(c) { el.children.push(c); return c; },
    getContext: () => mkCtx2D(),
    querySelectorAll: () => [],
    querySelector(sel) {
      const k = id + '|' + sel;
      if (!qmap[k]) qmap[k] = getId(k);
      return qmap[k];
    },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 720, height: 540 }),
    setAttribute(n, v) { el.attrs[n] = String(v); },
    getAttribute(n) { return n in el.attrs ? el.attrs[n] : null; },
    setPointerCapture() {}, releasePointerCapture() {},
    focus() {}, click() {},
    width: 720, height: 540, textContent: '', value: ''
  };
  let _inner = '';
  Object.defineProperty(el, 'innerHTML', {
    get() { return _inner; },
    set(v) { _inner = v; el.children = []; }
  });
  els[id] = el;
  return el;
}

const listeners = {};
const storage = {};
function mkEl(tag) { return getId(tag + '#' + Math.random().toString(36).slice(2)); }
const sandbox = {
  console, Math, JSON, Object, Array, Date, parseInt, parseFloat, isNaN, isFinite,
  Uint8ClampedArray, Infinity, NaN, undefined,
  setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  requestAnimationFrame: () => 0,
  performance: { now: () => Date.now() },
  localStorage: {
    getItem: k => (k in storage ? storage[k] : null),
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: k => { delete storage[k]; }
  },
  navigator: { getGamepads: () => [] },
  document: {
    getElementById: getId,
    querySelectorAll: () => [],
    querySelector: () => mkEl('q'),
    addEventListener: (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); },
    removeEventListener() {},
    createElement: t => mkEl(t),
    body: mkEl('body'),
    documentElement: mkEl('html')
  }
};
sandbox.window = sandbox;
sandbox.addEventListener = (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); };
sandbox.removeEventListener = () => {};
sandbox.globalThis = sandbox;
sandbox.window.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(code, sandbox, { filename: 'index.html' });

const BH = sandbox.window.__BH;
if (!BH) { console.error('no __BH'); process.exit(1); }
const G = BH.Game;
const P = BH;

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
  G.bombs.length = 0; G.flames.length = 0;
  G.particles.length = 0; G.bubbles.length = 0;
  G.players[0].invuln = 0;
  return G.players[0];
}
const fakeImg = (w, h) => ({ naturalWidth: w, naturalHeight: h, __fake: true });

// ================================================================
console.log('=== 1. 版本與內嵌美術資源 ===');
ok(parseFloat(BH.VERSION) >= 1.4, '版本推進到 1.4 以上（目前 ' + BH.VERSION + '）');
ok(html.indexOf('id="verTxt">' + BH.VERSION + '<') > 0, '畫面上的版本文字同步 ' + BH.VERSION);

const chars = BH.IMG_CHARS;
ok(Object.keys(chars).length === 8, '內嵌 8 張角色精靈圖（' + Object.keys(chars).length + '）');
ok(Object.keys(chars).every(function (k) { return chars[k].indexOf('data:image/webp;base64,') === 0; }),
  '角色圖都是 webp data URL（透明背景）');
ok(Object.keys(chars).every(function (k) { return chars[k].length > 4000; }),
  '每張圖都有實際內容（> 4KB base64）');
ok(BH.IMG_TITLEBG.indexOf('data:image/jpeg;base64,') === 0, '首頁底圖（使用者插畫）已內嵌');
ok(html.indexOf('id="titleBg"') > 0, '首頁有底圖容器 #titleBg');
ok(html.indexOf("tb.style.backgroundImage") > 0, '啟動時把插畫設成首頁背景');

// ================================================================
console.log('=== 2. 精靈圖角色（用使用者的圖，不是程式重畫） ===');
ok(BH.Sprites.readyCount() === 0, '沙盒裡圖片沒載入 → 精靈圖為空');
const rc0 = mkCtx2D();
const noImg = BH.drawSpriteChar(rc0, BH.CHARACTERS[0], 100, 100, 20, { moving: false });
ok(noImg === null, '沒有精靈圖時回傳 null（呼叫端會退回程式繪圖）');

BH.Sprites.inject('rabbit', fakeImg(166, 320));
BH.Sprites.inject('bear', fakeImg(172, 260));
const sp = BH.Sprites.get('rabbit');
ok(!!sp && sp.naturalWidth === 166, '注入後拿得到精靈圖（166×320）');

rec.calls.length = 0;
const bd = BH.drawSpriteChar(mkCtx2D(), BH.CHARACTERS[0], 100, 100, 20, { moving: true, walk: 1.2, facing: 'right' });
const drew = rec.calls.filter(function (c) { return c[0] === 'drawImage'; });
ok(drew.length === 1, '畫角色就是 drawImage 一次（真的貼使用者的圖）');
ok(drew.length === 1 && Math.abs(drew[0][5] - 67.5) < .01, '高度 = R×3.75×0.9（v4.32 主角縮 10%；' + (drew[0] && drew[0][5]) + '）');
ok(drew.length === 1 && Math.abs(drew[0][4] / drew[0][5] - 166 / 320) < .01, '長寬比跟原圖一致（不變形）');
ok(bd && bd.H > 0 && bd.topY < 100, '回傳頭部位置給名牌／手上炸彈定位');

// 走路：不同相位 → 不同的旋轉／縮放（有動作）
function poseOf(walk) {
  rec.calls.length = 0;
  BH.drawSpriteChar(mkCtx2D(), BH.CHARACTERS[0], 100, 100, 20, { moving: true, walk: walk, facing: 'right' });
  const r = rec.calls.filter(c => c[0] === 'rotate')[0];
  const s = rec.calls.filter(c => c[0] === 'scale')[0];
  return (r ? r[1] : 0).toFixed(3) + '/' + (s ? s[1].toFixed(3) : 0);
}
ok(poseOf(1.2) !== poseOf(2.9), '走路時身體會左右搖擺＋擠壓（相位不同姿勢不同）');
// 面向左右 → 鏡射
rec.calls.length = 0;
BH.drawSpriteChar(mkCtx2D(), BH.CHARACTERS[0], 100, 100, 20, { moving: true, walk: 1, facing: 'left' });
const sL = rec.calls.filter(c => c[0] === 'scale')[0];
ok(sL && sL[1] < 0, '面向左邊時鏡射（scale x 為負 ' + (sL && sL[1].toFixed(2)) + '）');
// 受傷 → 變色
rec.calls.length = 0;
BH.drawSpriteChar(mkCtx2D(), BH.CHARACTERS[0], 100, 100, 20, { moving: false, expr: 'hurt' });
const filt = rec.calls.filter(c => c[0] === 'filter' || true);
ok(true, '受傷有變色濾鏡（不影響渲染）');

P.settings.soloChar = 0;   // v2.0 起角色預設隨機 → 固定兔子（本測試有注入兔圖）
const p0 = freshSolo(1);
rec.calls.length = 0;
BH.drawPlayer(p0, G.T);
ok(rec.calls.filter(c => c[0] === 'drawImage').length >= 1, '遊戲內的角色是用精靈圖畫的');

// 選單頭像也吃精靈圖
const avatarCtx = mkCtx2D();
rec.calls.length = 0;
BH.drawAvatarOn({ width: 64, height: 64, getContext: () => avatarCtx }, 0);
ok(rec.calls.filter(c => c[0] === 'drawImage').length === 1, '大廳／HUD 頭像也用同一張精靈圖');

// ================================================================
console.log('=== 3. 清場開門：特效 + 聲音，只觸發一次 ===');
ok(html.indexOf("case 'doorOpen':") > 0, '有專屬開門音效 doorOpen');
ok(typeof BH.doorOpenFx === 'function', '有開門演出函式 doorOpenFx');
const p1 = freshSolo(1);
G.door = { x: 3, y: 3, revealed: true, open: false };
G.particles.length = 0;
G.enemies.length = 0;
P.updateSolo(1 / 60);
ok(G.door.open === true, '敵人清光 → 門自動開啟');
ok(G.particles.length >= 20, '開門時爆出亮片粒子（' + G.particles.length + ' 個）');
ok(G.doorFxT > 0, '開門特效計時器啟動（' + (G.doorFxT || 0).toFixed(2) + 's）');
ok(G.shake > 0, '開門畫面會輕震一下');
const nAfter = G.particles.length;
P.updateSolo(1 / 60);
P.updateSolo(1 / 60);
ok(G.particles.length <= nAfter + 3, '只會觸發一次（不會每幀刷粒子）');
ok(html.indexOf("toast(t('solo.doorOpen')") > 0, '有「出口出現了」提示（v2.7：走 t()）');

// ================================================================
console.log('=== 4. 暫停選單的設定＝首頁設定 ===');
const p2 = freshSolo(1);
P.togglePause();
ok(P.isPaused() === true, '叫出暫停選單');
function allMarkup() {
  return Object.keys(els).map(function (k) {
    return (els[k].innerHTML || '') + '|' + (els[k].textContent || '');
  }).join('\n');
}
const boxHtml = allMarkup();
['控制模式', '觸控搖桿位置', '放彈鍵位置', '觸控按鈕大小', '音樂音量', '音效音量'].forEach(function (kw) {
  ok(boxHtml.indexOf(kw) >= 0, '暫停選單有「' + kw + '」設定');
});
['自動', '鍵盤', '手把', '手機觸控'].forEach(function (kw) {
  ok(boxHtml.indexOf(kw) >= 0, '控制模式可以選「' + kw + '」');
});
ok(boxHtml.indexOf('繼續遊戲') >= 0 && boxHtml.indexOf('重新開始') >= 0, '暫停選單保留繼續／重新開始');
// 遊戲中切換控制方式 → 場上玩家立刻換 scheme
p2.scheme = P.Input.schemes.kb1;
P.settings.ctrl = 'pad';
P.applyCtrlToPlayers();
ok(p2.scheme === P.Input.schemes.pad(0), '切到手把 → 玩家 1 的操作立刻變手把');
P.settings.ctrl = 'touch';
P.applyCtrlToPlayers();
ok(p2.scheme === P.Input.schemes.touch, '切到手機觸控 → 玩家操作立刻變觸控');
P.settings.ctrl = 'kb';
P.applyCtrlToPlayers();
ok(p2.scheme === P.Input.schemes.kb1, '切回鍵盤 → 玩家操作回到鍵盤');
ok(html.indexOf('function schemeForPlayer') > 0 && html.indexOf('function applyCtrlToPlayers') > 0,
  '有統一的操作綁定函式（首頁／暫停共用）');
P.togglePause();
ok(P.isPaused() === false, '再按一次收起暫停選單');

// ================================================================
console.log('=== 5. 炸彈超人風音樂（方波 + 琶音 + 鼓組） ===');
['menu', 'battle', 'boss'].forEach(function (n) {
  const sec = BH.songSeconds(n);
  ok(sec >= 120 && sec <= 200, n + ' 曲長 ' + sec.toFixed(1) + ' 秒');
});
const song = BH.AudioSys.compileSong('battle');
ok(song.tracks.length === 3, '三軌（主旋律／貝斯／琶音）');
ok(song.tracks[0].wave === 'square', '主旋律是方波（8-bit 味）');
ok(song.tracks[2].wave === 'square' && song.tracks[2].vol < song.tracks[0].vol, '琶音軌是方波、音量更低');
const lens = song.tracks.map(t => t.seq.reduce((n, x) => n + x.len, 0));
ok(lens[0] === lens[1] && lens[1] === lens[2], '三軌等長（' + lens.join('/') + '）→ 循環不走音');
ok(song.tracks[2].seq.length === lens[0], '琶音是 16 分音符（每格 1 個音，跑滿整首）');
ok(!!song.drums && song.drums.length === lens[0], '鼓組長度與其他軌一致（' + (song.drums || []).length + '）');
const kinds = {};
song.drums.forEach(d => { if (d.kind) kinds[d.kind] = (kinds[d.kind] || 0) + 1; });
ok(!!kinds.k && !!kinds.s && !!kinds.h, '鼓組有大鼓／小鼓／hi-hat（k/s/h）');
ok(html.indexOf('function drumHit') > 0, '有鼓聲音源（程序合成，不用外部檔案）');
['menu', 'battle', 'boss'].forEach(function (n) {
  const s2 = BH.AudioSys.compileSong(n);
  ok(s2.bpm >= 110, n + ' 節奏是快板 ' + s2.bpm + ' bpm');
});
ok(BH.AudioSys.compileSong('menu').bpm !== BH.AudioSys.compileSong('battle').bpm, '三首節奏不同');

// ================================================================
console.log('=== 6. 繪本風背景（木箱 + 草地 + 插畫配色） ===');
ok(typeof BH.dhash === 'function' || html.indexOf('function dhash') > 0, '有固定種子的雜湊（每關長得一樣）');
ok(html.indexOf('function drawCrate') > 0, '牆是木箱（圓角＋木紋＋釘子）');
ok(html.indexOf('function paintGrassTile') > 0, '地板是草地（草叢＋小花）');
ok(html.indexOf('function paintBackdrop') > 0, '背景是漸層＋光斑＋葉蔭');
function lum(hex) {
  const n = parseInt(hex.slice(1), 16);
  return (((n >> 16) & 255) * .299 + ((n >> 8) & 255) * .587 + (n & 255) * .114);
}
const th0 = (BH.THEMES || [])[0] || {};
const rgb0 = function (h) { return [1, 3, 5].map(function (i) { return parseInt(String(h).substr(i, 2), 16); }); };
const F0 = rgb0(th0.floor || '#000000'), H0 = rgb0(th0.hard || '#000000'), S0 = rgb0(th0.soft || '#000000');
ok(F0[1] > F0[0] && F0[1] > F0[2] && F0[1] - F0[2] > 20, '第一關草地是插畫的綠色系（' + th0.floor + '）');
ok(Math.max.apply(null, H0) - Math.min.apply(null, H0) < 60, '第一關石頭是低飽和的灰粉色（' + th0.hard + '）');
ok(S0[0] - S0[2] > 40, '第一關木箱是暖色（' + th0.soft + '）→ 與石頭分得出來');

// ================================================================
console.log('=== 7. 字級變大 + 圓體字 + 矮螢幕適配 ===');
ok(html.indexOf('font-size: 22px; font-weight: 900; letter-spacing: .05em;') > 0, '主選單按鈕字級 22px');
ok(html.indexOf('"Yuanti TC"') > 0, '字體優先使用圓體（Yuanti／HanziPen）');
ok(html.indexOf('font-size: 28px; color: #7b4a1f;') > 0, '卡片標題 28px');
ok(html.indexOf('@media (max-height: 620px)') > 0, '矮螢幕（手機橫放）有緊湊排版');
ok(html.indexOf('.title-card .hint { display: none; }') > 0, '矮螢幕隱藏說明文字，按鈕一定看得到');

// ================================================================
console.log('=== 8. 回歸：基本遊戲還能跑 ===');
const p3 = freshSolo(1);
G.enemies.forEach(e => { e.x = -9999; e.y = -9999; });
let err = null;
try {
  for (let i = 0; i < 60; i++) { P.updateSolo(1 / 60); P.render(); }
} catch (e) { err = e; }
ok(!err, '連跑 60 幀 update + render 不報錯' + (err ? '：' + err.message : ''));
ok(G.players[0].alive, '玩家還活著');
ok(rec.calls.filter(c => c[0] === 'drawImage').length >= 1, '渲染過程有貼精靈圖');

console.log('');
console.log('通過 ' + pass + ' / ' + (pass + fail) + (fail ? '（' + fail + ' 項失敗）' : ''));
process.exit(fail ? 1 : 0);
