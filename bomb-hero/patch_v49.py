# -*- coding: utf-8 -*-
import io

PATH = r'C:/Users/jon84/WorkBuddy/2026-10-30-12-58-54/bomb-hero/index.html'

with io.open(PATH, 'r', encoding='utf-8', newline='') as f:
    text = f.read()

# normalize to \n for reliable exact matching; restore CRLF at the very end
text = text.replace('\r\n', '\n')

rules = []
def R(old, new):
    rules.append((old, new))

# =================== F1: 版本號 4.8 -> 4.9 ===================
R("const VERSION = '4.8';", "const VERSION = '4.9';")
R('      <div class="ver beta">測試版 v<span id="verTxt">4.8</span></div>',
  '      <div class="ver beta">測試版 v<span id="verTxt">4.9</span></div>')
R('      📜 <b>版本更新內容</b><span class="vlnum">v<span id="verLogVer">4.8</span></span>',
  '      📜 <b>版本更新內容</b><span class="vlnum">v<span id="verLogVer">4.9</span></span>')
R("  { v: '4.8', date: '2026-11-07', now: true, items: [",
  "  { v: '4.9', date: '2026-11-01', now: true, items: [\n"
  "    '<b>WebView 友善提示</b>：偵測到在 LINE / FB / Messenger 等通訊軟體內建瀏覽器開啟時，頂端浮出提示橫幅，引導改用 Chrome / Safari 以獲得最佳體驗，並提供一鍵複製網址',\n"
  "    '<b>避免強制跳窗</b>：排查前端自動彈窗與導向，確認無未經互動就呼叫的 window.open / alert / 重新整理；第三方登入在 WebView 中改為「複製登入網址」引導，不再強制跳出外部瀏覽器',\n"
  "    '<b>減少閃爍跳窗</b>：內建瀏覽器環境下隱藏會觸發攔截的動作，降低頁面閃爍與反覆跳窗的機率'\n"
  "  ] },\n"
  "  { v: '4.8', date: '2026-11-07', now: false, items: [")

# =================== F2: CSS — WebView 提示橫幅 ===================
R("  #annBar .annx { flex: 0 0 auto; border: 0; background: transparent; color: #b98a55; font-size: 13px; cursor: pointer; padding: 2px 4px; }",
  "  #annBar .annx { flex: 0 0 auto; border: 0; background: transparent; color: #b98a55; font-size: 13px; cursor: pointer; padding: 2px 4px; }\n"
  "  /* ===== v4.9：內建瀏覽器（WebView）友善提示橫幅 ===== */\n"
  "  #webViewBar {\n"
  "    position: fixed; left: 50%; transform: translateX(-50%);\n"
  "    top: calc(env(safe-area-inset-top, 0px) + 4px);\n"
  "    z-index: 980; max-width: min(640px, 94vw);\n"
  "    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;\n"
  "    background: linear-gradient(180deg,#fff3d6,#ffe2b0); border: 2px solid #f2b24a; border-radius: 14px;\n"
  "    padding: 8px 10px; box-shadow: 0 8px 24px rgba(150,90,10,.22);\n"
  "    font-size: 12.5px; color: #7a4a10; font-weight: 700; line-height: 1.45;\n"
  "  }\n"
  "  #webViewBar.hide { display: none; }\n"
  "  #webViewBar .wvb-msg { flex: 1 1 160px; min-width: 0; }\n"
  "  #webViewBar .wvb-btns { display: flex; gap: 6px; flex: 0 0 auto; }\n"
  "  #webViewBar button {\n"
  "    border: 0; border-radius: 999px; padding: 6px 12px; font-size: 12px; font-weight: 800;\n"
  "    cursor: pointer; color: #fff; background: #ff7a1a; box-shadow: 0 2px 0 #d85f06;\n"
  "  }\n"
  "  #webViewBar button.wvb-copy { background: #2f9e57; box-shadow: 0 2px 0 #1f7a40; }\n"
  "  #webViewBar .wvb-x {\n"
  "    flex: 0 0 auto; border: 0; background: transparent; color: #b07a30; font-size: 15px;\n"
  "    cursor: pointer; padding: 2px 4px; line-height: 1;\n"
  "  }")

