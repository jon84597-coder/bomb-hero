// test/verify-v586.js —— v5.85：音效六格可聽半徑
//   ① 常數：SND_RADIUS_CELLS = 6（歐氏距離，不是格數相加）
//   ② 閘門：有座標 → 超出 6 格整支不播；沒有座標 → 照舊播
//   ③ 全場廣播：click／縮圈／核彈警報／勝負 不受距離限制
//   ④ 接線：炸彈（爆點）／小怪（牠的位置）／大逃殺每人／對戰 AI 玩家
//   ⑤ 還原：sndScope 結束後 emitter 要回到前一層（不能殘留）
//   ⑥ 去重：同一幀十幾顆連鎖炸彈只留第一顆
const fs = require('fs');
const path = require('path');
const { makeEnv } = require('./_sandbox');

const ROOT = path.join(__dirname, '..');
const mainJs = fs.readFileSync(path.join(ROOT, 'js/main.js'), 'utf8');

let pass = 0, fail = 0;
function ok(c, m, x) {
  if (c) { pass++; console.log('  ✓ ' + m + (x === undefined ? '' : ' → ' + JSON.stringify(x))); }
  else { fail++; console.log('  ✗ FAIL: ' + m + (x === undefined ? '' : ' → ' + JSON.stringify(x))); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }

const env = makeEnv();
const P = env.BH;
const G = P.Game;
const A = P.AudioSys;
const T = 40;

G.state = 'play';
G.T = T;
G.gameT = 1;
G.rings = []; G.bits = []; G.particles = []; G.pops = [];
G.stopT = 0; G.shake = 0; G.flash = 0;
G.enemies = []; G.bombs = []; G.items = [];

// 本地玩家固定在 (第 10 格, 第 10 格)
const me = { x: 10.5 * T, y: 10.5 * T, alive: true, ch: { color: '#8fd0ff' } };
G.players = [me];

/* ================================================================ */
head('1. 六格半徑的定義');
{
  ok(A.SND_RADIUS_CELLS === 6, '★ 可聽半徑 = 6 格', A.SND_RADIUS_CELLS);
  ok(/const SND_RADIUS_CELLS = 6;/.test(mainJs), '原始碼也是 6（不是靠外部設定）');
  ok(P.SND_RADIUS_CELLS === 6, '__BH 有匯出（測試／除錯用）', P.SND_RADIUS_CELLS);

  // 同一格、3 格、5.9 格 → 聽得到
  ok(A.sndHearable(me.x, me.y), '同一格 → 聽得到');
  ok(A.sndHearable(me.x + 3 * T, me.y), '正右 3 格 → 聽得到');
  ok(A.sndHearable(me.x, me.y - 5.9 * T), '正上 5.9 格 → 聽得到');
  // 6.1 格、對角 4.3 格 → 超出
  ok(!A.sndHearable(me.x + 6.1 * T, me.y), '★ 正右 6.1 格 → 聽不到');
  ok(!A.sndHearable(me.x, me.y + 7 * T), '★ 正下 7 格 → 聽不到');
  // 歐氏距離：4.3+4.3 = 8.6 格（曼哈頓），但直線只有 6.08 格 → 仍然聽不到
  ok(!A.sndHearable(me.x + 4.3 * T, me.y + 4.3 * T), '★ 斜角 4.3／4.3（直線 6.08 格）→ 聽不到');
  ok(A.sndHearable(me.x + 4 * T, me.y + 4 * T), '斜角 4／4（直線 5.66 格）→ 聽得到');

  // 半徑可以臨時指定（給未來的「靜音潛行」之類留接口）
  ok(A.sndHearable(me.x + 3 * T, me.y, 2) === false, '可傳入自訂半徑（2 格）→ 3 格處聽不到');
}

/* ================================================================ */
head('2. 閘門：遠處的音效整支不播');
{
  A.sndReset();
  A.sfx('explode', me.x + 20 * T, me.y);          // 20 格外
  let st = A.sndStats();
  ok(st.dropped === 1 && st.played === 0, '★ 20 格外的爆炸：0 次播放、1 次攔掉', st);
  ok(st.lastDrop === 'explode', '攔掉的是 explode', st.lastDrop);

  A.sndReset();
  A.sfx('explode', me.x + 2 * T, me.y);           // 2 格外
  st = A.sndStats();
  ok(st.played === 1 && st.dropped === 0, '★ 2 格外的爆炸：正常播放', st);

  // 沒有座標（介面／自己身上的動作）→ 照播
  A.sndReset();
  A.sfx('hurt');
  ok(A.sndStats().played === 1, '沒有座標的音效照樣播（不受距離影響）', A.sndStats().played);

  // 全場廣播
  A.sndReset();
  A.sfx('click', me.x + 40 * T, me.y);
  A.sfx('victory', me.x + 40 * T, me.y);
  A.sfx('nukeAlarm', me.x + 40 * T, me.y);
  A.sfx('sd', me.x + 40 * T, me.y);
  st = A.sndStats();
  ok(st.played === 4 && st.dropped === 0, '★ 介面／勝負／縮圈／核彈警報是「全場廣播」→ 不擋', st);

  // 關掉音效時完全不計數（維持原有開關語意）
  A.sndReset();
  const old = P.settings.sfx;
  P.settings.sfx = 0;
  A.sfx('explode', me.x, me.y);
  P.settings.sfx = old;
  st = A.sndStats();
  ok(st.played === 0 && st.dropped === 0, '設定關掉音效時：不播也不計入攔截數', st);
}

/* ================================================================ */
head('3. 發聲源標記（sndSet / sndScope）');
{
  A.sndReset();
  A.sndSet(me.x + 30 * T, me.y);      // 標記一個很遠的發聲者
  A.sfx('place');
  ok(A.sndStats().dropped === 1, '★ 有標記發聲者時，沒帶座標的呼叫也會被擋', A.sndStats());

  A.sndSet(null);
  A.sndReset();
  A.sfx('place');
  ok(A.sndStats().played === 1, '清掉標記後恢復正常', A.sndStats().played);

  // sndScope 會還原上一層
  A.sndReset();
  A.sndSet(me.x + 1 * T, me.y);                       // 外層：近
  A.sndScope(me.x + 30 * T, me.y, function () {        // 內層：遠
    A.sfx('hurt');
  });
  A.sfx('hurt');                                      // 回到外層（近）→ 應該播
  const st = A.sndStats();
  ok(st.dropped === 1 && st.played === 1, '★ sndScope 結束後 emitter 還原成外層', st);

  // 內層丟例外也要還原
  A.sndReset();
  A.sndSet(me.x + 1 * T, me.y);
  try { A.sndScope(me.x + 30 * T, me.y, function () { throw new Error('x'); }); } catch (e) {}
  A.sfx('hurt');
  ok(A.sndStats().played === 1, '★ 內層拋例外，emitter 仍然還原（finally）', A.sndStats().played);
}

/* ================================================================ */
head('4. 同一幀的重複音去重（連鎖炸彈）');
{
  A.sndReset();
  A.sndSet(null);
  A.sfx('explode', me.x + T, me.y);
  A.sfx('explode', me.x + 2 * T, me.y);     // 立刻再一顆 → 被去重
  const st = A.sndStats();
  ok(st.played === 1 && st.dropped === 1, '★ 18ms 內的第二顆爆炸只留第一顆', st);
  ok(/const SND_GAP = \{ explode: \.018, hurt: \.018, die: \.022 \};/.test(mainJs),
    '去重只套在 explode／hurt／die 三支高頻音');
}

/* ================================================================ */
head('5. 接線：炸彈／小怪／大逃殺／對戰');
{
  ok(/function explodeBombRaw\(b\) \{/.test(mainJs), '★ 炸彈爆炸本體改名 explodeBombRaw');
  ok(/AudioSys\.sndScope\(\(b\.cx \+ \.5\) \* _sT, \(b\.cy \+ \.5\) \* _sT/.test(mainJs),
    '★ explodeBomb 用「爆點」當發聲座標');

  ok(/function updateEnemyRaw\(e, dt\) \{/.test(mainJs), '★ 小怪更新本體改名 updateEnemyRaw');
  ok(/const _sndSv = AudioSys\.sndSave\(\);\s*\n\s*AudioSys\.sndSet\(e \? e\.x : null, e \? e\.y : null\);/.test(mainJs),
    '★ updateEnemy 以「這隻怪」的座標標記發聲源');
  ok(/finally \{ AudioSys\.sndRestore\(_sndSv\); \}/.test(mainJs),
    '★ 更新結束（含例外）一定還原前一層發聲源');

  const setN = (mainJs.match(/AudioSys\.sndSet\(p\.x, p\.y\);/g) || []).length;
  ok(setN >= 2, '★ 大逃殺與對戰的「每個玩家」都各自標記座標', setN);
  const clrN = (mainJs.match(/AudioSys\.sndSet\(null\);/g) || []).length;
  ok(clrN >= 2, '離開玩家迴圈要清掉標記（不然後面的音效會誤判）', clrN);

  // 有明確座標的個別音效
  ok(/AudioSys\.sfx\('coin', p\.x, p\.y\)/.test(mainJs), '金幣聲跟著收金幣的人');
  ok(/AudioSys\.sfx\('item', p\.x, p\.y\)/.test(mainJs), '撿道具聲跟著撿的人');
  ok(/AudioSys\.sfx\('item', \(x \+ \.5\) \* T, \(y \+ \.5\) \* T\)/.test(mainJs), '恐龍蛋冒出的聲音跟著那一格');
  ok(/AudioSys\.sfx\('die', p\.x, p\.y\)/.test(mainJs), '英雄倒下的聲音跟著倒下的那個人');
}

/* ================================================================ */
head('6. 實際炸一顆：遠的近的各一次');
{
  try {
    P.WeekMod.pin([]);
    P.startSolo(3, false, false);
    G.state = 'play';
    G.enemies.length = 0;
    const TT = G.T;
    const p0 = G.players[0];
    p0.x = 1.5 * TT; p0.y = 1.5 * TT;
    const mkBomb = function (cx, cy) {
      return { cx: cx, cy: cy, px: (cx + .5) * TT, py: (cy + .5) * TT,
               power: 1, owner: p0, passers: [], held: false, age: 2, timer: 0, seed: 1 };
    };
    // 遠：離玩家 16 格
    A.sndReset();
    P.explodeBomb(mkBomb(16, 12));
    let st = A.sndStats();
    ok(st.dropped >= 1 && st.lastDrop === 'explode', '★ 16 格外的炸彈真的爆了，但聲音被擋掉', st);

    // 近：貼在旁邊
    A.sndReset();
    P.explodeBomb(mkBomb(2, 1));
    st = A.sndStats();
    ok(st.played >= 1 && st.dropped === 0, '★ 旁邊那顆正常播（打擊感不能消失）', st);
  } catch (e) {
    ok(false, '實測拋錯：' + e.message);
  }
}

/* ================================================================ */
head('7. 音效總表沒有被動到');
{
  ok(P.sfxKeys().length === 84, '音效表仍是 84 支（這一版只改「播不播」，不是改音色）', P.sfxKeys().length);
  const all = P.sfxKeys();
  let threw = 0;
  all.forEach(function (k) { try { A.sfx(k, me.x, me.y); } catch (e) { threw++; } });
  ok(threw === 0, '84 支在近距離逐支播放，一支都沒拋錯', threw);
}

console.log('\n結果：' + pass + ' 通過 / ' + (pass + fail) + ' 項' + (fail ? '（' + fail + ' 失敗）' : ''));
process.exit(fail ? 1 : 0);
