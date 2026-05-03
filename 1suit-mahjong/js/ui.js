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
    // [DEBUG] 待ち牌バグ調査用ログ。原因特定後に削除する。
    console.log('[computeWaits]', who, {
      hand: p.hand.slice(),
      drawn: p.drawn,
      melds: JSON.parse(JSON.stringify(p.melds)),
      virtualLen: virtual.length,
      virtualCounts: H.toCounts(virtual).slice(1),
    });
    if (virtual.length !== 13) {
      console.log('[computeWaits] virtual.length !== 13 → []');
      return [];
    }
    var waits = H.findWaits(H.toCounts(virtual));
    console.log('[computeWaits] raw waits:', waits, 'ankanTiles:', ankanTiles);
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
      var reasonText;
      switch (w.chomboReason) {
        case 'noWinningHand':
          reasonText = chomboBy + 'の宣言した手は和了形になっていない';
          break;
        case 'noYaku':
          reasonText = chomboBy + 'の宣言した手は役がない';
          break;
        case 'furiten':
          reasonText = chomboBy + 'の宣言した手はフリテン';
          break;
        default:
          reasonText = chomboBy + 'の宣言した手は和了形ではない／役なし／フリテン のいずれか';
      }
      var body = ''
        + handsHtml
        + '<p class="chombo-msg">' + reasonText + '</p>'
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

  // ---- ヘルプダイアログ（操作マニュアル） ----

  function showHelpDialog() {
    var dlg = document.getElementById('result-dialog');
    if (!dlg) return;
    dlg.classList.add('help-dialog');
    dlg.innerHTML = ''
      + '<button id="help-close-x" class="help-close-x" aria-label="閉じる">×</button>'
      + '<h2>操作マニュアル</h2>'
      + '<div class="dialog-body help-body">' + buildHelpHtml() + '</div>';
    dlg.style.display = '';
    dlg.scrollTop = 0;
    document.getElementById('help-close-x').addEventListener('click', function () {
      dlg.style.display = 'none';
      dlg.classList.remove('help-dialog');
    });
  }

  function buildHelpHtml() {
    return [
      '<h3>1. ゲーム概要</h3>',
      '<ul>',
      '<li>1 種類の数牌（萬子・筒子・索子のいずれか）だけで遊ぶ 2 人麻雀。</li>',
      '<li>使用牌は局ごとにランダム決定。1〜9 を各 4 枚 = 計 36 枚。</li>',
      '<li>副露なし（ポン・チー無し、暗槓のみ）→ 常にメンゼン。</li>',
      '<li>持ち点 100,000 → <b>200,000 で CLEAR</b> ／ <b>0 以下で GAME OVER</b>。</li>',
      '</ul>',

      '<h3>2. 画面の見方</h3>',
      '<ul>',
      '<li><b>情報バー</b>: 第 N 局／山残 N。</li>',
      '<li><b>相手エリア</b>: 手牌（裏向き）／暗槓／河／点数／親・立直マーク。</li>',
      '<li><b>自分エリア</b>: 河／手牌（クリック可）／暗槓／点数／アクションバー。</li>',
      '<li><b>ツモ牌</b>は手牌の右側に枠付きで分離表示。</li>',
      '<li>リーチ宣言後（宣言ターン以外）は手牌が disabled になりツモ切り強制。</li>',
      '</ul>',

      '<h3>3. 基本操作</h3>',
      '<table class="help-table">',
      '<tr><th>ボタン／操作</th><th>動作</th><th>表示条件</th></tr>',
      '<tr><td>手牌の牌をクリック</td><td>その牌を打牌</td><td>自分の手番、リーチ前（宣言ターン中は可）</td></tr>',
      '<tr><td>ツモ牌をクリック</td><td>ツモ切り</td><td>自分の手番、ツモ後</td></tr>',
      '<tr><td>ツモ</td><td>ツモ和了を宣言</td><td>自分のツモ後</td></tr>',
      '<tr><td>ロン</td><td>相手の打牌でロン宣言</td><td>相手の打牌直後</td></tr>',
      '<tr><td>パス</td><td>ロンせずに見送る</td><td>相手の打牌直後</td></tr>',
      '<tr><td>リーチ</td><td>リーチ宣言 → 続けて打牌</td><td>テンパイ＋ツモ後＋未リーチ</td></tr>',
      '<tr><td>暗槓 N</td><td>数字 N の暗槓を宣言</td><td>同じ数字 4 枚が手牌＋ツモにある時</td></tr>',
      '<tr><td>ツモ切り</td><td>リーチ後のツモ切り</td><td>リーチ宣言ターンより後の自分のツモ後</td></tr>',
      '</table>',
      '<p class="help-note">※ ツモ／ロンは成立可否を問わず押せます。成立していなければ自動的にチョンボ判定（誤ツモ・誤ロン）で役満分の罰符。</p>',
      '<p class="help-note">※ リーチ宣言ターン中は「どの牌を切りますか？」と表示され、手牌またはツモ牌から自由に選択。</p>',
      '<p class="help-note">※ 暗槓ボタンは「待ちが変わる暗槓」「テンパイを崩す暗槓」では表示されません（送りカン抑止）。</p>',

      '<h3>4. ゲームの流れ</h3>',
      '<ol>',
      '<li>使用スートがランダム決定され、親に 13 枚配牌。</li>',
      '<li>ツモ → 14 枚 → 判定 → 打牌。</li>',
      '<li>もう一方がロン or パスを判定。</li>',
      '<li>山が尽きるまで繰り返し → 山切れで流局。</li>',
      '<li>親アガリ／親テンパイ流局で <b>連荘</b>、子アガリ／親ノーテン流局で <b>親交代</b>。</li>',
      '<li>CLEAR（200,000 点到達）または GAME OVER（0 点以下）まで継続。</li>',
      '</ol>',

      '<h3>5. 特殊ルール（要チェック）</h3>',
      '<ul>',
      '<li><b>リーチ後の手出し禁止</b>: 宣言ターン以外は強制ツモ切り。</li>',
      '<li><b>送りカン禁止</b>: 待ちが変わる暗槓・テンパイを崩す暗槓は不可。</li>',
      '<li><b>暗槓で一発消失</b>: 自他いずれの暗槓でも両者の一発が消える。</li>',
      '<li><b>嶺上開花</b>: 暗槓直後の嶺上ツモアガリで +1 翻。</li>',
      '<li><b>第 1 ツモのアガリ無効</b>: 配牌＋第 1 ツモでは和了不可（天和／地和廃止）。最大でもテンパイ止まりで、ツモボタンも出ない。</li>',
      '<li><b>第 1 打牌のロン無効</b>: 親の第 1 打牌へのロンも不可（人和廃止）。ロンボタンが出ず、パスのみ可能。</li>',
      '<li><b>フリテン</b>: ロン牌を自分が捨て済みならロン不可。ただし<b>リーチ前に切った牌はフリテン対象外</b>（独自仕様）。</li>',
      '<li><b>ノーテンリーチチョンボ</b>: 流局時にリーチ宣言者がノーテンなら役満分の罰符（親 48,000 / 子 32,000）。両者ノーテンリーチは相殺。</li>',
      '<li><b>誤ロン・誤ツモ</b>: 役満分の罰符。</li>',
      '<li><b>リーチ棒なし／ノーテン罰符なし</b>: 通常のノーテン流局では点数移動なし。</li>',
      '</ul>',

      '<h3>6. 役一覧</h3>',
      '<p><b>役満（13 翻、複合なし）</b>: 緑一色（索子局のみ）／九蓮宝燈／純正九蓮宝燈／四暗刻／四槓子（天和／地和／人和は廃止）</p>',
      '<table class="help-table">',
      '<tr><th>通常役</th><th>翻</th></tr>',
      '<tr><td>清一色（常に成立）</td><td>6</td></tr>',
      '<tr><td>二盃口</td><td>3</td></tr>',
      '<tr><td>一気通貫／対々和／三暗刻／三槓子／七対子</td><td>2</td></tr>',
      '<tr><td>立直／一発／門前清自摸和／平和／一盃口／嶺上開花</td><td>1</td></tr>',
      '</table>',
      '<p class="help-note">清一色 6 翻が必ず付くので、和了の最低ランクは <b>跳満</b>。</p>',

      '<h3>7. 点数（1 人払い・符計算なし）</h3>',
      '<table class="help-table">',
      '<tr><th>翻数</th><th>ランク</th><th>子</th><th>親</th></tr>',
      '<tr><td>5 翻</td><td>満貫</td><td>8,000</td><td>12,000</td></tr>',
      '<tr><td>6〜7 翻</td><td>跳満</td><td>12,000</td><td>18,000</td></tr>',
      '<tr><td>8〜10 翻</td><td>倍満</td><td>16,000</td><td>24,000</td></tr>',
      '<tr><td>11〜12 翻</td><td>三倍満</td><td>24,000</td><td>36,000</td></tr>',
      '<tr><td>13 翻以上／役満</td><td>役満</td><td>32,000</td><td>48,000</td></tr>',
      '</table>',
    ].join('');
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
    showHelpDialog: showHelpDialog,
    showWinDialog: showWinDialog,
    computeWaits: computeWaits,
    renderWaitsBlock: renderWaitsBlock,
    buildDialogPlayerSection: buildDialogPlayerSection,
    renderHandRevealed: renderHandRevealed,
  };
})();
