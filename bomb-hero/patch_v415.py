# -*- coding: utf-8 -*-
"""patch_v415.py —— v4.15
① 對戰／線上配對人數 2～8（原本只有 4／8）
② 對戰選角精簡（大卡 → 小卡，8 人也放得下）
③ 組隊對戰：紅／藍／綠／黃 最多 4 隊、最多 8 人（同隊不互炸）
"""
import io

P = 'index.html'
with io.open(P, 'r', encoding='utf-8', newline='') as f:
    text = f.read()
assert '\r\n' in text or '\n' in text
text = text.replace('\r\n', '\n')

R = []


def rule(old, new):
    R.append((old, new))


# ============ ① settings / 常數 ============
rule(
    "  count: 4,                                       // 對戰人數：4 或 8\n",
    "  count: 4,                                       // v4.15：對戰人數 2～8\n"
    "  teams: 0,                                       // v4.15：組隊對戰隊數（0 = 關閉混戰 / 2 / 3 / 4）\n")

rule(
    "  tpad: Object.assign({}, DEF_TPAD)               // 手機觸控版面\n};\n",
    "  tpad: Object.assign({}, DEF_TPAD)               // 手機觸控版面\n};\n"
    "// v4.15：對戰人數 2～8（原本只有 4／8 兩種）\n"
    "function clampCount(v) { const n = parseInt(v, 10); return (n >= 2 && n <= 8) ? n : 4; }\n"
    "// v4.15：組隊對戰 —— 四種隊色（紅／藍／綠／黃）\n"
    "const TEAMS = [\n"
    "  { key: 'red', dot: '🔴', hex: '#ff5a5a', name: '紅隊' },\n"
    "  { key: 'blue', dot: '🔵', hex: '#4aa8ff', name: '藍隊' },\n"
    "  { key: 'green', dot: '🟢', hex: '#46d68c', name: '綠隊' },\n"
    "  { key: 'yellow', dot: '🟡', hex: '#ffd166', name: '黃隊' }\n"
    "];\n"
    "// 設定頁面上「想開幾隊」（0 = 關閉）\n"
    "function teamCount() { return (settings.teams | 0) >= 2 ? Math.min(4, settings.teams | 0) : 0; }\n"
    "// 這一局實際開了幾隊（0 = 混戰）：開局時決定，AI 補位後不足兩隊會自動退回混戰\n"
    "function gameTeams() { return Game.teamsOn | 0; }\n"
    "function teamMeta(i) { return TEAMS[i | 0] || null; }\n"
    "function teamName(i) { const m = teamMeta(i); return m ? m.name : ''; }\n")

rule(
    "  settings.count = parseInt(settings.count, 10) === 8 ? 8 : 4;\n",
    "  settings.count = clampCount(settings.count);\n"
    "  settings.teams = [0, 2, 3, 4].indexOf(parseInt(settings.teams, 10)) >= 0 ? parseInt(settings.teams, 10) : 0;\n")

# ============ ② 對戰畫面 HTML ============
rule(
    '      <div class="desc">🔥 沒有手把也能打！每個槽位都能 <b style="color:#c9a8ff">點 🤖 切換人類／AI</b>——直接按「開戰」就是 <b>4 人混戰</b>。手把按 A 可隨時取代 AI。</div>\n'
    '      <div class="field"><label>玩家（每格都能 ◀ ▶ 換角色）</label>\n'
    '        <div class="row" id="pSlots"></div>\n'
    '      </div>\n',
    '      <div class="desc">🔥 沒有手把也能打！每個槽位都能 <b style="color:#c9a8ff">點 🤖 切換人類／AI</b>——直接按「開戰」就開打。支援 <b>2～8 人</b>，也可以開 <b>組隊對戰（紅／藍／綠／黃，最多 4 隊）</b>。手把按 A 可隨時取代 AI。</div>\n'
    '      <div class="field"><label>玩家（每格都能 ◀ ▶ 換角色）</label>\n'
    '        <div class="slotgrid" id="pSlots"></div>\n'
    '      </div>\n')

