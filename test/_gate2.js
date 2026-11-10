// test/_gate2.js — v5.80 模式門檻（走 unlock.js）：新手看得懂「為什麼不能玩」
const { launch, sleep } = require('./cdp.js');
const BASE = 'http://127.0.0.1:3122/';
const R = { pass: 0, fail: [] };
function ck(name, cond, extra) {
  if (cond) { R.pass++; console.log('  ✓ ' + name); }
  else { R.fail.push(name + (extra ? '  → ' + extra : '')); console.log('  ✗ ' + name + (extra ? '  → ' + extra : '')); }
}

async function boot(p, stage) {
  await p.goto(BASE + '?t=' + Date.now(), 900);
  await p.eval(`(()=>{ try{ localStorage.clear(); sessionStorage.clear();
    if (${stage} > 0) localStorage.setItem('bombhero-stage', '${stage}');
  }catch(e){}; return 1; })()`);
  await p.goto(BASE + '?t=' + Date.now(), 2600);
  for (let i = 0; i < 20; i++) {
    const ok = await p.eval(`(()=>{try{return !!document.querySelector('#homeMenu')}catch(e){return false}})()`);
    if (ok) break;
    await sleep(500);
  }
  await sleep(1400);   // 等 unlock 的 900ms 巡檢鋪上 locked
}

const snap = p => p.eval(`(()=>{
  const vis=id=>{const e=document.getElementById(id); if(!e) return 'none';
    const cs=getComputedStyle(e); return (cs.display==='none')?'hidden':'shown';};
  const info=id=>{const e=document.getElementById(id); if(!e) return null;
    return {locked:e.classList.contains('locked'), badge:e.getAttribute('data-aigain')||'',
      need:e.getAttribute('data-needn')||'', gk:e.getAttribute('data-gk')||''};};
  const m=document.getElementById('homeMenu');
  return {starter:m.classList.contains('starter'), tier:m.getAttribute('data-tier'),
    brV:vis('btnBR'), muV:vis('btnMulti'), br:info('btnBR'), mu:info('btnMulti')};
})()`);

const card = p => p.eval(`(()=>{const o=document.getElementById('gateOv');
  if(!o) return {none:true,on:false};
  return {on:o.classList.contains('on'),
    title:(document.getElementById('bhgT')||{}).textContent||'',
    body:((document.getElementById('bhgB')||{}).textContent||'').slice(0,80),
    lab:(document.getElementById('bhgL')||{}).textContent||'',
    num:(document.getElementById('bhgN')||{}).textContent||'',
    note:(document.getElementById('bhgNote')||{}).textContent||'',
    go:(document.getElementById('bhgGo')||{}).textContent||'',
    back:(document.getElementById('bhgBack')||{}).textContent||'',
    bar:((document.getElementById('bhgF')||{}).style||{}).width||''};})()`);

