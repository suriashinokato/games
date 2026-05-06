// wait.js — 清一色の待ち牌判定
//
// MVPでは「4面子1雀頭」の通常和了形のみを対象とする。
// 七対子・国士無双は清一色では成立しないか実用上ないので除外。
//
// 内部表現:
//   hand: 数値1〜9 の配列（長さ13 or 14）
//   counts: 長さ10の配列（index 0 は未使用、1〜9 が枚数）
//
// 公開API:
//   toCounts(hand)             … hand → counts
//   isStandardWin(hand14)      … 14枚が和了形か
//   listWaits(hand13)          … 13枚に対して待ち牌の配列（昇順）を返す

window.Chinitsu = window.Chinitsu || {};

(function () {
  function toCounts(hand) {
    var c = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (var i = 0; i < hand.length; i++) c[hand[i]]++;
    return c;
  }

  // counts に対して、ちょうど requiredMelds 個の面子（暗刻 or 順子）で
  // すべての牌を消費できるか。バックトラックで両方試す。
  function canSplitNMelds(counts, requiredMelds) {
    if (requiredMelds === 0) {
      for (var i = 1; i <= 9; i++) if (counts[i] !== 0) return false;
      return true;
    }
    // 最も若い未消費の牌を見つける
    var i = 1;
    while (i <= 9 && counts[i] === 0) i++;
    if (i > 9) return false; // メンツ数が足りない

    // 1) 暗刻 (i,i,i) を試す
    if (counts[i] >= 3) {
      counts[i] -= 3;
      if (canSplitNMelds(counts, requiredMelds - 1)) {
        counts[i] += 3;
        return true;
      }
      counts[i] += 3;
    }

    // 2) 順子 (i, i+1, i+2) を試す
    if (i <= 7 && counts[i + 1] >= 1 && counts[i + 2] >= 1) {
      counts[i]--; counts[i + 1]--; counts[i + 2]--;
      if (canSplitNMelds(counts, requiredMelds - 1)) {
        counts[i]++; counts[i + 1]++; counts[i + 2]++;
        return true;
      }
      counts[i]++; counts[i + 1]++; counts[i + 2]++;
    }

    return false;
  }

  function isStandardWin(hand14) {
    if (hand14.length !== 14) return false;
    var counts = toCounts(hand14);
    // 4枚以下チェック
    for (var i = 1; i <= 9; i++) if (counts[i] > 4) return false;

    for (var pair = 1; pair <= 9; pair++) {
      if (counts[pair] >= 2) {
        counts[pair] -= 2;
        var ok = canSplitNMelds(counts, 4);
        counts[pair] += 2;
        if (ok) return true;
      }
    }
    return false;
  }

  function listWaits(hand13) {
    if (hand13.length !== 13) {
      throw new Error('listWaits: hand13 must have 13 tiles, got ' + hand13.length);
    }
    var counts13 = toCounts(hand13);
    var waits = [];
    for (var n = 1; n <= 9; n++) {
      if (counts13[n] >= 4) continue; // 5枚目は存在しない
      var test = hand13.slice();
      test.push(n);
      if (isStandardWin(test)) waits.push(n);
    }
    return waits;
  }

  window.Chinitsu.wait = {
    toCounts: toCounts,
    isStandardWin: isStandardWin,
    listWaits: listWaits,
  };
})();