rule(
    '      <div class="field"><label>對戰人數</label>\n'
    '        <div class="seg" id="segCount"><button data-v="4">4 人</button><button data-v="8">8 人</button></div>\n'
    '        <div class="hint" id="countHint">沒人加入的位子由 🤖 AI 補滿。</div>\n'
    '      </div>\n',
    '      <div class="field"><label>對戰人數</label>\n'
    '        <div class="seg" id="segCount"><button data-v="2">2 人</button><button data-v="3">3 人</button>'
    '<button data-v="4">4 人</button><button data-v="5">5 人</button><button data-v="6">6 人</button>'
    '<button data-v="7">7 人</button><button data-v="8">8 人</button></div>\n'
    '        <div class="hint" id="countHint">沒人加入的位子由 🤖 AI 補滿。</div>\n'
    '      </div>\n'
    '      <div class="field"><label>組隊對戰（同隊不會互炸）</label>\n'
    '        <div class="seg" id="segTeams"><button data-v="0">關閉 混戰</button><button data-v="2">2 隊</button>'
    '<button data-v="3">3 隊</button><button data-v="4">4 隊</button></div>\n'
    '        <div class="hint" id="teamsHint">同隊的炸彈與火焰不會傷到自己人；點每一格的隊徽可以自己換隊。</div>\n'
    '      </div>\n')

# 線上配對人數
rule(
    '          <div class="seg" id="segNetCount"><button data-v="4">4 人</button><button data-v="8">8 人</button></div>\n',
    '          <div class="seg" id="segNetCount"><button data-v="2">2 人</button><button data-v="3">3 人</button>'
    '<button data-v="4">4 人</button><button data-v="5">5 人</button><button data-v="6">6 人</button>'
    '<button data-v="7">7 人</button><button data-v="8">8 人</button></div>\n')

# ============ ③ 選角精簡（CSS） ============
rule(
    "  #pSlots { display: grid; grid-template-columns: repeat(auto-fit, minmax(146px, 1fr)); gap: 10px; }\n"
    "  .pbox {\n"
    "    flex: 1; min-width: 0; border: 1px solid #2a3a63; border-radius: 13px;\n"
    "    padding: 10px; text-align: center; background: #10182b; position: relative;\n"
    "  }\n",
    "  /* v4.15：選角改「精簡小卡」—— 只留名字／頭像／◀▶🤖／暱稱，8 人一排也放得下 */\n"
    "  #pSlots, .slotgrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(104px, 1fr)); gap: 8px; }\n"
    "  .pbox {\n"
    "    min-width: 0; border: 1px solid #2a3a63; border-radius: 11px;\n"
    "    padding: 6px 6px 5px; text-align: center; background: #10182b; position: relative;\n"
    "  }\n")

rule(
    "  .pbox .pname {\n"
    "    width: 100%; box-sizing: border-box; margin-top: 6px; text-align: center;\n"
    "    background: #0b1020; border: 1px solid #2a3a63; color: #dbe8ff; border-radius: 8px;\n"
    "    padding: 5px 6px; font-family: inherit; font-weight: 800; font-size: 12.5px;\n"
    "  }\n",
    "  .pbox .pname {\n"
    "    width: 100%; box-sizing: border-box; margin-top: 3px; text-align: center;\n"
    "    background: #0b1020; border: 1px solid #2a3a63; color: #dbe8ff; border-radius: 6px;\n"
    "    padding: 3px 4px; font-family: inherit; font-weight: 800; font-size: 11px;\n"
    "  }\n")

