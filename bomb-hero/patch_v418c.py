# -*- coding: utf-8 -*-
"""v4.18 patch C：伺服器端 —— 分享拿金幣 API（防作假：一次性 token ＋ 每平台一次 ＋ 每日上限）"""
import io, sys, shutil

def load(p):
    return io.open(p, 'rb').read().decode('utf-8').replace('\r\n', '\n')

def save(p, s):
    io.open(p, 'wb').write(s.replace('\n', '\r\n').encode('utf-8'))

fails = []

def apply(path, rules):
    s = load(path)
    ok = True
    for name, old, new in rules:
        n = s.count(old)
        if n != 1:
            print('❌ [%s] %s → hits %d（必須 1）' % (path, name, n))
            ok = False
            continue
        s = s.replace(old, new)
        print('✓ [%s] %s' % (path, name))
    if ok:
        save(path, s)
    else:
        fails.append(path)
    return ok

# ==================================================================== cloud.js
SHARE_HELPER = """  /* ================================================================
     v4.18：分享到社群平台拿金幣
     伺服器是唯一權威（前端改 localStorage 也刷不出金幣）：
       ① prepare 發一次性 token（HMAC 簽「帳號 + 平台 + nonce + 期限」，5 分鐘）
       ② claim 驗 token → 驗平台 → 驗沒領過 → 驗每日上限 → 才加金幣
       ③ 每個平台終身只能領一次，每天最多 3 次（記錄在帳號資料裡，重新部署也在）
     ================================================================ */
  const SHARE_PLATFORMS = ['line', 'fb', 'x', 'wa', 'copy'];
  const SHARE_REWARD = 1000;
  const SHARE_TTL = 5 * 60 * 1000;
  const SHARE_DAILY_MAX = 3;
  function shareState(a) {
    if (!a.share || typeof a.share !== 'object') a.share = {};
    if (!a.share.claimed || typeof a.share.claimed !== 'object') a.share.claimed = {};
    return a.share;
  }
  function shareDayKey(t) {
    const d = new Date(t || Date.now());
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }
  function shareToken(acc, platform, nonce, exp) {
    return crypto.createHmac('sha256', secret)
      .update('share|' + acc.id + '|' + platform + '|' + nonce + '|' + exp)
      .digest('hex').slice(0, 40);
  }
  function shareOut(acc) {
    const st = shareState(acc);
    const day = shareDayKey();
    return {
      claimed: st.claimed,
      day: day,
      n: st.day === day ? (st.n | 0) : 0,
      max: SHARE_DAILY_MAX,
      reward: SHARE_REWARD
    };
  }

  function publicAccount(acc) {"""
