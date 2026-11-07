# -*- coding: utf-8 -*-
"""v5.46：RPG 配點收費門檻移到第 4 格；洗點退款（扣 1000 手續費）"""
import io, os, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
IDX = os.path.join(ROOT, 'bomb-hero', 'index.html')
I18N = os.path.join(ROOT, 'bomb-hero', 'js', 'i18n-src.js')
VLOG = os.path.join(ROOT, 'bomb-hero', 'js', 'version-log.js')
CLOUD = os.path.join(ROOT, 'cloud.js')
SW1 = os.path.join(ROOT, 'bomb-hero', 'sw.js')
SW2 = os.path.join(ROOT, 'public', 'sw.js')
PKG = os.path.join(ROOT, 'package.json')


def read(p):
    with io.open(p, 'r', encoding='utf-8', newline='') as f:
        return f.read()


def write(p, s):
    tmp = p + '.tmp'
    with io.open(tmp, 'w', encoding='utf-8', newline='\n') as f:
        f.write(s)
    os.replace(tmp, p)


def sub(s, a, b, n=1, tag=''):
    c = s.count(a)
    assert c == n, 'COUNT %d (want %d) [%s] -> %r' % (c, n, tag, a[:70])
    return s.replace(a, b)


# ---------------------------------------------------------------- index.html
s = read(IDX)
before_len = len(s)

# ① 常量
s = sub(s,
        "/* v5.45\uff1a\u6bcf\u9805\u524d 4 \u683c\u7528\u514d\u8cbb\u9ede\uff0c\u7b2c 5 \u683c\u8d77\u4e00\u5f8b\u91d1\u5e63 \u2014\u2014 2000 / 2500 / 3000 / 3500 / 4000 / 4500 */\n"
        "const RPG_FREE_PER = 4;\n"
        "const RPG_PT_BUY = 2000;              // \u8a72\u9805\u7b2c 1 \u500b\u91d1\u5e63\u683c\n"
        "const RPG_PT_STEP = 500;              // \u6bcf\u591a\u4e00\u968e +500\n",
        "/* v5.46\uff1a\u6bcf\u9805\u524d 3 \u683c\u7528\u514d\u8cbb\u9ede\uff0c\u7b2c 4 \u683c\u8d77\u4e00\u5f8b\u91d1\u5e63 \u2014\u2014 2000 / 2500 / 3000 / 3500 / 4000 / 4500 / 5000\n"
        "   \u6d17\u9ede\uff08\u56db\u9805\u5168\u90e8\u9000\u56de\uff09\u6703\u9000\u9084\u6240\u6709\u82b1\u6389\u7684\u91d1\u5e63\uff0c\u4f46\u8981\u4ed8 1000 \u91d1\u5e63\u624b\u7e8c\u8cbb */\n"
        "const RPG_FREE_PER = 3;\n"
        "const RPG_PT_BUY = 2000;              // \u8a72\u9805\u7b2c 1 \u500b\u91d1\u5e63\u683c\uff08\u4e5f\u5c31\u662f\u7b2c 4 \u683c\uff09\n"
        "const RPG_PT_STEP = 500;              // \u6bcf\u591a\u4e00\u968e +500\n"
        "const RPG_RESPEC_FEE = 1000;          // \u6d17\u9ede\u624b\u7e8c\u8cbb\uff08\u6c92\u8cb7\u904e\u5c31\u4e0d\u6536\uff09\n",
        tag='consts')

# ② 免費額度註解
s = sub(s,
        "/* v5.45\uff1a\u514d\u8cbb\u9ede\u53ea\u80fd\u7528\u5728\u6bcf\u9805\u524d 4 \u683c \u2192 \u514d\u8cbb\u984d\u5ea6\u4e0a\u9650 16 \u683c\uff084 \u9805 \u00d7 4\uff09 */",
        "/* v5.46\uff1a\u514d\u8cbb\u9ede\u53ea\u80fd\u7528\u5728\u6bcf\u9805\u524d 3 \u683c \u2192 \u514d\u8cbb\u984d\u5ea6\u4e0a\u9650 12 \u683c\uff084 \u9805 \u00d7 3\uff09 */",
        tag='freecap')

