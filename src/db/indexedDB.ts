import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Todo } from '../state/todoReducer';

const DB_NAME = 'todo-app-db';
const STORE_NAME = 'todos';
const DB_VERSION = 1;

interface TodoDB extends DBSchema {
  todos: {
    key: string;
    value: Todo;
  };
}

let dbPromise: Promise<IDBPDatabase<TodoDB>> | null = null;

export const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<TodoDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      },
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
