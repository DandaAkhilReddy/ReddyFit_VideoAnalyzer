// A simple wrapper for IndexedDB
let db: IDBDatabase | null = null;

const DB_NAME = 'ReddyFitDB';
const DB_VERSION = 1;
const STORES = ['workoutPlans', 'generatedVideos'];

export const initDB = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (db) {
            return resolve();
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const tempDb = request.result;
            STORES.forEach(storeName => {
                if (!tempDb.objectStoreNames.contains(storeName)) {
                    tempDb.createObjectStore(storeName);
                }
            });
        };

        request.onsuccess = () => {
            db = request.result;
            resolve();
        };

        request.onerror = () => {
            console.error('Error initializing IndexedDB:', request.error);
            reject(request.error);
        };
    });
};

/**
 * Retrieves a value from a specified object store in IndexedDB.
 * @param storeName The name of the object store.
 * @param key The key of the item to retrieve.
 * @returns A promise that resolves with the value, or undefined if not found.
 */
export const get = <T>(storeName: string, key: IDBValidKey): Promise<T | undefined> => {
    return new Promise(async (resolve, reject) => {
        if (!db) {
            await initDB();
        }
        if (!db) return reject("Database not initialized.");

        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);

        request.onsuccess = () => {
            resolve(request.result as T | undefined);
        };

        request.onerror = () => {
            console.error(`Error getting item with key ${key} from ${storeName}:`, request.error);
            reject(request.error);
        };
    });
};

/**
 * Adds or updates a value in a specified object store in IndexedDB.
 * @param storeName The name of the object store.
 * @param key The key of the item to set.
 * @param value The value to store.
 * @returns A promise that resolves when the operation is complete.
 */
export const set = (storeName: string, key: IDBValidKey, value: any): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        if (!db) {
            await initDB();
        }
        if (!db) return reject("Database not initialized.");

        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(value, key);

        request.onsuccess = () => {
            resolve();
        };

        request.onerror = () => {
            console.error(`Error setting item with key ${key} in ${storeName}:`, request.error);
            reject(request.error);
        };
    });
};

/**
 * Clears all data from all object stores in the database.
 * @returns A promise that resolves when all stores have been cleared.
 */
export const clearAllData = (): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        if (!db) {
            await initDB();
        }
        if (!db) return reject("Database not initialized.");

        const transaction = db.transaction(STORES, 'readwrite');

        transaction.oncomplete = () => {
            resolve();
        };

        transaction.onerror = () => {
            console.error("Error clearing database:", transaction.error);
            reject(transaction.error);
        };

        STORES.forEach(storeName => {
            try {
                transaction.objectStore(storeName).clear();
            } catch (error) {
                console.error(`Failed to clear store ${storeName}:`, error);
                // Don't reject here, let the transaction try to complete.
            }
        });
    });
};