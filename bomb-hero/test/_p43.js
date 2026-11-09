// v5.66 線上探針：單人闖關畫面的「跳過關卡」入口真的不見了，而且正常出發還在
const path = require('path');
const CDP = require('./cdp');
(async function () {
  const br = await CDP.launch({ port: 9443, w: 980, h: 900 });
  const p = await br.newPage();
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  let pass = 0, fail = 0;
  const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };
  try {
    await p.goto('https://bomb-hero-game.onrender.com/?go=solo', 12000);
    await wait(3500);
    const st = JSON.parse(await p.eval(`(function(){
      var g = document.querySelector('.gowrap');
      var kids = g ? [].slice.call(g.children).map(function(e){ return e.id || e.className; }) : [];
      return JSON.stringify({
        ver: __BH.VERSION,
        hasBtn: !!document.getElementById('btnSoloBoss'),
        types: typeof __BH.goBoss + '/' + typeof __BH.startBossRush,
        kids: kids,
        goBtn: !!document.getElementById('btnSoloGo'),
        screen: (document.querySelector('.screen.on')||{}).id,
        txt: (g ? g.textContent : '').indexOf('跳過關卡') >= 0
      });
    })()`) || '{}');
    console.log('  state:', JSON.stringify(st));
    ok(st.ver === '5.66', '線上 VERSION = ' + st.ver);
    ok(st.screen === 'scr-solo', '停在單人闖關畫面（' + st.screen + '）');
    ok(st.hasBtn === false, '★ 沒有 #btnSoloBoss');
    ok(st.txt === false, '★ 畫面文字裡沒有「跳過關卡」');
    ok(st.types === 'undefined/undefined', '★ goBoss／startBossRush 都沒匯出');
    ok(st.goBtn === true, '「開始遊戲」大按鈕還在');
    ok(st.kids.length === 2, '出發區只剩 2 個元素（大按鈕＋提示）：' + st.kids.join(' / '));
    await p.shot(path.join(__dirname, '_v564', 'p43-solo.png'));
    // 真的按得下去
    await p.eval(`(function(){ __BH.settings.playerName = __BH.settings.playerName || '探針'; document.getElementById('btnSoloGo').click(); return 1; })()`);
    await wait(1200);
    const after = JSON.parse(await p.eval(`JSON.stringify({ state: __BH.Game.state, stage: __BH.Game.stage })`) || '{}');
    ok(after.stage === 1 && after.state !== 'over', '按下去真的進第 1 關（state=' + after.state + '，stage=' + after.stage + '）');
  } catch (e) { console.log('EX', e && e.message); fail++; }
  console.log('\n' + (fail === 0 ? '通過 ' + pass + ' / ' + (pass + fail) : '✗ ' + fail + ' 項失敗（通過 ' + pass + '）'));
  try { await br.close(); } catch (e) {}
  process.exit(fail ? 1 : 0);
})();
