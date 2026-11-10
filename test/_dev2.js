const { launch, sleep } = require('./cdp.js');
const U = 'http://127.0.0.1:3122/';
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } }

async function boot(b, q) {
  const p = await b.newPage();
  await p.goto(U + '?x=' + Date.now(), 900);
  await p.eval(`(()=>{try{localStorage.clear()}catch(e){};return 1})()`);
  await p.goto(U + q + '&x=' + Date.now(), 2800);
  for (let i = 0; i < 12; i++) {
    if (await p.eval(`(()=>!!document.getElementById('homeMenu'))()`)) break;
    await sleep(500);
  }
  await sleep(1500);
  return p;
}

(async () => {
  const b = await launch({ w: 1280, h: 900, port: 9502, args: ['--no-proxy-server'] });

  /* ---------- A. 全新游客（正常玩家） ---------- */
  console.log('\n[A] 全新游客');
  let p = await boot(b, '?a=1');
  let d = await p.eval(`(()=>{
    const out={};
    out.inf=[...document.querySelectorAll('*')].filter(e=>e.children.length===0 && /∞/.test(e.textContent||'')).length;
    out.verCursor=getComputedStyle(document.getElementById('verTxt')).cursor;
    out.gold=(document.getElementById('shopWallet')||{}).textContent||'';
    return out;})()`);
  ok(d.inf === 0, '首頁完全沒有 ∞（金幣不是無限）');
  ok(d.verCursor !== 'pointer', '版本號不是可點的樣子（cursor=' + d.verCursor + '）');

  // 連點版本號 3 下 → 後台不該開
  await p.eval(`(()=>{const v=document.getElementById('verTxt').parentNode;
    for(let i=0;i<5;i++) v.click(); return 1})()`);
  await sleep(600);
  let bh = await p.eval(`(()=>{const m=document.getElementById('bhModal');return m? m.classList.contains('on'):false})()`);
  ok(!bh, '連點版本號 5 下 → 後台沒有打開');

  // Ctrl+Alt+D
  await p.send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyD', key: 'd', modifiers: 3 });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyD', key: 'd', modifiers: 3 });
  await sleep(500);
  bh = await p.eval(`(()=>{const m=document.getElementById('bhModal');return m? m.classList.contains('on'):false})()`);
  ok(!bh, 'Ctrl+Alt+D → 普通玩家後台沒開');

  // 商店
  await p.eval(`(()=>{try{document.getElementById('btnStore').click()}catch(e){};return 1})()`);
  await sleep(900);
  d = await p.eval(`(()=>{const w=document.getElementById('shopWallet');
    const h=document.getElementById('shopGoldHint');
    return {wallet:w?w.textContent.trim():'x', hint:h?h.textContent.trim():'',
      inf:[...document.querySelectorAll('#scr-store *')].filter(e=>e.children.length===0&&/∞/.test(e.textContent||'')).length};})()`);
  ok(!/∞/.test(d.wallet) && d.inf === 0, '商店錢包是數字不是 ∞（' + d.wallet + '）');
  ok(!/無限|∞/.test(d.hint), '商店說明不再寫「金幣無限」');
  const buyState = await p.eval(`(()=>{const b=[...document.querySelectorAll('#shopGrid [data-buy]')];
    return {total:b.length, disabled:b.filter(x=>x.disabled).length};})()`);
  ok(buyState.total > 0 && buyState.disabled === buyState.total,
    '0 金幣時所有購買鈕都是灰的（' + buyState.disabled + '/' + buyState.total + '）');
  await p.shot('test/_dev2_shop.png');
  await p.eval(`(()=>{try{Screen.show('title')}catch(e){};return 1})()`);
  await sleep(500);

  /* ---------- B. ?admin=1（新手走後門） ---------- */
  console.log('\n[B] 新手用 ?admin=1');
  p = await boot(b, '?admin=1');
  await sleep(1200);
  bh = await p.eval(`(()=>{const m=document.getElementById('bhModal');return m? m.classList.contains('on'):false})()`);
  ok(!bh, '?admin=1 → 新手後台打不開');

  /* ---------- C. ?dev=1（開發者） ---------- */
  console.log('\n[C] ?dev=1 開發者');
  p = await boot(b, '?dev=1');
  d = await p.eval(`(()=>{const w=document.getElementById('shopWallet');
    return {inf:[...document.querySelectorAll('*')].filter(e=>e.children.length===0&&/∞/.test(e.textContent||'')).length,
      stored:(()=>{try{return localStorage.getItem('bh_dev')}catch(e){return 'x'}})()};})()`);
  ok(d.inf > 0, '?dev=1 → 金幣恢復 ∞');
  ok(d.stored === '1', '?dev=1 記在本機（bh_dev=1）');
  await p.eval(`(()=>{const v=document.getElementById('verTxt').parentNode; v.click();v.click();v.click(); return 1})()`);
  await sleep(500);
  bh = await p.eval(`(()=>{const m=document.getElementById('bhModal');return m? m.classList.contains('on'):false})()`);
  ok(!bh, '?dev=1 也不靠連點開後台（連點已移除）');
  await p.send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyD', key: 'd', modifiers: 3 });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyD', key: 'd', modifiers: 3 });
  await sleep(700);
  bh = await p.eval(`(()=>{const m=document.getElementById('bhModal');return m? m.classList.contains('on'):false})()`);
  ok(bh, '?dev=1 + Ctrl+Alt+D → 後台開得起來（開發者入口還在）');

  /* ---------- D. ?dev=0 關掉（承接 C 的本機旗標） ---------- */
  console.log('\n[D] ?dev=0 恢復正常');
  p = await b.newPage();
  await p.goto(U + '?dev=0&x=' + Date.now(), 2800);
  for (let i = 0; i < 12; i++) {
    if (await p.eval(`(()=>!!document.getElementById('homeMenu'))()`)) break;
    await sleep(500);
  }
  await sleep(1200);
  d = await p.eval(`(()=>{return {inf:[...document.querySelectorAll('*')].filter(e=>e.children.length===0&&/∞/.test(e.textContent||'')).length,
    stored:(()=>{try{return String(localStorage.getItem('bh_dev'))}catch(e){return 'x'}})()};})()`);
  ok(d.inf === 0, '?dev=0 → 回到一般玩家（沒有 ∞）');
  ok(d.stored === 'null', '?dev=0 清掉本機開發旗標');

  console.log('\n結果：' + pass + ' 通過 / ' + fail + ' 失敗');
  b.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('EXC', e); process.exit(1); });
