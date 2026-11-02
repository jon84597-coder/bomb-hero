# -*- coding: utf-8 -*-
# v4.38b：縮圈 AI 不再「只有正在逃跑時」才放彈 —— 站在安全處、旁邊還有 2 條退路時也會進攻
import io, os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
P = os.path.join(ROOT, 'index.html')
s = io.open(P, encoding='utf-8', newline='').read()
CRLF = '\r\n' in s

OLD = """      // 進攻：自己不在火線上、而且確認有逃命路線，才放彈（不然會自己把退路封死）
      if (!bombDanger && flee && !p.carry && !bombAt(cx, cy)) {"""
NEW = """      // 進攻：自己不在火線上、而且確認有逃命路線，才放彈（不然會自己把退路封死）
      //   v4.38b：以前「flee 有值」才放（＝只在被壓得往內跑時才炸），所以站在安全區
      //   就跟對手大眼瞪小眼。現在只要「腳下安全 ＋ 還有 2 條以上退路」就主動開炸。
      const hasExit = !!flee || safeOpts.length >= 2;
      if (!bombDanger && hasExit && !p.carry && !bombAt(cx, cy)) {"""
if CRLF:
    OLD = OLD.replace('\n', '\r\n')
    NEW = NEW.replace('\n', '\r\n')
assert s.count(OLD) == 1, s.count(OLD)
s = s.replace(OLD, NEW)
io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('ok [sdai-attack]')
