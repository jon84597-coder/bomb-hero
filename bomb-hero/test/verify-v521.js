// 無頭測試 v521：打擊感（傷害跳字／白閃／頓幀）＋ 接縫 AO ＋ 螢幕空間暗角 ＋ 成就系列總覽
const fs = require('fs');
const path = require('path');
const { makeEnv, rawHtml } = require('./_sandbox');

const env = makeEnv();
const P = env.BH;
const rec = env.rec;
const html = rawHtml;

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}
function head(t2) { console.log('\n=== ' + t2 + ' ==='); }

/* ================================================================ ⓪ */
head('⓪ 版本');
const VN = P.VERSION.split('.').map(Number);
ok(VN[0] === 5 && VN[1] >= 21, '版本是 5.21 以上（' + P.VERSION + '）');
ok(html.indexOf('id="verTxt">' + P.VERSION) > 0, '首頁徽章與 VERSION 同步');
ok(html.indexOf('id="verLogVer">' + P.VERSION) > 0, '版本紀錄標題與 VERSION 同步');
// v5.22：版本斷言一律用「不低於」，升版不會再無故紅一支
ok(P.VERSION_LOG[0].now === true, '版本紀錄最上面是 now:true');
const v521 = P.VERSION_LOG.filter(function (x) { return x.v === '5.21'; })[0];
ok(!!v521 && v521.now === false, '5.21 已經轉成舊版');
ok(v521 && v521.items.length >= 4, '5.21 至少 4 條更新（' + (v521 ? v521.items.length : 0) + ' 條）');
['../sw.js', '../../public/sw.js', '../../bomberman-online/public/sw.js'].forEach(function (rel) {
  const f = path.join(__dirname, rel);
  const v = (/SW_VERSION = '([^']+)'/.exec(fs.readFileSync(f, 'utf8')) || [])[1] || '';
  ok(Number(v.replace(/^v/, '').split('.')[1]) >= 21, rel + ' SW_VERSION = ' + v);
});
{
  const pk = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8'));
  ok(Number(pk.version.split('.')[1]) >= 21, 'package.json = ' + pk.version);
}
ok(html.length < 1840000, '主檔 ' + html.length + ' 字元（預算 1,840,000）');
ok((html.match(/\r/g) || []).length === 0, '整檔 LF（0 個 \\r）');

