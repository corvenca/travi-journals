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
        const startDate = searchParams.get('startDate') || '2020-01-01';
        const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];

        console.log('\n=== REPORTES DEBUG ===');
        console.log('accountId recibido:', accountIdRaw);

        try {
            const cols = db.prepare("PRAGMA table_info(trading_operations)").all();
            console.log('Columnas reales de trading_operations:', cols.map(c => c.name));

            const totalOps = db.prepare('SELECT COUNT(*) as total FROM trading_operations').get();
            console.log('Total operaciones en BD:', totalOps.total);

            if (accountIdRaw && accountIdRaw !== 'undefined' && accountIdRaw !== 'null') {
                try {
                    // Try with accountId (as defined in our local schema)
                    const opsAccount = db.prepare('SELECT COUNT(*) as total FROM trading_operations WHERE accountId = CAST(? AS INTEGER)').get(accountIdRaw);
                    console.log('Operaciones para accountId', accountIdRaw, ':', opsAccount.total);
                } catch (errCol) {
                    console.log('Error intentando COUNT con accountId:', errCol.message);
                }
            }
        } catch (e) {
            console.error('Error en bloque DEBUG:', e);
        }
        console.log('======================\n');

        if (!accountIdRaw || accountIdRaw === 'undefined' || accountIdRaw === 'null') {
            console.warn('REPORTES - accountId inválido detectado');
            return NextResponse.json({ error: 'El accountId es requerido' }, { status: 400 });
        }

        const accountId = parseInt(accountIdRaw, 10);

        const accountInfo = db.prepare('SELECT initialCapital FROM trading_accounts WHERE id = ?').get(accountId);
        const initialCapital = accountInfo?.initialCapital || 0;

        let dateFilter = '';
        const params = [accountId];

        if (startDate) {
            dateFilter += ` AND date >= ?`;
            params.push(startDate);
        }
        if (endDate) {
            dateFilter += ` AND date <= ?`;
            params.push(endDate);
        }

        const operations = db.prepare(`
            SELECT id, date, pnl, comision, resultR, resultType, accountId, setupId, symbol, sesion, side, contratos, riesgoAmount, imageUrl
            FROM trading_operations
            WHERE accountId = ? ${dateFilter}
            ORDER BY date ASC
        `).all(...params);

        const commsDb = db.prepare(`
            SELECT amount FROM trading_commissions
            WHERE accountId = ? ${dateFilter}
        `).all(...params);
        let totalCommissionsDb = 0;
        commsDb.forEach(c => totalCommissionsDb += c.amount);

        console.log(`REPORTES - Operaciones encontradas para cuenta ${accountId}:`, operations.length);

        const allSetups = db.prepare('SELECT id, name, direction FROM trading_setups').all();
        const setupsMap = {};
        allSetups.forEach(s => setupsMap[s.id] = s);

        const report = {
            general: {
                initialCapital,
                currentEquity: initialCapital,
                totalPnl: 0, // Bruto
                pnlNeto: 0, // Neto
                thisMonthPnl: 0,
                winRate: 0,
                totalTrades: operations.length,
                winningTrades: 0,
                losingTrades: 0,
                breakEvenTrades: 0,
                commissions: totalCommissionsDb, // DB Real
                daysOperated: 0,
                winDays: 0,
                loseDays: 0,
                bestDay: 0,
                worstDay: 0,
                avgDailyPnl: 0,
                avgRR: 0,
                bestTrade: null,
                worstTrade: null
            },
            rawOperations: [],
            bySetup: {},
            byInstrument: {},
            bySession: {},
            byDirection: {}
        };

        const todayStr = new Date().toISOString().split('T')[0];
        const thisMonthStr = todayStr.substring(0, 7);

        const dailyPnls = {};
        let winningTradesGlobal = 0;
        let globalRR = 0;

        operations.forEach(op => {
            const grossPnl = op.pnl || 0;
            const comisionRef = op.comision || 0;
            const pnlNeto = grossPnl - comisionRef;
            const rr = op.resultR || 0;
            
            // Raw
            const setupObj = setupsMap[op.setupId];
            const setupName = setupObj ? setupObj.name : 'Sin Setup';
            const setupDirection = setupObj ? setupObj.direction : (op.side || '-');
            
            const enrichedOp = {
                ...op,
                setupName,
                setupDirection,
                commission: comisionRef,
                // pnl represents gross for legacy references but explicitly we keep op.pnl as gross
            };
            report.rawOperations.push(enrichedOp);

            // --- GENERAL ---
            report.general.totalPnl += grossPnl;
            globalRR += rr;
            if (op.date && op.date.substring(0, 7) === thisMonthStr) report.general.thisMonthPnl += grossPnl;
            
            const isWin = grossPnl > 0;
            const isLoss = grossPnl < 0;
            if (isWin) report.general.winningTrades++;
            else if (isLoss) report.general.losingTrades++;
            else report.general.breakEvenTrades++;

            if (!report.general.bestTrade || grossPnl > (report.general.bestTrade.pnl)) report.general.bestTrade = enrichedOp;
            if (!report.general.worstTrade || grossPnl < (report.general.worstTrade.pnl)) report.general.worstTrade = enrichedOp;

            if (isWin) winningTradesGlobal++;

            if (!dailyPnls[op.date]) dailyPnls[op.date] = 0;
            dailyPnls[op.date] += pnlNeto; // curva y days based on net

            // --- AGGREGATION HELPER ---
            const aggregate = (targetObject, key, label) => {
                const safeKey = key || 'Sin Especificar';
                if (!targetObject[safeKey]) {
                    targetObject[safeKey] = {
                        key: safeKey,
                        label: label || safeKey,
                        trades: 0,
                        wins: 0,
                        losses: 0,
                        pnl: 0, // gross
                        comisiones: 0,
                        pnlNeto: 0,
                        rrSum: 0,
                        currentEquity: 0,
                        maxPeak: 0,
                        maxDD: 0,
                        direction: op.side || '-'
                    };
                }
                const stat = targetObject[safeKey];
                stat.trades++;
                stat.pnl += grossPnl;
                stat.comisiones += comisionRef;
                stat.pnlNeto += pnlNeto;
                stat.rrSum += rr;
                if (isWin) stat.wins++;
                else if (isLoss) stat.losses++;

                // Drawdown Track on Net
                stat.currentEquity += pnlNeto;
                if (stat.currentEquity > stat.maxPeak) stat.maxPeak = stat.currentEquity;
                const dd = stat.maxPeak - stat.currentEquity;
                if (dd > stat.maxDD) stat.maxDD = dd;
            };

            // By Setup
            aggregate(report.bySetup, op.setupId || 'NO_SETUP', setupName);
            report.bySetup[op.setupId || 'NO_SETUP'].direction = setupDirection;

            // By Instrument
            aggregate(report.byInstrument, op.symbol, op.symbol);

            // By Session
            aggregate(report.bySession, op.sesion, op.sesion);

            // By Direction
            aggregate(report.byDirection, op.side, op.side);
        });

        // Computed Global Metrics
        report.general.pnlNeto = report.general.totalPnl - report.general.commissions;
        report.general.currentEquity = initialCapital + report.general.pnlNeto;
        if (report.general.totalTrades > 0) {
            report.general.winRate = (report.general.winningTrades / report.general.totalTrades) * 100;
            report.general.avgRR = globalRR / report.general.totalTrades;
        }

        const dailyKeys = Object.keys(dailyPnls);
        report.general.daysOperated = dailyKeys.length;
        
        dailyKeys.forEach(date => {
            const dpnl = dailyPnls[date];
            if (dpnl > 0) report.general.winDays++;
            else if (dpnl < 0) report.general.loseDays++;

            if (dpnl > report.general.bestDay) report.general.bestDay = dpnl;
            if (dpnl < report.general.worstDay) report.general.worstDay = dpnl;
        });

        if (dailyKeys.length > 0) {
            report.general.avgDailyPnl = report.general.totalPnl / dailyKeys.length;
        }

        // Finalize Arrays and Winrate for Sub-reports
        const finalizeArray = (obj) => {
            return Object.values(obj).map(item => ({
                ...item,
                winRate: item.trades > 0 ? (item.wins / item.trades) * 100 : 0,
                avgRR: item.trades > 0 ? item.rrSum / item.trades : 0
            })).sort((a, b) => b.pnl - a.pnl);
        };

        const finalReport = {
            general: report.general,
            rawOperations: report.rawOperations,
            bySetup: finalizeArray(report.bySetup),
            byInstrument: finalizeArray(report.byInstrument),
            bySession: finalizeArray(report.bySession),
            byDirection: finalizeArray(report.byDirection)
        };

        return NextResponse.json(finalReport);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
