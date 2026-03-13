import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { schema } from './migrations';

let databasePromise: Promise<SQLiteDatabase> | null = null;

export async function getDatabase() {
  if (!databasePromise) {
    databasePromise = (async () => {
      const db = await openDatabaseAsync('pineapple.db');
      await db.execAsync(schema);
      return db;
    })();
  }

  return databasePromise;
}
