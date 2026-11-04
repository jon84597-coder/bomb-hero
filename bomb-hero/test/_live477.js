// 線上煙霧：開 Pages 站，確認版本 / 10 國語系 / 說明頁 7 分頁 / 大逃殺 50 人 / BOSS 坐騎
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const URL = process.argv[2] || 'https://jon84597-coder.github.io/bomb-hero/';
// 版號不寫死：以本機 index.html 的 VERSION 為準（部署後線上必須一致）
const WANT = /const VERSION = '([^']+)'/.exec(fs.readFileSync(require('path').join(__dirname, '../index.html'), 'utf8'))[1];
let pass = 0, fail = 0;
const ok = (n, c, e) => { if (c) { pass++; console.log('  ✓ ' + n + (e ? '（' + e + '）' : '')); } else { fail++; console.log('  ✗ ' + n + (e ? '（' + e + '）' : '')); } };
(async () => {
  const b = await launch({ w: 390, h: 800 });
  const p = await b.newPage();
  await p.send('Runtime.enable');
  const errs = [];
  await p.goto(URL, 3000);
  for (let i = 0; i < 40; i++) { if (await p.eval('typeof __BH') === 'object') break; await sleep(300); }
  ok('__BH 載入完成', (await p.eval('typeof __BH')) === 'object');
  ok('版本 ' + WANT, (await p.eval('__BH.VERSION')) === WANT, await p.eval('__BH.VERSION'));
  ok('徽章文字同步', (await p.eval("(document.getElementById('verTxt')||{}).textContent")) === WANT);
  ok('版本紀錄最上面是 ' + WANT, (await p.eval('__BH.VERSION_LOG[0].v')) === WANT);
  ok('八大關卡底圖下載得到', await p.eval("(function(){return new Promise(function(r){var im=new Image();im.onload=function(){r(im.naturalWidth>=256)};im.onerror=function(){r(false)};im.src='bg/forest.webp';setTimeout(function(){r(false)},6000);})})()"));

  // ---- 10 國語系 ----
  const LANGS = ['zh-TW', 'zh-CN', 'en', 'ja', 'ko', 'th', 'vi', 'ru', 'de', 'it'];
  const cnt = await p.eval('Object.keys(__BH.I18N["zh-TW"]).length');
  ok('字典 ' + cnt + ' 條', cnt > 700);
  const missAll = await p.eval(`(function(){
    var L=${JSON.stringify(LANGS)}, base=Object.keys(__BH.I18N['zh-TW']), bad={};
    L.forEach(function(l){ var d=__BH.I18N[l]||{}, n=0; base.forEach(function(k){ if(d[k]==null||d[k]==='') n++; }); bad[l]=n; });
    return JSON.stringify(bad); })()`);
  const mo = JSON.parse(missAll);
  ok('10 個語系都完整', LANGS.every(l => mo[l] === 0), missAll);

  await p.eval("try{localStorage.setItem('bombhero-rotskip','1');}catch(e){}; __BH.settings.ctrl='touch'; __BH.applyCtrl(); 1");
  ok('預設開發者（全 32 關解鎖）', (await p.eval('__BH.Solo.maxUnlocked()')) === 32);

  // ---- 說明頁 7 分頁 ----
  const tabs = await p.eval("__BH.Help.show(), __BH.Help.setTab('br'), document.querySelectorAll('#helpTabs button, .htab').length");
  ok('說明頁分頁數 7', (await p.eval("document.querySelectorAll('[data-ht]').length")) === 7, await p.eval("document.querySelectorAll('[data-ht]').length"));
  const brTxt = await p.eval("(function(){var e=document.querySelector('#helpBody')||document.querySelector('.hbody');return (e?e.textContent:'').slice(0,60);})()");
  ok('大逃殺分頁有內容', brTxt.length > 10, brTxt.replace(/\s+/g, ' ').slice(0, 40));
  await p.eval("__BH.setLang('en'), __BH.Help.show(), __BH.Help.setTab('br'), 1");
  await sleep(500);
  const zhLeft = await p.eval("(function(){var e=document.querySelector('#helpBody')||document.querySelector('.hbody');var s=e?e.textContent:'';var m=s.match(/[\\u4e00-\\u9fff]/g);return m?m.length:0;})()");
  ok('切英文後說明頁沒有中文', zhLeft === 0, zhLeft + ' 字');
  await p.eval("__BH.setLang('zh-TW'), 1");
  await sleep(300);

  // ---- 大逃殺 50 人 ----
  const r = await p.eval(`(function(){
    var t0=Date.now();
    __BH.BR.opt={n:50,team:1,dur:10};
    var r=__BH.startBR();
    var G=__BH.Game;
    return JSON.stringify({ok:r, mode:G.mode, cols:G.cols, rows:G.rows, n:G.players.length,
      alive:G.brAlive, foes:(G.enemies||[]).length, hp:G.players[0].brHp, ms:Date.now()-t0});
  })()`);
  const o = JSON.parse(r);
  console.log('    ' + r);
  ok('startBR 成功、模式 br', o.ok === true && o.mode === 'br');
  ok('56×44 地圖', o.cols === 56 && o.rows === 44);
  ok('50 人同場', o.n === 50 && o.alive === 50);
  ok('16 隻敵人（14 小怪＋2 BOSS）', o.foes === 16, o.foes);
  ok('10 點血', o.hp === 10);
  ok('開圖 < 900ms', o.ms < 900, o.ms + 'ms');

  // ---- BOSS 坐騎（最後一下直接騎）----
  const mount = await p.eval(`(function(){
    var G=__BH.Game, me=G.players[0];
    var b=G.enemies.filter(function(e){return !!e.brBoss;})[0];
    if(!b||!me) return 'no-boss';
    G.flames=[]; G.bombs=[];
    me.alive=true; me.invuln=0; me.dino=false; me.redDragon=false;
    b.hp=2; b.hitT=0; b.bombT=999; b.lastHitBy=me;
    G.flames=[{cx:Math.floor(b.x/G.T), cy:Math.floor(b.y/G.T), owner:me, power:1, src:''}];
    __BH.updateBRBoss(b, 1/60);
    return JSON.stringify({dead:!!b.dead, dino:!!me.dino, mountT:Math.round((me.mountT||0)*10)/10, invuln:Math.round((me.invuln||0)*10)/10});
  })()`);
  const mo2 = JSON.parse(mount);
  console.log('    ' + mount);
  ok('BOSS 被打死', mo2.dead === true);
  ok('最後一下的人當場騎上坐騎（不用撿蛋）', mo2.dino === true);
  ok('上龍有無敵與表演時間', mo2.mountT > 0 && mo2.invuln >= 1);

  // ---- 效能函式在線 ----
  ok('地板分塊在線', (await p.eval('typeof __BH.floorChunk')) === 'function' || (await p.eval("/function floorChunk\\(/.test(document.documentElement.innerHTML)")) === true);
  ok('畫面裁切在線', (await p.eval("/function onScreen\\(/.test(document.documentElement.innerHTML)")) === true);
  ok('分塊髒標記在線', (await p.eval("/function floorChunkDirty\\(/.test(document.documentElement.innerHTML)")) === true);

  const err = await p.eval("(window.__errCnt||0)");
  ok('沒有 JS 例外', err === 0, 'errCnt=' + err);
  await b.close();
  console.log('\n' + (fail ? '✗ ' + fail + ' 失敗' : '✅ 全部 ' + pass + ' 通過'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
