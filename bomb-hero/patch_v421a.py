# -*- coding: utf-8 -*-
# v4.21 主體修改：首頁入口可靠度 / 作者公告不再蓋住按鈕 / 離開遊戲 / 關卡金幣進商店 / 找門提示美化
import io, sys

P = 'index.html'
raw = io.open(P, 'rb').read().decode('utf-8')
crlf = '\r\n' in raw
s = raw.replace('\r\n', '\n')
rules = []

def rule(name, old, new, cnt=1):
    rules.append((name, old, new, cnt))

# ---------------------------------------------------------------- 1
# 內容比視窗高時「垂直置中」會把頂端推到畫面外（實測 1280x900 標題頂端 -50、手機 -245），
# 而且是拉不回來的 → 改成「有空間就置中、沒空間就靠上」，用 auto margin 取代 align-items:center
rule('body 垂直置中',
"""    min-height: 100%;
    display: flex; align-items: center; justify-content: center;
    padding: 14px;""",
"""    min-height: 100%;
    /* v4.21：原本 align-items:center 在「內容比視窗高」時會把頂端推到畫面外（拉不回來），
       導致有些功能畫面上半截整個看不到。改成靠上對齊 + .wrap 用 auto margin 置中：
       空間夠 → 視覺上仍然置中；空間不夠 → 從頂端開始排，一定捲得到。 */
    display: flex; align-items: flex-start; justify-content: center;
    padding: 14px;""")

rule('wrap 用 auto margin 置中',
"""  .wrap { width: 100%; max-width: 780px; }""",
"""  .wrap { width: 100%; max-width: 780px; margin-block: auto; }""")

# ---------------------------------------------------------------- 2
# 作者公告：從「fixed 浮在左上角」改成「首頁卡片內的一般區塊」
# 舊版 fixed + z-index:900 會蓋住下面的選單按鈕 → 點下去完全沒反應（PC 與手機都會）
rule('作者公告改為區塊內排版',
"""  .annbox {
    position: fixed; z-index: 900;
    /* v4.0：往下讓開左上角新增的「版本更新內容」標籤（56px + 標籤高 31px + 7px 間距） */
    left: 10px; top: calc(94px + env(safe-area-inset-top, 0px));
    width: clamp(190px, 17vw, 300px); max-width: calc(100vw - 20px);
    background: rgba(255, 248, 233, .94);""",
"""  .annbox {
    /* v4.21：改成「首頁卡片裡的一般區塊」——
       舊版是 position:fixed + z-index:900 浮在左上角，展開時直接蓋住下面的選單按鈕，
       玩家點「商店／RPG／BOSS」會點到公告文字 → 看起來就是「按鈕壞了、進不去」。
       現在它只在首頁出現、會把內容往下推，永遠不會蓋住任何按鈕。 */
    position: relative; z-index: 0;
    width: 100%; max-width: 520px; margin: 0 auto 12px;
    background: rgba(255, 248, 233, .94);""")

rule('作者公告收合寬度',
"""  .annbox.min { width: auto; max-width: calc(100vw - 20px); }""",
"""  .annbox.min { width: fit-content; max-width: 100%; }""")

rule('作者公告窄螢幕寬度',
"""  @media (max-width: 1199px) { .annbox { width: min(320px, calc(100vw - 20px)); } }""",
"""  @media (max-width: 1199px) { .annbox { width: 100%; } }""")

rule('作者公告觸控位置',
"""  body.touch .annbox { left: 8px; top: calc(84px + env(safe-area-inset-top, 0px)); }
  body.touch .annbox .annbody { font-size: 12px; max-height: 58vh; }""",
"""  body.touch .annbox { margin-bottom: 10px; }
  body.touch .annbox .annbody { font-size: 12px; max-height: 44vh; }""")

# 預設一律收合（展開會把首頁選單往下推）
rule('作者公告預設收合',
"""  if (saved === '1' || saved === '0') { setAnnMin(saved === '1'); return; }
  // 沒存過 → PC 寬螢幕展開，手機／窄螢幕收起
  const narrow = (typeof window !== 'undefined' && window.innerWidth ? window.innerWidth < 1200 : true);
  setAnnMin(!!(IS_TOUCH || narrow));""",
"""  if (saved === '1' || saved === '0') { setAnnMin(saved === '1'); return; }
  // v4.21：沒存過就一律先收合。展開的作者公告會把首頁選單往下推、手機上還會遮住按鈕，
  //        先收成小膠囊（📢 作者公告 ▸），想看再點開。
  setAnnMin(true);""")

