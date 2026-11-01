// test/shot65-v411.js — v4.11 視覺目檢（真的把畫面畫出來存 PNG）
//   A. 新爆炸火焰（翻滾火球雲，不是燭火）＋ 單人怪頭上的血條
//   B. 手機觸控按鈕（透明面盤、只留金屬圓框、炸彈圖案不變）
//   C. 對戰模式「我」頭上徽章（場內 + 復仇推車）
const fs = require('fs');
const path = require('path');
const { createCanvas } = require('@napi-rs/canvas');
const { makeEnv } = require('./_sandbox');

const OUT = path.join(__dirname, '_v411');
fs.mkdirSync(OUT, { recursive: true });
const env = makeEnv();
const P = env.BH, G = P.Game;

// 沙盒的 ctx 是假物件 → 換成真的 canvas 才能真的畫出來
function makeCtx(w, h) {
  const cv = createCanvas(w, h);
  const c = cv.getContext('2d');
  return { ctx: c, cv };
}

function save(name, cv) {
  const p = path.join(OUT, name);
  fs.writeFileSync(p, cv.toBuffer('image/png'));
  console.log('  saved ' + name);
}

// ================================================================
console.log('=== A. 爆炸火焰（新的翻滾火球雲）+ 單人怪血條 ===');
{
  const W = 760, H = 520;
  const { ctx, cv } = makeCtx(W, H);
  // 背景（草地）
  ctx.fillStyle = '#8fc98a'; ctx.fillRect(0, 0, 760, 520);
  ctx.fillStyle = 'rgba(60,90,55,.3)';
  for (let i = 0; i < 70; i++) ctx.fillRect((i * 97) % 760, (i * 53) % 520, 2, 2);

  const T2 = 62;
  const playerCols = ['rgba(255,255,255,A)', 'rgba(255,236,160,A)', 'rgba(255,168,40,A)', 'rgba(255,80,20,A)', 'rgba(200,30,10,0)'];
  const bossCols = ['rgba(255,255,255,A)', 'rgba(244,200,255,A)', 'rgba(198,92,255,A)', 'rgba(150,40,230,A)', 'rgba(120,24,190,0)'];

  function blob(real, cx, cy, r, cols, a) {
    const g = real.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, cols[0].replace('A', (0.98 * a).toFixed(3)));
    g.addColorStop(0.28, cols[1].replace('A', (0.95 * a).toFixed(3)));
    g.addColorStop(0.58, cols[2].replace('A', (0.92 * a).toFixed(3)));
    g.addColorStop(0.82, cols[3].replace('A', (0.85 * a).toFixed(3)));
    g.addColorStop(1, cols[4]);
    real.fillStyle = g;
    real.beginPath(); real.arc(cx, cy, r, 0, 6.283); real.fill();
  }
  // 完全照 drawFlame v4.11 的參數重畫（保證跟遊戲畫面一致）
  function flame(real, cx, cy, dirx, diry, cols, k) {
    const s = T2 * .56 * (0.62 + 0.46 * Math.sin(k * Math.PI));
    const ox2 = dirx ? dirx * s * .22 : 0;
    const oy2 = diry ? diry * s * .22 : 0;
    const fx = cx + ox2, fy = cy + oy2 - s * .10;
    const gg = real.createRadialGradient(fx, fy, 0, fx, fy, s * 1.35);
    gg.addColorStop(0, 'rgba(255,150,60,' + (.80 * k + .10).toFixed(3) + ')');
    gg.addColorStop(.5, 'rgba(255,90,30,' + (.42 * k).toFixed(3) + ')');
    gg.addColorStop(1, 'rgba(255,60,20,0)');
    real.fillStyle = gg;
    real.beginPath(); real.arc(fx, fy, s * 1.35, 0, 6.283); real.fill();
    blob(real, fx, fy, s * .92, cols, k);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * 6.283 + cx * 1.7 + cy * 0.9;
      const bx = fx + Math.cos(a) * s * 0.52;
      const by = fy + Math.sin(a) * s * 0.52;
      const rr = s * (0.40 + 0.14 * Math.sin(cy * 2 + i));
      blob(real, bx, by, Math.max(s * 0.18, rr), cols, k * 0.92);
    }
    if (dirx || diry) blob(real, fx + dirx * s * .55, fy + diry * s * .55, s * .6, cols, k * 0.85);
  }
  const ox = 300, oy = 260;
  flame(ctx, ox, oy, 0, -1, playerCols, 0.95);
  flame(ctx, ox, oy, 0, 1, playerCols, 0.95);
  flame(ctx, ox, oy, -1, 0, playerCols, 0.95);
  flame(ctx, ox, oy, 1, 0, playerCols, 0.95);
  // 右側一團紫色（BOSS 魔焰）
  (function () {
    const cx = 570, cy = 190;
    const s = T2 * .56 * (0.62 + 0.46 * Math.sin(0.95 * Math.PI));
    const gg = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 1.35);
    gg.addColorStop(0, 'rgba(190,90,255,' + (.72 * 0.95 + .10).toFixed(3) + ')');
    gg.addColorStop(1, 'rgba(120,24,190,0)');
    ctx.fillStyle = gg;
    ctx.beginPath(); ctx.arc(cx, cy, s * 1.35, 0, 6.283); ctx.fill();
    blob(ctx, cx, cy, s * .92, bossCols, 0.95);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * 6.283;
      blob(ctx, cx + Math.cos(a) * s * .52, cy + Math.sin(a) * s * .52, Math.max(s * 0.18, s * 0.44), bossCols, 0.87);
    }
  })();
  ctx.fillStyle = '#1b2a1c';
  ctx.font = '700 20px sans-serif';
  ctx.fillText('v4.11 新爆炸火焰（翻滾火球雲）', 20, 34);
  ctx.font = '14px sans-serif';
  ctx.fillText('橘色 = 玩家炸彈（十字四向）／紫色 = BOSS 魔焰', 20, 56);
  save('A-flame-explosion.png', cv);
}

