# -*- coding: utf-8 -*-
"""v2.7：多語言系統（10 語）"""
import io, os, sys, re

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(BASE, 'index.html')
s = io.open(P, encoding='utf-8').read()
orig_len = len(s)

def rd(name):
    return io.open(os.path.join(BASE, 'test', name), encoding='utf-8').read()

def rep(old, new, cnt=1):
    global s
    if old not in s:
        print('MISS: ' + repr(old[:110]))
        sys.exit(1)
    s = s.replace(old, new, cnt)
    print('ok   ' + repr(old[:70]))

# ---------- 1. 版本 + 插入字典與核心 ----------
rep("const VERSION = '2.6';",
    "const VERSION = '2.7';\n\n" +
    rd('i18n_1.js') + "\n" + rd('i18n_2.js') + "\n" + rd('i18n_3.js') + "\n" +
    rd('i18n_4.js') + "\n" + rd('i18n_0.js'))
rep('<span id="verTxt">2.6</span>', '<span id="verTxt">2.7</span>')

# ---------- 2. 工具列：語言鈕 + 選單 ----------
rep('''    <button class="navbtn tg on" id="btnMusic" type="button" title="開關主音樂">🎵 <b>音樂</b></button>''',
    '''    <button class="navbtn tg on" id="btnMusic" type="button" title="開關主音樂">🎵 <b>音樂</b></button>
    <button class="navbtn tg" id="btnLang" type="button" title="切換顯示語言">🌐 <b>語言</b></button>
    <div id="langMenu" class="hide"><div class="lmtitle" id="langMenuTitle">語言</div><div id="langList"></div></div>''')

# ---------- 3. CSS ----------
rep('  #navBar .navright { display: flex; gap: 7px; }',
    '''  #navBar .navright { display: flex; gap: 7px; position: relative; }
  /* v2.7：語言選單 */
  #langMenu {
    position: absolute; top: 44px; left: 0; z-index: 1400; pointer-events: auto;
    min-width: 174px; padding: 7px; border-radius: 13px;
    background: rgba(26,20,38,.97); border: 1.5px solid rgba(255,180,120,.5);
    box-shadow: 0 14px 34px -10px rgba(0,0,0,.85);
    display: grid; gap: 2px; max-height: 60vh; overflow-y: auto;
  }
  #langMenu.hide { display: none; }
  #langMenu .lmtitle { font-size: 11px; opacity: .62; padding: 2px 9px 5px; font-weight: 800; color: #ffe6c9; }
  #langMenu .lmbtn {
    display: flex; align-items: center; width: 100%; padding: 8px 10px;
    border: 0; border-radius: 9px; background: transparent; color: #ffe6c9;
    font-family: inherit; font-size: 13px; font-weight: 700; text-align: left; cursor: pointer;
  }
  #langMenu .lmbtn:hover { background: rgba(255,255,255,.12); }
  #langMenu .lmbtn.on { background: rgba(255,200,120,.24); font-weight: 900; }
  @media (max-width: 520px) { #btnLang b { display: none; } #btnLang { padding: 8px 12px; font-size: 15px; } }''')

# ---------- 4. 綁定事件 ----------
rep('''    toast('✉️ ' + MAIL_ADDR + '　（已複製，可直接貼到信箱）', 2.8);
  });''',
    '''    toast(t('mail.toast', { addr: MAIL_ADDR }), 2.8);
  });
  // v2.7：語言切換（就放在音樂開關旁邊）
  const lg = $id('btnLang');
  if (lg) lg.addEventListener('click', function () {
    try { AudioSys.ensure(); AudioSys.sfx('click'); } catch (e) {}
    toggleLangMenu();
  });
  try {
    document.addEventListener('click', function (ev) {
      const mm = $id('langMenu'), bb = $id('btnLang');
      if (!mm || mm.classList.contains('hide')) return;
      const tg2 = ev.target;
      if (mm.contains && mm.contains(tg2)) return;
      if (bb && (tg2 === bb || (bb.contains && bb.contains(tg2)))) return;
      closeLangMenu();
    }, true);
  } catch (e) {}
  updateLangBtn();''')

