/**
 * 매칭 풀 - Firebase 또는 localStorage
 * FIREBASE_ENABLED 이면 Firebase Realtime DB, 아니면 localStorage
 */
const STALE_MS = 5 * 60 * 1000;

const Pool = {
  _db: null,
  _matchedRef: null,
  _poolRef: null,

  init() {
    if (typeof FIREBASE_ENABLED !== 'undefined' && FIREBASE_ENABLED && typeof firebase !== 'undefined') {
      if (typeof firebaseConfig === 'undefined' || !firebaseConfig?.apiKey || firebaseConfig.apiKey.includes('YOUR_')) {
        console.warn('Firebase 설정을 완료해주세요. firebase-config.js');
        return false;
      }
    }
    if (typeof FIREBASE_ENABLED !== 'undefined' && FIREBASE_ENABLED && typeof firebase !== 'undefined') {
      try {
        firebase.initializeApp(firebaseConfig);
        this._db = firebase.database();
        this._poolRef = this._db.ref('matchPool');
        this._matchedRef = this._db.ref('matchedIds');
        return true;
      } catch (e) {
        console.warn('Firebase 초기화 실패:', e);
        return false;
      }
    }
    return false;
  },

  useFirebase() {
    if (!this._db && this.init()) return true;
    return !!this._db;
  },

  // ----- Firebase 구현 -----
  async addFirebase(entry) {
    await this._poolRef.child(entry.id).set(entry);
  },
  async removeFirebase(id) {
    await this._poolRef.child(id).remove();
  },
  async getPoolFirebase() {
    const snap = await this._poolRef.once('value');
    const val = snap.val() || {};
    const now = Date.now();
    return Object.entries(val)
      .map(([id, data]) => ({ id, ...data }))
      .filter(p => now - (p.timestamp || 0) < STALE_MS);
  },
  findMatchFirebase(oppositeSide, model, excludeId) {
    return this.getPoolFirebase().then(pool =>
      pool.find(p => p.id !== excludeId && p.side === oppositeSide && p.model === model) || null
    );
  },
  async addMatchedIdFirebase(id) {
    await this._matchedRef.child(id).set(true);
  },
  async removeMatchedIdFirebase(id) {
    await this._matchedRef.child(id).remove();
  },
  listenMatchedFirebase(id, callback) {
    const ref = this._matchedRef.child(id);
    const handler = snap => { if (snap.val()) callback(); };
    ref.on('value', handler);
    return () => ref.off('value', handler);
  },
  listenPoolFirebase(callback) {
    return this._poolRef.on('value', () => {
      this.getPoolFirebase().then(callback);
    });
  },
  offPoolFirebase() {
    this._poolRef.off();
  },

  // ----- localStorage 구현 -----
  getPoolLocal() {
    try {
      const raw = localStorage.getItem('airpods-match-pool');
      const pool = raw ? JSON.parse(raw) : [];
      const now = Date.now();
      return pool.filter(p => now - (p.timestamp || 0) < STALE_MS);
    } catch {
      return [];
    }
  },
  setPoolLocal(pool) {
    localStorage.setItem('airpods-match-pool', JSON.stringify(pool));
  },
  getMatchedIdsLocal() {
    try {
      const raw = localStorage.getItem('airpods-matched-ids');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },
  addMatchedIdLocal(id) {
    const ids = this.getMatchedIdsLocal();
    ids.push(id);
    localStorage.setItem('airpods-matched-ids', JSON.stringify(ids));
  },
  removeMatchedIdLocal(id) {
    const ids = this.getMatchedIdsLocal().filter(i => i !== id);
    localStorage.setItem('airpods-matched-ids', JSON.stringify(ids));
  },

  // ----- 통합 API -----
  async add(entry) {
    if (this.useFirebase()) {
      await this.addFirebase(entry);
    } else {
      const pool = this.getPoolLocal();
      pool.push(entry);
      this.setPoolLocal(pool);
    }
  },
  async remove(id) {
    if (this.useFirebase()) {
      await this.removeFirebase(id);
    } else {
      const pool = this.getPoolLocal().filter(p => p.id !== id);
      this.setPoolLocal(pool);
    }
  },
  async findMatch(oppositeSide, model, excludeId) {
    if (this.useFirebase()) {
      return this.findMatchFirebase(oppositeSide, model, excludeId);
    }
    const pool = this.getPoolLocal();
    return pool.find(p => p.id !== excludeId && p.side === oppositeSide && p.model === model) || null;
  },
  async addMatchedId(id) {
    if (this.useFirebase()) {
      await this.addMatchedIdFirebase(id);
    } else {
      this.addMatchedIdLocal(id);
    }
  },
  async removeMatchedId(id) {
    if (this.useFirebase()) {
      await this.removeMatchedIdFirebase(id);
    } else {
      this.removeMatchedIdLocal(id);
    }
  },
  isMatched(id) {
    if (this.useFirebase()) return Promise.reject('use listenMatched');
    return this.getMatchedIdsLocal().includes(id);
  },
  listenMatched(id, callback) {
    if (this.useFirebase()) {
      return this.listenMatchedFirebase(id, callback);
    }
    const check = () => {
      if (this.getMatchedIdsLocal().includes(id)) {
        clearInterval(iv);
        callback();
      }
    };
    const iv = setInterval(check, 1500);
    return () => clearInterval(iv);
  },
};
