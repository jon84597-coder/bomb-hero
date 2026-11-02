# -*- coding: utf-8 -*-
"""v4.22 patch E：⋮ 選單加「🔄 強制更新」—— 卡在舊版時自己一鍵清快取"""
import io

P = 'index.html'
s = io.open(P, encoding='utf-8').read().replace('\r\n', '\n')

def rep(old, new, tag):
    global s
    n = s.count(old)
    assert n == 1, '[%s] 找到 %d 次' % (tag, n)
    s = s.replace(old, new)
    print('ok  ' + tag)

# 1) HTML：選單最後加一顆
rep("""      <button class="navbtn pwa" id="btnInstall" type="button" title="加入桌面捷徑">
        <span class="pwico" aria-hidden="true"></span><b>下載 App</b>
      </button>
    </div>""",
"""      <button class="navbtn pwa" id="btnInstall" type="button" title="加入桌面捷徑">
        <span class="pwico" aria-hidden="true"></span><b>下載 App</b>
      </button>
      <!-- v4.22：卡在舊版時的救命按鈕 -->
      <button class="navbtn" id="btnForceUpd" type="button" title="清掉舊快取，換成最新版">🔄 <b>強制更新</b></button>
    </div>""", 'R1 強制更新按鈕')

# 2) JS：清 SW + 快取後重新載入
rep("""  const big = $id('btnAcctBig');""",
"""  /* v4.22：強制更新 —— 有些 WebView（LINE／FB／桌面捷徑）會一直黏著舊的
     Service Worker 快取，玩家就會「明明改了卻還是舊版」。這顆按鈕一次清乾淨。 */
  const fu = $id('btnForceUpd');
  if (fu) {
    fu.addEventListener('click', function () {
      try { AudioSys.ensure(); AudioSys.sfx('click'); } catch (err) {}
      try { toast('🔄 正在清舊快取，馬上換成最新版…', 2.6); } catch (err) {}
      const done = function () { try { location.reload(); } catch (err) {} };
      try {
        if (!navigator.serviceWorker || !navigator.serviceWorker.getRegistrations) { done(); return; }
        navigator.serviceWorker.getRegistrations().then(function (rs) {
          return Promise.all(rs.map(function (r) { try { return r.unregister(); } catch (e) { return null; } }));
        }).then(function () {
          if (!window.caches || !caches.keys) return null;
          return caches.keys().then(function (ks) {
            return Promise.all(ks.map(function (k) { try { return caches.delete(k); } catch (e) { return null; } }));
          });
        }).then(done).catch(done);
      } catch (err) { done(); }
    });
  }

  const big = $id('btnAcctBig');""", 'R2 強制更新邏輯')

io.open(P, 'w', encoding='utf-8', newline='').write(s.replace('\n', '\r\n'))
print('寫回 index.html')
