// test/shot61-v44.js — 瀏覽器端到端：道具／坐騎提示改成輕量 Toast 橫幅（v4.4）
//   · 自己起一台乾淨伺服器（temp data dir）
//   · 真的進遊戲、真的吃道具，量測橫幅位置／透明度／不擋點擊／2 秒淡出
//   · 檢查頂部狀態列的對應圖示有沒有同步高亮
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
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'bh-v44-'));
const PORT = 3222;

let pass = 0, fail = 0;
function ok(c, n, x) {
  if (c) { pass++; console.log('  ✓ ' + n + (x === undefined ? '' : '（' + x + '）')); }
  else { fail++; console.log('  ✗ FAIL: ' + n + (x === undefined ? '' : '（' + x + '）')); }
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function startServer() {
  const env = Object.assign({}, process.env, {
    PORT: String(PORT), BH_DATA_DIR: DATA, BH_AUTH_SECRET: 'v44-shot-secret', BH_FORCE_HTTPS: '0'
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

(async () => {
  const srv = startServer();
  if (!await waitUp()) throw new Error('伺服器沒起來');
  const b = await cdp.launch({ w: 1280, h: 900, port: 9473 });
  const p = await b.newPage();
  await p.resize(1280, 860, false);
  await p.goto('http://127.0.0.1:' + PORT + '/', 2400);
  await sleep(900);

  const evalJs = (js) => p.eval(js);
  const shot = (name) => p.shot(path.join(__dirname, name));

  // ---------- 1. 版本與樣式 ----------
  console.log('\n=== 1. 版本與橫幅基本樣式 ===');
  const ver = await evalJs('__BH.VERSION');
  ok(ver === '4.5', '版本 = 4.4', ver);
  const badge = await evalJs("document.getElementById('verTxt').textContent");
  ok(badge === '4.5', '首頁徽章同步 4.4', badge);

  const css = await evalJs(`(function(){
    const tt = document.getElementById('toast');
    const cs = getComputedStyle(tt);
    return { pos: cs.position, left: cs.left, pe: cs.pointerEvents,
             radius: cs.borderTopLeftRadius, bg: cs.backgroundColor,
             maxw: cs.maxWidth, fs: cs.fontSize, z: cs.zIndex,
             backdrop: cs.backdropFilter || cs.webkitBackdropFilter || '' };
  })()`);
  ok(css.pos === 'fixed', '橫幅是 fixed 定位（不再 absolute 貼在畫布左上角）', css.pos);
  ok(css.left === '50%' || Math.abs(parseFloat(css.left) - 640) < 260, '水平置中（left:50%）', css.left);
  ok(css.pe === 'none', 'pointer-events: none（不擋點擊）', css.pe);
  ok(/blur/.test(css.backdrop), '有毛玻璃 backdrop-filter', css.backdrop);
  const alpha = (function () {
    const m = /rgba?\(([^)]+)\)/.exec(css.bg || '');
    if (!m) return 1;
    const a = m[1].split(',').map(function (x) { return parseFloat(x); });
    return a.length >= 4 ? a[3] : 1;
  })();
  ok(alpha < 0.85, '背景是半透明（alpha ' + alpha + ' < 0.85）');
  ok(parseFloat(css.fs) <= 14, '字級 ≤ 14px（原本 13.5 但整塊很大，現在整體變細）', css.fs);

  // ---------- 2. 進遊戲 ----------
  console.log('\n=== 2. 進遊戲（單人第 1 關）===');
  await evalJs("__BH.startSolo(1, false)");
  await sleep(600);
  await evalJs("(function(){ const b=document.querySelector('#ovBox button'); if(b) b.click(); })()");
  await sleep(4200);
  const st = await evalJs('__BH.Game.state');
  ok(st === 'play', '遊戲進行中', st);

  // ---------- 3. 吃到火力道具 ----------
  console.log('\n=== 3. 吃到「火力」→ 橫幅 ＋ 頂部 🔥 高亮 ===');
  const before = await evalJs('__BH.Game.players[0].power');
  await evalJs("__BH.applyItem(__BH.Game.players[0], 'fire')");
  await sleep(160);
  const t1 = await evalJs(`(function(){
    const tt = document.getElementById('toast');
    const r = tt.getBoundingClientRect();
    const gt = document.getElementById('gameTop').getBoundingClientRect();
    const show = tt.classList.contains('show');
    const cs = getComputedStyle(tt);
    return { show: show, disp: cs.display, op: cs.opacity, txt: tt.textContent,
      top: r.top, bottom: r.bottom, left: r.left, right: r.right, h: r.height, w: r.width,
      gtBottom: gt.bottom, gtTop: gt.top, vw: innerWidth, vh: innerHeight };
  })()`);
  const after = await evalJs('__BH.Game.players[0].power');
  ok(after === before + 1, '火力 +1', before + ' → ' + after);
  ok(t1.show === true && t1.disp === 'block', '橫幅顯示中（.show）', t1.disp);
  ok(/火力/.test(t1.txt), '橫幅文字含道具名', t1.txt);
  ok(t1.top >= t1.gtBottom - 1, '橫幅貼在「頂部資訊列下緣」之下', 'toast.top=' + t1.top.toFixed(1) + ' / gameTop.bottom=' + t1.gtBottom.toFixed(1));
  ok(t1.bottom <= t1.vh, '橫幅沒有超出視窗底部', t1.bottom.toFixed(1) + ' ≤ ' + t1.vh);
  ok(t1.h >= 18 && t1.h <= 64, '橫幅是細長一條（高度 ' + t1.h.toFixed(1) + 'px，不是大方塊）');
  ok(t1.w <= t1.vw * 0.95, '橫幅寬度沒有滿版（' + t1.w.toFixed(0) + ' / ' + t1.vw + '）');

  const fx = await evalJs(`(function(){
    const c = document.querySelector('#gameTop [data-k="pow"]');
    return c ? { has: c.classList.contains('fx'), bg: getComputedStyle(c).backgroundColor } : null;
  })()`);
  ok(fx && fx.has, '頂部 🔥 火力圖示同步高亮（.fx）', JSON.stringify(fx));

  // 橫幅真的不吃點擊：中心點命中的元素不該是 #toast
  const hit = await evalJs(`(function(){
    const tt = document.getElementById('toast');
    const r = tt.getBoundingClientRect();
    const el = document.elementFromPoint(Math.round(r.left + r.width/2), Math.round(r.top + r.height/2));
    return el ? (el.id || el.tagName) : null;
  })()`);
  ok(hit !== 'toast', '橫幅中心點「點不到自己」（命中 ' + hit + '）');

  await shot('v44-1-toast-fire.png');

  // ---------- 4. 2 秒後自動淡出 ----------
  console.log('\n=== 4. 停留 2 秒 → 自動淡出 ===');
  // 重新彈一次並從這裡開始計時（前面的截圖會吃掉時間，不能沿用第 3 段的計時）
  await evalJs("__BH.toast('⏱ 停留測試', 2, 'pow')");
  await sleep(900);
  const at1 = await evalJs("document.getElementById('toast').classList.contains('show')");
  ok(at1 === true, '0.9 秒時仍在顯示', at1);
  await sleep(700);
  const mid = await evalJs(`(function(){ const tt=document.getElementById('toast');
    return { show: tt.classList.contains('show'), disp: getComputedStyle(tt).display }; })()`);
  ok(mid.show === true, '1.6 秒時還在（停留 2 秒）', JSON.stringify(mid));
  await sleep(1200);
  const gone = await evalJs(`(function(){ const tt=document.getElementById('toast');
    const cs = getComputedStyle(tt);
    return { show: tt.classList.contains('show'), disp: cs.display, op: cs.opacity }; })()`);
  ok(!gone.show && gone.disp === 'none', '超過 2 秒後自動淡出並收起來', JSON.stringify(gone));

  // ---------- 5. 各類道具對應的圖示 ----------
  console.log('\n=== 5. 各種道具 → 對應圖示聯動 ===');
  const cases = [
    ['bomb', '[data-k="bomb"]', '炸彈數 💣'],
    ['speed', '[data-k="spd"]', '速度 🛼'],
    ['heart', '[data-k="hp"]', '生命 ❤️'],
    ['glove', '.gi[data-g="glove"]', '背包 🧤 手套'],
    ['kick', '.gi[data-g="kick"]', '背包 🥾 踢鞋'],
    ['pierce', '.gi[data-g="pierce"]', '背包 🧨 穿透彈']
  ];
  for (const [type, sel, label] of cases) {
    await evalJs("__BH.applyItem(__BH.Game.players[0], " + JSON.stringify(type) + ")");
    await sleep(120);
    const r = await evalJs(`(function(){
      const el = document.querySelector('#gameTop ' + ${JSON.stringify(sel)});
      const tt = document.getElementById('toast');
      return { has: !!el && el.classList.contains('fx'), txt: tt.textContent, show: tt.classList.contains('show') };
    })()`);
    ok(r.has, label + ' 高亮', r.has ? r.txt.slice(0, 22) : 'no .fx');
    ok(r.show, label + ' 同時有橫幅', r.show);
  }

  // 遙控器：背包 +1 也要一起亮「炸彈數」
  await evalJs("__BH.applyItem(__BH.Game.players[0], 'remote')");
  await sleep(120);
  const remote = await evalJs(`(function(){
    const a = document.querySelector('#gameTop .gi[data-g="remote"]');
    const b = document.querySelector('#gameTop [data-k="bomb"]');
    return { a: !!a && a.classList.contains('fx'), b: !!b && b.classList.contains('fx') };
  })()`);
  ok(remote.a && remote.b, '遙控器同時高亮「背包 📱」與「炸彈數 💣」', JSON.stringify(remote));

  // 詛咒骷髏
  await evalJs("__BH.applyItem(__BH.Game.players[0], 'skull')");
  await sleep(120);
  const skull = await evalJs(`(function(){
    const el = document.querySelector('#gameTop .gi[data-g="skull"]');
    return { has: !!el && el.classList.contains('fx'), txt: document.getElementById('toast').textContent };
  })()`);
  ok(skull.has, '骷髏頭詛咒 → 背包 💀 高亮', skull.txt.slice(0, 20));

  await shot('v44-2-toast-glove.png');

  // ---------- 6. 坐騎（恐龍蛋） ----------
  console.log('\n=== 6. 坐上恐龍 → 同一條橫幅 ＋ 🦖 閃爍 ===');
  await evalJs("(function(){ const p=__BH.Game.players[0]; p.dino=false; p.redDragon=false; })()");
  await sleep(80);
  await evalJs(`(function(){
    const p = __BH.Game.players[0];
    p.dino = true; p.dinoT = 0; p.fireCd = 0;
    __BH.toast('🦖 恐龍：多擋一次傷害，F 吐火', 2, 'g:dino');
  })()`);
  await sleep(150);
  const dino = await evalJs(`(function(){
    const el = document.querySelector('#gameTop .gi[data-g="dino"]');
    const tt = document.getElementById('toast');
    return { has: !!el && el.classList.contains('fx'), txt: tt.textContent, show: tt.classList.contains('show'),
             h: tt.getBoundingClientRect().height };
  })()`);
  ok(dino.has, '背包 🦖 高亮', dino.has);
  ok(dino.show && /恐龍/.test(dino.txt), '坐騎提示走同一條輕量橫幅', dino.txt.slice(0, 20));

  // ---------- 7. 連續吃兩顆：不重播、只更新文字 ----------
  console.log('\n=== 7. 連續吃兩顆 → 只更新文字，不重新彈 ===');
  const seq = await evalJs(`(function(){
    const tt = document.getElementById('toast');
    __BH.toast('第一則', 2, 'pow');
    const a = tt.className;
    __BH.toast('第二則', 2, 'bomb');
    return { a: a, b: tt.className, txt: tt.textContent };
  })()`);
  ok(seq.txt === '第二則', '文字換成第二則', seq.txt);
  ok(seq.a === seq.b, 'class 沒變（不會重新播上浮動畫）', seq.a + ' / ' + seq.b);

  // ---------- 8. 舊版左上角大框真的不見了 ----------
  console.log('\n=== 8. 舊版「左上角大方塊」已移除 ===');
  const oldStyle = await evalJs(`(function(){
    const cs = getComputedStyle(document.getElementById('toast'));
    return { top: cs.top, left: cs.left, maxw: cs.maxWidth };
  })()`);
  ok(!/^(8|12)px$/.test(oldStyle.left), 'left 不再是 12px（不再貼左上角）', oldStyle.left);
  ok(oldStyle.maxw !== '46%', 'max-width 不再是 46%', oldStyle.maxw);
  const HTML_PATH = (function () {
    const a = path.join(__dirname, '..', 'index.html');
    const b = path.join(__dirname, '..', 'public', 'index.html');
    return fs.existsSync(a) ? a : b;
  })();
  const src = fs.readFileSync(HTML_PATH, 'utf8');
  ok(!/max-width: 46%/.test(src), '原始碼已無 max-width: 46% 的舊規則');
  ok(/v4\.4：道具／坐騎提示＝輕量 Toast 橫幅/.test(src), '有 v4.4 的樣式註解');
  ok(/function hudFlash\(key, ms, kind\)/.test(src), '有 hudFlash() 狀態列高亮（v4.5 起多一個 kind 參數）');
  ok(/applyHudFx\(\);\s*\/\/ v4\.4：HUD 重畫後/.test(src), 'HUD 重畫後會補回高亮');

  // ---------- 9. 手機橫放：橫幅不擋操作 ----------
  console.log('\n=== 9. 手機橫放 844×390 ===');
  await p.resize(844, 390, true);
  await sleep(500);
  await evalJs("document.body.classList.add('touch', 'in-game')");
  await sleep(300);
  await evalJs("__BH.toast('🔥 火力：火焰變大', 2, 'pow')");
  await sleep(200);
  const mob = await evalJs(`(function(){
    const tt = document.getElementById('toast');
    const r = tt.getBoundingClientRect();
    const gt = document.getElementById('gameTop').getBoundingClientRect();
    const hit = document.elementFromPoint(Math.round(r.left + r.width/2), Math.round(r.top + r.height/2));
    return { top: r.top, bottom: r.bottom, h: r.height, w: r.width, vh: innerHeight,
             gtBottom: gt.bottom, hit: hit ? (hit.id || hit.className || hit.tagName) : null,
             show: tt.classList.contains('show') };
  })()`);
  ok(mob.show, '手機橫放也顯示');
  ok(mob.top >= mob.gtBottom - 1, '貼在資訊列之下（' + mob.top.toFixed(0) + ' ≥ ' + mob.gtBottom.toFixed(0) + '）');
  ok(mob.bottom <= mob.vh, '不會超出畫面（' + mob.bottom.toFixed(0) + ' ≤ ' + mob.vh + '）');
  ok(mob.h <= 60, '手機上也只有 ' + mob.h.toFixed(0) + 'px 高');
  ok(mob.hit !== 'toast', '手機上同樣點不到它（命中 ' + mob.hit + '）');
  await shot('v44-3-mobile-land.png');

  console.log('\n結果：' + pass + ' 通過 / ' + fail + ' 失敗');
  try { await b.close(); } catch (e) {}
  try { srv.kill(); } catch (e) {}
  process.exit(fail ? 1 : 0);
})().catch(async function (e) {
  console.error('測試爆掉：', e && e.stack || e);
  process.exit(2);
});