# ③ 退款試算 + 洗點套用（放在 rpgPrice 後面）
old_price = "function rpgPrice(k) { return RPG_PT_BUY + RPG_PT_STEP * Math.max(0, ((RPG.paid || {})[k] | 0)); }\n"
new_price = old_price + (
    "/* v5.46\uff1a\u6d17\u9ede\u8981\u9000\u591a\u5c11 \u2014\u2014 \u628a\u300c\u8cb7\u904e\u7684\u6bcf\u4e00\u683c\u300d\u7576\u6642\u7684\u50f9\u9322\u52a0\u7e3d\uff082000 + 2500 + \u2026\uff09\n"
    "   paid \u53ea\u8a18\u4ed8\u904e\u9322\u7684\u683c\u6578\uff0c\u6240\u4ee5\u7b97\u51fa\u4f86\u525b\u597d\u7b49\u65bc\u73a9\u5bb6\u5be6\u969b\u82b1\u6389\u7684\u91d1\u5e63\u3002 */\n"
    "function rpgPaidRefund(p) {\n"
    "  p = p || RPG.paid || {};\n"
    "  let sum = 0;\n"
    "  for (let i = 0; i < RPG_ATTRS.length; i++) {\n"
    "    const c = Math.max(0, p[RPG_ATTRS[i].k] | 0);\n"
    "    for (let j = 0; j < c; j++) sum += RPG_PT_BUY + RPG_PT_STEP * j;\n"
    "  }\n"
    "  return sum;\n"
    "}\n"
    "/* \u6d17\u9ede\u8a08\u50f9\uff1a\u6c92\u8cb7\u904e\u5c31\u4e0d\u6536\u624b\u7e8c\u8cbb\uff08\u6c92\u6709\u53ef\u9000\u7684\u9322\u9084\u6536 1000 \u5f88\u5947\u602a\uff09 */\n"
    "function rpgRespecInfo() {\n"
    "  const refund = rpgPaidRefund();\n"
    "  const fee = refund > 0 ? RPG_RESPEC_FEE : 0;\n"
    "  return { refund: refund, fee: fee, back: Math.max(0, refund - fee) };\n"
    "}\n"
    "/* \u771f\u6b63\u6267\u884c\u6d17\u9ede\uff1a\u56db\u9805\u6b78\u96f6\u3001\u50f9\u683c\u968e\u6b78\u96f6\u3001\u9000\u9322 */\n"
    "function rpgRespecApply() {\n"
    "  const r = rpgRespecInfo();\n"
    "  RPG.alloc = { hp: 0, def: 0, spd: 0, atk: 0 };\n"
    "  RPG.paid = { hp: 0, def: 0, spd: 0, atk: 0 };\n"
    "  RPG.bought = 0;\n"
    "  if (r.back > 0) { try { if (typeof Shop !== 'undefined' && Shop.addGold) Shop.addGold(r.back); } catch (e) {} }\n"
    "  return r;\n"
    "}\n"
)
s = sub(s, old_price, new_price, tag='refund')

# ④ renderStats 註解
s = sub(s,
        "      // v5.45\uff1a\u7b2c 5 \u683c\u8d77\uff08\u6216\u514d\u8cbb\u9ede\u7528\u5b8c\uff09\u2192 \u6309\u9215\u76f4\u63a5\u5beb\u9019\u4e00\u683c\u7684\u50f9\u9322",
        "      // v5.46\uff1a\u7b2c 4 \u683c\u8d77\uff08\u6216\u514d\u8cbb\u9ede\u7528\u5b8c\uff09\u2192 \u6309\u9215\u76f4\u63a5\u5beb\u9019\u4e00\u683c\u7684\u50f9\u9322",
        tag='rendercomment')

