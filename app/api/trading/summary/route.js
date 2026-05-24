import { NextResponse } from 'next/server'
import pool from '@/db'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || 1

    const resultAccounts = await pool.query(`
      SELECT id FROM trading_accounts WHERE 1=1
    `)
    const accounts = resultAccounts.rows

    if (accounts.length === 0) {
      return NextResponse.json({
        totalPnl: 0,
        winRate: 0,
        totalTrades: 0,
        thisMonthPnl: 0
      })
    }

    const accountIds = accounts.map(a => a.id)

    const statsResult = await pool.query(`
      SELECT
        COUNT(*) as "totalTrades",
        SUM(pnl) as "totalPnl",
        SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN substring(date, 1, 7) = substring(CURRENT_DATE::text, 1, 7) THEN pnl ELSE 0 END) as "thisMonthPnl"
      FROM trading_operations
      WHERE account_id = ANY($1::int[])
    `, [accountIds])

    const stats = statsResult.rows[0]

    const winRate = stats.totalTrades > 0
      ? ((stats.wins / stats.totalTrades) * 100).toFixed(1)
      : 0

    return NextResponse.json({
      totalPnl: stats.totalPnl || 0,
      winRate: parseFloat(winRate),
      totalTrades: stats.totalTrades || 0,
      thisMonthPnl: stats.thisMonthPnl || 0
    }, {
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:3000',
        'Access-Control-Allow-Methods': 'GET',
      }
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
