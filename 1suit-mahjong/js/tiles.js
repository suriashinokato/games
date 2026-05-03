// tiles.js — 牌の内部表現と SVG 生成
//
// ロジック層では牌は数値 1〜9 で表す（suit を持たない）。
// suit は gameState.currentSuit が 1 つだけ持ち、描画時にだけ参照する。

window.Bamboo = window.Bamboo || {};

(function () {
  // -------- 内部表現 --------

  var SUITS = ['man', 'pin', 'sou'];

  // 局開始時にランダムで suit を選ぶ
  function randomSuit() {
    var i = Math.floor(Math.random() * SUITS.length);
    return SUITS[i];
  }

  // 1〜9 を各 4 枚作って Fisher–Yates でシャッフルする
  function buildWall() {
    var wall = [];
    for (var n = 1; n <= 9; n++) {
      for (var k = 0; k < 4; k++) wall.push(n);
    }
    for (var i = wall.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = wall[i]; wall[i] = wall[j]; wall[j] = tmp;
    }
    return wall;
  }

  // -------- 画像ファイル参照 --------
  //
  // 牌画像は ../images_hai/ にある PNG を直接読む（プロジェクトルートと同階層）。
  // 命名: 1m.png 〜 9m.png（萬子）、1p〜9p（筒子）、1s〜9s（索子）、back.png
  //
  // 描画関数は <img> タグ文字列を返す。innerHTML に流し込めば表示される。

  var IMAGE_DIR = '../images_hai/';

  var SUIT_TO_LETTER = { man: 'm', pin: 'p', sou: 's' };

  function tileImagePath(suit, number) {
    var letter = SUIT_TO_LETTER[suit];
    if (!letter) throw new Error('unknown suit: ' + suit);
    if (number < 1 || number > 9) {
      throw new Error('number out of range (1-9): ' + number);
    }
    return IMAGE_DIR + number + letter + '.png';
  }

  function backImagePath() {
    return IMAGE_DIR + 'back.png';
  }

  function renderTile(suit, number, opts) {
    opts = opts || {};
    var src, alt;
    if (opts.face === 'down') {
      src = backImagePath();
      alt = '裏';
    } else {
      src = tileImagePath(suit, number);
      alt = number + SUIT_TO_LETTER[suit];
    }
    return '<img class="tile" src="' + src + '" alt="' + alt + '" draggable="false">';
  }

  // -------- 公開 --------

  window.Bamboo.tiles = {
    SUITS: SUITS,
    randomSuit: randomSuit,
    buildWall: buildWall,
    renderTile: renderTile,
    tileImagePath: tileImagePath,
    backImagePath: backImagePath,
  };
})();