# ---------------------------------------------------------------- 3
# 商店：先切畫面再畫內容（render 一炸就整組不切畫面 = 「進不去」）
rule('Shop.open 先切畫面',
"""  function open() { syncGold(); render(); Screen.show('shop'); }""",
"""  function open() {
    // v4.21：先切畫面、再畫內容。舊版是 render() → Screen.show()，
    //   render() 只要丟一次例外，畫面就完全不會切換（玩家看到的就是「商店進不去」）。
    Screen.show('shop');
    try { syncGold(); render(); }
    catch (e) {
      console.error('[shop]', e);
      try { toast('⚠️ 商店內容載入失敗：' + ((e && e.message) || e), 3.4); } catch (e2) {}
    }
  }""")

rule('btnStore 錯誤可見',
"""  const store = $id('btnStore');
  if (store) store.addEventListener('click', function () {
    AudioSys.ensure(); AudioSys.sfx('click');
    Shop.open();                       // v4.17：商店正式開放（隨從）
  });""",
"""  const store = $id('btnStore');
  if (store) store.addEventListener('click', function () {
    AudioSys.ensure(); AudioSys.sfx('click');
    // v4.21：任何例外都要讓玩家看得到（舊版一丟例外就靜靜沒反應）
    try { Shop.open(); }                 // v4.17：商店正式開放（隨從）
    catch (e) {
      console.error('[store]', e);
      try { toast('⚠️ 商店開不起來：' + ((e && e.message) || e), 3.4); } catch (e2) {}
    }
  });""")

# ---------------------------------------------------------------- 4
rule('btnRpg 先切畫面',
"""  btn.addEventListener('click', function () {
    AudioSys.ensure(); AudioSys.sfx('click');
    if (!ensureNickname()) return;
    Rpg.render();
    Screen.show('rpg');
  });""",
"""  btn.addEventListener('click', function () {
    AudioSys.ensure(); AudioSys.sfx('click');
    if (!ensureNickname()) return;
    // v4.21：先切畫面再畫表單 —— 舊版 render() 一丟例外，畫面就完全不會切
    Screen.show('rpg');
    try { Rpg.render(); }
    catch (e) {
      console.error('[rpg]', e);
      try { toast('⚠️ RPG 表單載入失敗：' + ((e && e.message) || e), 3.4); } catch (e2) {}
    }
  });""")

# ---------------------------------------------------------------- 5
rule('btnBoss 錯誤可見',
"""$id('btnBoss').addEventListener('click', function () {
  AudioSys.ensure(); AudioSys.sfx('click');
  if (!ensureNickname()) return;
  startBossRush();
});""",
"""$id('btnBoss').addEventListener('click', function () {
  AudioSys.ensure(); AudioSys.sfx('click');
  if (!ensureNickname()) return;
  // v4.21：BOSS 挑戰任何環節出錯都要講出來，不要靜靜地什麼都沒發生
  try { startBossRush(); }
  catch (e) {
    console.error('[boss]', e);
    try { toast('⚠️ BOSS 挑戰開不起來：' + ((e && e.message) || e), 3.6); } catch (e2) {}
  }
});""")

# ---------------------------------------------------------------- 6
rule('帳號彈窗一定開得起來',
"""  function open() {
    const m = $id('acctModal');
    if (!m) return;
    renderModal();
    m.classList.add('on');
    AudioSys.sfx('click');
  }""",
"""  function open() {
    const m = $id('acctModal');
    if (!m) {
      try { toast('⚠️ 找不到帳號視窗，請重新整理頁面', 3.2); } catch (e) {}
      return;
    }
    // v4.21：content 畫失敗也要把彈窗打開（看得見空殼 + 錯誤訊息，才知道發生什麼事）
    try { renderModal(); }
    catch (e) {
      console.error('[acct]', e);
      try { toast('⚠️ 帳號資料載入失敗：' + ((e && e.message) || e), 3.6); } catch (e2) {}
    }
    m.classList.add('on');
    try { AudioSys.sfx('click'); } catch (e) {}
  }""")

