// 無頭測試 v23：v1.5
//   1. 手機拉不到下面 → body 不再鎖 touch-action、選單/設定走原生捲動、窄屏不溢出
//   2. 裝置自動感應（鍵盤 / 手把 / 觸控）→ InputSense + ctrlMode 即時跟隨
//   3. 石頭 vs 可炸木箱分色（8 個關卡都比得出差異）
//   4. 溜冰鞋道具改成「溜冰鞋」向量圖標
//   5. 角色頭像縮小（0.84 高、貼底 0.94）
//   6. 選角預覽放慢 + 頭手腳都會動（部位骨架）
//   7. BOSS 換成老虎國王插畫（部位骨架、含頭）
//   8. 坐騎換成小龍插畫（部位骨架、含頭）
const { makeEnv, html } = require('./_sandbox');

const env = makeEnv();
const BH = env.BH, G = BH.Game, P = BH, rec = env.rec;
const mk = () => env.mkCtx2D();
const fakeImg = env.fakeImg;

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}
function freshSolo(stage) {
  P.settings.size = 'M';
  P.settings.hazards = 'off';
  P.settings.sd = 'off';
  P.settings.ctrl = 'kb';
  P.settings.soloDiff = 'normal';
  P.settings.soloTime = 300;
  P.startSolo(stage || 1, false);
  G.state = 'play';
  G.bombs.length = 0; G.flames.length = 0;
  G.particles.length = 0; G.bubbles.length = 0;
  G.players[0].invuln = 0;
  return G.players[0];
}

// ---------- 把 drawRigChar 的每塊（save…restore 內含 drawImage）切出來 ----------
function partBlocks(calls) {
  const blocks = [];
  const stack = [];
  calls.forEach(function (c) {
    const name = c[0];
    if (name === 'save') { stack.push([]); return; }
    if (name === 'restore') {
      const b = stack.pop();
      if (b && b.some(x => x[0] === 'drawImage')) blocks.push(b);
      return;
    }
    if (stack.length) stack[stack.length - 1].push(c);
  });
  return blocks;
}
function readBlock(b) {
  const t1 = b.filter(c => c[0] === 'translate')[0];
  const rt = b.filter(c => c[0] === 'rotate')[0];
  const sc = b.filter(c => c[0] === 'scale')[0];
  const dr = b.filter(c => c[0] === 'drawImage')[0];
  return {
    tx: t1 ? t1[1] : 0, ty: t1 ? t1[2] : 0,
    ang: rt ? rt[1] : 0, sx: sc ? sc[1] : 1, sy: sc ? sc[2] : 1,
    w: dr ? dr[4] : 0, h: dr ? dr[5] : 0
  };
}
const PARTS = ['legL', 'legR', 'torso', 'armL', 'armR', 'head'];
function injectAll(key) {
  PARTS.forEach(p => BH.Parts.inject(key, p, fakeImg(100, 100)));
}
function rigRun(key, a, H, x, footY) {
  rec.calls.length = 0;
  const r = BH.drawRigChar(mk(), key, x || 200, footY || 300, H || 100, a || {});
  const calls = rec.calls.slice();
  return { r, calls, blocks: partBlocks(calls), parts: partBlocks(calls).map(readBlock) };
}
// 用「寬度比例」認出每一塊是哪個部位
function nameOfBlock(blk, key, H) {
  const M = BH.IMG_PARTS[key];
  const W = H * M.asp;
  let best = '', bestD = 1e9;
  // v4.29：新主角的頭與身軀用同一個水平裁切框（寬度一樣），只比寬度會把頭認成身體
  // → 寬度 + 高度一起比
  Object.keys(M.p).forEach(function (pn) {
    const d = M.p[pn];
    if (!d) return;
    const dd = Math.abs(blk.w - d.w * W) + Math.abs(blk.h - d.h * H);
    if (dd < bestD) { bestD = dd; best = pn; }
  });
  return bestD < 3 ? best : ('?' + best);
}

// ================================================================
console.log('=== 1. 版本與部位圖資源 ===');
ok(parseFloat(BH.VERSION) >= 1.5, '版本推進到 1.5 以上（目前 ' + BH.VERSION + '）');
ok(html.indexOf('id="verTxt">' + BH.VERSION + '<') > 0, '畫面版本文字同步 ' + BH.VERSION);

