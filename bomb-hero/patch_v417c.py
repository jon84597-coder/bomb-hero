# -*- coding: utf-8 -*-
"""v4.17 patch C：小怪變多／RPG 血量回升／AI 變聰明／對戰 AI 丟炸彈／推車炸彈視覺"""
import io

P = 'index.html'
src = io.open(P, encoding='utf-8', newline='').read()
s = src.replace('\r\n', '\n')
rules = []

def R(name, old, new, cnt=1):
    rules.append((name, old, new, cnt))

# ---------- 1. 單人小怪變多 ----------
R('單人小怪變多',
  '''    const SOLO_WAVE = [6, 8, 9, 11, 12, 14, 15];
    const base0 = stage <= 7 ? SOLO_WAVE[stage - 1] : Math.min(20, 13 + Math.round((stage - 7) * .5));
    const base = soloIsBoss(stage) ? Math.round(base0 * .45) : base0;''',
  '''    // v4.17：小怪量再往上加（前 7 關 +約 35%，之後接連續成長，上限 26）
    const SOLO_WAVE = [8, 11, 12, 15, 16, 19, 20];
    const base0 = stage <= 7 ? SOLO_WAVE[stage - 1] : Math.min(26, 17 + Math.round((stage - 7) * .55));
    const base = soloIsBoss(stage) ? Math.round(base0 * .5) : base0;''')

# ---------- 2. RPG 小怪變多 ----------
R('RPG 小怪變多',
  '''  const n = Math.max(4, Math.round((5 + stage * .7) * (cols * rows) / (15 * 13)));''',
  '''  // v4.17：RPG 的小怪也變多（原 5 + 關號×0.7）
  const n = Math.max(6, Math.round((7 + stage * .95) * (cols * rows) / (15 * 13)));''')

# ---------- 3. RPG 血量回升 ----------
R('RPG 小怪血量回升',
  '''const FOE_HP = {
  slime: 2, mush: 2, crab: 2, beetle: 3, skull: 3, lizard: 4,
  bat: 2, ghost: 2, bee: 2, eye: 3
};''',
  '''const FOE_HP = {
  // v4.17：RPG 的怪血量整批調回來（小怪變多 + 血變厚 → 後段比較有壓力）
  slime: 3, mush: 3, crab: 3, beetle: 4, skull: 4, lizard: 5,
  bat: 3, ghost: 3, bee: 3, eye: 4
};''')

# ---------- 4. 疾風蜥也變聰明 ----------
R('疾風蜥加入聰明怪',
  '''  if (sp.id === 'skull' || sp.id === 'crab' || sp.id === 'beetle' || sp.id === 'eye') e.smart = true;''',
  '''  // v4.17：疾風蜥也會躲炸彈（跑最快的那隻不該傻傻撞火）
  if (sp.id === 'skull' || sp.id === 'crab' || sp.id === 'beetle' || sp.id === 'eye' ||
      sp.id === 'lizard') e.smart = true;''')

# ---------- 5. 追人的怪：挑最近的一格走（會轉彎、不踩火線） ----------
R('追蹤 AI 改成貪心選最近格',
  '''    if (best) {
      const dx = Math.sign(best.x - e.x), dy = Math.sign(best.y - e.y);
      const opts = [];
      if (Math.abs(best.x - e.x) > Math.abs(best.y - e.y)) {
        if (dx > 0) opts.push('right'); else if (dx < 0) opts.push('left');
        if (dy > 0) opts.push('down'); else if (dy < 0) opts.push('up');
      } else {
        if (dy > 0) opts.push('down'); else if (dy < 0) opts.push('up');
        if (dx > 0) opts.push('right'); else if (dx < 0) opts.push('left');
      }
      for (let i = 0; i < opts.length; i++) {
        const d = DIRS[opts[i]];
        if (cellAt(cx + d.x, cy + d.y) === 0 && !bombAt(cx + d.x, cy + d.y)) { e.dirName = opts[i]; e.dirT = .4; break; }
      }
    }''',
  '''    if (best) {
      // v4.17：不再只會「先水平再垂直」→ 四個方向都算距離，挑真的最近的那一格走
      //   （迷宮裡會自己轉彎追人），而且不踩火線／炸彈範圍
      const cand = [];
      ['up', 'down', 'left', 'right'].forEach(function (dn) {
        const d = DIRS[dn];
        const nx = cx + d.x, ny = cy + d.y;
        if (cellAt(nx, ny) !== 0 || bombAt(nx, ny)) return;
        if (dangerAt(nx, ny, null)) return;
        const nd = dist2(best.x, best.y, (nx + .5) * T, (ny + .5) * T);
        cand.push({ dn: dn, d: nd + Math.random() * T * T * .12 });
      });
      if (cand.length) {
        cand.sort(function (a, b) { return a.d - b.d; });
        e.dirName = cand[0].dn;
        e.dirT = .4;
      }
    }''')