rule(
    "  .pbox .pj { font-size: 15px; font-weight: 900; }\n"
    "  .pbox .pw { font-size: 11px; color: #7d8db0; margin-top: 4px; }\n"
    "  .pbox canvas.pav { width: 52px; height: 52px; margin: 6px auto 2px; display: block; }\n"
    "  .crow { display: flex; justify-content: center; gap: 6px; margin-top: 2px; }\n"
    "  .crow button {\n"
    "    width: 30px; height: 24px; border-radius: 7px; border: 1px solid #2a3a63; background: #182242;\n"
    "    color: #cfe0ff; font-weight: 900; cursor: pointer; font-family: inherit; font-size: 12px; line-height: 1;\n"
    "  }\n",
    "  .pbox .pj {\n"
    "    font-size: 11.5px; font-weight: 900;\n"
    "    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;\n"
    "  }\n"
    "  .pbox .pw {\n"
    "    font-size: 9px; color: #7d8db0; margin-top: 2px;\n"
    "    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;\n"
    "  }\n"
    "  .pbox canvas.pav { width: 34px; height: 34px; margin: 2px auto 0; display: block; }\n"
    "  .crow { display: flex; justify-content: center; gap: 3px; margin-top: 2px; }\n"
    "  .crow button {\n"
    "    width: 24px; height: 19px; border-radius: 5px; border: 1px solid #2a3a63; background: #182242;\n"
    "    color: #cfe0ff; font-weight: 900; cursor: pointer; font-family: inherit; font-size: 10px; line-height: 1;\n"
    "  }\n"
    "  /* v4.15：組隊對戰 —— 每格一顆隊徽（點一下換到下一隊） */\n"
    "  .ptmrow { margin-top: 3px; }\n"
    "  .ptm {\n"
    "    width: 100%; border: 1px solid #2a3a63; background: #0b1020; border-radius: 999px;\n"
    "    padding: 2px 0; font-family: inherit; font-weight: 900; font-size: 9.5px; cursor: pointer; line-height: 1.25;\n"
    "  }\n"
    "  .ptm:hover { filter: brightness(1.3); }\n")

rule(
    "    body.touch #scr-battle .pbox canvas.pav { width: 38px; height: 38px; margin: 3px auto 1px; }\n"
    "    body.touch #scr-battle .pbox { padding: 6px; }\n",
    "    body.touch #scr-battle .pbox canvas.pav { width: 30px; height: 30px; margin: 2px auto 0; }\n"
    "    body.touch #scr-battle .pbox { padding: 5px 4px; }\n"
    "    body.touch #pSlots, body.touch .slotgrid { grid-template-columns: repeat(auto-fit, minmax(82px, 1fr)); gap: 6px; }\n")

# ============ ④ Battle：位子／隊別 ============
rule(
    "  resetSlots() {\n"
    "    const n = settings.count === 8 ? 8 : 4;\n",
    "  resetSlots() {\n"
    "    const n = clampCount(settings.count);       // v4.15：2～8 人\n")

rule(
    "        ch: (pv && typeof pv.ch === 'number') ? pv.ch : randomChar(),\n"
    "        forceAi: i === 1\n"
    "      });\n"
    "    }\n"
    "    Battle.slots = arr;\n"
    "    Battle.renderSlots();\n"
    "  },\n",
    "        ch: (pv && typeof pv.ch === 'number') ? pv.ch : randomChar(),\n"
    "        forceAi: i === 1,\n"
    "        // v4.15：組隊對戰的隊別（0～3），關閉組隊時不會用到\n"
    "        team: (pv && typeof pv.team === 'number') ? pv.team : (i % 4)\n"
    "      });\n"
    "    }\n"
    "    Battle.slots = arr;\n"
    "    Battle.autoTeams();\n"
    "    Battle.renderSlots();\n"
    "  },\n"
    "  // v4.15：依隊數輪流分隊（P1 紅、P2 藍、P3 綠、P4 黃、P5 紅…）\n"
    "  autoTeams() {\n"
    "    const n = teamCount();\n"
    "    if (!n) return;\n"
    "    Battle.slots.forEach(function (s, i) { s.team = i % n; });\n"
    "  },\n"
    "  // 開戰前顯示「紅 P1／P5 · 藍 P2／P6 …」\n"
    "  teamSummary() {\n"
    "    const n = teamCount();\n"
    "    if (!n) return '';\n"
    "    const out = [];\n"
    "    for (let i = 0; i < n; i++) {\n"
    "      const mem = Battle.slots.filter(function (s) { return (s.team | 0) % n === i; })\n"
    "        .map(function (s) { return s.label; }).join('／');\n"
    "      out.push(TEAMS[i].dot + (mem || '—'));\n"
    "    }\n"
    "    return out.join('  ');\n"
    "  },\n")

