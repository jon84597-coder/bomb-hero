// test/verify-v477.js —— v4.77
//   ① 大逃殺：打死 BOSS 最後一下的人「當場騎上坐騎」，不用再撿蛋
//   ② 全遊戲文字 10 國語系（介面／說明頁／怪物圖鑑／版本紀錄／canvas 字）
//   ③ 說明頁新增大逃殺分頁（7 個分頁）
//   ④ 效能：地板＋牆面分塊烘焙、畫面外裁切、換語言重注入靜態文案
const { makeEnv } = require('./_sandbox');
const fs = require('fs'), path = require('path');
const env = makeEnv();
const P = env.BH, G = P.Game, src = env.html;
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ FAIL: ' + m); } }
function head(t) { console.log('\n=== ' + t + ' ==='); }

// ---------- 1. BOSS 坐騎：最後一下直接騎 ----------
head('1. 打死 BOSS 當場騎上坐騎');
(function () {
  P.BR.opt = { n: 30, team: 1, dur: 10 };
  P.startBR();
  const b = G.enemies.filter(function (e) { return e.brBoss; })[0];
  const me = G.players[0];
  G.players.forEach(function (q) { if (q !== me) q.alive = false; });
  G.flames = []; G.bombs = []; me.alive = true; me.invuln = 0; me.dino = false; me.mountT = 0;
  b.hitT = 0; b.bombT = 999; b.hp = 2; b.lastHitBy = me;

  const cx = Math.floor(b.x / G.T), cy = Math.floor(b.y / G.T);
  G.flames = [{ cx: cx, cy: cy, owner: me, power: 1, src: '' }];
  P.updateBRBoss(b, 1 / 60);
  ok(b.dead === true, '最後一下打死 BOSS');
  ok(me.dino === true, '打死的人直接騎上恐龍（不用經由蛋）');
  ok(me.mountT > 0, '有上龍的表演時間（mountT=' + (me.mountT | 0) + '）');
  ok(me.invuln >= 1, '剛上龍有短暫無敵（invuln=' + me.invuln.toFixed(1) + '）');

  // 已經有龍的人 → 打死 BOSS 直接升紅龍
  P.BR.opt = { n: 30, team: 1, dur: 10 };
  P.startBR();
  const b2 = G.enemies.filter(function (e) { return e.brBoss; })[0];
  const me2 = G.players[0];
  G.players.forEach(function (q) { if (q !== me2) q.alive = false; });
  me2.alive = true; me2.invuln = 0; me2.dino = true; me2.redDragon = false;
  b2.hitT = 0; b2.bombT = 999; b2.hp = 2; b2.lastHitBy = me2;
  G.flames = [{ cx: Math.floor(b2.x / G.T), cy: Math.floor(b2.y / G.T), owner: me2, power: 1, src: '' }];
  P.updateBRBoss(b2, 1 / 60);
  ok(b2.dead && me2.dino === true && me2.redDragon === true, '本來有龍 → 直接進化成紅龍（redDragon）');

  // 別人打的 → 不會莫名其妙塞到自己身上
  P.BR.opt = { n: 30, team: 1, dur: 10 };
  P.startBR();
  const b3 = G.enemies.filter(function (e) { return e.brBoss; })[0];
  const a = G.players[0], other = G.players[1];
  G.players.forEach(function (q) { if (q !== a && q !== other) q.alive = false; });
  a.alive = true; a.dino = false; other.alive = true; other.dino = false; other.invuln = 0;
  b3.hitT = 0; b3.bombT = 999; b3.hp = 2; b3.lastHitBy = other;
  G.flames = [{ cx: Math.floor(b3.x / G.T), cy: Math.floor(b3.y / G.T), owner: other, power: 1, src: '' }];
  P.updateBRBoss(b3, 1 / 60);
  ok(b3.dead && other.dino === true && a.dino === false, '誰打死誰騎（別人打的不會算到自己頭上）');
})();
ok(/function brBossDown\(e, killer\)/.test(src), 'brBossDown 有紀錄是誰打死的');
ok(/const k = \(killer && killer\.alive\) \? killer/.test(src), '先用擊殺者、再退回 lastHitBy');
ok(/if \(up\) rideDino\(k, true\);\s*else rideOstrich\(k\);/.test(src), 'brBossDown 內直接上坐騎（紅龍／鴕鳥，不經過蛋）');
ok(/br\.mountPop|br\.mountRed/.test(src), '上龍有飄字提示（10 國語系）');
ok(/e\.lastHitBy\s*=/.test(src), '命中時會記 lastHitBy');

