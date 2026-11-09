// test/verify-v567.js —— v5.66：「跳過關卡，直接單挑最終魔王」移除
//   ① 入口全部消失（HTML 按鈕、goBoss、startBossRush、?boss=1）
//   ② 字典那條文案也拿掉（不留死字）
//   ③ 正常路線不受影響：第 40 關仍是決戰場、第 5 關仍是 BOSS 關
//   ④ 版本戳記與更新紀錄
const fs = require('fs');
const { makeEnv } = require('./_sandbox');

const env = makeEnv();
const P = env.BH, G = P.Game;
const html = env.html;
const mainSrc = fs.readFileSync(__dirname + '/../js/main.js', 'utf8');
const dict = fs.readFileSync(__dirname + '/../js/i18n-src.js', 'utf8');

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ FAIL: ' + msg); }
}
function sec(t) { console.log('\n=== ' + t + ' ==='); }

/* ---------------------------------------------------------------- ① */
sec('① 入口已移除');
// 更新紀錄與字典裡都會提到「這次拿掉了什麼」→ 只掃真正的界面檔
const idxHtml = fs.readFileSync(__dirname + '/../index.html', 'utf8');
ok(html.indexOf('id="btnSoloBoss"') < 0, '單人關卡畫面沒有 #btnSoloBoss 按鈕');
ok(idxHtml.indexOf('跳過關卡') < 0, '界面檔裡沒有「跳過關卡」這段文字');
ok(dict.indexOf('ui.nodeSkipStage') < 0, '新手指引那條失效的 ui.nodeSkipStage 也清掉');
ok(!/function startBossRush/.test(mainSrc), 'startBossRush() 已刪除');
ok(!/function goBoss/.test(mainSrc), 'goBoss() 已刪除');
ok(typeof P.startBossRush === 'undefined' && typeof P.goBoss === 'undefined', '兩個函式都沒有匯出到 __BH');
ok(mainSrc.indexOf("q.get('boss')") < 0, '?boss=1 除錯入口一併移除');
ok(mainSrc.indexOf('BOSS 挑戰開不起來') < 0, '連帶的錯誤提示也沒有殘留');
ok(/id="btnSoloGo"/.test(html), '「開始遊戲」大按鈕還在（正常入口不受影響）');

/* ---------------------------------------------------------------- ② */
sec('② 字典與說明');
ok(dict.indexOf('solo.bossgo|') < 0, '字典沒有 solo.bossgo 這一列');
const rows = dict.split('\n').filter(function (l) { return /^[a-z0-9][a-zA-Z0-9._]*\|/.test(l); });
ok(rows.every(function (r) { return r.split('|').length === 6; }), '字典每列仍是 6 欄（共 ' + rows.length + ' 列）');
ok(rows.length === 2013, '字典 2,013 條（移除 2 條死文案後）');

/* ---------------------------------------------------------------- ③ */
sec('③ 正常路線：第 40 關＝最終魔王關');
P.settings.ctrl = 'kb';
P.settings.soloDiff = 'normal';
P.settings.soloTime = 300;
P.settings.mapMode = 'classic';
try { P.WeekMod.pin([]); } catch (e) {}
P.startSolo(P.SOLO_STAGES, false);
G.state = 'play';                    // updateSolo 只在 play 時推進
ok(P.SOLO_STAGES === 40 && G.stage === 40, '第 40 關就是最後一關');
ok(!!G.bossArena, '走的是決戰場（Game.bossArena）');
ok(G.enemies.length === 1 && G.enemies[0].boss === true, '場上只有魔王（敵人數 ' + G.enemies.length + '）');
G.enemies.length = 0;
P.updateSolo(1 / 60);
ok(G.door.revealed === true && G.door.open === false, '王沒死之前門是關的');
if (G.bossArena && G.bossArena.boss) { G.bossArena.boss.hp = 0; }
P.updateSolo(1 / 60);
ok(G.door.open === true, '王死 → 開門（打得完）');

sec('④ 其他 BOSS 關還在');
ok(P.isBossStage(5) && P.isBossStage(10) && P.isBossStage(40), '每 5 關一場王（5／10／…／40）');
ok(!P.isBossStage(4) && !P.isBossStage(6), '普通關卡不插王');

/* ---------------------------------------------------------------- ⑤ */
sec('⑤ 除錯參數 ?stage 對到 40 關');
ok(/Math\.min\(SOLO_STAGES, parseInt\(q\.get\('stage'\)/.test(mainSrc), '?stage=N 的上限改成 SOLO_STAGES（原本夾在 8）');

/* ---------------------------------------------------------------- ⑥ */
sec('⑥ 版本戳記');
// 版本號不寫死：這支測的是「移除入口」，不該每升一版就回頭改
const vNum = parseFloat(P.VERSION);
const vEsc = P.VERSION.replace(/\./g, '\\.');
ok(vNum >= 5.66, 'VERSION ≥ 5.66（' + P.VERSION + '）');
ok(new RegExp('id="verTxt">' + vEsc + '<').test(html) &&
   new RegExp('id="verLogVer">' + vEsc + '<').test(html), '畫面與版本面板的版本字樣跟 VERSION 同步');
ok(P.VERSION_LOG[0].v === P.VERSION && P.VERSION_LOG[0].now === true, 'VERSION_LOG 首位＝當前版本 ' + P.VERSION + ' 且 now:true');
ok(P.VERSION_LOG[1] && P.VERSION_LOG[1].now === false, '上一版 ' + (P.VERSION_LOG[1] || {}).v + ' 已收成 now:false');
const kept566 = P.VERSION_LOG.filter(function (e) { return e.v === '5.66'; })[0];
ok(kept566 && kept566.now === false, 'v5.66（移除入口那一版）的紀錄還在');
ok(P.VERSION_LOG[0].items.length >= 5, '本版至少 5 條更新說明（' + P.VERSION_LOG[0].items.length + ' 條）');
ok(!/後台|開發者/.test(P.VERSION_LOG[0].items.join('')), '更新內容不出現「後台／開發者」');
const sw = fs.readFileSync(__dirname + '/../sw.js', 'utf8');
ok(new RegExp("SW_VERSION = 'v" + vEsc + "\\.0'").test(sw), 'SW 版號跟 VERSION 同步（v' + P.VERSION + '.0）');

console.log('\n' + (fail === 0 ? '通過 ' + pass + ' / ' + (pass + fail) : '✗ ' + fail + ' 項失敗（通過 ' + pass + '）'));
process.exit(fail === 0 ? 0 : 1);
