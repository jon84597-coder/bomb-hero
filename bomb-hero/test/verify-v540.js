// test/verify-v540.js —— v5.40：大逃殺「切小地圖後按出發沒反應」
//   ① 切換地圖尺寸（整張卡重畫）後，✕／出發／名字輸入都還要活著
//   ② 出發真的進得了原圖 56×44（人數、圈半徑、縮圈曲線、王與小怪數都跟著換）
//   ③ 反向：切回大圖一樣能出發
//   ④ 卡片內容跟著尺寸走（人數選項、上限夾值、n 被夾到 50）
//   ⑤ 原圖 180 秒模擬：核彈、空投、縮圈都跑得動、不丟錯
//   ⑥ 原始碼守衛（重畫後一定要重綁，避免又有人把 brCardWire 拿掉）
const SB = require('./_sandbox');
const fs = require('fs');
const env = SB.makeEnv();
const P = env.BH, G = env.G;
const src = SB.rawHtml;

let pass = 0, fail = 0;
function ok(c, m, extra) {
  if (c) { pass++; console.log('  ✓ ' + m); }
  else { fail++; console.log('  ✗ FAIL: ' + m + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }

/* 真瀏覽器語意：innerHTML 重畫之後，舊的子節點與事件監聽都會消失。
   _sandbox 預設會「同一個 id 永遠同一個物件」（舊測試靠這個），
   這裡開 realInner 才能重現玩家回報的「按了沒反應」。 */
function openCard() {
  const e = SB.makeEnv({ realInner: true });
  const h = { env: e, P: e.BH, G: e.G };
  // 模擬點首頁的 🏝️ 大逃殺
  const btns = e.getId('btnBR')._on.click || [];
  for (let i = 0; i < btns.length; i++) btns[i]({ stopPropagation() {} });
  h.ov = e.getId('brOv');
  return h;
}
function clickEl(el) {
  const a = (el && el._on && el._on.click) || [];
  for (let i = 0; i < a.length; i++) a[i]({ stopPropagation() {} });
  return a.length;
}
function segClick(ov, key, val) {
  return ov.onclick({
    target: { tagName: 'B', dataset: { v: String(val) }, parentNode: { getAttribute: function () { return key; } } },
    stopPropagation: function () {}
  });
}

/* ================================================================ ① */
head('① 切換地圖尺寸後，卡片上的按鈕還活著');
{
  const h = openCard();
  ok((h.env.getId('brOk')._on.click || []).length === 1, '剛開卡：✕ 綁了 1 個 click');
  ok((h.env.getId('brGo')._on.click || []).length === 1, '剛開卡：出發綁了 1 個 click');

  segClick(h.ov, 'map', 0);                       // ← 玩家選「原本 56×44」
  ok(h.P.BR.opt.map === 0, '選了原圖（BR.opt.map = 0）');
  ok(h.ov.innerHTML.indexOf('data-v="0" class="on"') >= 0, '卡面「原本 56×44」標成選取');

  // ★ 這三個就是 v5.39 全部失效的地方（重畫 → 新節點 → 舊監聽全掉）
  ok((h.env.getId('brOk')._on.click || []).length === 1, '重畫後 ✕ 重新綁回 1 個 click');
  ok((h.env.getId('brGo')._on.click || []).length === 1, '重畫後「出發」重新綁回 1 個 click');
  ok(((h.env.getId('brName')._on.input || []).length === 1) &&
     ((h.env.getId('brName')._on.keydown || []).length === 1), '重畫後名字輸入（input＋keydown）也重新綁好');

  // ✕ 按下去要真的收卡
  h.env.getId('brOk')._on.click[0]({});
  ok(h.ov.classList.contains('hide'), '重畫後按 ✕ 會收起卡片');
}

/* ================================================================ ② */
head('② 切到原圖 → 按出發 → 進得了 56×44');
{
  const h = openCard();
  segClick(h.ov, 'map', 0);
  const n = clickEl(h.env.getId('brGo'));
  ok(n === 1, '「出發」按得動（' + n + ' 個 click）');
  ok(h.G.mode === 'br', '進入了大逃殺（mode = ' + h.G.mode + '）');
  ok(h.G.cols === 56 && h.G.rows === 44, '地圖是原圖 56×44（實際 ' + h.G.cols + '×' + h.G.rows + '）');
  ok(h.P.BR.W === 56 && h.P.BR.H === 44, 'BR.W／H 跟著換成 56／44');
  ok(h.P.BR.Z0 === h.P.BR.Z0S, '開場圈半徑用原圖的 27 格（實際 ' + h.P.BR.Z0 + '）');
  ok(h.P.BR.PH === h.P.BR.PH10S, '10 分鐘場用原圖縮圈曲線 PH10S');
  ok(h.P.BR.PH[0][1] === 27, '第一圈收到 27 格');
  ok(h.G.players.length === Math.min(h.P.BR.opt.n, 50), '人數吃原圖上限 50（實際 ' + h.G.players.length + '）');
  ok(h.G.enemies.length === h.P.brFoeN() + h.P.brBossN(),
    '小怪＋亂入王 = ' + h.P.brFoeN() + '＋' + h.P.brBossN() + '（實際 ' + h.G.enemies.length + '）');
  ok(h.P.brBig() === false, 'brBig() 認得現在是小圖');
  ok(h.P.brBossN() === 2 && h.P.brFoeN() === 14, '原圖：2 隻王、14 隻小怪');
}

/* ================================================================ ③ */
head('③ 反向：切回大圖也能出發');
{
  const h = openCard();
  segClick(h.ov, 'map', 0);
  segClick(h.ov, 'map', 1);
  ok(h.P.BR.opt.map === 1, '切回大圖');
  clickEl(h.env.getId('brGo'));
  ok(h.G.mode === 'br' && h.G.cols === 79 && h.G.rows === 62,
    '大圖 79×62 開得起來（實際 ' + h.G.cols + '×' + h.G.rows + '）');
  ok(h.P.BR.PH === h.P.BR.PH10, '大圖用 PH10 曲線');
}

/* ================================================================ ④ */
head('④ 卡片內容跟著尺寸走');
{
  P.BR.opt.map = 1; P.BR.opt.n = 100; P.BR.opt.dur = 10; P.BR.opt.team = 1;
  const big = P.brCardHTML();
  ok(big.indexOf('79×62') >= 0, '大圖卡面寫 79×62');
  ok(big.indexOf('data-v="100"') >= 0, '大圖有人數 100 選項');

  P.BR.opt.map = 0; P.BR.opt.n = 100;
  const small = P.brCardHTML();
  ok(small.indexOf('56×44') >= 0, '原圖卡面寫 56×44');
  ok(small.indexOf('data-v="100"') < 0, '原圖沒有人數 100 選項');
  ok(small.indexOf('data-v="20"') >= 0 && small.indexOf('data-v="50"') >= 0, '原圖是 20／30／50 人');
  ok(P.BR.opt.n === 50, '切到原圖時 100 人會被夾到 50（實際 ' + P.BR.opt.n + '）');

  P.BR.opt.n = 100; P.BR.opt.map = 1;   // 還原預設
}

/* ================================================================ ⑤ */
head('⑤ 原圖 180 秒模擬：核彈、空投、縮圈');
{
  P.BR.opt.map = 0; P.BR.opt.n = 20; P.BR.opt.dur = 10; P.BR.opt.team = 1;
  P.startBR();
  G.state = 'play';
  let err = null, drops = 0, nukes = 0, phase = 0;
  const t0 = Date.now();
  try {
    for (let i = 0; i < 180 * 60; i++) {
      P.updateWorld(1 / 60);
      P.updateBR(1 / 60);
      if (G.brDrops) drops = Math.max(drops, G.brDrops.length);
      if (G.brNukes) nukes = Math.max(nukes, G.brNukes.filter(function (x) { return x; }).length);
      if (G.brZone) phase = Math.max(phase, G.brZone.phase | 0);
    }
  } catch (e) { err = e; }
  ok(!err, '180 秒不丟錯' + (err ? '（' + err.message + '）' : ''));
  ok(drops > 0, '空投有落（同時最多 ' + drops + ' 個）');
  ok(nukes > 0, '核彈有落（同時最多 ' + nukes + ' 顆）');
  ok(phase > 0, '毒圈有在縮（走到第 ' + phase + ' 段）');
  ok(G.brAlive < 20, 'AI 有互相打起來（剩 ' + G.brAlive + ' 人）');
  ok(Date.now() - t0 < 60000, '模擬沒有卡住（' + (Date.now() - t0) + 'ms）');
  P.BR.opt.map = 1; P.BR.opt.n = 100;
}

/* ================================================================ ⑥ */
head('⑥ 原始碼守衛');
{
  ok(/function brCardWire\(ov\)/.test(src), '有 brCardWire（重畫後重綁的專用函式）');
  const rebind = /ov\.innerHTML = brCardHTML\(\);\s*\n\s*brCardWire\(ov\);/.test(src);
  ok(rebind, '切換地圖重畫完一定接 brCardWire(ov)');
  ok((src.match(/\$\('brGo'\)\.addEventListener/g) || []).length === 0, '沒有散落的舊式 brGo 綁定');
  ok((src.match(/\$id\('brGo'\)\.addEventListener/g) || []).length === 0, '沒有散落的 $id(\'brGo\') 綁定');
  const goBind = (src.match(/const goB = \$id\('brGo'\);/g) || []).length;
  ok(goBind === 1, '「出發」的綁定只有一處（' + goBind + ' 處）');
  const okBind = (src.match(/const okB = \$id\('brOk'\);/g) || []).length;
  ok(okBind === 1, '「✕」的綁定只有一處（' + okBind + ' 處）');
  ok(/brCardWire\(ov\);/.test(src), '開卡時也走同一支（不重複寫兩份）');
}

/* ================================================================ ⑦ */
head('⑦ 版本戳記');
{
  ok(parseFloat(P.VERSION) >= 5.40, 'VERSION ≥ 5.40（實際 ' + P.VERSION + '）');
  ok(src.indexOf('id="verTxt">' + P.VERSION + '<') >= 0, '#verTxt 顯示 ' + P.VERSION);
  const sw = fs.readFileSync(__dirname + '/../sw.js', 'utf8');
  const m = /SW_VERSION = 'v([0-9.]+)'/.exec(sw);
  ok(m && parseFloat(m[1]) >= 5.40, 'SW_VERSION ≥ v5.40（' + (m ? m[1] : '?') + '）');
  const vl = SB.vlog || '';
  ok(vl.indexOf("v: '5.40'") >= 0, '版本紀錄有 5.40');
  ok(vl.indexOf("v: '5.39', date: '2026-11-07', now: false") >= 0, '5.39 改成 now:false');
}

console.log('\n' + (fail === 0 ? '✅ 全部 ' + pass + ' 項通過' : '❌ ' + fail + ' 項失敗 / ' + (pass + fail) + ' 項'));
process.exit(fail === 0 ? 0 : 1);