# ---------------------------------------------------------------- 7
# 舊帳號的雲端資料若少了 alloc，adopt() 會直接丟例外 → 整個帳號狀態卡住（頭像、商店、RPG 都受影響）
rule('adopt 防呆',
"""    if (a.rpg) {
      if (!Game.rpg) {
        RPG.alloc = {
          hp: a.rpg.alloc.hp | 0, def: a.rpg.alloc.def | 0,
          spd: a.rpg.alloc.spd | 0, atk: a.rpg.alloc.atk | 0
        };""",
"""    if (a.rpg) {
      // v4.21：舊帳號可能沒有 alloc（或只有部分欄位）→ 以前這裡會直接丟例外，
      //   帳號狀態整組卡住，連帶商店／RPG／帳號彈窗都看起來壞掉
      const _al = (a.rpg && a.rpg.alloc) || {};
      if (!Game.rpg) {
        RPG.alloc = {
          hp: _al.hp | 0, def: _al.def | 0,
          spd: _al.spd | 0, atk: _al.atk | 0
        };""")

# ---------------------------------------------------------------- 8
# 分享：WebView 用 <a target=_blank> 開（window.open 在 FB/LINE 內建瀏覽器常被擋）
rule('分享改用連結開啟',
"""  function openWin(pl, url) {
    const txt = pl.k === 'wa' ? url + ' 爆爆英雄 BOMB HERO' : url;
    const target = pl.url + encodeURIComponent(txt);
    let w = null;
    try { w = window.open(target, '_blank', 'width=680,height=620,noopener'); } catch (e) {}
    if (!w) {           // 被瀏覽器攔下來 → 只能同頁跳（回來時已經算分享過）
      try { location.href = target; } catch (e) { return Promise.resolve(false); }
      return Promise.resolve(true);
    }
    return waitHidden(7000);
  }""",
"""  function openWin(pl, url) {
    const txt = pl.k === 'wa' ? url + ' 爆爆英雄 BOMB HERO' : url;
    const target = pl.url + encodeURIComponent(txt);
    // v4.21：先用 <a target="_blank"> 點一下 —— FB／LINE 內建瀏覽器常把 window.open 當彈窗攔掉，
    //   但「使用者手勢裡的連結點擊」幾乎都會放行。真的沒開再退回 window.open／同頁跳轉。
    try {
      const a = document.createElement('a');
      a.href = target; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { try { a.parentNode.removeChild(a); } catch (e) {} }, 1500);
      return waitHidden(8000);
    } catch (e) {}
    let w = null;
    try { w = window.open(target, '_blank', 'width=680,height=620,noopener'); } catch (e) {}
    if (!w) {           // 被瀏覽器攔下來 → 只能同頁跳（回來時已經算分享過）
      try { location.href = target; } catch (e) { return Promise.resolve(false); }
      return Promise.resolve(true);
    }
    return waitHidden(7000);
  }""")

rule('分享未登入直接開帳號視窗',
"""    if (!member()) {
      note = LOGIN_TIP;
      render();
      toast('🔐 分享金幣要登入正式帳號才能領', 2.8);
      return Promise.resolve({ ok: false, err: 'NEED_LOGIN' });
    }""",
"""    if (!member()) {
      note = LOGIN_TIP;
      render();
      toast('🔐 分享金幣要登入正式帳號才能領', 2.8);
      // v4.21：直接把帳號視窗打開，不要讓玩家自己去找右上角
      try { Cloud.open(); } catch (e) {}
      return Promise.resolve({ ok: false, err: 'NEED_LOGIN' });
    }""")

# busy 卡死 → 所有分享按鈕永久 disabled（有些 WebView 的分享 Promise 永遠不 resolve）
rule('分享 busy 保險',
"""    busy = true; note = '正在開啟 ' + pl.name + '…'; render();""",
"""    busy = true; note = '正在開啟 ' + pl.name + '…'; render();
    // v4.21：保險 —— 有些 WebView 的分享流程永遠不 resolve，按鈕會一直卡在 disabled（看起來像壞掉）
    wd = setTimeout(function () {
      if (!busy) return;
      busy = false;
      note = '⚠️ 等太久沒有回應，再按一次試試';
      try { render(); } catch (e) {}
    }, 16000);""")