const IP = BH.IMG_PARTS;
const ipKeys = Object.keys(IP);
ok(ipKeys.length === 10, '10 組部位圖（8 動物 + BOSS + 小龍），實際 ' + ipKeys.length);
ok(['rabbit', 'bear', 'dog', 'cat', 'pig', 'panda', 'frog', 'chick', 'boss', 'dragon'].every(k => ipKeys.indexOf(k) >= 0),
  '八隻動物 + boss + dragon 都有部位圖');
// v4.29：主角改成 v3 站立版 —— 必要部位是「頭／身／左右腿」，手與尾巴選用
// （熊貓兩手在胸前交握，切手會吃掉胸口，所以那隻沒有手臂層）
const NEED = ['head', 'torso', 'legL', 'legR'];
const allPartsOk = ipKeys.every(function (k) {
  const g = IP[k];
  if (!g || !g.p) return false;
  const keys = Object.keys(g.p);
  if (!NEED.every(function (pn) { return !!g.p[pn]; })) return false;
  return keys.every(function (pn) {
    const d = g.p[pn];
    // 層框可略超出 bbox（頭含耳朵、手含肩關節 6px 重疊）→ 允許 -0.3 ~ 1.4
    return d && /^data:image\/webp;base64,/.test(d.u) && d.u.length > 200 &&
      d.x >= -.3 && d.y >= -.3 && d.w > 0 && d.h > 0 && d.w <= 1.4 && d.h <= 1.4 &&
      d.px >= -.3 && d.px <= 1.3 && d.py >= -.3 && d.py <= 1.3;
  });
});
ok(allPartsOk, '每組至少 頭／身／左右腿（手與尾巴選用）都是合法 webp data URL + 座標');
let totalBytes = 0;
ipKeys.forEach(k => Object.keys(IP[k].p).forEach(pn => { totalBytes += IP[k].p[pn].u.length; }));
ok(totalBytes > 200000 && totalBytes < 700000,
  '部位圖總量合理（' + Math.round(totalBytes / 1024) + 'KB base64，單檔仍可直接開）');
ok(ipKeys.every(k => IP[k].asp > .3 && IP[k].asp < 1.6), '每組都有原圖長寬比（asp），畫的時候不變形');

// ================================================================
console.log('=== 2. 部位骨架：頭、手、腳真的各自會動 ===');
ok(!BH.Parts.has('rabbit'), '沙盒裡部位圖沒載入 → Parts.has 為 false');
const none = rigRun('rabbit', { moving: true, walk: 1 }, 100);
ok(none.r === null && rec.calls.filter(c => c[0] === 'drawImage').length === 0,
  '沒有部位圖時回傳 null 且不畫任何東西（不會開天窗）');

injectAll('rabbit');
ok(BH.Parts.has('rabbit'), '注入後 Parts.has 為 true');
const base = rigRun('rabbit', { moving: true, walk: 1.0, facing: 'right' }, 100);
ok(base.blocks.length === 6, '一次畫 6 塊（頭／身／雙手／雙腿），實際 ' + base.blocks.length);
ok(base.r && base.r.H === 100 && base.r.W > 0, '回傳尺寸資訊（H/W）給名牌與碰撞用');

const names = base.parts.map(b => nameOfBlock(b, 'rabbit', 100));
ok(PARTS.every(pn => names.filter(n => n === pn).length === 1), '每個部位各畫一次、不重不漏：' + names.join(','));
ok(names[5] === 'head', '頭最後畫（蓋住脖子接縫）');

// 頭的上下點動
const headA = (function () { const b = rigRun('rabbit', { moving: true, walk: 0.4, facing: 'right' }, 100); return readBlock(b.blocks[5]); })();
const headB = (function () { const b = rigRun('rabbit', { moving: true, walk: 2.2, facing: 'right' }, 100); return readBlock(b.blocks[5]); })();
ok(Math.abs(headA.ty - headB.ty) > 0.05, '頭會上下點動（位移差 ' + Math.abs(headA.ty - headB.ty).toFixed(2) + 'px）');
ok(Math.abs(headA.ang - headB.ang) > 0.01, '頭會微微左右擺（角度差 ' + Math.abs(headA.ang - headB.ang).toFixed(3) + ' rad）');

