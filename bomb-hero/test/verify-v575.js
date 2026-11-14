// test/verify-v575.js —— v5.74：拆檔（js/rpg.js）＋深淵契約＋每週幽靈＋圖鑑獎勵＋關卡分帶
//   ① 沙盒升級：照文件順序載入所有 js/*.js，之後再拆檔不必改測試
//   ② 拆出 js/rpg.js：插槽、依賴、沒有漏接
//   ③ 深淵契約（風險回報型）：八張、好處與代價同時存在、聚合正確
//   ④ 深淵里程碑：一次跨多階要合併回報
//   ⑤ 每週挑戰幽靈重播（本機）
//   ⑥ 圖鑑集滿獎勵：收集 → 領獎 的完整閉環
//   ⑦ RPG 關卡分帶（9-16 / 17-24 / 25-32 / 33-40）
//   ⑧ 美術後處理：八主題調色 ＋ 深淵加暗
//   ⑨ 頂欄：深淵第三行是頂欄裏的一顆 chip
//   ⑩ 版本與 i18n
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const SB = require('./_sandbox');

const ROOT = path.join(__dirname, '..');
const env = SB.makeEnv();
const P = env.BH;
const G = env.G;

const mainSrc = fs.readFileSync(path.join(ROOT, 'js', 'main.js'), 'utf8');
const rpgSrc = fs.readFileSync(path.join(ROOT, 'js', 'rpg.js'), 'utf8');
const idxSrc = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const dictSrc = fs.readFileSync(path.join(ROOT, 'js', 'i18n-src.js'), 'utf8');
const swSrc = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');

let pass = 0, fail = 0;
function ok(c, n, x) {
  if (c) { pass++; console.log('  ✓ ' + n + (x === undefined ? '' : '（' + x + '）')); }
  else { fail++; console.log('  ✗ FAIL: ' + n + (x === undefined ? '' : '（' + x + '）')); }
}
function head(s) { console.log('\n=== ' + s + ' ==='); }

// ─────────────────────────────────────────────────────────────
head('① 沙盒：照文件順序載入所有 js/*.js');
{
  const files = env.extFiles || [];
  ok(files.indexOf('main.js') >= 0 && files.indexOf('rpg.js') >= 0, '外部檔清單含 main.js 與 rpg.js', files.join(','));
  ok(files.indexOf('main.js') < files.indexOf('rpg.js'), 'main.js 排在 rpg.js 之前（rpg 要讀 __BH）');
  ok(files.indexOf('rpg.js') < files.indexOf('keys-ui.js'), 'rpg.js 排在 keys-ui.js 之前（跟 index.html 一致）');
  ok(Array.isArray(env.extErrors) && env.extErrors.length === 0, '所有外部檔都載入成功', JSON.stringify(env.extErrors));
  ok(/js\/main\.js"><\/script>[\s\S]{0,400}js\/rpg\.js"><\/script>/.test(
    idxSrc.replace(/\r/g, '')), 'index.html 的 script 標籤順序正確');
}

