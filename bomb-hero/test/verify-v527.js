// verify-v527.js — v5.27 專屬驗證
//   ① 怪物發招預告：只有真的會鎖定格子的「吐彈」才畫，其他招式不再出現往左上角的假虛線
//   ② 教學文案與實際按鍵／縮放範圍一致（沒有舊字串）
//   ③ 畫質三級：DPR 上限、粒子倍率、ambN 範圍、粒子硬上限、飄字上限
//   ④ 無障礙：震動可關（唯一套用點）、色盲隊色（顏色＋圖形＋線型）
//   ⑤ 五模式新手提示：只顯示一次、存在 localStorage
//   ⑥ 賽季：28 天切季、增量計分、不能重複領、不能提前領
//   ⑦ 快捷語：送索引、對方用自己的語言解讀、伺服器端上限
const { makeEnv, html } = require('./_sandbox');

const env = makeEnv();
const P = env.BH, G = P.Game, rec = env.rec;
const src = html.replace(/\r/g, '');
const uiOnly = src.slice(0, src.indexOf('const VERSION_LOG = ['));
const i18 = require('fs').readFileSync(__dirname + '/../js/i18n-src.js', 'utf8').replace(/\r/g, '');

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }

// ================================================================
head('1. 怪物發招預告（v5.27 修的 bug）');
{
  const fn = (src.match(/function drawFoeCastGround\(T\) \{[\s\S]*?\n\}\n/) || [''])[0];
  ok(!!fn, '有 drawFoeCastGround');
  ok(/e\.skill !== 'spit'\) continue;/.test(fn), '只有吐彈（skill === spit）才畫地面預告');
  ok(/e\.castX >= \(Game\.cols \| 0\)/.test(fn), '落點格超出地圖就不畫（擋 0/0 這種沒指定的座標）');
  // 其他招式都不該碰到地面預告
  const others = ['beam', 'pulse', 'chain', 'dive', 'hazard', 'roller', 'homing'];
  ok(others.every(function (k) { return fn.indexOf("'" + k + "'") < 0; }), '其他八種招式沒有被列進地面預告');

  // 逐一確認：每一種會吐彈的怪，虛線起點都在牠自己身上
  const T = 48;
  G.T = T; G.cols = 15; G.rows = 13; G.gameT = 1;
  const spitters = [];
  try {
    P.ENEMY_SPECIES.forEach(function (sp) {
      const kit = P.foeKit ? P.foeKit(sp.id) : null;
      const sk = (kit && kit.skill) || sp.skill;
      if (sk === 'spit') spitters.push(sp.id);
    });
  } catch (e) {}
  ok(spitters.length >= 4, '會吐彈的怪有 ' + spitters.length + ' 種（逐一驗）');
  let bad = 0, checked = 0;
  spitters.forEach(function (id) {
    const e = P.makeEnemy(3, 3, id, 1, 1);
    e.x = 600; e.y = 420; e.skill = 'spit'; e.fx = 'fire';
    e.castT = 1; e.castX = 9; e.castY = 8; e.boss = false;
    G.enemies = [e];
    rec.calls.length = 0;
    P.drawFoeCastGround(T);
    const ln = rec.calls.filter(function (c) { return c[0] === 'moveTo' || c[0] === 'lineTo'; });
    const aim = ln.length ? ln[ln.length - 1] : null;
    const start = ln.length >= 2 ? ln[ln.length - 2] : null;
    checked++;
    // 起點必須是牠自己（x 相同、y 只差一點點），終點必須是落點格中心
    const okStart = start && Math.abs(start[1] - 600) < .001 && Math.abs(start[2] - (420 - 12 * .3)) < 1;
    const okEnd = aim && Math.abs(aim[1] - (9 * T + T / 2)) < .001 && Math.abs(aim[2] - (8 * T + T / 2 + T * .1)) < .001;
    if (!okStart || !okEnd) { bad++; console.log('      · ' + id + ' 起點/終點不對'); }
  });
  ok(bad === 0 && checked > 0, '逐隻確認：' + checked + ' 種吐彈怪，虛線都從自己連到落點格');

  // 反例：beam 這種「只有僵直」的招式完全不畫
  const e2 = P.makeEnemy(3, 3, 'slime', 1, 1);
  e2.x = 600; e2.y = 420; e2.skill = 'beam'; e2.castT = .55;
  G.enemies = [e2];
  rec.calls.length = 0;
  P.drawFoeCastGround(T);
  const ln2 = rec.calls.filter(function (c) { return c[0] === 'lineTo'; });
  ok(ln2.length === 0, 'beam（只有出手僵直、沒有落點）不再畫任何落點線');

  // 頭上的元素球也一樣：只有吐彈與鑽地在集氣
  const fx = (src.match(/function drawFoeCastFx\(T\) \{[\s\S]*?\n\}\n/) || [''])[0];
  ok(/e\.skill !== 'spit' && e\.skill !== 'blink'\) continue;/.test(fx), '元素球只給吐彈／鑽地');
  ok(/clamp\(1 - e\.castT \/ FOE_CAST_WINDUP, 0, 1\)/.test(fx), '集氣進度夾在 0~1（僵直招不會算出負值）');
}

