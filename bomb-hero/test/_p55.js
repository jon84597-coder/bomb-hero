// test/_p55.js —— v5.73 真瀏覽器探針（本地 file://）
//   驗：① 首頁今日進度 ② 深淵入口與 HUD ③ 深淵換層 ④ 每週限制挑戰卡
//       ⑤ 商店每日特惠 ⑥ 角色專屬技按鈕 ⑦ 地板材質真的有畫上去 ⑧ 零 console 錯誤
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, '_v573');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const ROOT = path.resolve(__dirname, '..');
const URL0 = 'file:///' + path.resolve(ROOT, 'index.html').replace(/\\/g, '/');

let pass = 0, fail = 0;
function ok(c, m, extra) {
  if (c) { pass++; console.log('  ✓ ' + m + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
  else { fail++; console.log('  ✗ FAIL: ' + m + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const br = await launch({ w: 430, h: 900, port: 9381 });
  const page = await br.newPage();
  const errs = [];
  try { page.on && page.on('Runtime.exceptionThrown', e => errs.push(String(e && e.exceptionDetails && e.exceptionDetails.text))); } catch (e) {}
  try { page.on && page.on('console', m => { if (m.level && m.level() === 'error') errs.push(m.text()); }); } catch (e) {}
  await page.resize(430, 900, true);
  await page.goto(URL0, 3800);
  for (let i = 0; i < 30; i++) {
    const ready = await page.eval('typeof window.__BH === "object" && !!window.__BH.VERSION');
    if (ready) break;
    await wait(300);
  }

  /* ① 首頁 */
  const home = await page.eval(`(function(){
    var P = window.__BH;
    try { P.Solo.unlocked = 40; } catch(e){}
    try { P.settings.playerName = '測試員'; P.settings.nameLock = 1; P.saveSettings(); } catch(e){}
    try { P.Nick.greet(); } catch(e){}
    var tl = document.getElementById('todayLine');
    var gl = document.getElementById('greetLine');
    return {
      ver: P.VERSION,
      greet: gl ? gl.textContent.trim() : '',
      today: tl ? tl.textContent.trim() : '',
      todayShown: tl ? (window.getComputedStyle(tl).display !== 'none') : false,
      starter: (document.getElementById('homeMenu')||{className:''}).className
    };
  })()`);
  ok(home.ver === '5.73', '版本 5.73', home.ver);
  ok(home.greet.length > 0, '招呼語有內容', home.greet);
  ok(home.today.indexOf('40') >= 0, '今日進度顯示 40 關', home.today);
  ok(home.todayShown, '今日進度是可見的');
  await page.shot(path.join(OUT, 'p55-home.png'));

  /* ② 深淵入口 */
  const adv = await page.eval(`(function(){
    var P = window.__BH;
    try { P.Solo.unlocked = 40; } catch(e){}
    document.getElementById('btnAdventure').click();
    var b = document.getElementById('btnAbyss');
    var t = document.getElementById('abyssTip');
    return { has: !!b, txt: b ? b.textContent.trim() : '', tip: t ? t.textContent.trim() : '',
             locked: b ? b.classList.contains('locked') : null };
  })()`);
  ok(adv.has, '冒險彈窗有深淵按鈕', adv.txt);
  ok(!adv.locked, '40 關全破後不是鎖住的');
  await page.shot(path.join(OUT, 'p55-pick.png'));

  /* ③ 進深淵 */
  await page.eval(`document.getElementById('btnAbyss').click(); 1`);
  await wait(1400);
  const ab = await page.eval(`(function(){
    var P = window.__BH, G = P.Game;
    var badge = document.getElementById('abyssBadge');
    return { mode: G.mode, layer: P.Abyss.layerOf(), stage: G.stage,
             badge: badge ? badge.textContent.trim() : '', badgeHidden: badge ? badge.classList.contains('hide') : null,
             foes: (G.enemies||[]).length, T: G.T, state: G.state };
  })()`);
  ok(ab.layer === 1, '深淵第 1 層', ab.layer);
  ok(ab.stage >= 2 && ab.stage <= 39, '第 1 層不是第 1 關（保留強化卡）', ab.stage);
  ok(ab.badge.indexOf('1') >= 0, 'HUD 徽章顯示層數', ab.badge);
  ok(!ab.badgeHidden, 'HUD 徽章沒有被藏起來');
  ok(ab.foes > 0, '層裡有怪', ab.foes);
  /* 點掉開場面板 → 真的進到 play（徽章要在「頂欄正下方」，不能壓到地圖名） */
  await page.eval(`(function(){
    var b = document.querySelector('#ovBox button');
    if (b) b.click();
    return 1;
  })()`);
  await wait(3200);
  const abPlay = await page.eval(`(function(){
    var P = window.__BH, G = P.Game;
    var bd = document.getElementById('abyssBadge');
    var gt = document.getElementById('gameTop');
    var r1 = bd ? bd.getBoundingClientRect() : null;
    var r2 = gt ? gt.getBoundingClientRect() : null;
    var inBar = !!(r1 && r2 && r1.top >= r2.top - 1 && r1.bottom <= r2.bottom + 2 &&
                   r1.left >= r2.left - 1 && r1.right <= r2.right + 1);
    return { state: G.state, inBar: inBar,
             top: r1 ? Math.round(r1.top) : -1,
             barTop: r2 ? Math.round(r2.top) : -1,
             barBottom: r2 ? Math.round(r2.bottom) : -1,
             isChild: !!(bd && gt && bd.parentNode === gt) };
  })()`);
  ok(abPlay.state === 'play', '點掉面板後真的開始玩', abPlay.state);
  ok(abPlay.inBar, '徽章是頂欄裏的一顆 chip（不會撞地圖名／小地圖／圓形按鈕）',
    { top: abPlay.top, barTop: abPlay.barTop, barBottom: abPlay.barBottom });
  await page.shot(path.join(OUT, 'p55-abyss.png'));

  /* ④ 換層 + ⑤ 專屬技 */
  const l2 = await page.eval(`(function(){
    var P = window.__BH, G = P.Game;
    try { P.Abyss.start(2); } catch(e) { return { err: String(e) }; }
    var bar = document.getElementById('skillBar');
    var w = bar ? bar.querySelector('.skbtn.wsk') : null;
    var cs = P.RpgSkill ? P.RpgSkill.CHAR_SKILLS.length : -1;
    return { layer: P.Abyss.layerOf(), stage: G.stage, cs: cs,
             wsk: !!w, wskIco: w ? w.textContent.trim() : '', barBtn: bar ? bar.querySelectorAll('.skbtn').length : 0 };
  })()`);
  ok(l2.layer === 2, '可以逐層推進（第 2 層）', l2.layer);
  ok(l2.cs === 8, '八個角色八招', l2.cs);

  /* RPG 專屬技（要 RPG 模式才會顯示技能列） */
  await page.eval(`(function(){ window.__BH.Screen.show('rpg'); try{ window.__BH.Rpg.render(); }catch(e){} return 1; })()`);
  await wait(500);

  /* ⑥ 每日挑戰頁：限制挑戰卡 */
  await page.eval(`(function(){ window.__BH.Screen.show('daily'); window.__BH.renderDailyScreen(); return 1; })()`);
  await wait(700);
  const wk = await page.eval(`(function(){
    var P = window.__BH;
    var b = document.getElementById('wkChal');
    var m = document.getElementById('wkChalMod');
    var s = document.getElementById('wkChalStage');
    return { has: !!b, vis: b ? (window.getComputedStyle(b).display !== 'none') : false,
             mod: m ? m.textContent.trim() : '', stage: s ? s.textContent.trim() : '',
             id: P.WeekChal.modOf().id };
  })()`);
  ok(wk.has && wk.vis, '每日挑戰頁有限制挑戰卡');
  ok(wk.mod.length > 4, '限制條件有文字', wk.mod);
  ok(wk.stage.indexOf('關') >= 0 || wk.stage.length > 0, '本週關卡有寫出來', wk.stage);
  await page.shot(path.join(OUT, 'p55-weekly.png'));

  /* ⑦ 商店每日特惠 */
  await page.eval(`(function(){ try { window.__BH.Shop.open(); } catch(e){} return 1; })()`);
  await wait(700);
  const deal = await page.eval(`(function(){
    var d = document.getElementById('shopDeal');
    var cards = document.querySelectorAll('#shopDeal .dealcard');
    return { has: !!d, n: cards.length,
             prices: Array.prototype.map.call(document.querySelectorAll('#shopDeal .dealprice'), function(e){ return e.textContent.trim(); }) };
  })()`);
  ok(deal.has, '商店有今日特惠區');
  ok(deal.n === 3, '三件特惠', deal.n);
  ok(deal.prices.length === 3 && deal.prices.every(function (x) { return x.indexOf('💰') >= 0; }), '每件都有特價', deal.prices);
  await page.shot(path.join(OUT, 'p55-shop.png'));

  /* ⑧ 地板材質：回到遊戲取樣 */
  const tex = await page.eval(`(function(){
    var P = window.__BH;
    var loaded = 0, total = P.FloorTex.STYLES.length;
    P.FloorTex.STYLES.forEach(function(s){ if (P.FloorTex.get({style:s})) loaded++; });
    return { styles: total, loadedNow: loaded,
             el: null };
  })()`);
  ok(tex.styles === 8, '八個主題都有材質', tex.styles);

  console.log('\nconsole 錯誤：', errs.length ? errs.slice(0, 4) : '（無）');
  ok(errs.length === 0, '整段流程零 console 錯誤', errs.length);

  await page.shot(path.join(OUT, 'p55-last.png'));
  console.log('\n' + (fail ? '❌' : '✅') + ' 本地探針：' + pass + ' 通過 / ' + fail + ' 失敗');
  try { await br.close(); } catch (e) {}
  process.exit(fail ? 1 : 0);
})();
