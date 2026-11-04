const { launch, sleep } = require('./cdp');
const path = require('path');
const F = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ FAIL: ' + m); } }
(async () => {
  const b = await launch({ w: 900, h: 800 });
  const p = await b.newPage();
  await p.send('Runtime.enable');
  await p.goto(F, 2600);
  for (let i = 0; i < 40; i++) { if (await p.eval('typeof __BH') === 'object') break; await sleep(200); }

  // 1. 造一份進度
  await p.eval(`(function(){
    var BH=window.__BH;
    BH.Solo.unlocked = 15;
    BH.Shop.setState({gold:3000, tickets:2, pets:[{kind:'blade',ch:2}]});
    localStorage.setItem('bombhero-stage','15');
    localStorage.setItem('bombhero-daily-best', JSON.stringify({'2026-11-04': 42123}));
    return 1;
  })()`);
  await sleep(200);
  const code = await p.eval("window.Save.encodeDoc(window.Save.snapshot())");
  ok(code.length < 400 && /^BH1\.[0-9a-z]+\./.test(code), '存檔碼格式正確（' + code.length + ' 字元）');
  ok(!/%/.test(code), '不再有 %XX（base64url）');

  // 2. 清空
  await p.eval(`(function(){
    var BH=window.__BH;
    BH.Solo.unlocked = 1;
    BH.Shop.setState({gold:0, tickets:0, pets:[]});
    localStorage.setItem('bombhero-daily-best','{}');
    return 1;
  })()`);
  const before = JSON.parse(await p.eval("JSON.stringify(window.Save.snapshot())"));
  ok(before.stage === 1 && before.gold === 0, '已清空（stage=1、gold=0）');

  // 3. 還原
  const restored = await p.eval(`(function(){
    var o = window.Save.decodeDoc(${JSON.stringify(code)});
    if (!o) return 'DECODE_FAIL';
    window.Save.apply(o);
    return JSON.stringify(window.Save.snapshot());
  })()`);
  const st = JSON.parse(restored);
  ok(st.stage === 15, '還原關卡進度（' + st.stage + '）');
  ok(st.pets.length === 1 && st.pets[0].kind === 'blade', '還原隨從');
  ok(st.daily['2026-11-04'] === 42123, '還原每日最佳');
  ok(await p.eval("localStorage.getItem('bombhero-stage')") === '15', '寫回 localStorage');

  // 4. 壞碼一律拒絕
  ok(await p.eval("String(window.Save.decodeDoc('BH1.abc.zzzzzzzz'))") === 'null', '壞碼拒絕');
  ok(await p.eval(`String(window.Save.decodeDoc(${JSON.stringify(code.slice(0, code.length - 6))}))`) === 'null', '截斷的碼拒絕');

  // 5. merge 不倒退
  const merged = JSON.parse(await p.eval(`(function(){
    var m = window.Save.merge({stage:5,gold:999,pets:[],tut:{},daily:{}}, {stage:15,gold:100,pets:[{kind:'blade',ch:0}],tut:{home:true},daily:{}});
    return JSON.stringify(m);
  })()`));
  ok(merged.stage === 15, '合併：關卡取較大值（不倒退）');
  ok(merged.gold === 100, '合併：金幣以本地為準（不會把花掉的補回來）');
  ok(merged.tut.home === true, '合併：教學進度取聯集');

  try { await b.close(); } catch (e) {}
  console.log('\n往返：' + pass + ' 通過 / ' + fail + ' 失敗');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