# ---------- 5. 音樂／音效提示 ----------
rep("try { toast(settings.bgm > 0 ? '🎵 主音樂：開' : '🎵 主音樂：關', 1.2); } catch (e) {}",
    "try { toast(settings.bgm > 0 ? t('sfx.bgmOn') : t('sfx.bgmOff'), 1.2); } catch (e) {}")
rep("try { toast(settings.sfx > 0 ? '🔊 音效：開' : '🔊 音效：關', 1.2); } catch (e) {}",
    "try { toast(settings.sfx > 0 ? t('sfx.sfxOn') : t('sfx.sfxOff'), 1.2); } catch (e) {}")

# ---------- 6. 全視窗鈕文字／標題 ----------
rep("  if (lb) lb.textContent = on ? '全視窗 ON' : '全視窗';",
    "  if (lb) lb.textContent = on ? t('nav.fullOn') : t('nav.full');\n"
    "  if (typeof el.setAttribute === 'function') el.setAttribute('title', t('nav.full'));")

# ---------- 7. banner / toast / 浮層 / 結算：自動翻譯（沒改到的中文字串也會被翻） ----------
rep("""function banner(txt, dur) {
  $id('bannerTxt').textContent = txt;""",
    """function banner(txt, dur) {
  txt = tr(txt);
  $id('bannerTxt').textContent = txt;""")
rep("""function toast(txt, dur) {
  const t = $id('toast');
  t.textContent = txt;""",
    """function toast(txt, dur) {
  txt = tr(txt);
  const tt = $id('toast');
  tt.textContent = txt;""")
rep("""  box.querySelector('h3').textContent = o.title;
  box.querySelector('p').textContent = o.sub;
  const btn = box.querySelector('button');
  btn.textContent = o.btn;""",
    """  box.querySelector('h3').textContent = tr(o.title);
  box.querySelector('p').textContent = tr(o.sub);
  const btn = box.querySelector('button');
  btn.textContent = tr(o.btn);""")
rep("""  box.querySelector('h3').textContent = title;
  box.querySelector('p').textContent = sub;""",
    """  box.querySelector('h3').textContent = tr(title);
  box.querySelector('p').textContent = tr(sub);""")
rep("""'<button class="mbtn warm" id="btnAgain" style="width:auto;padding:11px 26px;">再來一場</button>' +
    '<button class="ghostbtn" id="btnHome">回主選單</button></div>';""",
    """'<button class="mbtn warm" id="btnAgain" style="width:auto;padding:11px 26px;">' + t('over.again') + '</button>' +
    '<button class="ghostbtn" id="btnHome">' + t('over.home') + '</button></div>';""")

# ---------- 8. 玩家名字：角色名跟語言 ----------
rep("  return (p.name && String(p.name).trim()) || p.ch.name;",
    "  return (p.name && String(p.name).trim()) || charName(p.ch);")

# ---------- 9. 「我」牌子 ----------
rep("  ctx.fillText(ME_BADGE_TXT, x, top + h * .56);", "  ctx.fillText(t('badge.me'), x, top + h * .56);")
rep("  ctx.fillText(ME_BADGE_TXT, x, top + h * .5);", "  ctx.fillText(t('badge.me'), x, top + h * .5);")

# ---------- 10. 單人：鎖關提示、開場浮層 ----------
rep("if (n > Solo.unlocked) { toast('🔒 第 ' + n + ' 關還沒解鎖，先通過前面的關卡！', 1.8); return; }",
    "if (n > Solo.unlocked) { toast(t('solo.lockToast', { n: n }), 1.8); return; }")
