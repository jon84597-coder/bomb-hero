/* =====================================================================
 * verify-v516：配戴成就（個人資料展示）＋ 頭貼上傳（裁切／壓圖／雲端）
 * ---------------------------------------------------------------------
 * ⑤ 的後端段落是「真的把 cloud.handle 跑起來」，不是讀原始碼猜。
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
// v5.17：版號往上跳了，這裡改驗「不比 5.16 舊」（每一版的版號測試都要能被後續版本沿用）
ok(vm && vm[1].split('.').map(Number)[1] >= 16, '版本是 5.16 以上（' + (vm ? vm[1] : '?') + '）');
ok(SRC.indexOf('id="avModal"') > 0, '有頭貼編輯彈窗 #avModal');
ok(SRC.indexOf('id="avStage"') > 0 && SRC.indexOf('id="avCanvas"') > 0, '有裁切畫布');
ok(SRC.indexOf('id="avZoom"') > 0 && /type="range"/.test(SRC), '有縮放拉桿');
ok(SRC.indexOf('id="avFile"') > 0 && /id="avFile"[^>]*accept="image\/\*"/.test(SRC), '選檔只收圖片');
ok(SRC.indexOf('.avstage {') > 0 && SRC.indexOf('.avring {') > 0, '裁切框有樣式（方框＋圓形取景）');
ok(SRC.indexOf('.odeq ') > 0 && SRC.indexOf('.achpin') > 0, '配戴成就／配戴按鈕有樣式');

/* ---------------------------------------------------------------- ② */
head('② 配戴成就（Ach.equip）');
const e2 = makeEnv();
const A2 = e2.BH;
ok(A2.Ach.EQ_MAX === 3, '最多配戴 3 個');
let r = A2.Ach.equip('brKill_0');
ok(!r.ok && r.err === 'NOT_UNLOCKED', '沒解鎖不能配戴');
ok(A2.Ach.equip('no_such_0').err === 'BAD_ID', '不存在的成就 id 會被擋');

A2.Ach.setMax('brKill', 100);                 // 解鎖 10/25/50/100 四階
ok(A2.Ach.isUnlocked('brKill_0') && A2.Ach.isUnlocked('brKill_3'), '擊殺 100 → 解鎖前四階');
r = A2.Ach.equip('brKill_0');
ok(r.ok && r.on === 1, '解鎖後可以配戴');
ok(A2.Ach.isEquipped('brKill_0') && A2.Ach.equipped().length === 1, '配戴清單有 1 個');
ok(A2.Ach.equipped()[0].ico && A2.Ach.equipped()[0].name, '配戴的成就帶圖示與名字');

r = A2.Ach.equip('brKill_0');
ok(r.ok && r.on === 0 && A2.Ach.equipped().length === 0, '再按一次＝取消配戴');

A2.Ach.equip('brKill_0'); A2.Ach.equip('brKill_1'); A2.Ach.equip('brKill_2');
r = A2.Ach.equip('brKill_3');
ok(!r.ok && r.err === 'FULL', '第 4 個會被擋（不是默默覆蓋）');
ok(A2.Ach.equipped().length === 3, '還是 3 個');

const mini = A2.Ach.equippedMini();
ok(mini.length === 3 && mini[0].i && mini[0].n, '給名單用的迷你格式有圖示與名字');
ok(mini[0].id === undefined && mini[0].key === undefined, '迷你格式不會把整份成就表傳出去');

const st = A2.Ach.state();
ok(Array.isArray(st.eq) && st.eq.length === 3, '存檔會帶上 eq');
ok(st.eq !== A2.Ach.state().eq, 'state() 回的是複本（外面改動不會污染）');

/* 換裝置／雲端合併：以本機為準，且濾掉不存在或沒解鎖的 */
const mm = A2.Ach.merge({ eq: ['brKill_0'], u: { brKill_0: 1 } }, { eq: ['brKill_2'], u: { brKill_2: 1 } });
ok(mm.eq.length === 1 && mm.eq[0] === 'brKill_2', '合併時以「這台裝置挑的」為準');
const mm2 = A2.Ach.merge({ eq: [] }, { eq: ['ghost_9'] });
ok(mm2.eq.length === 0, '合併時濾掉不存在的成就 id');

A2.Ach.unequip('brKill_2');
ok(A2.Ach.equipped().length === 2, 'unequip 可以單獨拿掉一個');
A2.Ach.clearEq();
ok(A2.Ach.equipped().length === 0, 'clearEq 全部清空');