# ⑤ 面板文字
s = sub(s,
        "<div class=\"hint\" style=\"margin:-2px 0 7px\">\u5269\u9918 <b id=\"rpgLeft\" style=\"color:#d4491f\">9</b> \u514d\u8cbb\u9ede \u00b7 \u6bcf\u9805\u524d 4 \u683c\u514d\u8cbb</div>",
        "<div class=\"hint\" style=\"margin:-2px 0 7px\">\u5269\u9918 <b id=\"rpgLeft\" style=\"color:#d4491f\">9</b> \u514d\u8cbb\u9ede \u00b7 \u6bcf\u9805\u524d 3 \u683c\u514d\u8cbb</div>",
        tag='hint1')
s = sub(s,
        "<div class=\"hint\" id=\"rpgBuyHint\" style=\"margin:7px 0 0\">\u7b2c 5 \u683c\u8d77\u8981\u7528\u91d1\u5e63\uff1a<b>2000 \u2192 2500 \u2192 3000 \u2192 3500 \u2192 4000 \u2192 4500</b>\uff08\u6bcf\u9805\u4e0a\u9650 10 \u683c\uff09\u3002</div>",
        "<div class=\"hint\" id=\"rpgBuyHint\" style=\"margin:7px 0 0\">\u7b2c 4 \u683c\u8d77\u8981\u7528\u91d1\u5e63\uff1a<b>2000 \u2192 2500 \u2192 3000 \u2192 3500 \u2192 4000 \u2192 4500 \u2192 5000</b>\uff08\u6bcf\u9805\u4e0a\u9650 10 \u683c\uff09\u3002\u6d17\u9ede\uff08\u5168\u90e8\u9000\u56de\uff09\u6703\u9000\u9084\u82b1\u6389\u7684\u91d1\u5e63\uff0c<b>\u6263 1000 \u624b\u7e8c\u8cbb</b>\u3002</div>",
        tag='hint2')

# ⑥ 洗點按鈕
old_rs = (
    "    // v5.20\uff1a\u5168\u90e8\u9000\u56de\uff08\u6d17\u9ede\uff09\n"
    "    const rsBtn = $id('btnRpgRespec');\n"
    "    if (rsBtn) rsBtn.addEventListener('click', function () {\n"
    "      AudioSys.ensure(); AudioSys.sfx('click');\n"
    "      if (rpgSum(RPG.alloc) <= 0) { toast(t('respec.none'), 1.8); return; }\n"
    "      if (typeof confirm === 'function' && !confirm(t('respec.confirm'))) return;\n"
    "      RPG.alloc = { hp: 0, def: 0, spd: 0, atk: 0 };\n"
    "      RPG.paid = { hp: 0, def: 0, spd: 0, atk: 0 };   // \u6d17\u9ede\uff1d\u91cd\u65b0\u4f86\u904e\uff0c\u50f9\u683c\u968e\u4e5f\u6b78\u96f6\n"
    "      renderStats();\n"
    "      if (Cloud.online()) {\n"
    "        Cloud.respec().then(function (r) {\n"
    "          if (r) { renderStats(); toast(t('respec.done'), 2); }\n"
    "          else toast(t('respec.fail'), 2.4);\n"
    "        });\n"
    "      } else toast(t('respec.done'), 2);\n"
    "    });\n"
)
new_rs = (
    "    // v5.20\uff1a\u5168\u90e8\u9000\u56de\uff08\u6d17\u9ede\uff09\u00b7 v5.46\uff1a\u9000\u9084\u82b1\u6389\u7684\u91d1\u5e63\uff08\u6263 1000 \u624b\u7e8c\u8cbb\uff09\n"
    "    const rsBtn = $id('btnRpgRespec');\n"
    "    if (rsBtn) rsBtn.addEventListener('click', function () {\n"
    "      AudioSys.ensure(); AudioSys.sfx('click');\n"
    "      if (rpgSum(RPG.alloc) <= 0) { toast(t('respec.none'), 1.8); return; }\n"
    "      const info = rpgRespecInfo();\n"
    "      const ask = info.fee > 0\n"
    "        ? t('respec.confirm2', { refund: info.refund, fee: info.fee, back: info.back })\n"
    "        : t('respec.confirm');\n"
    "      if (typeof confirm === 'function' && !confirm(ask)) return;\n"
    "      const done = function () {\n"
    "        const r = rpgRespecApply();\n"
    "        renderStats();\n"
    "        toast(r.back > 0 ? t('respec.done2', { back: r.back }) : t('respec.done'), 2.4);\n"
    "      };\n"
    "      if (Cloud.online()) {\n"
    "        Cloud.respec().then(function (r) { if (r) done(); else toast(t('respec.fail'), 2.4); });\n"
    "      } else done();\n"
    "    });\n"
)
s = sub(s, old_rs, new_rs, tag='respec')