# ---------- 6. 飛行怪更會追人 ----------
R('飛行怪追人機率提高',
  '''    if (best && Math.random() < .35) {
      a = Math.atan2(best.y - e.y, best.x - e.x) + (Math.random() - .5) * .9;   // v4.7：不再直直撞過來
    } else {''',
  '''    if (best && Math.random() < .48) {
      a = Math.atan2(best.y - e.y, best.x - e.x) + (Math.random() - .5) * .7;   // v4.17：追人機率 35% → 48%
    } else {''')

# ---------- 7. AI 難度加入丟炸彈參數 ----------
R('AI 難度加入隔牆丟彈',
  '''  weak:   { think: [.5, 1.0], chase: .35, bomb: .28, flee: .55, spd: .82, foeR: 2.6, soft: .5,  dinoFire: .10, dinoFireCd: 3.2 },
  normal: { think: [.2, .5],  chase: 1,   bomb: .85, flee: 1,   spd: 1,   foeR: 3.4, soft: 1,   dinoFire: .20, dinoFireCd: 2.5 },
  strong: { think: [.09, .2], chase: 1,   bomb: .97, flee: 1,   spd: 1.15, foeR: 4.8, soft: 1,  dinoFire: .34, dinoFireCd: 1.9 }''',
  '''  // v4.17：lob = 隔牆「丟」炸彈的機率、lobCd = 丟完的冷卻秒數
  weak:   { think: [.5, 1.0], chase: .35, bomb: .28, flee: .55, spd: .82, foeR: 2.6, soft: .5,  dinoFire: .10, dinoFireCd: 3.2, lob: .22, lobCd: 5.2 },
  normal: { think: [.2, .5],  chase: 1,   bomb: .85, flee: 1,   spd: 1,   foeR: 3.4, soft: 1,   dinoFire: .20, dinoFireCd: 2.5, lob: .52, lobCd: 3.4 },
  strong: { think: [.09, .2], chase: 1,   bomb: .97, flee: 1,   spd: 1.15, foeR: 4.8, soft: 1,  dinoFire: .34, dinoFireCd: 1.9, lob: .78, lobCd: 2.5 }''')

# ---------- 8. 玩家物件加 lobCd ----------
R('玩家增加丟彈冷卻欄位',
  '''    cartCharge: 0, cartWantLv: 1, cartThrowHint: false,   // v1.8：推車集氣''',
  '''    cartCharge: 0, cartWantLv: 1, cartThrowHint: false,   // v1.8：推車集氣
    lobCd: 0,                                      // v4.17：AI 隔牆丟炸彈的冷卻''')

# ---------- 9. aiLobBomb + controlAI 接線 ----------
R('新增 AI 丟炸彈函式',
  '''function controlAI(p, dt) {
  const T = Game.T;
  const lv = aiLevelCfg();
  tickSkull(p, dt);''',
  '''// v4.17：AI 丟炸彈 —— 從自己這一格拋到對手腳下（越過牆壁），落地才開始倒數
function aiLobBomb(p, foe) {
  if (!p || !p.alive || !foe || !foe.alive) return false;
  const T = Game.T;
  const cx = Math.floor(p.x / T), cy = Math.floor(p.y / T);
  let tx = Math.floor(foe.x / T), ty = Math.floor(foe.y / T);
  function ok(x, y) {
    return x > 0 && y > 0 && x < Game.cols - 1 && y < Game.rows - 1 &&
      cellAt(x, y) === 0 && !bombAt(x, y);
  }
  if (!ok(tx, ty)) {
    const cand = [[tx + 1, ty], [tx - 1, ty], [tx, ty + 1], [tx, ty - 1]].filter(function (c) {
      return ok(c[0], c[1]);
    });
    if (!cand.length) return false;
    tx = cand[0][0]; ty = cand[0][1];
  }
  if (tx === cx && ty === cy) return false;
  const dist = Math.abs(tx - cx) + Math.abs(ty - cy);
  Game.bombs.push({
    cx: tx, cy: ty, px: (cx + .5) * T, py: (cy + .5) * T,
    timer: 2.2, power: 1, owner: p, passers: [],
    remoteArmed: false, mine: false, moving: null, held: false, seed: Math.random() * 6.28,
    lobbed: true,
    flying: { fx: cx, fy: cy, tx: tx, ty: ty, t: 0, dur: Math.min(.9, .14 + dist * .055),
              path: [{ x: cx, y: cy }, { x: tx, y: ty }] }
  });
  AudioSys.sfx('throw');
  return true;
}
function controlAI(p, dt) {
  const T = Game.T;
  const lv = aiLevelCfg();
  tickSkull(p, dt);
  if (p.lobCd > 0) p.lobCd -= dt;''')

