# -*- coding: utf-8 -*-
"""
patch_v41b.py —— v4.1：10 國語言補上帳號 / 雲端存檔文案，並把版本升到 4.1
"""
import io

P = 'index.html'
raw = io.open(P, 'rb').read().decode('utf-8')
EOL = '\r\n' if '\r\n' in raw else '\n'
src = raw.replace('\r\n', '\n')


def sub(old, new, tag):
    global src
    n = src.count(old)
    assert n == 1, '[%s] 預期 1 次，實際 %d 次' % (tag, n)
    src = src.replace(old, new)
    print('  ok ' + tag)


KEYS = ['acct.bind', 'acct.title', 'acct.guest', 'acct.player', 'acct.offShort', 'acct.memberTitle',
        'acct.needBind', 'acct.bindNote', 'acct.google', 'acct.facebook', 'acct.line', 'acct.off',
        'acct.cleared', 'acct.clearedLabel', 'acct.gold', 'acct.points', 'acct.logout', 'acct.close',
        'acct.manage', 'acct.offline', 'acct.retry', 'acct.secure', 'acct.synced', 'acct.loginOk',
        'acct.loginErr', 'acct.tampered', 'acct.stageLocked', 'acct.saveDone', 'acct.loggedOut',
        'acct.bound']

TR = {
'zh-TW': ['綁定帳號', '👤 帳號', '遊客', '玩家', '離線', '已登入',
          '綁定後可跨裝置續玩', '綁定時會把遊客的關卡進度、配點、金幣完整合併到正式帳號，不會被覆蓋。',
          '使用 Google 登入', '使用 Facebook 登入', '使用 LINE 登入', '伺服器尚未開啟這個登入方式',
          '已通過 {n} / 32 關', '冒險進度', '金幣', '可用配點', '登出', '關閉',
          '帳號', '離線模式：連不到伺服器，進度暫存本機', '重試',
          '🔒 全程 HTTPS 加密 · 伺服器端驗證 · 存檔 HMAC 簽章', '☁️ 立即同步', '✅ 登入成功',
          '⚠️ 登入沒有完成（{r}）', '⚠️ 存檔校驗失敗，已拒絕載入可疑資料', '🔒 這一關還沒解鎖',
          '☁️ 第 {n} 關進度已存到雲端', '已登出，回到遊客模式', '✅ 綁定成功，遊客進度已合併'],

'zh-CN': ['绑定账号', '👤 账号', '游客', '玩家', '离线', '已登录',
          '绑定后可在不同设备继续游玩', '绑定后会把游客的关卡进度、配点、金币完整合并到正式账号，不会被覆盖。',
          '使用 Google 登录', '使用 Facebook 登录', '使用 LINE 登录', '服务器尚未开启这个登录方式',
          '已通过 {n} / 32 关', '冒险进度', '金币', '可用配点', '退出登录', '关闭',
          '账号', '离线模式：连不到服务器，进度暂存在本机', '重试',
          '🔒 全程 HTTPS 加密 · 服务器端验证 · 存档 HMAC 签名', '☁️ 立即同步', '✅ 登录成功',
          '⚠️ 登录没有完成（{r}）', '⚠️ 存档校验失败，已拒绝载入可疑数据', '🔒 这一关还没解锁',
          '☁️ 第 {n} 关进度已存到云端', '已退出，回到游客模式', '✅ 绑定成功，游客进度已合并'],

'en': ['Bind account', '👤 Account', 'Guest', 'Player', 'Offline', 'Signed in',
       'Bind to keep progress across devices',
       'Binding merges your guest stages, stats and gold into the account. Nothing gets overwritten.',
       'Continue with Google', 'Continue with Facebook', 'Continue with LINE',
       'This sign-in method is not enabled on the server',
       'Cleared {n} / 32', 'Progress', 'Gold', 'Points left', 'Sign out', 'Close',
       'Account', 'Offline mode: server unreachable, progress stays on this device', 'Retry',
       '🔒 HTTPS only · server-side validation · HMAC-signed saves', '☁️ Sync now', '✅ Signed in',
       '⚠️ Sign-in did not finish ({r})', '⚠️ Save checksum failed, suspicious data rejected',
       '🔒 This stage is still locked', '☁️ Stage {n} saved to the cloud',
       'Signed out — back to guest mode', '✅ Linked! Guest progress merged'],

'ja': ['アカウント連携', '👤 アカウント', 'ゲスト', 'プレイヤー', 'オフライン', 'ログイン済み',
       '連携すると別の端末でも続きが遊べます',
       '連携するとゲストのステージ・能力値・ゴールドはそのまま正式アカウントへ統合されます（上書きされません）。',
       'Google でログイン', 'Facebook でログイン', 'LINE でログイン',
       'このログイン方法はサーバーで有効になっていません',
       'クリア {n} / 32', '冒険の進み具合', 'ゴールド', '残りポイント', 'ログアウト', '閉じる',
       'アカウント', 'オフラインモード：サーバーに接続できません。進行状況は端末に保存されます', '再試行',
       '🔒 常時 HTTPS・サーバー側検証・セーブは HMAC 署名', '☁️ 今すぐ同期', '✅ ログインしました',
       '⚠️ ログインが完了しませんでした（{r}）', '⚠️ セーブの検証に失敗しました。不審なデータを拒否しました',
       '🔒 このステージはまだロック中', '☁️ ステージ {n} をクラウドに保存しました',
       'ログアウトしました（ゲストモード）', '✅ 連携完了！ゲストの進行状況を統合しました'],

'ko': ['계정 연동', '👤 계정', '게스트', '플레이어', '오프라인', '로그인됨',
       '연동하면 다른 기기에서도 이어서 플레이할 수 있어요',
       '연동하면 게스트의 스테이지 진행, 능력치, 골드가 그대로 정식 계정에 합쳐집니다(덮어쓰지 않음).',
       'Google로 로그인', 'Facebook으로 로그인', 'LINE으로 로그인', '서버에서 이 로그인 방식을 켜지 않았습니다',
       '클리어 {n} / 32', '모험 진행', '골드', '남은 포인트', '로그아웃', '닫기',
       '계정', '오프라인 모드: 서버에 연결할 수 없어 진행 상황을 기기에 저장합니다', '다시 시도',
       '🔒 전체 HTTPS · 서버 검증 · 저장 파일 HMAC 서명', '☁️ 지금 동기화', '✅ 로그인되었습니다',
       '⚠️ 로그인이 완료되지 않았습니다({r})', '⚠️ 저장 파일 검증 실패, 의심스러운 데이터를 차단했습니다',
       '🔒 아직 잠긴 스테이지입니다', '☁️ 스테이지 {n} 진행이 클라우드에 저장되었습니다',
       '로그아웃했습니다. 게스트 모드로 돌아갑니다', '✅ 연동 완료! 게스트 진행이 합쳐졌습니다'],

'th': ['ผูกบัญชี', '👤 บัญชี', 'ผู้เยี่ยมชม', 'ผู้เล่น', 'ออฟไลน์', 'เข้าสู่ระบบแล้ว',
       'ผูกบัญชีเพื่อเล่นต่อข้ามอุปกรณ์',
       'เมื่อผูกบัญชี ความคืบหน้า ค่าพลัง และทองจากโหมดผู้เยี่ยมชมจะถูกรวมเข้าบัญชีจริงทั้งหมด ไม่ถูกเขียนทับ',
       'เข้าสู่ระบบด้วย Google', 'เข้าสู่ระบบด้วย Facebook', 'เข้าสู่ระบบด้วย LINE',
       'เซิร์ฟเวอร์ยังไม่เปิดวิธีเข้าสู่ระบบนี้',
       'ผ่านแล้ว {n} / 32', 'ความคืบหน้า', 'ทอง', 'แต้มที่เหลือ', 'ออกจากระบบ', 'ปิด',
       'บัญชี', 'โหมดออฟไลน์: เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ความคืบหน้าจะถูกเก็บไว้ในเครื่อง', 'ลองใหม่',
       '🔒 HTTPS ทั้งหมด · ตรวจสอบฝั่งเซิร์ฟเวอร์ · ไฟล์เซฟลงนาม HMAC', '☁️ ซิงก์เลย',
       '✅ เข้าสู่ระบบสำเร็จ', '⚠️ การเข้าสู่ระบบไม่สำเร็จ（{r}）',
       '⚠️ ตรวจสอบไฟล์เซฟไม่ผ่าน ปฏิเสธข้อมูลที่น่าสงสัย', '🔒 ด่านนี้ยังไม่ปลดล็อก',
       '☁️ บันทึกด่าน {n} ขึ้นคลาวด์แล้ว', 'ออกจากระบบแล้ว กลับสู่โหมดผู้เยี่ยมชม',
       '✅ ผูกบัญชีสำเร็จ! รวมความคืบหน้าแล้ว'],

'vi': ['Liên kết tài khoản', '👤 Tài khoản', 'Khách', 'Người chơi', 'Ngoại tuyến', 'Đã đăng nhập',
       'Liên kết để chơi tiếp trên thiết bị khác',
       'Khi liên kết, tiến trình màn chơi, điểm và vàng của khách sẽ được gộp vào tài khoản chính thức, không bị ghi đè.',
       'Đăng nhập bằng Google', 'Đăng nhập bằng Facebook', 'Đăng nhập bằng LINE',
       'Máy chủ chưa bật cách đăng nhập này',
       'Đã qua {n} / 32', 'Tiến trình', 'Vàng', 'Điểm còn lại', 'Đăng xuất', 'Đóng',
       'Tài khoản', 'Chế độ ngoại tuyến: không kết nối được máy chủ, tiến trình lưu tạm trên máy', 'Thử lại',
       '🔒 Toàn bộ HTTPS · xác thực phía máy chủ · tệp lưu ký HMAC', '☁️ Đồng bộ ngay',
       '✅ Đăng nhập thành công', '⚠️ Đăng nhập chưa hoàn tất ({r})',
       '⚠️ Kiểm tra tệp lưu thất bại, đã từ chối dữ liệu đáng ngờ', '🔒 Màn này chưa mở khóa',
       '☁️ Đã lưu màn {n} lên đám mây', 'Đã đăng xuất, quay lại chế độ khách',
       '✅ Liên kết thành công! Đã gộp tiến trình khách'],

'ru': ['Привязать аккаунт', '👤 Аккаунт', 'Гость', 'Игрок', 'Офлайн', 'Вы вошли',
       'Привяжите, чтобы играть на других устройствах',
       'При привязке прогресс, характеристики и золото гостя объединяются с аккаунтом и не теряются.',
       'Войти через Google', 'Войти через Facebook', 'Войти через LINE',
       'Этот способ входа не включён на сервере',
       'Пройдено {n} / 32', 'Прогресс', 'Золото', 'Осталось очков', 'Выйти', 'Закрыть',
       'Аккаунт', 'Офлайн-режим: сервер недоступен, прогресс хранится на устройстве', 'Повторить',
       '🔒 Только HTTPS · проверка на сервере · подпись сохранений HMAC', '☁️ Синхронизировать',
       '✅ Вход выполнен', '⚠️ Вход не завершён ({r})',
       '⚠️ Проверка сохранения не пройдена, подозрительные данные отклонены', '🔒 Этот уровень ещё закрыт',
       '☁️ Уровень {n} сохранён в облаке', 'Вы вышли — снова режим гостя',
       '✅ Привязано! Прогресс гостя объединён'],

'de': ['Konto verknüpfen', '👤 Konto', 'Gast', 'Spieler', 'Offline', 'Angemeldet',
       'Verknüpfen, um auf anderen Geräten weiterzuspielen',
       'Beim Verknüpfen werden Level, Werte und Gold des Gasts ins echte Konto übernommen – nichts wird überschrieben.',
       'Mit Google anmelden', 'Mit Facebook anmelden', 'Mit LINE anmelden',
       'Diese Anmeldemethode ist am Server nicht aktiviert',
       'Geschafft {n} / 32', 'Fortschritt', 'Gold', 'Punkte übrig', 'Abmelden', 'Schließen',
       'Konto', 'Offline-Modus: Server nicht erreichbar, Fortschritt bleibt auf diesem Gerät',
       'Erneut versuchen', '🔒 Nur HTTPS · Serverprüfung · HMAC-signierte Spielstände',
       '☁️ Jetzt synchronisieren', '✅ Angemeldet', '⚠️ Anmeldung nicht abgeschlossen ({r})',
       '⚠️ Spielstand-Prüfung fehlgeschlagen, verdächtige Daten abgelehnt',
       '🔒 Dieses Level ist noch gesperrt', '☁️ Level {n} in der Cloud gespeichert',
       'Abgemeldet – zurück zum Gastmodus', '✅ Verknüpft! Gast-Fortschritt übernommen'],

'it': ['Collega account', '👤 Account', 'Ospite', 'Giocatore', 'Offline', 'Accesso effettuato',
       'Collega per continuare su altri dispositivi',
       'Collegando, livelli, statistiche e oro da ospite vengono uniti al tuo account: nulla viene sovrascritto.',
       'Accedi con Google', 'Accedi con Facebook', 'Accedi con LINE',
       'Questo metodo di accesso non è attivo sul server',
       'Completati {n} / 32', 'Progressi', 'Oro', 'Punti rimasti', 'Esci', 'Chiudi',
       'Account', 'Modalità offline: server irraggiungibile, i progressi restano su questo dispositivo',
       'Riprova', '🔒 Solo HTTPS · verifica lato server · salvataggi firmati HMAC', '☁️ Sincronizza ora',
       '✅ Accesso effettuato', '⚠️ Accesso non completato ({r})',
       '⚠️ Verifica del salvataggio fallita, dati sospetti rifiutati', '🔒 Questo livello è ancora bloccato',
       '☁️ Livello {n} salvato nel cloud', 'Disconnesso — torni alla modalità ospite',
       '✅ Collegato! Progressi da ospite uniti'],
}