# ⑦ 買點註解 / 免費 3 格
s = sub(s,
        "   \u6bcf\u9805\u4ecd\u7136\u4e0a\u9650 10 \u683c\uff1b\u4e0a\u7dda\u6642\u9ede\u6578\u7531\u5f8c\u7aef\u8a18\u5e33\uff08\u91d1\u5e63\u8d70 Shop \u9322\u5305\uff09\u3002 */",
        "   v5.46\uff1a\u9580\u6abb\u6539\u6210\u300c\u6bcf\u9805\u7b2c 4 \u683c\u300d\u2014\u2014 \u524d 3 \u683c\u7528\u514d\u8cbb\u9ede\uff0c\u7b2c 4 \u683c\u8d77\u4e00\u5f8b\u4ed8\u9322\uff082000 \u8d77\u7b97\uff09\u3002\n"
        "   \u6bcf\u9805\u4ecd\u7136\u4e0a\u9650 10 \u683c\uff1b\u4e0a\u7dda\u6642\u9ede\u6578\u7531\u5f8c\u7aef\u8a18\u5e33\uff08\u91d1\u5e63\u8d70 Shop \u9322\u5305\uff09\u3002 */",
        tag='buycomment')
s = sub(s,
        "  if (v < RPG_FREE_PER && rpgLeft() > 0) return rpgAdjust(k, 1);   // \u9084\u5728\u514d\u8cbb 4 \u683c\u5167 \u2192 \u4e0d\u82b1\u9322",
        "  if (v < RPG_FREE_PER && rpgLeft() > 0) return rpgAdjust(k, 1);   // \u9084\u5728\u514d\u8cbb 3 \u683c\u5167 \u2192 \u4e0d\u82b1\u9322",
        tag='buyfree')
s = sub(s,
        "    // v5.45\uff1a\u6bcf\u9805\u524d 4 \u683c\u514d\u8cbb\uff1b\u7b2c 5 \u683c\u8d77\u4e00\u5f8b\u91d1\u5e63\uff08\u514d\u8cbb\u9ede\u518d\u591a\u4e5f\u4e0d\u80fd\u767d\u52a0\uff09",
        "    // v5.46\uff1a\u6bcf\u9805\u524d 3 \u683c\u514d\u8cbb\uff1b\u7b2c 4 \u683c\u8d77\u4e00\u5f8b\u91d1\u5e63\uff08\u514d\u8cbb\u9ede\u518d\u591a\u4e5f\u4e0d\u80fd\u767d\u52a0\uff09",
        tag='adjcomment')

# ⑧ 匯出
s = sub(s,
        "  RPG_FREE_PER: RPG_FREE_PER, RPG_PT_STEP: RPG_PT_STEP,\n",
        "  RPG_FREE_PER: RPG_FREE_PER, RPG_PT_STEP: RPG_PT_STEP,\n"
        "  rpgPaidRefund: rpgPaidRefund, rpgRespecInfo: rpgRespecInfo, rpgRespecApply: rpgRespecApply,\n"
        "  RPG_RESPEC_FEE: RPG_RESPEC_FEE,\n",
        tag='exports')

