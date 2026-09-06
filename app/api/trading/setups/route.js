import { NextResponse } from 'next/server';
import pool from '@/db';
import { getUserFromToken } from '@/lib/getUser';

export async function GET(request) {
    try {
        const user = await getUserFromToken();
        if (!user) {
            return NextResponse.json({ error: 'No Autorizado' }, { status: 401 });
        }

        const result = await pool.query(
            'SELECT * FROM trading_setups WHERE user_id = $1 ORDER BY name ASC',
            [user.userId]
        );
        return NextResponse.json(result.rows);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const user = await getUserFromToken();
        if (!user) {
            return NextResponse.json({ error: 'No Autorizado' }, { status: 401 });
        }

        const { name, description, color, direction } = await request.json();

        if (!name || !direction) {
            return NextResponse.json({ error: 'El nombre y dirección son obligatorios' }, { status: 400 });
        }

        const result = await pool.query(`
            INSERT INTO trading_setups (user_id, name, description, color, direction)
            VALUES ($1, $2, $3, $4, $5) RETURNING id
        `, [user.userId, name, description || '', color || '#3b82f6', direction]);

        return NextResponse.json({ success: true, id: result.rows[0].id }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
  try {
    const user = await getUserFromToken()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const { id, name, direction, color, description } = await request.json()
    if (!id || !name || !direction) return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })

    await pool.query(
      'UPDATE trading_setups SET name = $1, direction = $2, color = $3, description = $4 WHERE id = $5 AND user_id = $6',
      [name, direction, color || '#1D9E75', description || '', id, user.userId]
    )
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const user = await getUserFromToken()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    // Primero desasociar operaciones — no eliminarlas
    await pool.query(
      'UPDATE trading_operations SET setup_id = NULL WHERE setup_id = $1 AND user_id = $2',
      [id, user.userId]
    )

    // Luego eliminar el setup
    await pool.query(
      'DELETE FROM trading_setups WHERE id = $1 AND user_id = $2',
      [id, user.userId]
    )
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
