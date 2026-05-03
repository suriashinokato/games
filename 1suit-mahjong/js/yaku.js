// yaku.js — 役判定
//
// suit に依存する判定は緑一色のみ。それ以外は数値配列だけで動く。
// 役満が成立したら最初の 1 個を採用し、通常役は集計しない（仕様: 複合役満なし）。
// 通常役は複数 split のうち翻数最大のものを高点法で採用。

window.Bamboo = window.Bamboo || {};

(function () {
  var H = window.Bamboo.handEval;

  // ------------------------------------------------------------------
  // ヘルパ
  // ------------------------------------------------------------------

  function countAnkan(melds) {
    var n = 0;
    for (var i = 0; i < melds.length; i++) {
      if (melds[i].type === 'ankan') n++;
    }
    return n;
  }

  // 暗刻数を返す（暗槓も加算）。
  // ロンの場合、アガリ牌で完成した刻子は「明刻」扱いになるためカウントから除外する。
  // ただし split.pair === agariTile（アガリ牌が雀頭で完成）の場合は、刻子はすべて手中で
  // 完成しており全て暗刻のまま（四暗刻単騎のケース）。
  function countAnko(split, melds, agariTile, isTsumo) {
    var n = countAnkan(melds);
    var agariInPair = (split.pair === agariTile);
    for (var i = 0; i < split.sets.length; i++) {
      var s = split.sets[i];
      if (s.type !== 'kotsu') continue;
      if (!isTsumo && !agariInPair && s.tile === agariTile) {
        continue;     // ロンで完成した刻子 → 明刻
      }
      n++;
    }
    return n;
  }

  function sumHan(yakuList) {
    var s = 0;
    for (var i = 0; i < yakuList.length; i++) s += yakuList[i].han;
    return s;
  }

  // ------------------------------------------------------------------
  // 個別役判定（split 依存）
  // ------------------------------------------------------------------

  // 平和: 全順子 + 雀頭が役牌でない (数牌のみなので常に true) + 待ちが両面 + メンゼン
  // 「両面待ち」の簡略判定:
  //   アガリ牌が含まれる順子で、アガリ牌が「順子の両端 (最小 or 最大)」かつ
  //   反対側へ伸ばす余地がある (=辺張ではない) なら両面とみなす。
  function isPinfu(split, agariTile, isMenzen) {
    if (!isMenzen) return false;
    for (var i = 0; i < split.sets.length; i++) {
      if (split.sets[i].type !== 'shuntsu') return false;
    }
    for (var j = 0; j < split.sets.length; j++) {
      var s = split.sets[j];
      var t = s.tile; // 順子の最小値 (t, t+1, t+2)
      if (t === agariTile) {
        // アガリ牌が順子の最小 → 待ちは t と t+3 の両端の場合に両面
        // t=1 だと辺張(123 で 3 待ち)になりやすいので除外
        if (t > 1) return true;
      } else if (t + 2 === agariTile) {
        // アガリ牌が順子の最大 → t-1 と t+2 の両面
        if (t + 2 < 9) return true;
      }
    }
    return false;
  }

  // 一盃口の組数を返す（0/1/2）。2 なら二盃口。
  function countIipeikouPairs(split) {
    var counts = {};
    for (var i = 0; i < split.sets.length; i++) {
      var s = split.sets[i];
      if (s.type !== 'shuntsu') continue;
      counts[s.tile] = (counts[s.tile] || 0) + 1;
    }
    var pairs = 0;
    for (var k in counts) {
      if (counts[k] >= 2) pairs++;
    }
    return pairs;
  }

  // 一気通貫: 1, 4, 7 始まりの順子をすべて含む
  function hasItsu(split) {
    var has1 = false, has4 = false, has7 = false;
    for (var i = 0; i < split.sets.length; i++) {
      var s = split.sets[i];
      if (s.type !== 'shuntsu') continue;
      if (s.tile === 1) has1 = true;
      else if (s.tile === 4) has4 = true;
      else if (s.tile === 7) has7 = true;
    }
    return has1 && has4 && has7;
  }

  // 対々和: 全部刻子 (暗槓含む)
  function isToitoi(split, melds) {
    for (var i = 0; i < split.sets.length; i++) {
      if (split.sets[i].type !== 'kotsu') return false;
    }
    return true;
  }

  // ------------------------------------------------------------------
  // 役満判定
  // ------------------------------------------------------------------

  // 緑一色: 14 枚すべてが {2, 3, 4, 6, 8} のみ
  function isRyuiisou(counts14) {
    var allowed = { 2: 1, 3: 1, 4: 1, 6: 1, 8: 1 };
    for (var n = 1; n <= 9; n++) {
      if (counts14[n] > 0 && !allowed[n]) return false;
    }
    return true;
  }

  // 役満を 1 個見つけたら返す。なければ null。
  function detectYakuman(args) {
    // 天和: 親が配牌+第1ツモでアガリ
    if (args.isFirstTurn && args.isTsumo && args.isDealer) {
      return { name: '天和', han: 13 };
    }
    // 地和: 子が第1ツモでアガリ
    if (args.isFirstTurn && args.isTsumo && !args.isDealer) {
      return { name: '地和', han: 13 };
    }
    // 人和: 子が親の最初の打牌でロン
    if (args.isFirstTurn && !args.isTsumo) {
      return { name: '人和', han: 13 };
    }
    // 緑一色 (索子局のみ)
    if (args.currentSuit === 'sou' && isRyuiisou(args.winningCounts)) {
      return { name: '緑一色', han: 13 };
    }
    // 純正九蓮宝燈
    if (H.isPureChuuren(args.winningCounts, args.agariTile)) {
      return { name: '純正九蓮宝燈', han: 13 };
    }
    // 九蓮宝燈
    if (H.isChuurenSplit(args.winningCounts)) {
      return { name: '九蓮宝燈', han: 13 };
    }
    // 四槓子
    if (countAnkan(args.melds) >= 4) {
      return { name: '四槓子', han: 13 };
    }
    // 四暗刻 (split 依存) — ロン時はアガリ牌で完成した刻子が明刻扱いになるので、
    //                       countAnko に agariTile / isTsumo を渡す。
    for (var i = 0; i < args.splits.length; i++) {
      if (countAnko(args.splits[i], args.melds, args.agariTile, args.isTsumo) >= 4) {
        return { name: '四暗刻', han: 13 };
      }
    }
    return null;
  }

  // ------------------------------------------------------------------
  // メイン
  // ------------------------------------------------------------------

  function detectYaku(args) {
    // 1) 役満チェック
    var yakuman = detectYakuman(args);
    if (yakuman) {
      return {
        yakuList: [yakuman],
        isYakuman: true,
        totalHan: 13,
      };
    }

    // 2) 通常役: 各 split で評価し、翻数最大の split を採用（高点法）
    var bestYaku = null;
    var bestHan = -1;

    var splits = args.splits;
    if (splits.length === 0) {
      // 通常 split が無い = 九蓮系のみ → 上の役満で捕捉済みのはず
      // 念のため空で返す
      return { yakuList: [], isYakuman: false, totalHan: 0 };
    }

    for (var i = 0; i < splits.length; i++) {
      var split = splits[i];
      var ys = [];

      if (isPinfu(split, args.agariTile, args.isMenzen)) {
        ys.push({ name: '平和', han: 1 });
      }
      var ipk = countIipeikouPairs(split);
      if (ipk >= 2 && args.isMenzen) {
        ys.push({ name: '二盃口', han: 3 });
      } else if (ipk === 1 && args.isMenzen) {
        ys.push({ name: '一盃口', han: 1 });
      }
      if (hasItsu(split)) {
        ys.push({ name: '一気通貫', han: 2 });
      }
      if (isToitoi(split, args.melds)) {
        ys.push({ name: '対々和', han: 2 });
      }
      var anko = countAnko(split, args.melds, args.agariTile, args.isTsumo);
      if (anko === 3) {
        ys.push({ name: '三暗刻', han: 2 });
      }
      var ankan = countAnkan(args.melds);
      if (ankan === 3) {
        ys.push({ name: '三槓子', han: 2 });
      }

      var han = sumHan(ys);
      if (han > bestHan) {
        bestHan = han;
        bestYaku = ys;
      }
    }

    if (!bestYaku) bestYaku = [];

    // 3) split 非依存の追加役を加算

    // 立直
    if (args.isRiichi) {
      bestYaku.push({ name: '立直', han: 1 });
    }
    // 一発: リーチ宣言の直後一巡以内のアガリ
    if (args.isRiichi && args.isIppatsuValid) {
      bestYaku.push({ name: '一発', han: 1 });
    }
    // 門前清自摸和: ツモ + メンゼン
    if (args.isTsumo && args.isMenzen) {
      bestYaku.push({ name: '門前清自摸和', han: 1 });
    }
    // 嶺上開花: 暗槓直後の嶺上ツモでアガリ
    if (args.isRinshan) {
      bestYaku.push({ name: '嶺上開花', han: 1 });
    }
    // 清一色: 数牌 1 種類しか使わないので必ず成立 (メンゼン 6 翻)
    bestYaku.push({ name: '清一色', han: 6 });

    return {
      yakuList: bestYaku,
      isYakuman: false,
      totalHan: sumHan(bestYaku),
    };
  }

  // ---- 公開 ----
  window.Bamboo.yaku = {
    detectYaku: detectYaku,
    isRyuiisou: isRyuiisou,
    isPinfu: isPinfu,
    countIipeikouPairs: countIipeikouPairs,
    hasItsu: hasItsu,
    isToitoi: isToitoi,
  };
})();
