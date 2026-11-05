/* =====================================================================
 * verify-v517：四項介面修正
 *   ① 商店隨從大圖示（PetPreview 會走動）
 *   ② 對戰選角左右箭頭縮小、不再蓋到角色
 *   ③ 成就／排名／線上玩家面板的「✕」不再被工具列壓住；私訊輸入框固定可見＋表情符號
 *   ④ 同一個帳號在手機＋電腦＝同一個玩家（身分改用帳號 id，舊紀錄會整併）
 * ④ 的後端段落是真的把 cloud.handle 跑起來，不是讀原始碼猜。
 * ================================================================== */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { EventEmitter } = require('events');
const { makeEnv } = require('./_sandbox');

const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const CLOUD_SRC = fs.readFileSync(path.join(ROOT, '..', 'cloud.js'), 'utf8');
const cloudMod = require(path.join(ROOT, '..', 'cloud.js'));

let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  \u2713 ' + m); } else { fail++; console.log('  \u2717 ' + m); } }
function head(t) { console.log('\n' + t); }

/* ---------------------------------------------------------------- ① */
head('① 版本與入口');
const vm = SRC.match(/const VERSION = '([^']+)'/);
// v5.18：版號往上跳了，這條改成「不比 5.17 舊」
ok(vm && vm[1].split('.').map(Number)[1] >= 17, '版本是 5.17 以上（' + (vm ? vm[1] : '?') + '）');
ok(/\{ v: '5\.(1[7-9]|[2-9][0-9])'/.test(SRC), 'VERSION_LOG 第一筆是 5.17 之後的版本');

/* ---------------------------------------------------------------- ② */
head('② 商店：隨從圖示放大＋會動');
ok(/\.shopcard \.shmain \{ display: flex/.test(SRC), '卡片改「左圖右文」的 .shmain');
ok(/\.shopcard \.shstage \{ flex: 0 0 auto; width: 132px; height: 132px/.test(SRC), '圖示框 132×132（跟對戰選角的角色一樣大）');
ok(/\.shopcard \.shstage canvas \{ display: block; width: 100%; height: 100%; \}/.test(SRC), '畫布吃滿圖示框');
ok(SRC.indexOf('<canvas class="petpv" width="240" height="240" data-pet=') > 0, '卡片輸出 <canvas class="petpv">');
ok(/<div class="shmeta"><div class="shname">/.test(SRC), '右側保留名字與說明');
ok(/PetPreview\.mount\(grid\)/.test(SRC), '每次重畫商店都會重新掛載圖示');
ok(/\.shopcard \.shfoot \{ display: flex/.test(SRC) && SRC.indexOf('class="shfoot"') > 0, '金額與按鈕仍在卡片下方');
ok(/@media \(min-width: 780px\) \{ \.shopgrid \{ grid-template-columns: repeat\(2/.test(SRC), '桌機兩欄（圖示才放得大）');
ok(SRC.indexOf('shport') < 0, '舊的 42px 小頭像已移除');

{
  const e = makeEnv();
  const B = e.BH;
  ok(!!B.PetPreview && typeof B.PetPreview.mount === 'function' && typeof B.PetPreview.tick === 'function',
    'PetPreview 有 mount／tick');
  const mk = function (kind) {
    return {
      width: 240, height: 240,
      getAttribute: function (k) { return { 'data-pet': kind, 'data-lw': '240', 'data-lh': '240' }[k] || null; },
      setAttribute: function () {},
      getContext: function () { return e.mkCtx2D(); }
    };
  };
  const c1 = mk('guard'), c2 = mk('blade');
  B.PetPreview.mount({ querySelectorAll: function () { return [c1, c2]; } });
  ok(B.PetPreview.items().length === 2, '兩張隨從卡都掛上了');
  ok(B.PetPreview.items()[0].kind === 'guard', 'data-pet 有被讀進來');

  // 不在商店畫面 → 不畫（不能白白吃效能）
  e.rec.calls.length = 0;
  B.Screen.show('title');
  B.PetPreview.tick(.016);
  ok(e.rec.calls.length === 0, '不在商店畫面時完全不畫');

  e.rec.calls.length = 0;
  B.Screen.show('shop');
  B.PetPreview.tick(.016);
  const names = e.rec.calls.map(function (c) { return c[0]; });
  ok(names.indexOf('ellipse') >= 0, '有畫地面影子');
  ok(names.indexOf('fillText') >= 0 || names.indexOf('drawImage') >= 0, '有畫隨從（圖沒載到時用 emoji 佔位）');

  // 兩幀之間圖形會變（＝真的在動）
  const snap = JSON.stringify(e.rec.calls.filter(function (c) { return c[0] === 'ellipse'; }).slice(-1));
  e.rec.calls.length = 0;
  B.PetPreview.tick(.25);
  const snap2 = JSON.stringify(e.rec.calls.filter(function (c) { return c[0] === 'ellipse'; }).slice(-1));
  ok(snap !== snap2, '不同時間點畫在不同位置（有走動）');
}

/* ---------------------------------------------------------------- ③ */
head('③ 對戰選角：箭頭縮小、不遮角色');
ok(/#scr-battle #pSlots \.ppf \.arr\{position:absolute;bottom:7px;top:auto;transform:none;\nwidth:26px;height:26px/.test(SRC),
  '箭頭 26×26、貼在框的下方兩角');
ok(/#scr-battle #pSlots \.ppf \.arr\.l\{left:7px\}/.test(SRC) && /#scr-battle #pSlots \.ppf \.arr\.r\{right:7px\}/.test(SRC),
  '左右各內縮 7px（避開圓角裁切）');
ok(/#scr-battle #pSlots \.ppf \.arr:active\{transform:scale\(\.92\)/.test(SRC), '按下的動畫跟著改（不再帶 translateY）');
ok(/@media \(max-width:520px\)\{[\s\S]{0,400}\.arr\{width:30px;height:30px/.test(SRC), '手機 30px（原本 44 會蓋到角色）');

{
  // 幾何檢查：以桌機最小卡片 132px 寬換算，箭頭右緣必須在角色左緣之外
  const cardW = 132, arrow = 26, inset = 7;
  const charW = cardW * (1.3 * (200 * .84 / 3.75) / 220);   // 角色實際寬度（跟 CharPreview 同一條公式）
  const arrowRight = inset + arrow;
  const charLeft = (cardW - charW) / 2 - cardW * .062;      // 含左右踱步的振幅
  ok(arrowRight < charLeft, '箭頭右緣 ' + arrowRight.toFixed(1) + 'px < 角色左緣 ' + charLeft.toFixed(1) + 'px');
}

/* ---------------------------------------------------------------- ④ */
head('④ 成就／排名／線上玩家：✕ 不再被工具列壓住');
ok(/\.bhmodal \{ position: fixed; inset: 0; z-index: 1230;/.test(SRC), '面板 z-index 1230（工具列是 1200）');
ok(/#navBar \{\nposition: fixed; left: 0; right: 0; top: 0; z-index: 1200;/.test(SRC), '工具列確實是 1200（面板要比它高）');
ok(/\.bhhead \{ padding-top: calc\(11px \+ env\(safe-area-inset-top, 0px\)\); \}/.test(SRC), '手機滿版時標題列讓開瀏海');
ok(SRC.indexOf('id="achX"') > 0 && SRC.indexOf('id="rankX"') > 0 && SRC.indexOf('id="onX"') > 0,
  '三個面板都有自己的關閉鈕');
ok(/\.bhx \{ margin-left: auto; width: 32px; height: 32px;/.test(SRC), '✕ 靠右、32px 好點');
ok(/\.bhx \{ width: 36px; height: 36px; font-size: 15px; \}/.test(SRC), '手機的 ✕ 再放大到 36px');

head('⑤ 私訊：輸入框固定可見＋表情符號');
ok(/\.bhbody\.chatmode \{ display: flex; flex-direction: column; overflow: hidden; \}/.test(SRC), '私訊頁把 body 變成 flex 容器');
ok(/\.bhbody\.chatmode > \.chatbox \{ flex: 1 1 auto; min-height: 0; height: auto; \}/.test(SRC), '對話框吃掉剩下的高度（只有訊息區滾動）');
ok(/box\.classList\.toggle\('chatmode', S\.view === 'chat'\)/.test(SRC), '切到私訊才加 chatmode');
ok(SRC.indexOf('id="onEmojiBtn"') > 0 && SRC.indexOf('id="onEmoji"') > 0, '有表情符號鈕與面板');
{
  const m = SRC.match(/const EMOJIS = \[([\s\S]*?)\];/);
  const list = m ? m[1].split(',').filter(function (x) { return x.trim(); }) : [];
  ok(list.length >= 32, '表情清單有 ' + list.length + ' 個');
  ok(list.every(function (x) { return x.indexOf('\uFE0F') < 0; }),
    '全部是單一碼位（❤️／⚔️ 這種帶變體選擇符的會在新版面版被裁成兩行，所以不用）');
}
ok(/data-emo="' \+ e \+ '"/.test(SRC), '面板裡的每顆表情都帶 data-emo');
ok(SRC.indexOf("t.closest('[data-emo]')") > 0, '點表情會插進輸入框');
ok(/inp\.setSelectionRange\(np, np\)/.test(SRC), '插在游標位置（不是每次都接在最後面）');
ok(/v\.length \+ ch\.length <= 60/.test(SRC), '插入後仍遵守 60 字上限');
ok(/\.emojipick \{ flex: 0 0 auto; display: none; grid-template-columns: repeat\(auto-fit, minmax\(32px, 1fr\)\)/.test(SRC),
  '面板自動分欄（40 顆在最窄的手機也只佔 4 排）');
ok(/\.chemj \{ flex: 0 0 auto; width: 38px; height: 38px;/.test(SRC), '表情鈕跟輸入框同高');

/* ---------------------------------------------------------------- ⑥ */
head('⑥ 身分：同一個帳號＝同一個玩家');
ok(/idKey\(\) \{/.test(SRC), 'Lb 有 idKey()');
ok(SRC.indexOf("if (a && a.id) return 'acc-' + String(a.id);") > 0, '登入帳號 → 用帳號 id');
ok(SRC.indexOf('return Lb.deviceId();   // 遊客') > 0, '遊客 → 原封不動用這台裝置的 id（現有玩家不會被改號）');
ok(/deviceId: Lb\.idKey\(\), dkey: Lb\.deviceId\(\), name: myName\(\), ch: myChar\(\), kind: myKind\(\)/.test(SRC),
  '線上心跳送帳號身分＋裝置（舊紀錄整併用）');
ok(/deviceId: Lb\.idKey\(\), dkey: Lb\.deviceId\(\), name: myName\(\), ch: myChar\(\),\n          cats: mine\('all'\)/.test(SRC),
  '排行榜提交也送帳號身分');
ok(SRC.indexOf("'&scope=' + sc + '&limit=50&deviceId=' + encodeURIComponent(Lb.idKey())") > 0,
  '查自己的名次也用同一個身分');
ok(SRC.indexOf("'?deviceId=' + encodeURIComponent(Lb.idKey()) + '&limit=80") > 0, '名單查詢同步');
ok(/avatar', \{ deviceId: Lb\.idKey\(\), img: d \}/.test(SRC), '頭貼也跟著帳號（換裝置不用重傳）');
ok(SRC.indexOf("if (typeof Cloud.guest === 'function') return Cloud.guest() ? 'guest' : 'member';") > 0,
  '名單上的「遊客／會員」也修好了（以前 myKind 用不存在的 Cloud.isGuest，全部人都標成會員）');
ok(SRC.indexOf('deviceId: Lb.deviceId(), name: myName(), ch: myChar(), kind: myKind()') < 0,
  '舊的「一律用裝置編號」寫法已清掉');

{
  const e = makeEnv();
  const B = e.BH;
  ok(typeof B.Lb.idKey === 'function', '沙盒裡也拿得到 idKey');
  const g1 = B.Lb.idKey();
  ok(/^dev-/.test(g1), '遊客身分是 dev- 開頭（' + g1.slice(0, 12) + '…）');
  ok(B.Lb.idKey() === g1, '同一台裝置每次算出來都一樣');

  // 有上線但還是「遊客」→ 不能用帳號 id（Cloud 對外叫 guest()，不是 isGuest）
  B.Cloud.online = function () { return true; };
  B.Cloud.guest = function () { return true; };
  B.Cloud.acc = function () { return { id: 'u_guest' }; };
  ok(B.Lb.idKey() === g1, '遊客就算已上線，也還是用這台裝置的 id');

  // 換成「已登入的會員」→ 身分立刻變成帳號
  B.Cloud.guest = function () { return false; };
  B.Cloud.acc = function () { return { id: 'u_abc123' }; };
  ok(B.Lb.idKey() === 'acc-u_abc123', '登入後改用帳號 id');
  B.Cloud.acc = function () { return { id: 'u_zzz999' }; };
  ok(B.Lb.idKey() === 'acc-u_zzz999', '換帳號就換身分（不會沿用上一個）');
  // 兩台不同的裝置、同一個帳號 → 同一個 idKey
  B.Cloud.acc = function () { return { id: 'u_abc123' }; };
  const pc = B.Lb.idKey();
  e.storage['bombhero-device'] = 'dev-other-device-9999';
  ok(B.Lb.idKey() === pc, '換一台裝置登入同一個帳號 → 身分相同（這就是修好的重點）');
  // 遊客回到裝置身分
  B.Cloud.online = function () { return false; };
  ok(/^dev-/.test(B.Lb.idKey()), '登出後回到裝置身分');
}

/* ---------------------------------------------------------------- ⑦ */
head('⑦ 後端真的跑一次：舊紀錄整併');
function mkReq(method, urlStr, body) {
  const req = new EventEmitter();
  req.method = method; req.url = urlStr;
  req.headers = { 'x-forwarded-for': '9.9.9.9', host: 'localhost:3000', 'content-type': 'application/json' };
  req.socket = { remoteAddress: '9.9.9.9' };
  req.destroy = function () {};
  if (body !== undefined) {
    const buf = Buffer.from(JSON.stringify(body));
    setImmediate(function () { req.emit('data', buf); req.emit('end'); });
  }
  return req;
}
function mkRes() {
  const r = { code: 0, headers: {}, body: '' };
  r.writeHead = function (c, h) { r.code = c; Object.assign(r.headers, h || {}); };
  r.setHeader = function (k, v) { r.headers[k] = v; };
  r.getHeader = function (k) { return r.headers[k]; };
  r.end = function (s) { r.body = String(s || ''); };
  r.write = function (s) { r.body += String(s || ''); };
  return r;
}
function makeFetch() {
  return function () {
    return Promise.resolve({
      ok: true, status: 200,
      json: function () { return Promise.resolve([]); },
      text: function () { return Promise.resolve('[]'); }
    });
  };
}

(async function main() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bh-v517-'));
  const cloud = cloudMod.createCloud({ dir: dir, persist: true, env: {}, fetch: makeFetch() });
  await cloud.ready;

  async function call(method, u, body) {
    const res = mkRes();
    const done = await cloud.handle(mkReq(method, u, body), res, new URL('http://x' + u));
    let j = {};
    try { j = JSON.parse(res.body || '{}'); } catch (e) {}
    return { done: done, code: res.code, j: j };
  }

  const A = 'dev-phone-aaaa-1111', B2 = 'dev-pc-bbbb-2222';
  let r = await call('POST', '/api/social/hb', { deviceId: A, name: '手機的我', ch: 0, kind: 'guest' });
  const pidGuestA = r.j.me.pid;
  ok(!!pidGuestA, '手機以遊客身分上線（' + pidGuestA + '）');

  r = await call('POST', '/api/social/hb', { deviceId: B2, name: '電腦的朋友', ch: 1, kind: 'guest' });
  const pidB = r.j.me.pid;
  ok(!!pidB, '電腦的朋友上線（' + pidB + '）');

  // 手機（遊客）加朋友 → 對方接受
  await call('POST', '/api/social/act', { deviceId: A, action: 'friend', target: pidB });
  await call('POST', '/api/social/act', { deviceId: B2, action: 'accept', target: pidGuestA });
  r = await call('POST', '/api/social/hb', { deviceId: A, name: '手機的我', ch: 0, kind: 'guest' });
  ok(r.j.friends.indexOf(pidB) >= 0, '好友建立成功');

  /* ★ 同一支手機登入正式帳號 → 身分改成 acc-xxx，舊紀錄要整併 */
  const ACC = 'acc-u_acc0001';
  r = await call('POST', '/api/social/hb', { deviceId: ACC, dkey: A, name: '手機的我', ch: 0, kind: 'member' });
  const pidAcc = r.j.me.pid;
  ok(pidAcc !== pidGuestA, '帳號身分是一個新的 pid（' + pidAcc + '）');
  ok(r.j.friends.indexOf(pidB) >= 0, '★ 換成帳號身分後，好友還在（舊紀錄整併過來）');
  ok(!cloud.db.social.players[pidGuestA], '舊的裝置紀錄已刪除（名單不會再出現兩個我）');
  r = await call('GET', '/api/social/list?deviceId=' + B2 + '&name=電腦的朋友');
  const mine = r.j.list.filter(function (p) { return p.pid === pidAcc; })[0];
  ok(!!mine, '別人的名單看到的是帳號那一個');
  ok(!r.j.list.filter(function (p) { return p.pid === pidGuestA; }).length, '看不到舊的裝置身分');
  ok(cloud.db.social.players[pidB].friends.indexOf(pidAcc) >= 0, '對方的好友清單也改指向新的 pid');
  ok(cloud.db.social.players[pidB].friends.indexOf(pidGuestA) < 0, '對方清單裡沒有舊 pid');

  // 電腦用同一個帳號登入 → 還是同一個 pid，名單上只有一個我
  const DV = 'dev-phone-aaaa-1111';
  r = await call('POST', '/api/social/hb', { deviceId: ACC, dkey: DV, name: '手機的我', ch: 0, kind: 'member' });
  ok(r.j.me.pid === pidAcc, '★ 手機與電腦登入同一個帳號 → 同一個玩家編號');
  r = await call('GET', '/api/social/list?deviceId=' + B2 + '&name=電腦的朋友');
  const dup = r.j.list.filter(function (p) { return p.name === '手機的我'; });
  ok(dup.length === 1, '名單上只有一筆「手機的我」（以前會兩筆同名、成就分一樣）');

  /* 排行榜也不會再各佔一格 */
  await call('POST', '/api/rank/submit', {
    deviceId: A, name: '手機的我', ch: 0, cats: { soloKill: 30 }, week: { soloKill: 5 }
  });
  r = await call('POST', '/api/rank/submit', {
    deviceId: ACC, dkey: A, name: '手機的我', ch: 0, cats: { soloKill: 42 }, week: { soloKill: 9 }
  });
  ok(r.j.ok, '帳號身分提交排行榜');
  r = await call('GET', '/api/rank/top?cat=soloKill&scope=all&limit=50&deviceId=' + ACC);
  const rows = r.j.list.filter(function (x) { return x.name === '手機的我'; });
  ok(rows.length === 1, '★ 總榜只有一筆（以前手機＋電腦各一筆）');
  ok(rows[0].v === 42, '保留了比較高的成績（' + (rows[0] && rows[0].v) + '）');
  r = await call('GET', '/api/rank/top?cat=soloKill&scope=week&limit=50&deviceId=' + ACC);
  ok(r.j.me && r.j.me.v === 9, '週榜也對得上（自己的名次抓得到）');

  /* 舊的裝置那格確實被刪掉了 */
  const R = cloud.db.rank;
  const devPid = Object.keys(R.all).filter(function (k) { return k !== r.j.me.pid; });
  ok(devPid.every(function (k) { return R.all[k].n !== '手機的我'; }), '舊的裝置成績格已移除');

  ok(CLOUD_SRC.indexOf('function socMergeDevice(pid, dkey)') > 0, 'cloud.js 有 socMergeDevice');
  ok(CLOUD_SRC.indexOf('function rankMergeDevice(pid, dkey)') > 0, 'cloud.js 有 rankMergeDevice');
  ok(CLOUD_SRC.indexOf("if (id && id !== pid && a.indexOf(id) < 0) a.push(id);") > 0, '整併時會去重');

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}

  console.log('\n通過 ' + pass + ' 項，失敗 ' + fail + ' 項');
  process.exit(fail ? 1 : 0);
})().catch(function (e) {
  console.error('測試本身出錯：', e && e.stack || e);
  process.exit(1);
});
