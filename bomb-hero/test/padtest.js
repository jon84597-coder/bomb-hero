// bomb-hero/test/padtest.js — 手把選單導航「全套驗收」（假手把 + 真 DOM）
// 用法：node bomb-hero/test/padtest.js   （需要 Chrome；不進 _runall，因為要開瀏覽器）
// 這支驗的是「真的按下去有沒有反應」；純邏輯的部分在 verify-v510。
const path = require('path');
const { launch, sleep } = require('./cdp');

const ROOT = path.resolve(__dirname, '..', '..');
const URL = 'file:///' + path.resolve(ROOT, 'bomb-hero/index.html').replace(/\\/g, '/');

let pass = 0, fail = 0;
function ok(cond, msg, extra) {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ FAIL: ' + msg + (extra === undefined ? '' : ' → ' + extra)); }
}
function head(s) { console.log('\n' + s); }

const SETUP = `(function(){
  window.__setPad = function(idx){
    var b=[]; for(var i=0;i<17;i++) b.push({pressed:false,value:0});
    var gp={ id:'Fake Pad (STANDARD GAMEPAD)', connected:true, mapping:'standard',
             buttons:b, axes:[0,0,0,0],
             _set:function(i,v){ b[i].pressed=!!v; b[i].value=v?1:0; return gp; },
             _ax:function(i,v){ gp.axes[i]=v; return gp; } };
    window.__gp=gp;
    window.__pads=[]; window.__pads[idx]=gp;
    return gp;
  };
  if (!window.__padHook) {
    window.__padHook = 1;
    try { Object.defineProperty(navigator,'getGamepads',{configurable:true,value:function(){ return window.__pads || []; }}); } catch(e){}
    window.__tap=function(b,ms){ window.__gp._set(b,true); return new Promise(function(r){
        setTimeout(function(){ window.__gp._set(b,false); setTimeout(r,110); }, ms||70); }); };
    window.__ax=function(i,v,ms){ window.__gp._ax(i,v); return new Promise(function(r){
        setTimeout(function(){ window.__gp._ax(i,0); setTimeout(r,130); }, ms||160); }); };
    window.__uidN=0;
    window.__foc=function(){ var e=document.querySelector('.padfocus');
        if(!e) return null;
        if(!e.__puid) e.__puid='u'+(++window.__uidN);
        var q=e.getBoundingClientRect();
        return { uid:e.__puid, key:(e.id||((e.className||'').split(' ')[0])),
                 txt:(e.textContent||'').replace(/\\s+/g,' ').trim().slice(0,20),
                 x:Math.round(q.left), y:Math.round(q.top), w:Math.round(q.width), h:Math.round(q.height) }; };
  }
  window.__setPad(0);
  window.__BH.PadUI.armed = true;
  return 1; })()`;

