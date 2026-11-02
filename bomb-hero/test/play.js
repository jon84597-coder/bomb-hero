// test/play.js — 讓 AI 接管玩家 1 的控制方案，真的把《爆爆英雄》玩起來
// 用法：node test/play.js [目標關卡數，預設 3]
const { launch, sleep } = require('./cdp');
const path = require('path');

const FILE = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const TARGET = parseInt(process.argv[2] || '3', 10);
const BOT_SRC = require('./_bot-src.js');

/* ---------------- 主流程 ---------------- */
(async () => {
  const b = await launch({ w: 1280, h: 900, port: 9342 });
  const pg = await b.newPage();
  const shotDir = __dirname;
  try {
    await pg.goto(FILE, 2500);
    if (!(await pg.eval('!!window.__BH'))) throw new Error('遊戲未載入');

    async function boot() {
      await pg.eval(`(function(){
        window.__errs = [];
        window.addEventListener('error', function(e){ window.__errs.push(String(e.message)); });
        const BH = window.__BH;
        if (!window.__bot) { eval(${JSON.stringify(BOT_SRC)}); }
        BH.startSolo(1);
        BH.beginCountdown('battle');
        window.__bot.attach();
      })()`);
    }
    await boot();
    console.log('# 開始挑戰：目標通過第 ' + TARGET + ' 關');

    let lastStage = 1;
    const t0 = Date.now();
    const deadline = t0 + 9 * 60 * 1000;
    let report = null;

    while (Date.now() < deadline) {
      await sleep(2000);
      let s;
      try {
        s = await pg.eval(`(function(){
          const BH = window.__BH, G = BH.Game;
          const p = G.players[0] || null;
          const ov = !document.getElementById('ovIn').classList.contains('hide');
          let softLeft = 0;
          for (let y=1;y<G.rows-1;y++) for (let x=1;x<G.cols-1;x++) if (G.grid[y] && G.grid[y][x]===2) softLeft++;
          return {
            screen: BH.Screen.current, state: G.state, stage: G.stage,
            hasP: !!p,
            alive: p ? p.alive : null, lives: p ? p.lives : null, dead: p ? p.dead : null,
            score: p ? p.score : null, power: p ? p.power : null,
            enemies: G.enemies.length, softLeft,
            door: G.door ? (G.door.open ? 'open' : (G.door.revealed ? 'revealed' : 'hidden')) : '-',
            overlay: ov, endShown: G.endShown,
            bombsPlaced: window.__bot ? window.__bot.st.bombsPlaced : -1,
            reason: window.__bot ? window.__bot.st.reason : '',
            errs: (window.__errs||[]).slice(0,2)
          };
        })()`);
      } catch (e) { console.log('EVAL_ERR', e.message); continue; }
      const el = Math.round((Date.now()-t0)/1000);
      console.log(`[${el}s]`, JSON.stringify(s));
      if (s.errs.length) console.log('PAGE_ERR', s.errs.join(' | '));

      if (!s.hasP || s.screen !== 'game') {
        console.log('# 回到標題／玩家不存在，重新開一場');
        await boot();
        continue;
      }
      if (s.overlay) {
        const r = await pg.eval(`(function(){
          const btn = document.querySelector('.overlay-in .mbtn');
          if (!btn) return null;
          const txt = btn.textContent; btn.click(); return txt;
        })()`);
        if (r) { console.log('# 點擊彈窗按鈕:', r); await sleep(500); }
      }
      if (s.stage !== lastStage) {
        lastStage = s.stage;
        const f = path.join(shotDir, '_play_stage' + s.stage + '.png');
        await pg.shot(f);
        console.log('# 過關！現在打到第', s.stage, '關，截圖:', path.basename(f));
      }
      if (s.endShown && s.state === 'over') {
        const f = path.join(shotDir, '_play_end.png');
        await pg.shot(f);
        report = { result: 'GAME_OVER', stage: s.stage, score: s.score, lives: s.lives, bombsPlaced: s.bombsPlaced, shot: f };
        break;
      }
      if (s.stage > TARGET) {
        const f = path.join(shotDir, '_play_end.png');
        await pg.shot(f);
        report = { result: 'TARGET_CLEARED', stage: s.stage, score: s.score, lives: s.lives, bombsPlaced: s.bombsPlaced, shot: f };
        break;
      }
    }
    if (!report) report = { result: 'TIMEOUT', stage: lastStage };
    console.log('REPORT', JSON.stringify(report));
  } catch (e) {
    console.log('ERR', e.message);
  } finally {
    b.close();
  }
})();
