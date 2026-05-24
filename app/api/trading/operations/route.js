import { NextResponse } from 'next/server';
import pool from '@/db';
import { getSession } from '@/lib/session';

export async function GET(request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'No Autorizado' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50', 10);
        const accountId = searchParams.get('accountId');

        let query = `
            SELECT 
                o.*,
                a.name as accountName,
                s.name as setupName,
                s.color as setupColor
            FROM trading_operations o
            LEFT JOIN trading_accounts a ON o.account_id = a.id
            LEFT JOIN trading_setups s ON o.setup_id = s.id
            WHERE 1=1
        `;
        const params = [];

        if (accountId) {
            params.push(accountId);
            query += ` AND o.account_id = $${params.length}`;
        }

        params.push(limit);
        query += ` ORDER BY o.date DESC, o.id DESC LIMIT $${params.length}`;

        const result = await pool.query(query, params);
        return NextResponse.json(result.rows);
    } catch (error) {
        console.error("GET Operations:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'No Autorizado' }, { status: 403 });
        }

        const data = await request.json();
        console.log('DATA RECIBIDA:', data); // debug
        
        const {
            accountId, date, symbol, side, sesion, setupId,
            pnl = 0, riesgo = 0, comision = 0, notes, imageUrl, contratos, resultType: inputResultType, tipoResultado
        } = data;

        const parsedPnl = parseFloat(pnl);
        const parsedRiesgo = parseFloat(riesgo);
        const parsedComision = parseFloat(comision) || 0;
        const parsedContratos = parseInt(contratos, 10);

        if (!date || !symbol || !side || isNaN(parsedRiesgo) || parsedRiesgo <= 0) {
            return NextResponse.json({ error: 'Fecha, Símbolo, Dirección y Riesgo (>0) son obligatorios' }, { status: 400 });
        }

        if (isNaN(parsedContratos) || parsedContratos < 1) {
            return NextResponse.json({ error: 'Introduce una cantidad válida de contratos.' }, { status: 400 });
        }

        if (setupId) {
            const setupObjResult = await pool.query('SELECT direction FROM trading_setups WHERE id = $1', [setupId]);
            const setupObj = setupObjResult.rows[0];
            if (setupObj && setupObj.direction !== side.toUpperCase()) {
                return NextResponse.json({ 
                    error: `Conflicto de Dirección: El Setup seleccionado es exclusivamente para ${setupObj.direction}, pero intentas registrar una operación ${side.toUpperCase()}` 
                }, { status: 400 });
            }
        }

        let finalResultType;
        const userResultType = inputResultType || tipoResultado || '';
        
        if (userResultType === 'BE') {
            finalResultType = 'BREAK_EVEN';
        } else if (userResultType === 'SL') {
            finalResultType = 'PERDIDA';
        } else if (userResultType === 'TP') {
            finalResultType = 'GANADA';
        } else if (userResultType === 'BREAK_EVEN' || userResultType === 'GANADA' || userResultType === 'PERDIDA') {
            finalResultType = userResultType;
        } else {
            finalResultType = parsedPnl > 0 ? 'GANADA' : parsedPnl < 0 ? 'PERDIDA' : 'BREAK_EVEN';
        }
        let rr = parsedRiesgo > 0 ? (parsedPnl / parsedRiesgo) : 0;

        const result = await pool.query(`
            INSERT INTO trading_operations (
                account_id, setup_id, date, symbol, side, sesion,
                pnl, riesgo_amount, comision, result_r, result_type, notes, image_url, contratos
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id
        `, [
            accountId || null,
            setupId || null,
            date,
            symbol.toUpperCase(),
            side.toUpperCase(),
            sesion || null,
            parsedPnl,
            parsedRiesgo,
            parsedComision,
            rr,
            finalResultType,
            notes || null,
            imageUrl || null,
            parsedContratos
        ]);

        const opId = result.rows[0].id;

        if (parsedComision > 0) {
            await pool.query(`
                INSERT INTO trading_commissions (account_id, operation_id, date, amount, description)
                VALUES ($1, $2, $3, $4, $5)
            `, [accountId || null, opId, date, parsedComision, 'Comisión de operación']);
        }

        return NextResponse.json({ success: true, id: opId }, { status: 201 });
    } catch (error) {
        console.error("POST Operations:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
