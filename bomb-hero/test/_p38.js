// test/_p38.js —— v5.61：玩家資料的「加入時間」是真日期（真的瀏覽器 + 真的後端）
//   v5.59/5.60 的時候每個人都是 1969/12/16，這支專門守著這件事不再發生。
const path = require('path');
const CDP = require('./cdp');

const URL = 'http://127.0.0.1:3999/index.html';
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } }

const HOOK = 'window.__errs=[];' +
  'window.addEventListener("error",function(e){window.__errs.push(String(e&&e.message||e))});' +
  'window.addEventListener("unhandledrejection",function(e){window.__errs.push("rej:"+String(e&&e.reason))});';

/* 跟程式裡一樣的格式，用來算期望值（用本地時區，玩家看到的是他那一天） */
function ymd(ms) {
  const d = new Date(ms);
  const q = function (n) { return (n < 10 ? '0' : '') + n; };
  return d.getFullYear() + '/' + q(d.getMonth() + 1) + '/' + q(d.getDate());
}

(async function () {
  const br = await CDP.launch({ port: 9341, w: 900, h: 720 });
  const p = await br.newPage();
  try {
    await p.send('Page.addScriptToEvaluateOnNewDocument', { source: HOOK });
    await p.goto(URL, 6000);
    await new Promise(function (r) { setTimeout(r, 3000); });

    console.log('\n=== ① 版本與模組 ===');
    const M = JSON.parse(await p.eval(`JSON.stringify({
      ver: (window.__BH && window.__BH.VERSION) || '',
      pc: !!window.__BHPlayerCard, soc: !!(window.__BH && window.__BH.Social)
    })`) || '{}');
    ok(M.pc, '玩家資訊卡模組在');
    ok(M.soc, 'Social（完整資料頁）在');
    ok(parseFloat(M.ver) >= 5.61, '版本 ≥ 5.61（實際 ' + M.ver + '）');

    console.log('\n=== ② 剛建的玩家：卡片上的「加入」是今天 ===');
    const C = JSON.parse(await p.eval(`(async function(){
      try{
        var dev = 'p38-' + Math.random().toString(36).slice(2, 12);
        await fetch('/api/auth/guest', {method:'POST', credentials:'same-origin',
          headers:{'Content-Type':'application/json'}, body: JSON.stringify({deviceId: dev})});
        var hb = await fetch('/api/social/hb', {method:'POST', credentials:'same-origin',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({deviceId: dev, name:'時間阿爆', gender:'男', region:'台灣',
            bio:'', kind:'guest', sec:1200, pts:50, wins:0, mode:'大廳', ch:1, tt:-1, eq:[]})});
        var hj = await hb.json();
        return JSON.stringify({ ok: !!(hj && hj.ok), pid: (hj && hj.me && hj.me.pid) || '' });
      }catch(e){ return JSON.stringify({err: String(e)}); }
    })()`) || '{}');
    ok(C.ok === true && /^p_/.test(C.pid || ''), '後端建好玩家（pid=' + C.pid + '）');

    const R = JSON.parse(await p.eval(`(function(){
      try{
        var wrap = document.createElement('div');
        wrap.innerHTML = '<div class="lbrow"><span class="rk">1</span><span class="nm">時間阿爆</span><span class="tm">1:23</span></div>';
        document.body.appendChild(wrap);
        wrap.querySelector('.nm').click();
        return JSON.stringify({ opened: !!document.getElementById('pcModal') &&
          document.getElementById('pcModal').classList.contains('on') });
      }catch(e){ return JSON.stringify({err:String(e)}); }
    })()` ) || '{}');
    ok(R.opened === true, '卡片打開了');

    /* 卡片是異步抓資料，等它回來 */
    await new Promise(function (r) { setTimeout(r, 1500); });
    const CARD = JSON.parse(await p.eval(`(function(){
      try{
        var cells = document.querySelectorAll('#pcGrid .pccell');
        var out = { n: cells.length, join: '', labels: [] };
        for (var i = 0; i < cells.length; i++) {
          var lb = (cells[i].textContent || '').trim().slice(0, 2);
          out.labels.push(lb);
          if (lb.indexOf('加入') === 0) out.join = (cells[i].querySelector('b') || {}).textContent || '';
        }
        return JSON.stringify(out);
      }catch(e){ return JSON.stringify({err:String(e)}); }
    })()`) || '{}');
    ok(CARD.n >= 4, '卡片有 ' + CARD.n + ' 格資料');
    ok(/^\d{4}\/\d{2}\/\d{2}$/.test(CARD.join || ''), '「加入」是固定日期格式（實際「' + CARD.join + '」）');
    ok(CARD.join === ymd(Date.now()), '剛建的玩家 → 加入日就是今天（' + CARD.join + '）');
    ok(!/1969|1970/.test(CARD.join || ''), '不是 1969／1970（這是原本的 bug）');
    ok(!/前$/.test(CARD.join || ''), '不是「3 天前」這種相對時間');

    console.log('\n=== ③ 點「看完整資料」→ 詳細頁的加入時間 ===');
    const D = JSON.parse(await p.eval(`(function(){
      try{
        var b = document.getElementById('pcMore');
        if (!b) return JSON.stringify({err:'no #pcMore'});
        b.click();
        var cells = document.querySelectorAll('.ondetail .odcell');
        var join = '', all = [];
        for (var i = 0; i < cells.length; i++) {
          var t = (cells[i].textContent || '').trim();
          all.push(t.slice(0, 12));
          if (t.indexOf('加入時間') === 0) join = (cells[i].querySelector('b') || {}).textContent || '';
        }
        return JSON.stringify({ join: join, n: cells.length, detail: !!document.querySelector('.ondetail') });
      }catch(e){ return JSON.stringify({err:String(e)}); }
    })()`) || '{}');
    ok(D.detail === true, '進到完整資料頁（' + D.n + ' 格）');
    ok(D.join === ymd(Date.now()), '加入時間是今天，不是 1969（實際「' + D.join + '」）');
    ok(/^\d{4}\/\d{2}\/\d{2}$/.test(D.join || ''), '格式是 YYYY/MM/DD');

    console.log('\n=== ④ 指定一個明確時間戳：必須原樣顯示 ===');
    const FIX = 1793901858654;   /* 2026-11-05 18:04 UTC */
    const S = JSON.parse(await p.eval(`(function(){
      try{
        var S = window.__BH.Social;
        S.showPlayer({ pid:'p_0123456789', n:'固定時間', k:'guest', ch:1, g:'男', r:'台灣',
          join: ${FIX}, seen: ${FIX}, sec: 600, pts: 0, wins: 0, mode:'大廳', avt: 0, eq: [], tt: -1 });
        var cells = document.querySelectorAll('.ondetail .odcell');
        var join = '';
        for (var i = 0; i < cells.length; i++) {
          var t = (cells[i].textContent || '').trim();
          if (t.indexOf('加入時間') === 0) join = (cells[i].querySelector('b') || {}).textContent || '';
        }
        return JSON.stringify({ join: join });
      }catch(e){ return JSON.stringify({err:String(e)}); }
    })()`) || '{}');
    ok(S.join === ymd(FIX), '指定 ' + FIX + ' → 顯示 ' + ymd(FIX) + '（實際「' + S.join + '」）');
    ok(!/1969/.test(S.join || ''), '沒有被截斷成 1969（這就是 showPlayer 用 `| 0` 的那個洞）');
    try { await p.shot(path.join(__dirname, '_audit', 'v561-join.png')); } catch (e) {}

    console.log('\n=== ⑤ 壞資料 → 顯示破折號，不編一個假日期 ===');
    const B = JSON.parse(await p.eval(`(function(){
      try{
        var out = {};
        var S = window.__BH.Social;
        var cases = { neg: -1394471074, zero: 0, sec: 1793901858, huge: 9e15 };
        for (var k in cases) {
          S.showPlayer({ pid:'p_0123456789', n:'壞值'+k, k:'guest', join: cases[k], seen: 0,
            sec:0, pts:0, wins:0, mode:'', avt:0, eq:[], tt:-1 });
          var cells = document.querySelectorAll('.ondetail .odcell');
          for (var i = 0; i < cells.length; i++) {
            var t = (cells[i].textContent || '').trim();
            if (t.indexOf('加入時間') === 0) out[k] = (cells[i].querySelector('b') || {}).textContent || '';
          }
        }
        return JSON.stringify(out);
      }catch(e){ return JSON.stringify({err:String(e)}); }
    })()`) || '{}');
    ok(B.neg === '—', '被截斷的負數 → —（實際「' + B.neg + '」）');
    ok(B.zero === '—', '沒有資料 → —（實際「' + B.zero + '」）');
    ok(B.sec === '—', '秒級時間戳 → —，不是 1970（實際「' + B.sec + '」）');
    ok(B.huge === '—', '離譜的大值 → —（實際「' + B.huge + '」）');

    console.log('\n=== ⑤b seen 是 0 時不要說「20765 天前」 ===');
    const Z = JSON.parse(await p.eval(`(function(){
      try{
        var S = window.__BH.Social;
        S.showPlayer({ pid:'p_0123456789', n:'沒上過線', k:'guest', join: 1793901858654, seen: 0,
          sec:0, pts:0, wins:0, mode:'', avt:0, eq:[], tt:-1 });
        var od = document.querySelector('.odid');
        return JSON.stringify({ od: (od && od.textContent || '').trim() });
      }catch(e){ return JSON.stringify({err:String(e)}); }
    })()`) || '{}');
    ok(/還沒有動靜/.test(Z.od || ''), '說「還沒有動靜」（實際「' + Z.od + '」）');
    ok(!/[0-9]{4,} 天前/.test(Z.od || ''), '沒有「幾萬天前」這種荒唐數字');
    ok(!/1969|1970/.test(Z.od || ''), '也沒有 1969／1970');

    console.log('\n=== ⑥ 玩家名單的「更新於」也不是 1969 ===');
    /* 名單要真的有玩家才會出現 .onbar（空名單只顯示一句提示）。
       先刷新一次名單，讓剛建的「時間阿爆」進來。 */
    await p.eval(`(function(){ try { window.__BH.Social.hb(); } catch(e){} })()`);
    await new Promise(function (r) { setTimeout(r, 2500); });
    const L = JSON.parse(await p.eval(`(function(){
      try{
        var S = window.__BH.Social;
        S.open();
        var bar = document.querySelector('.onbar');
        var rows = document.querySelectorAll('.onrow .onsub');
        var subs = [];
        for (var i = 0; i < rows.length; i++) subs.push((rows[i].textContent || '').trim());
        return JSON.stringify({ bar: (bar && bar.textContent || '').trim().slice(0, 60),
          rows: rows.length, subs: subs.slice(0, 4) });
      }catch(e){ return JSON.stringify({err:String(e)}); }
    })()`) || '{}');
    ok(!!L.bar && /更新於/.test(L.bar), '名單底部有「更新於」（實際「' + String(L.bar || '找不到') + '」）');
    ok(!/1969|1970/.test(L.bar || ''), '沒有 1969／1970');
    ok(!/[0-9]{4,} 天前/.test(L.bar || ''), '也沒有「幾萬天前」這種荒唐值');
    ok((L.rows | 0) >= 1, '名單上有 ' + (L.rows | 0) + ' 列玩家');
    ok(!/1969|1970/.test((L.subs || []).join(' ')), '每一列的「有動靜」時間也不含 1969');

    console.log('\n=== ⑦ 主控台錯誤 ===');
    const E = JSON.parse(await p.eval(`JSON.stringify(window.__errs || [])`) || '[]');
    ok((E || []).length === 0, '沒有未捕捉的例外（' + (E || []).length + ' 筆）');

  } catch (e) {
    fail++;
    console.log('  ✗ 探針中斷：' + (e && e.stack || e));
  } finally {
    try { await br.close(); } catch (e) {}
  }
  console.log('\n' + (fail ? '❌' : '✅') + ' 探針：' + pass + ' 通過 / ' + fail + ' 失敗');
  process.exit(fail ? 1 : 0);
})();
