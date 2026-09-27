/* AIを使わない牌姿解析・画像照合。DOMに依存しない処理もここにまとめる。 */
(function (root) {
  'use strict';
  const codes = ['m', 'p', 's'].flatMap(s => '1234506789'.split('').map(n => n + s))
    .concat('1234567'.split('').map(n => n + 'z'));
  function parse(text) {
    const value = text.normalize('NFKC').toLowerCase().replace(/\s/g, '');
    if (!value || !/^(?:[0-9]+[mpsz])+$/.test(value)) throw new Error('数字＋m/p/s/zで入力してください（例: 234567m345p6678s5p）。');
    const hand = [];
    for (const group of value.matchAll(/([0-9]+)([mpsz])/g)) {
      for (const n of group[1]) {
        const code = n + group[2];
        if (!codes.includes(code)) throw new Error('使えない牌です: ' + code);
        hand.push(code);
      }
    }
    return hand;
  }
  function validateTiles(tiles) {
    const counts = {}, reds = {};
    for (const code of tiles) {
      if (!codes.includes(code)) throw new Error('牌が未確定、または不正です: ' + code);
      const normal = code[0] === '0' ? '5' + code[1] : code;
      counts[normal] = (counts[normal] || 0) + 1;
      if (counts[normal] > 4) throw new Error(normal + ' は赤牌を含めて4枚までです。');
      if (code[0] === '0' && (reds[code] = (reds[code] || 0) + 1) > 1) throw new Error(code + ' は1枚までです。');
    }
  }
  function validate(hand, answers) {
    if (hand.length !== 14) throw new Error('手牌は14枚必要です（現在 ' + hand.length + ' 枚）。');
    validateTiles(hand);
    if (!answers.length) throw new Error('正解牌を1種類以上選択してください。');
    if (answers.some(c => !hand.includes(c))) throw new Error('正解牌は手牌から選択してください。');
  }
  function canvas(w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
  }
  function crop(image, rect) {
    const c = canvas(Math.max(1, Math.round(rect.w)), Math.max(1, Math.round(rect.h)));
    c.getContext('2d').drawImage(image, rect.x, rect.y, rect.w, rect.h, 0, 0, c.width, c.height);
    return c;
  }
  // 外枠を除外し、絵柄の外接矩形を正規化。白は輪郭のない独立した特徴になる。
  function feature(image) {
    const c = canvas(48, 64), ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 48, 64); ctx.drawImage(image, 0, 0, 48, 64);
    const data = ctx.getImageData(0, 0, 48, 64).data;
    let left = 47, top = 63, right = 0, bottom = 0, ink = 0;
    for (let y = 5; y < 59; y++) for (let x = 5; x < 43; x++) {
      const i = (y * 48 + x) * 4;
      if (Math.min(data[i], data[i + 1], data[i + 2]) < 170) {
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y); ink++;
      }
    }
    const n = canvas(24, 32), nc = n.getContext('2d', { willReadFrequently: true });
    nc.fillStyle = '#fff'; nc.fillRect(0, 0, 24, 32);
    if (ink > 3) nc.drawImage(c, left, top, right - left + 1, bottom - top + 1, 2, 2, 20, 28);
    const d = nc.getImageData(0, 0, 24, 32).data, values = [];
    for (let i = 0; i < d.length; i += 4) {
      values.push(1 - (d[i] + d[i + 1] + d[i + 2]) / 765);
      values.push(Math.max(0, d[i] - (d[i + 1] + d[i + 2]) / 2) / 255);
      values.push(Math.max(0, d[i + 1] - (d[i] + d[i + 2]) / 2) / 255);
    }
    return values;
  }
  function rank(input, templates) {
    const best = new Map();
    for (const t of templates) {
      let score = 0;
      for (let i = 0; i < input.length; i++) {
        score += (input[i] - t.feature[i]) ** 2;
        // 濃淡の隣接差分も比較し、輪郭を評価する。
        if (i >= 3 && i % 3 === 0) score += 0.3 * ((input[i] - input[i - 3]) - (t.feature[i] - t.feature[i - 3])) ** 2;
      }
      score /= input.length;
      if (!best.has(t.code) || score < best.get(t.code)) best.set(t.code, score);
    }
    return [...best].map(([code, score]) => ({ code, score })).sort((a, b) => a.score - b.score);
  }
  // 垂直方向の一様さを使って牌の境界候補を探索。最終確認・調整は利用者が行う。
  function boundaries(image) {
    const ctx = image.getContext('2d', { willReadFrequently: true });
    const { width: w, height: h } = image, d = ctx.getImageData(0, 0, w, h).data;
    const scores = [], edgeStrength = [0];
    for (let x = 0; x < w; x++) {
      let sum = 0, sq = 0, count = 0;
      for (let y = Math.floor(h * .15); y < h * .85; y++) {
        const p = (y * w + x) * 4, v = (d[p] + d[p + 1] + d[p + 2]) / 765;
        sum += v; sq += v * v; count++;
      }
      scores.push(Math.max(0, sq / count - (sum / count) ** 2));
      if (x) {
        const differences = [];
        for (let y = Math.floor(h * .12); y < h * .88; y++) {
          const p = (y * w + x) * 4;
          differences.push(Math.abs((d[p] + d[p + 1] + d[p + 2]) - (d[p - 4] + d[p - 3] + d[p - 2])) / 765);
        }
        differences.sort((a, b) => a - b);
        edgeStrength[x] = differences[Math.floor(differences.length / 2)];
      }
    }
    // 先頭13枚の等間隔な外枠を探索。最後のツモ牌との空白で全境界がずれるのを防ぐ。
    let pitch = w / 14, pitchScore = 0;
    function peak(x) { return Math.max(...[-2, -1, 0, 1, 2].map(dx => edgeStrength[Math.round(x) + dx] || 0)); }
    for (let p = w / 15.5; p <= w / 14 + 1; p += .15) {
      let score = 0;
      for (let i = 1; i <= 12; i++) score += peak(p * i);
      if (score > pitchScore) { pitchScore = score; pitch = p; }
    }
    const hasFrames = pitchScore > .5;
    const step = hasFrames ? pitch : w / 14, result = [0];
    for (let i = 1; i < 14; i++) {
      const center = hasFrames && i === 13 ? (step * 13 + w - step) / 2 : step * i;
      let best = Math.round(center), cost = Infinity;
      const radius = hasFrames ? 3 : step * .22;
      for (let x = Math.max(1, Math.round(center - radius)); x < Math.min(w - 1, center + radius); x++) {
        const v = hasFrames && i < 13 ? -edgeStrength[x] + .002 * Math.abs(x - center) : scores[x] + .025 * ((x - center) / step) ** 2;
        if (v < cost) { cost = v; best = x; }
      }
      result.push(best);
    }
    result.push(w); return result;
  }
  root.NankiruQuickCore = { codes, parse, validate, validateTiles, crop, feature, rank, boundaries };
})(typeof window === 'undefined' ? globalThis : window);
