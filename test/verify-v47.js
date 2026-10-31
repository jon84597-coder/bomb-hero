// 無頭測試 v47（v4.1）：帳號 / 第三方登入 / 雲端存檔 / 資安純函式
// 只測 cloud.js 的後端邏輯（HTTP 層由 net-auth.js 測）
const path = require('path');
const fs = require('fs');
// 本機開發時 cloud.js 在 bomberman-online/；匯出後就在專案根目錄
const C = require(fs.existsSync(path.join(__dirname, '..', 'cloud.js'))
  ? path.join(__dirname, '..', 'cloud.js')
  : path.join(__dirname, '..', '..', 'bomberman-online', 'cloud.js'));

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}

console.log('\n=== 0. 常數 ===');
ok(C.BASE_POINTS === 9, '創角配點 9 點');
ok(C.CAP === 10, '單項上限 10 格');
ok(C.MAX_POINTS === 40, '四項全滿 40 點');
ok(C.MAX_STAGE === 32, 'RPG 共 32 關');

console.log('\n=== 1. 點數成長（每 5 關 +1 點）===');
ok(C.pointsTotalFor(0) === 9, '第 0 關可配 9 點');
ok(C.pointsTotalFor(4) === 9, '第 4 關仍是 9 點');
ok(C.pointsTotalFor(5) === 10, '第 5 關 10 點');
ok(C.pointsTotalFor(32) === 15, '破完 32 關 15 點');
ok(C.pointsTotalFor(999) === 15, '超出範圍會被夾住（不會爆點）');
ok(C.pointsTotalFor(-5) === 9, '負數不會少給點');

console.log('\n=== 2. 金幣獎勵 ===');
ok(C.stageReward(1) === 40, '第 1 關 40 金');
ok(C.stageReward(4) === 40, '第 4 關 40 金');
ok(C.stageReward(5) === 50, '第 5 關（換主題）50 金');
ok(C.goldFor(0) === 0, '0 關 0 金');
ok(C.goldFor(1) === 40, '1 關 40 金');
ok(C.goldFor(8) === 360, '8 關 40*4+50*4 = 360 金');

console.log('\n=== 3. 配點合法性（後端唯一真相）===');
let v = C.validateAlloc({ hp: 3, def: 2, spd: 2, atk: 2 }, 9);
ok(v.ok && v.spent === 9 && v.cap === 9, '9 點配置合法');
v = C.validateAlloc({ hp: 3, def: 3, spd: 2, atk: 2 }, 9);
ok(!v.ok && v.err === 'POINT_OVERFLOW', '10 點超過上限 → POINT_OVERFLOW');
v = C.validateAlloc({ hp: 10, def: 0, spd: 0, atk: 0 }, 9);
ok(!v.ok && v.err === 'POINT_OVERFLOW', '單項點滿但總和超過 → 擋掉');
v = C.validateAlloc({ hp: 11, def: 0, spd: 0, atk: 0 }, 40);
ok(!v.ok && v.err === 'ATTR_CAP', '單項 11 格 → ATTR_CAP');
v = C.validateAlloc({ hp: -1, def: 0, spd: 0, atk: 0 }, 9);
ok(!v.ok && v.err === 'NEGATIVE', '負數 → NEGATIVE');
v = C.validateAlloc({ hp: '4', def: 2, spd: 2, atk: 1 }, 9);
ok(v.ok && v.alloc.hp === 4 && v.spent === 9, '字串數字會被收斂成整數');

console.log('\n=== 4. 單次配點 spendPoint ===');
let rpg = C.defaultRpg();
ok(C.sumAlloc(rpg.alloc) === 9, '預設配置剛好 9 點');
let r = C.spendPoint(rpg, 'hp', 1);
ok(!r.ok && r.err === 'NO_POINTS', '點數用完再加 → NO_POINTS');
r = C.spendPoint(rpg, 'hp', -1);
ok(r.ok && rpg.alloc.hp === 2 && r.left === 1, '退 1 點成功（剩 1 點）');
r = C.spendPoint(rpg, 'hp', 1);
ok(r.ok && rpg.alloc.hp === 3 && r.left === 0, '加回來成功');
r = C.spendPoint(rpg, 'atk', 1);
ok(!r.ok && r.err === 'NO_POINTS', '沒點數不能加');
r = C.spendPoint(rpg, 'luck', 1);
ok(!r.ok && r.err === 'BAD_ATTR', '非法屬性 → BAD_ATTR');
r = C.spendPoint(rpg, 'hp', 5);
ok(!r.ok && r.err === 'BAD_DELTA', '非法增量 → BAD_DELTA');
rpg.cleared = 10; rpg.gold = C.goldFor(10);
ok(C.pointsTotalFor(10) === 11, '10 關後有 11 點可配');
r = C.spendPoint(rpg, 'hp', 1);
ok(r.ok && r.left === 1, '多出來的 2 點可以繼續配');
r = C.spendPoint(rpg, 'hp', 1);
ok(r.ok && rpg.alloc.hp === 5, '配到第 5 格');
ok(rpg.ver > 1, '每次配點 ver 會遞增（存檔版本號）');

