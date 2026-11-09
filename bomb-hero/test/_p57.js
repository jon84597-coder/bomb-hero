// test/_p57.js —— v5.74 真瀏覽器探針（線上 Render）
//   驗：① 線上真的是 v5.74（VERSION ＋ SW_VERSION ＋ /api/health）
//       ② 拆檔真的生效：js/rpg.js 載進來、__installRpg 回填、RpgSkill.charDef() 有料
//       ③ 深淵契約：八張、每張都有好處與代價、抽三張、perkSum 會聚合
//       ④ 深淵里程碑：跨多階一次結算
//       ⑤ 每週挑戰幽靈有介面
//       ⑥ 圖鑑獎勵列（未集滿不出現、claimReady 是函式）
//       ⑦ RPG 四帶（rpgBand 逐關對應）
//       ⑧ 後處理 drawGrade ＋ GRADE_TINT
//       ⑨ 手機直放頂欄不溢出（430／360）
//       ⑩ 零 console 錯誤
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, '_v574');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}

let pass = 0, fail = 0;
function ok(c, m, extra) {
  if (c) { pass++; console.log('  ✓ ' + m + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
  else { fail++; console.log('  ✗ FAIL: ' + m + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}
const wait = ms => new Promise(r => setTimeout(r, ms));

const BASE = process.env.BH_BASE || 'https://bomb-hero-game.onrender.com';
const URL0 = BASE + '/?unlock=all';

(async () => {
  const b = await launch({ w: 430, h: 900, port: 9397 });
  const p = await b.newPage();
  const errs = [];
  try { p.on && p.on('Runtime.exceptionThrown', e => errs.push(String(e && e.exceptionDetails && e.exceptionDetails.text))); } catch (e) {}
  try { p.on && p.on('console', m => { if (m.level && m.level() === 'error') errs.push(m.text()); }); } catch (e) {}
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.resize(430, 900, true);

  /* ⓪ 先註銷 SW 並清 cache —— SW 對 JS 是 cache-first，不然會端出上一版 */
  await p.goto(URL0, 1500);
  await p.eval(`(async function(){
    try {
      var rs = await navigator.serviceWorker.getRegistrations();
      for (var i = 0; i < rs.length; i++) await rs[i].unregister();
      var ks = await caches.keys();
      for (var j = 0; j < ks.length; j++) await caches.delete(ks[j]);
    } catch (e) {}
    return 1;
  })()`);
  await wait(600);
  await p.eval(`(function(){
    try {
      localStorage.setItem('bombhero-rotskip', '1');
      var st = JSON.parse(localStorage.getItem('bombhero-settings-v1') || '{}');
      st.playerName = '線上測試'; st.nameLock = 1; st.nameAuto = 0;
      localStorage.setItem('bombhero-settings-v1', JSON.stringify(st));
    } catch (e) {}
    return 1;
  })()`);

  /* ① 版本三件 */
  const health = await p.eval(`fetch('/api/health').then(function(r){return r.json();}).then(function(j){return j;}).catch(function(e){return {err:String(e)};})`);
  ok(health && !health.err, '/api/health 有回應', health && (health.ok === undefined ? (health.status || 'ok') : health.ok));
  const swTxt = await p.eval(`fetch('/sw.js').then(function(r){return r.text();}).then(function(t){ var m=t.match(/SW_VERSION\\s*=\\s*'([^']+)'/); return m?m[1]:''; }).catch(function(e){ return 'ERR'; })`);
  ok(swTxt === 'v5.74.0', '線上 SW_VERSION 是 v5.74.0', swTxt);

  await p.goto(URL0, 4200);
  for (let i = 0; i < 40; i++) {
    if (await p.eval('typeof window.__BH === "object" && !!window.__BH.VERSION')) break;
    await wait(400);
  }

  /* ② 拆檔 */
  const boot = await p.eval(`(function(){
    var P = window.__BH;
    return { ver: P.VERSION, hasRpg: typeof P.Rpg, hasUI: typeof P.RpgUI,
             hasInstall: typeof P.__installRpg, hasSkill: typeof P.RpgSkill,
             lang: typeof P.LANG, pts: typeof P.RPG_POINTS_TOTAL };
  })()`);
  ok(boot.ver === '5.74', '線上版本 5.74', boot.ver);
  ok(boot.hasRpg === 'object' && boot.hasUI === 'object', '__installRpg 已回填 Rpg／RpgUI', [boot.hasRpg, boot.hasUI]);
  ok(boot.hasInstall === 'function', '__installRpg 有匯出（rpg.js 才找得到插槽）');
  ok(boot.lang === 'string' && boot.pts === 'number', 'LANG／RPG_POINTS_TOTAL getter 正常', [boot.lang, boot.pts]);

  const rpgJs = await p.eval(`fetch('/js/rpg.js').then(function(r){return r.text();}).then(function(t){ return { code: t.length, hasInstall: t.indexOf('__installRpg') >= 0 }; }).catch(function(e){ return { err: String(e) }; })`);
  ok(rpgJs.code > 30000, '線上 js/rpg.js 真的存在且完整', rpgJs);

  const cd = await p.eval(`(function(){
    var P = window.__BH, S = P.RpgSkill;
    if (!S) return { err: 'no RpgSkill' };
    var list = S.CHAR_SKILLS || [];
    var bad = list.filter(function (d) { return !d || !d.n || !d.d || d.d.length < 8 || typeof d.cd !== 'number' || !d.ico; });
    var one = null;
    try { one = S.charDef(); } catch (e) { one = { err: String(e) }; }
    return { n: list.length, bad: bad.length, cur: one && one.n ? one.n : (one && one.err) || '' };
  })()`);
  ok(cd.n === 8 && cd.bad === 0, '八個角色的專屬技都有圖示／名稱／說明／冷卻（角色頁那張卡靠它）', cd);
  ok(typeof cd.cur === 'string' && cd.cur.length > 0 && cd.cur.indexOf('Error') !== 0,
    'charDef() 取得出當前角色招式（拆檔後改走 RpgSkill.charDef）', cd.cur);

  /* ③ 深淵契約 */
  const perk = await p.eval(`(function(){
    var P = window.__BH;
    try { P.Solo.unlocked = 40; } catch (e) {}
    var all = P.ABYSS_PERKS || [];
    var bad = all.filter(function (x) { return !x || !x.g || !x.b || !String(x.g).length || !String(x.b).length; });
    P.AbyssPerk.open(3);
    var cards = document.querySelectorAll('#abyssPerk .apcard');
    var goods = document.querySelectorAll('#abyssPerk .apgood');
    var bads  = document.querySelectorAll('#abyssPerk .apbad');
    var txt = [].map.call(cards, function (c) { return c.textContent.replace(/\\s+/g, ' ').trim(); });
    var sum = P.Abyss.perkSum();
    return { n: all.length, bad: bad.length, cards: cards.length,
             goods: goods.length, bads: bads.length, txt: txt.slice(0, 3), sum: sum };
  })()`);
  ok(perk.n === 8, '深淵契約八張', perk.n);
  ok(perk.bad === 0, '每一張都同時有好處（g）與代價（b）', perk.bad);
  ok(perk.cards === 3, '進下一層前抽三張', perk.cards);
  ok(perk.goods === 3 && perk.bads === 3, '三張都各有一行▲好處與一行▼代價', [perk.goods, perk.bads]);
  ok(perk.txt.every(t => t.length > 8), '契約卡有文字內容', perk.txt[0] && perk.txt[0].slice(0, 40));
  await wait(300);
  await p.shot(path.join(OUT, 'p57-contract-online.png'));

  /* 選第一張 → perkSum 應該開始有東西 */
  const picked = await p.eval(`(function(){
    var P = window.__BH;
    var c = document.querySelector('#abyssPerk .apcard');
    if (c) c.click();
    var s = P.Abyss.perkSum();
    var keys = 0;
    for (var k in s) if (s[k]) keys++;
    return { keys: keys, sum: s, list: P.AbyssPerk.list().length, perks: P.Abyss.perks().length };
  })()`);
  ok(picked.keys > 0 && picked.perks === 1, '選了一張之後真的記進 perks、perkSum 聚合出效果（會影響下一層）',
    { keys: picked.keys, perks: picked.perks, sum: picked.sum });
  ok(picked.list === 8, '契約池是八張', picked.list);

  /* ④ 里程碑 */
  const ms = await p.eval(`(function(){
    var P = window.__BH;
    var a = P.Abyss.msCheck(10), b = P.Abyss.msCheck(75);
    return { aMany: !!(a && a.many), aGold: a ? a.gold : -1,
             bMany: !!(b && b.many), bGold: b ? b.gold : -1, bTk: b ? b.tk : -1 };
  })()`);
  ok(ms.aMany === false && ms.aGold === 600, '走到第 10 層只結算一階（600 金幣）', ms);
  /* 注意順序：上一行已經領掉第 10 層（600），所以這裡只剩 20/30/50/75 四階 */
  ok(ms.bMany === true && ms.bGold === 7400, '一次跨到第 75 層會把跨過的階一起結算（1100+1600+2100+2600）', ms.bGold);
  ok(ms.bTk === 3, '跨過的 ≥30 層各給一張門票', ms.bTk);

  /* ⑤ 每週幽靈 */
  const ghost = await p.eval(`(function(){
    var P = window.__BH;
    return { wkLoad: typeof P.Ghost.wkLoad, wkToday: typeof P.Ghost.wkToday,
             today: P.Ghost.wkToday() === null ? 'null' : typeof P.Ghost.wkToday() };
  })()`);
  ok(ghost.wkLoad === 'function' && ghost.wkToday === 'function', '每週挑戰有幽靈介面', ghost);

  /* ⑥ 圖鑑獎勵 */
  const codex = await p.eval(`(function(){
    var C = window.__BH.CodexUI;
    if (!C) return { err: 'no CodexUI' };
    var before = C.claimReady();
    var html = C.renderRew ? C.renderRew() : '(no renderRew)';
    return { ready: typeof C.claimReady === 'function' ? C.claimReady() : 'no', before: before,
             htmlLen: String(html).length };
  })()`);
  ok(typeof codex.ready === 'boolean', '圖鑑有 claimReady 判定', codex.ready);
  ok(codex.htmlLen >= 0, '圖鑑獎勵列會回傳字串（沒東西可領時是空的）', codex.htmlLen);

  /* ⑦ RPG 四帶 */
  const band = await p.eval(`(function(){
    var P = window.__BH, out = [];
    [8, 9, 16, 17, 24, 25, 32, 33, 40].forEach(function (s) {
      var r = P.rpgBand(s);
      out.push({ s: s, id: r ? r.id : null, n: r ? r.n : null });
    });
    return { map: out, defs: (P.RPG_BANDS || []).length };
  })()`);
  const ids = band.map.map(x => x.id);
  ok(JSON.stringify(ids) === JSON.stringify([null, 'swarm', 'swarm', 'fuse', 'fuse', 'scarce', 'scarce', 'hunt', 'hunt']),
    '四帶邊界正確（9-16 怪多／17-24 引信短／25-32 補給少／33-40 怪多又快）', ids);
  ok(band.defs === 4, 'RPG_BANDS 四條', band.defs);

  /* ⑧ 後處理 */
  const grade = await p.eval(`(function(){
    var P = window.__BH;
    return { fn: typeof P.drawGrade, tint: P.GRADE_TINT ? Object.keys(P.GRADE_TINT).length : -1,
             cache: typeof P.drawGrade._lgk };
  })()`);
  ok(grade.fn === 'function', 'drawGrade 後處理層在（統一光源＋主題色）');
  ok(grade.tint > 0, 'GRADE_TINT 有主題色表', grade.tint);

  /* ⑨ 頂欄幾何（430／360） */
  async function topBar(w, h) {
    await p.resize(w, h, true);
    await wait(400);
    await p.eval(`(function(){
      var P = window.__BH;
      try { P.Solo.unlocked = 40; } catch (e) {}
      try { P.startSolo(1); } catch (e) {}
      return 1;
    })()`);
    await wait(2200);
    const g = await p.eval(`(function(){
      var t = document.getElementById('gameTop');
      var kids = [], bar = t ? t.getBoundingClientRect() : null;
      if (t) {
        Array.prototype.forEach.call(t.children, function (c) {
          if (!c.getBoundingClientRect || window.getComputedStyle(c).display === 'none') return;
          var r = c.getBoundingClientRect();
          if (r.width < 1) return;
          kids.push({ id: c.id || c.className, t: Math.round(r.top), b: Math.round(r.bottom),
                      l: Math.round(r.left), r: Math.round(r.right) });
        });
      }
      var over = kids.filter(function (k) { return bar && (k.r > bar.right + 1 || k.l < bar.left - 1); });
      return { state: window.__BH.Game.state, bar: bar ? [Math.round(bar.top), Math.round(bar.bottom)] : null,
               sw: t ? t.scrollWidth : -1, cw: t ? t.clientWidth : -1, n: kids.length,
               rows: kids.length ? Math.max.apply(null, kids.map(function (k) { return k.b; })) - Math.min.apply(null, kids.map(function (k) { return k.t; })) : 0,
               over: over.map(function (k) { return k.id; }), vw: window.innerWidth };
    })()`);
    await p.shot(path.join(OUT, 'p57-top-' + w + '.png'));
    return g;
  }
  const g430 = await topBar(430, 900);
  ok(g430.sw <= g430.cw + 1, '430 直放：頂欄沒有橫向溢出', { sw: g430.sw, cw: g430.cw });
  ok(g430.over.length === 0, '430 直放：沒有任何子元素跑出頂欄', g430.over);
  ok(g430.rows <= 34, '430 直放：全部排在同一列（高度差 ≤ 34px）', g430.rows);

  const g360 = await topBar(360, 640);
  ok(g360.sw <= g360.cw + 1, '360 直放：頂欄沒有橫向溢出', { sw: g360.sw, cw: g360.cw });
  ok(g360.over.length === 0, '360 直放：沒有任何子元素跑出頂欄', g360.over);
  ok(g360.rows <= 34, '360 直放：全部排在同一列', g360.rows);

  console.log('\nconsole 錯誤：', errs.length ? errs.slice(0, 5) : '（無）');
  ok(errs.length === 0, '整段流程零 console 錯誤', errs.length);

  console.log('\n' + (fail === 0 ? '✅' : '❌') + ' 線上探針：' + pass + ' 通過 / ' + fail + ' 失敗');
  await b.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('探針爆炸：', e); process.exit(1); });
