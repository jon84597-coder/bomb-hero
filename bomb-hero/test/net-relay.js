// 線上配對中繼伺服器 —— 端到端協定測試（真的開一個 server 來打）
const { spawn } = require('child_process');
const path = require('path');

const PORT = 3411;
const BASE = 'http://127.0.0.1:' + PORT;
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ FAIL: ' + m); } }

function post(p, body) {
  return fetch(BASE + p, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  }).then(r => r.text().then(t => ({ status: r.status, json: JSON.parse(t || '{}') })));
}
function get(p) {
  return fetch(BASE + p).then(r => r.text().then(t => ({ status: r.status, json: JSON.parse(t || '{}') })));
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async function () {
  const srv = spawn(process.execPath, [path.join(__dirname, '../../bomberman-online/server.js')], {
    env: Object.assign({}, process.env, { PORT: String(PORT) }),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let log = '';
  srv.stdout.on('data', d => log += d);
  srv.stderr.on('data', d => log += d);

  try {
    // 等伺服器起來
    for (let i = 0; i < 40; i++) {
      try { const h = await get('/api/health'); if (h.json.ok) break; } catch (e) {}
      await sleep(100);
    }

    console.log('=== 1. 建立房間 ===');
    const cr = await post('/api/relay/create', { name: '房主', count: 4 });
    ok(cr.status === 200 && cr.json.ok, '建立成功');
    const code = cr.json.code, hostPid = cr.json.pid;
    ok(/^\d{4}$/.test(code), '房號是 4 位數字（' + code + '）');
    ok(cr.json.roster.length === 1, '房主自己在名單裡');
    ok(cr.json.roster[0].host === true, '房主標記正確');

    console.log('=== 2. 朋友加入等待室 ===');
    const jn = await post('/api/relay/join', { code: code, name: '小明' });
    ok(jn.status === 200 && jn.json.pid, '加入成功');
    const guestPid = jn.json.pid;
    ok(jn.json.roster.length === 2, '名單 2 人');
    ok(jn.json.roster.some(p => p.name === '小明'), '名單有暱稱「小明」');
    ok(jn.json.phase === 'wait', '狀態為等待中 wait');

    console.log('=== 3. 房主輪詢看得到新加入的人 ===');
    await sleep(80);
    const hp = await get('/api/relay/poll?code=' + code + '&pid=' + hostPid + '&v=0');
    ok(hp.json.roster.length === 2, '房主看到 2 人');
    ok(Array.isArray(hp.json.inputs), '房主輪詢會收到 inputs 陣列');

    console.log('=== 4. 客人在等待室輪詢（尚未開局沒有快照）===');
    const gp0 = await get('/api/relay/poll?code=' + code + '&pid=' + guestPid + '&v=0');
    ok(gp0.json.phase === 'wait', '客人看到等待中');
    ok(!gp0.json.snap, '還沒開局 → 沒有快照');

    console.log('=== 5. 房主設定入場／觀戰 ＋ 人數 8 ===');
    const rosterPush = [{ pid: hostPid, entry: 1, ch: 0, slot: 0 }, { pid: guestPid, entry: 0, ch: 2, slot: 1 }];
    const pu = await post('/api/relay/push', { code, pid: hostPid, phase: 'wait', count: 8, roster: rosterPush });
    ok(pu.json.ok, '房主推送設定成功');
    const gp1 = await get('/api/relay/poll?code=' + code + '&pid=' + guestPid + '&v=0');
    ok(gp1.json.count === 8, '人數改成 8 同步給客人');
    ok(gp1.json.roster.find(p => p.pid === guestPid).entry === 0, '客人被設為觀戰（entry=0）');

    console.log('=== 6. 只有房主能推狀態 ===');
    const bad = await post('/api/relay/push', { code, pid: guestPid, phase: 'play', snap: {} });
    ok(bad.status === 403, '客人推狀態被拒（403）');

    console.log('=== 7. 開局：房主送快照 → 客人收到 ===');
    const snap = {
      T: 44, c: 15, r: 13, th: 0, g: new Array(13).fill('0'.repeat(15)), hz: [[3, 3, 'i', '']],
      tm: 118.5, st: 'play', sd: 0, pl: [[hostPid, 0], [guestPid, 1]],
      p: [[100, 200, 1, 1, 0, 0.5, 0, 0, 0, '房主', 0]], b: [], f: [], it: [], ov: null, bn: ''
    };
    const pp = await post('/api/relay/push', { code, pid: hostPid, phase: 'play', snap: snap });
    ok(pp.json.ok, '推送快照成功');
    const gp2 = await get('/api/relay/poll?code=' + code + '&pid=' + guestPid + '&v=0');
    ok(gp2.json.phase === 'play', '客人看到已開局 play');
    ok(gp2.json.snap && gp2.json.snap.c === 15, '客人收到快照（地圖 15 寬）');
    ok(gp2.json.snap.p[0][9] === '房主', '快照裡的暱稱正確');

    console.log('=== 8. 同一份快照不會重送 ===');
    const gp3 = await get('/api/relay/poll?code=' + code + '&pid=' + guestPid + '&v=' + gp2.json.v);
    ok(!gp3.json.snap, 'v 相同 → 不重送快照（省流量）');

    console.log('=== 9. 客人送輸入 → 房主收到 ===');
    await post('/api/relay/input', { code, pid: guestPid, seq: 1, dx: 1, dy: 0, act: 1 });
    await post('/api/relay/input', { code, pid: guestPid, seq: 2, dx: 0, dy: -1, act: 0 });
    const hp2 = await get('/api/relay/poll?code=' + code + '&pid=' + hostPid + '&v=0');
    ok(hp2.json.inputs.length === 2, '房主收到 2 包輸入');
    ok(hp2.json.inputs[1].dy === -1, '第二包是往上');
    ok(hp2.json.inputs[0].act === 1, '第一包帶放彈');
    const hp3 = await get('/api/relay/poll?code=' + code + '&pid=' + hostPid + '&v=0');
    ok(hp3.json.inputs.length === 0, '輸入收完就清空（不重複執行）');

    console.log('=== 10. 錯誤處理 ===');
    const nf = await post('/api/relay/join', { code: '0000', name: 'x' });
    ok(nf.status === 404, '房號不存在 → 404');
    const gone = await get('/api/relay/poll?code=' + code + '&pid=nobody&v=0');
    ok(gone.status === 404, '不在房內的人輪詢 → 404');

    console.log('=== 11. 房主離開 → 房間解散 ===');
    await post('/api/relay/leave', { code, pid: hostPid });
    const after = await get('/api/relay/poll?code=' + code + '&pid=' + guestPid + '&v=0');
    ok(after.status === 404, '房間解散後客人輪詢 404（會顯示「房間已解散」）');

    console.log('=== 12. 8 人房上限 ===');
    const c2 = await post('/api/relay/create', { name: 'H', count: 8 });
    let joined = 0;
    for (let i = 0; i < 9; i++) {
      const r = await post('/api/relay/join', { code: c2.json.code, name: 'p' + i });
      if (r.status === 200) joined++;
    }
    ok(joined === 7, '房主 + 7 位客人 = 8 人（實際加入 ' + joined + ' 人）');
    const over = await post('/api/relay/join', { code: c2.json.code, name: 'over' });
    ok(over.status === 409, '第 9 人被擋下（409 已滿）');

    console.log('=== 13. v4.15：房間人數 2～8 由房主決定 ===');
    for (const n of [2, 3, 5, 6, 7]) {
      const rr = await post('/api/relay/create', { name: 'H' + n, count: n });
      ok(rr.json.count === n, '房主設 ' + n + ' 人 → 房間就是 ' + rr.json.count + ' 人');
      let okJoin = 0, full = 0;
      for (let i = 0; i < n; i++) {
        const r = await post('/api/relay/join', { code: rr.json.code, name: 'q' + i });
        if (r.status === 200) okJoin++; else if (r.status === 409) full++;
      }
      ok(okJoin === n - 1 && full === 1,
        n + ' 人房：只收 ' + (n - 1) + ' 位客人，第 ' + n + ' 人 409（實際 ' + okJoin + ' / ' + full + '）');
    }
    const badHi = await post('/api/relay/create', { name: 'HX', count: 99 });
    ok(badHi.json.count === 8, '亂填 99 → 夾成 8 人');
    const badLo = await post('/api/relay/create', { name: 'HY', count: 1 });
    ok(badLo.json.count === 2, '亂填 1 → 夾成 2 人');
    const badTx = await post('/api/relay/create', { name: 'HZ', count: 'abc' });
    ok(badTx.json.count === 4, '亂填文字 → 回退 4 人');
  } catch (e) {
    ok(false, '測試過程例外：' + e.message);
  } finally {
    srv.kill();
  }

  console.log('\n結果：' + pass + ' 通過 / ' + fail + ' 失敗');
  process.exit(fail ? 1 : 0);
})();
