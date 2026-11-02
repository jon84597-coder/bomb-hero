# -*- coding: utf-8 -*-
"""v4.22 patch C：主選單「帳號登入」10 語言字串"""
import io, re

P = 'index.html'
s = io.open(P, encoding='utf-8').read().replace('\r\n', '\n')

TXT = [
    ('👤 帳號登入', '綁定帳號 · 雲端存檔 · 分享金幣'),                          # zh-TW
    ('👤 账号登录', '绑定账号 · 云端存档 · 分享金币'),                          # zh-CN
    ('👤 Sign in', 'Link account · Cloud save · Share coins'),                # en
    ('👤 アカウント', '連携 · クラウド保存 · シェアでコイン'),                    # ja
    ('👤 계정 로그인', '계정 연동 · 클라우드 저장 · 공유 코인'),                  # ko
    ('👤 เข้าสู่ระบบ', 'ผูกบัญชี · เซฟคลาวด์ · แชร์รับเหรียญ'),                 # th
    ('👤 Đăng nhập', 'Liên kết · Lưu đám mây · Chia sẻ nhận xu'),            # vi
    ('👤 Вход', 'Привязка · Облако · Монеты за репост'),                      # ru
    ('👤 Anmelden', 'Konto · Cloud-Speicher · Münzen teilen'),               # de
    ('👤 Accedi', 'Account · Salvataggio cloud · Monete'),                   # it
]

# 依序在每個語言的 'menu.quit' 前插入（10 個語言各一次）
idx = [0]

def add(m):
    ind = m.group(1)
    i = idx[0]
    assert i < len(TXT), '語言數量超過 10 個'
    t, sub = TXT[i]
    idx[0] += 1
    line = "%s'menu.acct': '%s', 'menu.acct.sub': '%s',\n" % (ind, t, sub)
    return line + m.group(0)

pat = re.compile(r"^(\s*)'menu\.quit': .*$", re.M)
s, n = pat.subn(add, s)
assert n == 10, '找到 %d 個語言的 menu.quit（要 10）' % n
print('ok  插入 %d 個語言的 menu.acct' % n)

# 驗證每個語言都有
for t, sub in TXT:
    assert s.count("'menu.acct': ") == 10
    assert ("'menu.acct': '%s'" % t) in s, '缺少 ' + t
print('ok  10 語言字串檢查通過')

io.open(P, 'w', encoding='utf-8', newline='').write(s.replace('\n', '\r\n'))
print('寫回 index.html')
