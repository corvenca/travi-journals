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
        const accountId = searchParams.get('accountId');
        const range = searchParams.get('range') || 'ALL';
        const dateFrom = searchParams.get('dateFrom');
        const dateTo = searchParams.get('dateTo');

        if (!accountId) {
            return NextResponse.json({ error: 'El accountId es requerido' }, { status: 400 });
        }

        const accountInfoResult = await pool.query('SELECT initial_capital FROM trading_accounts WHERE id = $1', [accountId]);
        const accountInfo = accountInfoResult.rows[0];
        const initialCapital = accountInfo?.initialCapital || 0;

        let dateFilter = '';
        if (range && range.startsWith('RANGE_')) {
            const parts = range.split('_');
            dateFilter = `AND date >= '${parts[1]}' AND date <= '${parts[2]}'`;
        } else if (range && range.startsWith('YEAR_')) {
            const year = range.split('_')[1];
            dateFilter = `AND substring(date, 1, 4) = '${year}'`;
        } else if (range && range.match(/^\d{4}-\d{2}$/)) {
            dateFilter = `AND substring(date, 1, 7) = '${range}'`;
        } else if (range === '7D') {
            dateFilter = "AND date >= (CURRENT_DATE - INTERVAL '7 days')::text";
        } else if (range === '30D') {
            dateFilter = "AND date >= (CURRENT_DATE - INTERVAL '30 days')::text";
        } else if (range === '90D') {
            dateFilter = "AND date >= (CURRENT_DATE - INTERVAL '90 days')::text";
        } else if (range === 'YTD') {
            dateFilter = "AND substring(date, 1, 4) = substring(CURRENT_DATE::text, 1, 4)";
        }

        const targetAccount = parseInt(accountId, 10);

        const monthsQueryResult = await pool.query(`
          SELECT DISTINCT substring(date, 1, 7) as value,
          substring(date, 6, 2) || '/' || substring(date, 1, 4) as label
          FROM trading_operations WHERE account_id = $1
          ORDER BY value DESC
        `, [targetAccount]);
        const monthsQuery = monthsQueryResult.rows;

        const yearsQueryResult = await pool.query(`
          SELECT DISTINCT substring(date, 1, 4) as year
          FROM trading_operations WHERE account_id = $1
          ORDER BY year DESC
        `, [targetAccount]);
        const yearsQuery = yearsQueryResult.rows;

        const operationsResult = await pool.query(`
            SELECT id, date, pnl, comision, result_r, result_type, account_id, setup_id
            FROM trading_operations
            WHERE account_id = $1 ${dateFilter}
            ORDER BY date ASC
        `, [targetAccount]);
        const operations = operationsResult.rows;

        const commsDbResult = await pool.query(`
            SELECT amount, date FROM trading_commissions
            WHERE account_id = $1 ${dateFilter}
        `, [targetAccount]);
        const commsDb = commsDbResult.rows;

        const metrics = {
            initialCapital,
            currentEquity: initialCapital,
            availableMonths: monthsQuery.map(m => ({ value: m.value, label: m.label })),
            availableYears: yearsQuery.map(y => y.year),
            todayPnl: 0,
            thisMonthPnl: 0,
            totalPnl: 0,
            grossPnl: 0,
            pnlNeto: 0,
            commissions: {
                total: 0,
                thisMonth: 0,
                highest: 0,
                count: 0,
                impactPct: 0
            },
            winRate: 0,
            totalTrades: operations.length,
            winningTrades: 0,
            losingTrades: 0,
            breakEvenTrades: 0,
            bestTrade: 0,
            worstTrade: 0,
            equityCurve: [],
            topSetups: [],
            setupAnalysis: [],
            consistency: {
                winDays: 0,
                loseDays: 0,
                breakEvens: 0,
                bestDay: 0,
                worstDay: 0,
                avgDailyPnl: 0
            }
        };

        const todayStr = new Date().toISOString().split('T')[0];
        const thisMonthStr = todayStr.substring(0, 7);

        commsDb.forEach(c => {
            metrics.commissions.total += c.amount;
            metrics.commissions.count++;
            if (c.amount > metrics.commissions.highest) metrics.commissions.highest = c.amount;
            if (c.date && c.date.substring(0, 7) === thisMonthStr) {
                metrics.commissions.thisMonth += c.amount;
            }
        });

        const setupsMap = {};
        const allSetupsResult = await pool.query('SELECT id, name, direction FROM trading_setups');
        allSetupsResult.rows.forEach(s => {
            setupsMap[s.id] = {
                id: s.id,
                name: s.name,
                direction: s.direction,
                trades: 0,
                totalPnl: 0,
                totalCommissions: 0,
                pnlNeto: 0,
                winningTrades: 0,
                losingTrades: 0,
                breakEvenTrades: 0,
                rrSum: 0,
                curve: [{ curveKey: 'Inicio', equity: 0, pnl: 0 }],
                currentEquity: 0,
                maxPeak: 0,
                maxDD: 0
            };
        });

        const dailyPnls = {};
        let cumulativePnl = 0;
        const groupedPnls = {};
        let tradeCounter = 1;

        for (const op of operations) {
            const gross = op.pnl || 0;
            const comRef = op.comision || 0; 
            const net = gross - comRef;

            metrics.totalPnl += gross;
            metrics.grossPnl += gross;
            cumulativePnl += net;

            if (op.date === todayStr) {
                metrics.todayPnl += gross;
            }
            if (op.date && op.date.substring(0, 7) === thisMonthStr) {
                metrics.thisMonthPnl += gross;
            }

            if (gross > metrics.bestTrade) metrics.bestTrade = gross;
            if (gross < metrics.worstTrade) metrics.worstTrade = gross;

            if (op.resultType === 'GANADA') metrics.winningTrades++;
            else if (op.resultType === 'PERDIDA') metrics.losingTrades++;
            else if (op.resultType === 'BREAK_EVEN') metrics.breakEvenTrades++;
            else {
              if (gross > 0) metrics.winningTrades++;
              else if (gross < 0) metrics.losingTrades++;
              else metrics.breakEvenTrades++;
            }

            let curveGroupingKey = '';

            if (range === '7D' || range === '30D' || range === '90D') {
                const d = new Date(op.date + 'T00:00:00');
                const day = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0');
                curveGroupingKey = `${day}/${month}`;
            } else if (range === 'YTD') {
                const d = new Date(op.date + 'T00:00:00');
                const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
                curveGroupingKey = months[d.getMonth()];
            } else {
                const d = new Date(op.date + 'T00:00:00');
                const day = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const year = String(d.getFullYear()).slice(2);
                curveGroupingKey = `${day}/${month}/${year}`;
            }

            if (!groupedPnls[curveGroupingKey]) groupedPnls[curveGroupingKey] = 0;
            groupedPnls[curveGroupingKey] += net;

            if (op.setupId && setupsMap[op.setupId]) {
                const s = setupsMap[op.setupId];
                s.trades++;
                s.totalPnl += gross;
                s.totalCommissions += comRef;
                s.pnlNeto += net;
                
                if (op.resultType === 'GANADA') s.winningTrades++;
                else if (op.resultType === 'PERDIDA') s.losingTrades++;
                else if (op.resultType === 'BREAK_EVEN') s.breakEvenTrades++;
                else {
                    if (gross > 0) s.winningTrades++;
                    else if (gross < 0) s.losingTrades++;
                    else s.breakEvenTrades++;
                }
                
                s.rrSum += (op.resultR || 0);
                s.currentEquity += net;
                
                if (s.currentEquity > s.maxPeak) {
                    s.maxPeak = s.currentEquity;
                }
                const drawDown = s.maxPeak - s.currentEquity;
                if (drawDown > s.maxDD) {
                    s.maxDD = drawDown;
                }

                s.curve.push({
                    curveKey: `${op.date} (#${s.trades})`,
                    equity: s.currentEquity,
                    pnl: net
                });
            }

            if (!dailyPnls[op.date]) dailyPnls[op.date] = 0;
            dailyPnls[op.date] += net;
            tradeCounter++;
        }

        metrics.equityCurve = [{
            curveKey: 'Inicio',
            equity: initialCapital,
            pnl: 0,
        }];

        let runningEquity = initialCapital;
        const sortedGroups = Object.keys(groupedPnls).sort();
        sortedGroups.forEach(k => {
            runningEquity += groupedPnls[k];
            metrics.equityCurve.push({
                curveKey: k,
                equity: runningEquity,
                pnl: groupedPnls[k]
            });
        });

        metrics.pnlNeto = metrics.totalPnl - metrics.commissions.total;
        metrics.currentEquity = initialCapital + metrics.pnlNeto;
        const unassignedCommissions = metrics.commissions.total - (metrics.grossPnl - cumulativePnl);
        if (unassignedCommissions > 0) {
           metrics.currentEquity -= unassignedCommissions;
           const lastPunt = metrics.equityCurve[metrics.equityCurve.length - 1];
           if (lastPunt && unassignedCommissions !== 0) {
                metrics.equityCurve.push({ curveKey: 'Ajuste Com.', equity: metrics.currentEquity, pnl: -unassignedCommissions });
           }
        }
        
        if (metrics.totalTrades > 0) {
            metrics.winRate = (metrics.winningTrades / metrics.totalTrades) * 100;
        }

        if (metrics.totalPnl !== 0) {
            metrics.commissions.impactPct = (metrics.commissions.total / Math.abs(metrics.totalPnl)) * 100;
        } else if (metrics.commissions.total > 0) {
            metrics.commissions.impactPct = 100;
        }

        const dailyKeys = Object.keys(dailyPnls);
        let totalDailyPnlSum = 0;
        
        dailyKeys.forEach(date => {
            const dpnl = dailyPnls[date];
            totalDailyPnlSum += dpnl;
            if (dpnl > 0) metrics.consistency.winDays++;
            else if (dpnl < 0) metrics.consistency.loseDays++;
            else metrics.consistency.breakEvens++;

            if (dpnl > metrics.consistency.bestDay) metrics.consistency.bestDay = dpnl;
            if (dpnl < metrics.consistency.worstDay) metrics.consistency.worstDay = dpnl;
        });

        if (dailyKeys.length > 0) {
            metrics.consistency.avgDailyPnl = totalDailyPnlSum / dailyKeys.length;
        }

        const setupsArray = Object.values(setupsMap)
            .filter(s => s.trades > 0)
            .map(s => {
                const winRate = s.trades > 0 ? (s.winningTrades / s.trades) * 100 : 0;
                const avgRR = s.trades > 0 ? s.rrSum / s.trades : 0;
                
                return {
                    ...s,
                    winRate,
                    avgRR,
                    isProfitable: s.totalPnl >= 0
                };
            });

        setupsArray.sort((a, b) => b.totalPnl - a.totalPnl);

        metrics.setupAnalysis = setupsArray;
        metrics.topSetups = metrics.setupAnalysis.slice(0, 5);

        return NextResponse.json(metrics);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
