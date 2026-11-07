// test/verify-v550.js —— v5.50：①BOSS 護盾看難度 ②RPG 王血量＝單人曲線+5 ③私訊輸入框不再被重畫
//   ① 簡單 0 片／普通 1 片／困難 3 片；簡單模式火焰直接扣血、不進破防
//   ② RPG 8 章的 BW 都等於 bossHpOf(ch)+5（總魔王保留 def 2）
//   ③ 對話框只在第一次鋪骨架，之後只更新訊息區（輸入框節點不會被換掉）
//   ④ Enter 送出、iOS 16px、離開對話清空
//   ⑤ 版本
const SB = require('./_sandbox');
const env = SB.makeEnv();
const P = env.BH, G = P.Game;
const src = SB.rawHtml;
const S = P.Social._s;
const fs = require('fs');

let pass = 0, fail = 0;
function ok(c, m, extra) {
  if (c) { pass++; console.log('  ✓ ' + m); }
  else { fail++; console.log('  ✗ FAIL: ' + m + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }

P.settings.mapMode = 'classic';           // 地圖不是這支要驗的東西
try { P.WeekMod.pin([]); } catch (e) {}
try { P.RPG.unlocked = P.SOLO_STAGES; } catch (e) {}
try { P.clearMapTest(); } catch (e) {}

/* ================= ① 護盾看難度 ================= */
head('① 護盾片數只看難度');
{
  const d0 = P.settings.soloDiff;
  P.settings.soloDiff = 'easy';
  ok(P.bossShieldMax(1) === 0 && P.bossShieldMax(8) === 0, '簡單：0 片（第 1 章到第 8 章都一樣）');
  P.settings.soloDiff = 'normal';
  ok(P.bossShieldMax(1) === 1 && P.bossShieldMax(8) === 1, '普通：1 片');
  P.settings.soloDiff = 'hard';
  ok(P.bossShieldMax(5) === 3 && P.bossShieldMax(8) === 3, '困難：3 片（不再隨章節增加）');
  P.settings.soloDiff = d0;
  ok(P.BOSS_SHIELD && P.BOSS_SHIELD.easy === 0 && P.BOSS_SHIELD.normal === 1 && P.BOSS_SHIELD.hard === 3,
    '匯出 BOSS_SHIELD = { easy:0, normal:1, hard:3 }', P.BOSS_SHIELD);
}

head('② 決戰場：三個難度各開一次');
{
  P.settings.soloDiff = 'easy';
  P.startSolo(5, false); G.state = 'play';
  const Ae = G.bossArena, Be = Ae.boss;
  ok(Ae.shieldMax === 0 && Ae.shield === 0, '簡單：開場 0 片');
  const hp0 = Be.hp, d = P.flameHitDamage(Be);
  ok(d > 0, '簡單：火焰有傷害（' + d + '）');
  Be.hp -= d;
  ok(Be.hp === hp0 - d && Ae.breakT === 0, '簡單：血直接扣、不進破防（' + hp0 + ' → ' + Be.hp + '）');

  P.settings.soloDiff = 'normal';
  P.startSolo(5, false); G.state = 'play';
  const An = G.bossArena, Bn = An.boss;
  ok(An.shieldMax === 1 && An.shield === 1, '普通：開場 1 片');
  ok(P.flameHitDamage(Bn) === 0, '普通：第一發被盾吃掉');
  ok(An.shield === 0 && An.breakT > 0, '普通：破盾後進破防');
  ok(P.flameHitDamage(Bn) === 2, '普通：破防期 ×2');

  P.settings.soloDiff = 'hard';
  P.startSolo(5, false); G.state = 'play';
  const Ah = G.bossArena, Bh = Ah.boss;
  ok(Ah.shieldMax === 3 && Ah.shield === 3, '困難：開場 3 片');
  let zero = 0;
  for (let i = 0; i < 3; i++) if (P.flameHitDamage(Bh) === 0) zero++;
  ok(zero === 3 && Ah.breakT > 0, '困難：要打 3 下才破盾');
  P.settings.soloDiff = 'normal';
}

head('③ 每日挑戰固定難度（不看玩家設定）');
{
  const d0 = P.settings.soloDiff;
  P.settings.soloDiff = 'hard';
  G.daily = { seed: 12345, stage: 1 };
  ok(P.bossShieldMax(1) === 1, '每日挑戰（固定普通）→ 1 片，不受「困難」影響', P.bossShieldMax(1));
  G.daily = null;
  P.settings.soloDiff = d0;
}

/* ================= ④ RPG 的王 ================= */
head('④ RPG 八章的王血量（單人曲線 ＋ 5）');
{
  let bad = [], rows = [];
  for (let ch = 1; ch <= 8; ch++) {
    const st = ch * P.BOSS_SLOT;
    P.startRpg(st, {});
    const A = G.bossArena;
    const want = P.bossHpOf(ch) + 5;
    const got = A && A.boss ? A.boss.hp : -1;
    rows.push('ch' + ch + ':' + got + '/' + want);
    if (!A || !A.boss || got !== want) bad.push(ch + '→' + got + '≠' + want);
  }
  ok(bad.length === 0, '8 章的王都等於 bossHpOf(章) + 5（' + rows.join(' ') + '）', bad);
  // 第 1 章：普通 10 格、簡單 9 格、困難 11 格
  P.settings.soloDiff = 'normal'; P.startRpg(5, {});
  ok(G.bossArena.boss.hp === 10, '第 1 章普通＝5+5 十格', G.bossArena.boss.hp);
  P.settings.soloDiff = 'easy'; P.startRpg(5, {});
  ok(G.bossArena.boss.hp === 9, '第 1 章簡單＝4+5 九格', G.bossArena.boss.hp);
  P.settings.soloDiff = 'hard'; P.startRpg(5, {});
  ok(G.bossArena.boss.hp === 11, '第 1 章困難＝6+5 十一格', G.bossArena.boss.hp);
  // 總魔王：不再硬寫 48，但保留 def 2
  P.settings.soloDiff = 'normal'; P.startRpg(40, {});
  ok(G.bossArena.boss.hp === 14 && G.bossArena.boss.def === 2, '第 40 關總魔王 14 格 ＋ def 2',
    { hp: G.bossArena.boss.hp, def: G.bossArena.boss.def });
  ok(!/bossFin \? 48/.test(src), '原始碼裡已經沒有「bossFin ? 48」');
}

head('⑤ 單人 vs RPG 的差距');
{
  P.settings.soloDiff = 'normal';
  P.startSolo(5, false); G.state = 'play';
  const soloHp = G.bossArena.boss.hp;
  P.startRpg(5, {});
  const rpgHp = G.bossArena.boss.hp;
  ok(rpgHp === soloHp + 5, '同一章：RPG ' + rpgHp + ' 格 = 單人 ' + soloHp + ' 格 ＋5');
}

/* ================= ⑥ 私訊輸入框 ================= */
head('⑥ 對話框只在第一次鋪骨架（輸入框不會被換掉）');
{
  const box = env.getId('onBody');
  S.chatWith = 'p_test01'; S.view = 'chat'; S.msgs = []; S.chatErr = '';
  P.Social.render();
  const shell = String(box.innerHTML || '');
  ok(shell.indexOf('id="onChatIn"') > 0, '第一次進來鋪出輸入框');
  ok(box.getAttribute('data-chat') === 'p_test01', '骨架記住是跟誰聊（data-chat）', box.getAttribute('data-chat'));
  ok(/autocomplete="off"/.test(shell) && /spellcheck="false"/.test(shell), '輸入框關掉瀏覽器自動填入與拼字建議');
  ok(/enterkeyhint="send"/.test(shell), '手機鍵盤的確認鍵顯示「送出」');

  // 有新訊息 → 只更新訊息區，整塊 HTML 不重鋪
  const lg0 = env.getId('onChatLog');
  S.msgs = [{ from: 'p_test01', m: '第二行訊息' }];
  P.Social.render();
  ok(String(box.innerHTML || '') === shell, '輪詢後整塊對話框沒有被重畫（輸入框還在原處）');
  ok(String(lg0.innerHTML || '').indexOf('第二行訊息') > 0, '訊息區有更新到新訊息');
  const inp = env.getId('onChatIn');
  inp.value = '打到一半的字';
  S.msgs = [{ from: 'p_test01', m: '第三行' }, { from: 'p_test01', m: '第四行' }];
  P.Social.render();
  ok(inp.value === '打到一半的字', '重畫後輸入框裡的字還在（' + inp.value + '）');

  // 離開對話 → 標記清掉，下次進來一定重鋪
  S.view = 'detail'; S.sel = null;
  P.Social.render();
  ok(box.getAttribute('data-chat') === '', '離開對話就清掉 data-chat（下次重鋪、不殘留舊輸入）', box.getAttribute('data-chat'));
}

head('⑦ Enter 送出／iOS 不縮放');
{
  ok(/function onBodyKey\(e\)/.test(src), '有 onBodyKey（輸入框 Enter 送出）');
  ok(/e\.isComposing/.test(src), '中文選字中的 Enter 不攔（isComposing）');
  ok(/bodyEl\.addEventListener\('keydown', onBodyKey\)/.test(src), 'keydown 走委派（重畫不會掉 listener）');
  ok(/send\(inp\.value\); inp\.value = ''; try \{ inp\.focus\(\); \}/.test(src), '送出後清空並把焦點留在輸入框');
  ok(/@media \(hover: none\) and \(pointer: coarse\) \{\s*\.chatin \{ font-size: 16px; \}/.test(src), '觸控裝置輸入框 16px（iOS 不再自動放大）');
}

/* ================= ⑧ 版本 ================= */
head('⑧ 版本戳記');
const vm = src.match(/const VERSION = '([\d.]+)'/);
ok(vm && parseFloat(vm[1]) >= 5.50, 'VERSION ≥ 5.50', vm && vm[1]);
const vlog = String(SB.vlog || fs.readFileSync(__dirname + '/../js/version-log.js', 'utf8'));
ok(/v: '5\.50'[\s\S]{0,260}now: true/.test(vlog), 'VERSION_LOG 5.50 是 now:true');
ok(!/v: '5\.49'[\s\S]{0,260}now: true/.test(vlog), '5.49 已改成 now:false');
[
  ['bomb-hero/sw.js', fs.readFileSync(__dirname + '/../sw.js', 'utf8')],
  ['public/sw.js', fs.readFileSync(__dirname + '/../../public/sw.js', 'utf8')],
  ['bomberman-online/public/sw.js', fs.readFileSync(__dirname + '/../../bomberman-online/public/sw.js', 'utf8')]
].forEach(function (x) {
  const m = x[1].match(/var SW_VERSION = 'v([\d.]+)'/);
  ok(m && parseFloat(m[1]) >= 5.50, x[0] + ' 的 SW_VERSION 也升到 5.50（' + (m && m[1]) + '）');
});

console.log('\n' + (fail === 0 ? '✅ 全部 ' + pass + ' 項通過' : '❌ ' + fail + ' 項失敗 / ' + (pass + fail) + ' 項'));
process.exit(fail === 0 ? 0 : 1);
