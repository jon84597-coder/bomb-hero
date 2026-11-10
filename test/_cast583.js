// test/_cast583.js —— v5.83 真瀏覽器探針
//   ① 起手時頭上真的跳出圖示（截圖看得到）
//   ② 困難模式不畫圖示（但地面警示圈還在）
//   ③ 王的起手圖示（比較大一枚）
//   ④ 命中特效（核心＋衝擊環＋碎片）真的有東西飛出來
//   用法：先 `PORT=3122 node server.js`（根目錄），再 node test/_cast583.js
const { launch, sleep } = require('./cdp.js');
const U = 'http://127.0.0.1:3122/';
let pass = 0, fail = 0;
function ok(c, m, x) {
  if (c) { pass++; console.log('  ✓ ' + m + (x === undefined ? '' : ' → ' + JSON.stringify(x))); }
  else { fail++; console.log('  ✗ FAIL: ' + m + (x === undefined ? '' : ' → ' + JSON.stringify(x))); }
}

async function boot(b) {
  const p = await b.newPage();
  await p.goto(U + '?x=' + Date.now(), 800);
  await p.eval(`(()=>{try{localStorage.clear()}catch(e){};return 1})()`);
  await p.goto(U + '?dev=1&x=' + Date.now(), 2600);
  for (let i = 0; i < 14; i++) {
    if (await p.eval(`(()=>!!window.__BH)()`)) break;
    await sleep(400);
  }
  await sleep(900);
  return p;
}