# =================== F3: HTML — WebView 橫幅容器 ===================
R('<div id="annBar" class="hide"></div>',
  '<div id="annBar" class="hide"></div>\n\n'
  '<!-- v4.9：WebView 友善提示橫幅（在通訊軟體內建瀏覽器開啟時浮出） -->\n'
  '<div id="webViewBar" class="hide"></div>')

# =================== F4: 偵測 / 引導輔助函式（插入 boot 之前） ===================
HELPERS = """  /* ===== v4.9：行動端內建瀏覽器（WebView）偵測與友善引導 ===== */
  function isInAppBrowser() {
    try {
      var ua = navigator.userAgent || '';
      if (/Line|FBAN|FBAV|Instagram|Messenger|Twitter|Telegram|MicroMessenger|Slack|Discord|Kakao|; wv\\)|WebView|HeadlessChrome/i.test(ua)) return true;
      if (window.webkit && window.webkit.messageHandlers) return true;   // iOS WKWebView 橋
    } catch (e) {}
    return false;
  }
  function canonicalUrl() {
    try {
      var u = new URL(location.href);
      u.searchParams.delete('login');
      u.searchParams.delete('redirect');
      return u.toString();
    } catch (e) { return location.href; }
  }
  function bhCopyText(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text); return true; }
    } catch (e) {}
    try {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.top = '-999px'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.focus(); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta); return ok;
    } catch (e) { return false; }
  }
  function webViewOpenExternal() {
    var url = canonicalUrl();
    bhCopyText(url);
    var isAndroid = /Android/i.test(navigator.userAgent || '');
    if (isAndroid) {
      try {
        var noScheme = url.replace(/^https?:\\/\\//, '');
        var intent = 'intent://' + noScheme + '#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=' + encodeURIComponent(url) + ';end';
        setTimeout(function () { try { location.href = intent; } catch (e) {} }, 80);
      } catch (e) {}
    }
    toast(t('webview.guide'), 3.4, 'gear');
  }
  function setupWebViewGuard() {
    try {
      var bar = $id('webViewBar');
      if (!bar) return;
      if (!isInAppBrowser() || (window.BHPWA && window.BHPWA.standalone)) { bar.classList.add('hide'); return; }
      var KEY = 'bombhero-webview-dismiss';
      try { var exp = parseInt(localStorage.getItem(KEY) || '0', 10); if (exp && exp > Date.now()) { bar.classList.add('hide'); return; } } catch (e) {}
      bar.innerHTML =
        '<div class="wvb-msg">' + esc(t('webview.banner')) + '</div>' +
        '<div class="wvb-btns">' +
          '<button type="button" class="wvb-copy" data-wvb="copy">' + esc(t('webview.copy')) + '</button>' +
          '<button type="button" data-wvb="open">' + esc(t('webview.open')) + '</button>' +
        '</div>' +
        '<button type="button" class="wvb-x" aria-label="close" data-wvb="x">✕</button>';
      bar.classList.remove('hide');
      bar.addEventListener('click', function (e) {
        var b = e.target && e.target.getAttribute ? e.target.getAttribute('data-wvb') : null;
        if (!b) return;
        if (b === 'copy') { bhCopyText(canonicalUrl()); toast(t('webview.copied'), 2.6, 'gear'); }
        else if (b === 'open') { webViewOpenExternal(); }
        else if (b === 'x') {
          try { localStorage.setItem(KEY, String(Date.now() + 7 * 864e5)); } catch (e) {}
          bar.classList.add('hide'); AudioSys.sfx('click');
        }
      });
    } catch (e) {}
  }

"""
R("  function boot() {", HELPERS + "  function boot() {")

