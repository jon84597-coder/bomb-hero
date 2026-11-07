// test/verify-v537.js —— v5.37
//   ① 畫面震動預設關閉；核彈震動獨立開關（預設開）
//   ② 大逃殺硬牆不再聚成一坨（整座碰到別座就放棄＋密度上限）
//   ③ BOSS 決戰場＝對戰式棋盤 17×15（軟磚／輸送帶或滑冰；兩個出場點半徑 1 格全空）
//   ④ 大逃殺雙尺寸數量分流（3 王 20 怪 2 核彈 / 2 王 14 怪 1 核彈；最後 1 分鐘停火）
//   ⑤ BOSS 專屬熱血曲（含低通重低音軌）
//   ⑥ 縮放自動效能分級 RQ（42~100% 低 / 100~180% 中 / 180~300% 高）
//   ⑦ 線上配對：Render 提醒、本機對戰全套設定、只選自己的角色、區網／WebRTC 直連
const fs = require('fs');
const path = require('path');
const { makeEnv, rawHtml } = require('./_sandbox');

const env = makeEnv();
const P = env.BH, G = P.Game;
// P2P 的邀請碼用 TextEncoder／btoa（瀏覽器原生；沙盒 vm 沒有，補上）
try {
  env.sandbox.TextEncoder = TextEncoder; env.sandbox.TextDecoder = TextDecoder;
  env.sandbox.btoa = btoa; env.sandbox.atob = atob;
} catch (e) {}
const src = env.html.replace(/\r/g, '');

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }

// 大逃殺硬牆：只量「這一階段擺的掩體」（海岸岩層不算）
function hardBlocks() {
  const m = G.brHardMark || [];
  let blocks = 0;
  for (let y = 0; y < G.rows - 1; y++) for (let x = 0; x < G.cols - 1; x++) {
    if (!m[y] || !m[y + 1]) continue;
    if (m[y][x] && m[y][x + 1] && m[y + 1][x] && m[y + 1][x + 1]) blocks++;
  }
  return blocks;
}
function hardMaxComp() {
  const m = G.brHardMark || [];
  const seen = [];
  for (let y = 0; y < G.rows; y++) seen.push(new Array(G.cols).fill(0));
  let best = 0, comps = 0;
  for (let y = 1; y < G.rows - 1; y++) for (let x = 1; x < G.cols - 1; x++) {
    if (!m[y] || !m[y][x] || seen[y][x]) continue;
    comps++;
    let n = 0;
    const st = [[x, y]];
    seen[y][x] = 1;
    while (st.length) {
      const c = st.pop(); n++;
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (let i = 0; i < 4; i++) {
        const nx = c[0] + nb[i][0], ny = c[1] + nb[i][1];
        if (nx < 0 || ny < 0 || nx >= G.cols || ny >= G.rows) continue;
        if (!m[ny] || !m[ny][nx] || seen[ny][nx]) continue;
        seen[ny][nx] = 1; st.push([nx, ny]);
      }
    }
    if (n > best) best = n;
  }
  return { best, comps };
}
function bootBR(n, map) {
  env.getId('body').classList.add('touch');
  const c = env.getId('cv'); c.clientWidth = 390; c.clientHeight = 775;
  P.settings.ctrl = 'touch';
  if (map != null) P.BR.opt.map = map;
  if (n) P.BR.opt.n = n;
  P.startBR();
  G.state = 'play';
  return G;
}
function countEnemies() {
  let boss = 0, foe = 0;
  (G.enemies || []).forEach(function (e) {
    if (e.boss || e.type === 'boss' || e.chapterBoss) boss++; else foe++;
  });
  return { boss, foe };
}

/* ---------- ① 畫面震動 ---------- */
head('① 震動預設關閉＋核彈震動獨立');
ok(P.settings.shake === 0, 'settings.shake 預設 0（關）');
ok(P.settings.nukeShake === 1, 'settings.nukeShake 預設 1（開）');
ok((P.settings.shakeV | 0) >= 2, 'settings.shakeV 版本戳記 >= 2（實際 ' + P.settings.shakeV + '）');
ok(/settings\.shakeV \| 0\) < 2/.test(src), '舊存檔一次性遷移（shakeV < 2 → 震動歸零）');
ok(src.indexOf('const shakeOn = settings.shake || (settings.nukeShake && (Game.nukeShakeT || 0) > 0)') >= 0,
  'render 的震動判定把核彈獨立出來');
ok(/Game\.nukeShakeT = 1\.8/.test(src) && /Game\.nukeShakeT = Math\.max\(0, Game\.nukeShakeT - dt\)/.test(src),
  '核彈落地標記 1.8 秒後自然衰減');
