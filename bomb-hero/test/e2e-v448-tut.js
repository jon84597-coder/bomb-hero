// v4.48 新手教學：實機流程 E2E（真的把 12 步走完）
const path = require('path');
const { launch, sleep } = require('./cdp');
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

let pass = 0, fail = 0;
function ok(c, n, extra) { if (c) { pass++; console.log('  ✓ ' + n + (extra ? '（' + extra + '）' : '')); } else { fail++; console.log('  ✗ FAIL: ' + n + (extra ? '（' + extra + '）' : '')); } }

(async () => {
  const b = await launch({ port: 9577, w: 1200, h: 900 });
  try {
    const p = await b.newPage();
    await p.goto(URL, 2500);
    for (let i = 0; i < 60; i++) { if (await p.eval('!!(window.__BH && window.__BH.Tut)')) break; await sleep(200); }
    await p.eval("try{localStorage.setItem('bombhero-rotskip','1');}catch(e){}");

    const step = () => p.eval('window.__BH.Tut.step');
    const part = () => p.eval('window.__BH.Tut.part');
    const title = () => p.eval("document.getElementById('tutTitle').textContent");
    const setTile = (x, y) => p.eval(`(function(){var G=window.__BH.Game,T=G.T,p=G.players[0];p.x=${x}*T+T/2;p.y=${y}*T+T/2;p.slide=null;p.warpLock='';})()`);

    console.log('=== 0. 入口與首頁導覽 ===');
    await p.eval("document.getElementById('btnLearn').click()");
    await sleep(400);
    ok(await p.eval("window.__BH.Screen.current==='learn'"), '點「新手教學」進教學主頁');
    const chN = await p.eval("window.__BH.Tut.CH.length");
    ok(await p.eval("document.querySelectorAll('#learnChapters details').length===" + chN),
      '功能總覽 ' + chN + ' 章都渲染出來');
    await p.eval("document.getElementById('btnTourAll').click()");
    await sleep(700);
    ok(await part() === 'home', '開始首頁導覽');
    ok(await p.eval("document.getElementById('tutMask').classList.contains('on')"), '遮罩已打開');
    const hole = await p.eval("(function(){var r=document.getElementById('tutHole').getBoundingClientRect();return [Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)];})()");
    ok(hole[2] > 20 && hole[3] > 10, '聚光燈有對準元素', hole.join(','));
    const hn = await p.eval('window.__BH.Tut.HOME.length');
    for (let k = 0; k < hn; k++) { await p.eval("document.getElementById('tutNext').click()"); await sleep(300); }
    ok(await part() === 'play', '導覽走完自動接實戰演練');
    await sleep(800);

    console.log('\n=== 1~12 步實戰 ===');
    ok(await step() === 0 && (await title()).indexOf('走動') >= 0, '第 1 步：走動');
    await setTile(2, 1);
    await sleep(1200);
    ok(await step() === 1, '走到 (2,1) → 進第 2 步', await title());

    await p.eval("(function(){var BH=window.__BH,G=BH.Game;BH.placeBomb(G.players[0]);})()");
    await sleep(1100);
    ok(await step() === 2, '放炸彈 → 進第 3 步（快跑）', await title());

    await setTile(2, 3);
    await sleep(3000);
    ok(await step() >= 3, '爆炸後（人在安全處）→ 進第 4 步', await title());

    // 第 4 步：站在 (3,1) 放彈炸開 (4,1) 的軟磚，放完立刻退開
    await setTile(3, 1);
    await sleep(250);
    await p.eval("(function(){var BH=window.__BH,G=BH.Game;BH.placeBomb(G.players[0]);})()");
    await sleep(250);
    await setTile(1, 3);
    await sleep(4200);
    ok(await p.eval("window.__BH.Game.grid[1][4]===0"), '木箱被炸開');
    ok(await p.eval("window.__BH.Game.players[0].alive===true"), '玩家安全（沒被自己的炸彈炸到）');
    ok(await step() === 4, '炸開軟磚 → 進第 5 步（撿道具）', await title());

    // 第 5 步：走過去撿火力
    await setTile(4, 1);
    await sleep(1600);
    ok(await p.eval("window.__BH.Game.players[0].power>=2"), '撿到火力（power=' + (await p.eval("window.__BH.Game.players[0].power")) + '）');
    ok(await step() === 5, '撿道具 → 進第 6 步（看狀態列）', await title());
    ok(await p.eval("document.getElementById('gameTop').classList.contains('tutglow')"), '狀態列有發光提示');

    await p.eval("document.getElementById('tutNext').click()");
    await sleep(500);
    ok(await step() === 6, '進第 7 步（放大縮小）');

    // 第 7 步：縮放（使用者反映「很多人不知道可以縮放」）
    await p.eval("window.__BH.Zoom.by(0.14)");
    await sleep(1400);
    ok(Math.abs(await p.eval("window.__BH.Game.zoomTarget - 1")) > .02,
      '畫面已縮放（' + (await p.eval("Math.round(window.__BH.Game.zoomTarget*100)")) + '%）');
    ok(await step() === 7, '縮放 → 進第 8 步（踢彈）', await title());
    await p.eval("window.__BH.Zoom.reset()");
    await sleep(400);
    ok(await p.eval("window.__BH.Game.players[0].kick===true"), '自動送踢彈鞋');

    // 踢彈：炸彈放 (3,1)、人站 (2,1) 往右踢
    await setTile(3, 1);
    await sleep(250);
    await p.eval("(function(){var BH=window.__BH,G=BH.Game;BH.placeBomb(G.players[0]);})()");
    await sleep(250);
    await setTile(2, 1);
    await sleep(250);
    const kicked = await p.eval("(function(){var BH=window.__BH,G=BH.Game;return BH.kickBomb(G.players[0],'right');})()");
    ok(kicked === true, '踢彈函式回 true');
    await sleep(1400);
    ok(await step() === 8, '踢走炸彈 → 進第 9 步（遙控）', await title());
    ok(await p.eval("window.__BH.Game.players[0].remote===true"), '自動送遙控器');

    // 遙控：放一顆，走遠，引爆
    await p.eval("(function(){var BH=window.__BH,G=BH.Game;BH.placeBomb(G.players[0]);})()");
    await sleep(200);
    await setTile(1, 3);
    await sleep(400);
    await p.eval("window.__BH.detonateRemote(window.__BH.Game.players[0])");
    await sleep(1300);
    ok(await step() === 9, '引爆 → 進第 10 步（手套搬彈）', await title());

    // 第 10 步：手套搬彈穿牆（使用者反映「沒教到」）
    ok(await p.eval("window.__BH.Game.players[0].glove===true"), '自動送搬彈手套');
    ok(await p.eval("window.__BH.Game.bombs.length>=1"), '腳下已先放好一顆可撿的炸彈');
    const pick = await p.eval("(function(){var B=window.__BH,p=B.Game.players[0];" +
      "var okp=B.tryGlovePickup(p);return JSON.stringify({ok:okp,carry:!!p.carry});})()");
    ok(/"ok":true/.test(pick) && /"carry":true/.test(pick), '撿起炸彈', pick);
    await p.eval("window.__BH.throwCarried(window.__BH.Game.players[0])");
    await sleep(1400);
    ok(await step() === 10, '丟出炸彈 → 進第 11 步（打小怪）', await title());
    ok(await p.eval("window.__BH.Game.players[0].glove===false && window.__BH.Game.players[0].remote===false"),
      '教學道具已收回（炸彈恢復 2.4 秒自爆）');
    ok(await p.eval("window.__BH.Game.enemies.length>=1"), '場上有小怪');

    // 打怪：直接把小怪標記死亡，讓主迴圈清掉
    await p.eval("(function(){var G=window.__BH.Game;G.enemies.forEach(function(e){e.dead=true;});})()");
    await sleep(1400);
    ok(await step() === 11, '炸掉小怪 → 進第 12 步（找出口）', await title());

    // 找門：把 (10,8) 的軟磚炸開
    await p.eval("(function(){var G=window.__BH.Game;G.grid[8][10]=0;if(G.hidden['8,10']==='door'){delete G.hidden['8,10'];G.door.revealed=true;}})()");
    await sleep(1300);
    ok(await step() === 12, '找到出口 → 進第 13 步（走進門）', await title());

    // 走進門：直接呼叫門的判定（模擬玩家踩到門）
    await p.eval("(function(){var G=window.__BH.Game,T=G.T,p=G.players[0];p.x=G.door.x*T+T/2;p.y=G.door.y*T+T/2;})()");
    await sleep(1500);
    ok(await step() === 13, '走進門 → 進最後一步（完成）', await title());
    ok(await p.eval("window.__BH.Game.state==='play'"), '教學中不會進結算畫面');
    await p.shot(path.join(__dirname, '_v448', 'e2e-end.png'));

    // 按下「開始第 1 關」
    await p.eval("document.getElementById('tutNext').click()");
    await sleep(1500);
    ok(await p.eval("window.__BH.Screen.current==='game'"), '按「開始第 1 關」進正式遊戲');
    ok(await p.eval("window.__BH.Game.mode==='solo' && (window.__BH.Game.stage===1)"), '進的是第 1 關');
    ok(await p.eval("JSON.parse(localStorage.getItem('bombhero-tut2')||'{}').play===1"), '完成狀態已記錄');

    // 回首頁：按鈕要立刻變「已完成」外觀（不能等重新整理）
    await p.eval("window.__BH.Screen.show('title')");
    await sleep(500);
    const look = await p.eval("(function(){var b=document.getElementById('btnLearn');var t=document.getElementById('learnTag');" +
      "var s=b.querySelector('small');return JSON.stringify({tagHide:t?t.classList.contains('hide'):null," +
      "sub:s?s.textContent:'',pulse:b.classList.contains('newbie')});})()");
    ok(/"tagHide":true/.test(look) && /想複習再玩一次/.test(look) && /"pulse":false/.test(look),
      '回首頁：推薦標籤收起、副標改為已完成', look);

    ok(await p.eval("(window.__BHB.errs||[]).length===0"), '整段流程沒有 JS 錯誤');

    console.log('\n========================================');
    console.log('通過 ' + pass + ' / 失敗 ' + fail);
    process.exitCode = fail ? 1 : 0;
  } catch (e) {
    console.error('ERR', e && e.message || e);
    process.exitCode = 1;
  } finally {
    b.close();
  }
})();
