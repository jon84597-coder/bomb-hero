# -*- coding: utf-8 -*-
import io

PATH = r'C:/Users/jon84/WorkBuddy/2026-10-30-12-58-54/bomb-hero/index.html'

with io.open(PATH, 'r', encoding='utf-8', newline='') as f:
    text = f.read()

# normalize to \n for reliable exact matching; restore CRLF at the very end
text = text.replace('\r\n', '\n')

rules = []
def R(old, new):
    rules.append((old, new))

# =================== F1: 私人道具/坐騎提示 ===================
R("    toast(info.icon + ' ' + itemName(type) + '：' + itemHint(type), 2, HUD_OF_ITEM[type] || 'gear');",
  "    if (isMyPlayer(p)) toast(info.icon + ' ' + itemName(type) + '：' + itemHint(type), 2, HUD_OF_ITEM[type] || 'gear');")
R("    toast(t('toast.redDino'), 2, 'g:dino');",
  "    if (isMyPlayer(p)) toast(t('toast.redDino'), 2, 'g:dino');")
R("    toast(t('toast.dino'), 2, 'g:dino');",
  "    if (isMyPlayer(p)) toast(t('toast.dino'), 2, 'g:dino');")
R("  toast(t('toast.skull', { s: t('skull.' + p.skull) }), 2, 'g:skull');",
  "  if (isMyPlayer(p)) toast(t('toast.skull', { s: t('skull.' + p.skull) }), 2, 'g:skull');")

# =================== F2: 推車名牌「我」 ===================
R("    const label = pname(p) + '🛒' + (p.ai ? '🤖' : '');",
  "    const me = isMyPlayer(p);\n    const label = pname(p) + '🛒' + (p.ai ? '🤖' : '') + (me ? ' ⭐我' : '');")
R("    ctx.fillRect(x - tw / 2 - 4, y - R * 2.75 - 13, tw + 8, 13);\n    ctx.fillStyle = '#ffd166';",
  "    ctx.fillRect(x - tw / 2 - 4, y - R * 2.75 - 13, tw + 8, 13);\n    ctx.fillStyle = me ? '#7ee0ff' : '#ffd166';")

# =================== F3a: 功能鍵去掉黑色底圖 ===================
R("        var(--tb-ring) 64%, var(--tb-ring) 82%,\n        rgba(9,13,24,.82) 83%, rgba(9,13,24,.82) 100%);",
  "        var(--tb-ring) 64%, var(--tb-ring) 100%);")

# =================== F3b: 炸彈圖示去黑（晶亮紅球） ===================
R("  const g = ctx.createRadialGradient(-r * .40, -r * .44, r * .10, 0, 0, r * 1.18);\n  g.addColorStop(0, '#6d7488');\n  g.addColorStop(.22, '#3e4357');\n  g.addColorStop(.62, '#1f2231');\n  g.addColorStop(1, '#0a0b12');",
  "  const g = ctx.createRadialGradient(-r * .40, -r * .44, r * .10, 0, 0, r * 1.18);\n  g.addColorStop(0, '#ff9a9a');\n  g.addColorStop(.20, '#ef4b4b');\n  g.addColorStop(.60, '#c62f2f');\n  g.addColorStop(1, '#7c1b1b');")

# =================== F4: 登入記住帳號/密碼 ===================
R("function pwFieldHtml(id, ac) {",
  "function pwFieldHtml(id, ac, val) {")
R("  return '<span class=\"pwrow\">' +\n    '<input id=\"' + id + '\" class=\"acctin\" type=\"password\" autocomplete=\"' + ac + '\" maxlength=\"128\">' +",
  "  const pv = val ? ' value=\"' + pwEsc(String(val)) + '\"' : '';\n  return '<span class=\"pwrow\">' +\n    '<input id=\"' + id + '\" class=\"acctin\" type=\"password\" autocomplete=\"' + ac + '\" maxlength=\"128\"' + pv + '>' +")
R("    let html = '<div class=\"acctform\">';",
  "    let remId = '', remPw = '';\n    try { remId = localStorage.getItem('bombhero-rem-id') || ''; remPw = localStorage.getItem('bombhero-rem-pw') || ''; } catch (e) {}\n    let html = '<div class=\"acctform\">';")
R("        'maxlength=\"120\" placeholder=\"' + esc(t('web.idPh')) + '\">' +",
  "        'maxlength=\"120\" placeholder=\"' + esc(t('web.idPh')) + '\" value=\"' + remId.replace(/&/g,'&amp;').replace(/\"/g,'&quot;').replace(/</g,'&lt;') + '\">' +")
R("      pwFieldHtml('acctPwIn', 'new-password') +",
  "      pwFieldHtml('acctPwIn', 'new-password', (reg || pass) ? '' : remPw) +")
