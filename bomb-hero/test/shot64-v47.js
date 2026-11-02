// test/shot64-v47.js — 瀏覽器端到端冒煙：v4.7 密碼顯示切換 ＋ 飛行怪降速
//   · 自己起乾淨伺服器（temp data dir），真 Chrome 開頁面
//   · 真的點那顆 👁：type 要從 password → text → password，值與游標都不能掉
//   · 三個欄位各自獨立；強度條／兩次密碼檢查仍然會動
//   · 頁面裡直接量測四種飛行怪的速度，確認上限 78 生效
//   · 桌機 + 手機直放各拍一張
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const cdp = require('./cdp');

const ROOT_SRV = (function () {
  const a = path.join(__dirname, '..');
  const b = path.join(__dirname, '..', '..', 'bomberman-online');
  if (fs.existsSync(path.join(a, 'server.js'))) return a;
  return b;
})();
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'bh-v47-'));
const PORT = 3232;
const BASE = 'http://127.0.0.1:' + PORT;

let pass = 0, fail = 0;
function ok(c, n, x) {
  if (c) { pass++; console.log('  ✓ ' + n + (x === undefined ? '' : '（' + x + '）')); }
  else { fail++; console.log('  ✗ FAIL: ' + n + (x === undefined ? '' : '（' + x + '）')); }
}
const sleep = cdp.sleep;

function startServer() {
  const env = Object.assign({}, process.env, {
    PORT: String(PORT), BH_DATA_DIR: DATA, BH_AUTH_SECRET: 'v47-shot-secret', BH_FORCE_HTTPS: '0'
  });
  const p = spawn(process.execPath, ['server.js'], { cwd: ROOT_SRV, env, stdio: ['ignore', 'pipe', 'pipe'] });
  p.stdout.on('data', function () {});
  p.stderr.on('data', function (d) { const s = String(d); if (/Error/.test(s)) console.error('[srv]', s.trim()); });
  return p;
}
async function waitUp() {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(BASE + '/api/health', { signal: AbortSignal.timeout(400) });
      if (r.ok) return true;
    } catch (e) {}
    await sleep(120);
  }
  return false;
}

const FIELDS = `(function(){
  const ids = ['acctOldIn','acctPwIn','acctPw2In'];
  const out = {};
  ids.forEach(function(id){
    const el = document.getElementById(id);
    if (!el) { out[id] = null; return; }
    const btn = document.querySelector('[data-acct="pwEye"][data-for="' + id + '"]');
    out[id] = {
      type: el.type, value: el.value,
      hasBtn: !!btn,
      btnTxt: btn ? btn.textContent : null,
      pressed: btn ? btn.getAttribute('aria-pressed') : null,
      label: btn ? btn.getAttribute('aria-label') : null,
      sel: (function(){ try { return el.selectionStart; } catch(e){ return -1; } })(),
      focused: document.activeElement === el
    };
  });
  return out;
})()`;