rep("""    if (txt) txt.textContent = lock ? '🔒 尚未解鎖' : '▶ 開始遊戲 · 第 ' + n + ' 關';
    if (sub) sub.textContent = lock ? '先通過前面的關卡才能進來'
      : th.name + (n === THEMES.length ? ' · 👹 暗黑魔王' : '');""",
    """    if (txt) txt.textContent = lock ? t('solo.locked') : t('solo.go', { n: n });
    if (sub) sub.textContent = lock ? t('solo.lockedhint')
      : themeName(n - 1) + (n === THEMES.length ? t('boss.suffix') : '');""")
rep("""    title: Game.bossRush ? '👹 BOSS 討伐 · ' + Game.theme.name : '第 ' + stage + ' 關 · ' + Game.theme.name,
    sub: (Game.bossRush ? '暗黑魔王就在這裡！沒有小怪干擾，專心轟爆牠！' : (stage === 8 ? '暗黑魔王在此！用炸彈轟爆牠！' : '殲滅所有敵人後，走進傳送門過關！')) +
      '\\n難易度：' + soloDiffCfg().label + '　·　時間：' + (tSec ? fmtTime(tSec) : '♾️ 無限'),
    btn: '出發！',""",
    """    title: Game.bossRush ? t('solo.ovBossTitle', { name: themeName(stage - 1) }) : t('solo.ovTitle', { n: stage, name: themeName(stage - 1) }),
    sub: (Game.bossRush ? t('solo.ovBossSub') : (stage === 8 ? t('solo.ovBossSub2') : t('solo.ovSub'))) +
      t('solo.ovTime', { d: soloDiffCfg().label, t: (tSec ? fmtTime(tSec) : t('time.inf')) }),
    btn: t('solo.ovGo'),""")
rep("""            showEnd(Game.bossRush ? '👹 BOSS 討伐成功！' : '通关啦！',
              (Game.bossRush ? '你單挑了暗黑魔王！' : '你打倒了暗黑魔王，全關卡制霸！') + '\\n分數：' + p.score +
              '\\n難易度：' + soloDiffCfg().label, true, p.chIdx);""",
    """            showEnd(Game.bossRush ? t('solo.bossWinTitle') : t('solo.winTitle'),
              (Game.bossRush ? t('solo.bossWinSub') : t('solo.winSub')) + t('solo.winScore', { s: p.score }) +
              t('solo.diffLabel', { d: soloDiffCfg().label }), true, p.chIdx);""")
rep("""              title: '過關！',
              sub: '分數 ' + p.score + '　·　前進第 ' + (Game.stage + 1) + ' 關「' + THEMES[Game.stage].name + '」',
              btn: '繼續',""",
    """              title: t('solo.clearTitle'),
              sub: t('solo.clearSub', { s: p.score, n: (Game.stage + 1), name: themeName(Game.stage) }),
              btn: t('solo.clearBtn'),""")
rep("""        showEnd('遊戲結束', '抵達第 ' + Game.stage + ' 關　·　分數 ' + p.score + '　·　' + soloDiffCfg().label, false);""",
    """        showEnd(t('solo.overTitle'), t('solo.overSub', { n: Game.stage, s: p.score }) + '　·　' + soloDiffCfg().label, false);""")
rep("""          banner('敵人清光了！炸開剩下的軟磚找出傳送門 🚪');""",
    """          banner(t('solo.doorHint'));""")
rep("""  toast('✦ 出口出現了！走進傳送門前往下一關', 2.6);
  banner('出口開啟', .9);""",
    """  toast(t('solo.doorOpen'), 2.6);
  banner(t('solo.doorBanner'), .9);""")

# ---------- 11. 選角卡 ----------
rep("""        'title="' + c.name + '（' + c.en + '）· ' + c.tag + '">' +""",
    """        'title="' + charName(c) + '（' + c.en + '）· ' + charTag(c) + '">' +""")