ok(src.indexOf('id="segNukeShake"') >= 0 && src.indexOf("segWire('segNukeShake'") >= 0,
  '設定頁有「核彈震動」開關');

/* ---------- ② 大逃殺硬牆 ---------- */
head('② 大逃殺硬牆不聚成一坨');
const b2 = bootBR(100, 1);
ok(!!b2.brHardMark, '有記錄本階段擺的掩體（brHardMark）');
ok(b2.brHardN > 40, '大地圖掩體數量足夠躲彈火（' + b2.brHardN + ' 格）');
ok(hardBlocks() === 0, '2×2 實心塊 0 個（實際 ' + hardBlocks() + '）');
const mc = hardMaxComp();
ok(mc.best <= 16, '最大連通塊 <= 16 格（實際 ' + mc.best + '，一座圍籬的量級）');
ok(mc.comps >= 20, '分成很多座獨立掩體（實際 ' + mc.comps + ' 座）');
const b2s = bootBR(50, 0);
ok(hardBlocks() === 0, '原圖 2×2 實心塊也是 0（實際 ' + hardBlocks() + '）');
ok((G.brHardMark && G.brHardN) > 8, '原圖也有掩體（' + G.brHardN + ' 格）');

/* ---------- ③ BOSS 決戰場 ---------- */
head('③ BOSS 決戰場＝對戰式棋盤');
function r1clean(cx, cy) {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const x = cx + dx, y = cy + dy;
    if (x < 1 || y < 1 || x > G.cols - 2 || y > G.rows - 2) continue;  // 地圖外牆不算（那是場地邊界）
    if (G.grid[y][x] !== 0) return false;
    if (G.hazards[y] && G.hazards[y][x]) return false;
  }
  return true;
}
P.startSolo(5, false);
ok(G.cols === 17 && G.rows === 15, '決戰場 17×15（實際 ' + G.cols + '×' + G.rows + '）');
let soft = 0, hard = 0, hzKinds = {};
for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) {
  const v = G.grid[y][x];
  if (v === 1) hard++; else if (v === 2) soft++;
  const h = G.hazards[y] && G.hazards[y][x];
  if (h) hzKinds[h.type] = (hzKinds[h.type] || 0) + 1;
}
ok(soft >= 20, '有軟磚可以打道具（' + soft + ' 格）');
ok(hard > 60, '有硬牆棋盤柱（' + hard + ' 格，含外牆）');
const realHz = Object.keys(hzKinds).filter(function (k) { return k !== 'hide'; });
ok(realHz.length === 1 && (realHz[0] === 'convey' || realHz[0] === 'ice'),
  '機關只鋪一種（' + realHz.join(',') + '，兩種一起鋪會變整片溜冰場）');
ok(hzKinds.warp === undefined, '沒有傳送門（會把王傳走）');
ok(r1clean(8, 2), '王 (8,2) 半徑 1 格完全乾淨');
ok(r1clean(8, 13), '玩家 (8,13) 半徑 1 格完全乾淨');
ok(G.door && G.door.x === 8 && G.door.y === 1 && G.door.revealed === true && G.door.open === false,
  '大門固定在王正上方 (8,1)，要打完才開');
const bs = (G.enemies || []).filter(function (e) { return e.boss; })[0];
ok(!!bs && Math.floor(bs.x / G.T) === 8 && Math.floor(bs.y / G.T) === 2, '王站在 (8,2)');
ok(!!bs && bs.hp >= 4 && bs.hp <= 10, 'v5.48：王血量在 4～10 格之間（' + (bs && bs.hp) + '）');
ok(!!G.bossArena && G.bossArena.bossDead === false, 'bossArena 已建立且王還活著（章節 ' + (G.bossArena && G.bossArena.chapter) + '）');

/* ---------- ④ 大逃殺雙尺寸數量 ---------- */
head('④ 大逃殺雙尺寸數量分流');
const big = bootBR(100, 1);
ok(P.BR.W === 79 && P.BR.H === 62, '大地圖 79×62（實際 ' + P.BR.W + '×' + P.BR.H + '）');
ok(P.BR.N === 100, '大地圖可到 100 人（實際 ' + P.BR.N + '）');
let e1 = countEnemies();
ok(e1.boss === 3, '大地圖 3 隻 BOSS（實際 ' + e1.boss + '）');
ok(e1.foe === 20, '大地圖 20 隻小怪（實際 ' + e1.foe + '）');
big.brNuke = null; big.brNukes = []; big.brNukeCd = 0;
P.brNukeLaunch();
ok((big.brNukes || []).length === 2, '大地圖第一波 2 顆核彈（實際 ' + (big.brNukes || []).length + '）');
ok(P.BR.NUKE_STOP === 60, '最後 1 分鐘停火（NUKE_STOP＝' + P.BR.NUKE_STOP + ' 秒）');

