const cdp = require('./cdp');
(async () => {
  const b = await cdp.launch({ w: 1280, h: 900, port: 9420 });
  const p = await b.newPage();
  await p.goto('http://127.0.0.1:3000/', 1600);
  await cdp.sleep(900);
  const st = await p.eval(`(() => {
    const C = window.__BH.Cloud;
    const chip = document.getElementById('acctChip');
    return {
      ver: window.__BH.VERSION,
      ready: C.state.ready, online: C.online(), guest: C.guest(),
      chipTxt: chip ? chip.textContent.replace(/\\s+/g,' ').trim() : null,
      chipCls: chip ? chip.className : null,
      name: C.acc() && C.acc().name,
      alloc: C.acc() && C.acc().rpg.alloc,
      points: C.acc() && C.acc().points,
      saveSig: C.acc() && C.acc().save.sig.length
    };
  })()`);
  console.log('STATE ' + JSON.stringify(st));
  await p.shot('test/v41-1-home.png');
  await p.eval("document.getElementById('acctChip').click()");
  await cdp.sleep(500);
  await p.shot('test/v41-2-modal.png');
  const modal = await p.eval(`(() => {
    const m = document.getElementById('acctModal');
    return { on: m.classList.contains('on'), txt: m.textContent.replace(/\\s+/g,' ').trim().slice(0, 200),
             btns: Array.from(document.querySelectorAll('#acctBody .acctbtn')).map(b => b.textContent.trim() + (b.disabled ? '(停用)' : '')) };
  })()`);
  console.log('MODAL ' + JSON.stringify(modal));
  // 關閉 → 進 RPG 畫面看帳號列
  await p.eval("document.getElementById('acctClose').click(); document.getElementById('btnRpg').click()");
  await cdp.sleep(700);
  await p.shot('test/v41-3-rpg.png');
  const rpg = await p.eval(`(() => {
    const bar = document.getElementById('rpgAcctBar');
    const mapBtns = Array.from(document.querySelectorAll('#segRpgMap button')).map(b => b.textContent.trim() + (b.disabled ? '🔒' : ''));
    return { bar: bar ? bar.textContent.replace(/\\s+/g,' ').trim() : null, mapBtns, left: document.getElementById('rpgLeft').textContent };
  })()`);
  console.log('RPG ' + JSON.stringify(rpg));
  // 配點走後端：先退 1 點再加回
  const sp = await p.eval(`(async () => {
    const C = window.__BH.Cloud;
    const before = JSON.parse(JSON.stringify(C.acc().rpg.alloc));
    await C.spend('hp', -1);
    const mid = JSON.parse(JSON.stringify(C.acc().rpg.alloc));
    await C.spend('hp', 1);
    const after = JSON.parse(JSON.stringify(C.acc().rpg.alloc));
    return { before, mid, after, ver: C.acc().rpg.ver };
  })()`);
  console.log('SPEND ' + JSON.stringify(sp));
  b.close(); process.exit(0);
})();
