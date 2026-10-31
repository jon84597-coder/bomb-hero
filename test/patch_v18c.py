# -*- coding: utf-8 -*-
# v1.8 補丁 C：場外推車「按住集氣」投彈
#   沒集氣 → 第 1 格（綠）／集一半 → 第 2 格（黃）／集滿 → 第 3 格（紅）
import io

p = 'index.html'
s = io.open(p, encoding='utf-8').read()


def rep(old, new, tag):
    global s
    assert old in s and s.count(old) == 1, 'MISS/DUP ' + tag + ' (count=%d)' % s.count(old)
    s = s.replace(old, new)
    print('OK', tag)


# ---------- 1. 抽出「選落點」邏輯，落點深度改成可指定（集氣等級） ----------
i = s.index('function cartThrowBomb(p) {')
j = s.index('  let cands = best ? [[best.x, best.y]] : [];')
assert i > 0 and j > i, 'cartThrowBomb 錨點失敗'
head = """// v1.8：場外推車「按住集氣」——沒集氣丟第 1 格、集一半丟第 2 格、集滿丟第 3 格
const CART_CHARGE_MAX = .6;                    // 集氣到滿所需秒數
const CART_LV = [
  { edge: 1, color: '#7ee08a', name: '第 1 格' },
  { edge: 2, color: '#ffd166', name: '第 2 格' },
  { edge: 3, color: '#ff5e7e', name: '第 3 格' }
];
function cartChargeLevel(t) {
  const q = (t || 0) / CART_CHARGE_MAX;
  return q >= 1 ? 2 : (q >= .42 ? 1 : 0);
}
// 計算這顆摩擦能量值（lv 0/1/2）應該落在哪一格（集氣時也要拿來畫預告框）
function cartPickLanding(p, lv) {
  const T = Game.T;
  const wantEdge = (CART_LV[lv == null ? 1 : lv] || CART_LV[1]).edge;
  const cx = Math.round(p.x / T - .5), cy = Math.round(p.y / T - .5);
  // 目標：場內「還活著、而且不在推車上」的人（AI 與人類同一規則）
  const prey = Game.players.filter(function (q) { return q !== p && q.alive && !q.cart; });
  // 落點限定在「場外邊緣往內第 wantEdge 格」的邊緣帶：
  // 從場外推車丟進來只丟得到靠牆的邊邊，不可能直接砸在人頭上
  let best = null, bs = Infinity;
  for (let y = 1; y < Game.rows - 1; y++) {
    for (let x = 1; x < Game.cols - 1; x++) {
      const edge = Math.min(x, y, Game.cols - 1 - x, Game.rows - 1 - y);
      if (edge > wantEdge) continue;                 // 集到第幾格，最多就丟到第幾格
      if (Game.grid[y][x] !== 0 || bombAt(x, y)) continue;
      const tx = x * T + T / 2, ty = y * T + T / 2;
      let d = 0;
      if (prey.length) {
        d = Infinity;
        for (let i = 0; i < prey.length; i++) d = Math.min(d, dist2(prey[i].x, prey[i].y, tx, ty));
        d = Math.sqrt(d);
      }
      // 優先丟在「集氣指定那一格」，差一格就扣分
      const depthPen = Math.abs(edge - wantEdge) * T * 1.35;
      const dcart = Math.abs(x - cx) + Math.abs(y - cy);
      // 丟得到的最遠距離有限（推車不是投石機）：超過 5 格幾乎不選，除非邊緣帶全滿
      const farPen = dcart > 5 ? T * 40 : 0;
      const s = d + depthPen + Math.max(0, dcart - 1) * T * 1.25 + farPen;
      if (s < bs) { bs = s; best = { x: x, y: y }; }
    }
  }
  return best;
}
function cartThrowBomb(p, lv) {
  const T = Game.T;
  const best = cartPickLanding(p, lv);
  const cx = Math.round(p.x / T - .5), cy = Math.round(p.y / T - .5);
"""
s = s[:i] + head + s[j:]
print('OK 抽出 cartPickLanding + 集氣等級')

# ---------- 2. updateCart：人類「按住集氣、放開投出」 ----------
rep("""      p.cartWantThrow = Math.random() < .55;""",
    """      p.cartWantThrow = Math.random() < .55;
      p.cartWantLv = rand(3);              // v1.8：AI 也會隨機選 1／2／3 格""",
    'AI 隨機集氣等級')

