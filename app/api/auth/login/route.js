import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { Pool } from 'pg'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

const pool = new Pool({
  connectionString: process.env.APP_DATABASE_URL || process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

export async function POST(request) {
  try {
    const body = await request.json()
    const reqEmail = body.email || ''
    const password = body.password || ''
    
    const email = reqEmail.trim()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 })
    }
    
    console.log(`[LOGIN ATTEMPT] Email: '${email}'`);

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email])
    
    if (result.rows.length === 0) {
      console.log(`[LOGIN FAILED] No se encontró el usuario: ${email}`);
      return NextResponse.json({ error: 'Credenciales incorrectas (Usuario no encontrado)' }, { status: 401 })
    }
    
    const user = result.rows[0]
    const valid = await bcrypt.compare(password, user.password_hash)
    
    if (!valid) {
      console.log(`[LOGIN FAILED] Contraseña incorrecta para: ${email}`);
      return NextResponse.json({ error: 'Credenciales incorrectas (Contraseña no coincide)' }, { status: 401 })
    }
    const isAdmin = user.email === 'altuveronalbis@gmail.com'
    const plan = isAdmin ? 'admin' : (user.plan || 'free')

    const token = jwt.sign(
      { userId: user.id, email: user.email, nombre: user.nombre, plan },
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
