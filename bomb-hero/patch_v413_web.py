# -*- coding: utf-8 -*-
# v4.13 前端修補（index.html）—— 帳號／後台相關
#   ① 開發者後台打開失敗要把原因講出來（原本 try/catch 靜默吞掉 → 使用者只看到一片空白）
#      ＋ 後台顯示「資料會不會被清掉」的警告
#   ③ 登出後回到「登入」分頁（原本切到 'reg' → 沒有勾選框，看起來像不見了）
#      ＋ 連「勾選狀態」本身也記住
#   ④ 新增「維持登入」勾選：keep=true → 伺服器把登入有效期拉到 1 年
import io, os

HERE = os.path.dirname(os.path.abspath(__file__))
PATH = os.path.join(HERE, 'index.html')
src = io.open(PATH, encoding='utf-8', newline='').read()
text = src.replace('\r\n', '\n')

rules = []
def R(old, new):
    rules.append((old, new))

# ================================================================
# ④「維持登入」勾選框（加在「記住密碼」下面）
# ================================================================
R(
"""        '<input type="checkbox" id="acctRemPw"' + (remPw ? ' checked' : '') + '> ' + t('web.remPw') + '</label>') +""",
"""        '<input type="checkbox" id="acctRemPw"' + (remPw ? ' checked' : '') + '> ' + t('web.remPw') + '</label>' +
        // v4.13：維持登入 —— 勾選後這次登入的有效期拉到 1 年（重開瀏覽器仍在）
        '<label class="acctcheck" style="display:flex;align-items:center;gap:6px;margin:2px 0 6px;font-size:13px;color:#cdd6e6;justify-content:center">' +
        '<input type="checkbox" id="acctKeep"' + (remKeep ? ' checked' : '') + '> ' + t('web.keep') + '</label>') +"""
)

# 讀取「維持登入」勾選狀態
R(
"""    let remId = '', remPw = '';
    try { remId = localStorage.getItem('bombhero-rem-id') || ''; remPw = localStorage.getItem('bombhero-rem-pw') || ''; } catch (e) {}""",
"""    let remId = '', remPw = '', remKeep = '';
    // v4.13：除了帳號／密碼，連「勾選狀態」本身也記下來 → 登出再進來勾選不會不見
    try {
      remId = localStorage.getItem('bombhero-rem-id') || '';
      remPw = localStorage.getItem('bombhero-rem-pw') || '';
      remKeep = localStorage.getItem('bombhero-keep-login') || '';
    } catch (e) {}"""
)

# ================================================================
# ③ 送出時：把「維持登入」送到伺服器 + 記住勾選狀態
# ================================================================
R(
"""    else login(id, pw).then(function (r) {
      if (r.ok) {
        const rid = $id('acctRemId'), rpw = $id('acctRemPw');
        try {
          if (rid && rid.checked) localStorage.setItem('bombhero-rem-id', id);
          else localStorage.removeItem('bombhero-rem-id');
          if (rpw && rpw.checked) localStorage.setItem('bombhero-rem-pw', pw);
          else localStorage.removeItem('bombhero-rem-pw');
        } catch (e) {}
      }
      done(r.ok, r.err, r);
    });""",
"""    else {
      // v4.13：讀「維持登入」勾選 → 一起送到伺服器（有效期 30 天 → 1 年）
      const keepEl = $id('acctKeep');
      const keep = !!(keepEl && keepEl.checked);
      login(id, pw, keep).then(function (r) {
        if (r.ok) {
          const rid = $id('acctRemId'), rpw = $id('acctRemPw');
          try {
            if (rid && rid.checked) localStorage.setItem('bombhero-rem-id', id);
            else localStorage.removeItem('bombhero-rem-id');
            if (rpw && rpw.checked) localStorage.setItem('bombhero-rem-pw', pw);
            else localStorage.removeItem('bombhero-rem-pw');
            // v4.13：勾選狀態本身也記住（下次進來勾選還在）
            if (keep) localStorage.setItem('bombhero-keep-login', '1');
            else localStorage.removeItem('bombhero-keep-login');
          } catch (e) {}
        }
        done(r.ok, r.err, r);
      });
    }"""
)

# login() 支援 keep 參數
R(
"""  function login(id, pw) {
    if (!S.online) return Promise.resolve({ ok: false, err: 'OFFLINE' });
    return req('/api/auth/login', { id: id, pw: pw }).then(function (r) {""",
"""  function login(id, pw, keep) {
    if (!S.online) return Promise.resolve({ ok: false, err: 'OFFLINE' });
    // v4.13：keep=true → 伺服器把這次登入的有效期拉到 1 年（維持登入）
    return req('/api/auth/login', { id: id, pw: pw, keep: !!keep }).then(function (r) {"""
)

