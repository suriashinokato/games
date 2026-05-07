// decompose.js — 14枚手牌を「雀頭1+面子4」の全パターンに分解
//
// 公開API:
//   splitAll(hand14)            … 全分解の配列
//   formatText(split)           … "222 + 345 + 678 + 999 + 11(雀頭)" 形式の文字列
//   formatTilesHtml(split, suit)… 牌画像を並べたHTMLを返す
//
// split オブジェクトの形:
//   { pair: 数値, melds: [ {type:'kotsu'|'shuntsu', tiles:[..]} × 4 ] }

window.Chinitsu = window.Chinitsu || {};

(function () {
  var toCounts = window.Chinitsu.wait.toCounts;

  function splitAll(hand14) {
    if (hand14.length !== 14) return [];
    var counts = toCounts(hand14);
    for (var i = 1; i <= 9; i++) if (counts[i] > 4) return [];

    var results = [];
    for (var pair = 1; pair <= 9; pair++) {
      if (counts[pair] >= 2) {
        counts[pair] -= 2;
        var subs = enumMelds(counts, 4);
        for (var k = 0; k < subs.length; k++) {
          results.push({ pair: pair, melds: subs[k] });
        }
        counts[pair] += 2;
      }
    }
    return results;
  }

  // counts に対して needed 個の面子（暗刻 or 順子）の全列挙
  function enumMelds(counts, needed) {
    if (needed === 0) {
      for (var i = 1; i <= 9; i++) if (counts[i] !== 0) return [];
      return [[]];
    }
    var i = 1;
    while (i <= 9 && counts[i] === 0) i++;
    if (i > 9) return [];

    var results = [];

    // 暗刻
    if (counts[i] >= 3) {
      counts[i] -= 3;
      var subsK = enumMelds(counts, needed - 1);
      for (var k = 0; k < subsK.length; k++) {
        results.push([{ type: 'kotsu', tiles: [i, i, i] }].concat(subsK[k]));
      }
      counts[i] += 3;
    }
    // 順子
    if (i <= 7 && counts[i + 1] >= 1 && counts[i + 2] >= 1) {
      counts[i]--; counts[i + 1]--; counts[i + 2]--;
      var subsS = enumMelds(counts, needed - 1);
      for (var s = 0; s < subsS.length; s++) {
        results.push([{ type: 'shuntsu', tiles: [i, i + 1, i + 2] }].concat(subsS[s]));
      }
      counts[i]++; counts[i + 1]++; counts[i + 2]++;
    }
    return results;
  }

  function formatText(split) {
    var parts = split.melds.map(function (m) {
      return m.tiles.join('');
    });
    parts.push('' + split.pair + split.pair + '(雀頭)');
    return parts.join(' + ');
  }

  function formatTilesHtml(split, suit) {
    var renderTile = window.Chinitsu.tiles.renderTile;
    var groups = split.melds.slice();
    groups.push({ type: 'pair', tiles: [split.pair, split.pair] });

    var html = '';
    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      html += '<span class="meld meld-' + g.type + '">';
      for (var j = 0; j < g.tiles.length; j++) {
        html += renderTile(suit, g.tiles[j]);
      }
      html += '</span>';
      if (i < groups.length - 1) html += '<span class="meld-sep">+</span>';
    }
    return html;
  }

  // split 内で waitTile がどのメンツ・どの位置にあるかを分類
  // 返り値: { type: '単騎'|'シャボ'|'カンチャン'|'リャンメン'|'ペンチャン',
  //          waitMeld: meld or null,   // null は単騎
  //          completeMelds: [...]        // wait を含まない3メンツ
  //        }
  function classifyWait(split, waitTile) {
    if (split.pair === waitTile) {
      return {
        type: '単騎',
        waitMeld: null,
        completeMelds: split.melds.slice(),
      };
    }
    var waitMeld = null;
    var completeMelds = [];
    for (var i = 0; i < split.melds.length; i++) {
      var meld = split.melds[i];
      if (waitMeld === null && meld.tiles.indexOf(waitTile) !== -1) {
        waitMeld = meld;
      } else {
        completeMelds.push(meld);
      }
    }
    if (!waitMeld) {
      return { type: '?', waitMeld: null, completeMelds: split.melds.slice() };
    }
    if (waitMeld.type === 'kotsu') {
      return { type: 'シャボ', waitMeld: waitMeld, completeMelds: completeMelds };
    }
    var idx = waitMeld.tiles.indexOf(waitTile);
    if (idx === 1) {
      return { type: 'カンチャン', waitMeld: waitMeld, completeMelds: completeMelds };
    }
    // ペンチャン待ちは hand13 の partial が [1,2] か [8,9] の場合だけ。
    //   shuntsu [1,2,3] で wait=3（idx=2）→ partial [1,2]
    //   shuntsu [7,8,9] で wait=7（idx=0）→ partial [8,9]
    if ((idx === 2 && waitTile === 3) || (idx === 0 && waitTile === 7)) {
      return { type: 'ペンチャン', waitMeld: waitMeld, completeMelds: completeMelds };
    }
    return { type: 'リャンメン', waitMeld: waitMeld, completeMelds: completeMelds };
  }

  // 複数分解にわたる「この待ち牌の取り方」を集約。重複排除した型のリストを返す
  function allWaitTypes(splits, waitTile) {
    var seen = {};
    var types = [];
    for (var i = 0; i < splits.length; i++) {
      var c = classifyWait(splits[i], waitTile);
      if (!seen[c.type]) {
        seen[c.type] = true;
        types.push(c.type);
      }
    }
    return types;
  }

  // 「ヒトコト解説」を生成：選んだ待ち牌が手牌の中でどう組まれるか
  function describeWait(classification, waitTile, pair) {
    var c = classification;
    if (c.type === '単騎') {
      return '雀頭としての単騎待ち（' + waitTile + waitTile + ' になる）';
    }
    if (c.type === 'シャボ') {
      return '暗刻にくっつくシャボ／暗刻待ち（' + waitTile + waitTile + ' の対子が ' +
             waitTile + waitTile + waitTile + ' の暗刻に。雀頭は ' + pair + pair + '）';
    }
    if (c.waitMeld) {
      var t = c.waitMeld.tiles;
      if (c.type === 'カンチャン') {
        return 'カンチャン待ち（' + t[0] + t[2] + ' の間に ' + waitTile + ' が入って ' +
               t[0] + t[1] + t[2] + '）';
      }
      if (c.type === 'ペンチャン') {
        var others = t.filter(function (x) { return x !== waitTile; });
        return 'ペンチャン待ち（端の ' + others.join('') + ' に ' + waitTile + ' を加えて ' +
               t[0] + t[1] + t[2] + '）';
      }
      if (c.type === 'リャンメン') {
        var idxR = t.indexOf(waitTile);
        var others2 = idxR === 0 ? [t[1], t[2]] : [t[0], t[1]];
        var pairWaits = idxR === 0 ? [waitTile, waitTile + 3] : [waitTile - 3, waitTile];
        return 'リャンメン待ち（' + others2.join('') + ' が ' + pairWaits.join('-') +
               ' を待つうちの ' + waitTile + '）';
      }
    }
    return '分類できませんでした';
  }

  // split に対して algorithm.md のどのルールが適用できるかを判定
  // 返り値: [{ name: '糖質制限', desc: '...' }, ...]
  function describeRules(split) {
    var rules = [];

    // 糖質制限（algorithm.md ⑧）: 暗刻があれば「抜いて考える」
    var kotsus = split.melds.filter(function (m) { return m.type === 'kotsu'; });
    if (kotsus.length > 0) {
      var ktiles = kotsus.map(function (k) { return k.tiles.join(''); }).join(' / ');
      rules.push({
        name: '糖質制限（algorithm.md ⑧）',
        desc: '暗刻 ' + ktiles + ' を抜くと、残りの構造が見えやすい。連続形の少ない方の暗刻から抜くのが基本。',
      });
    }

    // 一盃口抜き（algorithm.md ① / FB法①）: 同じ順子が2つあれば一盃口
    var shuntsus = split.melds.filter(function (m) { return m.type === 'shuntsu'; });
    for (var i = 0; i < shuntsus.length; i++) {
      for (var j = i + 1; j < shuntsus.length; j++) {
        if (shuntsus[i].tiles[0] === shuntsus[j].tiles[0]) {
          rules.push({
            name: '一盃口抜き（algorithm.md ① / FB法①）',
            desc: '同じ順子が2つ（' + shuntsus[i].tiles.join('') + ' + ' +
                  shuntsus[j].tiles.join('') + '）あるので一盃口として抜くと、外側の核が見える。',
          });
          i = shuntsus.length;  // break outer
          break;
        }
      }
    }

    // 端の順子抜き（algorithm.md ② ③ / FB法②③）: 1始まり or 9終わりの順子
    var edges = shuntsus.filter(function (s) {
      return s.tiles[0] === 1 || s.tiles[2] === 9;
    });
    if (edges.length > 0) {
      var etiles = edges.map(function (e) { return e.tiles.join(''); }).join(' / ');
      rules.push({
        name: '端の順子抜き（algorithm.md ② ③ / FB法②③）',
        desc: '端の順子 ' + etiles + ' を抜く。端から順子を消去すると連続形の核（基本多面構成）が露出する。',
      });
    }

    return rules;
  }

  // splits の中から meld 構成が異なるものを最大 maxN 個返す
  function distinctSplits(splits, maxN) {
    var seen = {};
    var result = [];
    for (var i = 0; i < splits.length && result.length < maxN; i++) {
      var key = JSON.stringify(splits[i]);
      if (!seen[key]) {
        seen[key] = true;
        result.push(splits[i]);
      }
    }
    return result;
  }

  window.Chinitsu.decompose = {
    splitAll: splitAll,
    formatText: formatText,
    formatTilesHtml: formatTilesHtml,
    classifyWait: classifyWait,
    allWaitTypes: allWaitTypes,
    describeWait: describeWait,
    describeRules: describeRules,
    distinctSplits: distinctSplits,
  };
})();
