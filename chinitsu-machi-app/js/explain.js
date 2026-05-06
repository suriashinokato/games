// explain.js — 解説生成（algorithm.md 主体）
//
// algorithm.md のヒューリスティックに沿って、待ち牌に対して以下を生成する：
//   - 待ち型分類（単騎/シャボ/カンチャン/リャンメン/ペンチャン）
//   - 抜き解釈（完全メンツを抜くと、雀頭+待ち部分が残るという見方）
//   - その他の解釈の有無（多面待ちの場合）
//
// データベース（problems.js）はパターン名の参考表示にのみ使う。

window.Chinitsu = window.Chinitsu || {};

(function () {
  function canonShape(hand) {
    return hand.slice().sort(function (a, b) { return a - b; }).join('');
  }

  function findPattern(hand13) {
    var shape = canonShape(hand13);
    return window.Chinitsu.problems.findByShape(shape);
  }

  // 待ち型の優先順位（教育上の見やすさ順）
  // 単騎 > シャボ > リャンメン > ペンチャン > カンチャン
  var TYPE_PRIORITY = {
    '単騎': 1, 'シャボ': 2, 'リャンメン': 3, 'ペンチャン': 4, 'カンチャン': 5, '?': 99
  };

  function pickPrimarySplit(splits, demoWait) {
    var classify = window.Chinitsu.decompose.classifyWait;
    var best = null;
    var bestScore = 999;
    for (var i = 0; i < splits.length; i++) {
      var c = classify(splits[i], demoWait);
      var score = TYPE_PRIORITY[c.type] || 99;
      if (score < bestScore) {
        bestScore = score;
        best = { split: splits[i], classification: c };
      }
    }
    return best || (splits.length > 0 ? { split: splits[0], classification: classify(splits[0], demoWait) } : null);
  }

  function generateExplanation(hand13, demoWait) {
    var hand14 = hand13.slice();
    hand14.push(demoWait);
    var splits = window.Chinitsu.decompose.splitAll(hand14);
    if (splits.length === 0) return null;

    var primary = pickPrimarySplit(splits, demoWait);
    var description = window.Chinitsu.decompose.describeWait(
      primary.classification, demoWait, primary.split.pair
    );

    return {
      pattern: findPattern(hand13),
      primarySplit: primary.split,
      classification: primary.classification,
      description: description,
      allWaitTypes: window.Chinitsu.decompose.allWaitTypes(splits, demoWait),
      allSplits: splits,
      demoWait: demoWait,
    };
  }

  window.Chinitsu.explain = {
    canonShape: canonShape,
    findPattern: findPattern,
    generateExplanation: generateExplanation,
  };
})();
