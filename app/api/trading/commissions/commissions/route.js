import { NextResponse } from 'next/server';
import db from '@/db';
import { getSession } from '@/lib/session';

export async function GET(request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'No Autorizado' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const accountIdRaw = searchParams.get('accountId');

        if (!accountIdRaw) {
            return NextResponse.json({ error: 'El accountId es requerido' }, { status: 400 });
        }

        const accountId = parseInt(accountIdRaw, 10);

        const commissions = db.prepare(`
            SELECT c.*, o.symbol, o.side, o.setupId 
            FROM trading_commissions c
            LEFT JOIN trading_operations o ON c.operationId = o.id
            WHERE c.accountId = ?
            ORDER BY c.date DESC, c.id DESC
        `).all(accountId);

        return NextResponse.json(commissions);
    } catch (error) {
        console.error("GET Commissions Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