R('AI 鎖定目標帶上玩家物件',
  '''      let tgt = null, bestD = Infinity;
      Game.players.forEach(function (q) {
        if (q !== p && q.alive && !playerHiding(q)) {   // v4.16：躲在樹叢裡的對手 AI 看不到
          const dd = dist2(q.x, q.y, p.x, p.y);
          if (dd < bestD) { bestD = dd; tgt = { x: q.x, y: q.y, foe: true }; }
        }
      });''',
  '''      let tgt = null, bestD = Infinity;
      Game.players.forEach(function (q) {
        if (q !== p && q.alive && !playerHiding(q)) {   // v4.16：躲在樹叢裡的對手 AI 看不到
          const dd = dist2(q.x, q.y, p.x, p.y);
          if (dd < bestD) { bestD = dd; tgt = { x: q.x, y: q.y, foe: true, p: q }; }
        }
      });''')

R('AI 判斷丟炸彈',
  '''        if ((nearFoe || (nearSoft && Math.random() < lv.soft)) && Math.random() < lv.bomb) placeBomb(p);
      }''',
  '''        if ((nearFoe || (nearSoft && Math.random() < lv.soft)) && Math.random() < lv.bomb) placeBomb(p);
        // v4.17：對戰 AI 也會「丟」炸彈 —— 對手在 2~6 格內就隔牆拋一顆過去
        if (tgt && tgt.foe && tgt.p && (p.lobCd || 0) <= 0 && mineCount < p.maxBombs && !p.carry &&
            bestD > (T * 1.8) * (T * 1.8) && bestD < (T * 6) * (T * 6) &&
            Math.random() < (lv.lob == null ? .5 : lv.lob)) {
          if (aiLobBomb(p, tgt.p)) p.lobCd = (lv.lobCd || 3.4) + Math.random() * 1.2;
        }
      }''')

# ---------- 10. 推車：手上拿一顆引燃炸彈 + 明顯的集氣條 + 明顯的落點 ----------
OLD_CART = '''  // 可投彈指示（冷卻完成時頭上出現小炸彈）
  if (p.cartCd <= 0) {
    const bob2 = Math.sin(Game.gameT * 6) * 2;
    ctx.fillStyle = '#1b2430';
    ctx.beginPath(); ctx.arc(x, y - R * 2.1 + bob2, T * .10, 0, 6.283); ctx.fill();
    ctx.strokeStyle = '#b8862d';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(x + 2, y - R * 2.1 - T * .10 + bob2); ctx.quadraticCurveTo(x + 6, y - R * 2.1 - T * .18 + bob2, x + 3, y - R * 2.1 - T * .20 + bob2); ctx.stroke();
    ctx.lineWidth = 1;
  }
  // v1.8：集氣中 → 頭上三色集氣條 ＋ 場內落點預告框
  const chg = p.cartCharge || 0;
  if (chg > 0 && p.cartCd <= 0) {
    const lvNow = cartChargeLevel(chg);
    const cur = CART_LV[lvNow];
    const q = Math.min(1, chg / CART_CHARGE_MAX);
    // 落點預告（看得見這顆會掉在哪一格）
    const land = cartPickLanding(p, lvNow);
    if (land) {
      const lx = land.x * T + T / 2, ly = land.y * T + T / 2;
      const pulse = .42 + Math.sin(Game.gameT * 12) * .2;
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = cur.color;
      ctx.lineWidth = Math.max(2, T * .07);
      ctx.strokeRect(lx - T * .42, ly - T * .42, T * .84, T * .84);
      ctx.beginPath(); ctx.arc(lx, ly, T * .12, 0, 6.283);
      ctx.fillStyle = cur.color; ctx.fill();
      ctx.lineWidth = 1;
      ctx.globalAlpha = 1;
    }
    // 三色集氣條（底色：第1格綠 / 第2格黃 / 第3格紅）
    const bw = T * .80, bh = Math.max(4, T * .11);
    const bx0 = x - bw / 2, by0 = y - R * 2.62;
    const cuts = [0, .42, 1];
    for (let k = 0; k < 3; k++) {
      const x0 = bx0 + bw * cuts[k], x1 = bx0 + bw * (k === 2 ? 1 : cuts[k + 1]);
      ctx.globalAlpha = .28;
      ctx.fillStyle = CART_LV[k].color;
      ctx.fillRect(x0, by0, x1 - x0, bh);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = cur.color;
    ctx.fillRect(bx0, by0, bw * q, bh);
    ctx.strokeStyle = 'rgba(255,255,255,.6)';
    ctx.strokeRect(bx0, by0, bw, bh);
    // 文字：現在會丟到第幾格
    ctx.font = '900 ' + Math.max(9, Math.round(T * .21)) + 'px "Microsoft JhengHei", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillStyle = cur.color;
    ctx.fillText(cur.name, x, by0 - 2);
    ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
  }'''

