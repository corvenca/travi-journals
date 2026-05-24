import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { Pool } from 'pg'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

const pool = new Pool({
  connectionString: process.env.APP_DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

export async function POST(request) {
  try {
    const { email, password } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 })
    }
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email])
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
    }
    const user = result.rows[0]
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
    }
    const token = jwt.sign(
      { userId: user.id, email: user.email, nombre: user.nombre },
      process.env.JWT_SECRET || 'travitrade_secret_2025',
      { expiresIn: '7d' }
    )
    const cookieStore = await cookies()
    cookieStore.set('journals_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    })
    return NextResponse.json({ success: true, nombre: user.nombre })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
