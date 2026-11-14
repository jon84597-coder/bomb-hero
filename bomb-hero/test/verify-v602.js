// test/verify-v602.js —— v6.00：手把逐槽按鍵／撞牆側滑／受傷動作／朝向／隨從大招／坐騎教學
//   ① 版本 6.00 的七處戳記（主檔／首頁兩處／VERSION_LOG／package.json／四份 sw.js）
//   ② 手把按鍵可以 1P～4P 分開設定（預設 A／B／X／Y、撞鍵互換、壞值落回預設）
//   ③ 撞牆會順著牆滑向缺口（兩級輔助），但沒有缺口時不會亂搬
//   ④ 受傷／失敗動作真的會一格一格播（不再被 Game.gameT 卡在最後一張）
//   ⑤ 面朝哪就往哪走（每隻角色記住自己原圖的朝向）
//   ⑥ 隨從大招：四種特效在、四支音效在、drawPet 真的會畫
//   ⑦ 商店預覽會跑「待機→走→攻擊→格檔」的循環
//   ⑧ 坐騎蛋第 4 關才出現，第一次出現會跳教學
//   ⑨ 效能：自動降載與全屏漸層早退
//   ⑩ 三個老問題：推車名單一層／手持炸彈只畫一顆／衝刺吃得到道具與蛋
const fs = require('fs');
const path = require('path');
const { makeEnv } = require('./_sandbox');

const ROOT = path.join(__dirname, '..');
const mainSrc = fs.readFileSync(path.join(ROOT, 'js', 'main.js'), 'utf8');
const idxSrc = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const vlogSrc = fs.readFileSync(path.join(ROOT, 'js', 'version-log.js'), 'utf8');

let pass = 0, fail = 0;
function ok(c, m, x) {
  if (c) { pass++; }
  else { fail++; console.log('  ✗ FAIL: ' + m + (x === undefined ? '' : ' → ' + JSON.stringify(x))); }
}
function sec(t) { console.log('\n' + t); }

const env = makeEnv();
const P = env.BH;
const G = P.Game;

/* ---------------------------------------------------------------- ① */
sec('① 版本 ≥ 6.00');
/* v6.01：這一支是 v6.00 的驗收，不該被後續補丁版卡住 →
   改成「跟著當前版本走 + 6.00 那一筆自己要夠完整」。 */
const VN = String(P.VERSION).split('.').map(Number);
ok(VN[0] * 1000 + (VN[1] || 0) >= 6000, 'VERSION ≥ 6.00（目前 ' + P.VERSION + '）', P.VERSION);
ok(idxSrc.indexOf('<span id="verTxt">' + P.VERSION + '</span>') > 0, '首頁徽章同步 ' + P.VERSION);
ok(idxSrc.indexOf('<span id="verLogVer">' + P.VERSION + '</span>') > 0, '版本面板同步 ' + P.VERSION);
const vl = P.VERSION_LOG || [];
ok(vl[0] && vl[0].v === P.VERSION, 'VERSION_LOG 第一筆是當前版本（' + (vl[0] && vl[0].v) + '）');
ok(vl[0] && vl[0].now === true, '第一筆 now:true');
ok(vl[0] && vl[0].items.length >= 3, '本版至少 3 條更新（' + (vl[0] ? vl[0].items.length : 0) + ' 條）');
ok(vl[1] && vl[1].now === false, '上一版（' + (vl[1] && vl[1].v) + '）改成 now:false');
const e600 = vl.filter(function (x) { return x.v === '6.00'; })[0];
ok(e600 && e600.items.length >= 10, '6.00 那一筆至少 10 條更新（' + (e600 ? e600.items.length : 0) + ' 條）');
ok(!/後台|開發者/.test(vl[0] ? vl[0].items.join('') : ''), 'VERSION_LOG 沒有「後台／開發者」字樣');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, '..', 'package.json'), 'utf8'));
ok(/^6\.\d+\.\d+$/.test(pkg.version), 'package.json = 6.x.x（' + pkg.version + '）');
['sw.js', '../public/sw.js', '../bomberman-online/public/sw.js', '../dist/site/sw.js'].forEach(function (rel) {
  const f = path.join(ROOT, rel);
  const w = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
  ok(/SW_VERSION = 'v6\.\d+\.\d+'/.test(w), rel + ' 的 SW_VERSION = v6.x.x');
});

/* ---------------------------------------------------------------- ② */
sec('② 手把按鍵逐槽設定');
ok(P.PAD_ACTS.join(',') === 'act,det,dash,fire', '四個動作：放彈／引爆／衝刺／坐騎招式');
ok(P.PAD_DEF.act === 0 && P.PAD_DEF.det === 1 && P.PAD_DEF.dash === 2 && P.PAD_DEF.fire === 3,
  '預設 A 放彈／B 引爆／X 衝刺／Y 坐騎招式');
