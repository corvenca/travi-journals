import { NextResponse } from 'next/server';
import db from '@/db';
import { getSession } from '@/lib/session';

export async function GET(request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'No Autorizado: Solo ADMIN' }, { status: 403 });
        }

        const accounts = db.prepare(`
            SELECT 
                a.*,
                (SELECT COUNT(*) FROM trading_operations o WHERE o.accountId = a.id) as operationsCount,
                (SELECT SUM(pnl) FROM trading_operations o WHERE o.accountId = a.id) as totalPnl
            FROM trading_accounts a
            ORDER BY a.id DESC
        `).all();

        return NextResponse.json(accounts);
    } catch (error) {
        console.error("GET Trading Accounts Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'No Autorizado: Solo ADMIN' }, { status: 403 });
        }

        const data = await request.json();
        const { name, broker, type, initialCapital, riskPercent, traderName, traderEmail, traderAddress, accountNumber } = data;

        if (!name) {
            return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
        }

        console.log('Intentando crear cuenta:', data)
        console.log('DB path:', process.env.DB_PATH || 'default')

        const stmt = db.prepare(`
            INSERT INTO trading_accounts (name, broker, type, initialCapital, riskPercent, traderName, traderEmail, traderAddress, accountNumber)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const info = stmt.run(
            name,
            broker || null,
            type || 'REAL',
            typeof initialCapital === 'number' ? initialCapital : 0,
            typeof riskPercent === 'number' ? riskPercent : 1,
            traderName || null,
            traderEmail || null,
            traderAddress || null,
            accountNumber || null
        );

        return NextResponse.json({ success: true, id: info.lastInsertRowid }, { status: 201 });
    } catch (error) {
        console.error("POST Trading Accounts Error:", error);
        return NextResponse.json(
            { error: error.message, detail: error.toString() },
            { status: 500 }
        );
    }
}

export async function DELETE(request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'No Autorizado: Solo ADMIN' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'El ID es obligatorio' }, { status: 400 });
        }

        // SQLite ON DELETE CASCADE should handle operations and captures
        db.prepare('DELETE FROM trading_accounts WHERE id = ?').run(id);

        return NextResponse.json({ success: true, id });
    } catch (error) {
        console.error("DELETE Trading Accounts Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'No Autorizado: Solo ADMIN' }, { status: 403 });
        }

        const data = await request.json();
        const { id, name, broker, type, initialCapital, riskPercent, traderName, traderEmail, traderAddress, accountNumber } = data;

        if (!id || !name) {
            return NextResponse.json({ error: 'El ID y nombre son obligatorios' }, { status: 400 });
        }

        const stmt = db.prepare(`
            UPDATE trading_accounts SET 
                name = ?, 
                broker = ?, 
                type = ?, 
                initialCapital = ?, 
                riskPercent = ?,
                traderName = ?,
                traderEmail = ?,
                traderAddress = ?,
                accountNumber = ?
            WHERE id = ?
        `);
        stmt.run(
            name,
            broker || null,
            type || 'REAL',
            typeof initialCapital === 'number' ? initialCapital : 0,
            typeof riskPercent === 'number' ? riskPercent : 1,
            traderName || null,
            traderEmail || null,
            traderAddress || null,
            accountNumber || null,
            id
        );

        return NextResponse.json({ success: true, id });
    } catch (error) {
        console.error("PUT Trading Accounts Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
