// v4.22 驗證：① 第一次觸控不再吞掉 click ② 手機工具列每顆 ≥44px ③ 四個入口都進得去
// node test/repro-v422.js [url]
const path = require('path'), fs = require('fs');
const { launch, sleep } = require('./cdp');
const URL = process.argv[2] || ('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
const OUT = path.join(__dirname, '_repro');
fs.mkdirSync(OUT, { recursive: true });

const LINE_UA = 'Mozilla/5.0 (Linux; Android 13; SM-G991B Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/119.0.6045.163 Mobile Safari/537.36 Line/13.6.0/IAB';

let pass = 0, fail = 0;
function ok(c, m, ex) {
  if (c) { pass++; console.log('  ✓ ' + m + (ex ? '（' + ex + '）' : '')); }
  else { fail++; console.log('  ✗ FAIL: ' + m + (ex ? '（' + ex + '）' : '')); }
}

const RECT = id => `(function(){
  var e=document.getElementById(${JSON.stringify(id)});
  if(!e) return JSON.stringify({err:'NO_EL'});
  var r=e.getBoundingClientRect();
  return JSON.stringify({w:Math.round(r.width),h:Math.round(r.height),
    l:Math.round(r.left),t:Math.round(r.top),b:Math.round(r.bottom)});
})()`;

const STATE = `(function(){
  var P=window.__BH||{};
  function h(id){var e=document.getElementById(id);if(!e)return -1;
    var cs=getComputedStyle(e),r=e.getBoundingClientRect();
    return (cs.display==='none'||cs.visibility==='hidden')?0:Math.round(r.height);}
  return JSON.stringify({screen:P.Screen?P.Screen.current:'?',state:P.Game?P.Game.state:'?',
    shop:h('scr-shop'),rpg:h('scr-rpg'),acct:h('acctModal'),set:h('scr-settings'),
    rot:document.getElementById('rotHint')?1:0, title:h('scr-title')});
})()`;

async function tap(p, x, y) {
  await p.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, radiusX: 12, radiusY: 12, force: 1 }] });
  await sleep(80);
  await p.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(850);
}