const small = bootBR(100, 0);
ok(P.BR.W === 56 && P.BR.H === 44, '原圖 56×44（實際 ' + P.BR.W + '×' + P.BR.H + '）');
ok(P.BR.N <= 50, '原圖人數被壓到 <= 50（實際 ' + P.BR.N + '）');
let e2 = countEnemies();
ok(e2.boss === 2, '原圖 2 隻 BOSS（實際 ' + e2.boss + '）');
ok(e2.foe === 14, '原圖 14 隻小怪（實際 ' + e2.foe + '）');
small.brNuke = null; small.brNukes = []; small.brNukeCd = 0;
P.brNukeLaunch();
ok((small.brNukes || []).length === 1, '原圖第一波 1 顆核彈（實際 ' + (small.brNukes || []).length + '）');
ok(P.BR.Z0 === P.BR.Z0S, '原圖用原本的首圈半徑（' + P.BR.Z0 + '，原始 ' + P.BR.Z0S + '）');
bootBR(100, 1);
ok(P.BR.Z0 === 40, '大地圖首圈半徑 40（' + P.BR.Z0 + '）');

/* ---------- ⑤ BOSS 熱血曲 ---------- */
head('⑤ BOSS 專屬熱血曲＋重低音');
const A = P.AudioSys;
ok(!!A.WAR_DEFS.bossWar, 'WAR_DEFS 有 bossWar');
ok(A.WAR_DEFS.bossWar.bpm === 158, 'BPM 158（實際 ' + (A.WAR_DEFS.bossWar && A.WAR_DEFS.bossWar.bpm) + '）');
ok(!!A.WAR_DEFS.bossWar.sub && A.WAR_DEFS.bossWar.sub.length >= 8, '有獨立的 sub 低音序列');
const song = A.compileWar('bossWar');
ok(!!song && song.tracks && song.tracks.length === 6, '編出 6 軌（實際 ' + (song && song.tracks && song.tracks.length) + '）');
const subTrack = (song.tracks || []).filter(function (t) { return t.lp && t.lp <= 220; })[0];
ok(!!subTrack, '低通 200Hz 的重低音軌擺在最底層');
ok(subTrack === song.tracks[0], '重低音是第 0 軌（先鋪底再疊旋律）');
ok((song.drums || []).length > 0, '鼓軌有東西（' + (song.drums || []).length + ' 步）');
P.startSolo(5, false);
ok(P.stageBGM() === 'bossWar', 'BOSS 決戰場播 bossWar（實際 ' + P.stageBGM() + '）');
P.startSolo(4, false);
ok(P.stageBGM() === 'stage1', '第 4 關（第一章普通關）還是主題曲（實際 ' + P.stageBGM() + '）');

/* ---------- ⑥ 縮放效能分級（v5.37 曾做、已依使用者要求移除） ---------- */
head('⑥ 縮放效能分級已整組移除（照舊功能）');
ok(typeof P.RQ === 'undefined' && typeof P.rqUpdate === 'undefined' && typeof P.rqLv === 'undefined',
  'RQ／rqUpdate／rqLv 都不再匯出');