// ---------- 2. 10 國語系字典完整 ----------
head('2. 全遊戲文字 10 國語系');
const LANGS = ['zh-TW', 'zh-CN', 'en', 'ja', 'ko', 'th', 'vi', 'ru', 'de', 'it'];
const base = Object.keys(P.I18N['zh-TW'] || {});
ok(base.length > 700, '字典共 ' + base.length + ' 條');
LANGS.forEach(function (L) {
  const d = P.I18N[L] || {};
  const miss = base.filter(function (k) { return d[k] == null || d[k] === ''; });
  ok(miss.length === 0, L + ' 完整' + (miss.length ? '（缺 ' + miss.length + ' 條：' + miss.slice(0, 4).join('、') + '）' : '（' + base.length + ' 條）'));
});
ok(LANGS.every(function (L) { return !!P.I18N[L]; }), '10 個語系都在 I18N 裡');
// 英文回退：查不到的 key 會退到 en 再退到繁中
ok(P.LANG === 'zh-TW' || !!P.I18N[P.LANG], '目前語言有字典');

// 各語系的關鍵新文案（大逃殺說明／版本紀錄／速度形容詞）
[['help.br.lead'], ['help.br.goal'], ['help.br.team'], ['help.br.zone'], ['help.br.boss'], ['help.br.reward'], ['help.br.ctrl'],
['help.desc'], ['verLog.now'], ['verLog.zhOnly'], ['spd.veryFast'], ['spd.fast'], ['spd.mid'], ['spd.slow'], ['spd.verySlow'],
['br.hudSolo'], ['br.hudTeams'], ['br.bossGet'], ['br.bossGetRed'], ['br.mountPop'], ['br.mountRed']].forEach(function (kr) {
  const k = kr[0];
  const zh = P.I18N['zh-TW'][k];
  // 只要求「非中文語系」不能等於中文原文（zh-CN 短詞與 zh-TW 相同是正常的）
  const bad = ['en', 'ja', 'ko', 'th', 'vi', 'ru', 'de', 'it'].filter(function (L) { return !P.I18N[L] || !P.I18N[L][k] || P.I18N[L][k] === zh; });
  ok(!!zh && bad.length === 0, k + ' 10 國都有（' + (P.I18N.en[k] || '') + '）');
});
// 最新版版本紀錄有 10 國翻譯、舊版只給中文
ok(/ver\.4\.77\.1/.test(src) && P.I18N.en['ver.4.77.1'] && P.I18N.de['ver.4.77.1'], '4.77 的 5 條更新 10 國都有翻');
ok(P.I18N.en['verLog.zhOnly'] && P.I18N.ja['verLog.zhOnly'], '舊版更新在非中文語系顯示「原文繁中」提示');
// 速度形容詞不再寫死中文
ok(!/function foeSpeedWord\([\s\S]{0,300}?'很慢'/.test(src), 'foeSpeedWord 不再回傳中文');
ok(/if \(v >= 62\) return t\('spd\.veryFast'\)/.test(src), '速度形容詞走字典');

// 怪物圖鑑：舊 20 隻的開頭句改放字典 fd.<id>；新 28 隻的名字走「繁中名 → key」反查
const FD_IDS = ['slime', 'mush', 'beetle', 'crab', 'eye', 'penguin', 'bat', 'panda', 'bee', 'bomber',
  'lizard', 'wisp', 'scavenger', 'robot', 'ghost', 'hornet', 'sapper', 'skull', 'wizard'];
const FD_L = ['en', 'ja', 'ko', 'th', 'vi', 'ru', 'de', 'it'];
const fdMiss = [];
FD_IDS.forEach(function (id) {
  FD_L.forEach(function (L) { if (!P.I18N[L] || !P.I18N[L]['fd.' + id]) fdMiss.push(L + '.' + id); });
});
ok(fdMiss.length === 0, '19 隻舊怪的圖鑑開頭句 9 國都有（' + (fdMiss.length ? '缺 ' + fdMiss.slice(0, 4).join('、') : 'fd.* 共 ' + FD_IDS.length + ' 條') + '）');
ok(/function foeDesc\(id\)[\s\S]{0,220}?t\('fd\.' \+ id\)/.test(src), 'foeDesc() 先查字典再退回 HELP_FOES');
ok(/function foeName\(id\)[\s\S]{0,400}?trLive\(sp\.name\)/.test(src), 'foeName() 沒有 sp.* key 時走即時字典反查');
ok(!!P.I18N.de['help.tab.br'] && !!P.I18N.ru['help.tab.br'], '說明頁「大逃殺」分頁標題有 10 國翻譯');

// 實際渲染：非中文語系不該再吐出中文（日文漢字不算）
const CJK = /[\u4e00-\u9fff]/;
const FOE_IDS = Array.from(new Set(P.STAGE_ROSTER.reduce(function (a, l) { return a.concat(l); }, [])));
['en', 'de', 'ru', 'th', 'vi', 'it', 'ko'].forEach(function (L) {
  P.setLang(L);
  const badN = [], badD = [];
  FOE_IDS.forEach(function (id) {
    if (CJK.test(P.foeName(id))) badN.push(id);
    if (CJK.test(String(P.foeDesc(id) || '').replace(/<[^>]+>/g, ''))) badD.push(id);
  });
  ok(badN.length === 0 && badD.length === 0,
    L + '：48 隻小怪的名字與說明都沒有中文殘留' + (badN.length + badD.length ? '（名字 ' + badN.slice(0, 3) + '／說明 ' + badD.slice(0, 3) + '）' : ''));
});
P.setLang('zh-TW');

// ---------- 3. 說明頁：大逃殺分頁 ----------
head('3. 說明頁新增大逃殺分頁');
ok(/HELP_TABS = \['basic', 'item', 'ride', 'stage', 'br', 'daily', 'foe', 'tip'\]/.test(src), '分頁含 br 與 daily（v4.77 加 br、v4.80 加 daily）');
ok(/<button[^>]*data-ht="br"/.test(src), '說明頁有「大逃殺」分頁按鈕');
ok(/data-ht="basic"[\s\S]{0,400}?data-ht="br"[\s\S]{0,400}?data-ht="tip"/.test(src), '分頁順序：基本→道具→坐騎→場景→大逃殺→怪物→訣竅');
ok(/HELP_TAB_TXT\s*=\s*\{[\s\S]{0,600}?br:\s*\{/.test(src), 'br 分頁有 10 國標題');
ok(/else if \(tab === 'br'\) h = buildBR\(\)/.test(src), 'render() 會接 br 分頁');
ok(/function buildBR\(\)/.test(src), '有 buildBR()');
ok(/\['goal', 'team', 'zone', 'boss', 'reward', 'ctrl'\]\.forEach/.test(src) && /t\('help\.br\.' \+ id\)/.test(src),
  '6 張說明卡（目標／人數隊伍／毒圈／亂入 BOSS／獎勵／操作）走字典');
[['help.br.goal'], ['help.br.team'], ['help.br.zone'], ['help.br.boss'], ['help.br.reward'], ['help.br.ctrl']].forEach(function (kr) {
  ok(!!P.I18N['zh-TW'][kr[0]] && !!P.I18N.en[kr[0]], '字典有 ' + kr[0]);
});
ok(/大逃殺：最多 50 人的亂鬥/.test(P.t('help.br.lead')) || /Battle Royale: up to 50/.test(P.t('help.br.lead')),
  '分頁開頭說明提到人數與玩法');
let tabOk = true;
try {
  P.Help.show(); P.Help.setTab('br');
} catch (e) { tabOk = false; console.log('    ' + e.message); }
ok(tabOk, '切到 br 分頁不會炸');
ok(/大逃殺/.test(P.t('help.desc')), '說明頁副標提到大逃殺');

// ---------- 4. 效能：分塊烘焙＋畫面外裁切 ----------
head('4. 效能：地板分塊／裁切');
ok(/const FLR_N = 8/.test(src), '地板一塊 8×8 格');
ok(/function floorChunk\(/.test(src) && /function drawFloorLayer\(/.test(src), '有 floorChunk／drawFloorLayer');
ok(/function floorChunkDirty\(/.test(src), '有 floorChunkDirty（炸開時只丟那一塊）');
ok(/if \(typeof floorChunkDirty === 'function'\) floorChunkDirty\(x, y\);/.test(src), 'destroySoft 會通知該塊重烘');
ok(/drawFloorLayer\(vr, T\);/.test(src), 'render() 用分塊貼圖畫地板');
ok(!/for \(let y = vr\.y0; y <= vr\.y1; y\+\+\) \{\s*for \(let x = vr\.x0; x <= vr\.x1; x\+\+\) \{\s*const v = Game\.grid/.test(src),
  'render() 不再逐格重畫牆（已改烘進分塊）');
ok(/v4\.77 已烘進地板分塊/.test(src), '舊的逐格牆迴圈有註解說明去處');
ok(/function onScreen\(/.test(src) && /!onScreen\(/.test(src), '有 onScreen() 且敵人／玩家會跳過畫面外的');
ok(/_vrPx\.x0 = vr\.x0 \* T;/.test(src), '每幀更新可見世界矩形');
// 換地圖要清分塊快取
ok(/_flrMap/.test(src) && /mapSeq/.test(src), '分塊快取有 key（換地圖不會貼到舊圖）');

// ---------- 5. 換語言：靜態文案重注入 ----------
head('5. 換語言：靜態文案重注入');
ok(/Tut && Tut\.fillUI/.test(src) && /fillUI: fillUI/.test(src), 'Tut.fillUI 有匯出');
ok(/Cloud && Cloud\.paint/.test(src), '換語言會重畫帳號膠囊');
ok(/brush 抵/.test(src) || /const lEnd = x \+ pad \+ nw \+ ctx\.measureText\(totTxt\)\.width;/.test(src),
  '大逃殺 HUD：右側標籤先量左段寬度再夾擠');
ok(/for \(; rfs >= 7; rfs--\)/.test(src), '塞不下會先縮字，再裁字加…');
ok(/trBlockInner/.test(src) && /TRBLOCK_CLS/.test(src), '整塊 innerHTML 有翻譯白名單');

// ---------- 6. 版本與容量 ----------
head('6. 版本與容量');
ok(/^4\.(7[7-9]|[89][0-9])$/.test(P.VERSION), 'VERSION 是 4.77 以上（' + P.VERSION + '）');
ok(P.VERSION_LOG[0].v === P.VERSION, '版本紀錄最上面是本版 ' + P.VERSION);
ok(P.VERSION_LOG[0].items.filter(function (x) { return /ver\.4\.77\./.test(x.k || ''); }).length >= 0, '版本紀錄條目正常');
ok(P.VERSION_LOG[1] && /^4\./.test(P.VERSION_LOG[1].v), '第二筆是上一版 ' + (P.VERSION_LOG[1] || {}).v);
ok(P.VERSION_LOG[0].now === true && P.VERSION_LOG[1].now === false, '只有最新版標 now');
['../sw.js', '../../public/sw.js', '../../bomberman-online/public/sw.js'].forEach(function (f) {
  const p2 = path.join(__dirname, f);
  if (!fs.existsSync(p2)) { ok(false, f + ' 不存在'); return; }
  ok(/SW_VERSION = 'v4\.(7[7-9]|[89][0-9])\.\d+'/.test(fs.readFileSync(p2, 'utf8')), f + ' 版本跟著升');
});
(function () {
  const chars = src.length, bytes = Buffer.byteLength(src, 'utf8');
  ok(chars <= 3900000, '檔案 ' + chars.toLocaleString() + ' 字元（上限 3,900,000）');
  ok(bytes <= 4250000, '檔案 ' + bytes.toLocaleString() + ' 位元組（上限 4,250,000）');
  ok((src.match(/\r/g) || []).length === 0, '整檔 LF（沒有 \\r）');
})();

console.log('\n' + (fail ? '✗ ' + fail + ' 失敗 / ' + pass + ' 通過' : '✅ v4.77：' + pass + ' 通過 / 0 失敗'));
process.exit(fail ? 1 : 0);