R("      '<div class=\"accthint\">' + t('web.pwHint') + '</div>' +\n      '<div class=\"accterr\" id=\"acctPwErr\"></div>' +",
  "      '<div class=\"accthint\">' + t('web.pwHint') + '</div>' +\n      (reg || pass ? '' :\n        '<label class=\"acctcheck\" style=\"display:flex;align-items:center;gap:6px;margin:8px 0 2px;font-size:13px;color:#cdd6e6;justify-content:center\">' +\n        '<input type=\"checkbox\" id=\"acctRemId\"' + (remId ? ' checked' : '') + '> ' + t('web.remId') + '</label>' +\n        '<label class=\"acctcheck\" style=\"display:flex;align-items:center;gap:6px;margin:2px 0 6px;font-size:13px;color:#cdd6e6;justify-content:center\">' +\n        '<input type=\"checkbox\" id=\"acctRemPw\"' + (remPw ? ' checked' : '') + '> ' + t('web.remPw') + '</label>') +\n      '<div class=\"accterr\" id=\"acctPwErr\"></div>' +")
R("    else login(id, pw).then(function (r) { done(r.ok, r.err, r); });",
  "    else login(id, pw).then(function (r) {\n      if (r.ok) {\n        const rid = $id('acctRemId'), rpw = $id('acctRemPw');\n        try {\n          if (rid && rid.checked) localStorage.setItem('bombhero-rem-id', id);\n          else localStorage.removeItem('bombhero-rem-id');\n          if (rpw && rpw.checked) localStorage.setItem('bombhero-rem-pw', pw);\n          else localStorage.removeItem('bombhero-rem-pw');\n        } catch (e) {}\n      }\n      done(r.ok, r.err, r);\n    });")

# =================== F5: 強烈火焰 ===================
R("  const s = T * .5 * (0.6 + 0.4 * Math.sin(k * Math.PI)) * flick;",
  "  const s = T * .56 * (0.62 + 0.46 * Math.sin(k * Math.PI)) * flick;")
R("  const hw = s * .50, hh = s * .92;",
  "  const hw = s * .54, hh = s * 1.02;")
R("  // --- 底部暖光暈 ---\n  const gg = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 1.05);\n  if (bossFire) {\n    gg.addColorStop(0, 'rgba(150,50,230,' + (.46 * k + .06).toFixed(3) + ')');\n    gg.addColorStop(1, 'rgba(120,24,190,0)');\n  } else {\n    gg.addColorStop(0, 'rgba(255,126,40,' + (.48 * k + .06).toFixed(3) + ')');\n    gg.addColorStop(1, 'rgba(255,60,20,0)');\n  }\n  ctx.fillStyle = gg;\n  ctx.beginPath(); ctx.arc(cx, cy, s * 1.05, 0, 6.283); ctx.fill();",
  "  // --- 強烈暖光暈（更亮更廣）---\n  const gg = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 1.35);\n  if (bossFire) {\n    gg.addColorStop(0, 'rgba(190,90,255,' + (.72 * k + .10).toFixed(3) + ')');\n    gg.addColorStop(1, 'rgba(120,24,190,0)');\n  } else {\n    gg.addColorStop(0, 'rgba(255,150,60,' + (.80 * k + .10).toFixed(3) + ')');\n    gg.addColorStop(.5, 'rgba(255,90,30,' + (.42 * k).toFixed(3) + ')');\n    gg.addColorStop(1, 'rgba(255,60,20,0)');\n  }\n  ctx.fillStyle = gg;\n  ctx.beginPath(); ctx.arc(cx, cy, s * 1.35, 0, 6.283); ctx.fill();")
