# -*- coding: utf-8 -*-
# v4.13 伺服器端修補（cloud.js）
#   ① 帳號在改版後消失 → 部署時的持久化：加 render.yaml（Render Blueprint 掛磁碟）
#      ＋ 程式端偵測「資料夾不是持久化」時在後台顯示警告
#   ② 「維持登入」：登入/註冊時帶 keep=true → cookie Max-Age 拉長（30 天 → 1 年）
#   ③ 後台 API 在資料夾非持久化時附上警告旗標（前端顯示）
import io, os

# 這個腳本從 bomb-hero/ 執行 → cloud.js 在上一層（部署用）與同層的 bomberman-online/
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)          # 專案根（部署用：cloud.js / server.js）
PATH = os.path.join(ROOT, 'cloud.js')
src = io.open(PATH, encoding='utf-8', newline='').read()
text = src.replace('\r\n', '\n')

rules = []
def R(old, new):
    rules.append((old, new))

# ================================================================
# ①「維持登入」：cookie 的有效期限
# ================================================================
# makeToken 支援傳入 ttl（原本就有），cookieSet 也支援 maxAgeSec（原本就有）
# → 只要在 register/login 兩處依 body.keep 決定用多長的期限即可。
R(
"""      if (p === '/api/auth/register' && req.method === 'POST') {
        if (!gate(req, res, 'reg', 8, 0.5)) return true;
        const body = await readJson(req, 4096);
        if (!body) return fail(res, 400, 'BAD_BODY'), true;""",
"""      if (p === '/api/auth/register' && req.method === 'POST') {
        if (!gate(req, res, 'reg', 8, 0.5)) return true;
        const body = await readJson(req, 4096);
        if (!body) return fail(res, 400, 'BAD_BODY'), true;
        // v4.13：keep = true → 這次登入的有效期拉長（維持登入）
        const keep = !!(body && body.keep);"""
)
R(
"""        stats.registers++;
        stats.logins++;
        store.touch();
        cookieSet(res, req, makeToken(secret, acc.id));
        return send(res, 200, { ok: true, account: publicAccount(acc), merged: !!(cur && cur.kind === 'guest') }), true;""",
"""        stats.registers++;
        stats.logins++;
        store.touch();
        // v4.13：維持登入 → cookie 與 token 都給 1 年；否則用預設的 30 天
        cookieSet(res, req, makeToken(secret, acc.id, keep ? KEEP_TTL : undefined),
          keep ? Math.floor(KEEP_TTL / 1000) : undefined);
        return send(res, 200, { ok: true, account: publicAccount(acc), merged: !!(cur && cur.kind === 'guest') }), true;"""
)
R(
"""      if (p === '/api/auth/login' && req.method === 'POST') {
        if (!gate(req, res, 'login', 20, 1)) return true;
        const body = await readJson(req, 4096);
        if (!body) return fail(res, 400, 'BAD_BODY'), true;""",
"""      if (p === '/api/auth/login' && req.method === 'POST') {
        if (!gate(req, res, 'login', 20, 1)) return true;
        const body = await readJson(req, 4096);
        if (!body) return fail(res, 400, 'BAD_BODY'), true;
        // v4.13：keep = true → 這次登入的有效期拉長（維持登入）
        const keep = !!(body && body.keep);"""
)
R(
"""        stats.webLogins++;
        stats.logins++;
        store.touch();
        cookieSet(res, req, makeToken(secret, acc.id));
        return send(res, 200, { ok: true, account: publicAccount(acc) }), true;""",
"""        stats.webLogins++;
        stats.logins++;
        store.touch();
        // v4.13：維持登入 → cookie 與 token 都給 1 年；否則用預設的 30 天
        cookieSet(res, req, makeToken(secret, acc.id, keep ? KEEP_TTL : undefined),
          keep ? Math.floor(KEEP_TTL / 1000) : undefined);
        return send(res, 200, { ok: true, account: publicAccount(acc), keep: keep }), true;"""
)

# ================================================================
# KEEP_TTL 常數 + 持久化偵測
# ================================================================
R(
"""const SESSION_TTL = 30 * 24 * 3600 * 1000;""",
"""const SESSION_TTL = 30 * 24 * 3600 * 1000;
// v4.13：「維持登入」勾選後，這次登入的有效期改成 1 年（不勾則 30 天）
const KEEP_TTL = 365 * 24 * 3600 * 1000;"""
)

# 偵測資料夾是否持久化：Render 免費方案的 /opt/render/... 是暫時的
R(
"""  const dir = opt.dir || env.BH_DATA_DIR || path.join(__dirname, 'data');
  const store = createStore(dir, persist);
  const db = store.db;""",
"""  const dir = opt.dir || env.BH_DATA_DIR || path.join(__dirname, 'data');
  const store = createStore(dir, persist);
  const db = store.db;
  // v4.13：偵測「這個資料夾會不會在重新部署後被清空」
  //   Render 免費方案的磁碟是暫時的 → 每次改版重新部署，帳號就歸零（要重新註冊）。
  //   判斷方式：路徑在 /opt/render（Render 的暫時檔案系統）且沒有明確指定 BH_DATA_DIR。
  const dataDirEnv = String((env && env.BH_DATA_DIR) || '').trim();
  const ephemeral = !dataDirEnv && /(^|[\\\\/])opt[\\\\/]render([\\\\/]|$)/.test(dir);
  const persistWarning = ephemeral
    ? 'BH_DATA_DIR 未設定且資料夾位於 Render 暫時磁碟 → 重新部署後帳號會全部消失（請掛載持久磁碟並設 BH_DATA_DIR=/data）'
    : '';"""
)

# 後台 overview 帶上警告
R(
"""      announce: announceOut(),
      accounts: list.slice(0, 300),
      devEmails: DEV_EMAILS
    };""",
"""      announce: announceOut(),
      accounts: list.slice(0, 300),
      devEmails: DEV_EMAILS,
      // v4.13：把「資料會不會被清掉」的警告一起回傳 → 前端後台可直接看到
      dataEphemeral: ephemeral,
      persistWarning: persistWarning
    };"""
)

# auth/me 也帶上警告（前端在登入狀態就能看到提示）
R(
"""      if (p === '/api/auth/me' && req.method === 'GET') {
        const acc = session(req);
        const ann = announceOut();
        if (!acc) return send(res, 200, { ok: true, guest: true, account: null, announce: ann }), true;
        return send(res, 200, {
          ok: true, guest: acc.kind === 'guest', account: publicAccount(acc), announce: ann
        }), true;
      }""",
"""      if (p === '/api/auth/me' && req.method === 'GET') {
        const acc = session(req);
        const ann = announceOut();
        if (!acc) return send(res, 200, { ok: true, guest: true, account: null, announce: ann,
          persistWarning: persistWarning }), true;
        return send(res, 200, {
          ok: true, guest: acc.kind === 'guest', account: publicAccount(acc), announce: ann,
          persistWarning: persistWarning
        }), true;
      }"""
)

# ---- 套用並斷言 ----
failed = []
for i, (old, new) in enumerate(rules, 1):
    c = text.count(old)
    if c != 1:
        failed.append((i, c, old[:100]))
        continue
    text = text.replace(old, new)

if failed:
    print("FAILED rules:")
    for i, c, ctx in failed:
        print("  #%d count=%d ctx=%r" % (i, c, ctx))
    print("No file written.")
else:
    out = text.replace('\n', '\r\n')
    io.open(PATH, 'w', encoding='utf-8', newline='').write(out)
    print("OK: all %d rules applied" % len(rules))