/* 降級時（Ach 掛掉）不能讓呼叫端爆炸 */
ok(typeof A2.Ach.equippedMini === 'function' && typeof A2.Ach.equip === 'function', 'API 都有匯出');

/* ---------------------------------------------------------------- ③ */
head('③ 頭貼：前端的壓圖與裁切');
ok(/const AV_OUT = 128/.test(SRC), '輸出固定 128×128（顯示最大 56px，高解析度也夠）');
ok(SRC.indexOf("toDataURL('image/webp'") > 0, '優先壓成 WebP');
ok(SRC.indexOf("toDataURL('image/jpeg'") > 0, '不支援 WebP 才退回 JPEG');
ok(/AV_Q = \.72/.test(SRC), '品質 0.72（照片約 5～9 KB）');
const avMax = +(SRC.match(/AV_MAX_CHARS = (\d+)/) || [0, 0])[1];
ok(avMax === 22000 && avMax < 24000, '前端上限 22000 字元＜伺服器 24000（不會白傳一趟才被退）');
ok(SRC.indexOf('edOut(.62, 112)') > 0 && SRC.indexOf('edOut(.52, 96)') > 0, '太大會自動降尺寸再試兩次');
ok(SRC.indexOf('function edDown(') > 0 && SRC.indexOf('pointerdown') > 0, '可以拖曳（Pointer 事件，滑鼠＋觸控共用）');
ok(/Ed\.base = Math\.max\(Ed\.w \/ iw, Ed\.h \/ ih\)/.test(SRC), '用 cover 填滿（不會出現黑邊）');
ok(SRC.indexOf('edClamp') > 0 && SRC.indexOf('Math.min(0, Math.max(Ed.w - dw') > 0, '拖曳有邊界（不會把照片拖出框外）');
ok(SRC.indexOf("avBox(p, 'onav')") > 0 && SRC.indexOf("avBox(p, 'odav')") > 0, '名單列與資料頁都用頭貼');
ok(SRC.indexOf('function ensureAv(') > 0 && SRC.indexOf('p.avt') > 0, '名單只帶版本，版本變了才補圖');
ok(SRC.indexOf("'/api/social/avatar'") > 0, '上傳走 /api/social/avatar');
ok(SRC.indexOf('id="socAvPick"') > 0 && SRC.indexOf('id="socAvBtn"') > 0, '我的資料可以點頭貼／按鈕換圖');

/* ---------------------------------------------------------------- ④ */
head('④ 後端：頭貼獨立分片（不拖累心跳）');
ok(/avatars: \{ v: 1, m: \{\} \}/.test(CLOUD_SRC), 'db 有獨立的 avatars 分片');
ok(/avatars: db\.avatars \|\|/.test(CLOUD_SRC), 'avatars 是一個獨立分片（不是塞進 social）');
ok(/const AV_MAX = 200, AV_KEEP = 45 \* 86400000, AV_TOTAL = 1300000, AV_ONE = 24000;/.test(CLOUD_SRC),
  '上限 200 人／1.3 MB／單張 24 KB');
ok(CLOUD_SRC.indexOf('avt: me.avt || 0') > 0, '名單只回傳 avt（版本）');
ok(CLOUD_SRC.indexOf('if (ac.eq === undefined)') < 0, '（略）');

