import { NextResponse } from 'next/server'
import pool from '@/db'
import { getUserFromToken } from '@/lib/getUser'

export async function PUT(request) {
  try {
    const user = await getUserFromToken()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { operationIds, targetAccountId, action = 'transfer' } = await request.json()

    if (!operationIds?.length || !targetAccountId) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 })
    }

    // Verificar que la cuenta destino pertenece al usuario
    const accountCheck = await pool.query(
      'SELECT id FROM trading_accounts WHERE id = $1 AND user_id = $2',
      [targetAccountId, user.userId]
    )
    if (accountCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Cuenta destino no válida' }, { status: 403 })
    }

    if (action === 'copy' || action === 'duplicate') {
      // Copiar operaciones manteniendo las originales en la cuenta actual
      const opsResult = await pool.query(
        `SELECT * FROM trading_operations WHERE id = ANY($1::int[]) AND user_id = $2`,
        [operationIds, user.userId]
      )

      let count = 0
      for (const op of opsResult.rows) {
        const newOp = await pool.query(
          `INSERT INTO trading_operations (
            user_id, account_id, setup_id, date, symbol, side, sesion,
            pnl, riesgo_amount, comision, result_r, result_type,
            notes, image_url, contratos
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          RETURNING id`,
          [
            user.userId,
            targetAccountId,
            op.setup_id,
            op.date,
            op.symbol,
            op.side,
            op.sesion,
            op.pnl,
            op.riesgo_amount,
            op.comision,
            op.result_r,
            op.result_type,
            op.notes,
            op.image_url,
            op.contratos
          ]
        )
        count++
        const newOpId = newOp.rows[0].id

        if (parseFloat(op.comision) > 0) {
          await pool.query(
            `INSERT INTO trading_commissions (user_id, account_id, operation_id, date, amount, description)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [user.userId, targetAccountId, newOpId, op.date, op.comision, 'Comisión de operación copiada']
          )
        }
      }

      return NextResponse.json({
        success: true,
        transferred: count,
        message: `${count} operación(es) copiada(s) correctamente (manteniéndose en ambas cuentas)`
      })
    }

    // Transferir (Mover) operaciones desplazándolas a la cuenta destino
    const result = await pool.query(
      `UPDATE trading_operations
       SET account_id = $1
       WHERE id = ANY($2::int[]) AND user_id = $3
       RETURNING id`,
      [targetAccountId, operationIds, user.userId]
    )

    // Actualizar también las comisiones asociadas
    await pool.query(
      `UPDATE trading_commissions
       SET account_id = $1
       WHERE operation_id = ANY($2::int[]) AND user_id = $3`,
      [targetAccountId, operationIds, user.userId]
    )

    return NextResponse.json({
      success: true,
      transferred: result.rows.length,
      message: `${result.rows.length} operación(es) transferida(s) correctamente`
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
