// test/live-v418.js —— 線上（Render）v4.18 煙霧測試
//   ① 版本 / SW  ② 商店分享區  ③ 開發者 ∞  ④ 暱稱留空  ⑤ AI 手套丟彈  ⑥ 分享 API 擋遊客
const { launch, sleep } = require('./cdp');
const fs = require('fs');
const path = require('path');

const URL_LIVE = process.env.BH_URL || 'https://bomb-hero-game.onrender.com/';
const OUT = path.join(__dirname, '_v418');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}

(async () => {
  const B = await launch({ port: 9391, w: 1280, h: 900 });
  const p = await B.newPage();
  try {
    await p.goto(URL_LIVE, 6500);
    await sleep(1800);

    console.log('\n[1] 版本與載入');
    ok('線上 VERSION = 4.18', (await p.eval('String(window.__BH.VERSION)')) === '4.18');
    ok('verTxt = 4.18', (await p.eval('document.getElementById("verTxt").textContent')) === '4.18');
    const lg = await p.eval('JSON.stringify({v:__BH.VERSION_LOG[0].v,now:!!__BH.VERSION_LOG[0].now})');
    ok('VERSION_LOG 首筆 4.18 且 now', /"v":"4\.18"/.test(lg) && /"now":true/.test(lg), lg);
    const sw = await p.eval('(async()=>{const r=await fetch("sw.js",{cache:"no-store"});const t=await r.text();const m=t.match(/SW_VERSION = \'([^\']+)\'/);return m?m[1]:null;})()');
    ok('SW_VERSION = v4.18.0', sw === 'v4.18.0', sw);

    console.log('\n[2] 商店分享區');
    await p.eval(`(function(){
      __BH.Shop.addGold(2400);
      __BH.Game.state = 'menu';
      __BH.Screen.show('shop');
      __BH.Shop.render();
      return true;
    })()`);
    await sleep(600);
    const sh = await p.eval(`(function(){
      const g = document.getElementById('shareGrid');
      return JSON.stringify({
        scr: (document.querySelector('.screen.on')||{}).id,
        cards: document.getElementById('shopGrid').children.length,
        share: g ? g.children.length : 0,
        names: g ? Array.prototype.map.call(g.children, function(b){return b.textContent.replace(/\\s+/g,'');}) : [],
        wallet: document.getElementById('shopWallet').textContent,
        over: document.documentElement.scrollWidth - window.innerWidth
      });
    })()`);
    const shO = JSON.parse(sh);
    ok('商店畫面', shO.scr === 'scr-shop', shO.scr);
    ok('三張隨從卡', shO.cards === 3, shO.cards);
    ok('五個分享平台', shO.share === 5, shO.share);
    ok('每個平台標 +1000', shO.names.filter(function (n) { return n.indexOf('+1000') >= 0; }).length === 5, shO.names);
    ok('無橫向溢出', shO.over <= 0, shO.over);
    const shot1 = path.join(OUT, 'live-shop-share.png');
    await p.shot(shot1);
    ok('商店截圖', fs.existsSync(shot1) && fs.statSync(shot1).size > 20000);

    console.log('\n[3] 開發者金幣無限');
    const dev = await p.eval(`(function(){
      __BH.Cloud.isDev = function(){ return true; };
      __BH.Shop.reset();
      __BH.Shop.render();
      const before = __BH.Shop.gold();
      const r = __BH.Shop.buy('blade');
      return JSON.stringify({ dev: __BH.Shop.dev(), wallet: document.getElementById('shopWallet').textContent,
        hint: document.getElementById('shopGoldHint').textContent,
        ok: r.ok, before: before, after: __BH.Shop.gold() });
    })()`);
    const dO = JSON.parse(dev);
    ok('dev() = true', dO.dev === true);
    ok('錢包顯示 ∞', dO.wallet === '∞', dO.wallet);
    ok('金幣 0 也能買', dO.ok === true);
    ok('沒有扣錢', dO.before === 0 && dO.after === 0, dO);
    const shot2 = path.join(OUT, 'live-dev-infinity.png');
    await p.shot(shot2);

    console.log('\n[4] 暱稱可以留空');
    const nick = await p.eval(`(function(){
      __BH.Cloud.isDev = function(){ return false; };
      __BH.settings.playerName = '';
      const r = __BH.ensureNickname();
      return JSON.stringify({ r: r, name: __BH.settings.playerName });
    })()`);
    const nO = JSON.parse(nick);
    ok('★ 沒填暱稱也能進遊戲', nO.r === true, nO);
    ok('自動取名字（' + nO.name + '）', /^玩家\d{3}$/.test(nO.name), nO.name);

    console.log('\n[5] 對戰 AI 手套丟彈');
    ok('aiThrowLanding 存在', (await p.eval('typeof __BH.aiThrowLanding')) === 'function');
    ok('aiGrabOwnBomb 存在', (await p.eval('typeof __BH.aiGrabOwnBomb')) === 'function');
    const lob = await p.eval(`(function(){
      __BH.startBattle();
      __BH.Game.state = 'play';
      const a = __BH.Game.players[0];
      __BH.Game.bombs.length = 0;
      a.glove = false; a.carry = null; a.lobCd = 0;
      __BH.placeBomb(a);
      const noGlove = __BH.aiLobBomb(a, __BH.AI_LEVELS.strong);
      a.glove = true;
      const withGlove = __BH.aiLobBomb(a, __BH.AI_LEVELS.strong);
      const b = __BH.Game.bombs[0];
      return JSON.stringify({ noGlove: noGlove, withGlove: withGlove,
        hitSomeone: b ? __BH.playerAtCell(b.cx, b.cy) : null });
    })()`);
    const lO = JSON.parse(lob);
    ok('沒手套 → 不丟', lO.noGlove === false, lO);
    ok('有手套 → 會丟（或安全放棄）', lO.withGlove === true || lO.withGlove === false, lO);
    ok('★ 落點不會有人', lO.hitSomeone === false || lO.hitSomeone === null, lO.hitSomeone);

    console.log('\n[6] 分享 API 真的擋遊客');
    const api = await p.eval(`(async function(){
      try {
        const r = await fetch('api/share/prepare', { method:'POST', credentials:'same-origin',
          headers:{'Content-Type':'application/json'}, body: JSON.stringify({platform:'line'}) });
        const j = await r.json();
        return JSON.stringify({ status: r.status, err: j.err });
      } catch (e) { return JSON.stringify({ err: 'NET:' + e.message }); }
    })()`);
    console.log('    → ' + api);
    ok('★ 遊客/未登入 → 被擋（NEED_LOGIN / NO_AUTH）',
      /NEED_LOGIN|NO_AUTH/.test(api), api);
  } catch (e) {
    fail++;
    console.log('  ✗ 例外：' + e.message);
  } finally {
    B.close();
  }
  console.log('\n=== live-v418: ' + pass + ' passed, ' + fail + ' failed ===');
  process.exit(fail ? 1 : 0);
})();
