// score.js — 翻数 → 満貫/跳満/倍満/三倍満/役満 の段階判定と点数計算
//
// 符計算は省略。2 人麻雀のためツモ・ロンとも相手 1 人で全額を支払う。
// 親はベース×1.5 (慣例値で固定)。

window.Bamboo = window.Bamboo || {};

(function () {
  var RANK_LABEL = {
    mangan: '満貫',
    haneman: '跳満',
    baiman: '倍満',
    sanbaiman: '三倍満',
    yakuman: '役満',
  };

  function calcScore(args) {
    var totalHan = args.totalHan;
    var isYakuman = args.isYakuman;
    var isDealer = args.isDealer;
    // winType ('tsumo' | 'ron') は本作では支払い分配に影響しないので扱わない

    var rank, baseChild, baseDealer;
    if (isYakuman || totalHan >= 13) {
      rank = 'yakuman';
      baseChild = 32000; baseDealer = 48000;
    } else if (totalHan >= 11) {
      rank = 'sanbaiman';
      baseChild = 24000; baseDealer = 36000;
    } else if (totalHan >= 8) {
      rank = 'baiman';
      baseChild = 16000; baseDealer = 24000;
    } else if (totalHan >= 6) {
      rank = 'haneman';
      baseChild = 12000; baseDealer = 18000;
    } else if (totalHan >= 5) {
      rank = 'mangan';
      baseChild = 8000; baseDealer = 12000;
    } else {
      // 本作は清一色 6 翻が必ず付くので 5 翻未満は理論上発生しない。
      // 念のため満貫扱い。
      rank = 'mangan';
      baseChild = 8000; baseDealer = 12000;
    }

    var points = isDealer ? baseDealer : baseChild;
    return {
      rank: rank,
      rankLabel: RANK_LABEL[rank],
      points: points,
    };
  }

  window.Bamboo.score = {
    calcScore: calcScore,
    RANK_LABEL: RANK_LABEL,
  };
})();