rep("""  // 丟彈入場（冷卻 1.6 秒）
  p.cartCd -= dt;
  const want = p.ai ? p.cartWantThrow : p.scheme.action();
  if (want && p.cartCd <= 0) {
    if (cartThrowBomb(p)) p.cartWantThrow = false;
  }
}""",
    """  // 丟彈入場（冷卻 1.6 秒）
  // v1.8：人類改成「按住動作鍵集氣、放開投出」——
  //       沒集氣→第 1 格、集一半→第 2 格、集滿→第 3 格（三段各有專屬顏色）
  p.cartCd -= dt;
  if (p.ai) {
    if (p.cartWantThrow && p.cartCd <= 0) {
      if (cartThrowBomb(p, p.cartWantLv == null ? 1 : p.cartWantLv)) p.cartWantThrow = false;
    }
  } else {
    const held = !!(p.scheme && p.scheme.actionHeld && p.scheme.actionHeld());
    if (p.cartCd > 0) {
      p.cartCharge = 0;                                  // 冷卻中 → 集氣歸零
    } else if (held) {
      p.cartCharge = Math.min(CART_CHARGE_MAX, (p.cartCharge || 0) + dt);
      if (!p.cartThrowHint) {                            // 第一次按住才提示，不吵
        p.cartThrowHint = true;
        toast('💪 按住放彈鍵集氣：綠＝第 1 格、黃＝第 2 格、紅＝第 3 格', 2.2);
      }
    } else if ((p.cartCharge || 0) > 0) {
      cartThrowBomb(p, cartChargeLevel(p.cartCharge));   // 放開 → 投出
      p.cartCharge = 0;
    }
  }
}""", 'updateCart 集氣邏輯')

# ---------- 3. 玩家物件：集氣欄位 ----------
rep("""    cart: false, cartCd: 0, cartDir: null, cartRevDist: 0, cartAiT: 0, cartAiDir: null, cartWantThrow: false,""",
    """    cart: false, cartCd: 0, cartDir: null, cartRevDist: 0, cartAiT: 0, cartAiDir: null, cartWantThrow: false,
    cartCharge: 0, cartWantLv: 1, cartThrowHint: false,   // v1.8：推車集氣""",
    'makePlayer 集氣欄位')

rep("""  p.cart = true; p.alive = false; p.dead = false; p.respawnT = 0;""",
    """  p.cart = true; p.alive = false; p.dead = false; p.respawnT = 0;
  p.cartCharge = 0; p.cartWantThrow = false;""", 'putOnCart 歸零')

rep("""  toast(pname(p) + ' 上復仇推車！（沿軌移動＋動作鍵＝拋彈入場）', 2);""",
    """  toast(pname(p) + ' 上復仇推車！（沿軌移動 · 按住動作鍵集氣拋彈：綠1格／黃2格／紅3格）', 2.6);""",
    '推車提示文字')

# ---------- 4. drawCart：集氣條（三段顏色）＋落點預告 ----------
rep("""    ctx.beginPath(); ctx.moveTo(x + 2, y - R * 2.1 - T * .10 + bob2); ctx.quadraticCurveTo(x + 6, y - R * 2.1 - T * .18 + bob2, x + 3, y - R * 2.1 - T * .20 + bob2); ctx.stroke();
    ctx.lineWidth = 1;
  }""",
    """    ctx.beginPath(); ctx.moveTo(x + 2, y - R * 2.1 - T * .10 + bob2); ctx.quadraticCurveTo(x + 6, y - R * 2.1 - T * .18 + bob2, x + 3, y - R * 2.1 - T * .20 + bob2); ctx.stroke();
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
  }""", 'drawCart 集氣指示')

# ---------- 5. 對外匯出（給測試用） ----------
rep("""  spawnEggs: spawnEggs, eggAt: eggAt, rideDino: rideDino, breakDino: breakDino, fireBreath: fireBreath,""",
    """  spawnEggs: spawnEggs, eggAt: eggAt, rideDino: rideDino, breakDino: breakDino, fireBreath: fireBreath,
  // v1.8
  takeEgg: takeEgg, CART_LV: CART_LV, CART_CHARGE_MAX: CART_CHARGE_MAX,
  cartChargeLevel: cartChargeLevel, cartPickLanding: cartPickLanding, AI_LEVELS: AI_LEVELS,""",
    '匯出 v1.8 API')

io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('bytes', len(s.encode('utf-8')))