# ⑨ 版本號
s = sub(s, "<span class=\"vlnum\">v<span id=\"verLogVer\">5.45</span></span>",
        "<span class=\"vlnum\">v<span id=\"verLogVer\">5.46</span></span>", tag='verlogver')
s = sub(s, "<div class=\"ver beta\">\u6e2c\u8a66\u7248 v<span id=\"verTxt\">5.45</span></div>",
        "<div class=\"ver beta\">\u6e2c\u8a66\u7248 v<span id=\"verTxt\">5.46</span></div>", tag='vertxt')
s = sub(s, "const VERSION = '5.45';", "const VERSION = '5.46';", tag='version')

write(IDX, s)
print('index.html: %d -> %d (%+d)' % (before_len, len(s), len(s) - before_len))

# ---------------------------------------------------------------- i18n
s = read(I18N)
old_fail = "respec.fail|\u9000\u56de\u5931\u6557 \u2014\u2014 \u7db2\u8def\u4e0d\u7a69\uff0c\u7a0d\u5f8c\u518d\u8a66|\u9000\u56de\u5931\u8d25 \u2014\u2014 \u7f51\u7edc\u4e0d\u7a33\uff0c\u7a0d\u540e\u518d\u8bd5|Reset failed \u2014 check your connection|\u623b\u305b\u307e\u305b\u3093\u3067\u3057\u305f\uff08\u901a\u4fe1\u30a8\u30e9\u30fc\uff09|\ub418\ub3cc\ub9ac\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4(\ud1b5\uc2e0 \uc624\ub958)\n"
new_fail = old_fail + (
    "respec.confirm2|\u56db\u9805\u914d\u9ede\u5168\u90e8\u9000\u56de\uff1f\u6703\u9000\u9084\u4f60\u82b1\u6389\u7684 {refund} \u91d1\u5e63\uff0c\u4f46\u8981\u4ed8 {fee} \u91d1\u5e63\u624b\u7e8c\u8cbb\uff08\u5be6\u62ff {back}\uff09\u3002|"
    "\u56db\u9879\u914d\u70b9\u5168\u90e8\u9000\u56de\uff1f\u4f1a\u9000\u8fd8\u4f60\u82b1\u6389\u7684 {refund} \u91d1\u5e01\uff0c\u4f46\u8981\u4ed8 {fee} \u91d1\u5e01\u624b\u7eed\u8d39\uff08\u5b9e\u62ff {back}\uff09\u3002|"
    "Reset all attributes? You get back the {refund} gold you spent, minus a {fee} gold reset fee ({back} net).|"
    "4 \u9805\u76ee\u3092\u3059\u3079\u3066\u623b\u3057\u307e\u3059\u304b\uff1f\u4f7f\u3063\u305f {refund} \u30b4\u30fc\u30eb\u30c9\u306f\u623b\u308a\u307e\u3059\u304c\u3001\u624b\u6570\u6599 {fee} \u30b4\u30fc\u30eb\u30c9\u304c\u304b\u304b\u308a\u307e\u3059\uff08\u53d7\u53d6 {back}\uff09\u3002|"
    "\ub2a5\ub825\uce58\ub97c \ubaa8\ub450 \ub418\ub3cc\ub9b4\uae4c\uc694? \uc4f4 {refund} \uace8\ub4dc\ub294 \ub3cc\ub824\ubc1b\uc9c0\ub9cc \uc218\uc218\ub8cc {fee} \uace8\ub4dc\uac00 \ucc28\uac10\ub429\ub2c8\ub2e4(\uc2e4\uc218\ub839 {back}).\n"
    "respec.done2|\u267b\ufe0f \u914d\u9ede\u5df2\u5168\u90e8\u9000\u56de \u00b7 \u9000\u9084 {back} \u91d1\u5e63|\u267b\ufe0f \u914d\u70b9\u5df2\u5168\u90e8\u9000\u56de \u00b7 \u9000\u8fd8 {back} \u91d1\u5e01|"
    "\u267b\ufe0f Points reset \u00b7 {back} gold refunded|\u267b\ufe0f \u30dd\u30a4\u30f3\u30c8\u3092\u623b\u3057\u307e\u3057\u305f \u00b7 {back} \u30b4\u30fc\u30eb\u30c9\u8fd4\u9084|"
    "\u267b\ufe0f \ud3ec\uc778\ud2b8\ub97c \ub418\ub3cc\ub838\uc2b5\ub2c8\ub2e4 \u00b7 {back} \uace8\ub4dc \ud658\uae09\n"
)
s = sub(s, old_fail, new_fail, tag='i18n')
write(I18N, s)
print('i18n ok')

