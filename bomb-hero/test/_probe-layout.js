// test/_probe-layout.js — 用真實幾何找出「重疊 / 溢出」的 UI
// 檢查對象：頂部 HUD chip、右上角按鈕、手機觸控鍵、小地圖、提示卡。
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');

const PORT = process.env.PORT || 3111;
const URL = 'http://127.0.0.1:' + PORT + '/index.html';
const OUT = path.join(__dirname, '_audit');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

const SIZES = (process.argv[2] || '900x430,844x390,800x360,1024x480').split(',');

const SCAN = `(function(){
  function rect(e){ var r=e.getBoundingClientRect(); return { x:Math.round(r.left), y:Math.round(r.top), w:Math.round(r.width), h:Math.round(r.height) }; }
  function vis(e){
    var s = getComputedStyle(e);
    if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) === 0) return false;
    var r = e.getBoundingClientRect();
    return r.width > 4 && r.height > 4;
  }
  var out = [];
  function push(sel, label, scope){
    var root = scope ? document.querySelector(scope) : document;
    if (!root) return;
    root.querySelectorAll(sel).forEach(function(e){
      if (!vis(e)) return;
      var r = rect(e);
      if (r.y + r.h <= 0 || r.y >= innerHeight) return;
      out.push({ k: label, id: (e.id || '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\\s+/).slice(0,2).join('.') : ''), r: r, txt: (e.textContent||'').trim().slice(0,14) });
    });
  }
  if (document.getElementById('scr-game') && !document.getElementById('scr-game').classList.contains('hide')) {
    push('.game-top > *', 'hud', '#scr-game');
    push('#touchUI > *', 'touch', '#scr-game');
    push('#miniMap, .minimap, #mmBox', 'map', '#scr-game');
  }
  return JSON.stringify({ w: innerWidth, h: innerHeight, items: out });
})()`;

function overlap(a, b) {
  const x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const area = x * y;
  if (!area) return 0;
  const min = Math.min(a.w * a.h, b.w * b.h);
  return area / Math.max(1, min);   // 佔小者的比例
}

(async () => {
  const cdp = await launch({ port: 9450, w: 900, h: 430 });
  const p = await cdp.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
  await p.send('Emulation.setUserAgentOverride', { userAgent: UA, platform: 'Android' });
  await p.goto(URL, 2600);
  await p.eval(`(function(){
    try{localStorage.setItem('bombhero-rotskip','1');}catch(e){}
    var r=document.getElementById('rotHint'); if(r&&r.parentNode) r.parentNode.removeChild(r);
    __BH.settings.mapMode='classic';
  })()`);

  let problems = 0;
  for (const sz of SIZES) {
    const [w, h] = sz.split('x').map(Number);
    await p.resize(w, h, true);
    await sleep(400);
    await p.eval(`(function(){ try{ __BH.startSolo(3); }catch(e){} })()`);
    await sleep(700);
    await p.eval(`(function(){var b=document.querySelector('#ovBox button'); if(b) b.click();})()`);
    await sleep(2500);
    // 等提示卡消失
    await sleep(1500);

    const data = JSON.parse(await p.eval(SCAN));
    console.log('\n=== ' + sz + ' （' + data.items.length + ' 個元素）===');

    // ① 超出視窗
    data.items.forEach(it => {
      const r = it.r;
      const over = [];
      if (r.x < -1) over.push('左 ' + (-r.x) + 'px');
      if (r.x + r.w > data.w + 1) over.push('右 ' + (r.x + r.w - data.w) + 'px');
      if (r.y + r.h > data.h + 1) over.push('下 ' + (r.y + r.h - data.h) + 'px');
      if (over.length) { problems++; console.log('  ✗ 溢出[' + it.k + '] ' + it.id + ' "' + it.txt + '"  ' + over.join('，')); }
    });

    // ② 兩兩重疊
    for (let i = 0; i < data.items.length; i++) {
      for (let j = i + 1; j < data.items.length; j++) {
        const A = data.items[i], B = data.items[j];
        // 父子或同組不互比（touch 圈本身會包住小圖示）
        if (A.k === B.k && A.k === 'touch') continue;
        const ov = overlap(A.r, B.r);
        if (ov > 0.22) {
          problems++;
          console.log('  ✗ 重疊 ' + Math.round(ov * 100) + '%  [' + A.k + '] ' + A.id + ' "' + A.txt + '"  ×  [' + B.k + '] ' + B.id + ' "' + B.txt + '"');
        }
      }
    }
    if (!data.items.length) console.log('  （沒有偵測到 HUD／觸控元素）');
    try { await p.shot(path.join(OUT, 'lay-' + sz + '.png')); } catch (e) {}
    await p.eval(`(function(){ try{ __BH.Screen.show('home'); __BH.ovHide(); }catch(e){} })()`);
    await sleep(300);
  }

  cdp.close();
  console.log('\n' + (problems ? '✗ 共 ' + problems + ' 個版面問題' : '✓ 版面無重疊／溢出'));
  process.exit(0);
})().catch(e => { console.error('崩潰', e); process.exit(2); });
