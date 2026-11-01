// test/live-v417.js — 線上（Render）v4.17 煙霧測試：版本 / 商店 / 隨從可買可出場 / AI
// 注意：index.html 的符號全包在 IIFE 內，瀏覽器端只能透過 window.__BH 存取
const { launch, sleep } = require('./cdp');
const fs = require('fs');
const path = require('path');

const URL_LIVE = process.env.BH_URL || 'https://bomb-hero-game.onrender.com/';
const OUT = path.join(__dirname, '_v417');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}

(async () => {
  const B = await launch({ port: 9371, w: 1280, h: 860 });
  const p = await B.newPage();
  try {
    await p.goto(URL_LIVE, 4500);
    await sleep(1400);

    console.log('\n[1] 版本與載入');
    const v = await p.eval('String(window.__BH.VERSION)');
    ok('線上 VERSION = 4.17', v === '4.17', v);
    ok('verTxt 徽章 4.17', (await p.eval('document.getElementById("verTxt").textContent')) === '4.17');
    ok('verLogVer 徽章 4.17', (await p.eval('document.getElementById("verLogVer").textContent')) === '4.17');
    const lg = await p.eval('JSON.stringify({v:__BH.VERSION_LOG[0].v,now:!!__BH.VERSION_LOG[0].now,n:__BH.VERSION_LOG[0].items.length})');
    const lgO = JSON.parse(lg);
    ok('VERSION_LOG 首筆 4.17 且標記 now', lgO.v === '4.17' && lgO.now === true, lgO);
    ok('4.17 條目有 10 項說明', lgO.n === 10, lgO.n);
    const swv = await p.eval('(async()=>{const r=await fetch("sw.js",{cache:"no-store"});const t=await r.text();const m=t.match(/SW_VERSION = \'([^\']+)\'/);return m?m[1]:null;})()');
    ok('線上 SW_VERSION = v4.17.1', swv === 'v4.17.1', swv);

    console.log('\n[2] 商店模組');
    ok('Shop 模組存在', (await p.eval('typeof __BH.Shop === "object" && typeof __BH.Shop.buy === "function"')) === true);
    ok('三種隨從', (await p.eval('__BH.PET_KINDS.length')) === 3);
    ok('每隻 1000 金幣', (await p.eval('__BH.PET_KINDS.every(function(k){return k.price===1000;})')) === true);
    ok('商店畫面節點存在', (await p.eval('!!document.getElementById("scr-shop")')) === true);

    console.log('\n[3] 購買流程');
    await p.eval('__BH.Shop.reset(); __BH.Shop.addGold(3000); __BH.Shop.render(); true');
    const buy1 = await p.eval('JSON.stringify(__BH.Shop.buy("blade"))');
    ok('買刀客成功', /"ok":true/.test(buy1), buy1);
    const buy2 = await p.eval('JSON.stringify(__BH.Shop.buy("blade"))');
    ok('同種重複購買被拒（OWNED）', /"err":"OWNED"/.test(buy2), buy2);
    ok('金幣扣除 1000', (await p.eval('__BH.Shop.gold()')) === 2000);
    const b3 = await p.eval('JSON.stringify(__BH.Shop.buy("bomber"))');
    ok('買投彈隨從成功', /"ok":true/.test(b3), b3);
    const b4 = await p.eval('JSON.stringify(__BH.Shop.buy("guard"))');
    ok('買格檔隨從成功', /"ok":true/.test(b4), b4);
    ok('三隻都雇用（金幣 0）', (await p.eval('__BH.Shop.gold()')) === 0);

    console.log('\n[4] 單人關卡 → 隨從出場');
    const sp = await p.eval(`(function(){
      try { __BH.Screen.show('single'); } catch(e) {}
      try { __BH.startSolo(1); } catch(e) { return 'ERR:' + e.message; }
      return JSON.stringify({ state: __BH.Game.state, mode: __BH.Game.mode,
        pets: (__BH.Game.pets||[]).length,
        kinds: (__BH.Game.pets||[]).map(function(q){return q.kind;}),
        foes: (__BH.Game.enemies||[]).length });
    })()`);
    const spO = JSON.parse(sp);
    ok('單人模式已進入（倒數階段 state=idle）', spO.mode === 'solo' && (spO.state === 'idle' || spO.state === 'play'), spO);
    ok('三隻隨從帶進場', spO.pets === 3, spO.pets);
    ok('隨從種類齊全', JSON.stringify((spO.kinds || []).slice().sort()) === '["blade","bomber","guard"]', spO.kinds);
    ok('第一關小怪 ≥ 8 隻（變多）', spO.foes >= 8, spO.foes);

    await p.eval('(function(){var b=document.querySelector("#ovBox button"); if(b) b.click(); return true;})()');
    await sleep(4600);
    const st = await p.eval('__BH.Game.state');
    ok('按開始後倒數結束進入 play', st === 'play', st);
    const shot1 = path.join(OUT, 'live-pets.png');
    await p.shot(shot1);
    ok('單人關卡截圖產出', fs.existsSync(shot1) && fs.statSync(shot1).size > 20000);

    console.log('\n[5] 隨從戰鬥行為');
    const behav = await p.eval(`(function(){
      const pt = (__BH.Game.pets||[])[0];
      if (!pt) return 'NOPET';
      return JSON.stringify({ hp: pt.hp, maxHp: pt.maxHp, down: !!pt.down,
        hasSlash: 'slashT' in pt, hasRest: 'restT' in pt, hp1: __BH.petHpMax('blade'), hpg: __BH.petHpMax('guard') });
    })()`);
    const bO = JSON.parse(behav);
    ok('隨從有 HP 欄位', typeof bO.hp === 'number' && typeof bO.maxHp === 'number', bO);
    ok('單人模式一擊倒（blade maxHp=1）', bO.hp1 === 1, bO.hp1);
    ok('單人格檔可擋三下（guard maxHp=3）', bO.hpg === 3, bO.hpg);
    ok('隨從有感應/揮刀/休息狀態欄位', bO.hasSlash && bO.hasRest, bO);

    console.log('\n[6] 商店畫面（手機 390×844）');
    await p.eval('__BH.Game.state="menu"; __BH.Shop.render(); __BH.Screen.show("shop"); true');
    await sleep(500);
    await p.resize(390, 844, true);
    await sleep(700);
    const sh = await p.eval(`(function(){
      const g=document.getElementById('shopGrid');
      const on=document.querySelector('.screen.on');
      return JSON.stringify({ scr: on?on.id:null, cards: g?g.children.length:0,
        wallet: (document.getElementById('shopWallet')||{}).textContent,
        over: document.documentElement.scrollWidth - window.innerWidth });
    })()`);
    const shO = JSON.parse(sh);
    ok('手機商店開啟', shO.scr === 'scr-shop', shO.scr);
    ok('三張隨從卡片', shO.cards === 3, shO.cards);
    ok('手機無橫向溢出', shO.over <= 0, shO.over);
    const shot2 = path.join(OUT, 'live-shop-phone.png');
    await p.shot(shot2);
    ok('手機商店截圖產出', fs.existsSync(shot2) && fs.statSync(shot2).size > 20000);

    console.log('\n[7] 對戰 AI 丟彈 / 數值回調');
    ok('aiLobBomb 已匯出', (await p.eval('typeof __BH.aiLobBomb === "function"')) === true);
    const lv = await p.eval('JSON.stringify({w:__BH.AI_LEVELS.weak.lob,n:__BH.AI_LEVELS.normal.lob,s:__BH.AI_LEVELS.strong.lob})');
    const lvO = JSON.parse(lv);
    ok('AI 丟彈機率隨難度遞增', lvO.w < lvO.n && lvO.n < lvO.s, lvO);
    ok('RPG 小怪血量回升（slime 3）', (await p.eval('__BH.FOE_HP.slime')) === 3);
    ok('RPG 小怪血量（skull 4）', (await p.eval('__BH.FOE_HP.skull')) === 4);
  } catch (e) {
    fail++;
    console.log('  ✗ 例外：' + e.message);
  } finally {
    B.close();
  }
  console.log('\n=== live-v417: ' + pass + ' passed, ' + fail + ' failed ===');
  process.exit(fail ? 1 : 0);
})();
