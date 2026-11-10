// test/_sound585.js —— v5.85 真瀏覽器探針：六格可聽半徑
//   A. 單人關卡：旁邊的炸彈要播、12 格外的要靜音（座標固定，不靠隨機地圖）
//   B. 大逃殺：100 人 AI 跑幾秒，遠處炸彈一律靜音、沒有 JS 錯誤
const { launch, sleep } = require('./cdp.js');
const U = 'http://127.0.0.1:3122/';

let pass = 0, fail = 0;
function ok(c, m, x) {
  if (c) { pass++; console.log('  ✓ ' + m + (x === undefined ? '' : ' → ' + JSON.stringify(x))); }
  else { fail++; console.log('  ✗ FAIL: ' + m + (x === undefined ? '' : ' → ' + JSON.stringify(x))); }
}

(async () => {
  const b = await launch({ w: 1280, h: 900, port: 9531, args: ['--no-proxy-server', '--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage();
  await p.goto(U + '?x=' + Date.now(), 900);
  await p.eval(`(()=>{try{localStorage.clear()}catch(e){};return 1})()`);
  await p.goto(U + '?dev=1&x=' + Date.now(), 2600);
  for (let i = 0; i < 14; i++) { if (await p.eval(`(()=>!!window.__BH)()`)) break; await sleep(400); }
  await sleep(900);

  console.log('\n=== A. 單人：近的播、遠的靜音 ===');
  await p.eval(`(()=>{const Q=window.__BH; Q.settings.sfx=1; Q.settings.soloDiff='normal'; Q.startSolo(3,false,false); return 1})()`);
  await sleep(1100);
  await p.eval(`(()=>{const b=document.querySelector('#ovBox button'); if(b)b.click(); return 1})()`);
  await sleep(3600);
  const solo = await p.eval(`(()=>{const Q=window.__BH,G=Q.Game,A=Q.AudioSys,T=G.T;
    G.enemies.length=0; G.players[0].invuln=9999;
    const me=G.players[0];
    me.x=2.5*T; me.y=2.5*T;                       // 固定在左上角，遠格一定在地圖內
    const cx=2, cy=2, fx=Math.min(G.cols-2, 15), fy=Math.min(G.rows-2, 13);
    const mk=function(x,y){return {cx:x,cy:y,px:(x+.5)*T,py:(y+.5)*T,power:1,owner:me,
      passers:[],held:false,age:2,timer:0,seed:1};};
    const out={cell:[cx,cy,fx,fy], dist:+Math.hypot((fx-cx),(fy-cy)).toFixed(2)};
    A.sndReset(); Q.explodeBomb(mk(cx+1,cy)); out.near=A.sndStats();
    A.sndReset(); Q.explodeBomb(mk(fx,fy)); out.far=A.sndStats();
    out.errs=(window.__BHB&&window.__BHB.errs||[]).length;
    return out;})()`);
  console.log('  格: ' + JSON.stringify(solo.cell) + '　直線距離 ' + solo.dist + ' 格');
  console.log('  近: ' + JSON.stringify(solo.near) + '　遠: ' + JSON.stringify(solo.far));
  ok(solo.near.played >= 1, '★ 旁邊那顆炸彈有播', solo.near);
  ok(solo.dist > 6, '測試用的遠格真的超過 6 格', solo.dist);
  ok(solo.far.dropped >= 1 && solo.far.played === 0, '★ 遠格那顆完全沒播', solo.far);
  ok(solo.errs === 0, '單人關卡沒有 JS 錯誤', solo.errs);
  await p.shot('test/_s585-solo.png');

  console.log('\n=== B. 大逃殺：100 人 ===');
  const br = await p.eval(`(()=>{const Q=window.__BH,G=Q.Game;
    try { Q.startBR(); } catch(e) { return {err:String(e)}; }
    return {mode:G.mode, n:(G.players||[]).length};})()`);
  console.log('  開場: ' + JSON.stringify(br));
  await sleep(1200);
  await p.eval(`(()=>{const b=document.querySelector('#ovBox button'); if(b)b.click(); return 1})()`);
  await sleep(900);

  // B1：確定性 —— 在離本地玩家很遠的格子擺 6 顆並引爆，全部應該靜音
  const far = await p.eval(`(()=>{const Q=window.__BH,G=Q.Game,A=Q.AudioSys,T=G.T;
    const me=G.players[0];
    const ccx=Math.floor(me.x/T), ccy=Math.floor(me.y/T);
    A.sndReset();
    let made=0, minD=99;
    for (let i=0;i<6;i++) {
      const fx=Math.min(G.cols-2, ccx + 8 + i), fy=Math.min(G.rows-2, ccy + 6);
      const d=Math.hypot(fx-ccx, fy-ccy);
      if (d < minD) minD=d;
      const bb={cx:fx,cy:fy,px:(fx+.5)*T,py:(fy+.5)*T,power:1,owner:me,
                passers:[],held:false,age:2,timer:0,seed:i};
      try { Q.explodeBomb(bb); made++; } catch(e) {}
    }
    return {made:made, minDist:+minD.toFixed(2), stats:A.sndStats()};})()`);
  console.log('  遠處引爆 6 顆: ' + JSON.stringify(far));
  ok(far.made === 6, '6 顆都真的爆了', far.made);
  ok(far.minDist > 6, '最近的也在 6 格外', far.minDist);
  ok(far.stats.dropped === 6 && far.stats.played === 0, '★ 6 顆全部靜音（大逃殺的核心需求）', far.stats);

  // B2：讓 AI 自己跑 6 秒，確認沒有錯誤
  await p.eval(`(()=>{const Q=window.__BH; Q.AudioSys.sndReset(); return 1})()`);
  await sleep(6000);
  const bs = await p.eval(`(()=>{const Q=window.__BH,G=Q.Game;
    return { stats:Q.AudioSys.sndStats(),
             players:(G.players||[]).length,
             alive:(G.players||[]).filter(p=>p.alive).length,
             errors:(window.__BHB&&window.__BHB.errs||[]).length };})()`);
  console.log('  6 秒統計: ' + JSON.stringify(bs));
  ok(bs.errors === 0, '大逃殺跑 6 秒沒有 JS 錯誤', bs.errors);
  ok(bs.alive > 1, '場上還有人活著（遊戲有在跑）', bs.alive);
  await p.shot('test/_s585-br.png');

  console.log('\n結果：' + pass + ' 通過 / ' + (pass + fail) + ' 項' + (fail ? '（' + fail + ' 失敗）' : ''));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
