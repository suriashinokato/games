// main.js — エントリポイント
//
// 段階 6 のフロー:
//   ツモ後: ツモアガリ可 / 暗槓可 / リーチ可 を判定 → ボタン提示
//   打牌:   awaitRonCheck → 相手のロン判定 → advanceTurn → 次のツモ
//   暗槓:   嶺上ツモ後、再度ツモアガリ・暗槓・打牌の流れに戻る
//   リーチ: 宣言後、その手番は自由打牌、以降のツモは強制ツモ切り

(function () {
  var G = window.Bamboo.game;
  var U = window.Bamboo.ui;
  var C = window.Bamboo.cpu;

  var CPU_THINK_MS = 600;

  var state = G.createInitialState();
  state.gameEpoch = 0;

  // ------ 起動 ------

  function bootTitle() {
    U.showScreen('title');
    var startBtn = document.getElementById('start-btn');
    if (startBtn && !startBtn.dataset.bound) {
      startBtn.addEventListener('click', startGame);
      startBtn.dataset.bound = '1';
    }
    // ゲームオーバー / クリアからのリスタートボタン
    bindRestart('restart-gameover-btn');
    bindRestart('restart-clear-btn');
    // ヘルプボタン（タイトル画面・対局画面共通）
    bindHelp('help-title-btn');
    bindHelp('help-table-btn');
    // 対局画面のホームへ戻るボタン
    bindHome('home-table-btn');
  }

  function bindHome(id) {
    var btn = document.getElementById(id);
    if (btn && !btn.dataset.bound) {
      btn.addEventListener('click', onHomeClick);
      btn.dataset.bound = '1';
    }
  }

  function onHomeClick() {
    U.showConfirmDialog(
      'ホームへ戻る',
      '<p>対局を中断してタイトル画面に戻ります。</p>'
        + '<p>現在の対局内容は失われます。よろしいですか？</p>',
      'ホームへ戻る',
      'キャンセル',
      function () {
        // 進行中の CPU 用 setTimeout を無効化
        state.gameEpoch += 1;
        G.restart(state);
        bootTitle();
      }
    );
  }

  function bindHelp(id) {
    var btn = document.getElementById(id);
    if (btn && !btn.dataset.bound) {
      btn.addEventListener('click', U.showHelpDialog);
      btn.dataset.bound = '1';
    }
  }

  function bindRestart(id) {
    var btn = document.getElementById(id);
    if (btn && !btn.dataset.bound) {
      btn.addEventListener('click', function () {
        G.restart(state);
        bootTitle();
      });
      btn.dataset.bound = '1';
    }
  }

  function startGame() {
    if (state.phase !== 'title') G.restart(state);
    G.startNewRound(state);
    U.showScreen('table');
    refresh();
    handleAfterDraw();
  }

  // ------ 描画 ------

  function refresh() {
    var isMyTurnDrawPhase = (state.turnOwner === 'player' && state.phase === 'playerTurn');
    var isOpponentDiscard = (state.phase === 'awaitRonCheck'
                              && state.lastDiscard
                              && state.lastDiscard.who !== 'player');

    // リーチ宣言したばかりの手番（=宣言したが宣言牌を打っていない状態）かを判定
    state.isRiichiDeclareTurn = isMyTurnDrawPhase
                                && state.player.isRiichi
                                && state.player.discard.length === state.player.riichiTurnIndex;

    // ツモ・ロン・リーチ・ツモ切りは「成立可否を問わず」常時表示。
    // 誤ツモはチョンボ、ノーテンリーチは流局時チョンボ、宣言不可なリーチ等はクリック側で握り潰す。
    state.canTsumo     = isMyTurnDrawPhase && state.player.drawn !== null;
    state.canRon       = isOpponentDiscard;
    state.canPass      = isOpponentDiscard;
    state.canRiichi    = isMyTurnDrawPhase && !state.player.isRiichi;
    state.canTsumogiri = isMyTurnDrawPhase && state.player.drawn !== null;

    state.canKan = isMyTurnDrawPhase
                   ? G.canDeclareKan(state, 'player')
                   : [];

    U.renderTable(state, {
      onTileClick: onTileClick,
      onTsumo:     onPlayerTsumo,
      onRon:       onPlayerRon,
      onPass:      onPlayerPass,
      onRiichi:    onPlayerRiichi,
      onKan:       onPlayerKan,
      onTsumogiri: onPlayerTsumogiri,
    });
  }

  // ------ プレイヤー操作 ------

  function onTileClick(who, tile, source) {
    if (who !== 'player') return;
    if (state.turnOwner !== 'player') return;
    if (state.phase !== 'playerTurn') return;

    G.discardTile(state, 'player', tile, source);
    refresh();
    handleAfterDiscard();
  }

  function onPlayerTsumo() {
    if (!state.canTsumo) return;
    // 成立しなければ自動的にチョンボ処理
    G.attemptTsumo(state, 'player');
    showWinAndContinue();
  }

  function onPlayerRon() {
    if (!state.canRon) return;
    // 成立しなければ自動的にチョンボ処理
    G.attemptRon(state, 'player');
    showWinAndContinue();
  }

  function onPlayerPass() {
    if (!state.canPass) return;
    if (state.phase !== 'awaitRonCheck') return;
    G.advanceTurn(state);
    refresh();
    handleAfterDraw();
  }

  function onPlayerRiichi() {
    if (!state.canRiichi) return;
    // 既にリーチ済み・点数不足など宣言不可な場合は無視（誤クリック扱い）
    if (!G.canDeclareRiichi(state, 'player')) return;
    G.declareRiichi(state, 'player');
    refresh();      // 宣言ターンは打牌自由、以降の手番は強制ツモ切り
  }

  function onPlayerKan(tile) {
    if (!state.canKan || state.canKan.indexOf(tile) === -1) return;
    G.declareKan(state, 'player', tile);
    // 送りカン（待ちが変わる暗槓）はチョンボ確定 → ダイアログを表示
    if (state.phase === 'win') {
      showWinAndContinue();
      return;
    }
    refresh();
    handleAfterDraw();   // 嶺上ツモ後の判定（連続カン・ツモアガリ等）
  }

  function onPlayerTsumogiri() {
    if (!state.canTsumogiri) return;
    var drawn = state.player.drawn;
    if (drawn === null) return;
    G.discardTile(state, 'player', drawn, 'drawn');
    refresh();
    handleAfterDiscard();
  }

  // ------ フロー: 打牌の後 → ロンチェック → ターン進行 → ツモチェック ------

  function handleAfterDiscard() {
    if (state.phase !== 'awaitRonCheck') return;

    var ronCandidate = (state.lastDiscard.who === 'player') ? 'cpu' : 'player';

    if (ronCandidate === 'cpu') {
      var ep = state.gameEpoch;
      setTimeout(function () {
        if (state.gameEpoch !== ep) return;
        if (state.phase !== 'awaitRonCheck') return;
        if (C.shouldRon(state, 'cpu')) {
          G.declareRon(state, 'cpu');
          showWinAndContinue();
        } else {
          G.advanceTurn(state);
          refresh();
          handleAfterDraw();
        }
      }, CPU_THINK_MS / 2);
    } else {
      // 自分のロン判定: 自動進行せずボタン操作待ち。
      // refresh で「ロン」「パス」ボタンが表示される。
      // ただし第1打牌へのロンは仕様上不可（人和廃止）。
      // この場合パスボタンしか出せず操作が無意味になるので、自動的にターンを進める。
      if (state.player.isFirstTurn) {
        G.advanceTurn(state);
        refresh();
        handleAfterDraw();
        return;
      }
      refresh();
    }
  }

  function handleAfterDraw() {
    if (state.phase === 'draw') {
      showDrawDialog();
      return;
    }

    if (state.turnOwner === 'cpu') {
      var ep = state.gameEpoch;
      setTimeout(function () {
        if (state.gameEpoch !== ep) return;
        runCpuTurn();
      }, CPU_THINK_MS);
    } else {
      // 自分のツモ: refresh で canTsumo / canRiichi / canKan が反映される
      refresh();
    }
  }

  function runCpuTurn() {
    if (state.phase !== 'cpuTurn') return;

    // 1) ツモアガリ
    if (C.shouldTsumo(state, 'cpu')) {
      G.declareTsumo(state, 'cpu');
      showWinAndContinue();
      return;
    }

    // 2) 暗槓 (リーチ後は内部で抑制されている)
    var kanTile = C.shouldDeclareKan(state, 'cpu');
    if (kanTile !== null) {
      G.declareKan(state, 'cpu', kanTile);
      refresh();
      // 嶺上ツモ後にもう一度同じフローを回す
      var ep = state.gameEpoch;
      setTimeout(function () {
        if (state.gameEpoch !== ep) return;
        runCpuTurn();
      }, CPU_THINK_MS / 2);
      return;
    }

    // 3) リーチ宣言
    if (C.shouldDeclareRiichi(state, 'cpu')) {
      G.declareRiichi(state, 'cpu');
    }

    // 4) 通常打牌（リーチ後は強制ツモ切り）
    var choice = C.chooseDiscard(state, 'cpu');
    G.discardTile(state, 'cpu', choice.tile, choice.source);
    refresh();
    handleAfterDiscard();
  }

  // ------ アガリ後・流局後 ------

  function showWinAndContinue() {
    refresh();
    U.showWinDialog(state, function () {
      G.nextRound(state);
      handlePostRound();
    });
  }

  function showDrawDialog() {
    // テンパイ判定 + ノーテンリーチのチョンボ罰符を確定（state.chombo がセットされる）
    G.endRoundDraw(state);

    var pTen = state.playerTenpai ? 'テンパイ' : 'ノーテン';
    var cTen = state.cpuTenpai ? 'テンパイ' : 'ノーテン';
    var tenpaiInfo = '<p>自分: <b>' + pTen + '</b> / 相手: <b>' + cTen + '</b></p>';
    var dealerInfo = state.dealerWasTenpai
      ? '<p>親がテンパイ → 連荘（親そのまま）</p>'
      : '<p>親がノーテン → 親流れ（親交代）</p>';

    // 局終了時の手牌公開（背景の対局画面側）
    U.renderHandRevealed(state, 'cpu');
    U.renderHandRevealed(state, 'player');

    // ダイアログ内の手牌+待ちセクション
    var handsHtml = ''
      + U.buildDialogPlayerSection(state, 'cpu',    U.computeWaits(state, 'cpu'),    null)
      + U.buildDialogPlayerSection(state, 'player', U.computeWaits(state, 'player'), null);

    var chomboInfo = '';
    var chombo = state.chombo;
    if (chombo) {
      if (chombo.player && chombo.cpu) {
        chomboInfo = '<p class="chombo">両者ノーテンリーチ → チョンボ相殺（点数移動なし）</p>';
      } else if (chombo.player) {
        chomboInfo = '<p class="chombo">自分がノーテンリーチ → チョンボ <b>'
          + chombo.payments.player.toLocaleString() + '</b> 点支払い</p>';
      } else if (chombo.cpu) {
        chomboInfo = '<p class="chombo">相手がノーテンリーチ → チョンボ <b>'
          + chombo.payments.cpu.toLocaleString() + '</b> 点獲得</p>';
      }
    }

    U.showDialog(
      '流局',
      handsHtml + tenpaiInfo + dealerInfo + chomboInfo,
      '次の局へ',
      function () {
        G.nextRound(state);
        handlePostRound();
      }
    );
  }

  function handlePostRound() {
    if (state.phase === 'gameover') {
      U.showScreen('gameover');
    } else if (state.phase === 'clear') {
      U.showScreen('clear');
    } else {
      U.showScreen('table');
      refresh();
      handleAfterDraw();
    }
  }

  // ------ 起動 ------

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootTitle);
  } else {
    bootTitle();
  }
})();