# ================================================================
# ③ 登出後回到「登入」分頁（不是「註冊」）→ 記住帳號／密碼的勾選才看得到
# ================================================================
R(
"""      S.acc = null; S.guest = true; S.gotLayout = false; S.tab = 'reg';""",
"""      // v4.13：原本切到 'reg'（註冊頁）→ 沒有「記住帳號／密碼」勾選框，看起來像不見了。
      //   改成切到 'login' → 回到登入頁，已記住的帳號密碼與勾選狀態會自動帶出。
      S.acc = null; S.guest = true; S.gotLayout = false; S.tab = 'login';"""
)

# ================================================================
# ① 開發者後台：把錯誤講清楚（不要靜默 try/catch）
# ================================================================
R(
"""      else if (act === 'admin') { close(); try { Admin.open(); } catch (err) {} }""",
"""      else if (act === 'admin') {
        close();
        // v4.13：原本 try/catch 什麼都不做 → 後台打不開時使用者只看到「一片空白」。
        //   現在把失敗原因直接講出來。
        try {
          var opened = Admin.open();
          if (opened === false) toast(t('acct.adminFail'), 3.2);
        } catch (err) {
          console.error('[admin]', err);
          toast(t('acct.adminErr') + ' ' + ((err && err.message) || err), 4);
        }
      }"""
)

R(
"""    const m = $id('adminModal');
    if (!m) return false;
    m.classList.add('on');""",
"""    const m = $id('adminModal');
    // v4.13：找不到後台元素時要說清楚（原本靜默 return false → 使用者只看到空白）
    if (!m) { toast(t('acct.adminFail'), 3.2); return false; }
    m.classList.add('on');"""
)

R(
"""      A.data = r;
      renderStats(r.stats);
      renderList();
      const t = $id('adAnnText');
      if (t) t.value = (r.announce && r.announce.text) || '';
      return r;""",
"""      A.data = r;
      renderStats(r.stats);
      renderList();
      const t = $id('adAnnText');
      if (t) t.value = (r.announce && r.announce.text) || '';
      // v4.13：後台把「資料會不會被清掉」的警告顯示出來（避免改版後帳號消失而不知情）
      const w = $id('adWarn');
      if (w) {
        if (r.persistWarning) { w.textContent = '⚠️ ' + r.persistWarning; w.classList.remove('hide'); }
        else w.classList.add('hide');
      }
      return r;"""
)

# ================================================================
# ① 後台 HTML 加一個警告列
# ================================================================
R(
"""    <div class="adstats" id="adStats"></div>""",
"""    <div class="adstats" id="adStats"></div>
    <!-- v4.13：資料夾不是持久化時的警告（重新部署會讓帳號消失） -->
    <div class="adwarn hide" id="adWarn"></div>"""
)

R(
"""  .adstats { display: grid; grid-template-columns: repeat(auto-fit, minmax(88px, 1fr)); gap: 6px; margin-bottom: 8px; }""",
"""  .adstats { display: grid; grid-template-columns: repeat(auto-fit, minmax(88px, 1fr)); gap: 6px; margin-bottom: 8px; }
  .adwarn { background: rgba(120,70,20,.22); border: 1.5px solid #a8763a; color: #ffd9a8;
            border-radius: 10px; padding: 7px 10px; margin-bottom: 8px; font-size: 11.5px; font-weight: 700; line-height: 1.5; }
  .adwarn.hide { display: none; }"""
)

