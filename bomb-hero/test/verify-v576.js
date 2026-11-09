// test/verify-v576.js —— v5.75
//   ① 深淵曲重做：23 句、五段起伏、每軌等長、長度 4~9 分鐘
//   ② 段落動態（dyn）真的生效：F 句抽掉 arp 與 power、D 句抽掉 power（留洞）、E 句 arp 高八度
//   ③ dyn 是「額外」的：其他四首戰鬥曲一個音都沒變（沒有整句靜音）
//   ④ 深淵 BGM 路由修正：Game.abyssNext 讓 startSolo 算 BGM 之前就釘回狀態
//   ⑤ 打過深淵之後，教學／RPG／對戰／大逃殺都不會再播深淵曲（leaveSpecialRun）
//   ⑥ 版本 5.75 七處一致
const fs = require('fs');
const path = require('path');
const { makeEnv } = require('./_sandbox');

const env = makeEnv();
const P = env.BH, G = P.Game, A = P.AudioSys;
const src = env.html.replace(/\r/g, '');
const mainJs = fs.readFileSync(path.join(__dirname, '..', 'js', 'main.js'), 'utf8');

let pass = 0, fail = 0;
function ok(c, m, x) {
  if (c) { pass++; console.log('  ✓ ' + m + (x === undefined ? '' : ' → ' + JSON.stringify(x))); }
  else { fail++; console.log('  ✗ FAIL: ' + m + (x === undefined ? '' : ' → ' + JSON.stringify(x))); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }
const unitsOf = s => s.tracks.map(t => t.seq.reduce((n, x) => n + x.len, 0));

/* 每句的「織體」統計：arp 有聲數 / pow 有聲數 / arp 第一個音高 */
function phraseStats(song, nPh, per) {
  const arp = song.tracks.find(t => t.wave === 'square');
  const pow = song.tracks[song.tracks.length - 1];
  const out = [];
  for (let i = 0; i < nPh; i++) {
    const a0 = i * per, a1 = a0 + per;
    let aNote = 0, aFirst = null, pos = 0, aSum = 0;
    arp.seq.forEach(e => {
      if (pos >= a0 && pos < a1 && e.midi !== null) { aNote++; aSum += e.midi; if (aFirst === null) aFirst = e.midi; }
      pos += e.len;
    });
    let pNote = 0;
    pos = 0;
    pow.seq.forEach(e => { if (pos >= a0 && pos < a1 && e.midi !== null) pNote++; pos += e.len; });
    out.push({ a: aNote, p: pNote, m: aFirst, avg: aNote ? aSum / aNote : 0 });
  }
  return out;
}

// ================================================================
head('1. 深淵曲：結構與長度');
{
  const def = A.WAR_DEFS.abyssWar;
  ok(!!def, 'WAR_DEFS 有 abyssWar');
  ok(def.plan.length === 23, '23 句（原本 16 句，且織體全同）', def.plan.length);
  ok(def.bpm >= 84 && def.bpm <= 100, 'BPM ' + def.bpm + '（慢、心跳感）');
  ok(!!def.dyn && Object.keys(def.dyn).length >= 6, '有段落動態表（dyn）', def.dyn && Object.keys(def.dyn));
  const s = A.compileWar('abyssWar');
  const u = unitsOf(s);
  ok(u.every(x => x === u[0]), '六軌等長 → 循環接回不會走音', u[0]);
  const sec = A.songSeconds('abyssWar');
  ok(sec >= 240 && sec <= 540, '長度 ' + sec.toFixed(0) + ' 秒（4~9 分鐘，深淵一輪聽得完）');
}

head('2. 段落動態真的生效');
{
  const def = A.WAR_DEFS.abyssWar;
  const s = A.compileWar('abyssWar');
  const st = phraseStats(s, def.plan.length, 128);   // 每句 8 小節 × 16 單位
  const at = k => st[def.plan.indexOf(k)];

  const F = st[0];   // 第 1 句就是 F（序）
  ok(F.a === 0 && F.p === 0, '序（F 句）抽掉 arp 與 power → 只剩心跳鼓與低音', F);
  ok(st.filter(x => x.a === 0 && x.p === 0).length >= 3, '至少三句是「極簡」的（有留白才聽得出起伏）');
  const E0 = at('E'), C0 = at('C'), D0 = at('D');
  ok(E0.a > 0 && C0.a > 0, 'C／E 句 arp 都有聲', { C: C0.a, E: E0.a });
  /* 直接比第一個音不準（兩句的和弦不同）→ 比整句平均音高：高潮段應該明顯更高 */
  const avg = st0 => { const v = st[def.plan.indexOf(st0)]; return v.avg; };
  ok(avg('E') - avg('C') >= 8, 'E 句（高潮）arp 整句平均比 C 句高 ≥ 8 半音（實作是 +12 八度）',
     { C: Math.round(avg('C')), E: Math.round(avg('E')) });
  ok(D0.p === 0, 'D 句（過門）抽掉 power chord → 留一個洞給下一段', D0.p);
  ok(at('A').p > 0 && at('A').a === 0, 'A 句（主體）只有 power、還沒進 arp', at('A'));
  /* 前後半段的織體要不同（不是 16 句一直重複同一坨） */
  const sig = st.map(x => x.a > 0 ? 2 : (x.p > 0 ? 1 : 0)).join('');
  ok(new Set(sig).size >= 3, '整首至少三種織體在輪替（不是一路同一種）', sig);
  ok(sig.indexOf('222') >= 0 && sig.slice(0, 2) === '00',
     '開頭是極簡、中段有連續三句以上的厚織體（有起伏）', sig);
}

head('3. dyn 是額外的：其他曲子一個音都沒變');
{
  ['battle', 'brWar10', 'brWar5', 'bossWar'].forEach(function (nm) {
    const def = A.WAR_DEFS[nm];
    if (!def) return;
    const s = A.compileWar(nm);
    const st = phraseStats(s, def.plan.length, 128);
    const silent = st.filter(x => x.a === 0 && x.p === 0).length;
    ok(silent === 0, nm + '：沒有任何一句被整句消音（沒有 dyn 就走原路徑）', silent);
    const u = unitsOf(s);
    ok(u.every(x => x === u[0]), nm + '：六軌仍然等長', u[0]);
  });
}

head('4. 深淵 BGM 路由：進場那一刻就要對');
{
  /* 這是玩家回報的核心 bug：startSolo 會清 Game.abyss，導致 stageBGM 選成章節曲 */
  P.Game.abyss = null;
  P.Game.abyssNext = { layer: 4, startAt: Date.now(), perks: ['power'] };
  P.startSolo(1);
  ok(!!P.Game.abyss && P.Game.abyss.layer === 4, 'startSolo 會把 abyssNext 釘回 Game.abyss', P.Game.abyss && P.Game.abyss.layer);
  ok(P.Game.abyssNext === null, 'abyssNext 用完就清掉（不會漏到下一局）');
  ok(P.stageBGM(1) === 'abyssWar', '一進深淵，stageBGM 立刻是 abyssWar（不是第 1 關的曲子）', P.stageBGM(1));
  ok(/Game\.abyssNext = info;[\s\S]{0,120}startSolo\(layerStage\(layer\)/.test(mainJs),
     'Abyss.start 在 startSolo 之前就放好 abyssNext（順序不能顛倒）');
}

head('5. 打過深淵之後，其他入口不能再播深淵曲');
{
  /* 模擬：玩過深淵 → 回主選單 → 開別的玩法 */
  P.Game.abyss = { layer: 9, perks: [] };
  ok(P.stageBGM(1) === 'abyssWar', '（前提）旗標還在時確實會播深淵曲');
  P.leaveSpecialRun();
  ok(P.Game.abyss === null, 'leaveSpecialRun() 把深淵旗標清掉');
  ok(P.stageBGM(1) === 'stage1', '清掉之後回到章節曲', P.stageBGM(1));

  const calls = [
    ['新手教學', /Game\.mode = 'solo'; Game\.rpg = false; Game\.bossRush = false;[\s\S]{0,220}leaveSpecialRun\(\);/],
    ['RPG', /function startRpg\(stage, opt\) \{[\s\S]{0,200}leaveSpecialRun\(\);/],
    ['對戰', /function startBattle\(\) \{[\s\S]{0,400}leaveSpecialRun\(\);/],
    ['大逃殺', /function startBR\(\) \{[\s\S]{0,400}leaveSpecialRun\(\);/]
  ];
  calls.forEach(function (c) {
    ok(c[1].test(mainJs), c[0] + '入口會呼叫 leaveSpecialRun()');
  });
  ok(!/Game\.abyss = \{ layer: layer, startAt: at, perks: perks \};/.test(mainJs),
     '舊寫法（startSolo 之後才釘狀態）已經移除');
}

head('6. 版本 5.75 七處');
{
  const ver = mainJs.match(/const VERSION = '([\d.]+)'/);
  ok(ver && ver[1] === '5.75', 'VERSION 5.75', ver && ver[1]);
  const idx = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  ok(/id="verTxt"[^>]*>5\.75</.test(idx), 'index.html verTxt 5.75');
  ok(/id="verLogVer"[^>]*>5\.75</.test(idx), 'index.html 版本面板 5.75');
  const vlog = fs.readFileSync(path.join(__dirname, '..', 'js', 'version-log.js'), 'utf8');
  ok(/\{ v: '5\.75'/.test(vlog), 'VERSION_LOG 有 5.75');
  ok(/\{ v: '5\.74',[^}]*now: false/.test(vlog), '5.74 收成 now:false');
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8'));
  ok(/^5\.75/.test(pkg.version), 'package.json 5.75', pkg.version);
  /* 三份 sw.js：bomb-hero/、根 public/、bomberman-online/public/ */
  const sws = [path.join(__dirname, '..', 'sw.js'),
    path.join(__dirname, '..', '..', 'public', 'sw.js'),
    path.join(__dirname, '..', '..', 'bomberman-online', 'public', 'sw.js')];
  sws.forEach(function (f) {
    if (!fs.existsSync(f)) return;
    const t = fs.readFileSync(f, 'utf8');
    ok(/SW_VERSION = 'v5\.75\.0'/.test(t), f.replace(path.join(__dirname, '..', '..') + path.sep, '') + ' → v5.75.0');
  });
}

console.log('\n' + (fail === 0 ? '✅' : '❌') + ' ' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail === 0 ? 0 : 1);
