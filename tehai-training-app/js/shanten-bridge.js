// nankiru-shanten.js (window.NankiruShanten) を本アプリ用に薄くラップする
// 鳴きなし・赤5なし・ドラ無視 の前提で、APIを単純化する

(function () {
  'use strict';

  if (!window.NankiruShanten) {
    console.error('nankiru-shanten.js が読み込まれていません');
    return;
  }
  const NS = window.NankiruShanten;

  // 13枚または14枚の手牌のシャンテン数を返す
  // 標準形 (4面子1雀頭) と七対子の両方を考慮し、より小さい方 (テンパイに近い方) を返す
  // 国士無双は今回は対象外
  function shantenCount(hand) {
    const counts = NS.tilesToCounts(hand);
    const standard = NS.countStandardShanten(counts, 0);
    const chiitoi = NS.countChiitoiShanten(counts);
    return Math.min(standard, chiitoi);
  }

  // 受け入れ牌の種類のみを返す配列 (枚数は問わず、シャンテンを進める牌)
  function ukeireTypes(hand) {
    const base = shantenCount(hand);
    const types = [];
    for (let i = 0; i < 34; i++) {
      const tile = NS.INDEX_TO_TILE[i];
      const newHand = hand.concat([tile]);
      if (shantenCount(newHand) < base) types.push(tile);
    }
    return types;
  }

  // 受け入れ牌を { tile, count } の配列で返す (count は山に残っている枚数)
  function ukeireWithCount(hand) {
    return NS.countAcceptance(hand, [], 0, 0);
  }

  // 14枚の手牌から、受け入れが最大になる打牌をすべて返す (同点複数あり)
  // 各要素: { discard, shantenAfter, tiles: [{tile, count}], totalCount }
  function bestDiscards(hand14) {
    const all = NS.calcAllDiscardOptions(hand14, [], 0, 0);
    if (all.length === 0) return [];
    const top = all[0].totalCount;
    return all.filter(x => x.totalCount === top);
  }

  // 14枚の手牌から、全打牌候補の受け入れ評価を返す (採点後の解説表示用)
  function allDiscardOptions(hand14) {
    return NS.calcAllDiscardOptions(hand14, [], 0, 0);
  }

  window.TehaiTraining = window.TehaiTraining || {};
  window.TehaiTraining.shanten = {
    shantenCount: shantenCount,
    ukeireTypes: ukeireTypes,
    ukeireWithCount: ukeireWithCount,
    bestDiscards: bestDiscards,
    allDiscardOptions: allDiscardOptions,
  };
})();