(async () => {
  const br = await launch({ w: 390, h: 844, port: 9511 });

  // ---------- A. 最惡劣情況：瀏覽器「不承認」自己有觸控，第一次碰螢幕才切換模式 ----------
  console.log('\n=== A. 第一次觸控才切成手機模式（v4.21 會在這裡吞掉商店那一下）===');
  {
    const p = await br.newPage();
    await p.resize(390, 844, true);
    await p.goto(URL + '?t=' + Date.now(), 3200);
    await sleep(900);
    const before = JSON.parse(await p.eval(`JSON.stringify({
      touchCls: document.body.classList.contains('touch'),
      pad: getComputedStyle(document.body).padding,
      wrapTop: Math.round(document.querySelector('.wrap').getBoundingClientRect().top)})`));
    await p.eval("(function(){var e=document.getElementById('btnStore');e.scrollIntoView({block:'center'});})()");
    await sleep(350);
    const g = JSON.parse(await p.eval(RECT('btnStore')));
    await tap(p, g.l + Math.round(g.w / 2), g.t + Math.round(g.h / 2));
    const after = JSON.parse(await p.eval(`JSON.stringify({
      touchCls: document.body.classList.contains('touch'),
      pad: getComputedStyle(document.body).padding,
      wrapTop: Math.round(document.querySelector('.wrap').getBoundingClientRect().top)})`));
    const st = JSON.parse(await p.eval(STATE));
    ok(before.wrapTop === after.wrapTop, '第一次觸控後 .wrap 沒有位移',
      before.wrapTop + ' → ' + after.wrapTop);
    ok(before.pad === after.pad, 'body padding 沒變', before.pad + ' → ' + after.pad);
    ok(st.screen === 'shop', '第一次觸控點「商店」就進得去', 'screen=' + st.screen + ' shop=' + st.shop);
    await p.shot(path.join(OUT, 'v422-a-first-touch-shop.png'));
  }

  // ---------- B. LINE / 真觸控手機：工具列尺寸 + 四個入口 ----------
  console.log('\n=== B. LINE 真觸控 390x844：工具列尺寸與四個入口 ===');
  {
    const p = await br.newPage();
    try { await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }); } catch (e) {}
    try { await p.send('Emulation.setUserAgentOverride', { userAgent: LINE_UA }); } catch (e) {}
    await p.resize(390, 844, true);
    await p.goto(URL + '?t=' + Date.now(), 3200);
    await sleep(1100);

    await p.shot(path.join(OUT, 'v422-b-home.png'));
    // 工具列：手機只看得到「帳號 + ⋮」
    for (const [id, name] of [['acctChip', '帳號'], ['btnMore', '更多'], ['btnBack', '上一頁']]) {
      const r = JSON.parse(await p.eval(RECT(id)));
      if (r.err) { ok(false, name + ' 存在'); continue; }
      const vis = await p.eval(`(function(){var e=document.getElementById(${JSON.stringify(id)});
        var cs=getComputedStyle(e);return cs.display!=='none'&&cs.visibility!=='hidden';})()`);
      if (id === 'btnBack') ok(vis === false, '首頁不顯示「上一頁」（進到別的畫面才出現）');
      else ok(vis === true, name + ' 在手機看得到');
      ok(r.w >= 44 && r.h >= 44, name + ' 觸控目標 ≥44px', r.w + 'x' + r.h);
    }
    // 收起來的那幾顆不該顯示
    for (const id of ['btnMusic', 'btnSfx', 'btnFull', 'btnMail']) {
      const vis = await p.eval(`(function(){var e=document.getElementById(${JSON.stringify(id)});
        if(!e) return 'no';
        var r=e.getBoundingClientRect();
        return (r.width>0&&r.height>0)?'yes':'no';})()`);
      ok(vis === 'no', '#' + id + ' 已收進 ⋮ 選單（手機不佔位）');
    }
    // 打開 ⋮
    const m = JSON.parse(await p.eval(RECT('btnMore')));
    await tap(p, m.l + Math.round(m.w / 2), m.t + Math.round(m.h / 2));
    const menuOn = await p.eval(`document.getElementById('navMore').classList.contains('on')`);
    ok(menuOn === true, '點 ⋮ 選單會展開');
    for (const id of ['btnMusic', 'btnSfx', 'btnFull']) {
      const r = JSON.parse(await p.eval(RECT(id)));
      ok(!r.err && r.h >= 44, '選單裡的 #' + id + ' 也是 44px', r.h + 'px');
    }
    await p.shot(path.join(OUT, 'v422-b-moremenu.png'));
    await tap(p, m.l + Math.round(m.w / 2), m.t + Math.round(m.h / 2));   // 收回

    // 四個入口
    const cases = [['btnStore', 'shop', 'scr-shop', '商店'],
                   ['btnRpg', 'rpg', 'scr-rpg', 'RPG 模式'],
                   ['btnBoss', 'game', null, 'BOSS 挑戰'],
                   ['btnAcctBig', 'acct', 'acctModal', '帳號登入（首頁大按鈕）']];
    for (const [id, want, checkId, name] of cases) {
      await p.eval("(function(){try{window.__BH.Screen.show('title');}catch(e){}})()");
      await sleep(320);
      const g = JSON.parse(await p.eval(RECT(id)));
      if (g.err) { ok(false, name + ' 找得到'); continue; }
      await tap(p, g.l + Math.round(g.w / 2), g.t + Math.round(g.h / 2));
      const st = JSON.parse(await p.eval(STATE));
      const hit = st.screen === want || (checkId && st[checkId.replace('scr-', '').replace('acctModal', 'acct')] > 0);
      ok(hit, '點「' + name + '」進得去', 'screen=' + st.screen + ' state=' + st.state);
      if (id === 'btnBoss') {
        ok(st.rot === 0 || st.rot === 1, 'BOSS：橫向提示狀態 = ' + st.rot);
      }
      await p.shot(path.join(OUT, 'v422-b-' + id + '.png'));
    }

    // 帳號小圖示（右上角）也要能用
    await p.eval("(function(){try{var m=document.getElementById('acctModal');m.classList.remove('on');window.__BH.Screen.show('title');}catch(e){}})()");
    await sleep(350);
    const c = JSON.parse(await p.eval(RECT('acctChip')));
    await tap(p, c.l + Math.round(c.w / 2), c.t + Math.round(c.h / 2));
    const acctOpen = await p.eval(`document.getElementById('acctModal').classList.contains('on')`);
    ok(acctOpen === true, '右上角帳號小圖示也開得了');
    await p.shot(path.join(OUT, 'v422-b-acctchip.png'));
  }

  // ---------- C. 橫向提示：點過一次就不再擋 ----------
  console.log('\n=== C. 「橫著玩」提示記住選擇 ===');
  {
    const p = await br.newPage();
    try { await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }); } catch (e) {}
    await p.resize(390, 844, true);
    await p.goto(URL + '?t=' + Date.now(), 3200);
    await sleep(900);
    await p.eval("(function(){try{localStorage.removeItem('bombhero-rotskip');}catch(e){}})()");
    // 第一次進 BOSS：應該出現提示
    await p.eval("(function(){try{window.__BH.startBossRush();}catch(e){}})()");
    await sleep(700);
    const first = await p.eval("document.getElementById('rotHint') ? 'yes' : 'no'");
    ok(first === 'yes', '第一次進 BOSS 會出現「橫著玩」提示（第一次提醒是好的）');
    if (first === 'yes') {
      await p.eval("(function(){try{document.getElementById('rhOk').click();}catch(e){}})()");
      await sleep(400);
      const saved = await p.eval("localStorage.getItem('bombhero-rotskip')");
      ok(saved === '1', '按「直式繼續玩」後記住了');
    }
    // 第二次進 BOSS：不該再擋
    await p.eval("(function(){try{window.__BH.Screen.show('title');window.__BH.Game.state='idle';}catch(e){}})()");
    await sleep(400);
    await p.eval("(function(){try{window.__BH.startBossRush();}catch(e){}})()");
    await sleep(800);
    const second = await p.eval("document.getElementById('rotHint') ? 'yes' : 'no'");
    ok(second === 'no', '第二次進 BOSS 直接開始（不再被擋）');
    await p.shot(path.join(OUT, 'v422-c-boss-2nd.png'));
  }

  console.log('\n----------------------------------------');
  console.log((fail === 0 ? '全部通過' : '有失敗') + '：' + pass + ' 項通過、' + fail + ' 項失敗');
  await br.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
