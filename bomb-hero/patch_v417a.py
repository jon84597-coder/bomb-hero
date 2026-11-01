# -*- coding: utf-8 -*-
"""v4.17 patch A：商店（隨從）—— HTML / CSS / Shop 模組 / 金幣"""
import io

P = 'index.html'
src = io.open(P, encoding='utf-8', newline='').read()
s = src.replace('\r\n', '\n')
rules = []

def R(name, old, new, cnt=1):
    rules.append((name, old, new, cnt))

# ---------- 1. 首頁按鈕文案 ----------
R('首頁商店按鈕改成可買隨從',
  '''        <button class="mbtn storebtn" id="btnStore">🛒 商店<small>未來開放 · 道具／造型兌換</small></button>''',
  '''        <button class="mbtn storebtn" id="btnStore">🛒 商店<small>隨從 1000 金幣 · 單人／RPG 幫打</small></button>''')

# ---------- 2. 商店畫面 HTML ----------
R('新增商店畫面',
  '''  <!-- RPG 模式（v4.0 測試版） -->''',
  '''  <!-- 商店（v4.17 開放：隨從） -->
  <div class="screen" id="scr-shop">
    <div class="card">
      <h2>🛒 商店</h2>
      <div class="desc" id="shopDesc"></div>
      <div class="shopwallet"><span>💰</span><b id="shopWallet">0</b><span class="swhint" id="shopGoldHint"></span></div>
      <div class="shopgrid" id="shopGrid"></div>
      <div class="hint" id="shopHint"></div>
      <div class="rowbtns"><button class="ghostbtn" data-back="1">← 回主選單</button></div>
    </div>
  </div>

  <!-- RPG 模式（v4.0 測試版） -->''')

# ---------- 3. CSS ----------
R('商店卡片樣式',
  '''  .mbtn.storebtn:hover { transform: none; border-color: #d8c07a; box-shadow: none; }''',
  '''  .mbtn.storebtn:hover { transform: none; border-color: #d8c07a; box-shadow: none; }
  /* v4.17：商店 —— 隨從卡片（可買／已雇用／金幣不足三態） */
  .shopwallet { display: flex; align-items: center; gap: 8px; justify-content: center;
                margin: 4px 0 12px; font-size: 18px; color: #ffe6a8; font-weight: 900; }
  .shopwallet b { font-size: 23px; letter-spacing: .5px; }
  .shopwallet .swhint { font-size: 11px; font-weight: 400; opacity: .72; }
  .shopgrid { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); }
  .shopcard { border: 1px solid #2f3d5e; border-radius: 14px; background: rgba(10,16,30,.66);
              padding: 12px 12px 11px; display: flex; flex-direction: column; gap: 7px; }
  .shopcard.owned { border-color: #46d68c; box-shadow: inset 0 0 0 1px rgba(70,214,140,.35); }
  .shopcard .shhead { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 900; color: #ffe6c2; }
  .shopcard .shico { font-size: 22px; line-height: 1; }
  .shopcard .shdesc { font-size: 11.5px; line-height: 1.6; color: #b9c6e0; min-height: 56px; }
  .shopcard .shfoot { display: flex; align-items: center; gap: 8px; margin-top: auto; }
  .shopcard .shprice { font-size: 13px; font-weight: 900; color: #ffd166; white-space: nowrap; }
  .shopcard .shbuy { flex: 1; border: 0; border-radius: 999px; padding: 9px 10px; font-weight: 900;
                     font-size: 13px; cursor: pointer; color: #2a1c00;
                     background: linear-gradient(180deg,#ffd977,#e59a1c); }
  .shopcard .shbuy:disabled { background: #2b3348; color: #6f7b96; cursor: default; }
  .shopcard .shbuy.owned { background: #1d3a2c; color: #7ef0b4; }
  @media (max-width: 560px) {
    .shopgrid { grid-template-columns: 1fr; }
    .shopcard .shdesc { min-height: 0; }
  }''')

# ---------- 4. 商店按鈕改成開啟畫面 ----------
R('商店按鈕開啟商店畫面',
  '''  const store = $id('btnStore');
  if (store) store.addEventListener('click', function () {
    AudioSys.ensure(); AudioSys.sfx('click');
    toast('🛒 商店正在準備中 —— 之後可以用金幣換道具與造型，敬請期待！', 2.8);
  });''',
  '''  const store = $id('btnStore');
  if (store) store.addEventListener('click', function () {
    AudioSys.ensure(); AudioSys.sfx('click');
    Shop.open();                       // v4.17：商店正式開放（隨從）
  });''')

