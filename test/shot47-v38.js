// v3.8 最終瀏覽器實測：
//   1. 首頁沒有統計列、公告欄讓開版本標籤（v4.0：top=94px）
//   2. 對戰分出勝負：橫幅出現、過場 ≥ 4.2 秒、有播 victory 音效
const path = require('path');
const { launch, sleep } = require('./cdp');

const PORT = 3531;
const BASE = 'http://127.0.0.1:' + PORT;
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ FAIL: ' + m); } }

(async function () {
  const { spawn } = require('child_process');
  const srv = spawn(process.execPath, [path.join(__dirname, '../../bomberman-online/server.js')], {
    env: Object.assign({}, process.env, { PORT: String(PORT) }), stdio: ['ignore', 'pipe', 'pipe']
  });
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(BASE + '/api/health'); if ((await r.json()).ok) break; } catch (e) {}
    await sleep(150);
  }

  const br = await launch({ w: 1100, h: 800, port: 9531 });
  const page = await br.newPage();
  await page.goto(BASE + '/', 2200);
  await sleep(700);

  // ---- 1. 首頁：統計列已移除 ----
  const t = await page.eval(`JSON.stringify({
    statBox: !!document.getElementById('statBox'),
    annTop: (function(){ var b=document.getElementById('annBox').getBoundingClientRect(); return Math.round(b.top); })(),
    ver: window.__BH.VERSION,
    stats: typeof window.__BH.Stats
  })`);
  const j = JSON.parse(t);
  ok(j.statBox === false, '首頁沒有統計列');
  ok(j.annTop >= 80 && j.annTop <= 110, '公告欄讓開左上角版本標籤（top=' + j.annTop + 'px，預期約 94）');
  ok(j.ver === '4.3', '版本 4.3');
  ok(j.stats === 'undefined', '__BH.Stats 已移除');
  await page.shot('test/v38-1-title.png');

  // ---- 2. 對戰勝利過場 ----
  await page.eval(`(function(){
    window.__BH.Battle.resetSlots();  // 建立 4 個位子（原本要點「對戰」按鈕才會建）
    window.__BH.startBattle();        // 4 人對戰（空位由 AI 補）
  })()`);
  await sleep(500);
  await page.eval(`(function(){
    var b = document.querySelector('.overlay-in .mbtn');
    if (b && b.click) b.click();
    var G = window.__BH.Game;
    G.state = 'play'; G.countdown = 0;
  })()`);
  await sleep(600);

  // 偷聽 sfx：記錄有沒有播 victory 勝利音樂
  await page.eval(`(function(){
    window.__sfx = [];
    var A = window.__BH.AudioSys, orig = A.sfx;
    A.sfx = function (n) { try { window.__sfx.push(n); } catch (e) {} return orig.apply(A, arguments); };
  })()`);
  // 讓「我」以外全死 → 觸發 roundover
  await page.eval(`(function(){
    var G = window.__BH.Game;
    var alive = G.players.filter(function (p) { return p.alive; });
    var me = alive[0];
    for (var i = 1; i < alive.length; i++) alive[i].alive = false;
    G.players.forEach(function (p) { p.vx = 0; p.vy = 0; });
    window.__t0 = performance.now();
  })()`);
  await sleep(700);
  const mid = await page.eval(`JSON.stringify({
    state: window.__BH.Game.state,
    sfx: (window.__sfx || []).slice(0),
    banner: (function(){ var b = document.getElementById('banner'); return {show: b.style.display !== 'none', txt: document.getElementById('bannerTxt').textContent}; })()
  })`);
  const mj = JSON.parse(mid);
  ok(mj.state === 'roundover', '分出勝負後進入 roundover 過場');
  ok(mj.banner.show && mj.banner.txt.length > 0, '橫幅有秀出來：「' + mj.banner.txt + '」');
  ok(mj.sfx.indexOf('victory') >= 0, '有播放勝利音樂 victory（sfx: ' + mj.sfx.join(',') + '）');
  await page.shot('test/v38-2-roundover.png');

  // 等 2.5 秒再拍一次：應該還在過場（原本 1.8 秒就跳了）
  await sleep(2500);
  const late = await page.eval(`JSON.stringify({state: window.__BH.Game.state, elapsed: Math.round(performance.now() - window.__t0)})`);
  const lj = JSON.parse(late);
  ok(lj.state === 'roundover', '2.5 秒後還在過場（舊版 1.8 秒就跳下一回合）');
  ok(lj.elapsed >= 3200, '過場已持續 ' + lj.elapsed + 'ms');
  // 等 4.2 秒總 duration
  await sleep(1800);
  const fin = await page.eval(`JSON.stringify({state: window.__BH.Game.state, round: window.__BH.Game.round})`);
  const fj = JSON.parse(fin);
  ok(fj.state === 'countdown' || fj.state === 'play', '約 4.2 秒後進入下一回合（' + fj.state + '）');

  await br.close();
  srv.kill();
  console.log('\n[shot47] ' + pass + ' 通過、' + fail + ' 失敗');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e.message); process.exit(1); });
