const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const base = env.BH.I18N['zh-TW'];
const want = ['關閉', '關閉 混戰', '2 隊', '3 隊', '4 隊', '對戰人數', '組隊對戰', '玩家'];
want.forEach(function (w) {
  const hit = Object.keys(base).filter(function (k) { return base[k] === w; });
  console.log(w + ' -> ' + (hit.length ? hit.join(',') : '(缺)'));
});
