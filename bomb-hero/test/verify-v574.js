// test/verify-v574.js —— v5.73：深淵／每週挑戰／每日特惠／專屬技／combo／行為補給／支線／
//                          新手首頁／失敗埋點／今日進度／地板材質
//   這一版是「把 ROADMAP 第二梯隊一次補完」，因此按功能分 11 段驗。
const fs = require('fs');
const path = require('path');
const { makeEnv } = require('./_sandbox');

const env = makeEnv();
const P = env.BH, G = P.Game;
const SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'main.js'), 'utf8');
const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const I18N = fs.readFileSync(path.join(__dirname, '..', 'js', 'i18n-src.js'), 'utf8');

let pass = 0, fail = 0;
function ok(cond, msg, extra) {
  if (cond) { pass++; console.log('  ✓ ' + msg + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
  else { fail++; console.log('  ✗ FAIL: ' + msg + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}
function sec(t) { console.log('\n=== ' + t + ' ==='); }

/* ---------------- ① 深淵 ---------------- */
sec('① 深淵：無限層、每 5 層王、40 關解鎖');
ok(!!P.Abyss, '有 Abyss 模組');
ok(typeof P.Abyss.layerStage === 'function', '有 layerStage()');
ok(P.Abyss.layerStage(5) === P.SOLO_STAGES, '第 5 層進 BOSS 決戰場', P.Abyss.layerStage(5));
ok(P.Abyss.layerStage(1) >= 2 && P.Abyss.layerStage(1) <= 39, '第 1 層不落在第 1 關（避免 resetBuffs）', P.Abyss.layerStage(1));
const seen = {};
for (let n = 1; n <= 78; n++) seen[P.Abyss.layerStage(n)] = 1;
ok(Object.keys(seen).length >= 30, '層數會輪轉 30+ 種地圖', Object.keys(seen).length);
ok(typeof P.Abyss.bestOf() === 'number' && P.Abyss.bestOf() >= 0, 'bestOf() 回非負整數');
ok(/Cloud\.track\('abyss'/.test(SRC), '深淵死亡會上報（mode=abyss）');
ok(/if \(Game\.abyss\) \{[\s\S]{0,700}Abyss\.layerClear\(\)/.test(SRC), '過門走層數而不是結算');
ok(/if \(Game\.abyss\) \{[\s\S]{0,160}Abyss\.finish\(\)/.test(SRC), '死亡走深淵結算');
ok(HTML.indexOf('id="btnAbyss"') > 0, '冒險彈窗有深淵按鈕');
ok(HTML.indexOf('id="abyssBadge"') < 0, 'HUD 徽章由 JS 動態建立（不寫死 HTML）');
ok(/const ABYSS_KEY = 'bombhero-abyss-v1'/.test(SRC), '深淵紀錄存 localStorage');
ok(/layer % 5 === 0/.test(SRC), '每 5 層加王血');

/* ---------------- ② 每週限制挑戰 ---------------- */
sec('② 本週限制挑戰：三條限制、按週固定、獨立榜');
ok(!!P.WeekChal && Array.isArray(P.WK_MODS), '有 WeekChal 與 WK_MODS');
ok(P.WK_MODS.length === 3, '三條限制', P.WK_MODS.map(function (m) { return m.id; }));
const m1 = P.WeekChal.modOf().id, m2 = P.WeekChal.modOf().id;
ok(m1 === m2, '同一天取兩次是同一條（不是每次亂抽）', m1);
ok(['fuse', 'nopet', 'noitem'].indexOf(m1) >= 0, '限制 id 合法', m1);
ok(/mode: 'wchal'/.test(SRC), '提交走 mode=wchal');
ok(/p\.fuseMul = Math\.max\(p\.fuseMul \|\| 1, 1\.6\)/.test(SRC), '長引信每幀維持（不會被強化卡洗掉）');
ok(/Game\.pets = \[\]; p\.wkNoPet = 1;/.test(SRC), '孤軍奮戰會清掉隨從');
ok(/Game\.items = \[\]; p\.wkNoItem = 1;/.test(SRC), '空手會清掉場上道具');
ok(HTML.indexOf('id="wkChal"') > 0, '每日挑戰頁有限制挑戰卡');
ok(/mode === 'weekly' \|\| mode === 'wchal'/.test(fs.readFileSync(path.join(__dirname, '..', '..', 'cloud.js'), 'utf8')), '後端 wchal 走 weekly 的日期規則');

/* ---------------- ③ 每日特惠 ---------------- */
sec('③ 每日特惠：三件、當天固定、限購一次');
ok(!!P.DailyDeal, '有 DailyDeal');
const d1 = P.DailyDeal.cur(), d2 = P.DailyDeal.cur();
ok(d1.items.length === 3, '三件特惠', d1.items.length);
ok(d1.day === d2.day && d1.items[0].key === d2.items[0].key, '同一天兩次結果一致');
ok(d1.items.every(function (it) { return it.off > 0 && it.off < 1; }), '每件都有折扣');
ok(d1.items.every(function (it) { return P.DailyDeal.priceOf(it) < it.base; }), '折扣價低於原價');
ok(d1.items.every(function (it) { return !it.bought; }), '新的一天都是未購買');
ok(HTML.indexOf('id="shopDeal"') < 0, '特惠區由 JS 產生（不寫死 HTML）');
ok(/DEAL_KEY = 'bombhero-dailydeal-v1'/.test(SRC), '購買紀錄存 localStorage');

/* ---------------- ④ 角色專屬技 ---------------- */
sec('④ 八角色專屬技：不佔出戰欄、獨立冷卻');
ok(!!P.RpgSkill && Array.isArray(P.RpgSkill.CHAR_SKILLS), '有 CHAR_SKILLS');
ok(P.RpgSkill.CHAR_SKILLS.length === 8, '剛好八招對八角色', P.RpgSkill.CHAR_SKILLS.length);
ok(P.RpgSkill.CHAR_SKILLS.every(function (s) { return s.id && s.n && s.cd > 0; }), '每招都有 id／名稱／冷卻');
ok(typeof P.RpgSkill.charCast === 'function', '有 charCast()');
ok(typeof P.RpgSkill.charDef === 'function', '有 charDef()（跟著 RPG.char 走）');
ok(/e\.code === 'KeyT'/.test(SRC), '熱鍵 T');
ok(/data-sk="c"/.test(SRC), '技能列第一顆是專屬技');
ok(/Game\.rpg && Screen\.current === 'game'\)/.test(SRC), '沒有主動招也會顯示技能列');
ok(P.RPG_SKILLS.length === 10, '主動／被動招式池沒有被灌進去（仍 10 條）', P.RPG_SKILLS.length);

/* ---------------- ⑤ 招式 combo ---------------- */
sec('⑤ 三組 combo：4 秒窗、招式接續');
ok(typeof P.RpgSkill.comboTry === 'function', '有 comboTry()');
ok(/'frost' && id === 'quake'/.test(SRC), '冰霜 → 震地（碎冰）');
ok(/'shield' && id === 'det'/.test(SRC), '護盾 → 遙控（盾炸）');
ok(/'det' && id === 'quake'/.test(SRC), '遙控 → 震地（氣浪）');
ok(/COMBO_WIN = 4\.0/.test(SRC), 'combo 窗口 4 秒');
ok(/comboToast\(/.test(SRC), '有 combo 提示');

/* ---------------- ⑥ 行為型補給 ---------------- */
sec('⑥ 補給：9 件，其中 3 件改變玩法');
ok(P.RPG_BAG.length === 9, '九件補給', P.RPG_BAG.length);
const ids = P.RPG_BAG.map(function (x) { return x.id; });
['xray', 'smoke', 'warp'].forEach(function (id) { ok(ids.indexOf(id) >= 0, '有 ' + id); });
ok(/p\.xrayT = Math\.max\(0, \(bf\.xray \| 0\) \* 30\)/.test(SRC), '透視符 30 秒');
ok(/p\.smokeT = Math\.max\(0, \(bf\.smoke \| 0\) \* 10\)/.test(SRC), '煙霧彈 10 秒');
ok(/if \(\(p\.smokeT \| 0\) > 0\) return true;/.test(SRC), '煙霧彈真的讓怪看不到（走 playerHiding）');
ok(/p\.warpBack = Math\.max\(0, bf\.warp \| 0\)/.test(SRC), '傳送卷庫存');

/* ---------------- ⑦ 支線事件 ---------------- */
sec('⑦ 支線事件：12%、三種、公平模式不插');
ok(!!P.SideEvent && typeof P.SideEvent.roll === 'function', '有 SideEvent');
ok(/Math\.random\(\) < \.12/.test(SRC), '12% 觸發率');
ok(/路邊商人/.test(SRC) && /路邊寶箱/.test(SRC) && /路邊賭局/.test(SRC), '三種事件都在');
ok(/Game\.abyss \|\| Game\.wchal\) return false/.test(SRC), '深淵／限制挑戰不插事件（公平）');
ok(/SideEvent\.open\(goNext\)/.test(SRC), '接在強化三選一之後');

/* ---------------- ⑧ 新手首頁 ---------------- */
sec('⑧ 新手：只影響新帳號、三段解鎖');
ok(!!P.Starter && typeof P.Starter.fresh === 'function', '有 Starter');
ok(typeof P.Starter.tier === 'function' && typeof P.Starter.apply === 'function', '有 tier/apply');
ok(/if \(st > 1\) return false;/.test(SRC), '已經打過關的帳號不算新手');
ok(/settings\.nameLock && settings\.playerName\) return false;/.test(SRC), '取過名字的帳號不算新手');
ok(/data-tier="0"/.test(HTML) && /data-tier="2"/.test(HTML), 'CSS 有 0/1/2 三段規則');
ok(HTML.indexOf('id="starterTip"') > 0, '有引導提示列');

/* ---------------- ⑨ 失敗埋點 ---------------- */
sec('⑨ 失敗埋點：哪一關、被什麼弄死');
ok(/Cloud\.track\('dead', st,/.test(SRC), '死亡上報 dead + 關號 + 死因');
ok(/stageName\(st\)/.test(SRC), 'label 帶人看得懂的關名');

/* ---------------- ⑩ 今日進度 ---------------- */
sec('⑩ 今日進度：關卡／星數／深淵');
ok(/function todayLine\(\)/.test(SRC), '有 todayLine()');
ok(HTML.indexOf('id="todayLine"') > 0, '招呼語下面有位置');
ok(/'today\.stage'/.test(SRC) && /'today\.abyss'/.test(SRC), '三個數字都接好了');

/* ---------------- ⑪ 地板材質 ---------------- */
sec('⑪ 地板材質：8 張、無縫、只做微質感');
ok(!!P.FloorTex, '有 FloorTex');
ok(P.FloorTex.STYLES.length === 8, '八個主題', P.FloorTex.STYLES);
const SPR = path.join(__dirname, '..', 'spr');
ok(P.FloorTex.STYLES.every(function (s) { return fs.existsSync(path.join(SPR, 'flr-' + s + '.webp')); }), '八張檔案都在');
const list = JSON.parse(fs.readFileSync(path.join(SPR, '_list.json'), 'utf8'));
ok(P.FloorTex.STYLES.every(function (s) { return list.indexOf('flr-' + s + '.webp') >= 0; }), '_list.json 有 8 筆');
ok(/globalAlpha = \.34/.test(SRC) && /globalCompositeOperation = 'overlay'/.test(SRC), 'alpha .34 + overlay（不蓋底色）');
ok(/paintFloorTex\(cx \* FLR_N \* T/.test(SRC), '在分塊層級畫一次（不是逐格）');

/* ---------------- ⑫ i18n / 版本 ---------------- */
sec('⑫ 字典：新文案五種語言都有');
const KEYS = ['abyss.layer', 'abyss.newBest', 'wk.title', 'wk.mod.fuse', 'deal.title', 'deal.done',
  'starter.tip', 'today.stage', 'today.abyss'];
KEYS.forEach(function (k) {
  const re = new RegExp('^' + k.replace(/\./g, '\\.') + '\\|[^\\n]*\\|[^\\n]*\\|[^\\n]*\\|[^\\n]*\\|[^\\n]*$', 'm');
  ok(re.test(I18N), k + ' 五欄齊全');
});
ok(/VERSION = '5\.73'/.test(SRC), '主檔版本 5.73');
ok(/v: '5\.73'/.test(fs.readFileSync(path.join(__dirname, '..', 'js', 'version-log.js'), 'utf8')), '版本紀錄有 5.73');

console.log('\n' + (fail ? '❌' : '✅') + ' v5.73：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
