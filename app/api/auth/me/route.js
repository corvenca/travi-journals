import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('journals_token')
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const decoded = jwt.verify(token.value, process.env.JWT_SECRET || 'travitrade_secret_2025')
    return NextResponse.json({ nombre: decoded.nombre, email: decoded.email, userId: decoded.userId })
  } catch {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }
}
