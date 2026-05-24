import { NextResponse } from 'next/server';
import pool from '@/db';
import { getSession } from '@/lib/session';

export async function PUT(request, context) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'No Autorizado' }, { status: 403 });
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
            pnl = 0, riesgo = 0, comision = 0, notes, imageUrl, contratos
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
        let rr = parsedRiesgo > 0 ? (parsedPnl / parsedRiesgo) : 0;

        await pool.query(`
            UPDATE trading_operations SET
                "setupId" = $1, 
                date = $2, 
                symbol = $3, 
                side = $4, 
                sesion = $5,
                pnl = $6, 
                "riesgoAmount" = $7, 
                comision = $8,
                "resultR" = $9, 
                "resultType" = $10, 
                notes = $11, 
                "imageUrl" = $12,
                contratos = $13
            WHERE id = $14
        `, [
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
            parsedContratos,
            id
        ]);

        const opDataResult = await pool.query('SELECT "accountId" FROM trading_operations WHERE id = $1', [id]);
        const opData = opDataResult.rows[0];
        
        await pool.query('DELETE FROM trading_commissions WHERE "operationId" = $1', [id]);
        if (parsedComision > 0 && opData) {
            await pool.query(`
                INSERT INTO trading_commissions ("accountId", "operationId", date, amount, description)
                VALUES ($1, $2, $3, $4, $5)
            `, [opData.accountId, id, date, parsedComision, 'Comisión actualizada']);
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error("PUT Operation Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request, context) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'No Autorizado' }, { status: 403 });
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

        await pool.query('DELETE FROM trading_commissions WHERE "operationId" = $1', [id]);
        await pool.query('DELETE FROM trading_operations WHERE id = $1', [id]);

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error("DELETE Operation Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