R("  // --- 四層火苗 ---\n  if (bossFire) {\n    flameDrop(cx, cy + s * .04, hw, hh, 'rgba(158,48,236,' + (.9 * k + .08).toFixed(3) + ')');\n    flameDrop(cx, cy + s * .10, hw * .70, hh * .74, 'rgba(196,104,255,' + (.93 * k + .06).toFixed(3) + ')');\n    flameDrop(cx, cy + s * .16, hw * .40, hh * .46, 'rgba(232,190,255,' + (.92 * k + .08).toFixed(3) + ')');\n    flameDrop(cx, cy + s * .20, hw * .19, hh * .24, 'rgba(252,244,255,' + (.88 * k + .12).toFixed(3) + ')');\n  } else {\n    flameDrop(cx, cy + s * .04, hw, hh, 'rgba(255,88,24,' + (.9 * k + .08).toFixed(3) + ')');\n    flameDrop(cx, cy + s * .10, hw * .70, hh * .74, 'rgba(255,166,38,' + (.93 * k + .06).toFixed(3) + ')');\n    flameDrop(cx, cy + s * .16, hw * .40, hh * .46, 'rgba(255,236,168,' + (.92 * k + .08).toFixed(3) + ')');\n    flameDrop(cx, cy + s * .20, hw * .19, hh * .24, 'rgba(255,255,248,' + (.88 * k + .12).toFixed(3) + ')');\n  }",
  "  // --- 五層火苗（外深內白熱，精緻又強烈）---\n  if (bossFire) {\n    flameDrop(cx, cy + s * .02, hw, hh, 'rgba(150,40,230,' + (.95 * k + .06).toFixed(3) + ')');\n    flameDrop(cx, cy + s * .08, hw * .78, hh * .80, 'rgba(186,80,255,' + (.95 * k + .06).toFixed(3) + ')');\n    flameDrop(cx, cy + s * .14, hw * .52, hh * .56, 'rgba(226,170,255,' + (.95 * k + .06).toFixed(3) + ')');\n    flameDrop(cx, cy + s * .18, hw * .30, hh * .34, 'rgba(248,224,255,' + (.95 * k + .06).toFixed(3) + ')');\n    flameDrop(cx, cy + s * .20, hw * .14, hh * .18, 'rgba(255,255,255,' + (.96 * k).toFixed(3) + ')');\n  } else {\n    flameDrop(cx, cy + s * .02, hw, hh, 'rgba(255,70,16,' + (.96 * k + .06).toFixed(3) + ')');\n    flameDrop(cx, cy + s * .08, hw * .78, hh * .80, 'rgba(255,150,34,' + (.97 * k + .06).toFixed(3) + ')');\n    flameDrop(cx, cy + s * .14, hw * .52, hh * .56, 'rgba(255,214,110,' + (.97 * k + .06).toFixed(3) + ')');\n    flameDrop(cx, cy + s * .18, hw * .30, hh * .34, 'rgba(255,244,200,' + (.97 * k + .06).toFixed(3) + ')');\n    flameDrop(cx, cy + s * .20, hw * .14, hh * .18, 'rgba(255,255,255,' + (.98 * k).toFixed(3) + ')');\n  }")
R("  for (let i = 0; i < 4; i++) {\n    const ph = Game.gameT * 3.1 + i * 1.7 + f.cx * .7 + f.cy * 1.3;",
  "  for (let i = 0; i < 5; i++) {\n    const ph = Game.gameT * 3.4 + i * 1.5 + f.cx * .7 + f.cy * 1.3;")
R("    const mr = Math.max(.8, s * .085 * (1 - up * .55));",
  "    const mr = Math.max(.9, s * .095 * (1 - up * .55));")

# =================== F6: 固定暱稱 ===================
R("  netName: '',                                    // 線上暱稱",
  "  netName: '',                                    // 線上暱稱\n  playerName: '',                                 // v4.8：固定暱稱（首次必填，之後都用這個玩）")
R("      <div class=\"menu\">",
  "      <div class=\"nickwrap\" style=\"margin:8px 0 4px;display:flex;flex-direction:column;gap:4px;align-items:center\">\n        <label for=\"playerName\" style=\"font-size:13px;opacity:.85;color:#ffe6c2\">🦸 你的專屬暱稱（最多 8 字，設定後都用它玩遊戲）</label>\n        <input class=\"tinput\" id=\"playerName\" maxlength=\"8\" placeholder=\"輸入暱稱…\" style=\"width:100%;max-width:320px\">\n      </div>\n      <div class=\"menu\">")
R("$id('btnSolo').addEventListener('click', function () {\n  AudioSys.ensure(); AudioSys.sfx('click');\n  // v2.0：還沒自己挑過 → 每次進來都給一隻隨機角色（有挑過就沿用玩家選的）",
  "$id('btnSolo').addEventListener('click', function () {\n  AudioSys.ensure(); AudioSys.sfx('click');\n  if (!ensureNickname()) return;\n  // v2.0：還沒自己挑過 → 每次進來都給一隻隨機角色（有挑過就沿用玩家選的）")
R("  Solo.renderGrid(); Solo.renderChar();\n});",
  "  Solo.renderGrid(); Solo.renderChar();\n});\n// v4.8：固定暱稱（首次玩必須先命名，之後都用這個）\n(function () {\n  const el = $id('playerName');\n  if (el) {\n    el.value = settings.playerName || '';\n    el.addEventListener('input', function () {\n      settings.playerName = String(el.value || '').trim().slice(0, 8);\n      saveSettings();\n      const nm = $id('netName');\n      if (nm && !nm.value) nm.value = settings.playerName;\n    });\n  }\n})();\nfunction ensureNickname() {\n  if (settings.playerName) return true;\n  const el = $id('playerName');\n  if (el) { try { el.focus(); el.scrollIntoView({ block: 'center' }); } catch (e) {} }\n  toast(t('nick.need'), 2.6, 'gear');\n  return false;\n}")
