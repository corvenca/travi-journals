import { NextResponse } from 'next/server';
import db from '@/db';
import { getSession } from '@/lib/session';
import path from 'path';
import fs from 'fs/promises';

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
            LEFT JOIN trading_accounts a ON o.accountId = a.id
            LEFT JOIN trading_setups s ON o.setupId = s.id
            WHERE 1=1
        `;
        const params = [];

        if (accountId) {
            query += ` AND o.accountId = ?`;
            params.push(accountId);
        }

        query += ` ORDER BY o.date DESC, o.id DESC LIMIT ?`;
        params.push(limit);

        const operations = db.prepare(query).all(...params);
        return NextResponse.json(operations);
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
        
        const {
            accountId, date, symbol, side, sesion, setupId,
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

        // Validación cruzada de Setup Dirección si existe el setupId
        if (setupId) {
            const setupObj = db.prepare('SELECT direction FROM trading_setups WHERE id = ?').get(setupId);
            if (setupObj && setupObj.direction !== side.toUpperCase()) {
                return NextResponse.json({ 
                    error: `Conflicto de Dirección: El Setup seleccionado es exclusivamente para ${setupObj.direction}, pero intentas registrar una operación ${side.toUpperCase()}` 
                }, { status: 400 });
            }
        }

        // Calcular Result Type y RR ajustado a puro PNL Bruto 
        let resultType = parsedPnl > 0 ? 'GANADA' : (parsedPnl < 0 ? 'PERDIDA' : 'BREAK_EVEN');
        let rr = parsedRiesgo > 0 ? (parsedPnl / parsedRiesgo) : 0;

        const stmt = db.prepare(`
            INSERT INTO trading_operations (
                accountId, setupId, date, symbol, side, sesion,
                pnl, riesgoAmount, comision, resultR, resultType, notes, imageUrl, contratos
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const info = stmt.run(
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
            resultType,
            notes || null,
            imageUrl || null,
            parsedContratos
        );

        if (parsedComision > 0) {
            db.prepare(`
                INSERT INTO trading_commissions (accountId, operationId, date, amount, description)
                VALUES (?, ?, ?, ?, ?)
            `).run(accountId || null, info.lastInsertRowid, date, parsedComision, 'Comisión de operación');
        }

        return NextResponse.json({ success: true, id: info.lastInsertRowid }, { status: 201 });
    } catch (error) {
        console.error("POST Operations:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
