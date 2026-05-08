import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const dataDir = path.join(process.cwd(), 'data')

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const dbPath = process.env.DB_PATH || path.join(dataDir, 'journals.db')

let db
try {
  db = new Database(dbPath)
  db.exec(`
    CREATE TABLE IF NOT EXISTS trading_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      broker TEXT,
      type TEXT DEFAULT 'REAL',
      initialCapital REAL DEFAULT 0,
      riskPercent REAL DEFAULT 1,
      traderName TEXT,
      traderEmail TEXT,
      traderAddress TEXT,
      accountNumber TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS trading_setups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      accountId INTEGER,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT DEFAULT '#1D9E75',
      direction TEXT DEFAULT 'BOTH',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS trading_operations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      accountId INTEGER,
      setupId INTEGER,
      date TEXT NOT NULL,
      symbol TEXT NOT NULL,
      side TEXT NOT NULL,
      sesion TEXT,
      pnl REAL DEFAULT 0,
      riesgoAmount REAL DEFAULT 0,
      comision REAL DEFAULT 0,
      resultR REAL DEFAULT 0,
      resultType TEXT DEFAULT 'BREAK_EVEN',
      notes TEXT,
      imageUrl TEXT,
      contratos INTEGER DEFAULT 1,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS trading_commissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      accountId INTEGER,
      operationId INTEGER,
      date TEXT,
      amount REAL DEFAULT 0,
      description TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS trading_captures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operationId INTEGER,
      url TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS user_instruments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER DEFAULT 1,
      category TEXT NOT NULL,
      ticker TEXT NOT NULL,
      name TEXT,
      active INTEGER DEFAULT 1,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(userId, ticker)
    );
  `)
} catch (error) {
  console.error('Database error:', error.message)
  db = null
}

export default db