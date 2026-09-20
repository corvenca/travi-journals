import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('journals_token')
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const decoded = jwt.verify(token.value, process.env.JWT_SECRET || 'travitrade_secret_2025')
    const isAdmin = decoded.email === 'altuveronalbis@gmail.com'
    const plan = isAdmin ? 'pro' : (decoded.plan || 'free')
    const hasFullAccess = plan === 'pro' || plan === 'free_full'
    return NextResponse.json({
      nombre: decoded.nombre,
      email: decoded.email,
      userId: decoded.userId,
      plan,
      hasFullAccess,
      impersonatedBy: decoded.impersonatedBy || null
    })
  } catch {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }
}
