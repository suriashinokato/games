/* 詳細編集と簡易登録の共通保存。画像・見本はこの経路へ渡さない。 */
(function (root) {
  'use strict';
  function calculate(problem, shanten) {
    const total = problem.hand.length + problem.melds.reduce((sum, m) => sum + (['ankan', 'minkan', 'kakan'].includes(m.type) ? 3 : m.tiles.length), 0);
    let reason = problem.questionType === 'meld' ? 'meld_question' : total !== 14 ? 'tile_count_not_14' : !shanten ? 'shanten_lib_not_loaded' : '';
    if (!reason) {
      try { Object.assign(problem, shanten.calcAndAttach(problem)); return; }
      catch (e) { reason = 'calc_error: ' + e.message; }
    }
    problem.ukeireruMeta = { calcSkipped: true, calcSkipReason: reason, calcVersion: '1.0', calculatedAt: null };
  }
  async function save(problem, options) {
    calculate(problem, options.shanten);
    if (options.db && options.uid) {
      const ref = options.db.doc('users/' + options.uid + '/problems/' + problem.id);
      const orderRef = options.db.doc('users/' + options.uid + '/meta/problemOrder');
      // 問題と順番を一括確定。失敗を握り潰さず、同じIDで安全に再試行する。
      await options.db.runTransaction(async tx => {
        const doc = await tx.get(orderRef);
        const order = doc.exists ? [...(doc.data().order || [])] : [];
        tx.set(ref, problem);
        if (!order.includes(problem.id)) { order.push(problem.id); tx.set(orderRef, { order }); }
      });
    } else {
      const storage = options.storage;
      const beforeProblems = storage.getItem(options.problemKey), beforeOrder = storage.getItem(options.orderKey);
      const list = [...await options.loadProblems()];
      const index = list.findIndex(p => p.id === problem.id);
      if (index < 0) list.push(problem); else list[index] = problem;
      const order = JSON.parse(beforeOrder || '[]') || [];
      if (!order.includes(problem.id)) order.push(problem.id);
      try {
        storage.setItem(options.problemKey, JSON.stringify(list));
        storage.setItem(options.orderKey, JSON.stringify(order));
      } catch (e) {
        // 容量不足などで片方のみ書き込めた場合は元の状態へ戻す。
        if (beforeProblems === null) storage.removeItem(options.problemKey); else storage.setItem(options.problemKey, beforeProblems);
        if (beforeOrder === null) storage.removeItem(options.orderKey); else storage.setItem(options.orderKey, beforeOrder);
        throw e;
      }
    }
  }
  root.NankiruProblemStore = { calculate, save };
})(typeof window === 'undefined' ? globalThis : window);