# ---------------------------------------------------------------- version-log
s = read(VLOG)
old_head = ("window.__VERSION_LOG = [\n"
            "  { v: '5.45', date: '2026-11-07', now: true, items: [\n")
new_head = (
    "window.__VERSION_LOG = [\n"
    "  { v: '5.46', date: '2026-11-07', now: true, items: [\n"
    "    '\U0001F3AF <b>\u6536\u8cbb\u9580\u6abb\u63d0\u524d\u4e00\u683c</b>\uff1a\u56db\u500b\u5c6c\u6027\uff08\u2764\ufe0f HP\uff0f\U0001F6E1\ufe0f ARM\uff0f\U0001F45F SPD\uff0f\U0001F4A5 ATK\uff09<b>\u524d 3 \u683c\u4ecd\u7528\u514d\u8cbb\u9ede\uff0c\u7b2c 4 \u683c\u8d77\u4e00\u5f8b\u91d1\u5e63</b> \u2014\u2014 2000 \u2192 2500 \u2192 3000 \u2192 3500 \u2192 4000 \u2192 4500 \u2192 5000\uff08\u6bcf\u591a\u8cb7\u4e00\u683c +500\uff09\u3002',\n"
    "    '\U0001F4B8 <b>\u50f9\u683c\u8ddf\u8457\u300c\u9019\u4e00\u9805\u8cb7\u904e\u5e7e\u683c\u300d\u8d70</b>\uff1a\u63db\u4e00\u9805\u5f9e 2000 \u91cd\u65b0\u8d77\u7b97\uff0c\u540c\u4e00\u9805\u8d8a\u9ede\u8d8a\u8cb4\uff1b\u55ae\u9805 3\u219210 \u683c\u5171 <b>24,500</b>\uff0c\u56db\u9805\u5168\u6eff <b>98,000</b> \u91d1\u5e63\u3002',\n"
    "    '\u267b\ufe0f <b>\u6d17\u9ede\uff08\u5168\u90e8\u9000\u56de\uff09\u73fe\u5728\u6703\u9000\u9322</b>\uff1a\u628a\u4f60\u8cb7\u914d\u9ede\u82b1\u6389\u7684\u91d1\u5e63\u6574\u7b46\u9000\u9084\uff0c\u53ea\u6536 <b>1000 \u91d1\u5e63\u624b\u7e8c\u8cbb</b>\uff08\u8cb7\u904e 2 \u683c\uff1d\u82b1\u4e86 4,500\uff0c\u5be6\u62ff 3,500\uff09\u3002\u6c92\u82b1\u904e\u9322\u7684\u6d17\u9ede\u4e0d\u6536\u8cbb\u3002',\n"
    "    '\U0001F512 <b>\u9000\u55ae\u4e00\u683c\u4e0d\u9000\u9322</b>\uff1a\u60f3\u62ff\u56de\u91d1\u5e63\u5c31\u8d70\u300c\u5168\u90e8\u9000\u56de\u300d\u2014\u2014 \u4e0d\u7136\u9ede\u4e00\u683c\u9000\u4e00\u683c\u5c31\u80fd\u7121\u75db\u5957\u5229\uff0c\u50f9\u683c\u968e\u4e5f\u5c31\u6c92\u610f\u7fa9\u4e86\u3002',\n"
    "    '\U0001F9EA \u65b0\u589e verify-v546\uff08\u9000\u6b3e\u8a66\u7b97\uff0f\u624b\u7e8c\u8cbb\uff0f\u96f2\u7aef\u4e00\u81f4\uff09\uff0cverify-v545 \u6539\u5beb\u6210\u300c\u7b2c 4 \u683c\u8d77\u6536\u8cbb\u300d\u3002'\n"
    "  ] },\n"
    "\n"
    "  { v: '5.45', date: '2026-11-07', now: false, items: [\n"
)
s = sub(s, old_head, new_head, tag='vlog')
write(VLOG, s)
print('version-log ok')