R("$id('btnBoss').addEventListener('click', function () {\n  AudioSys.ensure(); AudioSys.sfx('click');\n  startBossRush();\n});",
  "$id('btnBoss').addEventListener('click', function () {\n  AudioSys.ensure(); AudioSys.sfx('click');\n  if (!ensureNickname()) return;\n  startBossRush();\n});")
R("  btn.addEventListener('click', function () {\n    AudioSys.ensure(); AudioSys.sfx('click');\n    Rpg.render();\n    Screen.show('rpg');\n  });",
  "  btn.addEventListener('click', function () {\n    AudioSys.ensure(); AudioSys.sfx('click');\n    if (!ensureNickname()) return;\n    Rpg.render();\n    Screen.show('rpg');\n  });")
R("$id('btnBattle').addEventListener('click', function () {\n  AudioSys.ensure(); AudioSys.sfx('click');\n  Screen.show('battle');\n  Battle.resetSlots();\n  updateCountHint();\n});",
  "$id('btnBattle').addEventListener('click', function () {\n  AudioSys.ensure(); AudioSys.sfx('click');\n  if (!ensureNickname()) return;\n  Screen.show('battle');\n  Battle.resetSlots();\n  updateCountHint();\n});")
R("$id('btnOnline').addEventListener('click', function () {\n  AudioSys.ensure(); AudioSys.sfx('click');\n  const nm = $id('netName');",
  "$id('btnOnline').addEventListener('click', function () {\n  AudioSys.ensure(); AudioSys.sfx('click');\n  if (!ensureNickname()) return;\n  const nm = $id('netName');")
R("  p.lives = Game.bossRush ? 3 : 3;\n  p.score = 0;\n  Game.players.push(p);\n  Screen.show('game');",
  "  p.lives = Game.bossRush ? 3 : 3;\n  p.score = 0;\n  Game.players.push(p);\n  p.name = settings.playerName || '';   // v4.8：固定暱稱\n  Screen.show('game');")
R("    p.name = String(settings.names[i] || '').trim();",
  "    p.name = String(settings.names[i] || '').trim();\n    if (i === 0 && human) p.name = settings.playerName || p.name;   // v4.8：固定暱稱套用給本機玩家")
R("  myName: function () {\n    const el = $id('netName');\n    const v = el ? String(el.value || '').trim().slice(0, 8) : '';\n    settings.netName = v;\n    saveSettings();\n    return v || ('玩家' + (10 + rand(89)));\n  },",
  "  myName: function () {\n    const fixed = (settings.playerName || '').trim().slice(0, 8);\n    if (fixed) return fixed;\n    const el = $id('netName');\n    const v = el ? String(el.value || '').trim().slice(0, 8) : '';\n    settings.netName = v;\n    saveSettings();\n    return v || ('玩家' + (10 + rand(89)));\n  },")

# =================== F7: RPG 過關顯示 RPG 關名 ===================
R("      sub: t('solo.clearSub', { s: p.score, n: (Game.stage + 1), name: themeName(Game.stage) }),",
  "      sub: t('solo.clearSub', { s: p.score, n: (Game.stage + 1), name: (Game.mode === 'rpg' ? (MAP32[(Game.stage - 1) % 32].n) : themeName(Game.stage)) }),")

# =================== F8: 小怪血量上調 + 受擊短暫無敵 ===================
R("    kind: sp.kind, r: sp.r, hp: 1,\n    dirT: 0, dirName: pick(['up', 'down', 'left', 'right']), dead: false, walkT: 0",
  "    kind: sp.kind, r: sp.r, hp: 2,   // v4.8：小怪血量上調（原本 1）\n    dirT: 0, dirName: pick(['up', 'down', 'left', 'right']), dead: false, walkT: 0")
R("  if (sp.id === 'beetle' || sp.id === 'skull') e.hp = 2;    // 有甲／硬骨頭：要炸兩次",
  "  if (sp.id === 'beetle' || sp.id === 'skull') e.hp = 3;    // 有甲／硬骨頭：要炸三次")
