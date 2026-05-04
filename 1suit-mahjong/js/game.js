// game.js — gameState とターン進行ステートマシン
//
// 段階 3: 配牌 → ツモ → 打牌 → ターン交代 → 山切れで流局
// 段階 5: ツモ宣言 / ロン宣言 / 役判定 / 点数移動 / 親流れ

window.Bamboo = window.Bamboo || {};

(function () {
  var T = window.Bamboo.tiles;
  var H = window.Bamboo.handEval;
  var Y = window.Bamboo.yaku;
  var S = window.Bamboo.score;

  // ---- 定数 ----
  var INITIAL_SCORE   = 100000;
  var WIN_SCORE       = 200000;
  var GAMEOVER_SCORE  = 0;
  var DEAD_WALL_SIZE  = 4;
  var HAND_SIZE       = 13;

  // ---- 内部ヘルパ ----
  function createPlayerState() {
    return {
      hand: [],
      drawn: null,
      discard: [],
      melds: [],
      score: INITIAL_SCORE,
      isRiichi: false,
      riichiTurnIndex: -1,
      isIppatsuValid: false,
      isRinshan: false,
      isFirstTurn: true,
    };
  }

  function resetPlayerForRound(p) {
    p.hand = [];
    p.drawn = null;
    p.discard = [];
    p.melds = [];
    p.isRiichi = false;
    p.riichiTurnIndex = -1;
    p.isIppatsuValid = false;
    p.isRinshan = false;
    p.isFirstTurn = true;
  }

  // 暗槓を「1 面子確定」とみなし、仮想 3 枚を補完して 14 枚 counts を作る
  function buildWinningCounts(p, agariTile) {
    var hand = p.hand.slice();
    hand.push(agariTile);
    appendAnkanPadding(p, hand);
    return H.toCounts(hand);
  }

  // 暗槓込みで 13 枚相当の counts を作る（テンパイ判定・待ち牌列挙用）
  function buildTenpaiCounts(p) {
    var hand = p.hand.slice();
    appendAnkanPadding(p, hand);
    return H.toCounts(hand);
  }

  function appendAnkanPadding(p, hand) {
    for (var i = 0; i < p.melds.length; i++) {
      if (p.melds[i].type === 'ankan') {
        for (var k = 0; k < 3; k++) hand.push(p.melds[i].tile);
      }
    }
  }

  // 暗槓の tile 値配列。findWaits / isWinningHand / findWinningSplits の
  // requiredKotsu に渡し、padding した刻子を必ず暗槓由来として固定する制約を付ける。
  function ankanTiles(p) {
    var tiles = [];
    for (var i = 0; i < p.melds.length; i++) {
      if (p.melds[i].type === 'ankan') tiles.push(p.melds[i].tile);
    }
    return tiles;
  }

  function other(who) { return who === 'player' ? 'cpu' : 'player'; }
  function numAsc(a, b) { return a - b; }

  // ---- 状態作成 ----

  function createInitialState() {
    return {
      phase: 'title',
      currentSuit: null,
      round: 0,
      dealer: 'player',
      turnOwner: 'player',
      wall: [],
      deadWall: [],
      player: createPlayerState(),
      cpu: createPlayerState(),
      winResult: null,             // 段階 5: アガリ結果
      lastDiscard: null,           // ロン判定用: 直前の打牌 { who, tile }
    };
  }

  // ---- 局の開始 ----

  function startNewRound(state) {
    state.round += 1;
    state.currentSuit = T.randomSuit();
    state.winResult = null;
    state.lastDiscard = null;

    resetPlayerForRound(state.player);
    resetPlayerForRound(state.cpu);

    // 配牌は「両者とも 1 シャンテン以上（テンパイ禁止）」になるまで山を作り直す。
    // 1 スート麻雀では配牌テンパイの確率が比較的高く、そのまま第 1 ツモを引くと
    // 天和・地和（廃止仕様）に相当する形でアガリ可能になってしまうため、
    // ツモ前は最高でもイーシャンテンに収まるよう調整する。
    var MAX_REDEAL = 100;
    for (var attempt = 0; attempt < MAX_REDEAL; attempt++) {
      var wall = T.buildWall();
      state.deadWall = wall.splice(0, DEAD_WALL_SIZE);
      state.wall = wall;

      state.player.hand = [];
      state.cpu.hand = [];
      for (var i = 0; i < HAND_SIZE; i++) {
        state.player.hand.push(state.wall.pop());
        state.cpu.hand.push(state.wall.pop());
      }
      state.player.hand.sort(numAsc);
      state.cpu.hand.sort(numAsc);

      var pShanten = H.calcShanten(H.toCounts(state.player.hand));
      var cShanten = H.calcShanten(H.toCounts(state.cpu.hand));
      if (pShanten >= 1 && cShanten >= 1) break;
    }

    state.turnOwner = state.dealer;
    state.phase = (state.dealer === 'player') ? 'playerTurn' : 'cpuTurn';
    drawTile(state, state.turnOwner);
  }

  // ---- ツモ ----

  function drawTile(state, who) {
    if (state.wall.length === 0) {
      state.phase = 'draw';
      return false;
    }
    state[who].drawn = state.wall.pop();
    return true;
  }

  // ---- 打牌 ----

  function discardTile(state, who, tileValue, source) {
    var p = state[who];

    // リーチ後はツモ切り強制（リーチ宣言ターン以外）
    // riichiTurnIndex は宣言した手番の discard.length を記録しておく。
    // 宣言ターン中は自由打牌、その後はツモ切りのみ。
    if (p.isRiichi && p.discard.length > p.riichiTurnIndex && source !== 'drawn') {
      throw new Error('リーチ後は手出し禁止');
    }

    if (source === 'drawn') {
      if (p.drawn !== tileValue) {
        throw new Error('source=drawn だがツモ牌と値が一致しない: ' + tileValue);
      }
      p.discard.push(p.drawn);
      p.drawn = null;
    } else {
      var idx = p.hand.indexOf(tileValue);
      if (idx === -1) throw new Error('打牌対象が手牌にない: ' + tileValue);
      p.hand.splice(idx, 1);
      p.discard.push(tileValue);
      if (p.drawn !== null) {
        p.hand.push(p.drawn);
        p.hand.sort(numAsc);
        p.drawn = null;
      }
    }

    p.isFirstTurn = false;
    state.lastDiscard = { who: who, tile: tileValue };

    // 嶺上開花は次の打牌で失効
    p.isRinshan = false;

    // 一発の失効: 自分の次の打牌（リーチ宣言の打牌より後）で消滅する
    if (p.isIppatsuValid && p.discard.length > p.riichiTurnIndex + 1) {
      p.isIppatsuValid = false;
    }

    // 相手のロン判定はフローを止める必要があるので、ここでターン交代せず
    // phase を 'awaitRonCheck' に切り替える。main.js 側でロン判定後 advanceTurn を呼ぶ。
    state.phase = 'awaitRonCheck';
  }

  // ---- 立直 ----

  // 仕様: ノーテンでもリーチ宣言は可能（ただし流局時にチョンボとして罰符）。
  //       テンパイ判定は宣言時には行わず、流局時にまとめてチェックする。
  function canDeclareRiichi(state, who) {
    var p = state[who];
    if (p.isRiichi) return false;
    if (p.score < 1000) return false;
    if (p.drawn === null) return false;          // ツモ後にしか宣言できない
    return true;
  }

  // テンパイしてリーチできる手かどうか（CPU やヒント用）
  // 暗槓があるときは findWaits に requiredKotsu を渡し、暗槓 tile を必ず刻子として
  // ロックした状態で待ちが残るかを判定する。calcShanten は requiredKotsu を受けない
  // ので、padding の 3 枚を雀頭や順子に流用した「偽テンパイ」を 0 シャンテンと
  // 誤検出してしまう（CPU がノーテンリーチを宣言する原因になる）。
  function canDeclareRiichiTenpai(state, who) {
    if (!canDeclareRiichi(state, who)) return false;
    var p = state[who];
    var realHand = p.hand.slice();
    realHand.push(p.drawn);
    var pad = [];
    appendAnkanPadding(p, pad);
    var ankanT = ankanTiles(p);
    var seen = {};
    for (var i = 0; i < realHand.length; i++) {
      var t = realHand[i];
      if (seen[t]) continue;
      seen[t] = true;
      var c = realHand.slice();
      c.splice(c.indexOf(t), 1);
      c = c.concat(pad);
      if (c.length !== 13) continue;
      if (H.findWaits(H.toCounts(c), ankanT).length > 0) return true;
    }
    return false;
  }

  function declareRiichi(state, who) {
    if (!canDeclareRiichi(state, who)) throw new Error('リーチ宣言不可');
    var p = state[who];
    p.isRiichi = true;
    // 宣言ターンの discard.length を記録 → これより後の打牌はツモ切り強制
    p.riichiTurnIndex = p.discard.length;
    // 一発の有効期限フラグ。宣言以降、自分の次の打牌で消滅する。
    p.isIppatsuValid = true;
    // リーチ棒なし仕様なので score は減らさない
  }

  // ---- 暗槓 ----

  // 暗槓宣言が「待ちを変える / テンパイを崩す」かどうか（送りカン抑止用）。
  // テンパイでない局面では守るべき待ちが無いので false を返す。
  function kanChangesWaits(p, kanTile) {
    var preCounts = buildTenpaiCounts(p);
    if (H.totalTiles(preCounts) !== 13) return false;
    // pre は「既存の暗槓のみ」が requiredKotsu。新カンはまだ宣言されていない。
    var preWaits = H.findWaits(preCounts, ankanTiles(p));
    if (preWaits.length === 0) return false;

    var postHand = [];
    var removed = 0;
    for (var i = 0; i < p.hand.length; i++) {
      if (p.hand[i] === kanTile && removed < 4) { removed++; continue; }
      postHand.push(p.hand[i]);
    }
    if (p.drawn !== null) {
      if (p.drawn === kanTile && removed < 4) { removed++; }
      else { postHand.push(p.drawn); }
    }
    appendAnkanPadding(p, postHand);
    for (var k = 0; k < 3; k++) postHand.push(kanTile);

    var postCounts = H.toCounts(postHand);
    if (H.totalTiles(postCounts) !== 13) return true;
    // post は「既存の暗槓 + 新カン」を requiredKotsu として渡す。
    var postWaits = H.findWaits(postCounts, ankanTiles(p).concat([kanTile]));

    if (preWaits.length !== postWaits.length) return true;
    for (var j = 0; j < preWaits.length; j++) {
      if (postWaits.indexOf(preWaits[j]) === -1) return true;
    }
    return false;
  }

  // 暗槓可能な数値リスト。手牌+ツモで 4 枚揃っている数値を返す。
  // 送りカン（待ちが変わる暗槓）も候補に含める ─ 宣言時にチョンボとして処理される。
  function canDeclareKan(state, who) {
    var p = state[who];
    var allHand = p.hand.slice();
    if (p.drawn !== null) allHand.push(p.drawn);
    var counts = H.toCounts(allHand);
    var result = [];
    for (var n = 1; n <= 9; n++) {
      if (counts[n] === 4) result.push(n);
    }
    return result;
  }

  function declareKan(state, who, tile) {
    var p = state[who];
    var available = canDeclareKan(state, who);
    if (available.indexOf(tile) === -1) throw new Error('暗槓宣言不可: ' + tile);

    // 送りカン（待ちが変わる暗槓）はチョンボ成立。槓子は組まず嶺上ツモも行わない。
    if (kanChangesWaits(p, tile)) {
      finishChombo(state, who, 'kan', 'okurikan');
      return;
    }

    // 手牌+ツモ から 4 枚抜く
    var allHand = p.hand.slice();
    if (p.drawn !== null) allHand.push(p.drawn);
    var remaining = [];
    for (var i = 0; i < allHand.length; i++) {
      if (allHand[i] !== tile) remaining.push(allHand[i]);
    }
    p.hand = remaining;
    p.hand.sort(numAsc);
    p.drawn = null;

    p.melds.push({ type: 'ankan', tile: tile });

    // 暗槓で両者の一発が消える（標準ルール）
    state.player.isIppatsuValid = false;
    state.cpu.isIppatsuValid = false;

    // 暗槓で両者の天和・地和・人和の権利が消える
    // （本作の天和/地和/人和判定は isFirstTurn フラグに依存しているため、ここで折る）
    state.player.isFirstTurn = false;
    state.cpu.isFirstTurn = false;

    // 嶺上ツモ
    if (state.deadWall.length === 0) {
      state.phase = 'draw';
      return;
    }
    p.drawn = state.deadWall.pop();
    p.isRinshan = true;     // 嶺上ツモ後のツモアガリは嶺上開花
    // ツモ完了。phase は呼び出し側で再判定（ツモアガリの可能性、再カンの可能性）
  }

  // ロン判定後にターンを進める
  function advanceTurn(state) {
    var nextWho = other(state.lastDiscard.who);
    state.turnOwner = nextWho;
    state.phase = (nextWho === 'player') ? 'playerTurn' : 'cpuTurn';
    drawTile(state, nextWho);
  }

  // ---- アガリ判定（外向き） ----

  // who がツモアガリ可能か（役判定込み）。
  // 戻り値: { result, reason }
  //   成功: { result: winResultドラフト, reason: null }
  //   失敗: { result: null, reason: 'noTarget' | 'noWinningHand' | 'noYaku' }
  function tryTsumo(state, who) {
    var p = state[who];
    if (p.drawn === null) return { result: null, reason: 'noTarget' };
    var counts = buildWinningCounts(p, p.drawn);
    if (!H.isWinningHand(counts, ankanTiles(p))) return { result: null, reason: 'noWinningHand' };

    var winResult = judgeWin(state, who, counts, p.drawn, true);
    if (!winResult) return { result: null, reason: 'noYaku' };
    return { result: winResult, reason: null };
  }

  // who が「相手の last discard」でロン可能か。フリテンチェック込み。
  // 戻り値: { result, reason }
  //   成功: { result: winResultドラフト, reason: null }
  //   失敗: { result: null, reason: 'noTarget' | 'noWinningHand' | 'furiten' | 'noYaku' }
  function tryRon(state, who) {
    if (!state.lastDiscard) return { result: null, reason: 'noTarget' };
    if (state.lastDiscard.who === who) return { result: null, reason: 'noTarget' };
    var p = state[who];
    var lastTile = state.lastDiscard.tile;

    var counts = buildWinningCounts(p, lastTile);
    if (!H.isWinningHand(counts, ankanTiles(p))) return { result: null, reason: 'noWinningHand' };

    // フリテン判定: リーチ中はリーチ宣言以降の捨て牌のみを対象とする。
    //               （リーチ前に切った当たり牌は無視する独自仕様）
    var counts13 = buildTenpaiCounts(p);
    var waits = H.findWaits(counts13, ankanTiles(p));
    var discardForFuriten = p.isRiichi
      ? p.discard.slice(p.riichiTurnIndex)
      : p.discard;
    if (H.isFuriten(waits, discardForFuriten)) return { result: null, reason: 'furiten' };

    var winResult = judgeWin(state, who, counts, lastTile, false);
    if (!winResult) return { result: null, reason: 'noYaku' };
    return { result: winResult, reason: null };
  }

  // 役判定 + 点数計算 → winResult ドラフト
  function judgeWin(state, who, counts14, agariTile, isTsumo) {
    var p = state[who];
    var splits = H.findWinningSplits(counts14, ankanTiles(p));
    var detection = Y.detectYaku({
      winningCounts: counts14,
      agariTile: agariTile,
      isTsumo: isTsumo,
      isMenzen: true,                       // 本作は副露なし、暗槓のみ → 常にメンゼン
      isRiichi: p.isRiichi,
      isIppatsuValid: p.isIppatsuValid,
      isRinshan: p.isRinshan && isTsumo,    // 嶺上ツモ後のツモアガリのみ
      currentSuit: state.currentSuit,
      splits: splits,
      isChiitoitsu: H.isChiitoitsu(counts14),
      isFirstTurn: p.isFirstTurn,
      isDealer: state.dealer === who,
      melds: p.melds,
    });

    if (detection.yakuList.length === 0) return null;  // 役なしならアガれない

    var scoreResult = S.calcScore({
      totalHan: detection.totalHan,
      isYakuman: detection.isYakuman,
      isDealer: state.dealer === who,
      winType: isTsumo ? 'tsumo' : 'ron',
    });

    return {
      winner: who,
      winType: isTsumo ? 'tsumo' : 'ron',
      yakuList: detection.yakuList,
      totalHan: detection.totalHan,
      isYakuman: detection.isYakuman,
      rank: scoreResult.rank,
      rankLabel: scoreResult.rankLabel,
      points: scoreResult.points,
      agariTile: agariTile,
    };
  }

  // ---- アガリ宣言 ----

  function declareTsumo(state, who) {
    var ret = tryTsumo(state, who);
    if (!ret.result) throw new Error('ツモアガリ不可');
    finishWin(state, ret.result);
  }

  function declareRon(state, who) {
    var ret = tryRon(state, who);
    if (!ret.result) throw new Error('ロンアガリ不可');
    finishWin(state, ret.result);
  }

  // 「とりあえず宣言してみる」版: 成立しなければチョンボ処理。
  // 戻り値: 'win' なら和了成立、'chombo' ならチョンボ確定。
  function attemptTsumo(state, who) {
    var ret = tryTsumo(state, who);
    if (ret.result) {
      finishWin(state, ret.result);
      return 'win';
    }
    finishChombo(state, who, 'tsumo', ret.reason);
    return 'chombo';
  }

  function attemptRon(state, who) {
    var ret = tryRon(state, who);
    if (ret.result) {
      finishWin(state, ret.result);
      return 'win';
    }
    finishChombo(state, who, 'ron', ret.reason);
    return 'chombo';
  }

  function finishWin(state, winResult) {
    var loser = other(winResult.winner);
    state[loser].score -= winResult.points;
    state[winResult.winner].score += winResult.points;
    state.winResult = winResult;
    state.phase = 'win';
  }

  // 誤ロン・誤ツモ・ノーテンリーチ以外のチョンボ: 役満分罰符を相手に支払う。
  // chomboReason: 'noWinningHand' | 'furiten' | 'noYaku' | 'noTarget' | null
  function finishChombo(state, who, chomboType, chomboReason) {
    var penalty = chomboPenalty(state, who);
    var winner = other(who);
    state[who].score    -= penalty;
    state[winner].score += penalty;
    state.winResult = {
      winner: winner,
      winType: 'chombo',
      chomboBy: who,
      chomboType: chomboType,        // 'ron' | 'tsumo'
      chomboReason: chomboReason || null,
      yakuList: [],
      totalHan: 13,
      isYakuman: true,
      rank: 'yakuman',
      rankLabel: '役満（チョンボ）',
      points: penalty,
      agariTile: null,
    };
    state.phase = 'win';
  }

  // ---- 流局・次局 ----

  // 流局: ノーテン親流れ判定 + ノーテンリーチのチョンボ罰符。
  // 仕様: 通常のノーテン罰符・リーチ棒は無し。
  //       ノーテンでリーチを宣言していた側は「チョンボ」として役満分の罰符を相手に支払う。
  //       両者がノーテンリーチなら相殺（点数移動なし）。
  function endRoundDraw(state) {
    var dealerPlayer = state[state.dealer];
    state.dealerWasTenpai = isTenpai(dealerPlayer);
    state.playerTenpai = isTenpai(state.player);
    state.cpuTenpai = isTenpai(state.cpu);

    var playerChombo = state.player.isRiichi && !state.playerTenpai;
    var cpuChombo = state.cpu.isRiichi && !state.cpuTenpai;

    state.chombo = {
      player: playerChombo,
      cpu: cpuChombo,
      payments: { player: 0, cpu: 0 },
    };

    if (playerChombo && !cpuChombo) {
      var pPenalty = chomboPenalty(state, 'player');
      state.player.score -= pPenalty;
      state.cpu.score    += pPenalty;
      state.chombo.payments.player = pPenalty;
    } else if (cpuChombo && !playerChombo) {
      var cPenalty = chomboPenalty(state, 'cpu');
      state.cpu.score    -= cPenalty;
      state.player.score += cPenalty;
      state.chombo.payments.cpu = cPenalty;
    }
    // 両者チョンボは相殺（点数移動なし）

    if (!state.dealerWasTenpai) {
      state.dealer = other(state.dealer);
    }
    state.phase = 'between';
  }

  // チョンボ罰符 = 役満分。親なら 48000、子なら 32000。
  function chomboPenalty(state, who) {
    return state.dealer === who ? 48000 : 32000;
  }

  function isTenpai(p) {
    var counts13 = buildTenpaiCounts(p);
    if (H.totalTiles(counts13) !== 13) return false;
    return H.calcShanten(counts13) === 0;
  }

  function nextRound(state) {
    if (state.player.score <= GAMEOVER_SCORE || state.cpu.score <= GAMEOVER_SCORE) {
      // どちらかが 0 → ゲーム終了
      state.phase = (state.player.score <= GAMEOVER_SCORE) ? 'gameover' : 'clear';
      return;
    }
    if (state.player.score >= WIN_SCORE) {
      state.phase = 'clear';
      return;
    }
    if (state.cpu.score >= WIN_SCORE) {
      state.phase = 'gameover';
      return;
    }

    // 親流れ判定:
    //   - 子和了 → 親交代
    //   - 親和了 → 連荘 (そのまま)
    //   - 流局   → endRoundDraw 内ですでに dealer を切り替え済み（ノーテン時のみ）
    if (state.winResult && state.winResult.winner !== state.dealer) {
      state.dealer = other(state.dealer);
    }

    startNewRound(state);
  }

  // ---- リスタート（タイトルから再開する用） ----
  function restart(state) {
    state.phase = 'title';
    state.currentSuit = null;
    state.round = 0;
    state.dealer = 'player';
    state.turnOwner = 'player';
    state.wall = [];
    state.deadWall = [];
    state.winResult = null;
    state.lastDiscard = null;
    state.player.score = INITIAL_SCORE;
    state.cpu.score = INITIAL_SCORE;
    resetPlayerForRound(state.player);
    resetPlayerForRound(state.cpu);
  }

  // ---- 公開 ----
  window.Bamboo.game = {
    createInitialState: createInitialState,
    startNewRound: startNewRound,
    drawTile: drawTile,
    discardTile: discardTile,
    advanceTurn: advanceTurn,
    tryTsumo: tryTsumo,
    tryRon: tryRon,
    declareTsumo: declareTsumo,
    declareRon: declareRon,
    attemptTsumo: attemptTsumo,
    attemptRon: attemptRon,
    canDeclareRiichi: canDeclareRiichi,
    canDeclareRiichiTenpai: canDeclareRiichiTenpai,
    declareRiichi: declareRiichi,
    canDeclareKan: canDeclareKan,
    kanChangesWaits: kanChangesWaits,
    declareKan: declareKan,
    endRoundDraw: endRoundDraw,
    nextRound: nextRound,
    restart: restart,
    isTenpai: isTenpai,
    INITIAL_SCORE: INITIAL_SCORE,
    WIN_SCORE: WIN_SCORE,
    HAND_SIZE: HAND_SIZE,
    DEAD_WALL_SIZE: DEAD_WALL_SIZE,
  };
})();
