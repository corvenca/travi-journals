import { NextResponse } from 'next/server'
import pool from '@/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT * FROM user_instruments WHERE "userId" = 1 AND active = 1 ORDER BY category, ticker
    `)
    return NextResponse.json(result.rows)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  const { category, ticker, name } = await request.json()
  if (!category || !ticker) return NextResponse.json({ error: 'Categoría y ticker son requeridos' }, { status: 400 })
  try {
    const result = await pool.query(`
      INSERT INTO user_instruments ("userId", category, ticker, name) VALUES (1, $1, $2, $3)
      ON CONFLICT ("userId", ticker) DO NOTHING RETURNING id
    `, [category, ticker.toUpperCase(), name || ticker])
    return NextResponse.json({ success: true, id: result.rows[0]?.id || null })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = parseInt(searchParams.get('id'), 10)
    
    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const result = await pool.query(`UPDATE user_instruments SET active = 0 WHERE id = $1`, [id])
    
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Instrumento no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