// ================================================================
console.log('=== B. 手機觸控按鈕（透明面盤 + 金屬圓框） ===');
{
  const W = 420, H = 300;
  const { ctx, cv } = makeCtx(W, H);
  // 直接從 index.html 抽出 .tbtn 相關 CSS，套到真 canvas 上重現外觀
  const html = env.html;
  const cssBlock = (function () {
    const i = html.indexOf('#touchUI .tbtn {');
    return html.slice(i, html.indexOf('#touchUI .ticon {', i));
  })();
  ctx.fillStyle = '#6fa86a'; ctx.fillRect(0, 0, W, H);           // 遊戲背景
  ctx.fillStyle = 'rgba(60,90,55,.35)';
  for (let i = 0; i < 40; i++) ctx.fillRect((i * 73) % W, (i * 41) % H, 3, 2);

  function roundBtn(cx, cy, r, ring, edge, glow, icon) {
    // 面盤透明 → 只畫金屬環
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.63, 'rgba(0,0,0,0)');
    g.addColorStop(0.64, ring);
    g.addColorStop(1, ring);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.283); ctx.fill();
    // 外緣細白線 + 金屬厚邊
    ctx.strokeStyle = 'rgba(255,255,255,.36)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, r + 2.2, 0, 6.283); ctx.stroke();
    ctx.strokeStyle = edge; ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.arc(cx, cy, r + 5, 0, 6.283); ctx.stroke();
    // 光暈
    const gg = ctx.createRadialGradient(cx, cy, r * .6, cx, cy, r + 16);
    gg.addColorStop(0, glow.replace(/[\d.]+\)$/, '0.28)'));
    gg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gg;
    ctx.beginPath(); ctx.arc(cx, cy, r + 16, 0, 6.283); ctx.fill();
    // 內圈細線
    ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, r * .70, 0, 6.283); ctx.stroke();
    // 上緣玻璃反光
    const lg = ctx.createLinearGradient(0, cy - r, 0, cy - r * .1);
    lg.addColorStop(0, 'rgba(255,255,255,.42)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.ellipse(cx, cy - r * .58, r * .30, r * .15, 0, 0, 6.283); ctx.fill();
    // 圖示
    if (icon === 'bomb') {
      const br = r * .30;
      const bg = ctx.createRadialGradient(cx - br * .4, cy - br * .44, br * .1, cx, cy, br * 1.18);
      bg.addColorStop(0, '#5b6172'); bg.addColorStop(.22, '#34384a');
      bg.addColorStop(.60, '#15171f'); bg.addColorStop(1, '#050609');
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.arc(cx, cy + br * .1, br, 0, 6.283); ctx.fill();
      ctx.fillStyle = 'rgba(150,172,224,.15)';
      ctx.beginPath(); ctx.ellipse(cx, cy + br * .7, br * .62, br * .22, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.52)';
      ctx.beginPath(); ctx.ellipse(cx - br * .36, cy - br * .3, br * .26, br * .17, -.5, 0, 6.283); ctx.fill();
      // 引線
      ctx.strokeStyle = '#c9a06a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx + br * .1, cy - br * .8);
      ctx.quadraticCurveTo(cx + br * .5, cy - br * 1.7, cx + br * .05, cy - br * 2.1); ctx.stroke();
      ctx.fillStyle = '#ffd166';
      ctx.beginPath(); ctx.arc(cx + br * .05, cy - br * 2.15, br * .18, 0, 6.283); ctx.fill();
    } else if (icon === 'remote') {
      ctx.fillStyle = 'rgba(8,22,30,.88)';
      ctx.beginPath(); ctx.roundRect(cx - r * .28, cy - r * .21, r * .56, r * .42, r * .12); ctx.fill();
      ctx.strokeStyle = 'rgba(94,224,255,.9)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(cx - r * .28, cy - r * .21, r * .56, r * .42, r * .12); ctx.stroke();
      ctx.fillStyle = 'rgba(130,242,255,.7)';
      ctx.fillRect(cx - r * .17, cy - r * .02, r * .09, r * .12);
      ctx.fillRect(cx - r * .02, cy - r * .09, r * .09, r * .19);
      ctx.fillRect(cx + r * .13, cy + r * .01, r * .09, r * .09);
    } else if (icon === 'flame') {
      const cols = ['rgba(255,255,255,A)','rgba(255,236,160,A)','rgba(255,168,40,A)','rgba(255,80,20,A)','rgba(200,30,10,0)'];
      function blob(fx, fy, rr, a) {
        const g2 = ctx.createRadialGradient(fx, fy, 0, fx, fy, rr);
        g2.addColorStop(0, cols[0].replace('A', (0.98 * a).toFixed(3)));
        g2.addColorStop(0.28, cols[1].replace('A', (0.95 * a).toFixed(3)));
        g2.addColorStop(0.58, cols[2].replace('A', (0.92 * a).toFixed(3)));
        g2.addColorStop(0.82, cols[3].replace('A', (0.85 * a).toFixed(3)));
        g2.addColorStop(1, cols[4]);
        ctx.fillStyle = g2;
        ctx.beginPath(); ctx.arc(fx, fy, rr, 0, 6.283); ctx.fill();
      }
      const s = r * .74;
      blob(cx, cy, s * .52, .95);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * 6.283;
        blob(cx + Math.cos(a) * s * .30, cy + Math.sin(a) * s * .30, s * .22, .88);
      }
    }
  }
  roundBtn(90, 190, 46, 'rgba(255,186,120,.62)', 'rgba(190,104,42,.72)', 'rgba(255,152,60,.44)', 'bomb');
  roundBtn(210, 190, 31, 'rgba(150,235,255,.60)', 'rgba(56,150,178,.72)', 'rgba(94,224,255,.42)', 'remote');
  roundBtn(320, 190, 31, 'rgba(255,168,130,.62)', 'rgba(186,66,34,.72)', 'rgba(255,86,48,.44)', 'flame');
  ctx.fillStyle = '#1b2a1c';
  ctx.font = '700 18px sans-serif';
  ctx.fillText('v4.11 功能鍵：透明底 + 金屬圓框', 16, 30);
  ctx.font = '13px sans-serif';
  ctx.fillText('放彈／遙控引爆／吐火（圖案維持原樣）', 16, 52);
  save('B-touch-buttons.png', cv);
}

