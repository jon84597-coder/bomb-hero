// test/verify-v53.js — v4.7：飛行小怪降速 ＋ 密碼顯示／隱藏切換
//   無頭（vm）驗證 + 原始碼斷言；密碼切換用迷你沙盒真的跑一次，不是只比對字串
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { makeEnv } = require('./_sandbox');

const ROOT = path.join(__dirname, '..');
const HTML_PATH = (function () {
  const a = path.join(ROOT, 'index.html');
  const b = path.join(ROOT, 'public', 'index.html');
  return fs.existsSync(a) ? a : b;
})();
const html = fs.readFileSync(HTML_PATH, 'utf8');
const rd = (p) => fs.readFileSync(path.join(ROOT, p));

let pass = 0, fail = 0;
function ok(c, n, x) {
  if (c) { pass++; console.log('  ✓ ' + n + (x === undefined ? '' : '（' + x + '）')); }
  else { fail++; console.log('  ✗ FAIL: ' + n + (x === undefined ? '' : '（' + x + '）')); }
}
const src = (re) => re.test(html);

const env = makeEnv();
const P = env.BH;

// ==================================================================
console.log('\n=== 0. 版本 ===');
ok(/^\d+\.\d+$/.test(P.VERSION), 'VERSION 格式正確（' + P.VERSION + '）');
ok(src(new RegExp('<span id="verTxt">' + P.VERSION.replace('.', '\\.') + '<\\/span>')), '首頁徽章同步 ' + P.VERSION);
ok(P.VERSION_LOG[0].v === P.VERSION && P.VERSION_LOG[0].now === true, '版本紀錄最新一筆 = 當前版本 v' + P.VERSION);
const L46 = (P.VERSION_LOG.filter(function (x) { return x.v === '4.6'; })[0] || {});
ok(L46.v === '4.6' && !L46.now, '上一筆 v4.6（PWA）已不是當前版本');
const v47 = (P.VERSION_LOG.filter(function (x) { return x.v === '4.7'; })[0] || { items: [] }).items.join('|');
['飛行小怪變慢了', '密碼可以看清楚了', 'RPG 同步變温和'].forEach(function (k) {
  ok(v47.indexOf(k) >= 0, 'v4.7 條列提到「' + k + '」');
});

// ==================================================================
console.log('\n=== 1. 飛行小怪基礎速度調降 ===');
const FLY = { bat: 30, ghost: 26, bee: 36, eye: 29 };
const flying = P.ENEMY_SPECIES.filter(function (s) { return s.kind === 'fly'; });
ok(flying.length === 13, '飛行怪仍是 13 種（v4.27 新增的飛行怪也一起驗）');
Object.keys(FLY).forEach(function (id) {
  const sp = P.speciesOf(id);
  ok(sp.spd === FLY[id], id + ' 基礎速度 = ' + FLY[id], sp.spd);
});
// v4.13：舊四隻仍維持 v4.7 的降速；新兩隻（鬼火／大黃蜂）本來就快
ok(flying.filter(function (s) { return ['bat','ghost','bee','eye'].indexOf(s.id) >= 0; })
     .every(function (s) { return s.spd <= 36; }), '舊四隻飛行怪仍 ≤ 36（原本 40~56）');
ok(flying.length === 13, '共 13 隻飛行怪');
ok(flying.filter(function (s) { return ['bat','ghost','bee','eye'].indexOf(s.id) >= 0; })
     .every(function (s) { return s.spd < 40; }), '舊四隻都比最慢的舊值（40）還慢');

// ==================================================================
console.log('\n=== 2. 速度上限與關卡成長 ===');
ok(P.FLY_SPEED_CAP === 78, 'FLY_SPEED_CAP = 78（原本 118）', P.FLY_SPEED_CAP);
ok(P.FLY_SPEED_CAP < 146, '上限 78 < 玩家基礎 146 → 玩家一定跑得掉');
ok(src(/speed: \(sp\.spd \+ stage \* \(sp\.kind === 'fly' \? 1\.2 : 2\.6\)\) \* M/),
  '飛行怪成長斜率 2.6 → 1.2，地面怪維持 2.6');
