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
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        broker TEXT,
        type TEXT DEFAULT 'REAL',
        initial_capital REAL DEFAULT 0,
        risk_percent REAL DEFAULT 1,
        trader_name TEXT,
        trader_email TEXT,
        trader_address TEXT,
        account_number TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS trading_setups (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        account_id INTEGER REFERENCES trading_accounts(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        color TEXT DEFAULT '#1D9E75',
        direction TEXT DEFAULT 'BOTH',
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS trading_operations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        account_id INTEGER REFERENCES trading_accounts(id) ON DELETE CASCADE,
        setup_id INTEGER REFERENCES trading_setups(id),
        date TEXT NOT NULL,
        symbol TEXT NOT NULL,
        side TEXT NOT NULL,
        sesion TEXT,
        pnl REAL DEFAULT 0,
        riesgo_amount REAL DEFAULT 0,
        comision REAL DEFAULT 0,
        result_r REAL DEFAULT 0,
        result_type TEXT DEFAULT 'BREAK_EVEN',
        notes TEXT,
        image_url TEXT,
        contratos INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS trading_commissions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        account_id INTEGER REFERENCES trading_accounts(id) ON DELETE CASCADE,
        operation_id INTEGER REFERENCES trading_operations(id) ON DELETE CASCADE,
        date TEXT,
        amount REAL DEFAULT 0,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS trading_captures (
        id SERIAL PRIMARY KEY,
        operation_id INTEGER REFERENCES trading_operations(id) ON DELETE CASCADE,
        url TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS user_instruments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        category TEXT NOT NULL,
        ticker TEXT NOT NULL,
        name TEXT,
        active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, ticker)
      );
    `)

    // Agregar columnas user_id si no existen (para tablas ya creadas)
    const alterQueries = [
      `ALTER TABLE trading_accounts ADD COLUMN IF NOT EXISTS user_id INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE trading_setups ADD COLUMN IF NOT EXISTS user_id INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE trading_operations ADD COLUMN IF NOT EXISTS user_id INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE trading_commissions ADD COLUMN IF NOT EXISTS user_id INTEGER NOT NULL DEFAULT 0`,
    ]
    for (const q of alterQueries) {
      try { await pool.query(q) } catch(e) {}
    }

    console.log('PostgreSQL tablas inicializadas correctamente')
  } catch (error) {
    console.error('Error inicializando DB:', error.message)
  }
}

initDB()
export default pool