R("slime:  { hp: 2,", "slime:  { hp: 3,")
R("mush:   { hp: 1,", "mush:   { hp: 2,")
R("crab:   { hp: 2,", "crab:   { hp: 3,")
R("beetle: { hp: 3,", "beetle: { hp: 4,")
R("skull:  { hp: 3,", "skull:  { hp: 4,")
R("lizard: { hp: 4,", "lizard: { hp: 5,")
R("bat:    { hp: 1,", "bat:    { hp: 2,")
R("ghost:  { hp: 2,", "ghost:  { hp: 3,")
R("bee:    { hp: 1,", "bee:    { hp: 2,")
R("eye:    { hp: 3", "eye:    { hp: 4")
R("  // 火焰傷害\n  for (let i = 0; i < Game.flames.length; i++) {\n    const f = Game.flames[i];\n    if (f.cx === Math.floor(e.x / T) && f.cy === Math.floor(e.y / T)) {\n      e.hp = (e.hp || 1) - flameHitDamage(e);\n      if (e.hp > 0) {                       // 鐵甲蟲 / 骷髏兵要炸兩次\n        e.hitT = .55;\n        burst(e.x, e.y, '#ffffff', 8, 150);\n        AudioSys.sfx('hurt');\n        break;\n      }\n      e.dead = true;\n      Game.players.forEach(function (p) { p.score += 100; });\n      burst(e.x, e.y, e.color, 14, 180);\n      bubbleDeathPair(e, f.owner, e.r * 2 + 14, Game.T * 1.98);\n      AudioSys.sfx('hurt');\n      break;\n    }\n  }",
  "  // 火焰傷害\n  for (let i = 0; i < Game.flames.length; i++) {\n    const f = Game.flames[i];\n    if (f.cx === Math.floor(e.x / T) && f.cy === Math.floor(e.y / T)) {\n      if (e.hitT <= 0) {                    // 受擊後短暫無敵：讓「高血量」有意義，不再每幀狂扣\n        e.hp = (e.hp || 1) - flameHitDamage(e);\n        if (e.hp > 0) {                     // 鐵甲蟲 / 骷髏兵要炸好幾次\n          e.hitT = .55;\n          burst(e.x, e.y, '#ffffff', 8, 150);\n          AudioSys.sfx('hurt');\n          break;\n        }\n        e.dead = true;\n        Game.players.forEach(function (p) { p.score += 100; });\n        burst(e.x, e.y, e.color, 14, 180);\n        bubbleDeathPair(e, f.owner, e.r * 2 + 14, Game.T * 1.98);\n        AudioSys.sfx('hurt');\n        break;\n      }\n      break;                                // 站在火裡：等無敵結束再判\n    }\n  }")
R("  // 火焰傷害（飛行怪照樣怕火）\n  for (let i = 0; i < Game.flames.length; i++) {\n    const f = Game.flames[i];\n    if (f.cx === Math.floor(e.x / T) && f.cy === Math.floor(e.y / T)) {\n      e.hp = (e.hp || 1) - flameHitDamage(e);\n      if (e.hp > 0) {\n        e.hitT = .55;\n        burst(e.x, e.y, '#ffffff', 8, 150);\n        AudioSys.sfx('hurt');\n        break;\n      }\n      e.dead = true;\n      Game.players.forEach(function (p) { p.score += 100; });\n      burst(e.x, e.y, e.color, 14, 180);\n      bubbleDeathPair(e, f.owner, e.r * 2 + 14, Game.T * 1.98);\n      AudioSys.sfx('hurt');\n      break;\n    }\n  }",
  "  // 火焰傷害（飛行怪照樣怕火）\n  for (let i = 0; i < Game.flames.length; i++) {\n    const f = Game.flames[i];\n    if (f.cx === Math.floor(e.x / T) && f.cy === Math.floor(e.y / T)) {\n      if (e.hitT <= 0) {\n        e.hp = (e.hp || 1) - flameHitDamage(e);\n        if (e.hp > 0) {\n          e.hitT = .55;\n          burst(e.x, e.y, '#ffffff', 8, 150);\n          AudioSys.sfx('hurt');\n          break;\n        }\n        e.dead = true;\n        Game.players.forEach(function (p) { p.score += 100; });\n        burst(e.x, e.y, e.color, 14, 180);\n        bubbleDeathPair(e, f.owner, e.r * 2 + 14, Game.T * 1.98);\n        AudioSys.sfx('hurt');\n        break;\n      }\n      break;\n    }\n  }")

# =================== F9: 聰明小怪躲炸彈 ===================
R("  if (sp.id === 'beetle' || sp.id === 'skull') e.hp = 3;    // 有甲／硬骨頭：要炸三次",
  "  if (sp.id === 'beetle' || sp.id === 'skull') e.hp = 3;    // 有甲／硬骨頭：要炸三次\n  if (sp.id === 'skull' || sp.id === 'crab' || sp.id === 'beetle' || sp.id === 'eye') e.smart = true;  // v4.8：聰明小怪會找掩體躲炸彈")
