// test/_p56.js —— v5.73 真瀏覽器探針（線上 Render）
//   驗：① 線上真的是 v5.73（VERSION ＋ SW_VERSION ＋ /api/health）
//       ② 首頁今日進度、深淵入口在有 40 關進度時解鎖
//       ③ 進深淵 → HUD 徽章在頂欄正下方靠右（不壓地圖名、不蓋小地圖）
//       ④ 深淵層數提示在開始玩之後才出現（不是被開場面板壓住）
//       ⑤ 換層 / 每週限制挑戰卡 / 商店每日特惠三件
//       ⑥ 八張地板材質真的載進來（naturalWidth > 0）
//       ⑦ 零 console 錯誤
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, '_v573');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}

let pass = 0, fail = 0;
function ok(c, m, extra) {
  if (c) { pass++; console.log('  ✓ ' + m + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
  else { fail++; console.log('  ✗ FAIL: ' + m + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}
const wait = ms => new Promise(r => setTimeout(r, ms));

const BASE = 'https://bomb-hero-game.onrender.com';
const URL0 = BASE + '/?unlock=all';

(async () => {
  const b = await launch({ w: 430, h: 900, port: 9396 });
  const p = await b.newPage();
  const errs = [];
  try { p.on && p.on('Runtime.exceptionThrown', e => errs.push(String(e && e.exceptionDetails && e.exceptionDetails.text))); } catch (e) {}
  try { p.on && p.on('console', m => { if (m.level && m.level() === 'error') errs.push(m.text()); }); } catch (e) {}
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.resize(430, 900, true);

  /* ⓪ 先註銷 SW 並清 cache —— SW 對 JS 是 cache-first，不然會端出上一版 */
  await p.goto(URL0, 1200);
  await p.eval(`(async function(){
    try {
      var rs = await navigator.serviceWorker.getRegistrations();
      for (var i = 0; i < rs.length; i++) await rs[i].unregister();
      var ks = await caches.keys();
      for (var j = 0; j < ks.length; j++) await caches.delete(ks[j]);
    } catch (e) {}
    return 1;
  })()`);
  await wait(500);
  /* 手機模擬會跳「橫著玩更過癮」的轉向提示，把整局擋住 → 先標記跳過 */
  await p.eval(`(function(){
    try {
      localStorage.setItem('bombhero-rotskip', '1');
      var st = JSON.parse(localStorage.getItem('bombhero-settings-v1') || '{}');
      st.playerName = '線上測試'; st.nameLock = 1; st.nameAuto = 0;
      localStorage.setItem('bombhero-settings-v1', JSON.stringify(st));
    } catch (e) {}
    return 1;
  })()`);

  /* ① 版本三件事 */
  const health = await p.eval(`fetch('/api/health').then(function(r){return r.json();}).then(function(j){return j;}).catch(function(e){return {err:String(e)};})`);
  ok(health && !health.err, '/api/health 有回應', health && (health.ok === undefined ? health.status || 'ok' : health.ok));
  const swTxt = await p.eval(`fetch('/sw.js').then(function(r){return r.text();}).then(function(t){ var m=t.match(/SW_VERSION\\s*=\\s*'([^']+)'/); return m?m[1]:''; }).catch(function(e){ return 'ERR'; })`);
  ok(swTxt === 'v5.73.0', '線上 SW_VERSION 是 v5.73.0', swTxt);

  await p.goto(URL0, 3800);
  for (let i = 0; i < 30; i++) {
    if (await p.eval('typeof window.__BH === "object" && !!window.__BH.VERSION')) break;
    await wait(400);
  }

  /* ② 首頁 */
  const home = await p.eval(`(function(){
    var P = window.__BH;
    try { P.Solo.unlocked = 40; } catch(e){}
    try { P.settings.playerName = '線上測試'; P.settings.nameLock = 1; P.saveSettings(); } catch(e){}
    try { P.Starter.apply(); } catch(e){}
    var tl = document.getElementById('todayLine');
    return { ver: P.VERSION, today: tl ? tl.textContent.trim() : '',
             shown: tl ? (window.getComputedStyle(tl).display !== 'none') : false };
  })()`);
  ok(home.ver === '5.73', '線上版本 5.73', home.ver);
  ok(home.today.indexOf('40') >= 0, '首頁今日進度顯示 40 關', home.today);

  /* ③ 深淵入口 */
  const adv = await p.eval(`(function(){
    var P = window.__BH; P.Solo.unlocked = 40;
    document.getElementById('btnAdventure').click();
    var b = document.getElementById('btnAbyss');
    return { has: !!b, txt: b ? b.textContent.trim() : '', locked: b ? b.classList.contains('locked') : null };
  })()`);
  ok(adv.has, '冒險彈窗有深淵按鈕', adv.txt);
  ok(!adv.locked, '40 關全破後深淵解鎖');

  /* ④ 進深淵 → 點掉開場面板 → 量徽章位置 */
  await p.eval(`document.getElementById('btnAbyss').click(); 1`);
  await wait(1500);
  const ab = await p.eval(`(function(){
    var P = window.__BH, G = P.Game;
    var bd = document.getElementById('abyssBadge');
    return { mode: G.mode, layer: P.Abyss.layerOf(), badge: bd ? bd.textContent.trim() : '',
             hidden: bd ? bd.classList.contains('hide') : null, foes: (G.enemies||[]).length };
  })()`);
  ok(ab.layer === 1, '深淵第 1 層', ab.layer);
  ok(ab.badge.length > 0 && !ab.hidden, 'HUD 徽章有內容且沒被藏', ab.badge);
  ok(ab.foes > 0, '層裡有怪', ab.foes);

  await p.eval(`(function(){ var b=document.querySelector('#ovBox button'); if(b) b.click(); return 1; })()`);
  /* 倒數 3 秒：提示卡應該在這時候彈（不再被開場面板壓住） */
  await wait(1000);
  const mid = await p.eval(`(function(){
    var P = window.__BH;
    var hint = document.getElementById('doorHint');
    return { state: P.Game.state, hintIn: hint ? hint.classList.contains('in') : null,
             ovHidden: (document.getElementById('ovIn') || {}).className || '' };
  })()`);
  ok(mid.state === 'countdown' || mid.state === 'play', '點掉面板後進入倒數／開玩', mid.state);
  ok(mid.hintIn === true, '層數提示在開場面板收掉之後才彈', mid.hintIn);
  await wait(3200);
  const pos = await p.eval(`(function(){
    var P = window.__BH;
    var bd = document.getElementById('abyssBadge'), gt = document.getElementById('gameTop');
    var r1 = bd ? bd.getBoundingClientRect() : null, r2 = gt ? gt.getBoundingClientRect() : null;
    var inBar = !!(r1 && r2 && r1.width > 0 && r1.top >= r2.top - 1 && r1.bottom <= r2.bottom + 2 &&
                   r1.left >= r2.left - 1 && r1.right <= r2.right + 1);
    return { state: P.Game.state, inBar: inBar, isChild: !!(bd && gt && bd.parentNode === gt),
             top: r1 ? Math.round(r1.top) : -1, right: r1 ? Math.round(r1.right) : -1,
             barTop: r2 ? Math.round(r2.top) : -1, barBottom: r2 ? Math.round(r2.bottom) : -1,
             vw: window.innerWidth };
  })()`);
  ok(pos.state === 'play', '倒數結束後真的開始玩', pos.state);
  ok(pos.isChild && pos.inBar, '徽章是頂欄裏的 chip，HUD 重畫後還在（手機進場一定會重畫）',
    { child: pos.isChild, inBar: pos.inBar, top: pos.top, bar: [pos.barTop, pos.barBottom] });
  ok(pos.right <= pos.vw + 1, '徽章沒有超出畫面右緣', { right: pos.right, vw: pos.vw });
  await p.shot(path.join(OUT, 'p56-abyss-online.png'));

  /* ⑤ 換層 */
  const l2 = await p.eval(`(function(){
    var P = window.__BH;
    try { P.Abyss.start(3); } catch(e){ return { err: String(e) }; }
    return { layer: P.Abyss.layerOf(), badge: (document.getElementById('abyssBadge')||{}).textContent };
  })()`);
  ok(l2.layer === 3, '可以逐層推進（第 3 層）', l2.layer);

  /* ⑥ 每週限制挑戰 */
  await p.eval(`(function(){ window.__BH.Screen.show('daily'); window.__BH.renderDailyScreen(); return 1; })()`);
  await wait(800);
  const wk = await p.eval(`(function(){
    var b = document.getElementById('wkChal'), m = document.getElementById('wkChalMod'), s = document.getElementById('wkChalStage');
    return { has: !!b, vis: b ? (window.getComputedStyle(b).display !== 'none') : false,
             mod: m ? m.textContent.trim() : '', stage: s ? s.textContent.trim() : '' };
  })()`);
  ok(wk.has && wk.vis, '每日挑戰頁有限制挑戰卡');
  ok(wk.mod.length > 4 && wk.stage.length > 0, '限制條件與本週關卡都有寫出來', { mod: wk.mod, stage: wk.stage });
  await p.shot(path.join(OUT, 'p56-weekly-online.png'));

  /* ⑦ 商店每日特惠 */
  await p.eval(`(function(){ window.__BH.Screen.show('shop'); window.__BH.Shop.render(); return 1; })()`);
  await wait(900);
  const deal = await p.eval(`(function(){
    var box = document.getElementById('shopDeal');
    var cards = box ? box.querySelectorAll('.dealcard') : [];
    var prices = [], overlap = 0;
    Array.prototype.forEach.call(cards, function(c){
      var pr = c.querySelector('.dealprice'), bt = c.querySelector('.dealbtn');
      if (pr && bt) {
        prices.push(pr.textContent.trim());
        var a = pr.getBoundingClientRect(), q = bt.getBoundingClientRect();
        if (a.right > q.left + 1) overlap++;
      }
    });
    return { has: !!box, n: cards.length, prices: prices, overlap: overlap };
  })()`);
  ok(deal.has, '商店有今日特惠區');
  ok(deal.n === 3, '三件特惠', deal.n);
  ok(deal.prices.length === 3 && deal.prices.every(function (x) { return x.length > 0; }), '每件都有價格', deal.prices);
  ok(deal.overlap === 0, '價格沒有被購買鍵蓋住', deal.overlap);

  /* ⑧ 地板材質 */
  const flr = await p.eval(`(function(){
    var P = window.__BH;
    var F = P.FloorTex;
    if (!F || !F.STYLES) return { err: 'no FloorTex' };
    return { n: F.STYLES.length, names: F.STYLES.slice() };
  })()`);
  ok(flr.n === 8, '八個主題都有地板材質', flr.n);

  const imgs = await p.eval(`(function(){
    var list = ['forest','sand','ice','lava','neon','sea','sky','dark'].map(function(s){
      return 'spr/flr-' + s + '.webp?v=73';
    });
    return new Promise(function(res){
      var done = 0, good = 0, bad = [];
      list.forEach(function(src){
        var im = new Image();
        im.onload = function(){ if (im.naturalWidth > 0) good++; else bad.push(src);
          if (++done === list.length) res({ ok: good, n: list.length, bad: bad }); };
        im.onerror = function(){ bad.push(src);
          if (++done === list.length) res({ ok: good, n: list.length, bad: bad }); };
        im.src = src;
      });
      setTimeout(function(){ res({ ok: good, n: list.length, bad: bad, timeout: true }); }, 9000);
    });
  })()`);
  ok(imgs.ok === 8, '八張地板材質都真的載得到', imgs);

  console.log('\nconsole 錯誤：', errs.length ? errs.slice(0, 4) : '（無）');
  ok(errs.length === 0, '整段流程零 console 錯誤', errs.length);

  console.log('\n' + (fail === 0 ? '✅' : '❌') + ' 線上探針：' + pass + ' 通過 / ' + fail + ' 失敗');
  await b.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('探針爆炸：', e); process.exit(1); });
