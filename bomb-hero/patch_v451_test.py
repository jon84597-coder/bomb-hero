# -*- coding: utf-8 -*-
# v4.51 ②：不对外地图测试关（5 档）＋ buildSoloStage 接生成器 ＋ 出生点保护
import io, sys

P = 'index.html'
s = io.open(P, encoding='utf-8', newline='').read()
orig = len(s)


def rep(old, new, optional=False, tag=''):
    global s
    if old not in s:
        if optional:
            print('  · skip ' + (tag or old[:36]))
            return
        sys.exit('MISS: ' + (tag or '') + ' -> ' + old[:120].replace('\n', '\\n'))
    s = s.replace(old, new, 1)
    print('  ✓ ' + (tag or old[:36].replace('\n', ' ')))


# ---------------------------------------------------------- 1) Game 預設值
rep('''  zoom: 1, zoomTarget: 1,     // v4.27：全場縮放（1 = 原始大小；只影響「怎麼看」）''',
'''  zoom: 1, zoomTarget: 1,     // v4.27：全場縮放（1 = 原始大小；只影響「怎麼看」）
  bigMap: false,              // v4.51：大地圖（可走格驅動）→ tileSize 會把整張塞進畫面
  spawnCell: null,            // v4.51：這一場的出生格（隨機）
  mapTest: null,              // v4.51：不對外地圖測試關設定（null = 正常關卡）
  foeCap: 0,                  // v4.51：測試關的召喚上限（0 = 用 FOE_MAX_LIVE）''',
    tag='Game 預設值')

# ---------------------------------------------------------- 2) MAPTEST 表 + startMapTest
rep('''// 首頁「挑戰 BOSS」：直接打最終魔王（第 32 張地圖「魔王之間」），場上沒有小怪
function startBossRush() { startSolo(SOLO_STAGES, true); }''',
'''// 首頁「挑戰 BOSS」：直接打最終魔王（第 32 張地圖「魔王之間」），場上沒有小怪
function startBossRush() { startSolo(SOLO_STAGES, true); }

// ============ v4.51：不公開的地圖生成測試關（開發／驗收用）============
// 使用者定調：1-1 起 100 格可走，之後 150／200／250／300；怪從 6 隻長到 20 隻。
// 可走格 = 空地 ＋ 軟磚（軟磚炸得開，算可走）。尺寸不是正方形 —— 橫向比直向寬，
// 攤開來更開闊，靠更多硬牆走廊維持格數（使用者：「橫向跟直向放寬」）。
// 進入方式：網址加 ?maptest=1~5，或說明頁最下方那排小按鈕。
const MAPTEST = [
  { n: 1, cols: 18, rows: 16, floor: 100, foes: 6,  name: '窄洞' },
  { n: 2, cols: 21, rows: 19, floor: 150, foes: 9,  name: '石窟' },
  { n: 3, cols: 23, rows: 21, floor: 200, foes: 12, name: '迷徑' },
  { n: 4, cols: 26, rows: 23, floor: 250, foes: 16, name: '大廳' },
  { n: 5, cols: 28, rows: 25, floor: 300, foes: 20, name: '深巢' }
];
function startMapTest(n) {
  const k = Math.max(0, Math.min(MAPTEST.length - 1, (parseInt(n, 10) || 1) - 1));
  Game.mapTest = MAPTEST[k];
  // 每張都重新長 → 同一個測試關每次進去都不一樣（要固定圖就給 ?seed=N）
  Game.mapTestSeed = 0;
  try {
    const q = new URLSearchParams(location.search);
    const sd = parseInt(q.get('seed'), 10);
    if (sd) Game.mapTestSeed = sd | 0;
  } catch (e) {}
  if (!Game.mapTestSeed) Game.mapTestSeed = (Date.now() & 0x3fffff) ^ (k * 7919);
  startSolo(1, false);
}
function clearMapTest() { Game.mapTest = null; Game.mapTestSeed = 0; Game.foeCap = 0; }
// 出生點保護：切比雪夫距離 d 以內不算怪區
function nearSpawn(x, y, d) {
  const s2 = Game.spawnCell || { x: 1, y: 1 };
  d = d || 3;
  return Math.abs(x - s2.x) <= d && Math.abs(y - s2.y) <= d;
}''', tag='MAPTEST 表 + startMapTest')

