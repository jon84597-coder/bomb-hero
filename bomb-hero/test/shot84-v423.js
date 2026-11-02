// v4.23 截圖：PC / 手機首頁、公告展開、版本面板、診斷卡
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');

const OUT = path.join(__dirname, '_v423');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

(async () => {
  const b = await launch({ port: 9451, w: 1280, h: 900 });
  try {
    // ---- PC
    let p = await b.newPage();
    await p.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await p.goto(URL, 2600);
    await p.shot(path.join(OUT, 'pc-title.png'));

    await p.eval("(function(){ var b=document.getElementById('verLogBtn'); if(b) b.click(); })()");
    await sleep(500);
    await p.shot(path.join(OUT, 'pc-verlog.png'));
    await p.eval("(function(){ var p=document.getElementById('verLog'); if(p) p.classList.add('hide'); })()");
    await sleep(200);

    await p.eval("(function(){ var h=document.getElementById('annHead'); if(h && document.getElementById('annBox').classList.contains('min')) h.click(); })()");
    await sleep(500);
    await p.shot(path.join(OUT, 'pc-ann-open.png'));
    // localStorage 是同一個瀏覽器共用的 —— 還原成「收合」，否則手機那張會是展開的
    await p.eval("try{localStorage.setItem('bombhero.ann.min','1')}catch(e){}");
    await p.send('Target.closeTarget', { targetId: p.targetId });

    // ---- 手機
    p = await b.newPage();
    const LINE_UA = 'Mozilla/5.0 (Linux; Android 13; SM-G991B Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/119.0.6045.163 Mobile Safari/537.36 Line/13.20.0/IAB';
    await p.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await p.send('Emulation.setUserAgentOverride', { userAgent: LINE_UA, platform: 'Linux armv8l' });
    await p.goto(URL, 3000);
    await p.shot(path.join(OUT, 'phone-title.png'));

    const info = await p.eval(`(function(){
      var r = {};
      ['btnSolo','btnRpg','btnBoss','btnStore','btnAcctBig','btnBattle','btnOnline','btnHelp','btnSettings','btnQuit'].forEach(function(id){
        var e = document.getElementById(id); if (!e) { r[id] = 'MISSING'; return; }
        var b = e.getBoundingClientRect();
        r[id] = [Math.round(b.left), Math.round(b.top + (window.scrollY||0)), Math.round(b.width), Math.round(b.height)];
      });
      var w = document.getElementById('verLogBtn').getBoundingClientRect();
      r.__verlog = [Math.round(w.left), Math.round(w.top + (window.scrollY||0)), Math.round(w.width), Math.round(w.height)];
      r.__docH = document.documentElement.scrollHeight;
      r.__acctColor = getComputedStyle(document.getElementById('btnAcctBig')).color;
      r.__acctBg = getComputedStyle(document.getElementById('btnAcctBig')).backgroundImage.slice(0, 60);
      return JSON.stringify(r, null, 0);
    })()`);
    console.log('手機版面', info);

    await p.eval("(function(){ var h=document.getElementById('annHead'); if(h) h.click(); })()");
    await sleep(500);
    await p.shot(path.join(OUT, 'phone-ann-open.png'));
    await p.eval("(function(){ var h=document.getElementById('annHead'); if(h) h.click(); })()");
    await sleep(300);

    // 診斷卡（模擬模組掛掉）
    await p.eval(`(function(){
      window.__BHB.errs.push({ mod: 'Shop', msg: "Cannot access 'Shop' before initialization",
        stack: 'ReferenceError: Cannot access Shop before initialization | at spawnPets (index.html:8901:14)' });
      var box = document.getElementById('bootDiag');
      box.classList.remove('hide');
      document.getElementById('bootDiagMsg').textContent = '出問題的模組：Shop。按「強制更新」通常就能救回來。';
      document.getElementById('bootDiagPre').textContent = "[Shop] Cannot access 'Shop' before initialization\\n    ReferenceError | at spawnPets (index.html:8901:14)";
    })()`);
    await sleep(300);
    await p.shot(path.join(OUT, 'phone-diag.png'));
    await p.send('Target.closeTarget', { targetId: p.targetId });
  } finally {
    b.close();
  }
  console.log('截圖完成 →', OUT);
})();