console.log('\n=== 5. 過關順序（不能跳關）===');
let rg = C.defaultRpg();
r = C.applyClear(rg, 1, { deaths: 2, playSec: 120 });
ok(r.ok && rg.cleared === 1 && rg.gold === 40, '第 1 關通關 → 解鎖 2，+40 金');
ok(r.unlocked === 2, '回傳解鎖到第 2 關');
r = C.applyClear(rg, 3, null);
ok(!r.ok && r.err === 'STAGE_LOCKED' && r.need === 2, '跳打第 3 關 → STAGE_LOCKED');
r = C.applyClear(rg, 2, null);
ok(r.ok && rg.cleared === 2 && rg.gold === 80, '依序打第 2 關 → +40 金');
r = C.applyClear(rg, 1, null);
ok(r.ok && r.replay === true && rg.gold === 80, '重打舊關卡不重複給金幣');
r = C.applyClear(rg, 0, null);
ok(!r.ok && r.err === 'BAD_STAGE', '第 0 關 → BAD_STAGE');
r = C.applyClear(rg, 33, null);
ok(!r.ok && r.err === 'BAD_STAGE', '第 33 關 → BAD_STAGE');
r = C.applyClear(rg, '2', null);
ok(r.ok, '字串關卡號也能正確處理');

console.log('\n=== 6. 遊客 → 正式帳號合併（不覆蓋）===');
let base = C.defaultRpg();
let guest = C.defaultRpg();
guest.cleared = 6; guest.gold = C.goldFor(6); guest.alloc = { hp: 1, def: 1, spd: 5, atk: 4 };
let m = C.mergeProgress(base, guest);
ok(m.cleared === 6, '關卡取最遠（6）');
ok(m.gold >= C.goldFor(6), '金幣不會倒退（' + m.gold + '）');
ok(m.alloc.atk === 4 && m.alloc.spd >= 4, '遊客的配點被保留（進度較遠者優先）');
ok(C.sumAlloc(m.alloc) <= C.pointsTotalFor(m.cleared), '合併後點數仍在合法上限內');
let base2 = C.defaultRpg(); base2.cleared = 12; base2.gold = C.goldFor(12); base2.alloc = { hp: 5, def: 3, spd: 1, atk: 2 };
let guest2 = C.defaultRpg(); guest2.cleared = 2;
let m2 = C.mergeProgress(base2, guest2);
ok(m2.cleared === 12, '正式帳號進度較遠 → 保留 12');
ok(m2.alloc.hp === 5, '保留正式帳號自己的配點（不會被遊客蓋掉）');
ok(m2.gold >= base2.gold, '金幣取兩邊較多者');
let base3 = C.defaultRpg();
let guest3 = C.defaultRpg(); guest3.alloc = { hp: 10, def: 10, spd: 10, atk: 10 };
let m3 = C.mergeProgress(base3, guest3);
ok(C.sumAlloc(m3.alloc) === 9, '誇張存檔合併時會被夾回 9 點上限');
ok(C.sumAlloc(m3.alloc) === C.fitAlloc(guest3.alloc, 9).hp +
  C.fitAlloc(guest3.alloc, 9).def + C.fitAlloc(guest3.alloc, 9).spd + C.fitAlloc(guest3.alloc, 9).atk,
  'fitAlloc 是唯一收斂路徑');

console.log('\n=== 7. 存檔 HMAC 簽章 ===');
const SEC = 'unit-test-secret';
let acc = { id: 'g_abc123', rpg: C.defaultRpg() };
let env = C.makeEnvelope(SEC, acc);
ok(env.sig.length >= 40, '簽章長度合理（base64url HMAC-SHA256）');
ok(C.verifyEnvelope(SEC, env.payload, env.sig).ok, '原封不動 → 驗章通過');
let bad = JSON.parse(JSON.stringify(env));
bad.payload.rpg.alloc.hp = 10;
ok(!C.verifyEnvelope(SEC, bad.payload, env.sig).ok, '改配點 → 驗章失敗');
let bad2 = JSON.parse(JSON.stringify(env));
bad2.payload.rpg.gold = 999999;
ok(!C.verifyEnvelope(SEC, bad2.payload, env.sig).ok, '改金幣 → 驗章失敗');
let bad3 = JSON.parse(JSON.stringify(env));
bad3.payload.uid = 'u_evil';
ok(!C.verifyEnvelope(SEC, bad3.payload, env.sig).ok, '改帳號 id → 驗章失敗');
ok(!C.verifyEnvelope('wrong-secret', env.payload, env.sig).ok, '換密鑰 → 驗章失敗');
ok(!C.verifyEnvelope(SEC, env.payload, '').ok, '沒有簽章 → 拒絕');
// 鍵序不影響簽章（JSON.parse 重排後仍要通過）
let shuf = JSON.parse(JSON.stringify(env.payload));
ok(C.canonical(shuf) === C.canonical(env.payload), 'canonical 序列化與鍵序無關');
ok(C.verifyEnvelope(SEC, shuf, env.sig).ok, '重新序列化（鍵序不同）仍驗章通過');

