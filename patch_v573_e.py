# -*- coding: utf-8 -*-
"""v5.73 patch E: 深淵榜（前端 Lb + 後端 cloud.js）"""
import io, os

D = os.path.dirname(__file__)
PM = os.path.join(D, 'bomb-hero', 'js', 'main.js')
PC = os.path.join(D, 'cloud.js')

m = io.open(PM, 'r', encoding='utf-8', newline='').read()
c = io.open(PC, 'r', encoding='utf-8', newline='').read()
mo, co = len(m), len(c)

# ---------- 前端 ----------
A1 = """  submitWeek(week, name, ms) {
    return Lb._post(Lb.origin() + '/api/lb/submit', {
      mode: 'weekly', day: week || Gift.weekKey(), name: name || '', ms: Math.round(ms),
      deviceId: Lb.deviceId(), ver: VERSION
    });
  }
};"""
B1 = """  submitWeek(week, name, ms) {
    return Lb._post(Lb.origin() + '/api/lb/submit', {
      mode: 'weekly', day: week || Gift.weekKey(), name: name || '', ms: Math.round(ms),
      deviceId: Lb.deviceId(), ver: VERSION
    });
  },
  /* v5.73：深淵榜 —— 唯一「越大越好」的榜（ms 欄位存層數）。
     後端 day 固定 all（永久累計），比較方向也相反。 */
  topAbyss(limit) {
    return Lb._get(Lb.origin() + '/api/lb/top?mode=abyss&limit=' + (limit || 10))
      .then(function (j) {
        if (j && j.ok && j.list) { Lb.writeCache('abyss', j.list); return { list: j.list, online: true }; }
        const cc = Lb.readCache('abyss');
        return { list: (cc && cc.list) || [], online: false };
      }, function () {
        const cc = Lb.readCache('abyss');
        return { list: (cc && cc.list) || [], online: false };
      });
  },
  submitAbyss(layer, name) {
    const n = Math.max(1, Math.round(layer || 1));
    return Lb._post(Lb.origin() + '/api/lb/submit', {
      mode: 'abyss', day: 'all', name: name || '', ms: n,
      deviceId: Lb.deviceId(), ver: VERSION
    });
  }
};"""
assert m.count(A1) == 1, 'A1 %d' % m.count(A1)
m = m.replace(A1, B1)

# ---------- 後端 ----------
A2 = """  const LB_MODES = { daily: 1, weekly: 1 };   // v4.87：weekly = 每週榜（同一週同一關比秒數）"""
B2 = """  const LB_MODES = { daily: 1, weekly: 1, abyss: 1 };   // v4.87：weekly＝每週榜；v5.73：abyss＝深淵（比層數）"""
assert c.count(A2) == 1, 'A2 %d' % c.count(A2)
c = c.replace(A2, B2)

# lbSort 支援反向
A3 = """  function lbSort(list) {"""
B3 = """  /* v5.73：深淵是「層數越大越好」，其餘兩種是秒數越小越好 */
  function lbSort(list, desc) {"""
assert c.count(A3) == 1, 'A3 %d' % c.count(A3)
c = c.replace(A3, B3)

A4 = """    list.sort(function (a, b) { return (a.ms | 0) - (b.ms | 0) || (Number(a.at) || 0) - (Number(b.at) || 0); });"""
B4 = """    if (desc) list.sort(function (a, b) { return (b.ms | 0) - (a.ms | 0) || (Number(a.at) || 0) - (Number(b.at) || 0); });
    else list.sort(function (a, b) { return (a.ms | 0) - (b.ms | 0) || (Number(a.at) || 0) - (Number(b.at) || 0); });"""
assert c.count(A4) == 1, 'A4 %d' % c.count(A4)
c = c.replace(A4, B4)

A5 = """    const arr = (b && b.list) ? lbSort(b.list.slice()) : [];"""
B5 = """    const arr = (b && b.list) ? lbSort(b.list.slice(), mode === 'abyss') : [];"""
assert c.count(A5) == 1, 'A5 %d' % c.count(A5)
c = c.replace(A5, B5)

