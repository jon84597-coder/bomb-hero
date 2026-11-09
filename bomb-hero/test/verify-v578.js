// test/verify-v578.js —— v5.77（回報：新手教學播到深淵曲）
//   ① BGM 不變量：深淵曲只有在「真的在深淵」（Game.abyss／abyssNext）時才播得出來
//   ② 新手教學的實戰地圖直接指定 'stage1'，不再問 stageBGM（旗標殘留也不會算錯）
//   ③ 教學首頁那幾步在大廳上走 → 一律菜單曲
//   ④ 教學仍然會清掉深淵／決戰場／限制挑戰旗標
//   ⑤ 深淵本身照常播深淵曲（不能被擋過頭）
//   ⑥ 版本 5.77 七處一致
const fs = require('fs');
const path = require('path');
const { makeEnv } = require('./_sandbox');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const mainJs = read('js/main.js');
const idx = read('index.html');

let pass = 0, fail = 0;
function ok(c, m, x) {
  if (c) { pass++; console.log('  ✓ ' + m + (x === undefined ? '' : ' → ' + JSON.stringify(x))); }
  else { fail++; console.log('  ✗ FAIL: ' + m + (x === undefined ? '' : ' → ' + JSON.stringify(x))); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }

// ================================================================
head('1. BGM 不變量：深淵曲只在深淵裡播得出來');
{
  const env = makeEnv();
  const P = env.BH, A = P.AudioSys, G = P.Game;
  ok(typeof A.lastBGM === 'function', '有 lastBGM() 可以看路由結果');

  G.abyss = null; G.abyssNext = null; G.bossArena = null;
  A.startBGM('abyssWar');
  ok(A.lastBGM() === 'stage1', '沒有深淵狀態 → "abyssWar" 被導回第 1 章曲', A.lastBGM());

  G.stage = 12;
  A.startBGM('abyssWar');
  ok(A.lastBGM() === 'stage3', '在別的章節也會導回該章曲（第 12 關 → stage3）', A.lastBGM());

  G.abyss = { layer: 4, perks: [], startAt: Date.now() };
  A.startBGM('abyssWar');
  ok(A.lastBGM() === 'abyssWar', '真的在深淵 → 深淵曲照播（沒被擋過頭）', A.lastBGM());

  /* abyssNext：Abyss.start 進場時會先把狀態放這裡，startSolo 才釘回 Game.abyss */
  G.abyss = null; G.abyssNext = { layer: 5, perks: [], startAt: Date.now() };
  A.startBGM('abyssWar');
  ok(A.lastBGM() === 'abyssWar', '只有 abyssNext（進場那一刻）也允許播深淵曲', A.lastBGM());

  G.abyss = null; G.abyssNext = null;
  A.startBGM('stage5');
  ok(A.lastBGM() === 'stage5', '一般章節曲不受影響', A.lastBGM());
}

head('2. 新手教學：實戰地圖直接指定 stage1');
{
  ok(/try \{ AudioSys\.startBGM\('stage1'\); \} catch \(e\) \{\}/.test(mainJs),
    '教學實戰用 startBGM(\'stage1\') 而不是 stageBGM(1)');
  const at = mainJs.indexOf("try { AudioSys.startBGM('stage1'); } catch (e) {}");
  const seg = mainJs.slice(Math.max(0, at - 700), at);
  ok(/leaveSpecialRun\(\)/.test(seg), '播之前再清一次特殊一輪（雙保險）');
  ok(/showPlay\(0\)/.test(seg), '位置在 showPlay(0) 之後（畫面與音樂同時到位）');
  /* 不再有「教學 → stageBGM(1)」這種會被旗標影響的寫法 */
  ok(!/startBGM\(stageBGM\(1\)\)/.test(mainJs), '全檔已無 startBGM(stageBGM(1))');
}

head('3. 教學首頁那幾步＝大廳 → 菜單曲');
{
  const at = mainJs.indexOf('function startHome()');
  const seg = mainJs.slice(at, at + 900);
  ok(/AudioSys\.startBGM\('menu'\)/.test(seg), 'startHome 會把 BGM 換成 menu');
  ok(/lastBGM\(\) !== 'menu'/.test(seg), '已經在播菜單曲就不重來（不會每步重播）');
}

head('4. 教學仍然清掉特殊一輪的旗標');
{
  const at = mainJs.indexOf("'新手教學'");
  const seg = mainJs.slice(Math.max(0, at - 1200), at + 900);
  ok(/leaveSpecialRun\(\)/.test(seg), '教學地圖建立時呼叫 leaveSpecialRun()');
  ok(/Game\.mode = 'solo'/.test(seg), '教學是 solo 模式（不套決戰場／深淵曲）');
}

head('5. 深淵入口的路由沒被改壞');
{
  const at = mainJs.indexOf('function start(n) {', mainJs.indexOf('const Abyss = '));
  const seg = mainJs.slice(at, at + 1400);
  ok(/Game\.abyssNext = info/.test(seg), 'Abyss.start 先放 abyssNext');
  ok(/Game\.abyss = info/.test(seg), 'startSolo 之後再釘回 Game.abyss');
}

head('6. 版本 5.77 七處一致');
{
  const ver = mainJs.match(/const VERSION = '([\d.]+)'/);
  ok(ver && parseFloat(ver[1]) >= 5.77, 'VERSION >= 5.77', ver && ver[1]);
  const V = ver ? ver[1] : '0';
  const esc = V.replace(/\./g, '\\.');
  ok(new RegExp('id="verTxt"[^>]*>' + esc + '<').test(idx), 'index.html verTxt = ' + V);
  ok(new RegExp('id="verLogVer"[^>]*>' + esc + '<').test(idx), 'index.html 版本面板 = ' + V);
  const vlog = read('js/version-log.js');
  ok(/\{ v: '5\.77'/.test(vlog), 'VERSION_LOG 有 5.77');
  ok(/\{ v: '5\.76',[^}]*now: false/.test(vlog), '5.76 收成 now:false');
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, '..', 'package.json'), 'utf8'));
  ok(parseFloat(pkg.version) >= 5.77, 'package.json >= 5.77', pkg.version);
  [path.join(ROOT, 'sw.js'), path.join(ROOT, '..', 'public', 'sw.js'),
    path.join(ROOT, '..', 'bomberman-online', 'public', 'sw.js')].forEach(function (f) {
      if (!fs.existsSync(f)) return;
      const m = fs.readFileSync(f, 'utf8').match(/SW_VERSION = 'v([\d.]+)'/);
      ok(m && parseFloat(m[1]) >= 5.77, path.relative(path.join(ROOT, '..'), f) + ' → v' + (m && m[1]));
    });
}

console.log('\n' + (fail === 0 ? '✅' : '❌') + ' ' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail === 0 ? 0 : 1);