rule('分享 busy 解鎖 helper',
"""  let claimed = {}, dayN = 0, busy = false, note = '';""",
"""  let claimed = {}, dayN = 0, busy = false, note = '', wd = null;
  // v4.21：統一的「解除忙碌」——順便清掉 watchdog，避免按鈕卡在 disabled
  function unbusy(msg) {
    busy = false;
    if (wd) { clearTimeout(wd); wd = null; }
    if (msg != null) note = msg;
  }""")

rule('分享 prep 失敗解除',
"""      if (!prep.ok) { busy = false; note = '⚠️ ' + errText(prep); render(); return prep; }""",
"""      if (!prep.ok) { unbusy('⚠️ ' + errText(prep)); render(); return prep; }""")

rule('分享取消解除',
"""        if (!ok) {
          busy = false; note = '❌ 分享沒有完成（取消或沒跳出去），所以沒有金幣'; render();""",
"""        if (!ok) {
          unbusy('❌ 分享沒有完成（取消或沒跳出去），所以沒有金幣'); render();""")

rule('分享回應解除',
"""        return api('/api/share/claim', { platform: pl.k, token: prep.token }).then(function (r) {
          busy = false;""",
"""        return api('/api/share/claim', { platform: pl.k, token: prep.token }).then(function (r) {
          unbusy();""")

# ---------------------------------------------------------------- 9
# 「找傳送門」提示：不再用中央巨型 banner（閃一下、又蓋住整張地圖）
rule('找門提示改用提示卡',
"""        else if (!Game.doorHinted) {
          Game.doorHinted = true;
          banner(t('solo.doorHint'));
        }""",
"""        else if (!Game.doorHinted) {
          Game.doorHinted = true;
          // v4.21：改用「提示卡」——顯示 2.6 秒、慢慢淡出，不再用中央巨型 banner 閃一下
          doorHintCard('🚪', t('solo.doorTip.t'), t('solo.doorTip.s'), 2.6);
        }""")

rule('出口開啟提示卡',
"""  toast(t('solo.doorOpen'), 2.4, 'stage');
  banner(t('solo.doorBanner'), .9);""",
"""  toast(t('solo.doorOpen'), 2.4, 'stage');
  doorHintCard('✨', t('solo.doorBanner'), t('solo.doorTip.go'), 2.4);""")

# ---------------------------------------------------------------- 10
# 關卡中賺到的金幣（HUD 的 💰）→ 進商店錢包
rule('過關金幣 = 本關金幣 + 獎勵',
"""        try {
          const gain = 40 + Math.floor((cleared - 1) / 4) * 10;
          Shop.addGold(gain);
          toast('💰 過關獎勵 +' + gain + ' 金幣（共 ' + Shop.gold() + '）', 2.6);
        } catch (e) {}""",
"""        try {
          // v4.21：關卡裡賺到的金幣（HUD 上那顆 💰）就是你的商城金幣 ——
          //   過關時「本關金幣 + 過關獎勵」一起進商店錢包
          const base = 40 + Math.floor((cleared - 1) / 4) * 10;
          const coins = Math.max(0, Math.round(p.score || 0));
          Shop.addGold(base + coins);
          toast('💰 本關金幣 ' + coins + ' ＋ 過關獎勵 ' + base + '　→　商店金幣 ' + Shop.gold(), 3);
        } catch (e) {}""")

rule('陣亡也把賺到的金幣帶走',
"""      if (p.lives <= 0) {
        Game.state = 'over';          // 凍結更新（loop 只跑 play/roundover）
        showEnd(t('solo.overTitle'), t('solo.overSub', { n: Game.stage, s: p.score }) + '　·　' + soloDiffCfg().label, false);""",
"""      if (p.lives <= 0) {
        Game.state = 'over';          // 凍結更新（loop 只跑 play/roundover）
        // v4.21：這關賺到的金幣還是你的（陣亡不沒收，但沒有過關獎勵）
        try {
          const coins = Math.max(0, Math.round(p.score || 0));
          if (coins > 0) {
            Shop.addGold(coins);
            toast('💰 本關賺到的 ' + coins + ' 金幣已放進商店錢包', 2.8);
          }
        } catch (e) {}
        showEnd(t('solo.overTitle'), t('solo.overSub', { n: Game.stage, s: p.score }) + '　·　' + soloDiffCfg().label, false);""")

