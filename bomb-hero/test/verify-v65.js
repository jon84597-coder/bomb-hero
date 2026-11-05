// test/verify-v65.js —— v4.21
//   ① 作者公告不再浮在選單上面（改成首頁區塊內、預設收合）→ 按鈕不會被蓋住
//   ② 內容比視窗高時不會把頂端推到畫面外（body 不再 align-items:center）
//   ③ 商店／RPG／帳號 先切畫面再畫內容（render 出錯也不會「完全沒反應」）
//   ④ 首頁「離開遊戲」：按鈕 + 離場卡
//   ⑤ 關卡金幣 → 過關（或陣亡）時進商店錢包
//   ⑥ 找傳送門提示改用 doorHintCard（不再用中央巨型 banner）
//   ⑦ i18n：5 語言都有提示卡文字
//   ⑧ 版本與 SW 快取
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const P = env.BH, G = P.Game, html = env.html;
const fs = require('fs');

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ FAIL: ' + msg); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }
const css = html.replace(/\r/g, '');
const DT = 1 / 60;

head('1. 作者公告不再蓋住選單（這是「按鈕點不到」的元凶）');
{
  // 先把 CSS 註解拿掉，否則「舊版是 position:fixed」這種說明文字會被誤判
  const cssNoCmt = css.replace(/(?<![\w\/])\/\*[\s\S]*?\*\//g, '');
  // 只取獨立的 `.annbox {` 規則（v4.23 起還有 `.toprow .annbox {`，別抓錯）
  const m = cssNoCmt.match(/\n\s*\.annbox \{([\s\S]*?)\}/);
  const block = m ? m[1] : '';
  ok(!!m, '找得到 .annbox 樣式');
  ok(!/position:\s*fixed/.test(block), '.annbox 不再是 position:fixed（以前浮在左上角蓋住按鈕）');
  ok(/position:\s*relative/.test(block), '.annbox 回到正常排版（relative）');
  ok(/max-width:\s*520px/.test(block), '.annbox 有寬度上限（不會橫向撐爆）');
  ok(!/z-index:\s*900/.test(block), '.annbox 不再壓在所有東西上面');
  // 公告就放在首頁卡片裡 → 其他畫面看不到它
  const titleStart = css.indexOf('id="scr-title"');
  const annStart = css.indexOf('id="annBox"');
  ok(titleStart > 0 && annStart > titleStart, '公告在 #scr-title 之內（切到別頁就自動消失）');
  const ann = env.getId('annBox');
  ok(ann.classList.contains('min'), '預設是收合狀態（小膠囊）');
}

head('2. 內容比視窗高時，頂端不會被切掉');
{
  ok(!/(?:^|\n)\s*body \{[\s\S]{0,200}?align-items:\s*center/.test(css.replace(/(?<![\w\/])\/\*[\s\S]*?\*\//g, '')), 'body 不再用 align-items:center（會把頂端推到畫面外；只看真正的 body 選擇器，.bhbody 之類不算）');
  ok(/align-items:\s*flex-start/.test(css), 'body 改成靠上對齊');
  ok(/\.wrap \{[^}]*margin-block:\s*auto/.test(css), '.wrap 用 auto margin 置中（空間不夠時自動靠上）');
}

head('3. 公告可以展開／收合');
{
  const head2 = env.getId('annHead');
  const box = env.getId('annBox');
  (head2._on.click || []).forEach(fn => fn({ stopPropagation() {} }));
  ok(!box.classList.contains('min'), '點一下 → 展開');
  (head2._on.click || []).forEach(fn => fn({ stopPropagation() {} }));
  ok(box.classList.contains('min'), '再點一下 → 收起');
}

head('4. 商店／RPG／帳號：先切畫面，再畫內容');
{
  // 原始碼順序鎖：Screen.show 必須排在 render 之前
  const css1 = css.replace(/(?<![\w\/])\/\*[\s\S]*?\*\//g, '');        // 註解不列入順序判斷
  const shopAt = css1.indexOf('const Shop = (function ()');
  const shopOpen = css1.slice(css1.indexOf('function open() {', shopAt), css1.indexOf('function open() {', shopAt) + 700);
  ok(shopOpen.indexOf("Screen.show('shop')") > 0, 'Shop.open 有切到商店畫面');
  ok(shopOpen.indexOf("Screen.show('shop')") < shopOpen.indexOf('syncGold(); render()'), 'Shop.open 先切畫面再 render（render 出錯不會卡在原畫面）');
  ok(/catch \(e\) \{[\s\S]{0,160}?toast\('⚠️ 商店內容載入失敗/.test(css), '商店 render 出錯會 toast（不再靜默）');
  const rpg = css1.slice(css1.indexOf("const btn = $id('btnRpg')"), css1.indexOf("const btn = $id('btnRpg')") + 700);
  ok(rpg.indexOf("Screen.show('rpg')") > 0 && rpg.indexOf("Screen.show('rpg')") < rpg.indexOf('Rpg.render()'), 'RPG 先切畫面再 render');
  ok(/toast\('⚠️ RPG 表單載入失敗/.test(css), 'RPG 出錯會 toast');
  ok(/toast\('⚠️ BOSS 挑戰開不起來/.test(css), 'BOSS 出錯會 toast');
  ok(/toast\('⚠️ 找不到帳號視窗/.test(css), '帳號視窗找不到會 toast');
  // 帳號彈窗真的會開
  P.Cloud.open();
  ok(env.getId('acctModal').classList.contains('on'), 'Cloud.open() 會打開帳號彈窗');
  env.getId('acctModal').classList.remove('on');
  // 商店真的切得到
  P.Shop.open();
  ok(P.Screen.current === 'shop', 'Shop.open() 切到商店');
  P.Screen.show('title');
}

head('5. 首頁「離開遊戲」');
{
  ok(!!css.match(/id="btnQuit"/), '首頁有離開遊戲按鈕');
  ok(!!css.match(/id="quitModal"/), '有離場卡（關不掉視窗時不會變黑畫面）');
  ok(!!css.match(/id="quitBack"/), '離場卡有「回到遊戲」');
  const btn = env.getId('btnQuit'), modal = env.getId('quitModal');
  (btn._on.click || []).forEach(fn => fn({}));
  ok(modal.classList.contains('on'), '按下離開遊戲 → 離場卡打開');
  (env.getId('quitBack')._on.click || []).forEach(fn => fn({}));
  ok(!modal.classList.contains('on'), '按「回到遊戲」→ 離場卡關掉');
}

head('6. 關卡裡賺到的金幣會進商店錢包');
{
  P.settings.size = 'M';
  P.settings.hazards = 'off';
  P.settings.sd = 'off';
  P.settings.ctrl = 'kb';
  P.startSolo(9, false);
  G.state = 'play';
  G.hazards = [];
  const me = G.players[0];
  G.enemies.length = 0;
  me.alive = true; me.invuln = 0; me.dead = false;
  me.score = 250;
  // 把門打開、玩家站到門上
  G.door = { x: 2, y: 2, open: true, revealed: true };
  me.x = 2 * G.T + G.T / 2; me.y = 2 * G.T + G.T / 2;
  const before = P.Shop.gold();
  const base = 40 + Math.floor((G.stage - 1) / 4) * 10;
  P.updateSolo(DT);
  const after = P.Shop.gold();
  ok(after - before === 250 + base, '過關金幣 = 本關金幣 250 + 過關獎勵 ' + base + '（實得 ' + (after - before) + '）');
  ok(P.Shop.gold() > 0, '商店錢包真的增加了（可用來買隨從）');
  ok(/Shop\.addGold\(base \+ coins\)/.test(css), '原始碼是 base + coins（不是只有固定獎勵）');
  ok(/本關金幣/.test(css), '有「本關金幣」提示');
  // HUD 的 💰 有說明
  ok(/本關金幣 · 過關（或陣亡）後會放進商店錢包/.test(css), 'HUD 金幣有 tooltip 說明');

  // 陣亡也要把金幣帶走
  P.startSolo(3, false);
  G.state = 'play';
  G.hazards = [];
  const me2 = G.players[0];
  G.enemies.length = 0;
  me2.score = 90;
  me2.alive = false; me2.dead = true; me2.lives = 0; me2.respawnT = 0;
  const b2 = P.Shop.gold();
  P.updateSolo(DT);
  const a2 = P.Shop.gold();
  ok(a2 - b2 === 90, '陣亡也會把這關賺到的 90 金幣放進錢包（實得 ' + (a2 - b2) + '）');
}

head('7. 找傳送門的提示：漂亮的提示卡，2.6 秒後淡出');
{
  ok(!!css.match(/id="doorHint"/), '有提示卡元素');
  ok(/\.dh-card/.test(css) && /backdrop-filter/.test(css), '提示卡是毛玻璃卡片（不是中央巨型字）');
  ok(/@keyframes dhOut/.test(css), '有淡出動畫');
  ok(/@keyframes dhBar/.test(css), '有剩餘時間進度條動畫');
  // 清光敵人 → 觸發提示卡（不再呼叫 banner）
  P.settings.size = 'M'; P.settings.hazards = 'off'; P.settings.sd = 'off';
  P.startSolo(2, false);
  G.state = 'play';
  G.hazards = [];
  G.enemies.length = 0;
  G.doorHinted = false;
  G.door = { x: 3, y: 3, open: false, revealed: false };
  // 保證還有軟磚可以炸
  let soft = 0;
  for (let y = 1; y < G.rows - 1; y++) for (let x = 1; x < G.cols - 1; x++) if (G.grid[y][x] === 2) soft++;
  if (!soft) G.grid[3][5] = 2;
  const before = P.Game.bannerT || 0;
  P.updateSolo(DT);
  const box = env.getId('doorHint');
  ok(!box.classList.contains('hide'), '敵人清光 → 提示卡顯示');
  ok(box.classList.contains('in'), '提示卡有滑入動畫 class');
  ok((P.Game.bannerT || 0) === before, '不再用中央巨型 banner（bannerT 沒被改）');
  ok(/doorHintCard\('🚪', t\('solo\.doorTip\.t'\)/.test(css), '找門提示走 doorHintCard');
  P.hideDoorHint();
  ok(box.classList.contains('hide'), 'hideDoorHint() 會收掉提示卡');
}

head('8. i18n：5 種語言都有提示卡文字');
{
  const LANGS = ['zh-TW', 'zh-CN', 'en', 'ja', 'ko'];
  ok(LANGS.length === 5, '語言清單 5 種');
  LANGS.forEach(l => {
    const has = (k) => (P.I18N && P.I18N[l] && P.I18N[l][k]) ? true : false;
    const t1 = has('solo.doorTip.t'), t2 = has('solo.doorTip.s'), t3 = has('solo.doorTip.go');
    ok(t1 && t2 && t3, l + ' 有 solo.doorTip.t / .s / .go');
  });
  // 不可以還留著「未翻譯」的空字串
  LANGS.forEach(l => {
    const v = P.I18N[l]['solo.doorTip.t'];
    ok(typeof v === 'string' && v.length > 2 && v !== 'solo.doorTip.t', l + ' 標題有實際文字');
  });
}

head('9. 版本與 Service Worker');
{
  // v4.22 起改成「不綁死版本號」：只驗格式與四處同步，升版就不用再改這支
  ok(/^\d+\.\d+$/.test(P.VERSION), '版號格式 = ' + P.VERSION);
  ok(css.indexOf('id="verTxt">' + P.VERSION + '<') > 0, '畫面版本文字同步 ' + P.VERSION);
  ok(css.indexOf('id="verLogVer">' + P.VERSION + '<') > 0, '版本紀錄標題同步 ' + P.VERSION);
  ok(P.VERSION_LOG[0].v === P.VERSION && P.VERSION_LOG[0].now === true, 'VERSION_LOG 第一筆 = ' + P.VERSION + '（now）');
  const e421 = P.VERSION_LOG.filter(e => e.v === '4.21')[0];
  ok(!!e421 && e421.items.join(' ').indexOf('離開遊戲') >= 0, '4.21 的更新內容寫了離開遊戲');
  ok(P.VERSION_LOG.filter(e => e.v === '4.20').every(e => e.now === false), '4.20 已不是 now');
  ok(new RegExp("SW_VERSION = 'v" + P.VERSION + "\\.0'").test(fs.readFileSync(__dirname + '/../sw.js', 'utf8')),
    'sw.js = v' + P.VERSION + '.0');
}

console.log('\n通過 ' + pass + ' 項，失敗 ' + fail + ' 項');
process.exit(fail ? 1 : 0);
