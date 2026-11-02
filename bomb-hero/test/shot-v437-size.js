// v4.37：小怪尺寸確認圖（兩張）
//   A. size-all.png      48 隻新尺寸全表 ＋ 主角高度紅虛線 ＋ 倍率
//   B. size-diff.png     變化最大的 12 隻：左灰＝舊、右彩＝新
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const OUT = path.join(__dirname, '_v437');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) { }
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

const OLD_HS = {
  slime: 1.95, bunny: 2.30, frog: 1.88, cater: 1.92, mush: 1.95, beetle: 1.74,
  crab: 2.25, mummy: 2.05, eye: 2.35, sandworm: 2.10, dune: 2.11, scorp: 2.02,
  penguin: 2.30, crystal: 2.10, bat: 2.05, snowball: 2.25, seal: 2.10, panda: 2.475,
  lavaslime: 2.31, lavaworm: 2.37, bee: 2.02, bomber: 2.21, lizard: 1.45, rockling: 1.55,
  wisp: 1.882, scavenger: 2.044, robot: 2.158, pulser: 2.366, laserbee: 2.374, neonbot: 2.309,
  octopus: 2.058, angler: 2.682, ghost: 1.667, hermit: 1.647, jelly: 1.667, urchin: 2.151,
  hornet: 1.857, airship: 1.365, sapper: 1.907, thunder: 2.317, windwisp: 2.317, galehawk: 1.104,
  skull: 1.656, imp: 2.259, darkbat: 1.104, wizard: 1.936, royalguard: 2.259, deathknight: 1.882
};