rep("""        '<span class="cn" style="color:' + shadeHex(c.color, .52) + '">' + c.name + '</span>' +
        '<span class="ct">' + c.tag + '</span>' +""",
    """        '<span class="cn" style="color:' + shadeHex(c.color, .52) + '">' + charName(c) + '</span>' +
        '<span class="ct">' + charTag(c) + '</span>' +""")
rep("""      if (hint) hint.innerHTML = '目前選用：<b style="color:' + shadeHex(ch.color, .48) + '">' + ch.name + '</b>（' + ch.en + '）· ' + ch.tag +
        '　—　直接用這隻動物上場，走路、放彈、受傷都會動。';""",
    """      if (hint) hint.innerHTML = t('char.pick') + '<b style="color:' + shadeHex(ch.color, .48) + '">' + charName(ch) + '</b>（' + ch.en + '）· ' + charTag(ch) +
        t('char.using');""")
rep("""      b.innerHTML = '<b>' + n + '</b><span>' + th.name + (i === THEMES.length - 1 ? ' · 👹' : '') + '</span>';""",
    """      b.innerHTML = '<b>' + n + '</b><span>' + themeName(i) + (i === THEMES.length - 1 ? t('boss.suffix') : '') + '</span>';""")

# ---------- 12. 對戰槽位 ----------
rep("""        sub: i === 0 ? '鍵盤 1（WASD + 空白鍵）'
          : i === 1 ? '鍵盤 2（方向鍵 + Enter）· 預設 AI'
          : '手把 ' + (i - 1) + ' · 按 A 加入',""",
    """        subKey: i === 0 ? 'bt.kb1' : i === 1 ? 'bt.kb2' : 'bt.padJoin',
        subN: i - 1,""")
rep("""      const sub = !s.joined ? 'AI 電腦對打 · 手把按 A 可取代'
        : s.forceAi ? '🤖 AI 託管中（點 🤖 改回人類）' : s.sub;
      d.innerHTML = '<div class="pj">' + s.label + ' ' + (ai ? '🤖 AI' : c.name) + '</div>' +""",
    """      const sub = !s.joined ? t('bt.padPlay')
        : s.forceAi ? t('bt.aiHosted') : t(s.subKey || 'bt.padJoin', { n: s.subN });
      d.innerHTML = '<div class="pj">' + s.label + ' ' + (ai ? '🤖 AI' : charName(c)) + '</div>' +""")
rep("""        '<input class="pname" data-n="' + i + '" maxlength="8" placeholder="' + c.name + '" value="' +""",
    """        '<input class="pname" data-n="' + i + '" maxlength="8" placeholder="' + charName(c) + '" value="' +""")

# ---------- 13. 對戰流程 ----------
rep("""  showOverlay({
    title: '對戰開始！',
    sub: '先拿 ' + Game.winsNeeded + ' 勝的人獲勝\\n沒人類的槽位由 🤖 AI 託管 · 踢彈・投彈・打彈・遙控（E 引爆）・恐龍吐火（F） · 活用自己的裝備',
    btn: '開戰！',""",
    """  showOverlay({
    title: t('bt.startOv'),
    sub: t('bt.startSub', { n: Game.winsNeeded }),
    btn: t('bt.startBtn'),""")
rep("""      banner(winner ? pname(winner) + ' 獲勝！' : '平手！');""",
    """      banner(winner ? t('bt.win', { n: pname(winner) }) : t('bt.draw'));""")
rep("""    showEnd('🏆 ' + pname(winner) + ' 奪冠！', '比分：' +""",
    """    showEnd('🏆 ' + t('bt.crown', { n: pname(winner) }), t('bt.score') +""")
rep("""        if (left) toast('⏰ 突死開始——復仇推車強制撤離！', 1.8);""",
    """        if (left) toast(t('bt.suddenToast'), 1.8);""")
