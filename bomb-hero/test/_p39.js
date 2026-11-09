// test/_p39.js —— v5.61 線上驗收：加入時間是真的日期（不是 1969）
const path = require('path');
const CDP = require('./cdp');

const URL = 'https://bomb-hero-game.onrender.com/';
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } }

const HOOK = 'window.__errs=[];' +
  'window.addEventListener("error",function(e){window.__errs.push(String(e&&e.message||e))});' +
  'window.addEventListener("unhandledrejection",function(e){window.__errs.push("rej:"+String(e&&e.reason))});';

function ymd(ms) {
  const d = new Date(ms);
  const q = function (n) { return (n < 10 ? '0' : '') + n; };
  return d.getFullYear() + '/' + q(d.getMonth() + 1) + '/' + q(d.getDate());
}

(async function () {
  const br = await CDP.launch({ port: 9343, w: 900, h: 720 });
  const p = await br.newPage();
  try {
    await p.send('Page.addScriptToEvaluateOnNewDocument', { source: HOOK });
    await p.goto(URL, 9000);
    await new Promise(function (r) { setTimeout(r, 4500); });

    console.log('\n=== ① 線上版本 ===');
    const M = JSON.parse(await p.eval(`JSON.stringify({
      ver: (window.__BH && window.__BH.VERSION) || '',
      pc: !!window.__BHPlayerCard, soc: !!(window.__BH && window.__BH.Social)
    })`) || '{}');
    ok(parseFloat(M.ver) >= 5.61, '線上版本 ≥ 5.61（實際 ' + M.ver + '）');
    ok(M.pc === true, '玩家資訊卡模組在');
    ok(M.soc === true, 'Social 在');

    console.log('\n=== ② 線上端點回的時間戳是毫秒且在合理範圍 ===');
    const A = JSON.parse(await p.eval(`(async function(){
      try{
        var t = await fetch('/api/lb/top?mode=daily&limit=8', {credentials:'omit'}).then(function(r){return r.json();});
        var rows = (t && t.list) || [];
        var hit = null;
        for (var i = 0; i < rows.length; i++) if (rows[i].pid) hit = rows[i];
        if (!hit) return JSON.stringify({ noPid: true, rows: rows.length });
        var c = await fetch('/api/player/card?pid=' + hit.pid, {credentials:'omit'}).then(function(r){return r.json();});
        return JSON.stringify({ rows: rows.length, n: c.n, join: c.join, seen: c.seen, ok: !!c.ok });
      }catch(e){ return JSON.stringify({err:String(e)}); }
    })()`) || '{}');
    if (A.noPid) {
      console.log('  （線上榜單還沒有帶 pid 的紀錄，跳過端點檢查）');
    } else {
      ok(A.ok === true, '查得到玩家卡（' + A.n + '）');
      ok(typeof A.join === 'number' && A.join > 1e12 && A.join < 4e12,
        'join 是毫秒級時間戳（' + A.join + ' → ' + (A.join > 1e12 ? ymd(A.join) : '壞值') + '）');
      ok(A.join > 0 && A.join <= Date.now() + 86400000, 'join 不在未來、也不是 0');
    }

    console.log('\n=== ③ 卡片上的「加入」是日期 ===');
    const C = JSON.parse(await p.eval(`(function(){
      try{
        var S = window.__BH.Social;
        S.showPlayer({ pid:'p_0123456789', n:'線上固定時間', k:'guest', ch:1, g:'男', r:'台灣',
          join: 1793901858654, seen: 1793901858654, sec: 600, pts: 0, wins: 0, mode:'大廳', avt: 0, eq: [], tt: -1 });
        var cells = document.querySelectorAll('.ondetail .odcell');
        var join = '', seenTxt = '';
        for (var i = 0; i < cells.length; i++) {
          var t = (cells[i].textContent || '').trim();
          if (t.indexOf('加入時間') === 0) join = (cells[i].querySelector('b') || {}).textContent || '';
        }
        var od = document.querySelector('.odid');
        seenTxt = (od && od.textContent || '');
        return JSON.stringify({ join: join, detail: !!document.querySelector('.ondetail'), od: seenTxt.slice(0, 40) });
      }catch(e){ return JSON.stringify({err:String(e)}); }
    })()`) || '{}');
    ok(C.detail === true, '完整資料頁打得開');
    ok(C.join === ymd(1793901858654), '指定時間戳 → ' + ymd(1793901858654) + '（實際「' + C.join + '」）');
    ok(!/1969|1970/.test(C.join || ''), '不是 1969（這是原本線上每個人都錯的值）');
    ok(!/1969|1970/.test(C.od || ''), '「有動靜」時間也不含 1969（實際「' + C.od + '」）');

    console.log('\n=== ④ 壞資料 → 破折號 ===');
    const B = JSON.parse(await p.eval(`(function(){
      try{
        var S = window.__BH.Social, out = {};
        var cases = { neg: -1394471074, zero: 0, sec: 1793901858 };
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
    ok(B.neg === '—', '截斷的負數 → —（' + B.neg + '）');
    ok(B.zero === '—', '沒有資料 → —（' + B.zero + '）');
    ok(B.sec === '—', '秒級 → —，不是 1970（' + B.sec + '）');

    console.log('\n=== ④b seen=0 不說「幾萬天前」 ===');
    const Z = JSON.parse(await p.eval(`(function(){
      try{
        window.__BH.Social.showPlayer({ pid:'p_0123456789', n:'沒上過線', k:'guest',
          join: 1793901858654, seen: 0, sec:0, pts:0, wins:0, mode:'', avt:0, eq:[], tt:-1 });
        var od = document.querySelector('.odid');
        return JSON.stringify({ od: (od && od.textContent || '').trim() });
      }catch(e){ return JSON.stringify({err:String(e)}); }
    })()`) || '{}');
    ok(/還沒有動靜/.test(Z.od || ''), '說「還沒有動靜」（實際「' + Z.od + '」）');
    ok(!/[0-9]{4,} 天前/.test(Z.od || ''), '沒有「幾萬天前」');
    ok(!/1969|1970/.test(Z.od || ''), '也沒有 1969／1970');

    console.log('\n=== ⑤ 例外 ===');
    const E = JSON.parse(await p.eval(`JSON.stringify(window.__errs || [])`) || '[]');
    ok((E || []).length === 0, '沒有未捕捉的例外（' + (E || []).length + ' 筆）');

    try { await p.shot(path.join(__dirname, '_audit', 'v561-live.png')); } catch (e) {}
  } catch (e) {
    fail++;
    console.log('  ✗ 探針中斷：' + (e && e.stack || e));
  } finally {
    try { await br.close(); } catch (e) {}
  }
  console.log('\n' + (fail ? '❌' : '✅') + ' 探針：' + pass + ' 通過 / ' + fail + ' 失敗');
  process.exit(fail ? 1 : 0);
})();
