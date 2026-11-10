// test/_skills582.js —— v5.82 真瀏覽器探針
//   ① 第 1 關：場上 0 隻會出招（含鑽地／吐彈／躲炸彈）
//   ② 第 3 關：剛好 3 隻會出招 + 開場卡多一行 + 三條教學（畫面上真的看得到）
//   ③ 倒數結束後跳提示卡（doorHint 有內容）
//   ④ 第 4 關：全部照舊會出招
//   用法：先 `PORT=3122 node server.js`（根目錄），再 node test/_skills582.js
const { launch, sleep } = require('./cdp.js');
const U = 'http://127.0.0.1:3122/';
let pass = 0, fail = 0;
function ok(c, m, x) {
  if (c) { pass++; console.log('  ✓ ' + m + (x === undefined ? '' : ' → ' + JSON.stringify(x))); }
  else { fail++; console.log('  ✗ ' + m + (x === undefined ? '' : ' → ' + JSON.stringify(x))); }
}

async function boot(b) {
  const p = await b.newPage();
  await p.goto(U + '?x=' + Date.now(), 800);
  await p.eval(`(()=>{try{localStorage.clear()}catch(e){};return 1})()`);
  // ?dev=1：全關卡解鎖（驗的是關卡內容，不是解鎖流程）
  await p.goto(U + '?dev=1&x=' + Date.now(), 2600);
  for (let i = 0; i < 14; i++) {
    if (await p.eval(`(()=>!!window.__BH)()`)) break;
    await sleep(400);
  }
  await sleep(900);
  return p;
}

(async () => {
  const b = await launch({ w: 1280, h: 900, port: 9510, args: ['--no-proxy-server'] });

  /* ---------- A. 第 1 關 ---------- */
  console.log('\n[A] 第 1 關：完全不放招');
  let p = await boot(b);
  await p.eval(`(()=>{window.__BH.startSolo(1,false,false);return 1})()`);
  await sleep(1200);
  let d = await p.eval(`(()=>{const G=window.__BH.Game;
    const es=G.enemies.filter(e=>e&&!e.boss);
    return { n:es.length, skill:es.filter(e=>e.skill).length, smart:es.filter(e=>e.smart).length,
             title:(document.querySelector('#ovBox h3')||{}).textContent||'',
             tips:(document.querySelectorAll('#ovBox .mtips li')||[]).length };})()`);
  ok(d.n >= 2, '第 1 關有生怪', d.n);
  ok(d.skill === 0, '★ 第 1 關 0 隻會出招', d.skill);
  ok(d.smart === 0, '★ 第 1 關也沒有躲炸彈的', d.smart);
  ok(/第 1 關/.test(d.title), '開場卡標題是第 1 關', d.title);
  ok(d.tips <= 3, '第 1 關不會多塞招式教學（一般模式提示最多 3 條）', d.tips);

  /* ---------- B. 第 3 關 ---------- */
  console.log('\n[B] 第 3 關：3 隻示範 + 教學');
  await p.eval(`(()=>{window.__BH.startSolo(3,false,false);return 1})()`);
  await sleep(1200);
  d = await p.eval(`(()=>{const G=window.__BH.Game;
    const es=G.enemies.filter(e=>e&&!e.boss);
    const sub=(document.querySelector('#ovBox p')||{}).textContent||'';
    const lis=[...document.querySelectorAll('#ovBox .mtips li')].map(e=>e.textContent);
    return { n:es.length, skill:es.filter(e=>e.skill).length, demo:es.filter(e=>e.demoSkill).length,
             kinds:es.filter(e=>e.skill).map(e=>e.type+'/'+e.skill).sort(),
             sub:sub, tips:lis, title:(document.querySelector('#ovBox h3')||{}).textContent||'' };})()`);
  ok(d.skill === 3, '★ 第 3 關剛好 3 隻會出招', d.kinds);
  ok(d.demo === 3, '★ 這 3 隻都有 demoSkill（頭上掛 ❗）', d.demo);
  ok(d.kinds.join(',') === 'bunny/charge,cater/blink,frog/spit', '★ 吐彈／鑽地／衝撞各一隻', d.kinds);
  ok(/小怪會使出招式/.test(d.sub), '★ 開場卡多一行「小怪會使出招式」', d.sub.split('\n').pop().slice(0, 28));
  ok(d.tips.length === 3, '★ 開場卡三條教學（畫面上真的三條）', d.tips.length);
  ok(d.tips.join(' ').indexOf('吐彈') >= 0 && d.tips.join(' ').indexOf('鑽地') >= 0 && d.tips.join(' ').indexOf('衝撞') >= 0,
    '三條分別講吐彈／鑽地／衝撞');
  ok(d.tips.every(x => x.indexOf('<b>') < 0), '教學文字沒有露出 HTML 標籤');
  await p.shot('test/_s582-stage3-intro.png');

  /* 按「開始」→ 倒數 → 提示卡 */
  await p.eval(`(()=>{const b=document.querySelector('#ovBox button'); if(b) b.click(); return 1})()`);
  await sleep(5200);
  const hint = await p.eval(`(()=>{const el=document.getElementById('doorHint');
    return { on: !!el && !el.classList.contains('hide'),
             t: (el&&el.querySelector('.dh-t')||{}).textContent||'',
             s: (el&&el.querySelector('.dh-s')||{}).textContent||'',
             st: window.__BH.Game.state };})()`);
  ok(hint.st === 'play', '倒數結束、進入 play', hint.st);
  ok(hint.on, '★ 進場後跳提示卡（doorHint 顯示中）');
  ok(/小怪開始會出招/.test(hint.t), '提示卡標題正確', hint.t);
  ok(/警示圈/.test(hint.s), '提示卡副標教玩家看警示圈', hint.s);
  await p.shot('test/_s582-stage3-hint.png');

  /* ❗ 頭上氣泡：等 3 秒看有沒有畫出來（canvas 上看文字氣泡存在） */
  const bub = await p.eval(`(()=>{const G=window.__BH.Game;
    return (G.bubbles||[]).filter(b=>/❗/.test(b.text||'')).length;})()`);
  ok(bub >= 1, '★ 示範的怪頭上有 ❗ 氣泡', bub);
  await p.shot('test/_s582-stage3-play.png');

  /* ---------- C. 第 4 關 ---------- */
  console.log('\n[C] 第 4 關：照舊全開');
  await p.eval(`(()=>{window.__BH.startSolo(4,false,false);return 1})()`);
  await sleep(1200);
  d = await p.eval(`(()=>{const G=window.__BH.Game;const es=G.enemies.filter(e=>e&&!e.boss);
    return { n:es.length, skill:es.filter(e=>e.skill).length,
             tips:(document.querySelectorAll('#ovBox .mtips li')||[]).length,
             sub:(document.querySelector('#ovBox p')||{}).textContent||'' };})()`);
  ok(d.n >= 2 && d.skill === d.n, '★ 第 4 關全部會出招', { 總數: d.n, 會出招: d.skill });
  ok(d.sub.indexOf('小怪會使出招式') < 0, '第 4 關不再顯示招式教學（只講一次）');

  p.close && p.close();
  console.log('\n=== v5.82 探針：' + pass + ' 通過 / ' + fail + ' 失敗 ===');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('BOOM', e); process.exit(1); });
