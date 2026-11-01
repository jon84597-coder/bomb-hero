// test/shot62-v45.js — 瀏覽器端到端：RPG 受傷反饋（v4.5）
//   · 自己起一台乾淨伺服器（temp data dir）
//   · 真的進 RPG 關卡、真的被打，量測：
//       ① 畫面正中央「絕對不能再出現巨大血量數字」
//       ② 角色頭上冒出 -1 並在 0.8 秒內消失
//       ③ canvas 四邊泛紅（中央不受影響）
//       ④ 頂部 ❤️ 4/5 放大到 1.2 倍並轉紅
//   · 桌機 1280×860 與手機橫放 844×390 都跑
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const cdp = require('./cdp');

const ROOT_SRV = (function () {
  const a = path.join(__dirname, '..');
  const b = path.join(__dirname, '..', '..', 'bomberman-online');
  if (fs.existsSync(path.join(a, 'server.js'))) return a;
  return b;
})();
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'bh-v45-'));
const PORT = 3223;

let pass = 0, fail = 0;
function ok(c, n, x) {
  if (c) { pass++; console.log('  ✓ ' + n + (x === undefined ? '' : '（' + x + '）')); }
  else { fail++; console.log('  ✗ FAIL: ' + n + (x === undefined ? '' : '（' + x + '）')); }
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function startServer() {
  const env = Object.assign({}, process.env, {
    PORT: String(PORT), BH_DATA_DIR: DATA, BH_AUTH_SECRET: 'v45-shot-secret', BH_FORCE_HTTPS: '0'
  });
  const p = spawn(process.execPath, ['server.js'], { cwd: ROOT_SRV, env, stdio: ['ignore', 'pipe', 'pipe'] });
  p.stdout.on('data', function () {});
  p.stderr.on('data', function (d) { const s = String(d); if (/Error/.test(s)) console.error('[srv]', s.trim()); });
  return p;
}
async function waitUp() {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch('http://127.0.0.1:' + PORT + '/api/health', { signal: AbortSignal.timeout(400) });
      if (r.ok) return true;
    } catch (e) {}
    await sleep(120);
  }
  return false;
}

// 取 canvas 左上角一小塊的平均顏色（判斷邊緣紅光）
const PIXEL_PROBE = `(function(){
  const cv = document.getElementById('cv');
  const g = cv.getContext('2d');
  function avg(x, y, w, h) {
    try {
      const d = g.getImageData(x, y, w, h).data;
      let r = 0, gg = 0, b = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i+1]; b += d[i+2]; n++; }
      return { r: Math.round(r/n), g: Math.round(gg/n), b: Math.round(b/n) };
    } catch (e) { return null; }
  }
  const W = cv.width, H = cv.height;
  return { left: avg(1, Math.round(H/2), 3, 3), center: avg(Math.round(W/2), Math.round(H/2), 3, 3),
           w: W, h: H };
})()`;

