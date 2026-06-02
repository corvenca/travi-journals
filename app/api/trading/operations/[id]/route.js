import { NextResponse } from 'next/server';
import pool from '@/db';
import { getUserFromToken } from '@/lib/getUser';

export async function PUT(request, context) {
    try {
        const user = await getUserFromToken();
        if (!user) {
            return NextResponse.json({ error: 'No Autorizado' }, { status: 401 });
        }

        const data = await request.json();
        
        let paramsId;
        try {
            const resolvedParams = await context.params;
            paramsId = resolvedParams?.id;
        } catch (e) {
            paramsId = context?.params?.id;
        }

        const id = data.id || paramsId;
        if (!id) return NextResponse.json({ error: 'No se recibió el id de la operación en modo edición (ID es requerido)' }, { status: 400 });

        const {
            date, symbol, side, sesion, setupId,
            pnl, riesgo, riesgoAmount, riesgo_amount,
            comision, notes, imageUrl, contratos
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
            if (setupObj && setupObj.direction !== side.toUpperCase()) {
                return NextResponse.json({ 
                    error: `Conflicto de Dirección: El Setup seleccionado es exclusivamente para ${setupObj.direction}, pero intentas registrar una operación ${side.toUpperCase()}` 
                }, { status: 400 });
            }
        }

        let finalResultType;
        const resultType = data.resultType;
        if (resultType === 'BE' || resultType === 'BREAK_EVEN') {
            finalResultType = 'BREAK_EVEN';
        } else if (resultType === 'SL' || resultType === 'PERDIDA') {
            finalResultType = 'PERDIDA';
        } else if (resultType === 'TP' || resultType === 'GANADA') {
            finalResultType = 'GANADA';
        } else {
            finalResultType = parsedPnl > 0 ? 'GANADA' : (parsedPnl < 0 ? 'PERDIDA' : 'BREAK_EVEN');
        }
        await pool.query(`
            UPDATE trading_operations SET
                setup_id = $1, 
                date = $2, 
                symbol = $3, 
                side = $4, 
                sesion = $5,
                pnl = $6, 
                riesgo_amount = $7, 
                comision = $8,
                result_r = $9, 
                result_type = $10, 
                notes = $11, 
                image_url = $12,
                contratos = $13
            WHERE id = $14 AND user_id = $15
        `, [
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
            parsedContratos,
            id,
            user.userId
        ]);

        const opDataResult = await pool.query('SELECT account_id FROM trading_operations WHERE id = $1 AND user_id = $2', [id, user.userId]);
        const opData = opDataResult.rows[0];
        
        await pool.query('DELETE FROM trading_commissions WHERE operation_id = $1 AND user_id = $2', [id, user.userId]);
        if (parsedComision > 0 && opData) {
            await pool.query(`
                INSERT INTO trading_commissions (user_id, account_id, operation_id, date, amount, description)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [user.userId, opData.account_id, id, date, parsedComision, 'Comisión actualizada']);
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error("PUT Operation Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request, context) {
    try {
        const user = await getUserFromToken();
        if (!user) {
            return NextResponse.json({ error: 'No Autorizado' }, { status: 401 });
        }

        let paramsId;
        try {
            const resolvedParams = await context.params;
            paramsId = resolvedParams?.id;
        } catch (e) {
            paramsId = context?.params?.id;
        }

        const id = paramsId;
        if (!id) return NextResponse.json({ error: 'No se recibió el id de la operación para eliminar (ID es requerido)' }, { status: 400 });

        await pool.query('DELETE FROM trading_commissions WHERE operation_id = $1 AND user_id = $2', [id, user.userId]);
        await pool.query('DELETE FROM trading_operations WHERE id = $1 AND user_id = $2', [id, user.userId]);

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error("DELETE Operation Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