const d0 = P.padMapOf(0);
ok(d0.act === 0 && d0.det === 1 && d0.dash === 2 && d0.fire === 3, '預設值就是這一組', d0);
const nm = P.normalizePadBtn(null);
ok(nm.length === 4 && nm.every(function (m) { return m.act === 0 && m.fire === 3; }),
  'normalizePadBtn(null) → 四槽都是預設');
ok(P.normalizePadBtn([{ act: 99, det: -3, dash: 77, fire: null }])[0].act === 0,
  '壞值（超出 0~15）落回預設');
ok(P.normalizePadBtn([{ act: 5, det: 5, dash: 5, fire: 5 }])[0].det === 1,
  '同一槽撞鍵 → 後面那個退回預設（不會一個鍵做兩件事）');
// 逐槽獨立
P.padSetBtn(1, 'dash', 5);
ok(P.padMapOf(1).dash === 5, '2P 的衝刺改到 RB（5）', P.padMapOf(1).dash);
ok(P.padMapOf(0).dash === 2, '1P 完全沒被動到', P.padMapOf(0).dash);
ok(P.padMapOf(2).dash === 2 && P.padMapOf(3).dash === 2, '3P／4P 也是各自一組');
// 撞鍵互換
P.padSetBtn(0, 'fire', 0);
ok(P.padMapOf(0).fire === 0 && P.padMapOf(0).act === 3, '1P 把坐騎招式改到 A → 放彈換到 Y（互換）', P.padMapOf(0));
ok(P.padSetBtn(0, 'act', 99) === null, '超出範圍的按鈕索引 → 不生效');
ok(/PAD_ACT_LABEL/.test(mainSrc) && /function padSetBtn/.test(mainSrc), 'UI 與程式共用同一份對應表');
ok(/id="padMap"/.test(idxSrc) && /id="padTabs"/.test(idxSrc), '設定頁有 1P～4P 的分頁與四格按鈕');
ok(/window\.__padCapture/.test(mainSrc), '抓鍵期間會擋住手把選單（不然一按 A 就把按鈕點掉）');
P.settings.padBtn = null;

