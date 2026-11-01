// test/shot59-v43.js — 瀏覽器端到端：傳統帳密註冊／登入 與 開發者後台（v4.3）
//   · 自己起一台乾淨的伺服器（temp data dir），不污染本機帳號
//   · 全程走真的 UI：點分頁、打字、按送出
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
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'bh-v43-'));
const PORT = 3221;

let pass = 0, fail = 0;
function ok(c, n, x) {
  if (c) { pass++; console.log('  ✓ ' + n + (x === undefined ? '' : '（' + x + '）')); }
  else { fail++; console.log('  ✗ FAIL: ' + n + (x === undefined ? '' : '（' + x + '）')); }
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function startServer() {
  const env = Object.assign({}, process.env, {
    PORT: String(PORT), BH_DATA_DIR: DATA, BH_AUTH_SECRET: 'v43-shot-secret', BH_FORCE_HTTPS: '0'
  });
  const p = spawn(process.execPath, ['server.js'], { cwd: ROOT_SRV, env, stdio: ['ignore', 'pipe', 'pipe'] });
  p.stdout.on('data', function () {});
  p.stderr.on('data', function (d) { const s = String(d); if (/Error/.test(s)) console.error('[srv]', s.trim()); });
  return p;
}
async function waitUp() {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch('http://127.0.0.1:' + PORT + '/api/health', { signal: AbortSignal.timeout(400) });
      if (r.ok) return true;
    } catch (e) {}
    await sleep(120);
  }
  return false;
}

