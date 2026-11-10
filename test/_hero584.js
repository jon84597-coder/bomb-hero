// test/_hero584.js —— v5.84 真瀏覽器探針（主角特效）
//   ① 放炸彈／踢彈／衝刺：真的看得到火花、速度線、殘影
//   ② heroImpact 三檔（小／中／大）並排
//   ③ 蓄力法陣 heroRune（往內收）
//   ④ 8 個角色技各放一次（顏色與碎片都不同）
//   ⑤ 受傷回饋（紅／藍）
//   ⑥ 音效表 84 支
//   用法：先 `PORT=3122 node server.js`（根目錄），再 node test/_hero584.js
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
  const b = await launch({ w: 1280, h: 900, port: 9521, args: ['--no-proxy-server'] });

  console.log('\n[A] 匯出檢查');
  let p = await boot(b);
  const api = await p.eval(`(()=>{const Q=window.__BH;
    return {impact:typeof Q.heroImpact, rune:typeof Q.heroRune, ghost:typeof Q.heroGhost,
            shake:typeof Q.shakeLv, kick:typeof Q.camKick, ch:Object.keys(Q.CH_THEME||{}).length,
            sk:Object.keys(Q.SK_THEME||{}).length, sfx:(Q.sfxKeys?Q.sfxKeys().length:0),
            rpgSk: typeof Q.RpgSkill};})()`);
  console.log('    ' + JSON.stringify(api));
  ok(api.impact === 'function' && api.rune === 'function' && api.ghost === 'function', '特效函式都匯出了');
  ok(api.ch === 8 && api.sk === 4, '主題表 8＋4');
  ok(api.sfx === 84, '★ 音效表 84 支', api.sfx);

  /* ---------- B. 進關卡 ---------- */
  await p.eval(`(()=>{const Q=window.__BH; Q.settings.soloDiff='normal';
    Q.Game.stage=3; Q.startSolo(3,false,false); return 1})()`);
  await sleep(1200);
  await p.eval(`(()=>{const b=document.querySelector('#ovBox button'); if(b) b.click(); return 1})()`);
  await sleep(4200);
  const st = await p.eval(`(()=>{const Q=window.__BH,G=Q.Game;
    return {state:G.state, T:G.T, px:Math.round(G.players[0].x), py:Math.round(G.players[0].y)};})()`);
  console.log('    關卡狀態: ' + JSON.stringify(st));
  ok(st.state === 'play', '進到 play 狀態', st.state);

  // 打開畫面震動（推鏡才有值）+ 把所有怪清掉（避免干擾畫面）
  await p.eval(`(()=>{const Q=window.__BH,G=Q.Game;
    Q.settings.shake=1; G.enemies.length=0; G.players[0].invuln=999; return 1})()`);

  /* ---------- C. 放炸彈 + 踢彈 ---------- */
  console.log('\n[B] 放炸彈／踢彈：火花、速度線');
  const before = await p.eval(`(()=>{const Q=window.__BH,G=Q.Game;
    return {rings:G.rings.length, parts:G.particles.length, bits:(G.bits||[]).length};})()`);
  await p.eval(`(()=>{const Q=window.__BH,G=Q.Game;
    Q.Game.players[0].maxBombs=6;
    for(let i=0;i<3;i++){ try{ Q.placeBomb(G.players[0]); }catch(e){} }
    return 1})()`);
  await sleep(140);
  const after = await p.eval(`(()=>{const Q=window.__BH,G=Q.Game;
    return {rings:G.rings.length, parts:G.particles.length, bombs:G.bombs.length,
            kick:(typeof Q.camKick==='function')};})()`);
  console.log('    放彈前後: ' + JSON.stringify(before) + ' → ' + JSON.stringify(after));
  ok(after.rings > before.rings, '★ 放炸彈有生出火花環', [before.rings, after.rings]);
  ok(after.parts > before.parts, '★ 放炸彈有粒子', [before.parts, after.parts]);
  ok(after.bombs >= 1, '有炸彈真的放到場上（同格只能一顆，這是規則）', after.bombs);
  await p.shot('test/_h584-place.png');

  /* ---------- D. 三檔命中並排 ---------- */
  console.log('\n[C] 三檔命中（小／中／大）');
  await p.eval(`(()=>{const Q=window.__BH,G=Q.Game,T=G.T,me=G.players[0];
    G.enemies.length=0;
    Q.heroImpact(me.x - T*2.2, me.y, {power:.7,  col:'#7fe3ff', bit:'circ', dir:0});
    Q.heroImpact(me.x,        me.y, {power:1.4, col:'#ff7a3d', bit:'ember', dir:0});
    Q.heroImpact(me.x + T*2.2, me.y, {power:2.2, col:'#e6d4ff', bit:'star', dir:0});
    return 1})()`);
  await sleep(90);
  await p.shot('test/_h584-impact.png');

  /* ---------- E. 蓄力法陣 + 殘影 ---------- */
  console.log('\n[D] 蓄力法陣（往內收）＋ 殘影');
  await p.eval(`(()=>{const Q=window.__BH,G=Q.Game,T=G.T,me=G.players[0];
    Q.heroRune(me.x, me.y, '#ffd166', .9);
    Q.heroGhost({x:me.x-T*1.2,y:me.y}, '#9fe8ff', 3);
    Q.heroGhost({x:me.x-T*.6,y:me.y}, '#9fe8ff', 3);
    return 1})()`);
  await sleep(160);
  const ghostN = await p.eval(`(()=>{const G=window.__BH.Game; return (G.ghosts||[]).length})()`);
  ok(ghostN > 0, '★ 殘影有留在場上', ghostN);
  await p.shot('test/_h584-rune.png');

  /* ---------- F. 8 個角色技 ---------- */
  console.log('\n[E] 8 個角色專屬技（顏色／碎片都不同）');
  const colors = [];
  for (let ci = 0; ci < 8; ci++) {
    const r = await p.eval(`(()=>{const Q=window.__BH,G=Q.Game;
      try { Q.RPG.char = ${ci}; } catch(e) {}
      // 角色技共用同一個冷卻（14~22 秒）→ 每一招前要把冷卻清掉才測得下去
      try { Q.RpgSkill.reset(); } catch(e) {}
      try { G.rpg = true; } catch(e) {}
      const me=G.players[0]; me.power=4; me.maxBombs=4;
      // quickfuse 要有自己的炸彈才判定成功
      try { G.bombs.length=0; G.bombs.push({cx:Math.floor(me.x/G.T), cy:Math.floor(me.y/G.T),
        px:me.x, py:me.y, timer:2.4, power:4, owner:me, passers:[me], held:false, seed:1, age:0}); } catch(e) {}
      let def=null, cast=0;
      try { def = Q.RpgSkill.charDef(); } catch(e) {}
      try { cast = Q.RpgSkill.charCast() ? 1 : 0; } catch(e) { cast = -1; }
      const th = def && Q.CH_THEME[def.id] ? Q.CH_THEME[def.id].col : null;
      return { i:${ci}, id:def?def.id:null, n:def?def.n:null, cast:cast, col:th };})()`);
    colors.push(r);
    await sleep(220);
    if (r.cast === 1) await p.shot('test/_h584-ch' + ci + '.png');
  }
  console.log('    ' + colors.map(c => c.id + '/' + c.col + '/' + c.cast).join('  '));
  ok(colors.filter(c => c.id).length === 8, '八個角色技都叫得出來', colors.filter(c => c.id).length);
  ok(colors.filter(c => c.cast === 1).length === 8, '★ 八招都成功施放', colors.filter(c => c.cast === 1).length);
  ok(new Set(colors.map(c => c.col)).size === 8, '★ 八招主題色互不相同', colors.map(c => c.col));

  /* ---------- G. 受傷 ---------- */
  console.log('\n[F] 受傷回饋（紅＝生命／藍＝護甲）');
  const hurt = await p.eval(`(()=>{const Q=window.__BH,G=Q.Game,me=G.players[0];
    me.invuln=0; G.rings.length=0; G.pops.length=0;
    const r0=G.rings.length;
    try { Q.hurtFeedback(me, 1, 0); } catch(e) { return {err:String(e)}; }
    const hp={rings:G.rings.length, pops:G.pops.length};
    G.rings.length=0;
    try { Q.hurtFeedback(me, 0, 1); } catch(e) {}
    return {hp:hp, armor:{rings:G.rings.length}, edge:G.edgeKind};})()`);
  console.log('    ' + JSON.stringify(hurt));
  ok(!hurt.err, '受傷回饋沒有拋錯', hurt.err);
  ok(hurt.hp && hurt.hp.rings >= 3, '★ 掉血 → 生出紅色衝擊環', hurt.hp && hurt.hp.rings);
  ok(hurt.hp && hurt.hp.pops >= 1, '掉血有飄字', hurt.hp && hurt.hp.pops);
  await sleep(80);
  await p.shot('test/_h584-hurt.png');

  /* ---------- H. 音效逐支播一次（確認不會拋錯） ---------- */
  console.log('\n[G] 84 支音效逐支播放');
  const sfxRes = await p.eval(`(()=>{const Q=window.__BH;
    let n=0, errs=[];
    Q.AudioSys.ensure && Q.AudioSys.ensure();
    (Q.sfxKeys()||[]).forEach(function(k){
      try { Q.AudioSys.sfx(k); n++; } catch(e) { errs.push(k+':'+e.message); }
    });
    return {n:n, errs:errs.slice(0,6), total:(Q.sfxKeys()||[]).length};})()`);
  console.log('    播放 ' + sfxRes.n + ' / ' + sfxRes.total + '  errs=' + JSON.stringify(sfxRes.errs));
  ok(sfxRes.n === sfxRes.total, '★ 84 支全部播得出來（沒有半支拋錯）', [sfxRes.n, sfxRes.total]);

  /* ---------- I. 推鏡 ---------- */
  console.log('\n[H] 鏡頭微推');
  const kick = await p.eval(`(()=>{const Q=window.__BH,G=Q.Game;
    G.camKickX=0; G.camKickY=0; Q.settings.shake=1;
    Q.camKick(0, 2);
    const on={x:+(G.camKickX||0).toFixed(2), y:+(G.camKickY||0).toFixed(2)};
    G.camKickX=0; G.camKickY=0; Q.settings.shake=0;
    Q.camKick(0, 2);
    const off={x:+(G.camKickX||0).toFixed(2), y:+(G.camKickY||0).toFixed(2)};
    Q.settings.shake=1;
    return {on:on, off:off};})()`);
  console.log('    ' + JSON.stringify(kick));
  ok(Math.abs(kick.on.x) > 1, '★ 開了震動 → 鏡頭有被推', kick.on);
  ok(kick.off.x === 0 && kick.off.y === 0, '★ 關了震動 → 完全不推（暈動症友善）', kick.off);

  console.log('\n=== v5.84 主角特效探針：' + pass + ' 通過 / ' + fail + ' 失敗 ===');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
