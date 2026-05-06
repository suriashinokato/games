// bookmark.js — localStorage によるブックマーク管理
//
// 公開API:
//   load()                       … 保存済みブックマーク配列を返す
//   save(list)                   … 配列を上書き保存
//   add(entry)                   … 1件追加して保存
//   remove(id)                   … bookmark id で削除
//   findByProblemId(problemId)   … 指定問題のブックマーク（あれば）
//
// 保存形式:
//   localStorage キー: 'chinitsu-bookmarks'
//   値: JSON 配列。各要素は
//       { id, problemId, shape, suit, savedAt, lastResult? }

window.Chinitsu = window.Chinitsu || {};

(function () {
  var STORAGE_KEY = 'chinitsu-bookmarks';

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('bookmark load error:', e);
      return [];
    }
  }

  function save(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error('bookmark save error:', e);
    }
  }

  function add(entry) {
    var list = load();
    list.push(entry);
    save(list);
    return entry;
  }

  function remove(id) {
    var list = load().filter(function (e) { return e.id !== id; });
    save(list);
  }

  function findByProblemId(problemId) {
    var list = load();
    for (var i = 0; i < list.length; i++) {
      if (list[i].problemId === problemId) return list[i];
    }
    return null;
  }

  window.Chinitsu.bookmark = {
    load: load,
    save: save,
    add: add,
    remove: remove,
    findByProblemId: findByProblemId,
  };
})();