console.log('\n=== 8. Session token ===');
let tok = C.makeToken(SEC, 'g_abc123');
let s = C.readToken(SEC, tok);
ok(s && s.uid === 'g_abc123', 'token 可還原 uid');
ok(C.readToken('other', tok) === null, '換密鑰 → token 失效');
ok(C.readToken(SEC, tok.slice(0, -2) + 'xx') === null, '簽章被改 → token 失效');
ok(C.readToken(SEC, C.makeToken(SEC, 'g_abc123', -1000)) === null, '過期 token 失效');
ok(C.readToken(SEC, '') === null, '空 token → null');

console.log('\n=== 9. 頻率限制（token bucket）===');
const lim = C.makeLimiter();
let t0 = 1000000;
ok(lim.take('k', 3, 1, t0).ok, '第 1 次通過');
ok(lim.take('k', 3, 1, t0).ok, '第 2 次通過');
ok(lim.take('k', 3, 1, t0).ok, '第 3 次通過');
let lb = lim.take('k', 3, 1, t0);
ok(!lb.ok && lb.retry >= 1, '第 4 次被擋（每秒 1 次的存檔限制）');
ok(lim.take('other', 3, 1, t0).ok, '不同帳號／IP 不互相影響');
ok(lim.take('k', 3, 1, t0 + 1100).ok, '等 1.1 秒後補回 1 個額度');
ok(!lim.take('k', 3, 1, t0 + 1100).ok, '補回後再打又被擋');

console.log('\n=== 10. 安全性質（不信任前端數值）===');
// 就算前端把 cleared 亂報，applyClear 也不會直接接受跳關
let cheat = C.defaultRpg();
let rc = C.applyClear(cheat, 30, null);
ok(!rc.ok, '直接宣告破到第 30 關 → 拒絕');
ok(cheat.cleared === 0, '狀態沒有被寫入');
// 配點超過上限直接被 validateAlloc 擋
ok(!C.validateAlloc({ hp: 10, def: 10, spd: 10, atk: 10 }, 9).ok, '四項全滿的存檔 → 擋掉');
// 金幣不會因為前端給值而改變
let g2 = C.defaultRpg();
C.applyClear(g2, 1, { gold: 999999 });
ok(g2.gold === 40, '前端塞 gold=999999 也只領到伺服器算的 40');
ok(C.stageReward(1) === 40 && g2.gold === C.stageReward(1), '金幣完全由後端公式決定');

console.log('\n=== 11. 遊客 → 正式帳號綁定（bindGuest，裝置一起換手）===');
const os2 = require('os');
const fs2 = require('fs');
const tmp = fs2.mkdtempSync(path.join(os2.tmpdir(), 'bh-bind-'));
const cc = C.createCloud({ dir: tmp, persist: false, secret: 'bind-secret' });
const ga = cc._internals.createAccount('guest', { name: '遊客' });
ga.rpg.cleared = 7; ga.rpg.gold = 300; ga.rpg.alloc = { hp: 2, def: 2, spd: 3, atk: 2 };
cc.db.devices['hashA'] = ga.id;
cc.db.devices['hashB'] = ga.id;
const ma = cc._internals.createAccount('member', { name: 'Jon', provider: 'google' });
ok(cc._internals.bindGuest(ma, ga) === true, '綁定成功回傳 true');
ok(ma.rpg.cleared === 7, '關卡進度合併（7）');
ok(ma.rpg.gold === 300, '金幣合併（300）');
ok(ma.rpg.alloc.spd === 3, '配點合併（遊客進度較遠，採用他的配點）');
ok(ga.mergedInto === ma.id, '遊客帳號標記為「已合併」');
ok(cc.db.devices['hashA'] === ma.id && cc.db.devices['hashB'] === ma.id, '同一台裝置的舊 session 之後都指向正式帳號');
ok(cc._internals.bindGuest(ma, ga) === false, '重複綁定不會二次合併（不會把點數洗回來）');
ok(cc._internals.bindGuest(ma, ma) === false, '自己綁自己 → 不做任何事');

console.log('\n[v47] ' + pass + ' 通過、' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