# TOP：abyss 的 day 固定 all
A6 = """        const weekly = mode === 'weekly';
        const qd = String(url.searchParams.get('day') || '');
        const day = weekly
          ? (lbWeekOk(qd) ? qd : lbThisWeek())
          : (lbDayOk(qd) ? qd : lbToday());"""
B6 = """        const weekly = mode === 'weekly';
        const abyss = mode === 'abyss';
        const qd = String(url.searchParams.get('day') || '');
        const day = abyss ? 'all'
          : weekly ? (lbWeekOk(qd) ? qd : lbThisWeek())
          : (lbDayOk(qd) ? qd : lbToday());"""
assert c.count(A6) == 1, 'A6 %d' % c.count(A6)
c = c.replace(A6, B6)

# SUBMIT：abyss 分支
A7 = """        const weekly = mode === 'weekly';
        const day = String(body.day || '');
        const today = weekly ? lbThisWeek() : lbToday();
        // 每日榜只收「今天」；每週榜只收「本週」（跨週後舊成績自動失效，不能補交）
        if (weekly ? !lbWeekOk(day) : !lbDayOk(day)) {
          return fail(res, 400, 'BAD_DAY', Object.assign({ today: today }, CORS_LB)), true;
        }
        if (day !== today) {
          return fail(res, 409, 'WRONG_DAY', Object.assign({ today: today }, CORS_LB)), true;
        }"""
B7 = """        const weekly = mode === 'weekly';
        const abyss = mode === 'abyss';
        const day = abyss ? 'all' : String(body.day || '');
        const today = abyss ? 'all' : weekly ? lbThisWeek() : lbToday();
        // 每日榜只收「今天」；每週榜只收「本週」（跨週後舊成績自動失效，不能補交）
        if (!abyss) {
          if (weekly ? !lbWeekOk(day) : !lbDayOk(day)) {
            return fail(res, 400, 'BAD_DAY', Object.assign({ today: today }, CORS_LB)), true;
          }
          if (day !== today) {
            return fail(res, 409, 'WRONG_DAY', Object.assign({ today: today }, CORS_LB)), true;
          }
        }"""
assert c.count(A7) == 1, 'A7 %d' % c.count(A7)
c = c.replace(A7, B7)

A8 = """        const ms = Math.round(Number(body.ms));
        if (!isFinite(ms) || ms < LB_MIN_MS || ms > LB_MAX_MS) return fail(res, 400, 'BAD_TIME', CORS_LB), true;"""
B8 = """        const ms = Math.round(Number(body.ms));
        /* v5.73：深淵存的是「層數」，不是毫秒 —— 上下限另外定 */
        if (abyss ? (!isFinite(ms) || ms < 1 || ms > 9999)
                  : (!isFinite(ms) || ms < LB_MIN_MS || ms > LB_MAX_MS)) {
          return fail(res, 400, abyss ? 'BAD_LAYER' : 'BAD_TIME', CORS_LB), true;
        }"""
assert c.count(A8) == 1, 'A8 %d' % c.count(A8)
c = c.replace(A8, B8)

# improved 方向
A9 = """        const improved = !mine || ms < (mine.ms | 0);"""
B9 = """        const improved = abyss ? (!mine || ms > (mine.ms | 0)) : (!mine || ms < (mine.ms | 0));"""
assert c.count(A9) == 1, 'A9 %d' % c.count(A9)
c = c.replace(A9, B9)

# 深淵不帶殘影（weekly 的規則）
A10 = """        const ghostPath = weekly ? '' : lbCleanPath(body.p);"""
B10 = """        const ghostPath = (weekly || abyss) ? '' : lbCleanPath(body.p);"""
assert c.count(A10) == 1, 'A10 %d' % c.count(A10)
c = c.replace(A10, B10)

assert m.count('\r\n') == 0 and c.count('\r\n') == 0, 'CRLF!'
for path, data in ((PM, m), (PC, c)):
    tmp = path + '.tmp'
    io.open(tmp, 'w', encoding='utf-8', newline='\n').write(data)
    os.replace(tmp, path)
print('OK js', mo, '->', len(m), '| cloud', co, '->', len(c))
