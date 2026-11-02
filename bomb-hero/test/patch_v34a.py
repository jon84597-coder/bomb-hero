# -*- coding: utf-8 -*-
# v3.4：修「手機連電腦的場玩到一半自己跳出暫停選單」
#   元兇：手機的系統返回手勢（螢幕左右邊緣往內滑）會觸發 history.back() → popstate
#         → onPop() 在遊戲中一律 togglePause()，而手機線上對戰是客人 → 跳出
#         「⏸ 線上對戰由房主的裝置持續進行」選單（搖桿就在左邊緣，超容易誤觸）。
#   修法：遊戲中收到 popstate → 先把 history 補回去「吃掉」返回；只有 PC（非觸控）
#         才把瀏覽器返回鍵當暫停。手機玩家用 ⏸ 鈕或 ← 上一頁 本來就能暫停／離開。
import io, sys
PATH = 'index.html'
src = io.open(PATH, encoding='utf-8').read()

old1 = """  function onPop() {
    if (cur === 'game') { try { togglePause(); } catch (e) {} try { history.pushState({ bh: 'game' }, ''); } catch (e) {} return; }
    if (stack.length > 1) stack.pop();
    apply(stack[stack.length - 1] || 'title');
  }"""
new1 = """  function onPop() {
    if (cur === 'game') {
      // v3.4：手機的系統返回手勢（邊緣往內滑）會在玩到一半誤觸 → 先補回 history 吃掉返回；
      //       只有 PC（非觸控）的瀏覽器返回鍵才當暫停。手機用 ⏸ 鈕或 ← 上一頁 就能暫停／離開。
      try { history.pushState({ bh: 'game' }, ''); } catch (e) {}
      if (!document.body.classList.contains('touch')) {
        try { togglePause(); } catch (e) {}
      }
      return;
    }
    if (stack.length > 1) stack.pop();
    apply(stack[stack.length - 1] || 'title');
  }"""
if src.count(old1) != 1:
    print('FAIL old1', src.count(old1)); sys.exit(1)
src = src.replace(old1, new1, 1)

old2 = "const VERSION = '3.3';"
new2 = "const VERSION = '3.4';"
if src.count(old2) != 1:
    print('FAIL ver', src.count(old2)); sys.exit(1)
src = src.replace(old2, new2, 1)

old3 = '<div class="ver beta">測試版 v<span id="verTxt">3.3</span></div>'
new3 = '<div class="ver beta">測試版 v<span id="verTxt">3.4</span></div>'
if src.count(old3) != 1:
    print('FAIL verTxt', src.count(old3)); sys.exit(1)
src = src.replace(old3, new3, 1)

io.open(PATH, 'w', encoding='utf-8', newline='\n').write(src)
print('v3.4a OK')
