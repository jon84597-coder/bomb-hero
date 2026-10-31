const cdp = require('./cdp');
(async () => {
  const browser = await cdp.launch({ w: 1280, h: 900, port: 9412 });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:3000/', 1200);
  await cdp.sleep(500);
  await page.eval("document.getElementById('btnRpg').click()");
  await cdp.sleep(700);
  await page.shot('test/v40-8-rpg-top.png');
  const info = await page.eval(`(() => {
    const lf = document.getElementById('rpgLeft');
    const cs = getComputedStyle(lf);
    return { left: lf.textContent, color: cs.color, scrollY: window.scrollY };
  })()`);
  console.log(JSON.stringify(info));
  // 換英文看翻譯
  await page.eval("window.__BH.setLang('en', true); window.__BH.Rpg.render();");
  await cdp.sleep(600);
  await page.shot('test/v40-9-rpg-en.png');
  const en = await page.eval(`(() => {
    const g = s => { const e = document.querySelector(s); return e ? e.textContent.trim() : null; };
    return { h2: g('#scr-rpg h2'), step1: g('#scr-rpg .field label'), start: g('#btnRpgStart'), rnd: g('#btnRpgRandom'), theme: g('#segRpgTheme button') };
  })()`);
  console.log(JSON.stringify(en));
  browser.close();
  process.exit(0);
})();
