import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import db from '@/db';

export async function GET(request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'No Autorizado' }, { status: 401 });

        const url = new URL(request.url);
        let accountId = url.searchParams.get('accountId');

        if (!accountId) return NextResponse.json({ error: 'Account ID required' }, { status: 400 });

        const setups = db.prepare('SELECT * FROM trading_setups').all();
        
        let opsQuery = `
            SELECT o.*, s.name as setupName 
            FROM trading_operations o
            LEFT JOIN trading_setups s ON o."setupId" = s.id
            WHERE o."accountId" = ?
        `;
        const operations = db.prepare(opsQuery).all(accountId);

        return NextResponse.json({ setups, operations });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'No Autorizado' }, { status: 401 });

        const { accountId, operations } = await request.json();
        
        if (!accountId) return NextResponse.json({ error: 'Account ID missing' }, { status: 400 });

        let report = {
            setups: { imported: 0, duplicates: 0, errors: [] }, // Kept for frontend compatibility
            operations: { imported: 0, duplicates: 0, errors: [] }
        };

        const checkOpAlt = db.prepare('SELECT id FROM trading_operations WHERE date = ? AND symbol = ? AND side = ? AND "accountId" = ?');
        
        const insertOpWithoutId = db.prepare(`
            INSERT INTO trading_operations 
            (date, symbol, side, contratos, setupId, sesion, riesgoAmount, pnl, resultR, notes, imageUrl, accountId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (let i = 0; i < operations.length; i++) {
            const op = operations[i];
            
            // Normalize inputs
            let date = op['FECHA'];
            if(date && typeof date === 'string' && date.includes('/')) {
                const parts = date.split('/');
                if(parts.length === 3) date = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
            }

            const sym = (op['INSTRUMENTO'] || '').toString().trim().toUpperCase();
            const side = (op['DIRECCIÓN'] || '').toString().trim().toUpperCase();
            const pnl = parseFloat(op['RESULTADO P&L ($)']);
            
            if (!date || !sym || !side || isNaN(pnl)) {
                report.operations.errors.push({ row: i+1, reason: 'Faltan campos obligatorios o P&L no numérico' });
                continue;
            }

            const exists = checkOpAlt.get(date, sym, side, accountId);
            if (exists) {
                report.operations.duplicates++;
                continue;
            }

            // Map Setup
            const sName = (op['SETUP'] || '').toString().trim();
            let setupId = null;
            if (sName) {
                const setupRes = db.prepare('SELECT id FROM trading_setups WHERE name = ?').get(sName);
                if (setupRes) setupId = setupRes.id;
            }

            try {
                insertOpWithoutId.run(
                    date,
                    sym,
                    side,
                    op['CONTRATOS'] ? parseFloat(op['CONTRATOS']) : null,
                    setupId,
                    (op['SESIÓN'] || '').toString().trim().toUpperCase(),
                    parseFloat(op['RIESGO ($)']) || 0,
                    pnl,
                    parseFloat(op['RR']) || 0,
                    op['NOTAS'] || '',
                    op['LINK TRADINGVIEW'] || '',
                    accountId
                );
                report.operations.imported++;
            } catch(e) {
                report.operations.errors.push({ row: i+1, reason: e.message });
            }
        }

        return NextResponse.json(report);

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