# ================================================================
# 多國語系：web.keep / acct.adminFail / acct.adminErr（10 種語言）
# ================================================================
I18N = [
    # (remId 那一行的完整前綴, 新增的三個鍵)
    ("  'web.remId': '記住帳號', 'web.remPw': '記住密碼', 'nick.need': '請先輸入你的暱稱（最多 8 字）',",
     "  'web.remId': '記住帳號', 'web.remPw': '記住密碼', 'web.keep': '維持登入（30 天）',\n"
     "  'acct.adminFail': '後台開不起來：請確認已用開發者帳號登入',\n"
     "  'acct.adminErr': '後台開啟失敗：',\n"
     "  'nick.need': '請先輸入你的暱稱（最多 8 字）',"),
    ("  'web.remId': '记住账号', 'web.remPw': '记住密码', 'nick.need': '请先输入你的昵称（最多 8 字）',",
     "  'web.remId': '记住账号', 'web.remPw': '记住密码', 'web.keep': '保持登录（30 天）',\n"
     "  'acct.adminFail': '后台打不开：请确认已用开发者账号登录',\n"
     "  'acct.adminErr': '后台开启失败：',\n"
     "  'nick.need': '请先输入你的昵称（最多 8 字）',"),
    ("  'web.remId': 'Remember account', 'web.remPw': 'Remember password', 'nick.need': 'Please enter your nickname first (max 8 chars)',",
     "  'web.remId': 'Remember account', 'web.remPw': 'Remember password', 'web.keep': 'Keep me signed in (30 days)',\n"
     "  'acct.adminFail': 'Dashboard could not open: make sure you are signed in with the developer account',\n"
     "  'acct.adminErr': 'Dashboard failed to open: ',\n"
     "  'nick.need': 'Please enter your nickname first (max 8 chars)',"),
    ("  'web.remId': 'アカウントを保存', 'web.remPw': 'パスワードを保存', 'nick.need': 'ニックネームを入力してください（最大8文字）',",
     "  'web.remId': 'アカウントを保存', 'web.remPw': 'パスワードを保存', 'web.keep': 'ログイン状態を維持（30日間）',\n"
     "  'acct.adminFail': '管理画面を開けません：開発者アカウントでログインしているか確認してください',\n"
     "  'acct.adminErr': '管理画面の起動に失敗：',\n"
     "  'nick.need': 'ニックネームを入力してください（最大8文字）',"),
    ("  'web.remId': '아이디 저장', 'web.remPw': '비밀번호 저장', 'nick.need': '닉네임을 먼저 입력하세요 (최대 8자)',",
     "  'web.remId': '아이디 저장', 'web.remPw': '비밀번호 저장', 'web.keep': '로그인 유지 (30일)',\n"
     "  'acct.adminFail': '관리 화면을 열 수 없습니다: 개발자 계정으로 로그인했는지 확인하세요',\n"
     "  'acct.adminErr': '관리 화면 열기 실패: ',\n"
     "  'nick.need': '닉네임을 먼저 입력하세요 (최대 8자)',"),
    ("  'web.remId': 'จำบัญชี', 'web.remPw': 'จำรหัสผ่าน', 'nick.need': 'กรุณาใส่ชื่อเล่นก่อน (สูงสุด 8 ตัวอักษร)',",
     "  'web.remId': 'จำบัญชี', 'web.remPw': 'จำรหัสผ่าน', 'web.keep': 'คงการเข้าสู่ระบบไว้ (30 วัน)',\n"
     "  'acct.adminFail': 'เปิดแดชบอร์ดไม่ได้: กรุณาตรวจสอบว่าคุณล็อกอินด้วยบัญชีผู้พัฒนา',\n"
     "  'acct.adminErr': 'เปิดแดชบอร์ดไม่สำเร็จ: ',\n"
     "  'nick.need': 'กรุณาใส่ชื่อเล่นก่อน (สูงสุด 8 ตัวอักษร)',"),
    ("  'web.remId': 'Lưu tài khoản', 'web.remPw': 'Lưu mật khẩu', 'nick.need': 'Vui lòng nhập nickname trước (tối đa 8 ký tự)',",
     "  'web.remId': 'Lưu tài khoản', 'web.remPw': 'Lưu mật khẩu', 'web.keep': 'Giữ đăng nhập (30 ngày)',\n"
     "  'acct.adminFail': 'Không mở được bảng quản trị: hãy chắc chắn đã đăng nhập bằng tài khoản nhà phát triển',\n"
     "  'acct.adminErr': 'Mở bảng quản trị thất bại: ',\n"
     "  'nick.need': 'Vui lòng nhập nickname trước (tối đa 8 ký tự)',"),
    ("  'web.remId': 'Запомнить аккаунт', 'web.remPw': 'Запомнить пароль', 'nick.need': 'Сначала введите никнейм (макс. 8 символов)',",
     "  'web.remId': 'Запомнить аккаунт', 'web.remPw': 'Запомнить пароль', 'web.keep': 'Оставаться в системе (30 дней)',\n"
     "  'acct.adminFail': 'Не удалось открыть панель: убедитесь, что вошли как аккаунт разработчика',\n"
     "  'acct.adminErr': 'Не удалось открыть панель: ',\n"
     "  'nick.need': 'Сначала введите никнейм (макс. 8 символов)',"),
    ("  'web.remId': 'Konto merken', 'web.remPw': 'Passwort merken', 'nick.need': 'Bitte zuerst einen Nicknamen eingeben (max. 8 Zeichen)',",
     "  'web.remId': 'Konto merken', 'web.remPw': 'Passwort merken', 'web.keep': 'Angemeldet bleiben (30 Tage)',\n"
     "  'acct.adminFail': 'Dashboard konnte nicht geöffnet werden: Mit Entwicklerkonto anmelden',\n"
     "  'acct.adminErr': 'Dashboard konnte nicht geöffnet werden: ',\n"
     "  'nick.need': 'Bitte zuerst einen Nicknamen eingeben (max. 8 Zeichen)',"),
    ("  'web.remId': 'Ricorda account', 'web.remPw': 'Ricorda password', 'nick.need': 'Inserisci prima un nickname (max 8 caratteri)',",
     "  'web.remId': 'Ricorda account', 'web.remPw': 'Ricorda password', 'web.keep': 'Resta collegato (30 giorni)',\n"
     "  'acct.adminFail': 'Impossibile aprire la dashboard: accedi con l\\'account sviluppatore',\n"
     "  'acct.adminErr': 'Apertura dashboard non riuscita: ',\n"
     "  'nick.need': 'Inserisci prima un nickname (max 8 caratteri)',"),
]
for old, new in I18N:
    R(old, new)

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
