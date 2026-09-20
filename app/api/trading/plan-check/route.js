import { NextResponse } from 'next/server'
import pool from '@/db'
import { getUserFromToken } from '@/lib/getUser'

export async function GET() {
  try {
    const user = await getUserFromToken()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const isPro = ['pro', 'free_full', 'pro_monthly', 'pro_annual', 'admin'].includes(user.plan)

    // Contar operaciones
    const countRes = await pool.query(
      'SELECT COUNT(*) FROM trading_operations WHERE user_id = $1',
      [user.userId]
    )
    const opsCount = parseInt(countRes.rows[0].count)

    // Contar cuentas
    const accountsRes = await pool.query(
      'SELECT COUNT(*) FROM trading_accounts WHERE user_id = $1',
      [user.userId]
    )
    const accountsCount = parseInt(accountsRes.rows[0].count)

    // Determinar estado
    const isBlocked = !isPro && opsCount >= 30
    const isWarning = !isPro && opsCount >= 25
    const canDelete = isPro || opsCount < 25
    const canAddOps = isPro || opsCount < 30
    const canAddAccounts = isPro || accountsCount < 1
    const remaining = isPro ? null : Math.max(0, 30 - opsCount)

    return NextResponse.json({
      isPro,
      plan: user.plan,
      opsCount,
      accountsCount,
      isBlocked,
      isWarning,
      canDelete,
      canAddOps,
      canAddAccounts,
      remaining,
      upgradeUrl: 'https://app.travitrade.com/upgrade'
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