rule(
    "      d.className = 'pbox' + (ai ? ' ai' : ' joined');\n",
    "      d.className = 'pbox' + (ai ? ' ai' : ' joined');\n"
    "      // v4.15：組隊時整格框線用隊色\n"
    "      const tmNow = teamCount() ? teamMeta(s.team) : null;\n"
    "      if (tmNow) d.style.borderColor = tmNow.hex;\n")

rule(
    "        '<div class=\"pw\">' + sub + '</div>';\n"
    "      wrap.appendChild(d);\n",
    "        (tmNow ? '<div class=\"ptmrow\"><button class=\"ptm\" data-tm=\"' + i + '\" title=\"點一下換隊\" ' +\n"
    "          'style=\"color:' + tmNow.hex + ';border-color:' + tmNow.hex + '\">' + tmNow.dot + ' ' + tmNow.name + '</button></div>' : '') +\n"
    "        '<div class=\"pw\">' + sub + '</div>';\n"
    "      wrap.appendChild(d);\n")

rule(
    "        Battle.renderSlots();\n"
    "      });\n"
    "    });\n"
    "    drawAvatarsIn(wrap);\n",
    "        Battle.renderSlots();\n"
    "      });\n"
    "    });\n"
    "    // v4.15：隊徽 → 點一下就換到下一隊\n"
    "    wrap.querySelectorAll('.ptm').forEach(function (b) {\n"
    "      b.addEventListener('click', function () {\n"
    "        AudioSys.sfx('click');\n"
    "        const s = Battle.slots[parseInt(b.getAttribute('data-tm'), 10)];\n"
    "        if (!s || !teamCount()) return;\n"
    "        s.team = ((s.team | 0) + 1) % teamCount();\n"
    "        Battle.renderSlots();\n"
    "      });\n"
    "    });\n"
    "    drawAvatarsIn(wrap);\n")

# ============ ⑤ startBattle：隊別／勝場 ============
rule(
    "  Game.winsNeeded = parseInt(settings.wins, 10) || 2;\n"
    "  // 全部 4 位出戰：沒人加入的槽位由 AI 電腦補位\n",
    "  Game.winsNeeded = parseInt(settings.wins, 10) || 2;\n"
    "  Game.teamWins = [0, 0, 0, 0];               // v4.15：各隊勝場（只有組隊模式會用）\n"
    "  // 全部出戰：沒人加入的槽位由 AI 電腦補位（v4.15：2～8 人）\n")

rule(
    "    const p = makePlayer(i, s.ch, scheme, { px: 0, py: 0 });\n"
    "    p.label = s.label;\n",
    "    const p = makePlayer(i, s.ch, scheme, { px: 0, py: 0 });\n"
    "    p.label = s.label;\n"
    "    p.team = teamCount() ? ((s.team | 0) % teamCount()) : -1;   // v4.15：組隊對戰\n")

rule(
    "  if (!human) p.ai = true;\n"
    "    return p;\n"
    "  });\n"
    "  Screen.show('game');\n",
    "  if (!human) p.ai = true;\n"
    "    return p;\n"
    "  });\n"
    "  // v4.15：分完隊後如果只湊得到一隊（大家都同隊）→ 自動退回混戰，不然一開局就結束\n"
    "  Game.teamsOn = teamCount();\n"
    "  if (Game.teamsOn) {\n"
    "    const used = {};\n"
    "    Game.players.forEach(function (p) { if (p.team >= 0) used[p.team] = 1; });\n"
    "    if (Object.keys(used).length < 2) {\n"
    "      Game.teamsOn = 0;\n"
    "      Game.players.forEach(function (p) { p.team = -1; });\n"
    "    }\n"
    "  }\n"
    "  Screen.show('game');\n")