rule('HUD 金幣說明',
"""      '<div class="chip" data-k="score"><span class="ic">💰</span><b>' + p.score + '</b></div>' +""",
"""      '<div class="chip" data-k="score" title="本關金幣 · 過關（或陣亡）後會放進商店錢包"><span class="ic">💰</span><b>' + p.score + '</b></div>' +""")

# ---------------------------------------------------------------- 11
# 首頁「離開遊戲」
rule('首頁離開遊戲按鈕',
"""        <button class="mbtn" id="btnSettings">設定<small>地圖尺寸 · 控制方式 · 音量</small></button>
      </div>""",
"""        <button class="mbtn" id="btnSettings">設定<small>地圖尺寸 · 控制方式 · 音量</small></button>
        <button class="mbtn quitbtn" id="btnQuit">🚪 離開遊戲<small>存好進度 · 關掉這個頁面</small></button>
      </div>""")

rule('離開遊戲覆蓋層標記',
"""    <div class="tips" id="gameTips"></div>
  </div>

</div>""",
"""    <div class="tips" id="gameTips"></div>
  </div>

  <!-- v4.21：離開遊戲（手機／內建瀏覽器關不掉視窗時，留在這張離場卡上，不會變黑畫面） -->
  <div id="quitModal" role="dialog" aria-modal="true" aria-label="離開遊戲">
    <div class="qcard">
      <div class="qico">👋</div>
      <h3>感謝遊玩！</h3>
      <p id="quitMsg">進度已經存在這台裝置上了，下次再來炸一波。</p>
      <div class="qrows">
        <button class="qbtn ghost" id="quitBack" type="button">↩ 回到遊戲</button>
        <button class="qbtn" id="quitAgain" type="button">🚪 關閉頁面</button>
      </div>
      <div class="qtip" id="quitTip">手機：按右上角 ⨯ 或返回鍵　·　電腦：Ctrl／⌘ + W</div>
    </div>
  </div>

</div>""")

