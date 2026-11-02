// v4.21 線上活體驗證：首頁每顆按鈕都能真的點進去（PC 滑鼠 + 手機觸控）
// 用法：node test/live-buttons-check.js [url]
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const URL = process.argv[2] || 'https://bomb-hero-game.onrender.com/';

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name + (extra != null && extra !== '' ? '（' + extra + '）' : '')); }
  else { fail++; console.log('  ✗ ' + name + (extra != null && extra !== '' ? '（' + extra + '）' : '')); }
}

// 點某個 id：先用 elementFromPoint 判斷有沒有被浮層蓋住，再真的點
const HIT = id => `(function(){
  var el = document.getElementById(${JSON.stringify(id)});
  if (!el) return JSON.stringify({err:'no-el'});
  el.scrollIntoView({block:'center'});
  var r = el.getBoundingClientRect();
  var cx = Math.round(r.left + r.width/2), cy = Math.round(r.top + r.height/2);
  var top = document.elementFromPoint(cx, cy);
  var isSelf = !!(top && (top === el || el.contains(top)));
  var nm = top ? (top.id || (typeof top.className === 'string' ? top.className : '') || top.tagName) : 'null';
  return JSON.stringify({cx:cx, cy:cy, isSelf:isSelf, hit:nm,
    w: Math.round(r.width), h: Math.round(r.height)});
})()`;

