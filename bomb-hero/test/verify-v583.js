// test/verify-v583.js —— v5.82：前期小怪不放招（難度階梯）＋第 3 關招式示範
//   ① 第 1~2 關：小怪一隻招式都沒有（連鑽地／吐彈／躲炸彈都關掉，史萊姆也不分裂）
//   ② 第 3 關：剛好 3 隻會出招（吐彈／鑽地／衝撞各一隻），頭上掛 ❗
//   ③ 第 4 關起：照舊全開
//   ④ 只影響單人闖關 —— 對戰／大逃殺／RPG／深淵／魔王連戰／限制挑戰／地圖測試都不變
//   ⑤ 第 3 關的教學（開場卡三條＋倒數後提示卡）五語齊全
//   ⑥ 盤點用的招式名稱（圖鑑）不能被動到
const fs = require('fs');
const path = require('path');
const { makeEnv } = require('./_sandbox');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const mainJs = read('js/main.js');
const idx = read('index.html');
const vlog = read('js/version-log.js');
const i18n = read('js/i18n-src.js');
const pkg = read('../package.json');

let pass = 0, fail = 0;
function ok(c, m, x) {
  if (c) { pass++; console.log('  ✓ ' + m + (x === undefined ? '' : ' → ' + JSON.stringify(x))); }
  else { fail++; console.log('  ✗ FAIL: ' + m + (x === undefined ? '' : ' → ' + JSON.stringify(x))); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }

/* ================================================================ */
head('1. 版本七處一致（>= 5.82）');
{
  const ver = (mainJs.match(/const VERSION = '([\d.]+)'/) || [])[1];
  ok(parseFloat(ver) >= 5.82, '主檔 VERSION >= 5.82', ver);
  ok(/<span id="verTxt">5\.(8[2-9]|9\d)<\/span>/.test(idx), '首頁 verTxt >= 5.82');
  ok(/<span id="verLogVer">5\.(8[2-9]|9\d)<\/span>/.test(idx), '版本面板 verLogVer >= 5.82');
  ok(/"version":\s*"5\.(8[2-9]|9\d)\.0"/.test(pkg), 'package.json >= 5.82.0');
  const sws = ['sw.js', '../public/sw.js', '../bomberman-online/public/sw.js', '../dist/site/sw.js']
    .map(f => { try { return (read(f).match(/SW_VERSION = '(v[\d.]+)'/) || [])[1]; } catch (e) { return null; } })
    .filter(Boolean);
  ok(sws.length >= 3 && sws.every(v => /^v5\.(8[2-9]|9\d)\.0$/.test(v)), '四份 sw.js 都是 >= v5.82.0', sws);
  ok(/v: '5\.(8[2-9]|9\d)'[\s\S]{0,80}now: true/.test(vlog), 'VERSION_LOG[0] 是 5.82+ 且 now:true');
  ok(!/v: '5\.81'[\s\S]{0,60}now: true/.test(vlog), '5.81 已改成 now:false（不會兩條同時亮）');
}

/* ================================================================ */
head('2. 招式階梯的三個判斷');
{
  const env = makeEnv();
  const P = env.BH, G = P.Game;
  ok(typeof P.foeSkillStageMode === 'function', 'fooSkillStageMode 有匯出（測試用）');
  ok(P.foeSkillStageMode(1) === 'none' && P.foeSkillStageMode(2) === 'none', '第 1~2 關 = none', [P.foeSkillStageMode(1), P.foeSkillStageMode(2)]);
  ok(P.foeSkillStageMode(3) === 'demo', '第 3 關 = demo（示範關）');
  ok(P.foeSkillStageMode(4) === 'all' && P.foeSkillStageMode(40) === 'all', '第 4 關之後 = all', [P.foeSkillStageMode(4), P.foeSkillStageMode(40)]);
  ok(JSON.stringify(P.FOE_SKILL_DEMO_TYPES) === '["frog","cater","bunny"]', '示範三隻是吐彈／鑽地／衝撞', P.FOE_SKILL_DEMO_TYPES);
  ok(P.FOE_SKILL_DEMO_MAX === 3, '示範關最多 3 隻會出招', P.FOE_SKILL_DEMO_MAX);

  G.mode = 'solo'; G.stage = 1;
  ok(P.foeSkillOn('frog') === false, '第 1 關：青蛙也不給吐彈');
  G.stage = 3;
  ok(P.foeSkillOn('frog') === true, '第 3 關：青蛙（示範名單）可以吐彈');
  ok(P.foeSkillOn('slime') === false, '第 3 關：史萊姆不在示範名單 → 沒有招式');
  G.stage = 4;
  ok(P.foeSkillOn('slime') === true, '第 4 關：全部開放');
  G.stage = 1; G.mode = 'battle';
  ok(P.foeSkillOn('frog') === true, '對戰模式不受限（第 1 關照樣會吐彈）');
  G.mode = 'br';
  ok(P.foeSkillOn('frog') === true, '大逃殺不受限');
  G.mode = 'solo'; G.bossRush = true; G.stage = 1;
  ok(P.foeSkillOn('frog') === true, '魔王連戰不受限');
  G.bossRush = false; G.abyss = { layer: 2 }; G.stage = 2;
  ok(P.foeSkillOn('frog') === true, '深淵不受限');
  G.abyss = null; G.wchal = {}; G.stage = 1;
  ok(P.foeSkillOn('frog') === true, '限制挑戰不受限');
  G.wchal = null; G.mapTest = { cols: 18, rows: 16, foes: 6 };
  ok(P.foeSkillOn('frog') === true, '地圖測試關不受限');
  G.mapTest = null;
}

/* ================================================================ */
head('3. 真的進關卡：每一關的小怪招式數');
{
  function spawn(stage, opt) {
    const env = makeEnv();
    const P = env.BH, G = P.Game;
    try { P.WeekMod.pin([]); } catch (e) {}
    if (opt && opt.diff) P.settings.soloDiff = opt.diff;
    try { P.startSolo(stage, false, false); } catch (e) { return { err: String(e) }; }
    const es = G.enemies.filter(function (e) { return e && !e.boss; });
    return {
      n: es.length,
      skill: es.filter(function (e) { return !!e.skill; }),
      smart: es.filter(function (e) { return !!e.smart; }),
      demo: es.filter(function (e) { return !!e.demoSkill; }),
      stage: G.stage
    };
  }

  const s1 = spawn(1);
  ok(!s1.err && s1.n >= 2, '第 1 關生得出來', s1.err || s1.n);
  ok(s1.skill.length === 0, '★ 第 1 關：0 隻會出招', s1.skill.map(e => e.type));
  ok(s1.smart.length === 0, '★ 第 1 關：也沒有「會躲炸彈」的（鐵甲蟲）');

  const s2 = spawn(2);
  ok(s2.n >= 2, '第 2 關生得出來', s2.n);
  ok(s2.skill.length === 0, '★ 第 2 關：0 隻會出招', s2.skill.map(e => e.type));
  ok(s2.smart.length === 0, '★ 第 2 關：也沒有躲炸彈');

  const s3 = spawn(3);
  ok(s3.n >= 4, '第 3 關生得出來', s3.n);
  ok(s3.skill.length === 3, '★ 第 3 關：剛好 3 隻會出招', s3.skill.map(e => e.type + '/' + e.skill));
  ok(s3.demo.length === 3, '★ 這 3 隻都有 demoSkill 標記（頭上掛 ❗）', s3.demo.length);
  const kinds = s3.skill.map(e => e.skill).sort().join(',');
  ok(kinds === 'blink,charge,spit', '★ 三種招式各一：吐彈／鑽地／衝撞', kinds);
  const tset = s3.skill.map(e => e.type).sort().join(',');
  ok(tset === 'bunny,cater,frog', '★ 示範的三隻是青蛙／毛毛蟲／蹦蹦兔', tset);
  ok(s3.n - s3.skill.length >= 1, '第 3 關其他小怪照樣不會出招', { 總數: s3.n, 會出招: s3.skill.length });

  const s3h = spawn(3, { diff: 'hard' });
  ok(s3h.skill.length === 3, '★ 困難難度（怪更多）示範關仍然只有 3 隻', { 總數: s3h.n, 會出招: s3h.skill.length });

  const s4 = spawn(4);
  ok(s4.skill.length === s4.n && s4.n >= 2, '★ 第 4 關：全部照舊會出招', { 總數: s4.n, 會出招: s4.skill.length });

  const s6 = spawn(6);
  ok(s6.skill.length === s6.n && s6.n >= 2, '第 6 關（第 2 大關）：照舊全開', { 總數: s6.n, 會出招: s6.skill.length });
}

/* ================================================================ */
head('4. 第 3 關的教學（開場卡＋倒數後提示）');
{
  const env = makeEnv();
  const P = env.BH, G = P.Game;
  try { P.WeekMod.pin([]); } catch (e) {}
  try { P.startSolo(3, false, false); } catch (e) { ok(false, 'startSolo(3) 跑得起來', String(e)); }
  const sub = P.foeSkillIntroSub();
  ok(!!sub && sub.indexOf('小怪會使出招式') >= 0, '開場卡多一行「小怪會使出招式」', sub.trim());
  ok(sub.indexOf('⚠️ ⚠️') < 0, '圖示不會重複兩顆');
  const tips = P.foeSkillIntroTips() || [];
  ok(tips.length === 3, '開場卡三條教學', tips.length);
  ok(tips.some(x => x.indexOf('吐彈') >= 0), '教學 ①：吐彈（看地上的圈）');
  ok(tips.some(x => x.indexOf('鑽地') >= 0), '教學 ②：鑽地（別站在沙圈上）');
  ok(tips.some(x => x.indexOf('衝撞') >= 0), '教學 ③：衝撞（往左右閃）');
  ok(tips.every(x => x.indexOf('<b>') < 0), '教學文字沒有殘留 HTML 標籤（走 textContent）');

  G.stage = 2;
  ok(P.foeSkillIntroTips() === null && P.foeSkillIntroSub() === '', '第 2 關不跳招式教學');
  G.stage = 4;
  ok(P.foeSkillIntroTips() === null, '第 4 關不跳招式教學');

  /* 倒數結束才跳提示卡（開場說明是全螢幕遮罩，太早會被蓋掉） */
  ok(/AudioSys\.sfx\('go'\);\n    try \{ foeSkillIntroBanner\(\); \}/.test(mainJs),
    '★ 提示卡掛在「倒數結束 → Game.state = play」之後');
  ok(/function foeSkillIntroBanner\(\)[\s\S]{0,600}Game\.state !== 'play'/.test(mainJs),
    '跳出前再確認一次狀態是 play');
  ok(/Game\._foeSkillHinted === Game\.stage/.test(mainJs), '同一關重試不重複講');
}

/* ================================================================ */
head('5. 教學文案五語齊全');
{
  const keys = ['foe.teachSub', 'foe.teach1', 'foe.teach2', 'foe.teach3', 'foe.teachCard', 'foe.teachCardSub'];
  keys.forEach(function (k) {
    const re = new RegExp('^' + k.replace(/\./g, '\\.') + '\\|([^\\n]*)$', 'm');
    const m = i18n.match(re);
    const cols = m ? m[1].split('|') : [];
    ok(cols.length === 5 && cols.every(c => c.trim().length > 3), k + ' 五個語言都有', cols.length);
  });
  ok(!/foe\.teach[a-zA-Z0-9]*\|[^\n]*\\u26A0/.test(i18n), '字典裡沒有殘留的 \\u26A0 跳脫字元（emoji 要放真字元）');
  /* 其他語系不能漏中文 */
  const en = (i18n.match(/^foe\.teach1\|[^\n]*$/m) || [''])[0].split('|')[3] || '';
  ok(/Spit shot/.test(en) && !/[\u4e00-\u9fa5]/.test(en), '英文條目不是中文（會漏出去）', en.slice(0, 24));
}

/* ================================================================ */
head('6. 圖鑑／招式本身沒被動到（只改「幾時開放」）');
{
  const kitSrc = (function () {
    const a = mainJs.indexOf('const FOE_KIT = {');
    const b = mainJs.indexOf('function foeKit(id)', a);
    return mainJs.slice(a, b);
  })();
  const nSkill = (kitSrc.match(/skill: '/g) || []).length;
  ok(nSkill >= 40, '★ 48 隻小怪的招式表原封不動（圖鑑還看得到）', nSkill);
  ok(/wisp: \{ fx: 'fire', skill: 'pulse'/.test(kitSrc), '鬼火的震波（pulse）沒被改弱');
  ok(/slime: \{ fx: 'nature', skill: 'split'/.test(kitSrc), '史萊姆分裂還在（只是前兩關不放）');

  /* makeEnemy 只「不給招式」，不是把種類改掉 */
  ok(/const skOn = foeSkillOn\(sp\.id\);/.test(mainJs), '★ makeEnemy 用 foeSkillOn 決定這隻能不能有招式');
  ok(/if \(skOn && kit\.skill\) e\.skill = kit\.skill;/.test(mainJs), '招式賦予包在 skOn 裡');
  ok(/if \(!foeSkillOn\(e\.spec\)\) return;      \/\/ v5\.82/.test(mainJs), '★ 分裂也吃同一道門（前兩關不分裂）');
  ok(/FOE_SKILL_DEMO_TYPES\.filter/.test(mainJs), '示範關把三種會出招的排到最前面（前 3 隻一定看得到）');
  ok(/bubbleSay\(e, '(?:❗|\\u2757)', 'dead'/.test(mainJs), '示範的 3 隻頭上掛 ❗');
}

console.log('\n=== v5.82 前期小怪不放招＋第 3 關招式示範：' + pass + ' 通過 / ' + fail + ' 失敗 ===');
process.exit(fail ? 1 : 0);