# ---------------------------------------------------------------- cloud.js
s = read(CLOUD)
s = sub(s,
        "const FREE_PER = 4;             // v5.45\uff1a\u6bcf\u9805\u524d 4 \u683c\u7528\u514d\u8cbb\u9ede\uff0c\u7b2c 5 \u683c\u8d77\u4e00\u5f8b\u91d1\u5e63\uff08\u50f9\u9322\u7531\u524d\u7aef\u7b97\uff0c\u9019\u88e1\u53ea\u7576\u88c1\u5224\uff09",
        "const FREE_PER = 3;             // v5.46\uff1a\u6bcf\u9805\u524d 3 \u683c\u7528\u514d\u8cbb\u9ede\uff0c\u7b2c 4 \u683c\u8d77\u4e00\u5f8b\u91d1\u5e63\uff08\u50f9\u9322\u7531\u524d\u7aef\u7b97\uff0c\u9019\u88e1\u53ea\u7576\u88c1\u5224\uff09",
        tag='cloud-free')
s = sub(s,
        "/* v5.45\uff1a\u9019\u5e7e\u683c\u662f\u300c\u82b1\u91d1\u5e63\u8cb7\u4f86\u7684\u300d\u2014\u2014\u514d\u8cbb\u984d\u5ea6\u53ea\u7b97\u5230\u6bcf\u9805\u7b2c 4 \u683c */",
        "/* v5.46\uff1a\u9019\u5e7e\u683c\u662f\u300c\u82b1\u91d1\u5e63\u8cb7\u4f86\u7684\u300d\u2014\u2014\u514d\u8cbb\u984d\u5ea6\u53ea\u7b97\u5230\u6bcf\u9805\u7b2c 3 \u683c */",
        tag='cloud-sumPaid')
s = sub(s,
        "    // v5.45\uff1a\u7b2c 5 \u683c\u8d77\u4e00\u5f8b\u8981\u91d1\u5e63\uff1b\u524d 4 \u683c\u5247\u770b\u514d\u8cbb\u984d\u5ea6\u9084\u5920\u4e0d\u5920",
        "    // v5.46\uff1a\u7b2c 4 \u683c\u8d77\u4e00\u5f8b\u8981\u91d1\u5e63\uff1b\u524d 3 \u683c\u5247\u770b\u514d\u8cbb\u984d\u5ea6\u9084\u5920\u4e0d\u5920",
        tag='cloud-spend')
s = sub(s,
        "  // v5.45\uff1a\u8d85\u904e\u7b2c 4 \u683c\u7684\u683c\u6578\uff0c\u53ea\u80fd\u4f86\u81ea\u300c\u5df2\u7d93\u8cb7\u904e\u7684\u984d\u5ea6\u300d\uff0c\u5426\u5247\u6539\u524d\u7aef\u5c31\u80fd\u767d\u62ff",
        "  // v5.46\uff1a\u8d85\u904e\u7b2c 3 \u683c\u7684\u683c\u6578\uff0c\u53ea\u80fd\u4f86\u81ea\u300c\u5df2\u7d93\u8cb7\u904e\u7684\u984d\u5ea6\u300d\uff0c\u5426\u5247\u6539\u524d\u7aef\u5c31\u80fd\u767d\u62ff",
        tag='cloud-validate')

