import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'cafe_gestion.db');

let dbPromise: Promise<Database<sqlite3.Database, sqlite3.Statement>>;

async function getDbConnection() {
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });
  await db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA busy_timeout = 5000;
  `);
  return db;
}

if (process.env.NODE_ENV === 'development') {
  let globalWithDb = global as typeof globalThis & {
    _dbPromise?: Promise<Database<sqlite3.Database, sqlite3.Statement>>;
  };

  if (!globalWithDb._dbPromise) {
    globalWithDb._dbPromise = getDbConnection();
  }
  dbPromise = globalWithDb._dbPromise;
} else {
  dbPromise = getDbConnection();
}

export default dbPromise;
