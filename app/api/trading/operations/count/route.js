import { NextResponse } from 'next/server'
import pool from '@/db'
import { getUserFromToken } from '@/lib/getUser'

export async function GET() {
  try {
    const user = await getUserFromToken()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const isPro = ['pro', 'free_full', 'pro_monthly', 'pro_annual', 'admin'].includes(user.plan)

    const countRes = await pool.query(
      'SELECT COUNT(*) FROM trading_operations WHERE user_id = $1',
      [user.userId]
    )
    const count = parseInt(countRes.rows[0].count)

    return NextResponse.json({
      count,
      max: isPro ? null : 30,
      isPro,
      canDelete: isPro || count < 25,
      canAdd: isPro || count < 30,
      remaining: isPro ? null : Math.max(0, 30 - count),
      warningLevel: isPro ? null : count >= 25 ? 'critical' : count >= 20 ? 'warning' : null
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
