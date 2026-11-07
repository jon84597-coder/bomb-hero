// v5.7 驗證：
//   ① 大逃殺縮圈落石會蓋掉地表機關（輸送帶／滑冰／傳送門）
//   ② 後台時間一律台灣時間（UTC+8），不再差 8 小時
//   ③ 後台看得到「誰在什麼時間玩了哪個模式／哪一關」
//   ④ 「我」的牌子改吃角色貼圖上緣（兔子耳朵不會被蓋到）
//   ⑤ 對戰選角角色圖的解析度（高解析度畫布 + dpr + 放大）
//   ⑥ 新 LOGO（完整、不去內容、帶快取參數）
// 跑法：node test/verify-v507.js
const fs = require('fs');
const path = require('path');
const { makeEnv } = require('./_sandbox');
const CLOUD = require('../../cloud.js');

let pass = 0, fail = 0;
function ok(cond, msg, extra) {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ FAIL: ' + msg + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}
function head(s) { console.log('\n' + s); }

const SRC = require('./_sandbox').rawHtml;
const CSRC = fs.readFileSync(path.join(__dirname, '..', '..', 'cloud.js'), 'utf8');
const SW = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
const env = makeEnv();
const B = env.BH, G = env.G;

// ---------------------------------------------------------------
head('① 落石會蓋掉底下的地表機關');

ok(/const gv = \(Game\.grid && Game\.grid\[y\]\) \? Game\.grid\[y\]\[x\] : 1;/.test(SRC),
  '繪製時先讀格子狀態（牆／軟磚就不畫機關）');
ok(/const hz = \(gv === 0\) \? \(Game\.hazards\[y\] && Game\.hazards\[y\]\[x\]\) : null;/.test(SRC),
  '只有空地（gv === 0）才把機關畫上去');
ok(/Game\.sdRock\[c\[1\] \* Game\.cols \+ c\[0\]\] = 1;[\s\S]{0,400}?Game\.hazards\[c\[1\]\]\[c\[0\]\] = null;/.test(SRC),
  '落石砸下來的同時把該格機關清掉');

// 真的跑一次縮圈：格子變牆、機關消失
try {
  B.buildMap(15, 13, B.THEMES[4], {});        // 夜光彩城（冰＋輸送帶）
  G.mode = 'battle';
  G.state = 'play';
  G.timer = 0;
  G.sdActive = false;
  G.sdList = [[3, 3], [4, 3]];
  G.sdIndex = 0;
  G.sdTimer = 0;
  G.players = [];
  G.grid[3][3] = 0;
  G.grid[3][4] = 0;
  G.hazards[3][3] = { type: 'convey', dx: 1, dy: 0, seed: 1 };
  G.hazards[3][4] = { type: 'ice', seed: 2 };
  B.settings.sd = 'on';
  B.updateBattle(0.02);
  ok(G.grid[3][3] === 1, '落石真的把格子變成牆');
  ok(!G.hazards[3][3], '該格的輸送帶已被清掉（不會穿過石頭）');
  // 清掉的只影響被砸的那格
  ok(!!G.hazards[3][4], '其他格子的機關不受影響');
} catch (e) {
  ok(false, '縮圈落石流程可以跑（' + e.message + '）');
}

// ---------------------------------------------------------------
head('② 後台時間＝台灣時間（UTC+8）');

ok(CLOUD.TW_OFFSET_MS === 8 * 3600 * 1000, '後端固定 +8 小時偏移');
ok(/const d = new Date\(\(ms \|\| Date\.now\(\)\) \+ TW_OFFSET_MS\);/.test(CSRC) &&
   /getUTCHours\(\)/.test(CSRC) && /getUTCFullYear\(\)/.test(CSRC),
  'stamp() 用 UTC 欄位 + 偏移（不再吃伺服器時區）');
ok(CLOUD.stamp(Date.UTC(2026, 10, 5, 1, 30, 0)) === '2026-11-05 09:30:00',
  'UTC 01:30 → 顯示 09:30（台灣）', CLOUD.stamp(Date.UTC(2026, 10, 5, 1, 30, 0)));
ok(CLOUD.stamp(Date.UTC(2026, 10, 5, 17, 5, 7)) === '2026-11-06 01:05:07',
  'UTC 17:05 跨日 → 台灣隔天 01:05', CLOUD.stamp(Date.UTC(2026, 10, 5, 17, 5, 7)));
ok(typeof CLOUD.twDayStart === 'function', '有台灣切日函式 twDayStart()');
const d0 = CLOUD.twDayStart(Date.UTC(2026, 10, 5, 17, 5, 7));   // 台灣 11/6 01:05
ok(CLOUD.stamp(d0) === '2026-11-06 00:00:00', '台灣「今天」從 00:00 起算', CLOUD.stamp(d0));

ok(/const TW_MS = 8 \* 3600 \* 1000;/.test(SRC) && /d\.getUTCHours\(\)/.test(SRC),
  '前端 dt() 也改用 UTC+8');
ok(/a\.lastSeen \? dt\(a\.lastSeen\) : \(a\.lastSeenStr \|\| '—'\)/.test(SRC),
  '名單優先用時間戳自己算（不再直接用伺服器字串）');
ok(!/lastSeenStr \|\| dt\(a\.lastSeen\)/.test(SRC),
  '沒有地方還在用舊的「字串優先」寫法');
ok(/bhtw">台灣</.test(SRC), '詳情頁的時間有標「台灣」');

// ---------------------------------------------------------------
head('③ 後台看得到「誰在什麼時間玩了什麼」');

ok(CLOUD.STAGE_EVENTS && CLOUD.STAGE_EVENTS.solo && !CLOUD.STAGE_EVENTS.br,
  'STAGE_EVENTS：只有關卡型事件計入各關次數（大逃殺不算）');
ok(CLOUD.PLAY_EVENTS && CLOUD.PLAY_EVENTS.br && CLOUD.PLAY_EVENTS.online && CLOUD.PLAY_EVENTS.battle,
  'PLAY_EVENTS：單人／RPG／對戰／大逃殺／線上配對都算「玩了一場」');
ok(/function playDigest\(a\)/.test(CSRC), '後端有 playDigest()（最近遊玩＋今日場次）');
ok(/lastPlay: pd\.last \?/.test(CSRC) && /playsToday: pd\.today/.test(CSRC),
  'adminRow 回傳 lastPlay／playsToday');
ok(/playsToday \+= row\.playsToday \| 0;/.test(CSRC), '總覽會加總今日場次');
ok(/playsToday: playsToday/.test(CSRC), '總覽／dump 都吐 playsToday');
ok(/const label = body\.label \? String\(body\.label\)\.slice\(0, 48\) : '';/.test(CSRC),
  '/api/rpg/event 收 label');
ok(/mode: EVENT_LABEL\[e\.type\] \|\| e\.type \|\| ''/.test(CSRC),
  '/api/admin/player 的事件帶中文模式名');

ok(/function track\(type, stage, label\)/.test(SRC), '前端 track() 支援 label');
ok(/if \(label\) ev\.label = String\(label\)\.slice\(0, 48\);/.test(SRC), 'label 上限 48 字（避免爆量）');
ok(/Cloud\.track\(bossRush \? 'boss' : 'solo', stage,/.test(SRC), '單人：帶「第 N 關・關卡名」');
ok(/Cloud\.track\('rpg', st, 'RPG 第 ' \+ st \+ ' 關・'/.test(SRC), 'RPG：帶「RPG 第 N 關・關卡名」');
ok(/Cloud\.track\('battle', 0, '本機對戰・'/.test(SRC), '對戰：帶人數／分隊／勝制');
ok(/Cloud\.track\('online', 0, '線上配對'/.test(SRC), '線上配對：帶房號');
ok(/Cloud\.track\('br', 0, '大逃殺 ' \+ n \+ ' 人・/.test(SRC), '大逃殺：開局記一筆');
ok(/Cloud\.track\('br', place, '大逃殺 ' \+ BR\.N \+ ' 人・/.test(SRC), '大逃殺：結束記名次');
ok(/Cloud\.track\('clear', cleared, '通過第 ' \+ cleared \+ ' 關・/.test(SRC), '過關：帶關卡名');

ok(/<div class="bhplay">/.test(SRC), '名單多一行「最近玩了什麼」');
ok(/a\.playsToday \? '<span class="bhpill g">今日 ' \+ a\.playsToday \+ ' 場<\/span>'/.test(SRC),
  '名單顯示今日場次');
ok(/function playText\(lp\)/.test(SRC) && /lab\.indexOf\(nm\) === 0 \? lab/.test(SRC),
  '模式名不會重複（label 已含模式名就只用 label）');
ok(/\.bhrow \.bhplay \{ grid-column: 1 \/ 2; \}/.test(SRC), '最近遊玩那行放在第 1 欄（不會跟狀態標籤搶位置）');
ok(/\['最近遊玩', a\.lastPlay/.test(SRC) && /\['今日場次', \(a\.playsToday \| 0\) \+ ' 場'\]/.test(SRC),
  '詳情頁有「最近遊玩／今日場次」兩列');
ok(/const lab = e\.label \? '　<span class="bhevlab">'/.test(SRC), '足跡列會顯示事件 label');

// ---------------------------------------------------------------
head('④ 「我」的牌子改吃角色貼圖上緣');

ok(/function charArtH\(T, animal\)/.test(SRC), '有 charArtH()（算角色貼圖總高）');
ok(/function drawMeBadge\(x, y, R, T, headTop(?:, mode)?\)/.test(SRC), 'drawMeBadge 多收 headTop（v5.8 再收 mode）');
ok(/const gap = Math\.max\(5, T \* \.16\) \+ h \* \.38;/.test(SRC), '牌子與頭頂之間留一道縫（含箭頭高度）');
ok(/const top = \(headTop != null\)/.test(SRC) && /y - R \* 1\.30 - h \+ bob/.test(SRC),
  '有 headTop 就用它，沒有才退回舊公式（相容）');
ok(/drawMeBadge\(x, y - jumpY, R, T, artTop, meMode\);/.test(SRC), 'drawPlayer 真的把量到的 artTop 傳進去（v5.8 再傳 mode）');

// 行為：牌子一定在頭頂上方
G.T = 32; G.gameT = 1;
B.settings.view = 1;
const T = 32, R = T * .40, headTop = 200;
env.rec.calls.length = 0;
B.drawMeBadge(100, 260, R, T, headTop);
const meTxt = env.rec.calls.filter(function (c) { return c[0] === 'fillText'; }).pop();
ok(!!meTxt, '牌子有畫出文字');
const badgeCenterY = meTxt ? meTxt[3] : 0;
ok(badgeCenterY < headTop, '牌子中心在頭頂上方（' + badgeCenterY + ' < ' + headTop + '）');
// 牌子下緣（含箭頭）也不能碰到頭頂
const plaqueH = Math.max(15, T * .42);
ok(badgeCenterY + plaqueH / 2 < headTop, '牌子本體下緣也在頭頂上方');
// 舊呼叫（沒有 headTop）仍然可用
env.rec.calls.length = 0;
B.drawMeBadge(100, 260, R, T);
ok(env.rec.calls.filter(function (c) { return c[0] === 'fillText'; }).length > 0, '沒有 headTop 時仍會畫（相容舊呼叫）');

// 真跑一次 drawPlayer：兔子（耳多很高）的牌子要在貼圖上緣之上
try {
  B.buildMap(15, 13, B.THEMES[0], {});
  G.mode = 'br';
  G.state = 'play';
  const p = B.makePlayer(0, 0, null, { x: 5, y: 5, px: 5.5 * G.T, py: 5.5 * G.T });
  p.alive = true; p.ch = B.CHARACTERS[0]; p.invuln = 0; p.moving = false;
  G.players = [p];
  G.mySlot = 0;
  env.rec.calls.length = 0;
  // 大逃殺的格子就是小（T 常 < 52）→ 一定要用小的 T 驗，不然舊公式也會過
  const BT = 32;
  G.T = BT;
  B.drawPlayer(p, BT);
  const t2 = env.rec.calls.filter(function (c) { return c[0] === 'fillText' && c[1] === B.ME_BADGE_TXT; }).pop();
  const artTop = p.y + BT * .40 * .82 - B.charArtH(BT, 'rabbit');
  ok(!!t2, '大逃殺裡自己的角色有畫「我」');
  ok(t2 && t2[3] < artTop, '牌子在兔子貼圖上緣之上（' + (t2 ? t2[3].toFixed(1) : '?') + ' < ' + artTop.toFixed(1) + '）');
} catch (e) {
  ok(false, 'drawPlayer 可以跑（' + e.message + '）');
}

// ---------------------------------------------------------------
head('⑤ 對戰選角的角色圖解析度');

ok(/<canvas class="chpv" width="220" height="200"/.test(SRC), '邏輯畫布 220×200（原本 132×120）');
ok(/pr = \(typeof window !== 'undefined' && window\.devicePixelRatio\) \|\| PIXEL_RATIO \|\| 1;/.test(SRC),
  '吃 devicePixelRatio（視網膜螢幕不再糊一倍）');
ok(/if \(g\.setTransform\) g\.setTransform\(pr, 0, 0, pr, 0, 0\);/.test(SRC),
  '背景緩衝乘 dpr，但繪圖座標維持邏輯尺寸');
ok(/const bw = Math\.round\(lw \* pr\), bh = Math\.round\(lh \* pr\);/.test(SRC), '實體像素 = 邏輯 × dpr');
ok(/let lw = parseInt\(ga\(cnv, 'data-lw'\), 10\) \|\| 0;/.test(SRC), '重複 mount 不會把 dpr 再乘一次');
ok(/const R = hasImg \? \(H \* \.84\) \/ 3\.75 : W \* \.30;/.test(SRC), '角色放大到卡片 84% 高（原本 70%，看起來太小）');
ok(/const W = o\.w \|\| o\.cnv\.width, H = o\.h \|\| o\.cnv\.height/.test(SRC), 'drawOne 用邏輯尺寸算比例');

// ---------------------------------------------------------------
head('⑥ 新 LOGO');

const logoPath = path.join(__dirname, '..', 'spr', 'title-logo.webp');
ok(fs.existsSync(logoPath), 'spr/title-logo.webp 存在');
const buf = fs.readFileSync(logoPath);
ok(buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP',
  '是合法 WEBP');
ok(buf.indexOf('ALPH') > 0, '帶 alpha 通道（去背）');
/* WEBP 有三種容器，尺寸位置各不相同（VP8X 擴充格式就不是 26/28 了） */
function webpSize(b) {
  const fourcc = b.slice(12, 16).toString('ascii');
  if (fourcc === 'VP8X') return [b.readUIntLE(24, 3) + 1, b.readUIntLE(27, 3) + 1];
  if (fourcc === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  if (fourcc === 'VP8L') {
    const v = b.readUInt32LE(21);
    return [(v & 0x3fff) + 1, ((v >> 14) & 0x3fff) + 1];
  }
  return [0, 0];
}
const dim = webpSize(buf);
const w = dim[0], h = dim[1];
ok(w === 900 && Math.abs(h - 507) <= 2, '尺寸 900×' + h, dim);
ok(Math.abs(w / h - 1672 / 941) < .02, '長寬比與原圖一致（不會被拉扁）');
ok(buf.length > 60000 && buf.length < 400000, '檔案大小合理（' + buf.length + ' bytes）');
// v5.9：快取參數會跟著版號換（v5.7 用 57、v5.9 用 59），所以改成「兩邊同一個數字」而不是寫死
const lgV = (SRC.match(/src="spr\/title-logo\.webp\?v=(\d+)"/) || [])[1];
ok(!!lgV, '#titleLogo 帶快取參數（v=' + lgV + '）');
ok(!!lgV && new RegExp('\\./spr/title-logo\\.webp\\?v=' + lgV).test(SW),
  'service worker 預熱清單用同一個網址');
const rep = JSON.parse(fs.readFileSync(path.join(__dirname, '_x_report.json'), 'utf8'));
const row = rep.filter(function (r) { return r.name === 'title-logo'; })[0];
ok(!!row && row.bytes === buf.length, '_x_report.json 的 bytes 與實際檔案一致');
// v5.6 的教訓：不可以再「只留最大連通塊」（會把四散的火花／碎石刪掉）
const logoPy = fs.readFileSync(path.join(__dirname, '..', '..', 'tools', 'make_logo.py'), 'utf8');
ok(/一個像素都不刪/.test(logoPy), '去背工具只從邊界泛洪，不再刪掉四散的火花／碎石');
ok(/預乘 alpha 後再縮圖/.test(logoPy), '縮圖前先預乘 alpha（不然深底會有一圈白毛）');

// ---------------------------------------------------------------
console.log('\n' + (fail ? '✗ ' : '') + '通過 ' + pass + ' / ' + (pass + fail));
process.exit(fail ? 1 : 0);
