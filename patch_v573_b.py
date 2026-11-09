# -*- coding: utf-8 -*-
"""v5.73 patch B: 每日特惠（商店）"""
import io, os

P = os.path.join(os.path.dirname(__file__), 'bomb-hero', 'js', 'main.js')
s = io.open(P, 'r', encoding='utf-8', newline='').read()
orig = len(s)

# ---- 1. 在 render() 之前插入 DailyDeal ----
A1 = """  function render() {
    const grid = $id('shopGrid');"""
B1 = """  /* ===== v5.73：每日特惠（Daily Deal）=====================================
     每天 3 件、按日期種子固定、每件限購一次。
     目的：① 讓「每天打開商店」有理由 ② 金幣多一個小出口 ③ 折扣是唯一會
     讓玩家覺得「今天不買就虧了」的機制 —— 比再加一個常駐商品有效得多。
     ====================================================================== */
  const DEAL_KEY = 'bombhero-dailydeal-v1';
  const DailyDeal = (function () {
    let cache = null;
    function dkey() {
      const d = new Date();
      return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    }
    function hash(str) {
      let h = 2166136261;
      for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
      return h >>> 0;
    }
    /* 同一天所有人看到同一組 —— 可以拿來當「今天商店有狼人半價」的討論話題 */
    function rnd(seed) {
      let x = seed | 0;
      return function () {
        x = (Math.imul(x ^ (x >>> 15), 2246822507) + 0x9e3779b9) >>> 0;
        return x / 4294967296;
      };
    }
    function pool() {
      const out = [];
      PET_KINDS.forEach(function (k) {
        if (!has(k.key)) out.push({ kind: 'pet', key: k.key, base: k.price, off: .7 });
        else if (lvOf(k.key) < 5) out.push({ kind: 'petup', key: k.key, base: (k.ups || [])[lvOf(k.key) - 1] | 0, off: .75 });
      });
      out.push({ kind: 'ticket', key: 'ticket', base: TICKET_PRICE, off: .6 });
      out.push({ kind: 'bag', key: 'bag3', base: 1500, off: .65 });
      return out;
    }
    function build() {
      const r = rnd(hash(dkey()));
      const p = pool();
      for (let i = p.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const v = p[i]; p[i] = p[j]; p[j] = v; }
      return {
        day: dkey(),
        items: p.slice(0, 3).map(function (x) {
          return { kind: x.kind, key: x.key, base: x.base, off: x.off, bought: 0 };
        })
      };
    }
    function cur() {
      let st = cache;
      if (!st) {
        try { st = JSON.parse(localStorage.getItem(DEAL_KEY) || 'null'); } catch (e) { st = null; }
      }
      if (!st || st.day !== dkey() || !st.items || st.items.length !== 3) st = build();
      cache = st;
      try { localStorage.setItem(DEAL_KEY, JSON.stringify(st)); } catch (e) {}
      return st;
    }
    function priceOf(it) { return Math.max(1, Math.round(it.base * it.off)); }
    function bagIds() { return ['hp1', 'hp2', 'arm1', 'fire1', 'rem1', 'rev1', 'xray', 'decoy', 'warp']; }
    function buy(i) {
      const st = cur(), it = st.items[i];
      if (!it || it.bought) return { ok: false, err: 'BOUGHT' };
      const price = priceOf(it);
      if (!dev() && gold < price) return { ok: false, err: 'GOLD', need: price - gold };
      let msg = '';
      if (it.kind === 'pet') {
        if (has(it.key)) return { ok: false, err: 'OWNED' };
        if (!dev()) gold -= price;
        owned.push({ kind: it.key, ch: Math.floor(Math.random() * CHARACTERS.length), lv: 1 });
        msg = t('deal.pet');
      } else if (it.kind === 'petup') {
        const lv = lvOf(it.key);
        if (lv >= 5) return { ok: false, err: 'MAX' };
        if (!dev()) gold -= price;
        for (let k = 0; k < owned.length; k++) if (owned[k].kind === it.key) owned[k].lv = lv + 1;
        msg = t('deal.petup');
      } else if (it.kind === 'ticket') {
        if (!dev()) gold -= price;
        tickets++;
        msg = t('deal.ticket');
      } else {
        if (!dev()) gold -= price;
        const all = bagIds();
        for (let k = 0; k < 3; k++) {
          const id = all[(hash(dkey() + '|bag|' + k) >>> 5) % all.length];
          RPG.bag[id] = (RPG.bag[id] | 0) + 1;
        }
        try { RpgUI.saveCamp(); } catch (e) {}
        msg = t('deal.bag');
      }
      it.bought = 1;
      cache = st;
      try { localStorage.setItem(DEAL_KEY, JSON.stringify(st)); } catch (e) {}
      save();
      render();
      return { ok: true, msg: msg };
    }
    function html() {
      const st = cur();
      const cards = st.items.map(function (it, i) {
        const p = priceOf(it);
        const own = it.kind === 'pet' && has(it.key);
        const max = it.kind === 'petup' && lvOf(it.key) >= 5;
        const dis = !!it.bought || own || max;
        let ico = '🎟️', nm = t('deal.ticketN');
        if (it.kind === 'pet' || it.kind === 'petup') {
          const k = petKind(it.key);
          ico = k ? k.ico : '🐾';
          nm = (k ? k.name.split(' · ')[0] : '') + (it.kind === 'petup' ? ' ' + t('deal.lvup') : '');
        } else if (it.kind === 'bag') { ico = '🎒'; nm = t('deal.bagN'); }
        const pct = Math.round((1 - it.off) * 100);
        return '<div class="dealcard' + (dis ? ' off' : '') + '">' +
            '<span class="dealico">' + ico + '</span>' +
            '<span class="dealmeta"><b>' + hesc(nm) + '</b>' +
              '<i>' + t('deal.off', { n: pct }) + '</i></span>' +
            '<span class="dealprice"><s>' + it.base + '</s>' +
              '<b>💰 ' + p + '</b></span>' +
            '<button class="dealbtn" data-deal="' + i + '"' + (dis ? ' disabled' : '') + '>' +
              (it.bought ? t('deal.done') : (own || max ? '—' : t('shop.buy'))) + '</button>' +
          '</div>';
      }).join('');
      return '<div id="shopDeal">' +
          '<div class="dealhd"><b>🔥 ' + t('deal.title') + '</b><i>' + t('deal.sub') + '</i></div>' +
          cards +
        '</div>';
    }
    function wire(root) {
      const box = root && root.querySelector ? root.querySelector('#shopDeal') : null;
      if (!box) return;
      box.querySelectorAll('[data-deal]').forEach(function (b) {
        b.addEventListener('click', function () {
          AudioSys.ensure();
          const r = buy(parseInt(b.getAttribute('data-deal'), 10) || 0);
          if (r.ok) { AudioSys.sfx('item'); toast(r.msg, 2.6); }
          else if (r.err === 'GOLD') { AudioSys.sfx('hurt'); toast('💰 金幣不足，還差 ' + r.need + ' 枚', 2.2); }
          else if (r.err === 'BOUGHT') toast(t('deal.done'), 1.6);
        });
      });
    }
    return { cur: cur, buy: buy, html: html, wire: wire, priceOf: priceOf, dkey: dkey };
  })();

  function render() {
    const grid = $id('shopGrid');"""

assert s.count(A1) == 1, 'A1 %d' % s.count(A1)
s = s.replace(A1, B1)

# ---- 2. 拼接特惠區 ----
A2 = """    grid.innerHTML = PET_KINDS.map(function (k) {"""
B2 = """    grid.innerHTML = DailyDeal.html() + PET_KINDS.map(function (k) {"""
assert s.count(A2) == 1, 'A2 %d' % s.count(A2)
s = s.replace(A2, B2)

# ---- 3. 綁事件 ----
A3 = """    try { PetPreview.mount(grid); } catch (e) {}      // v5.17：隨從圖示會走動"""
B3 = """    try { PetPreview.mount(grid); } catch (e) {}      // v5.17：隨從圖示會走動
    try { DailyDeal.wire(grid); } catch (e) {}        // v5.73：今日特惠"""
assert s.count(A3) == 1, 'A3 %d' % s.count(A3)
s = s.replace(A3, B3)

assert s.count('\r\n') == 0, 'CRLF!'
tmp = P + '.tmp'
io.open(tmp, 'w', encoding='utf-8', newline='\n').write(s)
os.replace(tmp, P)
print('OK', orig, '->', len(s))
