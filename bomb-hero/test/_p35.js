// test/_p35.js —— v5.59 線上驗收：玩家資訊卡在真實主機上活著
const path = require('path');
const CDP = require('./cdp');

const URL = 'https://bomb-hero-game.onrender.com/';
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } }

const HOOK = 'window.__errs=[];' +
  'window.addEventListener("error",function(e){window.__errs.push(String(e&&e.message||e))});' +
  'window.addEventListener("unhandledrejection",function(e){window.__errs.push("rej:"+String(e&&e.reason))});';

(async function () {
  const br = await CDP.launch({ port: 9340, w: 900, h: 720 });
  const p = await br.newPage();
  try {
    await p.send('Page.addScriptToEvaluateOnNewDocument', { source: HOOK });
    await p.goto(URL, 8000);
    await new Promise(function (r) { setTimeout(r, 4000); });

    console.log('\n=== ① 模組與版本 ===');
    const M = JSON.parse(await p.eval(`JSON.stringify({
      ver: (window.__BH && window.__BH.VERSION) || '',
      pc: !!window.__BHPlayerCard,
      sel: window.__BHPlayerCard ? window.__BHPlayerCard.SEL.length : 0,
      sp: !!(window.__BH && window.__BH.Social && window.__BH.Social.showPlayer)
    })`) || '{}');
    ok(M.ver === '5.59', '線上版本 5.59（實際 ' + M.ver + '）');
    ok(M.pc === true, 'playercard.js 在線上載入');
    ok(M.sel === 7, '七種名字來源都在（' + M.sel + '）');
    ok(M.sp === true, 'Social.showPlayer 有導出');

    console.log('\n=== ② 線上端點（含隱私白名單）===');
    const E = JSON.parse(await p.eval(`(async function(){
      try{
        /* 先造一個玩家，否則一定 404 */
        var dev = 'p35-' + Math.random().toString(36).slice(2, 12);
        await fetch('/api/auth/guest', {method:'POST', credentials:'same-origin',
          headers:{'Content-Type':'application/json'}, body: JSON.stringify({deviceId: dev})});
        await fetch('/api/social/hb', {method:'POST', credentials:'same-origin',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({deviceId: dev, name:'線上阿爆', gender:'女', region:'香港',
            bio:'線上的自介', kind:'guest', sec:1800, pts:88, wins:1, mode:'大廳', ch:1, tt:1})});
        var r1 = await fetch('/api/player/card?n=' + encodeURIComponent('線上阿爆'), {credentials:'omit'});
        var j1 = await r1.json();
        var r2 = await fetch('/api/player/card?n=' + encodeURIComponent('絕對不存在的名字'), {credentials:'omit'});
        var j2 = await r2.json();
        return JSON.stringify({
          code1: r1.status, ok1: !!(j1 && j1.ok),
          keys: Object.keys(j1 || {}),
          name: j1 && j1.n, pid: j1 && j1.pid,
          bio: j1 && j1.b, region: j1 && j1.r,
          code2: r2.status, err2: (j2 && j2.err) || ''
        });
      }catch(e){ return JSON.stringify({err:String(e)}); }
    })()`) || '{}');
    ok(E.code1 === 200 && E.ok1 === true, '線上 /api/player/card 回 200');
    ok(E.name === '線上阿爆' && !!E.pid, '查得到剛剛造的玩家（pid=' + E.pid + '）');
    ok(E.bio === '線上的自介' && E.region === '香港', '自介與地區都帶出來了');
    const FORBID = ['email', 'username', 'pass', 'ip', 'ips', 'key', 'save', 'secret', 'layout', 'events'];
    const leaked = (E.keys || []).filter(function (k) { return FORBID.indexOf(k) >= 0; });
    ok(leaked.length === 0, '沒有外流任何私欄位（漏了：' + (leaked.join(',') || '無') + '）');
    ok(E.code2 === 404 && E.err2 === 'NOT_FOUND', '查不到的人回 404 NOT_FOUND（實際 ' + E.code2 + '/' + E.err2 + '）');

    console.log('\n=== ③ 真的榜單點得開（靠 pid，不靠名字）===');
    const LB = JSON.parse(await p.eval(`(async function(){
      try{
        var t = await fetch('/api/lb/top?mode=daily&limit=1', {credentials:'omit'}).then(function(r){return r.json();});
        var day = t && t.today;
        var dev = 'p35-lb-' + Math.random().toString(36).slice(2, 12);
        /* 先建社交身分，拿到 pid —— 榜單現在認的是這個 */
        var hb = await fetch('/api/social/hb', {method:'POST', credentials:'same-origin',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({deviceId: dev, dkey: dev, name:'線上榜阿爆', gender:'男',
            region:'台灣', bio:'榜上那個人', kind:'guest', sec:2400, pts:120, wins:2,
            mode:'大廳', ch:2, tt:0})}).then(function(r){return r.json();});
        var pid = (hb && hb.me && hb.me.pid) || '';
        var j = await fetch('/api/lb/submit', {method:'POST', credentials:'omit',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({mode:'daily', day: day, name:'線上榜阿爆', ms: 91000,
            deviceId: dev, pid: pid})}).then(function(r){return r.json();});
        window.__BH.Screen.show('daily');
        if (typeof window.__BH.renderDailyScreen === 'function') window.__BH.renderDailyScreen();
        window.__BH.renderLbList(true);
        return JSON.stringify({ ok: !!(j && j.ok), day: day, pid: pid });
      }catch(e){ return JSON.stringify({err:String(e)}); }
    })()`) || '{}');
    ok(LB.ok === true, '線上送出一筆成績（' + LB.day + '）');
    ok(/^p_[0-9a-f]{10}$/.test(LB.pid || ''), '成績帶著 pid（' + LB.pid + '）');
    await new Promise(function (r) { setTimeout(function () { r(); }, 2500); });
    const RB = JSON.parse(await p.eval(`(function(){
      try{
        var rows = document.querySelectorAll('#lbList .lbrow .nm');
        var hit = null;
        for (var i = 0; i < rows.length; i++) if ((rows[i].textContent||'').trim() === '線上榜阿爆') hit = rows[i];
        if (!hit) return JSON.stringify({found:false, rows:rows.length});
        var row = hit.closest ? hit.closest('.lbrow') : null;
        var dpid = row ? (row.getAttribute('data-pid') || '') : '';
        hit.click();
        return JSON.stringify({ found:true, rows:rows.length, dpid: dpid,
          on: document.getElementById('pcModal').classList.contains('on') });
      }catch(e){ return JSON.stringify({err:String(e)}); }
    })()`) || '{}');
    ok(RB.found === true && RB.on === true, '線上真榜單點名字 → 卡片打開（共 ' + RB.rows + ' 列）');
    ok(/^p_[0-9a-f]{10}$/.test(RB.dpid || ''), '榜單那一列有 data-pid（' + RB.dpid + '）');
    await new Promise(function (r) { setTimeout(function () { r(); }, 1500); });
    const F = JSON.parse(await p.eval(`JSON.stringify({
      name: (document.getElementById('pcName')||{}).textContent || '',
      cells: document.querySelectorAll('#pcGrid .pccell').length,
      note: (document.getElementById('pcNote')||{}).textContent || ''
    })`) || '{}');
    ok(F.name === '線上榜阿爆', '卡片名字正確（' + F.name + '）');
    ok(F.cells >= 2, '有 ' + F.cells + ' 格資料');
    ok(!/查不到/.test(F.note), '沒有誤報查不到');

    console.log('\n=== ④ 七種名字來源都要點得開 ===');
    const SEVEN = JSON.parse(await p.eval(`(function(){
      try{
        var P = window.__BHPlayerCard;
        var cases = [
          ['data-pc',       '<span data-pc="甲一">甲一</span>',                                   '甲一'],
          ['rkname',        '<div class="rkname">乙二</div>',                                      '乙二'],
          ['gwrow',         '<div class="gwrow"><span>3. 丙三</span><span>2:00</span></div>',      '丙三'],
          ['plabel',        '<div id="pkRoster"><span class="plabel">丁四</span></div>',           '丁四'],
          ['onChatWho',     '<div id="onChatWho">與 <b>戊五</b> 的對話</div>',                     '戊五'],
          ['invList',       '<div id="invList"><div class="invrow"><b>己六</b> <button type="button">邀請</button></div></div>', '己六'],
          ['lbrow',         '<div class="lbrow"><span class="rk">🥇</span><span class="nm">庚七</span><span class="tm">1:03</span></div>', '庚七']
        ];
        var out = {};
        cases.forEach(function (c) {
          var host = document.createElement('div');
          host.innerHTML = c[1];
          document.body.appendChild(host);
          var hit = host.querySelector(P.SEL.join(','));
          if (!hit) { out[c[0]] = { miss: true }; host.parentNode.removeChild(host); return; }
          P.close();
          hit.click();
          var on = document.getElementById('pcModal').classList.contains('on');
          var nm = (document.getElementById('pcName')||{}).textContent || '';
          out[c[0]] = { on: on, nm: nm, want: c[2] };
          P.close();
          host.parentNode.removeChild(host);
        });
        /* 週榜的秒數不能開卡 */
        var h2 = document.createElement('div');
        h2.innerHTML = '<div class="gwrow"><span>1. 辛八</span><span>9:99</span></div>';
        document.body.appendChild(h2);
        h2.querySelectorAll('.gwrow > span')[1].click();
        out.ms = { on: document.getElementById('pcModal').classList.contains('on') };
        P.close();
        h2.parentNode.removeChild(h2);
        return JSON.stringify(out);
      }catch(e){ return JSON.stringify({err:String(e)}); }
    })()`) || '{}');
    const KEYS = [['data-pc', '甲一'], ['rkname', '乙二'], ['gwrow', '丙三'], ['plabel', '丁四'],
                  ['onChatWho', '戊五'], ['invList', '己六'], ['lbrow', '庚七']];
    KEYS.forEach(function (k) {
      const r = SEVEN[k[0]] || {};
      ok(r.on === true && r.nm === k[1], k[0] + ' → 卡片打開且名字是「' + k[1] + '」（實際 ' + (r.nm || (r.miss ? '節點沒命中' : '無')) + '）');
    });
    ok((SEVEN.ms || {}).on === false, '週榜點秒數不開卡');

    console.log('\n=== ⑤ 例外 ===');
    const errs = JSON.parse(await p.eval('JSON.stringify(window.__errs||[])') || '[]');
    ok(errs.length === 0, '沒有未捕捉的例外（' + errs.length + ' 筆）');
    if (errs.length) errs.slice(0, 3).forEach(function (e) { console.log('     · ' + String(e).slice(0, 150)); });

    try { await p.shot(path.join(__dirname, '_audit', 'v559-live-card.png')); } catch (e) {}
  } catch (e) {
    fail++; console.log('  ✗ 中斷：' + (e && e.message));
  } finally {
    try { await br.close(); } catch (e) {}
  }
  console.log('\n' + (fail ? '❌' : '✅') + ' 線上：' + pass + ' 通過 / ' + fail + ' 失敗');
  process.exit(fail ? 1 : 0);
})();
