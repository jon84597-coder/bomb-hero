// 探針：RPG 配點畫面（v5.45 價格階）
// 用真實瀏覽器截圖 + 讀回按鈕文字，確認「前 4 格＋、第 5 格起寫價錢」
const CDP = require('./cdp');

const W = +(process.argv[2] || 430), H = +(process.argv[3] || 932);
const TAG = process.argv[4] || 'a';

(async () => {
  const b = await CDP.launch({ w: W, h: H });
  const p = await b.newPage();
  try {
    await p.resize(W, H, true);
    await p.goto('http://127.0.0.1:3111/', 2200);
    const rows = await p.eval(`(function(){
      document.body.classList.add('touch','slidepad');
      __BH.Screen.show('rpg');
      var R = __BH.RPG;
      R.alloc = { hp: 6, def: 4, spd: 2, atk: 0 };
      R.paid  = { hp: 2, def: 0, spd: 0, atk: 0 };
      R.bought = 2;
      __BH.Rpg.render();
      var out = [];
      var rs = document.querySelectorAll('#rpgRows .rpgrow');
      for (var i=0;i<rs.length;i++){
        var k = rs[i].getAttribute('data-k');
        var b = rs[i].querySelector('[data-d="1"]');
        out.push(k + '=' + b.textContent.trim() + (b.disabled?'(disabled)':''));
      }
      return { rows: out, left: (document.getElementById('rpgLeft')||{}).textContent,
               hint: (document.getElementById('rpgBuyHint')||{}).textContent };
    })()`);
    console.log(JSON.stringify(rows, null, 1));
    await new Promise(r => setTimeout(r, 500));
    await p.shot('test/_v545/rpg-price-' + TAG + '.png');
    console.log('shot ok');
  } finally { await b.close(); }
})();
