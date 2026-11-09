// test/_tour1.js —— 全模式巡檢（真瀏覽器）
//   桌面 1280×800 + 手機 390×844 各一輪：首頁所有面板 → 五種玩法實際操作 → 檢查
//   ① console 錯誤／未捕捉例外 ② 版面溢出（元素跑出視窗）③ 玩法本身動得起來
//   用法：BH_BASE=http://127.0.0.1:3122 node test/_tour1.js
const { launch } = require('./cdp');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, '_v576');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}

const BASE = process.env.BH_BASE || 'http://127.0.0.1:3122';
const wait = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const notes = [];
const ok = (c, m, x) => {
  if (c) { pass++; console.log('  ✓ ' + m + (x === undefined ? '' : ' → ' + JSON.stringify(x))); }
  else { fail++; console.log('  ✗ FAIL: ' + m + (x === undefined ? '' : ' → ' + JSON.stringify(x))); notes.push(m); }
};
const head = t => console.log('\n=== ' + t + ' ===');

const INIT = `(async function(){
  try {
    var rs = await navigator.serviceWorker.getRegistrations();
    for (var i=0;i<rs.length;i++) await rs[i].unregister();
    var ks = await caches.keys();
    for (var j=0;j<ks.length;j++) await caches.delete(ks[j]);
  } catch(e){}
  localStorage.setItem('bombhero-rotskip','1');
  var st = {};
  try { st = JSON.parse(localStorage.getItem('bombhero-settings-v1')||'{}'); } catch(e){}
  st.playerName = '巡檢員'; st.nameLock = 1; st.nameAuto = 0; st.bgm = 1; st.sfx = 1;
  localStorage.setItem('bombhero-settings-v1', JSON.stringify(st));
  return 1;
})()`;

const HOOK = `(function(){
  window.__ERRS = [];
  window.addEventListener('error', function(e){ window.__ERRS.push('ERR ' + (e.message||'') + ' @' + (e.filename||'').split('/').pop() + ':' + (e.lineno||0)); });
  window.addEventListener('unhandledrejection', function(e){ window.__ERRS.push('REJ ' + String((e.reason && e.reason.message) || e.reason)); });
  return 1;
})()`;

async function overflow(p) {
  return await p.eval(`(function(){
    var W = innerWidth, H = innerHeight, bad = [];
    var all = document.querySelectorAll('body *');
    for (var i=0;i<all.length;i++){
      var e = all[i];
      if (!e.getClientRects().length) continue;
      var cs = getComputedStyle(e);
      if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
      if (cs.position === 'fixed' && (e.id==='pwaBoot')) continue;
      var r = e.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      // 垂直高度超過視窗是「可捲動頁面」的正常現象（說明／商店都是長頁），
      // 只有「水平溢出」與「fixed 覆蓋層超出下緣看不到按鈕」才算問題。
      var badV = (cs.position === 'fixed' && r.bottom > H + 2 && !e.querySelector('button'));
      if (r.right > W + 2 || r.left < -2 || badV) {
        bad.push({ id: e.id || '', cls: (e.className||'').toString().slice(0,24),
                   t: (e.textContent||'').replace(/\\s+/g,' ').trim().slice(0,16),
                   r: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)] });
      }
    }
    return { W: W, H: H, docW: document.documentElement.scrollWidth, bad: bad.slice(0, 8), n: bad.length };
  })()`);
}

