// v2.7 目檢＋實測：多語言（10 語）
//   A. 桌面：語言鈕位置、選單 10 項、切成英文後整頁（含選單／設定）都換語言
//   B. 勝利／死亡對話框也要跟著換語言
//   C. 手機橫式：選單不爆版
const path = require('path');
const { launch, sleep } = require('./cdp');
const URL = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const OUT = __dirname + '/';

function txt(sel) {
  return `var e=document.querySelector(${JSON.stringify(sel)}); return e ? (e.textContent||'').trim() : null;`;
}

(async () => {
  // ---------- A. 桌面 ----------
  const br = await launch({ w: 1280, h: 820, port: 9421 });
  const page = await br.newPage();
  await page.goto(URL, 1800);
  await sleep(400);

  const pos = await page.eval(`(function(){
    function box(sel){ var e=document.querySelector(sel); if(!e) return null;
      var b=e.getBoundingClientRect();
      return { l:Math.round(b.left), r:Math.round(b.right), t:Math.round(b.top), b:Math.round(b.bottom) }; }
    return { music: box('#btnMusic'), lang: box('#btnLang'), sfx: box('#btnSfx'),
             langLabel: (document.querySelector('#btnLang b')||{}).textContent };
  })()`);
  console.log('語言鈕位置', JSON.stringify(pos));
  console.log('  語言鈕緊鄰音樂鈕右側：', !!(pos.music && pos.lang) && (pos.lang.l - pos.music.r) < 14);

  // 開選單
  await page.eval(`(function(){ var b=document.getElementById('btnLang'); if(b) b.click(); return 1; })()`);
  await sleep(250);
  const menu = await page.eval(`(function(){
    var m=document.getElementById('langMenu');
    var bs=m.querySelectorAll('.lmbtn');
    var list=[]; for (var i=0;i<bs.length;i++) list.push({ id: bs[i].getAttribute('data-lang'), t: bs[i].textContent.trim(), on: bs[i].classList.contains('on') });
    var r=m.getBoundingClientRect();
    return { open: !m.classList.contains('hide'), count: bs.length, list: list,
             w: Math.round(r.width), h: Math.round(r.height),
             inViewport: r.right <= window.innerWidth + 1 && r.left >= -1 && r.top >= 0 };
  })()`);
  console.log('語言選單', JSON.stringify(menu, null, 1));
  await page.shot(OUT + 'v27-1-menu.png');

  // 切成英文
  await page.eval(`(function(){
    var bs=document.querySelectorAll('#langMenu .lmbtn');
    for (var i=0;i<bs.length;i++) if (bs[i].getAttribute('data-lang')==='en') { bs[i].click(); return 1; }
    return 0;
  })()`);
  await sleep(500);
  const en = await page.eval(`(function(){
    function t(sel){ var e=document.querySelector(sel); return e ? (e.textContent||'').trim() : null; }
    var cards=[]; var cs=document.querySelectorAll('#scr-title .mcard, #scr-title .menu .card, #scr-title button');
    for (var i=0;i<Math.min(cs.length,8);i++) cards.push((cs[i].textContent||'').trim().slice(0,26));
    return { back: t('#btnBack'), music: t('#btnMusic'), sfx: t('#btnSfx'), lang: t('#btnLang'),
             full: t('#btnFull'), mail: t('#btnMail'),
             titleAnything: document.getElementById('scr-title').textContent.slice(0, 160),
             cjkLeft: (document.body.innerText.match(/[一-鿿]/g)||[]).length,
             cards: cards };
  })()`);
  console.log('切成英文後', JSON.stringify(en, null, 1));
  await page.shot(OUT + 'v27-2-en-title.png');

  // 進單人闖關頁
  await page.eval(`(function(){ var b=document.getElementById('btnSolo'); if(b) b.click(); return 1; })()`);
  await sleep(400);
  const enSolo = await page.eval(`(function(){
    var s=document.getElementById('scr-solo');
    return { text: s.textContent.replace(/\\s+/g,' ').slice(0, 260),
             goTxt: (document.getElementById('soloGoTxt')||{}).textContent,
             stage1: (document.querySelector('#stageGrid .stg span')||{}).textContent };
  })()`);
  console.log('英文單人頁', JSON.stringify(enSolo, null, 1));
  await page.shot(OUT + 'v27-3-en-solo.png');

  // ---------- B. 勝利／失敗對話框 ----------
  await page.eval(`(function(){
    var P=window.__BH;
    P.showEnd(P.t('solo.winTitle'), P.t('solo.winSub') + P.t('solo.winScore', {s: 1234}), true, 0);
    return 1;
  })()`);
  await sleep(350);
  const endDlg = await page.eval(`(function(){
    var b=document.getElementById('ovBox');
    return { h3: (b.querySelector('h3')||{}).textContent,
             p: (b.querySelector('p')||{}).textContent,
             again: (document.getElementById('btnAgain')||{}).textContent,
             home: (document.getElementById('btnHome')||{}).textContent };
  })()`);
  console.log('英文結算對話框', JSON.stringify(endDlg));
  await page.shot(OUT + 'v27-4-en-end.png');

  // 死亡台詞（遊戲裡的對話框氣泡）
  const bubble = await page.eval(`(function(){
    var P=window.__BH, G=P.Game;
    P.startSolo(1,false); G.state='play';
    G.bubbles.length=0; P.bubbleDead(G.players[0]); G.bubbles.length=0; P.bubbleKill(G.players[0]);
    var txts = G.bubbles.map(function(b){ return b.text; });
    return { lang: P.LANG, lines: txts };
  })()`);
  console.log('英文台詞', JSON.stringify(bubble));

  // 日文
  await page.eval(`(function(){ window.__BH.setLang('ja'); return 1; })()`);
  await sleep(400);
  const ja = await page.eval(`(function(){
    function t(sel){ var e=document.querySelector(sel); return e ? (e.textContent||'').trim() : null; }
    return { back: t('#btnBack'), music: t('#btnMusic'), lang: t('#btnLang'),
             ver: t('#verTxt'), home: document.getElementById('scr-title').textContent.replace(/\\s+/g,' ').slice(0,120) };
  })()`);
  console.log('日文', JSON.stringify(ja, null, 1));
  await page.shot(OUT + 'v27-5-ja-title.png');

  // 俄文（長單字最容易爆版）
  await page.eval(`(function(){ window.__BH.setLang('ru'); return 1; })()`);
  await sleep(400);
  await page.shot(OUT + 'v27-6-ru-title.png');
  const ru = await page.eval(`(function(){
    var se=document.scrollingElement||document.documentElement;
    return { scrollW: se.scrollWidth, clientW: se.clientWidth, overflow: se.scrollWidth - se.clientWidth };
  })()`);
  console.log('俄文橫向溢出', JSON.stringify(ru));

  await page.eval(`(function(){ window.__BH.setLang('zh-TW'); return 1; })()`);
  await sleep(300);
  await br.close();

  // ---------- C. 手機橫式（844×390）----------
  const br2 = await launch({ w: 844, h: 390, port: 9422 });
  const p2 = await br2.newPage();
  await p2.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p2.goto(URL, 1800);
  await sleep(400);
  await p2.eval(`(function(){ var b=document.getElementById('btnLang'); if(b) b.click(); return 1; })()`);
  await sleep(300);
  const m2 = await p2.eval(`(function(){
    var m=document.getElementById('langMenu'); var r=m.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height),
             right: Math.round(r.right), vw: window.innerWidth,
             fits: r.left >= -1 && r.right <= window.innerWidth + 1,
             scrollable: m.scrollHeight > m.clientHeight };
  })()`);
  console.log('手機橫式選單', JSON.stringify(m2));
  await p2.shot(OUT + 'v27-7-phone-menu.png');
  await p2.eval(`(function(){ window.__BH.setLang('en'); return 1; })()`);
  await sleep(400);
  await p2.shot(OUT + 'v27-8-phone-en.png');
  await br2.close();

  console.log('done');
})().catch(function (e) { console.error('ERR', e); process.exit(1); });
