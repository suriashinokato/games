// Firebase Auth (Google) + Firestore による登録問題の端末間同期
// localStorage を真実 (cache) として保ちつつ、ログイン中はクラウド側を権威に切り替える

(function () {
  'use strict';

  const T = window.TehaiTraining = window.TehaiTraining || {};

  // nankiru-app と同一の Firebase プロジェクトを再利用
  const firebaseConfig = {
    apiKey: 'AIzaSyDqgBfduxlc5i436Ex9cLml6eeVcx8NBbQ',
    authDomain: 'nanikiru-29855.firebaseapp.com',
    projectId: 'nanikiru-29855',
    storageBucket: 'nanikiru-29855.firebasestorage.app',
    messagingSenderId: '401045979406',
    appId: '1:401045979406:web:00345e7a4023108ed7975f',
  };

  const IS_LOCAL = location.protocol === 'file:';
  let auth = null;
  let db = null;
  let initialized = false;
  let currentUser = null;
  let unsubscribeSnap = null;
  // snapshot 反映中の write が cloud-sync 自身を再トリガーしないようにする
  let suppressPush = false;

  function $id(id) { return document.getElementById(id); }
  function setStatus(text) { const el = $id('auth-status'); if (el) el.textContent = text; }
  function showSignIn(b) { const el = $id('btn-signin'); if (el) el.style.display = b ? '' : 'none'; }
  function showSignOut(b) { const el = $id('btn-signout'); if (el) el.style.display = b ? '' : 'none'; }

  function initFirebase() {
    if (initialized) return true;
    if (typeof firebase === 'undefined') return false;
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    initialized = true;
    return true;
  }

  function userColRef() {
    if (!currentUser || !db) return null;
    return db.collection('users').doc(currentUser.uid).collection('tehaiProblems');
  }

  // Firestore は undefined を保存できないので除去
  function stripUndefined(obj) {
    const out = {};
    Object.keys(obj).forEach(k => {
      if (obj[k] !== undefined) out[k] = obj[k];
    });
    return out;
  }

  async function pushOne(problem) {
    const ref = userColRef();
    if (!ref) return;
    const data = stripUndefined(Object.assign({}, problem, {
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      deletedAt: null,
    }));
    try {
      await ref.doc(problem.id).set(data, { merge: true });
    } catch (e) {
      console.error('Firestore への保存に失敗:', e);
    }
  }

  async function pushDelete(id) {
    const ref = userColRef();
    if (!ref) return;
    try {
      await ref.doc(id).set({
        id: id,
        deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    } catch (e) {
      console.error('Firestore からの削除に失敗:', e);
    }
  }

  // クラウドの最新状態を localStorage に反映
  function applySnapshot(snap) {
    const visible = [];
    snap.forEach(doc => {
      const d = doc.data();
      if (!d || d.deletedAt || !d.id || !Array.isArray(d.hand)) return;
      const cleaned = Object.assign({}, d);
      delete cleaned.updatedAt;
      delete cleaned.deletedAt;
      visible.push(cleaned);
    });
    suppressPush = true;
    try { T.storage._replaceAll(visible); }
    finally { suppressPush = false; }
  }

  // 初回ログイン時の双方向マージ:
  //  - クラウドに無いローカル問題は push
  //  - 同一 ID で localStorage の _lastModified が新しければ上書き push
  //  - その他はクラウド優先 (続けて始まる onSnapshot で localStorage が上書きされる)
  async function initialMerge() {
    const ref = userColRef();
    if (!ref) return;
    const snap = await ref.get();
    const cloudMap = new Map();
    snap.forEach(d => cloudMap.set(d.id, d.data()));

    const tasks = [];
    for (const p of T.storage.getAll()) {
      const cloud = cloudMap.get(p.id);
      if (!cloud) {
        tasks.push(pushOne(p));
        continue;
      }
      const cloudMs = cloud.updatedAt && cloud.updatedAt.toMillis ? cloud.updatedAt.toMillis() : 0;
      const localMs = p._lastModified || 0;
      if (localMs > cloudMs) tasks.push(pushOne(p));
    }
    await Promise.all(tasks);
  }

  async function handleAuthChange(user) {
    if (unsubscribeSnap) { unsubscribeSnap(); unsubscribeSnap = null; }
    currentUser = user;

    if (!user) {
      setStatus('未ログイン (この端末のみで保存)');
      showSignIn(true);
      showSignOut(false);
      return;
    }

    const name = user.displayName || user.email || user.uid;
    setStatus('ログイン中: ' + name);
    showSignIn(false);
    showSignOut(true);

    try {
      await initialMerge();
      const ref = userColRef();
      unsubscribeSnap = ref.onSnapshot(applySnapshot, e => {
        console.error('Firestore snapshot エラー:', e);
        setStatus('同期エラー: ' + e.message);
      });
    } catch (e) {
      console.error('クラウド同期の初期化に失敗:', e);
      setStatus('同期エラー: ' + e.message);
    }
  }

  function signIn() {
    if (IS_LOCAL) {
      alert('ローカルファイル(file://)では Google ログインを使用できません。\nhttp/https で開くか、ローカルモードのままお使いください。');
      return;
    }
    if (!initFirebase()) return;
    auth.signInWithPopup(new firebase.auth.GoogleAuthProvider())
      .catch(e => alert('ログインに失敗しました: ' + e.message));
  }

  function signOut() {
    if (auth) auth.signOut();
  }

  function queuePush(problem) {
    if (suppressPush || !currentUser) return;
    pushOne(problem);
  }

  function queueDelete(id) {
    if (suppressPush || !currentUser) return;
    pushDelete(id);
  }

  T.cloudSync = {
    signIn: signIn,
    signOut: signOut,
    queuePush: queuePush,
    queueDelete: queueDelete,
    isSignedIn: function () { return !!currentUser; },
  };

  function boot() {
    const inBtn = $id('btn-signin');
    const outBtn = $id('btn-signout');
    if (inBtn) inBtn.addEventListener('click', signIn);
    if (outBtn) outBtn.addEventListener('click', signOut);

    if (IS_LOCAL) {
      setStatus('ローカルモード (この端末のみで保存)');
      showSignIn(false);
      showSignOut(false);
      return;
    }
    if (!initFirebase()) {
      setStatus('クラウド同期は無効 (Firebase 未読み込み)');
      showSignIn(false);
      showSignOut(false);
      return;
    }
    setStatus('認証確認中…');
    auth.onAuthStateChanged(handleAuthChange);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
