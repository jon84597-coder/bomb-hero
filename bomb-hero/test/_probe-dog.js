// 真機驗收：柴犬精靈動作（走路／舉彈）＋ 舉彈位置對不對
const { launch, sleep } = require('./cdp');

const SETUP = `(function(){
  var B = window.__BH, G = B.Game;
  B.settings.size = 'M'; B.settings.ctrl = 'kb'; B.settings.hazards = 'off';
  B.settings.sd = 'off'; B.settings.soloDiff = 'normal'; B.settings.time = 300;
  B.settings.mapMode = 'classic';
  B.startSolo(1, false);
  G.state = 'play'; G.countdown = 0;
  var me = G.players[0];
  // 一定要換「整個角色定義」而不是只改 .animal：ch 是共用物件，
  //   只改 animal 會讓 color／id 還是上一隻（實測畫出來是青蛙）。
  me.ch = B.CHARACTERS.filter(function (x) { return x.animal === 'dog'; })[0] || me.ch;
  me.chIdx = B.CHARACTERS.indexOf(me.ch);
  me.invuln = 9999; me.dead = false; me.alive = true; me.cry = 0; me.lives = 9;
  me.hp = 99; me.hpMax = 99;
  if (G.foes) G.foes.length = 0; if (G.flames) G.flames.length = 0;   // 別讓小怪／火焰把角色打成哭臉
  // 找一格左右上下都空的平地
  var T = G.T, fx = 3, fy = 3;
  for (var y = 2; y < G.rows - 2; y++) {
    for (var x = 2; x < G.cols - 3; x++) {
      if (G.grid[y][x] === 0 && G.grid[y][x+1] === 0 && G.grid[y-1][x] === 0 && G.grid[y+1][x] === 0) { fx = x; fy = y; break; }
    }
    if (fx !== 3) break;
  }
  me.x = fx * T + T/2; me.y = fy * T + T/2;
  me.carry = 0;
  try { B.hideOverlay && B.hideOverlay(); } catch(e){}
  // 關卡說明卡（出發！）是全螢幕遮罩：先把遮罩整個關掉，再硬拉回 play
  try {
    var all = document.querySelectorAll('div');
    for (var i = 0; i < all.length; i++) {
      var e = all[i];
      if (e.offsetParent === null) continue;
      var r = e.getBoundingClientRect();
      if (r.width > window.innerWidth * .8 && r.height > window.innerHeight * .6) {
        var bg = getComputedStyle(e).backgroundColor || '';
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') { e.style.display = 'none'; }
      }
    }
  } catch(e){}
  G.state = 'play'; G.paused = false; G.countdown = 0;
  return { ok: true, animal: me.ch.animal, T: T, x: me.x, y: me.y,
           hasDog: B.HeroAnim.has('dog'), idx: me.chIdx, ready: B.HeroAnim.readyCount() };
})()`;

const STATE = (carry, moving) => `(function(){
  var B = window.__BH, G = B.Game, me = G.players[0];
  if (${carry ? 'true' : 'false'}) {
    // 一定要用「真的炸彈物件」，不是數字 —— p.carry 是炸彈，drawBomb 會讀它的 px/py
    if (!me.carry) {
      B.placeBomb(me);
      var b = G.bombs[G.bombs.length - 1];
      if (b) { me.carry = b; b.held = true; b.fuse = 9999; b.age = 2; }
      if (G.flames) G.flames.length = 0; if (G.foes) G.foes.length = 0;
    }
  } else if (me.carry) { me.carry.held = false; me.carry = null; }
  me.moving = ${moving ? 'true' : 'false'};
  me.alive = true; me.cry = 0; me.invuln = 9999;
  var b2 = me.carry;
  return { hasCarry: !!b2, px: b2 && b2.px, py: b2 && b2.py, x: me.x, y: me.y, T: G.T };
})()`;

(async () => {
  const br = await launch({ w: 900, h: 1000, port: 9412 });
  const page = await br.newPage();
  await page.goto('http://127.0.0.1:3122/?t=' + Date.now(), 2600);
  console.log('setup', JSON.stringify(await page.eval(SETUP)));
  await sleep(1200);

  // 量精靈實際畫在哪裡（用 HeroAnim.draw 的座標推算）
  const info = await page.eval(`(function(){
    var B = window.__BH;
    return { acs: Object.keys(B.HeroAnim.imgs), dogActs: Object.keys(B.HeroAnim.imgs.dog || {}),
             ready: B.HeroAnim.readyCount() };
  })()`);
  console.log('圖集', JSON.stringify(info));

  console.log('idle', JSON.stringify(await page.eval(STATE(0, false))));
  await sleep(500);
  await page.shot(__dirname + '/_probe-dog-idle.png');

  console.log('hold', JSON.stringify(await page.eval(STATE(1, false))));
  await sleep(150);
  console.log('  after150ms', JSON.stringify(await page.eval(`(function(){var G=window.__BH.Game,me=G.players[0];return {carry:!!me.carry,py:me.carry&&me.carry.py,px:me.carry&&me.carry.px,act:me.carry&&me.carry.held};})()`)));
  await page.shot(__dirname + '/_probe-dog-hold.png');

  // 走路：把 moving 打開並推 walk 相位
  const walk = await page.eval(`(function(){
    var G = window.__BH.Game, me = G.players[0];
    me.carry = 0; me.moving = true; me.walk = 0.5;
    return { walk: me.walk };
  })()`);
  console.log('walk', JSON.stringify(walk));
  await sleep(600);
  await page.shot(__dirname + '/_probe-dog-walk.png');

  await br.close();
  console.log('done');
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
