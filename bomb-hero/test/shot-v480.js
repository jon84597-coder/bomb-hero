// test/shot-v480.js — 目檢每日挑戰 / 排行榜（含完整的「跑到出口 → 結算」流程）
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');
const URL = 'file:///' + path.join(__dirname, '../index.html').replace(/\\/g, '/');
const OUT = path.join(__dirname, '_v480');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const HIDE = "['zoomHint','hzHint','rotHint','brOv','brEnd'].forEach(function(id){var e=document.getElementById(id); if(e){e.classList.add('hide'); e.style.display='none';}}); 1";

async function page(b) {
  const p = await b.newPage();
  await p.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await p.goto(URL, 2500);
  for (let i = 0; i < 40; i++) { if (await p.eval('typeof __BH') === 'object') break; await sleep(300); }
  await sleep(1000);
  return p;
}

(async () => {
  const b = await launch({ w: 1280, h: 800 });
  
  /* ---------- 1. 每日挑戰畫面（中文） ---------- */
  const p = await page(b);
  await p.eval("window.__errs=window.__errs||[]; window.addEventListener('error', function(e){ window.__errs.push(String(e.message)); }); 1");
  await p.eval("document.getElementById('btnDaily').click(); 1");
  await sleep(900);
  await p.shot(path.join(OUT, 'daily_tw.png'));
  console.log('screen = ' + await p.eval("__BH.Screen.current"));

  /* ---------- 2. 開始挑戰 → 跳到出口看結算 ---------- */
  const flow = await p.eval(`(function(){
    var B=__BH, G=B.Game;
    document.getElementById('btnDailyGo').click();
    for(var i=0;i<60;i++){ if(G.daily && G.state!=='idle') break; }
    var started = !!(G.daily && G.daily.stage>0);
    // 跳過倒數
    G.state='play'; G.countdown=0;
    G.daily.ms = 83300;                    // 假裝跑了 1:23.3
    // 走到出口門
    var d=G.door; if(d) G.door.open=true;
    var pl=G.players[0]; pl.x=(d.x+.5)*G.T; pl.y=(d.y+.5)*G.T; pl.alive=true; pl.invuln=0;
    B.updateSolo(1/60);
    return JSON.stringify({started:started, stage:G.daily&&G.daily.stage, day:G.daily&&G.daily.day,
      done:G.daily&&G.daily.done, ms:G.daily&&Math.round(G.daily.ms), state:G.state,
      timer:Math.round(G.timer), door:d?d.x+','+d.y:'-'});
  })()`);
  console.log('flow = ' + flow);
  await sleep(1200);
  await p.shot(path.join(OUT, 'daily_result.png'));
  console.log('ovTitle = ' + await p.eval("(document.querySelector('#ovBox h3')||{}).textContent"));
  console.log('ovSub   = ' + await p.eval("(document.querySelector('#ovBox p')||{}).textContent"));

  /* ---------- 3. 英文版每日挑戰畫面 ---------- */
  await p.eval("__BH.setLang('en'); __BH.Daily.today && __BH.renderDailyScreen(); __BH.Screen.show('daily'); __BH.renderDailyScreen(); 1");
  await sleep(1200);
  await p.shot(path.join(OUT, 'daily_en.png'));

  /* ---------- 4. 德文版（長字） ---------- */
  await p.eval("__BH.setLang('de'); __BH.renderDailyScreen(); 1");
  await sleep(900);
  await p.shot(path.join(OUT, 'daily_de.png'));

  /* ---------- 5. 直接看排行榜列表（塞幾筆假資料） ---------- */
  await p.eval(`(function(){
    __BH.setLang('zh-TW');
    var day=__BH.Daily.today();
    var list=[{n:'阿明',ms:61200},{n:'小明',ms:74300},{n:'Kaito',ms:79900},{n:'玩家642',ms:90100},{n:'小明',ms:104500}];
    try{ localStorage.setItem('bombhero-lb-'+day, JSON.stringify({at:Date.now(), list:list})); }catch(e){}
    __BH.Lb.last = {day:day, list:list, online:true, at:Date.now()};
    __BH.renderDailyScreen();
    return 1; })()`);
  await sleep(700);
  await p.shot(path.join(OUT, 'lb_list.png'));

  const errCnt = await p.eval('(window.__errs||[]).length');
  // 說明頁的每日挑戰分頁
  await p.eval("__BH.setLang('zh-TW'); document.getElementById('btnHelp').click(); 1");
  await sleep(700);
  await p.eval("__BH.Help.setTab('daily'); 1");
  await sleep(500);
  await p.shot(path.join(OUT, 'help_daily.png'));
  await p.eval("__BH.setLang('ja'); __BH.Help.setTab('daily'); 1");
  await sleep(800);
  await p.shot(path.join(OUT, 'help_daily_ja.png'));

  console.log('errors = ' + errCnt);
  if (errCnt) console.log('  ' + JSON.stringify(await p.eval('(window.__errs||[]).slice(0,4)')));
  try { await b.close(); } catch (e) {}
})();