# ---------------------------------------------------------- 3) buildSoloStage 尺寸/種子/怪
rep('''function buildSoloStage(stage, fresh) {
  const size = SIZES[settings.size] || SIZES.M;
  const cols = size[0], rows = size[1];
  const diff = soloDiffCfg();
  const p = Game.players[0];
  const info = soloInfo(stage);
  const theme = THEMES[info.theme] || THEMES[0];
  Game.theme = theme;
  Game.mapInfo = info;
  // v4.14：單人闖關跟 RPG 一樣走「有機地形」（洞穴／迷宮／環形／樑柱…）。
  //   固定種子 → 同一張地圖每次進去長得都一樣，玩家可以記圖、練路線。
  const seed = 3000 + info.idx * 6151 + cols * 31 + rows * 13;
  // v4.14：道具量也改成連續曲線（32 關不能沿用「13 + 關號×1.5」，後段會多到每塊磚都有）
  buildOrganicMap(cols, rows, theme, info, rngFrom(seed), {
    seed: seed, items: Math.min(18, 14 + Math.round(stage * .15))
  });
  p.x = 1 * Game.T + Game.T / 2;
  p.y = 1 * Game.T + Game.T / 2;''',
'''function buildSoloStage(stage, fresh) {
  // v4.51：測試關有自己的尺寸／可走格數；正常關卡仍用預設 15×13
  const mt = Game.mapTest;
  const size = SIZES.M;
  const cols = mt ? mt.cols : size[0], rows = mt ? mt.rows : size[1];
  const diff = soloDiffCfg();
  const p = Game.players[0];
  const info = soloInfo(stage);
  const theme = THEMES[info.theme] || THEMES[0];
  Game.theme = theme;
  Game.mapInfo = info;
  Game.foeCap = mt ? mt.foes : 0;
  // v4.14：單人闖關跟 RPG 一樣走「有機地形」（洞穴／迷宮／環形／樑柱…）。
  //   固定種子 → 同一張地圖每次進去長得都一樣，玩家可以記圖、練路線。
  // v4.51：測試關不固定種子 —— 每張都要重新長，才驗得出生成器的穩定性。
  const seed = mt ? Game.mapTestSeed : (3000 + info.idx * 6151 + cols * 31 + rows * 13);
  // v4.14：道具量也改成連續曲線（32 關不能沿用「13 + 關號×1.5」，後段會多到每塊磚都有）
  buildOrganicMap(cols, rows, theme, info, rngFrom(seed), {
    seed: seed,
    items: mt ? Math.round(mt.floor * .10) : Math.min(18, 14 + Math.round(stage * .15)),
    targetFloor: mt ? mt.floor : 0
  });
  const sc = Game.spawnCell || { x: 1, y: 1 };
  p.x = (sc.x + .5) * Game.T;
  p.y = (sc.y + .5) * Game.T;''', tag='buildSoloStage 尺寸/種子/出生點')

# ---------------------------------------------------------- 4) solo 怪數與避開出生點
rep('''    const base = (soloIsBoss(stage) || isChapterFinal(stage)) ? Math.round(base0 * .6) : base0;
    const n = Math.max(2, Math.min(FOE_MAX_LIVE, Math.round(base * diff.enemy * (cols * rows) / (15 * 13))));''',
'''    const base = (soloIsBoss(stage) || isChapterFinal(stage)) ? Math.round(base0 * .6) : base0;
    // v4.51：測試關直接吃設定表的怪數（6→20）；正常關卡維持原曲線
    const n = mt ? mt.foes
      : Math.max(2, Math.min(FOE_MAX_LIVE, Math.round(base * diff.enemy * (cols * rows) / (15 * 13))));''',
    tag='solo 怪數')

rep('''        x = 1 + rand(cols - 2); y = 1 + rand(rows - 2);
        tries++;
      } while ((cellAt(x, y) !== 0 || (x < 4 && y < 4) || bombAt(x, y)) && tries < 200);''',
'''        x = 1 + rand(cols - 2); y = 1 + rand(rows - 2);
        tries++;
        // v4.51：出生點半徑 3 內不生成怪（隨機出生點後，舊的「x<4 && y<4」已經沒意義）
      } while ((cellAt(x, y) !== 0 || nearSpawn(x, y, 3) || bombAt(x, y)) && tries < 200);''',
    tag='solo 怪避開出生點')

