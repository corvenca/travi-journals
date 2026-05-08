import { NextResponse } from 'next/server';
import db from '@/db';
import { getSession } from '@/lib/session';

export async function GET(request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'No Autorizado' }, { status: 403 });
        }

        const setups = db.prepare('SELECT * FROM trading_setups ORDER BY id DESC').all();
        return NextResponse.json(setups);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'No Autorizado' }, { status: 403 });
        }

        const { name, description, color, direction } = await request.json();

        if (!name || !direction) {
            return NextResponse.json({ error: 'El nombre y dirección son obligatorios' }, { status: 400 });
        }

        const stmt = db.prepare(`
            INSERT INTO trading_setups (name, description, color, direction)
            VALUES (?, ?, ?, ?)
        `);
        const info = stmt.run(name, description || '', color || '#3b82f6', direction);

        return NextResponse.json({ success: true, id: info.lastInsertRowid }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'No Autorizado' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Se requiere ID' }, { status: 400 });
        }

        db.prepare('DELETE FROM trading_setups WHERE id = ?').run(id);

        return NextResponse.json({ success: true, id });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'No Autorizado' }, { status: 403 });
        }

        const { id, name, direction } = await request.json();

        if (!id || !name || !direction) {
            return NextResponse.json({ error: 'ID, nombre y dirección son obligatorios' }, { status: 400 });
        }

        db.prepare(`
            UPDATE trading_setups 
            SET name = ?, direction = ? 
            WHERE id = ?
        `).run(name, direction, id);

        return NextResponse.json({ success: true, id });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
