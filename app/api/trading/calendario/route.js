import { NextResponse } from 'next/server'
import pool from '@/db'
import { getSession } from '@/lib/session'

export async function GET(request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const year = searchParams.get('year') || new Date().getFullYear()
    const month = searchParams.get('month') || (new Date().getMonth() + 1)
    if (!accountId) return NextResponse.json({ error: 'accountId requerido' }, { status: 400 })
    const monthStr = `${year}-${String(month).padStart(2, '0')}`
    const result = await pool.query(`
      SELECT date, COUNT(*) as "totalOps", SUM(pnl) as "totalPnl",
      SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN pnl < 0 THEN 1 ELSE 0 END) as losses,
      SUM(CASE WHEN pnl = 0 THEN 1 ELSE 0 END) as "breakEvens"
      FROM trading_operations
      WHERE account_id = $1 AND substring(date, 1, 7) = $2
      GROUP BY date ORDER BY date ASC
    `, [parseInt(accountId, 10), monthStr])
    return NextResponse.json({ dailyData: result.rows, month, year })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