// 腿交替抬起
const legHi = rigRun('rabbit', { moving: true, walk: Math.PI / 2, facing: 'right' }, 100);
const legLo = rigRun('rabbit', { moving: true, walk: -Math.PI / 2, facing: 'right' }, 100);
const ll1 = readBlock(legHi.blocks[0]), lr1 = readBlock(legHi.blocks[1]);
const ll2 = readBlock(legLo.blocks[0]), lr2 = readBlock(legLo.blocks[1]);
ok(ll1.ty < ll2.ty - 1 && lr1.ty > lr2.ty + 1, '兩條腿交替抬（一上一下，不是一起動）');
ok(Math.sign(ll1.ang) !== Math.sign(lr1.ang) || (ll1.ang === 0 && lr1.ang === 0),
  '兩條腿擺動方向相反');

// 手臂前後擺
const a1 = readBlock(legHi.blocks[3]), b1 = readBlock(legHi.blocks[4]);
ok(a1.ang * b1.ang < 0 || a1.ang !== b1.ang, '雙手一前一後擺動（' + a1.ang.toFixed(3) + ' / ' + b1.ang.toFixed(3) + '）');
ok(Math.abs(a1.ang) > 0.01, '手不是死的（擺幅 > 0.01 rad）');

// 身體擠壓
// 擠壓用 sin(2w)：要挑 sin(2w) 明顯不同的相位（π/2 與 -π/2 剛好都歸零）
const sqA = rigRun('rabbit', { moving: true, walk: Math.PI / 4, facing: 'right' }, 100);
const sqB = rigRun('rabbit', { moving: true, walk: -Math.PI / 4, facing: 'right' }, 100);
ok(Math.abs(readBlock(sqA.blocks[2]).sy - readBlock(sqB.blocks[2]).sy) > 0.01, '身體會上下擠壓（踏步感）');

// 面向左 → 整體鏡射
const faceL = rigRun('rabbit', { moving: true, walk: 1, facing: 'left' }, 100);
const sc = faceL.calls.filter(c => c[0] === 'scale')[0];
ok(sc && sc[1] < 0, '面向左邊時鏡射（外層 scale x = ' + (sc && sc[1].toFixed(2)) + '）');

// 靜止時也還有呼吸/待機微動
const idleA = rigRun('rabbit', { moving: false, idle: 0.2 }, 100);
const idleB = rigRun('rabbit', { moving: false, idle: 1.4 }, 100);
ok(Math.abs(readBlock(idleA.blocks[5]).ty - readBlock(idleB.blocks[5]).ty) > 0.005, '站著不動時頭也有微微呼吸（不是完全定格）');

