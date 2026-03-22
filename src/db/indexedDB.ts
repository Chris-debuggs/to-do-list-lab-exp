import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Todo } from '../state/todoReducer';

const DB_NAME = 'todo-app-db';
const STORE_NAME = 'todos';
const DB_VERSION = 2; // Incremented for V2 Migration

interface TodoDB extends DBSchema {
  todos: {
    key: string;
    value: Todo;
    indexes: { 'priority': string; 'createdAt': number };
  };
}

let dbPromise: Promise<IDBPDatabase<TodoDB>> | null = null;

export const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<TodoDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // Create store if it doesn't exist (V1)
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
        
        // V2 Migration: Add indices for structured querying 
        // (Embeddings don't need indices since we must perform O(N) cosine similarity scan)
        const store = transaction.objectStore(STORE_NAME);
        if (!store.indexNames.contains('priority')) {
          store.createIndex('priority', 'priority');
        }
        if (!store.indexNames.contains('createdAt')) {
          store.createIndex('createdAt', 'createdAt');
        }
      },
    }).catch(err => {
      console.error('Critical IndexedDB Initialization Error:', err);
      dbPromise = null;
      throw new Error(`IndexedDB failed to initialize: ${err.message}`);
    });
  }
  return dbPromise;
};

export const getTodosFromDB = async (): Promise<Todo[]> => {
  const db = await initDB();
  return db.getAll(STORE_NAME);
};

export const saveTodosToDB = async (todos: Todo[]): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  await store.clear();
  for (const todo of todos) {
    await store.put(todo);
  }
  await tx.done;
};
