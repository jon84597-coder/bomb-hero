// test/verify-v582.js —— v5.81：發佈版＝正常玩家（金幣不再 ∞）＋ 後台入口收乾淨
//   ① 主檔不再把 DEV_BUILD 寫死 true
//   ② 開發者開關改成網址參數 ?dev=1 / ?dev=0，記在本機（bh_dev）
//   ③ 首頁版本號連點 3 下的後台入口已移除（也不再是 pointer 游標）
//   ④ 後台仍受 DEV_BUILD / 雲端 dev 旗標管制（一般玩家打不開）
//   ⑤ 金幣 ∞ 只在開發模式出現；關卡解鎖走真實進度
//   ⑥ 版本 >= 5.81 七處一致
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const mainJs = read('js/main.js');
const idx = read('index.html');
const vlog = read('js/version-log.js');
const pkg = read('../package.json');

let pass = 0, fail = 0;
function ok(c, m, x) {
  if (c) { pass++; console.log('  ✓ ' + m + (x === undefined ? '' : ' → ' + JSON.stringify(x))); }
  else { fail++; console.log('  ✗ FAIL: ' + m + (x === undefined ? '' : ' → ' + JSON.stringify(x))); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }

/* ================================================================ */
head('1. 版本七處一致（>= 5.81，認當版）');
{
  const ver = (mainJs.match(/const VERSION = '([\d.]+)'/) || [])[1];
  ok(parseFloat(ver) >= 5.81, '主檔 VERSION >= 5.81', ver);
  /* v5.82：跟 verify-v581 一樣認「當版」，否則每升一版這支就整批紅 */
  const vre = String(ver || '5.82').replace(/\./g, '\\.');
  ok(new RegExp('<span id="verTxt">' + vre + '<\\/span>').test(idx), '首頁 verTxt = 當版（' + ver + '）');
  ok(new RegExp('<span id="verLogVer">' + vre + '<\\/span>').test(idx), '版本面板 verLogVer = 當版（' + ver + '）');
  ok(new RegExp('"version":\\s*"' + vre + '\\.0"').test(pkg), 'package.json = 當版（' + ver + '.0）');
  const sws = ['sw.js', '../public/sw.js', '../bomberman-online/public/sw.js', '../dist/site/sw.js']
    .map(f => { try { return (read(f).match(/SW_VERSION = '(v[\d.]+)'/) || [])[1]; } catch (e) { return null; } })
    .filter(Boolean);
  ok(sws.length >= 3 && sws.every(v => v === 'v' + ver + '.0'), '四份 sw.js 都是當版（v' + ver + '.0）', sws);
  ok(new RegExp("v: '" + vre + "'[\\s\\S]{0,80}now: true").test(vlog), 'VERSION_LOG[0] 是當版且 now:true');
  ok(!/v: '5\.81'[\s\S]{0,60}now: true/.test(vlog), '5.81 已改成 now:false（不會兩條同時亮）');
}

/* ================================================================ */
head('2. DEV_BUILD 不再寫死 true');
{
  ok(!/let DEV_BUILD = true;/.test(mainJs), '沒有 `let DEV_BUILD = true;`（舊的開發者版本常數已移除）');
  ok(/let DEV_BUILD = \(function \(\) \{/.test(mainJs), 'DEV_BUILD 改成啟動時解析（IIFE）');
  ok(/localStorage\.setItem\('bh_dev', '1'\)/.test(mainJs), '?dev=1 會把開發旗標寫進本機（bh_dev）');
  ok(/localStorage\.removeItem\('bh_dev'\)/.test(mainJs), '?dev=0 會清掉開發旗標');
  ok(/\(\?:\^\|\[\?&\]\)dev=1/.test(mainJs) && /\(\?:\^\|\[\?&\]\)dev=0/.test(mainJs),
    '只認完整的 dev=1／dev=0 參數（不會被 ?dev=10 之類誤命中）');
  /* 最後一關：讀不到旗標就當一般玩家 —— 寧可少開功能，也不要又變成全體 ∞ */
  ok(/return localStorage\.getItem\('bh_dev'\) === '1'; \} catch \(e\) \{ return false; \}/.test(mainJs),
    '沒設定過開發旗標 → 預設 false（一般玩家）');
  ok(/v5\.81：發佈版＝正常玩家/.test(mainJs), '程式碼裡留下「為什麼預設是 false」的說明');
}

/* ================================================================ */
head('3. 版本號連點開後台已移除');
{
  ok(!/v\.style\.cursor = 'pointer'/.test(mainJs), '版本號不再被設成 pointer 游標（看起來像按鈕）');
  ok(!/if \(n >= 3\) \{/.test(mainJs), '版本號連點 3 下的計數器已移除');
  ok(/v5\.81：移除「版本號連點 3 下開後台」/.test(mainJs), '原位置留了說明（不是憑空消失）');
  /* 其他入口要還在，否則連開發者自己都進不去 */
  ok(/e\.altKey && \(e\.ctrlKey \|\| e\.shiftKey\)/.test(mainJs), 'Ctrl+Alt+D 入口保留');
  ok(/indexOf\('admin'\) >= 0/.test(mainJs), '?admin=1／#admin 入口保留');
}

/* ================================================================ */
head('4. 後台仍受管制（一般玩家打不開）');
{
  ok(/let devOk = DEV_BUILD;/.test(mainJs), '後台開門第一關仍是 DEV_BUILD');
  ok(/if \(!devOk\) \{ toast\('只有開發者帳號可以開啟後台'/.test(mainJs),
    '不是開發者 → 明確提示，而不是靜靜沒反應');
  ok(/function open\(\) \{[\s\S]{0,600}devOk/.test(mainJs), '管制寫在 open() 裡（三條入口共用同一道門）');
}

/* ================================================================ */
head('5. 金幣 ∞ 只在開發模式；關卡解鎖走真實進度');
{
  ok(/return Shop\.dev\(\) \? '∞' : String\(Shop\.gold\(\) \| 0\);/.test(mainJs),
    '錢包文字：開發模式才顯示 ∞，否則顯示真實金幣');
  ok(/if \(!dev\(\) && gold < price\) return \{ ok: false, err: 'GOLD'/.test(mainJs),
    '買東西：一般玩家金幣不足會被擋（dev 才免錢）');
  ok(/if \(!dev\(\)\) gold -= price;/.test(mainJs), '買東西：一般玩家真的扣錢');
  ok(/maxUnlocked\(\) \{ return \(Solo\.dev \|\| DEV_BUILD\) \? SOLO_STAGES : Solo\.unlocked; \}/.test(mainJs),
    '關卡上限：沒開開發模式就照 Solo.unlocked（真實進度）');
  /* 舊註解說「正式版 DEV_BUILD=true」已經不成立，別留在檔案裡誤導後面的人 */
  ok(!/正式版（DEV_BUILD=true）/.test(mainJs), '不再有「正式版 DEV_BUILD=true」的過時註解');
}

console.log('\n=== v5.81 正常玩家（金幣不再無限）＋後台入口：' + pass + ' 通過 / ' + fail + ' 失敗 ===');
process.exit(fail ? 1 : 0);
