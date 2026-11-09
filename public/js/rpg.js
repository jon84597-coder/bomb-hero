/* v5.74：RPG 模組（角色頁／營地／商店／招式頁／地圖選擇）—— 從 js/main.js 搬出來。
   為什麼要拆：這一塊是主檔裡最大的「純介面」段落（31,658 字元、2,743 行），
   每次改 RPG 版面都要在 1.7MB 的檔案裡找位置。搬出來之後主檔只剩遊戲邏輯。

   載入順序：i18n-src.js → main.js → **rpg.js** → keys-ui.js → …
     rpg.js 一定要在 main.js 之後（它要讀 window.__BH），而且不能加 defer。

   兩個模組怎麼回到主檔：
     主檔把 const Rpg／RpgUI 換成 `let Rpg = null, RpgUI = null`，
     本檔收尾呼叫 __BH.__installRpg({ Rpg, RpgUI })，把兩個物件塞回去。
     所以主檔裡的 Rpg.renderStats() ／ RpgUI.saveCamp() 一行都不用改。

   依賴怎麼來：
     下面那一串是「原本靠閉包看得到的東西」—— 現在全部改由 __BH 取。
     LANG／RPG_POINTS_TOTAL 是會變的 let，用 getter 即時讀（直接複製會在載入
     瞬間就過期：切語言、雲端覆寫點數之後 RPG 介面會顯示舊值）。
     若日後有人在主檔改了名字，MISS 會把缺的清單印出來，verify-v574 也會紅。 */