# =================== F5: boot 中呼叫 setupWebViewGuard ===================
R("  function boot() {\n    try { Cloud.wireUi(); } catch (e) {}",
  "  function boot() {\n    try { setupWebViewGuard(); } catch (e) {}\n    try { Cloud.wireUi(); } catch (e) {}")

# =================== F6: 第三方登入 go() 在 WebView 中改為複製網址 ===================
R("  function go(provider, bind) {\n    const back = (location.pathname + location.search).replace(/[?&]login=[^&]*/g, '');\n    const url = apiPath('/api/auth/' + provider + '/start') +\n      '?bind=' + (bind ? 1 : 0) + '&redirect=' + encodeURIComponent(back || '/');\n    location.href = url;\n  }",
  "  function go(provider, bind) {\n    const back = (location.pathname + location.search).replace(/[?&]login=[^&]*/g, '');\n    const url = apiPath('/api/auth/' + provider + '/start') +\n      '?bind=' + (bind ? 1 : 0) + '&redirect=' + encodeURIComponent(back || '/');\n    // v4.9：在通訊軟體內建瀏覽器裡直接跳 OAuth 會被強制彈出外部瀏覽器、容易迷路，\n    // 改為複製登入網址並引導玩家到真正的瀏覽器開啟後再登入。\n    if (isInAppBrowser() && !(window.BHPWA && window.BHPWA.standalone)) {\n      bhCopyText(url);\n      toast(t('webview.openLogin'), 3.6, 'gear');\n      return;\n    }\n    location.href = url;\n  }")

