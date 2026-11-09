// test/_p50.js —— v5.70 真瀏覽器探針：對戰（手機直放／橫放）角色清單
//   驗：① 變成小頭像列（28px 圓、無暱稱）② 不壓到右上角計時器
//       ③ 不超出畫面上緣（高度） ④ 大逃殺那條仍然貼在小地圖右邊
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, '_v564');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}

let pass = 0, fail = 0;
function ok(c, m, extra) {
  if (c) { pass++; console.log('  ✓ ' + m); }
  else { fail++; console.log('  ✗ FAIL: ' + m + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}
const wait = ms => new Promise(r => setTimeout(r, ms));

const MEASURE = `(function(){
  function R(e){ if(!e) return null; var b=e.getBoundingClientRect();
    return { x:Math.round(b.x), y:Math.round(b.y), w:Math.round(b.width), h:Math.round(b.height),
             r:Math.round(b.right), b:Math.round(b.bottom) }; }
  var P = window.__BH, G = P.Game;
  var ro = document.getElementById('pkRoster');
  var cards = ro ? ro.querySelectorAll('.pcard') : [];
  var c0 = cards.length ? cards[0].getBoundingClientRect() : null;
  var mm = null;
  try { if (P.miniMapOn && P.miniMapOn()) mm = P.miniMapBox(); } catch(e){}
  var cvEl = document.getElementById('cv');
  var cw = cvEl ? cvEl.getBoundingClientRect() : { left:0, top:0 };
  return {
    ver: P.VERSION, mode: G.mode, players: G.players.length,
    cls: ro ? ro.className : '', n: cards.length,
    roster: R(ro), card0: c0 ? { w:Math.round(c0.width), h:Math.round(c0.height) } : null,
    timer: R(document.getElementById('hudTimer')),
    info: ro ? !!ro.querySelector('.pkinfo') : false,
    pwin: ro ? ro.querySelectorAll('.pwin').length : 0,
    me: ro ? ro.querySelectorAll('.pcard.me').length : 0,
    more: ro && ro.querySelector('.pmore') ? ro.querySelector('.pmore').textContent : '',
    mm: mm, cv: { left: Math.round(cw.left), top: Math.round(cw.top) }
  };
})()`;

(async () => {
  const b = await launch({ w: 900, h: 500, port: 9450 });
  const p = await b.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  const SIZES = [
    { w: 430, h: 932, tag: 'port' },
    { w: 844, h: 390, tag: 'land' },
    { w: 360, h: 780, tag: 'narrow' }
  ];
  for (const s of SIZES) {
    await p.resize(s.w, s.h, true);
    await p.goto('https://bomb-hero-game.onrender.com/?unlock=all', 2500);
    for (var w = 0; w < 30; w++) { if (await p.eval('!!window.__BH')) break; await wait(700); }
    await p.eval("try{localStorage.setItem('bombhero-rotskip','1');localStorage.setItem('bombhero-zoomtip','1');}catch(e){}");
    await p.eval(`(function(){
      var P = window.__BH; document.body.classList.add('touch','in-game');
      try { P.Cloud && (P.Cloud.online = function(){ return false; }); } catch(e){}
      P.settings.count = 8; P.Game.mode = 'battle'; P.startBattle();
      P.Game.state = 'play'; try { P.ovHide(); } catch(e){}
      var bk = document.querySelector('.ovback'); if (bk) bk.style.display = 'none';
      var rh = document.getElementById('rotHint'); if (rh) rh.remove();
      P.Game.players.forEach(function(q, i){ q.wins = i % 3; });
      P.Game.players[7].alive = false;
    })()`);
    await wait(900);
    const m = await p.eval(MEASURE);
    console.log('\n--- 對戰 ' + s.tag + ' ' + s.w + 'x' + s.h + ' ---');
    console.log('  ' + JSON.stringify({ cls: m.cls, n: m.n, card0: m.card0, roster: m.roster, timer: m.timer, more: m.more }));
    ok(m.ver === '5.70', '線上版本 5.70', m.ver);
    ok(m.cls === 'pkrow mini vs', '清單是 mini＋vs', m.cls);
    ok(!m.info, '沒有暱稱／星星那兩行');
    ok(m.pwin === m.n, '每張卡都有勝場角標（' + m.pwin + '/' + m.n + '）');
    ok(m.me === 1, '只有一張標成「自己」', m.me);
    ok(m.card0 && m.card0.w === 28 && m.card0.h === 28, '頭像 28×28', m.card0);
    ok(m.roster && m.timer && m.roster.r < m.timer.x, '清單右緣在計時器左邊（' + (m.roster && m.roster.r) + ' < ' + (m.timer && m.timer.x) + '）');
    ok(m.roster && m.roster.h <= 40, '整排高度 ≤ 40px（' + (m.roster && m.roster.h) + '）');
    ok(m.roster && m.roster.y >= 0 && m.roster.y <= 8, '貼在畫面最上緣', m.roster && m.roster.y);
    await p.shot(path.join(OUT, 'p50-vs-' + s.tag + '.png'));
  }

  /* 大逃殺：小地圖右邊 */
  await p.resize(844, 390, true);
  await p.goto('https://bomb-hero-game.onrender.com/?unlock=all', 2500);
    for (var w = 0; w < 30; w++) { if (await p.eval('!!window.__BH')) break; await wait(700); }
  await p.eval("try{localStorage.setItem('bombhero-rotskip','1');}catch(e){}");
  await p.eval(`(function(){
    var P = window.__BH; document.body.classList.add('touch','in-game');
    try { P.Cloud && (P.Cloud.online = function(){ return false; }); } catch(e){}
    P.startBR(); P.Game.state='play'; try{ P.ovHide(); }catch(e){}
    var bk=document.querySelector('.ovback'); if(bk) bk.style.display='none';
    var rh=document.getElementById('rotHint'); if(rh) rh.remove();
  })()`);
  await wait(1100);
  const mb = await p.eval(MEASURE);
  console.log('\n--- 大逃殺 land ---');
  console.log('  ' + JSON.stringify({ cls: mb.cls, n: mb.n, roster: mb.roster, mm: mb.mm, cv: mb.cv }));
  ok(mb.cls === 'pkrow mini', '大逃殺仍是 pkrow mini', mb.cls);
  ok(!mb.pwin, '大逃殺沒有勝場角標');
  const mmRight = mb.cv.left + mb.mm.x + mb.mm.w;
  ok(mb.roster.x >= mmRight - 2, '頭像列接在小地圖右邊（' + mb.roster.x + ' ≥ ' + mmRight + '）');
  await p.shot(path.join(OUT, 'p50-br-land.png'));

  console.log('\n' + (fail ? '✗ ' + fail + ' 項失敗（通過 ' + pass + '）' : '✓ 全部通過（' + pass + ' 項）'));
  b.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('PROBE FAIL', e && e.stack || e); process.exit(1); });
