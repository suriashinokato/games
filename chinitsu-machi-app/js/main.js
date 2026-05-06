// main.js — エントリポイント（フェーズ4：ブックマーク追加）
//
// 画面: quiz / bookmarks の2画面切替。
// 出題: ランダム順序＋suit ランダム。判定は全待ち選択の厳格マッチ。
// ブックマーク: localStorage で永続化、一覧から「解く」で再出題。

(function () {
  var tiles = window.Chinitsu.tiles;
  var wait = window.Chinitsu.wait;
  var decompose = window.Chinitsu.decompose;
  var explain = window.Chinitsu.explain;
  var bookmark = window.Chinitsu.bookmark;

  var SUITS = ['man', 'pin', 'sou'];
  var problemList = window.Chinitsu.problems.list;
  var problemById = {};
  problemList.forEach(function (p) { problemById[p.id] = p; });

  var state = {
    order: [],
    cursor: 0,
    hand: [],
    suit: 'man',
    waits: [],
    selected: {},
    judged: false,
    problem: null,
    lastResult: null,
  };

  function shuffleIndices(n) {
    var arr = [];
    for (var i = 0; i < n; i++) arr.push(i);
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  // ---------- 画面切替 ----------

  function showScreen(name) {
    var screens = document.querySelectorAll('.screen');
    screens.forEach(function (s) { s.style.display = 'none'; });
    document.getElementById('screen-' + name).style.display = '';

    var navs = document.querySelectorAll('.nav-btn');
    navs.forEach(function (b) {
      b.classList.toggle('active', b.dataset.screen === name);
    });

    if (name === 'bookmarks') renderBookmarkList();
  }

  // ---------- 出題画面 ----------

  function showProblem(problem, savedSuit) {
    state.problem = problem;
    state.suit = savedSuit || SUITS[Math.floor(Math.random() * SUITS.length)];
    state.hand = problem.shape.split('').map(Number);
    state.waits = wait.listWaits(state.hand);
    state.selected = {};
    state.judged = false;
    state.lastResult = null;

    document.getElementById('hand-display').innerHTML = tiles.renderHand(state.suit, state.hand);
    renderAnswerButtons(state.suit);

    var msg = document.getElementById('result-message');
    msg.textContent = '待ち牌をすべて選んで「判定する」を押してください';
    msg.className = 'result-msg neutral';

    document.getElementById('judge-btn').disabled = false;
    document.getElementById('explanation').style.display = 'none';

    updateBookmarkButton();

    if (problem.dbWaits) {
      var dbSet = problem.dbWaits.replace(/[^0-9]/g, '').split('').map(Number).sort();
      var actualSorted = state.waits.slice().sort();
      if (JSON.stringify(dbSet) !== JSON.stringify(actualSorted)) {
        console.warn('[' + problem.id + '] dbWaits=' + problem.dbWaits +
                     ' vs listWaits=' + JSON.stringify(state.waits));
      }
    }
  }

  function showCurrentProblem() {
    var problem = problemList[state.order[state.cursor]];
    showProblem(problem);
  }

  function renderAnswerButtons(suit) {
    var container = document.getElementById('answer-buttons');
    container.innerHTML = '';
    for (var n = 1; n <= 9; n++) {
      var btn = document.createElement('button');
      btn.className = 'answer-btn';
      btn.dataset.number = String(n);
      btn.innerHTML = tiles.renderTile(suit, n);
      btn.addEventListener('click', onAnswerClick);
      container.appendChild(btn);
    }
  }

  function onAnswerClick(ev) {
    if (state.judged) return;
    var btn = ev.currentTarget;
    var n = parseInt(btn.dataset.number, 10);
    if (state.selected[n]) {
      delete state.selected[n];
      btn.classList.remove('picked');
    } else {
      state.selected[n] = true;
      btn.classList.add('picked');
    }
  }

  function onJudgeClick() {
    if (state.judged) return;
    state.judged = true;

    var pickedSet = Object.keys(state.selected).map(Number).sort(function (a, b) { return a - b; });
    var waitSet = state.waits.slice().sort(function (a, b) { return a - b; });
    var missed = waitSet.filter(function (n) { return !state.selected[n]; });
    var extra = pickedSet.filter(function (n) { return waitSet.indexOf(n) === -1; });
    var isCorrect = missed.length === 0 && extra.length === 0;

    state.lastResult = { isCorrect: isCorrect, missed: missed, extra: extra, picked: pickedSet };

    var allBtns = document.querySelectorAll('.answer-btn');
    allBtns.forEach(function (b) {
      var n = parseInt(b.dataset.number, 10);
      b.classList.remove('picked');
      if (waitSet.indexOf(n) !== -1) b.classList.add('correct-wait');
      if (state.selected[n] && waitSet.indexOf(n) === -1) b.classList.add('wrong-pick');
      b.disabled = true;
    });

    var msg = document.getElementById('result-message');
    var waitsStr = waitSet.join(', ');
    if (isCorrect) {
      msg.textContent = '○ 完答！  待ち牌は ' + waitsStr;
      msg.className = 'result-msg correct';
    } else {
      var detail = '';
      if (missed.length > 0) detail += '  選び忘れ: ' + missed.join(', ');
      if (extra.length > 0) detail += '  余分: ' + extra.join(', ');
      msg.textContent = '× 不正解。  待ち牌は ' + waitsStr + detail;
      msg.className = 'result-msg wrong';
    }

    document.getElementById('judge-btn').disabled = true;
    showExplanation();
  }

  function showExplanation() {
    var body = document.getElementById('explanation-body');
    var html = '';

    html += '<div class="explain-section">';
    html += '<div class="block-label">待ち牌の分類（algorithm.md ⇒ 待ち型）</div>';
    html += '<div class="all-waits-list">';
    state.waits.forEach(function (w) {
      var ex = explain.generateExplanation(state.hand, w);
      html += '<div class="wait-row">';
      html += '<span class="wait-tile">' + tiles.renderTile(state.suit, w) + '</span>';
      html += '<span class="wait-num">' + w + '</span>';
      html += '<span class="wait-type">' + escapeHtml(ex.classification.type) + '</span>';
      html += '<span class="wait-desc">' + escapeHtml(ex.description) + '</span>';
      html += '</div>';
    });
    html += '</div>';
    html += '</div>';

    var demoWait = state.waits[0];
    var ex = explain.generateExplanation(state.hand, demoWait);
    if (ex && ex.primarySplit) {
      html += '<div class="explain-section">';
      html += '<div class="block-label">手牌から完全メンツを抜く（' + demoWait + ' でアガる場合の例）</div>';
      if (ex.classification.completeMelds.length > 0) {
        html += '<div class="meld-row">' +
                renderMelds(ex.classification.completeMelds, state.suit) +
                '</div>';
      } else {
        html += '<div class="meld-row meld-row-empty">（抜けるメンツなし）</div>';
      }
      html += '</div>';

      html += '<div class="explain-section">';
      html += '<div class="block-label">残った形（雀頭+待ち部分）</div>';
      html += '<div class="meld-row">' +
              renderCore(ex.classification, ex.primarySplit, demoWait, state.suit) +
              '</div>';
      html += '<div class="explain-wait-note">' +
              buildCoreNote(ex.classification, ex.primarySplit, demoWait) + '</div>';
      html += '</div>';

      html += '<div class="explain-section">';
      html += '<div class="block-label">全体分解（雀頭1 + 面子4）</div>';
      html += '<div class="meld-row">' +
              decompose.formatTilesHtml(ex.primarySplit, state.suit) + '</div>';
      html += '<div class="decomp-text">' +
              escapeHtml(decompose.formatText(ex.primarySplit)) + '</div>';
      html += '</div>';
    }

    body.innerHTML = html;
    document.getElementById('explanation').style.display = '';
  }

  function renderMelds(melds, suit) {
    if (melds.length === 0) return '';
    var html = '';
    for (var i = 0; i < melds.length; i++) {
      var m = melds[i];
      html += '<span class="meld meld-' + m.type + '">';
      for (var j = 0; j < m.tiles.length; j++) {
        html += tiles.renderTile(suit, m.tiles[j]);
      }
      html += '</span>';
      if (i < melds.length - 1) html += '<span class="meld-sep">+</span>';
    }
    return html;
  }

  function renderCore(classification, split, demoWait, suit) {
    var html = '';
    if (classification.type === '単騎') {
      html += '<span class="meld meld-tanki">' +
              tiles.renderTile(suit, demoWait) + '</span>';
      return html;
    }
    html += '<span class="meld meld-pair">' +
            tiles.renderTile(suit, split.pair) +
            tiles.renderTile(suit, split.pair) +
            '</span>';
    html += '<span class="meld-sep">+</span>';
    if (classification.type === 'シャボ') {
      html += '<span class="meld meld-partial">' +
              tiles.renderTile(suit, demoWait) +
              tiles.renderTile(suit, demoWait) +
              '</span>';
    } else if (classification.waitMeld) {
      var others = classification.waitMeld.tiles.filter(function (x) { return x !== demoWait; });
      html += '<span class="meld meld-partial">';
      for (var i = 0; i < others.length; i++) {
        html += tiles.renderTile(suit, others[i]);
      }
      html += '</span>';
    }
    return html;
  }

  function buildCoreNote(classification, split, demoWait) {
    if (classification.type === '単騎') {
      return '完全メンツ4つを抜くと、手牌に残るのは ' + demoWait + ' が1枚だけ。' +
             demoWait + ' を引けば ' + demoWait + demoWait + ' の雀頭が完成。';
    }
    if (classification.type === 'シャボ') {
      return '雀頭 ' + split.pair + split.pair + ' と、もう一組の対子 ' + demoWait + demoWait +
             ' が残る。' + demoWait + ' を引けば ' + demoWait + demoWait + demoWait +
             ' の暗刻になり ' + split.pair + split.pair + ' が雀頭。';
    }
    if (classification.waitMeld) {
      var others = classification.waitMeld.tiles.filter(function (x) { return x !== demoWait; });
      var partialStr = others.join('');
      var meldStr = classification.waitMeld.tiles.join('');
      return '雀頭 ' + split.pair + split.pair + ' と、未完成の ' + partialStr +
             ' が残る。' + demoWait + ' が入ると ' + meldStr + ' の順子が完成。';
    }
    return '';
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function nextProblem() {
    state.cursor = (state.cursor + 1) % problemList.length;
    if (state.cursor === 0) {
      state.order = shuffleIndices(problemList.length);
    }
    showCurrentProblem();
  }

  // ---------- ブックマーク ----------

  function updateBookmarkButton() {
    var btn = document.getElementById('bookmark-btn');
    if (!state.problem) return;
    var saved = bookmark.findByProblemId(state.problem.id);
    if (saved) {
      btn.textContent = '★';
      btn.classList.add('saved');
      btn.title = 'ブックマーク済み（クリックで解除）';
    } else {
      btn.textContent = '☆';
      btn.classList.remove('saved');
      btn.title = 'ブックマークに追加';
    }
  }

  function updateBookmarkCount() {
    document.getElementById('bookmark-count').textContent = bookmark.load().length;
  }

  function onBookmarkClick() {
    if (!state.problem) return;
    var existing = bookmark.findByProblemId(state.problem.id);
    if (existing) {
      bookmark.remove(existing.id);
    } else {
      var entry = {
        id: 'bm_' + Date.now(),
        problemId: state.problem.id,
        shape: state.problem.shape,
        suit: state.suit,
        savedAt: new Date().toISOString(),
        lastResult: state.lastResult,   // 判定済みなら結果を保存、未判定なら null
      };
      bookmark.add(entry);
    }
    updateBookmarkButton();
    updateBookmarkCount();
  }

  function renderBookmarkList() {
    var container = document.getElementById('bookmark-list');
    var emptyEl = document.getElementById('bookmark-empty');
    var list = bookmark.load();

    if (list.length === 0) {
      container.innerHTML = '';
      emptyEl.style.display = '';
      return;
    }
    emptyEl.style.display = 'none';

    // 新しい順で並べる
    list.sort(function (a, b) {
      return (b.savedAt || '').localeCompare(a.savedAt || '');
    });

    var html = '';
    list.forEach(function (bm) {
      var hand = bm.shape.split('').map(Number);
      var waits = wait.listWaits(hand);
      var resultBadge = '';
      if (bm.lastResult) {
        if (bm.lastResult.isCorrect) {
          resultBadge = '<span class="result-badge ok">前回 ○ 完答</span>';
        } else {
          var miss = bm.lastResult.missed && bm.lastResult.missed.length > 0
            ? '選び忘れ:' + bm.lastResult.missed.join(',') : '';
          var ext = bm.lastResult.extra && bm.lastResult.extra.length > 0
            ? '余分:' + bm.lastResult.extra.join(',') : '';
          resultBadge = '<span class="result-badge ng">前回 × ' +
            [miss, ext].filter(Boolean).join(' / ') + '</span>';
        }
      }
      html += '<div class="bookmark-item" data-id="' + escapeHtml(bm.id) + '" data-problem-id="' + escapeHtml(bm.problemId) + '">';
      html += '<div class="bookmark-hand">' + tiles.renderHand(bm.suit, hand) + '</div>';
      html += '<div class="bookmark-meta">';
      html += '<span class="bookmark-waits">待ち: ' + waits.join(', ') + '</span>';
      html += resultBadge;
      html += '<span class="bookmark-date">' + formatDate(bm.savedAt) + '</span>';
      html += '</div>';
      html += '<div class="bookmark-actions">';
      html += '<button class="bookmark-solve">解く</button>';
      html += '<button class="bookmark-delete">削除</button>';
      html += '</div>';
      html += '</div>';
    });
    container.innerHTML = html;

    // イベント登録
    container.querySelectorAll('.bookmark-solve').forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        var item = ev.target.closest('.bookmark-item');
        var problemId = item.dataset.problemId;
        var bm = bookmark.findByProblemId(problemId);
        var problem = problemById[problemId];
        if (problem) {
          showProblem(problem, bm ? bm.suit : null);
          showScreen('quiz');
        }
      });
    });
    container.querySelectorAll('.bookmark-delete').forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        var item = ev.target.closest('.bookmark-item');
        var id = item.dataset.id;
        bookmark.remove(id);
        updateBookmarkCount();
        renderBookmarkList();
        // 出題画面のブックマークボタンも更新（削除した問題が現在表示中の場合）
        updateBookmarkButton();
      });
    });
  }

  function formatDate(iso) {
    if (!iso) return '';
    try {
      var d = new Date(iso);
      var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
      return d.getFullYear() + '/' + pad(d.getMonth() + 1) + '/' + pad(d.getDate()) +
        ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    } catch (e) { return iso; }
  }

  // ---------- 起動 ----------

  document.addEventListener('DOMContentLoaded', function () {
    if (!problemList || problemList.length === 0) {
      document.getElementById('hand-display').textContent = '問題データが読み込めませんでした。';
      return;
    }
    state.order = shuffleIndices(problemList.length);
    state.cursor = 0;
    document.getElementById('judge-btn').addEventListener('click', onJudgeClick);
    document.getElementById('next-btn').addEventListener('click', nextProblem);
    document.getElementById('bookmark-btn').addEventListener('click', onBookmarkClick);
    document.querySelectorAll('.nav-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        showScreen(b.dataset.screen);
      });
    });

    showCurrentProblem();
    updateBookmarkCount();
  });
})();