rule(
    "  showOverlay({\n"
    "    title: t('bt.startOv'),\n"
    "    sub: t('bt.startSub', { n: Game.winsNeeded }),\n",
    "  showOverlay({\n"
    "    title: t('bt.startOv'),\n"
    "    // v4.15：組隊時在開場提示後面加上分隊結果（紅 P1／P3 · 藍 P2／P4）\n"
    "    sub: t('bt.startSub', { n: Game.winsNeeded }) + (Game.teamsOn ? '\\n' + Battle.teamSummary() : ''),\n")

# ============ ⑥ 勝負判定（組隊） ============
rule(
    "    // 勝負判定\n"
    "    const alive = Game.players.filter(function (p) { return p.alive; });\n"
    "    if (alive.length <= 1 && Game.state === 'play') {\n"
    "      Game.state = 'roundover';\n"
    "      const winner = alive[0] || null;\n"
    "      if (winner) { winner.wins += 1; winner.score += 500; winner.cheerT = 1.8; }\n",
    "    // 勝負判定\n"
    "    const alive = Game.players.filter(function (p) { return p.alive; });\n"
    "    // v4.15：組隊模式 → 「只剩一隊有人活著」才算一隊贏（自己人互炸不會出事）\n"
    "    if (Game.teamsOn >= 2) {\n"
    "      const teamsAlive = [];\n"
    "      alive.forEach(function (p) { if (teamsAlive.indexOf(p.team) < 0) teamsAlive.push(p.team); });\n"
    "      if (teamsAlive.length <= 1 && Game.state === 'play') {\n"
    "        Game.state = 'roundover';\n"
    "        const winTeam = teamsAlive.length ? teamsAlive[0] : -1;\n"
    "        let rep = null;\n"
    "        if (winTeam >= 0) {\n"
    "          Game.teamWins[winTeam] = (Game.teamWins[winTeam] | 0) + 1;\n"
    "          Game.players.forEach(function (p) {\n"
    "            if (p.team !== winTeam) return;\n"
    "            p.wins += 1; p.score += 500; p.cheerT = 1.8; rep = p;\n"
    "            confetti(p.x, p.y - Game.T * .6, 12);\n"
    "          });\n"
    "        }\n"
    "        banner(winTeam >= 0 ? t('bt.win', { n: teamName(winTeam) }) : t('bt.draw'), 3.4);\n"
    "        battleEndFx(winTeam >= 0, rep ? rep.x : null, rep ? rep.y - Game.T * .6 : null);\n"
    "        if (winTeam >= 0) AudioSys.sfx('victory');\n"
    "        else Game.players.forEach(function (p) { confetti(p.x, p.y - Game.T * .6, 14); });\n"
    "        setTimeout(function () { nextBattleRound(rep, winTeam); }, 4200);\n"
    "      }\n"
    "    } else if (alive.length <= 1 && Game.state === 'play') {\n"
    "      Game.state = 'roundover';\n"
    "      const winner = alive[0] || null;\n"
    "      if (winner) { winner.wins += 1; winner.score += 500; winner.cheerT = 1.8; }\n")

