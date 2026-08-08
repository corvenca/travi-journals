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
        const accountIdRaw = searchParams.get('accountId');
        const startDate = searchParams.get('startDate') || '2020-01-01';
        const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];

        console.log('\n=== REPORTES DEBUG ===');
        console.log('accountId recibido:', accountIdRaw);

        try {
            const colsResult = await pool.query("SELECT column_name as name FROM information_schema.columns WHERE table_name = 'trading_operations'");
            console.log('Columnas reales de trading_operations:', colsResult.rows.map(c => c.name));

            const totalOpsResult = await pool.query('SELECT COUNT(*) as total FROM trading_operations');
            console.log('Total operaciones en BD:', totalOpsResult.rows[0].total);

            if (accountIdRaw && accountIdRaw !== 'undefined' && accountIdRaw !== 'null') {
                try {
                    const opsAccountResult = await pool.query('SELECT COUNT(*) as total FROM trading_operations WHERE account_id = $1', [parseInt(accountIdRaw, 10)]);
                    console.log('Operaciones para accountId', accountIdRaw, ':', opsAccountResult.rows[0].total);
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

        const accountInfoResult = await pool.query('SELECT initial_capital FROM trading_accounts WHERE id = $1', [accountId]);
        const accountInfo = accountInfoResult.rows[0];
        const initialCapital = accountInfo?.initial_capital || 0;

        let dateFilter = '';
        const params = [accountId];

        if (startDate) {
            params.push(startDate);
            dateFilter += ` AND date >= $${params.length}`;
        }
        if (endDate) {
            params.push(endDate);
            dateFilter += ` AND date <= $${params.length}`;
        }

        const operationsResult = await pool.query(`
            SELECT id, date, pnl, comision, result_r, result_type, account_id, setup_id, symbol, sesion, side, contratos, riesgo_amount, image_url
            FROM trading_operations
            WHERE account_id = $1 ${dateFilter}
            ORDER BY date ASC
        `, params);
        const operations = operationsResult.rows.map(row => ({
            ...row,
            resultR: row.result_r !== undefined ? row.result_r : row.resultR,
            resultType: row.result_type !== undefined ? row.result_type : row.resultType,
            setupId: row.setup_id !== undefined ? row.setup_id : row.setupId,
            accountId: row.account_id !== undefined ? row.account_id : row.accountId,
            riesgoAmount: row.riesgo_amount !== undefined ? row.riesgo_amount : row.riesgoAmount,
            imageUrl: row.image_url !== undefined ? row.image_url : row.imageUrl
        }));

        const commsDbResult = await pool.query(`
            SELECT amount FROM trading_commissions
            WHERE account_id = $1 ${dateFilter}
        `, params);
        const commsDb = commsDbResult.rows;
        let totalCommissionsDb = 0;
        commsDb.forEach(c => totalCommissionsDb += c.amount);

        console.log(`REPORTES - Operaciones encontradas para cuenta ${accountId}:`, operations.length);

        const allSetupsResult = await pool.query('SELECT id, name, direction FROM trading_setups');
        const allSetups = allSetupsResult.rows;
        const setupsMap = {};
        allSetups.forEach(s => setupsMap[s.id] = s);

        const report = {
            general: {
                initialCapital,
                currentEquity: initialCapital,
                totalPnl: 0, 
                pnlNeto: 0, 
                thisMonthPnl: 0,
                winRate: 0,
                totalTrades: operations.length,
                winningTrades: 0,
                losingTrades: 0,
                breakEvenTrades: 0,
                commissions: totalCommissionsDb,
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
            
            const setupObj = setupsMap[op.setupId];
            const setupName = setupObj ? setupObj.name : 'Sin Setup';
            const setupDirection = setupObj ? setupObj.direction : (op.side || '-');
            
            const enrichedOp = {
                ...op,
                setupName,
                setupDirection,
                commission: comisionRef,
            };
            report.rawOperations.push(enrichedOp);

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
            dailyPnls[op.date] += pnlNeto;

            const aggregate = (targetObject, key, label) => {
                const safeKey = key || 'Sin Especificar';
                if (!targetObject[safeKey]) {
                    targetObject[safeKey] = {
                        key: safeKey,
                        label: label || safeKey,
                        trades: 0,
                        wins: 0,
                        losses: 0,
                        pnl: 0, 
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

                stat.currentEquity += pnlNeto;
                if (stat.currentEquity > stat.maxPeak) stat.maxPeak = stat.currentEquity;
                const dd = stat.maxPeak - stat.currentEquity;
                if (dd > stat.maxDD) stat.maxDD = dd;
            };

            aggregate(report.bySetup, op.setupId || 'NO_SETUP', setupName);
            report.bySetup[op.setupId || 'NO_SETUP'].direction = setupDirection;

            aggregate(report.byInstrument, op.symbol, op.symbol);

            aggregate(report.bySession, op.sesion, op.sesion);

            aggregate(report.byDirection, op.side, op.side);
        });

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
