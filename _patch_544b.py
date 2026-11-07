# -*- coding: utf-8 -*-
import io, os

p = 'bomb-hero/test/verify-v544.js'
s = io.open(p, 'r', encoding='utf-8', newline='').read()

start_m = u"// \u514d\u8cbb\u9ede\u7528\u5b8c\uff08\u5275\u89d2 9 \u9ede\u5168\u90e8\u9ede\u5728\u751f\u547d\u3001\u751f\u547d\u53c8\u6eff 10 \u683c \u2192 \u7528\u5225\u7684\u5c6c\u6027\u9a57\uff09"
end_m = u"// \u9084\u539f\nP.Shop.gold = gp; P.Shop.spend = sp;"
i = s.index(start_m)
j = s.index(end_m)

new = u"""// v5.48\uff1a\u6bcf\u4e00\u683c\u90fd\u5403 1 \u9ede\uff08\u524d 3 \u683c\u53ea\u5403\u9ede\u3001\u7b2c 4 \u683c\u8d77\u9084\u8981\u91d1\u5e63\uff09\u3002\u7e3d\u9ede\u6578\u81ea\u5df1\u7d66 20 \u9ede\u597d\u9a57
P.rpgSetTotal(20);
P.RPG.alloc = { hp: 9, def: 0, spd: 0, atk: 0 };
P.RPG.bought = 0;
ok(P.rpgLeft() === 11, '\u4e5d\u9ede\u9ede\u5b8c \u2192 \u5269 11\uff0820 - 9\uff09', P.rpgLeft());

// \u6309\u9215\uff1a\u56db\u9805\u90fd\u9084\u5728\u514d\u8cbb\u683c\u5167 \u2192 \u300c\uff0b\u300d\u3001\u4e0d\u986f\u793a\u50f9\u9322
P.RPG.alloc = { hp: 2, def: 1, spd: 0, atk: 0 };
P.Rpg.renderStats();
let rows = String(env.getId('rpgRows').innerHTML || '');
ok(!/buypt/.test(rows), '\u524d 3 \u683c\u4e0d\u986f\u793a\u50f9\u9322\uff0c\u7dad\u6301\u300c\uff0b\u300d');
ok(rows.indexOf('>\uff0b<') > 0, '\uff0b \u6309\u9215\u5b58\u5728');

// \u7b2c 4 \u683c\u8d77 \u2192 \u986f\u793a\u50f9\u9322\uff1b\u6eff 10 \u683c \u2192 \u7981\u7528
P.RPG.alloc = { hp: 10, def: 3, spd: 0, atk: 0 };
P.Rpg.renderStats();
rows = String(env.getId('rpgRows').innerHTML || '');
ok(/class="buypt"/.test(rows), '\u7b2c 4 \u683c\u8d77 \u2192 \u6309\u9215\u52a0\u4e0a class="buypt"');
ok(rows.indexOf('\U0001F4B02000') > 0, '\u6309\u9215\u76f4\u63a5\u5beb\u50f9\u683c 2000');
ok(!/class="buypt"[^>]*disabled/.test(rows), '\u300c\uff0b\u300d\u5728\u8cb7\u9ede\u6a21\u5f0f\u4e0b\u4e0d\u80fd\u88ab\u7981\u7528\uff08\u5426\u5247\u9ede\u4e0d\u52d5\uff09');
ok((rows.match(/class="buypt"/g) || []).length === 1,
  '\u53ea\u6709\u9632\u79a6\u90a3\u4e00\u9805\uff08\u7b2c 4 \u683c\uff09\u986f\u793a\u50f9\u9322', (rows.match(/class="buypt"/g) || []).length);
ok(/data-d="1"[^>]*disabled/.test(rows), '\u6eff 10 \u683c\u90a3\u4e00\u9805\uff08\u751f\u547d\uff09\u4ecd\u7136\u662f\u7981\u7528\u72c0\u614b');

// \u91d1\u5e63\u8db3\u3001\u9ede\u6578\u4e5f\u8db3 \u2192 \u8cb7\u6210\u529f\uff08\u91d1\u5e63\u8207\u9ede\u6578\u5169\u500b\u90fd\u8981\u6263\uff09
let goldNow = 5000, spent = [];
const gp = P.Shop.gold, sp = P.Shop.spend;
P.Shop.gold = function () { return goldNow; };
P.Shop.spend = function (n) { spent.push(n); goldNow -= n; return { ok: true, gold: goldNow }; };
P.RPG.alloc = { hp: 4, def: 3, spd: 0, atk: 0 };
P.RPG.bought = 0;
P.RPG.paid = { hp: 0, def: 0, spd: 0, atk: 0 };
const r1 = P.rpgBuyPoint('def');
ok(r1 === true, '\u91d1\u5e63\u8207\u9ede\u6578\u90fd\u5920 \u2192 \u8cb7\u9ede\u6210\u529f', r1);
ok(P.RPG.alloc.def === 4, '\u9632\u79a6 3 \u2192 4');
ok(P.RPG.bought === 1, 'bought \u7d2f\u52a0 1');
ok(spent.length === 1 && spent[0] === 2000, 'Shop.spend \u6536\u5230 2000 \u91d1\u5e63', spent);
ok(goldNow === 3000, '\u91d1\u5e63 5000 \u2192 3000', goldNow);
ok(P.rpgLeft() === 12, '\u9ede\u6578\u4e5f\u6263\u4e86 1\uff0813 \u2192 12\uff09', P.rpgLeft());

// \u9ede\u6578\u7528\u5b8c \u2192 \u5c31\u7b97\u6709\u9322\u4e5f\u4e0d\u80fd\u518d\u8cb7
goldNow = 99999; spent.length = 0;
P.rpgSetTotal(4);
P.RPG.alloc = { hp: 4, def: 0, spd: 0, atk: 0 };
ok(P.rpgBuyPoint('hp') === false, 'v5.48\uff1a\u6c92\u6709\u5c6c\u6027\u9ede \u2192 \u6709\u9322\u4e5f\u8cb7\u4e0d\u4e86', P.RPG.alloc.hp);
ok(spent.length === 0, '\u9ede\u6578\u4e0d\u8db3\u6642\u4e00\u6bdb\u90fd\u6c92\u6263', spent);

// \u91d1\u5e63\u4e0d\u8db3
P.rpgSetTotal(20);
goldNow = 500; spent.length = 0;
P.RPG.alloc = { hp: 4, def: 3, spd: 0, atk: 0 };
const r2 = P.rpgBuyPoint('def');
ok(r2 === false, '\u91d1\u5e63\u4e0d\u8db3 \u2192 \u56de false', r2);
ok(P.RPG.alloc.def === 3, '\u91d1\u5e63\u4e0d\u8db3\u6642\u4e0d\u6703\u5077\u52a0\u9ede');
ok(spent.length === 0, '\u91d1\u5e63\u4e0d\u8db3\u6642\u5b8c\u5168\u6c92\u6709\u6263\u6b3e');

// \u55ae\u9805\u4e0a\u9650 10 \u683c\uff1a\u5c31\u7b97\u6709\u9322\u6709\u9ede\u4e5f\u8cb7\u4e0d\u4e86
goldNow = 99999;
P.RPG.alloc = { hp: 10, def: 0, spd: 0, atk: 0 };
ok(P.rpgBuyPoint('hp') === false, '\u751f\u547d\u5df2\u6eff 10 \u683c \u2192 \u6709\u9322\u4e5f\u4e0d\u80fd\u8cb7');

// \u9084\u6709\u5c6c\u6027\u9ede\u6642\uff0crpgBuyPoint \u8d70\u539f\u672c\u90a3\u689d\uff08\u4e0d\u6263\u91d1\u5e63\uff09
goldNow = 5000;
spent.length = 0;
P.RPG.alloc = { hp: 0, def: 0, spd: 0, atk: 0 };
P.RPG.bought = 0;
P.rpgSetTotal(9);
const r3 = P.rpgBuyPoint('def');
ok(r3 === true && P.RPG.alloc.def === 1, '\u9084\u6709\u5c6c\u6027\u9ede \u2192 \u6b63\u5e38\u914d\u9ede\u6210\u529f');
ok(spent.length === 0, '\u524d 3 \u683c\u4e0d\u6703\u6263\u91d1\u5e63', spent);

"""

out = s[:i] + new + s[j:]
io.open(p + '.tmp', 'w', encoding='utf-8', newline='\n').write(out)
os.replace(p + '.tmp', p)
print('ok')
