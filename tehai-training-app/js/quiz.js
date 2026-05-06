// 出題・採点・画面遷移の中央コントローラ
// HTML から init() を呼び、各ボタンのイベントは内部で配線する

(function () {
  'use strict';

  const T = window.TehaiTraining;
  if (!T || !T.tiles || !T.shanten || !T.randomHand || !T.ui) {
    console.error('依存モジュールが読み込まれていません (tiles/shanten/randomHand/ui)');
    return;
  }

  // ====== 状態 ======
  const state = {
    mode: null,               // 'shanten' | 'ukeire' | 'discard'
    problem: null,            // 現在出題中の問題
    userAnswer: null,         // ユーザー回答 (型はモード依存)
    ukeireSelection: null,    // mode1 用: Set<string> (回答前の選択中状態)
    questionNum: 0,
    streak: 0,
    answered: false,
  };

  // ====== モード採点ロジック ======
  function judge(problem, userAnswer) {
    if (problem.mode === 'shanten') {
      return userAnswer === problem.shanten;
    }
    if (problem.mode === 'ukeire') {
      // 受け入れ牌の集合が完全一致
      const correct = new Set(problem.ukeireTypes);
      const user = new Set(userAnswer);
      if (correct.size !== user.size) return false;
      for (const t of correct) if (!user.has(t)) return false;
      return true;
    }
    if (problem.mode === 'discard') {
      // userAnswer は牌コード (打牌)。同点正解なら全て正解扱い
      const correctSet = new Set(problem.bestDiscards.map(d => d.discard));
      return correctSet.has(userAnswer);
    }
    return false;
  }

  // ====== 画面操作 ======

  function startQuiz(mode) {
    state.mode = mode;
    state.questionNum = 0;
    state.streak = 0;
    nextQuestion();
  }

  function pickRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // 出題元フィルタに従って問題を取得
  //   random: ランダム生成
  //   user:   登録問題から (なければランダムにフォールバック)
  //   both:   50% 確率でランダム / 登録問題
  function fetchNextProblem(mode) {
    const settings = T.storage ? T.storage.getSettings() : { source: 'random' };
    const source = settings.source || 'random';
    const userPool = T.storage ? T.storage.byMode(mode) : [];

    if (source === 'user' && userPool.length > 0) {
      return pickRandomElement(userPool);
    }
    if (source === 'both' && userPool.length > 0 && Math.random() < 0.5) {
      return pickRandomElement(userPool);
    }
    return T.randomHand.generateProblem(mode);
  }

  function nextQuestion() {
    state.questionNum += 1;
    state.problem = fetchNextProblem(state.mode);
    state.userAnswer = null;
    state.ukeireSelection = new Set();
    state.answered = false;
    renderQuizScreen();
    T.ui.showScreen('quiz');
  }

  function renderQuizScreen() {
    T.ui.renderProgress(
      document.getElementById('progress'),
      { questionNum: state.questionNum, streak: state.streak }
    );

    const handEl = document.getElementById('hand');
    const promptEl = document.getElementById('prompt');
    const answerEl = document.getElementById('answer-area');

    // 結果欄リセット
    document.getElementById('result-badge').innerHTML = '';
    document.getElementById('explanation').innerHTML = '';
    document.getElementById('next-btn').classList.add('hidden');
    document.getElementById('prompt').classList.remove('hidden');
    document.getElementById('answer-area').classList.remove('hidden');

    if (state.mode === 'shanten') {
      promptEl.textContent = 'この手牌のシャンテン数は？';
      T.ui.renderHand(handEl, state.problem.hand);
      T.ui.renderShantenChoices(answerEl, onShantenPick);
    } else if (state.mode === 'ukeire') {
      promptEl.textContent = '受け入れ牌を全て選んでください';
      T.ui.renderHand(handEl, state.problem.hand);
      renderUkeireAnswerArea(answerEl);
    } else if (state.mode === 'discard') {
      promptEl.textContent = '受け入れが最大になる打牌は？';
      T.ui.renderHand(handEl, state.problem.hand, {
        onClick: onDiscardPick,
      });
      answerEl.innerHTML = ''; // mode3 は手牌自体が回答UI
    }
  }

  // mode1: 牌パレット + 決定ボタン
  function renderUkeireAnswerArea(container) {
    container.innerHTML = '';
    const palette = document.createElement('div');
    palette.className = 'palette';
    container.appendChild(palette);
    drawUkeirePalette(palette);

    const submitRow = document.createElement('div');
    submitRow.className = 'submit-row';
    const submitBtn = document.createElement('button');
    submitBtn.type = 'button';
    submitBtn.className = 'primary-btn';
    submitBtn.textContent = '決定';
    submitBtn.id = 'ukeire-submit';
    submitBtn.addEventListener('click', onUkeireSubmit);
    submitRow.appendChild(submitBtn);
    container.appendChild(submitRow);
  }

  function drawUkeirePalette(paletteEl) {
    T.ui.renderTilePalette(paletteEl, state.ukeireSelection, onUkeireToggle);
  }

  function onUkeireToggle(tile) {
    if (state.answered) return;
    if (state.ukeireSelection.has(tile)) {
      state.ukeireSelection.delete(tile);
    } else {
      state.ukeireSelection.add(tile);
    }
    drawUkeirePalette(document.querySelector('#answer-area .palette'));
  }

  function onUkeireSubmit() {
    if (state.answered) return;
    state.userAnswer = Array.from(state.ukeireSelection);
    state.answered = true;
    submitAnswer();
  }

  function onShantenPick(value) {
    if (state.answered) return;
    state.userAnswer = value;
    state.answered = true;
    submitAnswer();
  }

  function onDiscardPick(tile, indexInHand) {
    if (state.answered) return;
    state.userAnswer = tile;
    state.answered = true;
    // 選んだ牌をハイライト
    T.ui.renderHand(document.getElementById('hand'), state.problem.hand, {
      highlightIndex: indexInHand,
    });
    submitAnswer();
  }

  function submitAnswer() {
    const isCorrect = judge(state.problem, state.userAnswer);
    state.streak = isCorrect ? state.streak + 1 : 0;

    const badgeEl = document.getElementById('result-badge');
    const explainEl = document.getElementById('explanation');
    badgeEl.innerHTML = ''; // 単独バッジは廃止、解説枠の見出しに正解/不正解を統合表示

    if (state.mode === 'shanten') {
      T.ui.renderShantenResult(explainEl, state.problem, isCorrect);
      // 選択肢ロック
      document.querySelectorAll('#answer-area .choice-btn').forEach(btn => {
        btn.disabled = true;
        const v = parseInt(btn.dataset.value, 10);
        if (v === state.problem.shanten) btn.classList.add('correct-choice');
        if (v === state.userAnswer && v !== state.problem.shanten) {
          btn.classList.add('wrong-choice');
        }
      });
    } else if (state.mode === 'ukeire') {
      T.ui.renderUkeireExplanation(explainEl, state.problem, state.userAnswer, isCorrect);
      document.getElementById('prompt').classList.add('hidden');
      document.getElementById('answer-area').classList.add('hidden');
    } else if (state.mode === 'discard') {
      T.ui.renderDiscardExplanation(explainEl, state.problem, state.userAnswer, isCorrect);
    }

    document.getElementById('next-btn').classList.remove('hidden');
    T.ui.renderProgress(
      document.getElementById('progress'),
      { questionNum: state.questionNum, streak: state.streak }
    );
  }

  // ====== 初期化 ======

  function init() {
    document.querySelectorAll('[data-start-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        startQuiz(btn.dataset.startMode);
      });
    });
    document.getElementById('next-btn').addEventListener('click', nextQuestion);
    document.getElementById('home-btn').addEventListener('click', () => {
      T.ui.showScreen('home');
    });
    T.ui.showScreen('home');
  }

  window.TehaiTraining.quiz = {
    init: init,
    state: state,
  };
})();