# =================== F7: i18n — 6 個 webview 鍵（10 國語系） ===================
i18n = [
 ("  'web.remId': '記住帳號', 'web.remPw': '記住密碼', 'nick.need': '請先輸入你的暱稱（最多 8 字）',",
  "  'web.remId': '記住帳號', 'web.remPw': '記住密碼', 'nick.need': '請先輸入你的暱稱（最多 8 字）',\n  'webview.banner': '💡 偵測到你在通訊軟體的內建瀏覽器開啟，建議用 Chrome 或 Safari 開啟以獲得最佳體驗', 'webview.copy': '📋 複製網址', 'webview.open': '🌐 在瀏覽器開啟', 'webview.copied': '已複製網址，請貼到手機瀏覽器開啟', 'webview.guide': '點右上角選單 ⋯ → 選「在瀏覽器中開啟」', 'webview.openLogin': '請在 Chrome / Safari 開啟本遊戲後再登入第三方帳號（網址已複製）',"),
 ("  'web.remId': '记住账号', 'web.remPw': '记住密码', 'nick.need': '请先输入你的昵称（最多 8 字）',",
  "  'web.remId': '记住账号', 'web.remPw': '记住密码', 'nick.need': '请先输入你的昵称（最多 8 字）',\n  'webview.banner': '💡 检测到你在通讯软件的内置浏览器打开，建议用 Chrome 或 Safari 打开以获得最佳体验', 'webview.copy': '📋 复制网址', 'webview.open': '🌐 在浏览器打开', 'webview.copied': '已复制网址，请粘贴到手机浏览器打开', 'webview.guide': '点右上角菜单 ⋯ → 选「在浏览器中打开」', 'webview.openLogin': '请在 Chrome / Safari 打开本游戏后再登录第三方账号（网址已复制）',"),
 ("  'web.remId': 'Remember account', 'web.remPw': 'Remember password', 'nick.need': 'Please enter your nickname first (max 8 chars)',",
  "  'web.remId': 'Remember account', 'web.remPw': 'Remember password', 'nick.need': 'Please enter your nickname first (max 8 chars)',\n  'webview.banner': '💡 This page is open inside a chat app built-in browser. For the best experience, open it in Chrome or Safari.', 'webview.copy': '📋 Copy link', 'webview.open': '🌐 Open in browser', 'webview.copied': 'Link copied, paste it into your phone browser to open', 'webview.guide': 'Tap the top-right menu ⋯ → choose \"Open in Browser\"', 'webview.openLogin': 'Open this game in Chrome or Safari first, then sign in with a third party (link copied)',"),
 ("  'web.remId': 'アカウントを保存', 'web.remPw': 'パスワードを保存', 'nick.need': 'ニックネームを入力してください（最大8文字）',",
  "  'web.remId': 'アカウントを保存', 'web.remPw': 'パスワードを保存', 'nick.need': 'ニックネームを入力してください（最大8文字）',\n  'webview.banner': '💡 チャットアプリ内のブラウザで開いています。最高の体験のため Chrome や Safari で開いてください', 'webview.copy': '📋 リンクをコピー', 'webview.open': '🌐 ブラウザで開く', 'webview.copied': 'リンクをコピーしました。スマホのブラウザに貼り付けて開いてください', 'webview.guide': '右上のメニュー ⋯ → 「ブラウザで開く」を選択', 'webview.openLogin': 'Chrome か Safari で本ゲームを開いてからサードパーティでログインしてください（リンクをコピー済み）',"),
 ("  'web.remId': '아이디 저장', 'web.remPw': '비밀번호 저장', 'nick.need': '닉네임을 먼저 입력하세요 (최대 8자)',",
  "  'web.remId': '아이디 저장', 'web.remPw': '비밀번호 저장', 'nick.need': '닉네임을 먼저 입력하세요 (최대 8자)',\n  'webview.banner': '💡 채팅 앱 내장 브라우저에서 열려 있습니다. 최상의 경험을 위해 Chrome 또는 Safari에서 여세요', 'webview.copy': '📋 링크 복사', 'webview.open': '🌐 브라우저에서 열기', 'webview.copied': '링크를 복사했습니다. 휴대폰 브라우저에 붙여넣어 여세요', 'webview.guide': '오른쪽 위 메뉴 ⋯ → \"브라우저에서 열기\" 선택', 'webview.openLogin': '먼저 Chrome 또는 Safari에서 게임을 연 뒤 서드파티로 로그인하세요 (링크 복사됨)',"),
 ("  'web.remId': 'จำบัญชี', 'web.remPw': 'จำรหัสผ่าน', 'nick.need': 'กรุณาใส่ชื่อเล่นก่อน (สูงสุด 8 ตัวอักษร)',",
  "  'web.remId': 'จำบัญชี', 'web.remPw': 'จำรหัสผ่าน', 'nick.need': 'กรุณาใส่ชื่อเล่นก่อน (สูงสุด 8 ตัวอักษร)',\n  'webview.banner': '💡 คุณกำลังเปิดในเบราว์เซอร์ในแอปแชท แนะนำให้เปิดด้วย Chrome หรือ Safari เพื่อประสบการณ์ที่ดีที่สุด', 'webview.copy': '📋 คัดลอกลิงก์', 'webview.open': '🌐 เปิดในเบราว์เซอร์', 'webview.copied': 'คัดลอกลิงก์แล้ว นำไปวางในเบราว์เซอร์มือถือเพื่อเปิด', 'webview.guide': 'แตะเมนูมุมขวาบน ⋯ → เลือก \"เปิดในเบราว์เซอร์\"', 'webview.openLogin': 'กรุณาเปิดเกมใน Chrome หรือ Safari ก่อนแล้วค่อยเข้าสู่ระบบอื่น (คัดลอกลิงก์แล้ว)',"),
 ("  'web.remId': 'Lưu tài khoản', 'web.remPw': 'Lưu mật khẩu', 'nick.need': 'Vui lòng nhập nickname trước (tối đa 8 ký tự)',",
  "  'web.remId': 'Lưu tài khoản', 'web.remPw': 'Lưu mật khẩu', 'nick.need': 'Vui lòng nhập nickname trước (tối đa 8 ký tự)',\n  'webview.banner': '💡 Bạn đang mở trong trình duyệt tích hợp của ứng dụng chat. Để có trải nghiệm tốt nhất, hãy mở bằng Chrome hoặc Safari.', 'webview.copy': '📋 Sao chép liên kết', 'webview.open': '🌐 Mở trong trình duyệt', 'webview.copied': 'Đã sao chép liên kết, dán vào trình duyệt điện thoại để mở', 'webview.guide': 'Nhấn menu trên cùng bên phải ⋯ → chọn \"Mở trong trình duyệt\"', 'webview.openLogin': 'Hãy mở game bằng Chrome hoặc Safari trước, rồi đăng nhập bên thứ ba (đã sao chép liên kết)',"),
 ("  'web.remId': 'Запомнить аккаунт', 'web.remPw': 'Запомнить пароль', 'nick.need': 'Сначала введите никнейм (макс. 8 символов)',",
  "  'web.remId': 'Запомнить аккаунт', 'web.remPw': 'Запомнить пароль', 'nick.need': 'Сначала введите никнейм (макс. 8 символов)',\n  'webview.banner': '💡 Вы открыли игру во встроенном браузере мессенджера. Для лучшего опыта откройте её в Chrome или Safari.', 'webview.copy': '📋 Копировать ссылку', 'webview.open': '🌐 Открыть в браузере', 'webview.copied': 'Ссылка скопирована, вставьте её в браузер телефона', 'webview.guide': 'Нажмите меню справа сверху ⋯ → выберите «Открыть в браузере»', 'webview.openLogin': 'Сначала откройте игру в Chrome или Safari, затем войдите через сторонний сервис (ссылка скопирована)',"),
 ("  'web.remId': 'Konto merken', 'web.remPw': 'Passwort merken', 'nick.need': 'Bitte zuerst einen Nicknamen eingeben (max. 8 Zeichen)',",
  "  'web.remId': 'Konto merken', 'web.remPw': 'Passwort merken', 'nick.need': 'Bitte zuerst einen Nicknamen eingeben (max. 8 Zeichen)',\n  'webview.banner': '💡 Du öffnest das Spiel im eingebauten Browser einer Chat-App. Für das beste Erlebnis öffne es in Chrome oder Safari.', 'webview.copy': '📋 Link kopieren', 'webview.open': '🌐 Im Browser öffnen', 'webview.copied': 'Link kopiert, füge ihn im Handy-Browser ein', 'webview.guide': 'Oben rechts Menü ⋯ → „Im Browser öffnen“ wählen', 'webview.openLogin': 'Öffne das Spiel zuerst in Chrome oder Safari, dann den Drittanbieter-Login (Link kopiert)',"),
 ("  'web.remId': 'Ricorda account', 'web.remPw': 'Ricorda password', 'nick.need': 'Inserisci prima un nickname (max 8 caratteri)',",
  "  'web.remId': 'Ricorda account', 'web.remPw': 'Ricorda password', 'nick.need': 'Inserisci prima un nickname (max 8 caratteri)',\n  'webview.banner': '💡 Stai aprendo il gioco nel browser integrato di una chat. Per la migliore esperienza aprila in Chrome o Safari.', 'webview.copy': '📋 Copia link', 'webview.open': '🌐 Apri nel browser', 'webview.copied': 'Link copiato, incollalo nel browser del telefono', 'webview.guide': 'Tocca il menu in alto a destra ⋯ → scegli «Apri nel browser»', 'webview.openLogin': 'Apri il gioco in Chrome o Safari, poi accedi con il provider (link copiato)',"),
]
for old, new in i18n:
    R(old, new)

# =================== 套用 ===================
failed = []
for idx, (old, new) in enumerate(rules):
    cnt = text.count(old)
    if cnt != 1:
        failed.append((idx, cnt, old[:70]))
        continue
    text = text.replace(old, new, 1)

if failed:
    print('FAILED rules:')
    for f in failed:
        print('  #%d count=%d  ctx=%r' % f)
    print('No file written.')
else:
    text = text.replace('\n', '\r\n')
    with io.open(PATH, 'w', encoding='utf-8', newline='') as f:
        f.write(text)
    print('OK: all %d rules applied. file size=%d bytes' % (len(rules), len(text)))
