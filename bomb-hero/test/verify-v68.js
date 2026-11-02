// test/verify-v68.js —— v4.25
//   1. 玩家存檔 settings.teams>=2 時，開機算隊名不會撞到 null（原 bug：Cannot read properties of null (reading 'team')）
//   2. Battle.slots 初始值不含 null；teamSummary() 對空陣列／含 null 都安全
//   3. 開機序列每一步都有 try/catch（一步掛掉不連累音量／控制／翻譯）
//   4. .github/workflows/pages.yml：Pages 沒開不會紅叉，且有明確提示
const fs = require('fs');
const { makeEnv } = require('./_sandbox');

const env = makeEnv();
const P = env.BH;
const html = env.html;

let pass = 0, fail = 0;
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name + (extra === undefined ? '' : '（' + extra + '）')); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }

head('0. 版本');
ok(/^\d+\.\d+$/.test(P.VERSION), '版號格式 ' + P.VERSION);
ok(html.indexOf('id="verTxt">' + P.VERSION) > 0, '畫面版本同步 ' + P.VERSION);

// ---------------------------------------------------------------
head('1. 原始 bug：slots 是 null 時讀 s.team');
// 重現玩家的情境：存檔裡開過「組隊對戰」（teams=4），而開機時 slots 還沒建立
const src = html;
ok(/slots: \[\]/.test(src), 'Battle.slots 初始值是空陣列（不是 [null,null,null,null]）');
ok(!/slots: \[null/.test(src), '原始碼裡沒有 slots: [null…] 的寫法');

// 直接餵 null 進去，模擬最壞情況
let err = null, out = null;
try {
  const realSlots = P.Battle.slots;
  P.Battle.slots = [null, null, null, null];
  P.settings.teams = 4;
  out = P.Battle.teamSummary();
  P.Battle.slots = realSlots;
} catch (e) { err = e; }
ok(!err, 'slots 全是 null 時 teamSummary() 不拋錯', err && err.message);
ok(typeof out === 'string', 'teamSummary() 仍回傳字串', out === undefined ? 'undefined' : JSON.stringify(out));

err = null;
try { P.Battle.slots = []; P.settings.teams = 3; P.Battle.teamSummary(); } catch (e) { err = e; }
ok(!err, 'slots 是空陣列時也不拋錯', err && err.message);

err = null;
try { P.Battle.slots = [null, { label: 'P1', team: 0 }, null, { label: 'P2', team: 1 }]; P.settings.teams = 2; } catch (e) {}
let mixed = null;
err = null;
try { mixed = P.Battle.teamSummary(); } catch (e) { err = e; }
ok(!err, '一半是 null 的 slots 也不拋錯', err && err.message);
ok(typeof mixed === 'string' && mixed.indexOf('P1') >= 0, '混著 null 也照樣算出 P1 的隊', JSON.stringify(mixed));

// ---------------------------------------------------------------
head('2. 開機時就算隊名（玩家存檔 teams=4）');
err = null;
try {
  P.Battle.slots = [];              // 模擬「還沒 resetSlots」的狀態
  P.settings.teams = 4;
  P.teamCount();                    // 應該回 4
  P.updateCountHint();              // 這一行就是原本炸掉的地方
} catch (e) { err = e; }
ok(!err, 'updateCountHint() 在 teams=4、slots 空的時候不拋錯', err && err.message);
ok(P.teamCount() === 4, 'teamCount() 讀到 4 隊', P.teamCount());

err = null;
try { P.Battle.resetSlots(); } catch (e) { err = e; }
ok(!err, 'resetSlots() 正常建立位子', err && err.message);
const multi = (P.Battle.slots || []).filter(function (s) { return !!s; }).length;
ok(multi >= 2, 'resetSlots() 之後位子都建好了（' + multi + ' 個）');
ok(P.Battle.teamSummary().length > 0, 'resetSlots() 之後 teamSummary() 有內容', P.Battle.teamSummary());

// ---------------------------------------------------------------
head('3. 開機序列每一步都各自包 try/catch');
const boot = src.slice(src.indexOf('try { Solo.init(); }'), src.indexOf('try { Solo.init(); }') + 700);
['Solo.init()', 'Battle.resetSlots()', 'updateCountHint()', 'AudioSys.applyVolumes()',
 'applyCtrl()', 'applyI18N()', 'updateLangBtn()'].forEach(function (fn) {
  ok(new RegExp('try \\{ ' + fn.replace(/[.()]/g, '\\$&') + '; \\} catch').test(boot), '開機 ' + fn + ' 有 try/catch');
});
// 順序：resetSlots 要在 updateCountHint 之前（先建位子再算隊名）
const iReset = boot.indexOf('Battle.resetSlots()');
const iHint = boot.indexOf('updateCountHint()');
ok(iReset > 0 && iHint > iReset, 'resetSlots() 排在 updateCountHint() 之前');

// ---------------------------------------------------------------
head('4. GitHub Pages workflow：沒啟用也不紅叉');
const wf = fs.readFileSync(__dirname + '/../../.github/workflows/pages.yml', 'utf8');
ok(/continue-on-error:\s*true/.test(wf), 'configure-pages 有 continue-on-error（Pages 沒開不會讓 workflow 死）');
ok(/if:\s*steps\.pages\.outcome\s*==\s*'success'/.test(wf), '打包／上傳都加上「Pages 已啟用」條件');
ok(/if:\s*steps\.pages\.outcome\s*!=\s*'success'/.test(wf), '沒啟用時會印出明確說明');
ok(/GITHUB_STEP_SUMMARY/.test(wf), '說明會寫進 job summary（不用點 log 也看得到）');
ok(/pages: write/.test(wf), '仍有 pages: write 權限（啟用後才部署得上去）');
ok(/outputs:[\s\S]*pages: \$\{\{ steps\.pages\.outcome \}\}/.test(wf), 'build job 把 Pages 狀態輸出給 deploy');
ok(/needs\.build\.outputs\.pages == 'success'/.test(wf), 'deploy 只在 Pages 啟用時才跑');
// 只檢查「真的會被執行的指令」，不要去抓註解裡說明用的字（v4.24 踩過註解誤判）
const wfRuns = wf.split('\n').filter(function (l) { return !/^\s*#/.test(l); }).join('\n');
ok(!/run:\s*npm\b/.test(wfRuns), 'workflow 裡沒有任何 npm 指令（本專案是純靜態單檔）');
ok(/path:\s*\.\/public/.test(wf), '上傳路徑仍是 ./public');

console.log('\n結果：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