(async () => {
  const srv = startServer();
  if (!await waitUp()) throw new Error('伺服器沒起來');
  const b = await cdp.launch({ w: 1280, h: 900, port: 9474 });
  const p = await b.newPage();
  await p.resize(1280, 860, false);
  await p.goto('http://127.0.0.1:' + PORT + '/', 2400);
  await sleep(900);

  const evalJs = (js) => p.eval(js);
  const shot = (name) => p.shot(path.join(__dirname, name));

  // ---------- 1. 版本 ----------
  console.log('\n=== 1. 版本 ===');
  const ver = await evalJs('__BH.VERSION');
  ok(ver === '4.5', '版本 = 4.5', ver);
  ok(await evalJs("document.getElementById('verTxt').textContent") === '4.5', '首頁徽章同步 4.5');

  // ---------- 2. 進 RPG 關卡 ----------
  console.log('\n=== 2. 進入 RPG 第 1 關 ===');
  await evalJs('__BH.startRpg(1)');
  await sleep(500);
  await evalJs("(function(){ const b=document.querySelector('.overlay-in .mbtn'); if(b) b.click(); })()");
  await sleep(4200);          // 等 3.4 秒倒數
  const st = await evalJs('({ state: __BH.Game.state, rpg: !!__BH.Game.rpg, stage: __BH.Game.stage })');
  ok(st.state === 'play' && st.rpg === true, '已進入 RPG 戰鬥（state=play）', JSON.stringify(st));

  // 收掉「出口／道具」之類的殘留橫幅，讓受擊畫面乾淨
  await evalJs("(function(){ __BH.Game.toastT = 0; if (__BH.Game.toastOn) __BH.toastHide(); __BH.Game.bannerT = 0; document.getElementById('banner').style.display = 'none'; })()");
  await sleep(300);

  // ---------- 3. 受傷前：中央沒有大字 ----------
  console.log('\n=== 3. 受傷前：中央是乾淨的 ===');
  const before = await evalJs(`(function(){
    const bn = document.getElementById('banner');
    const cs = getComputedStyle(bn);
    return { disp: cs.display, txt: document.getElementById('bannerTxt').textContent,
             fs: getComputedStyle(bn.querySelector('span')).fontSize };
  })()`);
  ok(before.disp === 'none', '受傷前 #banner 是隱藏的', before.disp);
  ok(!/\d+\s*\/\s*\d+/.test(before.txt), '受傷前中央沒有任何「n / m」血量字', JSON.stringify(before.txt));

  const px0 = await evalJs(PIXEL_PROBE);
  ok(px0 && px0.left && px0.center, '取得到 canvas 像素', px0 && JSON.stringify(px0.left));

  // ---------- 4. 受擊：頭上飄字 ----------
  console.log('\n=== 4. 受擊瞬間：頭上飄字 -1 ===');
  const hit = await evalJs(`(function(){
    const p = __BH.Game.players[0];
    p.invuln = 0; p.armorCur = 0; p.armorMax = 0;      // 先扣血，不讓護甲吃掉
    const hp0 = p.hpCur;
    __BH.rpgHurt(p, false, { type: 'enemy' });
    return { hp0: hp0, hp1: p.hpCur, pops: __BH.Game.pops.length,
             txt: __BH.Game.pops[0] && __BH.Game.pops[0].txt,
             color: __BH.Game.pops[0] && __BH.Game.pops[0].color,
             py: p.y, popY: __BH.Game.pops[0] && __BH.Game.pops[0].y,
             edge: __BH.Game.edgeFx, kind: __BH.Game.edgeKind,
             bannerDisp: getComputedStyle(document.getElementById('banner')).display,
             bannerTxt: document.getElementById('bannerTxt').textContent };
  })()`);
  ok(hit.hp1 === hit.hp0 - 1, '生命真的少了 1', hit.hp0 + ' → ' + hit.hp1);
  ok(hit.pops === 1, '頭上冒出 1 顆飄字', hit.pops);
  ok(hit.txt === '-1', '數字是 -1', hit.txt);
  ok(hit.color === '#ff4d5e', '是紅色', hit.color);
  ok(hit.popY < hit.py, '位置在角色頭頂（y 比角色小）', hit.popY + ' < ' + hit.py);
  ok(hit.edge === 1 && hit.kind === 'hp', '同時觸發邊緣紅光', hit.edge + '/' + hit.kind);
  ok(hit.bannerDisp === 'none', '★ 受傷時中央仍然是隱藏的（不會再彈大字）', hit.bannerDisp);
  ok(!/\d+\s*\/\s*\d+/.test(hit.bannerTxt), '★ 中央完全沒有「4 / 5」這類血量字', JSON.stringify(hit.bannerTxt));

  // 截圖（飄字還活著）
  await sleep(120);
  await shot('v45-1-hurt-pop.png');

  // 頭上的字要在「角色附近」而不是畫面中央
  const popScreen = await evalJs(`(function(){
    const d = __BH.Game.pops[0];
    if (!d) return null;
    const T = __BH.Game.T;
    const sx = d.x + __BH.Game.camX;
    const sy = d.y - T * .8 * (1 - Math.pow(1 - Math.min(1, d.t / .5), 2)) + __BH.Game.camY;
    const p = __BH.Game.players[0];
    return { sx: Math.round(sx), sy: Math.round(sy),
             px: Math.round(p.x + __BH.Game.camX), py: Math.round(p.y + __BH.Game.camY),
             vw: innerWidth, vh: innerHeight };
  })()`);
  ok(popScreen && Math.abs(popScreen.sx - popScreen.px) < 30, '飄字水平對齊角色', popScreen && JSON.stringify(popScreen));
  ok(popScreen && popScreen.sy < popScreen.py, '飄字在角色上方', popScreen && (popScreen.sy + ' < ' + popScreen.py));

  // ---------- 5. 邊緣紅光真的畫出來了 ----------
  console.log('\n=== 5. 邊緣紅光（像素驗證）===');
  // 紅光只亮約 0.31 秒，前面量東量西已經收掉了 → 重新點一次再取樣
  await evalJs("__BH.hurtEdge('hp')");
  await sleep(50);
  const px1 = await evalJs(PIXEL_PROBE);
  const edgeNow = await evalJs('__BH.Game.edgeFx');
  ok(edgeNow > 0.5, '取樣時紅光還在（edgeFx > 0.5）', edgeNow);
  ok(px1 && px1.left, '受傷後取得到像素');
  if (px1 && px0) {
    const dR = px1.left.r - px0.left.r;
    ok(dR > 8, '畫面左緣變紅（R +' + dR + '）', px0.left.r + ' → ' + px1.left.r);
    // 中央是地圖內容（會隨爆炸／角色移動一直變），所以不能直接比前後，
    // 改成「同一幀裡 邊緣的紅度 明顯高於 中央的紅度」。
    const redness = function (c) { return c.r - (c.g + c.b) / 2; };
    const de = redness(px1.left) - redness(px1.center);
    const de0 = redness(px0.left) - redness(px0.center);
    ok(de > de0 + 12 && de > 10,
      '同一幀下「邊緣比中央紅」→ 紅光只貼邊、不影響中央視線',
      '受傷前 Δ' + de0.toFixed(1) + ' → 受傷後 Δ' + de.toFixed(1) +
      '（左 ' + JSON.stringify(px1.left) + ' / 中 ' + JSON.stringify(px1.center) + '）');
  }

  // ---------- 6. 頂部血量列 1.2 倍＋轉紅 ----------
  console.log('\n=== 6. 頂部 ❤️ 血量列高亮 ===');
  const chip = await evalJs(`(function(){
    const el = document.querySelector('#gameTop [data-k="hp"]');
    if (!el) return null;
    const cs = getComputedStyle(el);
    const bb = el.querySelector('b');
    return { cls: el.className, anim: cs.animationName, tf: cs.transform,
             color: bb ? getComputedStyle(bb).color : '', text: el.textContent.trim() };
  })()`);
  ok(chip && /fx-hurt/.test(chip.cls), '血量 chip 掛上 .fx-hurt', chip && chip.cls);
  ok(chip && chip.anim === 'hudPopHurt', '跑的是受傷專用動畫 hudPopHurt', chip && chip.anim);
  const sc = (function () {
    const m = /matrix\(([\d.]+)/.exec((chip && chip.tf) || '');
    return m ? parseFloat(m[1]) : 1;
  })();
  ok(sc > 1.05 && sc < 1.45, '放大中（目標 1.2 倍）', sc.toFixed(3));
  ok(chip && /rgb\(255, 85, 104\)|#ff5568/i.test(chip.color), '數字轉紅', chip && chip.color);

  await shot('v45-2-hud-hurt.png');

  // ---------- 7. 0.8 秒後自動消失 ----------
  console.log('\n=== 7. 自動淡出（不留在畫面上） ===');
  await sleep(1000);
  const after = await evalJs(`(function(){
    const el = document.querySelector('#gameTop [data-k="hp"]');
    return { pops: __BH.Game.pops.length, edge: __BH.Game.edgeFx,
             cls: el ? el.className : '',
             banner: getComputedStyle(document.getElementById('banner')).display };
  })()`);
  ok(after.pops === 0, '飄字已清空', after.pops);
  ok(after.edge === 0, '邊緣紅光已收掉', after.edge);
  ok(!/fx-hurt/.test(after.cls), '血量 chip 已恢復原狀', after.cls);
  ok(after.banner === 'none', '中央始終沒有出現大字', after.banner);

  // ---------- 8. 只扣護甲 → 藍色 ----------
  console.log('\n=== 8. 護甲先擋 → 藍色飄字＋藍光 ===');
  const arm = await evalJs(`(function(){
    const p = __BH.Game.players[0];
    p.invuln = 0; p.hpCur = p.hpMax; p.armorMax = 2; p.armorCur = 2;
    __BH.rpgHurt(p, false, { type: 'enemy' });
    return { hp: p.hpCur, armor: p.armorCur,
             txt: __BH.Game.pops[0] && __BH.Game.pops[0].txt,
             color: __BH.Game.pops[0] && __BH.Game.pops[0].color,
             kind: __BH.Game.edgeKind,
             banner: getComputedStyle(document.getElementById('banner')).display };
  })()`);
  ok(arm.armor === 1 && arm.hp === 5, '護甲 2 → 1，生命沒掉', arm.armor + ' / hp ' + arm.hp);
  ok(arm.txt === '-1' && arm.color === '#5fb6ff', '藍字 -1（看得出是護甲在擋）', arm.txt + ' ' + arm.color);
  ok(arm.kind === 'armor', '邊緣是藍光', arm.kind);
  ok(arm.banner === 'none', '仍然沒有中央大字', arm.banner);
  await sleep(110);
  await shot('v45-3-armor-blue.png');

  // ---------- 9. 手機橫放 844×390 ----------
  console.log('\n=== 9. 手機橫放 844×390 ===');
  await evalJs("document.body.classList.add('touch')");
  await p.resize(844, 390, true);
  await sleep(700);
  const mob = await evalJs(`(function(){
    const p = __BH.Game.players[0];
    p.invuln = 0; p.armorMax = 0; p.armorCur = 0; p.hpCur = 4;
    __BH.rpgHurt(p, false, { type: 'enemy' });
    const el = document.querySelector('#gameTop [data-k="hp"]');
    const bb = el ? el.getBoundingClientRect() : null;
    return { pops: __BH.Game.pops.length, txt: __BH.Game.pops[0] && __BH.Game.pops[0].txt,
             banner: getComputedStyle(document.getElementById('banner')).display,
             chipTop: bb && Math.round(bb.top), chipBottom: bb && Math.round(bb.bottom),
             vh: innerHeight, vw: innerWidth,
             edge: __BH.Game.edgeFx };
  })()`);
  ok(mob.pops === 1 && mob.txt === '-1', '手機上同樣冒出 -1', mob.pops + '/' + mob.txt);
  ok(mob.banner === 'none', '手機上中央也沒有大字', mob.banner);
  ok(mob.chipBottom > 0 && mob.chipBottom < mob.vh, '血量列在視窗內', mob.chipTop + '~' + mob.chipBottom + ' (vh ' + mob.vh + ')');
  ok(mob.edge > 0, '手機上邊緣紅光也觸發', mob.edge);
  await sleep(60);
  await shot('v45-4-mobile-land.png');

  // ---------- 10. 連續受傷不爆量 ----------
  console.log('\n=== 10. 連續受傷 ===');
  const many = await evalJs(`(function(){
    const p = __BH.Game.players[0];
    for (let i = 0; i < 12; i++) {
      p.invuln = 0; p.armorMax = 0; p.armorCur = 0;
      if (p.hpCur <= 1) p.hpCur = p.hpMax;
      __BH.rpgHurt(p, false, { type: 'enemy' });
    }
    return { pops: __BH.Game.pops.length,
             banner: getComputedStyle(document.getElementById('banner')).display };
  })()`);
  ok(many.pops <= 8, '同時最多 8 顆（不會愈疊愈多）', many.pops);
  ok(many.banner === 'none', '連打 12 下也完全沒有中央大字', many.banner);

  await b.close();
  srv.kill();
  console.log('\n結果：' + pass + ' 通過 / ' + fail + ' 失敗');
  process.exit(fail ? 1 : 0);
})().catch(async function (e) {
  console.error('測試異常：', e && e.message);
  process.exit(1);
});
