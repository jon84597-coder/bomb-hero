// test/_live478.js — 線上驗證「別的 AI 扣血不會出現在我的畫面」
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const URL = process.argv[2] || 'https://jon84597-coder.github.io/bomb-hero/';
const WANT = /const VERSION = '([^']+)'/.exec(fs.readFileSync(require('path').join(__dirname, '../index.html'), 'utf8'))[1];
let pass = 0, fail = 0;
const ok = (n, c, e) => { if (c) { pass++; console.log('  ✓ ' + n + (e ? '（' + e + '）' : '')); } else { fail++; console.log('  ✗ ' + n + (e ? '（' + e + '）' : '')); } };

(async () => {
  const b = await launch({ w: 390, h: 800 });
  const p = await b.newPage();
  await p.send('Runtime.enable');
  await p.goto(URL, 3000);
  for (let i = 0; i < 40; i++) { if (await p.eval('typeof __BH') === 'object') break; await sleep(300); }
  ok('線上版本 = ' + WANT, (await p.eval('__BH.VERSION')) === WANT, await p.eval('__BH.VERSION'));
  ok('字典有 br.hurt', !!(await p.eval("(__BH.I18N.en||{})['br.hurt']")));
  ok('字典有 br.out / br.outMate / br.zone',
    await p.eval("['br.out','br.outMate','br.zone'].every(function(k){return !!__BH.I18N.en[k] && !!__BH.I18N.de[k];})"));

  // 開一場 50 人，把 12 隻 AI 各打一下
  const r = await p.eval(`(function(){
    __BH.BR.opt={n:50,team:1,dur:10}; __BH.startBR();
    var G=__BH.Game; G.state='play'; G.countdown=0;
    var ais=G.players.filter(function(x){return x.ai&&x.alive;});
    var me=G.players[0];
    var b0=(document.getElementById('banner')||{style:{}}).style.display||'';
    var t0=document.getElementById('brTips').children.length;
    for(var i=0;i<12;i++){ var a=ais[i]; if(!a)break; a.brHp=6; a.invuln=0; __BH.killBattlePlayer(a,null); }
    var b1=(document.getElementById('banner')||{style:{}}).style.display||'';
    var txt=(document.getElementById('bannerTxt')||{}).textContent||'';
    var t1=document.getElementById('brTips').children.length;
    // 自己受傷
    me.brHp=5; me.invuln=0; __BH.killBattlePlayer(me,null);
    var t2=document.getElementById('brTips').children.length;
    var b2=(document.getElementById('banner')||{style:{}}).style.display||'';
    return { hp:ais[0].brHp, b0:b0, b1:b1, b2:b2, txt:txt, t0:t0, t1:t1, t2:t2, myHp:me.brHp };
  })()`);
  ok('AI 真的被扣血', r.hp === 5, 'ai.brHp=' + r.hp);
  ok('打 12 隻 AI → 沒有中央 banner', r.b1 !== 'flex' && !/\d/.test(r.txt || ''), 'display="' + r.b1 + '" txt="' + (r.txt || '') + '"');
  ok('打 12 隻 AI → 右上提示沒增加', r.t1 === r.t0, r.t0 + ' → ' + r.t1);
  ok('自己受傷 → 有提示', r.t2 > r.t1, r.t1 + ' → ' + r.t2);
  ok('自己受傷 → 也不用中央 banner', r.b2 !== 'flex', 'display="' + r.b2 + '"');
  ok('自己的血量有扣', r.myHp === 4, 'brHp=' + r.myHp);

  const errs = await p.eval('(window.__errs||[]).length');
  ok('沒有 JS 例外', !errs, 'errCnt=' + errs);
  await b.close();
  console.log('\n' + (fail ? '✗ ' + fail + ' 失敗 / ' + pass + ' 通過' : '✅ 全部 ' + pass + ' 通過'));
  process.exit(fail ? 1 : 0);
})();
