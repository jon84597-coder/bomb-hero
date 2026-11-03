import io, re

src = io.open('bomb-hero/index.html', encoding='utf-8', newline='').read()
text = src.replace('\r\n', '\n')
L = text.split('\n')

def find(sub, start=0):
    for i in range(start, len(L)):
        if sub in L[i]:
            return i
    return -1

# 取得規則 1 的原文（acctRemPw 那行）
i = find('acctRemPw"')
assert i > 0
print('=== 規則1 原文（行 %d）===' % (i + 1))
for j in range(i - 2, i + 2):
    print('%d|%s' % (j + 1, L[j]))

print()
print('=== 義大利文 ===')
k = find('Ricorda account')
print('%d|%s' % (k + 1, L[k]))