ok(src(/if \(sp\.kind === 'fly'\) e\.speed = Math\.min\(e\.speed, FLY_SPEED_CAP \* M\);/),
  '封頂邏輯仍保留');

(function () {
  let worst = 0, worstName = '';
  for (let st = 1; st <= 8; st++) {
    flying.forEach(function (s) {
      const e = P.makeEnemy(2, 2, s.id, st, 1);
      if (e.speed > worst) { worst = e.speed; worstName = s.name + '@第' + st + '關'; }
    });
  }
  ok(worst <= P.FLY_SPEED_CAP, '第 1~8 關峰值沒超速（' + worst.toFixed(1) + '：' + worstName + '）');
  // v4.13 加了 10 隻新飛行怪 → 峰值略升，只要不超過 FLY_SPEED_CAP 就安全
  ok(worst <= P.FLY_SPEED_CAP, '峰值 ' + worst.toFixed(1) + ' ≤ 上限 ' + P.FLY_SPEED_CAP);
  ok(worst < 146 * .5, '連最快的情況都不到玩家速度的一半');

  // 困難難度 ×1.22 也要安全
  let hard = 0;
  flying.forEach(function (s) {
    const e = P.makeEnemy(2, 2, s.id, 8, 1.22);
    if (e.speed > hard) hard = e.speed;
  });
  ok(hard < 146, '困難難度（×1.22）第 8 關最快也只有 ' + hard.toFixed(1) + ' < 玩家 146');

  // 地面怪一動都沒動
  const ground = P.ENEMY_SPECIES.filter(function (s) { return s.kind !== 'fly'; });
  const moved = ground.filter(function (s) {
    return Math.abs(P.makeEnemy(2, 2, s.id, 3, 1).speed - (s.spd + 3 * 2.6)) > 1e-9;
  });
  ok(moved.length === 0, '6 種地面怪速度公式完全沒被動到');
})();

// ==================================================================
console.log('\n=== 3. 不再一直盯著玩家追 ===');
ok(src(/e\.turnT = 1\.6 \+ Math\.random\(\) \* 1\.6;/), '開場轉向延遲 1.6~3.2 秒（原本 0.8~2.2）');
ok(src(/e\.turnT = 1\.3 \+ Math\.random\(\) \* 1\.8;/), '後續轉向間隔 1.3~3.1 秒（原本 0.7~2.1）');
ok(src(/if \(foe && Math\.random\(\) < \(isAngryFoe\(e\) \? \.78 : \.48\)\)/),
  'v4.19：朝玩家飛的機率掛在仇恨上（低階 .48／中高階 .78）');
ok(!/if \(best && Math\.random\(\) < \.6\)/.test(html), '舊的 60% 追人判斷已移除');
ok(src(/Math\.atan2\(foe\.y - e\.y, foe\.x - e\.x\) \+ \(Math\.random\(\) - \.5\) \* \.7/),
  '追人角度擾動維持 .7（更準一點，但還是不會直直撞過來）');

// ==================================================================
console.log('\n=== 4. RPG 模式同步 ===');
const F = P.RPG_FOE;
[['bat', .82], ['ghost', .80], ['bee', .90], ['eye', .84]].forEach(function (x) {
  ok(Math.abs(F[x[0]].spd - x[1]) < 1e-9, 'RPG ' + x[0] + ' 倍率 = ' + x[1], F[x[0]].spd);
});
ok(['bat', 'ghost', 'bee', 'eye'].every(function (k) { return F[k].spd < 1; }),
  'RPG 四種飛行怪倍率都 < 1（原本 1.00~1.12）');

