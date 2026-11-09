// test/_p54.js —— v5.72 真瀏覽器探針（線上 Render）：對戰／線上的八大張風格地圖
//   驗：① 對戰設定有「地圖風格」九顆按鈕（隨機 ＋ 八張），不溢出、預設選隨機
//       ② 指定第 8 張「暗黑魔王城」→ 開戰那張圖真的是深色魔王城（畫布取樣）
//       ③ 隨機輪替：連跑八回合 → 八回合八張都不重複、第 8 張也會出現
//       ④ 回合開始的提示卡會寫出地圖名
//       ⑤ 截圖：設定列、兩張不同風格的實戰畫面
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, '_v564');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}

let pass = 0, fail = 0;
function ok(c, m, extra) {
  if (c) { pass++; console.log('  ✓ ' + m + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
  else { fail++; console.log('  ✗ FAIL: ' + m + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}
const wait = ms => new Promise(r => setTimeout(r, ms));

const URL0 = 'https://bomb-hero-game.onrender.com/?unlock=all';

const SETUP = `(function(){
  function R(e){ if(!e) return null; var b=e.getBoundingClientRect();
    return { x:Math.round(b.x), y:Math.round(b.y), w:Math.round(b.width), h:Math.round(b.height),
             r:Math.round(b.right), b:Math.round(b.bottom) }; }
  var P = window.__BH;
  var seg = document.getElementById('segTheme');
  var btns = seg ? Array.prototype.slice.call(seg.querySelectorAll('button')) : [];
  var box = R(seg);
  var over = btns.filter(function(b){ var q=R(b); return q && (q.r > window.innerWidth || q.x < 0); });
  return {
    ver: P.VERSION,
    n: btns.length,
    labels: btns.map(function(b){ return b.textContent.trim(); }),
    vals: btns.map(function(b){ return b.getAttribute('data-v'); }),
    sel: btns.filter(function(b){ return b.classList.contains('sel'); }).map(function(b){ return b.getAttribute('data-v'); }),
    box: box, over: over.length,
    vw: window.innerWidth,
    def: P.settings.battleTheme,
    net: (function(){ var e = document.getElementById('netTheme'); return e ? e.querySelectorAll('button').length : 0; })()
  };
})()`;

const ROUNDS = `(function(){
  var P = window.__BH, G = P.Game;
  P.settings.battleTheme = 'r';
  P.BattleTheme.reset();
  var out = [];
  for (var i = 0; i < 8; i++) { P.buildBattleRound(); out.push(G.themeIdx); }
  return { seq: out, uniq: out.filter(function(v,i,a){ return a.indexOf(v)===i; }).length,
           names: out.map(function(i){ return P.THEMES[i].name; }),
           stage: G.stage, ti: G.themeIdx };
})()`;

const CARD = `(function(){
  var P = window.__BH;
  var el = document.getElementById('doorHint');
  if (!el) return { has:false };
  var t = el.querySelector('.dh-t'), s = el.querySelector('.dh-s');
  return { has:true, disp:getComputedStyle(el).display, title:t?t.textContent:'', sub:s?s.textContent:'',
           cls:el.className };
})()`;

/* 把畫布取樣成一個粗略色票（看主題真的換了） */
const SAMPLE = `(function(){
  var cv = document.getElementById('cv');
  var g = cv.getContext('2d');
  var w = cv.width, h = cv.height;
  var sum = [0,0,0], n = 0;
  for (var y = 0; y < h; y += 17) for (var x = 0; x < w; x += 17) {
    var d = g.getImageData(x, y, 1, 1).data;
    if (d[3] < 8) continue;
    sum[0] += d[0]; sum[1] += d[1]; sum[2] += d[2]; n++;
  }
  return n ? [Math.round(sum[0]/n), Math.round(sum[1]/n), Math.round(sum[2]/n)] : [0,0,0];
})()`;

(async () => {
  const b = await launch({ w: 844, h: 390, port: 9491 });
  const p = await b.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });

  /* 本機重跑時 service worker 會把舊的 main.js 端出來（SW 對 JS 是 cache-first）
     → 每次開頁前先註銷 SW 並清光 cache，不然驗到的是上一版 */
  async function cleanSW() {
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
    await wait(400);
  }

  async function boot() {
    await p.goto(URL0, 1500);
    for (let i = 0; i < 40; i++) { if (await p.eval('!!window.__BH')) break; await wait(500); }
    await p.eval(`(function(){
      try{
        localStorage.setItem('bombhero-rotskip','1');
        var st = JSON.parse(localStorage.getItem('bombhero-settings-v1') || '{}');
        st.playerName = '小明'; st.nameLock = 1; st.nameAuto = 0;
        localStorage.setItem('bombhero-settings-v1', JSON.stringify(st));
      }catch(e){}
    })()`);
    await p.goto(URL0, 1600);
    for (let i = 0; i < 40; i++) { if (await p.eval('!!window.__BH')) break; await wait(500); }
    await p.eval("try{document.getElementById('rotHint')&&document.getElementById('rotHint').remove();}catch(e){}");
    await p.eval("try{document.getElementById('boot')&&document.getElementById('boot').remove();}catch(e){}");
    await wait(500);
  }

  /* ① 設定列 */
  await p.resize(844, 390, true);
  await cleanSW();
  await boot();
  await p.eval("window.__BH.Screen.show('battle')");
  await wait(600);
  let m = await p.eval(SETUP);
  console.log('\n--- ① 對戰設定的地圖風格 ---');
  console.log('  ' + JSON.stringify({ n: m.n, vals: m.vals, sel: m.sel, def: m.def, box: m.box, over: m.over }));
  ok(m.ver === '5.72', '線上版本 5.72', m.ver);
  ok(m.n === 9, '九顆按鈕（隨機 ＋ 八張）', m.n);
  ok(m.values === undefined && m.vals[0] === 'r', '第一顆是 data-v="r"（隨機輪替）', m.vals[0]);
  ok(m.vals.slice(1).join(',') === '0,1,2,3,4,5,6,7', '後面八顆正好 0~7', m.vals.slice(1));
  ok(m.labels.length === 9 && m.labels[1] === '綠野草原' && m.labels[8] === '暗黑魔王城',
    '八張主題名都在', [m.labels[1], m.labels[8]]);
  ok(m.sel.length === 1 && m.sel[0] === 'r', '預設選「隨機輪替」', m.sel);
  ok(m.over === 0 && m.box && m.box.r <= m.vw, '九顆按鈕都在畫面內（右緣 ' + (m.box && m.box.r) + ' ≤ ' + m.vw + '）');
  ok(m.net === 9, '線上房間同一列也是九顆', m.net);
  await p.shot(path.join(OUT, 'p54-settings.png'));

  /* ② 點指定第 8 張 */
  await p.eval("(function(){ var s=document.getElementById('segTheme'); s.querySelectorAll('button')[8].click(); })()");
  await wait(300);
  m = await p.eval(SETUP);
  ok(m.def === '7', '點第 8 顆 → settings.battleTheme = 7', m.def);
  ok(m.sel.length === 1 && m.sel[0] === '7', '選取狀態跟著跑', m.sel);

  /* ③ 指定地圖真的套進戰場（畫布取樣） */
  await p.eval("window.__BH.startBattle()");
  await wait(1400);
  await p.eval("(function(){ var G=window.__BH.Game; G.state='play'; G.timer=9999; })()");
  await wait(600);
  // 開場說明按「開戰」→ 進倒數（提示卡要在這裡才出現）
  const hadOv = await p.eval("(function(){ var b=document.querySelector('#ovBox button'); if(!b) return false; b.click(); return true; })()");
  console.log('  開場說明按掉：' + hadOv);
  await wait(900);
  const dark = await p.eval(SAMPLE);
  const st1 = await p.eval("(function(){ var G=window.__BH.Game; return { ti:G.themeIdx, name:G.theme.name, stage:G.stage }; })()");
  console.log('\n--- ② 指定第 8 張 ---');
  console.log('  ' + JSON.stringify({ st1, dark }));
  ok(st1.ti === 7 && st1.name === '暗黑魔王城', '戰場真的是暗黑魔王城', st1);
  await p.shot(path.join(OUT, 'p54-map8.png'));

  await p.eval("(function(){ var P=window.__BH; P.settings.battleTheme='2'; P.buildBattleRound(); var G=P.Game; G.state='play'; G.timer=9999; })()");
  await wait(900);
  const ice = await p.eval(SAMPLE);
  const st2 = await p.eval("(function(){ var G=window.__BH.Game; return { ti:G.themeIdx, name:G.theme.name }; })()");
  console.log('  ' + JSON.stringify({ st2, ice }));
  ok(st2.ti === 2 && st2.name === '冰雪原', '改成冰雪原', st2);
  const diff = Math.abs(dark[0] - ice[0]) + Math.abs(dark[1] - ice[1]) + Math.abs(dark[2] - ice[2]);
  ok(diff > 60, '兩張地圖畫布顏色明顯不同（差 ' + diff + '）', [dark, ice]);
  await p.shot(path.join(OUT, 'p54-map3.png'));

  /* ④ 隨機輪替：八回合八張 */
  await p.eval("(function(){ var P=window.__BH; P.settings.battleTheme='r'; })()");
  const r = await p.eval(ROUNDS);
  console.log('\n--- ③ 隨機輪替（八回合） ---');
  console.log('  ' + JSON.stringify(r));
  ok(r.seq.length === 8, '跑了八回合');
  ok(r.uniq === 8, '八回合八張都不重複', r.seq);
  ok(r.seq.indexOf(7) >= 0, '第 8 張（暗黑魔王城）在裡面', r.seq.indexOf(7));
  ok(r.stage === r.ti + 1, 'stage 對得上 themeIdx');

  /* ⑤ 回合提示卡 */
  await p.eval("(function(){ var P=window.__BH; P.Game.round = 5; P.settings.battleTheme='1'; P.buildBattleRound(); })()");
  await wait(700);
  const card = await p.eval(CARD);
  console.log('\n--- ④ 回合提示卡 ---');
  console.log('  ' + JSON.stringify(card));
  ok(card.has, '有提示卡元素');
  ok(card.disp !== 'none', '提示卡有顯示', card.disp);
  ok(/沙漠遺跡/.test(card.title), '標題寫出地圖名', card.title);
  ok(/第 5 回合/.test(card.sub), '副標是回合數', card.sub);
  await p.shot(path.join(OUT, 'p54-card.png'));

  /* ⑥ 手機直放也要放得下 */
  await p.resize(430, 932, true);
  await wait(500);
  await p.eval("window.__BH.Screen.show('battle')");
  await wait(500);
  m = await p.eval(SETUP);
  console.log('\n--- ⑤ 430×932 ---');
  console.log('  ' + JSON.stringify({ box: m.box, over: m.over }));
  ok(m.over === 0 && m.box.r <= 430, '直放九顆也都在畫面內（右緣 ' + m.box.r + '）');
  await p.shot(path.join(OUT, 'p54-settings-port.png'));

  console.log('\n========================================');
  console.log('v5.72 八大張風格地圖（線上真瀏覽器）：' + pass + ' 通過 / ' + fail + ' 失敗');
  b.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