# 退款試算（伺服器側鏡像，只用於回報／記錄）
s = sub(s,
        "function freeCapOf(rpg) {\n",
        "/* v5.46\uff1a\u6d17\u9ede\u9000\u6b3e\u984d \u2014\u2014 \u8ddf\u524d\u7aef rpgPaidRefund() \u540c\u4e00\u5957\u7b97\u6cd5\uff082000 + 2500 + \u2026\uff09 */\n"
        "function paidRefund(rpg) {\n"
        "  const p = (rpg && rpg.paid) || {};\n"
        "  let sum = 0;\n"
        "  for (let i = 0; i < ATTRS.length; i++) {\n"
        "    const c = Math.max(0, p[ATTRS[i]] | 0);\n"
        "    for (let j = 0; j < c; j++) sum += 2000 + 500 * j;\n"
        "  }\n"
        "  return sum;\n"
        "}\n"
        "const RESPEC_FEE = 1000;        // v5.46\uff1a\u6d17\u9ede\u624b\u7e8c\u8cbb\uff08\u524d\u7aef\u6263\u91d1\u5e63\u7528\uff09\n"
        "function freeCapOf(rpg) {\n",
        tag='cloud-refund')

# respec 端點：bought 歸零 + 回傳退款資訊
s = sub(s,
        "          acc.rpg.paid = { hp: 0, def: 0, spd: 0, atk: 0 };   // v5.45\uff1a\u6d17\u9ede\uff1d\u50f9\u683c\u968e\u4e5f\u91cd\u4f86\n",
        "          const refund = paidRefund(acc.rpg);\n"
        "          const fee = refund > 0 ? RESPEC_FEE : 0;\n"
        "          acc.rpg.paid = { hp: 0, def: 0, spd: 0, atk: 0 };   // v5.46\uff1a\u6d17\u9ede\uff1d\u50f9\u683c\u968e\u4e5f\u91cd\u4f86\n"
        "          acc.rpg.bought = 0;                                 //          \u8cb7\u904e\u7684\u984d\u5ea6\u4e00\u8d77\u6b78\u96f6\n",
        tag='cloud-respec1')
s = sub(s,
        "          logEvent(acc, 'respec', {});\n"
        "          const capAll = freeCapOf(acc.rpg);\n"
        "          return send(res, 200, {\n"
        "            ok: true, account: publicAccount(acc),\n"
        "            left: capAll, total: capAll, bought: acc.rpg.bought | 0\n"
        "          }), true;\n",
        "          logEvent(acc, 'respec', { refund: refund, fee: fee });\n"
        "          const capAll = freeCapOf(acc.rpg);\n"
        "          return send(res, 200, {\n"
        "            ok: true, account: publicAccount(acc),\n"
        "            left: capAll, total: capAll, bought: acc.rpg.bought | 0,\n"
        "            refund: refund, fee: fee, back: Math.max(0, refund - fee)   // v5.46\uff1a\u524d\u7aef\u64da\u6b64\u9000\u91d1\u5e63\n"
        "          }), true;\n",
        tag='cloud-respec2')
s = sub(s,
        "  FREE_PER: FREE_PER, sumPaid: sumPaid, freeLeftOf: freeLeftOf, spendPoint: spendPoint,",
        "  FREE_PER: FREE_PER, sumPaid: sumPaid, freeLeftOf: freeLeftOf, spendPoint: spendPoint,\n"
        "  paidRefund: paidRefund, RESPEC_FEE: RESPEC_FEE,   // v5.46",
        tag='cloud-export')
write(CLOUD, s)
print('cloud.js ok')

# ---------------------------------------------------------------- 版本檔案
for p, tag in ((SW1, 'sw-dev'), (SW2, 'sw-public')):
    t = read(p)
    t = sub(t, "var SW_VERSION = 'v5.45.0';", "var SW_VERSION = 'v5.46.0';", tag=tag)
    write(p, t)
t = read(PKG)
t = sub(t, '"version": "5.45.0"', '"version": "5.46.0"', tag='pkg')
write(PKG, t)
print('version files ok')