// ==================================================================
console.log('\n=== 5. 圖鑑說明與實際速度一致 ===');
ok(!/\{ id: 'bee', k: 'fly'[^\n]*tw: '快'/.test(html), '毒蜂圖鑑不再標「快」');
ok(/\{ id: 'bee', k: 'fly'[^\n]*tw: '中'/.test(html), '毒蜂圖鑑改標「中」');
ok(/\{ id: 'eye', k: 'fly'[^\n]*tw: '慢'/.test(html), '眼球怪圖鑑改標「慢」');
ok(!/毒蜂：穿牆飛行、<b>速度快<\/b>/.test(html), '舊的「速度快」文案已移除');
ok(!/會<b>直直盯著你靠過來<\/b>/.test(html), '舊的「直直盯著你」文案已移除');
ok(/偶爾/.test(html), '新文案改成「偶爾才會朝你飄過來」');

// ==================================================================
console.log('\n=== 6. 密碼眼睛：10 語齊備 ===');
const LANGS = ['zh-TW', 'zh-CN', 'en', 'ja', 'ko', 'th', 'vi', 'ru', 'de', 'it'];
LANGS.forEach(function (lg) {
  const d = P.I18N[lg];
  ok(!!(d && d['web.pwShow'] && d['web.pwHide']), lg + ' 有顯示／隱藏文案',
    d ? d['web.pwShow'] + ' / ' + d['web.pwHide'] : 'MISSING');
});
ok(P.I18N['zh-TW']['web.pwShow'] === '顯示密碼', '繁中＝顯示密碼');
ok(P.I18N['zh-CN']['web.pwShow'] === '显示密码', '简中＝显示密码');
ok(P.I18N['en']['web.pwShow'] === 'Show password', '英文＝Show password');

// ==================================================================
console.log('\n=== 7. 密碼眼睛：樣式與欄位接線 ===');
ok(src(/\.pwrow \{ position: relative; display: block; \}/), '.pwrow 相對定位');
ok(src(/\.pwrow \.acctin \{ padding-right: 46px; \}/), '輸入框右側留 46px 給眼睛');
ok(src(/\.pwtoggle \{[\s\S]{0,420}position: absolute;[\s\S]{0,420}top: 50%/), '眼睛按鈕絕對定位在輸入框右側');
ok(src(/\.pwtoggle:focus-visible \{ outline: 2px solid #f4703c;/), '鍵盤 focus 有可見外框');
ok(src(/\.pwtoggle\.on \{ background: #fff0df;/), '顯示中會有底色區別');
ok(src(/\.pwrow \.acctin \{ padding-right: 42px; \}/), '手機窄版也保留了右側留白');
ok(src(/pwFieldHtml\('acctOldIn', 'current-password'\)/), '舊密碼欄位走共用產生器');
ok(src(/pwFieldHtml\('acctPwIn', 'new-password'/), '新密碼欄位走共用產生器');
ok(src(/pwFieldHtml\('acctPw2In', 'new-password'\)/), '確認密碼欄位走共用產生器');
ok(src(/else if \(act === 'pwEye'\) togglePwEye\(b\);/), 'click 委派接上眼睛');
ok(!/<input id="acctPwIn" class="acctin" type="password"/.test(html), '沒有殘留「裸」的密碼 input');
ok(typeof P.pwFieldHtml === 'function' && typeof P.togglePwEye === 'function',
  '__BH 有匯出兩支函式供測試');

// ==================================================================
console.log('\n=== 8. 密碼眼睛：實際切換行為（迷你沙盒真跑） ===');
const a = html.indexOf('function pwEsc(');
const b = html.indexOf('const $id = function (id)', a);
ok(a > 0 && b > a, '能從主程式切出密碼輔助函式段落');
const SEG = html.slice(a, b);

function mini() {
  const els = {};
  function mkInput(type) {
    return {
      type: type, value: '', selectionStart: null, _focused: false, _sel: null,
      focus: function () { this._focused = true; },
      setSelectionRange: function (x, y) { this._sel = [x, y]; }
    };
  }
  function mkBtn() {
    return {
      attrs: {}, textContent: '', _cls: {},
      getAttribute: function (k) { return this.attrs[k]; },
      setAttribute: function (k, v) { this.attrs[k] = v; },
      classList: { toggle: function (c, on) { this._on = on; } }
    };
  }
  const ctx = {
    $id: function (id) { return els[id] || null; },
    t: function (k) { return k === 'web.pwHide' ? '隱藏密碼' : '顯示密碼'; }
  };
  vm.createContext(ctx);
  vm.runInContext(SEG, ctx, { filename: 'pwSeg' });
  return { ctx: ctx, els: els, mkInput: mkInput, mkBtn: mkBtn };
}

(function () {
  const M = mini();
  const h = M.ctx.pwFieldHtml('acctPwIn', 'new-password');
  ok(h.indexOf('<span class="pwrow">') === 0, '產生器輸出包在 .pwrow 裡');
  ok(/id="acctPwIn"/.test(h) && /type="password"/.test(h), '輸入框預設是 password');
  ok(/data-acct="pwEye"/.test(h) && /data-for="acctPwIn"/.test(h), '眼睛按鈕綁到對應欄位');
  ok(/aria-pressed="false"/.test(h) && /aria-label="顯示密碼"/.test(h), '初始無障礙標籤正確');

  const inp = M.mkInput('password');
  inp.value = 'Abc12345';
  inp.selectionStart = 3;
  const btn = M.mkBtn();
  btn.attrs['data-for'] = 'acctPwIn';
  M.els['acctPwIn'] = inp;

  const r1 = M.ctx.togglePwEye(btn);
  ok(r1 === true, '第一次切換回傳 true（現在是顯示）');
  ok(inp.type === 'text', 'input.type 變成 text');
  ok(inp.value === 'Abc12345', '已輸入的密碼完全沒被清掉');
  ok(inp._focused === true, '焦點還在輸入框（手機不用再點一次）');
  ok(inp._sel && inp._sel[0] === 3 && inp._sel[1] === 3, '游標位置也保留在原地');
  ok(btn.textContent === '🙈', '按鈕圖示變 🙈');
  ok(btn.attrs['aria-pressed'] === 'true', 'aria-pressed 變 true');
  ok(btn.attrs['aria-label'] === '隱藏密碼' && btn.attrs['title'] === '隱藏密碼', '提示文字換成「隱藏密碼」');

  const r2 = M.ctx.togglePwEye(btn);
  ok(r2 === false, '再按一次回傳 false（現在是隱藏）');
  ok(inp.type === 'password', 'input.type 還原成 password');
  ok(btn.textContent === '👁', '按鈕圖示變回 👁');
  ok(btn.attrs['aria-pressed'] === 'false' && btn.attrs['aria-label'] === '顯示密碼', '無障礙狀態復原');
  ok(inp.value === 'Abc12345', '來回切兩次內容依然在');

  ok(M.ctx.togglePwEye(M.mkBtn()) === false, '找不到對應輸入框時安全回傳 false，不會炸');

  // 三個欄位互不干擾
  const i2 = M.mkInput('password'), i3 = M.mkInput('password');
  M.els['acctPw2In'] = i2; M.els['acctOldIn'] = i3;
  const b2 = M.mkBtn(); b2.attrs['data-for'] = 'acctPw2In';
  M.ctx.togglePwEye(b2);
  ok(i2.type === 'text' && i3.type === 'password' && inp.type === 'password',
    '切「確認密碼」不會連帶把其他兩欄也顯示出來');
})();

// ==================================================================
console.log('\n=== 9. PWA 檔案仍在（v4.6 沒被改壞） ===');
ok(fs.existsSync(path.join(ROOT, 'manifest.json')), 'manifest.json 存在');
ok(fs.existsSync(path.join(ROOT, 'sw.js')), 'sw.js 存在');
const sw = rd('sw.js').toString();
ok(new RegExp("var SW_VERSION = 'v" + P.VERSION + "\\.\\d+';").test(sw), 'SW 快取版本跟著升到 v' + P.VERSION + '.x（否則玩家會卡在舊版）');
['icon-192.png', 'icon-512.png', 'icon-maskable-192.png', 'icon-maskable-512.png',
  'apple-touch-icon.png', 'favicon-32.png'].forEach(function (f) {
  ok(fs.existsSync(path.join(ROOT, 'icons', f)), 'icons/' + f + ' 存在');
});
const man = JSON.parse(rd('manifest.json').toString());
ok(man.display === 'standalone' && man.name === '爆爆英雄', 'manifest display/name 正確');
ok(src(/<link rel="manifest" href="\.\/manifest\.json">/), '首頁仍掛著 manifest');
ok(src(/data-acct="pwEye"/), '眼睛按鈕的委派標記存在於原始碼');

// ==================================================================
console.log('\n----------------------------------------');
console.log((fail === 0 ? '全部通過' : '有失敗') + '：' + pass + ' 項通過、' + fail + ' 項失敗');
process.exit(fail === 0 ? 0 : 1);