/* ---------------------------------------------------------------- ③ */
sec('③ 撞牆沿著牆滑向缺口');
ok(/function slideAssist\(/.test(mainSrc), '一級：貼牆側移');
ok(/function laneSlide\(/.test(mainSrc), '二級：沿牆滑到缺口');
ok((mainSrc.match(/slideAssist\(p, st, 0, sp, skipBomb\) \|\| laneSlide\(p, st, 0, sp, skipBomb\)/g) || []).length === 1,
  '往右／左撞牆時接上二級');
ok((mainSrc.match(/slideAssist\(p, 0, st, sp, skipBomb\) \|\| laneSlide\(p, 0, st, sp, skipBomb\)/g) || []).length === 1,
  '往上／下撞牆時接上二級');
{
  // 實測：正前方是牆、上一格是缺口 → 會滑上去再鑽過去
  const T = 40;
  G.cols = 15; G.rows = 13; G.T = T; G.grid = [];
  for (let y = 0; y < 13; y++) { const r = []; for (let x = 0; x < 15; x++) r.push(0); G.grid.push(r); }
  for (let x = 0; x < 15; x++) { G.grid[0][x] = 1; G.grid[12][x] = 1; }
  for (let y = 0; y < 13; y++) { G.grid[y][0] = 1; G.grid[y][14] = 1; }
  G.grid[8][7] = 1; G.grid[7][7] = 0; G.grid[9][7] = 1;
  G.bombs = []; G.flames = []; G.items = []; G.foes = []; G.pets = []; G.eggs = [];
  G.mode = 'solo'; G.state = 'play'; G.spdK = 1; G.bossArena = null; G.sdActive = false;
  const p = { x: 6.5 * T, y: 8.9 * T, alive: true, r: 12, facing: 'right', invuln: 9999,
    maxBombs: 1, power: 1, speed: 1, speedLv: 0, moving: false, walkT: 0, air: 0,
    dashT: 0, dashCd: 0, dizzy: 0, lobCd: 0, carry: null, buffs: {}, beltMul: 1, team: -1 };
  G.players = [p];
  for (let i = 0; i < 150; i++) P.freeMove(p, 1, 0, 1 / 60);
  ok(Math.floor(p.x / T) === 13, '貼著牆滑進缺口後一路走過去（x=' + (p.x / T).toFixed(2) + '）');
  ok(Math.floor(p.y / T) === 7, '而且是從上面那一格（唯一的缺口）鑽過去的（y=' + (p.y / T).toFixed(2) + '）');
}

/* ---------------------------------------------------------------- ④ */
sec('④ 受傷／失敗動作會動');
ok(/function actTime\(key, act, a\)/.test(mainSrc), 'HeroAnim 有自己的動作計時器');
ok(/else t = actTime\(key, act, a\);/.test(mainSrc), '非循環動作不吃 Game.gameT');
ok(/actSt\[key\]/.test(mainSrc) && /delete actSt\[key\]/.test(mainSrc), '釋放角色時計時器一起回收');
{
  const img = { naturalWidth: 100, naturalHeight: 100, width: 100, height: 100 };
  P.HeroAnim.inject('hurt', img);
  const ctx = { drawImage: function () {}, save: function () {}, restore: function () {},
    translate: function () {}, scale: function () {} };
  // 關鍵：開局已經過了 100 秒，第一次畫到 hurt 仍然要從第 0 格開始
  const f0 = P.HeroAnim.draw(ctx, 'rabbit', 100, 200, 80, { expr: 'cry', idle: 100, facing: 'down' });
  const f1 = P.HeroAnim.draw(ctx, 'rabbit', 100, 200, 80, { expr: 'cry', idle: 100.45, facing: 'down' });
  const f2 = P.HeroAnim.draw(ctx, 'rabbit', 100, 200, 80, { expr: 'cry', idle: 100.9, facing: 'down' });
  ok(f0 && f0.act === 'hurt' && f0.frame === 0, '第一次畫到受傷從第 0 格開始（舊版這裡是第 11 格）', f0 && f0.frame);
  ok(f1 && f1.frame > f0.frame, '0.45 秒後換格了（' + (f0 && f0.frame) + ' → ' + (f1 && f1.frame) + '）');
  ok(f2 && f2.frame > f1.frame, '0.9 秒後再換（' + (f1 && f1.frame) + ' → ' + (f2 && f2.frame) + '）');
}

/* ---------------------------------------------------------------- ⑤ */
sec('⑤ 面朝哪就往哪走');
const DIRS_OK = { rabbit: 1, dog: 1, panda: 1, bear: -1, cat: -1, pig: -1, frog: -1, chick: -1 };
Object.keys(DIRS_OK).forEach(function (k) {
  const re = new RegExp(k + ":\\s*\\{ pre: '" + k + "',[^}]*dir: (-?\\d)");
  const m = mainSrc.match(re);
  ok(!!m && Number(m[1]) === DIRS_OK[k], k + ' 的原圖朝向 dir = ' + DIRS_OK[k], m ? m[1] : null);
});
ok(/const side = flipOf\(key, fx\.x\);/.test(mainSrc) && /return \(dirX < 0 \? -1 : 1\) \* \(sh\.dir \|\| 1\);/.test(mainSrc),
  '畫圖時乘上原圖朝向（flipOf = 方向 × 原圖朝向）');
{
  // 實測翻面：兔子（原圖朝右）往左走要翻；小熊（原圖朝左）往左走不翻
  P.HeroAnim.inject('walk', { naturalWidth: 100, naturalHeight: 100, width: 100, height: 100 });
  function flips(key, facing) {
    let flipped = false;
    const ctx = { drawImage: function () {}, save: function () {}, restore: function () {},
      translate: function () {}, scale: function (a) { if (a < 0) flipped = true; } };
    P.HeroAnim.draw(ctx, key, 100, 200, 80, { moving: true, walk: 1, facing: facing });
    return flipped;
  }
  ok(flips('rabbit', 'left') === true, '兔子往左走 → 翻面（臉朝左）');
  ok(flips('rabbit', 'right') === false, '兔子往右走 → 不翻面');
  ok(flips('rabbit', 'up') === false, '往上下走不翻面');
  // 其餘七隻沒有圖可以注入 → 直接驗翻面公式
  const fo = P.HeroAnim.flipOf;
  ok(fo('bear', -1) === 1 && fo('bear', 1) === -1, '小熊：往左不翻、往右翻（原圖朝左）');
  ok(fo('panda', -1) === -1 && fo('panda', 1) === 1, '熊貓：往左翻、往右不翻（原圖朝右）');
  ok(['cat', 'pig', 'frog', 'chick'].every(function (k) { return fo(k, -1) === 1; }),
    '貓／豬／青蛙／小雞往左都不翻');
  ok(['rabbit', 'dog', 'panda'].every(function (k) { return fo(k, -1) === -1; }),
    '兔／柴犬／熊貓往左都翻');
}

/* ---------------------------------------------------------------- ⑥ */
sec('⑥ 隨從大招特效與音效');
ok(/function petFxStart\(/.test(mainSrc) && /function drawPetFx\(/.test(mainSrc), '特效啟動與繪製都在');
ok(/function petShieldArt\(/.test(mainSrc), '盾牌是畫出來的（不是貼圖）');
ok(/\{ slash: 'petSlash', throw: 'petThrow', block: 'petBlock', bash: 'petBash' \}/.test(mainSrc),
  '四種招式各自對到一支音效');
['petSlash', 'petThrow', 'petBlock', 'petBash'].forEach(function (nm2) {
  ok(new RegExp("case '" + nm2 + "':").test(mainSrc), '音效表有 ' + nm2);
});
ok(/if \(pt\.fxT > 0\) drawPetFx\(pt, x, y, T\);/.test(mainSrc), 'drawPet 真的會畫大招特效');
ok(/petFxStart\(pt, 'slash', \.46\)/.test(mainSrc), '武士狼攻擊 → 特大斬擊');
ok(/petFxStart\(pt, 'throw', \.44\)/.test(mainSrc), '爆彈猴丟彈 → 火球＋煙＋震波');
ok(/petFxStart\(pt, 'bash', \.50\)/.test(mainSrc), '盾犀盾撞 → 大盾＋白閃');
ok(/gd > T \* \.30/.test(mainSrc), '盾撞有距離下限（貼在身上時只擋不打）');

/* ---------------------------------------------------------------- ⑦ */
sec('⑦ 商店預覽會演整套動作');
ok(/cyc >= 2\.0 && cyc < 3\.0/.test(mainSrc) && /act = 'move'/.test(mainSrc), '預覽會走兩步');
ok(/cyc >= 3\.0 && cyc < 3\.6/.test(mainSrc) && /act = 'attack'/.test(mainSrc), '預覽會攻擊');
ok(/cyc >= 3\.6 && cyc < 4\.2/.test(mainSrc) && /act = 'hurt'/.test(mainSrc), '預覽會被打／格檔');
ok(/PetAnim\.draw\(g, kd, cx, footY, bodyH, facing,/.test(mainSrc), '用的是同一支影片圖集（不是另一套靜態圖）');

/* ---------------------------------------------------------------- ⑧ */
sec('⑧ 坐騎蛋第 4 關才出現');
ok(/spawnEggs\(mountEggOK\(stage\) \?/.test(mainSrc), '生蛋數量受 mountEggOK 控制');
ok(/return \(stage \| 0\) >= 4;/.test(mainSrc), '前 3 關沒有蛋（stage >= 4 才有）');
ok(/const MOUNT_TUT_KEY = 'bombhero-mount-tut-v1'/.test(mainSrc), '教學看過就記住（localStorage）');
ok(/tips: mountTut \? mountTips\(\) :/.test(mainSrc), '第 4 關第一次會蓋掉開場說明');
ok(/mountTutMark\(\)/.test(mainSrc), '關掉教學卡就標記看過');
ok(/function mountTips\(\) \{/.test(mainSrc), '教學內容是延遲產生的（切語言後才對）');
{
  const m = mainSrc.match(/function mountTips\(\) \{[\s\S]*?\n\}/);
  const n2 = m ? (m[0].match(/mtxt\(/g) || []).length : 0;
  ok(n2 >= 5, '教學至少 5 條（' + n2 + ' 條）');
}

/* ---------------------------------------------------------------- ⑨ */
sec('⑨ 效能');
ok(/function perfTick\(dt\)/.test(mainSrc), '有自動降載');
ok(/try \{ perfTick\(dt\); \}/.test(mainSrc), '主迴圈每幀量測（出錯也不會拖垮遊戲）');
ok(/if \(fxLv\(\) >= 1\) return;/.test(mainSrc), '降載時全屏漸層直接早退');
ok(/function fxPart\(\)/.test(mainSrc), '粒子倍率跟著降載');

/* ---------------------------------------------------------------- ⑩ */
sec('⑩ 三個老問題');
ok(/if \(!b\.held\) drawBomb\(b, T\);/.test(mainSrc), '手持的那顆不在批次層再畫一次（背後不會多一顆）');
ok(/if \(p\.cart\) return;/.test(mainSrc), '推車的人只由 drawCart 畫（名字不會疊好幾層）');
ok(/pickupSweep\(p, dx0, dy0, p\.x, p\.y\);/.test(mainSrc), '玩家衝刺會沿路撿');
ok(/pickupSweep\(p, ax0, ay0, p\.x, p\.y\);/.test(mainSrc), 'AI 衝刺也一樣');
ok(/function pickupCell\(/.test(mainSrc) && /takeEggAt\(p, cx, cy\)/.test(mainSrc), '撿道具與孵蛋共用一個入口');
ok(/\(p\.ai && it\.type === 'skull'\)/.test(mainSrc), 'AI 還是不吃骷髏');

console.log('\n' + (fail ? '❌ ' : '✅ ') + 'v6.00：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail === 0 ? 0 : 1);
