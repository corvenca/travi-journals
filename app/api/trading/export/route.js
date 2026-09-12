import { NextResponse } from 'next/server'
import pool from '@/db'
import { getUserFromToken } from '@/lib/getUser'

export async function GET(request) {
  try {
    const user = await getUserFromToken()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')

    if (!accountId) return NextResponse.json({ error: 'accountId requerido' }, { status: 400 })

    // Cuenta
    const accountRes = await pool.query(
      'SELECT * FROM trading_accounts WHERE id = $1 AND user_id = $2',
      [accountId, user.userId]
    )
    if (accountRes.rows.length === 0) return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })
    const account = accountRes.rows[0]

    // Operaciones con setup
    const opsRes = await pool.query(`
      SELECT
        o.id, o.date, o.symbol, o.side, o.sesion,
        o.pnl, o.riesgo_amount, o.comision, o.result_r,
        o.result_type, o.contratos, o.notes, o.image_url,
        o.created_at,
        s.name as setup_name, s.direction as setup_direction
      FROM trading_operations o
      LEFT JOIN trading_setups s ON o.setup_id = s.id
      WHERE o.account_id = $1 AND o.user_id = $2
      ORDER BY o.date ASC, o.created_at ASC
    `, [accountId, user.userId])

    // Estadísticas
    const statsRes = await pool.query(`
      SELECT
        COUNT(*) as total,
        SUM(pnl) as total_pnl,
        SUM(comision) as total_comision,
        SUM(CASE WHEN result_type = 'GANADA' THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN result_type = 'PERDIDA' THEN 1 ELSE 0 END) as losses,
        SUM(CASE WHEN result_type = 'BREAK_EVEN' THEN 1 ELSE 0 END) as be,
        MAX(pnl) as best_trade,
        MIN(pnl) as worst_trade,
        AVG(pnl) as avg_pnl
      FROM trading_operations
      WHERE account_id = $1 AND user_id = $2
    `, [accountId, user.userId])

    const stats = statsRes.rows[0]
    const winRate = stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(2) : 0

    return NextResponse.json({
      account,
      operations: opsRes.rows,
      stats: { ...stats, winRate }
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
