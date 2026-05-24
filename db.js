import pkg from 'pg'
const { Pool } = pkg

const pool = new Pool({
  connectionString: process.env.APP_DATABASE_URL || process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trading_accounts (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        broker TEXT,
        type TEXT DEFAULT 'REAL',
        "initialCapital" REAL DEFAULT 0,
        "riskPercent" REAL DEFAULT 1,
        "traderName" TEXT,
        "traderEmail" TEXT,
        "traderAddress" TEXT,
        "accountNumber" TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS trading_setups (
        id SERIAL PRIMARY KEY,
        "accountId" INTEGER REFERENCES trading_accounts(id),
        name TEXT NOT NULL,
        description TEXT,
        color TEXT DEFAULT '#1D9E75',
        direction TEXT DEFAULT 'BOTH',
        "createdAt" TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS trading_operations (
        id SERIAL PRIMARY KEY,
        "accountId" INTEGER REFERENCES trading_accounts(id),
        "setupId" INTEGER REFERENCES trading_setups(id),
        date TEXT NOT NULL,
        symbol TEXT NOT NULL,
        side TEXT NOT NULL,
        sesion TEXT,
        pnl REAL DEFAULT 0,
        "riesgoAmount" REAL DEFAULT 0,
        comision REAL DEFAULT 0,
        "resultR" REAL DEFAULT 0,
        "resultType" TEXT DEFAULT 'BREAK_EVEN',
        notes TEXT,
        "imageUrl" TEXT,
        contratos INTEGER DEFAULT 1,
        "createdAt" TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS trading_commissions (
        id SERIAL PRIMARY KEY,
        "accountId" INTEGER REFERENCES trading_accounts(id),
        "operationId" INTEGER REFERENCES trading_operations(id),
        date TEXT,
        amount REAL DEFAULT 0,
        description TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS trading_captures (
        id SERIAL PRIMARY KEY,
        "operationId" INTEGER REFERENCES trading_operations(id),
        url TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS user_instruments (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER DEFAULT 1,
        category TEXT NOT NULL,
        ticker TEXT NOT NULL,
        name TEXT,
        active INTEGER DEFAULT 1,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        UNIQUE("userId", ticker)
      );
    `)
    console.log('PostgreSQL tablas inicializadas correctamente')
  } catch (error) {
    console.error('Error inicializando DB:', error.message)
  }
}

initDB()

export default pool