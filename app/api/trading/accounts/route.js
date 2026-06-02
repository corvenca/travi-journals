import { NextResponse } from 'next/server';
import pool from '@/db';
import { getUserFromToken } from '@/lib/getUser';

export async function GET(request) {
    try {
        const user = await getUserFromToken();
        if (!user) {
            return NextResponse.json({ error: 'No Autorizado' }, { status: 401 });
        }

        const result = await pool.query(`
            SELECT 
                a.*,
                (SELECT COUNT(*) FROM trading_operations o WHERE o.account_id = a.id) as operationsCount,
                (SELECT SUM(pnl) FROM trading_operations o WHERE o.account_id = a.id) as totalPnl
            FROM trading_accounts a
            WHERE a.user_id = $1
            ORDER BY a.id DESC
        `, [user.userId]);

        return NextResponse.json(result.rows);
    } catch (error) {
        console.error("GET Trading Accounts Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const user = await getUserFromToken();
        if (!user) {
            return NextResponse.json({ error: 'No Autorizado' }, { status: 401 });
        }

        const data = await request.json();
        const { name, broker, type, initialCapital, riskPercent, traderName, traderEmail, traderAddress, accountNumber } = data;

        if (!name) {
            return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
        }

        console.log('Intentando crear cuenta para usuario:', user.userId, data);

        const plan = user.plan || 'free';
        if (plan === 'free') {
            const existing = await pool.query('SELECT COUNT(*) FROM trading_accounts WHERE user_id = $1', [user.userId]);
            if (parseInt(existing.rows[0].count) >= 1) {
                return NextResponse.json({ error: 'Plan Free: solo puedes tener 1 cuenta. Actualiza a Pro para cuentas ilimitadas.' }, { status: 403 });
            }
        }

        const result = await pool.query(`
            INSERT INTO trading_accounts (user_id, name, broker, type, initial_capital, risk_percent, trader_name, trader_email, trader_address, account_number)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id
        `, [
            user.userId,
            name,
            broker || null,
            type || 'REAL',
            typeof initialCapital === 'number' ? initialCapital : 0,
            typeof riskPercent === 'number' ? riskPercent : 1,
            traderName || null,
            traderEmail || null,
            traderAddress || null,
            accountNumber || null
        ]);

        return NextResponse.json({ success: true, id: result.rows[0].id }, { status: 201 });
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
        const user = await getUserFromToken();
        if (!user) {
            return NextResponse.json({ error: 'No Autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'El ID es obligatorio' }, { status: 400 });
        }

        await pool.query('DELETE FROM trading_accounts WHERE id = $1 AND user_id = $2', [id, user.userId]);

        return NextResponse.json({ success: true, id });
    } catch (error) {
        console.error("DELETE Trading Accounts Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const user = await getUserFromToken();
        if (!user) {
            return NextResponse.json({ error: 'No Autorizado' }, { status: 401 });
        }

        const data = await request.json();
        const { id, name, broker, type, initialCapital, riskPercent, traderName, traderEmail, traderAddress, accountNumber } = data;

        if (!id || !name) {
            return NextResponse.json({ error: 'El ID y nombre son obligatorios' }, { status: 400 });
        }

        await pool.query(`
            UPDATE trading_accounts SET 
                name = $1, 
                broker = $2, 
                type = $3, 
                initial_capital = $4, 
                risk_percent = $5,
                trader_name = $6,
                trader_email = $7,
                trader_address = $8,
                account_number = $9
            WHERE id = $10 AND user_id = $11
        `, [
            name,
            broker || null,
            type || 'REAL',
            typeof initialCapital === 'number' ? initialCapital : 0,
            typeof riskPercent === 'number' ? riskPercent : 1,
            traderName || null,
            traderEmail || null,
            traderAddress || null,
            accountNumber || null,
            id,
            user.userId
        ]);

        return NextResponse.json({ success: true, id });
    } catch (error) {
        console.error("PUT Trading Accounts Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
