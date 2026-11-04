// v4.90 驗證：開發者後台改版／手把 1P~4P 指派／大逃殺 AI 社交距離
// 跑法：node test/verify-v490.js
const fs = require('fs');
const path = require('path');
const { makeEnv } = require('./_sandbox');

let pass = 0, fail = 0;
function ok(cond, msg, extra) {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ FAIL: ' + msg + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}
const SRC = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const CLOUD = fs.readFileSync(path.join(__dirname, '..', '..', 'cloud.js'), 'utf8');

/* ================= ① 開發者後台 ================= */
console.log('=== ① 開發者後台：分頁 ＋ 雙欄 ＋ 全部看得到 ===');
const tabCount = (SRC.match(/<button type="button" data-tab="/g) || []).length;
ok(tabCount === 5, '五個分頁（總覽／會員／即時／系統／工具）', tabCount);
const paneCount = (SRC.match(/data-pane="/g) || []).length;
ok(paneCount === 5, '五個頁面容器', paneCount);
ok(/id="bhStats"/.test(SRC), '總覽統計容器存在');
ok(/id="bhHealth"/.test(SRC), '伺服器即時狀態容器存在（/api/health 全部欄位）');
ok(/id="bhRecent"/.test(SRC), '最近活動帳號清單存在');
ok(/id="bhSplit"/.test(SRC) && /id="bhList"/.test(SRC) && /id="bhDetail"/.test(SRC),
  '會員頁是「左清單／右詳情」雙欄');
ok(/id="bhRaw"/.test(SRC) && /<pre[^>]*id="bhRaw"/.test(SRC), '系統頁有原始 JSON 區塊');
ok(/id="bhLbList"/.test(SRC) && /id="bhLbMode"/.test(SRC), '即時頁可切換每日／每週榜');
ok(/id="bhExportAcc"/.test(SRC) && /id="bhExportRaw"/.test(SRC), '工具頁可匯出帳號／完整 dump');
ok(!/class="adtab"/.test(SRC), '舊的 9 欄表格已移除（手機不再被截斷）');
ok(/\.bhrow \{/.test(SRC) && /\.bhsplit \{/.test(SRC), '改用卡片列 ＋ 雙欄容器');
ok(/@media \(max-width: 880px\)[\s\S]{0,1400}\.bhsplit\.show-detail/.test(SRC),
  '手機（<880px）走「清單→詳情」換頁，不是硬擠兩欄');
ok(/\.bhcard \{[^}]*height: min\(94vh/.test(SRC), '桌機後台吃滿高度（不再 34vh／32vh 兩條小窗）');
ok(/function setTab\(name\)/.test(SRC) && /setTab: setTab/.test(SRC), '分頁切換有對外匯出');
ok(/api\('\/api\/admin\/dump'\)/.test(SRC), '前端會抓 /api/admin/dump');
ok(CLOUD.indexOf("p === '/api/admin/dump'") > 0, '後端有 /api/admin/dump 端點');
ok(/accounts: all,/.test(CLOUD) && /devices: db\.devices/.test(CLOUD) && /lb: db\.lb/.test(CLOUD),
  'dump 真的把帳號／裝置／排行榜整包吐出來');
ok(/不含密碼雜湊/.test(CLOUD), 'dump 不含密碼雜湊（只給 hasPass）');
ok(SRC.indexOf("'#bhModal .bhpane'") > 0 || SRC.indexOf('#bhModal .bhpane') > 0,
  '分頁切換是真的切 DOM 頁面');

/* ================= ② 手把 ================= */
console.log('=== ② 手把：1P~4P 指派 ===');
const env = makeEnv();
const B = env.BH, G = env.G;
const I = B.Input;
ok(typeof I.padInfo === 'function', 'Input.padInfo 有匯出');
ok(typeof I.padAssign === 'function', 'Input.padAssign 有匯出');
ok(typeof I.padReset === 'function', 'Input.padReset 有匯出');
ok(typeof I.padPhys === 'function', 'Input.padPhys 有匯出');
ok(/PAD_SLOT_KEY/.test(SRC) && /bombhero-pads-v1/.test(SRC), '指派結果會存 localStorage');
ok(/const pi = padPhys\(slot\)/.test(SRC), 'padScheme 已改成查「玩家槽」（不是瀏覽器原始索引）');
ok(/const pi = padSlotIdx\[s\];/.test(SRC), 'pollPads 回傳槽順序（不是原始索引）');
ok(/v4\.90：手把 → 玩家槽/.test(SRC), '有映射層註解（避免後人改回去）');

// 模擬「只有第 3 個索引有手把」——舊版這裡 1P 完全沒反應
const fakePad = (id) => ({ id: id, connected: true, index: 0, mapping: 'standard', buttons: new Array(17).fill({ pressed: false, value: 0 }), axes: [0, 0, 0, 0] });
const pA = fakePad('Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e)');
env.sandbox.navigator.getGamepads = () => [null, null, pA, null];
I.framePads();
let info = I.padInfo();
ok(info.pads.length === 1, '只認「真的有連線」的手把（null 洞被跳過）', info.pads.length);
ok(info.pads[0].idx === 2, '手把實際在索引 2', info.pads[0].idx);
ok(info.slots[0] === 2, '索引 2 的手把被排到 1P（舊版這裡是 -1／沒反應）', info.slots);
ok(/Xbox Wireless Controller/.test(info.pads[0].name), '名稱去掉括號雜訊：' + info.pads[0].name);
ok(info.pads[0].buttons === 17 && info.pads[0].axes === 4, '有回報按鍵／軸數量');

// 兩支同款手把也要分得開（token 用 id＋序號）
const pB = fakePad('Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e)');
env.sandbox.navigator.getGamepads = () => [pA, pB, null, null];
I.framePads();
info = I.padInfo();
ok(info.pads.length === 2, '兩支手把都抓到', info.pads.length);
ok(info.pads[0].token !== info.pads[1].token, '同型號兩支 token 不同（' + info.pads[0].token + ' / ' + info.pads[1].token + '）');
ok(info.slots[0] === 0 && info.slots[1] === 1, '自動排成 1P／2P', info.slots);

// 手動改派：把第二支換到 4P
const tokB = info.pads[1].token;
I.padAssign(tokB, 3);
info = I.padInfo();
ok(info.slots[3] === 1 && info.slots[1] === -1, '手動把第 2 支改到 4P，原本的 2P 空出來', info.slots);
ok(String(env.storage['bombhero-pads-v1'] || '').indexOf('Xbox') >= 0, '指派有寫進 localStorage');

// 一支手把不能同時佔兩個槽
I.padAssign(tokB, 0);
info = I.padInfo();
ok(info.slots[0] === 1 && info.slots[3] === -1, '改派時會自動清掉舊槽（不會一支佔兩位）', info.slots);

I.padReset();
info = I.padInfo();
ok(info.slots[0] === 0 && info.slots[1] === 1, '清除指派後重新自動排 1P／2P', info.slots);

/* ================= ③ 大逃殺 AI ================= */
console.log('=== ③ 大逃殺 AI：社交距離 ＋ 群體分離 ===');
ok(B.BR_STANDOFF === 2.4, '交戰距離 2.4 格');
ok(B.BR_ENGAGE === 8, '超過 8 格就不主動追');
ok(typeof B.aiBrChoose === 'function' && typeof B.aiBrCrowd === 'function' &&
  typeof B.aiBrLeastCrowded === 'function', '三個新函式都有匯出');

G.cols = 11; G.rows = 11; G.T = 40; G.spdK = 1;
G.bombs = []; G.flames = []; G.particles = []; G.enemies = []; G.items = [];
G.grid = [];
for (let y = 0; y < 11; y++) {
  const row = [];
  for (let x = 0; x < 11; x++) row.push((x === 0 || y === 0 || x === 10 || y === 10) ? 1 : 0);
  G.grid.push(row);
}
function mkP2(x, y) {
  return { x: x, y: y, alive: true, maxBombs: 1, carry: false, team: -1, ai: true };
}
const me = mkP2(5 * 40 + 20, 5 * 40 + 20);
const foe = mkP2(6 * 40 + 20, 5 * 40 + 20);
G.players = [me, foe];

// 對手貼在右邊一格 → AI 不該再往右撞上去
let left = 0, right = 0;
for (let i = 0; i < 40; i++) {
  const c = B.aiBrChoose(me, ['up', 'down', 'left', 'right'], 5, 5,
    { x: foe.x, y: foe.y, foe: true, p: foe }, 40 * 40);
  if (!c) continue;
  if (c.dir === 'left') left++;
  if (c.dir === 'right') right++;
}
ok(left >= 30, '對手貼身時會往後退（40 次裡 ' + left + ' 次選「後退」）');
ok(right <= 3, '幾乎不會繼續往對手身上撞（只有 ' + right + ' 次）');

// 對手很遠 → 允許靠近，但不追超過 8 格（靠分數而非硬性）
const farFoe = mkP2(19 * 40, 5 * 40);
G.players = [me, farFoe];                     // 只留遠的那隻，免得近的那隻影響分數
let closeCnt = 0;
for (let i = 0; i < 40; i++) {
  const c = B.aiBrChoose(me, ['up', 'down', 'left', 'right'], 5, 5,
    { x: farFoe.x, y: farFoe.y, foe: true, p: farFoe }, (19 - 5) * (19 - 5) * 40 * 40);
  if (c && c.dir === 'right') closeCnt++;
}
ok(closeCnt >= 25, '遠處對手仍會靠近（' + closeCnt + '/40）');

// 群體分離：同一格最擠
const blockA = mkP2(5 * 40 + 20, 5 * 40 + 20);
const blockB = mkP2(5 * 40 + 20, 5 * 40 + 20);   // 兩個 AI 疊在同一格
G.players = [me, blockA, blockB];
ok(B.aiBrCrowd(me, 5, 5) === 6, '同一格有兩個 AI → 擁擠值 6', B.aiBrCrowd(me, 5, 5));
G.players = [me, blockA];
ok(B.aiBrCrowd(me, 5, 5) === 3, '同格 3 分', B.aiBrCrowd(me, 5, 5));
ok(B.aiBrCrowd(me, 5, 4) === 1, '相鄰 1 分', B.aiBrCrowd(me, 5, 4));
ok(B.aiBrCrowd(me, 3, 5) === 0, '兩格外 0 分', B.aiBrCrowd(me, 3, 5));

// 兩個 AI 疊在一起 → 會挑「最少人的方向」離開
const blockC = mkP2(6 * 40 + 20, 5 * 40 + 20);   // 右邊那格有人
G.players = [me, blockC];
let away = 0;
for (let i = 0; i < 40; i++) {
  const c = B.aiBrChoose(me, ['up', 'down', 'left', 'right'], 5, 5, null, Infinity);
  if (c && c.dir !== 'right') away++;    // right 是另一隻 AI 所在
}
ok(away >= 34, '被擠住時會往別的方向散開（' + away + '/40）');
const least = B.aiBrLeastCrowded(me, ['up', 'down', 'left', 'right'], 5, 5);
ok(least && least !== 'right', '落石／逃命挑「最不擠」的方向（' + least + '）');

console.log('=== ④ 靜態：舊行為真的走掉了 ===');
ok(/if \(BR_AI\.on\) \{\s*const ch = aiBrChoose\(p, safeOpts/.test(SRC),
  'controlAI 在大逃殺時改走 aiBrChoose');
ok(/if \(!BR_AI\.on && mineCount < p\.maxBombs/.test(SRC),
  '舊的「貼上去才放彈」在大逃殺已被停用');
ok(/else if \(BR_AI\.on && brBomb\)/.test(SRC), '大逃殺改由社交距離決策決定要不要放彈');
ok(/BR_AI\.on \? aiBrLeastCrowded\(p, safeOpts, cx, cy\)/.test(SRC),
  '落石階段的固定選向也改成「挑最不擠」');

console.log('\n========================================');
console.log('v4.90 後台／手把／大逃殺 AI：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