rep("""  toast(pname(p) + ' 上復仇推車！（沿軌移動 · 按住動作鍵集氣拋彈：綠1格／黃2格／紅3格）', 2.6);""",
    """  toast(t('bt.cart', { n: pname(p) }), 2.6);""")
rep("""  toast(pname(p) + ' 復活殺回戰場！', 1.6);""",
    """  toast(t('bt.revive', { n: pname(p) }), 1.6);""")
rep("""        toast('💪 按住放彈鍵集氣：綠＝第 1 格、黃＝第 2 格、紅＝第 3 格', 2.2);""",
    """        toast(t('bt.charge'), 2.2);""")
rep("""  el.innerHTML = '本局 <b>' + n + '</b> 人混戰 · 沒人加入的位子由 🤖 AI 補滿';""",
    """  el.innerHTML = t('bt.countHint', { n: n });""")
rep("""  toast('👥 組隊對戰 尚未開放，敬請期待！', 2.4);""",
    """    toast(t('menu.team.toast'), 2.4);""")

# ---------- 14. 道具／詛咒／坐騎提示 ----------
rep("""    toast(info.icon + ' ' + info.name + '：' + info.hint, 2);""",
    """    toast(info.icon + ' ' + itemName(type) + '：' + itemHint(type), 2);""")
rep("""    toast(pname(who) + ' 被炸彈砸到了！😵 定住 ' + DIZZY_TIME + ' 秒', 1.2);""",
    """    toast(t('toast.dizzy', { n: pname(who), s: DIZZY_TIME }), 1.2);""")
rep("""      toast('🧤 撿起炸彈！再按一次動作鍵投擲（可越牆）', 1.6);""",
    """      toast(t('toast.glove'), 1.6);""")
rep("""  toast('💀 ' + { slow: '移動超慢', rapid: '狂放炸彈', mini: '火焰變小', reverse: '操作相反' }[p.skull] + '！', 1.6);""",
    """  toast(t('toast.skull', { s: t('skull.' + p.skull) }), 1.6);""")
rep("""    toast('🔥 進化成紅龍！吐火一次燒上下左右各 2 格（被炸一下龍還是會不見）', 3);""",
    """    toast(t('toast.redDino'), 3);""")
rep("""    bubbleSay(p, '紅龍來啦！', 'kill', Game.T * 1.9);""",
    """    bubbleSay(p, t('toast.redDinoBanner'), 'kill', Game.T * 1.9);""")
rep("""    toast('🦖 孵出恐龍並騎上！多擋一次傷害 · 按 F／🔥 吐火 2 格（冷卻 3 秒）', 2.6);""",
    """    toast(t('toast.dino'), 2.6);""")
rep("""    bubbleSay(p, '衝啊！', 'kill', Game.T * 1.9);""",
    """    bubbleSay(p, t('toast.dinoBanner'), 'kill', Game.T * 1.9);""")
rep("""  bubbleSay(p, '恐龍幫我擋了一下！', 'dead', Game.T * 1.9);""",
    """  bubbleSay(p, t('toast.dinoGuard'), 'dead', Game.T * 1.9);""")
rep("""    ? (cd > 0 ? '紅龍吐火 ' + cd.toFixed(1) + 's' : '紅龍吐火 OK（四方向）')
    : (cd > 0 ? '吐火 ' + cd.toFixed(1) + 's' : '吐火 OK');""",
    """    ? (cd > 0 ? t('toast.fire1') + cd.toFixed(1) + 's' : t('toast.fire2'))
    : (cd > 0 ? t('toast.fire3') + cd.toFixed(1) + 's' : t('toast.fire4'));""")
rep("""function bubbleDead(target, h) { bubbleSay(target, DEAD_LINES[rand(DEAD_LINES.length)], 'dead', h); }
function bubbleKill(target, h) { bubbleSay(target, KILL_LINES[rand(KILL_LINES.length)], 'kill', h); }""",
    """function bubbleDead(target, h) { bubbleSay(target, tr(DEAD_LINES[rand(DEAD_LINES.length)]), 'dead', h); }
function bubbleKill(target, h) { bubbleSay(target, tr(KILL_LINES[rand(KILL_LINES.length)]), 'kill', h); }""")

