const { launch, sleep } = require('./cdp.js');
const U = 'http://127.0.0.1:3122/';
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } }

async function boot(b, q, clear) {
  const p = await b.newPage();
  if (clear) {
    await p.goto(U + '?x=' + Date.now(), 900);
    await p.eval(`(()=>{try{localStorage.clear()}catch(e){};return 1})()`);
  }
  await p.goto(U + q + '&x=' + Date.now(), 2800);
  for (let i = 0; i < 14; i++) {
    if (await p.eval(`(()=>!!document.getElementById('homeMenu'))()`)) break;
    await sleep(500);
  }
  await sleep(1400);
  return p;
}
async function openSolo(p) {
  await p.eval(`(()=>{try{document.getElementById('btnAdventure').click()}catch(e){};return 1})()`);
  await sleep(700);
  await p.eval(`(()=>{try{document.getElementById('btnSolo').click()}catch(e){};return 1})()`);
  await sleep(900);
}
async function grid(p) {
  return p.eval(`(()=>{const s=[...document.querySelectorAll('#stageGrid .stg')];
    return {total:s.length, open:s.filter(x=>!x.disabled).length,
      sel:(document.querySelector('#stageGrid .stg.sel')||{}).getAttribute?document.querySelector('#stageGrid .stg.sel').getAttribute('data-stage'):''};})()`);
}

(async () => {
  const b = await launch({ w: 1280, h: 900, port: 9503, args: ['--no-proxy-server'] });

  console.log('\n[A] 全新游客 → 只該開第 1 關');
  let p = await boot(b, '?a=1', true);
  await openSolo(p);
  let g = await grid(p);
  ok(g.total === 40, '選關頁有 40 關（' + g.total + '）');
  ok(g.open === 1, '只開放 1 關（實際 ' + g.open + '）');
  await p.shot('test/_dev3_solo_player.png');

  console.log('\n[B] ?dev=1 → 40 關全開');
  p = await boot(b, '?dev=1', true);
  await openSolo(p);
  g = await grid(p);
  ok(g.open === 40, '開發模式 40 關全開（實際 ' + g.open + '）');

  console.log('\n[C] 回一般玩家（?dev=0）→ 又只剩 1 關');
  p = await boot(b, '?dev=0', false);
  await openSolo(p);
  g = await grid(p);
  ok(g.open === 1, '恢復後只開 1 關（實際 ' + g.open + '）');

  console.log('\n結果：' + pass + ' 通過 / ' + fail + ' 失敗');
  b.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('EXC', e); process.exit(1); });
