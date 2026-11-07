// test/_probe-fpad-shot.js —— 真瀏覽器看浮動搖桿長什麼樣（不含在 _runall 裡）
//   事件鏈已由 verify-v541 的 33 項覆蓋；這支只負責「看起來對不對」。
const { launch, sleep } = require('./cdp');
const path = require('path');
const OUT = path.join(__dirname, '_v541');
const fs = require('fs');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const BASE = process.env.BH_URL || 'http://127.0.0.1:3111/';
const wait = ms => new Promise(r => setTimeout(r, ms));

(async function () {
  const b = await launch({ port: 9455, w: 430, h: 900 });
  const p = await b.newPage();
  await p.resize(430, 900, true);
  await p.goto(BASE, 2600);

  const info = await p.eval(`(function(){
    document.body.classList.add('touch','slidepad');
    var f = document.getElementById('fpad'), k = document.getElementById('fknob');
    // 首頁時遊戲容器 display:none；把祖先鏈逐層打開（保留 #touchUI 父子關係，CSS 選擇器才匹配）
    var n = f.parentElement;
    while (n && n !== document.body) {
      if (getComputedStyle(n).display === 'none') n.style.display = 'block';
      n = n.parentElement;
    }
    var t = document.getElementById('touchUI');
    t.style.cssText = 'position:fixed;left:0;top:0;width:430px;height:900px;display:block;visibility:visible;z-index:9999;--tscale:1';
    f.style.opacity = '1'; f.style.transform = 'scale(1)';
    f.style.left = '105px'; f.style.top = '640px';
    f.classList.add('on');
    k.style.transform = 'translate(18.8px,-17.6px)';
    var r = f.getBoundingClientRect();
    return { body: document.body.className, disp: getComputedStyle(f).display,
             w: Math.round(r.width), h: Math.round(r.height),
             cx: Math.round(r.left + r.width/2), cy: Math.round(r.top + r.height/2) };
  })()`);
  console.log('圓盤 =', JSON.stringify(info));
  await wait(220);
  await p.shot(path.join(OUT, 'fpad-drag.png'));

  // 放手狀態（淡出）
  await p.eval(`(function(){
    var f=document.getElementById('fpad'); f.style.opacity='0';
    document.getElementById('fknob').style.transform='translate(0px,0px)';
    return true; })()`);
  await wait(240);
  await p.shot(path.join(OUT, 'fpad-released.png'));

  b.close();
  console.log('SHOT DIR', OUT);
})().catch(e => { console.error('ERR', e); process.exit(1); });
