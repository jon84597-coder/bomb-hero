/* 檢查 RPG 選關（章節 × 小關）實際會進到哪一關 */
const SB = require('./_sandbox');
const env = SB.makeEnv();
const P = env.BH;
try { P.WeekMod.pin([]); } catch (e) {}

const themeName = (i) => { try { return P.themeName(i); } catch (e) { return 'T' + (i + 1); } };
const mapName = (m) => { try { return P.mapName(m); } catch (e) { return m && m.n; } };

console.log('章節\t小關\t舊算式(×4)\t\t\t新算式(×5)');
for (let th = 0; th < 8; th++) {
  for (let sb = 0; sb < 5; sb++) {
    const oldSt = th * 4 + sb + 1;
    const newSt = th * 5 + sb + 1;
    const fmt = (st) => {
      const info = P.soloInfo(st);
      const boss = !!info.boss;
      return '#' + st + ' ' + (boss ? '👑 BOSS' : mapName(info)) + ' [T' + (info.theme + 1) + ']';
    };
    console.log(themeName(th) + '\t' + (sb + 1) + '\t' + fmt(oldSt) + '\t' + fmt(newSt));
  }
}
console.log('\n--- 舊算式下「沙漠」章節按鈕 ---');
for (let sb = 0; sb < 5; sb++) {
  const st = 1 * 4 + sb + 1;
  const info = P.soloInfo(st);
  console.log('  ' + (sb + 1) + '. #' + st + ' → ' + (info.boss ? '👑 BOSS 決戰場（草原）' : mapName(info) + '（主題 ' + (info.theme + 1) + '）'));
}
