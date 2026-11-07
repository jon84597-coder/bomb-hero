/* 逐關驗證：RPG 選到的章節／小關 → 實際生成的地圖主題、地圖名、怪物種類是否一致 */
const SB = require('./_sandbox');
const env = SB.makeEnv();
const P = env.BH, G = P.Game;
try { P.WeekMod.pin([]); } catch (e) {}

let bad = 0;
const lines = [];
for (let th = 0; th < 8; th++) {
  for (let sb = 0; sb < 5; sb++) {
    const st = th * P.BOSS_SLOT + sb + 1;
    let err = null, theme = '', mapN = '', arena = false, size = '', foe = '';
    try {
      P.startRpg(st, {});
      arena = !!G.bossArena;
      theme = (G.theme && G.theme.name) || '?';
      const info = P.soloInfo(st);
      mapN = arena ? '（決戰場）' : info.n;
      size = arena ? ('17×15') : (G.cols + '×' + G.rows);
      // 怪物種類只能來自本章名單
      const roster = P.stageRoster(st) || [];
      const types = {};
      (G.enemies || []).forEach(function (e) { types[e.type] = 1; });
      foe = Object.keys(types).join(',');
      const badFoe = Object.keys(types).filter(function (k) { return roster.indexOf(k) < 0; });
      if (!arena && badFoe.length) err = '怪不屬於本章：' + badFoe.join(',');
      if (!arena && theme !== P.THEMES[th].name) err = '主題錯：' + theme + ' 應為 ' + P.THEMES[th].name;
      if (arena && G.bossArena.chapter !== th + 1) err = '決戰場章節錯：' + G.bossArena.chapter;
      if (!arena && G.mapInfo && G.mapInfo.idx !== P.mapIdxOfStage(st)) err = '地圖索引錯';
    } catch (e) { err = e.message; }
    if (err) bad++;
    lines.push(st + '\t' + (th + 1) + '-' + (sb + 1) + '\t' + theme + '\t' + mapN + '\t' + size +
      '\t' + (arena ? '👑決戰場' : foe) + '\t' + (err ? '❌ ' + err : '✅'));
  }
}
console.log('關\t章-小關\t主題\t地圖\t尺寸\t怪物\t結果');
console.log(lines.join('\n'));
console.log(bad ? ('\n有 ' + bad + ' 關不一致') : '\n全部 40 關的主題／地圖／怪物都對得上');
