// ui.js — DOM 描画・イベントハンドラ
//
// 段階 3: タイトル画面切替、対局画面の手牌・河・情報バー描画、
//          打牌クリックの取り回し。

window.Bamboo = window.Bamboo || {};

(function () {
  var T = window.Bamboo.tiles;

  var SUIT_LABEL = { man: '萬子', pin: '筒子', sou: '索子' };
  var WHO_LABEL  = { player: '自分', cpu: '相手' };

  // ---- 画面切替 ----

  function showScreen(name) {
    var screens = document.querySelectorAll('.screen');
    for (var i = 0; i < screens.length; i++) {
      screens[i].style.display = 'none';
    }
    var target = document.getElementById('screen-' + name);
    if (target) target.style.display = '';
  }

  // ---- 描画 ----

  function renderInfo(state) {
    setText('info-round',  state.round);
    setText('info-wall',   state.wall.length);
    setText('score-player', state.player.score.toLocaleString());
    setText('score-cpu',    state.cpu.score.toLocaleString());
    // 親マーク
    setMark('dealer-player', state.dealer === 'player');
    setMark('dealer-cpu',    state.dealer === 'cpu');
    // 立直マーク
    setMark('riichi-player', state.player.isRiichi);
    setMark('riichi-cpu',    state.cpu.isRiichi);
  }

  function setMark(id, isOn) {
    var el = document.getElementById(id);
    if (!el) return;
    el.style.display = isOn ? '' : 'none';
  }

  // who の手牌を描画。canClick=true のときだけクリック可能なボタンにする。
  // 相手 (who === 'cpu') の手牌はアガるまで伏せ、操作も不可にする。
  // リーチ後の自分の手番は手牌全体を disabled にし、ツモ牌だけクリック可。
  function renderHand(state, who, canClick) {
    var p = state[who];
    var elementId = (who === 'player') ? 'hand-player' : 'hand-cpu';
    var el = document.getElementById(elementId);
    if (!el) return;

    var hideOpponent = (who === 'cpu');
    var face = hideOpponent ? 'down' : 'up';

    // リーチ後 (宣言ターン以降) は手出し禁止 → 手牌は全部 disabled
    var riichiLocked = p.isRiichi && p.discard.length > p.riichiTurnIndex;

    var html = '';
    p.hand.forEach(function (t) {
      var clickable = canClick && !hideOpponent && !riichiLocked;
      html += tileButton(state.currentSuit, t, face, 'hand', who, clickable);
    });
    if (p.drawn !== null) {
      var clickableDrawn = canClick && !hideOpponent;
      html += tileButton(state.currentSuit, p.drawn, face, 'drawn', who, clickableDrawn, true);
    }
    el.innerHTML = html;

    // 暗槓した面子を表示
    renderMelds(state, who);
  }

  // 暗槓面子を手牌の右側のスロットに描画
  function renderMelds(state, who) {
    var p = state[who];
    var meldId = (who === 'player') ? 'melds-player' : 'melds-cpu';
    var el = document.getElementById(meldId);
    if (!el) return;

    var html = '';
    for (var i = 0; i < p.melds.length; i++) {
      var m = p.melds[i];
      if (m.type === 'ankan') {
        // 暗槓: 端 2 枚は伏せ、中央 2 枚は表が慣例
        html += '<span class="meld-set">'
          + T.renderTile(state.currentSuit, m.tile, { face: 'down' })
          + T.renderTile(state.currentSuit, m.tile, { face: 'up' })
          + T.renderTile(state.currentSuit, m.tile, { face: 'up' })
          + T.renderTile(state.currentSuit, m.tile, { face: 'down' })
          + '</span>';
      }
    }
    el.innerHTML = html;
  }

  function tileButton(suit, tile, face, source, who, canClick, isDrawn) {
    var disabled = canClick ? '' : ' disabled';
    var cls = 'tile-btn' + (isDrawn ? ' drawn' : '');
    return '<button class="' + cls + '"'
      + ' data-tile="' + tile + '"'
      + ' data-source="' + source + '"'
      + ' data-who="' + who + '"'
      + disabled + '>'
      + T.renderTile(suit, tile, { face: face })
      + '</button>';
  }

  function renderDiscard(state, who) {
    var elementId = (who === 'player') ? 'discard-player' : 'discard-cpu';
    var el = document.getElementById(elementId);
    if (!el) return;
    var p = state[who];
    var html = '';
    for (var i = 0; i < p.discard.length; i++) {
      html += T.renderTile(state.currentSuit, p.discard[i], { face: 'up' });
    }
    el.innerHTML = html;
  }

  // 対局画面の全体再描画 + クリックハンドラ結線
  function renderTable(state, handlers) {
    renderInfo(state);
    renderHand(state, 'cpu',    state.turnOwner === 'cpu');
    renderHand(state, 'player', state.turnOwner === 'player');
    renderDiscard(state, 'cpu');
    renderDiscard(state, 'player');
    renderActions(state, handlers);

    var buttons = document.querySelectorAll('#screen-table .tile-btn');
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      if (btn.disabled) continue;
      bindClick(btn, handlers.onTileClick);
    }
  }

  // ツモ・ロン・パス・リーチ・カン等のアクションボタン群を描画
  function renderActions(state, handlers) {
    var el = document.getElementById('action-bar');
    if (!el) return;
    var html = '';
    if (state.canTsumo) {
      html += '<button class="action-btn action-tsumo" id="btn-tsumo">ツモ</button>';
    }
    if (state.canRon) {
      html += '<button class="action-btn action-ron" id="btn-ron">ロン</button>';
    }
    if (state.canPass) {
      html += '<button class="action-btn action-pass" id="btn-pass">パス</button>';
    }
    if (state.canRiichi) {
      html += '<button class="action-btn action-riichi" id="btn-riichi">リーチ</button>';
    }
    if (state.canKan && state.canKan.length > 0) {
      for (var i = 0; i < state.canKan.length; i++) {
        var t = state.canKan[i];
        html += '<button class="action-btn action-kan" data-kan-tile="' + t + '">'
          + '暗槓 ' + t + '</button>';
      }
    }
    if (state.canTsumogiri) {
      html += '<button class="action-btn action-tsumogiri" id="btn-tsumogiri">ツモ切り</button>';
    }
    if (state.isRiichiDeclareTurn) {
      html += '<span class="action-prompt">どの牌を切りますか？</span>';
    }
    el.innerHTML = html;

    if (state.canTsumo) {
      document.getElementById('btn-tsumo').addEventListener('click', handlers.onTsumo);
    }
    if (state.canRon) {
      document.getElementById('btn-ron').addEventListener('click', handlers.onRon);
    }
    if (state.canPass) {
      document.getElementById('btn-pass').addEventListener('click', handlers.onPass);
    }
    if (state.canRiichi) {
      document.getElementById('btn-riichi').addEventListener('click', handlers.onRiichi);
    }
    if (state.canKan && state.canKan.length > 0) {
      var kanBtns = el.querySelectorAll('.action-kan');
      for (var k = 0; k < kanBtns.length; k++) {
        (function (btn) {
          btn.addEventListener('click', function () {
            handlers.onKan(parseInt(btn.dataset.kanTile, 10));
          });
        })(kanBtns[k]);
      }
    }
    if (state.canTsumogiri) {
      document.getElementById('btn-tsumogiri').addEventListener('click', handlers.onTsumogiri);
    }
  }

  function bindClick(btn, onTileClick) {
    btn.addEventListener('click', function () {
      var tile   = parseInt(btn.dataset.tile, 10);
      var source = btn.dataset.source;
      var who    = btn.dataset.who;
      onTileClick(who, tile, source);
    });
  }

  // ---- 待ち牌表示 ----

  // 暗槓が混じっていても 13 枚の仮想手牌に整形して findWaits を呼ぶ。
  // 各暗槓につき同じ値の 3 枚を仮想的に追加（1 面子分）。
  // 暗槓した tile はすでに 4 枚すべて消費されているので、結果から除外する。
  function computeWaits(state, who) {
    var H = window.Bamboo.handEval;
    var p = state[who];
    var virtual = p.hand.slice();
    var ankanTiles = {};
    for (var i = 0; i < p.melds.length; i++) {
      if (p.melds[i].type === 'ankan') {
        ankanTiles[p.melds[i].tile] = true;
        for (var k = 0; k < 3; k++) virtual.push(p.melds[i].tile);
      }
    }
    if (virtual.length !== 13) return [];
    var waits = H.findWaits(H.toCounts(virtual));
    return waits.filter(function (t) { return !ankanTiles[t]; });
  }

  function renderWaitsInline(state, waits) {
    if (!waits || waits.length === 0) return '<span class="waits-none">なし</span>';
    var html = '';
    for (var i = 0; i < waits.length; i++) {
      html += T.renderTile(state.currentSuit, waits[i], { face: 'up' });
    }
    return html;
  }

  function renderWaitsBlock(state, label, waits) {
    return '<div class="waits-line">'
         + '<span class="waits-label">' + label + '</span>'
         + '<span class="waits-tiles">' + renderWaitsInline(state, waits) + '</span>'
         + '</div>';
  }

  // ---- アガリ結果ダイアログ ----

  // 相手の手牌も全部見せる版（局終了時）
  function renderHandRevealed(state, who) {
    var p = state[who];
    var elementId = (who === 'player') ? 'hand-player' : 'hand-cpu';
    var el = document.getElementById(elementId);
    if (!el) return;
    var html = '';
    for (var i = 0; i < p.hand.length; i++) {
      html += '<span class="tile-static">' + T.renderTile(state.currentSuit, p.hand[i], { face: 'up' }) + '</span>';
    }
    if (p.drawn !== null) {
      html += '<span class="tile-static drawn">' + T.renderTile(state.currentSuit, p.drawn, { face: 'up' }) + '</span>';
    }
    el.innerHTML = html;
    renderMelds(state, who);
  }

  function showWinDialog(state, onContinue) {
    // 対局画面の相手手牌も公開（ダイアログを閉じても見えるように）
    renderHandRevealed(state, 'cpu');
    renderHandRevealed(state, 'player');

    var w = state.winResult;

    var pWaits = computeWaits(state, 'player');
    var cWaits = computeWaits(state, 'cpu');
    var handsHtml = ''
      + buildDialogPlayerSection(state, 'cpu',    cWaits, w)
      + buildDialogPlayerSection(state, 'player', pWaits, w);

    if (w.winType === 'chombo') {
      var chomboBy = WHO_LABEL[w.chomboBy];
      var chomboTypeLabel = w.chomboType === 'ron' ? '誤ロン' : '誤ツモ';
      var body = ''
        + handsHtml
        + '<p class="chombo-msg">' + chomboBy + 'の宣言した手は和了形ではない／役なし／フリテン のいずれか</p>'
        + '<div class="rank-line">役満分の罰符</div>'
        + '<div class="points-line"><b>' + w.points.toLocaleString() + '</b> 点 → '
        + WHO_LABEL[w.winner] + ' へ</div>';
      showDialog(chomboBy + ' チョンボ（' + chomboTypeLabel + '）', body, '次の局へ', onContinue);
      return;
    }

    var winnerLabel = WHO_LABEL[w.winner];
    var winTypeLabel = w.winType === 'tsumo' ? 'ツモ' : 'ロン';
    var yakuHtml = w.yakuList.map(function (y) {
      return '<li>' + y.name + ' <b>' + y.han + '翻</b></li>';
    }).join('');
    var hanLine = w.isYakuman
      ? '<div class="rank-line">' + w.rankLabel + '</div>'
      : '<div class="rank-line">' + w.totalHan + ' 翻 — ' + w.rankLabel + '</div>';
    var pointsLabel = w.points.toLocaleString();

    var winBody = ''
      + handsHtml
      + '<ul class="yaku-list">' + yakuHtml + '</ul>'
      + hanLine
      + '<div class="points-line"><b>' + pointsLabel + '</b> 点 移動</div>';

    showDialog(winnerLabel + ' ' + winTypeLabel + ' 和了', winBody, '次の局へ', onContinue);
  }

  // ダイアログ内に表示するプレイヤー手牌+待ち牌セクション
  function buildDialogPlayerSection(state, who, waits, winResult) {
    var p = state[who];
    var label = WHO_LABEL[who];

    // アガリ牌をハイライト用に特定
    var agariTile = null;
    if (winResult && winResult.winType !== 'chombo' && winResult.winner === who) {
      agariTile = winResult.agariTile;
    }

    var handHtml = '';
    for (var i = 0; i < p.hand.length; i++) {
      var hl = (winResult && winResult.winType === 'ron'
                && winResult.winner === who
                && p.hand[i] === agariTile) ? ' tile-agari' : '';
      handHtml += '<span class="dialog-tile' + hl + '">'
        + T.renderTile(state.currentSuit, p.hand[i], { face: 'up' }) + '</span>';
    }
    if (p.drawn !== null) {
      var drawnHl = (winResult && winResult.winType === 'tsumo'
                     && winResult.winner === who) ? ' tile-agari' : '';
      handHtml += '<span class="dialog-tile drawn' + drawnHl + '">'
        + T.renderTile(state.currentSuit, p.drawn, { face: 'up' }) + '</span>';
    }
    for (var j = 0; j < p.melds.length; j++) {
      var m = p.melds[j];
      if (m.type === 'ankan') {
        handHtml += '<span class="dialog-meld">'
          + T.renderTile(state.currentSuit, m.tile, { face: 'up' })
          + T.renderTile(state.currentSuit, m.tile, { face: 'up' })
          + T.renderTile(state.currentSuit, m.tile, { face: 'up' })
          + T.renderTile(state.currentSuit, m.tile, { face: 'up' })
          + '</span>';
      }
    }

    var waitsLabel = (winResult && winResult.winType === 'ron' && winResult.winner === who)
      ? 'ロン牌'
      : (winResult && winResult.winType === 'tsumo' && winResult.winner === who)
        ? 'ツモ牌'
        : '待ち';
    // ロン/ツモ時は単純に「アガリ牌」を1枚だけ表示するが、テンパイ手としての待ち全体も並列で出す
    var waitsTilesHtml = (waits && waits.length > 0)
      ? renderWaitsInline(state, waits)
      : '<span class="waits-none">なし</span>';

    return '<div class="dialog-player-section">'
         + '<div class="dialog-player-label">' + label + '</div>'
         + '<div class="dialog-hand">' + handHtml + '</div>'
         + '<div class="dialog-waits-line">'
         +   '<span class="waits-label">待ち</span>'
         +   '<span class="waits-tiles">' + waitsTilesHtml + '</span>'
         + '</div>'
         + '</div>';
  }

  // ---- 汎用ダイアログ ----

  function showDialog(title, body, buttonLabel, onClick) {
    var dlg = document.getElementById('result-dialog');
    dlg.innerHTML = ''
      + '<h2>' + title + '</h2>'
      + '<div class="dialog-body">' + body + '</div>'
      + '<button id="dialog-btn">' + buttonLabel + '</button>';
    dlg.style.display = '';
    document.getElementById('dialog-btn').addEventListener('click', function () {
      dlg.style.display = 'none';
      if (onClick) onClick();
    });
  }

  function hideDialog() {
    var dlg = document.getElementById('result-dialog');
    if (dlg) dlg.style.display = 'none';
  }

  // ---- 補助 ----

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = String(value);
  }

  // ---- 公開 ----

  window.Bamboo.ui = {
    showScreen: showScreen,
    renderTable: renderTable,
    renderHand: renderHand,
    renderDiscard: renderDiscard,
    renderInfo: renderInfo,
    showDialog: showDialog,
    hideDialog: hideDialog,
    showWinDialog: showWinDialog,
    computeWaits: computeWaits,
    renderWaitsBlock: renderWaitsBlock,
    buildDialogPlayerSection: buildDialogPlayerSection,
    renderHandRevealed: renderHandRevealed,
  };
})();
