// test/_probe-keys.js — v5.52：按鍵控制面板（真瀏覽器驗證）
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, '_keys');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}

const STATE = `(function(){
  var S = __BH.settings, out = { p: S.keyPreset, k1: {}, k2: {} };
  ['up','down','left','right','act','det','fire'].forEach(function(k){
    out.k1[k]=S.keys1[k]; out.k2[k]=S.keys2[k];
  });
  var el = document.getElementById('bhKeys');
  out.open = !!(el && el.classList.contains('on'));
  out.chip = !!document.getElementById('btnKeys');
  out.setBtn = !!document.getElementById('bhkSetBtn');
  out.on = [].map.call(document.querySelectorAll('#bhKeys .kopt.on'), function(b){ return b.getAttribute('data-p'); });
  out.note = !!document.querySelector('#bhkNote:not(.hide)');
  out.rowN = document.querySelectorAll('#bhkRow .kb').length;
  return out;
})()`;

(async () => {
  const b = await launch({ w: 430, h: 932, port: 9393 });
  const p = await b.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.goto('http://127.0.0.1:3111/', 1800);
  await sleep(500);
  await p.eval(`(function(){
    try { localStorage.setItem('bombhero-rotskip','1'); } catch(e){}
    var r = document.getElementById('rotHint'); if (r && r.parentNode) r.parentNode.removeChild(r);
    try { __BH.ovHide(); } catch(e){}
    return 1;
  })()`);
  await sleep(200);

  console.log('關閉狀態  ', JSON.stringify(await p.eval(STATE)));

  // 首頁：chip 的位置與寬度（確認沒把四顆 chip 擠爆）
  console.log('chip 版面 ', JSON.stringify(await p.eval(`(function(){
    var q = document.getElementById('quickRow'), c = document.getElementById('btnKeys');
    if (!q || !c) return null;
    var qr = q.getBoundingClientRect(), cr = c.getBoundingClientRect();
    return { qw: Math.round(qr.width), chipW: Math.round(cr.width), chipH: Math.round(cr.height),
             right: Math.round(cr.right), qright: Math.round(qr.right),
             n: q.children.length, text: c.textContent };
  })()`)));
  await p.shot(path.join(OUT, 'home.png'));

  // 打開面板
  await p.eval(`(function(){ document.getElementById('btnKeys').click(); return 1; })()`);
  await sleep(450);
  console.log('開啟面板  ', JSON.stringify(await p.eval(STATE)));
  console.log('面板版面  ', JSON.stringify(await p.eval(`(function(){
    var c = document.querySelector('#bhKeys .kcard');
    var r = c.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top),
             scrollH: c.scrollHeight, clientH: c.clientHeight,
             rows: document.querySelectorAll('#bhkTable .kl').length };
  })()`)));
  await p.shot(path.join(OUT, 'panel.png'));

  // 切到經典
  await p.eval(`(function(){ document.querySelector('#bhKeys .kopt[data-p="classic"]').click(); return 1; })()`);
  await sleep(350);
  console.log('切經典    ', JSON.stringify(await p.eval(STATE)));
  await p.shot(path.join(OUT, 'classic.png'));

  // 切回現代
  await p.eval(`(function(){ document.querySelector('#bhKeys .kopt[data-p="modern"]').click(); return 1; })()`);
  await sleep(300);
  console.log('切現代    ', JSON.stringify(await p.eval(STATE)));

  // 自訂：點第一顆鍵 → 按 Z
  await p.eval(`(function(){
    var d = document.querySelector('#bhKeys .kmore'); if (d) d.open = true;
    document.querySelector('#bhkRow .kb[data-k="up"]').click();
    return 1;
  })()`);
  await sleep(220);
  await p.shot(path.join(OUT, 'capture.png'));
  await p.send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyZ', key: 'z', windowsVirtualKeyCode: 90 });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyZ', key: 'z', windowsVirtualKeyCode: 90 });
  await sleep(350);
  console.log('改鍵後    ', JSON.stringify(await p.eval(STATE)));

  // 關掉（ESC）＋ 確認存檔真的寫進 localStorage
  await p.eval(`(function(){ return 1; })()`);
  await p.send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'Escape', key: 'Escape', windowsVirtualKeyCode: 27 });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'Escape', key: 'Escape', windowsVirtualKeyCode: 27 });
  await sleep(250);
  console.log('ESC 關閉  ', JSON.stringify(await p.eval(STATE)));
  console.log('存檔      ', JSON.stringify(await p.eval(`(function(){
    try { var s = JSON.parse(localStorage.getItem('bombhero-settings-v1')||'null');
      return s ? { keyPreset: s.keyPreset, up: s.keys1 && s.keys1.up } : null; } catch(e){ return 'ERR'; }
  })()`)));

  // 重開頁面 → 鍵位要留著
  await p.goto('http://127.0.0.1:3111/', 1500);
  await sleep(400);
  console.log('重新載入  ', JSON.stringify(await p.eval(STATE)));

  // 設定頁入口
  await p.eval(`(function(){
    var b=document.getElementById('btnMoreMenu'); if(b) b.click();
    setTimeout(function(){ var s=document.getElementById('btnSettings'); if(s) s.click(); }, 60);
    return 1;
  })()`);
  await sleep(700);
  await p.eval(`(function(){
    var q = document.getElementById('bhkSetBtn');
    if (q && q.scrollIntoView) q.scrollIntoView({ block: 'center' });
    return 1;
  })()`);
  await sleep(350);
  await p.shot(path.join(OUT, 'settings.png'));

  // 橫屏首頁：四顆 chip 是否還在一行
  await p.goto('http://127.0.0.1:3111/', 1200);
  await p.resize(844, 390, true);
  await sleep(600);
  console.log('橫屏 chip ', JSON.stringify(await p.eval(`(function(){
    var q = document.getElementById('quickRow'), c = document.getElementById('btnKeys');
    if (!q || !c) return null;
    var qr = q.getBoundingClientRect(), cr = c.getBoundingClientRect();
    var tops = [].map.call(q.children, function(e){ return Math.round(e.getBoundingClientRect().top); });
    return { qw: Math.round(qr.width), chipW: Math.round(cr.width), rows: new Set(tops).size,
             docH: document.documentElement.scrollHeight, winH: window.innerHeight };
  })()`)));
  await p.shot(path.join(OUT, 'land.png'));

  console.log('done');
  await b.close();
})().catch(function (e) { console.error('PROBE FAIL', e && e.stack || e); process.exit(1); });