(async () => {
  const srv = startServer();
  const b = await cdp.launch({ w: 1280, h: 900, port: 9483 });
  try {
    if (!await waitUp()) throw new Error('伺服器沒起來');
    const p = await b.newPage();
    await p.resize(1280, 860, false);
    await p.goto(BASE + '/', 2200);
    await sleep(900);
    const evalJs = (js) => p.eval(js);
    const shot = (name) => p.shot(path.join(__dirname, name));

    // ================================================================
    console.log('\n=== 1. 版本與靜態資源 ===');
    const ver = await evalJs(`(document.getElementById('verTxt')||{}).textContent`);
    ok(ver === '4.7', '畫面版本號 = v4.7', ver);
    const swRes = await fetch(BASE + '/sw.js');
    ok(swRes.status === 200, '/sw.js → 200', swRes.status);
    ok(/no-cache/.test(swRes.headers.get('cache-control') || ''), 'sw.js no-cache');
    ok(/v4\.7\.0/.test(await swRes.text()), 'sw.js 快取版本已升到 v4.7.0');
    const mfRes = await fetch(BASE + '/manifest.json');
    ok(mfRes.status === 200, '/manifest.json → 200', mfRes.status);

    // ================================================================
    console.log('\n=== 2. 飛行怪速度（直接在頁面裡量） ===');
    const spd = await evalJs(`(function(){
      const B = window.__BH;
      if (!B || !B.makeEnemy) return null;
      const ids = ['bat','ghost','bee','eye'];
      const out = { cap: B.FLY_SPEED_CAP, peak: 0, list: [] };
      ids.forEach(function(id){
        let mx = 0;
        for (let st = 1; st <= 8; st++) {
          const e = B.makeEnemy(2, 2, id, st, 1);
          if (e.speed > mx) mx = e.speed;
        }
        out.list.push(id + ':' + mx.toFixed(1));
        if (mx > out.peak) out.peak = mx;
        const h = B.makeEnemy(2, 2, id, 8, 1.22);
        out[id + '_hard'] = h.speed;
      });
      return out;
    })()`);
    ok(!!spd, '__BH 有匯出 makeEnemy');
    if (spd) {
      ok(spd.cap === 78, 'FLY_SPEED_CAP = 78', spd.cap);
      ok(spd.peak < 60, '第 1~8 關峰值 < 60（' + spd.peak.toFixed(1) + '，舊版 76.8）');
      ok(spd.peak < 146, '峰值遠低於玩家基礎 146', spd.list.join(' / '));
      ok(Math.max(spd.bat_hard, spd.ghost_hard, spd.bee_hard, spd.eye_hard) < 146,
        '困難難度第 8 關也 < 玩家 146');
    }

    // ================================================================
    console.log('\n=== 3. 打開帳號彈窗 → 註冊分頁 ===');
    const opened = await evalJs(`(function(){
      const c = document.getElementById('acctChip');
      if (!c) return 'nochip';
      c.click();
      return 'clicked';
    })()`);
    ok(opened === 'clicked', '右上角帳號膠囊可點', opened);
    await sleep(450);
    const tab = await evalJs(`(function(){
      const b = document.querySelector('[data-acct="tab"][data-tab="reg"]');
      if (!b) return 'notab';
      b.click();
      return 'ok';
    })()`);
    ok(tab === 'ok', '切到「註冊」分頁', tab);
    await sleep(350);

    let f = await evalJs(FIELDS);
    ok(!!f.acctPwIn, '看到新密碼欄位');
    ok(!!f.acctPw2In, '看到「再輸入一次密碼」欄位');
    ok(f.acctPwIn.type === 'password' && f.acctPw2In.type === 'password',
      '兩欄預設都是 password（不明文）', f.acctPwIn.type + '/' + f.acctPw2In.type);
    ok(f.acctPwIn.hasBtn && f.acctPw2In.hasBtn, '兩欄右邊都有 👁 按鈕');
    ok(f.acctPwIn.pressed === 'false', '初始 aria-pressed = false', f.acctPwIn.pressed);

    // ================================================================
    console.log('\n=== 4. 真的點下去（值 / 游標 / 強度條都不能掉） ===');
    await evalJs(`(function(){
      const el = document.getElementById('acctPwIn');
      el.value = 'Abc12345';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      try { el.focus(); el.setSelectionRange(3,3); } catch(e) {}
    })()`);
    await sleep(120);
    const strBefore = await evalJs(`(document.getElementById('acctStr')||{}).className`);
    ok(/s[1-3]/.test(strBefore || ''), '強度條有跟著輸入連動', strBefore);

    await evalJs(`document.querySelector('[data-acct="pwEye"][data-for="acctPwIn"]').click()`);
    await sleep(150);
    f = await evalJs(FIELDS);
    ok(f.acctPwIn.type === 'text', '點一下 → 變成 text（看得到內容）', f.acctPwIn.type);
    ok(f.acctPwIn.value === 'Abc12345', '已輸入的密碼完全保留', f.acctPwIn.value);
    ok(f.acctPwIn.btnTxt === '🙈', '按鈕圖示變 🙈', f.acctPwIn.btnTxt);
    ok(f.acctPwIn.pressed === 'true', 'aria-pressed → true', f.acctPwIn.pressed);
    ok(f.acctPwIn.label === '隱藏密碼', '提示文字換成「隱藏密碼」', f.acctPwIn.label);
    ok(f.acctPwIn.focused === true, '焦點還在輸入框（手機不用再點一次）');
    ok(f.acctPw2In.type === 'password', '「確認密碼」欄沒被連帶打開', f.acctPw2In.type);
    await shot('v47-1-pw-shown.png');

    await evalJs(`document.querySelector('[data-acct="pwEye"][data-for="acctPwIn"]').click()`);
    await sleep(150);
    f = await evalJs(FIELDS);
    ok(f.acctPwIn.type === 'password', '再點一下 → 還原 password', f.acctPwIn.type);
    ok(f.acctPwIn.value === 'Abc12345', '來回切兩次值仍在', f.acctPwIn.value);
    ok(f.acctPwIn.btnTxt === '👁' && f.acctPwIn.pressed === 'false', '圖示與無障礙狀態復原');

    // 第二欄獨立切換
    await evalJs(`(function(){
      const el = document.getElementById('acctPw2In');
      el.value = 'Abc12345';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('[data-acct="pwEye"][data-for="acctPw2In"]').click();
    })()`);
    await sleep(150);
    f = await evalJs(FIELDS);
    ok(f.acctPw2In.type === 'text' && f.acctPwIn.type === 'password',
      '「確認密碼」可以單獨顯示，不影響第一欄');
    const mism = await evalJs(`(document.getElementById('acctPw2Err')||{}).textContent`);
    ok(!mism, '兩次密碼一致時不出現錯誤訊息', JSON.stringify(mism));

    // ================================================================
    console.log('\n=== 5. 手機直放 ===');
    await p.resize(390, 844, true);
    await sleep(500);
    const mob = await evalJs(`(function(){
      const el = document.getElementById('acctPwIn');
      const btn = document.querySelector('[data-acct="pwEye"][data-for="acctPwIn"]');
      if (!el || !btn) return null;
      const a = el.getBoundingClientRect(), b = btn.getBoundingClientRect();
      return { inW: window.innerWidth, elR: Math.round(a.right), btnR: Math.round(b.right),
        overlap: b.right <= a.right + 1 && b.left >= a.left,
        padR: getComputedStyle(el).paddingRight };
    })()`);
    ok(!!mob, '手機直放仍找得到欄位與眼睛');
    if (mob) {
      ok(mob.overlap, '眼睛壓在輸入框右側、沒有超出欄位');
      ok(parseFloat(mob.padR) >= 40, '右側留白足夠（不會蓋到字）', mob.padR);
      ok(mob.btnR <= mob.inW, '眼睛按鈕沒跑出螢幕', mob.btnR + '/' + mob.inW);
    }
    await shot('v47-2-mobile-portrait.png');

    // ================================================================
    console.log('\n----------------------------------------');
    console.log((fail === 0 ? '全部通過' : '有失敗') + '：' + pass + ' 項通過、' + fail + ' 項失敗');
    if (fail) process.exitCode = 1;
  } catch (e) {
    console.error('[FATAL]', e && e.stack || e);
    process.exitCode = 1;
  } finally {
    b.close();
    try { srv.kill(); } catch (e) {}
  }
})();
