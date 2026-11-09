// test/_p34.js —— v5.59 玩家資訊卡：真瀏覽器 + 真後端（跑本機 server.js，含 API）
const path = require('path');
const CDP = require('./cdp');

const URL = 'http://127.0.0.1:3999/index.html';
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } }

const HOOK = 'window.__errs=[];' +
  'window.addEventListener("error",function(e){window.__errs.push(String(e&&e.message||e))});' +
  'window.addEventListener("unhandledrejection",function(e){window.__errs.push("rej:"+String(e&&e.reason))});';

(async function () {
  const br = await CDP.launch({ port: 9339, w: 900, h: 720 });
  const p = await br.newPage();
  try {
    await p.send('Page.addScriptToEvaluateOnNewDocument', { source: HOOK });
    await p.goto(URL, 6000);
    await new Promise(function (r) { setTimeout(r, 3000); });

    console.log('\n=== ① 模組載入 ===');
    const M = JSON.parse(await p.eval(`JSON.stringify({
      pc: !!window.__BHPlayerCard, ver: (window.__BH && window.__BH.VERSION) || '',
      sel: window.__BHPlayerCard ? window.__BHPlayerCard.SEL.length : 0
    })`) || '{}');
    ok(M.pc, 'PlayerCard 模組有載入');
    ok(M.sel >= 6, '有 ' + M.sel + ' 個名字來源選擇器');

    console.log('\n=== ② 造一個真玩家（走真後端）===');
    const C = JSON.parse(await p.eval(`(async function(){
      try{
        var dev = 'p34-' + Math.random().toString(36).slice(2, 12);
        var g = await fetch('/api/auth/guest', {method:'POST', credentials:'same-origin',
          headers:{'Content-Type':'application/json'}, body: JSON.stringify({deviceId: dev})});
        var gj = await g.json();
        var hb = await fetch('/api/social/hb', {method:'POST', credentials:'same-origin',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({deviceId: dev, name:'探針阿爆', gender:'男', region:'台灣',
            bio:'探針寫的自介', kind:'guest', sec:7200, pts:340, wins:2, mode:'大廳', ch:3,
            tt:2, eq:[{i:'🔥'},{i:'💧'}]})});
        var hj = await hb.json();
        /* 存檔（最高關卡／三星／每日最佳）→ 卡片才有 RPG 那一排 */
        return JSON.stringify({ ok: !!(gj && gj.ok), pid: (hj && hj.me && hj.me.pid) || '', name: (hj && hj.me && hj.me.name) || '' });
      }catch(e){ return JSON.stringify({err: String(e)}); }
    })()`) || '{}');
    ok(C.ok === true && C.name === '探針阿爆', '後端建好玩家（pid=' + C.pid + '）');

    console.log('\n=== ③ 榜單上的名字點得開 ===');
    const R = JSON.parse(await p.eval(`(function(){
      try{
        var wrap = document.createElement('div');
        wrap.id = 'p34List';
        wrap.innerHTML = '<div class="lbrow"><span class="rk">1</span><span class="nm">探針阿爆</span><span class="tm">1:23</span></div>';
        document.body.appendChild(wrap);
        var nm = wrap.querySelector('.nm');
        nm.click();
        return JSON.stringify({ opened: !!document.getElementById('pcModal') &&
          document.getElementById('pcModal').classList.contains('on'),
          name: (document.getElementById('pcName')||{}).textContent || '' });
      }catch(e){ return JSON.stringify({err:String(e)}); }
    })()`) || '{}');
    ok(R.opened === true, '點 .lbrow .nm → 卡片打開');
    ok(R.name === '探針阿爆', '卡片標題就是那個名字（實際 ' + R.name + '）');

    await new Promise(function (r) { setTimeout(r, 1200); });
    const F = JSON.parse(await p.eval(`JSON.stringify({
      cells: document.querySelectorAll('#pcGrid .pccell').length,
      grid: document.getElementById('pcGrid') ? document.getElementById('pcGrid').textContent : '',
      meta: document.getElementById('pcMeta') ? document.getElementById('pcMeta').textContent : '',
      eq: document.getElementById('pcEq') ? document.getElementById('pcEq').textContent : '',
      bio: document.getElementById('pcBio') ? document.getElementById('pcBio').textContent : '',
      more: !!document.getElementById('pcMore'),
      copy: !!document.getElementById('pcCopy'),
      note: document.getElementById('pcNote') ? document.getElementById('pcNote').textContent : ''
    })`) || '{}');
    ok(F.cells >= 4, '資料格有 ' + F.cells + ' 格（等級／遊玩／成就分／冠軍／來自…）');
    ok(/7200|2/.test(F.grid) || F.grid.length > 0, '格子裡有內容');
    ok(/在線/.test(F.meta), '標題列有「在線」（實際 ' + F.meta + '）');
    ok(/🔥/.test(F.eq), '配戴成就畫出來了');
    ok(/探針寫的自介/.test(F.bio), '自介有顯示');
    ok(F.more === true && F.copy === true, '兩顆按鈕都在（看完整資料／複製名字）');
    ok(!F.note || !/查不到/.test(F.note), '沒有誤報「查不到」');

    console.log('\n=== ④ 查不到的人 ===');
    await p.eval("window.__BHPlayerCard.close()");
    const N = JSON.parse(await p.eval(`(function(){
      try{
        var wrap = document.getElementById('p34List');
        wrap.innerHTML = '<div class="lbrow"><span class="rk">1</span><span class="nm">絕對不存在的名字</span></div>';
        wrap.querySelector('.nm').click();
        return JSON.stringify({on: document.getElementById('pcModal').classList.contains('on')});
      }catch(e){ return JSON.stringify({err:String(e)}); }
    })()`) || '{}');
    ok(N.on === true, '查不到的人也會開卡（不是靜靜沒反應）');
    await new Promise(function (r) { setTimeout(r, 1500); });
    const NT = await p.eval("(document.getElementById('pcNote')||{}).textContent || ''");
    ok(/查不到/.test(NT), '有明確說「查不到」（實際：' + NT.slice(0, 30) + '）');

    console.log('\n=== ⑤ 名字剝皮（週榜 "1. 名字"／HUD 標記）===');
    const P2 = JSON.parse(await p.eval(`(function(){
      try{
        var P = window.__BHPlayerCard;
        var a = document.createElement('span'); a.textContent = '1. 阿爆';
        var b = document.createElement('span'); b.textContent = '🤖 電腦二號';
        var c = document.createElement('span'); c.textContent = '  阿爆  ';
        return JSON.stringify({ a: P.pickName(a), b: P.pickName(b), c: P.pickName(c) });
      }catch(e){ return JSON.stringify({err:String(e)}); }
    })()`) || '{}');
    ok(P2.a === '阿爆', '週榜的「1. 阿爆」→「阿爆」（實際 ' + P2.a + '）');
    ok(P2.b === '電腦二號', 'HUD 的「🤖 電腦二號」→「電腦二號」（實際 ' + P2.b + '）');
    ok(P2.c === '阿爆', '前後空白會修掉');

    console.log('\n=== ⑤b 每週榜只認第一格（第二格是秒數）===');
    const GW = JSON.parse(await p.eval(`(function(){
      try{
        var P = window.__BHPlayerCard;
        P.close();
        var wrap = document.createElement('div');
        wrap.className = 'gwlist';
        wrap.innerHTML = '<div class="gwrow"><span>1. 週榜阿爆</span><span>1:23</span></div>';
        document.body.appendChild(wrap);
        var sp = wrap.querySelectorAll('.gwrow > span');
        sp[1].click();                                   /* 點秒數 */
        var afterMs = document.getElementById('pcModal').classList.contains('on');
        sp[0].click();                                   /* 點名字 */
        var afterName = document.getElementById('pcModal').classList.contains('on');
        var got = (document.getElementById('pcName')||{}).textContent || '';
        P.close();
        /* 空榜：那一格是提示語，不是人 */
        var wrap2 = document.createElement('div');
        wrap2.innerHTML = '<div class="gwrow"><span>本週還沒有人上榜</span><span></span></div>';
        document.body.appendChild(wrap2);
        wrap2.querySelector('.gwrow > span').click();
        var afterEmpty = document.getElementById('pcModal').classList.contains('on');
        P.close();
        wrap.parentNode.removeChild(wrap);
        wrap2.parentNode.removeChild(wrap2);
        return JSON.stringify({ afterMs: afterMs, afterName: afterName, got: got, afterEmpty: afterEmpty });
      }catch(e){ return JSON.stringify({err:String(e)}); }
    })()`) || '{}');
    ok(GW.afterMs === false, '點週榜的秒數（1:23）不會開卡片');
    ok(GW.afterName === true && GW.got === '週榜阿爆', '點週榜的名字 → 卡片打開且名字正確（' + GW.got + '）');
    ok(GW.afterEmpty === false, '空榜的「本週還沒有人上榜」不會被當成人名');

    console.log('\n=== ⑥ 不搶別人的點擊 ===');
    const K = JSON.parse(await p.eval(`(function(){
      try{
        window.__BHPlayerCard.close();
        /* Social 名單列自己有點擊行為 → 不該跳出卡片 */
        var row = document.createElement('div');
        row.className = 'onrow';
        row.setAttribute('data-pid','p_x');
        row.innerHTML = '<div class="onname">名單裡的人</div>';
        document.body.appendChild(row);
        row.querySelector('.onname').click();
        var opened = document.getElementById('pcModal').classList.contains('on');
        row.parentNode.removeChild(row);
        return JSON.stringify({ opened: opened });
      }catch(e){ return JSON.stringify({err:String(e)}); }
    })()`) || '{}');
    ok(K.opened === false, 'Social 名單列不會被卡片搶走（那裡本來就開完整資料頁）');

    console.log('\n=== ⑥b 真的榜單（不是自己捏的 DOM）===');
    const LB = JSON.parse(await p.eval(`(async function(){
      try{
        var t = await fetch('/api/lb/top?mode=daily&limit=1', {credentials:'omit'}).then(function(r){return r.json();});
        var day = t && t.today;
        var name = '榜上阿爆';
        var dev = 'p34-lb-' + Math.random().toString(36).slice(2, 12);
        /* 真的玩家會同時有心跳紀錄與榜單成績 → 這裡照著做，pid 才有東西可查 */
        await fetch('/api/auth/guest', {method:'POST', credentials:'same-origin',
          headers:{'Content-Type':'application/json'}, body: JSON.stringify({deviceId: dev})});
        var hj = await fetch('/api/social/hb', {method:'POST', credentials:'same-origin',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({deviceId: dev, name: name, gender:'男', region:'台灣',
            kind:'guest', sec:5400, pts:210, wins:2, mode:'大廳', ch:2, tt:2})}).then(function(r){return r.json();});
        var pid = (hj && hj.me && hj.me.pid) || '';
        var j = await fetch('/api/lb/submit', {method:'POST', credentials:'omit',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({mode:'daily', day: day, name: name, ms: 83000, deviceId: dev, pid: pid})}).then(function(r){return r.json();});
        /* renderLbList 只在「每日挑戰」畫面上才會鋪（Screen.current !== 'daily' 直接 return） */
        window.__BH.Screen.show('daily');
        if (typeof window.__BH.renderDailyScreen === 'function') window.__BH.renderDailyScreen();
        window.__BH.renderLbList(true);
        return JSON.stringify({ ok: !!(j && j.ok), day: day, name: name, pid: pid,
          scr: window.__BH.Screen.current });
      }catch(e){ return JSON.stringify({err:String(e)}); }
    })()`) || '{}');
    ok(LB.ok === true && LB.scr === 'daily' && !!LB.pid, '送出一筆真成績（帶 pid）並切到每日榜（' + LB.day + '）');
    await new Promise(function (r) { setTimeout(function () { r(); }, 1600); });
    const RB = JSON.parse(await p.eval(`(function(){
      try{
        var rows = document.querySelectorAll('#lbList .lbrow .nm');
        var hit = null;
        for (var i = 0; i < rows.length; i++) if ((rows[i].textContent||'').trim() === '榜上阿爆') hit = rows[i];
        if (!hit) return JSON.stringify({found:false, rows:rows.length});
        window.__BHPlayerCard.close();
        hit.click();
        return JSON.stringify({ found:true, rows:rows.length,
          on: document.getElementById('pcModal').classList.contains('on'),
          name: (document.getElementById('pcName')||{}).textContent || '' });
      }catch(e){ return JSON.stringify({err:String(e)}); }
    })()`) || '{}');
    ok(RB.found === true && RB.on === true, '在真的每日榜上點到名字 → 卡片打開（榜上共 ' + RB.rows + ' 列）');
    ok(RB.name === '榜上阿爆', '卡片顯示的是榜上那個名字（實際 ' + RB.name + '）');
    await new Promise(function (r) { setTimeout(function () { r(); }, 1400); });
    const RF = JSON.parse(await p.eval(`JSON.stringify({
      rowPid: (function(){ var r=document.querySelector('#lbList .lbrow[data-pid]'); return r?r.getAttribute('data-pid'):''; })(),
      cells: document.querySelectorAll('#pcGrid .pccell').length,
      grid: (document.getElementById('pcGrid')||{}).textContent || '',
      note: (document.getElementById('pcNote')||{}).textContent || ''
    })`) || '{}');
    ok(/^p_[0-9a-f]{10}$/.test(RF.rowPid || ''), '榜單那一列真的有 data-pid（' + RF.rowPid + '）');
    ok(RF.cells >= 3, '卡片有 ' + RF.cells + ' 格真資料（靠 pid 查到的，不是靠名字比對）');
    ok(!/查不到/.test(RF.note), '沒有誤報「查不到」');
    await p.eval("window.__BHPlayerCard.close()");

    console.log('\n=== ⑦ 主控台錯誤 ===');
    const errs = JSON.parse(await p.eval('JSON.stringify(window.__errs||[])') || '[]');
    ok(errs.length === 0, '沒有未捕捉的例外（' + errs.length + ' 筆）');
    if (errs.length) errs.slice(0, 4).forEach(function (e) { console.log('     · ' + String(e).slice(0, 160)); });

    /* 留一張截圖給人看 */
    try {
      await p.eval(`(function(){
        var wrap = document.getElementById('p34List');
        if (wrap) wrap.innerHTML = '<div class="lbrow"><span class="rk">🏅</span><span class="nm">探針阿爆</span><span class="tm">1:23</span></div>';
        if (wrap) wrap.querySelector('.nm').click();
      })()`);
      await new Promise(function (r) { setTimeout(r, 1600); });
      await p.shot(path.join(__dirname, '_audit', 'v559-playercard.png'));
    } catch (e) {}

  } catch (e) {
    fail++; console.log('  ✗ 中斷：' + (e && e.message));
  } finally {
    try { await br.close(); } catch (e) {}
  }
  console.log('\n' + (fail ? '❌' : '✅') + ' 探針：' + pass + ' 通過 / ' + fail + ' 失敗');
  process.exit(fail ? 1 : 0);
})();
