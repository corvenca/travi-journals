import { NextResponse } from 'next/server';
import pool from '@/db';
import { getUserFromToken } from '@/lib/getUser';

export async function GET(request) {
    try {
        const user = await getUserFromToken();
        if (!user) {
            return NextResponse.json({ error: 'No Autorizado' }, { status: 401 });
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
            WHERE o.user_id = $1
        `;
        const params = [user.userId];

        if (accountId) {
            params.push(accountId);
            query += ` AND o.account_id = $${params.length}`;
        }

        params.push(limit);
        query += ` ORDER BY o.date DESC, o.id DESC LIMIT $${params.length}`;

        const result = await pool.query(query, params);
        const mappedRows = result.rows.map(row => ({
            ...row,
            riesgoAmount: row.riesgo_amount !== undefined ? row.riesgo_amount : row.riesgoAmount,
            resultR: row.result_r !== undefined ? row.result_r : row.resultR,
            resultType: row.result_type !== undefined ? row.result_type : row.resultType,
            imageUrl: row.image_url !== undefined ? row.image_url : row.imageUrl,
            setupId: row.setup_id !== undefined ? row.setup_id : row.setupId,
            accountId: row.account_id !== undefined ? row.account_id : row.accountId,
            setupName: row.setupname !== undefined ? row.setupname : row.setupName,
            setupColor: row.setupcolor !== undefined ? row.setupcolor : row.setupColor,
            accountName: row.accountname !== undefined ? row.accountname : row.accountName
        }));
        return NextResponse.json(mappedRows);
    } catch (error) {
        console.error("GET Operations:", error);
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
        console.log('DATA RECIBIDA:', data); // debug
        
        const plan = user.plan || 'free';
        if (plan === 'free') {
            const existing = await pool.query('SELECT COUNT(*) FROM trading_operations WHERE user_id = $1', [user.userId]);
            if (parseInt(existing.rows[0].count) >= 40) {
                return NextResponse.json({ error: 'Plan Free: límite de 40 operaciones alcanzado. Actualiza a Pro para operaciones ilimitadas.' }, { status: 403 });
            }
        }
        
        const {
            accountId, date, symbol, side, sesion, setupId,
            pnl, riesgo, riesgoAmount, riesgo_amount,
            comision, notes, imageUrl, contratos,
            resultType: inputResultType, tipoResultado
        } = data;

        const parsedPnl = parseFloat(pnl) || 0;
        const parsedRiesgo = parseFloat(riesgo || riesgoAmount || riesgo_amount) || 0;
        const parsedComision = parseFloat(comision) || 0;
        const parsedContratos = parseInt(contratos, 10) || 1;
        const parsedRR = parsedRiesgo > 0 ? parsedPnl / parsedRiesgo : 0;

        if (!date || !symbol || !side || parsedRiesgo <= 0) {
            return NextResponse.json({ error: 'Fecha, Símbolo, Dirección y Riesgo (>0) son obligatorios' }, { status: 400 });
        }

        if (parsedContratos < 1) {
            return NextResponse.json({ error: 'Introduce una cantidad válida de contratos.' }, { status: 400 });
        }

        if (setupId) {
            const setupObjResult = await pool.query('SELECT direction FROM trading_setups WHERE id = $1 AND user_id = $2', [setupId, user.userId]);
            const setupObj = setupObjResult.rows[0];
            if (setupObj && setupObj.direction !== 'BOTH' && setupObj.direction !== side.toUpperCase()) {
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
        const result = await pool.query(`
            INSERT INTO trading_operations (
                user_id, account_id, setup_id, date, symbol, side, sesion,
                pnl, riesgo_amount, comision, result_r, result_type,
                notes, image_url, contratos
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
            RETURNING id
        `, [
            user.userId,
            accountId || null,
            setupId || null,
            date,
            symbol?.toUpperCase(),
            side?.toUpperCase(),
            sesion || null,
            parsedPnl,
            parsedRiesgo,
            parsedComision,
            parsedRR,
            finalResultType,
            notes || null,
            imageUrl || null,
            parsedContratos
        ]);

        const opId = result.rows[0].id;

        if (parsedComision > 0) {
            await pool.query(`
                INSERT INTO trading_commissions (user_id, account_id, operation_id, date, amount, description)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [user.userId, accountId || null, opId, date, parsedComision, 'Comisión de operación']);
        }

        return NextResponse.json({ success: true, id: opId }, { status: 201 });
    } catch (error) {
        console.error("POST Operations:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