(async () => {
  const srv = startServer();
  if (!await waitUp()) throw new Error('伺服器沒起來');
  const b = await cdp.launch({ w: 1280, h: 900, port: 9471 });
  const p = await b.newPage();
  await p.resize(1280, 860, false);
  await p.goto('http://127.0.0.1:' + PORT + '/', 2200);
  await sleep(900);

  // 工具
  const click = (sel) => p.eval(`(function(){ const e=document.querySelector(${JSON.stringify(sel)}); if(e){e.click();return true;} return false; })()`);
  const typeIn = (sel, val) => p.eval(`(function(){
    const e=document.querySelector(${JSON.stringify(sel)});
    if(!e) return false;
    e.value=${JSON.stringify(val)};
    e.dispatchEvent(new Event('input',{bubbles:true}));
    return true;
  })()`);
  const txt = (sel) => p.eval(`(function(){ const e=document.querySelector(${JSON.stringify(sel)}); return e?e.textContent:null; })()`);
  const openAcct = async () => { await click('#acctChip'); await sleep(260); };

  console.log('\n=== 1. 啟動狀態 ===');
  let r = await p.eval(`(function(){ const C=window.__BH.Cloud; return {
    ver: window.__BH.VERSION, online: C.online(), guest: C.guest(), tab: C.state.tab,
    dev: C.isDev(), name: (document.getElementById('acctName')||{}).textContent }; })()`);
  console.log('    ' + JSON.stringify(r));
  ok(r.ver === '4.4', '版本 4.3');
  ok(r.online === true, '連上伺服器');
  ok(r.guest === true, '一開始是遊客');
  ok(r.dev === false, '一般遊客不是開發者');
  ok(r.tab === 'reg', '預設停在「註冊」分頁（引導綁定）');

  console.log('\n=== 2. 帳號彈窗結構 ===');
  await openAcct();
  r = await p.eval(`(function(){
    const m=document.getElementById('acctModal');
    const tabs=[].slice.call(document.querySelectorAll('#acctBody .accttab')).map(function(x){return x.textContent;});
    return { on: m.classList.contains('on'), tabs: tabs,
      hasId: !!document.getElementById('acctIdIn'), hasPw: !!document.getElementById('acctPwIn'),
      hasPw2: !!document.getElementById('acctPw2In'),
      btn: (document.getElementById('acctSubmit')||{}).textContent,
      secure: /scrypt/.test((document.getElementById('acctBody')||{}).textContent||'') }; })()`);
  console.log('    ' + JSON.stringify(r));
  ok(r.on, '彈窗打開');
  ok(r.tabs.length === 3 && /登入/.test(r.tabs[0]) && /註冊/.test(r.tabs[1]) && /第三方/.test(r.tabs[2]),
    '有三個分頁：登入／註冊／第三方', r.tabs.join('/'));
  ok(r.hasId && r.hasPw && r.hasPw2, '註冊表單有帳號、密碼、確認密碼');
  ok(/註冊並綁定/.test(r.btn || ''), '預設按鈕是「註冊並綁定進度」');
  ok(r.secure, '有說明密碼以 scrypt 加鹽雜湊儲存');
  await p.shot('test/v43-1-acct-reg.png');

  console.log('\n=== 3. 前端即時驗證 ===');
  await typeIn('#acctIdIn', 'ab');
  await sleep(120);
  ok(/格式/.test(await txt('#acctIdErr')), '帳號太短 → 立即紅字提示', await txt('#acctIdErr'));
  await typeIn('#acctIdIn', 'bad name!');
  await sleep(120);
  ok(/格式/.test(await txt('#acctIdErr')), '含特殊符號 → 立即紅字提示');
  await typeIn('#acctIdIn', 'player1@test.com');
  await sleep(120);
  ok((await txt('#acctIdErr')) === '', '合法 Email → 紅字消失');

  await typeIn('#acctPwIn', '123');
  await sleep(120);
  ok(/8 位/.test(await txt('#acctPwErr')), '密碼太短 → 提示需 8 位', await txt('#acctPwErr'));
  let cls = await p.eval(`document.getElementById('acctStr').className`);
  ok(/s1/.test(cls), '強度條是「弱」（' + cls + '）');
  await typeIn('#acctPwIn', 'abcdefgh');
  await sleep(120);
  ok(/數字/.test(await txt('#acctPwErr')), '純字母 → 提示需要數字', await txt('#acctPwErr'));
  await typeIn('#acctPwIn', 'abc12345');
  await sleep(120);
  ok((await txt('#acctPwErr')) === '', '合規密碼 → 紅字消失');
  cls = await p.eval(`document.getElementById('acctStr').className`);
  ok(/s[23]/.test(cls), '強度條升級（' + cls + '）');

  await typeIn('#acctPw2In', 'abc1234');
  await sleep(120);
  ok(/不一樣/.test(await txt('#acctPw2Err')), '兩次密碼不同 → 提示', await txt('#acctPw2Err'));
  await typeIn('#acctPw2In', 'abc12345');
  await sleep(120);
  ok((await txt('#acctPw2Err')) === '', '兩次相同 → 提示消失');

  console.log('\n=== 4. 註冊並轉移遊客進度 ===');
  // 先讓遊客有 2 關進度
  await p.eval(`(function(){ const C=__BH.Cloud; C.clearStage(1); C.clearStage(2); })()`);
  await sleep(700);
  const cleared0 = await p.eval(`__BH.RPG.cleared`);
  ok(cleared0 === 2, '遊客先有 2 關 RPG 進度', cleared0);

  await click('#acctSubmit');
  await sleep(1400);
  r = await p.eval(`(function(){ const C=__BH.Cloud; const a=C.acc()||{};
    return { guest: C.guest(), dev: C.isDev(), name: a.name, email: a.email, hasPass: a.hasPass,
      cleared: a.rpg? a.rpg.cleared : -1, unlocked: a.unlocked,
      modal: document.getElementById('acctModal').classList.contains('on'),
      chip: (document.getElementById('acctName')||{}).textContent }; })()`);
  console.log('    ' + JSON.stringify(r));
  ok(r.guest === false, '註冊後變成正式會員');
  ok(r.email === 'player1@test.com', '帳號是剛才註冊的 Email');
  ok(r.hasPass === true, '帳號有設定密碼');
  ok(r.cleared === 2, '遊客的 2 關進度完整轉移過來', r.cleared);
  ok(r.unlocked === 3, '解鎖到第 3 關', r.unlocked);
  ok(r.modal === false, '註冊成功後彈窗自動關閉');
  ok(/player1/.test(r.chip || ''), '右上角膠囊顯示帳號', r.chip);
  ok(r.dev === false, '一般玩家不是開發者');

  console.log('\n=== 5. 重複註冊被擋 ===');
  await p.eval(`__BH.Cloud.logout()`);
  await sleep(900);
  await openAcct();
  await click('#acctBody .accttab[data-tab="reg"]');
  await sleep(200);
  await typeIn('#acctIdIn', 'player1@test.com');
  await typeIn('#acctPwIn', 'abc12345');
  await typeIn('#acctPw2In', 'abc12345');
  await click('#acctSubmit');
  await sleep(1200);
  ok(/已經有人/.test(await txt('#acctMainErr') || ''), '同帳號再註冊 → 明確提示', await txt('#acctMainErr'));
  await p.shot('test/v43-2-taken.png');

  console.log('\n=== 6. 登入（錯 → 對）===');
  await click('#acctBody .accttab[data-tab="login"]');
  await sleep(200);
  r = await p.eval(`!!document.getElementById('acctPw2In')`);
  ok(r === false, '登入分頁不用填「確認密碼」');
  await typeIn('#acctIdIn', 'player1@test.com');
  await typeIn('#acctPwIn', 'wrong999');
  await click('#acctSubmit');
  await sleep(1200);
  ok(/帳號或密碼錯誤/.test(await txt('#acctMainErr') || ''), '密碼錯 → 紅字提示', await txt('#acctMainErr'));
  await typeIn('#acctPwIn', 'abc12345');
  await click('#acctSubmit');
  await sleep(1400);
  r = await p.eval(`(function(){ const C=__BH.Cloud; const a=C.acc()||{};
    return { guest: C.guest(), email: a.email, cleared: a.rpg?a.rpg.cleared:-1,
      modal: document.getElementById('acctModal').classList.contains('on') }; })()`);
  console.log('    ' + JSON.stringify(r));
  ok(r.guest === false && r.email === 'player1@test.com', '密碼正確 → 登入成功');
  ok(r.cleared === 2, '登入後進度還在（雲端存檔）', r.cleared);

  console.log('\n=== 7. 開發者帳號 → 全關卡解鎖 ===');
  await p.eval(`__BH.Cloud.logout()`);
  await sleep(900);
  // 用 UI 註冊開發者帳號（伺服器會自動標記 dev）
  await openAcct();
  await click('#acctBody .accttab[data-tab="reg"]');
  await sleep(200);
  await typeIn('#acctIdIn', 'jon84597@gmail.com');
  await typeIn('#acctPwIn', 'DevPass8899');
  await typeIn('#acctPw2In', 'DevPass8899');
  await click('#acctSubmit');
  await sleep(1600);
  r = await p.eval(`(function(){ const C=__BH.Cloud; const a=C.acc()||{};
    return { dev: C.isDev(), tier: a.tier, unlocked: a.unlocked,
      chip: (document.getElementById('acctName')||{}).textContent,
      chipDev: document.getElementById('acctChip').classList.contains('isdev'),
      soloDev: __BH.Solo.dev, soloMax: __BH.Solo.maxUnlocked() }; })()`);
  console.log('    ' + JSON.stringify(r));
  ok(r.dev === true, '開發者帳號被標記 dev');
  ok(r.tier === 'developer', 'tier = developer');
  ok(r.unlocked === 32, 'RPG 全 32 關直接解鎖', r.unlocked);
  ok(/🛠/.test(r.chip || ''), '右上角膠囊有 🛠 標記', r.chip);
  ok(r.soloDev === true && r.soloMax === 8, '單人闖關 8 關全解鎖（含 BOSS）', r.soloMax);
  const gridLocked = await p.eval(`(function(){
    const bs=[].slice.call(document.querySelectorAll('#stageGrid .stg'));
    return { total: bs.length, locked: bs.filter(function(b){return b.disabled;}).length }; })()`);
  ok(gridLocked.total === 8 && gridLocked.locked === 0, '單人選關畫面 8 關全部可按', JSON.stringify(gridLocked));
  // RPG：32 張地圖裡最硬的 8-4（BOSS）也直接挑得到
  const rpgMap = await p.eval(`(function(){
    const R=__BH.RPG; R.theme=7; R.sub=3; __BH.Rpg.renderMaps();
    const bs=[].slice.call(document.querySelectorAll('#segRpgMap button'));
    return { total: bs.length, locked: bs.filter(function(b){return b.disabled;}).length,
      gate: __BH.RPG.unlocked, last: (bs[bs.length-1]||{}).textContent }; })()`);
  ok(rpgMap.gate === 32 && rpgMap.total === 4 && rpgMap.locked === 0,
    'RPG 8-4（BOSS 地圖）也能直接挑', JSON.stringify(rpgMap));

  console.log('\n=== 8. 開發者後台 ===');
  await openAcct();
  r = await p.eval(`!!document.querySelector('#acctBody [data-acct="admin"]')`);
  ok(r === true, '帳號彈窗出現「開發者後台」按鈕');
  await click('#acctBody [data-acct="admin"]');
  await sleep(1400);
  r = await p.eval(`(function(){
    const m=document.getElementById('adminModal');
    return { on: m.classList.contains('on'),
      stats: document.querySelectorAll('#adStats .adstat').length,
      rows: document.querySelectorAll('#adList tbody tr').length,
      txt: (document.getElementById('adStats')||{}).textContent }; })()`);
  console.log('    ' + JSON.stringify(r));
  ok(r.on === true, '後台開啟');
  ok(r.stats >= 8, '上方統計卡片有資料', r.stats);
  ok(r.rows >= 2, '會員名單有列資料', r.rows + ' 列');
  await p.shot('test/v43-3-admin.png');

  // 點第一個非 dev 的玩家列 → 詳情
  const hit = await p.eval(`(function(){
    const trs=[].slice.call(document.querySelectorAll('#adList tbody tr'));
    const tr=trs.filter(function(t){ return !/DEV/.test(t.textContent); })[0];
    if(!tr) return null;
    tr.click();
    return tr.getAttribute('data-id');
  })()`);
  await sleep(900);
  r = await p.eval(`(function(){ const d=document.getElementById('adDetail');
    return { id: d.querySelector('.adwho')? 'ok':'no', txt: d.textContent.slice(0,400) }; })()`);
  ok(!!r.id, '點了列就顯示玩家詳情');
  ok(/加入時間/.test(r.txt) && /2026-\d\d-\d\d \d\d:\d\d:\d\d/.test(r.txt), '詳情有「精確到秒」的加入時間');
  ok(/註冊 IP/.test(r.txt) && /127\.0\.0\.1|::1|1\.2\.3\.4/.test(r.txt), '詳情有註冊 IP');
  ok(/第三方平台 ID/.test(r.txt), '詳情有第三方平台 ID 欄位');
  ok(/配點/.test(r.txt) && /RPG 進度/.test(r.txt), '詳情有配點與 RPG 進度');
  ok(!!hit, '取得被查詢的玩家 UID', hit);
  await p.shot('test/v43-4-admin-detail.png');

  console.log('\n=== 9. 停權 / 解除 ===');
  await p.eval(`(function(){
    const b=document.querySelector('#adDetail [data-adm="ban"]'); if(b) b.click(); })()`);
  await sleep(1200);
  r = await p.eval(`(function(){
    const tr=document.querySelector('#adList tbody tr[data-id="'+${JSON.stringify(hit)}+'"]');
    return tr? tr.textContent : ''; })()`);
  ok(/停權/.test(r), '該玩家在名單上變成「停權」', (r || '').slice(0, 40));
  await p.eval(`(function(){
    const b=document.querySelector('#adDetail [data-adm="ban"]'); if(b) b.click(); })()`);
  await sleep(1200);
  r = await p.eval(`(function(){
    const tr=document.querySelector('#adList tbody tr[data-id="'+${JSON.stringify(hit)}+'"]');
    return tr? tr.textContent : ''; })()`);
  ok(/正常/.test(r), '解除停權後恢復「正常」');

  console.log('\n=== 10. 客服修存檔 ===');
  await p.eval(`(function(){
    const c=document.getElementById('adCleared'); if(c){ c.value='12'; }
    const g=document.getElementById('adGold'); if(g){ g.value='777'; }
    const b=document.querySelector('#adDetail [data-adm="grant"]'); if(b) b.click(); })()`);
  await sleep(1200);
  r = await p.eval(`(function(){ const d=document.getElementById('adDetail'); return d.textContent; })()`);
  ok(/12 \/ 32/.test(r), '後台改完關卡進度立刻反映', (/12 \/ 32[^）]*/.exec(r) || [''])[0]);
  ok(/777/.test(r), '金幣也照著改成 777');

  console.log('\n=== 11. 全服公告 ===');
  await p.eval(`(function(){
    document.getElementById('adAnnText').value='今晚 23:00 停機維護';
    document.getElementById('adAnnGo').click(); })()`);
  await sleep(1200);
  r = await p.eval(`(function(){ const b=document.getElementById('annBar');
    return { hide: b.classList.contains('hide'), txt: b.textContent }; })()`);
  ok(r.hide === false, '玩家端公告條出現');
  ok(/停機維護/.test(r.txt || ''), '公告內容正確', (r.txt || '').slice(0, 30));
  await p.shot('test/v43-5-announce.png');
  await p.eval(`(function(){ document.getElementById('adAnnText').value=''; document.getElementById('adAnnGo').click(); })()`);
  await sleep(1000);

  console.log('\n=== 12. 版本紀錄豁免 ===');
  r = await p.eval(`(function(){
    __BH.VERSION_LOG.unshift({ v: '9.9', date: '2026-11-01', dev: true, items: ['內部測試條目'] });
    __BH.VersionLog.refresh();
    const body = document.getElementById('verLogBody').textContent;
    return { dev: __BH.Cloud.isDev(), hasDev: /9\.9/.test(body), hasInternal: /內部測試條目/.test(body) }; })()`);
  ok(r.hasDev === true, '開發者看得到標了 dev 的內部版本');
  ok(r.hasInternal === true, '內部條目內容也看得到');
  // 切成一般玩家 → 應該看不到
  r = await p.eval(`(function(){
    const C=__BH.Cloud; const acc=C.state.acc; acc.dev=false;
    __BH.VersionLog.refresh();
    const body=document.getElementById('verLogBody').textContent;
    return { hasDev: /9\.9/.test(body), hasInternal: /內部測試條目/.test(body), has43: /4\.3/.test(body) }; })()`);
  ok(r.hasDev === false && r.hasInternal === false, '一般玩家看不到內部版本（豁免生效）');
  ok(r.has43 === true, '正式版本 4.3 仍看得到');

  console.log('\n=== 13. 非開發者進不了後台 ===');
  // 先登出 → 回到遊客身分（真正的「一般玩家」）
  await p.eval(`(function(){
    document.getElementById('adminModal').classList.remove('on');
    __BH.Cloud.logout(); })()`);
  await sleep(1400);
  const den = await p.eval(`(function(){
    return { dev: __BH.Cloud.isDev(), guest: __BH.Cloud.guest() }; })()`);
  console.log('    ' + JSON.stringify(den));
  ok(den.dev === false && den.guest === true, '登出後是一般遊客');
  const denied = await p.eval(`(function(){ try { return __BH.Admin.open(); } catch(e){ return 'ERR:'+e.message; } })()`);
  ok(denied === false, 'Cloud.isDev()=false 時開不了後台（' + denied + '）');
  const apiDenied = await p.eval(`fetch('/api/admin/overview',{credentials:'same-origin'}).then(function(r){return r.status;})`);
  ok(apiDenied === 403, '後端 API 也擋（403）', apiDenied);
  const jumpDenied = await p.eval(`(function(){
    const R=__BH.RPG; const before=R.unlocked; R.theme=7; R.sub=3;
    return { gate: before, canJump: before >= 32 }; })()`);
  ok(jumpDenied.canJump === false, '一般玩家不能跳到 8-4（只開到 ' + jumpDenied.gate + '）');

  console.log('\n========================================');
  console.log('  結果：' + pass + ' 通過 / ' + fail + ' 失敗');
  console.log('========================================');
  b.close();
  try { srv.kill(); } catch (e) {}
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e && e.stack || e); process.exit(1); });