rule('離開遊戲樣式',
"""  #banner span {
    font-size: clamp(52px, 10vmin, 110px); font-weight: 900; letter-spacing: .1em; color: #fff;
    text-shadow: 0 6px 30px rgba(255,138,61,.9), 0 2px 0 #b23a1f;
  }""",
"""  #banner span {
    font-size: clamp(52px, 10vmin, 110px); font-weight: 900; letter-spacing: .1em; color: #fff;
    text-shadow: 0 6px 30px rgba(255,138,61,.9), 0 2px 0 #b23a1f;
  }
  /* ===== v4.21：找傳送門提示卡（取代中央巨型 banner） ===== */
  #doorHint {
    position: absolute; left: 50%; top: 13%; transform: translateX(-50%);
    z-index: 8; pointer-events: none; width: min(90%, 460px);
  }
  #doorHint.hide { display: none; }
  #doorHint .dh-card {
    position: relative; display: flex; align-items: center; gap: 12px;
    padding: 13px 16px 16px; border-radius: 17px; overflow: hidden;
    background: linear-gradient(158deg, rgba(30,42,70,.94), rgba(17,24,42,.90));
    border: 1px solid rgba(255,196,120,.44);
    box-shadow: 0 20px 46px -20px rgba(0,0,0,.92), inset 0 1px 0 rgba(255,255,255,.14);
    -webkit-backdrop-filter: blur(9px) saturate(1.15); backdrop-filter: blur(9px) saturate(1.15);
  }
  #doorHint .dh-card::before {
    content: ''; position: absolute; inset: 0; pointer-events: none;
    background: radial-gradient(120% 90% at 8% 0%, rgba(255,172,72,.22), transparent 62%);
  }
  #doorHint .dh-ico {
    flex: 0 0 auto; width: 44px; height: 44px; border-radius: 14px;
    display: flex; align-items: center; justify-content: center; font-size: 24px;
    background: radial-gradient(circle at 32% 24%, #ffe6b6, #f2a840 62%, #c1761c);
    box-shadow: 0 6px 16px -6px rgba(240,160,60,.9), inset 0 1px 0 rgba(255,255,255,.62);
  }
  #doorHint .dh-tx { min-width: 0; text-align: left; }
  #doorHint .dh-t {
    display: block; font-size: 14.5px; font-weight: 900; color: #fff4e0; letter-spacing: .02em;
    text-shadow: 0 2px 10px rgba(0,0,0,.55);
  }
  #doorHint .dh-s {
    display: block; margin-top: 3px; font-size: 12px; font-weight: 700; color: #ffd9a6; line-height: 1.55;
  }
  #doorHint .dh-bar {
    position: absolute; left: 0; bottom: 0; height: 3px; width: 100%;
    transform-origin: left center; background: linear-gradient(90deg, #ffc46b, #ff8a3d);
  }
  #doorHint.in .dh-card { animation: dhIn .46s cubic-bezier(.2,1.1,.3,1) both; }
  #doorHint.in .dh-bar { animation: dhBar 2.6s linear both; }
  #doorHint.out { animation: dhOut .82s ease both; }
  @keyframes dhIn { from { opacity: 0; transform: translateY(-15px) scale(.94); } to { opacity: 1; transform: none; } }
  @keyframes dhOut { to { opacity: 0; transform: translateY(-11px) scale(.97); } }
  @keyframes dhBar { from { transform: scaleX(1); } to { transform: scaleX(0); } }
  /* ===== v4.21：首頁「離開遊戲」 ===== */
  #btnQuit { border-color: rgba(150,170,200,.30); opacity: .92; }
  #btnQuit:hover { opacity: 1; }
  #quitModal {
    position: fixed; inset: 0; z-index: 2600; display: none;
    align-items: center; justify-content: center; padding: 18px;
    background: radial-gradient(120% 100% at 50% 0%, rgba(20,28,48,.86), rgba(6,9,16,.95));
    -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
  }
  #quitModal.on { display: flex; }
  .qcard {
    width: min(92vw, 380px); padding: 24px 20px 18px; border-radius: 20px; text-align: center;
    background: linear-gradient(170deg, #1d2946, #131b2d);
    border: 1px solid rgba(150,190,255,.24);
    box-shadow: 0 26px 60px -24px rgba(0,0,0,.95), inset 0 1px 0 rgba(255,255,255,.10);
  }
  .qico { font-size: 42px; line-height: 1; margin-bottom: 8px; }
  .qcard h3 { margin: 0 0 7px; font-size: 19px; color: #ffe6c2; letter-spacing: .02em; }
  .qcard p { margin: 0 0 16px; font-size: 13px; color: #a9b8d6; line-height: 1.7; }
  .qrows { display: flex; gap: 9px; }
  .qbtn {
    flex: 1 1 0; padding: 12px 10px; border-radius: 13px; cursor: pointer; font-family: inherit;
    font-size: 14px; font-weight: 900; color: #fff;
    background: linear-gradient(180deg, #ff9a4d, #ef7038);
    border: 1px solid rgba(255,170,90,.44);
    box-shadow: 0 10px 22px -14px rgba(240,120,50,.95), inset 0 1px 0 rgba(255,255,255,.28);
  }
  .qbtn.ghost {
    background: rgba(255,255,255,.06); border-color: rgba(150,190,255,.28);
    color: #d8e2f6; box-shadow: none;
  }
  .qbtn:active { transform: translateY(1px); }
  .qtip { margin-top: 12px; font-size: 11px; color: #71829f; line-height: 1.65; }""")

rule('找門提示卡標記',
"""        <div id="banner" style="display:none"><span id="bannerTxt"></span></div>""",
"""        <div id="banner" style="display:none"><span id="bannerTxt"></span></div>
        <!-- v4.21：提示卡（找傳送門／出口開啟） -->
        <div id="doorHint" class="hide">
          <div class="dh-card">
            <div class="dh-ico">🚪</div>
            <div class="dh-tx"><b class="dh-t"></b><span class="dh-s"></span></div>
            <i class="dh-bar"></i>
          </div>
        </div>""")

