import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

export async function getUserFromToken() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('journals_token')
    if (!token) return null
    const decoded = jwt.verify(token.value, process.env.JWT_SECRET || 'travitrade_secret_2025')
    console.log('DECODED TOKEN:', JSON.stringify(decoded))
    return {
      userId: decoded.userId || decoded.id || decoded.sub,
      id: decoded.userId || decoded.id || decoded.sub,
      email: decoded.email,
      nombre: decoded.nombre,
      plan: decoded.plan || 'free'
    }
  } catch(e) {
    console.error('Token error:', e.message)
    return null
  }
}
