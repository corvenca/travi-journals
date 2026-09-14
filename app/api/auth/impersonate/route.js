import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

export async function POST(request) {
  try {
    const { token } = await request.json()
    if (!token) return NextResponse.json({ error: 'Token requerido' }, { status: 400 })

    // Verificar que el token es válido
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'travitrade_secret_2025')

    // Guardar como cookie de sesión de journals
    const cookieStore = await cookies()
    cookieStore.set('journals_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60, // 1 hora
      path: '/'
    })

    return NextResponse.json({ success: true, user: decoded })
  } catch (error) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }
}
