(function (root) {
  'use strict';
  let connection;
  async function open() {
    if (!connection) connection = new Promise((resolve, reject) => {
      const request = indexedDB.open('nankiru_tile_samples', 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('sets', { keyPath: 'name' });
        request.result.createObjectStore('samples', { keyPath: 'id', autoIncrement: true });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('別のタブを閉じてから再度お試しください。'));
    });
    return connection;
  }
  async function run(store, mode, action) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, mode), request = action(tx.objectStore(store));
      tx.oncomplete = () => resolve(request && request.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('見本の保存が中断されました。'));
    });
  }
  const api = {
    sets: () => run('sets', 'readonly', s => s.getAll()),
    addSet: name => run('sets', 'readwrite', s => s.put({ name })),
    list: async name => (await run('samples', 'readonly', s => s.getAll())).filter(s => s.set === name),
    remove: id => run('samples', 'readwrite', s => s.delete(id)),
    async save(name, entries) {
      const existing = await api.list(name);
      await run('samples', 'readwrite', store => {
        for (const entry of entries) {
          if (!existing.some(s => s.code === entry.code && s.image === entry.image)) {
            store.add({ set: name, code: entry.code, image: entry.image });
            existing.push(entry);
          }
        }
      });
    }
  };
  root.NankiruQuickSamples = api;
})(window);