R("  const T = Game.T;\n  e.dirT -= dt;",
  "  const T = Game.T;\n  // v4.8：聰明小怪看到炸彈會找最近的「安全格」躲（牆會擋爆炸＝掩體）\n  if (e.smart) {\n    if (e.fleeT > 0) e.fleeT -= dt;\n    if (e.fleeT <= 0) {\n      const cx0 = Math.floor(e.x / T), cy0 = Math.floor(e.y / T);\n      if (dangerAt(cx0, cy0, null) || bombNear(cx0, cy0, 3)) {\n        const fd = enemyFleeStep(cx0, cy0, 6);\n        if (fd) { e.dirName = fd; e.dirT = .22; e.fleeT = .35; }\n      }\n    }\n  }\n  e.dirT -= dt;")
R("  if (e.kind === 'chase' && atCenter && Math.random() < .8) {",
  "  if (e.kind === 'chase' && atCenter && Math.random() < .8 && !(e.smart && e.fleeT > 0)) {")
R("  if (e.hitT > 0) e.hitT -= dt;\n  if (e.turnT <= 0) {",
  "  if (e.hitT > 0) e.hitT -= dt;\n  // v4.8：聰明飛行怪（眼球怪）看到炸彈就往反方向飛\n  if (e.smart) {\n    const cx0 = Math.floor(e.x / T), cy0 = Math.floor(e.y / T);\n    if (dangerAt(cx0, cy0, null)) {\n      let away = null, bd = Infinity;\n      Game.bombs.forEach(function (b) {\n        if (b.held || b.flying) return;\n        const dx = e.x - (b.cx * T + T / 2), dy = e.y - (b.cy * T + T / 2);\n        const dd = dx * dx + dy * dy;\n        if (dd < bd) { bd = dd; away = Math.atan2(dy, dx); }\n      });\n      if (away != null) { const spd = Math.hypot(e.vx, e.vy) || e.speed; e.vx = Math.cos(away) * spd; e.vy = Math.sin(away) * spd; e.turnT = .5; }\n    }\n  }\n  if (e.turnT <= 0) {")
R("  return false;\n}\n\n// AI 難度參數（弱／中／強要有明顯差別）",
  "  return false;\n}\n\n// v4.8：聰明小怪找掩體用的輔助\nfunction bombNear(cx, cy, r) {\n  for (let i = 0; i < Game.bombs.length; i++) {\n    const b = Game.bombs[i];\n    if (b.held || b.flying) continue;\n    if (Math.abs(b.cx - cx) <= r && Math.abs(b.cy - cy) <= r) return true;\n  }\n  return false;\n}\n// BFS 找最近的「不是危險格」的格子，回傳第一步方向（牆會擋爆炸＝掩體）\nfunction enemyFleeStep(cx, cy, maxR) {\n  const q = [{ x: cx, y: cy, d: null, step: 0 }];\n  const seen = {}; seen[cx + ',' + cy] = 1;\n  let head = 0;\n  while (head < q.length) {\n    const cur = q[head++];\n    if (cur.d && !dangerAt(cur.x, cur.y, null)) return cur.d;\n    if (cur.step >= (maxR || 5)) continue;\n    ['up', 'down', 'left', 'right'].forEach(function (dn) {\n      const dd = DIRS[dn];\n      const nx = cur.x + dd.x, ny = cur.y + dd.y, key = nx + ',' + ny;\n      if (seen[key]) return;\n      if (cellAt(nx, ny) !== 0 || bombAt(nx, ny)) return;\n      seen[key] = 1;\n      q.push({ x: nx, y: ny, d: cur.d || dn, step: cur.step + 1 });\n    });\n  }\n  return null;\n}\n\n// AI 難度參數（弱／中／強要有明顯差別）")