// ================================================================
console.log('=== 3. BOSS：老虎國王插畫 ===');
ok(/drawRigChar\(ctx, 'boss'/.test(html), 'BOSS 用部位骨架畫（drawRigChar(ctx, \'boss\')）');
injectAll('boss');
const bossRun = rigRun('boss', { moving: true, walk: 1.2, facing: 'right', amp: .95 }, 160);
const bossNames = bossRun.parts.map(b => nameOfBlock(b, 'boss', 160));
ok(bossRun.blocks.length === 6, 'BOSS 一次畫 6 塊，實際 ' + bossRun.blocks.length);
ok(bossNames[5] === 'head', 'BOSS 的頭是最後一塊（會點動、角度會變）');
const bossHeadA = readBlock(bossRun.blocks[5]);
const bossRun2 = rigRun('boss', { moving: true, walk: 3.4, facing: 'right', amp: .95 }, 160);
ok(Math.abs(bossHeadA.ty - readBlock(bossRun2.blocks[5]).ty) > 0.05, 'BOSS 的頭會上下點動');
ok(Math.abs(readBlock(bossRun.blocks[3]).ang) > 0.005, 'BOSS 的手會擺動');

// 真的透過 drawEnemy 畫 BOSS（不是只有函式在）
const eBoss = BH.makeBoss(5, 5, 10);
rec.calls.length = 0;
try { BH.drawEnemy(eBoss, G.T); } catch (err) { console.log('   (drawEnemy 例外：' + err.message + ')'); }
const bossDrawn = rec.calls.filter(c => c[0] === 'drawImage').length;
ok(bossDrawn >= 6, 'game 內真的用老虎圖畫 BOSS（drawImage ' + bossDrawn + ' 次）');
ok(rec.calls.some(c => c[0] === 'fillText' && String(c[1]).indexOf('👑') >= 0), 'BOSS 血條旁還有皇冠標記');

// 沒有圖時退回外星魔王（不開天窗）
PARTS.forEach(p => { if (BH.Parts.imgs.boss) delete BH.Parts.imgs.boss[p]; });
rec.calls.length = 0;
const noBossImg = BH.drawRigChar(mk(), 'boss', 100, 100, 120, { moving: true });
ok(noBossImg === null, 'BOSS 圖沒載入時 drawRigChar 回 null（drawEnemy 會退回程式繪製）');
injectAll('boss');

// ================================================================
console.log('=== 4. 坐騎：小龍插畫 ===');
ok(/drawRigChar\(ctx, 'dragon'/.test(html), '坐騎用部位骨架畫（drawRigChar(ctx, \'dragon\')）');
injectAll('dragon');
rec.calls.length = 0;
let dinoErr = null;
try { BH.drawDino({ x: 300, y: 300, facing: 'right', moving: true, walkT: .3, dinoT: .2 }, G.T); } catch (e) { dinoErr = e; }
const dinoDrawn = rec.calls.filter(c => c[0] === 'drawImage').length;
ok(!dinoErr, 'drawDino 不報錯' + (dinoErr ? '：' + dinoErr.message : ''));
ok(dinoDrawn >= 6, '坐騎真的用在小龍圖（drawImage ' + dinoDrawn + ' 次 = 6 塊 + 影子）');
const dinoRun = rigRun('dragon', { moving: true, walk: 1.1, facing: 'right', amp: 1.15 }, 120);
ok(dinoRun.blocks.length === 6 && nameOfBlock(dinoRun.parts[5], 'dragon', 120) === 'head',
  '小龍也是 6 塊、頭最後畫');
const dHeadA = readBlock(dinoRun.blocks[5]);
const dinoRun2 = rigRun('dragon', { moving: true, walk: 3.0, facing: 'right', amp: 1.15 }, 120);
ok(Math.abs(dHeadA.ty - readBlock(dinoRun2.blocks[5]).ty) > 0.03, '小龍的頭會動（含左右擺 headTilt）');

// ================================================================
console.log('=== 5. 石頭（不可炸）vs 木箱（可炸）分色 ===');
function hex2rgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
function hsl(h) {
  const [r, g, b] = hex2rgb(h).map(v => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  const s = mx === mn ? 0 : (l > .5 ? (mx - mn) / (2 - mx - mn) : (mx - mn) / (mx + mn));
  let hu = 0;
  if (mx !== mn) {
    if (mx === r) hu = ((g - b) / (mx - mn) + (g < b ? 6 : 0)) * 60;
    else if (mx === g) hu = ((b - r) / (mx - mn) + 2) * 60;
    else hu = ((r - g) / (mx - mn) + 4) * 60;
  }
  return { h: hu, s, l };
}
ok(typeof BH.drawStone === 'function', '有獨立的 drawStone（石頭專屬畫法）');
ok(/if \(v === 1\)[\s\S]{0,90}?drawStone\(/.test(html) && /else \{[\s\S]{0,90}?drawCrate\(/.test(html),
  'render()：不可炸 → drawStone、可炸 → drawCrate（兩套不同畫法）');
// v4.26：軟牆有些主題改用「剪影」（陶罐／雲朵／珊瑚）辨識，色相不一定差很多
//   → 色相／飽和／明度任一項拉得開就算分得出來
const distinct = BH.THEMES.filter(t => {
  const hs = hsl(t.hard), so = hsl(t.soft);
  const dh = Math.min(Math.abs(hs.h - so.h), 360 - Math.abs(hs.h - so.h));
  const dl = Math.abs(hs.l - so.l);
  return dh > 25 || hs.s < so.s * .75 || dl > .12;
});
ok(distinct.length === BH.THEMES.length,
  '8 個關卡的「石頭 / 木箱」都有明顯色相差（' + distinct.length + '/' + BH.THEMES.length + '）');
const lowSat = BH.THEMES.filter(t => hsl(t.hard).s < hsl(t.soft).s);
ok(lowSat.length >= 7, '石頭普遍比木箱低飽和（灰樸樸）' + lowSat.length + '/8');
rec.calls.length = 0;
BH.drawStone(100, 100, 40, BH.THEMES[0].hard, 7);
const stoneCalls = rec.calls.slice();
ok(stoneCalls.length > 8, 'drawStone 有實際繪製（' + stoneCalls.length + ' 次繪圖指令）');
ok(stoneCalls.filter(c => c[0] === 'fill').length >= 2, '石頭有多層次（底部內陰 + 斑點）');
ok(stoneCalls.some(c => c[0] === 'stroke'), '石頭有畫裂縫（stroke）');
rec.calls.length = 0;
BH.drawCrate(100, 100, 40, BH.THEMES[0].soft, BH.THEMES[0].soft2, false);
// v4.26：軟牆改成預烘焙貼圖 → 一次 drawImage 就畫完整塊（細節都在烘焙時算完）
ok(rec.calls.some(c => c[0] === 'drawImage') || rec.calls.length > 3, '木箱也照常畫（drawCrate 貼上預烘焙貼圖）');

// ================================================================
console.log('=== 6. 溜冰鞋道具：真的畫溜冰鞋 ===');
ok(typeof BH.drawSkateIcon === 'function', '有 drawSkateIcon（向量溜冰鞋）');
ok(/if \(it\.type === 'speed'\) \{\s*drawSkateIcon\(/.test(html), '道具圖示：speed → drawSkateIcon（不再用 emoji 🛼）');
rec.calls.length = 0;
BH.drawSkateIcon(200, 200, 16);
const sk = rec.calls.slice();
ok(sk.length > 8, '溜冰鞋圖標有實際繪製（' + sk.length + ' 次指令）');
ok(sk.some(c => c[0] === 'quadraticCurveTo' || c[0] === 'arc'), '有冰刀弧線');
ok(sk.every(c => c[0] !== 'fillText'), '不是用文字畫的（純向量）');

// ================================================================
console.log('=== 7. 角色頭像縮小 ===');
ok(/const h = S \* \.84/.test(html), '頭像高度係數 0.84（原本撐滿整個格子）');
ok(/S \* \.94 - h/.test(html), '頭像貼齊底部 0.94（留邊、不切頭）');
ok(/\(S - w\) \/ 2/.test(html), '頭像水平置中');

// ================================================================
console.log('=== 8. 選角預覽：動作放慢 + 頭手腳都會動 ===');
ok(/now \* \.55/.test(html), '踱步相位放慢（0.55，原本 1.0）');
ok(/hops\[k\] = Math\.max\(0, hops\[k\] - dt \* 1\.15\)/.test(html), '選到時的彈跳變慢（1.15，原本 1.8）');
ok(/Math\.sin\(\(1 - hp\) \* Math\.PI\) \* H \* \.075/.test(html), '彈跳幅度縮小（0.075H，不是大跳）');
ok(/drawSpriteChar\(g, c, cx, footY - R \* \.82, R, \{ walk: walk/.test(html),
  '選角預覽走 drawSpriteChar → 部位骨架（頭手腳都會動）');
const CharPrev = BH.CharPreview;
ok(CharPrev && typeof CharPrev.tick === 'function' && typeof CharPrev.mount === 'function', 'CharPreview 介面完好');

// ================================================================
console.log('=== 9. 裝置自動感應（鍵盤 / 手把 / 觸控） ===');
ok(Object.prototype.hasOwnProperty.call(P.settings, 'ctrl'), '設定裡有 ctrl 欄位');
ok(/data-v="auto"/.test(html), '設定畫面有「自動」選項');
ok(typeof BH.InputSense.seen === 'function' && typeof BH.InputSense.current === 'function', 'InputSense 有 seen / current');
P.settings.ctrl = 'auto';
BH.InputSense.seen('pad');
ok(BH.ctrlMode() === 'pad', '手把一動 → 自動切到手把（' + BH.ctrlMode() + '）');
BH.InputSense.seen('key');
ok(BH.ctrlMode() === 'kb', '鍵盤一按 → 自動切回鍵盤（' + BH.ctrlMode() + '）');
BH.InputSense.seen('touch');
ok(BH.ctrlMode() === 'touch', '手指一碰 → 自動切到觸控（' + BH.ctrlMode() + '）');
ok(typeof BH.InputSense.label('touch') === 'string' && BH.InputSense.label('touch').length > 0,
  '切換時有中文提示文字（' + BH.InputSense.label('touch') + '）');
let switched = null;
BH.InputSense.onSwitch(function (m) { switched = m; });
BH.InputSense.seen('key');
ok(switched === 'kb', '切換會通知外部（重綁按鍵 + 提示）');
P.settings.ctrl = 'kb';
BH.InputSense.seen('touch');
ok(BH.ctrlMode() === 'kb', '使用者手動指定鍵盤時，不會被觸控蓋掉');
P.settings.ctrl = 'auto';
ok(BH.ctrlMode() === 'touch', '切回自動後馬上跟隨最近使用的裝置（' + BH.ctrlMode() + '）');
ok(/InputSense\.seen\('pad'\)/.test(html), '手把輪詢有回報給 InputSense');
ok(/InputSense\.seen\('key'\)/.test(html), '鍵盤事件有回報給 InputSense');
P.settings.ctrl = 'kb';

// ================================================================
console.log('=== 10. 手機版面：滑得動、不溢出 ===');
ok(!/body\.touch\s*\{[^}]*touch-action: none/.test(html),
  'body 不再 touch-action:none（先前它把子層 pan-y 一起鎖死 → 拉不到下面）');
ok(/body\.touch \.wrap\.game, body\.touch \.wrap\.game \* \{ touch-action: none/.test(html),
  '只有遊戲畫面鎖手勢（避免誤觸）');
ok(/@supports selector\(body:has\(\.wrap:not\(\.game\)\)\)/.test(html),
  '支援 :has() 的瀏覽器改用整頁原生捲動');
ok(/body\.touch:has\(\.wrap:not\(\.game\)\) \.wrap:not\(\.game\) \{\s*max-height: none; overflow: visible/.test(html),
  '選單容器不再自我滾動（交給瀏覽器），網址列伸縮也不會卡');
ok(/@media \(max-width: 640px\)/.test(html), '窄屏斷點拉到 640px（含 584px 的裝置）');
ok(/env\(safe-area-inset-bottom/.test(html), '底部留 iPhone 安全區');
ok(/\.ov-box \{[^}]*overflow-y: auto/.test(html), '暫停面板內容可捲動');

// 直放時「只有遊戲畫面」旋轉
function cssRulesFor(txt) {
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(html))) {
    const sel = m[1].replace(/\s+/g, ' ').trim();
    if (sel.indexOf(txt) >= 0) out.push({ sel, body: m[2] });
  }
  return out;
}
const notGameRules = cssRulesFor('.wrap:not(.game)');
ok(notGameRules.length >= 2, '選單容器有專屬規則（' + notGameRules.length + ' 條）');
ok(notGameRules.every(r => r.body.indexOf('rotate(') < 0), '選單／設定不再被旋轉 90 度（維持手機原本方向）');
const gameRules = cssRulesFor('.wrap.game');
ok(!gameRules.some(r => /rotate\(90deg\)/.test(r.body)), 'v2.3：遊戲畫面不再旋轉（直式直接玩）');
ok(/body\.touch #stageWrap \{ padding-bottom: 162px; \}/.test(html), 'v2.3：直式遊戲畫面下方保留搖桿列');

// ================================================================
console.log('=== 11. 回歸：遊戲還能跑 ===');
P.settings.soloChar = 0;   // v2.0 起角色預設隨機 → 固定兔子（精靈圖才貼得出來）
const p3 = freshSolo(1);
G.enemies.forEach(e => { e.x = -9999; e.y = -9999; });
let err = null;
try { for (let i = 0; i < 60; i++) { P.updateSolo(1 / 60); P.render(); } } catch (e) { err = e; }
ok(!err, '連跑 60 幀 update + render 不報錯' + (err ? '：' + err.message : ''));
ok(G.players[0].alive, '玩家還活著');
ok(rec.calls.filter(c => c[0] === 'drawImage').length >= 1, '渲染過程有貼圖');

console.log('');
console.log('通過 ' + pass + ' / ' + (pass + fail) + (fail ? '（' + fail + ' 項失敗）' : ''));
process.exit(fail ? 1 : 0);
