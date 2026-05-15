// ランダム手牌生成
// 純粋ランダム引きだとシャンテン分布が高い側に偏るため、
// 目標シャンテンを均等に選んでから構築的に手牌を作る

(function () {
  'use strict';

  const T = window.TehaiTraining;
  if (!T || !T.tiles || !T.shanten) {
    console.error('tiles.js / shanten-bridge.js より後に読み込んでください');
    return;
  }
  const NS = window.NankiruShanten;
  if (!NS) {
    console.error('nankiru-shanten.js が読み込まれていません');
    return;
  }

  const TILE_CODES = T.tiles.tileCodes(); // 34種
  const INDEX_TO_TILE = NS.INDEX_TO_TILE;

  // 山牌 (各牌4枚×34種 = 136枚) を生成してシャッフルした配列を返す
  function buildShuffledWall() {
    const wall = [];
    for (const t of TILE_CODES) {
      for (let i = 0; i < 4; i++) wall.push(t);
    }
    // Fisher-Yates
    for (let i = wall.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [wall[i], wall[j]] = [wall[j], wall[i]];
    }
    return wall;
  }

  // 13枚または14枚をランダムに引く
  function drawRandomHand(size) {
    const wall = buildShuffledWall();
    return wall.slice(0, size);
  }

  // ============ 構築的生成のための小道具 ============

  // 順子 (3連の数牌) を1組追加。成功すれば true、失敗すれば false
  function tryAddChow(used, tiles) {
    for (let attempt = 0; attempt < 50; attempt++) {
      const suit = ['m', 'p', 's'][Math.floor(Math.random() * 3)];
      const start = Math.floor(Math.random() * 7) + 1; // 1〜7
      const codes = [start + suit, (start + 1) + suit, (start + 2) + suit];
      const idx = codes.map(c => NS.tileToIndex(c));
      if (idx.every(i => used[i] < 4)) {
        idx.forEach(i => used[i]++);
        tiles.push(...codes);
        return true;
      }
    }
    return false;
  }

  // 刻子 (同じ牌3枚) を1組追加
  function tryAddPung(used, tiles) {
    for (let attempt = 0; attempt < 50; attempt++) {
      const ti = Math.floor(Math.random() * 34);
      if (used[ti] + 3 <= 4) {
        used[ti] += 3;
        const code = INDEX_TO_TILE[ti];
        tiles.push(code, code, code);
        return true;
      }
    }
    return false;
  }

  // 雀頭 (同じ牌2枚) を1組追加
  function tryAddPair(used, tiles) {
    for (let attempt = 0; attempt < 50; attempt++) {
      const ti = Math.floor(Math.random() * 34);
      if (used[ti] + 2 <= 4) {
        used[ti] += 2;
        const code = INDEX_TO_TILE[ti];
        tiles.push(code, code);
        return true;
      }
    }
    return false;
  }

  // アガリ形 (4面子1雀頭=14枚) を構築。失敗すれば null
  function buildCompleteHand() {
    for (let attempt = 0; attempt < 30; attempt++) {
      const used = new Int8Array(34);
      const tiles = [];
      let ok = true;
      // 4面子: 順子優先 (字牌だけの手は作りにくい)
      for (let m = 0; m < 4 && ok; m++) {
        const preferChow = Math.random() < 0.75;
        if (preferChow) {
          ok = tryAddChow(used, tiles) || tryAddPung(used, tiles);
        } else {
          ok = tryAddPung(used, tiles) || tryAddChow(used, tiles);
        }
      }
      if (!ok) continue;
      if (!tryAddPair(used, tiles)) continue;
      if (tiles.length === 14) return tiles;
    }
    return null;
  }

  // 手牌の1枚を別の牌にランダムに置換 (4枚使い切っていない牌に)
  function swapOneTile(hand) {
    const newHand = hand.slice();
    const swapIdx = Math.floor(Math.random() * newHand.length);
    const counts = NS.tilesToCounts(newHand);
    counts[NS.tileToIndex(newHand[swapIdx])]--;
    for (let attempt = 0; attempt < 50; attempt++) {
      const ti = Math.floor(Math.random() * 34);
      const candidate = INDEX_TO_TILE[ti];
      if (counts[ti] < 4 && candidate !== newHand[swapIdx]) {
        newHand[swapIdx] = candidate;
        return newHand;
      }
    }
    return newHand;
  }

  // 構築的に「目標シャンテンの手牌」を作る (ハズレることもあるので呼び出し側で検証)
  function tryBuildHandAt(targetShanten) {
    const complete = buildCompleteHand();
    if (!complete) return null;
    // 1枚抜く → 必ずテンパイ
    const removeIdx = Math.floor(Math.random() * 14);
    let hand = complete.slice(0, removeIdx).concat(complete.slice(removeIdx + 1));
    // 目標シャンテンに応じてさらにランダム置換
    for (let i = 0; i < targetShanten; i++) {
      hand = swapOneTile(hand);
    }
    return hand;
  }

  // mode2 (シャンテン判定): 0/1/2シャンテンの分布が均等になるよう生成
  function generateForShantenMode() {
    const target = Math.floor(Math.random() * 3); // 0, 1, 2 を均等に
    // 構築 → 検証 を繰り返す
    for (let attempt = 0; attempt < 80; attempt++) {
      const hand = tryBuildHandAt(target);
      if (hand && T.shanten.shantenCount(hand) === target) {
        return T.tiles.sortTiles(hand);
      }
    }
    // フォールバック: 純粋ランダムで target シャンテンを探す
    for (let i = 0; i < 200; i++) {
      const hand = drawRandomHand(13);
      if (T.shanten.shantenCount(hand) === target) {
        return T.tiles.sortTiles(hand);
      }
    }
    // 最終フォールバック: 0〜2 のいずれかでも返す
    for (let i = 0; i < 100; i++) {
      const hand = drawRandomHand(13);
      const s = T.shanten.shantenCount(hand);
      if (s >= 0 && s <= 2) return T.tiles.sortTiles(hand);
    }
    return T.tiles.sortTiles(drawRandomHand(13));
  }

  // 制約 predicate を満たすまで再試行する汎用ジェネレータ (mode1/mode3 用)
  function generateUntil(handSize, predicate, maxAttempts) {
    const limit = maxAttempts || 200;
    for (let i = 0; i < limit; i++) {
      const hand = drawRandomHand(handSize);
      if (predicate(hand)) return hand;
    }
    return drawRandomHand(handSize);
  }

  // mode1 (受け入れ種類): shanten が 0〜2 かつ受け入れ種類が 1〜8 の手牌
  // ただし以下の「簡単すぎるが頻出する」構造は除外する:
  //   (1) 4対子+5孤立牌 (七対子の受け入れしか存在しない)
  //   (2) 1面子+3ターツ(両面/カンチャン)+1雀頭+2孤立牌 の2シャンテン (順子手の典型形)
  function generateForUkeireMode() {
    const hand = generateUntil(13, (h) => {
      const s = T.shanten.shantenCount(h);
      if (s < 0 || s > 2) return false;
      const types = T.shanten.ukeireTypes(h);
      if (types.length < 1 || types.length > 8) return false;
      if (isTrivialUkeireShape(h)) return false;
      return true;
    });
    return T.tiles.sortTiles(hand);
  }

  // 除外パターン (1): 4対子 + 5孤立牌の13枚で、七対子の受け入れしか存在しない形
  // (標準形シャンテンが七対子シャンテンより悪い場合、受け入れは七対子方向のみ)
  function isFourPairChiitoiOnly(counts) {
    let pairs = 0, singles = 0;
    for (let i = 0; i < 34; i++) {
      if (counts[i] === 2) pairs++;
      else if (counts[i] === 1) singles++;
      else if (counts[i] >= 3) return false;
    }
    if (pairs !== 4 || singles !== 5) return false;
    return NS.countChiitoiShanten(counts) < NS.countStandardShanten(counts, 0);
  }

  // 除外パターン (2): 1面子 + 3ターツ(両面/カンチャン) + 1雀頭 + 2孤立牌 の標準2シャンテン
  function isEasyTwoShantenStandard(counts) {
    if (NS.countStandardShanten(counts, 0) !== 2) return false;
    const c = new Int8Array(counts);
    for (let i = 0; i < 34; i++) {
      // 刻子を面子として取り出す
      if (c[i] >= 3) {
        c[i] -= 3;
        if (tryHeadAndThreeTatsus(c)) return true;
        c[i] += 3;
      }
      // 順子を面子として取り出す (数牌のみ、開始ランク1〜7)
      if (i < 27 && (i % 9) <= 6 && c[i] >= 1 && c[i + 1] >= 1 && c[i + 2] >= 1) {
        c[i]--; c[i + 1]--; c[i + 2]--;
        if (tryHeadAndThreeTatsus(c)) return true;
        c[i]++; c[i + 1]++; c[i + 2]++;
      }
    }
    return false;
  }

  function tryHeadAndThreeTatsus(counts) {
    for (let h = 0; h < 34; h++) {
      if (counts[h] >= 2) {
        counts[h] -= 2;
        if (findTatsusRecursive(counts, 3, 2)) {
          counts[h] += 2;
          return true;
        }
        counts[h] += 2;
      }
    }
    return false;
  }

  // 残り牌から「両面/カンチャンのタツ」を neededTatsu 個と、孤立牌 isolatedLeft 枚だけ取り出せるか
  function findTatsusRecursive(counts, neededTatsu, isolatedLeft) {
    if (neededTatsu === 0) {
      let total = 0;
      for (let i = 0; i < 34; i++) {
        if (counts[i] >= 2) return false;
        total += counts[i];
      }
      return total === isolatedLeft;
    }
    let start = -1;
    for (let i = 0; i < 34; i++) {
      if (counts[i] > 0) { start = i; break; }
    }
    if (start === -1) return false;
    const suit = Math.floor(start / 9);
    if (suit < 3) {
      const rank = (start % 9) + 1;
      // 両面: (start, start+1), 両端を埋められるランク 2〜7
      if (rank >= 2 && rank <= 7 && counts[start + 1] > 0) {
        counts[start]--; counts[start + 1]--;
        if (findTatsusRecursive(counts, neededTatsu - 1, isolatedLeft)) {
          counts[start]++; counts[start + 1]++;
          return true;
        }
        counts[start]++; counts[start + 1]++;
      }
      // カンチャン: (start, start+2)
      if (rank <= 7 && counts[start + 2] > 0) {
        counts[start]--; counts[start + 2]--;
        if (findTatsusRecursive(counts, neededTatsu - 1, isolatedLeft)) {
          counts[start]++; counts[start + 2]++;
          return true;
        }
        counts[start]++; counts[start + 2]++;
      }
    }
    // 孤立牌として置く (残り孤立枠を1つ消費)
    if (counts[start] === 1 && isolatedLeft > 0) {
      counts[start]--;
      if (findTatsusRecursive(counts, neededTatsu, isolatedLeft - 1)) {
        counts[start]++;
        return true;
      }
      counts[start]++;
    }
    return false;
  }

  function isTrivialUkeireShape(hand) {
    const counts = NS.tilesToCounts(hand);
    if (isFourPairChiitoiOnly(counts)) return true;
    if (isEasyTwoShantenStandard(counts)) return true;
    return false;
  }

  // 1 または 9 の数牌が孤立しているか (自身1枚のみ、かつ隣接±2 が0枚)
  function isIsolatedTerminal(tileCode, counts) {
    const suit = tileCode[1];
    if (suit !== 'm' && suit !== 'p' && suit !== 's') return false;
    const rank = parseInt(tileCode[0], 10);
    if (rank !== 1 && rank !== 9) return false;
    if (counts[NS.tileToIndex(tileCode)] !== 1) return false;
    const neighbors = rank === 1 ? [2, 3] : [7, 8];
    for (const n of neighbors) {
      if (counts[NS.tileToIndex(n + suit)] > 0) return false;
    }
    return true;
  }

  // 1 または 9 の数牌が単独で槓子 (4枚) になっているか (隣接±2 が0枚)
  function hasIsolatedTerminalKan(counts) {
    for (const suit of ['m', 'p', 's']) {
      for (const rank of [1, 9]) {
        const idx = NS.tileToIndex(rank + suit);
        if (counts[idx] !== 4) continue;
        const neighbors = rank === 1 ? [2, 3] : [7, 8];
        const hasNeighbor = neighbors.some(n => counts[NS.tileToIndex(n + suit)] > 0);
        if (!hasNeighbor) return true;
      }
    }
    return false;
  }

  // 9枚 counts がちょうど n 個の面子に分解できるか (再帰)
  function canFormNMentsu(counts, n) {
    if (n === 0) {
      for (let i = 0; i < 34; i++) if (counts[i] !== 0) return false;
      return true;
    }
    let start = -1;
    for (let i = 0; i < 34; i++) {
      if (counts[i] > 0) { start = i; break; }
    }
    if (start === -1) return false;
    if (counts[start] >= 3) {
      counts[start] -= 3;
      if (canFormNMentsu(counts, n - 1)) {
        counts[start] += 3;
        return true;
      }
      counts[start] += 3;
    }
    if (start < 27 && (start % 9) <= 6 && counts[start + 1] > 0 && counts[start + 2] > 0) {
      counts[start]--; counts[start + 1]--; counts[start + 2]--;
      if (canFormNMentsu(counts, n - 1)) {
        counts[start]++; counts[start + 1]++; counts[start + 2]++;
        return true;
      }
      counts[start]++; counts[start + 1]++; counts[start + 2]++;
    }
    return false;
  }

  // 11枚 counts が「3面子+1雀頭」に分解できるか
  function isElevenComplete(counts) {
    let total = 0;
    for (let i = 0; i < 34; i++) total += counts[i];
    if (total !== 11) return false;
    const c = new Int8Array(counts);
    for (let p = 0; p < 34; p++) {
      if (c[p] < 2) continue;
      c[p] -= 2;
      if (canFormNMentsu(c, 3)) return true;
      c[p] += 2;
    }
    return false;
  }

  // 「3面子+1雀頭(11枚) + 同色 (X, X+3, X+6) 3枚」の形か
  // (X+1, X+2 の中央を切ると両カンチャン化する「147/258/369」典型形)
  function hasSujiTrioWithCompleteRest(counts) {
    const c = new Int8Array(counts);
    for (let suit = 0; suit < 3; suit++) {
      for (let x = 0; x < 3; x++) {
        const i1 = suit * 9 + x;
        const i2 = suit * 9 + x + 3;
        const i3 = suit * 9 + x + 6;
        if (c[i1] < 1 || c[i2] < 1 || c[i3] < 1) continue;
        c[i1]--; c[i2]--; c[i3]--;
        const ok = isElevenComplete(c);
        c[i1]++; c[i2]++; c[i3]++;
        if (ok) return true;
      }
    }
    return false;
  }

  // 14枚手牌が mode3 の出題条件を満たすか判定
  //   - 最良打牌と最悪打牌の枚数差が 4 以上 (採点紛糾を避ける)
  //   - 最良打牌に字牌の孤立牌が含まれない (簡単すぎるので除外)
  //   - 最良打牌に 1/9 の孤立牌が含まれない (簡単すぎるので除外)
  //   - 字牌を4枚持つ手牌は除外 (出題として不自然)
  //   - 同点最良打牌が 5 種類以上ある手牌は除外 (全部当てるのが現実的でない)
  //   - 2シャンテン手で最良と次善の枚数差が 1 枚しかない手牌は除外 (実戦的に同価値)
  //   - 他の13枚と異なる色の数牌が1枚だけ・孤立しているケースは除外 (簡単すぎる)
  //   - 「3面子+雀頭+147/258/369同色3枚」の典型形は除外 (5切りが自明)
  function passesDiscardFilters(hand, targetShanten) {
    const all = T.shanten.allDiscardOptions(hand);
    if (all.length < 2) return false;
    const best = all[0].totalCount;
    const worst = all[all.length - 1].totalCount;
    if (best - worst < 4) return false;

    const counts = NS.tilesToCounts(hand);
    for (let n = 1; n <= 7; n++) {
      if (counts[NS.tileToIndex(n + 'z')] === 4) return false;
    }
    if (hasIsolatedTerminalKan(counts)) return false;
    const bestDiscards = all.filter(o => o.totalCount === best);
    if (bestDiscards.length >= 5) return false;
    for (const opt of bestDiscards) {
      if (opt.discard[1] === 'z' && counts[NS.tileToIndex(opt.discard)] === 1) {
        return false;
      }
      if (isIsolatedTerminal(opt.discard, counts)) {
        return false;
      }
    }

    // 2シャンテン手で最良と次善の枚数差が1枚しかない問題は除外
    // (どちらを切っても実戦的に同価値なので訓練価値が低い)
    if (targetShanten === 2) {
      const second = all.find(o => o.totalCount < best);
      if (second && best - second.totalCount === 1) return false;
    }

    // 他の13枚と異なる色の数牌が1枚だけ・孤立しているケースを除外
    // (例: 萬子13枚 + 五索1枚 → 索の5を切るのが明らかすぎる)
    for (const suit of ['m', 'p', 's']) {
      const inSuit = hand.filter(t => t[1] === suit);
      if (inSuit.length !== 1) continue;
      const otherSuitsHaveNumeral = ['m', 'p', 's']
        .filter(s => s !== suit)
        .some(s => hand.some(t => t[1] === s));
      if (!otherSuitsHaveNumeral) continue;
      const tile = inSuit[0];
      const rank = parseInt(tile[0], 10);
      const neighbors = [rank - 2, rank - 1, rank + 1, rank + 2].filter(n => n >= 1 && n <= 9);
      const hasNeighbor = neighbors.some(n => counts[NS.tileToIndex(n + suit)] > 0);
      if (!hasNeighbor) return false;
    }

    // 「11枚が3面子+雀頭で完成」+「残り3枚が同色147/258/369」の典型形を除外
    // (中央の5を切れば残り両端が両カンチャン化するのが自明で、訓練価値が低い)
    if (hasSujiTrioWithCompleteRest(counts)) return false;

    return true;
  }

  // 14枚アガリ形 → ランダム置換 で目標シャンテンの14枚を構築
  // 経験則: 完全な14枚から swap N+1 回で 14枚N シャンテンに近づく
  function tryBuildDiscardHandAt(targetShanten) {
    const complete = buildCompleteHand(); // 14枚 shanten -1
    if (!complete) return null;
    let hand = complete.slice();
    const swapCount = targetShanten + 1;
    for (let i = 0; i < swapCount; i++) {
      hand = swapOneTile(hand);
    }
    return hand;
  }

  // mode3 用の目標シャンテンを重み付きで選ぶ
  // 1シャンテン 70%、テンパイ 15%、2シャンテン 15%
  function pickDiscardTargetShanten() {
    const r = Math.random();
    if (r < 0.70) return 1;
    if (r < 0.85) return 0;
    return 2;
  }

  // mode3 (最大受け入れ打牌): 重み付き分布で14枚を生成
  function generateForDiscardMode() {
    const target = pickDiscardTargetShanten();

    // 構築 → シャンテン検証 → フィルタ判定 を繰り返す
    for (let attempt = 0; attempt < 150; attempt++) {
      const hand = tryBuildDiscardHandAt(target);
      if (!hand) continue;
      if (T.shanten.shantenCount(hand) !== target) continue;
      if (!passesDiscardFilters(hand, target)) continue;
      return T.tiles.sortTiles(hand);
    }

    // フォールバック1: 純粋ランダムで目標シャンテンを探す
    for (let i = 0; i < 200; i++) {
      const hand = drawRandomHand(14);
      if (T.shanten.shantenCount(hand) !== target) continue;
      if (!passesDiscardFilters(hand, target)) continue;
      return T.tiles.sortTiles(hand);
    }

    // フォールバック2: 0〜2 シャンテンのいずれかでフィルタを満たすもの
    for (let i = 0; i < 200; i++) {
      const hand = drawRandomHand(14);
      const s = T.shanten.shantenCount(hand);
      if (s < 0 || s > 2) continue;
      if (!passesDiscardFilters(hand, s)) continue;
      return T.tiles.sortTiles(hand);
    }

    return T.tiles.sortTiles(drawRandomHand(14));
  }

  // モード名から問題を生成 (Phase 1 では shanten のみ実用)
  function generateProblem(mode) {
    if (mode === 'shanten') {
      const hand = generateForShantenMode();
      return {
        id: 'auto-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        source: 'random',
        mode: 'shanten',
        hand: hand,
        shanten: T.shanten.shantenCount(hand),
      };
    }
    if (mode === 'ukeire') {
      const hand = generateForUkeireMode();
      return {
        id: 'auto-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        source: 'random',
        mode: 'ukeire',
        hand: hand,
        shanten: T.shanten.shantenCount(hand),
        ukeireTypes: T.shanten.ukeireTypes(hand),
      };
    }
    if (mode === 'discard') {
      const hand = generateForDiscardMode();
      return {
        id: 'auto-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        source: 'random',
        mode: 'discard',
        hand: hand,
        shanten: T.shanten.shantenCount(hand),
        bestDiscards: T.shanten.bestDiscards(hand),
        allDiscards: T.shanten.allDiscardOptions(hand),
      };
    }
    throw new Error('未知のモード: ' + mode);
  }

  window.TehaiTraining.randomHand = {
    generateProblem: generateProblem,
    drawRandomHand: drawRandomHand,
  };
})();
