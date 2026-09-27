/* 簡易登録UI。スクショはCanvasのみで処理し、ネットワークへ送信しない。 */
(function () {
  'use strict';
  const core = NankiruQuickCore, samples = NankiruQuickSamples;
  const $ = id => document.getElementById('quick-' + id);
  const screen = document.createElement('div');
  screen.id = 'screen-quick'; screen.className = 'screen'; screen.style.display = 'none';
  screen.innerHTML = `
    <fieldset id="quick-fields">
      <div class="page-header"><span class="page-title">簡易登録</span><button class="btn btn-ghost" id="quick-back">← 一覧へ</button></div>
      <p class="quick-note">副露のない14枚の問題を登録します。AI・外部画像認識サービスは使いません。</p>
      <section class="section"><h2 class="section-title">1. 牌姿を入力</h2>
        <details open><summary>牌画像から入力</summary>
          <p class="quick-note">牌を選んで14枚を作れます。入力済みの牌を押すと、その1枚を削除します。最後の1枚がツモ牌です。</p>
          <p id="quick-hand-count" aria-live="polite">手牌 0 / 14枚</p>
          <div id="quick-hand-input" class="quick-tile-row" aria-label="入力済みの手牌"></div>
          <div id="quick-hand-palette" class="quick-input-palette" aria-label="手牌を追加"></div>
          <button class="btn btn-ghost" id="quick-hand-clear">手牌をクリア</button>
        </details>
        <label for="quick-text">牌姿文字列（m: 萬子 / p: 筒子 / s: 索子 / z: 東南西北白發中、0: 赤5）</label>
        <textarea id="quick-text" rows="2" placeholder="234567m345p6678s5p" spellcheck="false"></textarea>
        <button class="btn btn-ghost" id="quick-parse">文字列を反映</button>
        <p class="quick-note">またはスクショを読み込み、手牌の一列だけを指やマウスで囲んでください。</p>
        <div id="quick-drop"><label>画像を選択 <input id="quick-file" type="file" accept="image/png,image/jpeg,image/webp"></label>
          <p class="quick-note">ここへ画像をドロップ、または画像を貼り付け（Ctrl / ⌘ + V）できます。画像全体は保存されません。</p></div>
        <div class="quick-row"><label>見本セット <select id="quick-set"><option>標準</option></select></label>
          <input id="quick-set-name" type="text" placeholder="新しい絵柄名" aria-label="新しい見本セット名" maxlength="80">
          <button class="btn btn-ghost" id="quick-add-set">セット追加</button></div>
        <div id="quick-image-area" hidden>
          <canvas id="quick-image" aria-label="手牌の範囲をドラッグで指定"></canvas>
          <div class="quick-row"><button class="btn btn-ghost" id="quick-crop">選択範囲を14枚に分割</button></div>
          <div id="quick-split-area" hidden>
            <p class="quick-note">周囲と牌の間の余白を除いた画像です。線をドラッグして牌の境界を調整できます。</p>
            <canvas id="quick-split" aria-label="14枚の分割境界を調整"></canvas>
            <div class="quick-row"><label>調整する境界 <select id="quick-boundary-index"></select></label></div>
            <input id="quick-boundary" type="range" aria-label="選択した境界の位置">
            <button class="btn btn-accent" id="quick-recognize">牌の候補を読み取る</button>
            <p class="quick-note">見本と絵柄が違う場合は誤認識します。必ず元画像と照合してください。</p>
          </div>
        </div>
      </section>
      <section class="section"><h2 class="section-title">ドラ表示牌（任意）</h2>
        <p class="quick-note">ドラそのものではなく、表示されている牌を選んでください。最大4枚。入力済みの牌を押すと削除できます。</p>
        <p id="quick-dora-count" aria-live="polite">ドラ表示牌 0 / 4枚</p>
        <div id="quick-dora-input" class="quick-tile-row" aria-label="入力済みのドラ表示牌"></div>
        <details><summary>ドラ表示牌を選ぶ</summary><div id="quick-dora-palette" class="quick-input-palette" aria-label="ドラ表示牌を追加"></div></details>
      </section>
      <section class="section"><h2 class="section-title">2. 牌姿を確認し、正解牌を選択</h2>
        <p class="quick-note">画像入力時は各枠の左が元画像、右が候補です。「牌を修正」で変更します。正解は複数選択できます。</p>
        <div id="quick-cards"></div>
        <label id="quick-confirm-row" hidden><input id="quick-confirm" type="checkbox">14枚すべてを元画像と照合しました</label>
        <p id="quick-remember-row" hidden><label><input id="quick-remember" type="checkbox" checked>確認済みの切り抜きと牌の種類を、この端末の見本セットに保存する</label></p>
      </section>
      <section class="section"><h2 class="section-title">3. 出典（任意）</h2>
        <div class="quick-row"><label>出典名 <input id="quick-source" type="text" list="quick-sources" placeholder="本・アプリの名前"></label><datalist id="quick-sources"></datalist>
          <label>ページ・問題番号 <input id="quick-source-memo" type="text" placeholder="p.24 問15"></label></div>
        <p class="quick-note">解説・タグ・局情報は詳細編集で後から追加できます。</p>
        <div class="quick-row"><button class="btn btn-accent" id="quick-save">保存して次を登録</button>
          <button class="btn btn-ghost" id="quick-detail">詳細編集へ引き継ぐ</button></div>
      </section>
      <details class="section" id="quick-sample-details"><summary>端末内の見本を管理</summary>
        <p class="quick-note">選択中のセットの見本です。削除すると元に戻せません。問題データには影響しません。</p>
        <div id="quick-sample-list"></div>
      </details>
    </fieldset>
    <div id="quick-message" role="status" aria-live="polite"></div>
    <dialog id="quick-picker"><h3>牌を修正</h3><p>候補</p><div id="quick-candidates"></div><p>すべての牌</p><div id="quick-palette"></div><button id="quick-close-picker">閉じる</button></dialog>`;
  document.body.appendChild(screen);
  let hand = [], dora = [], answers = [], pieces = [], ranked = [], sourceImage = null, selection = null, strip = null, edges = [];
  let imageMode = false, busy = false, pendingId = null, baseTemplates, textDirty = false;
  const label = code => code ? tileLabel(code) : '未確定';
  function message(text, error = false) { $('message').textContent = text; $('message').className = error ? 'error' : ''; }
  function invalidate() { $('confirm').checked = false; pendingId = null; }
  function button(text, action) { const b = document.createElement('button'); b.type = 'button'; b.textContent = text; b.onclick = action; return b; }
  function tileImage(code) { const img = new Image(); img.src = '../shared/images_hai/' + code + '.png'; img.alt = label(code); return img; }
  async function loadImage(url) { const img = new Image(); img.src = url; await img.decode(); return img; }
  async function lock(action) {
    if (busy) return;
    busy = true; $('fields').disabled = true;
    try { await action(); } catch (e) { message(e.message || String(e), true); }
    finally { busy = false; $('fields').disabled = false; }
  }
  function syncText() { $('text').value = hand.map(c => c || '?').join(''); textDirty = false; }
  $('text').oninput = () => { textDirty = true; };
  function renderInput() {
    $('hand-count').textContent = '手牌 ' + hand.length + ' / 14枚';
    $('dora-count').textContent = 'ドラ表示牌 ' + dora.length + ' / 4枚';
    for (const [target, tiles] of [['hand', hand], ['dora', dora]]) {
      const row = $(target + '-input'); row.replaceChildren();
      tiles.forEach((code, index) => {
        const b = button((index + 1) + ': ' + label(code) + ' ×', () => {
          if (textDirty && target === 'hand') { message('先に変更した文字列を反映してください。', true); return; }
          tiles.splice(index, 1);
          if (target === 'hand') {
            pieces.splice(index, 1); ranked.splice(index, 1);
            answers = answers.filter(c => hand.includes(c)); invalidate(); syncText();
          }
          render();
        });
        if (code) b.prepend(tileImage(code)); row.appendChild(b);
      });
      for (const b of $(target + '-palette').querySelectorAll('button')) {
        let allowed = tiles.length < (target === 'hand' ? 14 : 4);
        try { core.validateTiles([...hand.filter(Boolean), ...dora, b.dataset.code]); } catch (_) { allowed = false; }
        b.disabled = !allowed;
      }
    }
  }
  function buildInputPalette(target) {
    for (const suit of ['m', 'p', 's', 'z']) {
      const row = document.createElement('div'); row.className = 'quick-tile-row';
      core.codes.filter(c => c[1] === suit).forEach(code => {
        const b = button(label(code), () => {
          if (target === 'hand' && textDirty) { message('先に変更した文字列を反映してください。', true); return; }
          try {
            const tiles = target === 'hand' ? hand : dora;
            if (tiles.length >= (target === 'hand' ? 14 : 4)) return;
            core.validateTiles([...hand.filter(Boolean), ...dora, code]); tiles.push(code);
            if (target === 'hand') { pieces.push(null); ranked.push(null); invalidate(); syncText(); }
            render(); message('');
          } catch (e) { message(e.message, true); }
        });
        b.dataset.code = code; b.setAttribute('aria-label', label(code) + 'を' + (target === 'hand' ? '手牌' : 'ドラ表示牌') + 'に追加');
        b.prepend(tileImage(code)); row.appendChild(b);
      });
      $(target + '-palette').appendChild(row);
    }
  }
  buildInputPalette('hand'); buildInputPalette('dora');
  $('hand-clear').onclick = () => { resetHand(); render(); message(''); };
  function render() {
    renderInput();
    const container = $('cards'); container.replaceChildren();
    hand.forEach((code, index) => {
      const card = document.createElement('div');
      const uncertain = ranked[index] && (ranked[index][0].score > .025 || (ranked[index][1] && ranked[index][1].score - ranked[index][0].score < .004));
      card.className = 'quick-card' + (uncertain || !code ? ' uncertain' : '') + (answers.includes(code) ? ' answer' : '');
      const note = document.createElement('small'); note.textContent = (index + 1) + (index === 13 ? ' ツモ' : '') + (uncertain ? ' 要確認' : ''); card.appendChild(note);
      const pair = document.createElement('div'); pair.className = 'quick-pair';
      if (pieces[index]) { const img = new Image(); img.src = pieces[index].toDataURL(); img.alt = '元画像 ' + (index + 1); pair.appendChild(img); }
      if (code) pair.appendChild(tileImage(code)); card.appendChild(pair);
      card.appendChild(button(label(code) + ' 牌を修正', () => openPicker(index)));
      const answer = button(answers.includes(code) ? '✓ 正解' : '正解にする', () => {
        answers = answers.includes(code) ? answers.filter(c => c !== code) : [...answers, code]; render();
      });
      answer.disabled = !code;
      answer.setAttribute('aria-pressed', answers.includes(code)); card.appendChild(answer);
      if (index !== 13) card.appendChild(button('ツモ牌にする', () => {
        for (const a of [hand, pieces, ranked]) if (a.length) a.push(a.splice(index, 1)[0]);
        invalidate(); syncText(); render();
      }));
      container.appendChild(card);
    });
    $('confirm-row').hidden = $('remember-row').hidden = !imageMode;
  }
  function openPicker(index) {
    const choose = code => {
      hand[index] = code; answers = answers.filter(c => hand.includes(c)); ranked[index] = null;
      invalidate(); syncText(); render(); $('picker').close();
    };
    function fill(el, codes) {
      el.replaceChildren(); codes.forEach(code => {
        const b = button(label(code), () => choose(code)); b.prepend(tileImage(code)); el.appendChild(b);
      });
    }
    fill($('candidates'), (ranked[index] || []).slice(0, 3).map(r => r.code));
    fill($('palette'), core.codes); $('picker').showModal();
  }
  $('close-picker').onclick = () => $('picker').close();
  function resetHand() {
    hand = []; answers = []; pieces = []; ranked = []; sourceImage = selection = strip = null; edges = [];
    imageMode = false; pendingId = null; textDirty = false; $('text').value = ''; $('file').value = '';
    $('confirm').checked = false;
    $('image-area').hidden = $('split-area').hidden = true;
  }
  function clear(source = '') {
    resetHand(); dora = [];
    $('source').value = source; $('source-memo').value = ''; render();
  }
  window.openQuick = async function () {
    showScreen('quick');
    try {
      const list = await loadSources(); $('sources').replaceChildren();
      list.forEach(s => { const opt = document.createElement('option'); opt.value = s; $('sources').appendChild(opt); });
      const sets = await samples.sets(), current = $('set').value;
      $('set').replaceChildren(...['標準', ...sets.map(s => s.name).filter(s => s !== '標準')].map(name => new Option(name, name)));
      if ([...$('set').options].some(o => o.value === current)) $('set').value = current;
    } catch (e) { message('端末内の見本を読み込めません。見本を保存せずに登録できます。' + e.message, true); }
  };
  $('back').onclick = () => openList();
  $('parse').onclick = () => {
    try {
      const next = core.parse($('text').value);
      if (next.length !== 14) throw new Error('14枚入力してください（現在 ' + next.length + ' 枚）。');
      core.validateTiles([...next, ...dora]);
      resetHand();
      hand = next; syncText(); render(); message('正解牌を選んで保存できます。最後の1枚がツモ牌です。');
    } catch (e) { message(e.message, true); }
  };
  async function acceptFile(file) {
    if (busy || !file) return;
    await lock(async () => {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('PNG・JPEG・WebP画像を選択してください。');
      if (file.size > 25 * 1024 * 1024) throw new Error('画像は25MB以下にしてください。');
      const url = URL.createObjectURL(file);
      let image;
      try { image = await loadImage(url); } finally { URL.revokeObjectURL(url); }
      resetHand();
      const scale = Math.min(1, 2400 / Math.max(image.width, image.height));
      const small = document.createElement('canvas'); small.width = Math.round(image.width * scale); small.height = Math.round(image.height * scale);
      small.getContext('2d').drawImage(image, 0, 0, small.width, small.height); sourceImage = small;
      imageMode = true; $('image-area').hidden = false; drawImage(); render();
      message('手牌14枚の一列を、外枠に沿って囲んでください。');
    });
  }
  $('file').onchange = e => acceptFile(e.target.files[0]);
  $('drop').ondragover = e => { e.preventDefault(); $('drop').classList.add('dragover'); };
  $('drop').ondragleave = () => $('drop').classList.remove('dragover');
  $('drop').ondrop = e => { e.preventDefault(); $('drop').classList.remove('dragover'); acceptFile(e.dataTransfer.files[0]); };
  document.addEventListener('paste', e => {
    if (screen.style.display === 'none' || busy) return;
    const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'));
    if (item) { e.preventDefault(); acceptFile(item.getAsFile()); }
  });
  function point(event, canvas) {
    const rect = canvas.getBoundingClientRect();
    return { x: Math.max(0, Math.min(canvas.width, (event.clientX - rect.left) * canvas.width / rect.width)), y: Math.max(0, Math.min(canvas.height, (event.clientY - rect.top) * canvas.height / rect.height)) };
  }
  function drawImage() {
    const c = $('image'); c.width = sourceImage.width; c.height = sourceImage.height;
    const ctx = c.getContext('2d'); ctx.drawImage(sourceImage, 0, 0);
    if (selection) { ctx.strokeStyle = '#ef3131'; ctx.lineWidth = Math.max(2, c.width / 400); ctx.strokeRect(selection.x, selection.y, selection.w, selection.h); }
  }
  let anchor = null;
  $('image').onpointerdown = e => {
    if (busy || !sourceImage) return;
    anchor = point(e, $('image')); $('image').setPointerCapture(e.pointerId);
  };
  $('image').onpointermove = e => {
    if (!anchor) return;
    const p = point(e, $('image'));
    selection = { x: Math.min(anchor.x, p.x), y: Math.min(anchor.y, p.y), w: Math.abs(p.x - anchor.x), h: Math.abs(p.y - anchor.y) };
    hand = []; pieces = []; ranked = []; answers = []; invalidate(); render();
    $('split-area').hidden = true; drawImage();
  };
  $('image').onpointerup = $('image').onpointercancel = () => { anchor = null; };
  $('crop').onclick = () => {
    try {
      if (!selection || selection.w < 140 || selection.h < 15) throw new Error('手牌の一列を囲んでください（横140px・縦15px以上）。');
      strip = core.prepareStrip(core.crop(sourceImage, selection)); edges = core.boundaries(strip);
      $('split-area').hidden = false; hand = []; pieces = []; ranked = []; answers = []; invalidate(); render(); drawSplit();
      message('余白を除きました。境界を確認し、「牌の候補を読み取る」を押してください。');
    } catch (e) { message(e.message, true); }
  };
  for (let i = 1; i < 14; i++) $('boundary-index').add(new Option(i + '枚目と' + (i + 1) + '枚目の間', i));
  function drawSplit() {
    const c = $('split'); c.width = strip.width; c.height = strip.height;
    const ctx = c.getContext('2d'); ctx.drawImage(strip, 0, 0); ctx.strokeStyle = '#ef3131'; ctx.lineWidth = Math.max(1, c.width / 600);
    for (const x of edges.slice(1, -1)) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, c.height); ctx.stroke(); }
    const i = Number($('boundary-index').value);
    $('boundary').min = edges[i - 1] + 2; $('boundary').max = edges[i + 1] - 2; $('boundary').value = edges[i];
  }
  function changeBoundary(value) {
    const i = Number($('boundary-index').value);
    edges[i] = Math.max(edges[i - 1] + 2, Math.min(edges[i + 1] - 2, Math.round(value)));
    hand = []; pieces = []; ranked = []; answers = []; invalidate(); render(); drawSplit();
  }
  $('boundary-index').onchange = drawSplit;
  $('boundary').oninput = e => changeBoundary(Number(e.target.value));
  let dragging = false;
  $('split').onpointerdown = e => {
    if (busy) return;
    const p = point(e, $('split'));
    const nearest = edges.slice(1, -1).reduce((best, x, index) => Math.abs(x - p.x) < Math.abs(edges[best] - p.x) ? index + 1 : best, 1);
    $('boundary-index').value = nearest; dragging = true; $('split').setPointerCapture(e.pointerId); drawSplit();
  };
  $('split').onpointermove = e => { if (dragging) changeBoundary(point(e, $('split')).x); };
  $('split').onpointerup = $('split').onpointercancel = () => { dragging = false; };
  async function templates() {
    if (!baseTemplates) {
      // file://でCanvasが制限されるブラウザでも、手動修正による登録は可能。
      baseTemplates = await Promise.all(core.codes.map(async code => ({ code, feature: core.feature(await loadImage('../shared/images_hai/' + code + '.png')) })));
    }
    let extra = [];
    try { extra = await samples.list($('set').value); }
    catch (e) { message('端末内の見本を読み込めないため、標準画像で照合します。', true); }
    return baseTemplates.concat(await Promise.all(extra.map(async s => ({ code: s.code, feature: core.feature(await loadImage(s.image)) }))));
  }
  $('recognize').onclick = () => lock(async () => {
    if (!strip) return;
    invalidate(); answers = [];
    pieces = edges.slice(0, -1).map((x, i) => core.crop(strip, { x, y: 0, w: edges[i + 1] - x, h: strip.height }));
    try {
      const refs = await templates();
      ranked = pieces.map(p => { const tile = core.trimTile(p); return tile ? core.rank(core.feature(tile), refs) : null; });
      hand = ranked.map(r => r ? r[0].code : null);
      message('元画像と14枚を照合し、誤りを修正してください。黄色の枠は特に要確認です。');
    } catch (e) {
      hand = pieces.map(() => null); ranked = [];
      message('自動照合できませんでした。各「牌を修正」から14枚を指定できます。HTTPで開くと改善する場合があります。\n' + e.message, true);
    }
    syncText(); render();
  });
  $('add-set').onclick = () => lock(async () => {
    const name = $('set-name').value.trim(); if (!name) throw new Error('絵柄名を入力してください。');
    await samples.addSet(name);
    if (![...$('set').options].some(o => o.value === name)) $('set').add(new Option(name, name));
    $('set').value = name; $('set-name').value = ''; await renderSamples();
  });
  $('set').onchange = () => lock(renderSamples);
  async function renderSamples() {
    const list = await samples.list($('set').value); $('sample-list').replaceChildren();
    if (!list.length) $('sample-list').textContent = '「' + $('set').value + '」の保存済み見本はありません。標準の牌画像は常に使用します。';
    list.forEach(s => {
      const img = new Image(); img.src = s.image; img.alt = label(s.code);
      const b = button(label(s.code) + ' 削除', () => lock(async () => {
        if (!confirm('この見本を削除しますか？')) return;
        await samples.remove(s.id); await renderSamples();
      })); b.prepend(img); $('sample-list').appendChild(b);
    });
  }
  $('sample-details').ontoggle = () => { if ($('sample-details').open) lock(renderSamples); };
  function draft() {
    return {
      id: pendingId, hand: [...hand], correctAnswer: [...answers], dora: [...dora], melds: [], ukeireru: [], visibleTilesExtra: {},
      round: '', seat: '', turn: null, commentary: '', source: $('source').value.trim() || null,
      sourceMemo: $('source-memo').value.trim() || null, tags: [], memo: null, mirror: false,
      riichiChoice: null, kanChoice: null, questionType: null, incomingTile: null, incomingFrom: null,
      availableActions: null, correctAction: null, correctChiPair: null, correctDiscard: null,
      createdAt: new Date().toISOString().slice(0, 10)
    };
  }
  async function remember() {
    if (!imageMode || !$('remember').checked || !$('confirm').checked) return '';
    try {
      const entries = pieces.map((p, i) => {
        if (!p) return null;
        const c = document.createElement('canvas'); c.width = 48; c.height = 64; c.getContext('2d').drawImage(p, 0, 0, 48, 64);
        return { code: hand[i], image: c.toDataURL('image/png') };
      }).filter(Boolean);
      await samples.save($('set').value, entries); return '';
    } catch (e) { return '見本は保存できませんでした: ' + e.message; }
  }
  $('save').onclick = () => lock(async () => {
    if (textDirty) throw new Error('変更した文字列を「文字列を反映」で確定してください。');
    core.validate(hand, answers, dora);
    if (imageMode && !$('confirm').checked) throw new Error('元画像と14枚を照合し、確認欄にチェックしてください。');
    if (!pendingId) pendingId = crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2);
    const problem = draft();
    await persistAdminProblem(problem);
    const warning = await remember(), source = $('source').value;
    clear(source); message('保存しました。出典名を引き継いで次の問題を登録できます。' + (warning ? '\n' + warning : ''), !!warning);
    $('text').focus();
  });
  $('detail').onclick = () => lock(async () => {
    if (textDirty) throw new Error('変更した文字列を「文字列を反映」で確定してください。');
    if (!hand.length) throw new Error('牌姿を入力してください。');
    if (imageMode && !$('confirm').checked) throw new Error('元画像と照合してから詳細編集へ進んでください。');
    core.validateTiles([...hand, ...dora]);
    const problem = draft(); problem.id = null;
    await openEditor(problem); document.getElementById('editor-title').textContent = '新規問題（簡易登録から）';
    clear(); message('');
  });
  renderInput();
})();