NEW_CART = '''  // v4.17：車上的人「手上一定拿著一顆炸彈」，而且長得跟放在地上一模一樣
  //   （同一套 drawBombArt：黑曜球體、金屬蓋、會燒的引線）+ 引線即時火花
  const chg = p.cartCharge || 0;
  const qChg = Math.min(1, chg / CART_CHARGE_MAX);
  {
    const hotHold = p.cartCd <= 0;                       // 沒在冷卻 → 引線正在燒（會閃）
    const suck = qChg * T * .07;                         // 集氣越多 → 拿得越高
    const shake = qChg > 0 ? Math.sin(Game.gameT * 42) * qChg * 1.7 : 0;
    ctx.save();
    ctx.translate(x + T * .31 + shake, y - T * .58 - suck + wob * .4);
    ctx.rotate(-.30 + Math.sin(Game.gameT * 3.2) * .05);
    const holdR = T * .23 * (1 + qChg * .16);
    drawBombArt(holdR, 2.4, hotHold, true, false, Math.min(1, qChg * 1.15));
    ctx.restore();
    // 引線末端火花（畫在最上層，「引燃中」一眼就看得出來）
    const tipX = x + T * .41 + shake, tipY = y - T * .58 - suck - T * .40 + wob * .4;
    const sp2 = .5 + .5 * Math.sin(Game.gameT * 26);
    ctx.globalAlpha = .55 + .45 * sp2;
    ctx.fillStyle = 'rgba(255,170,60,.55)';
    ctx.beginPath(); ctx.arc(tipX, tipY, Math.max(2.6, T * .10 * (1 + sp2)), 0, 6.283); ctx.fill();
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath(); ctx.arc(tipX, tipY, Math.max(1.4, T * .045 * (1 + sp2 * .5)), 0, 6.283); ctx.fill();
    ctx.globalAlpha = 1;
  }
  // v4.17：集氣條「永遠顯示」而且做大做亮（沒按也看得懂可以集氣）
  {
    const lvNow = cartChargeLevel(chg);
    const cur = CART_LV[lvNow];
    const q = qChg;
    const ready = p.cartCd <= 0;
    const bw = T * 1.26, bh = Math.max(8, T * .19);
    const bx0 = x - bw / 2, by0 = y - R * 3.30;
    ctx.fillStyle = 'rgba(7,11,22,.86)';
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(bx0 - 4, by0 - 4, bw + 8, bh + 8, 6); ctx.fill(); }
    else ctx.fillRect(bx0 - 4, by0 - 4, bw + 8, bh + 8);
    ctx.strokeStyle = ready ? 'rgba(255,255,255,.55)' : 'rgba(140,155,185,.4)';
    ctx.lineWidth = 1.6;
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(bx0 - 4, by0 - 4, bw + 8, bh + 8, 6); ctx.stroke(); }
    else ctx.strokeRect(bx0 - 4, by0 - 4, bw + 8, bh + 8);
    const cuts = [0, .42, 1];
    for (let k = 0; k < 3; k++) {
      const x0 = bx0 + bw * cuts[k], x1 = bx0 + bw * (k === 2 ? 1 : cuts[k + 1]);
      ctx.globalAlpha = ready ? .34 : .16;
      ctx.fillStyle = CART_LV[k].color;
      ctx.fillRect(x0, by0, Math.max(0, x1 - x0), bh);
      ctx.globalAlpha = 1;
    }
    if (q > 0) {
      ctx.fillStyle = cur.color;
      ctx.fillRect(bx0, by0, bw * q, bh);
      ctx.strokeStyle = 'rgba(255,255,255,' + (.55 + .45 * Math.sin(Game.gameT * 14)).toFixed(2) + ')';
      ctx.lineWidth = 2.4;
      ctx.strokeRect(bx0, by0, bw * q, bh);
      ctx.lineWidth = 1;
    }
    ctx.strokeStyle = 'rgba(6,10,18,.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx0 + bw * .42, by0); ctx.lineTo(bx0 + bw * .42, by0 + bh);
    ctx.stroke();
    ctx.lineWidth = 1;
    // 文字：集氣 % ＋ 會丟到第幾格（冷卻時顯示剩餘秒數）
    ctx.font = '900 ' + Math.max(10, Math.round(T * .24)) + 'px "Microsoft JhengHei", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    const label = ready
      ? ('集氣 ' + Math.round(q * 100) + '%　' + cur.name)
      : ('冷卻 ' + Math.max(0, p.cartCd).toFixed(1) + 's');
    ctx.strokeStyle = 'rgba(4,8,16,.92)';
    ctx.lineWidth = 3;
    ctx.strokeText(label, x, by0 - 5);
    ctx.lineWidth = 1;
    ctx.fillStyle = ready ? cur.color : '#9aa7c4';
    ctx.fillText(label, x, by0 - 5);
    ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
    // 落點預告（永遠顯示：沒集氣是淡的，集氣會整格亮起來 + 跑虛線 + 準心 + 第幾格）
    const land = cartPickLanding(p, lvNow);
    if (land) {
      const lx = land.x * T, ly = land.y * T;
      const cxp = lx + T / 2, cyp = ly + T / 2;
      const pulse = .5 + .5 * Math.sin(Game.gameT * 9);
      const bright = ready ? (chg > 0 ? .75 + .25 * pulse : .34) : .16;
      ctx.globalAlpha = bright * .55;
      ctx.fillStyle = cur.color;
      ctx.fillRect(lx + 2, ly + 2, T - 4, T - 4);
      ctx.globalAlpha = 1;
      ctx.save();
      ctx.globalAlpha = Math.min(1, bright + .2);
      ctx.strokeStyle = cur.color;
      ctx.lineWidth = Math.max(3, T * .09);
      ctx.setLineDash([T * .26, T * .14]);
      ctx.lineDashOffset = -Game.gameT * T * 1.1;
      ctx.strokeRect(lx + T * .07, ly + T * .07, T * .86, T * .86);
      ctx.restore();
      // 中央準心 ＋ 第幾格數字
      ctx.globalAlpha = Math.min(1, bright + .35);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1.6, T * .045);
      ctx.beginPath(); ctx.arc(cxp, cyp, T * .20, 0, 6.283); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cxp - T * .13, cyp); ctx.lineTo(cxp + T * .13, cyp);
      ctx.moveTo(cxp, cyp - T * .13); ctx.lineTo(cxp, cyp + T * .13);
      ctx.stroke();
      ctx.font = '900 ' + Math.round(T * .30) + 'px "Microsoft JhengHei", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#0a1020';
      ctx.fillText(String(CART_LV[lvNow].edge), cxp, cyp + T * .03);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(String(CART_LV[lvNow].edge), cxp, cyp);
      ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
      ctx.lineWidth = 1;
      // 從推車到落點的瞄準虛線（看得出來「這顆會丟到哪」）
      ctx.save();
      ctx.globalAlpha = Math.min(.75, bright);
      ctx.strokeStyle = cur.color;
      ctx.lineWidth = Math.max(2, T * .035);
      ctx.setLineDash([T * .16, T * .12]);
      ctx.lineDashOffset = -Game.gameT * T * .8;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(cxp, cyp); ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1;
    }
  }'''

R('推車炸彈與集氣條重製', OLD_CART, NEW_CART)

# ---------- 套用 ----------
for name, old, new, cnt in rules:
    n = s.count(old)
    assert n == cnt, '規則「%s」命中 %d 次（預期 %d）' % (name, n, cnt)
    s = s.replace(old, new)
    print('  ok  ' + name)

io.open(P, 'w', encoding='utf-8', newline='').write(s.replace('\n', '\r\n'))
print('patch C done')
