# -*- coding: utf-8 -*-
# v4.52 patch C：隨從售價 1000 → 5000 金幣（含首頁副標、商店說明、說明頁、10 國語系）
import io, re, sys

P = 'index.html'
s = io.open(P, encoding='utf-8', newline='').read()
before = len(s)
n_changed = [0]

def must(c, m):
    if not c:
        print('FAIL ' + m); sys.exit(1)

def rep(old, new, tag, cnt=1):
    global s
    if old not in s:
        must(new in s, 'MISS ' + tag)
        print('  skip ' + tag); return
    must(s.count(old) == cnt, 'COUNT(%d!=%d) %s' % (s.count(old), cnt, tag))
    s = s.replace(old, new)
    n_changed[0] += cnt
    print('  ok   %s x%d' % (tag, cnt))

# 1. 隨從定義
rep("price: 1000,", "price: 5000,", 'PETS price', 3)
# 2. 首頁商店鈕副標
rep('<small>隨從 1000 金幣</small>', '<small>隨從 5000 金幣</small>', 'home store sub')
# 3. 說明頁文字
rep("'隨從三種各 <b>1000</b> 金幣：", "'隨從三種各 <b>5000</b> 金幣：", 'help pets price')
# 4. 註解
rep('//   三種隨從各 1000 金幣，買了就常駐在主角旁邊：',
    '//   三種隨從各 5000 金幣（v4.52 從 1000 調漲），買了就常駐在主角旁邊：', 'comment')

# 5. 十國語系的商店副標
def fix(m):
    t = m.group(1)
    t2 = t.replace('1,000', '5,000').replace('1.000', '5.000').replace('1000', '5000')
    if t2 != t:
        n_changed[0] += 1
    return "'store.note': '" + t2 + "'"
s2, cnt = re.subn(r"'store\.note': '([^']*)'", fix, s)
must(cnt == 10, 'store.note count=%d' % cnt)
s = s2
print('  ok   store.note x%d' % cnt)


# 6. 匯出隨從相關函式（v4.52 測試要驅動 updatePets / makePet）
rep('Shop: Shop, PET_KINDS: PET_KINDS, petKind: petKind,',
    'Shop: Shop, PET_KINDS: PET_KINDS, petKind: petKind, updatePets: updatePets, makePet: makePet, petFollowWork: petFollowWork, spawnPets: spawnPets,',
    'export pets')

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('chars %d -> %d (%+d)' % (before, len(s), len(s) - before))