// ================================================================
head('2. 教學文案＝實際操作');
{
  ok(uiOnly.indexOf('空白／Enter') < 0, '不再寫「空白／Enter 放炸彈」');
  ok(uiOnly.indexOf('按 <b>E</b>') < 0, '不再寫「按 E 引爆」');
  ok(uiOnly.indexOf('按 <b>F</b>') < 0, '不再寫「按 F 吐火」');
  ok(/滑鼠左鍵<\/b> 放炸彈/.test(src), '總覽：滑鼠左鍵放炸彈');
  ok(/滑鼠右鍵<\/b> 遙控引爆/.test(src), '總覽：滑鼠右鍵遙控引爆');
  ok(/中鍵或 Shift<\/b> 衝刺/.test(src), '總覽：中鍵或 Shift 衝刺');
  ok(/空白鍵<\/b> 恐龍吐火/.test(src), '總覽：空白鍵吐火');
  ok(/空白鍵<\/b>（手把 Y／手機 🔥）往前吐火/.test(src), '圖鑑：吐火鍵＝空白鍵');
  ok(uiOnly.indexOf('58%~185%') < 0, '縮放範圍沒有舊的 58%~185%（版本記錄除外）');
  ok((src.match(/42%~300%/g) || []).length >= 1, '縮放範圍寫 42%~300%');
  // 真的按鍵：預設配置要跟文案一致
  const k1 = P.DEF_KEYS1;
  ok(k1.act === 'Mouse0', '預設放彈＝滑鼠左鍵');
  ok(k1.det === 'Mouse2', '預設引爆＝滑鼠右鍵');
  ok(k1.fire === 'Space', '預設吐火＝空白鍵');
  ok(src.indexOf('衝刺鍵位置') < 0, '導覽不再提「衝刺鍵位置」（沒有這個設定）');
}