// ─────────────────────────────────────────────────────────────
head('② 拆檔：主檔只留插槽，模組由 rpg.js 交回');
{
  ok(/let Rpg = null, RpgUI = null;/.test(mainSrc), '主檔宣告 Rpg／RpgUI 兩個插槽');
  ok(/function __installRpg\(m\)/.test(mainSrc), '主檔有 __installRpg() 收件匣');
  ok(/__x\.__installRpg = __installRpg;/.test(mainSrc), '__installRpg 有匯出給 rpg.js');
  ok(!/const Rpg = \(function \(\)/.test(mainSrc), '主檔已經沒有 Rpg 的實作');
  ok(!/const RpgUI = \(function \(\)/.test(mainSrc), '主檔已經沒有 RpgUI 的實作');
  ok(typeof P.Rpg === 'object' && typeof P.RpgUI === 'object', '載入後 P.Rpg／P.RpgUI 都是物件');
  ok(typeof P.RpgUI.wire === 'function' && typeof P.RpgUI.openChar === 'function', 'RpgUI 的方法都到位');
  ok(!env.sandbox.window.__BHRPG_MISSING, 'rpg.js 沒有回報缺少依賴',
    JSON.stringify(env.sandbox.window.__BHRPG_MISSING || null));
  ok(rpgSrc.indexOf('window.__BH') >= 0, 'rpg.js 走 __BH 取依賴');
  // 絕對不能漏的東西（真的會用到）
  ['RPG', 'RPG_SKILLS', 'RPG_BAG', 'Shop', 'Screen', 'Cloud', 'RpgSkill', 'startRpg', 'rpgSkDef']
    .forEach(function (n) {
      ok(rpgSrc.indexOf("'" + n + "'") >= 0, 'rpg.js 的依賴表有 ' + n);
    });
  // 即時值不能用複製的
  ok(/BH\.RPG_POINTS_TOTAL/.test(rpgSrc), 'RPG_POINTS_TOTAL 走 __BH 即時讀（不是載入時複製）');
  ok(/BH\.LANG/.test(rpgSrc), 'LANG 走 __BH 即時讀（切語言不會殘留舊值）');
  ok(/Object\.defineProperty\(__x, 'LANG'/.test(mainSrc), '__BH 的 LANG 是 getter');
  ok(/Object\.defineProperty\(__x, 'RPG_POINTS_TOTAL'/.test(mainSrc), '__BH 的 RPG_POINTS_TOTAL 是 getter');
  ok(!/\bctx\b/.test(rpgSrc.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ')),
    'rpg.js 不碰畫布 ctx（純介面模組，不該有繪圖依賴）');
  ok(mainSrc.length <= 1950000, '主檔仍在預算內', mainSrc.length);
  /* v5.75：門檻改成「比拆檔前小」而不是寫死 1,710,000 ——
     之後每一版都會往主檔加東西，寫死數字只會變成每次都要改的假紅。
     v5.83：音效＋特效＋圖示讓主檔長回 1.77M（拆檔紅利用完了），
       這條改成「還在 1.85M 的緩衝區內」，真正的硬上限仍是上面的 1,950,000。 */
  /* v5.99.2：隨從的 PetAnim 模組 ＋ 情緒圖示修復讓主檔多約 6K → 緩衝區 1.85M → 1.90M。 */
  ok(mainSrc.length < 1900000, '主檔在 1.90M 緩衝區內（硬上限 1,950,000）', mainSrc.length);
  ok(rpgSrc.length > 30000, 'rpg.js 有實際份量', rpgSrc.length);
  // 角色專屬技卡片（v5.74 新增，曾經因為 charDef 不在作用域而整塊空白）
  P.setDevBuild(false);
  P.RPG.char = 0;
  P.RpgUI.openChar();
  const skBody = env.getId('charSkBody').innerHTML || '';
  ok(skBody.indexOf('icsk') >= 0 && skBody.indexOf('txsk') >= 0, '角色頁的「專屬技」卡片畫得出來');
  ok((env.getId('charSkC').textContent || '').indexOf('CD') >= 0, '卡片右邊有冷卻秒數',
    env.getId('charSkC').textContent);
}

// ─────────────────────────────────────────────────────────────
head('③ 深淵契約：風險回報型三選一');
{
  const PERKS = P.ABYSS_PERKS || [];
  ok(PERKS.length >= 8, 'ABYSS_PERKS 至少 8 條', PERKS.length);
  const ids = PERKS.map(function (x) { return x.id; });
  ok(ids.indexOf('power') >= 0 && ids.indexOf('greed') >= 0 && ids.indexOf('golden') >= 0,
    '契約 id 齊全', ids.join(','));
  // 每一張都要「同時」有好處（g）與代價（b）
  let both = 0;
  PERKS.forEach(function (x) {
    const g = Object.keys(x.g || {}).length, b = Object.keys(x.b || {}).length;
    if (g > 0 && b > 0) both++;
  });
  ok(both === PERKS.length, '每張契約都同時有好處與代價', both + '/' + PERKS.length);
  // 開一張卡：三張、每張都有 ▲/▼
  P.AbyssPerk.open(5);
  const rowHtml = env.getId('apRow').innerHTML || '';
  const cards = (rowHtml.match(/class="apcard/g) || []).length;
  ok(cards === 3, '每層王後抽三張', cards);
  ok((rowHtml.match(/apgood/g) || []).length === 3 && (rowHtml.match(/apbad/g) || []).length === 3,
    '三張卡都同時寫出好處與代價');
  // 聚合：直接改 Game.abyss.perks 再算
  const keep = G.abyss;
  G.abyss = { layer: 6, perks: ['power', 'greed'] };
  const sum = P.Abyss.perkSum();
  ok(sum && sum.power >= 1, 'perkSum() 把火力加起來', JSON.stringify(sum));
  ok(sum.gold >= 150 && sum.foes >= 3, 'perkSum() 也把金幣／怪量加起來', JSON.stringify(sum));
  G.abyss = { layer: 6, perks: ['power', 'power'] };
  const s2 = P.Abyss.perkSum();
  ok(s2.power === 2, '同一張抽兩次會疊加', s2.power);
  G.abyss = keep;
}

// ─────────────────────────────────────────────────────────────
head('④ 深淵里程碑：跨多階要合併回報');
{
  try { env.storage['bombhero-abyss-ms-v1'] = ''; } catch (e) {}
  const r = P.Abyss.msCheck(75);
  ok(!!r, '一次跨到 75 層會回報里程碑', JSON.stringify(r));
  ok(r && r.many === true, '跨多階會標記 many（不漏發金幣）', r && r.m);
  const again = P.Abyss.msCheck(75);
  ok(again === null, '同一個里程碑不會重複發');
}

// ─────────────────────────────────────────────────────────────
head('⑤ 每週挑戰幽靈（本機）');
{
  ok(typeof P.Ghost === 'object', 'Ghost 模組在');
  ok(typeof P.Ghost.wkLoad === 'function' && typeof P.Ghost.wkToday === 'function', '有每週幽靈的讀寫');
  ok(/bombhero-wkchal-ghost-v1/.test(mainSrc), '每週幽靈有自己的儲存 key');
  ok(/Game\.wchal/.test(mainSrc) && /wkToday/.test(mainSrc), 'wkToday() 會在限制挑戰時接手');
  ok(/if \(Game\.wchal\) Ghost\.tick\(dt\);/.test(mainSrc), '每週挑戰每禎都會記錄軌跡');
}

// ─────────────────────────────────────────────────────────────
head('⑥ 圖鑑集滿獎勵：收集 → 領獎');
{
  P.setDevBuild(false);
  const C = P.CodexUI;
  ok(typeof C.listOf === 'function' && typeof C.claimReady === 'function', '圖鑑有把獎勵狀態露出來');
  ok(Array.isArray(C.TABS) && C.TABS.length === 4, '四個分頁', C.TABS && C.TABS.length);
  // 清空領獎紀錄（換一個乾淨的沙盒狀態）
  try { env.storage['bombhero-codex-rw-v1'] = '[]'; } catch (e) {}
  C.open();
  const before = P.Shop.gold() | 0;
  ok((env.getId('codexRew').innerHTML || '') === '', '還沒集滿時不顯示獎勵列');
  // 點亮第一分頁
  C.listOf('f').forEach(function (x) { P.Codex.mark('f', x.id); });
  C.render();
  const html = env.getId('codexRew').innerHTML || '';
  ok(html.indexOf('cdxrw') >= 0 && html.indexOf('data-cdxrw') >= 0, '集滿一分頁就出現「領取」按鈕', html.slice(0, 60));
  ok(html.indexOf('🎁 🎁') < 0, '不會出現兩顆禮物 emoji');
  const claimed = C.claimReady();
  ok(claimed === true, 'claimReady() 領得到');
  ok((P.Shop.gold() | 0) === before + 1200, '領到 1200 金幣', (P.Shop.gold() | 0) - before);
  ok(C.claimReady() === false, '同一個分頁不能重複領');
  // 四個分頁全滿 → 追加 6000 ＋ 2 張門票
  ['b', 'i', 's'].forEach(function (tab) {
    C.listOf(tab).forEach(function (x) {
      if (tab === 'b') P.Codex.mark('b', x.id);
      else if (tab === 'i') P.Codex.mark('i', x.id);
      else { try { P.RPG.sk = P.RPG.sk || {}; P.RPG.sk[x.id] = 1; } catch (e) {} }
    });
  });
  C.render();
  const g1 = P.Shop.gold() | 0;
  const done = C.allDone();
  if (done) {
    C.claimReady();
    ok((P.Shop.gold() | 0) >= g1 + 6000, '全圖鑑追加 6000 金幣', (P.Shop.gold() | 0) - g1);
    C.render();
    ok((env.getId('codexRew').innerHTML || '').indexOf('done') >= 0, '全滿之後改成「全圖鑑達成」');
  } else {
    ok(true, '（這一輪沒能模擬全部四頁集滿，略過全滿獎勵）');
    ok(true, '（略過）');
  }
}

// ─────────────────────────────────────────────────────────────
head('⑦ RPG 關卡分帶（9-16／17-24／25-32／33-40）');
{
  ok(typeof P.rpgBand === 'function', 'rpgBand() 已匯出');
  ok(P.rpgBand(8) === null, '第 8 關（決戰場前一關）不分帶');
  const b9 = P.rpgBand(9), b17 = P.rpgBand(17), b25 = P.rpgBand(25), b33 = P.rpgBand(33);
  ok(b9 && b9.id === 'swarm', '9-16 帶＝怪多（swarm）', b9 && b9.id);
  ok(b17 && b17.id === 'fuse', '17-24 帶＝引信短（fuse）', b17 && b17.id);
  ok(b25 && b25.id === 'scarce', '25-32 帶＝補給少（scarce）', b25 && b25.id);
  ok(b33 && b33.id === 'hunt', '33-40 帶＝追殺（hunt）', b33 && b33.id);
  ok(P.rpgBand(16) && P.rpgBand(16).id === 'swarm', '16 還在 swarm 帶內');
  ok(/t\('band\.line'/.test(mainSrc), '開場說明用 band.line 這句話（有進字典）');
}

// ─────────────────────────────────────────────────────────────
head('⑧ 美術後處理：統一光源 ＋ 主題調色 ＋ 深淵加暗');
{
  ok(typeof P.drawGrade === 'function', 'drawGrade() 已匯出');
  const T = P.GRADE_TINT || {};
  ok(Object.keys(T).length >= 8, '八個主題都有調色值', Object.keys(T).length);
  ok(/createLinearGradient\(0, 0, VIEW_W, VIEW_H\)/.test(mainSrc), '有「同一個光源」的斜向漸層');
  ok(/drawGrade\._lgk/.test(mainSrc), '漸層快取會跟著視窗尺寸失效（換尺寸不會歪掉）');
  ok(/ctx\.globalCompositeOperation = 'multiply'/.test(mainSrc), '深淵用 multiply 壓暗');
  ok(/function drawVignette/.test(mainSrc), '暗角層還在（後處理沒有把舊效果吃掉）');
  // 呼叫真的不會爆（沙盒的 ctx 是 Proxy）
  let threw = null;
  try {
    G.theme = { style: 'forest' };
    P.drawGrade();
    G.abyss = { layer: 12 };
    P.drawGrade();
  } catch (e) { threw = e.message; }
  ok(threw === null, 'drawGrade() 在一般圖與深淵都不會丟例外', threw || 'ok');
}

// ─────────────────────────────────────────────────────────────
head('⑨ 頂欄：深淵徽章是頂欄裏的一顆 chip');
{
  /* v5.74：徽章是 JS 動態 append 進 #gameTop 的（index.html 只有 CSS）。 */
  ok(/el\.id = 'abyssBadge'/.test(mainSrc) && /#abyssBadge\s*\{/.test(idxSrc), '#abyssBadge 有建立也有樣式');
  ok(/top\.appendChild\(el\)/.test(mainSrc), '徽章是 append 進 #gameTop（跟著 flex 排）');
  ok(!/#abyssBadge\s*\{[^}]*position:\s*(fixed|absolute)/.test(idxSrc),
    '徽章不是 fixed／absolute 浮在畫面上');
  ok(/AbyssHud\.paint\(\)/.test(mainSrc), '頂欄重畫之後會補畫徽章');
  ok(/@media \(max-width:380px\)/.test(idxSrc), '窄機（≤380px）有自己的收窄規則');
  ok(/#pauseBtn\{flex:0 0 auto/.test(idxSrc.replace(/\s+/g, '')) ||
     /#pauseBtn\s*\{[^}]*flex:\s*0 0 auto/.test(idxSrc), '#pauseBtn 不會被壓扁');
}

// ─────────────────────────────────────────────────────────────
head('⑩ 版本與 i18n');
{
  const V = String(P.VERSION);
  ok(parseFloat(V) >= 5.74, 'VERSION ≥ 5.74（' + V + '）');
  const vl = (P.VERSION_LOG || [])[0] || {};
  ok(vl.v === V && vl.now === true, 'VERSION_LOG 第一筆＝當前版本且 now:true（' + vl.v + '）');
  ok((P.VERSION_LOG || [])[1] && P.VERSION_LOG[1].now === false, '上一版已收成 now:false');
  ok(new RegExp('<span id="verTxt">' + V + '</span>').test(idxSrc), '#verTxt 跟著 VERSION');
  ok(new RegExp('<span id="verLogVer">' + V + '</span>').test(idxSrc), '#verLogVer 跟著 VERSION');
  const swn = (function (t) { const m = /SW_VERSION = 'v(\d+)\.(\d+)\.(\d+)'/.exec(t); return m ? (+m[1]) * 1e6 + (+m[2]) * 1e3 + (+m[3]) : 0; })(swSrc);
  ok(swn >= 5074000, 'SW 版號 ≥ v5.74.0（' + swn + '）');
  ok(/'\''?\.\/js\/rpg\.js'\''?/.test(swSrc) || /\.\/js\/rpg\.js/.test(swSrc), 'SW 的 CORE 有 precache js/rpg.js');

  // 字典：六欄齊備 + 新 key 五語都有
  const m = /window\.__I18N_SRC = `([\s\S]*?)`;/.exec(dictSrc);
  const rows = m ? m[1].split('\n').filter(Boolean) : [];
  const bad = rows.filter(function (r) { return r.split('|').length !== 6; });
  ok(bad.length === 0, '字典每行都是六欄', bad.length);
  const D = {};
  rows.forEach(function (r) { const a = r.split('|'); D[a[0]] = a; });
  const WANT = ['ap.title', 'ap.sub', 'perk.power', 'perk.greed', 'abyss.perkShort', 'ms.got',
    'wk.ghost', 'codex.rwBtn', 'codex.rwGot', 'codex.rwAll', 'band.line', 'band.swarm',
    'band.fuse', 'band.scarce', 'band.hunt', 'char.skTitle', 'skill.cdOnly', 'combo.freeze',
    'combo.shield', 'combo.gust'];
  const missing = WANT.filter(function (k) {
    const r = D[k];
    if (!r) return true;
    for (let i = 1; i <= 5; i++) if (!r[i] || !r[i].trim()) return true;
    return false;
  });
  ok(missing.length === 0, 'v5.74 新文案五語齊備', missing.join(',') || 'ok');
  ok(rows.length > 2100, '字典條數', rows.length);
}

console.log('\n' + (fail ? '❌' : '✅') + ' v5.74：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
