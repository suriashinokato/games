// handEval.js — シャンテン計算・アガリ判定・待ち牌列挙
//
// 牌は数値 1〜9 だけで扱う（suit に依存しない）。
// 中間表現は「枚数配列 counts: number[10]」。index 0 は未使用、1〜9 が枚数を表す。
// 例: 手牌 [1,1,1,2,3,4,5,6,6,7,7,8,9] → counts = [_,3,1,1,1,1,2,2,1,1] (合計13)

window.Bamboo = window.Bamboo || {};

(function () {
  // ------------------------------------------------------------------
  // 1. 数値配列 ⇄ 枚数配列
  // ------------------------------------------------------------------

  function toCounts(hand) {
    var counts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (var i = 0; i < hand.length; i++) {
      counts[hand[i]]++;
    }
    return counts;
  }

  function totalTiles(counts) {
    var t = 0;
    for (var i = 1; i <= 9; i++) t += counts[i];
    return t;
  }

  function copyCounts(c) {
    return [c[0], c[1], c[2], c[3], c[4], c[5], c[6], c[7], c[8], c[9]];
  }

  // ------------------------------------------------------------------
  // 2. アガリ判定（4 面子 1 雀頭 / 七対子 / 九蓮宝燈）
  // ------------------------------------------------------------------

  // counts (合計14枚) が 4面子1雀頭 で構成可能か
  // 同時に「分解（雀頭と4面子の内訳）」をすべて列挙して返す
  // setsOnly が true の場合は雀頭を取らずに「全部面子」で構成可能か（雀頭探索の途中で使う）
  function findStandardSplits(counts) {
    var splits = [];
    // 雀頭候補 1〜9 を試す
    for (var pair = 1; pair <= 9; pair++) {
      if (counts[pair] < 2) continue;
      var rest = copyCounts(counts);
      rest[pair] -= 2;
      var sets = [];
      if (decomposeAllSets(rest, 1, sets)) {
        splits.push({
          pair: pair,
          sets: sets.slice(),
        });
      }
    }
    return splits;
  }

  // counts を「面子のみ」に分解できるか。できれば true を返し sets に { type, tile } を追記。
  // type は 'kotsu'（刻子）か 'shuntsu'（順子）。tile は刻子の値 or 順子の最小値。
  function decomposeAllSets(counts, start, sets) {
    // 先頭の非ゼロ位置を探す
    var i = start;
    while (i <= 9 && counts[i] === 0) i++;
    if (i > 9) return true; // 全部 0 → OK

    // (a) 刻子として取る
    if (counts[i] >= 3) {
      counts[i] -= 3;
      sets.push({ type: 'kotsu', tile: i });
      if (decomposeAllSets(counts, i, sets)) return true;
      sets.pop();
      counts[i] += 3;
    }

    // (b) 順子として取る (i, i+1, i+2)
    if (i <= 7 && counts[i] >= 1 && counts[i + 1] >= 1 && counts[i + 2] >= 1) {
      counts[i]--; counts[i + 1]--; counts[i + 2]--;
      sets.push({ type: 'shuntsu', tile: i });
      if (decomposeAllSets(counts, i, sets)) return true;
      sets.pop();
      counts[i]++; counts[i + 1]++; counts[i + 2]++;
    }

    return false;
  }

  // 七対子: 7 種類が各 2 枚（合計 14 枚）
  function isChiitoitsu(counts) {
    if (totalTiles(counts) !== 14) return false;
    var pairs = 0;
    for (var i = 1; i <= 9; i++) {
      if (counts[i] === 2) pairs++;
      else if (counts[i] !== 0) return false;
    }
    return pairs === 7;
  }

  // 九蓮宝燈: 1 が 3+, 9 が 3+, 残りが 1+1 ずつ で合計 14 枚
  function isChuurenSplit(counts) {
    if (totalTiles(counts) !== 14) return false;
    if (counts[1] < 3 || counts[9] < 3) return false;
    for (var i = 2; i <= 8; i++) {
      if (counts[i] < 1) return false;
    }
    return true;
  }

  // 純正九蓮: アガリ牌を抜くと 1112345678999 になる（= 9 面待ち）
  // 引数: 14 枚 counts と アガリ牌 (1-9)
  function isPureChuuren(counts, agariTile) {
    if (!isChuurenSplit(counts)) return false;
    var c = copyCounts(counts);
    c[agariTile]--;
    // 1 が 3, 9 が 3, 2-8 が 各1
    if (c[1] !== 3 || c[9] !== 3) return false;
    for (var i = 2; i <= 8; i++) if (c[i] !== 1) return false;
    return true;
  }

  function isWinningHand(counts) {
    if (totalTiles(counts) !== 14) return false;
    if (isChiitoitsu(counts)) return true;
    return findStandardSplits(counts).length > 0;
  }

  // 役判定で使う「全分解」。標準形のみ。九蓮・七対子は別フラグで判断する。
  function findWinningSplits(counts) {
    return findStandardSplits(counts);
  }

  // ------------------------------------------------------------------
  // 3. シャンテン数計算
  // ------------------------------------------------------------------
  //
  // 目標: 4 面子 1 雀頭。
  //   面子 1 つ完成 = +2 ブロック分相当
  //   搭子（順子の 1 つ手前 / シャボの 1 つ手前 = 2 枚）= +1 ブロック相当
  // シャンテン数 = 8 - 2*(面子数) - (面子+搭子)合計が4を超えない範囲 - (雀頭があれば 1)
  // 具体式（標準）: shanten = 8 - 2*sets - max(taatsu+sets, 0...) ... 簡略化のため
  //                          ベタな再帰で「使える面子と搭子の組み合わせ最大値」を全列挙する。
  //
  // 今回は牌が 1〜9 の 9 種類しかないので、再帰的に
  //   counts から「刻子/順子/対子/搭子(2連/カンチャン)/単独」を取り、最終的な
  //   (sets, partials, hasPair) の最大スコアを得る方式で実装する。

  function calcShantenStandard(counts) {
    // 雀頭ありで試す + 雀頭なしでも試して、より小さい方を採用
    var best = 8;
    // 雀頭候補
    for (var p = 1; p <= 9; p++) {
      if (counts[p] >= 2) {
        counts[p] -= 2;
        var s = searchSets(counts, 0, 0, true);
        counts[p] += 2;
        if (s < best) best = s;
      }
    }
    // 雀頭なし
    var s2 = searchSets(counts, 0, 0, false);
    if (s2 < best) best = s2;
    return best;
  }

  // counts の残り枚数から、面子(sets)・搭子(partials) を最大限取った時の
  // シャンテン数を返す。再帰探索。
  function searchSets(counts, sets, partials, hasPair) {
    // ブロック数の上限
    if (sets + partials > 4) {
      partials = 4 - sets;
    }
    // 雀頭の +1 補正
    var pairBonus = hasPair ? 1 : 0;
    // 仮の計算: シャンテン = 8 - 2*sets - partials - pairBonus
    //            （ただし sets+partials <= 4 の制約で枝切り）
    var current = 8 - 2 * sets - partials - pairBonus;

    // 先頭の非ゼロを探す
    var i = 1;
    while (i <= 9 && counts[i] === 0) i++;
    if (i > 9) return current;

    var best = current;

    // (a) 刻子
    if (counts[i] >= 3) {
      counts[i] -= 3;
      var r = searchSets(counts, sets + 1, partials, hasPair);
      counts[i] += 3;
      if (r < best) best = r;
    }

    // (b) 順子
    if (i <= 7 && counts[i] >= 1 && counts[i + 1] >= 1 && counts[i + 2] >= 1) {
      counts[i]--; counts[i + 1]--; counts[i + 2]--;
      var r2 = searchSets(counts, sets + 1, partials, hasPair);
      counts[i]++; counts[i + 1]++; counts[i + 2]++;
      if (r2 < best) best = r2;
    }

    // (c) 対子（搭子として、雀頭がもうあるとき）
    if (counts[i] >= 2) {
      counts[i] -= 2;
      var r3 = searchSets(counts, sets, partials + 1, hasPair);
      counts[i] += 2;
      if (r3 < best) best = r3;
    }

    // (d) 両面/嵌張搭子: i と i+1
    if (i <= 8 && counts[i] >= 1 && counts[i + 1] >= 1) {
      counts[i]--; counts[i + 1]--;
      var r4 = searchSets(counts, sets, partials + 1, hasPair);
      counts[i]++; counts[i + 1]++;
      if (r4 < best) best = r4;
    }

    // (e) カンチャン搭子: i と i+2
    if (i <= 7 && counts[i] >= 1 && counts[i + 2] >= 1) {
      counts[i]--; counts[i + 2]--;
      var r5 = searchSets(counts, sets, partials + 1, hasPair);
      counts[i]++; counts[i + 2]++;
      if (r5 < best) best = r5;
    }

    // (f) この牌を捨てて飛ばす（孤立牌として処理）
    counts[i]--;
    var r6 = searchSets(counts, sets, partials, hasPair);
    counts[i]++;
    if (r6 < best) best = r6;

    return best;
  }

  function calcShanten(counts) {
    var c = copyCounts(counts);
    var standard = calcShantenStandard(c);
    // 1〜9 の 9 種から 7 種選べば七対子は成立しうる（11 22 33 44 55 66 77 など）。
    // 標準形と七対子形の小さい方を採用する。
    var chiitoi = calcChiitoitsuShanten(counts);
    var best = Math.min(standard, chiitoi);

    // 九蓮形の特殊シャンテンは標準形に内包されているが、念のため明示
    if (totalTiles(counts) === 13 && isChuurenTenpai(counts)) {
      return 0;
    }
    if (totalTiles(counts) === 14 && isChuurenSplit(counts)) {
      return -1;
    }
    return best;
  }

  // 七対子のシャンテン: 6 - 対子数（種類が 7 未満ならその不足分を加算）
  function calcChiitoitsuShanten(counts) {
    var pairs = 0;
    var kinds = 0;
    for (var i = 1; i <= 9; i++) {
      if (counts[i] >= 1) kinds++;
      if (counts[i] >= 2) pairs++;
    }
    var shanten = 6 - pairs;
    if (kinds < 7) shanten += (7 - kinds);
    return shanten;
  }

  // テンパイ時に「あと 1 枚で九蓮宝燈」となる手か（標準シャンテン側でもテンパイ判定されるはずだが
  // 安全のため明示）
  function isChuurenTenpai(counts) {
    if (totalTiles(counts) !== 13) return false;
    if (counts[1] < 3 || counts[9] < 3) return false;
    if (counts[1] > 4 || counts[9] > 4) return false;
    for (var i = 2; i <= 8; i++) {
      if (counts[i] < 1) return false;
    }
    return true;
  }

  // ------------------------------------------------------------------
  // 4. 待ち牌列挙
  // ------------------------------------------------------------------

  // 13 枚の counts に対し、1〜9 のうち足したら 14 枚アガリになる牌をリスト化
  function findWaits(counts13) {
    if (totalTiles(counts13) !== 13) return [];
    var waits = [];
    for (var n = 1; n <= 9; n++) {
      if (counts13[n] >= 4) continue; // もう 4 枚使ってる
      counts13[n]++;
      if (isWinningHand(counts13)) waits.push(n);
      counts13[n]--;
    }
    return waits;
  }

  // ------------------------------------------------------------------
  // 5. フリテン判定
  // ------------------------------------------------------------------

  function isFuriten(waits, ownDiscard) {
    for (var i = 0; i < waits.length; i++) {
      if (ownDiscard.indexOf(waits[i]) !== -1) return true;
    }
    return false;
  }

  // ------------------------------------------------------------------
  // 公開
  // ------------------------------------------------------------------

  window.Bamboo.handEval = {
    toCounts: toCounts,
    totalTiles: totalTiles,
    isWinningHand: isWinningHand,
    findWinningSplits: findWinningSplits,
    calcShanten: calcShanten,
    findWaits: findWaits,
    isFuriten: isFuriten,
    isChiitoitsu: isChiitoitsu,
    isChuurenSplit: isChuurenSplit,
    isPureChuuren: isPureChuuren,
  };
})();