# ---------- 5. Shop 模組 ----------
SHOP_JS = '''// ================================================================
//   v4.17：商店 —— 隨從（只出現在「單人闖關」與「RPG 模式」）
//   三種隨從各 1000 金幣，買了就常駐在主角旁邊：
//     ① 刀客：怪物進入 2 格就衝上去揮刀（1 格範圍、冷卻 2 秒、有刀光＋音效）
//     ② 投彈：幫你朝怪物丟炸彈（冷卻 3 秒、一次一顆、火焰不燒主人）
//     ③ 格檔：不攻擊，主動擋在怪前面；擋一次原地休息 3 秒
// ================================================================
const PET_KINDS = [
  { key: 'blade', ico: '⚔️', name: '刀客隨從', price: 1000,
    desc: '怪物靠近 2 格就衝上去揮刀（1 格範圍），冷卻 2 秒。揮刀有刀光與音效，單人模式一刀一隻。' },
  { key: 'bomber', ico: '💣', name: '投彈隨從', price: 1000,
    desc: '幫你朝怪物丟炸彈（冷卻 3 秒、一次一顆）。自己人不會被這顆炸到，放心讓它支援。' },
  { key: 'guard', ico: '🛡️', name: '格檔隨從', price: 1000,
    desc: '不攻擊，主動擋在怪物前面替你和怪物硬碰；擋一次要原地休息 3 秒。單人模式可以擋三下。' }
];
function petKind(key) {
  for (let i = 0; i < PET_KINDS.length; i++) if (PET_KINDS[i].key === key) return PET_KINDS[i];
  return null;
}
const Shop = (function () {
  const KEY = 'bombhero-pets', GKEY = 'bombhero-gold', SKEY = 'bombhero-gold-synced';
  let owned = [], gold = 0;

  function load() {
    try { owned = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { owned = []; }
    if (!Array.isArray(owned)) owned = [];
    owned = owned.filter(function (o) { return o && petKind(o.kind); }).map(function (o) {
      return { kind: o.kind, ch: Math.abs(o.ch | 0) % CHARACTERS.length };
    });
    // 同一種只留一隻
    const seen = {};
    owned = owned.filter(function (o) {
      if (seen[o.kind]) return false;
      seen[o.kind] = 1; return true;
    });
    try { gold = parseInt(localStorage.getItem(GKEY) || '0', 10) || 0; } catch (e) { gold = 0; }
    if (!isFinite(gold) || gold < 0) gold = 0;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(owned)); } catch (e) {}
    try { localStorage.setItem(GKEY, String(gold)); } catch (e) {}
  }
  // 第一次升到 v4.17：把 RPG 雲端金幣帶進本地錢包（只帶一次，之後各自記帳，
  //   避免「買完重新整理又變成有錢」）
  function syncGold() {
    let done = false;
    try { done = !!localStorage.getItem(SKEY); } catch (e) { return; }
    if (done) return;
    try {
      const g = (typeof RPG !== 'undefined' && RPG.gold) | 0;
      if (g > gold) gold = g;
    } catch (e) {}
    try { localStorage.setItem(SKEY, '1'); } catch (e) {}
    save();
  }
  function addGold(n) {
    n = Math.round(Number(n) || 0);
    if (n <= 0) return gold;
    gold += n; save();
    return gold;
  }
  function has(kind) {
    return owned.some(function (o) { return o.kind === kind; });
  }
  function active() { return owned.slice(); }
  function buy(kind) {
    const k = petKind(kind);
    if (!k) return { ok: false, err: 'NO_KIND' };
    if (has(kind)) return { ok: false, err: 'OWNED' };
    if (gold < k.price) return { ok: false, err: 'GOLD', need: k.price - gold };
    gold -= k.price;
    owned.push({ kind: kind, ch: Math.floor(Math.random() * CHARACTERS.length) });
    save();
    render();
    return { ok: true, kind: kind };
  }
  function render() {
    const grid = $id('shopGrid');
    const w = $id('shopWallet');
    if (w) w.textContent = String(gold | 0);
    const d = $id('shopDesc');
    if (d) d.textContent = '用金幣雇用隨從跟在身邊幫你打怪、撿道具。隨從只在「單人闖關」與「RPG 模式」出場，' +
      '對戰／線上配對不會出現。隨從的動物造型是隨機的。';
    const gh = $id('shopGoldHint');
    if (gh) gh.textContent = '過關獲得（單人與 RPG 都會給）';
    const h = $id('shopHint');
    if (h) h.innerHTML = '被打倒的隨從會坐在地上哭、頭上冒出 <b>Help</b>；主角靠近 <b>5 秒</b>就能救回來。' +
      '每種隨從只能雇用一隻。';
    if (!grid) return;
    grid.innerHTML = PET_KINDS.map(function (k) {
      const own = has(k.key);
      const can = gold >= k.price;
      return '<div class="shopcard' + (own ? ' owned' : '') + '">' +
        '<div class="shhead"><span class="shico">' + k.ico + '</span>' + k.name + '</div>' +
        '<div class="shdesc">' + k.desc + '</div>' +
        '<div class="shfoot"><span class="shprice">💰 ' + k.price + '</span>' +
        '<button class="shbuy' + (own ? ' owned' : '') + '" data-buy="' + k.key + '"' +
        (own || !can ? ' disabled' : '') + '>' +
        (own ? '✔ 已雇用' : (can ? '雇用' : '金幣不足')) + '</button></div></div>';
    }).join('');
    grid.querySelectorAll('[data-buy]').forEach(function (b) {
      b.addEventListener('click', function () {
        AudioSys.ensure();
        const r = buy(b.getAttribute('data-buy'));
        if (r.ok) {
          AudioSys.sfx('item');
          toast('🎉 雇用成功！隨從會在單人／RPG 關卡裡跟著你', 2.6);
        } else if (r.err === 'GOLD') {
          AudioSys.sfx('hurt');
          toast('💰 金幣不足，還差 ' + r.need + ' 枚', 2.2);
        } else if (r.err === 'OWNED') {
          toast('這隻已經雇用過了', 1.8);
        }
      });
    });
  }
  function open() { syncGold(); render(); Screen.show('shop'); }

  load();
  return {
    open: open, render: render, buy: buy, active: active, has: has,
    addGold: addGold, syncGold: syncGold,
    gold: function () { return gold; },
    reset: function () { owned = []; gold = 0; save(); render(); }   // 測試用
  };
})();

'''
R('插入 Shop 模組',
  '''// ================================================================
//   v4.0：RPG 模式
// ================================================================
const RPG_POINTS = 9;''',
  SHOP_JS + '''// ================================================================
//   v4.0：RPG 模式
// ================================================================
const RPG_POINTS = 9;''')

