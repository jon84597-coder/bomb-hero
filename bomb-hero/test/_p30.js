// test/_p30.js —— v5.56 真瀏覽器驗證：四個新模組能不能在真 DOM 上活著
//   ① 載入不報錯、四個全域物件都存在
//   ② 外觀面板能開、項目數對、有鎖住的項目
//   ③ 解鎖：新玩家 → RPG／BR／多人 上鎖；老玩家 → 全開
//   ④ 分享卡：畫布有內容、文字時間正確
const http = require('http');
const fs = require('fs');
const path = require('path');
const CDP = require('./cdp');

const ROOT = path.join(__dirname, '..', '..', 'public');
const PORT = 8791;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml'
};

function serve() {
  return new Promise(function (res) {
    const srv = http.createServer(function (req, res2) {
      let p = decodeURIComponent((req.url || '/').split('?')[0]);
      if (p === '/') p = '/index.html';
      const f = path.normalize(path.join(ROOT, p));
      if (f.indexOf(ROOT) !== 0 || !fs.existsSync(f) || !fs.statSync(f).isFile()) {
        res2.writeHead(404); return res2.end('404');
      }
      res2.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'text/plain' });
      res2.end(fs.readFileSync(f));
    });
    srv.listen(PORT, '127.0.0.1', function () { res(srv); });
  });
}

let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } }

const HOOK = 'window.__errs=[];' +
  'window.addEventListener("error",function(e){window.__errs.push(String(e&&e.message||e))});' +
  'window.addEventListener("unhandledrejection",function(e){window.__errs.push("rej:"+String(e&&e.reason))});';

