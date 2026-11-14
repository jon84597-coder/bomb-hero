// 用遊戲自己的 drawRigChar 在離屏畫布上畫六種動作 → 驗證繪製路徑與比例
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require(path.join(__dirname, '..', '..', 'test', 'cdp.js'));
const OUT = path.join(__dirname, 'shots');
fs.mkdirSync(OUT, { recursive: true });

const EXPR = [
  '(function(){',
  '  var H=200, W=150, N=6;',
  '  var cv=document.createElement("canvas");',
  '  cv.width=W*N; cv.height=300;',
  '  var g=cv.getContext("2d");',
  '  g.fillStyle="#eef1f5"; g.fillRect(0,0,cv.width,cv.height);',
  '  var cases=[',
  '    ["walk", {moving:true, walk:6, idle:0, facing:"down"}],',
  '    ["idle", {moving:false, walk:0, idle:0.6, facing:"down"}],',
  '    ["hold", {moving:false, walk:0, idle:0.3, facing:"down", carry:true}],',
  '    ["hurt", {moving:false, walk:0, idle:0.2, facing:"down", expr:"cry"}],',
  '    ["victory", {moving:false, walk:0, idle:0.5, facing:"down", expr:"laugh"}],',
  '    ["throw", {moving:false, walk:0, idle:0.4, facing:"down", act:"throw"}]',
  '  ];',
  '  var res=[];',
  '  for (var i=0;i<cases.length;i++){',
  '    var lab=cases[i][0], args=cases[i][1];',
  '    var x=W*i+W/2, footY=270, r=null;',
  '    try { r=__BH.drawRigChar(g,"rabbit",x,footY,H,args); }',
  '    catch(e){ res.push(lab+" ERR "+e.message); continue; }',
  '    g.fillStyle="#334"; g.font="12px sans-serif"; g.textAlign="center";',
  '    g.fillText(lab, x, 292);',
  '    res.push(lab + (r ? (" ok H=" + Math.round(r.H)) : " NULL"));',
  '  }',
  '  return {res:res, png:cv.toDataURL("image/png")};',
  '})()'
].join('\n');

(async () => {
  const b = await launch({ w: 1000, h: 820 });
  const p = await b.newPage();
  await p.send('Network.enable');
  await p.send('Network.setCacheDisabled', { cacheDisabled: true });
  await p.goto('http://localhost:3122/', 10000);
  await sleep(2500);
  console.log('ready', await p.eval('__BH.HeroAnim.readyCount()'));
  const out = await p.eval(EXPR);
  console.log(out.res.join(' | '));
  fs.writeFileSync(path.join(OUT, 'draw6.png'),
    Buffer.from(out.png.replace(/^data:image\/png;base64,/, ''), 'base64'));
  console.log('saved draw6.png');
  b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