rule(
    "function nextBattleRound(winner) {\n"
    "  if (winner && winner.wins >= Game.winsNeeded) {\n"
    "    Game.state = 'over';\n"
    "    showEnd('🏆 ' + t('bt.crown', { n: pname(winner) }), t('bt.score') +\n"
    "      Game.players.map(function (p) { return pname(p) + ' ' + p.wins; }).join(' ／ '), true, winner.chIdx);\n"
    "    battleEndFx(true, winner.x, winner.y - Game.T);\n"
    "    AudioSys.startBGM('menu');\n"
    "    return;\n"
    "  }\n",
    "function nextBattleRound(winner, winTeam) {\n"
    "  // v4.15：組隊模式看「隊伍勝場」，混戰看個人勝場\n"
    "  const byTeam = (Game.teamsOn >= 2) && typeof winTeam === 'number';\n"
    "  const done = byTeam\n"
    "    ? (winTeam >= 0 && (Game.teamWins[winTeam] | 0) >= Game.winsNeeded)\n"
    "    : !!(winner && winner.wins >= Game.winsNeeded);\n"
    "  if (done) {\n"
    "    Game.state = 'over';\n"
    "    let title, scoreLine;\n"
    "    if (byTeam) {\n"
    "      title = '🏆 ' + t('bt.crown', { n: teamName(winTeam) });\n"
    "      const seen = [];\n"
    "      scoreLine = Game.players.map(function (p) { return p.team; })\n"
    "        .filter(function (v) { return seen.indexOf(v) < 0 && seen.push(v); })\n"
    "        .map(function (i) { return teamName(i) + ' ' + (Game.teamWins[i] | 0); })\n"
    "        .join(' ／ ');\n"
    "    } else {\n"
    "      title = '🏆 ' + t('bt.crown', { n: pname(winner) });\n"
    "      scoreLine = Game.players.map(function (p) { return pname(p) + ' ' + p.wins; }).join(' ／ ');\n"
    "    }\n"
    "    showEnd(title, t('bt.score') + scoreLine, true, winner ? winner.chIdx : 0);\n"
    "    battleEndFx(true, winner ? winner.x : null, winner ? winner.y - Game.T : null);\n"
    "    AudioSys.startBGM('menu');\n"
    "    return;\n"
    "  }\n")

# ============ ⑦ 同隊不互炸 ============
rule(
    "        if (Game.flames[i].src === 'dino' && Game.flames[i].owner === p) continue;\n"
    "        const killer = Game.flames[i].owner;\n",
    "        if (Game.flames[i].src === 'dino' && Game.flames[i].owner === p) continue;\n"
    "        const killer = Game.flames[i].owner;\n"
    "        // v4.15：組隊對戰 —— 自己人的火焰燒不到自己人（自己也炸不到自己這件事照舊）\n"
    "        if (Game.teamsOn >= 2 && killer && killer !== p && killer.team >= 0 && killer.team === p.team) continue;\n")

# ============ ⑧ 角色身上的隊色 ============
rule(
    "    isHuman: true, ai: null\n"
    "  };\n",
    "    isHuman: true, ai: null,\n"
    "    team: -1                                      // v4.15：組隊對戰的隊別（-1 = 混戰）\n"
    "  };\n")

rule(
    "  softShadow(x, y + T * .37, Math.max(4, R * .80 - bob2 * .9), Math.max(2, R * .24 - bob2 * .18), .34 - bob2 * .05);\n",
    "  softShadow(x, y + T * .37, Math.max(4, R * .80 - bob2 * .9), Math.max(2, R * .24 - bob2 * .18), .34 - bob2 * .05);\n"
    "  // v4.15：組隊對戰 —— 腳下一圈隊色光環（一眼看出誰是自己人）\n"
    "  const tmD = (p.team >= 0) ? teamMeta(p.team) : null;\n"
    "  if (tmD && Game.mode === 'battle') {\n"
    "    ctx.strokeStyle = tmD.hex;\n"
    "    ctx.lineWidth = Math.max(2, T * .055);\n"
    "    ctx.globalAlpha = .9;\n"
    "    ctx.beginPath();\n"
    "    ctx.ellipse(x, y + T * .37, R * .92, R * .34, 0, 0, 6.283);\n"
    "    ctx.stroke();\n"
    "    ctx.globalAlpha = 1;\n"
    "    ctx.lineWidth = 1;\n"
    "  }\n")

rule(
    "    const label = pname(p) + (p.ai ? '🤖' : '');\n"
    "    const tw = ctx.measureText(label).width;\n"
    "    ctx.fillRect(x - tw / 2 - 4, y - R * 2.3 - 13, tw + 8, 13);\n"
    "    ctx.fillStyle = c.color;\n",
    "    const label = (tmD ? tmD.dot : '') + pname(p) + (p.ai ? '🤖' : '');\n"
    "    const tw = ctx.measureText(label).width;\n"
    "    ctx.fillRect(x - tw / 2 - 4, y - R * 2.3 - 13, tw + 8, 13);\n"
    "    ctx.fillStyle = tmD ? tmD.hex : c.color;\n")