(function () {
  'use strict';
  var BH = window.__BH;
  if (!BH) { console.error('[rpg] 找不到 window.__BH：js/main.js 必須先載入'); return; }
  var MISS = [];
  function g(n) { if (BH[n] === undefined) MISS.push(n); return BH[n]; }
  var __deps = [    '$id', 'Ach', 'AudioSys', 'BOSS_SLOT', 'CHARACTERS', 'CharPreview', 'Cloud', 'RPG',
    'RPG_ATTRS', 'RPG_BAG', 'RPG_CAP', 'RPG_FREE_PER', 'RPG_LV_MAX', 'RPG_PERM_UP', 'RPG_SKILLS',
    'RPG_SK_MAX', 'RPG_SK_PER', 'RPG_SK_SLOTS', 'RpgSkill', 'SOLO_STAGES', 'Screen', 'Shop',
    'THEMES', '__bootFail', '__stubModule', 'charName', 'charTag', 'ensureNickname',
    'escHtml', 'mapName', 'rpgAdjust', 'rpgApplyCamp', 'rpgBagCount', 'rpgBonus', 'rpgCharIdx', 'rpgDerive',
    'rpgLeft', 'rpgLoadout', 'rpgLvOf', 'rpgPerm', 'rpgPrice', 'rpgRandomAlloc', 'rpgRespecApply',
    'rpgRespecInfo', 'rpgSkActives', 'rpgSkDef', 'rpgSkLeft', 'rpgSkLv', 'rpgSkPts', 'rpgSkSpent',
    'rpgSum', 'rpgTakeBag', 'rpgTalent', 'shadeHex', 'soloInfo', 'stageName', 'startRpg', 't',
    'themeName', 'toast', 'tr'
  ];
  var D = {};
  __deps.forEach(function (n) { D[n] = g(n); });
  var $id = D.$id, Ach = D.Ach, AudioSys = D.AudioSys, BOSS_SLOT = D.BOSS_SLOT,
      CHARACTERS = D.CHARACTERS, CharPreview = D.CharPreview, Cloud = D.Cloud,
      RPG = D.RPG, RPG_ATTRS = D.RPG_ATTRS, RPG_BAG = D.RPG_BAG, RPG_CAP = D.RPG_CAP,
      RPG_FREE_PER = D.RPG_FREE_PER, RPG_LV_MAX = D.RPG_LV_MAX, RPG_PERM_UP = D.RPG_PERM_UP,
      RPG_SKILLS = D.RPG_SKILLS, RPG_SK_MAX = D.RPG_SK_MAX, RPG_SK_PER = D.RPG_SK_PER,
      RPG_SK_SLOTS = D.RPG_SK_SLOTS, RpgSkill = D.RpgSkill, SOLO_STAGES = D.SOLO_STAGES,
      Screen = D.Screen, Shop = D.Shop, THEMES = D.THEMES,
      __bootFail = D.__bootFail, __stubModule = D.__stubModule, charName = D.charName, charTag = D.charTag, ensureNickname = D.ensureNickname,
      escHtml = D.escHtml, mapName = D.mapName, rpgAdjust = D.rpgAdjust,
      rpgBagCount = D.rpgBagCount, rpgBonus = D.rpgBonus, rpgCharIdx = D.rpgCharIdx,
      rpgApplyCamp = D.rpgApplyCamp, rpgDerive = D.rpgDerive, rpgLeft = D.rpgLeft, rpgLoadout = D.rpgLoadout,
      rpgLvOf = D.rpgLvOf, rpgPerm = D.rpgPerm, rpgPrice = D.rpgPrice,
      rpgRandomAlloc = D.rpgRandomAlloc, rpgRespecApply = D.rpgRespecApply,
      rpgRespecInfo = D.rpgRespecInfo, rpgSkActives = D.rpgSkActives, rpgSkDef = D.rpgSkDef,
      rpgSkLeft = D.rpgSkLeft, rpgSkLv = D.rpgSkLv, rpgSkPts = D.rpgSkPts,
      rpgSkSpent = D.rpgSkSpent, rpgSum = D.rpgSum, rpgTakeBag = D.rpgTakeBag,
      rpgTalent = D.rpgTalent, shadeHex = D.shadeHex, soloInfo = D.soloInfo,
      stageName = D.stageName, startRpg = D.startRpg, t = D.t, themeName = D.themeName,
      toast = D.toast, tr = D.tr;

const Rpg = (function () {
    try {
      return (function () {
  let inited = false;
  function sumHtml() {
    const d = rpgDerive(RPG.alloc);
    /* v5.54：原本是「中文碎片 + <b>數字</b>」串出來的，換語言只會翻到一半 → 走模板 key。 */
    return t('rpg.sum', {
      hp: d.maxHp, arm: d.armor,
      spd: Math.round((d.spdMul - 1) * 100),
      rg: d.range, dmg: d.dmg
    });
  }
  function renderStats() {
    const box = $id('rpgRows');
    if (!box) return;
    // v5.18：等級／經驗（每 2 級 1 點）
    const lb = $id('rpgLvBar');
    if (lb) {
      const L = rpgLvOf(RPG.xp);
      const nx = L.lv < RPG_LV_MAX ? (2 - (L.lv % 2)) : 0;
      lb.innerHTML = '<div class="lvrow"><span class="lvtag">⭐ Lv.' + L.lv + '</span>' +
        '<span class="lvxp"><i style="width:' + L.pct + '%"></i></span>' +
        '<span class="lvnum">' + (L.need ? L.cur + ' / ' + L.need : 'MAX') + '</span></div>' +
        '<div class="lvhint">' + (L.lv >= RPG_LV_MAX
          ? t('rpg.lvmax', { max: RPG_LV_MAX, n: BH.RPG_POINTS_TOTAL })
          : t('rpg.lvhint', { nx: nx, n: BH.RPG_POINTS_TOTAL })) + '</div>';
    }
    const left = rpgLeft();
    box.innerHTML = RPG_ATTRS.map(function (a) {
      const v = RPG.alloc[a.k] || 0;
      let pips = '';
      for (let i = 0; i < RPG_CAP; i++) pips += '<i class="' + (i < v ? 'on' : '') + '"></i>';
      // v5.48：第 4 格起＝1 點 ＋ 金幣 → 按鈕直接寫這一格的價錢；沒點數就整排鎖住
      const pay = rpgPrice(a.k);
      const buy = v < RPG_CAP && v >= RPG_FREE_PER;
      const noPt = left <= 0;
      const tip = v >= RPG_CAP ? '這一項已經滿了'
        : (buy ? '1 點 ＋ ' + pay + ' 金幣（金幣 ' + (Shop.gold() | 0) + '）' : '1 點（前 3 格免金幣）');
      return '<div class="rpgrow" data-k="' + a.k + '">' +
        '<div class="rpgname">' + a.ico + ' ' + a.n + '</div>' +
        '<div class="rpgpips">' + pips + '</div>' +
        '<div class="rpgstep">' +
        '<button type="button" data-d="-1"' + (v <= 0 ? ' disabled' : '') + '>−</button>' +
        '<b>' + v + '</b>' +
        '<button type="button" data-d="1"' + (buy ? ' class="buypt"' : '') + ' title="' + tip + '"' +
        ((v >= RPG_CAP || noPt) ? ' disabled' : '') + '>' + (buy ? '💰' + pay : '＋') + '</button>' +
        '</div>' +
        '<div class="rpgdesc">' + a.desc + '</div>' +
        '</div>';
    }).join('');
    /* v5.54：原本是「剩餘 <b>N</b> 點 · …」，數字夾在中間讓日／韓文語序翻不動 →
       整句走模板（#rpgLeft 仍在，只是從 <b> 變成 <span>，整句照原色顯示）。 */
    const lf = $id('rpgLeft');
    if (lf) lf.textContent = t('rpg.leftRow', { n: left });
    const ph = $id('rpgPtHint');
    if (ph) ph.textContent = ' · ' + t('rpg.ptHint');
    const sm = $id('rpgSum');
    if (sm) sm.innerHTML = sumHtml();
  }
  function renderChar() {
    const grid = $id('rpgCharRow');
    if (!grid) return;
    grid.innerHTML = CHARACTERS.map(function (c, i) {
      return '<button class="chcard' + (i === RPG.char ? ' sel' : '') + '" data-i="' + i + '" ' +
        'title="' + charName(c) + '（' + c.en + '）· ' + charTag(c) + '">' +
        '<canvas class="chpv" width="220" height="200" data-ch="' + i + '"></canvas>' +
        '<span class="ck">✓</span>' +
        '<span class="cn" style="color:' + shadeHex(c.color, .52) + '">' + charName(c) + '</span>' +
        '<span class="ct">' + charTag(c) + '</span></button>';
    }).join('');
    grid.querySelectorAll('.chcard').forEach(function (b) {
      b.addEventListener('click', function () {
        AudioSys.sfx('click');
        RPG.char = parseInt(b.getAttribute('data-i'), 10) % CHARACTERS.length;
        grid.querySelectorAll('.chcard').forEach(function (x) {
          x.classList.toggle('sel', parseInt(x.getAttribute('data-i'), 10) === RPG.char);
        });
        CharPreview.hop(RPG.char);
        try { RpgUI.openChar(); } catch (e) { console.error('[char]', e); }   // v5.19：選完先看角色畫面
      });
    });
    CharPreview.mount(grid);
  }
  function renderMaps() {
    const th = $id('segRpgTheme'), sb = $id('segRpgMap');
    if (!th || !sb) return;
    th.innerHTML = THEMES.map(function (x, i) {
      return '<button type="button" data-v="' + i + '" class="' + (i === RPG.theme ? 'sel' : '') + '">' + themeName(i) + '</button>';
    }).join('');
    const gate = Cloud.online() ? RPG.unlocked : SOLO_STAGES;
    sb.innerHTML = [0, 1, 2, 3, 4].map(function (i) {
      const st = RPG.theme * BOSS_SLOT + i + 1;
      const boss = i === BOSS_SLOT - 1;
      const m = soloInfo(st);
      const lock = st > gate;
      return '<button type="button" data-v="' + i + '" class="' +
        (i === RPG.sub ? 'sel' : '') + (lock ? ' lock' : '') + (boss ? ' boss' : '') + '"' + (lock ? ' disabled' : '') + '>' +
        (RPG.theme + 1) + '-' + (i + 1) + '　' + (boss ? '👑 ' + t('stage.bossName') : mapName(m)) + (lock ? ' 🔒' : '') + '</button>';
    }).join('');
  }
  function wire() {
    if (inited) return;
    inited = true;
    const rows = $id('rpgRows');
    if (rows) rows.addEventListener('click', function (e) {
      const b = e.target && e.target.closest ? e.target.closest('button') : null;
      if (!b || b.disabled) return;
      const row = b.closest('.rpgrow');
      if (!row) return;
      const k = row.getAttribute('data-k');
      const d = parseInt(b.getAttribute('data-d'), 10);
      // v4.1：真正扣點在後端（/api/rpg/spend），前端只送「哪一項、加或減」
      rpgAdjust(k, d);
    });
    const th = $id('segRpgTheme'), sb = $id('segRpgMap');
    if (th) th.addEventListener('click', function (e) {
      const b = e.target && e.target.closest ? e.target.closest('button') : null;
      if (!b) return;
      RPG.theme = parseInt(b.getAttribute('data-v'), 10) || 0;
      RPG.sub = 0;
      AudioSys.sfx('click');
      renderMaps();
    });
    if (sb) sb.addEventListener('click', function (e) {
      const b = e.target && e.target.closest ? e.target.closest('button') : null;
      if (!b) return;
      RPG.sub = parseInt(b.getAttribute('data-v'), 10) || 0;
      AudioSys.sfx('click');
      renderMaps();
    });
    // v5.20：全部退回（洗點）· v5.46：退還花掉的金幣（扣 1000 手續費）
    const rsBtn = $id('btnRpgRespec');
    if (rsBtn) rsBtn.addEventListener('click', function () {
      AudioSys.ensure(); AudioSys.sfx('click');
      if (rpgSum(RPG.alloc) <= 0) { toast(t('respec.none'), 1.8); return; }
      const info = rpgRespecInfo();
      const ask = info.fee > 0
        ? t('respec.confirm2', { refund: info.refund, fee: info.fee, back: info.back })
        : t('respec.confirm');
      if (typeof confirm === 'function' && !confirm(ask)) return;
      const done = function () {
        const r = rpgRespecApply(info);   // v5.46：用「問雲端之前」就算好的金額，雲端回來 paid 已歸零
        renderStats();
        toast(r.back > 0 ? t('respec.done2', { back: r.back }) : t('respec.done'), 2.4);
      };
      if (Cloud.online()) {
        Cloud.respec().then(function (r) { if (r) done(); else toast(t('respec.fail'), 2.4); });
      } else done();
    });
    const rndBtn = $id('btnRpgRandom');
    if (rndBtn) rndBtn.addEventListener('click', function () {
      AudioSys.ensure(); AudioSys.sfx('click');
      rpgRandomAlloc();
      renderStats();
      if (Cloud.online()) Cloud.setAlloc(RPG.alloc);   // 由後端驗證點數上限
    });
    const go = $id('btnRpgStart');
    if (go) go.addEventListener('click', function () {
      AudioSys.ensure(); AudioSys.sfx('click');
      if (Cloud.online()) Cloud.setAlloc(RPG.alloc);
      RpgUI.openCamp();          // v5.19：配完點 → 營地（買補給、學招式、選關）
    });
  }
  function render() {
    wire();
    renderChar();
    renderStats();
    renderMaps();
  }
  return { render: render, renderStats: renderStats, renderMaps: renderMaps, renderChar: renderChar };
      })();
    } catch (__e) {
      __bootFail('Rpg', __e);
      return (typeof __stubModule === 'function') ? __stubModule('Rpg') : {};
    }
  })();
// 首頁的「RPG 模式」鈕：先建表單再切畫面（事件只在這裡綁，避免雞生蛋）
  try {
(function () {
  const btn = $id('btnRpg');
  if (!btn) return;
  btn.addEventListener('click', function () {
    AudioSys.ensure(); AudioSys.sfx('click');
    if (!ensureNickname()) return;
    // v4.21：先切畫面再畫表單 —— 舊版 render() 一丟例外，畫面就完全不會切
    Screen.show('rpg');
    try { Rpg.render(); }
    catch (e) {
      console.error('[rpg]', e);
      try { toast('⚠️ RPG 表單載入失敗：' + ((e && e.message) || e), 3.4); } catch (e2) {}
    }
  });
})();
  } catch (__e) { __bootFail('wire', __e); }


const RpgUI = (function () {
  let shopTab = 'bag', skTab = 'learn';

  /* ---------------- v5.20：演出卡（升級／全破共用） ---------------- */
  const END_KEY = 'bombhero-rpg-end';
  const RpgPop = (function () {
    let timer = 0;
    function hide() {
      const p = $id('rpgPop');
      if (p) p.classList.remove('on');
      if (timer) { clearTimeout(timer); timer = 0; }
    }
    function show(html, opt) {
      opt = opt || {};
      const p = $id('rpgPop'), c = $id('rpgPopCard');
      if (!p || !c) return;
      c.innerHTML = html;
      p.classList.add('on');
      if (timer) clearTimeout(timer);
      timer = 0;
      if (opt.auto !== false) timer = setTimeout(hide, opt.ms || 2600);
      try { AudioSys.sfx(opt.sfx || 'win'); } catch (e) {}
      const b = c.querySelector('.rgo');
      if (b) b.addEventListener('click', function () {
        try { AudioSys.sfx('click'); } catch (e) {}
        hide();
        if (opt.onGo) { try { opt.onGo(); } catch (e) {} }
      });
      // 點卡片以外的暗處也可以關（pointer-events 在容器上是 none，這裡只是保險）
      p.addEventListener('click', function (e) { if (e.target === p) hide(); });
    }
    return { show: show, hide: hide };
  })();

  /* 升級：把「升了幾級、多了幾點」講清楚 —— 這一代的成長感有一半在這裡 */
  function levelUp(lvUp, lvNow) {
    const up = (lvUp && lvUp.up) | 0;
    if (up <= 0) return;
    const pts = Math.floor(up / 2);
    const skBefore = rpgSkPts() - Math.floor(lvNow / RPG_SK_PER);
    const skGain = Math.max(0, rpgSkPts() - Math.max(0, skBefore + Math.floor((lvNow - up) / RPG_SK_PER)));
    RpgPop.show(
      '<div class="rk">LEVEL UP</div>' +
      '<div class="rt">Lv.' + lvNow + '</div>' +
      '<div class="rs">' + t('lvl.sub', { n: up }) + '</div>' +
      '<div class="rgrid">' +
      '<div><b>+' + pts + '</b><span>' + t('lvl.pts') + '</span></div>' +
      '<div><b>+' + skGain + '</b><span>' + t('lvl.sk') + '</span></div>' +
      '</div>' +
      '<button class="rgo" type="button">' + t('lvl.ok') + '</button>',
      { ms: 2800, sfx: 'victory' }
    );
  }

  /* 全破：32 關走完給一張成績單。只彈一次（之後重打就用 toast）。 */
  function finish() {
    let seen = 0;
    try { seen = localStorage.getItem(END_KEY) | 0; } catch (e) {}
    const L = rpgLvOf(RPG.xp);
    let skN = 0;
    const sk = RPG.sk || {};
    for (const k in sk) if (sk[k] > 0) skN++;
    const pm = rpgPerm();
    const permN = (pm.hp | 0) + (pm.bomb | 0) + (pm.fire | 0);
    const body =
      '<div class="rk">' + (seen ? t('end.replayK') : t('end.k')) + '</div>' +
      '<div class="rt">' + (seen ? t('end.replayT') : t('end.t')) + '</div>' +
      '<div class="rs">' + t('end.sub') + '</div>' +
      '<div class="rgrid">' +
      '<div><b>Lv.' + L.lv + '</b><span>' + t('end.lv') + '</span></div>' +
      '<div><b>' + String(RPG.xp | 0).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '</b><span>' + t('end.xp') + '</span></div>' +
      '<div><b>' + skN + ' / 10</b><span>' + t('end.sk') + '</span></div>' +
      '<div><b>' + permN + ' / 9</b><span>' + t('end.perm') + '</span></div>' +
      '</div>' +
      '<button class="rgo" type="button">' + t('end.ok') + '</button>';
    RpgPop.show(body, { ms: seen ? 4200 : 0, auto: !seen, sfx: 'victory', onGo: function () { openChar(); } });
    try { localStorage.setItem(END_KEY, '1'); } catch (e) {}
  }

  /* v5.20：營地樂觀鎖 —— 兩台裝置的購買紀錄取聯集，不是「後寫的贏」 */
  function campMerge(local, remote) {
    const a = local || {}, b = remote || {};
    const out = { perm: {}, sk: {}, skLoad: [], bag: {} };
    ['hp', 'bomb', 'fire'].forEach(function (k) {
      out.perm[k] = Math.max((a.perm && a.perm[k]) | 0, (b.perm && b.perm[k]) | 0);
    });
    const keys = {};
    [a.sk || {}, b.sk || {}].forEach(function (o) { for (const k in o) keys[k] = 1; });
    for (const k in keys) out.sk[k] = Math.max((a.sk && a.sk[k]) | 0, (b.sk && b.sk[k]) | 0);
    // 出戰欄：先看本地（玩家剛編排的），再補遠端學過的主動招
    const lo = (a.skLoad || []).filter(function (id) { return out.sk[id] > 0; });
    (b.skLoad || []).forEach(function (id) {
      if (lo.length < RPG_SK_SLOTS && out.sk[id] > 0 && lo.indexOf(id) < 0) lo.push(id);
    });
    out.skLoad = lo.slice(0, RPG_SK_SLOTS);
    const bk = {};
    [a.bag || {}, b.bag || {}].forEach(function (o) { for (const k in o) bk[k] = 1; });
    for (const k in bk) out.bag[k] = Math.max((a.bag && a.bag[k]) | 0, (b.bag && b.bag[k]) | 0);
    return out;
  }

  function saveCamp() {
    const st = { perm: rpgPerm(), sk: RPG.sk || {}, skLoad: rpgLoadout(), bag: RPG.bag || {} };
    try { localStorage.setItem('bombhero-rpg-camp', JSON.stringify(st)); } catch (e) {}
    /* v5.19：在線時推給伺服器（離線只寫 localStorage，不擋操作） */
    try { if (typeof Cloud !== 'undefined' && Cloud.campSave) Cloud.campSave(st); } catch (e) {}
  }

  function titleBadge() {
    let tt = null;
    try { tt = Ach.titleOf(); } catch (e) { tt = null; }
    if (!tt || !tt.name) return '';
    const bg = tt.bg || (tt.canvasFill ? 'linear-gradient(135deg,#2b1650,#7b4bd4)' : '#243252');
    const fg = tt.color || tt.canvasText || '#eaf2ff';
    const line = tt.frame ? ';border:2px solid transparent;background-clip:padding-box' : '';
    return '<span class="ttbadge" style="background:' + bg + ';color:' + fg + line + '">' +
      (tt.ico || '🏷️') + ' ' + tt.name + '</span>';
  }

  function clearedCount() {
    const c = (RPG.cleared | 0) || Math.max(0, (RPG.unlocked | 0) - 1);
    return Math.max(0, Math.min(SOLO_STAGES, c));
  }

  /* ---------------- 角色畫面 ---------------- */
  function renderChar() {
    const i = rpgCharIdx(), c = CHARACTERS[i];
    const cv = $id('charPv');
    if (cv && cv.setAttribute) cv.setAttribute('data-ch', String(i));
    try { CharPreview.mount($id('scr-char')); } catch (e) {}

    const L = rpgLvOf(RPG.xp);
    const d = rpgDerive(RPG.alloc, { lv: L.lv });
    const tal = rpgTalent();
    const bn = rpgBonus();

    if ($id('charLv')) $id('charLv').textContent = 'Lv.' + L.lv;
    if ($id('charName')) {
      // 中文語系顯示「中文名 英文名」，其他語言只顯示譯名（否則會變成 BIBI the Rabbit Rabbit）
      const nm = charName(c);
      $id('charName').textContent = (BH.LANG === 'zh-TW' || BH.LANG === 'zh-CN') ? (nm + ' ' + (c.en || '')) : nm;
    }
    if ($id('charTag')) $id('charTag').textContent = charTag(c);
    if ($id('charTalent')) $id('charTalent').textContent = '✦ ' + tr(tal.n);
    if ($id('charTalentTxt')) $id('charTalentTxt').textContent = tr(tal.d);
    if ($id('charTitle')) $id('charTitle').innerHTML = titleBadge();
    if ($id('charXpFill')) $id('charXpFill').style.width = L.pct + '%';
    if ($id('charXpNum')) $id('charXpNum').textContent = L.need ? (L.cur + ' / ' + L.need) : 'MAX';

    const bombs = Math.min(8, 1 + bn.bomb + (tal.bomb | 0));
    const rows = [
      ['❤️', t('d.attr.hp'), d.maxHp, t('d.u.pt')],
      ['🛡️', t('d.attr.def'), d.armor, t('d.u.pt')],
      ['👟', t('d.attr.spd'), '+' + Math.round((d.spdMul - 1) * 100) + '%', ''],
      ['💥', t('d.attr.atk'), d.dmg, t('d.u.pt')],
      ['🔥', t('d.attr.range'), d.range, t('d.u.tile')],
      ['💣', t('d.attr.bomb'), bombs, t('d.u.bomb')]
    ];
    if ($id('charStats')) {
      $id('charStats').innerHTML = rows.map(function (r) {
        return '<div class="chstat"><span class="i">' + r[0] + '</span><span class="l">' + r[1] + '</span>' +
          '<span class="v">' + r[2] + '<small>' + r[3] + '</small></span></div>';
      }).join('');
    }

    const lo = rpgLoadout();
    if ($id('charSk')) {
      let h = '';
      for (let k = 0; k < RPG_SK_SLOTS; k++) {
        const id = lo[k], def = id ? rpgSkDef(id) : null, lv = id ? rpgSkLv(id) : 0;
        h += '<div class="chslot' + (def ? '' : ' off') + '" title="' + (def ? def.n + ' Lv.' + lv : '尚未學習') + '">' +
          (def ? def.ico : '＋') + (lv ? '<em>' + lv + '</em>' : '') + '</div>';
      }
      $id('charSk').innerHTML = h;
    }
    if ($id('charSkHint')) {
      $id('charSkHint').textContent = rpgSkLeft() > 0
        ? t('skill.ptsLeft', { n: rpgSkLeft() }) : t('char.skHint');
    }
    /* v5.74：角色專屬技原本只寫在 aria-label 裡 —— 玩家在角色頁看不到「這隻會什麼」，
       等於八個角色還是只差一行天賦。補一張小卡：圖示＋名稱＋說明＋冷卻。 */
    if ($id('charSkBody')) {
      const sd = RpgSkill.charDef();
      $id('charSkBody').innerHTML =
        '<span class="icsk">' + sd.ico + '</span>' +
        '<span class="txsk"><b>' + escHtml(tr(sd.n)) + '</b>' +
        '<i>' + escHtml(tr(sd.d)) + '</i></span>';
    }
    if ($id('charSkC')) $id('charSkC').textContent = t('skill.cdOnly', { s: RpgSkill.charDef().cd });

    const cr = clearedCount();
    if ($id('charProgTxt')) $id('charProgTxt').textContent = cr + ' / ' + SOLO_STAGES;
    if ($id('charProg')) {
      let h = '';
      for (let g = 0; g < 8; g++) {
        h += '<div class="chgrp">';
        for (let k = 0; k < BOSS_SLOT; k++) h += '<i class="' + (g * BOSS_SLOT + k + 1 <= cr ? 'on' : '') + '"></i>';
        h += '<span>' + (g + 1) + '</span></div>';
      }
      $id('charProg').innerHTML = h;
    }
  }

  function openChar() {
    Screen.show('char');            // v5.19：先顯示，canvas 才有版面尺寸可以掛
    try { renderChar(); } catch (e) { console.error('[char]', e); }
  }

  /* ---------------- 營地 ---------------- */
  function renderCamp() {
    if ($id('campGold')) $id('campGold').textContent = String(Shop.gold() | 0);
    if ($id('campSkPts')) $id('campSkPts').textContent = t('skill.ptsLeft', { n: rpgSkLeft() });
    try { Rpg.renderMaps(); } catch (e) {}
    const st = RPG.theme * BOSS_SLOT + RPG.sub + 1;   /* v5.39：每章 5 關（含 BOSS），原本 ×4 會整章錯位 */
    if ($id('campStageNow')) {
      $id('campStageNow').textContent = t('camp.stageNow', { n: st }) + '・' + stageName(st);
    }
    const bag = RPG.bag || {};
    let h = '';
    RPG_BAG.forEach(function (it) {
      const c = bag[it.id] | 0;
      if (c > 0) h += '<span class="bagit">' + it.ico + ' ' + it.n + ' <b>×' + c + '</b></span>';
    });
    if ($id('campBag')) {
      $id('campBag').innerHTML = h
        ? t('camp.bagHave') + h
        : t('camp.bagNone');
    }
  }

  function openCamp() {
    try { renderCamp(); } catch (e) { console.error('[camp]', e); }
    Screen.show('camp');
  }

  /* ---------------- 商店 ---------------- */
  function renderShop() {
    const modal = $id('rpgShopModal');
    if (!modal) return;
    if ($id('shopRGold')) $id('shopRGold').textContent = '💰 ' + (Shop.gold() | 0);
    modal.querySelectorAll('#shopRTabs button').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-shtab') === shopTab);
    });
    const body = $id('shopRBody');
    if (!body) return;

    if (shopTab === 'bag') {
      body.innerHTML = RPG_BAG.map(function (it) {
        const own = rpgBagCount(it.id);
        const can = Shop.gold() >= it.price;
        return '<div class="shopitem">' +
          '<div class="si">' + it.ico + '</div>' +
          '<div class="sm"><div class="sn">' + tr(it.n) + (own ? '<span style="color:#b9641c;font-size:11px"> ×' + own + '</span>' : '') + '</div>' +
          '<div class="sd">' + tr(it.desc) + '</div></div>' +
          '<div class="sp">💰 ' + it.price + '</div>' +
          '<button class="buy" data-buybag="' + it.id + '"' + (can && own < 9 ? '' : ' disabled') + '>' +
          (can ? t('shop.buy') : t('shop.noGold')) + '</button></div>';
      }).join('');
    } else {
      body.innerHTML = RPG_PERM_UP.map(function (up) {
        const lv = rpgPerm()[up.id] | 0;
        const price = lv < 3 ? up.prices[lv] : 0;
        let pips = '';
        for (let i = 0; i < 3; i++) pips += '<i class="' + (i < lv ? 'on' : '') + '"></i>';
        return '<div class="shopitem">' +
          '<div class="si">' + up.ico + '</div>' +
          '<div class="sm"><div class="sn">' + tr(up.n) + ' <span style="color:#a0805c;font-size:11px">Lv.' + lv + ' / 3</span></div>' +
          '<div class="sd">' + t('shop.permLine', { u: up.unit }) + '</div>' +
          '<div class="pips" style="display:flex;gap:3px;margin-top:5px">' + pips.replace(/<i/g, '<i style="width:13px;height:5px;border-radius:3px;display:inline-block"') + '</div></div>' +
          '<div class="sp">' + (lv >= 3 ? t('shop.full') : '💰 ' + price) + '</div>' +
          '<button class="buy' + (lv >= 3 ? ' max' : '') + '" data-buyperm="' + up.id + '"' +
          (lv >= 3 || Shop.gold() < price ? ' disabled' : '') + '>' + (lv >= 3 ? 'MAX' : t('shop.upgrade')) + '</button></div>';
      }).join('');
    }
    if ($id('shopRNote')) {
      $id('shopRNote').textContent = shopTab === 'bag' ? t('shop.note') : t('shop.notePerm');
    }
  }

  function openShop(tab) {
    shopTab = tab || 'bag';
    renderShop();
    $id('rpgShopModal').classList.add('on');
    AudioSys.sfx('click');
  }

  function buyBag(id) {
    let it = null;
    RPG_BAG.forEach(function (x) { if (x.id === id) it = x; });
    if (!it) return;
    if (rpgBagCount(id) >= 9) return;
    const r = Shop.spend(it.price);
    if (!r.ok) { toast('💰 金幣不足（還差 ' + Math.max(0, it.price - Shop.gold()) + '）', 2); AudioSys.sfx('hurt'); return; }
    RPG.bag = RPG.bag || {};
    RPG.bag[id] = Math.min(9, (RPG.bag[id] | 0) + 1);
    AudioSys.sfx('item');
    saveCamp(); renderShop(); renderCamp();
  }

  function buyPerm(id) {
    let up = null;
    RPG_PERM_UP.forEach(function (x) { if (x.id === id) up = x; });
    if (!up) return;
    const lv = rpgPerm()[id] | 0;
    if (lv >= 3) return;
    const price = up.prices[lv];
    const r = Shop.spend(price);
    if (!r.ok) { toast('💰 金幣不足（還差 ' + Math.max(0, price - Shop.gold()) + '）', 2); AudioSys.sfx('hurt'); return; }
    rpgPerm()[id] = lv + 1;
    AudioSys.sfx('item');
    toast('⬆️ ' + up.n + ' 升到 Lv.' + (lv + 1), 1.8);
    saveCamp(); renderShop(); renderCamp(); renderChar();
  }

  /* ---------------- 招式師 ---------------- */
  function renderSkill() {
    if ($id('skillRPts')) {
      $id('skillRPts').textContent = t('skill.pts', { a: rpgSkLeft(), b: rpgSkPts() });
    }
    document.querySelectorAll('#skillTabs button').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-sktab') === skTab);
    });
    const body = $id('skillRBody');
    if (!body) return;
    const lvNow = rpgLvOf(RPG.xp).lv;

    if (skTab === 'learn') {
      /* 依等級升冪 —— 列表就是玩家的學習路徑，一眼看得出「下一招在哪」 */
      const list = RPG_SKILLS.slice().sort(function (a, b) {
        return (a.lv - b.lv) || (a.kind === b.kind ? 0 : (a.kind === 'act' ? -1 : 1));
      });
      body.innerHTML = list.map(function (sk) {
        const cur = rpgSkLv(sk.id), maxed = cur >= sk.max;
        const lock = lvNow < sk.lv;
        let pips = '';
        for (let i = 0; i < sk.max; i++) pips += '<i class="' + (i < cur ? 'on' : '') + '"></i>';
        /* 下一級的文字直接由 CDS／DUR 兩張表生成（單一來源，不必再為每個語言翻譯 12 條成長字串） */
        let nextDesc;
        if (sk.kind !== 'act') {
          nextDesc = 'Lv.' + Math.min(sk.max, cur + 1);
        } else {
          const i2 = Math.min(cur, sk.max - 1);
          const cd = (RpgSkill.CDS[sk.id] || [0, 0, 0])[i2] || 0;
          const du = (RpgSkill.DUR[sk.id] || null);
          nextDesc = du ? t('skill.durCd', { d: du[i2], c: cd }) : t('skill.cdOnly', { s: cd });
        }
        return '<div class="skrow ' + (sk.kind === 'act' ? 'act' : '') + (lock ? ' lock' : '') + '">' +
          '<div class="si">' + sk.ico + '</div>' +
          '<div class="sm"><div class="sn">' + tr(sk.n) +
          '<span class="stag' + (sk.kind === 'act' ? '' : ' p') + '">' +
          (sk.kind === 'act' ? t('skill.act') : t('skill.pas')) + ' ' + cur + '/' + sk.max + '</span></div>' +
          '<div class="sd">' + tr(sk.desc) + '</div>' +
          (maxed ? '' : '<div class="sdn">' + t('skill.next', { v: nextDesc }) + '</div>') +
          '<div class="pips">' + pips + '</div></div>' +
          '<button class="buy' + (maxed ? ' max' : lock ? ' lk' : '') + '" data-learn="' + sk.id + '"' +
          (maxed || lock || rpgSkLeft() <= 0 ? ' disabled' : '') + '>' +
          (maxed ? t('skill.max') : lock ? '🔒 Lv.' + sk.lv : t('skill.onePt')) + '</button></div>';
      }).join('');
    } else {
      const lo = rpgLoadout();
      let h = '';
      for (let i = 0; i < RPG_SK_SLOTS; i++) {
        const id = lo[i], def = id ? rpgSkDef(id) : null;
        h += '<div class="loadslot"><div class="pin">' + (def ? def.ico : '＋') + '</div>' +
          '<div class="n">' + (def ? tr(def.n) : t('skill.empty')) +
          '<small>' + (def ? t('skill.hotkey', { k: ['Q', 'R', 'F', 'V'][i] }) : t('skill.pickBelow')) + '</small></div>' +
          (def ? '<button data-unslot="' + id + '">' + t('skill.remove') + '</button>' : '') + '</div>';
      }
      h += '<div class="chsec-t" style="margin:14px 0 8px">' + t('skill.ownActives') + '</div>';
      const own = rpgSkActives().filter(function (x) { return rpgSkLv(x.id) > 0; });
      if (!own.length) h += '<div class="sd" style="color:#a0805c">' + t('skill.noneYet') + '</div>';
      own.forEach(function (sk) {
        const inSlot = lo.indexOf(sk.id) >= 0;
        h += '<div class="loadslot"><div class="pin">' + sk.ico + '</div>' +
          '<div class="n">' + tr(sk.n) + ' <small>Lv.' + rpgSkLv(sk.id) + '</small></div>' +
          '<button data-slot="' + sk.id + '" class="' + (inSlot ? 'on' : '') + '">' + (inSlot ? t('skill.equipped') : t('skill.equip')) + '</button></div>';
      });
      body.innerHTML = h;
    }
    if ($id('skillRNote')) {
      $id('skillRNote').textContent = t('skill.note', { a: lvNow, b: rpgSkPts(), c: rpgSkSpent() });
    }
  }

  function openSkill(tab) {
    skTab = tab || 'learn';
    renderSkill();
    $id('rpgSkillModal').classList.add('on');
    AudioSys.sfx('click');
  }

  function learn(id) {
    const sk = rpgSkDef(id);
    if (!sk) return;
    const cur = rpgSkLv(id);
    if (cur >= sk.max) return;
    if (rpgLvOf(RPG.xp).lv < sk.lv) { toast('🔒 需要 Lv.' + sk.lv + ' 才能學', 2); return; }
    if (rpgSkLeft() <= 0) { toast('技能點不夠 —— 每 5 級 +1 點', 2); return; }
    RPG.sk[id] = cur + 1;
    if (sk.kind === 'act') {
      const lo = rpgLoadout();
      if (lo.indexOf(id) < 0 && lo.length < RPG_SK_SLOTS) lo.push(id);
      RPG.skLoad = lo.slice(0, RPG_SK_SLOTS);
    }
    AudioSys.sfx('item');
    toast('📖 學會 ' + sk.n + ' Lv.' + (cur + 1), 1.8);
    saveCamp(); renderSkill(); renderChar(); renderCamp();
    try { RpgSkill.syncBar(); } catch (e) {}
  }

  function toggleSlot(id) {
    const lo = rpgLoadout();
    const at = lo.indexOf(id);
    if (at >= 0) lo.splice(at, 1);
    else if (lo.length < RPG_SK_SLOTS) lo.push(id);
    else { toast('4 個欄位都滿了 —— 先移除一個', 2); return; }
    RPG.skLoad = lo.slice(0, RPG_SK_SLOTS);
    AudioSys.sfx('click');
    saveCamp(); renderSkill(); renderChar();
    try { RpgSkill.syncBar(); } catch (e) {}
  }

  /* ---------------- 出發 ---------------- */
  function depart() {
    const st = RPG.theme * BOSS_SLOT + RPG.sub + 1;   /* v5.39：每章 5 關（含 BOSS），原本 ×4 會整章錯位 */
    if (Cloud.online() && st > RPG.unlocked) { toast(t('acct.stageLocked')); return; }
    AudioSys.ensure(); AudioSys.sfx('click');
    if (Cloud.online()) Cloud.setAlloc(RPG.alloc);
    const buffs = rpgTakeBag();
    saveCamp();
    startRpg(st, { buffs: buffs });
  }

  /* ---------------- 事件 ---------------- */
  function wire() {
    const on = function (id, ev, fn) {
      const el = $id(id);
      if (el) el.addEventListener(ev, fn);
    };
    on('charGo', 'click', function () { AudioSys.sfx('click'); openCamp(); });
    on('charAlloc', 'click', function () {
      AudioSys.sfx('click');
      Screen.show('rpg');
      try { Rpg.render(); } catch (e) {}
    });
    on('charSwap', 'click', function () {
      AudioSys.sfx('click');
      Screen.show('rpg');
      try { Rpg.render(); } catch (e) {}
      try { toast('👇 選一張角色卡就換人', 1.8); } catch (e) {}
    });
    on('campBack', 'click', function () { AudioSys.sfx('click'); openChar(); });
    on('campGo', 'click', depart);
    on('npcShop', 'click', function () { openShop('bag'); });
    on('npcSkill', 'click', function () { openSkill('learn'); });
    on('btnChar', 'click', function () {
      AudioSys.ensure(); AudioSys.sfx('click');
      if (!ensureNickname()) return;
      openChar();
    });

    on('shopRX', 'click', function () { $id('rpgShopModal').classList.remove('on'); renderCamp(); });
    on('shopRDone', 'click', function () { $id('rpgShopModal').classList.remove('on'); renderCamp(); });
    on('skillRX', 'click', function () { $id('rpgSkillModal').classList.remove('on'); renderChar(); });
    on('skillRDone', 'click', function () { $id('rpgSkillModal').classList.remove('on'); renderChar(); });

    const st = $id('shopRTabs');
    if (st) st.addEventListener('click', function (e) {
      const b = e.target.closest('button'); if (!b) return;
      shopTab = b.getAttribute('data-shtab') || 'bag';
      AudioSys.sfx('click'); renderShop();
    });
    const kt = $id('skillTabs');
    if (kt) kt.addEventListener('click', function (e) {
      const b = e.target.closest('button'); if (!b) return;
      skTab = b.getAttribute('data-sktab') || 'learn';
      AudioSys.sfx('click'); renderSkill();
    });
    const sb = $id('shopRBody');
    if (sb) sb.addEventListener('click', function (e) {
      const b = e.target.closest('button'); if (!b) return;
      if (b.getAttribute('data-buybag')) buyBag(b.getAttribute('data-buybag'));
      else if (b.getAttribute('data-buyperm')) buyPerm(b.getAttribute('data-buyperm'));
    });
    const kb = $id('skillRBody');
    if (kb) kb.addEventListener('click', function (e) {
      const b = e.target.closest('button'); if (!b) return;
      if (b.getAttribute('data-learn')) learn(b.getAttribute('data-learn'));
      else if (b.getAttribute('data-slot')) toggleSlot(b.getAttribute('data-slot'));
      else if (b.getAttribute('data-unslot')) toggleSlot(b.getAttribute('data-unslot'));
    });

    // 首次載入本機快取（雲端回來時 adopt 會再覆蓋一次）
    try {
      const raw = localStorage.getItem('bombhero-rpg-camp');
      if (raw) rpgApplyCamp(JSON.parse(raw));
    } catch (e) {}
  }

  return {
    wire: wire, openChar: openChar, renderChar: renderChar,
    openCamp: openCamp, renderCamp: renderCamp,
    openShop: openShop, renderShop: renderShop,
    openSkill: openSkill, renderSkill: renderSkill,
    buyBag: buyBag, buyPerm: buyPerm, learn: learn, toggleSlot: toggleSlot,
    saveCamp: saveCamp, applyCamp: rpgApplyCamp, depart: depart,
    levelUp: levelUp, finish: finish, pop: RpgPop, campMerge: campMerge
  };
})();
  /* ---- 交回主檔 ---- */
  if (MISS.length) {
    window.__BHRPG_MISSING = MISS;
    console.warn('[rpg] 缺少依賴：' + MISS.join(', ') + '（RPG 介面可能不完整）');
  }
  try { BH.__installRpg({ Rpg: Rpg, RpgUI: RpgUI }); }
  catch (e) { console.error('[rpg] install 失敗', e); }
})();