(async function () {
  const srv = await serve();
  const br = await CDP.launch({ port: 9333, w: 900, h: 720 });
  const p = await br.newPage();
  const URL = 'http://127.0.0.1:' + PORT + '/index.html';

  try {
    await p.send('Page.addScriptToEvaluateOnNewDocument', { source: HOOK });
    await p.goto(URL, 4000);
    await new Promise(function (r) { setTimeout(r, 2500); });

    console.log('\n=== ① 四個模組都在 ===');
    const M = JSON.parse(await p.eval('JSON.stringify({sk:!!window.__BHSkins, ul:!!window.__BHUnlock, sh:!!window.__BHShare, nd:!!window.__BHNotify, bh:!!window.__BH, ver:(window.__BH&&window.__BH.VERSION)||""})') || '{}');
    ok(M.bh, '__BH 主檔有起來');
    ok(M.sk, '__BHSkins 有載入');
    ok(M.ul, '__BHUnlock 有載入');
    ok(M.sh, '__BHShare 有載入');
    ok(M.nd, '__BHNotify 有載入');
    ok(M.ver === '5.58', '版本是 5.58（實際 ' + M.ver + '）');

    console.log('\n=== ② 外觀面板 ===');
    const S = JSON.parse(await p.eval(`(function(){
      try{
        window.__BHSkins.open(true);
        var r=document.getElementById('skinPanel');
        var cache=window.__BHSKIN&&window.__BHSKIN.cache;
        return JSON.stringify({
          on:!!(r&&r.classList.contains('on')),
          items:document.querySelectorAll('#skinPanel .skitem').length,
          locked:document.querySelectorAll('#skinPanel .skitem.lock').length,
          tabs:document.querySelectorAll('#skinPanel .sktab').length,
          cacheKeys:cache?Object.keys(cache):[]
        });
      }catch(e){return JSON.stringify({err:String(e)});}
    })()`) || '{}');
    ok(S.on === true, '面板打得開');
    ok(S.tabs === 3, '三個槽位分頁（實際 ' + S.tabs + '）');
    ok(S.items === 8, '爆風分頁 8 件（實際 ' + S.items + '）');
    ok(S.locked > 0, '有鎖住的項目（實際 ' + S.locked + '）');
    ok(Array.isArray(S.cacheKeys) && S.cacheKeys.indexOf('flame') >= 0, '快取有 flame 欄位');
    ok(Array.isArray(S.cacheKeys) && S.cacheKeys.indexOf('bombStops') >= 0, '快取有 bombStops 欄位');
    await p.eval("window.__BHSkins.open(false)");

    console.log('\n=== ③ 解鎖（新玩家）===');
    await p.eval("localStorage.removeItem('bombhero-stage');localStorage.removeItem('bombhero-unlock-v1');");
    await p.goto(URL, 4000);
    await new Promise(function (r) { setTimeout(r, 2600); });
    const N = JSON.parse(await p.eval(`JSON.stringify({
      rpg:document.getElementById('btnRpg')?document.getElementById('btnRpg').classList.contains('locked'):null,
      br:document.getElementById('btnBR')?document.getElementById('btnBR').classList.contains('locked'):null,
      mp:document.getElementById('btnMulti')?document.getElementById('btnMulti').classList.contains('locked'):null,
      cleared:window.__BHUnlock?window.__BHUnlock.cleared():-1
    })`) || '{}');
    ok(N.cleared === 0, '新玩家已通關 0 關（實際 ' + N.cleared + '）');
    ok(N.rpg === true, 'RPG 上鎖');
    ok(N.br === true, '大逃殺上鎖');
    ok(N.mp === true, '多人對戰上鎖');

    console.log('\n=== ③b 遊客帳號不算老玩家（線上實況模擬）===');
    /* 本機沒有 /api，Cloud 一定是離線的 → ③ 那幾條測不到真正的線上狀態。
       線上每位訪客都會被自動建立遊客帳號（online=true、acc 非 null），
       這正是 v5.56.0 門檻全失效的原因。這裡直接把 Cloud 換成那個狀態。 */
    const G = JSON.parse(await p.eval(`(function(){
      try{
        var C = window.__BH && window.__BH.Cloud, U = window.__BHUnlock;
        if(!C || !U) return JSON.stringify({err:'no Cloud/Unlock'});
        /* 清成新玩家，並讓本機紀錄不干擾 */
        localStorage.setItem('bombhero-stage','1');
        localStorage.removeItem('bombhero-unlock-v1');
        C.online = function(){ return true; };
        C.guest  = function(){ return true; };
        /* 線上全新遊客帳號的真實長相：unlocked 預設就是 1、rpg 全 0 */
        C.acc    = function(){ return {kind:'guest', unlocked:1, rpg:{cleared:0, xp:0}}; };
        U.paint();
        return JSON.stringify({
          rpg:document.getElementById('btnRpg').classList.contains('locked'),
          br:document.getElementById('btnBR').classList.contains('locked'),
          mp:document.getElementById('btnMulti').classList.contains('locked'),
          vet:U.isVeteran(), all:U.state().all
        });
      }catch(e){return JSON.stringify({err:String(e)});}
    })()`) || '{}');
    ok(!G.err, '狀態取得成功' + (G.err ? '（' + G.err + '）' : ''));
    ok(G.vet === false, '自動建立的遊客帳號不算老玩家（unlocked 預設 1 也不算）');
    ok(G.rpg === true && G.br === true && G.mp === true, '遊客 → 三個入口仍然上鎖');
    ok(G.all === 0, '沒有被誤標成「全開」');

    /* 主檔的 homeFill／面板開合會整段重畫首頁 → locked 被洗掉。
       線上就是這樣漏掉的（開一次外觀面板再關，鎖就不見）。輪詢必須補回來。 */
    await p.eval("document.getElementById('btnRpg').classList.remove('locked');document.getElementById('btnBR').classList.remove('locked');");
    await new Promise(function (r) { setTimeout(r, 1500); });
    const RP = JSON.parse(await p.eval(`JSON.stringify({
      rpg:document.getElementById('btnRpg').classList.contains('locked'),
      br:document.getElementById('btnBR').classList.contains('locked')
    })`) || '{}');
    ok(RP.rpg === true && RP.br === true, 'class 被重畫洗掉後，900ms 輪詢會自己補回鎖定');

    const M2 = JSON.parse(await p.eval(`(function(){
      try{
        var C = window.__BH.Cloud, U = window.__BHUnlock;
        C.guest = function(){ return false; };
        C.acc   = function(){ return {kind:'member', rpg:{cleared:0, xp:0}}; };
        U.paint();
        return JSON.stringify({ rpg:document.getElementById('btnRpg').classList.contains('locked'),
                                vet:U.isVeteran(), all:U.state().all });
      }catch(e){return JSON.stringify({err:String(e)});}
    })()`) || '{}');
    ok(M2.vet === true && M2.all === 1, '真的登入的會員 → 判成老玩家、全開');
    ok(M2.rpg === false, '會員 → RPG 入口解鎖');

    console.log('\n=== ④ 解鎖（老玩家）===');
    await p.eval("localStorage.setItem('bombhero-stage','20');localStorage.removeItem('bombhero-unlock-v1');");
    await p.goto(URL, 4000);
    await new Promise(function (r) { setTimeout(r, 2600); });
    const V = JSON.parse(await p.eval(`JSON.stringify({
      rpg:document.getElementById('btnRpg')?document.getElementById('btnRpg').classList.contains('locked'):null,
      br:document.getElementById('btnBR')?document.getElementById('btnBR').classList.contains('locked'):null,
      mp:document.getElementById('btnMulti')?document.getElementById('btnMulti').classList.contains('locked'):null
    })`) || '{}');
    ok(V.rpg === false && V.br === false && V.mp === false, '老玩家三個模式全部解鎖');

    console.log('\n=== ⑤ 分享卡 ===');
    const H = JSON.parse(await p.eval(`(function(){
      try{
        var cv=window.__BHShare.canvas({ms:167000,rank:17,total:238,day:'2026-11-08',stage:'草原',name:'測試員'});
        var g=cv.getContext('2d');
        var d=g.getImageData(0,0,cv.width,cv.height).data;
        var nz=0;
        for(var i=0;i<d.length;i+=4000){ if(d[i+3]>0 && (d[i]+d[i+1]+d[i+2])>60) nz++; }
        var txt=window.__BHShare.text({ms:167000,rank:17,total:238,day:'2026-11-08'});
        return JSON.stringify({w:cv.width,h:cv.height,nz:nz,hasText:txt.indexOf('2:47')>=0});
      }catch(e){return JSON.stringify({err:String(e),nz:0});}
    })()`) || '{}');
    ok(H.w > 0 && H.h > 0, '有畫出畫布（' + H.w + '×' + H.h + '）');
    ok(H.nz > 20, '畫布不是空白（非空取樣 ' + H.nz + '）');
    ok(H.hasText === true, '分享文字裡有正確時間 2:47');

    console.log('\n=== ⑥ 主控台錯誤 ===');
    const errs = JSON.parse(await p.eval('JSON.stringify(window.__errs||[])') || '[]');
    ok(errs.length === 0, '沒有未捕捉的例外（' + errs.length + ' 筆）');
    if (errs.length) errs.slice(0, 4).forEach(function (e) { console.log('     · ' + String(e).slice(0, 160)); });

    try {
      await p.eval("window.__BHSkins.open(true)");
      await new Promise(function (r) { setTimeout(r, 400); });
      await p.shot(path.join(__dirname, '_audit', 'v556-skins.png'));
    } catch (e) {}

  } catch (e) {
    fail++;
    console.log('  ✗ 探針中斷：' + (e && e.message));
  } finally {
    try { await br.close(); } catch (e) {}
    try { srv.close(); } catch (e) {}
  }

  console.log('\n' + (fail ? '❌' : '✅') + ' 探針：' + pass + ' 通過 / ' + fail + ' 失敗');
  process.exit(fail ? 1 : 0);
})();
