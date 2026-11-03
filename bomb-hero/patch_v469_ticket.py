# -*- coding: utf-8 -*-
# v4.69 E：商店新增「大逃殺門票」一張 2000 金幣（可重複買，每場消耗）
import io, sys
P = 'index.html'
s = io.open(P, encoding='utf-8').read()


def rep(old, new, tag):
    global s
    n = s.count(old)
    if n != 1:
        sys.stderr.write('[FAIL] %s count=%d\n' % (tag, n))
        if n:
            i = s.find(old)
            sys.stderr.write(repr(s[max(0, i - 150):i + 250]) + '\n')
        sys.exit(1)
    s = s.replace(old, new)
    print('[ok] ' + tag)


rep("""  const KEY = 'bombhero-pets', GKEY = 'bombhero-gold', SKEY = 'bombhero-gold-synced';
  let owned = [], gold = 0;""",
    """  const KEY = 'bombhero-pets', GKEY = 'bombhero-gold', SKEY = 'bombhero-gold-synced';
  // v4.69：大逃殺門票（每場消耗一張，可重複購買）
  const TK = 'bombhero-br-ticket', TICKET_PRICE = 2000;
  let owned = [], gold = 0, tickets = 0;""",
    'ticket-state')

rep("""    try { gold = parseInt(localStorage.getItem(GKEY) || '0', 10) || 0; } catch (e) { gold = 0; }
    if (!isFinite(gold) || gold < 0) gold = 0;
  }""",
    """    try { gold = parseInt(localStorage.getItem(GKEY) || '0', 10) || 0; } catch (e) { gold = 0; }
    if (!isFinite(gold) || gold < 0) gold = 0;
    try { tickets = parseInt(localStorage.getItem(TK) || '0', 10) || 0; } catch (e) { tickets = 0; }
    if (!isFinite(tickets) || tickets < 0) tickets = 0;
  }""",
    'ticket-load')

rep("""    try { localStorage.setItem(GKEY, String(gold)); } catch (e) {}
  }""",
    """    try { localStorage.setItem(GKEY, String(gold)); } catch (e) {}
    try { localStorage.setItem(TK, String(tickets)); } catch (e) {}
  }""",
    'ticket-save')

rep("""  function render() {
    const grid = $id('shopGrid');""",
    """  // v4.69：買門票（可重複買 → 不做 OWNED 檢查）
  function buyTicket() {
    if (!dev() && gold < TICKET_PRICE) return { ok: false, err: 'GOLD', need: TICKET_PRICE - gold };
    if (!dev()) gold -= TICKET_PRICE;
    tickets++;
    save();
    render();
    return { ok: true, tickets: tickets };
  }
  function useTicket() {
    if (tickets <= 0) return false;
    tickets--; save(); render();
    return true;
  }
  function render() {
    const grid = $id('shopGrid');""",
    'ticket-buy')

rep("""    grid.innerHTML = PET_KINDS.map(function (k) {""",
    """    const canT = dev() || gold >= TICKET_PRICE;
    const ticketCard = '<div class="shopcard">' +
      '<div class="shhead"><span class="shico">🏝️</span>大逃殺門票</div>' +
      '<div class="shdesc">每張可以玩一場大逃殺。玩法還在開發中，買了會先存在錢包裡，' +
      '開放後直接在入口使用（不會過期）。</div>' +
      '<div class="shfoot"><span class="shprice">💰 ' + TICKET_PRICE + '</span>' +
      '<button class="shbuy" data-buy-ticket="1"' + (canT ? '' : ' disabled') + '>' +
      (canT ? '購買' : '金幣不足') + '</button></div>' +
      '<div class="shdesc" style="margin-top:6px;color:#d4491f"><b>持有 ' + tickets + ' 張</b></div>' +
      '</div>';
    grid.innerHTML = PET_KINDS.map(function (k) {""",
    'ticket-card')

rep("""    }).join('');
    grid.querySelectorAll('[data-buy]').forEach(function (b) {""",
    """    }).join('') + ticketCard;
    grid.querySelectorAll('[data-buy-ticket]').forEach(function (b) {
      b.addEventListener('click', function () {
        AudioSys.ensure();
        const r = buyTicket();
        if (r.ok) {
          AudioSys.sfx('item');
          toast('🎟️ 買到 1 張大逃殺門票（目前持有 ' + r.tickets + ' 張）', 2.6);
        } else if (r.err === 'GOLD') {
          AudioSys.sfx('hurt');
          toast('💰 金幣不足，還差 ' + r.need + ' 枚', 2.2);
        }
      });
    });
    grid.querySelectorAll('[data-buy]').forEach(function (b) {""",
    'ticket-wire')

rep("""    open: open, render: render, buy: buy, active: active, has: has,
    addGold: addGold, syncGold: syncGold,
    gold: function () { return gold; },""",
    """    open: open, render: render, buy: buy, active: active, has: has,
    addGold: addGold, syncGold: syncGold,
    buyTicket: buyTicket, useTicket: useTicket,
    tickets: function () { return tickets; },
    ticketPrice: function () { return TICKET_PRICE; },
    gold: function () { return gold; },""",
    'ticket-export')

# 大逃殺入口的說明加上門票資訊
rep("""  ov.innerHTML = '<div class="ov-box"><h3>🏝️ 大逃殺（未開放）</h3>' +
    '<p>超大地圖上撒 30～50 個 AI，撿物資升級血量／防禦／攻擊，最後活著的贏。\\n' +
    '30 人以上的模擬很吃效能，要先壓測幀率再決定人數上限，所以先不開放。</p>' +
    '<button class="mbtn warm" id="brOk">知道了</button></div>';""",
    """  let tkN = 0;
  try { tkN = (typeof Shop !== 'undefined' && Shop.tickets) ? Shop.tickets() : 0; } catch (e) {}
  ov.innerHTML = '<div class="ov-box"><h3>🏝️ 大逃殺（未開放）</h3>' +
    '<p>超大地圖上撒 30～50 個 AI，撿物資升級血量／防禦／攻擊，最後活著的贏。\\n' +
    '30 人以上的模擬很吃效能，要先壓測幀率再決定人數上限，所以先不開放。</p>' +
    '<p>🎟️ 你目前持有 <b>' + tkN + ' 張</b>門票（商店一張 ' + ((typeof Shop !== 'undefined' && Shop.ticketPrice) ? Shop.ticketPrice() : 2000) +
    ' 金幣）。開放後每場會消耗一張。</p>' +
    '<button class="mbtn warm" id="brOk">知道了</button></div>';""",
    'br-dialog')

io.open(P, 'w', encoding='utf-8', newline='\n').write(s)
print('chars:', len(s))
