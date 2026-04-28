// ===== 麻雀「何切る問題」用: シャンテン数・受け入れ枚数の自動計算ロジック =====
// 設計方針: 速度より可読性を優先した素朴な再帰実装。
// 公開API: window.NankiruShanten (末尾参照)

(function () {
  'use strict';

  // ============================================================
  // 牌コードと34要素配列のインデックスの対応表
  //   0〜8   = 1m〜9m
  //   9〜17  = 1p〜9p
  //   18〜26 = 1s〜9s
  //   27〜33 = 1z〜7z (東 南 西 北 白 發 中)
  // ============================================================

  const SUIT_OFFSET = { m: 0, p: 9, s: 18, z: 27 };

  const INDEX_TO_TILE = (function () {
    const arr = [];
    for (const suit of ['m', 'p', 's']) {
      for (let n = 1; n <= 9; n++) arr.push(n + suit);
    }
    for (let n = 1; n <= 7; n++) arr.push(n + 'z');
    return arr; // 長さ34
  })();

  // 牌コード → インデックス。赤5(0m/0p/0s) は通常5(5m/5p/5s) と同じインデックスに集約
  function tileToIndex(code) {
    const num = parseInt(code[0], 10);
    const suit = code[1];
    const normNum = (num === 0 ? 5 : num);
    return SUIT_OFFSET[suit] + (normNum - 1);
  }

  // 牌コード配列 → 34要素 Int8Array
  function tilesToCounts(tiles) {
    const counts = new Int8Array(34);
    for (const t of tiles) counts[tileToIndex(t)]++;
    return counts;
  }

  // 2つの牌コードが同種か判定 (赤5と通常5を同一視)
  function sameTile(a, b) {
    return tileToIndex(a) === tileToIndex(b);
  }

  // 数牌インデックス i (0〜26) の所属色の範囲を返す
  function suitRange(i) {
    const start = Math.floor(i / 9) * 9;
    return { start, end: start + 9 };
  }

  // ============================================================
  // 上下反転 (1⇔9, 2⇔8, 3⇔7, 4⇔6。5・赤5・字牌は不変)
  // ============================================================

  const DIGIT_MIRROR = {
    '0': '0', '1': '9', '2': '8', '3': '7', '4': '6',
    '5': '5', '6': '4', '7': '3', '8': '2', '9': '1'
  };

  function mirrorTile(code) {
    if (!code) return code;
    if (code[1] === 'z') return code;
    return DIGIT_MIRROR[code[0]] + code[1];
  }

  // ドラ表示牌 → ドラ本体 (循環)
  //   数牌:   1m→2m, 2m→3m, ..., 8m→9m, 9m→1m
  //   風牌:   東→南→西→北→東 (1z→2z→3z→4z→1z)
  //   三元牌: 白→發→中→白    (5z→6z→7z→5z)
  function doraFromIndicator(indicator) {
    if (!indicator) return indicator;
    const num = parseInt(indicator[0], 10);
    const suit = indicator[1];
    if (suit === 'z') {
      if (num >= 1 && num <= 4) return ((num % 4) + 1) + 'z';
      if (num >= 5 && num <= 7) return (((num - 5 + 1) % 3) + 5) + 'z';
      return indicator;
    }
    const normNum = (num === 0 ? 5 : num); // 赤5 は 5 として扱う
    const next = (normNum === 9 ? 1 : normNum + 1);
    return next + suit;
  }

  // ドラ表示牌の反転: ドラ本体を反転し、その1つ前の牌を新しい表示牌とする
  // (字牌は不変なので indicator のまま返す)
  function mirrorDoraIndicator(indicator) {
    if (!indicator) return indicator;
    if (indicator[1] === 'z') return indicator;
    const dora = doraFromIndicator(indicator);
    const mirroredDora = mirrorTile(dora);
    const d = parseInt(mirroredDora[0], 10);
    const newIndicatorDigit = (d === 1 ? 9 : d - 1);
    return newIndicatorDigit + mirroredDora[1];
  }

  // ============================================================
  // 標準形シャンテン (4面子1雀頭) の計算
  //   1) 雀頭候補(34種+雀頭なし) を順に仮置きする
  //   2) 残った牌について searchBestBlocks で最大の (面子, 搭子) を再帰探索
  //   3) シャンテン式に投入し、全パターンの最小値を返す
  // ============================================================

  // 残った牌から最大の {melds, partials} を見つける再帰
  // 「最初の余ってる牌」について 刻子/順子/対子/搭子(連番)/搭子(嵌張)/捨てる を試す
  // 引数 startIdx により「i より前の牌へ戻らない」順序探索になり、対称性の重複を抑える
  function searchBestBlocks(counts, startIdx) {
    let i = startIdx;
    while (i < 34 && counts[i] === 0) i++;
    if (i >= 34) return { melds: 0, partials: 0 };

    let best = null;

    // 刻子
    if (counts[i] >= 3) {
      counts[i] -= 3;
      const r = searchBestBlocks(counts, i);
      counts[i] += 3;
      best = takeBetter(best, { melds: r.melds + 1, partials: r.partials });
    }

    // 順子 (数牌のみ、色境界内)
    if (i < 27) {
      const { end } = suitRange(i);
      if (i + 2 < end && counts[i + 1] > 0 && counts[i + 2] > 0) {
        counts[i]--; counts[i + 1]--; counts[i + 2]--;
        const r = searchBestBlocks(counts, i);
        counts[i]++; counts[i + 1]++; counts[i + 2]++;
        best = takeBetter(best, { melds: r.melds + 1, partials: r.partials });
      }
    }

    // 対子 (字牌でも可)
    if (counts[i] >= 2) {
      counts[i] -= 2;
      const r = searchBestBlocks(counts, i);
      counts[i] += 2;
      best = takeBetter(best, { melds: r.melds, partials: r.partials + 1 });
    }

    // 搭子 (数牌のみ、色境界内)
    if (i < 27) {
      const { end } = suitRange(i);
      // 連番 (例: 23)
      if (i + 1 < end && counts[i + 1] > 0) {
        counts[i]--; counts[i + 1]--;
        const r = searchBestBlocks(counts, i);
        counts[i]++; counts[i + 1]++;
        best = takeBetter(best, { melds: r.melds, partials: r.partials + 1 });
      }
      // 嵌張 (例: 24)
      if (i + 2 < end && counts[i + 2] > 0) {
        counts[i]--; counts[i + 2]--;
        const r = searchBestBlocks(counts, i);
        counts[i]++; counts[i + 2]++;
        best = takeBetter(best, { melds: r.melds, partials: r.partials + 1 });
      }
    }

    // 捨てる (孤立牌として何のブロックにも組み込まない)
    counts[i]--;
    const r = searchBestBlocks(counts, i);
    counts[i]++;
    best = takeBetter(best, r);

    return best;
  }

  // melds 優先、次に partials の多い方を採用
  // (理論的に「面子1個 ⇔ 搭子1個＋孤立牌1枚」は等価変換できるため、melds 最大優先で正しい)
  function takeBetter(a, b) {
    if (a === null) return b;
    if (b.melds > a.melds) return b;
    if (b.melds === a.melds && b.partials > a.partials) return b;
    return a;
  }

  // 標準形シャンテン式
  // requiredMelds = 4 - 副露面子数 (= 手牌から作るべき面子数)
  // 採用面子+搭子の合計は最大4個 (副露面子も含めて4面子1雀頭が完成形)
  function computeStandardShanten(totalMelds, partials, requiredMelds, hasPair) {
    const cappedMelds = Math.min(totalMelds, 4);
    const remainingSlots = 4 - cappedMelds;
    const usedPartials = Math.min(partials, remainingSlots);
    return 8 - 2 * cappedMelds - usedPartials - (hasPair ? 1 : 0);
  }

  function countStandardShanten(counts, fixedMelds) {
    const requiredMelds = 4 - fixedMelds;
    let best = 8;

    // (a) 雀頭ありパターン: 雀頭を仮置きして残りを探索
    for (let i = 0; i < 34; i++) {
      if (counts[i] >= 2) {
        counts[i] -= 2;
        const r = searchBestBlocks(counts, 0);
        counts[i] += 2;
        const shanten = computeStandardShanten(fixedMelds + r.melds, r.partials, requiredMelds, true);
        if (shanten < best) best = shanten;
      }
    }

    // (b) 雀頭なしパターン
    const r0 = searchBestBlocks(counts, 0);
    const shanten0 = computeStandardShanten(fixedMelds + r0.melds, r0.partials, requiredMelds, false);
    if (shanten0 < best) best = shanten0;

    return best;
  }

  // ============================================================
  // 七対子 / 国士無双 のシャンテン
  // (副露ありの場合は対象外なので呼び出し側でスキップする)
  // ============================================================

  function countChiitoiShanten(counts) {
    let pairs = 0;
    let kinds = 0;
    for (let i = 0; i < 34; i++) {
      if (counts[i] >= 1) kinds++;
      if (counts[i] >= 2) pairs++;
    }
    // 7対子完成には7種類必要。種類数が7未満ならその分シャンテンが悪化する
    let shanten = 6 - Math.min(pairs, 7);
    if (kinds < 7) shanten += (7 - kinds);
    return shanten;
  }

  // 么九牌(端牌+字牌)13種のインデックス
  const TERMINAL_INDICES = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];

  function countKokushiShanten(counts) {
    let kinds = 0;
    let hasPair = false;
    for (const i of TERMINAL_INDICES) {
      if (counts[i] >= 1) kinds++;
      if (counts[i] >= 2) hasPair = true;
    }
    return 13 - kinds - (hasPair ? 1 : 0);
  }

  // ============================================================
  // 統合シャンテン: 標準形・七対子・国士の最小値
  // ============================================================

  function countShanten(hand, melds) {
    const fixedMelds = (melds || []).length;
    const counts = tilesToCounts(hand);
    const standard = countStandardShanten(counts, fixedMelds);
    if (fixedMelds === 0) {
      const chiitoi = countChiitoiShanten(counts);
      const kokushi = countKokushiShanten(counts);
      return Math.min(standard, chiitoi, kokushi);
    }
    return standard;
  }

  // ============================================================
  // 受け入れ計算
  //   34種の牌それぞれを1枚加えてシャンテンが減るかチェックし、
  //   減るならその牌の場の残り枚数を計算して結果に追加する
  // ============================================================

  function countSameTileIn(tiles, target) {
    let n = 0;
    for (const t of tiles) {
      if (sameTile(t, target)) n++;
    }
    return n;
  }

  // 残り枚数 = 4 − 自手 − 副露 − ドラ表示牌 − 槓ドラ表示牌
  function remainingTiles(tile, hand, melds, dora, kanDora) {
    let used = 0;
    used += countSameTileIn(hand, tile);
    for (const m of (melds || [])) used += countSameTileIn(m.tiles, tile);
    used += countSameTileIn(dora || [], tile);
    used += countSameTileIn(kanDora || [], tile);
    return 4 - used;
  }

  // 13枚の手牌からの受け入れ計算 (テンパイ判定や単純なテストで使うシンプル版)
  function countAcceptance(hand, melds, dora, kanDora) {
    const baseShanten = countShanten(hand, melds);
    const result = [];

    for (let i = 0; i < 34; i++) {
      const tile = INDEX_TO_TILE[i];
      const newHand = hand.concat([tile]);
      const newShanten = countShanten(newHand, melds);
      if (newShanten < baseShanten) {
        const remaining = remainingTiles(tile, hand, melds, dora, kanDora);
        if (remaining > 0) result.push({ tile, count: remaining });
      }
    }
    return result;
  }

  // 14枚の手牌からすべての「シャンテンが最も進む捨て牌候補」を列挙し、
  // 各候補について受け入れ枚数(合計＋有効牌の内訳)を計算する。
  //   handBefore: 14枚の手牌コード配列
  //   返り値: [{discard, shantenAfter, tiles, totalCount}, ...]
  //     discard      : 捨て牌コード
  //     shantenAfter : 捨てた後のシャンテン値
  //     tiles        : [{tile, count}, ...] (有効牌の内訳)
  //     totalCount   : tiles の count 合計
  // 結果は totalCount 降順 (同点なら捨て牌のインデックス昇順) でソートして返す
  function calcAllDiscardOptions(handBefore, melds, dora, kanDora) {
    const meldsList = melds || [];

    // ユニークな捨て牌候補を列挙 (赤5は通常5として集約)
    const seen = new Set();
    const discardCandidates = [];
    for (const t of handBefore) {
      const idx = tileToIndex(t);
      if (!seen.has(idx)) {
        seen.add(idx);
        discardCandidates.push(t);
      }
    }

    // まず各候補のシャンテン値を計算し、最良 (最小) シャンテンを見つける
    let bestShanten = Infinity;
    const shantenByDiscard = [];
    for (const d of discardCandidates) {
      const handAfter = removeOneTile(handBefore, d);
      const sh = countShanten(handAfter, meldsList);
      shantenByDiscard.push({ discard: d, shantenAfter: sh });
      if (sh < bestShanten) bestShanten = sh;
    }

    // 最良シャンテンを達成する候補だけを対象に受け入れを計算
    const result = [];
    for (const cand of shantenByDiscard) {
      if (cand.shantenAfter !== bestShanten) continue;
      const tiles = countAcceptanceForDiscard(handBefore, cand.discard, meldsList, dora, kanDora);
      const totalCount = tiles.reduce((sum, e) => sum + e.count, 0);
      result.push({
        discard: cand.discard,
        shantenAfter: cand.shantenAfter,
        tiles: tiles,
        totalCount: totalCount,
      });
    }

    // totalCount 降順、同点なら捨て牌コードの昇順
    result.sort((a, b) => {
      if (b.totalCount !== a.totalCount) return b.totalCount - a.totalCount;
      return tileToIndex(a.discard) - tileToIndex(b.discard);
    });
    return result;
  }

  // 「打牌前14枚」と「捨てる牌」を渡し、捨て牌後の受け入れ枚数を計算する。
  //   - シャンテン判定は 捨てた後の13枚 + 来た牌 で行う
  //   - 残り枚数の自手分は 打牌前の14枚 を使う (捨て牌も場に見えている扱い)
  function countAcceptanceForDiscard(handBefore, discardTile, melds, dora, kanDora) {
    const handAfter = removeOneTile(handBefore, discardTile);
    const baseShanten = countShanten(handAfter, melds);
    const result = [];

    for (let i = 0; i < 34; i++) {
      const tile = INDEX_TO_TILE[i];
      const newHand = handAfter.concat([tile]);
      const newShanten = countShanten(newHand, melds);
      if (newShanten < baseShanten) {
        const remaining = remainingTiles(tile, handBefore, melds, dora, kanDora);
        if (remaining > 0) result.push({ tile, count: remaining });
      }
    }
    return result;
  }

  // 牌コードリストから target と同種の牌を1枚だけ取り除いたコピーを返す
  function removeOneTile(tiles, target) {
    const result = tiles.slice();
    const idx = result.findIndex(t => sameTile(t, target));
    if (idx >= 0) result.splice(idx, 1);
    return result;
  }

  // ============================================================
  // 反転計算
  //   盤面 (手牌・副露・ドラ・槓ドラ) を反転コピーし、
  //   反転後の盤面で受け入れ計算をやり直す
  // ============================================================

  function mirrorBoard(board) {
    return {
      hand: (board.hand || []).map(mirrorTile),
      melds: (board.melds || []).map(m => ({
        ...m,
        tiles: m.tiles.map(mirrorTile),
      })),
      dora: (board.dora || []).map(mirrorDoraIndicator),
      kanDora: (board.kanDora || []).map(mirrorDoraIndicator),
    };
  }

  // problem オブジェクト (打牌前14枚) から自動計算結果のサブセットを返す
  // saveProblem() 側で Object.assign(problem, result) してDB保存する
  //
  // ukeireruAuto    : 「シャンテンが最も進む捨て牌」の各候補ごとに合計受け入れ枚数を持つ配列
  //                   [{discard, shantenAfter, tiles, totalCount}, ...]
  // shantenAuto     : 最良の捨て牌を選んだ後のシャンテン値
  // ukeireruMirror  : 上記の反転盤面版
  function calcAndAttach(problem) {
    const handBefore = problem.hand;
    const meldsList = problem.melds || [];
    const baseDora = problem.dora || [];
    const baseKanDora = problem.kanDora || [];

    const mirrored = mirrorBoard({
      hand: handBefore,
      melds: meldsList,
      dora: baseDora,
      kanDora: baseKanDora,
    });

    const optionsAuto = calcAllDiscardOptions(handBefore, meldsList, baseDora, baseKanDora);
    const optionsMirror = calcAllDiscardOptions(mirrored.hand, mirrored.melds, mirrored.dora, mirrored.kanDora);

    return {
      ukeireruAuto: optionsAuto,
      ukeireruMirror: optionsMirror,
      shantenAuto: optionsAuto.length ? optionsAuto[0].shantenAfter : null,
      shantenAutoMirror: optionsMirror.length ? optionsMirror[0].shantenAfter : null,
      ukeireruMeta: {
        calcVersion: '2.0',
        calculatedAt: new Date().toISOString(),
        calcSkipped: false,
        calcSkipReason: null,
      },
    };
  }

  // ============================================================
  // 公開API
  // ============================================================

  window.NankiruShanten = {
    // 主要関数
    countShanten: countShanten,
    countAcceptance: countAcceptance,
    countAcceptanceForDiscard: countAcceptanceForDiscard,
    calcAllDiscardOptions: calcAllDiscardOptions,
    calcAndAttach: calcAndAttach,

    // 反転関連
    mirrorTile: mirrorTile,
    doraFromIndicator: doraFromIndicator,
    mirrorDoraIndicator: mirrorDoraIndicator,
    mirrorBoard: mirrorBoard,

    // 内部関数 (テスト用に公開)
    tilesToCounts: tilesToCounts,
    tileToIndex: tileToIndex,
    sameTile: sameTile,
    removeOneTile: removeOneTile,
    countStandardShanten: countStandardShanten,
    countChiitoiShanten: countChiitoiShanten,
    countKokushiShanten: countKokushiShanten,
    remainingTiles: remainingTiles,
    INDEX_TO_TILE: INDEX_TO_TILE,
  };
})();
