// test/_tour18.js —— 深淵入口的 BGM 時序：一按下去就要是深淵曲（回報問題）
const { launch } = require('./cdp');
const BASE = process.env.BH_BASE || 'http://127.0.0.1:3122';
const wait = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
function ok(c, m, x) {
  if (c) { pass++; console.log('  ✓ ' + m + (x === undefined ? '' : ' → ' + JSON.stringify(x))); }
  else { fail++; console.log('  ✗ FAIL: ' + m + (x === undefined ? '' : ' → ' + JSON.stringify(x))); }
}

const SNAP = `(function(){ var P = window.__BH;
  return { screen: P.Screen.current, state: P.Game.state, stage: P.Game.stage,
    abyss: P.Game.abyss ? P.Game.abyss.layer : null,
    next: P.Game.abyssNext ? P.Game.abyssNext.layer : null,
    boss: !!P.Game.bossArena,
    bgm: P.AudioSys.lastBGM(),
    ov: (function(){ var b = document.getElementById('ovBox');
      if (!b) return ''; var h = b.querySelector('h3'); return h ? h.textContent : ''; })(),
    ovBtn: (function(){ var b = document.getElementById('ovBox');
      if (!b) return ''; var x = b.querySelector('button'); return x ? x.textContent : ''; })(),
    ovSub: (function(){ var b = document.getElementById('ovBox');
      if (!b) return ''; var x = b.querySelector('p'); return x ? x.textContent : ''; })() };
})()`;