(async () => {
  const b = await launch({ port: 9531, w: 1900, h: 1300 });
  try {
    const p = await b.newPage();
    await p.goto(URL, 2600);
    for (let i = 0; i < 90; i++) {
      if (await p.eval('!!(window.__BH && window.__BH.FoeArt && window.__BH.FoeArt.readyCount() >= 48)')) break;
      await sleep(300);
    }
    console.log('FoeArt ready', await p.eval('window.__BH.FoeArt.readyCount()'));

    // ---------- A：新尺寸全表 ----------
    const A = await p.eval(`(function(){
      var BH = window.__BH, G = BH.Game;
      BH.settings.size='M'; BH.startSolo(1,false); G.state='play';
      var heroH = G.T * 0.40 * 3.75 * BH.HERO_ART_SCALE;
      var ids = Object.keys(BH.FOE_ART);
      ids.sort(function(a,b){
        return (BH.FOE_ART[b].hs * BH.enemyArtR({r: BH.speciesOf(b).r})) -
               (BH.FOE_ART[a].hs * BH.enemyArtR({r: BH.speciesOf(a).r}));
      });
      var COLS = 8, CW = 232, CH = 196, HDR = 34;
      var rowsN = Math.ceil(ids.length / COLS);
      var W = COLS * CW, H = HDR + rowsN * CH;
      var c = document.createElement('canvas'); c.width = W; c.height = H;
      var g = c.getContext('2d');
      g.fillStyle = '#2a2119'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#f2e6cc'; g.font = 'bold 18px sans-serif'; g.textAlign = 'left';
      g.fillText('v4.37 小怪尺寸總表  ──  紅虛線＝主角身高（' + heroH.toFixed(0) + 'px），數字＝怪物高 / 主角高', 14, 24);

      var out = [];
      ids.forEach(function(id, i){
        var col = i % COLS, row = Math.floor(i / COLS);
        var cx0 = col * CW, cy0 = HDR + row * CH;
        var base = cy0 + CH - 30;
        var art = BH.FOE_ART[id], sp = BH.speciesOf(id);
        var R = BH.enemyArtR({ r: sp.r });
        var Hn = R * art.hs, Wn = Hn * art.asp, k = Hn / heroH;
        out.push({ id: id, k: +k.toFixed(2), H: Math.round(Hn), W: Math.round(Wn) });

        g.fillStyle = (row % 2 ? '#332a20' : '#3a3027');
        g.fillRect(cx0 + 1, cy0 + 1, CW - 2, CH - 2);

        // 主角高度紅虛線
        var yh = Math.round(base - heroH) + .5;
        g.strokeStyle = 'rgba(255,86,86,.75)'; g.lineWidth = 1; g.setLineDash([5, 4]);
        g.beginPath(); g.moveTo(cx0 + 6, yh); g.lineTo(cx0 + CW - 6, yh); g.stroke();
        g.setLineDash([]);

        // 腳底線
        g.strokeStyle = 'rgba(255,240,200,.20)';
        g.beginPath(); g.moveTo(cx0 + 6, base + .5); g.lineTo(cx0 + CW - 6, base + .5); g.stroke();

        var e = BH.makeEnemy(3, 3, id, 1, 1);
        e.bobP = 0.7;
        BH.drawFoeSprite(g, id, e, cx0 + CW / 2, base - R * 0.95, R, 0);

        // 文字
        g.textAlign = 'left';
        g.font = 'bold 12px sans-serif'; g.fillStyle = '#f7ecd4';
        g.fillText(id, cx0 + 8, cy0 + 16);
        if ((BH.FOE_TIER[id] || '') === 'high') {
          g.font = 'bold 9px sans-serif'; g.fillStyle = '#d795ff';
          g.fillText('HIGH', cx0 + 8 + g.measureText(id).width + 18, cy0 + 15);
        }
        g.textAlign = 'right';
        g.font = 'bold 13px sans-serif';
        g.fillStyle = k >= 1 ? '#ff9b6b' : '#8ecf9e';
        g.fillText(k.toFixed(2) + '×', cx0 + CW - 8, cy0 + 16);
        g.font = '9px sans-serif'; g.fillStyle = '#a8997f';
        g.fillText(Math.round(Hn) + 'px / W' + Math.round(Wn), cx0 + CW - 8, cy0 + 29);
      });

      document.body.innerHTML = '';
      document.body.style.cssText = 'margin:0;padding:0;background:#2a2119';
      document.body.appendChild(c);
      return { W: W, H: H, rows: out };
    })()`);
    await p.resize(A.W, A.H); await sleep(400);
    await p.shot(path.join(OUT, 'size-all.png'));
    console.log('A ok', A.W + 'x' + A.H);

    // ---------- B：變化最大的 12 隻前後對照 ----------
    const B = await p.eval(`(function(){
      var BH = window.__BH, G = BH.Game;
      var OLD = ${JSON.stringify(OLD_HS)};
      var heroH = G.T * 0.40 * 3.75 * BH.HERO_ART_SCALE;
      var ids0 = Object.keys(BH.FOE_ART);
      ids0.sort(function(a,b){
        function k(id){ return BH.FOE_ART[id].hs * BH.enemyArtR({r: BH.speciesOf(id).r}) / heroH; }
        return Math.abs(k(b) - (OLD[b] * BH.enemyArtR({r:BH.speciesOf(b).r}) / heroH))
             - Math.abs(k(a) - (OLD[a] * BH.enemyArtR({r:BH.speciesOf(a).r}) / heroH));
      });
      var ids = ids0.slice(0, 12);
      var COLS = 4, CW = 330, CH = 232, HDR = 40;
      var rowsN = Math.ceil(ids.length / COLS);
      var W = COLS * CW, H = HDR + rowsN * CH;
      var c = document.createElement('canvas'); c.width = W; c.height = H;
      var g = c.getContext('2d');
      g.fillStyle = '#2a2119'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#f2e6cc'; g.font = 'bold 17px sans-serif'; g.textAlign = 'left';
      g.fillText('v4.37 變化最大的 12 隻  ──  左＝v4.36 舊尺寸（灰）   右＝v4.37 新尺寸（彩）', 14, 26);
      ids.forEach(function(id, i){
        var col = i % COLS, row = Math.floor(i / COLS);
        var cx0 = col * CW, cy0 = HDR + row * CH;
        var base = cy0 + CH - 34;
        var art = BH.FOE_ART[id], sp = BH.speciesOf(id);
        var R = BH.enemyArtR({ r: sp.r });
        var Hn = R * art.hs, Ho = R * OLD[id];
        g.fillStyle = (row % 2 ? '#332a20' : '#3a3027');
        g.fillRect(cx0 + 1, cy0 + 1, CW - 2, CH - 2);
        var yh = Math.round(base - heroH) + .5;
        g.strokeStyle = 'rgba(255,86,86,.55)'; g.lineWidth = 1; g.setLineDash([5, 4]);
        g.beginPath(); g.moveTo(cx0 + 6, yh); g.lineTo(cx0 + CW - 6, yh); g.stroke();
        g.setLineDash([]);
        g.strokeStyle = 'rgba(255,240,200,.20)';
        g.beginPath(); g.moveTo(cx0 + 6, base + .5); g.lineTo(cx0 + CW - 6, base + .5); g.stroke();

        var e = BH.makeEnemy(3, 3, id, 1, 1); e.bobP = .7;
        var ey = base - R * .95, keep = art.hs;
        art.hs = OLD[id];
        BH.drawFoeSprite(g, id, e, cx0 + CW * .27, ey, R, 0);
        art.hs = keep;
        BH.drawFoeSprite(g, id, e, cx0 + CW * .73, ey, R, 0);

        g.textAlign = 'left'; g.font = 'bold 12px sans-serif'; g.fillStyle = '#f7ecd4';
        g.fillText(id, cx0 + 8, cy0 + 16);
        g.font = '11px sans-serif';
        g.fillStyle = '#9b8a6e';
        g.fillText('舊 ' + (Ho / heroH).toFixed(2) + '×  →  ', cx0 + 8, cy0 + 32);
        var wdt = g.measureText('舊 ' + (Ho / heroH).toFixed(2) + '×  →  ').width;
        g.fillStyle = '#7fe0a0';
        g.fillText('新 ' + (Hn / heroH).toFixed(2) + '×', cx0 + 8 + wdt, cy0 + 32);
      });
      document.body.innerHTML = '';
      document.body.style.cssText = 'margin:0;padding:0;background:#2a2119';
      document.body.appendChild(c);
      return { W: W, H: H };
    })()`);
    await p.resize(B.W, B.H); await sleep(400);
    await p.shot(path.join(OUT, 'size-diff.png'));
    console.log('B ok', B.W + 'x' + B.H);

    fs.writeFileSync(path.join(OUT, 'size-all.txt'),
      'id            H(px)  W(px)  H/主角\n' +
      A.rows.map(function (r) {
        return (r.id + '             ').slice(0, 13) + String(r.H).padStart(5) +
          String(r.W).padStart(7) + '   ' + r.k.toFixed(2);
      }).join('\n') + '\n');
  } finally {
    await b.close();
  }
})();
