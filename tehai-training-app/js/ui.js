// DOM レンダリング担当
// quiz.js から呼ばれて、画面の表示を更新するだけ。状態は持たない。

(function () {
  'use strict';

  const T = window.TehaiTraining;
  if (!T || !T.tiles) {
    console.error('tiles.js より後に読み込んでください');
    return;
  }

  const SHANTEN_LABEL = {
    '-1': 'アガリ',
    '0':  'テンパイ',
    '1':  '1シャンテン',
    '2':  '2シャンテン',
    '3':  '3シャンテン',
  };

  function shantenLabel(n) {
    return SHANTEN_LABEL[String(n)] || (n + 'シャンテン');
  }

  // 画面切替: data-screen 属性を持つ section を表示/非表示
  function showScreen(name) {
    document.querySelectorAll('[data-screen]').forEach(el => {
      el.classList.toggle('active', el.dataset.screen === name);
    });
    window.scrollTo(0, 0);
  }

  // 手牌1つ分の <img> を返す
  function tileImg(code) {
    const img = document.createElement('img');
    img.className = 'tile';
    img.src = T.tiles.imageUrl(code);
    img.alt = T.tiles.displayName(code);
    img.dataset.tile = code;
    return img;
  }

  // 手牌をコンテナに描画
  // options: { onClick: (tileCode, index) => void, highlightIndex: number }
  function renderHand(container, hand, options) {
    container.innerHTML = '';
    const opts = options || {};
    hand.forEach((code, i) => {
      const img = tileImg(code);
      if (opts.onClick) {
        img.classList.add('clickable');
        img.addEventListener('click', () => opts.onClick(code, i));
      }
      if (opts.highlightIndex === i) {
        img.classList.add('selected');
      }
      container.appendChild(img);
    });
  }

  // mode2 用: シャンテン3択ボタン
  function renderShantenChoices(container, onPick) {
    container.innerHTML = '';
    const choices = [
      { value: 0, label: 'テンパイ' },
      { value: 1, label: '1シャンテン' },
      { value: 2, label: '2シャンテン' },
    ];
    choices.forEach(c => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = c.label;
      btn.dataset.value = c.value;
      btn.addEventListener('click', () => onPick(c.value));
      container.appendChild(btn);
    });
  }

  // mode1 用: 34牌パレット (複数選択可)
  // selectedSet: Set<string> 現在選ばれている牌コード
  // onToggle: (tileCode) => void  クリック時に呼ばれる
  function renderTilePalette(container, selectedSet, onToggle, options) {
    container.innerHTML = '';
    const opts = options || {};
    const codes = T.tiles.tileCodes();
    // 行ごと: m / p / s / z
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
        if (selectedSet.has(code)) btn.classList.add('selected');
        if (opts.lock) btn.disabled = true;
        // 採点後のハイライト
        //   正解 + 選んだ      → 緑 (answer-correct)
        //   正解 + 選び漏れ    → 橙 (answer-missed)
        //   不正解 + 選んだ    → 赤 (answer-extra)
        if (opts.correctSet && opts.correctSet.has(code)) {
          if (selectedSet.has(code)) {
            btn.classList.add('answer-correct');
          } else {
            btn.classList.add('answer-missed');
          }
        }
        if (opts.userExtraSet && opts.userExtraSet.has(code)) {
          btn.classList.add('answer-extra');
        }
        const img = document.createElement('img');
        img.src = T.tiles.imageUrl(code);
        img.alt = T.tiles.displayName(code);
        btn.appendChild(img);
        btn.addEventListener('click', () => {
          if (btn.disabled) return;
          onToggle(code);
        });
        row.appendChild(btn);
      });
      container.appendChild(row);
    });
  }

  // 牌コード配列を「画像の連なり」として小さくレンダリングする (解説用)
  function renderTileStrip(container, tiles) {
    container.innerHTML = '';
    if (!tiles || tiles.length === 0) {
      container.textContent = '(なし)';
      return;
    }
    tiles.forEach(code => {
      const img = document.createElement('img');
      img.className = 'tile tile-mini';
      img.src = T.tiles.imageUrl(code);
      img.alt = T.tiles.displayName(code);
      container.appendChild(img);
    });
  }

  // mode1 採点後の解説: 正解/不正解の見出しと、正解牌・ユーザー過剰選択・受け入れ枚数
  function renderUkeireExplanation(container, problem, userSelected, isCorrect) {
    container.innerHTML = '';
    const correct = new Set(problem.ukeireTypes);
    const ukeire = T.shanten.ukeireWithCount(problem.hand);
    const div = document.createElement('div');
    div.className = 'explanation ' + (isCorrect ? 'correct' : 'wrong');

    const totalCount = ukeire.reduce((s, e) => s + e.count, 0);
    const correctList = T.tiles.sortTiles(Array.from(correct));
    const extra = T.tiles.sortTiles(userSelected.filter(t => !correct.has(t)));
    const missed = T.tiles.sortTiles(correctList.filter(t => !userSelected.includes(t)));

    div.innerHTML =
      '<p class="result-heading">' + (isCorrect ? '○ 正解' : '× 不正解') + '</p>' +
      '<p>・シャンテン数: <strong>' + shantenLabel(problem.shanten) + '</strong></p>' +
      '<p>・正解の受け入れ牌 (合計 ' + totalCount + ' 枚):</p>' +
      '<div class="strip" data-name="correct"></div>';
    if (missed.length > 0) {
      div.innerHTML += '<p style="margin-top:8px;">・選び漏れ:</p><div class="strip" data-name="missed"></div>';
    }
    if (extra.length > 0) {
      div.innerHTML += '<p style="margin-top:8px;">・余分に選んだ牌:</p><div class="strip" data-name="extra"></div>';
    }
    container.appendChild(div);
    renderTileStrip(div.querySelector('[data-name="correct"]'), correctList);
    if (missed.length > 0) {
      renderTileStrip(div.querySelector('[data-name="missed"]'), missed);
    }
    if (extra.length > 0) {
      renderTileStrip(div.querySelector('[data-name="extra"]'), extra);
    }
  }

  // mode3 採点後の解説: 結果見出し + 各打牌候補の受け入れ枚数一覧 (牌画像つき)
  function renderDiscardExplanation(container, problem, userDiscard, isCorrect) {
    container.innerHTML = '';
    const div = document.createElement('div');
    div.className = 'explanation ' + (isCorrect ? 'correct' : 'wrong');

    const heading = document.createElement('p');
    heading.className = 'result-heading';
    heading.textContent = isCorrect ? '○ 正解' : '× 不正解';
    div.appendChild(heading);

    const head = document.createElement('p');
    head.innerHTML = '・シャンテン数: <strong>' + shantenLabel(problem.shanten) + '</strong>';
    div.appendChild(head);

    const correctSet = new Set(problem.bestDiscards.map(d => d.discard));

    // 上位2行 + (正解3件以上ならすべての正解行) + (誤答時はユーザーの選択行) を常時表示
    const visibleSet = new Set();
    problem.allDiscards.slice(0, 2).forEach(opt => visibleSet.add(opt.discard));
    if (correctSet.size >= 3) {
      correctSet.forEach(d => visibleSet.add(d));
    }
    if (userDiscard && !correctSet.has(userDiscard)) {
      visibleSet.add(userDiscard);
    }
    const hiddenCount = problem.allDiscards.length - visibleSet.size;

    const table = document.createElement('table');
    table.className = 'discard-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>打牌</th><th>枚数</th><th>受け入れ牌</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');

    let toggleInserted = false;

    problem.allDiscards.forEach(opt => {
      const isBest = correctSet.has(opt.discard);
      const isUser = opt.discard === userDiscard;
      const isVisible = visibleSet.has(opt.discard);

      if (!isVisible && !toggleInserted) {
        const toggleTr = document.createElement('tr');
        toggleTr.className = 'row-toggle';
        const toggleTd = document.createElement('td');
        toggleTd.colSpan = 3;
        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.setAttribute('aria-expanded', 'false');
        const collapsedLabel = '残り' + hiddenCount + '件を表示';
        const expandedLabel = '折りたたむ';
        toggleBtn.textContent = collapsedLabel;
        toggleBtn.addEventListener('click', () => {
          const expanded = table.classList.toggle('expanded');
          toggleBtn.textContent = expanded ? expandedLabel : collapsedLabel;
          toggleBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        });
        toggleTd.appendChild(toggleBtn);
        toggleTr.appendChild(toggleTd);
        tbody.appendChild(toggleTr);
        toggleInserted = true;
      }

      const tr = document.createElement('tr');
      if (isBest) tr.classList.add('row-best');
      if (isUser && !isBest) tr.classList.add('row-wrong');
      if (!isVisible) tr.classList.add('row-hidden');

      // 打牌セル: 牌画像
      const tdDiscard = document.createElement('td');
      const discardCell = document.createElement('div');
      discardCell.className = 'discard-cell';
      const dImg = document.createElement('img');
      dImg.className = 'tile tile-mini';
      dImg.src = T.tiles.imageUrl(opt.discard);
      dImg.alt = T.tiles.displayName(opt.discard);
      discardCell.appendChild(dImg);
      tdDiscard.appendChild(discardCell);

      // 枚数セル
      const tdCount = document.createElement('td');
      tdCount.className = 'col-count';
      tdCount.textContent = opt.totalCount;

      // 受け入れ牌セル: 牌画像のみ (種類のみ表示、各牌の枚数は省略)
      const tdTiles = document.createElement('td');
      if (opt.tiles.length === 0) {
        tdTiles.textContent = '(なし)';
      } else {
        const list = document.createElement('div');
        list.className = 'ukeire-list';
        opt.tiles.forEach(e => {
          const tImg = document.createElement('img');
          tImg.className = 'tile tile-mini';
          tImg.src = T.tiles.imageUrl(e.tile);
          tImg.alt = T.tiles.displayName(e.tile);
          list.appendChild(tImg);
        });
        tdTiles.appendChild(list);
      }

      tr.appendChild(tdDiscard);
      tr.appendChild(tdCount);
      tr.appendChild(tdTiles);
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    div.appendChild(table);
    container.appendChild(div);
  }

  // mode2 (シャンテン判定) 用: 結果見出しのみを解説枠テイストで描画
  // 「○ 正解  1シャンテン」「× 不正解  1シャンテン」の形
  function renderShantenResult(container, problem, isCorrect) {
    container.innerHTML = '';
    const div = document.createElement('div');
    div.className = 'explanation ' + (isCorrect ? 'correct' : 'wrong');
    const heading = document.createElement('p');
    heading.className = 'result-heading';
    heading.innerHTML =
      (isCorrect ? '○ 正解' : '× 不正解') +
      '<span class="result-detail">' + shantenLabel(problem.shanten) + '</span>';
    div.appendChild(heading);
    container.appendChild(div);
  }

  // 進捗バー (現在問題数 / セッション総数 / 正解数)
  function renderProgress(container, stats) {
    const total = stats.total;
    const numText = total
      ? '第 ' + stats.questionNum + ' / ' + total + ' 問'
      : '第 ' + stats.questionNum + ' 問';
    container.innerHTML =
      '<span>' + numText + '</span>' +
      '<span>正解: ' + stats.correct + '</span>';
  }

  // 結果画面: スコアと正答率 (満点時はお祝いメッセージ)
  function renderResult(stats) {
    const correct = stats.correct;
    const total = stats.total;
    const scoreEl = document.getElementById('result-score');
    const msgEl = document.getElementById('result-message');
    if (scoreEl) scoreEl.textContent = correct + ' / ' + total;
    if (msgEl) {
      msgEl.classList.remove('perfect');
      if (correct === total) {
        msgEl.textContent = '全問正解！おめでとう！';
        msgEl.classList.add('perfect');
      } else {
        const rate = total > 0 ? Math.round((correct / total) * 100) : 0;
        msgEl.textContent = '正答率 ' + rate + '%';
      }
    }
  }

  window.TehaiTraining.ui = {
    showScreen: showScreen,
    renderHand: renderHand,
    renderShantenChoices: renderShantenChoices,
    renderShantenResult: renderShantenResult,
    renderUkeireExplanation: renderUkeireExplanation,
    renderDiscardExplanation: renderDiscardExplanation,
    renderTilePalette: renderTilePalette,
    renderTileStrip: renderTileStrip,
    renderProgress: renderProgress,
    renderResult: renderResult,
    shantenLabel: shantenLabel,
  };
})();
