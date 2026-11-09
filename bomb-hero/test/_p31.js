// test/_p31.js —— v5.56 線上驗證（真的打 Render，不是本機檔案）
const path = require('path');
const CDP = require('./cdp');

const URL = 'https://bomb-hero-game.onrender.com/';
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } }

(async function () {
  const br = await CDP.launch({ port: 9334, w: 900, h: 720 });
  const p = await br.newPage();
  try {
    await p.send('Page.addScriptToEvaluateOnNewDocument', {
      source: 'window.__errs=[];window.addEventListener("error",function(e){window.__errs.push(String(e&&e.message||e))});'
    });
    await p.goto(URL, 7000);
    await new Promise(function (r) { setTimeout(r, 4000); });

    const M = JSON.parse(await p.eval(`JSON.stringify({
      ver:(window.__BH&&window.__BH.VERSION)||"",
      sk:!!window.__BHSkins, ul:!!window.__BHUnlock, sh:!!window.__BHShare, nd:!!window.__BHNotify,
      errs:(window.__errs||[]).length
    })`) || '{}');
    ok(M.ver === '5.58', '線上版本 5.58（實際 ' + M.ver + '）');
    ok(M.sk, '外觀模組在線上載入');
    ok(M.ul, '解鎖模組在線上載入');
    ok(M.sh, '分享模組在線上載入');
    ok(M.nd, '提醒模組在線上載入');
    ok(M.errs === 0, '沒有未捕捉例外（' + M.errs + '）');

    const S = JSON.parse(await p.eval(`(function(){
      try{
        window.__BHSkins.open(true);
        var r=document.getElementById('skinPanel');
        var o={on:!!(r&&r.classList.contains('on')),
          items:document.querySelectorAll('#skinPanel .skitem').length,
          tabs:document.querySelectorAll('#skinPanel .sktab').length};
        window.__BHSkins.open(false);
        return JSON.stringify(o);
      }catch(e){return JSON.stringify({err:String(e)});}
    })()`) || '{}');
    ok(S.on === true, '線上外觀面板打得開');
    ok(S.tabs === 3 && S.items === 8, '三個分頁、爆風 8 件（' + S.tabs + '／' + S.items + '）');

    /* 全新 profile ＝ 新玩家：三個進階入口「本來就該鎖」。
       注意線上一定會被自動建一個遊客帳號（/api/auth/guest）→
       isVeteran() 必須認得遊客不算老玩家，否則門檻對所有人都失效（v5.56.1 修的）。 */
    const U1 = JSON.parse(await p.eval(`JSON.stringify({
      rpg:document.getElementById('btnRpg')?document.getElementById('btnRpg').classList.contains('locked'):null,
      br:document.getElementById('btnBR')?document.getElementById('btnBR').classList.contains('locked'):null,
      multi:document.getElementById('btnMulti')?document.getElementById('btnMulti').classList.contains('locked'):null,
      guest:(window.__BH&&window.__BH.Cloud&&typeof window.__BH.Cloud.guest==='function')?!!window.__BH.Cloud.guest():null,
      online:(window.__BH&&window.__BH.Cloud&&typeof window.__BH.Cloud.online==='function')?!!window.__BH.Cloud.online():null
    })`) || '{}');
    ok(U1.online === true && U1.guest === true, '線上確實是自動建立的遊客帳號（online=' + U1.online + ' guest=' + U1.guest + '）');
    ok(U1.rpg === true && U1.br === true && U1.multi === true,
      '新玩家（遊客）三個入口都上鎖（rpg=' + U1.rpg + ' br=' + U1.br + ' multi=' + U1.multi + '）');

    /* 開關外觀面板＝主檔重畫首頁，locked 這個 class 會被洗掉（v5.57 就是這樣漏的）。
       等一輪輪詢，鎖必須自己回來。 */
    await p.eval("window.__BHSkins.open(true)");
    await new Promise(function (r) { setTimeout(r, 500); });
    await p.eval("window.__BHSkins.open(false)");
    await new Promise(function (r) { setTimeout(r, 1700); });
    const W = JSON.parse(await p.eval(`JSON.stringify({
      rpg:document.getElementById('btnRpg')?document.getElementById('btnRpg').classList.contains('locked'):null,
      br:document.getElementById('btnBR')?document.getElementById('btnBR').classList.contains('locked'):null
    })`) || '{}');
    ok(W.rpg === true && W.br === true, '開關外觀面板（首頁被重畫）後鎖仍在（rpg=' + W.rpg + ' br=' + W.br + '）');

    /* 注入老玩家存檔後重載：三個入口必須全開 */
    await p.eval(`localStorage.setItem('bombhero-stage','20')`);
    await p.goto(URL, 7000);
    await new Promise(function (r) { setTimeout(r, 3500); });
    const U2 = JSON.parse(await p.eval(`JSON.stringify({
      rpg:document.getElementById('btnRpg')?document.getElementById('btnRpg').classList.contains('locked'):null,
      br:document.getElementById('btnBR')?document.getElementById('btnBR').classList.contains('locked'):null,
      multi:document.getElementById('btnMulti')?document.getElementById('btnMulti').classList.contains('locked'):null
    })`) || '{}');
    ok(U2.rpg === false && U2.br === false && U2.multi === false,
      '老玩家（有 bombhero-stage）三個入口全開（rpg=' + U2.rpg + ' br=' + U2.br + ' multi=' + U2.multi + '）');

    await p.shot(path.join(__dirname, '_audit', 'v556-live.png')).catch(function () {});
  } catch (e) {
    fail++; console.log('  ✗ 中斷：' + (e && e.message));
  } finally {
    try { await br.close(); } catch (e) {}
  }
  console.log('\n' + (fail ? '❌' : '✅') + ' 線上：' + pass + ' 通過 / ' + fail + ' 失敗');
  process.exit(fail ? 1 : 0);
})();