# doorHintCard()：插在 banner() 後面
rule('doorHintCard 實作',
"""function banner(txt, dur) {
  txt = tr(txt);
  $id('bannerTxt').textContent = txt;
  $id('banner').style.display = 'flex';
  Game.bannerT = dur || 1;
}""",
"""function banner(txt, dur) {
  txt = tr(txt);
  $id('bannerTxt').textContent = txt;
  $id('banner').style.display = 'flex';
  Game.bannerT = dur || 1;
}
/* ===== v4.21：提示卡（找傳送門／出口開啟） =====
   舊版用 banner()：畫面正中央一行 clamp(52px,10vmin,110px) 的巨型字，閃 0.9 秒就消失，
   又會蓋住整張地圖。改成畫面上方的毛玻璃小卡：滑入 → 停留 2.6 秒 → 慢慢淡出，
   底部還有一條「剩餘時間」進度條。 */
let _dhT1 = null, _dhT2 = null;
function doorHintCard(ico, title, sub, dur) {
  const box = $id('doorHint');
  if (!box) return;
  const q = function (sel) { return box.querySelector(sel); };
  const iEl = q('.dh-ico'), tEl = q('.dh-t'), sEl = q('.dh-s');
  if (iEl && ico) iEl.textContent = ico;
  if (tEl) tEl.textContent = title == null ? '' : tr(title);
  if (sEl) {
    sEl.textContent = sub == null ? '' : tr(sub);
    sEl.style.display = (sub && String(sub).length) ? '' : 'none';
  }
  box.classList.remove('hide', 'out', 'in');
  void box.offsetWidth;                 // 強制 reflow → 同一個提示再觸發時動畫會重播
  box.classList.add('in');
  const stay = Math.max(1.2, dur || 2.6);
  // 進度條長度跟著停留時間走
  const bar = q('.dh-bar');
  if (bar) { bar.style.animationDuration = stay + 's'; }
  clearTimeout(_dhT1); clearTimeout(_dhT2);
  _dhT1 = setTimeout(function () {
    box.classList.add('out');
    _dhT2 = setTimeout(function () {
      box.classList.remove('in', 'out');
      box.classList.add('hide');
    }, 860);
  }, stay * 1000);
}
function hideDoorHint() {
  const box = $id('doorHint');
  clearTimeout(_dhT1); clearTimeout(_dhT2);
  if (box) { box.classList.remove('in', 'out'); box.classList.add('hide'); }
}""")

# 離開遊戲的 JS：綁在 btnSettings 之後
rule('離開遊戲邏輯',
"""$id('btnSettings').addEventListener('click', function () {
  AudioSys.sfx('click');
  Screen.show('settings');
  applyCtrl();                 // 重新套用控制模式與觸控版面
  renderKeyRow();
});""",
"""$id('btnSettings').addEventListener('click', function () {
  AudioSys.sfx('click');
  Screen.show('settings');
  applyCtrl();                 // 重新套用控制模式與觸控版面
  renderKeyRow();
});
// v4.21：首頁「離開遊戲」
(function () {
  const btn = $id('btnQuit'), m = $id('quitModal');
  if (!btn || !m) return;
  const back = $id('quitBack'), again = $id('quitAgain');
  function closeM() { m.classList.remove('on'); }
  btn.addEventListener('click', function () {
    try { AudioSys.ensure(); AudioSys.sfx('click'); } catch (e) {}
    try { AudioSys.stopBGM(); } catch (e) {}
    m.classList.add('on');
    // 只有「由腳本開的視窗」才關得掉；關不掉就停在離場卡（不會變黑畫面）
    setTimeout(function () { try { window.close(); } catch (e) {} }, 120);
  });
  if (back) back.addEventListener('click', function () {
    try { AudioSys.sfx('click'); AudioSys.startBGM('menu'); } catch (e) {}
    closeM();
  });
  if (again) again.addEventListener('click', function () {
    try { AudioSys.sfx('click'); } catch (e) {}
    try { window.close(); } catch (e) {}
    setTimeout(function () {
      const tip = $id('quitTip');
      if (tip) tip.textContent = '這個視窗是從連結開的，瀏覽器不允許網頁自己關閉 —— 請按上方分頁的 ⨯，或用手機的返回鍵。';
    }, 350);
  });
})();""")

