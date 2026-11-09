// test/_tour17.js —— v5.77：BGM 不變量（深淵曲只能在深淵播）＋教學一律第 1 章曲
const { launch } = require('./cdp');
const BASE = process.env.BH_BASE || 'http://127.0.0.1:3122';
const wait = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
function ok(c, m, x) {
  if (c) { pass++; console.log('  ✓ ' + m + (x === undefined ? '' : ' → ' + JSON.stringify(x))); }
  else { fail++; console.log('  ✗ FAIL: ' + m + (x === undefined ? '' : ' → ' + JSON.stringify(x))); }
}

(async () => {
  const b = await launch({ w: 1280, h: 800, port: 9492 });
  const p = await b.newPage();
  await p.resize(1280, 800, true);

  const boot = async () => {
    await p.goto(BASE + '/?unlock=all', 3000);
    for (let i = 0; i < 30; i++) { if (await p.eval('!!window.__BH')) break; await wait(200); }
    await p.eval(`(function(){ localStorage.setItem('bombhero-rotskip','1'); return 1; })()`);
  };

  /* ① 殘留旗標時硬要播深淵曲 → 被擋成章節曲 */
  await boot();
  const g1 = await p.eval(`(function(){ var P=window.__BH;
    P.Game.abyss = null; P.Game.abyssNext = null;
    P.AudioSys.startBGM('abyssWar');
    return { bgm: P.AudioSys.lastBGM() }; })()`);
  ok(g1.bgm === 'stage1', '沒有深淵狀態時 startBGM("abyssWar") 被擋成第 1 章曲', g1.bgm);

  /* ② 真的在深淵 → 深淵曲照播（不能被擋過頭） */
  const g2 = await p.eval(`(function(){ var P=window.__BH;
    P.Game.abyss = { layer: 3, perks: [], startAt: Date.now() };
    P.AudioSys.startBGM('abyssWar');
    return { bgm: P.AudioSys.lastBGM(), abyss: !!P.Game.abyss }; })()`);
  ok(g2.bgm === 'abyssWar', '真的在深淵時照常播深淵曲', g2.bgm);

  /* ③ 深淵中 → 進新手教學 → 一定是第 1 章曲，且旗標被清掉 */
  const g3 = await p.eval(`(function(){ var P=window.__BH;
    P.Game.abyss = { layer: 7, perks: [], startAt: Date.now() };
    P.Game.bossArena = { ch: 3 };
    P.AudioSys.startBGM('abyssWar');
    document.getElementById('btnTourAll').click();
    return { bgm: P.AudioSys.lastBGM(), part: P.Tut.part }; })()`);
  ok(g3.bgm === 'menu', '開教學時大廳換回菜單曲（不會停在深淵曲）', g3.bgm);
  await wait(800);
  let entered = null;
  for (let i = 0; i < 16; i++) {
    const st = await p.eval(`(function(){ var P=window.__BH, n=document.getElementById('tutNext');
      if (n) n.click();
      return { screen: P.Screen.current, state: P.Game.state }; })()`);
    await wait(600);
    if (st.state === 'play' || st.screen === 'game') { entered = st; break; }
  }
  ok(!!entered, '教學走到實戰');
  const g4 = await p.eval(`(function(){ var P=window.__BH; return {
    bgm: P.AudioSys.lastBGM(), map: (P.Game.mapInfo||{}).n, stage: P.Game.stage,
    abyss: !!P.Game.abyss, abyssNext: !!P.Game.abyssNext, boss: !!P.Game.bossArena }; })()`);
  ok(g4.bgm === 'stage1', '教學地圖播第 1 章曲（不是深淵曲）', g4.bgm);
  ok(g4.abyss === false && g4.boss === false, '教學把深淵／決戰場旗標清乾淨', g4);

  /* ④ 教學中「暫停→回遊戲」或重算 BGM 也不會變調 */
  const g5 = await p.eval(`(function(){ var P=window.__BH;
    P.AudioSys.startBGM('abyssWar');          // 模擬外部亂呼叫
    P.AudioSys.startBGM(P.AudioSys.lastBGM());
    var after = P.AudioSys.lastBGM();
    return { after: after, stage: P.Game.stage }; })()`);
  ok(g5.after !== 'abyssWar', '教學中就算被要求播深淵曲也擋掉（現況 ' + g5.after + '）');

  /* ⑤ 一般關卡：第 12 關 = 第 3 章曲 */
  await boot();
  await p.goto(BASE + '/?unlock=all&stage=12', 3000);
  for (let i = 0; i < 30; i++) { if (await p.eval('!!window.__BH')) break; await wait(200); }
  await p.eval(`(function(){ var b=document.querySelector('#ovBox .mbtn'); if (b) b.click(); return 1; })()`);
  await wait(1800);
  const g6 = await p.eval(`(function(){ var P=window.__BH; return { bgm: P.AudioSys.lastBGM(), stage: P.Game.stage,
    ch: P.chapterOf(P.Game.stage), map: (P.Game.mapInfo||{}).n }; })()`);
  ok(g6.bgm === 'stage' + g6.ch, '第 12 關播第 3 章曲', g6);

  console.log('\n' + (fail === 0 ? '✅' : '❌') + ' ' + pass + ' 通過 / ' + fail + ' 失敗');
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
