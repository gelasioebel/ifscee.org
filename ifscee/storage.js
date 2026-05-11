(function () {
    const DB_NAME = 'ifscee-db';
    const DB_VERSION = 1;
    const STORE_DRAFT = 'currentDraft';
    const STORE_FILES = 'savedFiles';
    const DRAFT_KEY = 'default';

    let dbPromise = null;

    function openDB() {
        if (dbPromise) return dbPromise;
        dbPromise = new Promise((resolve, reject) => {
            if (typeof indexedDB === 'undefined') {
                reject(new Error('IndexedDB not available'));
                return;
            }
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_DRAFT)) {
                    db.createObjectStore(STORE_DRAFT, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(STORE_FILES)) {
                    const store = db.createObjectStore(STORE_FILES, { keyPath: 'name' });
                    store.createIndex('byUpdatedAt', 'updatedAt');
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
        return dbPromise;
    }

    function wrap(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async function withStore(storeName, mode, fn) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, mode);
            const store = tx.objectStore(storeName);
            let result;
            Promise.resolve(fn(store))
                .then((r) => { result = r; })
                .catch(reject);
            tx.oncomplete = () => resolve(result);
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
        });
    }

    async function getDraft() {
        return withStore(STORE_DRAFT, 'readonly', (s) => wrap(s.get(DRAFT_KEY)));
    }

    async function setDraft(code) {
        return withStore(STORE_DRAFT, 'readwrite', (s) =>
            wrap(s.put({ id: DRAFT_KEY, code: String(code), updatedAt: Date.now() }))
        );
    }

    async function listFiles() {
        const all = await withStore(STORE_FILES, 'readonly', (s) => wrap(s.getAll()));
        return (all || []).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    }

    async function loadFile(name) {
        return withStore(STORE_FILES, 'readonly', (s) => wrap(s.get(name)));
    }

    async function saveFile(name, code) {
        return withStore(STORE_FILES, 'readwrite', async (s) => {
            const existing = await wrap(s.get(name));
            const now = Date.now();
            return wrap(s.put({
                name: String(name),
                code: String(code),
                createdAt: existing && existing.createdAt ? existing.createdAt : now,
                updatedAt: now
            }));
        });
    }

    async function deleteFile(name) {
        return withStore(STORE_FILES, 'readwrite', (s) => wrap(s.delete(name)));
    }

    window.IFSCeeStorage = {
        openDB,
        getDraft,
        setDraft,
        listFiles,
        loadFile,
        saveFile,
        deleteFile
    };
})();