ok(!/\brqLv\(/.test(src) && !/\brqUpdate\(/.test(src), '主檔裡沒有任何 rqLv／rqUpdate 呼叫');
ok(/function qualPart\(\) \{ return QUAL_PART\[qualLevel\(\)\]; \}/.test(src), 'qualPart 回到「只看畫質設定」的原始寫法');
ok(/^  drawAmbient\(T, 0\);\n  drawAmbient2\(T, 0\);$/m.test(src), '環境光無條件兩層都畫（不再看縮放）');
G.zoom = 0.5; const q0 = P.QUAL_PART[P.qualLevel()];
ok(Math.abs(P.qualPart() - q0) < 1e-6, '粒子量不受縮放影響（' + P.qualPart() + ' / ' + q0 + '）');

/* ---------- ⑦ 線上配對／區網 ---------- */
head('⑦ 線上配對補齊＋區網連線');
const raw = rawHtml;
ok(raw.indexOf('伺服器放在免費託管平台 Render') >= 0, '有「伺服器放在 Render」的小提醒');
ok(raw.indexOf('id="netRenderNote"') >= 0, '小提醒有獨立的 DOM 節點（好換語言）');
ok(raw.indexOf('id="lanBox"') >= 0 && raw.indexOf('id="btnP2PHost"') >= 0 && raw.indexOf('id="btnP2PJoin"') >= 0,
  '區網連線區塊＋兩種直連按鈕');
['netChPv', 'netChPrev', 'netChNext', 'netChName'].forEach(function (id) {
  ok(raw.indexOf('id="' + id + '"') >= 0, '只選自己的角色：' + id);
});
['netSize', 'netWins', 'netTime', 'netHaz', 'netSd', 'netRev', 'netAi'].forEach(function (id) {
  ok(raw.indexOf('id="' + id + '"') >= 0, '本機對戰設定搬過來：' + id);
});
ok(typeof P.Net.curOpts === 'function', 'Net.curOpts() 存在');
const o = P.Net.curOpts();
ok(o && ['size', 'wins', 'time', 'hazards', 'sd', 'revenge', 'ai'].every(function (k) { return k in o; }),
  '房主設定 7 個欄位都送得出去');
ok(typeof P.Net.setOpt === 'function' && typeof P.Net.renderOpts === 'function', 'Net.setOpt／renderOpts 存在');
ok(!!P.P2P && typeof P.P2P.startHost === 'function' && typeof P.P2P.startGuest === 'function',
  'WebRTC 直連模組（P2P）存在');
const code = P.P2P.b64({ t: 'hello 中文', n: 3 });
const back = P.P2P.unb64(code);
ok(back && back.t === 'hello 中文' && back.n === 3, '邀請碼 base64 往返正常（中文也可以）');
ok(/api\/lan/.test(fs.readFileSync(path.join(__dirname, '..', '..', 'server.js'), 'utf8')),
  'server.js 有 /api/lan（列出區網位址）');
ok(/if \(P2P && P2P\.on\) \{ P2P\.api\(path, body, cb\); return; \}/.test(src),
  'Net.api 被直連攔截（整組 relay 邏輯沿用）');

/* ---------- ⑨ 三種縮放都真的畫得出來 ---------- */
head('⑨ 縮到 42%／原始／放大 300% 各自渲染一次不報錯');
['0.42', '1', '3'].forEach(function (zs) {
  ['battle', 'br', 'boss'].forEach(function (mode) {
    const e2 = makeEnv(); const P2 = e2.BH, G2 = e2.G;
    e2.getId('body').classList.add('touch');
    const cv = e2.getId('cv'); cv.clientWidth = 390; cv.clientHeight = 775;
    P2.settings.ctrl = 'touch';
    if (mode === 'battle') P2.startBattle(2);
    else if (mode === 'br') { P2.BR.opt.map = 1; P2.startBR(); G2.state = 'play'; }
    else P2.startSolo(5, false);
    G2.zoom = parseFloat(zs); G2.zoomTarget = parseFloat(zs);
    let drew = false, err = '';
    try { P2.render(); drew = true; } catch (e) { err = e.message; }
    ok(drew, mode + ' × zoom ' + zs + ' 畫得出來' + (err ? ' → ' + err : ''));
  });
});

/* ---------- ⑧ 版本 ---------- */
head('⑧ 版本戳記');
const rawMain = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
// 版本斷言刻意不寫死：只要求「不比 5.37 舊」＋「畫面上顯示的就是 P.VERSION」
ok(parseFloat(P.VERSION) >= 5.37, 'VERSION ≥ 5.37（實際 ' + P.VERSION + '）');
ok(rawMain.indexOf('id="verTxt">' + P.VERSION + '<') >= 0, '#verTxt 顯示 ' + P.VERSION);
ok(rawMain.indexOf('id="verLogVer">' + P.VERSION + '<') >= 0, '#verLogVer 顯示 ' + P.VERSION);
ok(P.VERSION_LOG[0].v === P.VERSION && P.VERSION_LOG[0].now === true, 'VERSION_LOG 首位＝' + P.VERSION + ' 且 now:true');
ok(P.VERSION_LOG[1].now === false, '上一版 ' + P.VERSION_LOG[1].v + ' 已是 now:false');
// 別抓 VERSION_LOG[0]（那是「現在最新版」，每次升版都會變）→ 找 5.37 自己那一筆
const v537 = P.VERSION_LOG.filter(function (x) { return x.v === '5.37'; })[0];
ok(!!v537 && v537.items.length >= 8, '5.37 至少 8 條（實際 ' + (v537 ? v537.items.length : 0) + '）');
ok(!/後台|開發者/.test(P.VERSION_LOG[0].items.join('')), '更新內容不出現「後台／開發者」');
const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
const swv = (sw.match(/var SW_VERSION = 'v([\d.]+)'/) || [])[1] || '0';
const sv = swv.split('.').map(Number);
ok(sv[0] > 5 || (sv[0] === 5 && sv[1] >= 37), 'sw.js 是 v5.37.x（目前 ' + swv + '）');
ok(rawMain.length <= 1950000, '主檔 ' + rawMain.length + ' 字元（預算 1,950,000）');
ok(rawMain.indexOf('\r') === -1, '整檔 LF（CR 0）');

console.log('\n' + (fail === 0 ? '✅' : '❌') + ' v5.37：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
