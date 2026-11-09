// test/_p74ui.js —— v5.74 兩個「只有看畫面才知道好不好」的檢查（本地）
//   ① 圖鑑：獎勵列長什麼樣（未集滿不出現／集滿出現「領取 1200」）
//   ② RPG 第 10 關：四帶規則真的寫在開場面板上
//   ⚠️ 需要先 `PORT=3122 node server.js`，並跑過 `node tools/sync-public.js`
const { launch } = require('./cdp');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, '_v574');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}

const BASE = process.env.BH_BASE || 'http://127.0.0.1:3122';
let pass = 0, fail = 0;
const ok = (c, m, x) => { if (c) { pass++; console.log('  ✓ ' + m + (x === undefined ? '' : ' → ' + JSON.stringify(x))); } else { fail++; console.log('  ✗ FAIL: ' + m + (x === undefined ? '' : ' → ' + JSON.stringify(x))); } };
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const b = await launch({ w: 430, h: 900, port: 9399 });
  const p = await b.newPage();
  const errs = [];
  try { p.on && p.on('console', m => { if (m.level && m.level() === 'error') errs.push(m.text()); }); } catch (e) {}
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.resize(430, 900, true);
  await p.goto(BASE + '/?unlock=all', 3500);
  for (let i = 0; i < 30; i++) {
    if (await p.eval('typeof window.__BH === "object" && !!window.__BH.VERSION')) break;
    await wait(400);
  }
  await p.eval(`(function(){
    try { localStorage.setItem('bombhero-rotskip','1'); } catch(e) {}
    var P = window.__BH;
    try { P.Solo.unlocked = 40; } catch(e){}
    try { P.RPG.unlocked = 40; } catch(e){}
    try { P.settings.playerName = '本地測試'; P.settings.nameLock = 1; P.saveSettings(); } catch(e){}
    return 1;
  })()`);

  /* ① 圖鑑 */
  const c0 = await p.eval(`(function(){
    var P = window.__BH;
    try { P.CodexUI.open(); } catch(e) { return { err: String(e) }; }
    var box = document.getElementById('codexRew');
    return { tabs: P.CodexUI.TABS.length, empty: box ? box.innerHTML.trim() === '' : null,
             gold: typeof P.Shop.gold === 'function' ? P.Shop.gold() : -1 };
  })()`);
  ok(!c0.err, '圖鑑可以打開', c0);
  ok(c0.empty === true, '還沒集滿時獎勵列是空的（不佔位）', c0.empty);
  await wait(700);
  await p.shot(path.join(OUT, 'p74-codex-empty.png'));

  /* 點亮第一頁（怪）→ 獎勵列應該冒出「領取」鍵 */
  const c1 = await p.eval(`(function(){
    var P = window.__BH;
    var list = P.CodexUI.listOf('f');
    for (var i = 0; i < list.length; i++) P.Codex.mark('f', list[i].id);
    P.CodexUI.render();
    var btn = document.querySelector('#codexRew .cdxrw[data-cdxrw]');
    return { n: list.length, done: P.CodexUI.tabDone('f'), hasBtn: !!btn,
             txt: btn ? btn.textContent.replace(/\\s+/g, ' ').trim() : '',
             gold: typeof P.Shop.gold === 'function' ? P.Shop.gold() : -1 };
  })()`);
  ok(c1.n > 0 && c1.done, '第一頁全部點亮', { n: c1.n, done: c1.done });
  ok(c1.hasBtn, '獎勵列冒出「領取」鍵', c1.txt);
  await wait(400);
  await p.shot(path.join(OUT, 'p74-codex-ready.png'));

  /* 按下去 → 金幣 +1200、鍵消失 */
  const c2 = await p.eval(`(function(){
    var P = window.__BH;
    var g0 = P.Shop.gold();
    var btn = document.querySelector('#codexRew .cdxrw[data-cdxrw]');
    if (btn) btn.click();
    return { g0: g0, g1: P.Shop.gold(),
             still: !!document.querySelector('#codexRew .cdxrw[data-cdxrw]') };
  })()`);
  ok(c2.g1 - c2.g0 === 1200, '按一下真的進帳 1,200 金幣', { before: c2.g0, after: c2.g1 });
  ok(c2.still === false, '領完按鍵就消失（不能重複領）', c2.still);

  /* ② RPG 第 11 關（第二帶：怪多；第 11 關不是決戰場，才吃帶規則） */
  await p.eval(`(function(){
    var P = window.__BH;
    try { P.RPG.unlocked = 40; } catch(e){}
    try { P.startRpg(11); } catch(e) { return String(e); }
    return 1;
  })()`);
  await wait(1800);
  const r = await p.eval(`(function(){
    var P = window.__BH, h = document.querySelector('#ovBox h3'), pp = document.querySelector('#ovBox p');
    var band = P.rpgBand(P.Game.stage);
    return { stage: P.Game.stage, band: band ? band.id : null,
             boss: P.isBossStage(P.Game.stage),
             title: h ? h.textContent : '', sub: pp ? pp.textContent.replace(/\\s+/g,' ') : '',
             foes: (P.Game.enemies || []).length };
  })()`);
  ok(r.stage === 11, '真的進到 RPG 第 11 關', r.stage);
  ok(r.band === 'swarm' && r.boss === false, '第 11 關屬於第二帶（怪多）、不是決戰場', { band: r.band, boss: r.boss });
  ok(r.sub.indexOf('🌀') >= 0, '開場面板有寫出這一帶的規則', r.sub.slice(0, 70));
  await p.shot(path.join(OUT, 'p74-rpg-band11.png'));

  /* 決戰場不吃帶規則（第 10 關是第 2 章王） */
  const rb = await p.eval(`(function(){
    var P = window.__BH;
    try { P.startRpg(10); } catch(e) { return { err: String(e) }; }
    var pp = document.querySelector('#ovBox p');
    return { boss: P.isBossStage(P.Game.stage), band: P.rpgBand(10) ? P.rpgBand(10).id : null,
             sub: pp ? pp.textContent.replace(/\\s+/g,' ') : '' };
  })()`);
  ok(rb.boss === true && rb.sub.indexOf('🌀') < 0, '決戰場（第 10 關）不吃分帶規則', { boss: rb.boss, hasBandLine: rb.sub.indexOf('🌀') >= 0 });

  console.log('\nconsole 錯誤：', errs.length ? errs.slice(0, 4) : '（無）');
  console.log('\n' + (fail === 0 ? '✅' : '❌') + ' UI 探針：' + pass + ' 通過 / ' + fail + ' 失敗');
  await b.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('探針爆炸：', e); process.exit(1); });