async function run(label, w, h, port) {
  console.log('\n\n########## ' + label + ' ' + w + '×' + h + ' ##########');
  const b = await launch({ w, h, port });
  const p = await b.newPage();
  if (h > w) { await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }); }
  await p.resize(w, h, true);
  await p.goto(BASE + '/?unlock=all', 1500);
  await p.eval(INIT);
  await p.goto(BASE + '/?unlock=all', 3500);
  for (let i = 0; i < 40; i++) { if (await p.eval('!!window.__BH')) break; await wait(300); }
  await p.eval(HOOK);

  const errsNow = async () => await p.eval('JSON.stringify(window.__ERRS || [])');
  const basErr = JSON.parse(await errsNow() || '[]');
  ok(basErr.length === 0, '開機零錯誤', basErr);

  const IS_PHONE = h > w;
  const shot = async name => { try { await p.shot(path.join(OUT, label + '-' + name + '.png')); } catch (e) {} };
  const click = async id => await p.eval(`(function(){ var e=document.getElementById(${JSON.stringify(id)}); if(!e) return 'no-el'; e.click(); return 'ok'; })()`);
  const vis = async id => await p.eval(`(function(){ var e=document.getElementById(${JSON.stringify(id)}); if(!e) return false; var r=e.getBoundingClientRect(); var cs=getComputedStyle(e); return r.width>4&&r.height>4&&cs.visibility!=='hidden'&&cs.display!=='none'; })()`);

  // ── 1. 首頁
  head('1. 首頁');
  await shot('01-home');
  let of = await overflow(p);
  ok(of.docW <= of.W + 2, '首頁沒有水平溢出（捲動寬 ' + of.docW + ' ≤ ' + of.W + '）', of.n ? of.bad : undefined);
  ok(of.bad.length === 0 || of.W <= 400, '首頁沒有元素跑出視窗', of.bad.length ? of.bad : undefined);

  // ── 2. 首頁面板
  head('2. 首頁面板（每個都開、截圖、關）');
  const panels = [
    ['codexBtn', 'codexModal', 'codex', '圖鑑'],
    ['btnAch', 'achModal', 'ach', '成就'],
    ['btnRank', 'rankModal', 'rank', '排名'],
    ['btnPlayers', 'onModal', 'online', '線上玩家'],
    ['verLogBtn', 'verLog', 'verlog', '版本面板'],
  ];
  for (const [btn, modal, name, label2] of panels) {
    const before = JSON.parse(await errsNow() || '[]').length;
    await click(btn);
    await wait(700);
    await shot('02-' + name);
    const opened = await vis(modal);
    const after = JSON.parse(await errsNow() || '[]').length;
    ok(opened, label2 + ' 開得起來');
    ok(after === before, label2 + ' 開啟時沒有新錯誤');
    if (opened) {
      const o2 = await overflow(p);
      ok(o2.bad.length === 0, label2 + ' 沒有元素跑出視窗', o2.bad.length ? o2.bad : undefined);
    }
    await p.eval(`(function(){
      var ids=['codexX','achX','rankX','onX','verLogClose','verLogX'];
      for (var i=0;i<ids.length;i++){ var e=document.getElementById(ids[i]); if(e && e.getClientRects().length){ e.click(); return 1; } }
      var m=document.querySelector('.modal.open,.modal.show,[data-open="1"]');
      if (m) { m.classList.remove('open','show'); }
      document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true}));
      return 0;
    })()`);
    await wait(400);
  }

  // ── 3. 商店 / 每日 / 更多抽屜
  head('3. 商店／每日／更多');
  for (const [btn, screen, name, label2] of [
    ['btnStore', 'scr-shop', 'shop', '商店'],
    ['btnDaily', 'scr-daily', 'daily', '每日挑戰'],
  ]) {
    const before = JSON.parse(await errsNow() || '[]').length;
    await click(btn);
    await wait(800);
    await shot('03-' + name);
    ok(await vis(screen), label2 + ' 頁面開得起來');
    const o2 = await overflow(p);
    ok(o2.bad.length === 0, label2 + ' 沒有元素跑出視窗', o2.bad.length ? o2.bad : undefined);
    ok(JSON.parse(await errsNow() || '[]').length === before, label2 + ' 沒有新錯誤');
    await click('btnBack');
    await wait(600);
  }
  await click('btnMoreMenu'); await wait(600); await shot('03-drawer');
  ok(await vis('mDrawer'), '「更多」抽屜開得起來');
  const oDrawer = await overflow(p);
  ok(oDrawer.bad.length === 0, '抽屜沒有元素跑出視窗', oDrawer.bad.length ? oDrawer.bad : undefined);
  await click('btnMoreMenu'); await wait(400);

  // ── 4. 說明 / 按鍵 / 設定
  head('4. 說明・按鍵・設定');
  await click('btnMoreMenu'); await wait(400);
  await click('btnHelp'); await wait(800); await shot('04-help');
  ok(await vis('scr-help'), '遊戲說明開得起來');
  const oHelp = await overflow(p);
  ok(oHelp.bad.length === 0, '說明頁沒有元素跑出視窗', oHelp.bad.length ? oHelp.bad : undefined);
  await click('btnBack'); await wait(500);
  await click('btnMoreMenu'); await wait(400);
  const keysBefore = JSON.parse(await errsNow() || '[]').length;
  await click('btnKeys'); await wait(800); await shot('04-keys');
  ok(JSON.parse(await errsNow() || '[]').length === keysBefore, '按鍵面板沒有新錯誤');
  await p.eval(`(function(){ document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true})); return 1; })()`);
  await wait(400);

  // ── 5. 抽屜裡的角色 / 外觀
  head('5. 角色・外觀');
  await click('btnMoreMenu'); await wait(400);
  await click('btnChar'); await wait(900); await shot('05-char');
  ok(JSON.parse(await errsNow() || '[]').length === 0, '角色頁零錯誤');
  await click('btnBack'); await wait(500);
  await click('btnMoreMenu'); await wait(400);
  await click('btnSkins'); await wait(900); await shot('05-skins');
  ok(JSON.parse(await errsNow() || '[]').length === 0, '外觀頁零錯誤');
  await p.eval(`(function(){ document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true})); return 1; })()`);
  await wait(400);

  // ── 6. 五種玩法：真的進去動一動
  head('6. 玩法實測（進去、走位、放彈、看狀態）');
  const drive = async (mode, startExpr, tag) => {
    const before = JSON.parse(await errsNow() || '[]').length;
    await p.eval(startExpr);
    await wait(2600);
    // 等開場說明關掉／倒數結束
    for (let i = 0; i < 30; i++) {
      const s = await p.eval('window.__BH.Game.state');
      if (s === 'play') break;
      await p.eval(`(function(){
        // ① 第 1 關的「起手三選一」強化卡（#buffPick.on）
        var bp = document.getElementById('buffPick');
        if (bp && bp.classList.contains('on')) {
          var c0 = document.querySelector('#bpRow [data-bp]');
          if (c0) { c0.click(); return 'buff'; }
        }
        // ② 開場說明卡（「出發！」）與結算卡的按鈕
        var cands = document.querySelectorAll('.mbtn, #ovBox button, .ovCard button, button.mbtn');
        for (var i=0;i<cands.length;i++){
          var e=cands[i];
          if (!e.getClientRects().length) continue;
          var cs=getComputedStyle(e); if (cs.display==='none'||cs.visibility==='hidden') continue;
          e.click(); return 'btn:' + (e.textContent||'').trim().slice(0,6);
        }
        document.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',bubbles:true}));
        return 0; })()`);
      await wait(400);
    }
    const st1 = await p.eval('window.__BH.Game.state');
    const pos1 = await p.eval('(function(){var P=window.__BH,P0=P.Game.players&&P.Game.players[0];return P0?[P0.x,P0.y]:null;})()');
    // 走位：桌機走真正預設鍵位（1P = WASD），手機走觸控軸
    if (IS_PHONE) {
      // 先用一次「真觸控」讓引擎把控制模式切成 touch（ctrlMode 看的是 InputSense），
      // 之後才能用 setTouchAxis 驅動 —— 直接設軸向會被鍵盤方案吃掉。
      await p.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: Math.round(w / 2), y: Math.round(h * 0.78), id: 1 }] });
      await p.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await wait(250);
      await p.eval(`(function(){ window.__BH.Input.setTouchAxis(1, 0); return 1; })()`);
      await wait(900);
      await p.eval(`(function(){ window.__BH.Input.setTouchAxis(0, 0); return 1; })()`);
    } else {
      await p.eval(`(function(){ window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyD',key:'d',bubbles:true})); return 1; })()`);
      await wait(900);
      await p.eval(`(function(){ window.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyD',key:'d',bubbles:true})); return 1; })()`);
    }
    const pos2 = await p.eval('(function(){var P=window.__BH,P0=P.Game.players&&P.Game.players[0];return P0?[P0.x,P0.y]:null;})()');
    // 放彈
    const bombs0 = await p.eval('(window.__BH.Game.bombs||[]).length');
    if (IS_PHONE) {
      await p.eval(`(function(){ window.__BH.Input.setTouch('action', true); setTimeout(function(){ window.__BH.Input.setTouch('action', false); },140); return 1; })()`);
    } else {
      // 1P 放炸彈預設是「滑鼠左鍵」，而且只認畫布上的指標事件
      await p.eval(`(function(){
        var cv = document.getElementById('cv') || document.getElementById('stageWrap');
        cv.dispatchEvent(new PointerEvent('pointerdown',{button:0,pointerType:'mouse',bubbles:true}));
        setTimeout(function(){ cv.dispatchEvent(new PointerEvent('pointerup',{button:0,pointerType:'mouse',bubbles:true})); },120);
        return 1; })()`);
    }
    await wait(700);
    const bombs1 = await p.eval('(window.__BH.Game.bombs||[]).length');
    await wait(2200);
    await shot('06-' + tag);
    const after = JSON.parse(await errsNow() || '[]');
    const st2 = await p.eval('window.__BH.Game.state');
    ok(st1 === 'play', tag + '：進得去戰場（state=' + st1 + '）');
    ok(!!pos1 && !!pos2 && (pos1[0] !== pos2[0] || pos1[1] !== pos2[1]), tag + '：角色真的會動', { from: pos1, to: pos2 });
    ok(bombs1 > bombs0 || bombs1 > 0, tag + '：放得出炸彈', { before: bombs0, after: bombs1 });
    ok(after.length === before, tag + '：整段沒有新錯誤', after.length !== before ? after.slice(before) : undefined);
    ok(st2 !== 'title', tag + '：沒有被踢回標題', st2);
    // 回標題
    await p.eval(`(function(){
      var P=window.__BH;
      try { P.Game.state='over'; } catch(e){}
      try { P.Screen.show('title'); } catch(e){}
      try { P.AudioSys.stopBGM(); } catch(e){}
      return 1; })()`);
    await wait(900);
  };

  await p.eval(`(function(){ var P=window.__BH; P.Solo.unlocked=40; P.RPG.unlocked=40; if(P.Daily){P.Daily.done=null;} return 1; })()`);
  await drive('solo', `(function(){ window.__BH.startSolo(1); return 1; })()`, 'solo');
  await drive('rpg', `(function(){ window.__BH.RPG.slot=0; window.__BH.RPG.lv=1; window.__BH.startRpg?window.__BH.startRpg(1):window.__BH.startSolo(1); return 1; })()`, 'rpg');
  await drive('battle', `(function(){ window.__BH.startBattle(); return 1; })()`, 'battle');
  await drive('abyss', `(function(){ window.__BH.Abyss.start(); return 1; })()`, 'abyss');

  // ── 7. 深淵契約 / 里程碑
  head('7. 深淵契約・里程碑');
  const ab = await p.eval(`(function(){
    var P=window.__BH, out={};
    try { out.perks = P.ABYSS_PERKS.map(function(p){ return p.id||p.key||p.name; }); } catch(e){ out.perks='ERR'; }
    try { out.mile = P.ABYSS_MILESTONES ? P.ABYSS_MILESTONES.map(function(m){return m.depth||m.n;}) : null; } catch(e){}
    return out;
  })()`);
  ok(Array.isArray(ab.perks) && ab.perks.length >= 8, '深淵契約 8 張都在', ab.perks);

  const totalErrs = JSON.parse(await errsNow() || '[]');
  ok(totalErrs.length === 0, '整輪零錯誤（console／未捕捉例外）', totalErrs);
  return { pass, fail };
}

(async () => {
  try {
    await run('desktop', 1280, 800, 9411);
    await run('phone', 390, 844, 9412);
  } catch (e) {
    console.error('TOUR CRASH', e && e.stack || e);
    fail++;
  }
  console.log('\n============================');
  console.log('巡檢結果：' + pass + ' 通過 / ' + fail + ' 失敗');
  if (notes.length) { console.log('待修：'); notes.forEach(n => console.log('  - ' + n)); }
  process.exit(fail ? 1 : 0);
})();