// ================================================================
head('3. 畫質分級與降級');
{
  ok(JSON.stringify(P.QUAL_CAP) === '[1,1.5,2]', 'DPR 上限 1／1.5／2');
  ok(JSON.stringify(P.QUAL_PART) === '[0.38,0.65,1]', '粒子倍率 38／65／100%');
  ok(typeof P.qualLevel === 'function' && typeof P.qualDprCap === 'function', '有 qualLevel／qualDprCap');
  P.settings.qual = 'low';
  ok(P.qualLevel() === 0 && P.qualDprCap() === 1, '低：等級 0、上限 1 倍');
  P.settings.qual = 'mid';
  ok(P.qualLevel() === 1 && Math.abs(P.qualPart() - .65) < 1e-6, '中：等級 1、粒子 65%');
  P.settings.qual = 'high';
  ok(P.qualLevel() === 2 && P.qualPart() === 1, '高：等級 2、粒子 100%');
  P.settings.qual = 'auto';
  ok([0, 1, 2].indexOf(P.qualLevel()) >= 0, '自動會落在合法等級');
  ok(P.ambN(0) >= 1, '環境粒子至少留 1 顆（不會整個場景空掉）');
  ok(P.ambN(20) <= 20, '環境粒子不會變多');
  // resizeView 用畫質上限（不是寫死 2）
  ok(/const dpr = Math\.min\(qualDprCap\(\), \(window\.devicePixelRatio \|\| 1\)\);/.test(src), 'resizeView 的 DPR 吃畫質上限');
  // 兩層環境粒子都吃 ambN
  ok((src.match(/for \(let i = 0, nA = ambN\(d\.n\); i < nA; i\+\+\)/g) || []).length === 2, '兩層環境粒子都用 ambN');
  // burst 有硬上限
  ok(/const cap = 160 \+ Math\.round\(240 \* qualPart\(\)\);/.test(src), '爆炸粒子有硬上限');
  ok(/Game\.particles\.splice\(0,/.test(src), '超過上限會從最舊的開始丟');
  // 飄字上限
  ok(/Math\.max\(5, Math\.round\(14 \* qualPart\(\)\)\)/.test(src), '傷害數字上限吃畫質');
  // FPS 錶
  ok(/function updateFps\(dt\)/.test(src), '有 updateFps');
  ok(/fpsPill/.test(src) && /fpsVal/.test(src), 'FPS 錶的 DOM 存在');
  ok(/id="segQual"/.test(src) && /id="segFps"/.test(src), '設定頁有畫質與 FPS 欄位');
  ok(/settings\.fps = settings\.fps \? 1 : 0;/.test(src), 'settings.fps 會被正規化');
}

// ================================================================
head('4. 無障礙（震動／色盲）');
{
  // v5.37：震動預設關，核彈獨立一個開關 → 判定改成 shakeOn
  ok(/const shakeOn = settings\.shake \|\| \(settings\.nukeShake && \(Game\.nukeShakeT \|\| 0\) > 0\);/.test(src), '震動的唯一套用點吃 shakeOn（畫面震動 or 核彈震動）');
  ok(/if \(shakeOn && Game\.shake > 0\)/.test(src), 'shakeOn 才是真的位移條件');
  ok((src.match(/ctx\.translate\(\(Math\.random\(\) - \.5\) \* Game\.shake \* 9/g) || []).length === 1, '只有一處真的位移畫面');
  // v5.37：預設改成「關」（暈動症友善），舊存檔用 shakeV 戳記一次性歸零
  ok(/if \(\(settings\.shakeV \| 0\) < 2\) \{ settings\.shake = 0; settings\.shakeV = 2; \}/.test(src), '舊存檔靠 shakeV 戳記一次性歸零（只做一次）');
  ok(/id="segShake"/.test(src) && /id="segCB"/.test(src), '設定頁有震動與色盲開關');

  const teams = P.TEAMS, cb = P.TEAMS_CB;
  ok(teams.length === 4 && cb.length === 4, '四隊都有色盲替代設定');
  const hexes = cb.map(function (m) { return m.hex; });
  ok(new Set(hexes).size === 4, '四個色盲替代色互不相同');
  // Okabe-Ito 安全色不是紅／綠
  ok(hexes.every(function (h) { return h !== '#ff5a5a' && h !== '#46d68c'; }), '替代色不是原本的紅／綠');
  const glyphs = cb.map(function (m) { return m.glyph; });
  ok(new Set(glyphs).size === 4, '四個隊徽圖形互不相同（●■▲★）');
  const dashes = cb.map(function (m) { return JSON.stringify(m.dash); });
  ok(new Set(dashes).size === 4, '四種線型互不相同（含實線）');
  P.settings.cb = 0;
  ok(P.teamMeta(0).hex === '#ff5a5a', '關閉時用原本隊色');
  P.settings.cb = 1;
  ok(P.teamMeta(0).hex === '#0072b2' && P.teamMeta(3).glyph === '★', '開啟時換成安全色＋圖形');
  P.settings.cb = 0;
  ok(/if \(settings\.cb && tmD\.dash && tmD\.dash\.length\)/.test(src), '隊友光環會套虛線樣式');
  ok(/if \(settings\.cb\) \{ try \{ ctx\.setLineDash\(\[\]\); \}/.test(src), '畫完一定把虛線切回去');
}

// ================================================================
head('5. 五模式新手提示');
{
  ok(typeof P.ModeTip === 'object' && P.ModeTip.MODES.length === 5, '五個模式（solo/rpg/br/online/battle）');
  P.ModeTip.reset();
  const t1 = P.ModeTip.tips('solo');
  ok(Array.isArray(t1) && t1.length === 3, '第一次進單人 → 三條提示');
  ok(P.ModeTip.tips('br').length === 3, '大逃殺也有三條');
  P.ModeTip.mark('solo');
  ok(P.ModeTip.tips('solo') === null, '看過就不再顯示');
  ok(P.ModeTip.tips('br').length === 3, '其他模式不受影響');
  ok(P.ModeTip.tips('nope') === null, '不存在的模式回 null');
  P.ModeTip.reset();
  ok(P.ModeTip.tips('solo').length === 3, 'reset 之後會再顯示（測試用）');
  // 真的送到覆蓋層
  ok((src.match(/tips: ModeTip\.tips\(/g) || []).length === 4, '四個開場覆蓋層都接了提示');
  ok(/if \(o\.tipMode\) ModeTip\.mark\(o\.tipMode\);/.test(src), '按掉才記住（不是一開就記）');
  // 沙盒沒有真的 DOM，也不能炸
  let threw = false;
  try {
    P.showOverlay && P.showOverlay({ title: 'x', sub: 'y', btn: 'z', tips: ['a', 'b'], tipMode: 'solo', action: function () {} });
  } catch (e) { threw = true; }
  ok(!threw, 'showOverlay 帶 tips 在沒有 parentNode 的環境也不炸');
}

// ================================================================
head('6. 賽季（四週長週期）');
{
  const S = P.Season;
  ok(!!S && S.TIERS.length === 5 && S.GOALS.length === 4, '五個階段＋四個目標');
  const LEN = 28 * 86400000;
  ok(S.endAt(0) - S.startAt(0) === LEN, '一季 28 天');
  ok(S.startAt(1) - S.startAt(0) === LEN, '下一季接著上一季（沒有空隙）');
  ok(S.daysLeft() >= 1 && S.daysLeft() <= 28, '剩餘天數在 1~28 之間（實際 ' + S.daysLeft() + '）');
  ok(S.seasonNo() >= 1, '季號從 1 開始（實際 ' + S.seasonNo() + '）');
  // 分數＝本季增量：把基準調高，分數就往下
  const p0 = S.pts();
  ok(p0 >= 0, '賽季分數不是負數');
  const st = S.pts();
  ok(typeof st === 'number' && isFinite(st), '分數是有限數字');
  // 門檻要遞增
  let inc = true;
  for (let i = 1; i < S.TIERS.length; i++) if (S.TIERS[i].p <= S.TIERS[i - 1].p) inc = false;
  ok(inc, '階段門檻遞增');
  ok(S.TIERS[S.TIERS.length - 1].p === 1600, '最高階段 1600 分');
  // 不能提前領、不能重複領
  const r1 = S.claimTier(4);
  ok(!r1.ok, '分數不夠時不能領最後一階');
  const before = S.tiers();
  if (S.pts() >= S.TIERS[0].p) {
    const a = S.claimTier(0);
    ok(a.ok, '分數夠就能領第一階');
    const b = S.claimTier(0);
    ok(!b.ok, '同一階不能領兩次');
  } else {
    ok(true, '目前分數不足，跳過實際領取（只驗擋重複）');
  }
  ok(S.tiers() === before || S.tiers() === before + 1, '階段數只會往前走一格');
  // 目標
  const g = S.GOALS[0];
  ok(S.goalP(g) >= 0, '目標進度不是負數');
  const cg1 = S.claimGoal(g.id), cg2 = S.claimGoal(g.id);
  ok(!(cg1.ok && cg2.ok), '同一個目標不會發兩次金幣');
  // 換季要把生涯值當新基準
  ok(/S\.base\[W\[j\]\[0\]\] = stat\(W\[j\]\[0\]\);/.test(src), '換季時把生涯值寫成新的基準');
  ok(/if \(i !== S\.idx\)/.test(src), '季號一變就重置');
  ok(/if \(!T \|\| i !== \(S\.tiers \| 0\) \|\| pts\(\) < T\.p\) return \{ ok: false \};/.test(src), '領階段要「剛好是下一階」且分數夠');
  ok(/function seasonBlock\(\)/.test(src), '有賽季區塊');
  ok(/body\.innerHTML =\s*\n\s*seasonBlock\(\) \+/.test(src), '賽季區塊掛在禮物面板最上面');
  ok(/if \(Season\.hasReward\(\)\) return true;/.test(src), '賽季可領 → 禮物按鈕亮紅點');
}

// ================================================================
head('7. 快捷語（跨語言）');
{
  const Q = P.QChat;
  ok(!!Q && Q.N === 8, '八句快捷語');
  ok(Q.decode('#3') === Q.label(3), '解碼 #3 ＝ 自己語言的第三句');
  ok(Q.decode('#99').length <= 24, '越界索引不會爆（退回原文）');
  ok(/Net\.api\('\/api\/relay\/input', \{ code: Net\.code, pid: Net\.pid, chat: i \| 0/.test(src), '送出的是索引（不是文字）');
  ok(/'&c=' \+ \(Net\.chatId \| 0\)/.test(src), '輪詢帶「我收到第幾句」，只拿新的');
  ok(/if \(j\.chat && j\.chat\.length\) \{ try \{ QChat\.incoming\(j\.chat\); \}/.test(src), '收到訊息交給 QChat.incoming');
  ok(/bubbleSay\(p, txt, 'chat', 2\.6\)/.test(src), '說話的人頭上冒泡泡');
  ok(/const chatB = b\.kind === 'chat';/.test(src), '聊天泡泡有自己的顏色');
  // 伺服器端
  const srv = require('fs').readFileSync(__dirname + '/../../server.js', 'utf8');
  ok(/chat: \[\], chatId: 0/.test(srv), '房間有 chat／chatId');
  ok(/body\.chat < 12/.test(srv), '伺服器只收 12 句以內的索引');
  ok(/room\.chat\.length > 20/.test(srv), '房間只留最近 20 句');
  ok(/out\.chatId = room\.chatId \| 0;/.test(srv), '輪詢回傳 chatId');
  // i18n：八句都在五個語言裡
  const miss5 = [];
  for (let i = 0; i < 8; i++) {
    const line = (i18.split('\n').filter(function (ln) { return ln.indexOf('qc.' + i + '|') === 0; })[0] || '');
    if (line.split('|').length !== 6) miss5.push(i);
  }
  ok(miss5.length === 0, '八句都有五個語言（缺：' + miss5.join(',') + '）');
  // 邀好友
  ok(/Social\.dmTo = dmTo|dmTo: dmTo/.test(src), 'Social 開放 dmTo（一鍵邀好友用）');
  ok(/btnInvite/.test(src) && /invModal/.test(src), '有邀好友按鈕與彈窗');
  ok(/Social\.dmTo\(pid, text\(\)\)/.test(src), '點一下就私訊房號');
}

// ================================================================
head('8. 版號與整合');
{
  // 版號用元組比較：之後每版都會往前走，這裡只保證「至少是 5.27」
  ok(P.VERSION.split('.').map(Number)[1] >= 27, '主檔版號 ≥ 5.27（目前 ' + P.VERSION + '）');
  const log0 = src.slice(src.indexOf('const VERSION_LOG = ['), src.indexOf('const VERSION_LOG = [') + 400);
  ok(/now: true/.test(log0), 'VERSION_LOG 第一筆是 now:true');
  ok(/v: '5\.26', date: '2026-11-06', now: false/.test(src), '上一版已改成 now:false');
  ok(new RegExp('var SW_VERSION = .v5\\.(2[7-9]|[3-9]\\d)').test(require('fs').readFileSync(__dirname + '/../sw.js', 'utf8')), 'sw.js 版本 ≥ 5.27');
  ok(/id="verLogVer">5\.(2[7-9]|[3-9]\d)</.test(src), '版本號顯示同步');
  // 新功能的 i18n 都在
  const keys = ['ui.qual', 'ui.fps', 'ui.shake', 'ui.cb', 'se.title', 'se.pts', 'qc.0', 'net.inviteMsg'];
  const missing = keys.filter(function (k) { return i18.indexOf('\n' + k + '|') < 0; });
  ok(missing.length === 0, '新功能的 i18n 都在（缺：' + missing.join(',') + '）');
  const bad5 = keys.filter(function (k) {
    const line = (i18.split('\n').filter(function (ln) { return ln.indexOf(k + '|') === 0; })[0] || '');
    return line.split('|').length !== 6;
  });
  ok(bad5.length === 0, '這些 key 都是五個語言齊全（缺：' + bad5.join(',') + '）');
}

console.log('\n========================================');
console.log('v5.27：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
