# -*- coding: utf-8 -*-
# v4.69 C：單人／RPG 新增「基本地圖（舊）／隨機生成（新）」＋ T1~T5 關卡配置
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
            sys.stderr.write(repr(s[max(0, i - 150):i + 250]) + '\n')
        sys.exit(1)
    s = s.replace(old, new)
    print('[ok] ' + tag)


# ---------- 1. settings ----------
rep("""  soloTime: 300,                                  // 單人關卡時間（0 = 無限）""",
    """  soloTime: 300,                                  // 單人關卡時間（0 = 無限）
  mapMode: 'classic',                             // v4.69：地圖模式 classic = 原本 32 張 / random = 隨機生成""",
    'settings-field')

rep("""  settings.soloTime = [0, 180, 300, 600].indexOf(parseInt(settings.soloTime, 10)) >= 0
    ? parseInt(settings.soloTime, 10) : 300;""",
    """  settings.soloTime = [0, 180, 300, 600].indexOf(parseInt(settings.soloTime, 10)) >= 0
    ? parseInt(settings.soloTime, 10) : 300;
  if (['classic', 'random'].indexOf(settings.mapMode) < 0) settings.mapMode = 'classic';""",
    'settings-normalize')

# ---------- 2. T1~T5 對照表 ----------
rep("""function startMapTest(n) {""",
    """// ====
//   v4.69：32 關在「隨機生成地圖」模式下要用哪一張 T1~T5
//     1~4 / 5~8 / 9~12 / 13~16 → T1 / T2 / T3 / T4
//     17~20 / 21~24 / 25~28 / 29~32 → T2 / T3 / T4 / T5（後半段整段加一階）
//   地圖主題（草原／沙漠…）仍然照原本 32 關的分配走，只有尺寸與怪量換成 T。
// ====
function stageTileIdx(stage) {
  const st = Math.max(1, Math.min(SOLO_STAGES, stage | 0));
  if (st <= 16) return (st - 1) % 4;
  return ((st - 17) % 4) + 1;
}
function mapModeRandom() { return settings.mapMode === 'random'; }
// 這一關要用的隨機地圖參數（null = 走原本的手工地圖）
function mapLayerFor(stage) {
  if (Game.bossRush || !mapModeRandom()) return null;
  return MAPTEST[stageTileIdx(stage)] || MAPTEST[0];
}
// 同一關重試沿用同一張圖（換關才換）；classic 模式不影響
function stageRandSeed(stage) {
  if (Game._seedStage !== stage || !Game._seed) {
    Game._seedStage = stage;
    Game._seed = ((Date.now() & 0x7ffff) ^ ((stage | 0) * 7919)) | 0;
  }
  return Game._seed;
}
function startMapTest(n) {""",
    'tier-table')

# ---------- 3. buildSoloStage：用 lay（maptest 或隨機 T）----------
rep("""function buildSoloStage(stage, fresh) {
  const mt = Game.mapTest;
  const size = SIZES.M;
  const cols = mt ? mt.cols : size[0], rows = mt ? mt.rows : size[1];""",
    """function buildSoloStage(stage, fresh) {
  const mt = Game.mapTest;
  const lay = mt || mapLayerFor(stage);      // v4.69：maptest 關 / 隨機生成模式的 T 圖
  const size = SIZES.M;
  const cols = lay ? lay.cols : size[0], rows = lay ? lay.rows : size[1];""",
    'solo-cols')

rep("""  Game.foeCap = mt ? mt.foes : 0;""",
    """  Game.foeCap = lay ? lay.foes : 0;""",
    'solo-foeCap')

rep("""  const seed = mt ? Game.mapTestSeed : (3000 + info.idx * 6151 + cols * 31 + rows * 13);""",
    """  const seed = mt ? Game.mapTestSeed
    : lay ? stageRandSeed(stage)
    : (3000 + info.idx * 6151 + cols * 31 + rows * 13);""",
    'solo-seed')

rep("""    items: mt ? Math.round(mt.floor * .10) : Math.min(18, 14 + Math.round(stage * .15)),
    targetFloor: mt ? mt.floor : 0""",
    """    items: lay ? Math.round(lay.floor * .10) : Math.min(18, 14 + Math.round(stage * .15)),
    targetFloor: lay ? lay.floor : 0""",
    'solo-items')

rep("""    const n = mt ? mt.foes
      : Math.max(2, Math.min(FOE_MAX_LIVE, Math.round(base * diff.enemy * (cols * rows) / (15 * 13))));""",
    """    const n = lay ? lay.foes
      : Math.max(2, Math.min(FOE_MAX_LIVE, Math.round(base * diff.enemy * (cols * rows) / (15 * 13))));""",
    'solo-foeN')

# ---------- 4. buildRpgStage：用 lay ----------
rep("""function buildRpgStage(stage, fresh) {
  const size = SIZES.M;
  const cols = size[0], rows = size[1];""",
    """function buildRpgStage(stage, fresh) {
  const lay = mapLayerFor(stage);            // v4.69：RPG 也能用隨機生成地圖
  const size = SIZES.M;
  const cols = lay ? lay.cols : size[0], rows = lay ? lay.rows : size[1];""",
    'rpg-cols')

rep("""  const seed = 1000 + info.idx * 7919 + cols * 37 + rows * 11;
  buildOrganicMap(cols, rows, theme, info, rngFrom(seed), { seed: seed, items: 14 + Math.round(stage * 1.1) });""",
    """  const seed = lay ? stageRandSeed(stage) : (1000 + info.idx * 7919 + cols * 37 + rows * 11);
  buildOrganicMap(cols, rows, theme, info, rngFrom(seed), {
    seed: seed,
    items: lay ? Math.round(lay.floor * .10) : 14 + Math.round(stage * 1.1),
    targetFloor: lay ? lay.floor : 0
  });""",
    'rpg-seed')

rep("""  const n = Math.max(2, Math.min(FOE_MAX_LIVE,
    Math.round(Math.round(4 + stage * .25) * (cols * rows) / (15 * 13))));""",
    """  const n = lay ? lay.foes : Math.max(2, Math.min(FOE_MAX_LIVE,
    Math.round(Math.round(4 + stage * .25) * (cols * rows) / (15 * 13))));""",
    'rpg-foeN')

# ---------- 5. 出口選關文字加上 T 級 ----------
rep("""    if (sub) sub.textContent = lock ? t('solo.lockedhint')
      : themeName(info.theme) + ' · ' + info.n + (soloIsBoss(n) ? t('boss.suffix') : '');""",
    """    if (sub) sub.textContent = lock ? t('solo.lockedhint')
      : themeName(info.theme) + ' · ' + info.n + (soloIsBoss(n) ? t('boss.suffix') : '') +
        (mapModeRandom() ? ' · T' + (stageTileIdx(n) + 1) : '');""",
    'solo-go-sub')

io.open(P, 'w', encoding='utf-8', newline='\n').write(s)
print('chars:', len(s))