# ---------- 15. 暫停／客端／轉橫提示 ----------
rep("""  box.innerHTML = '<h3>⏸ 遊戲暫停</h3>' +""",
    """  box.innerHTML = '<h3>' + t('pause.title') + '</h3>' +""")
rep("""    '<button class="mbtn warm" id="pmResume" style="width:auto;padding:12px 26px;">▶ 繼續遊戲</button>' +
    '<button class="mbtn" id="pmRestart" style="width:auto;padding:12px 26px;">🔄 重新開始</button>' +
    '<button class="ghostbtn" id="pmSettingsBtn">⚙️ 設定</button>' +
    '<button class="ghostbtn" id="pmHome">🏠 回首頁</button>' +
    '</div>' +
    '<div id="pmSettings" style="display:none" class="pm-panel">' +
    '<div class="pmhint" style="margin:8px 0 2px">這裡的設定跟首頁「設定」完全一樣，改了馬上生效，不用重開。</div>' +""",
    """    '<button class="mbtn warm" id="pmResume" style="width:auto;padding:12px 26px;">' + t('pause.resume') + '</button>' +
    '<button class="mbtn" id="pmRestart" style="width:auto;padding:12px 26px;">' + t('pause.restart') + '</button>' +
    '<button class="ghostbtn" id="pmSettingsBtn">' + t('pause.settings') + '</button>' +
    '<button class="ghostbtn" id="pmHome">' + t('pause.home') + '</button>' +
    '</div>' +
    '<div id="pmSettings" style="display:none" class="pm-panel">' +
    '<div class="pmhint" style="margin:8px 0 2px">' + t('pause.note') + '</div>' +""")
rep("""  box.innerHTML = '<h3>⏸ 選單</h3>' +
    '<p>線上對戰由房主的裝置持續進行，你在這裡不會影響其他人。</p>' +
    '<div class="row" style="justify-content:center;gap:10px;flex-wrap:wrap">' +
    '<button class="mbtn warm" id="gpResume" style="width:auto;padding:11px 24px;">▶ 繼續</button>' +
    '<button class="ghostbtn" id="gpLeave">離開房間</button></div>';""",
    """  box.innerHTML = '<h3>' + t('guest.title') + '</h3>' +
    '<p>' + t('guest.body') + '</p>' +
    '<div class="row" style="justify-content:center;gap:10px;flex-wrap:wrap">' +
    '<button class="mbtn warm" id="gpResume" style="width:auto;padding:11px 24px;">' + t('guest.resume') + '</button>' +
    '<button class="ghostbtn" id="gpLeave">' + t('ol.leave') + '</button></div>';""")
rep("""    '<h3>橫著玩更過癮</h3>' +
    '<p>把手機轉成<b>橫式</b>，地圖更大、按鍵更好按。<br>' +
    '（不想轉也沒關係，直式一樣能玩）</p>' +
    '<div class="rhrow"><button class="mbtn warm" id="rhOk" type="button">\\u{1F4DD} 直式繼續玩</button></div>' +""",
    """    '<h3>' + t('rot.title') + '</h3>' +
    '<p>' + t('rot.body1') + '<b>' + t('rot.body2') + '</b>' + t('rot.body3') + '<br>' +
    t('rot.body4') + '</p>' +
    '<div class="rhrow"><button class="mbtn warm" id="rhOk" type="button">' + t('rot.ok') + '</button></div>' +""")

