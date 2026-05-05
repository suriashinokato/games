// 問題登録 / 一覧 / 編集 / 削除 を担当
// quiz.js とは独立。データは storage.js を通じて localStorage に保存

(function () {
  'use strict';

  const T = window.TehaiTraining;
  if (!T || !T.tiles || !T.shanten || !T.storage || !T.ui) {
    console.error('依存モジュール不足 (manage.js)');
    return;
  }

  const MODE_LABEL = {
    shanten: 'シャンテン判定',
    ukeire:  '受け入れ種類',
    discard: '最大受け入れ打牌',
  };

  // ===== 状態 =====
  const state = {
    editingId: null, // null なら新規登録
    mode: 'shanten',
    hand: [],
  };

  function targetHandSize(mode) {
    return mode === 'discard' ? 14 : 13;
  }

  function countByTile(hand) {
    const c = {};
    for (const t of hand) c[t] = (c[t] || 0) + 1;
    return c;
  }

  function reset() {
    state.editingId = null;
    state.mode = 'shanten';
    state.hand = [];
    document.getElementById('register-mode').value = 'shanten';
    document.getElementById('register-memo').value = '';
    document.getElementById('register-heading').textContent = '問題の登録';
    document.getElementById('register-notice').innerHTML = '';
    rerender();
  }

  function rerender() {
    const target = targetHandSize(state.mode);
    document.getElementById('register-hand-count').textContent =
      state.hand.length + '/' + target + ' 枚';

    T.ui.renderHand(document.getElementById('register-hand'), state.hand, {
      onClick: (tile, idx) => onHandClick(idx),
    });

    renderRegisterPalette();
    renderPreview();
  }

  function renderRegisterPalette() {
    const target = targetHandSize(state.mode);
    const isFull = state.hand.length >= target;
    const counts = countByTile(state.hand);
    const palette = document.getElementById('register-palette');
    palette.innerHTML = '';
    const codes = T.tiles.tileCodes();
    const rows = {
      m: codes.filter(c => c[1] === 'm'),
      p: codes.filter(c => c[1] === 'p'),
      s: codes.filter(c => c[1] === 's'),
      z: codes.filter(c => c[1] === 'z'),
    };
    ['m', 'p', 's', 'z'].forEach(suit => {
      const row = document.createElement('div');
      row.className = 'palette-row';
      rows[suit].forEach(code => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'palette-tile';
        btn.dataset.tile = code;
        const used = counts[code] || 0;
        if (used >= 4 || isFull) btn.disabled = true;
        const img = document.createElement('img');
        img.src = T.tiles.imageUrl(code);
        img.alt = T.tiles.displayName(code);
        btn.appendChild(img);
        if (used > 0) {
          const badge = document.createElement('span');
          badge.className = 'palette-count';
          badge.textContent = used;
          btn.appendChild(badge);
        }
        btn.addEventListener('click', () => {
          if (btn.disabled) return;
          onPaletteClick(code);
        });
        row.appendChild(btn);
      });
      palette.appendChild(row);
    });
  }

  function onPaletteClick(tile) {
    const target = targetHandSize(state.mode);
    if (state.hand.length >= target) return;
    state.hand = T.tiles.sortTiles(state.hand.concat([tile]));
    rerender();
  }

  function onHandClick(idx) {
    state.hand = state.hand.slice(0, idx).concat(state.hand.slice(idx + 1));
    rerender();
  }

  function onModeChange() {
    state.mode = document.getElementById('register-mode').value;
    const target = targetHandSize(state.mode);
    if (state.hand.length > target) {
      state.hand = state.hand.slice(0, target);
    }
    rerender();
  }

  function renderPreview() {
    const previewEl = document.getElementById('register-preview');
    previewEl.innerHTML = '';
    const target = targetHandSize(state.mode);
    if (state.hand.length !== target) {
      const hint = document.createElement('p');
      hint.className = 'preview-hint';
      hint.textContent = '手牌が ' + target + ' 枚になると正解が自動計算されます';
      previewEl.appendChild(hint);
      return;
    }

    const box = document.createElement('div');
    box.className = 'preview-box';

    const shanten = T.shanten.shantenCount(state.hand);
    const sLine = document.createElement('p');
    sLine.innerHTML = 'シャンテン数: <strong>' + T.ui.shantenLabel(shanten) + '</strong>';
    box.appendChild(sLine);

    if (state.mode === 'ukeire') {
      const types = T.tiles.sortTiles(T.shanten.ukeireTypes(state.hand));
      const ukeire = T.shanten.ukeireWithCount(state.hand);
      const total = ukeire.reduce((s, e) => s + e.count, 0);
      const p = document.createElement('p');
      p.textContent = '受け入れ牌の種類 (合計 ' + total + ' 枚):';
      box.appendChild(p);
      const strip = document.createElement('div');
      strip.className = 'strip';
      box.appendChild(strip);
      T.ui.renderTileStrip(strip, types);
    } else if (state.mode === 'discard') {
      const best = T.shanten.bestDiscards(state.hand);
      if (best.length === 0) {
        const p = document.createElement('p');
        p.textContent = '(打牌候補なし)';
        box.appendChild(p);
      } else {
        const p = document.createElement('p');
        p.textContent = '最良打牌 (受け入れ ' + best[0].totalCount + ' 枚):';
        box.appendChild(p);
        const strip = document.createElement('div');
        strip.className = 'strip';
        box.appendChild(strip);
        T.ui.renderTileStrip(strip, best.map(b => b.discard));
      }
    }

    previewEl.appendChild(box);
  }

  function showNotice(message, isError) {
    const notice = document.getElementById('register-notice');
    notice.innerHTML = '';
    const div = document.createElement('div');
    div.className = isError ? 'save-notice error' : 'save-notice';
    div.textContent = message;
    notice.appendChild(div);
    setTimeout(() => {
      if (notice.contains(div)) div.remove();
    }, 2500);
  }

  function onSave() {
    const target = targetHandSize(state.mode);
    if (state.hand.length !== target) {
      showNotice('手牌を ' + target + ' 枚にしてください (現在 ' + state.hand.length + ' 枚)', true);
      return;
    }

    const memo = (document.getElementById('register-memo').value || '').trim();
    const shanten = T.shanten.shantenCount(state.hand);
    const problem = {
      id: state.editingId || T.storage.newId(),
      source: 'user',
      mode: state.mode,
      hand: state.hand.slice(),
      shanten: shanten,
      memo: memo,
    };
    if (state.mode === 'ukeire') {
      problem.ukeireTypes = T.shanten.ukeireTypes(state.hand);
    } else if (state.mode === 'discard') {
      problem.bestDiscards = T.shanten.bestDiscards(state.hand);
      problem.allDiscards = T.shanten.allDiscardOptions(state.hand);
    }
    T.storage.upsert(problem);

    const isEdit = !!state.editingId;
    reset();
    renderProblemList();
    showNotice(isEdit ? '更新しました' : '保存しました', false);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[c]);
  }

  function renderProblemList() {
    const listEl = document.getElementById('problem-list');
    listEl.innerHTML = '';
    const all = T.storage.getAll();
    if (all.length === 0) {
      const p = document.createElement('p');
      p.className = 'empty-msg';
      p.textContent = '登録された問題はまだありません';
      listEl.appendChild(p);
      return;
    }
    // 新しい順
    const sorted = all.slice().sort((a, b) => {
      const ta = parseInt((a.id.split('-')[1] || '0'), 10);
      const tb = parseInt((b.id.split('-')[1] || '0'), 10);
      return tb - ta;
    });

    sorted.forEach(p => {
      const card = document.createElement('div');
      card.className = 'problem-card';

      const head = document.createElement('div');
      head.className = 'problem-head';
      const tag = document.createElement('span');
      tag.className = 'mode-tag';
      tag.textContent = MODE_LABEL[p.mode] || p.mode;
      head.appendChild(tag);
      if (p.memo) {
        const memo = document.createElement('span');
        memo.className = 'memo-tag';
        memo.textContent = p.memo;
        head.appendChild(memo);
      }
      card.appendChild(head);

      const handStrip = document.createElement('div');
      handStrip.className = 'strip strip-card-hand';
      T.ui.renderTileStrip(handStrip, p.hand);
      card.appendChild(handStrip);

      const actions = document.createElement('div');
      actions.className = 'problem-actions';
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'secondary-btn small';
      editBtn.textContent = '編集';
      editBtn.addEventListener('click', () => loadForEdit(p.id));
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'secondary-btn small danger';
      delBtn.textContent = '削除';
      delBtn.addEventListener('click', () => onDelete(p.id));
      actions.appendChild(editBtn);
      actions.appendChild(delBtn);
      card.appendChild(actions);

      listEl.appendChild(card);
    });
  }

  function loadForEdit(id) {
    const p = T.storage.getById(id);
    if (!p) return;
    state.editingId = p.id;
    state.mode = p.mode;
    state.hand = p.hand.slice();
    document.getElementById('register-mode').value = p.mode;
    document.getElementById('register-memo').value = p.memo || '';
    document.getElementById('register-heading').textContent = '問題の編集';
    rerender();
    document.getElementById('register-heading').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function onDelete(id) {
    if (!confirm('この問題を削除しますか？')) return;
    T.storage.remove(id);
    if (state.editingId === id) reset();
    renderProblemList();
  }

  // ===== 初期化 =====

  function init() {
    document.getElementById('register-mode').addEventListener('change', onModeChange);
    document.getElementById('register-clear').addEventListener('click', reset);
    document.getElementById('register-save').addEventListener('click', onSave);

    document.querySelectorAll('[data-action="manage"]').forEach(btn => {
      btn.addEventListener('click', () => {
        T.ui.showScreen('manage');
        renderProblemList();
        rerender();
      });
    });
    document.querySelectorAll('[data-action="back-home"]').forEach(btn => {
      btn.addEventListener('click', () => T.ui.showScreen('home'));
    });

    // 出題元フィルタの初期値を設定 + 変更時に保存
    const settings = T.storage.getSettings();
    const radios = document.querySelectorAll('#source-filter input[name="source"]');
    radios.forEach(r => {
      r.checked = (r.value === settings.source);
      r.addEventListener('change', () => {
        if (r.checked) T.storage.saveSettings({ source: r.value });
      });
    });
  }

  T.manage = { init: init };
})();