/* ---------------------------------------------------------------- ⑤ */
head('⑤ 後端真的跑一次');
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bh-v516-'));
  const cloud = cloudMod.createCloud({ dir: dir, persist: true, env: {}, fetch: makeFetch() });
  await cloud.ready;

  async function call(method, u, body) {
    const res = mkRes();
    const req = mkReq(method, u, body);
    const done = await cloud.handle(req, res, new URL('http://x' + u));
    let j = {};
    try { j = JSON.parse(res.body || '{}'); } catch (e) {}
    return { done: done, code: res.code, j: j };
  }

  const A = 'dev-av-aaaaaaaa-1111', B = 'dev-av-bbbbbbbb-2222';
  let r = await call('POST', '/api/social/hb', { deviceId: A, name: '甲', ch: 0, kind: 'guest' });
  const pidA = r.j.me.pid;
  ok(!!pidA, '甲上線（' + pidA + '）');
  ok(r.j.me.eq && r.j.me.eq.length === 0, '預設沒有配戴成就');

  const IMG = 'data:image/webp;base64,' + 'A'.repeat(900);
  r = await call('POST', '/api/social/avatar', { deviceId: A, img: IMG });
  ok(r.j.ok && r.j.bytes === IMG.length && r.j.avt > 0, '上傳成功並回版本時間');
  ok(cloud.db.avatars.m[pidA] && cloud.db.avatars.m[pidA].d === IMG, '圖片存在 avatars 分片');
  ok(cloud.db.social.players[pidA].av === undefined, '圖片不在 social 分片裡（心跳不會重傳圖片）');
  ok(JSON.stringify(cloud.db.social).indexOf('base64') < 0, '整份 social 分片沒有 base64（這是要害）');

  await call('GET', '/api/social/list?deviceId=' + B + '&name=乙');
  r = await call('GET', '/api/social/list?deviceId=' + B + '&name=乙');
  const seenA = r.j.list.filter(function (p) { return p.pid === pidA; })[0];
  ok(seenA && seenA.avt > 0, '別人的名單看得到頭貼版本');
  ok(seenA && seenA.av === undefined && seenA.d === undefined, '名單不會夾帶圖片本體');

  r = await call('GET', '/api/social/av?pids=' + pidA);
  ok(r.j.ok && r.j.av[pidA] && r.j.av[pidA].d === IMG, '按版本補圖才抓得到');
  ok(r.j.av[pidA].t > 0, '補圖順便回版本時間（前端可以快取）');

  r = await call('POST', '/api/social/avatar', { deviceId: A, img: 'data:text/html;base64,PHNjcmlwdD4=' });
  ok(r.code === 400 && r.j.err === 'BAD_IMG', '只收 image/jpeg|webp|png');
  r = await call('POST', '/api/social/avatar', { deviceId: A, img: 'data:image/png;base64,' + 'B'.repeat(26000) });
  ok(r.code === 400 && r.j.err === 'BAD_IMG', '超過 24 KB 會被擋（不會把分片撐爆）');
  r = await call('POST', '/api/social/avatar', { deviceId: A, img: 'javascript:alert(1)' });
  ok(r.code === 400, '不是 data:image 的一律拒絕');

  const oldT = cloud.db.social.players[pidA].avt;
  r = await call('POST', '/api/social/avatar', { deviceId: A, img: '' });
  ok(r.j.ok && !cloud.db.avatars.m[pidA], '傳空字串＝移除頭貼');
  ok(cloud.db.social.players[pidA].avt >= oldT, '移除也會換版本（別人的快取才會跟著清）');

  /* 配戴成就：跟著心跳送上去，別人名單看得到 */
  r = await call('POST', '/api/social/hb', {
    deviceId: A, name: '甲',
    eq: [{ i: '☠️', n: '初試身手' }, { i: '🏆', n: '初次封王' }, { i: '🔥', n: '龍焰初燒' }, { i: 'X', n: '第四個' }]
  });
  ok(r.j.me.eq.length === 3, '配戴最多 3 個（第 4 個被丟掉）');
  ok(r.j.me.eq[0].i === '☠️' && r.j.me.eq[0].n === '初試身手', '圖示與名字都留著');
  r = await call('GET', '/api/social/list?deviceId=' + B + '&name=乙');
  const p2 = r.j.list.filter(function (p) { return p.pid === pidA; })[0];
  ok(p2 && p2.eq.length === 3, '別人看得到你配戴的成就');

  /* 心跳沒帶 eq 時不能被清空 */
  r = await call('POST', '/api/social/hb', { deviceId: A, name: '甲' });
  ok(r.j.me.eq.length === 3, '沒帶 eq 的心跳不會把已配戴的清掉');

  /* XSS / 髒字元 */
  r = await call('POST', '/api/social/hb', { deviceId: B, name: '<b>乙</b>', eq: [{ i: '<img>', n: '<script>x' }] });
  ok(r.j.me.name.indexOf('<') < 0, '暱稱會濾掉角括號');
  ok(r.j.me.eq[0].n.indexOf('<') < 0 && r.j.me.eq[0].i.indexOf('<') < 0, '配戴成就的圖示／名字也會濾掉角括號');

  /* 清掉過期頭貼：45 天沒換又沒上線 */
  cloud.db.avatars.m['p_deadbeef01'] = { d: IMG, t: Date.now() - 60 * 86400000 };
  await call('POST', '/api/social/avatar', { deviceId: A, img: IMG });
  ok(!cloud.db.avatars.m['p_deadbeef01'], '45 天沒動的頭貼會被清掉（不會無限長大）');

  const parts = Object.keys(cloud.db);
  ok(parts.indexOf('avatars') >= 0, 'db 有 avatars');
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}

  console.log('\n通過 ' + pass + ' 項，失敗 ' + fail + ' 項');
  process.exit(fail ? 1 : 0);
})().catch(function (e) {
  console.error('測試本身出錯：', e && e.stack || e);
  process.exit(1);
});