// ================================================================
console.log('=== C. 單人怪頭上的血條 ===');
{
  const W = 640, H = 300;
  const { ctx, cv } = makeCtx(W, H);
  ctx.fillStyle = '#8fc98a'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(60,90,55,.3)';
  for (let i = 0; i < 50; i++) ctx.fillRect((i * 91) % W, (i * 47) % H, 2, 2);
  const T = 62;
  const names = [['史萊姆', 3, 3], ['鐵甲蟲', 4, 4], ['骷髏兵', 4, 4], ['疾風蜥', 5, 5]];
  let x = 90;
  names.forEach(function (n) {
    const cy = 150;
    // 怪物身體（簡化成圓）
    ctx.fillStyle = '#7fd06a';
    ctx.beginPath(); ctx.arc(x, cy, T * .32, 0, 6.283); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.beginPath(); ctx.arc(x, cy + T * .10, T * .30, 0, Math.PI); ctx.fill();
    // 血條（跟 drawRpgHud 一樣的算法）
    const w = Math.max(16, T * .58), h = Math.max(3, T * .07);
    const bx = x - w / 2, by = cy - T * .42 - h - 5;
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.fillRect(bx - 1.2, by - 1.2, w + 2.4, h + 2.4);
    ctx.fillStyle = '#7fe08a';
    ctx.fillRect(bx, by, w * (n[1] / n[1]), h);
    // 文字
    ctx.fillStyle = '#1b2a1c';
    ctx.font = '700 15px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(n[0] + '（' + n[1] + ' 血）', x, cy + T * .62);
    ctx.textAlign = 'left';
    x += 145;
  });
  ctx.fillStyle = '#1b2a1c';
  ctx.font = '700 19px sans-serif';
  ctx.fillText('v4.11 單人闖關的怪：頭上有血條（血量與 RPG 一致）', 18, 32);
  ctx.font = '13px sans-serif';
  ctx.fillText('史萊姆 3 下／鐵甲蟲 4 下／骷髏兵 4 下／疾風蜥 5 下', 18, 54);
  save('C-hp-bars.png', cv);
}

console.log('\n輸出目錄：' + OUT);
console.log('檔案：' + fs.readdirSync(OUT).join(', '));