# 離開遊戲時順手收掉提示卡（切畫面時）
rule('切畫面收掉提示卡',
"""    cur = name;
    try { updateNavUI(); } catch (e) {}""",
"""    cur = name;
    try { if (typeof hideDoorHint === 'function') hideDoorHint(); } catch (e) {}
    try { updateNavUI(); } catch (e) {}""")

# ---------------------------------------------------------------- 12
# i18n：找門提示卡的標題／副標（10 語言，每個語言區塊各插一次）
TIPS = [
 ('zh-TW', '敵人清光了！', '炸開剩下的軟磚，找出藏起來的傳送門 🚪', '傳送門就在地圖上，走進去前往下一關'),
 ('zh-CN', '敌人清光了！', '炸开剩下的软砖，找出藏起来的传送门 🚪', '传送门就在地图上，走进去前往下一关'),
 ('en',    'All enemies cleared!', 'Blast the remaining bricks to reveal the hidden portal 🚪', 'The portal is on the map — step in to reach the next stage'),
 ('ja',    '敵を全滅！', '残ったブロックを壊して、隠されたゲートを探そう 🚪', 'ゲートはマップ上にあります。入って次のステージへ'),
 ('ko',    '적을 모두 처치!', '남은 벽돌을 부숴 숨겨진 포털을 찾으세요 🚪', '포털이 맵에 나타났습니다. 들어가면 다음 스테이지로'),
 ('th',    'จัดการศัตรูหมดแล้ว!', 'ระเบิดอิฐที่เหลือเพื่อหาประตูที่ซ่อนอยู่ 🚪', 'ประตูอยู่บนแผนที่ เดินเข้าไปเพื่อไปด่านต่อไป'),
 ('vi',    'Đã dọn sạch quái!', 'Phá những viên gạch còn lại để tìm cổng bị giấu 🚪', 'Cổng đã có trên bản đồ — bước vào để sang màn tiếp theo'),
 ('ru',    'Все враги повержены!', 'Взорви оставшиеся блоки и найди скрытый портал 🚪', 'Портал на карте — зайди в него, чтобы перейти дальше'),
 ('de',    'Alle Gegner besiegt!', 'Spreng die restlichen Steine und finde das versteckte Portal 🚪', 'Das Portal ist auf der Karte — geh hinein für die nächste Stage'),
 ('it',    'Nemici eliminati!', 'Distruggi i mattoni morbidi rimasti per trovare il portale nascosto 🚪', 'Il portale è sulla mappa: entra per passare al livello successivo'),
]

def i18n_insert(text):
    global bad
    key = "'solo.doorHint':"
    idxs, pos = [], -1
    while True:
        pos = text.find(key, pos + 1)
        if pos < 0:
            break
        idxs.append(pos)
    if len(idxs) != len(TIPS):
        print('  ! i18n 區塊數 %d（預期 %d）' % (len(idxs), len(TIPS)))
        bad += 1
        return text
    # 從後往前插，位移才不會亂
    for i in range(len(TIPS) - 1, -1, -1):
        lid, tt, ss, gg = TIPS[i]
        ins = ("  'solo.doorTip.t': '" + tt + "', 'solo.doorTip.s': '" + ss + "',\n"
               "  'solo.doorTip.go': '" + gg + "',\n")
        p0 = idxs[i]
        text = text[:p0] + ins + text[p0:]
    return text

bad = 0
for name, old, new, cnt in rules:
    n = s.count(old)
    if n != cnt:
        print('  ! %s -> hits %d (want %d)' % (name, n, cnt))
        bad += 1
        continue
    s = s.replace(old, new)

# i18n：zh-TW / zh-CN 用「整行比對」確保唯一；其他語言用 key 出現處插入
s = i18n_insert(s)

print('bad', bad)
if bad:
    sys.exit(1)
if crlf:
    s = s.replace('\n', '\r\n')
io.open(P, 'wb').write(s.encode('utf-8'))
print('written')
