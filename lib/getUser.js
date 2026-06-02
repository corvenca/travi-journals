import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

export async function getUserFromToken() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('journals_token')
    if (!token) return null
    const decoded = jwt.verify(token.value, process.env.JWT_SECRET || 'travitrade_secret_2025')
    return decoded
  } catch {
    return null
  }
}
