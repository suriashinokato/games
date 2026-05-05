// 牌の内部表現と表示用ヘルパ
// 牌コード: "1m"〜"9m", "1p"〜"9p", "1s"〜"9s", "1z"〜"7z" (1z=東 2z=南 3z=西 4z=北 5z=白 6z=發 7z=中)
// 内部的には nankiru-shanten.js と同じ表現を使う

(function () {
  'use strict';

  const SUIT_ORDER = ['m', 'p', 's', 'z'];

  // 全34種の牌コード (赤5は今回未使用)
  function tileCodes() {
    const arr = [];
    for (const suit of ['m', 'p', 's']) {
      for (let n = 1; n <= 9; n++) arr.push(n + suit);
    }
    for (let n = 1; n <= 7; n++) arr.push(n + 'z');
    return arr;
  }

  // 画像パス (HTMLからの相対パス)
  function imageUrl(code) {
    return 'shared/images_hai/' + code + '.png';
  }

  // 牌の表示名 (日本語)
  function displayName(code) {
    if (!code) return '';
    if (code[1] === 'z') {
      const map = { '1': '東', '2': '南', '3': '西', '4': '北',
                    '5': '白', '6': '發', '7': '中' };
      return map[code[0]] || code;
    }
    const suitMap = { m: '萬', p: '筒', s: '索' };
    return code[0] + suitMap[code[1]];
  }

  // ソート用: m → p → s → z、各色内は数字昇順
  function compareTiles(a, b) {
    const sa = SUIT_ORDER.indexOf(a[1]);
    const sb = SUIT_ORDER.indexOf(b[1]);
    if (sa !== sb) return sa - sb;
    return parseInt(a[0], 10) - parseInt(b[0], 10);
  }

  // 配列の牌をソートした新しい配列を返す
  function sortTiles(tiles) {
    return tiles.slice().sort(compareTiles);
  }

  window.TehaiTraining = window.TehaiTraining || {};
  window.TehaiTraining.tiles = {
    tileCodes: tileCodes,
    imageUrl: imageUrl,
    displayName: displayName,
    compareTiles: compareTiles,
    sortTiles: sortTiles,
  };
})();