(async () => {
  const b = await launch({ w: 1280, h: 800, port: 9493 });
  const p = await b.newPage();
  await p.resize(1280, 800, true);

  await p.goto(BASE + '/?unlock=all', 3000);
  for (let i = 0; i < 30; i++) { if (await p.eval('!!window.__BH')) break; await wait(200); }
  await p.eval(`(function(){ localStorage.setItem('bombhero-rotskip','1'); return 1; })()`);
  /* 真滑鼠點一下（真的手勢，瀏覽器才准出聲）＋ 深淵要 40 關全破才開 */
  await p.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 640, y: 400, button: 'left', clickCount: 1 });
  await p.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 640, y: 400, button: 'left', clickCount: 1 });
  await wait(600);
  await p.eval(`(function(){ var P=window.__BH; P.Solo.unlocked = 40; return P.Solo.unlocked; })()`);
  await wait(200);

  /* 首頁：大廳曲 */
  const home = await p.eval(SNAP);
  ok(home.screen === 'title', '（前置）停在首頁', home.screen);
  ok(home.bgm === 'menu', '首頁播大廳曲', home.bgm);

  /* 冒險 → 深淵（真的點按鈕，不直接呼叫 Abyss.start） */
  const unlocked = await p.eval(`(function(){ return window.__BH.Abyss.unlocked(); })()`);
  ok(unlocked === true, '（前置）?unlock=all 有開深淵', unlocked);

  await p.eval(`(function(){ var a=document.getElementById('btnAdventure'); if(a) a.click(); return 1; })()`);
  await wait(260);
  await p.eval(`(function(){ var a=document.getElementById('btnAbyss'); if(a) a.click(); return 1; })()`);

  /* 點下去「同一個 tick」就要對 —— 這是玩家回報的那一瞬間 */
  const t0 = await p.eval(SNAP);
  ok(t0.screen === 'game', '按下深淵立刻進遊戲畫面', t0.screen);
  ok(t0.abyss === 1, '立刻就是深淵第 1 層（旗標已在）', { abyss: t0.abyss, next: t0.next });
  ok(t0.bgm === 'abyssWar', '★ 一進深淵就播深淵曲（不是地圖曲）', t0.bgm);

  await wait(900);
  const t1 = await p.eval(SNAP);
  ok(t1.bgm === 'abyssWar', '開場卡還在時仍是深淵曲', { bgm: t1.bgm, ov: (t1.ov || '').slice(0, 18) });
  ok(/深淵|深淵|Abyss|심연/.test(t1.ov || ''), '開場卡標題是「深淵・第 N 層」（不再謊報第 9 關）', t1.ov);
  ok(!/第 \d+ 關|傳送門/.test((t1.ov || '') + (t1.ovSub || '')), '開場卡不再出現普通關的「第 N 關／傳送門」', t1.ovSub);
  ok(/潛下去|Dive in|潜る|잠수/.test(t1.ovBtn || ''), '按鈕是「潛下去」', t1.ovBtn);
  try { await p.shot('test/_v576/abyss-overlay-1280.png'); } catch (e) {}

  /* 按「出發」→ 應該還是深淵曲（不能退回章節曲） */
  await p.eval(`(function(){ var b=document.querySelector('#ovBox .mbtn, #ovBox button.mbtn, .mbtn');
    if (b) b.click(); return 1; })()`);
  await wait(1200);
  const t2 = await p.eval(SNAP);
  ok(t2.bgm === 'abyssWar', '按「出發」後仍是深淵曲', { bgm: t2.bgm, state: t2.state, abyss: t2.abyss });

  /* 抽契約 → 真的開始玩 */
  await p.eval(`(function(){ var c=document.querySelector('#abyssPerk .apcard, #abyssPerk .apc, #abyssPerk button');
    if (c) c.click(); return 1; })()`);
  await wait(1500);
  const t3 = await p.eval(SNAP);
  ok(t3.abyss === 1, '契約抽完仍在深淵第 1 層', t3.abyss);
  ok(t3.bgm === 'abyssWar', '實際開始玩仍是深淵曲', { bgm: t3.bgm, state: t3.state });

  /* 暫停 → 繼續：不可以變（這條是玩家「暫停回來才對」的反向驗證） */
  await p.eval(`(function(){ try { window.__BH.togglePause(true); } catch(e){} return 1; })()`);
  await wait(600);
  const t4 = await p.eval(SNAP);
  await p.eval(`(function(){ try { window.__BH.togglePause(false); } catch(e){} return 1; })()`);
  await wait(700);
  const t5 = await p.eval(SNAP);
  ok(t5.bgm === 'abyssWar', '暫停再繼續：還是深淵曲（不會變）', { paused: t4.bgm, resumed: t5.bgm });

  /* 下一層：仍然是深淵曲、而且同一首不重來 */
  const t6 = await p.eval(`(function(){ var P=window.__BH;
    var before = P.AudioSys.lastBGM();
    try { P.Abyss._next ? P.Abyss._next() : null; } catch(e){}
    return { before: before, abyss: P.Game.abyss ? P.Game.abyss.layer : null,
             bgm: P.AudioSys.lastBGM() }; })()`);
  console.log('  · 換層探測 →', JSON.stringify(t6));

  /* 王層（第 5 層）刻意播決戰曲 —— 保險不能把它一起蓋掉 */
  await p.eval(`(function(){ try { window.__BH.Abyss.start(5); } catch(e) { return { err: String(e) }; } return 1; })()`);
  await wait(900);
  const t8 = await p.eval(SNAP);
  ok(t8.abyss === 5 && t8.boss === true, '（前置）第 5 層是王層', { abyss: t8.abyss, boss: t8.boss });
  ok(t8.bgm === 'bossWar', '王層照舊播決戰曲（沒有被深淵曲蓋掉）', t8.bgm);
  ok(/BOSS/.test(t8.ov || ''), '王層開場卡標了 BOSS', t8.ov);

  /* 反向：離開深淵去普通關卡，不能還留著深淵曲 */
  await p.eval(`(function(){ var P=window.__BH;
    P.Game.abyss = null; P.Game.abyssNext = null;
    try { P.startSolo(1, false, false); } catch(e) { return { err: String(e) }; }
    return 1; })()`);
  await wait(900);
  const t7 = await p.eval(SNAP);
  ok(t7.bgm === 'stage1', '離開深淵打第 1 關 → 回到第 1 章曲', { bgm: t7.bgm, abyss: t7.abyss });

  console.log('\n' + (fail === 0 ? '✅' : '❌') + ' ' + pass + ' 通過 / ' + fail + ' 失敗');
  await b.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