(async () => {
  const br = await launch({ w: 900, h: 1000, port: 9373 });
  const page = await br.newPage();
  await page.resize(430, 900, true);
  await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await page.goto(URL + '?touch=1', 2200);
  await page.eval(SETUP);
  await page.eval('window.__BH.PadUI.refocus()');
  await sleep(250);

  const foc = () => page.eval('window.__foc()');
  const tap = (b, ms) => page.eval(`window.__tap(${b}, ${ms || 70})`);
  const ax = (i, v, ms) => page.eval(`window.__ax(${i}, ${v}, ${ms || 160})`);
  const show = n => page.eval(`window.__BH.Screen.show('${n}')`);
  const itemCount = () => page.eval(`window.__BH.PadUI.items().length`);
  async function goScreen(n) {
    if (n === 'rpg') {
      // v5.10：RPG 頁的內容是「真的點進去」才長出來的，直接 Screen.show('rpg') 只有 6 項外殼
      //   （角色卡、能力加減、關卡按鈕全都還沒建）→ 用真實路徑才量得到全部 30 項。
      await show('title'); await sleep(220);
      await page.eval(`document.getElementById('btnAdventure').click()`); await sleep(320);
      await page.eval(`document.getElementById('btnRpg').click()`); await sleep(850);
    } else {
      await show(n);
    }
    await sleep(260); await page.eval('window.__BH.PadUI.refocus()'); await sleep(220);
  }

  // ---------------------------------------------------------------
  head('① 首頁：預設焦點要落在主要按鈕');
  const first = await foc();
  ok(!!first, '一進首頁就有焦點（' + (first && first.key) + '）');
  ok(first && /btnLearn|btnAdventure|mbtn/.test(first.key || ''), '預設焦點是選單主按鈕，不是角落的版本鈕', first && first.key);
  ok(first && first.w > 0 && first.h > 0, '焦點元素有實際尺寸');

  head('② 首頁：方向鍵走完左欄並繞回（不會卡死）');
  let seq = [];
  for (let i = 0; i < 8; i++) { await tap(13); const f = await foc(); seq.push(f && f.key); }
  ok(seq.indexOf('btnLearn') >= 1 || (first && first.key === 'btnLearn'), '走得到「新手教學」');
  ok(seq.indexOf('btnAdventure') >= 0, '走得到「冒險模式」');
  ok(seq.indexOf('btnDaily') >= 0, '走得到「每日挑戰」');
  ok(seq.indexOf('btnStore') >= 0, '走得到「商店」');
  ok(seq.length === 8 && !!seq[7] && seq[7] === seq[0], '第 8 次會繞回起點（不會停在最後一項）', seq.join(' → '));

  head('③ 首頁：右方向鍵可以進右欄（大逃殺／多人／更多）');
  await goScreen('title');
  await tap(13); await tap(13);
  const bR = await foc();
  await tap(15);
  const aR = await foc();
  ok(aR && bR && aR.key !== bR.key, '按右會換項目（' + (bR && bR.key) + ' → ' + (aR && aR.key) + '）');
  ok(aR && /btnBR|btnMulti|btnMoreMenu/.test(aR.key || ''), '換到的是右欄項目', aR && aR.key);

  // ---------------------------------------------------------------
  head('④ LB／RB：每個畫面都能逐項走完「所有」項目');
  const SCREENS = ['title', 'solo', 'rpg', 'battle', 'br', 'daily', 'shop', 'settings', 'help', 'online'];
  for (const sc of SCREENS) {
    await goScreen(sc);
    const n = await itemCount();
    if (!n) { ok(false, sc + '：找不到任何可操作項目'); continue; }
    const seen = new Set();
    let nulls = 0, tiny = 0;
    for (let i = 0; i < n + 1; i++) {
      const f = await foc();
      if (!f) { nulls++; break; }
      seen.add(f.uid);
      if (f.w < 6 || f.h < 6) tiny++;
      await tap(5);
    }
    const n2 = await itemCount();
    ok(nulls === 0 && seen.size >= n, sc + '：' + n + ' 項全部走到（實際 ' + seen.size + '／清單 ' + n2 + '）',
      seen.size < n ? ('只走到 ' + seen.size + '/' + n) : undefined);
    ok(tiny === 0, sc + '：沒有選到 0 尺寸的元素');
  }

  // ---------------------------------------------------------------
  head('⑤ 冒險模式彈窗（#bhPick 在 .screen 外面）');
  await goScreen('title');
  await page.eval(`document.getElementById('btnAdventure').click()`);
  await page.eval('window.__BH.PadUI.refocus()');
  await sleep(350);
  ok(await page.eval(`(function(){var e=document.getElementById('bhPick');return !!e&&e.classList.contains('on');})()`), '#bhPick 已開啟');
  ok(await page.eval(`window.__BH.PadUI.scope && window.__BH.PadUI.scope.id === 'bhPick'`), '操作範圍切到彈窗（不是背後的 .screen）');
  const f1 = await foc();
  ok(f1 && /btnSolo|btnRpg/.test(f1.key || ''), '焦點進到「單人闖關／RPG」', f1 && f1.key);
  await tap(13);
  const f2 = await foc();
  ok(f2 && /btnSolo|btnRpg/.test(f2.key || '') && f2.key !== (f1 && f1.key), '下鍵可以在兩個選項之間移動（' + (f1 && f1.key) + ' → ' + (f2 && f2.key) + '）');
  await tap(14);
  const f3 = await foc();
  ok(f3 && f3.key === (f1 && f1.key), '上／左可以移回去（' + (f2 && f2.key) + ' → ' + (f3 && f3.key) + '）');
  await tap(0);
  await sleep(600);
  const cur1 = await page.eval('window.__BH.Screen.current');
  ok(cur1 === 'solo' || cur1 === 'rpg', 'A 真的進去了（目前畫面 ' + cur1 + '）');
  ok(await page.eval(`(function(){var e=document.getElementById('bhPick');return !e||!e.classList.contains('on');})()`), '彈窗已關閉');

  head('⑥ 冒險模式 → 單人：蘑菇頭可以在各選項間移動');
  await goScreen('solo');
  const A0 = await foc();
  let moved = 0;
  for (let i = 0; i < 4; i++) { await ax(1, .92); const f = await foc(); if (f && A0 && f.key !== A0.key) moved++; }
  ok(moved >= 2, '左蘑菇頭往下推 4 次，焦點真的移動（' + moved + '/4）');
  ok(await page.eval(`(function(){var e=document.querySelector('.padfocus'); if(!e) return false;
      var r=e.getBoundingClientRect(); return r.top>=-1 && r.bottom<=window.innerHeight+2;})()`),
    '焦點一定被捲進可視範圍（不會選到畫面外）');

  // ---------------------------------------------------------------
  head('⑦ 手把不在瀏覽器索引 0（插拔留洞）');
  await page.eval(`window.__setPad(2)`);
  await page.eval(`window.__BH.PadUI.refocus()`);
  await goScreen('title');
  const s0 = await foc();
  await tap(13);
  const s1 = await foc();
  ok(!!s1 && !!s0 && s1.key !== s0.key, '手把在索引 2 時選單照樣能動（' + (s0 && s0.key) + ' → ' + (s1 && s1.key) + '）');
  ok(await page.eval(`window.__BH.PadUI.padIndex() === 2`), 'PadUI 解析到正確的實體索引 2');

  // ---------------------------------------------------------------
  head('⑧ 右蘑菇頭：上下左右捲動選單');
  await goScreen('settings');
  const y0 = await page.eval('Math.round((document.scrollingElement||document.documentElement).scrollTop)');
  await page.eval('window.__gp._ax(3, 0.95)');
  await sleep(900);
  await page.eval('window.__gp._ax(3, 0)');
  await sleep(200);
  const y1 = await page.eval('Math.round((document.scrollingElement||document.documentElement).scrollTop)');
  ok(y1 > y0 + 80, '右蘑菇頭往下 → 選單真的往下捲（' + y0 + ' → ' + y1 + '）');
  await page.eval('window.__gp._ax(3, -0.95)');
  await sleep(900);
  await page.eval('window.__gp._ax(3, 0)');
  await sleep(200);
  const y2 = await page.eval('Math.round((document.scrollingElement||document.documentElement).scrollTop)');
  ok(y2 < y1 - 40, '推回去 → 往上捲（' + y1 + ' → ' + y2 + '）');
  // 水平（長橫向清單）
  await goScreen('battle');
  const x0 = await page.eval('Math.round((document.scrollingElement||document.documentElement).scrollLeft)');
  await page.eval('window.__gp._ax(2, 0.95)');
  await sleep(500);
  await page.eval('window.__gp._ax(2, 0)');
  await sleep(150);
  const x1 = await page.eval('Math.round((document.scrollingElement||document.documentElement).scrollLeft)');
  ok(x1 >= x0, '右蘑菇頭左右不會讓畫面亂跳（' + x0 + ' → ' + x1 + '）');

  // ---------------------------------------------------------------
  head('⑨ 遊戲中：不能誤觸選單，B／Start 要能暫停');
  await page.eval(`(function(){ var B=window.__BH;
     B.startSolo(1, false);
     B.Screen.show('game');
     var G=B.Game; G.state='play'; G.countdown=0;
     if (B.isPaused()) B.togglePause();
     document.getElementById('ovIn').classList.add('hide');
     document.getElementById('banner').style.display='none';
     return 1; })()`);
  await sleep(700);
  // startSolo 會自己跳「出發！」覆蓋層並把遊戲暫停 → 這裡先確定回到「遊戲進行中、沒開選單」
  await page.eval(`(function(){ var B=window.__BH;
     if (B.isPaused()) B.togglePause();
     B.Game.state='play'; B.Game.countdown=0;
     document.getElementById('ovIn').classList.add('hide');
     return 1; })()`);
  await sleep(250);
  ok(await page.eval('window.__BH.isPaused() === false'), '前置：遊戲正在進行（未暫停）');
  await page.eval('window.__BH.PadUI.refocus()');
  await sleep(300);
  ok(await page.eval(`window.__BH.PadUI.scope === null`), '遊戲中操作範圍是空的（不會搶 HUD 按鈕）');
  ok(await page.eval(`(function(){ var f=document.querySelectorAll('.padfocus');
      for (var i=0;i<f.length;i++){ var o=document.getElementById('ovIn'); if(!o||!o.contains(f[i])) return false; }
      return true; })()`), '遊戲中沒有任何手把光環（HUD 上不會發光）');
  const st0 = await page.eval('window.__BH.Game.state');
  await tap(13); await tap(15);
  ok(await page.eval('window.__BH.Game.state') === st0, '方向鍵不會把遊戲切走');

  await tap(1);
  await sleep(400);
  ok(await page.eval(`window.__BH.isPaused() === true`), '遊戲中按 B → 暫停');
  const p1 = await foc();
  ok(!!p1, '暫停選單裡也有手把焦點（' + (p1 && p1.key) + '）');
  ok(await page.eval(`window.__BH.PadUI.scope && window.__BH.PadUI.scope.id === 'ovIn'`), '暫停時操作範圍＝暫停選單');
  await tap(1);
  await sleep(400);
  ok(await page.eval(`window.__BH.isPaused() === false`), '在暫停選單按 B → 回遊戲');

  // ---------------------------------------------------------------
  head('⑩ 說明頁的手把對應表（單一來源）');
  await goScreen('help');
  const mapRows = await page.eval(`(function(){ var d=document.querySelectorAll('#helpBody .hkv dt');
      return Array.prototype.map.call(d, function(x){return (x.textContent||'').trim();}); })()`);
  ok(mapRows.some(r => /^A$/.test(r)), '有 A 的說明');
  ok(mapRows.some(r => /右蘑菇頭/.test(r)), '有右蘑菇頭的說明（捲動選單）');
  ok(mapRows.some(r => /LB/.test(r)), '有 LB／RB 的說明（逐項）');
  ok(await page.eval(`!!window.__BH.PAD_MAP && window.__BH.PAD_MAP.length >= 8`), 'PAD_MAP 至少 8 條');

  await page.shot(path.join(ROOT, 'outputs/pad_final.png'));
  console.log('\n' + (fail ? '✗ ' : '') + '通過 ' + pass + ' / ' + (pass + fail));
  await br.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FAIL', e && e.stack || e); process.exit(1); });