# ---------------------------------------------------------- 5) RPG 尺寸/出生點/怪
rep('''function buildRpgStage(stage, fresh) {
  const size = SIZES[settings.size] || SIZES.M;
  const cols = size[0], rows = size[1];''',
'''function buildRpgStage(stage, fresh) {
  const size = SIZES.M;
  const cols = size[0], rows = size[1];''', tag='buildRpgStage 尺寸')

rep('''  const seed = 1000 + info.idx * 7919 + cols * 37 + rows * 11;
  buildOrganicMap(cols, rows, theme, info, rngFrom(seed), { seed: seed, items: 14 + Math.round(stage * 1.1) });
  p.x = 1 * Game.T + Game.T / 2;
  p.y = 1 * Game.T + Game.T / 2;''',
'''  const seed = 1000 + info.idx * 7919 + cols * 37 + rows * 11;
  buildOrganicMap(cols, rows, theme, info, rngFrom(seed), { seed: seed, items: 14 + Math.round(stage * 1.1) });
  const sc = Game.spawnCell || { x: 1, y: 1 };
  p.x = (sc.x + .5) * Game.T;
  p.y = (sc.y + .5) * Game.T;''', tag='RPG 出生點')

rep('''      x = 1 + Math.floor(Math.random() * (cols - 2));
      y = 1 + Math.floor(Math.random() * (rows - 2));
      tries++;
    } while ((cellAt(x, y) !== 0 || (x < 4 && y < 4) || bombAt(x, y)) && tries < 200);''',
'''      x = 1 + Math.floor(Math.random() * (cols - 2));
      y = 1 + Math.floor(Math.random() * (rows - 2));
      tries++;
    } while ((cellAt(x, y) !== 0 || nearSpawn(x, y, 3) || bombAt(x, y)) && tries < 200);''',
    tag='RPG 怪避開出生點')

# ---------------------------------------------------------- 6) tileSize 大圖整張
rep('''function tileSize() {
  // v2.5 → v2.6：先算「整張塞進去」的格子，再放大到只裝 MOBILE_VIEW_FRAC。''',
'''function tileSize() {
  // v4.51：大地圖（測試關）→ 預設就「整張塞進畫面」。
  //   28 格的圖在 390px 手機上每格只有 14px，若沿用「至少看 7 格寬」會只看到三分之一，
  //   檢查地形時根本看不出形狀。玩家覺得太小可以雙指捏合放大（ZOOM_MAX 1.85 → 約 26px）。
  //   下限放寬到 12px（角色約 12px 高，勉強看得見），其餘交給縮放手勢。
  if (Game.bigMap) {
    return clamp(Math.round(Math.min(VIEW_W / Math.max(1, Game.cols), VIEW_H / Math.max(1, Game.rows))), 12, 62);
  }
  // v2.5 → v2.6：先算「整張塞進去」的格子，再放大到只裝 MOBILE_VIEW_FRAC。''',
    tag='tileSize 大地圖整張')

# ---------------------------------------------------------- 7) 召喚上限吃 foeCap
rep('''  if (Game.enemies.length >= FOE_MAX_LIVE) return;      // 場上上限，避免爆量''',
'''  if (Game.enemies.length >= (Game.foeCap || FOE_MAX_LIVE)) return;   // 場上上限，避免爆量''',
    tag='分裂上限')
rep('''    if (n >= 2 || Game.enemies.length >= FOE_MAX_LIVE) return;''',
'''    if (n >= 2 || Game.enemies.length >= (Game.foeCap || FOE_MAX_LIVE)) return;''',
    tag='分裂上限 2')
rep('''    if (Game.enemies.length >= FOE_MAX_LIVE) { e.skCd = 2; return; }''',
'''    if (Game.enemies.length >= (Game.foeCap || FOE_MAX_LIVE)) { e.skCd = 2; return; }''',
    tag='召喚上限')

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('\n字元 %d → %d（%+d）' % (orig, len(s), len(s) - orig))
