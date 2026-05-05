// localStorage 読み書きの薄いラッパ
// キー: tehai-training:problems  → ユーザー登録問題の配列
//      tehai-training:settings  → 出題設定 (出題元など)

(function () {
  'use strict';

  const KEY_PROBLEMS = 'tehai-training:problems';
  const KEY_SETTINGS = 'tehai-training:settings';
  const DEFAULT_SETTINGS = { source: 'random' };

  function getAll() {
    try {
      const raw = localStorage.getItem(KEY_PROBLEMS);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      console.error('登録問題の読み込みに失敗:', e);
      return [];
    }
  }

  function saveAll(arr) {
    try {
      localStorage.setItem(KEY_PROBLEMS, JSON.stringify(arr));
    } catch (e) {
      console.error('登録問題の保存に失敗:', e);
    }
  }

  function upsert(problem) {
    const all = getAll();
    const idx = all.findIndex(p => p.id === problem.id);
    if (idx >= 0) all[idx] = problem;
    else all.push(problem);
    saveAll(all);
  }

  function remove(id) {
    saveAll(getAll().filter(p => p.id !== id));
  }

  function getById(id) {
    return getAll().find(p => p.id === id) || null;
  }

  function byMode(mode) {
    return getAll().filter(p => p.mode === mode);
  }

  function newId() {
    return 'user-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  }

  function getSettings() {
    try {
      const raw = localStorage.getItem(KEY_SETTINGS);
      if (!raw) return Object.assign({}, DEFAULT_SETTINGS);
      const parsed = JSON.parse(raw) || {};
      return Object.assign({}, DEFAULT_SETTINGS, parsed);
    } catch (e) {
      return Object.assign({}, DEFAULT_SETTINGS);
    }
  }

  function saveSettings(partial) {
    const merged = Object.assign(getSettings(), partial);
    try {
      localStorage.setItem(KEY_SETTINGS, JSON.stringify(merged));
    } catch (e) {
      console.error('設定の保存に失敗:', e);
    }
  }

  window.TehaiTraining = window.TehaiTraining || {};
  window.TehaiTraining.storage = {
    getAll: getAll,
    upsert: upsert,
    remove: remove,
    getById: getById,
    byMode: byMode,
    newId: newId,
    getSettings: getSettings,
    saveSettings: saveSettings,
  };
})();
