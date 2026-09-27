/* テストページ専用。隔離したiframeのUIを操作し、本番保存先には接続しない。 */
document.getElementById('integration').onclick = async function () {
  this.disabled = true;
  const output = document.getElementById('integration-results'); output.textContent = '実行中…';
  const logs = [];
  let sampleStore, priorSampleIds;
  const assert = (value, text) => { if (!value) throw new Error(text); };
  async function wait(condition) {
    const start = Date.now();
    while (!condition()) { if (Date.now() - start > 10000) throw new Error('画面更新が完了しません'); await new Promise(r => setTimeout(r, 20)); }
  }
  try {
    const win = await launchAdmin(), doc = win.document, $ = id => doc.getElementById('quick-' + id);
    await win.openQuick();
    sampleStore = win.NankiruQuickSamples;
    priorSampleIds = new Set((await sampleStore.list('標準')).map(s => s.id));
    const baseline = JSON.parse(win.localStorage.getItem('nankiru_problems') || '[]').length;
    $('text').value = '234567m345p6678s5p'; $('parse').click();
    assert($('cards').children.length === 14, '14枚の表示');
    $('cards').children[9].querySelectorAll('button')[1].click();
    $('source').value = '結合テスト出典'; $('source-memo').value = 'p.24'; $('save').click();
    await wait(() => !$('fields').disabled);
    assert($('message').textContent.includes('保存しました'), '文字列保存');
    assert($('source').value === '結合テスト出典' && !$('source-memo').value && !$('text').value, '連続登録の初期化');
    logs.push('PASS 文字列入力・正解選択・保存・出典のみ引き継ぎ');
    const blob = await (await fetch('test-fixtures/quick-hand.png')).blob();
    const transfer = new win.DataTransfer(); transfer.items.add(new win.File([blob], 'quick-hand.png', { type: 'image/png' }));
    $('file').files = transfer.files; $('file').dispatchEvent(new win.Event('change'));
    await wait(() => !$('fields').disabled && !$('image-area').hidden);
    const canvas = $('image'), rect = canvas.getBoundingClientRect();
    const pointer = (type, x, y) => canvas.dispatchEvent(new win.PointerEvent(type, { pointerId: 1, clientX: rect.left + x * rect.width / canvas.width, clientY: rect.top + y * rect.height / canvas.height, bubbles: true }));
    // 合成イベントは実ポインタを保持しないため、テスト内のみcaptureを置き換える。
    canvas.setPointerCapture = () => {};
    pointer('pointerdown', 20, 30); pointer('pointermove', 968, 120); pointer('pointerup', 968, 120);
    $('crop').click(); assert(!$('split-area').hidden, '分割領域');
    $('boundary-index').value = '13'; $('boundary-index').dispatchEvent(new win.Event('change'));
    $('boundary').dispatchEvent(new win.Event('input'));
    $('recognize').click(); await wait(() => !$('fields').disabled);
    assert($('cards').children.length === 14, '画像から14枚');
    logs.push('PASS 画像読込・矩形指定・境界調整・照合');
    // 誤認識があっても全牌を確実に修正できることを検証。
    const expected = '2m 3m 4m 0m 6m 7m 3p 4p 5p 6s 6s 7s 8s 5z'.split(' ');
    for (let i = 0; i < 14; i++) {
      $('cards').children[i].querySelector('button').click();
      const b = [...$('palette').querySelectorAll('button')].find(b => b.querySelector('img').src.endsWith('/' + expected[i] + '.png'));
      b.click();
    }
    $('cards').children[13].querySelectorAll('button')[1].click();
    $('save').click(); await wait(() => !$('fields').disabled);
    assert($('message').textContent.includes('確認欄'), '画像確認必須');
    $('confirm').checked = true;
    const originalSave = win.persistAdminProblem;
    win.persistAdminProblem = async () => { throw new Error('検証用の通信失敗'); };
    $('save').click(); await wait(() => !$('fields').disabled);
    assert($('message').textContent.includes('通信失敗') && $('cards').children.length === 14, '保存失敗時の保持');
    win.persistAdminProblem = originalSave;
    $('save').click(); $('save').click(); await wait(() => !$('fields').disabled);
    const problems = JSON.parse(win.localStorage.getItem('nankiru_problems'));
    assert(problems.length === baseline + 2, '重複登録しない: baseline=' + baseline + ', actual=' + problems.length);
    const last = problems[problems.length - 1];
    assert(last.hand.join(' ') === expected.join(' ') && last.dora.length === 0 && last.ukeireruAuto.length, '画像問題の保存内容');
    logs.push('PASS 手動修正・確認必須・保存失敗保持・再試行・連打防止・受け入れ計算');
    const savedSamples = await win.NankiruQuickSamples.list('標準');
    assert(savedSamples.some(s => s.code === '0m') && savedSamples.some(s => s.code === '5z'), '修正した見本の保存');
    logs.push('PASS 修正済み画像の端末内見本保存');
    $('text').value = '234567m345p6678s5p'; $('parse').click();
    $('cards').children[9].querySelectorAll('button')[1].click();
    $('source').value = '一覧に未登録の出典'; $('source-memo').value = '問7';
    $('detail').click(); await wait(() => !$('fields').disabled);
    assert(doc.getElementById('screen-editor').style.display !== 'none', '詳細編集画面');
    assert(doc.getElementById('source-select').value === '一覧に未登録の出典' && doc.getElementById('source-memo-input').value === '問7', '出典引継ぎ');
    await win.saveProblem();
    assert(doc.getElementById('screen-list').style.display !== 'none', 'ドラなし詳細保存');
    logs.push('PASS 未登録出典の詳細引継ぎ・ドラなし詳細保存');
    await win.openEditor(last); await win.saveProblem();
    assert(JSON.parse(win.localStorage.getItem('nankiru_problems')).length === baseline + 3, '再編集で件数増加なし');
    logs.push('PASS 保存済み問題の再編集');
    let quizHtml = await (await fetch('../nankiru.html')).text();
    quizHtml = quizHtml.replace(/<script src="https:[^"]+"><\/script>/g, '');
    const fixture = JSON.stringify(last).replace(/</g, '\\u003c');
    const setup = `<base href="../"><script>
      const testData = new Map([['nankiru_local_only','1'],['nankiru_problems',JSON.stringify([${fixture}])]]);
      Object.defineProperty(window,'localStorage',{value:{getItem:k=>testData.get(k)??null,setItem:(k,v)=>testData.set(k,String(v)),removeItem:k=>testData.delete(k)}});
      window.firebase={initializeApp(){},auth:()=>({onAuthStateChanged:fn=>setTimeout(()=>fn(null),0)}),firestore:()=>({})};
    <\/script>`;
    const quizFrame = document.getElementById('quiz-test');
    quizFrame.hidden = false;
    await new Promise(resolve => { quizFrame.onload = resolve; quizFrame.srcdoc = quizHtml.replace('<head>', '<head>' + setup); });
    const qw = quizFrame.contentWindow;
    qw.startSingleQuiz(last);
    const tiles = qw.document.querySelectorAll('#hand-tiles [data-index]');
    assert(tiles.length === 14, 'ドラなし出題14枚');
    // 正解が白なので、萬筒索のランダム入替に左右されない。
    const correct = [...tiles].find(t => t.querySelector('img')?.src.endsWith('/5z.png'));
    assert(correct, '白の正解牌'); correct.click();
    assert(qw.document.getElementById('screen-quiz').classList.contains('is-answered'), '回答完了');
    assert(qw.document.body.textContent.includes('正解！'), '正解判定');
    logs.push('PASS 簡易登録したドラなし問題の出題・正解判定');
    output.textContent = logs.join('\n') + '\n結合テスト完了';
  } catch (e) { output.textContent = logs.join('\n') + '\nFAIL ' + e.message; }
  finally {
    if (sampleStore && priorSampleIds) for (const s of await sampleStore.list('標準')) if (!priorSampleIds.has(s.id)) await sampleStore.remove(s.id);
    this.disabled = false;
  }
};
