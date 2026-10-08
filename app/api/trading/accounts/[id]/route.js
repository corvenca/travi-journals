import { NextResponse } from 'next/server'
import pool from '@/db'
import { getUserFromToken } from '@/lib/getUser'
import bcrypt from 'bcryptjs'

export async function DELETE(request, { params }) {
  try {
    const { id } = await params
    const user = await getUserFromToken()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { password } = await request.json()

    if (!password) {
      return NextResponse.json({ error: 'La contraseña es requerida' }, { status: 400 })
    }

    // Verificar contraseña
    const userRes = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [user.userId]
    )

    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const validPassword = await bcrypt.compare(password, userRes.rows[0].password_hash)
    if (!validPassword) {
      return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 })
    }

    // Verificar que la cuenta pertenece al usuario
    const accountCheck = await pool.query(
      'SELECT id FROM trading_accounts WHERE id = $1 AND user_id = $2',
      [id, user.userId]
    )
    if (accountCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })
    }

    // Primero desasociar setup_id en operaciones de esta cuenta
    await pool.query(
      'UPDATE trading_operations SET setup_id = NULL WHERE account_id = $1 AND user_id = $2',
      [id, user.userId]
    )

    // Eliminar comisiones y operaciones de la cuenta
    await pool.query('DELETE FROM trading_commissions WHERE account_id = $1 AND user_id = $2', [id, user.userId])
    await pool.query('DELETE FROM trading_operations WHERE account_id = $1 AND user_id = $2', [id, user.userId])

    // NO eliminar setups — son globales del usuario

    // Eliminar la cuenta
    await pool.query('DELETE FROM trading_accounts WHERE id = $1 AND user_id = $2', [id, user.userId])

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