# ---------- 6. 過關給金幣 ----------
R('單人／RPG 過關發金幣',
  '''        const cleared = Game.stage;
        // v4.1：RPG 過關回報後端（伺服器驗證「只能依序過關」，金幣也由後端算）
        if (Game.mode === 'rpg' && typeof Cloud !== 'undefined') Cloud.clearStage(cleared);''',
  '''        const cleared = Game.stage;
        // v4.17：過關發金幣（單人與 RPG 都給；商店買隨從用）
        //   金額公式與雲端 RPG 一致：40 + 每 4 關 +10
        try {
          const gain = 40 + Math.floor((cleared - 1) / 4) * 10;
          Shop.addGold(gain);
          toast('💰 過關獎勵 +' + gain + ' 金幣（共 ' + Shop.gold() + '）', 2.6);
        } catch (e) {}
        // v4.1：RPG 過關回報後端（伺服器驗證「只能依序過關」，金幣也由後端算）
        if (Game.mode === 'rpg' && typeof Cloud !== 'undefined') Cloud.clearStage(cleared);''')

# ---------- 7. 匯出給測試 ----------
R('__BH 匯出商店',
  '''  cartChargeLevel: cartChargeLevel, cartPickLanding: cartPickLanding,''',
  '''  cartChargeLevel: cartChargeLevel, cartPickLanding: cartPickLanding,
  // v4.17：商店與隨從
  Shop: Shop, PET_KINDS: PET_KINDS, petKind: petKind,''')

# ---------- 套用 ----------
for name, old, new, cnt in rules:
    n = s.count(old)
    assert n == cnt, '規則「%s」命中 %d 次（預期 %d）' % (name, n, cnt)
    s = s.replace(old, new)
    print('  ok  ' + name)

io.open(P, 'w', encoding='utf-8', newline='').write(s.replace('\n', '\r\n'))
print('patch A done')
