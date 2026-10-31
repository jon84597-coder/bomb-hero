# -*- coding: utf-8 -*-
"""patch_v41c.py —— 補一條「站長尚未開通第三方登入」的提示（10 語）＋顯示邏輯"""
import io
P='index.html'
raw=io.open(P,'rb').read().decode('utf-8'); EOL='\r\n' if '\r\n' in raw else '\n'; src=raw.replace('\r\n','\n')

TXT={
'zh-TW':'站長還沒開通第三方登入 —— 先用遊客模式玩，開通後這裡就能一鍵綁定。',
'zh-CN':'站長还没开通第三方登录 —— 先用游客模式玩，开通后这里就能一键绑定。',
'en':'Third-party sign-in is not configured yet — play as a guest for now; binding will appear here once enabled.',
'ja':'このサーバーでは外部ログインが未設定です。まずはゲストで遊べます（設定後にここで連携できます）。',
'ko':'서버에 아직 외부 로그인이 설정되지 않았습니다. 지금은 게스트로 플레이하고, 설정되면 여기서 연동할 수 있어요.',
'th':'เซิร์ฟเวอร์ยังไม่ได้ตั้งค่าการเข้าสู่ระบบภายนอก — เล่นเป็นผู้เยี่ยมชมไปก่อน เมื่อเปิดแล้วจะผูกบัญชีได้ที่นี่',
'vi':'Máy chủ chưa cấu hình đăng nhập bên thứ ba — hãy chơi với tư cách khách, khi bật xong sẽ liên kết được tại đây.',
'ru':'На сервере не настроен вход через сторонние сервисы — пока играйте гостем; привязка появится здесь после настройки.',
'de':'Die Anmeldung über Drittanbieter ist noch nicht eingerichtet – spiele erst als Gast; danach erscheint hier die Verknüpfung.',
'it':'Accesso tramite terze parti non configurato — per ora gioca come ospite; il collegamento apparirà qui dopo l attivazione.',
}
for lang,v in TXT.items():
    m=src.find("I18N['"+lang+"'] = {")
    assert m>0, lang
    end=src.find('\n};', m)
    head=src[:end].rstrip()
    if not head.endswith(','): head+=','
    src=head+"\n  'acct.noProvider': '"+v+"'"+src[end:]
    print('  ok '+lang)

old="""    if (S.guest) {
      html += '<div class="acctprov">' + providerBtns() + '</div>' +
        '<div class="acctnote">' + t('acct.bindNote') + '</div>';"""
new="""    if (S.guest) {
      const anyOn = ['google', 'facebook', 'line'].some(function (k) {
        return S.providers[k] && S.providers[k].on;
      });
      html += '<div class="acctprov">' + providerBtns() + '</div>' +
        '<div class="acctnote">' + t(anyOn ? 'acct.bindNote' : 'acct.noProvider') + '</div>';"""
assert src.count(old)==1
src=src.replace(old,new)
io.open(P,'wb').write(src.replace('\n',EOL).encode('utf-8'))
print('[OK]')
