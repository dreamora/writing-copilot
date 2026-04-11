import { Database } from 'bun:sqlite';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const DB_PATH = process.env.DB_PATH || './data/copilot.db';
const MIGRATIONS_DIR = './src/db/migrations';

// Ensure data dir exists
const dataDir = DB_PATH.split('/').slice(0, -1).join('/');
import { mkdirSync } from 'fs';
mkdirSync(dataDir, { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for concurrency
db.exec('PRAGMA journal_mode = WAL');

// Ensure migrations table exists
db.exec(`
  CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Get all migration files
const migrations = readdirSync(MIGRATIONS_DIR)
  .filter(f => f.endsWith('.sql'))
  .sort();

// Apply each migration
for (const migration of migrations) {
  const name = migration;
  const existing = db.query('SELECT id FROM migrations WHERE name = ?').get(name);

  if (!existing) {
    const sql = readFileSync(join(MIGRATIONS_DIR, migration), 'utf-8');
    console.log(`[migrate] Applying ${name}...`);
    
    try {
      // Execute full SQL as single transaction to avoid incomplete input errors
      db.exec(sql);
      db.exec('INSERT INTO migrations (name) VALUES (?)', [name]);
      console.log(`[migrate] ✓ ${name}`);
    } catch (err) {
      console.error(`[migrate] ✗ ${name}:`, err);
      process.exit(1);
    }
  } else {
    console.log(`[migrate] → ${name} (already applied)`);
  }
}

console.log('[migrate] Done. All migrations applied.');
db.close();