# =================== F10: 紅龍發光 ===================
R("  if (red) {\n    const pulse = .55 + Math.sin(Game.gameT * 6.6) * .30 + Math.sin(Game.gameT * 3.1) * .15;\n    const a = Math.max(0, Math.min(.85, pulse));\n    const gr = ctx.createRadialGradient(x, y + T * .06, T * .30, x, y + T * .06, T * .74);\n    gr.addColorStop(0, 'rgba(255,90,50,0)');\n    gr.addColorStop(.55, 'rgba(255,80,45,' + (a * .30).toFixed(3) + ')');\n    gr.addColorStop(.84, 'rgba(255,64,48,' + (a * .72).toFixed(3) + ')');\n    gr.addColorStop(1, 'rgba(255,50,40,0)');\n    ctx.fillStyle = gr;\n    ctx.beginPath(); ctx.ellipse(x, y + T * .06, T * .74, T * .62, 0, 0, 6.283); ctx.fill();\n    // 邊緣那一圈細細的紅線在閃\n    ctx.strokeStyle = 'rgba(255,92,56,' + (a * .85).toFixed(3) + ')';\n    ctx.lineWidth = Math.max(1.2, T * .045);\n    ctx.beginPath(); ctx.ellipse(x, y + T * .06, T * .70, T * .585, 0, 0, 6.283); ctx.stroke();\n    ctx.lineWidth = 1;\n  }\n  if (red) ctx.filter = 'hue-rotate(-118deg) saturate(2.6) brightness(1.06)';\n  const rig = drawRigChar(ctx, 'dragon', x, footY - bob * 2, DH, {\n    walk: (p.walkT || 0) * 13, moving: !!p.moving, facing: p.facing,\n    amp: 1.15, idle: p.dinoT || 0, headTilt: Math.sin((p.dinoT || 0) * 2.2) * .02\n  });\n  if (red) ctx.filter = 'none';",
  "  if (red) {\n    const pulse = .55 + Math.sin(Game.gameT * 6.6) * .30 + Math.sin(Game.gameT * 3.1) * .15;\n    const a = Math.max(0, Math.min(.95, pulse));\n    const gr = ctx.createRadialGradient(x, y + T * .06, T * .20, x, y + T * .06, T * .92);\n    gr.addColorStop(0, 'rgba(255,90,50,0)');\n    gr.addColorStop(.45, 'rgba(255,80,45,' + (a * .34).toFixed(3) + ')');\n    gr.addColorStop(.80, 'rgba(255,64,48,' + (a * .80).toFixed(3) + ')');\n    gr.addColorStop(1, 'rgba(255,40,30,0)');\n    ctx.fillStyle = gr;\n    ctx.beginPath(); ctx.ellipse(x, y + T * .06, T * .92, T * .78, 0, 0, 6.283); ctx.fill();\n    // 邊緣那一圈細細的紅線在閃（更亮更明顯）\n    ctx.strokeStyle = 'rgba(255,100,60,' + (a * .95).toFixed(3) + ')';\n    ctx.lineWidth = Math.max(1.6, T * .060);\n    ctx.beginPath(); ctx.ellipse(x, y + T * .06, T * .86, T * .72, 0, 0, 6.283); ctx.stroke();\n    ctx.lineWidth = 1;\n  }\n  if (red) ctx.filter = 'hue-rotate(-118deg) saturate(2.6) brightness(1.06)';\n  // v4.8：紅龍本體描邊發光（shadowBlur 讓整隻龍邊緣亮起來）\n  if (red) { ctx.shadowColor = 'rgba(255,80,50,.85)'; ctx.shadowBlur = Math.max(8, T * .20); }\n  const rig = drawRigChar(ctx, 'dragon', x, footY - bob * 2, DH, {\n    walk: (p.walkT || 0) * 13, moving: !!p.moving, facing: p.facing,\n    amp: 1.15, idle: p.dinoT || 0, headTilt: Math.sin((p.dinoT || 0) * 2.2) * .02\n  });\n  if (red) { ctx.filter = 'none'; ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; }")

# =================== 版本號 ===================
R("const VERSION = '4.7';", "const VERSION = '4.8';")
R("      <div class=\"ver beta\">測試版 v<span id=\"verTxt\">4.7</span></div>",
  "      <div class=\"ver beta\">測試版 v<span id=\"verTxt\">4.8</span></div>")
R("      📜 <b>版本更新內容</b><span class=\"vlnum\">v<span id=\"verLogVer\">4.6</span></span>",
  "      📜 <b>版本更新內容</b><span class=\"vlnum\">v<span id=\"verLogVer\">4.8</span></span>")
R("const VERSION_LOG = [\n  { v: '4.7', date: '2026-11-01', now: true, items: [",
  "const VERSION_LOG = [\n  { v: '4.8', date: '2026-11-07', now: true, items: [\n    '<b>多人對戰私人提示</b>：只有自己才看得到「自己」撿到道具／騎上恐龍的提示，別人撿到你不會看到（線上更乾淨）',\n    '<b>推車頭上也有「我」</b>：多人對戰陣亡變成外圍推車時，名牌會標註 ⭐我，一眼認出自己',\n    '<b>功能鍵去掉黑底</b>：炸彈／遙控／噴火按鈕移除黑色底圖，只留去黑背的精緻圖示與金屬圓框；炸彈圖示改成晶亮紅球',\n    '<b>登入記住我</b>：登入頁多了「記住帳號」「記住密碼」兩個勾選，勾起來下次自動帶入（存在本機）',\n    '<b>火焰更猛烈</b>：炸彈噴出的火焰改成五層、帶白熱核心與更強光暈，不再像小火苗',\n    '<b>固定暱稱</b>：首次遊玩要先取一個專屬暱稱（最多 8 字），之後都用這個玩；線上對戰也用同一個名字',\n    '<b>RPG 過關關名正確</b>：RPG 模式過關畫面的「前進下一關」現在顯示 RPG 關卡名，而不是單人模式的關名',\n    '<b>小怪更耐打</b>：小怪血量全面上調，且受擊後短暫無敵，不會被同一團火秒殺；RPG 怪物血量也跟著加',\n    '<b>聰明小怪會躲</b>：骷髏／螃蟹／鐵甲蟲／眼球怪看到炸彈會主動找掩體（牆後）躲藏',\n    '<b>紅龍發光</b>：騎上紅龍時身體邊緣有更明顯的紅色發光與描邊光暈'\n  ] },\n  { v: '4.7', date: '2026-11-01', now: false, items: [")