# ---------- 16. 暫停選單的設定項目 ----------
rep("""      ? '目前：<b>手機觸控</b>——虛擬搖桿 ＋ 💥放彈鍵（🧨 遙控引爆、🔥 吐火）。'
      : mode === 'pad'
        ? '目前：<b>手把</b>——' + (Pad.name() || '已偵測到手把') + '（A 放彈、X 引爆、Y 吐火、Start 暫停）。'
        : '目前：<b>鍵盤</b>——' + (settings.ctrl === 'auto' ? '（自動偵測）' : '') + 'WASD／方向鍵移動、空白鍵放彈、E 引爆、F 吐火。';""",
    """      ? t('ctrl.touchHint')
      : mode === 'pad'
        ? t('ctrl.padHint', { name: (Pad.name() || t('ctrl.padNone')) })
        : t('ctrl.kbHint', { auto: (settings.ctrl === 'auto' ? t('ctrl.autoTag') : '') });""")
rep("""  pmSeg(grid, 'pmCtrl', '控制模式', [
    { v: 'auto', t: '自動' }, { v: 'kb', t: '鍵盤' }, { v: 'pad', t: '手把' }, { v: 'touch', t: '手機觸控' }
  ], function () { return settings.ctrl; }, function (v) {""",
    """  pmSeg(grid, 'pmCtrl', t('set.ctrl'), [
    { v: 'auto', t: t('ctrl.auto') }, { v: 'kb', t: t('ctrl.kb') }, { v: 'pad', t: t('ctrl.pad') }, { v: 'touch', t: t('ctrl.touch') }
  ], function () { return settings.ctrl; }, function (v) {""")
rep("""  pmSeg(grid, 'pmPadSide', '觸控搖桿位置', [
    { v: 'left', t: '在左' }, { v: 'right', t: '在右' }
  ], function () { return settings.tpad.side; }, function (v) {""",
    """  pmSeg(grid, 'pmPadSide', t('set.padSide'), [
    { v: 'left', t: t('set.sideShortL') }, { v: 'right', t: t('set.sideShortR') }
  ], function () { return settings.tpad.side; }, function (v) {""")

# ---------- 17. 設定頁說明（難度／時間／AI） ----------
rep("""  if (dh) dh.innerHTML = {
    easy: '😇 簡單：敵人少又慢、魔王血少，恐龍蛋也比較多（3 顆）。',
    normal: '🙂 普通：標準的敵人數量與速度，恐龍蛋 2 顆。',
    hard: '😈 困難：敵人更多更快、魔王血更厚、恐龍蛋只有 1 顆。'
  }[settings.soloDiff] || '';
  if (th) th.innerHTML = soloTimeVal()
    ? '時間到會强制陣亡一次（生命 -1），想慢慢探索請選 <b>♾️ 無限時間</b>。'
    : '<b>♾️ 無限時間</b>：不會因為時間到而陣亡，可以慢慢炸磚、找恐龍蛋。';""",
    """  if (dh) dh.innerHTML = t('hint.diff.' + settings.soloDiff) || '';
  if (th) th.innerHTML = soloTimeVal() ? t('hint.time.on') : t('hint.time.off');""")
rep("""  el.innerHTML = {
    weak: '😴 弱：常常發呆亂走、不太會追人、很少放炸彈、不太會躲火爆、走比較慢。',
    normal: '🙂 中：會追對手撿道具、適時放彈、會避開火焰。',
    strong: '😈 強：反應快、積極追擊、幾乎彈無虛發、火場逃生一流、走路更快。'
  }[settings.aiLevel] || '';""",
    """  el.innerHTML = t('hint.ai.' + settings.aiLevel) || '';""")