# ============ ⑨ HUD 玩家卡隊色 ============
rule(
    "    const card = function (p) {\n"
    "      return '<div class=\"pcard' + (p.alive ? '' : ' dead') + '\">' +\n"
    "        '<canvas class=\"pav\" width=\"52\" height=\"52\" data-ch=\"' + p.chIdx + '\"></canvas>' +\n"
    "        '<span class=\"pkinfo\">' +\n"
    "        '<span class=\"plabel\" style=\"color:' + p.ch.color + '\">' + pname(p) + (p.ai ? '🤖' : '') + (p.cart ? '🛒' : '') + '</span>' +\n"
    "        '<span class=\"pstars\">⭐' + p.wins + '</span></span></div>';\n"
    "    };\n",
    "    const card = function (p) {\n"
    "      const tmC = (p.team >= 0) ? teamMeta(p.team) : null;   // v4.15：組隊 → 隊色\n"
    "      return '<div class=\"pcard' + (p.alive ? '' : ' dead') + '\"' +\n"
    "        (tmC ? ' style=\"border-color:' + tmC.hex + '\"' : '') + '>' +\n"
    "        '<canvas class=\"pav\" width=\"52\" height=\"52\" data-ch=\"' + p.chIdx + '\"></canvas>' +\n"
    "        '<span class=\"pkinfo\">' +\n"
    "        '<span class=\"plabel\" style=\"color:' + (tmC ? tmC.hex : p.ch.color) + '\">' +\n"
    "          (tmC ? tmC.dot : '') + pname(p) + (p.ai ? '🤖' : '') + (p.cart ? '🛒' : '') + '</span>' +\n"
    "        '<span class=\"pstars\">⭐' + p.wins + '</span></span></div>';\n"
    "    };\n")

# ============ ⑩ 分段按鈕 / 提示 ============
rule(
    "refreshers.push(segWire('segCount', function () { return settings.count; }, function (v) {\n"
    "  settings.count = parseInt(v, 10) === 8 ? 8 : 4;\n"
    "  Battle.resetSlots();                       // 立刻重建 4／8 個位子\n"
    "  updateCountHint();\n"
    "}));\n",
    "refreshers.push(segWire('segCount', function () { return settings.count; }, function (v) {\n"
    "  settings.count = clampCount(v);\n"
    "  Battle.resetSlots();                       // v4.15：立刻重建 2～8 個位子\n"
    "  updateCountHint();\n"
    "}));\n"
    "refreshers.push(segWire('segTeams', function () { return settings.teams; }, function (v) {\n"
    "  const n = parseInt(v, 10);\n"
    "  settings.teams = [0, 2, 3, 4].indexOf(n) >= 0 ? n : 0;\n"
    "  Battle.autoTeams();                        // 重新分隊\n"
    "  Battle.renderSlots();\n"
    "  updateCountHint();\n"
    "}));\n")

rule(
    "  const n = settings.count === 8 ? 8 : 4;\n"
    "  el.innerHTML = t('bt.countHint', { n: n });\n",
    "  const n = clampCount(settings.count);\n"
    "  el.innerHTML = t('bt.countHint', { n: n }) + (teamCount() ? '<br>' + Battle.teamSummary() : '');\n")

# ============ ⑪ 線上配對：人數 / 組隊 ============
rule(
    "      Net.count = parseInt(b.getAttribute('data-v'), 10) === 8 ? 8 : 4;\n",
    "      Net.count = clampCount(b.getAttribute('data-v'));   // v4.15：2～8 人\n")

