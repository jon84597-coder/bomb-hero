# -*- coding: utf-8 -*-
"""v4.3：把「傳統帳密註冊／登入」的介面文案補進 10 種語言的字典。
   寫法比照 patch_v42_i18n.py：插在 I18N['xx'] = { 之後，並確保前一行的逗號。
"""
import io, re, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILE = os.path.join(ROOT, 'index.html')

# key: [zh-TW, zh-CN, en, ja, ko, th, vi, ru, de, it]
T = {
 'web.tabLogin': ['登入', '登录', 'Log in', 'ログイン', '로그인', 'เข้าสู่ระบบ', 'Đăng nhập', 'Вход', 'Anmelden', 'Accedi'],
 'web.tabReg': ['註冊', '注册', 'Register', '新規登録', '회원가입', 'สมัคร', 'Đăng ký', 'Регистрация', 'Registrieren', 'Registrati'],
 'web.tabProv': ['第三方', '第三方', 'Third-party', '外部ログイン', '외부 로그인', 'บุคคลที่สาม', 'Bên thứ ba', 'Сторонние', 'Drittanbieter', 'Terze parti'],
 'web.id': ['帳號（Email 或使用者名稱）', '账号（邮箱或用户名）', 'Account (email or username)', 'アカウント（メールかユーザー名）', '계정(이메일 또는 사용자명)', 'บัญชี (อีเมลหรือชื่อผู้ใช้)', 'Tài khoản (email hoặc tên)', 'Аккаунт (e-mail или логин)', 'Konto (E-Mail oder Name)', 'Account (email o nome)'],
 'web.idPh': ['you@mail.com 或 abc123', 'you@mail.com 或 abc123', 'you@mail.com or abc123', 'you@mail.com か abc123', 'you@mail.com 또는 abc123', 'you@mail.com หรือ abc123', 'you@mail.com hoặc abc123', 'you@mail.com или abc123', 'you@mail.com oder abc123', 'you@mail.com o abc123'],
 'web.pw': ['密碼', '密码', 'Password', 'パスワード', '비밀번호', 'รหัสผ่าน', 'Mật khẩu', 'Пароль', 'Passwort', 'Password'],
 'web.pw2': ['再輸入一次密碼', '再次输入密码', 'Repeat password', 'パスワード（確認）', '비밀번호 확인', 'ยืนยันรหัสผ่าน', 'Nhập lại mật khẩu', 'Повторите пароль', 'Passwort wiederholen', 'Ripeti password'],
 'web.idHint': ['使用者名稱 3~20 位英數字（可含底線），或直接用 Email', '用户名 3~20 位英数字（可含下划线），或直接用邮箱', 'Username: 3–20 letters/digits (underscore ok), or your email', 'ユーザー名は英数 3〜20 文字（_ 可）、またはメール', '사용자명 3~20자 영숫자(_ 가능) 또는 이메일', 'ชื่อผู้ใช้ 3~20 ตัวอักษร/ตัวเลข (ใช้ _ ได้) หรืออีเมล', 'Tên 3–20 ký tự chữ/số (được dùng _) hoặc email', 'Логин: 3–20 букв/цифр (можно _) или e-mail', 'Name: 3–20 Buchstaben/Ziffern (_ erlaubt) oder E-Mail', 'Nome: 3–20 lettere/cifre (_ ok) o email'],
 'web.pwHint': ['至少 8 位，需包含英文字母與數字', '至少 8 位，需包含英文字母和数字', 'At least 8 characters, with letters and digits', '8 文字以上、英字と数字を含む', '8자 이상, 영문과 숫자 포함', 'อย่างน้อย 8 ตัว มีตัวอักษรและตัวเลข', 'Ít nhất 8 ký tự, có chữ và số', 'Не менее 8 символов, буквы и цифры', 'Mindestens 8 Zeichen, mit Buchstaben und Ziffern', 'Almeno 8 caratteri, con lettere e cifre'],
 'web.mismatch': ['兩次輸入的密碼不一樣', '两次输入的密码不一样', 'The two passwords do not match', 'パスワードが一致しません', '비밀번호가 일치하지 않습니다', 'รหัสผ่านทั้งสองไม่ตรงกัน', 'Hai mật khẩu không giống nhau', 'Пароли не совпадают', 'Die Passwörter stimmen nicht überein', 'Le password non coincidono'],
 'web.str': ['強度', '强度', 'Strength', '強度', '강도', 'ความแข็งแรง', 'Độ mạnh', 'Надёжность', 'Stärke', 'Robustezza'],
 'web.str1': ['弱', '弱', 'Weak', '弱い', '약함', 'อ่อน', 'Yếu', 'Слабый', 'Schwach', 'Debole'],
 'web.str2': ['中', '中', 'Medium', '普通', '보통', 'ปานกลาง', 'Trung bình', 'Средний', 'Mittel', 'Media'],
 'web.str3': ['強', '强', 'Strong', '強い', '강함', 'แข็งแรง', 'Mạnh', 'Сильный', 'Stark', 'Forte'],
 'web.doLogin': ['登入', '登录', 'Log in', 'ログイン', '로그인', 'เข้าสู่ระบบ', 'Đăng nhập', 'Войти', 'Anmelden', 'Accedi'],
 'web.doReg': ['註冊並綁定進度', '注册并绑定进度', 'Register & bind progress', '登録して進行状況を引き継ぐ', '가입하고 진행도 연동', 'สมัครและผูกความคืบหน้า', 'Đăng ký và gắn tiến độ', 'Регистрация с переносом прогресса', 'Registrieren & Fortschritt übernehmen', 'Registrati e collega i progressi'],
 'web.regOk': ['註冊成功！遊客進度已綁定到新帳號', '注册成功！游客进度已绑定到新账号', 'Registered! Guest progress is now bound to this account', '登録完了！ゲストの進行状況を引き継ぎました', '가입 완료! 게스트 진행도가 연동되었습니다', 'สมัครสำเร็จ! ความคืบหน้าของผู้เยี่ยมชมผูกแล้ว', 'Đăng ký xong! Tiến độ khách đã được gắn', 'Готово! Прогресс гостя перенесён', 'Registriert! Gast-Fortschritt übernommen', 'Registrato! Progressi ospite collegati'],
 'web.loginOk': ['登入成功', '登录成功', 'Logged in', 'ログインしました', '로그인되었습니다', 'เข้าสู่ระบบแล้ว', 'Đã đăng nhập', 'Вход выполнен', 'Angemeldet', 'Accesso effettuato'],
 'web.errTaken': ['這個帳號已經有人使用了，換一個或直接登入', '这个账号已经有人用了，换一个或直接登录', 'That account is already taken — pick another or just log in', 'このアカウントは使用済みです。別の名前かログインを', '이미 사용 중인 계정입니다. 다른 이름이나 로그인을', 'บัญชีนี้ถูกใช้แล้ว เลือกชื่ออื่นหรือเข้าสู่ระบบ', 'Tài khoản đã có người dùng — chọn tên khác hoặc đăng nhập', 'Этот логин занят — выберите другой или войдите', 'Dieses Konto ist vergeben — anderes wählen oder anmelden', 'Account già in uso — scegline un altro o accedi'],
 'web.errBad': ['帳號或密碼錯誤', '账号或密码错误', 'Wrong account or password', 'アカウントかパスワードが違います', '계정 또는 비밀번호가 틀립니다', 'บัญชีหรือรหัสผ่านไม่ถูกต้อง', 'Sai tài khoản hoặc mật khẩu', 'Неверный логин или пароль', 'Konto oder Passwort falsch', 'Account o password errati'],
 'web.errLocked': ['嘗試次數過多，請 {s} 秒後再試', '尝试次数过多，请 {s} 秒后再试', 'Too many attempts, try again in {s}s', '試行回数が多すぎます。{s} 秒後にどうぞ', '시도가 너무 많습니다. {s}초 후에 다시', 'พยายามหลายครั้งเกินไป ลองใหม่ใน {s} วินาที', 'Thử quá nhiều lần, thử lại sau {s} giây', 'Слишком много попыток, через {s} с', 'Zu viele Versuche, in {s} s erneut', 'Troppi tentativi, riprova tra {s}s'],
 'web.errBanned': ['此帳號已被停權，請聯絡客服', '此账号已被停权，请联系客服', 'This account is suspended — please contact support', 'このアカウントは停止中です。サポートへ', '정지된 계정입니다. 고객센터에 문의하세요', 'บัญชีนี้ถูกระงับ กรุณาติดต่อฝ่ายช่วยเหลือ', 'Tài khoản đã bị đình chỉ — hãy liên hệ hỗ trợ', 'Аккаунт заблокирован — обратитесь в поддержку', 'Konto gesperrt — bitte Support kontaktieren', 'Account sospeso — contatta l\'assistenza'],
 'web.errPw': ['密碼至少 8 位，且需包含英文字母與數字', '密码至少 8 位，且需包含英文字母和数字', 'Password must be at least 8 characters with letters and digits', 'パスワードは 8 文字以上、英字と数字を含めてください', '비밀번호는 8자 이상, 영문과 숫자를 포함하세요', 'รหัสผ่านต้องยาว 8 ตัวขึ้น มีตัวอักษรและตัวเลข', 'Mật khẩu phải từ 8 ký tự, có chữ và số', 'Пароль: не менее 8 символов, буквы и цифры', 'Passwort: mindestens 8 Zeichen, Buchstaben und Ziffern', 'Password: almeno 8 caratteri con lettere e cifre'],
 'web.errId': ['帳號格式不對：請用 3~20 位英數字，或完整的 Email', '账号格式不对：请用 3~20 位英数字，或完整邮箱', 'Invalid account: use 3–20 letters/digits, or a full email', '形式が違います：英数 3〜20 文字、または完全なメール', '형식이 올바르지 않습니다: 영숫자 3~20자 또는 이메일', 'รูปแบบไม่ถูกต้อง: 3~20 ตัวอักษร/ตัวเลข หรืออีเมล', 'Sai định dạng: 3–20 chữ/số hoặc email đầy đủ', 'Неверный формат: 3–20 букв/цифр или e-mail', 'Ungültig: 3–20 Buchstaben/Ziffern oder E-Mail', 'Formato errato: 3–20 lettere/cifre o email'],
 'web.errOauth': ['這個 Email 之前是用 {p} 登入的，請點「第三方」用它登入', '这个邮箱之前是用 {p} 登录的，请点「第三方」登录', 'This email is registered with {p} — use the Third-party tab', 'このメールは {p} で登録済み。「外部ログイン」からどうぞ', '이 이메일은 {p}로 가입되어 있습니다. 외부 로그인을 이용하세요', 'อีเมลนี้สมัครด้วย {p} กรุณาใช้แท็บบุคคลที่สาม', 'Email này đăng ký bằng {p} — dùng tab Bên thứ ba', 'Этот e-mail зарегистрирован через {p}', 'Diese E-Mail läuft über {p} — nutze „Drittanbieter“', 'Questa email usa {p} — usa la scheda Terze parti'],
 'web.errRate': ['操作太頻繁，請稍等一下再試', '操作太频繁，请稍等一下再试', 'Too many requests, please wait a moment', '操作が多すぎます。少し待ってください', '요청이 너무 많습니다. 잠시 후 다시', 'ทำบ่อยเกินไป กรุณารอสักครู่', 'Thao tác quá nhanh, vui lòng đợi', 'Слишком часто, подождите немного', 'Zu viele Anfragen, kurz warten', 'Troppe richieste, attendi un momento'],
 'web.secure': ['密碼經 scrypt 加鹽雜湊後才儲存，伺服器不保存明文', '密码经 scrypt 加盐杂湊后才保存，服务器不存明文', 'Passwords are salted & hashed with scrypt — never stored in plain text', 'パスワードは scrypt で加塩ハッシュ化して保存（平文は保持しません）', '비밀번호는 scrypt로 솔트 해시되어 저장됩니다(평문 저장 없음)', 'รหัสผ่านถูก hash ด้วย scrypt พร้อม salt ไม่เก็บข้อความจริง', 'Mật khẩu được băm scrypt kèm muối, không lưu văn bản gốc', 'Пароли хранятся как scrypt-хеш с солью', 'Passwörter werden mit scrypt gesalzen gehasht', 'Password con hash scrypt e sale, mai in chiaro'],
 'web.dev': ['開發者', '开发者', 'Developer', '開発者', '개발자', 'ผู้พัฒนา', 'Nhà phát triển', 'Разработчик', 'Entwickler', 'Sviluppatore'],
 'web.admin': ['開發者後台', '开发者后台', 'Admin dashboard', '開発者ダッシュボード', '개발자 대시보드', 'แดชบอร์ดผู้พัฒนา', 'Bảng điều khiển', 'Панель разработчика', 'Admin-Dashboard', 'Pannello admin'],
 'web.hasPass': ['已設定密碼（可用帳密登入）', '已设置密码（可用账密登录）', 'Password set (can log in with it)', 'パスワード設定済み（ログイン可）', '비밀번호 설정됨(로그인 가능)', 'ตั้งรหัสผ่านแล้ว (เข้าสู่ระบบได้)', 'Đã đặt mật khẩu (đăng nhập được)', 'Пароль задан (вход доступен)', 'Passwort gesetzt (Anmeldung möglich)', 'Password impostata (accesso possibile)'],
 'web.changePw': ['修改密碼', '修改密码', 'Change password', 'パスワード変更', '비밀번호 변경', 'เปลี่ยนรหัสผ่าน', 'Đổi mật khẩu', 'Сменить пароль', 'Passwort ändern', 'Cambia password'],
 'web.needFill': ['請先填好帳號與密碼', '请先填好账号与密码', 'Fill in account and password first', 'アカウントとパスワードを入力してください', '계정과 비밀번호를 입력하세요', 'กรอกบัญชีและรหัสผ่านก่อน', 'Nhập tài khoản và mật khẩu trước', 'Сначала заполните логин и пароль', 'Bitte Konto und Passwort ausfüllen', 'Compila account e password'],
}
LANGS = ['zh-TW', 'zh-CN', 'en', 'ja', 'ko', 'th', 'vi', 'ru', 'de', 'it']

with io.open(FILE, encoding='utf-8', newline='') as f:
    src = f.read()

EOL = '\r\n' if '\r\n' in src else '\n'
lines = src.split(EOL)

def js_str(s):
    return "'" + s.replace('\\', '\\\\').replace("'", "\\'") + "'"

inserted = 0
for i, lang in enumerate(LANGS):
    marker = "I18N['%s'] = {" % lang
    idx = None
    for n, ln in enumerate(lines):
        if ln.strip() == marker:
            idx = n
            break
    if idx is None:
        raise SystemExit('找不到 ' + marker)
    block = []
    for k, vals in T.items():
        if k in src:
            continue
        block.append('  %s: %s,' % (js_str(k), js_str(vals[i])))
    if not block:
        continue
    lines[idx + 1:idx + 1] = block
    inserted += len(block)

out = EOL.join(lines)
with io.open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(out)
print('插入 %d 條（%d 個 key × 10 語言）' % (inserted, len(T)))