(async () => {
  const b = await launch({ w: 1280, h: 900, port: 9451, args: ['--no-proxy-server'] });
  const p = await b.newPage();

  /* ---------- 1. 全新帳號 ---------- */
  await boot(p, 0);
  let s = await snap(p);
  console.log('\n[1] 全新帳號', JSON.stringify(s));
  ck('大逃殺卡片看得見（不是消失）', s.brV === 'shown', s.brV);
  ck('多人對戰卡片看得見', s.muV === 'shown', s.muV);
  ck('大逃殺鎖著', s.br && s.br.locked === true);
  ck('對戰鎖著', s.mu && s.mu.locked === true);
  ck('大逃殺徽章寫「通關 6 關解鎖」', /6/.test(s.br.badge) && /解鎖/.test(s.br.badge), s.br.badge);
  ck('對戰徽章寫「通關 9 關解鎖」', /9/.test(s.mu.badge) && /解鎖/.test(s.mu.badge), s.mu.badge);
  await p.shot('test/_g2_home.png');

  /* ---------- 2. 點大逃殺 → 說明卡 ---------- */
  await p.eval(`(()=>{document.getElementById('btnBR').click(); return 1})()`);
  await sleep(600);
  let c = await card(p);
  console.log('[2] 點大逃殺 →', JSON.stringify(c));
  ck('說明卡打開', c.on === true);
  ck('標題「大逃殺還沒開放」', /大逃殺還沒開放/.test(c.title), c.title);
  ck('進度 0 / 6', /0\s*\/\s*6/.test(c.num), c.num);
  ck('標籤是「解鎖條件」', /解鎖條件/.test(c.lab), c.lab);
  ck('內文寫了要 6 關、去冒險模式', /6/.test(c.body) && /冒險模式/.test(c.body), c.body);
  ck('有「不是壞掉」的安撫句', c.note.length > 4, c.note);
  ck('主按鈕「去冒險模式通關」', /冒險模式/.test(c.go), c.go);
  ck('次按鈕「知道了」', /知道了/.test(c.back), c.back);
  ck('進度條有寬度', /%/.test(c.bar), c.bar);
  ck('沒有真的開大逃殺入口', await p.eval(`(()=>{const x=document.getElementById('brOv'); return !x||x.classList.contains('hide')})()`));
  await p.shot('test/_g2_card.png');

  /* ---------- 3. ESC ---------- */
  await p.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await sleep(500);
  ck('ESC 關得掉說明卡', (await card(p)).on === false);

  /* ---------- 4. 多人對戰 ---------- */
  await p.eval(`(()=>{document.getElementById('btnMulti').click(); return 1})()`);
  await sleep(600);
  c = await card(p);
  console.log('[4] 點多人對戰 →', JSON.stringify(c));
  ck('對戰說明卡打開', c.on === true);
  ck('標題「多人對戰還沒開放」', /多人對戰還沒開放/.test(c.title), c.title);
  ck('進度 0 / 9', /0\s*\/\s*9/.test(c.num), c.num);

  /* ---------- 5. 「去冒險模式通關」 ---------- */
  await p.eval(`(()=>{document.getElementById('bhgGo').click(); return 1})()`);
  await sleep(700);
  const go = await p.eval(`(()=>{const m=document.getElementById('bhPick');
    return {adv: !!m&&m.classList.contains('on'), gate: document.getElementById('gateOv').classList.contains('on')}})()`);
  ck('按鈕關卡並開冒險模式', go.adv === true && go.gate === false, JSON.stringify(go));

  /* ---------- 6. 通關 6 關 ---------- */
  await boot(p, 7);
  s = await snap(p);
  console.log('\n[6] 通關 6 關', JSON.stringify(s));
  ck('大逃殺解鎖', s.br.locked === false, String(s.br.locked));
  ck('對戰仍鎖著（要 9 關）', s.mu.locked === true);
  await p.eval(`(()=>{document.getElementById('btnBR').click(); return 1})()`);
  await sleep(900);
  const bro = await p.eval(`(()=>{const x=document.getElementById('brOv'), g=document.getElementById('gateOv');
    return {open: !!x && !x.classList.contains('hide'), there: !!x,
      gate: !!g && g.classList.contains('on')}})()`);
  ck('解鎖後點大逃殺真的進得去', bro.open === true && bro.gate === false, JSON.stringify(bro));

  /* ---------- 7. 通關 9 關 ---------- */
  await boot(p, 10);
  s = await snap(p);
  console.log('\n[7] 通關 9 關', JSON.stringify(s));
  ck('對戰解鎖', s.mu.locked === false);
  ck('兩張卡都沒徽章了', !s.br.badge && !s.mu.badge, s.br.badge + '|' + s.mu.badge);

  console.log('\n=== 通過 ' + R.pass + ' 項，失敗 ' + R.fail.length + ' 項 ===');
  R.fail.forEach(f => console.log('  ! ' + f));
  b.close();
  process.exit(R.fail.length ? 1 : 0);
})().catch(e => { console.error('EXC', e); process.exit(1); });
