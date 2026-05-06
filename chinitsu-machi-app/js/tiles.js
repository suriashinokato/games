// tiles.js — 牌の内部表現と画像描画
//
// 清一色アプリではロジック層は数値 1〜9 で牌を扱い、suit は描画時のみ参照する。
// 画像は ../shared/images_hai/ 配下の PNG を直接読む（1m.png〜9m.png 等）。

window.Chinitsu = window.Chinitsu || {};

(function () {
  var SUITS = ['man', 'pin', 'sou'];
  var SUIT_TO_LETTER = { man: 'm', pin: 'p', sou: 's' };
  var IMAGE_DIR = '../shared/images_hai/';

  function randomSuit() {
    return SUITS[Math.floor(Math.random() * SUITS.length)];
  }

  function tileImagePath(suit, number) {
    var letter = SUIT_TO_LETTER[suit];
    if (!letter) throw new Error('unknown suit: ' + suit);
    if (number < 1 || number > 9) {
      throw new Error('number out of range (1-9): ' + number);
    }
    return IMAGE_DIR + number + letter + '.png';
  }

  function renderTile(suit, number) {
    var src = tileImagePath(suit, number);
    var alt = number + SUIT_TO_LETTER[suit];
    return '<img class="tile" src="' + src + '" alt="' + alt + '" draggable="false">';
  }

  function renderHand(suit, hand) {
    var html = '';
    for (var i = 0; i < hand.length; i++) {
      html += renderTile(suit, hand[i]);
    }
    return html;
  }

  window.Chinitsu.tiles = {
    SUITS: SUITS,
    randomSuit: randomSuit,
    tileImagePath: tileImagePath,
    renderTile: renderTile,
    renderHand: renderHand,
  };
})();
