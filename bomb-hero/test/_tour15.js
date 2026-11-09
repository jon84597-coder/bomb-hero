// test/_tour15.js —— 一次性：40 關的「地圖」與「小怪生態」是不是同一章（v5.76 撤掉賽季重排）
const { launch } = require('./cdp');
const BASE = process.env.BH_BASE || 'http://127.0.0.1:3122';
const wait = ms => new Promise(r => setTimeout(r, ms));

const STAGES = [1, 3, 5, 6, 10, 11, 12, 16, 21, 26, 31, 36, 40];

(async () => {
  const b = await launch({ w: 1280, h: 800, port: 9476 });
  const p = await b.newPage();
  await p.resize(1280, 800, true);
  let bad = 0;
  for (const n of STAGES) {
    await p.goto(BASE + '/?unlock=all&stage=' + n, 2600);
    for (let i = 0; i < 30; i++) { if (await p.eval('!!window.__BH')) break; await wait(200); }
    /* 開場卡：按「出發」；第 1 關另有起手三選一 */
    await p.eval(`(function(){ var b=document.querySelector('#ovBox .mbtn')||document.querySelector('.mbtn');
      if (b) b.click(); return 1; })()`);
    await wait(600);
    await p.eval(`(function(){ var c=document.querySelector('#buffPick .bpick, #buffPick .bp, #buffPick button');
      if (c) c.click(); return 1; })()`);
    await wait(2200);

    const r = await p.eval(`(function(){
      var P = window.__BH, G = P.Game;
      if (!G || !G.mapInfo) return { err: 'no-game' };
      var ch = P.chapterOf(G.stage | 0);
      var roster = P.STAGE_ROSTER;
      var types = {}, list = [];
      (G.enemies || []).forEach(function (e) {
        if (!e || e.dead || e.boss) return;
        types[e.type] = 1;
      });
      Object.keys(types).forEach(function (id) {
        var at = -1;
        for (var i = 0; i < roster.length; i++) if (roster[i].indexOf(id) >= 0) { at = i + 1; break; }
        list.push(id + '@' + at);
      });
      return { stage: G.stage, state: G.state, ch: ch,
               map: G.mapInfo.n, theme: (G.mapInfo.theme | 0) + 1, boss: !!G.mapInfo.boss,
               themeName: (G.theme && (G.theme.n || G.theme.name)) || null,
               foes: list.sort(), nFoe: (G.enemies || []).length };
    })()`);
    if (r && !r.err) {
      const mapOk = r.boss ? r.theme === r.ch : r.theme === r.ch;
      const foeOk = r.foes.every(f => f.endsWith('@' + r.ch));
      if (!mapOk || !foeOk) bad++;
      console.log((mapOk && foeOk ? '  ✓ ' : '  ✗ ') + '[' + n + '] 章 ' + r.ch +
        ' → 地圖「' + r.map + '」(主題 ' + r.theme + (r.boss ? ' 決戰' : '') + ')' +
        ' 怪：' + (r.foes.join(' ') || '（無）') + (foeOk ? '' : '  ← 章節不符'));
    } else console.log('  ? [' + n + '] ' + JSON.stringify(r));
  }
  console.log('\n' + (bad === 0 ? '✅ 地圖與小怪全部同章' : '❌ ' + bad + ' 關不符'));
  process.exit(bad === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