/* ================================================================ ① */
head('① 傷害跳字');
ok(typeof P.dmgPop === 'function', 'dmgPop 存在');
ok(typeof P.foeHitFx === 'function', 'foeHitFx 存在');
{
  P.Game.state = 'play';
  P.Game.pops = [];
  P.dmgPop(100, 100, 2);
  const d = P.Game.pops[0];
  ok(P.Game.pops.length === 1, '打一次跳一個數字');
  ok(d && d.txt === '2', '文字就是傷害值（' + (d && d.txt) + '）');
  ok(d && d.color === '#ffffff', '普通傷害是白色');
  ok(d && d.life > 0 && d.life < 1, '一般傷害活得比 1 秒短（' + (d && d.life) + '）');
}
{
  P.Game.pops = [];
  P.dmgPop(100, 100, 1, { kill: true });
  const d = P.Game.pops[0];
  ok(d && d.color === '#ffd166', '擊殺是金色');
  ok(d && d.txt.indexOf('💥') === 0, '擊殺前面帶爆擊符號（' + (d && d.txt) + '）');
  ok(d && d.life > 0.6, '擊殺的字停留久一點（' + (d && d.life) + '）');
}
{
  P.Game.pops = [];
  P.dmgPop(100, 100, 1, { crit: true });
  const d = P.Game.pops[0];
  ok(d && d.size > 1.2, '爆擊字更大（' + (d && d.size) + '）');
  ok(d && d.color === '#ffb020', '爆擊是橘金色');
}
{
  const e = { x: 200, y: 200, hp: 5, r: 20, type: 'slime' };
  P.Game.pops = [];
  P.Game.stopT = 0;
  P.foeHitFx(e, 3);
  ok(e.flashT === 0.13, '受擊給 0.13 秒白閃（' + e.flashT + '）');
  ok(P.Game.stopT > 0, '受擊會頓幀（' + P.Game.stopT.toFixed(3) + ' 秒）');
  ok(P.Game.pops.length === 1 && P.Game.pops[0].crit === true, '傷害 ≥3 算爆擊');
  const dmgTxt = P.Game.pops[0].txt;
  ok(dmgTxt === '3', '數字等於實際傷害（' + dmgTxt + '）');
}
{
  const dead = { x: 200, y: 200, hp: 0, r: 20, type: 'slime' };
  P.Game.pops = [];
  P.Game.stopT = 0;
  P.foeHitFx(dead, 2);
  ok(P.Game.pops[0].kill === true, '打死的數字走擊殺樣式');
  ok(P.Game.stopT >= 0.05, '擊殺的頓幀比普通命中久（' + P.Game.stopT.toFixed(3) + '）');
}
{
  P.Game.pops = [];
  for (let i = 0; i < 40; i++) P.dmgPop(100, 100, 1);
  ok(P.Game.pops.length <= 14, '同時最多 14 顆字（' + P.Game.pops.length + '）');
}
ok((html.match(/foeHitFx\(/g) || []).length >= 5, '單人／RPG／大逃殺／魔王關都有接（' + (html.match(/foeHitFx\(/g) || []).length + ' 處）');
ok(/try \{ dmgPop\(e\.x, e\.y - \(enemyArtR\(e\) \|\| 20\)/.test(html), '隨從打怪也會跳字');
ok(/const dm1 = flameHitDamage\(e\)/.test(html) && /const dm2 = flameHitDamage\(e\)/.test(html), '火焰傷害先算出實際值再顯示');
ok(/const kick = d\.crit \? \.22/.test(html), '爆擊有「彈一下」的放大曲線');
ok(/const dxp = \(d\.drift \|\| 0\)/.test(html), '數字會往兩側散開（連續命中不疊字）');
ok(/d\.kill \? 'rgba\(255,196,80/.test(html), '擊殺字後面鋪一層金光');

/* ================================================================ ② */
head('② 頓幀（hitstop）');
ok(typeof P.hitStop === 'function', 'hitStop 存在');
{
  P.Game.state = 'play';
  P.Game.stopT = 0;
  P.hitStop(.03);
  const one = P.Game.stopT;
  for (let i = 0; i < 10; i++) P.hitStop(.03);
  ok(one > 0 && one <= .031, '一次命中約 0.03 秒（' + one.toFixed(3) + '）');
  ok(P.Game.stopT === .10, '連續命中上限 0.10 秒（' + P.Game.stopT.toFixed(3) + '）');
}
{
  P.Game.state = 'idle';
  P.Game.stopT = 0;
  P.hitStop(.05);
  ok(P.Game.stopT === 0, '不在戰鬥中不會頓幀');
  P.Game.state = 'play';
}
ok(/Game\.stopT = Math\.min\(\.10,/.test(html), '上限寫在常數裡（不是散落的魔術數字）');
ok(/let gdt = dt;\n  if \(Game\.stopT > 0\)/.test(html), '主迴圈把 dt 換成 gdt');
ok(/gdt = dt \* \.08;/.test(html), '頓幀時遊戲時間只剩 8%');
ok(/updateSolo\(gdt\)/.test(html) && /updateBR\(gdt\)/.test(html) && /updateBattle\(gdt\)/.test(html), '三種模式都吃 gdt');
ok(/updatePops\(dt\)/.test(html), '飄字照常跑（不被凍住）');
ok(/updateCamera\(dt\)/.test(html), '鏡頭照常跑（不被凍住）');

/* ================================================================ ③ */
head('③ 受擊白閃');
ok(/const flash = \(e\.flashT > 0\) \|\| \(e\.hitT > \.42\);/.test(html), '白閃主要看 flashT');
ok(/if \(e\.flashT > 0\) e\.flashT = Math\.max\(0, e\.flashT - dt\);/.test(html), 'updateEnemy 會衰減 flashT');
ok(!/const flash = e\.hitT > 0;/.test(html), '不再用 0.55 秒的無敵時間當白閃');
ok(/e\.flashT = \.13;/.test(html), '白閃固定 0.13 秒');

/* ================================================================ ④ */
head('④ 地板接縫 AO');
ok(typeof P.drawFloorAO === 'function', 'drawFloorAO 存在');
ok(/try \{ drawFloorAO\(cx \* FLR_N, cy \* FLR_N, w, h, T\); \}/.test(html), '烘焙地板時一起畫（執行期零成本）');
// v5.22：接縫 AO 升級成「寬帶＋貼邊帶＋轉角」，改驗 floorAOBands 的語意（不再數字數）
ok(typeof P.floorAOBands === 'function' && typeof P.aoSolid === 'function', 'floorAOBands／aoSolid 存在');
{
  const G = P.Game;
  const old = { T: G.T, cols: G.cols, rows: G.rows, grid: G.grid };
  G.T = 40; G.cols = 3; G.rows = 3;
  const dirs = function (ops) {
    const o = { u: 0, d: 0, l: 0, r: 0, c: 0 };
    ops.forEach(function (b) { o[b.k === 'c' ? 'c' : b.d]++; });
    return o;
  };
  // 全空地 → 一條陰影都不該有
  G.grid = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  ok(P.floorAOBands(1, 1, 40).length === 0, '全空的地板不畫陰影');
  // 四面圍牆的中心格 → 四個方向都有，且每向都是「寬帶＋貼邊帶」兩層
  G.grid = [[1, 1, 1], [1, 0, 1], [1, 1, 1]];
  const boxed = dirs(P.floorAOBands(1, 1, 40));
  ok(boxed.u === 2 && boxed.d === 2 && boxed.l === 2 && boxed.r === 2,
    '四面貼牆：每向 2 層（寬帶＋貼邊帶）');
  ok(boxed.c === 0, '四面都有帶時不再補轉角（本來就沒有亮縫，' + boxed.c + ' 個）');
  // 只有斜角貼著牆（兩條正交邊是空的）→ 才補轉角
  G.grid = [[1, 0, 0], [0, 0, 0], [0, 0, 0]];
  ok(P.floorAOBands(1, 1, 40).filter(function (o) { return o.k === 'c'; }).length === 1, '只有斜角貼牆時補一塊轉角');
  // 牆格自己不壓陰影
  ok(P.floorAOBands(0, 0, 40).length === 0, '牆格自己身上不畫陰影');
  const mixed = dirs(P.floorAOBands(1, 0, 40));
  ok(mixed.d === 0 && mixed.r === 0, '空地的空鄰邊不長陰影');
  // 邊界外不算牆：地圖角落的空地不會因為「外面」而長出陰影
  ok(P.floorAOBands(0, 0, 40).length === 0 && P.floorAOBands(2, 2, 40).length === 0,
    '地圖邊界外不當成牆（大逃殺海島不會有一圈假暗邊）');
  // 軟磚也一樣算實心（使用者要求：軟牆區塊也要有陰影）
  G.grid = [[2, 0, 0], [0, 0, 0], [0, 0, 0]];
  const soft = dirs(P.floorAOBands(1, 0, 40));
  ok(soft.l === 2, '軟磚（grid 2）與石牆一樣會投影（左側 2 層）');
  G.T = old.T; G.cols = old.cols; G.rows = old.rows; G.grid = old.grid;
}

/* ================================================================ ⑤ */
head('⑤ 螢幕空間暗角');
ok(typeof P.vignetteCanvas === 'function' && typeof P.drawVignette === 'function', 'vignetteCanvas／drawVignette 存在');
{
  const a = P.vignetteCanvas(), b = P.vignetteCanvas();
  ok(!!a && a === b, '同一尺寸只做一次（離屏快取）');
}
ok(/try \{ ctx\.drawImage\(cv, 0, 0, VIEW_W, VIEW_H\); \}/.test(html), '每幀只是一次 drawImage');
ok(!/createRadialGradient\(fw \/ 2, fh \/ 2/.test(html), '舊的「整張地圖大漸層」已移除');
ok(/Game\.cols \* T, fh = Game\.rows \* T/.test(html), 'fw／fh 還留著（落石白閃等地方要用）');
ok(/try \{ drawVignette\(\); \} catch \(e\) \{\}/.test(html), 'render 有呼叫（包在 try 裡）');
ok(/createRadialGradient\(w \/ 2, h \/ 2, Math\.min\(w, h\) \* \.30/.test(html), '暗角以畫面中心往外擴散');
ok(/createLinearGradient\(0, 0, 0, h \* \.34\)/.test(html), '上緣暖光還在（立體感）');
ok(/_vigKey === key/.test(html), '尺寸一變就重做（旋轉手機不會糊掉）');

/* ================================================================ ⑥ */
head('⑥ 成就系列進度總覽');
ok(/function gridHTML\(list\)/.test(html), 'gridHTML 存在');
{
  P.AchUI.open();
  const body = env.getId('achBody');
  const s = String(body.innerHTML || '');
  const tiles = (s.match(/class="achtile/g) || []).length;
  ok(tiles === P.Ach.SERIES.length, '每個系列一格（' + tiles + ' / ' + P.Ach.SERIES.length + '）');
  ok(s.indexOf('class="achgrid"') > 0, '有總覽格容器');
  ok((s.match(/class="achmin"/g) || []).length === tiles, '每格都有進度條');
  ok((s.match(/class="achtn"/g) || []).length === tiles, '每格都有 n/N 階');
  ok(s.indexOf('data-achse="') > 0, '每格都帶系列 key（可以點）');
  ok(/achpips/.test(s), '系列列上有階級點');
  const first = P.Ach.SERIES[0];
  const p = P.Ach.progress(first);
  const pipCount = ((s.split('data-sec="' + first.key + '"')[1] || '').split('</div></div></div>')[0].match(/<i class="(?:on)?"><\/i>/g) || []).length;
  ok(pipCount === p.max, '階級點數量＝該系列階數（' + pipCount + ' / ' + p.max + '）');
}
ok(/const seb = e\.target\.closest\('\[data-achse\]'\)/.test(html), '點格子的處理器有接');
ok(/S\.openS = \(S\.openS === k\) \? '' : k;/.test(html), '點同一格會收起來（切換）');
ok(/bx\.querySelector\('\[data-sec="/.test(html), '展開後會捲到那一列');
ok(/\.achgrid \{ display: grid; grid-template-columns: repeat\(4/.test(html), '桌機四欄');
ok(/@media \(max-width: 460px\) \{ \.achgrid \{ grid-template-columns: repeat\(3/.test(html), '手機三欄');
{
  const i18n = P.I18N || {};
  const langs = ['zh-TW', 'zh-CN', 'en', 'ja', 'ko'];
  let miss = 0;
  langs.forEach(function (L) {
    const d = i18n[L] || {};
    if (!d['ach.seriesProg'] || !d['ach.seriesFull']) miss++;
  });
  ok(miss === 0, '新文案五種語言都齊（缺 ' + miss + ' 種）');
  ok(!!(i18n.en && i18n.en['ach.seriesProg'] === 'Series progress'), '英文譯文正確');
}

console.log('\n' + (fail ? '✗' : '✅') + ' v5.21：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
