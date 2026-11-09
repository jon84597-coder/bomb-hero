// test/_p58.js —— v5.75 深淵 BGM 路由（真瀏覽器）
//   回報的兩個怪象：
//     ① 進深淵會聽到「第 1 關的音樂」，暫停→回遊戲才變成深淵曲
//     ② 打過深淵之後，新手教學會聽到深淵的音樂
//   驗法：AudioSys.lastBGM() 會記下「最後一次被要求播的曲名」，
//   直接看每個入口結束後的曲名對不對。
//   本機：BH_BASE=http://127.0.0.1:3122 node test/_p58.js
const { launch } = require('./cdp');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, '_v575');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}

const BASE = process.env.BH_BASE || 'https://bomb-hero-game.onrender.com';
let pass = 0, fail = 0;
const ok = (c, m, x) => { if (c) { pass++; console.log('  ✓ ' + m + (x === undefined ? '' : ' → ' + JSON.stringify(x))); } else { fail++; console.log('  ✗ FAIL: ' + m + (x === undefined ? '' : ' → ' + JSON.stringify(x))); } };
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const b = await launch({ w: 430, h: 900, port: 9400 });
  const p = await b.newPage();
  const errs = [];
  try { p.on && p.on('console', m => { if (m.level && m.level() === 'error') errs.push(m.text()); }); } catch (e) {}
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.resize(430, 900, true);

  await p.goto(BASE + '/?unlock=all', 1500);
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
  await p.eval(`(function(){
    try {
      localStorage.setItem('bombhero-rotskip', '1');
      var st = JSON.parse(localStorage.getItem('bombhero-settings-v1') || '{}');
      st.playerName = 'BGM 測試'; st.nameLock = 1; st.nameAuto = 0; st.bgm = 1;
      localStorage.setItem('bombhero-settings-v1', JSON.stringify(st));
    } catch (e) {}
    return 1;
  })()`);
  await p.goto(BASE + '/?unlock=all', 4000);
  for (let i = 0; i < 40; i++) {
    if (await p.eval('typeof window.__BH === "object" && !!window.__BH.AudioSys')) break;
    await wait(400);
  }
  const ver = await p.eval(`(function(){
    var P = window.__BH;
    try { P.Solo.unlocked = 40; } catch (e) {}
    try { P.RPG.unlocked = 40; } catch (e) {}
    try { P.settings.bgm = true; } catch (e) {}
    return P.VERSION;
  })()`);
  console.log('  線上版本 ' + ver);

  /* ① 進深淵：一進去就要是深淵曲（不是第 1 關） */
  const a0 = await p.eval(`(function(){
    var P = window.__BH;
    try { P.Abyss.start(1); } catch (e) { return { err: String(e) }; }
    return { bgm: P.AudioSys.lastBGM(), layer: P.Abyss.layerOf(), abyss: !!P.Game.abyss };
  })()`);
  ok(!a0.err, '深淵開得起來', a0.err || 'ok');
  ok(a0.bgm === 'abyssWar', '進深淵當下就是深淵曲（回報：以前是第 1 關的曲子）', a0.bgm);
  ok(a0.layer === 1 && a0.abyss, '深淵第 1 層狀態正常', [a0.layer, a0.abyss]);

  /* ② 點掉開場面板 → 開始玩，曲子不能被換掉 */
  await p.eval(`(function(){ var b = document.querySelector('#ovBox button'); if (b) b.click(); return 1; })()`);
  await wait(1600);
  const a1 = await p.eval(`(function(){
    var P = window.__BH;
    return { bgm: P.AudioSys.lastBGM(), state: P.Game.state, layer: P.Abyss.layerOf() };
  })()`);
  ok(a1.state === 'play' || a1.state === 'countdown', '開始遊戲', a1.state);
  ok(a1.bgm === 'abyssWar', '開始玩之後仍然是深淵曲', a1.bgm);

  /* ③ 暫停 → 回遊戲（回報說「只有這條路徑才是對的」，現在兩條都對） */
  await p.eval(`(function(){ try { window.__BH.togglePause(); } catch (e) {} return 1; })()`);
  await wait(600);
  await p.eval(`(function(){ try { window.__BH.togglePause(); } catch (e) {} return 1; })()`);
  await wait(800);
  const a2 = await p.eval(`(function(){ return { bgm: window.__BH.AudioSys.lastBGM(), paused: window.__BH.isPaused() }; })()`);
  ok(a2.paused === false, '暫停後回到遊戲');
  ok(a2.bgm === 'abyssWar', '暫停→回遊戲仍然是深淵曲（這條以前就對，不能弄壞）', a2.bgm);
  await p.shot(path.join(OUT, 'p58-abyss.png'));

  /* ④ 深淵王的層：應該照舊走決戰場曲（不是深淵曲、也不是章節曲） */
  const a3 = await p.eval(`(function(){
    var P = window.__BH;
    try { P.Abyss.start(5); } catch (e) { return { err: String(e) }; }
    return { bgm: P.AudioSys.lastBGM(), layer: P.Abyss.layerOf(), boss: !!P.Game.bossArena };
  })()`);
  ok(a3.layer === 5, '到第 5 層（深淵王）', a3.layer);
  ok(a3.bgm === 'bossWar', '深淵王那一層照舊走決戰場曲（不是深淵曲、也不是章節曲）', a3.bgm);

  /* ⑤ 回主選單 → 開新手教學：不能再聽到深淵曲 */
  await p.eval(`(function(){
    var P = window.__BH;
    try { P.Screen.show('title'); } catch (e) {}
    try { P.AudioSys.startBGM('menu'); } catch (e) {}
    return 1;
  })()`);
  await wait(700);
  /* 關鍵前提：深淵旗標還在（以前就是這個殘留害教學播深淵曲） */
  const pre = await p.eval(`(function(){ return { abyss: !!window.__BH.Game.abyss }; })()`);
  ok(pre.abyss === true, '（前提）回主選單時深淵旗標還留著 —— 這就是以前教學播錯曲的原因', pre.abyss);

  const tut = await p.eval(`(function(){
    var P = window.__BH;
    try { P.Screen.show('title'); } catch (e) {}
    var l = document.getElementById('btnLearn');
    if (l) l.click();
    var g = document.getElementById('btnTourAll');
    if (g) g.click();
    return { clicked: !!g };
  })()`);
  await wait(900);
  /* 教學是「一張一張卡」的流程（功能總覽 9 張＋介面導覽 6 張才進戰場）——
     要一路按「下一步」到真的進戰場（startPlay）才會播 BGM */
  for (let i = 0; i < 24; i++) {
    const st = await p.eval(`(function(){
      var P = window.__BH;
      var nx = document.getElementById('tutNext');
      var inGame = P.Screen.current === 'game';
      if (!inGame && nx) nx.click();
      return { screen: P.Screen.current, state: P.Game.state };
    })()`);
    if (st.screen === 'game') break;
    await wait(560);
  }
  await wait(1200);
  const tut2 = await p.eval(`(function(){
    var P = window.__BH;
    return { bgm: P.AudioSys.lastBGM(), abyss: !!P.Game.abyss, screen: P.Screen.current };
  })()`);
  ok(tut.clicked, '找得到「開始導覽」並按下');
  ok(tut2.bgm === 'stage1', '新手教學播的是第 1 關的曲子（回報：以前播深淵曲）', tut2.bgm);
  ok(tut2.abyss === false, '教學入口把深淵旗標清掉了', tut2.abyss);
  await p.shot(path.join(OUT, 'p58-tutorial.png'));

  /* ⑥ RPG / 對戰 入口也不再被深淵旗標污染 */
  const r = await p.eval(`(function(){
    var P = window.__BH;
    P.Game.abyss = { layer: 7, perks: [] };        // 手動弄髒
    try { P.startRpg(1); } catch (e) { return { err: String(e) }; }
    return { bgm: P.AudioSys.lastBGM(), abyss: !!P.Game.abyss };
  })()`);
  ok(r.bgm === 'stage1' && r.abyss === false, 'RPG 入口不受深淵旗標影響', r);

  const bt = await p.eval(`(function(){
    var P = window.__BH;
    P.Game.abyss = { layer: 7, perks: [] };
    try { P.startBattle(); } catch (e) { return { err: String(e) }; }
    return { bgm: P.AudioSys.lastBGM(), abyss: !!P.Game.abyss };
  })()`);
  ok(bt.bgm === 'battle' && bt.abyss === false, '對戰入口不受深淵旗標影響', bt);

  /* ⑦ 深淵曲長度（線上編譯一次就要 4~9 分鐘） */
  const sec = await p.eval(`(function(){ return window.__BH.AudioSys.songSeconds('abyssWar'); })()`);
  ok(sec >= 240 && sec <= 540, '深淵曲 ' + Math.round(sec) + ' 秒（4~9 分鐘，段落夠多才聽得出起伏）', Math.round(sec));

  console.log('\nconsole 錯誤：', errs.length ? errs.slice(0, 4) : '（無）');
  ok(errs.length === 0, '整段流程零 console 錯誤', errs.length);

  console.log('\n' + (fail === 0 ? '✅' : '❌') + ' BGM 探針：' + pass + ' 通過 / ' + fail + ' 失敗');
  await b.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('探針爆炸：', e); process.exit(1); });