rep("""      mode === 'touch'
        ? '目前：<b>手機觸控</b>——畫面上出現圓形虛擬搖桿＋💥放彈鍵（搖桿可 360° 推、支援 45° 斜走；位置與大小可在下面調整）。'
      : mode === 'pad'
        ? '目前：<b>手把</b>——偵測到 <b>' + (Pad.name() || '手把') + '</b>（第 1 支＝玩家 1）。手把可直接用方向鍵選單、A 確認、B 返回。'
        : '目前：<b>鍵盤</b>——電腦遊玩不會顯示手機按鈕。' +
          (auto ? '（自動偵測：' + (IS_TOUCH ? '觸控裝置' : (Pad.list().length ? '已接上手把，按一下手把就會自動切換' : '未接上手把，使用鍵盤')) + '）' : '');""",
    """      mode === 'touch'
        ? t('hint.ctrl.touch')
      : mode === 'pad'
        ? t('hint.ctrl.pad', { name: (Pad.name() || t('ctrl.pad')) })
        : t('hint.ctrl.kb', { auto: (auto ? (IS_TOUCH ? t('hint.auto.touch') : (Pad.list().length ? t('hint.auto.pad') : t('hint.auto.kb'))) : '') });""")
rep("""const KEY_LABELS = { up: '上', down: '下', left: '左', right: '右', act: '動作／放彈', det: '遙控引爆', fire: '恐龍吐火' };""",
    """const KEY_LABELS = { up: 'key.up', down: 'key.down', left: 'key.left', right: 'key.right', act: 'key.act', det: 'key.det', fire: 'key.fire' };""")

# ---------- 18. HUD 關卡名 ----------
rep("""    html = '<div class="chip"><span class="ic">🗺️</span><b>' + Game.stage + '</b> ' + Game.theme.name + '</div>' +""",
    """    html = '<div class="chip"><span class="ic">🗺️</span><b>' + Game.stage + '</b> ' + themeName(Game.stage - 1) + '</div>' +""")

# ---------- 19. 線上對戰提示 ----------
rep("""    toast('🌐 線上對戰開始（' + entries + ' 位玩家 + ' + (Net.count - entries) + ' 位 AI）', 2.4);""",
    """    toast(t('ol.netStart', { h: entries, a: (Net.count - entries) }), 2.4);""")
rep("""    if (Net.mySlot < 0) toast('👁 觀戰中（本局你沒有入場）', 2.4);""",
    """    if (Net.mySlot < 0) toast(t('ol.watching'), 2.4);""")
rep("""  try { toast('已自動切換操作：' + InputSense.label(m), 2); } catch (e) {}""",
    """  try { toast(t('ctrl.switch', { m: InputSense.label(m) }), 2); } catch (e) {}""")

# ---------- 20. 啟動：套用語言 ----------
rep("""applyCtrl();          // 套用控制模式（電腦＝鍵盤 → 不顯示手機按鈕）""",
    """applyCtrl();          // 套用控制模式（電腦＝鍵盤 → 不顯示手機按鈕）
applyI18N();          // v2.7：把靜態介面翻成儲存好的語言
updateLangBtn();
try { document.documentElement.setAttribute('lang', LANG); } catch (e) {}""")

# ---------- 21. 匯出 ----------
rep("  isMyPlayer: isMyPlayer, drawMeBadge: drawMeBadge, ME_BADGE_TXT: ME_BADGE_TXT,",
    """  isMyPlayer: isMyPlayer, drawMeBadge: drawMeBadge, ME_BADGE_TXT: ME_BADGE_TXT,
  // v2.7 多語言
  LANGS: LANGS, I18N: I18N, LANG: LANG, t: t, tr: tr, setLang: setLang, applyI18N: applyI18N,
  captureI18N: captureI18N, refreshI18NUI: refreshI18NUI, updateLangBtn: updateLangBtn,
  renderLangMenu: renderLangMenu, openLangMenu: openLangMenu, closeLangMenu: closeLangMenu,
  langLabel: langLabel, langMeta: langMeta, itemName: itemName, itemHint: itemHint,
  themeName: themeName, charName: charName, charTag: charTag,""")

io.open(P, 'w', encoding='utf-8', newline='\n').write(s)
print('--- bytes %d -> %d (+%d)' % (orig_len, len(s), len(s) - orig_len))