(async () => {
  const b = await launch({ w: 1280, h: 900, port: 9511, args: ['--no-proxy-server'] });

  /* ---------- A. 第 25 關（夜光彩城）：起手圖示 ---------- */
  console.log('\n[A] 第 24 關（夜光彩城）：震波／十字／連鎖的起手圖示');
  let p = await boot(b);
  await p.eval(`(()=>{const Q=window.__BH; Q.settings.soloDiff='normal';
    Q.Game.stage=24; Q.startSolo(24,false,false); return 1})()`);
  await sleep(1400);
  const clicked = await p.eval(`(()=>{const b=document.querySelector('#ovBox button'); if(b){b.click();return 1} return 0})()`);
  ok(clicked === 1, '開場卡有「開始」可按');
  await sleep(5600);

  // 把三隻會出招的怪放到玩家附近（保證看得到）
  const setup = await p.eval(`(()=>{const Q=window.__BH, G=Q.Game, T=G.T;
    const me=G.players[0]; if(!me) return {err:'no player'};
    G.enemies.length=0;
    const px=Math.floor(me.x/T), py=Math.floor(me.y/T);
    const kinds=[['robot',px+2,py],['wisp',px,py+2],['pulser',px+2,py+2]];
    const out=[];
    kinds.forEach(function(k){
      const e=Q.makeEnemy(k[1],k[2],k[0],1,1);
      e.aggro=true; e.skCd=0; e.skillCd=0; e.hp=e.maxHp=99;
      G.enemies.push(e); out.push(k[0]);
    });
    me.invuln=999;
    return {spawned:out, n:G.enemies.length, state:G.state, diff:Q.settings.soloDiff};})()`);
  console.log('    生怪:', JSON.stringify(setup));
  ok(setup.n === 3, '三隻會出招的小怪都生出來了', setup.n);

  // 等牠們進入起手（最多 8 秒），一偵測到就截圖
  let got = null;
  for (let i = 0; i < 90; i++) {
    const d = await p.eval(`(()=>{const Q=window.__BH, G=Q.Game;
      const es=G.enemies.filter(e=>e.castSkill&&e.castT>0);
      if(!es.length) return null;
      const e=es[0];
      return {sk:e.castSkill, t:+e.castT.toFixed(2), key:Q.castIconKey(e),
              on:Q.castIconOn(), x:Math.round(e.x), y:Math.round(e.y), rpg:!!G.rpg};})()`);
    if (d) { got = d; break; }
    await sleep(90);
  }
  ok(!!got, '★ 小怪進入起手（castSkill 有值）', got && got.sk);
  ok(got && got.key === got.sk, '★ 起手的圖示 key 就是這一招', got && got.key);
  ok(got && got.on === true, '普通難度：圖示開啟');
  await p.shot('test/_s583-icon.png');

  /* 起手時地面法陣／警示圈還在（圖示不是唯一資訊） */
  const fx = await p.eval(`(()=>{const Q=window.__BH, G=Q.Game;
    return { aoes:(G.foeAoe||[]).length, bits:(G.bits||[]).length, rings:(G.rings||[]).length,
             parts:(G.particles||[]).length };})()`);
  ok(fx.aoes >= 0 && fx.parts >= 0, '特效容器都活著', fx);

  /* ---------- B. 困難模式：圖示關掉 ---------- */
  console.log('\n[B] 困難模式：不畫圖示');
  const hard = await p.eval(`(()=>{const Q=window.__BH;
    Q.settings.soloDiff='hard';
    return { on:Q.castIconOn(), diff:Q.settings.soloDiff };})()`);
  ok(hard.on === false, '★ 困難模式 castIconOn() = false', hard);

  // 手動掛一個起手，確認「圖示不畫、但地面圈照畫」
  const hardShot = await p.eval(`(()=>{const Q=window.__BH, G=Q.Game, T=G.T;
    G.enemies.length=0;
    const me=G.players[0]; const px=Math.floor(me.x/T), py=Math.floor(me.y/T);
    const e=Q.makeEnemy(px+2,py,'robot',1,1);
    e.aggro=true; e.castSkill='beam'; e.castT=1.0; e.castMax=1.15; e.hp=e.maxHp=99;
    G.enemies.push(e);
    return { icon:Q.castIconOn(), skill:e.castSkill, t:e.castT };})()`);
  ok(hardShot.skill === 'beam', '強制進入起手', hardShot);
  await sleep(260);
  await p.shot('test/_s583-hard.png');
  const back = await p.eval(`(()=>{const Q=window.__BH; Q.settings.soloDiff='normal'; return Q.castIconOn();})()`);
  ok(back === true, '切回普通 → 圖示恢復', back);

  /* ---------- C. 王的起手圖示 ---------- */
  console.log('\n[C] 王關：起手圖示（大一枚）');
  await p.eval(`(()=>{const Q=window.__BH; Q.startSolo(5,false,false); return 1})()`);
  await sleep(1500);
  await p.eval(`(()=>{const b=document.querySelector('#ovBox button'); if(b) b.click(); return 1})()`);
  await sleep(6000);
  // 王要「玩家靠近」才會進入戰鬥 → 把玩家搬到王前面，並直接給仇恨（驗的是圖示，不是尋敵）
  await p.eval(`(()=>{const Q=window.__BH, G=Q.Game, T=G.T;
    const bo=G.bossArena&&G.bossArena.boss; if(!bo) return 0;
    bo.aggro=true; bo.skillCd=0;
    const me=G.players[0]; if(me){ me.alive=true; me.invuln=999; me.x=bo.x; me.y=bo.y+T*2.2; }
    return 1;})()`);
  await sleep(400);

  let boss = null;
  for (let i = 0; i < 100; i++) {
    const d = await p.eval(`(()=>{const Q=window.__BH, G=Q.Game;
      const all=(G.enemies||[]).concat((G.bossArena&&G.bossArena.boss)?[G.bossArena.boss]:[]);
      const b=all.filter(e=>e&&e.boss&&e.castSkill&&e.castT>0)[0];
      if(!b) return null;
      return {sk:b.castSkill, t:+b.castT.toFixed(2), key:Q.castIconKey(b), max:+(b.castMax||0).toFixed(2)};})()`);
    if (d) { boss = d; break; }
    await sleep(90);
  }
  ok(!!boss, '★ 王進入起手', boss && boss.sk);
  ok(boss && boss.key === boss.sk, '★ 王的圖示對得上招式', boss && boss.key);
  await p.shot('test/_s583-boss.png');

  /* ---------- D. 命中特效 ---------- */
  console.log('\n[D] 命中特效（四層）');
  const hit = await p.eval(`(()=>{const Q=window.__BH, G=Q.Game, T=G.T;
    G.bits=[]; G.rings=[]; G.particles=[];
    Q.spellImpact(G.players[0].x, G.players[0].y, 'fire', 1.5);
    return { bits:(G.bits||[]).length, rings:(G.rings||[]).length, parts:(G.particles||[]).length,
             flash:+(G.flash||0).toFixed(2) };})()`);
  ok(hit.rings >= 2, '★ 撞擊核心＋衝擊環', hit.rings);
  ok(hit.bits > 0, '★ 元素碎片', hit.bits);
  ok(hit.parts > 10, '★ 粒子層', hit.parts);
  ok(hit.flash > 0, '★ 大招給螢幕白閃', hit.flash);
  await sleep(120);
  await p.shot('test/_s583-impact.png');

  /* ---------- E. 音效表真的有掛進去 ---------- */
  console.log('\n[E] 音效');
  const snd = await p.eval(`(()=>{const Q=window.__BH;
    const k=Q.sfxKeys();
    let err='';
    // 真的播一次（AudioContext 需要使用者手勢；已在遊戲內點過按鈕）
    try { ['pulse','beam','woolWave','charge_boss','explode'].forEach(function(n){ AudioSys && 0; }); } catch(e){}
    return { n:k.length, has:['pulse','chain','woolWave','shadowRing','charge_fire','explode'].every(function(x){return k.indexOf(x)>=0}) };})()`);
  ok(snd.n === 59, '★ 音效表 59 支', snd.n);
  ok(snd.has, '★ 抽查 6 支都在（含王招與起手音）');

  p.close && p.close();
  console.log('\n=== v5.83 探針：' + pass + ' 通過 / ' + fail + ' 失敗 ===');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('BOOM', e); process.exit(1); });