# =================== i18n: web.remId / web.remPw / nick.need ===================
i18n = [
 ("  'web.needFill': '請先填好帳號與密碼',",
  "  'web.needFill': '請先填好帳號與密碼',\n  'web.remId': '記住帳號', 'web.remPw': '記住密碼', 'nick.need': '請先輸入你的暱稱（最多 8 字）',"),
 ("  'web.needFill': '请先填好账号与密码',",
  "  'web.needFill': '请先填好账号与密码',\n  'web.remId': '记住账号', 'web.remPw': '记住密码', 'nick.need': '请先输入你的昵称（最多 8 字）',"),
 ("  'web.needFill': 'Fill in account and password first',",
  "  'web.needFill': 'Fill in account and password first',\n  'web.remId': 'Remember account', 'web.remPw': 'Remember password', 'nick.need': 'Please enter your nickname first (max 8 chars)',"),
 ("  'web.needFill': 'アカウントとパスワードを入力してください',",
  "  'web.needFill': 'アカウントとパスワードを入力してください',\n  'web.remId': 'アカウントを保存', 'web.remPw': 'パスワードを保存', 'nick.need': 'ニックネームを入力してください（最大8文字）',"),
 ("  'web.needFill': '계정과 비밀번호를 입력하세요',",
  "  'web.needFill': '계정과 비밀번호를 입력하세요',\n  'web.remId': '아이디 저장', 'web.remPw': '비밀번호 저장', 'nick.need': '닉네임을 먼저 입력하세요 (최대 8자)',"),
 ("  'web.needFill': 'กรอกบัญชีและรหัสผ่านก่อน',",
  "  'web.needFill': 'กรอกบัญชีและรหัสผ่านก่อน',\n  'web.remId': 'จำบัญชี', 'web.remPw': 'จำรหัสผ่าน', 'nick.need': 'กรุณาใส่ชื่อเล่นก่อน (สูงสุด 8 ตัวอักษร)',"),
 ("  'web.needFill': 'Nhập tài khoản và mật khẩu trước',",
  "  'web.needFill': 'Nhập tài khoản và mật khẩu trước',\n  'web.remId': 'Lưu tài khoản', 'web.remPw': 'Lưu mật khẩu', 'nick.need': 'Vui lòng nhập nickname trước (tối đa 8 ký tự)',"),
 ("  'web.needFill': 'Сначала заполните логин и пароль',",
  "  'web.needFill': 'Сначала заполните логин и пароль',\n  'web.remId': 'Запомнить аккаунт', 'web.remPw': 'Запомнить пароль', 'nick.need': 'Сначала введите никнейм (макс. 8 символов)',"),
 ("  'web.needFill': 'Bitte Konto und Passwort ausfüllen',",
  "  'web.needFill': 'Bitte Konto und Passwort ausfüllen',\n  'web.remId': 'Konto merken', 'web.remPw': 'Passwort merken', 'nick.need': 'Bitte zuerst einen Nicknamen eingeben (max. 8 Zeichen)',"),
 ("  'web.needFill': 'Compila account e password',",
  "  'web.needFill': 'Compila account e password',\n  'web.remId': 'Ricorda account', 'web.remPw': 'Ricorda password', 'nick.need': 'Inserisci prima un nickname (max 8 caratteri)',"),
]
for old, new in i18n:
    R(old, new)

# =================== 套用 ===================
failed = []
for idx, (old, new) in enumerate(rules):
    cnt = text.count(old)
    if cnt != 1:
        failed.append((idx, cnt, old[:60]))
        continue
    text = text.replace(old, new, 1)

if failed:
    print('FAILED rules:')
    for f in failed:
        print('  #%d count=%d  ctx=%r' % f)
    print('No file written.')
else:
    text = text.replace('\n', '\r\n')
    with io.open(PATH, 'w', encoding='utf-8', newline='') as f:
        f.write(text)
    print('OK: all %d rules applied. file size=%d bytes' % (len(rules), len(text)))