apply('../cloud.js', [
    ('share helper 與狀態', '  function publicAccount(acc) {', SHARE_HELPER),
    ('publicAccount 帶 share',
     """      hasPass: !!acc.pass,
      logins: acc.loginCount | 0,""",
     """      hasPass: !!acc.pass,
      logins: acc.loginCount | 0,
      share: shareOut(acc),            // v4.18：哪些平台領過分享金幣"""),
    ('路由白名單加 share',
     """    const isAdmin = p.indexOf('/api/admin/') === 0;
    if (!isAuth && !isRpg && !isAdmin) return false;""",
     """    const isAdmin = p.indexOf('/api/admin/') === 0;
    const isShare = p.indexOf('/api/share/') === 0;
    if (!isAuth && !isRpg && !isAdmin && !isShare) return false;"""),
    ('share 兩支 API',
     "      /* ---------------- 登入設定 ---------------- */",
     """      /* ---------------- v4.18：分享拿金幣 ---------------- */
      if (p === '/api/share/prepare' && req.method === 'POST') {
        if (!gate(req, res, 'share', 12, 3)) return true;
        const acc0 = session(req);
        if (!acc0) return fail(res, 401, 'NO_AUTH'), true;
        if (acc0.kind !== 'member') return fail(res, 403, 'NEED_LOGIN'), true;
        const body = await readJson(req, 1024);
        if (!body) return fail(res, 400, 'BAD_BODY'), true;
        const platform = String(body.platform || '');
        if (SHARE_PLATFORMS.indexOf(platform) < 0) return fail(res, 400, 'BAD_PLATFORM'), true;
        const st = shareState(acc0);
        if (st.claimed[platform]) return send(res, 409, { ok: false, err: 'ALREADY', share: shareOut(acc0) }), true;
        const day = shareDayKey();
        if (st.day !== day) { st.day = day; st.n = 0; }
        if ((st.n | 0) >= SHARE_DAILY_MAX) {
          return send(res, 429, { ok: false, err: 'DAILY_LIMIT', share: shareOut(acc0) }), true;
        }
        const nonce = rid(16), exp = Date.now() + SHARE_TTL;
        st.prep = { platform: platform, nonce: nonce, exp: exp };
        store.touch();
        return send(res, 200, {
          ok: true, token: shareToken(acc0, platform, nonce, exp), exp: exp, reward: SHARE_REWARD
        }), true;
      }

      if (p === '/api/share/claim' && req.method === 'POST') {
        if (!gate(req, res, 'share', 12, 3)) return true;
        const acc0 = session(req);
        if (!acc0) return fail(res, 401, 'NO_AUTH'), true;
        if (acc0.kind !== 'member') return fail(res, 403, 'NEED_LOGIN'), true;
        const body = await readJson(req, 1024);
        if (!body) return fail(res, 400, 'BAD_BODY'), true;
        const platform = String(body.platform || '');
        const token = String(body.token || '');
        const st = shareState(acc0);
        const prep = st.prep;
        if (!prep || prep.platform !== platform || !(prep.exp > Date.now())) {
          return send(res, 409, { ok: false, err: 'EXPIRED', share: shareOut(acc0) }), true;
        }
        if (shareToken(acc0, platform, prep.nonce, prep.exp) !== token) {
          stats.tamper++;
          return send(res, 409, { ok: false, err: 'BAD_TOKEN' }), true;
        }
        st.prep = null;                                   // 一次性：用完立刻作廢
        if (st.claimed[platform]) {
          return send(res, 409, { ok: false, err: 'ALREADY', share: shareOut(acc0) }), true;
        }
        const day = shareDayKey();
        if (st.day !== day) { st.day = day; st.n = 0; }
        if ((st.n | 0) >= SHARE_DAILY_MAX) {
          return send(res, 429, { ok: false, err: 'DAILY_LIMIT', share: shareOut(acc0) }), true;
        }
        st.claimed[platform] = Date.now();
        st.n = (st.n | 0) + 1;
        acc0.rpg.gold = Math.max(0, (acc0.rpg.gold | 0) + SHARE_REWARD);
        logEvent(acc0, 'share', { platform: platform, gold: acc0.rpg.gold | 0 });
        store.touch();
        return send(res, 200, {
          ok: true, reward: SHARE_REWARD, gold: acc0.rpg.gold | 0,
          share: shareOut(acc0), account: publicAccount(acc0)
        }), true;
      }

      /* ---------------- 登入設定 ---------------- */"""),
])

# ==================================================================== server.js
apply('../server.js', [
    ('轉發 /api/share/',
     """  if (url.pathname.indexOf('/api/auth/') === 0 ||
      url.pathname.indexOf('/api/rpg/') === 0 ||
      url.pathname.indexOf('/api/admin/') === 0) {""",
     """  if (url.pathname.indexOf('/api/auth/') === 0 ||
      url.pathname.indexOf('/api/rpg/') === 0 ||
      url.pathname.indexOf('/api/admin/') === 0 ||
      url.pathname.indexOf('/api/share/') === 0) {"""),
])

if fails:
    print('中止：%s 有規則沒命中' % ', '.join(fails))
    sys.exit(1)

# 同步到本機跑的那一份（bomberman-online/ 整個被 .gitignore）
for src, dst in [('../cloud.js', '../bomberman-online/cloud.js'), ('../server.js', '../bomberman-online/server.js')]:
    shutil.copyfile(src, dst)
    print('✓ 同步 %s → %s' % (src, dst))

print('完成')