rule(
    "      p.label = 'P' + (i + 1);\n"
    "      Game.players.push(p);\n"
    "    }\n"
    "  },\n",
    "      p.label = 'P' + (i + 1);\n"
    "      p.team = teamCount() ? (i % teamCount()) : -1;   // v4.15：線上組隊（以房主設定為準）\n"
    "      Game.players.push(p);\n"
    "    }\n"
    "    Game.teamsOn = (teamCount() && Game.players.filter(function (q) { return q.team >= 0; })\n"
    "      .map(function (q) { return q.team; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).length >= 2)\n"
    "      ? teamCount() : 0;\n"
    "  },\n")

rule(
    "    Game.winsNeeded = parseInt(settings.wins, 10) || 2;\n"
    "    Game.players.forEach(function (p) { p.wins = 0; });\n",
    "    Game.winsNeeded = parseInt(settings.wins, 10) || 2;\n"
    "    Game.teamWins = [0, 0, 0, 0];               // v4.15：組隊勝場\n"
    "    Game.players.forEach(function (p) { p.wins = 0; });\n")

# 快照：帶隊別
rule(
    "          Math.round((p.gloat || 0) * 10) / 10, p.chIdx | 0, p.wins | 0, p.name || '',\n"
    "          p.ai ? 1 : 0];\n",
    "          Math.round((p.gloat || 0) * 10) / 10, p.chIdx | 0, p.wins | 0, p.name || '',\n"
    "          p.ai ? 1 : 0, (p.team === undefined || p.team === null) ? -1 : (p.team | 0)];\n")

rule(
    "      g: rows, hz: hz, tm: Math.round(Game.timer * 10) / 10, st: Game.state,\n"
    "      sd: Game.sdActive ? 1 : 0, pl: pl,\n",
    "      g: rows, hz: hz, tm: Math.round(Game.timer * 10) / 10, st: Game.state,\n"
    "      sd: Game.sdActive ? 1 : 0, pl: pl, tt: Game.teamsOn | 0,\n")

rule(
    "      p.ai = !!row[10];\n",
    "      p.ai = !!row[10];\n"
    "      p.team = (row[11] === undefined || row[11] === null) ? -1 : (row[11] | 0);   // v4.15\n")

rule(
    "    Game.sdActive = !!s.sd;\n",
    "    Game.sdActive = !!s.sd;\n"
    "    Game.teamsOn = s.tt | 0;                     // v4.15：組隊隊數（房主決定）\n")

# ============ ⑫ 主選單「組隊 對戰」正式開放 ============
rule(
    '        <button class="mbtn soon" id="btnTeam">👥 組隊 對戰<small>未開放 敬請期待</small></button>\n',
    '        <button class="mbtn" id="btnTeam">👥 組隊 對戰<small>紅／藍／綠／黃 4 隊 · 2～8 人</small></button>\n')

rule(
    "$id('btnTeam').addEventListener('click', function () {\n"
    "  AudioSys.ensure(); AudioSys.sfx('click');\n"
    "    toast(t('menu.team.toast'), 2.4);\n"
    "});\n",
    "$id('btnTeam').addEventListener('click', function () {\n"
    "  AudioSys.ensure(); AudioSys.sfx('click');\n"
    "  if (!ensureNickname()) return;\n"
    "  // v4.15：組隊對戰正式開放 —— 直接進對戰設定，預設開 2 隊（紅 vs 藍）\n"
    "  if (!teamCount()) settings.teams = 2;\n"
    "  Screen.show('battle');\n"
    "  Battle.autoTeams();\n"
    "  Battle.resetSlots();\n"
    "  updateCountHint();\n"
    "  toast('👥 組隊對戰：' + Battle.teamSummary() + '（點隊徽可換隊）', 2.8);\n"
    "});\n")

# ============ 套用 ============
for old, new in R:
    c = text.count(old)
    assert c == 1, '規則命中 %d 次（應為 1）：%r' % (c, old[:70])
    text = text.replace(old, new)

with io.open(P, 'w', encoding='utf-8', newline='') as f:
    f.write(text.replace('\n', '\r\n'))
print('patch_v415 OK：%d 條規則' % len(R))
