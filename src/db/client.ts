import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { runMigrations } from './migrations';

let databasePromise: Promise<SQLiteDatabase> | null = null;

export async function getDatabase() {
  if (!databasePromise) {
    databasePromise = (async () => {
      try {
        const db = await openDatabaseAsync('pineapple.db');
        await runMigrations(db);
        return db;
      } catch (error) {
        databasePromise = null;
        throw error;
      }
    })();
  }

  return databasePromise;
}
