// test/verify-v539.js —— v5.39：RPG 選關整章錯位（40 關制）＋ 空投寶箱貼圖
//   ① RPG「章節 × 小關」→ 關號／地圖／主題／怪物名單 40 關全部對得上
//   ② 大逃殺亂入王：8 隻王一人一區（blk × BOSS_SLOT）
//   ③ 32 關遺留清乾淨（解鎖數／等級上限／進度／圖鑑／全破門檻）
//   ④ 每日挑戰與每週榜只抽一般關卡（跳過 BOSS 決戰場）
//   ⑤ 空投寶箱貼圖：檔案存在、在預熱清單、有載入守衛與退回程序繪製
//   ⑥ 版本戳記
const SB = require('./_sandbox');
const fs = require('fs'), path = require('path');
const env = SB.makeEnv();
const P = env.BH, G = env.G;
const src = SB.rawHtml;
try { P.WeekMod.pin([]); } catch (e) {}

let pass = 0, fail = 0;
function ok(c, m, extra) {
  if (c) { pass++; console.log('  ✓ ' + m); }
  else { fail++; console.log('  ✗ FAIL: ' + m + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }

/* ================================================================ ① */
head('① RPG 選關 → 關號／地圖／主題／怪物（40 關）');
{
  ok(P.BOSS_SLOT === 5 && P.SOLO_STAGES === 40, 'BOSS_SLOT = 5、SOLO_STAGES = 40');

  // 選單與出發用的是同一個算式，才不會「畫的和進去的不是同一關」
  const sel = /const st = RPG\.theme \* BOSS_SLOT \+ i \+ 1;/.test(src);
  const go = (src.match(/const st = RPG\.theme \* BOSS_SLOT \+ RPG\.sub \+ 1;/g) || []).length;
  ok(sel, '選單用 theme × BOSS_SLOT 算關號');
  ok(go === 2, '出發／營地也用同一個算式（' + go + ' 處）');
  ok(!/RPG\.theme \* 4 \+ RPG\.sub/.test(src), '已無 theme × 4 的舊算式');

  const bad = [];
  for (let th = 0; th < 8; th++) {
    for (let sb = 0; sb < 5; sb++) {
      const st = th * P.BOSS_SLOT + sb + 1;
      try {
        P.startRpg(st, {});
      } catch (e) { bad.push(st + ' 進不去：' + e.message); continue; }
      const arena = !!G.bossArena;
      if (sb === 4) {
        if (!arena) bad.push(st + ' 應為 BOSS 決戰場');
        else if (G.bossArena.chapter !== th + 1) bad.push(st + ' 決戰場章節 ' + G.bossArena.chapter);
        continue;
      }
      if (arena) { bad.push(st + ' 不該是決戰場'); continue; }
      if (!G.theme || G.theme.name !== P.THEMES[th].name) bad.push(st + ' 主題 ' + (G.theme && G.theme.name));
      if (!G.mapInfo || G.mapInfo.idx !== P.mapIdxOfStage(st)) bad.push(st + ' 地圖索引不符');
      const roster = P.stageRoster(st) || [];
      const outside = [];
      (G.enemies || []).forEach(function (e) { if (roster.indexOf(e.type) < 0) outside.push(e.type); });
      if (outside.length) bad.push(st + ' 出現別章的怪：' + outside.join(','));
    }
  }
  ok(bad.length === 0, '40 關逐關實測全部一致' + (bad.length ? '（' + bad.slice(0, 4).join(' / ') + '）' : ''));

  // 具體回歸：沙漠第 1 小關不能再是草原 BOSS 場
  P.startRpg(6, {});
  ok(!G.bossArena && G.theme.name === P.THEMES[1].name, '第 2 章第 1 小關 = 沙漠（不是草原 BOSS 場）');
  P.startRpg(40, {});
  ok(!!G.bossArena && G.bossArena.chapter === 8, '第 40 關 = 第 8 章 BOSS 決戰場');
}

/* ================================================================ ② */
head('② 大逃殺亂入王：一人一區');
{
  ok(/const st = blk \* BOSS_SLOT;/.test(src), '抽王用 blk × BOSS_SLOT');
  const blocks = [];
  for (let blk = 1; blk <= 8; blk++) blocks.push(P.chapterOf(blk * P.BOSS_SLOT));
  ok(blocks.join(',') === '1,2,3,4,5,6,7,8', '八隻王的關號各自落在第 1~8 章（' + blocks.join(',') + '）');
  ok(blocks.every(function (b, i) { return b === i + 1; }), '不會有兩隻王共用同一區');
}

/* ================================================================ ③ */
head('③ 32 關遺留');
{
  ok(/unlocked: SOLO_STAGES/.test(src), 'RPG 預設解鎖 = SOLO_STAGES');
  ok(/Math\.min\(SOLO_STAGES, stage \| 0 \|\| 1\)/.test(src), '怪物等級上限 = SOLO_STAGES');
  ok(/Math\.min\(SOLO_STAGES, c\)/.test(src), '冒險進度計數上限 = SOLO_STAGES');
  ok(/cr \+ ' \/ ' \+ SOLO_STAGES/.test(src), '進度文字用 SOLO_STAGES');
  ok(/k < BOSS_SLOT; k\+\+\) h \+= '<i class="' \+ \(g \* BOSS_SLOT \+ k \+ 1 <= cr/.test(src), '進度格 8 × 5');
  ok(/>= i \* BOSS_SLOT/.test(src), '圖鑑魔王解鎖線 = i × BOSS_SLOT');
  ok(/if \(cleared >= SOLO_STAGES\) \{ try \{ RpgUI\.finish\(\); \}/.test(src), '全破門檻 = SOLO_STAGES');
  ok(src.indexOf('\u55ae\u4eba 40 \u95dc') >= 0, '冒險模式按鈕寫「單人 40 關」');
  ok(src.indexOf('\uff0840 \u95dc\uff09') >= 0, '單人闖關按鈕寫「（40 關）」');
  ok(!/^\s*unlocked: 32/m.test(src), '沒有殘留 unlocked: 32');
}

/* ================================================================ ④ */
head('④ 每日／每週只抽一般關卡');
{
  ok(/function normalStageOf\(k\)/.test(src), '有 normalStageOf（0~31 → 非 BOSS 關號）');
  ok(/function dailyStageOf\(seed\) \{ return normalStageOf/.test(src), '每日挑戰走 normalStageOf');
  ok(/return normalStageOf\(\(\(h >>> 0\) >>> 9\)\);/.test(src), '每週榜也走 normalStageOf');
  let allNormal = true, seen = {}, dup = false;
  for (let d = 1; d <= 28; d++) {
    const key = '2026-11-' + (d < 10 ? '0' + d : d);
    const st = P.dailyStageOf(P.dailySeedOf(key));
    if (!(st >= 1 && st <= 40) || P.isBossStage(st)) allNormal = false;
    if (seen[st]) dup = true;
    seen[st] = 1;
  }
  ok(allNormal, '28 天的每日關卡全部是一般關卡（1~40、非 5 的倍數）');
  ok(Object.keys(seen).length >= 10, '一個月內分布到 ' + Object.keys(seen).length + ' 個不同關卡');
}

/* ================================================================ ⑤ */
head('⑤ 空投寶箱貼圖');
{
  const ROOT = path.join(__dirname, '..');
  const f = path.join(ROOT, 'spr', 'drop-art-chest.webp');
  ok(fs.existsSync(f), 'spr/drop-art-chest.webp 存在');
  const b = fs.existsSync(f) ? fs.readFileSync(f) : Buffer.alloc(0);
  ok(b.slice(8, 12).toString() === 'WEBP', '是合法 WEBP');
  ok(b.length > 6000 && b.length < 90000, '檔案大小 ' + Math.round(b.length / 1024) + ' KB（合理範圍）');
  const list = JSON.parse(fs.readFileSync(path.join(ROOT, 'spr', '_list.json'), 'utf8'));
  ok(list.indexOf('drop-art-chest.webp') >= 0, '在 spr/_list.json 預熱清單裡');
  ok(P.DROP_ART && P.DROP_ART.u === 'spr/drop-art-chest.webp', '主檔有 DROP_ART 設定');
  ok(Math.abs(P.DROP_ART.asp - 240 / 228) < 0.001, 'asp 與圖片比例一致（' + P.DROP_ART.asp.toFixed(4) + '）');
  ok(typeof P.DropArt.get === 'function' && P.DropArt.get() === null, '未載入時 get() 回 null（不會破圖）');
  ok(/DropArt\.load\(\);/.test(src), '啟動時會載入寶箱貼圖');
  ok(/const _img = \(typeof DropArt !== 'undefined'\) \? DropArt\.get\(\) : null;/.test(src), 'brDropBoxArt 會先試貼圖');
  ok(/if \(_img\) \{/.test(src), '有貼圖就走貼圖分支');
  ok(/ctx\.drawImage\(_img, -DW \/ 2, -DH \/ 2, DW, DH\);/.test(src), '貼圖依 asp 等比繪製');
  // 沒圖時（沙盒）不能丟錯 —— 兩條分支都要活著
  let noThrow = true;
  try {
    G.T = 32; G.gameT = 1.2;
    P.brDropBoxArt(100, 100, 32, 1, 0);      // 貼圖缺席 → 走原本的程序繪製
    P.brDropBoxArt(100, 100, 32, .9, .8);    // glow 分支
  } catch (e) { noThrow = false; }
  ok(noThrow, '貼圖缺席時退回程序繪製且不丟錯');
}

/* ================================================================ ⑥ */
head('⑥ 版本');
{
  // v5.40：不寫死版號（後續版本沿用這支）—— 只驗「≥ 5.39」與四處戳記同步
  ok(parseFloat(P.VERSION) >= 5.39, 'VERSION ≥ 5.39（實際 ' + P.VERSION + '）');
  ok(src.indexOf('id="verTxt">' + P.VERSION + '<') >= 0, '#verTxt 顯示 ' + P.VERSION);
  ok(src.indexOf('id="verLogVer">' + P.VERSION + '<') >= 0, '#verLogVer 顯示 ' + P.VERSION);
  ok(P.VERSION_LOG[0].v === P.VERSION && P.VERSION_LOG[0].now === true, '版本紀錄首位＝' + P.VERSION + '（now）');
  ok(P.VERSION_LOG[1] && P.VERSION_LOG[1].now === false, '上一版 ' + (P.VERSION_LOG[1] || {}).v + ' 已標成非 now');
  const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  const swm = /SW_VERSION = 'v([0-9.]+)'/.exec(sw);
  ok(swm && parseFloat(swm[1]) >= 5.39, 'sw.js SW_VERSION ≥ v5.39（' + (swm ? swm[1] : '?') + '）');
}

console.log('\n' + (fail ? '❌' : '✅') + ' v5.39：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
