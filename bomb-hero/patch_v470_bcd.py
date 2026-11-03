# -*- coding: utf-8 -*-
# v4.70 B：RPG 每章最後一關出魔王
# v4.70 C：大逃殺門票「每日免費 1 張」
# v4.70 D：隨機地圖種子碼顯示
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
            sys.stderr.write(repr(s[max(0, i - 200):i + 300]) + '\n')
        sys.exit(1)
    s = s.replace(old, new)
    print('[ok] ' + tag)


# ---------------- B：RPG 章節魔王 ----------------
rep("""  // 第 32 張（魔王之間）＝ BOSS 關
  if (stage >= 32) {
    const by = Math.max(1, rows - 3), bx = clamp(Math.floor(cols / 2), 1, cols - 2);
    Game.grid[by][bx] = 0;
    const boss = makeBoss(bx, by, 12 + Math.round(stage * .35));
    boss.def = 1;
    boss.dirName = 'up';
    Game.enemies.push(boss);
  }""",
    """  // v4.70：每一章最後一關都出魔王（跟單人闖關同一套規則）——
  //   章節魔王小一號、血量 4+blockOf 遞增；第 32 關仍是最終魔王（血量最大、def 1）
  if ((stage % 4) === 0) {
    const fin = stage >= 32;
    const bc = pickBossCell(clamp(Math.floor(cols / 2), 1, cols - 2), Math.max(1, rows - 2), cols, rows);
    const boss = makeBoss(bc.x, bc.y, fin ? 12 + Math.round(stage * .35) : 4 + blockOf(stage));
    boss.dirName = 'up';
    if (fin) {
      boss.def = 1;
    } else {
      boss.sizeMul = 1.12;          // 跟單人的章節魔王一樣，比最終魔王小一號
      boss.chapterBoss = true;
    }
    Game.enemies.push(boss);
  }""",
    'rpg-chapter-boss')

# ---------------- C：每日免費門票 ----------------
rep("""  // v4.69：大逃殺門票（每場消耗一張，可重複購買）
  const TK = 'bombhero-br-ticket', TICKET_PRICE = 2000;
  let owned = [], gold = 0, tickets = 0;""",
    """  // v4.69：大逃殺門票（每場消耗一張，可重複購買）
  // v4.70：每天第一次登入自動送 1 張（新手也摸得到大逃殺）
  const TK = 'bombhero-br-ticket', TICKET_PRICE = 2000;
  const FK = 'bombhero-br-free';
  let owned = [], gold = 0, tickets = 0, freeJust = 0;""",
    'ticket-daily-state')

rep("""    try { tickets = parseInt(localStorage.getItem(TK) || '0', 10) || 0; } catch (e) { tickets = 0; }
    if (!isFinite(tickets) || tickets < 0) tickets = 0;
  }""",
    """    try { tickets = parseInt(localStorage.getItem(TK) || '0', 10) || 0; } catch (e) { tickets = 0; }
    if (!isFinite(tickets) || tickets < 0) tickets = 0;
    claimDaily();
  }
  // v4.70：每日免費門票 —— 用「本地日期字串」比對，同一天只送一次；
  //   換日（或第一次玩）就 +1。存檔壞掉時靜默跳過，不能讓整個 Shop 掛掉。
  function todayKey() {
    const d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function claimDaily() {
    try {
      const last = localStorage.getItem(FK) || '';
      if (last === todayKey()) return;
      tickets++;
      freeJust = 1;
      localStorage.setItem(FK, todayKey());
    } catch (e) {}
  }""",
    'ticket-daily-claim')

rep("""      '<div class="shdesc" style="margin-top:6px;color:#d4491f"><b>持有 ' + tickets + ' 張</b></div>' +""",
    """      '<div class="shdesc" style="margin-top:6px;color:#d4491f"><b>持有 ' + tickets + ' 張</b>' +
      '<span style="color:#1c7a4a;margin-left:8px">（每天登入送 1 張，今日已送）</span></div>' +""",
    'ticket-card')

rep("""  function open() {
    // v4.21：先切畫面、再畫內容。舊版是 render() → Screen.show()，""",
    """  function open() {
    // v4.70：今天第一次拿到免費門票 → 進商店時提醒一次（不重複洗頻）
    if (freeJust) {
      freeJust = 0;
      try { toast('🎁 每日免費大逃殺門票 +1（目前 ' + tickets + ' 張）', 2.8); } catch (e) {}
    }
    // v4.21：先切畫面、再畫內容。舊版是 render() → Screen.show()，""",
    'ticket-toast')

rep("""    buyTicket: buyTicket, useTicket: useTicket,
    tickets: function () { return tickets; },""",
    """    buyTicket: buyTicket, useTicket: useTicket,
    tickets: function () { return tickets; },
    claimDaily: claimDaily, todayKey: todayKey,""",
    'ticket-exports')

# ---------------- D：地圖種子碼 ----------------
rep("""function stageRandSeed(stage) {""",
    """// v4.70：這一關的地圖種子碼（5 碼 base36）—— 朋友之間可以報同一個種子玩同一張圖
function seedCode() {
  if (!Game._seed) return '';
  return (Game._seed >>> 0).toString(36).toUpperCase().slice(-5);
}
function seedTag() {
  if (!mapModeRandom() || !Game._seed) return '';
  const c = seedCode();
  return c ? '　🔑 ' + c : '';
}
function stageRandSeed(stage) {""",
    'seed-helpers')

rep("""    sub: (Game.bossRush ? t('solo.ovBossSub') : (soloIsBoss(stage) ? t('solo.ovBossSub2') : t('solo.ovSub'))) +
      t('solo.ovTime', { d: soloDiffCfg().label, t: (tSec ? fmtTime(tSec) : t('time.inf')) }),""",
    """    sub: (Game.bossRush ? t('solo.ovBossSub') : (soloIsBoss(stage) ? t('solo.ovBossSub2') : t('solo.ovSub'))) +
      t('solo.ovTime', { d: soloDiffCfg().label, t: (tSec ? fmtTime(tSec) : t('time.inf')) }) +
      seedTag(),""",
    'seed-overlay')

rep("""  drawMiniMap: drawMiniMap, miniMapOn: miniMapOn, miniMapBox: miniMapBox, drawTeamHud: drawTeamHud,""",
    """  drawMiniMap: drawMiniMap, miniMapOn: miniMapOn, miniMapBox: miniMapBox, drawTeamHud: drawTeamHud,
  seedCode: seedCode, seedTag: seedTag,""",
    'seed-exports')

io.open(P, 'w', encoding='utf-8', newline='\n').write(s)
print('written', len(s))