print('=== 1. 10 國語言字典 ===')
for lang, vals in TR.items():
    assert len(vals) == len(KEYS), lang + ' 數量不符 ' + str(len(vals))
    marker = "I18N['" + lang + "'] = {"
    m = src.find(marker)
    assert m >= 0, '找不到字典 ' + lang
    end = src.find('\n};', m)
    assert end > 0, '找不到字典結尾 ' + lang
    head = src[:end].rstrip()
    if not head.endswith(','):
        head += ','
    lines = []
    for i in range(0, len(KEYS), 2):
        pair = KEYS[i:i + 2]
        vals_i = vals[i:i + 2]
        lines.append('  ' + ', '.join(
            "'" + k + "': '" + v.replace("'", "\\'") + "'" for k, v in zip(pair, vals_i)) + ',')
    block = '\n  // v4.1：帳號 / 第三方登入 / 雲端存檔\n' + '\n'.join(lines).rstrip(',') + '\n'
    # 最後一行不要逗號（字典最後一條）
    block = block.rstrip('\n')
    if block.endswith(','):
        block = block[:-1]
    src = head + '\n' + block + src[end:]
    print('  ok ' + lang + ' +' + str(len(KEYS)) + ' 鍵')

print('=== 2. 版本紀錄新增 4.1 ===')
sub("  { v: '4.0', date: '2026-11-01', now: true, items: [",
    """  { v: '4.1', date: '2026-11-01', now: true, items: [
    '<b>帳號系統</b>：右上角常駐「👤 綁定帳號」—— 一鍵用 Google / Facebook（另支援 LINE）登入，不用另外記密碼',
    '<b>遊客無縫升級</b>：第一次進遊戲自動配發本機身分，直接就能玩 RPG；之後綁定會把關卡進度、配點、金幣完整合併到正式帳號，不會覆蓋',
    '<b>雲端存檔</b>：進度存在伺服器，換手機、換瀏覽器、清快取都還在；右上角綠燈＝已同步，紅燈＝離線中',
    '<b>伺服器權威</b>：配點、加點上限、關卡解鎖順序、金幣全部由後端計算，前端只能送「我要加哪一項」；前端亂送的數值一律不採信',
    '<b>資安防護</b>：全程強制 HTTPS ＋ HSTS、存檔 HMAC-SHA256 簽章（改檔立即被拒並記錄）、存檔 API 每秒 1 次限流、HttpOnly Cookie 工作階段'
  ] },
  { v: '4.0', date: '2026-11-01', items: [""",
    'VERSION_LOG 4.1')

print('=== 3. 版本號 ===')
sub("const VERSION = '4.0';", "const VERSION = '4.1';", 'VERSION 常數')
sub('<span id="verTxt">4.0</span>', '<span id="verTxt">4.1</span>', '畫面版本徽章')
sub('<span id="verLogVer">4.0</span>', '<span id="verLogVer">4.1</span>', '版本面板徽章')

out = src.replace('\n', EOL)
io.open(P, 'wb').write(out.encode('utf-8'))
print('\n[OK] 已寫回 ' + P)
