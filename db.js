import Database from 'better-sqlite3'
import path from 'path'

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'journals.db')
const db = new Database(dbPath)

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
    accountId INTEGER REFERENCES trading_accounts(id),
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#1D9E75',
    direction TEXT DEFAULT 'BOTH',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS trading_operations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    accountId INTEGER REFERENCES trading_accounts(id),
    setupId INTEGER REFERENCES trading_setups(id),
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
    accountId INTEGER REFERENCES trading_accounts(id),
    operationId INTEGER REFERENCES trading_operations(id),
    date TEXT,
    amount REAL DEFAULT 0,
    description TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS trading_captures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operationId INTEGER REFERENCES trading_operations(id),
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


export default db