// Storage adapter layer.
//
// Finance records live in IndexedDB, scoped per signed-in user. The rest of the
// app talks to this adapter only, so a hosted backend can replace it later.

const NS = 'pft';

function key(userId, collection) {
  return `${NS}:${userId}:${collection}`;
}

export class StorageAdapter {
  async list(_collection) { throw new Error('not implemented'); }
  async write(_collection, _records) { throw new Error('not implemented'); }
  async getMeta(_name) { throw new Error('not implemented'); }
  async setMeta(_name, _value) { throw new Error('not implemented'); }
  async clearAll() { throw new Error('not implemented'); }
}

export class LocalStorageAdapter extends StorageAdapter {
  constructor(userId) {
    super();
    this.userId = userId;
  }

  async list(collection) {
    try {
      const raw = localStorage.getItem(key(this.userId, collection));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  async write(collection, records) {
    localStorage.setItem(key(this.userId, collection), JSON.stringify(records));
    return records;
  }

  async getMeta(name) {
    try {
      const raw = localStorage.getItem(key(this.userId, `meta:${name}`));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  async setMeta(name, value) {
    localStorage.setItem(key(this.userId, `meta:${name}`), JSON.stringify(value));
    return value;
  }

  async clearAll() {
    ['transactions', 'budgets', 'goals', 'recurring', 'meta:dismissedAlerts']
      .forEach(c => localStorage.removeItem(key(this.userId, c)));
  }
}

export class IndexedDbStorageAdapter extends StorageAdapter {
  constructor(userId) {
    super();
    this.userId = userId;
    this.dbPromise = openDatabase();
    this.migrationPromise = this.migrateFromLocalStorage();
  }

  async list(collection) {
    await this.migrationPromise;
    const record = await this.getRecord(collection);
    return Array.isArray(record?.value) ? record.value : [];
  }

  async write(collection, records) {
    await this.migrationPromise;
    await this.putRecord(collection, records);
    return records;
  }

  async getMeta(name) {
    await this.migrationPromise;
    const record = await this.getRecord(`meta:${name}`);
    return record ? record.value : null;
  }

  async setMeta(name, value) {
    await this.migrationPromise;
    await this.putRecord(`meta:${name}`, value);
    return value;
  }

  async clearAll() {
    await this.migrationPromise;
    const db = await this.dbPromise;
    const tx = db.transaction('collections', 'readwrite');
    const store = tx.objectStore('collections');
    await requestToPromise(store.delete(IDBKeyRange.bound(`${NS}:${this.userId}:`, `${NS}:${this.userId}:\uffff`)));
    await new LocalStorageAdapter(this.userId).clearAll();
  }

  async getRecord(collection) {
    const db = await this.dbPromise;
    return requestToPromise(db.transaction('collections', 'readonly').objectStore('collections').get(key(this.userId, collection)));
  }

  async putRecord(collection, value) {
    const db = await this.dbPromise;
    const record = { id: key(this.userId, collection), userId: this.userId, collection, value, updatedAt: new Date().toISOString() };
    await requestToPromise(db.transaction('collections', 'readwrite').objectStore('collections').put(record));
  }

  async migrateFromLocalStorage() {
    const db = await this.dbPromise;
    const markerKey = key(this.userId, 'meta:indexedDbMigrated');
    const marker = await requestToPromise(db.transaction('collections', 'readonly').objectStore('collections').get(markerKey));
    if (marker) return;

    const legacy = new LocalStorageAdapter(this.userId);
    for (const collection of ['transactions', 'budgets', 'goals', 'recurring']) {
      const records = await legacy.list(collection);
      if (records.length) await this.putRecord(collection, records);
    }
    const dismissed = await legacy.getMeta('dismissedAlerts');
    if (dismissed) await this.putRecord('meta:dismissedAlerts', dismissed);
    await this.putRecord('meta:indexedDbMigrated', true);
  }
}

export function createStorage(userId) {
  if ('indexedDB' in window) return new IndexedDbStorageAdapter(userId);
  return new LocalStorageAdapter(userId);
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('rupeeflow', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('collections')) {
        const store = db.createObjectStore('collections', { keyPath: 'id' });
        store.createIndex('userId', 'userId', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
