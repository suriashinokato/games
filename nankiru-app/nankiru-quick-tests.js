/* node nankiru-app/nankiru-quick-tests.js または quick-test.html で実行。 */
(async function () {
  'use strict';
  const node = typeof window === 'undefined';
  if (node) { require('./nankiru-quick-core.js'); require('./nankiru-problem-store.js'); }
  const core = NankiruQuickCore, store = NankiruProblemStore;
  let passed = 0, failed = 0;
  const lines = [];
  function assert(value, text) { if (!value) throw new Error(text); }
  async function test(name, action) {
    try { await action(); passed++; lines.push('PASS ' + name); }
    catch (e) { failed++; lines.push('FAIL ' + name + ': ' + e.message); }
  }
  function rejects(action) { let rejected = false; try { action(); } catch (_) { rejected = true; } assert(rejected, 'エラーにならない'); }
  const hand = core.parse('234567m345p6678s5p');
  await test('牌姿14枚と最後のツモ牌を保持', () => { assert(hand.length === 14 && hand[13] === '5p'); core.validate(hand, ['6s', '5p']); });
  await test('全角・大文字・改行を正規化', () => assert(JSON.stringify(core.parse('２３４５６７Ｍ\n３４５ｐ ６６７８ｓ５ｐ')) === JSON.stringify(hand)));
  await test('赤牌と全7字牌', () => assert(core.parse('0m0p0s1234567z').length === 10));
  await test('未解釈文字を捨てない', () => { for (const s of ['123m!', '123m4', '0z', '8z', '123x', '']) rejects(() => core.parse(s)); });
  await test('13枚・15枚・正解なし・手牌外正解', () => {
    rejects(() => core.validate(hand.slice(1), ['6s'])); rejects(() => core.validate([...hand, '1z'], ['6s']));
    rejects(() => core.validate(hand, [])); rejects(() => core.validate(hand, ['1z']));
  });
  await test('赤込み5枚・同色赤2枚の拒否', () => {
    rejects(() => core.validateTiles(core.parse('05555m'))); rejects(() => core.validateTiles(core.parse('00s')));
    core.validateTiles(core.parse('0555m'));
  });
  const problem = () => ({ id: 'test-1', hand: [...hand], correctAnswer: ['6s'], melds: [], dora: [], ukeireru: [] });
  function memory() {
    const data = new Map();
    return { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) };
  }
  await test('ローカル保存・再試行・既存問題と順番の保持・JSON往復', async () => {
    const storage = memory(); storage.setItem('p', '[{"id":"old"}]'); storage.setItem('o', '["old"]');
    const options = { storage, problemKey: 'p', orderKey: 'o', loadProblems: async () => JSON.parse(storage.getItem('p') || '[]') };
    await store.save(problem(), options); await store.save(problem(), options);
    const data = JSON.parse(storage.getItem('p')); assert(data.length === 2 && data[0].id === 'old');
    assert(storage.getItem('o') === '["old","test-1"]'); assert(data[1].dora.length === 0 && data[1].correctAnswer[0] === '6s');
  });
  await test('ローカル順番保存失敗時に問題をロールバック', async () => {
    const storage = memory(), original = storage.setItem; let fail = true;
    storage.setItem = (key, value) => { if (key === 'o' && fail) { fail = false; throw new Error('容量不足'); } original(key, value); };
    let error;
    try { await store.save(problem(), { storage, problemKey: 'p', orderKey: 'o', loadProblems: async () => [] }); } catch (e) { error = e; }
    assert(error && storage.getItem('p') === null && storage.getItem('o') === null);
  });
  await test('Firestoreは問題と順番を同一トランザクションで保存・失敗を通知', async () => {
    let fail = true; const saved = new Map();
    const db = { doc: path => path, runTransaction: async callback => {
      const pending = new Map();
      await callback({ get: async ref => ({ exists: saved.has(ref), data: () => saved.get(ref) }), set: (ref, data) => pending.set(ref, data) });
      if (fail) throw new Error('通信失敗'); pending.forEach((value, key) => saved.set(key, value));
    } };
    let rejected = false;
    try { await store.save(problem(), { db, uid: 'test' }); } catch (_) { rejected = true; }
    assert(rejected && saved.size === 0); fail = false;
    await store.save(problem(), { db, uid: 'test' }); await store.save(problem(), { db, uid: 'test' });
    assert(saved.size === 2 && saved.get('users/test/meta/problemOrder').order.length === 1);
  });
  await test('受け入れ計算成功・失敗を記録', () => {
    const p = problem(); store.calculate(p, { calcAndAttach: () => ({ ukeireru: [{ tile: '6s', count: 10 }] }) });
    assert(p.ukeireru[0].count === 10);
    store.calculate(p, { calcAndAttach: () => { throw new Error('test'); } }); assert(p.ukeireruMeta.calcSkipped);
  });
  if (!node) {
    await test('37種類を縮小・拡大して照合（白・赤牌を含む）', async () => {
      const images = await Promise.all(core.codes.map(async code => { const image = new Image(); image.src = '../shared/images_hai/' + code + '.png'; await image.decode(); return { code, image }; }));
      const templates = images.map(t => ({ code: t.code, feature: core.feature(t.image) }));
      for (const { code, image } of images) for (const scale of [.7, 1.5]) {
        const c = document.createElement('canvas'); c.width = Math.round(image.width * scale); c.height = Math.round(image.height * scale);
        c.getContext('2d').drawImage(image, 0, 0, c.width, c.height);
        assert(core.rank(core.feature(c), templates)[0].code === code, code + ' scale=' + scale);
      }
    });
    await test('14分割とツモ前の隙間・境界の順序', () => {
      const c = document.createElement('canvas'); c.width = 950; c.height = 90;
      const ctx = c.getContext('2d'); ctx.fillStyle = '#ddd'; ctx.fillRect(0, 0, c.width, c.height);
      for (let i = 0; i < 14; i++) { ctx.fillStyle = '#fff'; ctx.fillRect(i * 66 + (i === 13 ? 20 : 0), 0, 64, 90); }
      const bounds = core.boundaries(c); assert(bounds.length === 15 && bounds[0] === 0 && bounds[14] === 950);
      assert(bounds.every((b, i) => i === 0 || b > bounds[i - 1]));
    });
    await test('検証画像の分割から14枚の照合まで（ツモ前に24pxの空白）', async () => {
      const image = new Image(); image.src = 'test-fixtures/quick-hand.png'; await image.decode();
      const strip = core.crop(image, { x: 20, y: 30, w: 948, h: 90 });
      const edges = core.boundaries(strip);
      const refs = await Promise.all(core.codes.map(async code => {
        const img = new Image(); img.src = '../shared/images_hai/' + code + '.png'; await img.decode(); return { code, feature: core.feature(img) };
      }));
      const result = edges.slice(0, -1).map((x, i) => core.rank(core.feature(core.crop(strip, { x, y: 0, w: edges[i + 1] - x, h: 90 })), refs)[0].code);
      assert(result.join(' ') === '2m 3m 4m 0m 6m 7m 3p 4p 5p 6s 6s 7s 8s 5z', result.join(' ') + ' / edges=' + edges.join(','));
    });
    await test('見本の保存・重複抑止・再読込・削除', async () => {
      const name = '__test_' + Date.now();
      const c = document.createElement('canvas'); c.width = 24; c.height = 32;
      const entry = { code: '5z', image: c.toDataURL() };
      try {
        await NankiruQuickSamples.save(name, [entry, entry]);
        const list = await NankiruQuickSamples.list(name); assert(list.length === 1 && list[0].code === '5z');
        await NankiruQuickSamples.remove(list[0].id); assert((await NankiruQuickSamples.list(name)).length === 0);
      } finally { for (const s of await NankiruQuickSamples.list(name)) await NankiruQuickSamples.remove(s.id); }
    });
    await test('実ライブラリでドラなし受け入れ計算', () => {
      const p = problem(); store.calculate(p, NankiruShanten); assert(!p.ukeireruMeta?.calcSkipped && p.ukeireruAuto.length > 0);
    });
    document.getElementById('results').textContent = lines.join('\n');
    document.getElementById('summary').textContent = passed + ' PASS / ' + failed + ' FAIL';
  } else { console.log(lines.join('\n') + '\n' + passed + ' PASS / ' + failed + ' FAIL'); process.exitCode = failed ? 1 : 0; }
})();
