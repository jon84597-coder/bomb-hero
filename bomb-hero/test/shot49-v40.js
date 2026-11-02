// v4.0 瀏覽器實測：RPG 模式（創角配點 → 出發 → 血條）、版本更新面板、商店鈕
const path = require('path');
const { launch, sleep } = require('./cdp');

let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ FAIL: ' + m); } }

(async function () {
  const br = await launch({ w: 1180, h: 860, port: 9551 });
  const page = await br.newPage();
  await page.goto('file:///' + path.resolve(__dirname, '..').replace(/\\/g, '/') + '/index.html', 2600);
  await sleep(700);

  // ---------- 1. 首頁 ----------
  const home = JSON.parse(await page.eval(`JSON.stringify({
    rpg: !!document.getElementById('btnRpg'),
    beta: (document.querySelector('#btnRpg .betaTag') || {}).textContent || '',
    store: !!document.getElementById('btnStore'),
    vlogBtn: !!document.getElementById('verLogBtn'),
    ver: window.__BH.VERSION
  })`));
  ok(home.rpg, '首頁有 RPG 模式鈕');
  ok(/測試版/.test(home.beta), 'RPG 鈕有「測試版 Beta」標籤（' + home.beta + '）');
  ok(home.store, '首頁有商店鈕');
  ok(home.vlogBtn, '左上角有版本更新內容標籤');
  ok(home.ver === '4.5', '版本 4.3');
  await page.shot('test/v40-1-home.png');

  // ---------- 2. 版本更新面板 ----------
  await page.eval(`document.getElementById('verLogBtn').click()`);
  await sleep(400);
  const vl = JSON.parse(await page.eval(`JSON.stringify((function(){
    var p = document.getElementById('verLog');
    var items = document.querySelectorAll('#verLogBody .vlog-item');
    return { open: p && !p.classList.contains('hide'), n: items.length,
             first: items[0] ? items[0].querySelector('.vlog-v').textContent.trim() : '',
             now: !!document.querySelector('#verLogBody .tagnow') };
  })())`));
  ok(vl.open, '點標籤會打開版本更新面板');
  ok(vl.n >= 10, '面板列出 ' + vl.n + ' 個版本');
  ok(vl.now && /4\.3/.test(vl.first), '最上面是當前版本 v4.2（' + vl.first + '）');
  await page.shot('test/v40-2-versionlog.png');
  await page.eval(`document.getElementById('verLogClose').click()`);
  await sleep(250);
  ok(JSON.parse(await page.eval(`JSON.stringify(document.getElementById('verLog').classList.contains('hide'))`)),
    '按 ✕ 可以關掉');

  // ---------- 3. 商店（未來開放） ----------
  await page.eval(`document.getElementById('btnStore').click()`);
  await sleep(350);
  ok(/\S/.test(await page.eval(`(document.getElementById('toast')||{}).textContent||''`)),
    '點商店會跳「準備中」提示：' + (await page.eval(`(document.getElementById('toast')||{}).textContent||''`)).slice(0, 30));

  // ---------- 4. RPG 創角畫面 ----------
  await page.eval(`document.getElementById('btnRpg').click()`);
  await sleep(600);
  const scr = JSON.parse(await page.eval(`JSON.stringify((function(){
    var rows = document.querySelectorAll('#rpgRows .rpgrow');
    var pips = document.querySelectorAll('#rpgRows .rpgrow:first-child .rpgpips i');
    var onPips = document.querySelectorAll('#rpgRows .rpgrow:first-child .rpgpips i.on');
    return { on: document.getElementById('scr-rpg').classList.contains('on'),
             rows: rows.length, pips: pips.length, onPips: onPips.length,
             left: (document.getElementById('rpgLeft')||{}).textContent,
             sum: (document.getElementById('rpgSum')||{}).textContent || '',
             chars: document.querySelectorAll('#rpgCharRow .chcard').length,
             themes: document.querySelectorAll('#segRpgTheme button').length,
             maps: document.querySelectorAll('#segRpgMap button').length };
  })())`));
  ok(scr.on, '進入 RPG 創角畫面');
  ok(scr.rows === 4, '四維屬性列（' + scr.rows + '）');
  ok(scr.pips === 10, '每項 10 格（' + scr.pips + ' 格）');
  ok(scr.chars >= 8, '可選角色 ' + scr.chars + ' 隻');
  ok(scr.themes === 8, '8 大主題分頁');
  ok(scr.maps === 4, '每個主題 4 張小地圖');
  ok(/生命/.test(scr.sum) && /護甲/.test(scr.sum), '有實際能力換算：' + scr.sum.replace(/\s+/g, ' ').slice(0, 50));
  await page.shot('test/v40-3-rpg-create.png');

  // 加一點 → 剩餘點數要變少；點不動就要被擋
  await page.eval(`(function(){
    var btn = document.querySelector('#rpgRows .rpgrow[data-k="atk"] button[data-d="1"]');
    btn.click();
  })()`);
  await sleep(200);
  const afterAdd = await page.eval(`(document.getElementById('rpgLeft')||{}).textContent`);
  ok(Number(afterAdd) === 0, '配滿 9 點後剩餘 ' + afterAdd + ' 點');
  const minusClicked = await page.eval(`(function(){
    var btn = document.querySelector('#rpgRows .rpgrow[data-k="atk"] button[data-d="1"]');
    return btn.disabled;
  })()`);
  ok(minusClicked === true, '點數用完後「＋」變灰（不能超過 9 點）');

  // 隨機分配
  await page.eval(`document.getElementById('btnRpgRandom').click()`);
  await sleep(300);
  const rnd = JSON.parse(await page.eval(`JSON.stringify({
    left: (document.getElementById('rpgLeft')||{}).textContent,
    alloc: window.__BH.RPG.alloc,
    sum: window.__BH.rpgSum(window.__BH.RPG.alloc)
  })`));
  ok(rnd.sum === 9 && Number(rnd.left) === 0, '「電腦隨機分配」後總點數仍是 9（' + JSON.stringify(rnd.alloc) + '）');
  await page.shot('test/v40-4-rpg-random.png');

  // ---------- 5. 出發 ----------
  await page.eval(`document.getElementById('btnRpgStart').click()`);
  await sleep(900);
  await page.eval(`(function(){
    var b = document.querySelector('.overlay-in .mbtn');
    if (b && b.click) b.click();
    var G = window.__BH.Game;
    G.state = 'play'; G.countdown = 0;
    if (G.players[0]) G.players[0].invuln = 999;
  })()`);
  await sleep(900);
  const game = JSON.parse(await page.eval(`JSON.stringify((function(){
    var G = window.__BH.Game, p = G.players[0];
    var hp = 0, defs = 0, maxHp = 0;
    G.enemies.forEach(function (e) { hp += (e.maxHp || 0); if (e.def) defs++; maxHp = Math.max(maxHp, e.maxHp || 0); });
    var floor = 0, wall = 0;
    for (var y = 0; y < G.rows; y++) for (var x = 0; x < G.cols; x++) {
      if (G.grid[y][x] === 1) wall++; else floor++;
    }
    return { mode: G.mode, rpg: !!G.rpg, stage: G.stage,
             hpMax: p && p.hpMax, hpCur: p && p.hpCur, armor: p && p.armorCur,
             power: p && p.power, spd: p && p.rpgSpd,
             enemies: G.enemies.length, maxHp: maxHp, withDef: defs,
             cols: G.cols, rows: G.rows, floor: floor, wall: wall,
             state: G.state };
  })())`));
  ok(game.mode === 'rpg' && game.rpg, '進入 RPG 模式');
  ok(game.hpMax >= 3 && game.hpCur === game.hpMax, '玩家有生命值 ' + game.hpCur + '/' + game.hpMax);
  ok(game.armor >= 0, '玩家有護甲 ' + game.armor);
  ok(game.enemies > 0, '場上有 ' + game.enemies + ' 隻怪');
  ok(game.maxHp >= 2, '怪物有血量（最高 ' + game.maxHp + ' 格）');
  ok(game.withDef > 0, '有 ' + game.withDef + ' 隻帶防禦的怪（硬殼）');
  ok(game.floor > game.wall * .3, '不規則地形：可走 ' + game.floor + ' 格／岩層 ' + game.wall + ' 格');
  await page.shot('test/v40-5-rpg-game.png');

  // ---------- 6. 打一下怪物：血量要扣 ----------
  const hit = JSON.parse(await page.eval(`JSON.stringify((function(){
    var B = window.__BH, G = B.Game, p = G.players[0];
    // 挑血最厚的怪來打，才驗得到「不會一擊必殺」
    var e = G.enemies.slice().sort(function (a, b) { return (b.maxHp || 0) - (a.maxHp || 0); })[0];
    var before = e.hp;
    var dmg = B.flameHitDamage(e);
    var T = G.T;
    G.flames.push({ cx: Math.floor(e.x / T), cy: Math.floor(e.y / T), t: .2, dur: .6, dir: null, owner: p });
    B.updateEnemy(e, .016);
    return { before: before, after: e.hp, dmg: dmg, dead: !!e.dead };
  })())`));
  ok(hit.after === hit.before - hit.dmg, '火焰命中扣 ' + hit.dmg + ' 點血（' + hit.before + ' → ' + hit.after + '）');
  ok(!hit.dead, '血最厚的怪被打一下沒死（' + hit.before + ' 血 · 一擊 ' + hit.dmg + ' 點）→ 告別秒殺');

  // ---------- 7. 被炸到：先扣護甲 ----------
  const hurt = JSON.parse(await page.eval(`JSON.stringify((function(){
    var B = window.__BH, G = B.Game, p = G.players[0];
    p.invuln = 0;
    var a0 = p.armorCur, h0 = p.hpCur;
    B.rpgHurt(p, false, null);
    return { armor0: a0, armor1: p.armorCur, hp0: h0, hp1: p.hpCur };
  })())`));
  ok(hurt.armor0 > 0 ? hurt.armor1 === hurt.armor0 - 1 && hurt.hp1 === hurt.hp0
    : hurt.hp1 === hurt.hp0 - 1,
  '被炸到先扣護甲（護甲 ' + hurt.armor0 + '→' + hurt.armor1 + '，生命 ' + hurt.hp0 + '→' + hurt.hp1 + '）');

  await br.close();
  console.log('\n[shot49] ' + pass + ' 通過、' + fail + ' 失敗');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e.message); process.exit(1); });
