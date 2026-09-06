import { NextResponse } from 'next/server'
import pool from '@/db'
import { getUserFromToken } from '@/lib/getUser'

export async function GET(request) {
  try {
    const user = await getUserFromToken()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const filterType = searchParams.get('filterType') || 'all' // 'all', 'week', 'month'
    const filterValue = searchParams.get('filterValue') || ''

    if (!accountId) return NextResponse.json({ error: 'accountId requerido' }, { status: 400 })

    let dateFilter = ''
    if (filterType === 'month' && filterValue) {
      dateFilter = `AND date >= '${filterValue}-01' AND date <= '${filterValue}-31'`
    } else if (filterType === 'week' && filterValue) {
      dateFilter = `AND date >= '${filterValue}'::date AND date < '${filterValue}'::date + INTERVAL '7 days'`
    }

    // Análisis por dirección (LONG/SHORT)
    const directionRes = await pool.query(`
      SELECT
        o.side,
        COUNT(*) as total,
        SUM(CASE WHEN o.result_type = 'GANADA' THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN o.result_type = 'PERDIDA' THEN 1 ELSE 0 END) as losses,
        SUM(CASE WHEN o.result_type = 'BREAK_EVEN' THEN 1 ELSE 0 END) as be,
        SUM(o.pnl) as total_pnl,
        MAX(o.pnl) as best_trade,
        MIN(o.pnl) as worst_trade
      FROM trading_operations o
      WHERE o.user_id = $1 AND o.account_id = $2 ${dateFilter}
      GROUP BY o.side
      ORDER BY total DESC
    `, [user.userId, accountId])

    // Análisis por setup con dirección
    const setupRes = await pool.query(`
      SELECT
        s.name as setup_name,
        s.direction as setup_direction,
        s.color as setup_color,
        o.side,
        COUNT(*) as total,
        SUM(CASE WHEN o.result_type = 'GANADA' THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN o.result_type = 'PERDIDA' THEN 1 ELSE 0 END) as losses,
        SUM(CASE WHEN o.result_type = 'BREAK_EVEN' THEN 1 ELSE 0 END) as be,
        SUM(o.pnl) as total_pnl
      FROM trading_operations o
      LEFT JOIN trading_setups s ON o.setup_id = s.id
      WHERE o.user_id = $1 AND o.account_id = $2 ${dateFilter}
      GROUP BY s.name, s.direction, s.color, o.side
      ORDER BY total DESC
    `, [user.userId, accountId])

    // Meses disponibles
    const monthsRes = await pool.query(`
      SELECT DISTINCT
        to_char(date::date, 'YYYY-MM') as value,
        to_char(date::date, 'Mon YYYY') as label
      FROM trading_operations
      WHERE user_id = $1 AND account_id = $2
      ORDER BY value DESC
    `, [user.userId, accountId])

    // Semanas disponibles
    const weeksRes = await pool.query(`
      SELECT DISTINCT
        date_trunc('week', date::date)::date::text as value,
        'Semana del ' || to_char(date_trunc('week', date::date), 'DD/MM/YYYY') as label
      FROM trading_operations
      WHERE user_id = $1 AND account_id = $2
      ORDER BY value DESC
    `, [user.userId, accountId])

    return NextResponse.json({
      byDirection: directionRes.rows,
      bySetupDirection: setupRes.rows,
      availableMonths: monthsRes.rows,
      availableWeeks: weeksRes.rows
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
