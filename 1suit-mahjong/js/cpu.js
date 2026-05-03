// cpu.js — CPU の打牌・リーチ・カン・ロン判断
//
// 段階 4: chooseDiscard のみ実装。
//   方針: 14 枚（手牌 13 + ツモ 1）から各候補を捨てた後の 13 枚で calcShanten を計算し、
//          最小シャンテン値になる候補を選ぶ。同点は端牌 (1, 9) 優先、それでも同点なら最初の候補。
// 段階 5・6 で shouldDeclareRiichi / shouldDeclareKan / shouldRon / shouldTsumo を追加する。

window.Bamboo = window.Bamboo || {};

(function () {
  var H = window.Bamboo.handEval;

  // 14 枚から「捨てる候補 (tile, source)」のリストを作る
  function buildDiscardCandidates(p) {
    var candidates = [];

    // 手牌の重複を除いて候補化（同じ値を捨てる効果は同じ）
    var seen = {};
    for (var i = 0; i < p.hand.length; i++) {
      var t = p.hand[i];
      if (seen[t]) continue;
      seen[t] = true;
      candidates.push({ tile: t, source: 'hand' });
    }

    // ツモ牌が手牌にない値ならツモ切り候補も追加
    if (p.drawn !== null && !seen[p.drawn]) {
      candidates.push({ tile: p.drawn, source: 'drawn' });
    } else if (p.drawn !== null) {
      // 手牌にも同じ値がある場合は「ツモ切り」として捨てるのが自然
      // （手牌から捨てる動作と結果は同値だが、ツモ切りに統一）
      candidates.push({ tile: p.drawn, source: 'drawn' });
    }

    return candidates;
  }

  // 14 枚 (手牌+ツモ) を 13 枚 counts 配列に変換（候補を 1 枚抜いた状態）
  function countsAfterDiscard(p, candidate) {
    var allHand = p.hand.slice();
    if (p.drawn !== null) allHand.push(p.drawn);
    var idx = allHand.indexOf(candidate.tile);
    allHand.splice(idx, 1); // 同じ値が複数あっても効果は同じなので最初の 1 枚を抜く
    return H.toCounts(allHand);
  }

  function isTerminal(t) { return t === 1 || t === 9; }

  // 候補の優先度比較。シャンテン昇順 → 端牌優先 → 元の順
  function pickBest(scored) {
    var best = scored[0];
    for (var i = 1; i < scored.length; i++) {
      var c = scored[i];
      if (c.shanten < best.shanten) {
        best = c;
      } else if (c.shanten === best.shanten) {
        // 端牌のほうが先なら入れ替え
        if (isTerminal(c.candidate.tile) && !isTerminal(best.candidate.tile)) {
          best = c;
        }
      }
    }
    return best;
  }

  function chooseDiscard(state, who) {
    var p = state[who];
    if (p.drawn === null) {
      throw new Error('chooseDiscard: ツモ牌がない (' + who + ')');
    }

    // リーチ後はツモ切り強制
    if (p.isRiichi) {
      return { tile: p.drawn, source: 'drawn' };
    }

    var candidates = buildDiscardCandidates(p);
    var scored = candidates.map(function (cand) {
      var counts = countsAfterDiscard(p, cand);
      return { candidate: cand, shanten: H.calcShanten(counts) };
    });

    var best = pickBest(scored);
    return best.candidate; // { tile, source }
  }

  // ---- 段階 5: 役ありなら必ずアガる方針 ----
  // tryTsumo / tryRon が null でなければ役成立 → 宣言する
  function shouldTsumo(state, who) {
    return window.Bamboo.game.tryTsumo(state, who) !== null;
  }
  function shouldRon(state, who) {
    return window.Bamboo.game.tryRon(state, who) !== null;
  }

  // ---- 段階 6: リーチ・暗槓 ----

  // テンパイ + リーチ未宣言 + 持ち点 1000 以上
  // canDeclareRiichi はノーテンでも true を返すので、テンパイ条件をここで明示する。
  function shouldDeclareRiichi(state, who) {
    return window.Bamboo.game.canDeclareRiichiTenpai(state, who);
  }

  // 4 枚揃った瞬間に宣言（簡略化: シャンテン悪化チェックなし）
  // リーチ後はそもそも canDeclareKan が空配列を返す
  function shouldDeclareKan(state, who) {
    var available = window.Bamboo.game.canDeclareKan(state, who);
    return available.length > 0 ? available[0] : null;
  }

  window.Bamboo.cpu = {
    chooseDiscard: chooseDiscard,
    shouldDeclareRiichi: shouldDeclareRiichi,
    shouldDeclareKan: shouldDeclareKan,
    shouldRon: shouldRon,
    shouldTsumo: shouldTsumo,
  };
})();
