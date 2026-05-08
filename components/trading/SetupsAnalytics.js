import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ReferenceLine } from 'recharts';
import styles from '@/app/trading/dashboard/page.module.css';

export default function SetupsAnalytics({ data = [], hideSummary = false }) {
    const [selectedSetupId, setSelectedSetupId] = useState(null);

    useEffect(() => {
        if (data && data.length > 0 && !selectedSetupId) {
            setSelectedSetupId(data[0].id);
        }
    }, [data, selectedSetupId]);

    if (!data || data.length === 0) {
        return (
            <div className={styles.splitCard}>
                <h3 style={{ marginBottom: '1.5rem' }}>Análisis de Setups</h3>
                <div style={{ color: 'var(--text-muted)' }}>No hay suficientes datos registrados para analizar tus estrategias operativas.</div>
            </div>
        );
    }

    const activeSetups = data.length;
    let betterSetup = null;
    let profitableCount = 0;
    let losingCount = 0;

    data.forEach(s => {
        if (s.isProfitable) profitableCount++;
        else losingCount++;

        if (!betterSetup || s.totalPnl > betterSetup.totalPnl) {
            betterSetup = s;
        }
    });

    const selectedSetup = data.find(s => s.id === selectedSetupId) || data[0];

    const pieData = [
        { name: 'Ganadas', value: selectedSetup.winningTrades, color: 'var(--success)' },
        { name: 'Pérdidas', value: selectedSetup.losingTrades, color: 'var(--danger)' },
        { name: 'Break Even', value: selectedSetup.breakEvenTrades, color: 'var(--warning, #eab308)' }
    ].filter(d => d.value > 0);

    const isSetupProfitable = selectedSetup.totalPnl >= 0;
    const curveColor = isSetupProfitable ? '#3b82f6' : '#ef4444';

    return (
        <div style={{ marginTop: '2rem' }}>
            <h2 className={styles.title} style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Análisis de Setups</h2>
            
            {/* 4 Summary Cards */}
            {!hideSummary && (
                <div className={styles.statsGrid} style={{ marginBottom: '1.5rem' }}>
                    <div className={styles.statCard}>
                        <h3 style={{ fontSize: '0.85rem' }}>Setups Activos</h3>
                        <div className={styles.statValue}>{activeSetups}</div>
                    </div>
                    <div className={styles.statCard}>
                        <h3 style={{ fontSize: '0.85rem' }}>Mejor Setup</h3>
                        <div className={styles.statValue} style={{ fontSize: '1.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {betterSetup ? betterSetup.name : '-'}
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <h3 style={{ fontSize: '0.85rem' }}>Rentables</h3>
                        <div className={`${styles.statValue} ${styles.positive}`}>{profitableCount}</div>
                    </div>
                    <div className={styles.statCard}>
                        <h3 style={{ fontSize: '0.85rem' }}>Con Pérdida</h3>
                        <div className={`${styles.statValue} ${styles.negative}`}>{losingCount}</div>
                    </div>
                </div>
            )}

            <div className={styles.splitCard}>
                {/* Selector */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <h3 style={{ margin: 0 }}>Rendimiento Detallado</h3>
                    <select 
                        value={selectedSetupId || ''} 
                        onChange={(e) => setSelectedSetupId(parseInt(e.target.value, 10))}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            background: 'var(--bg-secondary)',
                            color: 'var(--white)',
                            border: '1px solid var(--border-color)',
                            outline: 'none',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        {data.map(s => (
                            <option key={s.id} value={s.id}>{s.name} ({s.direction})</option>
                        ))}
                    </select>
                </div>

                {/* Main Content Grid for Selected Setup */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {/* Setup Metrics Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
                        <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>PNL Total</div>
                            <div className={isSetupProfitable ? styles.positiveText : styles.negativeText} style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>
                                ${selectedSetup.totalPnl.toFixed(2)}
                            </div>
                        </div>
                        <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Trades</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--white)' }}>{selectedSetup.trades}</div>
                        </div>
                        <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Win Rate</div>
                            <div className={selectedSetup.winRate >= 50 ? styles.positiveText : styles.negativeText} style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>
                                {selectedSetup.winRate.toFixed(1)}%
                            </div>
                        </div>
                        <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>RR Prom</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--white)' }}>
                                {selectedSetup.avgRR.toFixed(2)}
                            </div>
                        </div>
                        <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Max DD</div>
                            <div className={styles.negativeText} style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>
                                ${selectedSetup.maxDD.toFixed(2)}
                            </div>
                        </div>
                    </div>

                    {/* Chart Container (Pie + Area) */}
                    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                        
                        {/* Pie Chart Section */}
                        <div style={{ flex: '1', minWidth: '250px', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem', alignSelf: 'flex-start' }}>Resultados</h4>
                            {pieData.length > 0 ? (
                                <div style={{ width: '100%', height: '200px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart accessibilityLayer={false}>
                                            <Pie
                                                data={pieData}
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontWeight: 'bold' }}
                                                itemStyle={{ color: '#f8fafc' }}
                                                formatter={(val) => [`${val} trades`, 'Cantidad']}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Sin datos</div>
                            )}
                            
                            {/* Legends */}
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                                {pieData.map((d, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--white)' }}>
                                        <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: d.color }}></div>
                                        {d.name} ({d.value})
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Area Chart Section */}
                        <div style={{ flex: '2', minWidth: '350px', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
                            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Evolución de Equity (Desempeño Aislado)</h4>
                            <div style={{ width: '100%', height: '230px' }}>
                                {selectedSetup.curve && selectedSetup.curve.length > 1 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={selectedSetup.curve} margin={{ top: 5, right: 0, left: -20, bottom: 0 }} accessibilityLayer={false}>
                                            <defs>
                                                <linearGradient id="setupColorEquity" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={curveColor} stopOpacity={0.4}/>
                                                    <stop offset="95%" stopColor={curveColor} stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="curveKey" stroke="#64748b" tick={{fontSize: 10}} minTickGap={20} />
                                            <YAxis domain={['auto', 'auto']} stroke="#64748b" tick={{fontSize: 10}} tickFormatter={(val) => `$${val}`} />
                                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                            <ReferenceLine y={0} stroke="rgba(255, 255, 255, 0.4)" strokeDasharray="4 4" />
                                            <Tooltip 
                                                contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px'}}
                                                itemStyle={{color: '#f8fafc', fontWeight: 'bold'}}
                                                formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Equity Acumulado']}
                                                labelFormatter={(label) => `Trace: ${label}`}
                                            />
                                            <Area 
                                                type="monotone" 
                                                dataKey="equity" 
                                                stroke={curveColor} 
                                                strokeWidth={3} 
                                                fillOpacity={1} 
                                                fill="url(#setupColorEquity)" 
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                        Mínimo 2 operaciones para dibujar la curva
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
