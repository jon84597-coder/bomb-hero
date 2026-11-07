// test/_probe-v550.js — v5.50 真瀏覽器驗證：護盾三難度／RPG 王血量／私訊輸入框不被打斷
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, '_v550');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}

const SHIELD = `(function(){
  var out = {};
  ['easy','normal','hard'].forEach(function(k){
    __BH.settings.soloDiff = k;
    __BH.clearMapTest(); __BH.startSolo(5, false);
    var A = __BH.Game.bossArena;
    out[k] = { shieldMax: A.shieldMax, shield: A.shield, hp: A.boss.hp };
  });
  __BH.settings.soloDiff = 'normal';
  return out;
})()`;

const RPG = `(function(){
  try { __BH.RPG.unlocked = 40; } catch(e) {}
  var out = [];
  [1,2,3,5,8].forEach(function(ch){
    __BH.startRpg(ch * 5, {});
    out.push({ ch: ch, hp: __BH.Game.bossArena.boss.hp, want: __BH.bossHpOf(ch) + 5 });
  });
  return out;
})()`;

const CHAT = `(function(){
  try { Social.open(); } catch(e) {}
  var S = Social._s;
  S.chatWith = 'p_probe'; S.view = 'chat'; S.msgs = [{ from: 'p_probe', m: '第一則' }];
  Social.render();
  var inp = document.getElementById('onChatIn');
  inp.value = '打到一半的訊息';
  inp.focus();
  var box = document.getElementById('onBody');
  var html0 = box.innerHTML;
  // 模擬 12 秒輪詢：有新訊息 → render()
  S.msgs = [{ from: 'p_probe', m: '第一則' }, { from: 'p_probe', m: '第二則' }];
  Social.render();
  var same = document.getElementById('onChatIn') === inp;
  return {
    value: inp.value, sameNode: same, focused: document.activeElement === inp,
    boxUnchanged: box.innerHTML === html0,
    html: box.innerHTML.length,
    log: (document.getElementById('onChatLog') || {}).textContent,
    fs: getComputedStyle(inp).fontSize,
    auto: inp.getAttribute('autocomplete'), spell: inp.getAttribute('spellcheck'),
    dataChat: box.getAttribute('data-chat')
  };
})()`;

const LEAVE = `(function(){
  var S = Social._s;
  S.view = 'detail'; S.sel = null; Social.render();
  var box = document.getElementById('onBody');
  var back = { dataChat: box.getAttribute('data-chat'), hasInput: !!document.getElementById('onChatIn') };
  // 再進來一次（同一個人）→ 應該是全新的空輸入框
  S.chatWith = 'p_probe'; S.view = 'chat'; S.msgs = []; Social.render();
  var inp = document.getElementById('onChatIn');
  return { back: back, freshValue: inp ? inp.value : 'NO-INPUT', again: box.getAttribute('data-chat') };
})()`;

(async () => {
  const b = await launch({ w: 430, h: 932, port: 9391 });
  const p = await b.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.goto('http://127.0.0.1:3111/', 1600);
  await sleep(500);

  // 把轉屏提示與遮罩收掉（不然截圖只有提示卡）
  await p.eval(`(function(){
    try { localStorage.setItem('bombhero-rotskip','1'); } catch(e){}
    var r = document.getElementById('rotHint'); if (r && r.parentNode) r.parentNode.removeChild(r);
    try { __BH.ovHide(); } catch(e){}
    return 1;
  })()`);
  console.log('護盾   ', JSON.stringify(await p.eval(SHIELD)));
  console.log('RPG 王血', JSON.stringify(await p.eval(RPG)));
  const c = await p.eval(CHAT);
  console.log('私訊   ', JSON.stringify(c, null, 1));
  console.log('離開再進', JSON.stringify(await p.eval(LEAVE)));

  await p.shot(path.join(OUT, 'chat.png'));
  await p.eval(`(function(){ try{ Social.close(); }catch(e){} __BH.settings.soloDiff='normal'; __BH.startSolo(5,false); __BH.Game.state='play'; try{ __BH.ovHide(); }catch(e){} return 1; })()`);
  await sleep(600);
  await p.shot(path.join(OUT, 'boss-normal.png'));
  await p.eval(`(function(){ __BH.settings.soloDiff='easy'; __BH.startSolo(5,false); __BH.Game.state='play'; try{ __BH.ovHide(); }catch(e){} return 1; })()`);
  await sleep(600);
  await p.shot(path.join(OUT, 'boss-easy.png'));
  console.log('shots →', OUT);
  await b.close();
  process.exit(0);
})().catch(function (e) { console.error('ERR', e); process.exit(1); });