(async () => {
  const br = await launch({ w: 1280, h: 900, port: 9481 });

  // ================= PC 滑鼠 =================
  console.log('=== 1. PC 1280x900（真實滑鼠點擊）===');
  let p = await br.newPage();
  await p.resize(1280, 900, false);
  await p.goto(URL + '?t=' + Date.now(), 4200);
  await sleep(1600);

  const ver = await p.eval("window.__BH ? window.__BH.VERSION : 'none'");
  // 跟本機版號比對（升版後不用再改這支腳本）
  const localVer = (fs.readFileSync(__dirname + '/../index.html', 'utf8').match(/const VERSION = '([^']+)'/) || [])[1];
  ok('線上版本 = 本機版本 ' + localVer, ver === localVer, '線上 ' + ver);

  // 首頁九顆主選單按鈕
  const ids = ['btnSolo', 'btnRpg', 'btnBoss', 'btnBattle', 'btnOnline', 'btnStore', 'btnSettings', 'btnQuit'];
  const geo = {};
  for (const id of ids) {
    geo[id] = JSON.parse(await p.eval(HIT(id)) || '{}');
  }
  ids.forEach(id => {
    const g = geo[id] || {};
    ok('#' + id + ' 沒被浮層蓋住', g.isSelf === true, g.isSelf === true ? '' : (g.err || ('蓋住的是 ' + g.hit)));
  });

  // 真的用滑鼠點進去，看畫面有沒有切換
  async function clickGo(id, wantScreens, label) {
    await p.eval(`(function(){ try{ window.__BH.Screen.show('title'); }catch(e){} })()`);
    await sleep(200);
    const g = JSON.parse(await p.eval(HIT(id)) || '{}');
    if (!g.cx) { ok(label, false, g.err || '找不到元素'); return null; }
    await p.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: g.cx, y: g.cy, button: 'none', clickCount: 0 });
    await sleep(40);
    await p.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: g.cx, y: g.cy, button: 'left', clickCount: 1 });
    await sleep(60);
    await p.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: g.cx, y: g.cy, button: 'left', clickCount: 1 });
    await sleep(800);
    const st = await p.eval(`(function(){
      var P = window.__BH;
      var open = [];
      [['shop','scr-shop'],['rpg','scr-rpg'],['set','scr-settings'],['acct','acctModal'],['quit','quitModal']].forEach(function(pair){
        var e = document.getElementById(pair[1]);
        if (!e) return;
        var cs = getComputedStyle(e);
        if (cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0' && e.getBoundingClientRect().height > 0) open.push(pair[0]);
      });
      return JSON.stringify({screen: P.Screen.current, state: P.Game.state, open: open});
    })()`);
    const s = JSON.parse(st);
    const inGame = (s.state !== 'idle' && s.state !== 'menu' && s.state !== 'over');
    const hitOk = wantScreens.indexOf(s.screen) >= 0 || s.open.length > 0 || inGame;
    ok(label, hitOk, s.screen + ' / ' + s.state + (s.open.length ? ' / open=' + s.open.join(',') : ''));
    return s;
  }

  await clickGo('btnSolo', ['solo', 'game'], '點「單人闖關」進得去');
  await clickGo('btnRpg', ['rpg'], '點「RPG 模式」進得去');
  await clickGo('btnBoss', ['game'], '點「挑戰 BOSS」進得去');
  await clickGo('btnBattle', ['battle'], '點「對戰」進得去');
  await clickGo('btnStore', ['shop'], '點「商店」進得去');
  await clickGo('btnOnline', ['net', 'online'], '點「帳號」進得去');
  await clickGo('btnSettings', ['settings', 'set'], '點「設定」進得去');
  await clickGo('btnQuit', ['quit'], '點「離開遊戲」開得起來');

  // 商店裡的分享平台（動態生成在 #shareGrid）
  const share = await p.eval(`(function(){
    var P = window.__BH;
    // 先把上一段測試留下的離場卡關掉，否則它會蓋在商店上
    try { var q = document.getElementById('quitModal'); if (q) q.classList.remove('on'); } catch(e) {}
    try { P.Screen.show('shop'); P.Shop.open(); } catch(e) { return JSON.stringify({err:'open:'+e}); }
    var btns = document.querySelectorAll('#shareGrid button, #shareGrid a');
    if (!btns.length) return JSON.stringify({err:'no-share-btn'});
    var b = btns[0], r = b.getBoundingClientRect();
    var top = document.elementFromPoint(Math.round(r.left+r.width/2), Math.round(r.top+r.height/2));
    return JSON.stringify({n: btns.length, labels: Array.prototype.map.call(btns,function(x){return x.textContent.trim().slice(0,6);}),
      isSelf: !!(top && (top===b || b.contains(top))),
      hit: top ? (top.id || (typeof top.className==='string'?top.className:'') || top.tagName) : 'null'});
  })()`);
  const sh = JSON.parse(share);
  ok('商店分享平台按鈕存在', sh.n > 0 && !sh.err, sh.err || (sh.n + ' 顆：' + (sh.labels || []).join('|')));
  ok('商店分享平台按鈕點得到', sh.isSelf === true, sh.hit);

  // 商店錢包看得到（金幣用途）
  const wal = await p.eval(`(function(){
    var e = document.getElementById('shopWallet');
    if (!e) return JSON.stringify({err:'no-wallet'});
    var r = e.getBoundingClientRect();
    return JSON.stringify({txt: e.textContent.trim(), top: Math.round(r.top),
      vis: r.top >= 0 && r.top < innerHeight && r.height > 0});
  })()`);
  const w1 = JSON.parse(wal);
  ok('商店錢包在畫面內', w1.vis === true, w1.err || ('💰' + w1.txt + ' top=' + w1.top));

  // 帳號彈窗離線也要有登入表單
  const acct = await p.eval(`(function(){
    var P = window.__BH;
    try { P.Cloud.open(); } catch(e) { return JSON.stringify({err:'open:'+e}); }
    var m = document.getElementById('acctModal');
    var h = m ? m.innerHTML : '';
    return JSON.stringify({len: h.length, hasForm: /<input/i.test(h), txt: (m?m.textContent:'').slice(0,60)});
  })()`);
  const ac = JSON.parse(acct);
  ok('帳號彈窗有內容', ac.len > 400, ac.err || ('len=' + ac.len));
  ok('帳號彈窗有輸入框（離線也給表單）', ac.hasForm === true);

  // 找門提示卡（要先進遊戲畫面才會顯示）
  const dh = await p.eval(`(function(){
    var P = window.__BH;
    if (typeof P.doorHintCard !== 'function') return JSON.stringify({err:'no-fn'});
    P.startSolo(3, false);
    P.Game.state = 'play';
    P.render();
    P.doorHintCard('🚪', '敵人清光了！', '炸開剩下的軟磚，找出藏起來的傳送門', 2.6);
    var b = document.getElementById('doorHint');
    var r = b.getBoundingClientRect();
    return JSON.stringify({on: !b.classList.contains('hide'), w: Math.round(r.width), h: Math.round(r.height),
      title: (b.querySelector('.dh-t')||{}).textContent, sub: (b.querySelector('.dh-s')||{}).textContent});
  })()`);
  const d = JSON.parse(dh);
  ok('找門提示卡在線上能用', d.on === true && d.w > 200, d.err || (d.w + 'x' + d.h));
  ok('提示卡標題正確', d.title === '敵人清光了！', d.title);
  ok('提示卡副標沒有殘留 emoji', d.sub === '炸開剩下的軟磚，找出藏起來的傳送門', d.sub);

  // 提示卡會停留 2 秒以上才淡出（不是一閃而過）
  await sleep(1500);
  const still = await p.eval(`(function(){ var b=document.getElementById('doorHint');
    return JSON.stringify({hide:b.classList.contains('hide'), out:b.classList.contains('out')}); })()`);
  const st2 = JSON.parse(still);
  ok('1.5 秒後提示卡還在（不是一閃而過）', st2.hide === false, JSON.stringify(st2));
  await sleep(2000);
  const gone = await p.eval(`JSON.stringify({hide:document.getElementById('doorHint').classList.contains('hide')})`);
  ok('約 3.5 秒後提示卡已淡出', JSON.parse(gone).hide === true);

  // ================= 手機觸控 =================
  console.log('=== 2. 手機 390x844（真實觸控）===');
  let m = await br.newPage();
  await m.resize(390, 844, true);
  await m.goto(URL + '?t=' + Date.now(), 4200);
  await sleep(1600);
  await m.eval("(function(){ var P=window.__BH; try{ P.settings.ctrl='touch'; P.applyCtrl(); }catch(e){} })()");
  await sleep(400);
  const isTouch = await m.eval("document.body.classList.contains('touch')");
  ok('手機模式顯示觸控按鈕', isTouch === true);

  const mids = ['btnSolo', 'btnRpg', 'btnBoss', 'btnBattle'];
  for (const id of mids) {
    const g = JSON.parse(await m.eval(HIT(id)) || '{}');
    ok('手機 #' + id + ' 沒被蓋住', g.isSelf === true, g.isSelf === true ? '' : (g.err || ('蓋住的是 ' + g.hit)));
    if (g.cx) {
      const before = await m.eval("JSON.stringify({s:window.__BH.Screen.current, st:window.__BH.Game.state})");
      await m.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: g.cx, y: g.cy }] });
      await sleep(70);
      await m.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await sleep(750);
      const s = await m.eval("JSON.stringify({s:window.__BH.Screen.current, st:window.__BH.Game.state})");
      ok('手機點 #' + id + ' 有反應', s !== before, before + ' → ' + s);
      await m.eval("(function(){ try{ window.__BH.Screen.show('title'); window.__BH.Game.state='idle'; }catch(e){} })()");
      await sleep(250);
    }
  }

  // 手機商店錢包
  const wal2 = await m.eval(`(function(){
    try { var q=document.getElementById('quitModal'); if(q) q.classList.remove('on'); } catch(e) {}
    try { var P=window.__BH; P.Screen.show('shop'); P.Shop.open(); } catch(e) { return JSON.stringify({err:'open:'+e}); }
    var e = document.getElementById('shopWallet');
    if (!e) return JSON.stringify({err:'no-wallet'});
    var r = e.getBoundingClientRect();
    return JSON.stringify({top: Math.round(r.top), vis: r.top >= 0 && r.top < innerHeight && r.height > 0});
  })()`);
  const w2 = JSON.parse(wal2);
  ok('商店錢包在手機可視範圍內', w2.vis === true, w2.err || ('top=' + w2.top));

  console.log('\n----------------------------------------');
  console.log((fail === 0 ? '全部通過' : '有失敗') + '：' + pass + ' 項通過、' + fail + ' 項失敗');
  await br.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
