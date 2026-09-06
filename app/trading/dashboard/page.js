'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, Plus, LayoutList, TrendingUp, TrendingDown, BarChart2, ShieldCheck, Rocket, Activity, Target } from 'lucide-react';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Scatter } from 'recharts';
import { useActiveAccount } from '@/components/trading/AccountContext';
import SetupManagerModal from '@/components/trading/SetupManagerModal';
import SetupsAnalytics from '@/components/trading/SetupsAnalytics';
import styles from './page.module.css';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const d = payload[0]?.payload
    return (
      <div style={{ background: '#0d1f14', border: '0.5px solid #1a3a24', borderRadius: '8px', padding: '10px 14px', fontSize: '12px' }}>
        <div style={{ color: '#9FE1CB', marginBottom: '4px' }}>{label}</div>
        <div style={{ color: d?.netProfit >= 0 ? '#1D9E75' : '#E24B4A', fontWeight: '500', fontSize: '14px' }}>
          PNL Acumulado: {d?.netProfit >= 0 ? '+' : ''}${d?.netProfit?.toFixed(2)}
        </div>
        {d?.pnl !== undefined && (
          <div style={{ color: d?.pnl >= 0 ? '#1D9E75' : '#E24B4A', marginTop: '4px' }}>
            Esta operación: {d?.pnl >= 0 ? '+' : ''}${d?.pnl?.toFixed(2)}
          </div>
        )}
      </div>
    )
  }
  return null
}

const CustomDot = (props) => {
  const { cx, cy, payload } = props
  if (!payload) return null
  const isPeak = payload.isPeak
  const isValley = payload.isValley
  const color = payload.netProfit >= 0 ? '#3b82f6' : '#E24B4A'
  const size = isPeak || isValley ? 6 : 3
  return <circle cx={cx} cy={cy} r={size} fill={color} stroke={isPeak || isValley ? '#fff' : color} strokeWidth={isPeak || isValley ? 1.5 : 0} />
}

export default function TradingDashboard() {
    const router = useRouter();
    const { activeAccount, isLoaded } = useActiveAccount();
    
    const [userName, setUserName] = useState('');
    const [plan, setPlan] = useState('free');
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [range, setRange] = useState('ALL');
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const [filterType, setFilterType] = useState(''); // 'mes' | 'año' | 'rango'
    const [selectedMonth, setSelectedMonth] = useState('');
    const [selectedYear, setSelectedYear] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [showSetupModal, setShowSetupModal] = useState(false);
    const [analysis, setAnalysis] = useState(null);
    const [analysisFilter, setAnalysisFilter] = useState('all');
    const [analysisFilterValue, setAnalysisFilterValue] = useState('');
    const [sideFilter, setSideFilter] = useState('ALL');

    useEffect(() => {
      if (!activeAccount) return;
      fetch(`/api/trading/analysis?accountId=${activeAccount.id}&filterType=${analysisFilter}&filterValue=${analysisFilterValue}`)
        .then(r => r.json())
        .then(data => setAnalysis(data))
        .catch(() => {});
    }, [activeAccount, analysisFilter, analysisFilterValue]);

    useEffect(() => {
      fetch('/api/auth/me')
        .then(r => r.json())
        .then(data => { 
          if (data.nombre) setUserName(data.nombre);
          setPlan(data.plan || 'free');
        })
        .catch(() => {})
    }, [])

    useEffect(() => {
        if (!isLoaded) return;
        if (!activeAccount) {
            router.push('/trading');
            return;
        }

        setLoading(true);
        fetch(`/api/trading/dashboard?accountId=${activeAccount.id}&range=${range}`)
            .then(res => res.json())
            .then(data => {
                setMetrics(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [activeAccount, isLoaded, range]);

    // Helper functions for Win Rate bar
    const winRate = metrics?.winRate || 0;
    const wrColor = winRate >= 50 ? 'var(--success)' : winRate > 30 ? 'var(--warning, #eab308)' : 'var(--danger)';

    // Days actively traded
    const totalTradedDays = metrics?.consistency ? (metrics.consistency.winDays + metrics.consistency.loseDays) : 0;

    const availableMonths = metrics?.availableMonths || [];
    const availableYears = metrics?.availableYears || [];

    // Preparar datos con picos y valles marcados
    const preparedCurve = (metrics?.equityCurve || []).map((point, i, arr) => {
      const netProfit = (point.equity || 0) - (metrics?.initialCapital || 0)
      const prevNet = arr[i - 1] ? ((arr[i-1].equity || 0) - (metrics?.initialCapital || 0)) : netProfit
      const nextNet = arr[i + 1] ? ((arr[i+1].equity || 0) - (metrics?.initialCapital || 0)) : netProfit
      const isPeak = netProfit > prevNet && netProfit > nextNet
      const isValley = netProfit < prevNet && netProfit < nextNet
      return {
        ...point,
        netProfit,
        isPeak,
        isValley
      }
    })

    const isPositive = (metrics?.pnlNeto || 0) >= 0
    const curveColor = isPositive ? '#3b82f6' : '#E24B4A'
    const curveGradient = isPositive ? 'url(#gradPositivo)' : 'url(#gradNegativo)'

    if (!isLoaded) return <div className={styles.loading}>Iniciando entorno...</div>;
    if (!metrics && loading) return <div className={styles.loading}>Cargando dashboard...</div>;
    if (!activeAccount) return null;

    return (
        <div className={styles.dashboardContainer}>
            {plan === 'free' && (
              <div style={{ background: '#0f2e1a', border: '1px solid #1D9E75', borderRadius: '8px', padding: '10px 16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#9FE1CB' }}>Plan Free — {40 - (metrics?.totalTrades || 0)} operaciones restantes</span>
                <a href="https://app.travitrade.com/registro?plan=pro" style={{ fontSize: '12px', color: '#1D9E75', fontWeight: '500', textDecoration: 'none' }}>Actualizar a Pro →</a>
              </div>
            )}
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Dashboard de {activeAccount.name}</h1>
                    {userName && (
                      <div style={{
                        background: '#0d1f14',
                        border: '0.5px solid #1a3a24',
                        borderRadius: '8px',
                        padding: '10px 16px',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        marginTop: '12px'
                      }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#0f2e1a', border: '0.5px solid #1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: '#1D9E75', fontWeight: '500', flexShrink: 0 }}>
                          {userName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', color: 'rgba(159,225,203,0.5)', marginBottom: '1px' }}>Bienvenido de vuelta</div>
                          <div style={{ fontSize: '15px', fontWeight: '500', color: '#fff' }}>{userName}</div>
                        </div>
                      </div>
                    )}
                    <p className={styles.subtitle}>Resumen de tu rendimiento y consistencia.</p>
                </div>
            </header>

            {/* FILA 1: TARJETAS PRINCIPALES */}
            <div className={styles.statsGrid}>
                {/* 1. PNL BRUTO */}
                <div className={styles.statCard} style={{ borderTop: `2px solid ${metrics?.totalPnl >= 0 ? '#1D9E75' : '#E24B4A'}` }}>
                  <h3 className={styles.statLabelGreen}>PNL BRUTO</h3>
                  <div style={{ fontSize: '26px', fontWeight: '500', marginBottom: '4px', color: metrics?.totalPnl >= 0 ? '#1D9E75' : '#E24B4A' }}>
                    {metrics?.totalPnl >= 0 ? '+' : '-'}${Math.abs(metrics?.totalPnl || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}
                  </div>
                  <div className={styles.statSubText}>Resultado sin gastos</div>
                </div>

                {/* 2. TOTAL COMISIONES */}
                <div className={styles.statCard}>
                    <div className={styles.statHeader}>
                        <h3>Comisiones Pagadas</h3>
                        <BarChart2 size={18} color="var(--text-muted)" />
                    </div>
                    <div className={`${styles.statValue} ${styles.negative}`}>
                        -${metrics?.commissions?.total?.toLocaleString('en-US', {minimumFractionDigits: 2}) || '0.00'}
                    </div>
                    <div className={styles.statSub}>Costos operativos</div>
                </div>

                {/* 3. PNL NETO */}
                <div className={styles.statCard} style={{ borderTop: `2px solid ${metrics?.pnlNeto >= 0 ? '#1D9E75' : '#E24B4A'}` }}>
                  <h3 className={styles.statLabelGreen}>PNL NETO</h3>
                  <div style={{ fontSize: '26px', fontWeight: '500', marginBottom: '4px', color: metrics?.pnlNeto >= 0 ? '#1D9E75' : '#E24B4A' }}>
                    {metrics?.pnlNeto >= 0 ? '+' : '-'}${Math.abs(metrics?.pnlNeto || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}
                  </div>
                  <div className={styles.statSubText}>Ganancia real</div>
                </div>

                {/* 4. EQUITY ACTUAL */}
                <div className={styles.statCard}>
                    <div className={styles.statHeader}>
                        <h3>Equity Actual</h3>
                        <ShieldCheck size={18} color="var(--text-muted)" />
                    </div>
                    <div className={styles.statValue}>
                        ${metrics?.currentEquity?.toLocaleString('en-US', {minimumFractionDigits: 2}) || '0.00'}
                    </div>
                    <div className={styles.statSub}>Capital: ${metrics?.initialCapital?.toLocaleString('en-US', {minimumFractionDigits: 2}) || '0.00'}</div>
                </div>
            </div>

            {/* FILA 2: EQUITY CURVE */}
            <div className={styles.equityCard}>
                <div className={styles.chartHeader}>
                    <div>
                        <h3>Curva de Equity (Cierre Diario) / Neto</h3>
                        <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem'}}>
                            {totalTradedDays} días • {metrics?.totalTrades || 0} trades
                        </div>
                    </div>
                    <div className={styles.chartFilters}>
                        <div style={{ position: 'relative' }}>
                          <button
                            type="button"
                            onClick={() => setShowFilterPanel(!showFilterPanel)}
                            style={{
                              padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '500',
                              background: showFilterPanel || range !== 'ALL' ? '#1D9E75' : '#0d1f14',
                              border: `1px solid ${showFilterPanel || range !== 'ALL' ? '#1D9E75' : '#1a3a24'}`,
                              color: '#fff', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: '8px',
                              letterSpacing: '0.3px'
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <path d="M1 3h12M3 7h8M5 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                            Filtrar
                            {range !== 'ALL' && <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '4px', padding: '1px 6px', fontSize: '11px' }}>{range}</span>}
                          </button>

                          {showFilterPanel && (
                            <div style={{
                              position: 'absolute', top: '44px', right: 0, zIndex: 200,
                              background: '#0d1f14',
                              border: '1px solid #1a3a24',
                              borderRadius: '12px', padding: '20px', minWidth: '300px',
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <span style={{ fontSize: '13px', fontWeight: '500', color: '#fff' }}>Filtrar período</span>
                                <button type="button" onClick={() => setShowFilterPanel(false)}
                                  style={{ background: 'transparent', border: 'none', color: 'rgba(159,225,203,0.5)', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}>×</button>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
                                {['mes', 'año', 'rango'].map(t => (
                                  <button key={t} type="button" onClick={() => setFilterType(t)}
                                    style={{
                                      padding: '10px 8px', borderRadius: '8px', fontSize: '12px', fontWeight: '500',
                                      background: filterType === t ? '#0f2a1a' : '#0a1a0f',
                                      border: `1px solid ${filterType === t ? '#1D9E75' : '#1a3a24'}`,
                                      color: filterType === t ? '#1D9E75' : 'rgba(159,225,203,0.6)', cursor: 'pointer',
                                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px'
                                    }}
                                  >
                                    <span style={{ fontSize: '16px' }}>{t === 'mes' ? '📅' : t === 'año' ? '📆' : '📊'}</span>
                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                  </button>
                                ))}
                              </div>

                              {filterType === 'mes' && (
                                <div>
                                  <div style={{ fontSize: '11px', color: 'rgba(159,225,203,0.4)', letterSpacing: '1px', marginBottom: '10px' }}>MESES CON OPERACIONES</div>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {availableMonths.map(m => (
                                      <span key={m.value} onClick={() => { setSelectedMonth(m.value); setRange(m.value); setShowFilterPanel(false) }}
                                        style={{
                                          padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
                                          background: selectedMonth === m.value ? '#1D9E75' : '#0a1a0f',
                                          color: selectedMonth === m.value ? '#fff' : '#9FE1CB',
                                          border: `0.5px solid ${selectedMonth === m.value ? '#1D9E75' : '#1a3a24'}`
                                        }}
                                      >{m.label}</span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {filterType === 'año' && (
                                <div>
                                  <div style={{ fontSize: '11px', color: 'rgba(159,225,203,0.4)', letterSpacing: '1px', marginBottom: '10px' }}>AÑOS CON OPERACIONES</div>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {availableYears.map(y => (
                                      <span key={y} onClick={() => { setSelectedYear(y); setRange(`YEAR_${y}`); setShowFilterPanel(false) }}
                                        style={{
                                          padding: '8px 18px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer',
                                          background: selectedYear === y ? '#1D9E75' : '#0a1a0f',
                                          color: selectedYear === y ? '#fff' : '#9FE1CB',
                                          border: `0.5px solid ${selectedYear === y ? '#1D9E75' : '#1a3a24'}`
                                        }}
                                      >{y}</span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {filterType === 'rango' && (
                                <div>
                                  <div style={{ fontSize: '11px', color: 'rgba(159,225,203,0.4)', letterSpacing: '1px', marginBottom: '10px' }}>RANGO PERSONALIZADO</div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div>
                                      <div style={{ fontSize: '11px', color: 'rgba(159,225,203,0.5)', marginBottom: '4px' }}>Desde</div>
                                      <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                                        style={{ width: '100%', background: '#0a1a0f', border: '0.5px solid #1a3a24', borderRadius: '6px', padding: '8px 10px', color: '#9FE1CB', fontSize: '13px' }}
                                      />
                                    </div>
                                    <div>
                                      <div style={{ fontSize: '11px', color: 'rgba(159,225,203,0.5)', marginBottom: '4px' }}>Hasta</div>
                                      <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                                        style={{ width: '100%', background: '#0a1a0f', border: '0.5px solid #1a3a24', borderRadius: '6px', padding: '8px 10px', color: '#9FE1CB', fontSize: '13px' }}
                                      />
                                    </div>
                                    <button type="button"
                                      onClick={() => { setRange(`RANGE_${dateFrom}_${dateTo}`); setShowFilterPanel(false) }}
                                      disabled={!dateFrom || !dateTo}
                                      style={{
                                        background: '#1D9E75', border: 'none', borderRadius: '8px', padding: '10px',
                                        color: '#fff', fontSize: '13px', fontWeight: '500', cursor: 'pointer', marginTop: '4px'
                                      }}
                                    >
                                      Aplicar rango
                                    </button>
                                  </div>
                                </div>
                              )}

                              <div style={{ borderTop: '0.5px solid #1a3a24', marginTop: '16px', paddingTop: '12px' }}>
                                <button type="button"
                                  onClick={() => { setRange('ALL'); setFilterType(''); setSelectedMonth(''); setSelectedYear(''); setDateFrom(''); setDateTo(''); setShowFilterPanel(false) }}
                                  style={{ width: '100%', background: 'transparent', border: '0.5px solid #1a3a24', borderRadius: '8px', padding: '8px', color: 'rgba(159,225,203,0.5)', fontSize: '12px', cursor: 'pointer' }}
                                >
                                  Limpiar filtro → Ver todo
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                    </div>
                </div>
                
                <div className={styles.chartContainer}>
                    {metrics?.equityCurve?.length > 1 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={preparedCurve} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="gradPositivo" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="gradNegativo" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#E24B4A" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#E24B4A" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1a3a24" vertical={false} />
                            <XAxis dataKey="curveKey" stroke="#1a3a24" tick={{ fontSize: 10, fill: 'rgba(159,225,203,0.5)' }} minTickGap={30} />
                            <YAxis stroke="#1a3a24" tick={{ fontSize: 11, fill: 'rgba(159,225,203,0.5)' }} tickFormatter={(v) => v >= 0 ? '+$' + v.toFixed(0) : '-$' + Math.abs(v).toFixed(0)} />
                            <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                              type="monotone"
                              dataKey="netProfit"
                              stroke="none"
                              fill={curveGradient}
                              fillOpacity={1}
                              activeDot={false}
                              dot={false}
                              baseLine={0}
                            />
                            <Line
                              type="monotone"
                              dataKey="netProfit"
                              stroke={curveColor}
                              strokeWidth={2}
                              dot={<CustomDot />}
                              activeDot={{ r: 5, fill: curveColor }}
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)'}}>
                            No hay operaciones suficientes para construir la curva
                        </div>
                    )}
                </div>
            </div>

            {/* FILA 3: CONSISTENCIA & TOP SETUPS */}
            <div className={styles.rowThreeGrid}>
                {/* Consistencia Premium */}
                <div className={styles.splitCard}>
                    <div className={styles.consistencyHeader}>
                        <div className={styles.consistencyIconBase}>
                            <ShieldCheck size={22} />
                        </div>
                        <h3 style={{margin: 0}}>Consistencia</h3>
                    </div>
                    
                    <div className={styles.consistencyGrid}>
                        {/* Win Rate Row */}
                        <div className={styles.consRow}>
                            <div style={{width: '100%'}}>
                                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '4px'}}>
                                    <div className={styles.consRowLeft}>
                                        <div className={styles.consRowIcon} style={{color: wrColor}}>
                                            <Target size={18} />
                                        </div>
                                        <span className={styles.consTitle}>Win Rate Total</span>
                                    </div>
                                    <span className={styles.consValue} style={{color: wrColor}}>
                                        {winRate.toFixed(1)}%
                                    </span>
                                </div>
                                <div className={styles.consWinRateContainer}>
                                    <div className={styles.consWinRateBar}>
                                        <div className={styles.consWinRateFill} style={{width: `${winRate}%`, backgroundColor: wrColor}}></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Días Ganadores */}
                        <div className={styles.consRow}>
                            <div className={styles.consRowLeft}>
                                <div className={styles.consRowIcon} style={{color: 'var(--success)'}}>
                                    <TrendingUp size={18} />
                                </div>
                                <span className={styles.consTitle}>Días Ganadores</span>
                            </div>
                            <span className={`${styles.consValue} ${styles.positive} ${styles.glowGreen}`}>
                                {metrics?.consistency?.winDays || 0}
                            </span>
                        </div>

                        {/* Días Perdedores */}
                        <div className={styles.consRow}>
                            <div className={styles.consRowLeft}>
                                <div className={styles.consRowIcon} style={{color: 'var(--danger)'}}>
                                    <TrendingDown size={18} />
                                </div>
                                <span className={styles.consTitle}>Días Perdedores</span>
                            </div>
                            <span className={`${styles.consValue} ${styles.negative} ${styles.glowRed}`}>
                                {metrics?.consistency?.loseDays || 0}
                            </span>
                        </div>

                        <div className={styles.consRow}>
                          <div className={styles.consRowLeft}>
                            <div className={styles.consRowIcon} style={{color: '#F59E0B'}}>
                              <Target size={18} />
                            </div>
                            <span className={styles.consTitle}>Break Even</span>
                          </div>
                          <span className={styles.consValue} style={{color: '#F59E0B'}}>
                            {metrics?.breakEvenTrades || 0}
                          </span>
                        </div>

                        {/* Promedio Diario */}
                        <div className={styles.consRow}>
                            <div className={styles.consRowLeft}>
                                <div className={styles.consRowIcon} style={{color: metrics?.consistency?.avgDailyPnl >= 0 ? 'var(--success)' : 'var(--danger)'}}>
                                    <Activity size={18} />
                                </div>
                                <span className={styles.consTitle}>Promedio Diario</span>
                            </div>
                            <span className={`${styles.consValue} ${metrics?.consistency?.avgDailyPnl >= 0 ? styles.positive : styles.negative}`}>
                                ${metrics?.consistency?.avgDailyPnl?.toFixed(2) || '0.00'}
                            </span>
                        </div>

                        {/* Mejor Día */}
                        <div className={styles.consRow}>
                            <div className={styles.consRowLeft}>
                                <div className={styles.consRowIcon} style={{color: 'var(--success)'}}>
                                    <Rocket size={18} />
                                </div>
                                <span className={styles.consTitle}>Mejor Día</span>
                            </div>
                            <span className={`${styles.consValue} ${styles.positive}`}>
                                ${metrics?.consistency?.bestDay?.toFixed(2) || '0.00'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Top Setups */}
                <div className={styles.splitCard}>
                    <h3>Top Setups</h3>
                    <ul className={styles.setupList}>
                        {(!metrics?.topSetups || metrics.topSetups.length === 0) && (
                            <li style={{color: 'var(--text-muted)'}}>No hay setups en el top.</li>
                        )}
                        {metrics?.topSetups?.map((setup) => (
                            <li key={setup.id} className={styles.setupItem}>
                                <div className={styles.setupInfo}>
                                    <div>
                                        <div style={{fontWeight: 'bold', color: 'var(--white)'}}>{setup.name}</div>
                                        <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>{setup.trades} trades</div>
                                    </div>
                                </div>
                                <span className={setup.totalPnl >= 0 ? styles.positive : styles.negative}>
                                    ${setup.totalPnl?.toFixed(2)}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* FILA 3.5: ESTADISTICAS DE COMISIONES */}
            {metrics?.commissions?.count > 0 && (
                <div className={styles.splitCard} style={{ gridColumn: '1 / -1', marginBottom: '1.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem' }}>
                    <div className={styles.consistencyHeader} style={{ marginBottom: '1.2rem' }}>
                        <div className={styles.consistencyIconBase} style={{ background: '#3f3f46', color: '#a1a1aa' }}>
                            <Activity size={22} />
                        </div>
                        <h3 style={{margin: 0}}>Análisis de Comisiones</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Pagado</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--danger)', marginTop: '0.5rem' }}>
                                -${metrics.commissions.total.toLocaleString('en-US', {minimumFractionDigits: 2})}
                            </div>
                        </div>
                        <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Comisiones del Mes</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
                                -${metrics.commissions.thisMonth.toLocaleString('en-US', {minimumFractionDigits: 2})}
                            </div>
                        </div>
                        <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Promedio por Costo</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
                                -${((metrics.commissions.total / metrics.commissions.count) || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}
                            </div>
                        </div>
                        <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Comisión Más Alta</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
                                -${metrics.commissions.highest.toLocaleString('en-US', {minimumFractionDigits: 2})}
                            </div>
                        </div>
                        <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Impacto en Beneficio Neto</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--warning, #eab308)', marginTop: '0.5rem' }}>
                                {metrics.commissions.impactPct.toFixed(1)}%
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* FILA 4: ACCIONES RAPIDAS */}
            <div className={styles.actionsGrid}>
                <button type="button" className={styles.actionBtn} onClick={(e) => { e.preventDefault(); router.push('/trading/operations', { scroll: false }); }}>
                    <Plus size={20} color="#3b82f6" /> Nueva Operación
                </button>
                <button type="button" className={styles.actionBtn} onClick={(e) => { e.preventDefault(); setShowSetupModal(true); }}>
                    <Settings size={20} color="#d4af37" /> Gestionar Setups
                </button>
                <button type="button" className={styles.actionBtn} onClick={(e) => { e.preventDefault(); router.push('/trading/operations', { scroll: false }); }}>
                    <LayoutList size={20} color="#8b5cf6" /> Ver Bitácora
                </button>
            </div>

            {/* FILA 5: ANALISIS DE SETUPS */}
            {plan !== 'free' && <SetupsAnalytics data={metrics?.setupAnalysis} hideSummary={true} />}
            {plan === 'free' && (
              <div style={{ background: '#0d1f14', border: '0.5px solid #1a3a24', borderRadius: '10px', padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '13px', color: 'rgba(159,225,203,0.5)', marginBottom: '8px' }}>🔒 Análisis de Setups disponible en Plan Pro</div>
                <a href="https://app.travitrade.com/registro?plan=pro" style={{ color: '#1D9E75', fontSize: '12px' }}>Actualizar a Pro →</a>
              </div>
            )}

            {/* ANÁLISIS POR TIPO DE ENTRADA */}
            <div style={{ background: '#0d1f14', border: '0.5px solid #1a3a24', borderRadius: '12px', padding: '20px', marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#fff' }}>Análisis por Tipo de Entrada</div>
                  <div style={{ fontSize: '11px', color: 'rgba(159,225,203,0.5)', marginTop: '2px' }}>Clasificado por dirección y rendimiento</div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {/* Filtro por dirección */}
                  {['ALL', 'LONG', 'SHORT'].map(s => (
                    <button key={s} onClick={() => setSideFilter(s)}
                      style={{ padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '500', cursor: 'pointer',
                        border: `0.5px solid ${sideFilter === s ? (s === 'LONG' ? '#1D9E75' : s === 'SHORT' ? '#E24B4A' : '#9FE1CB') : '#1a3a24'}`,
                        background: sideFilter === s ? (s === 'LONG' ? '#0f2e1a' : s === 'SHORT' ? '#2a1010' : '#0d1f14') : 'transparent',
                        color: sideFilter === s ? (s === 'LONG' ? '#1D9E75' : s === 'SHORT' ? '#E24B4A' : '#9FE1CB') : 'rgba(159,225,203,0.5)'
                      }}>
                      {s === 'ALL' ? 'Todas' : s === 'LONG' ? '↑ Compra' : '↓ Venta'}
                    </button>
                  ))}

                  {/* Filtro por periodo */}
                  <select value={analysisFilter} onChange={e => { setAnalysisFilter(e.target.value); setAnalysisFilterValue('') }}
                    style={{ background: '#0a1a0f', border: '0.5px solid #1a3a24', borderRadius: '8px', padding: '5px 10px', color: '#9FE1CB', fontSize: '12px' }}>
                    <option value="all">Todo el tiempo</option>
                    <option value="month">Por mes</option>
                    <option value="week">Por semana</option>
                  </select>

                  {analysisFilter === 'month' && (
                    <select value={analysisFilterValue} onChange={e => setAnalysisFilterValue(e.target.value)}
                      style={{ background: '#0a1a0f', border: '0.5px solid #1a3a24', borderRadius: '8px', padding: '5px 10px', color: '#9FE1CB', fontSize: '12px' }}>
                      <option value="">Selecciona mes</option>
                      {analysis?.availableMonths?.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  )}

                  {analysisFilter === 'week' && (
                    <select value={analysisFilterValue} onChange={e => setAnalysisFilterValue(e.target.value)}
                      style={{ background: '#0a1a0f', border: '0.5px solid #1a3a24', borderRadius: '8px', padding: '5px 10px', color: '#9FE1CB', fontSize: '12px' }}>
                      <option value="">Selecciona semana</option>
                      {analysis?.availableWeeks?.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                    </select>
                  )}

                  {(sideFilter !== 'ALL' || analysisFilter !== 'all' || analysisFilterValue !== '') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSideFilter('ALL');
                        setAnalysisFilter('all');
                        setAnalysisFilterValue('');
                      }}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        border: '0.5px solid #1a3a24',
                        background: '#0a1a0f',
                        color: '#E24B4A',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.15s ease'
                      }}
                      title="Restaurar todos los filtros de esta sección"
                    >
                      ✕ Limpiar filtro
                    </button>
                  )}
                </div>
              </div>

              {/* Resumen por dirección (Clickable Filters) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                {(analysis?.byDirection || []).map(dir => {
                  const winRate = dir.total > 0 ? ((dir.wins / dir.total) * 100).toFixed(1) : 0
                  const isLong = dir.side === 'LONG'
                  const pnlVal = parseFloat(dir.total_pnl || 0)
                  const formattedPnl = pnlVal >= 0 ? `+$${pnlVal.toFixed(2)}` : `-$${Math.abs(pnlVal).toFixed(2)}`
                  const isSelected = sideFilter === dir.side

                  return (
                    <div
                      key={dir.side}
                      onClick={() => setSideFilter(isSelected ? 'ALL' : dir.side)}
                      style={{
                        background: isSelected ? (isLong ? '#0f2e1a' : '#2a1010') : '#0a1a0f',
                        borderLeft: isSelected ? `1.5px solid ${isLong ? '#1D9E75' : '#E24B4A'}` : `0.5px solid ${isLong ? 'rgba(29,158,117,0.3)' : 'rgba(226,75,74,0.3)'}`,
                        borderRight: isSelected ? `1.5px solid ${isLong ? '#1D9E75' : '#E24B4A'}` : `0.5px solid ${isLong ? 'rgba(29,158,117,0.3)' : 'rgba(226,75,74,0.3)'}`,
                        borderBottom: isSelected ? `1.5px solid ${isLong ? '#1D9E75' : '#E24B4A'}` : `0.5px solid ${isLong ? 'rgba(29,158,117,0.3)' : 'rgba(226,75,74,0.3)'}`,
                        borderTop: `3px solid ${isLong ? '#1D9E75' : '#E24B4A'}`,
                        borderRadius: '10px',
                        padding: '12px 14px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? `0 0 12px ${isLong ? 'rgba(29,158,117,0.2)' : 'rgba(226,75,74,0.2)'}` : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: isLong ? '#1D9E75' : '#E24B4A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {isLong ? '↑ COMPRA (LONG)' : '↓ VENTA (SHORT)'}
                          {isSelected && <span style={{ fontSize: '9px', background: isLong ? '#1D9E75' : '#E24B4A', color: '#fff', padding: '1px 5px', borderRadius: '4px' }}>FILTRADO</span>}
                        </span>
                        <span style={{ fontSize: '16px', fontWeight: '600', color: '#fff' }}>{winRate}%</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '6px' }}>
                        {[
                          { label: 'ENTRADAS', value: dir.total, color: '#fff' },
                          { label: 'GANADAS', value: dir.wins, color: '#1D9E75' },
                          { label: 'PERDIDAS', value: dir.losses, color: '#E24B4A' },
                          { label: 'BE', value: dir.be, color: '#F59E0B' },
                        ].map(stat => (
                          <div key={stat.label} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '8px', color: 'rgba(159,225,203,0.4)', letterSpacing: '0.5px', marginBottom: '2px' }}>{stat.label}</div>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: stat.color }}>{stat.value}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '0.5px solid #1a3a24', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '10px', color: 'rgba(159,225,203,0.5)' }}>PNL Total</span>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: pnlVal >= 0 ? '#1D9E75' : '#E24B4A' }}>
                          {formattedPnl}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Tabla compacta por setup y dirección (Fits screen without horizontal scroll) */}
              <div style={{ width: '100%' }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 3px', fontSize: '11px', tableLayout: 'auto' }}>
                  <thead>
                    <tr>
                      {[
                        { label: 'SETUP', align: 'left' },
                        { label: 'DIRECCIÓN', align: 'left' },
                        { label: 'TIPO', align: 'center' },
                        { label: 'ENTRADAS', align: 'center' },
                        { label: 'GANADAS', align: 'center' },
                        { label: 'PERDIDAS', align: 'center' },
                        { label: 'BE', align: 'center' },
                        { label: 'WIN RATE', align: 'right' },
                        { label: 'PNL', align: 'right' },
                      ].map(col => (
                        <th key={col.label} style={{
                          padding: '8px 8px',
                          textAlign: col.align,
                          color: 'rgba(159,225,203,0.4)',
                          fontSize: '9px',
                          letterSpacing: '0.5px',
                          fontWeight: '600',
                          whiteSpace: 'nowrap',
                          borderBottom: '1px solid #1a3a24'
                        }}>
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(analysis?.bySetupDirection || [])
                      .filter(s => sideFilter === 'ALL' || s.side === sideFilter)
                      .sort((a, b) => parseInt(b.total) - parseInt(a.total))
                      .map((s, i) => {
                        const wr = s.total > 0 ? ((s.wins / s.total) * 100).toFixed(1) : 0
                        const pnlVal = parseFloat(s.total_pnl || 0)
                        const formattedPnl = pnlVal >= 0 ? `+$${pnlVal.toFixed(2)}` : `-$${Math.abs(pnlVal).toFixed(2)}`
                        const setupColor = s.setup_color || (s.setup_name ? '#1D9E75' : 'rgba(159,225,203,0.3)')

                        return (
                          <tr key={i} style={{ background: '#0a1a0f' }}>
                            <td style={{
                              padding: '8px 8px',
                              borderLeft: '1px solid #1a3a24',
                              borderTop: '1px solid #1a3a24',
                              borderBottom: '1px solid #1a3a24',
                              borderTopLeftRadius: '6px',
                              borderBottomLeftRadius: '6px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: setupColor, flexShrink: 0 }} />
                                <span style={{ color: s.setup_name ? '#fff' : 'rgba(159,225,203,0.5)', fontWeight: '500', fontSize: '11px', lineHeight: '1.3', wordBreak: 'break-word' }}>
                                  {s.setup_name || 'Sin setup'}
                                </span>
                              </div>
                            </td>
                            <td style={{
                              padding: '8px 6px',
                              borderTop: '1px solid #1a3a24',
                              borderBottom: '1px solid #1a3a24',
                              whiteSpace: 'nowrap'
                            }}>
                              <span style={{
                                fontSize: '10px',
                                fontWeight: '600',
                                color: s.setup_direction === 'LONG' ? '#1D9E75' : s.setup_direction === 'SHORT' ? '#E24B4A' : '#F59E0B'
                              }}>
                                {s.setup_direction || '—'}
                              </span>
                            </td>
                            <td style={{
                              padding: '8px 6px',
                              textAlign: 'center',
                              borderTop: '1px solid #1a3a24',
                              borderBottom: '1px solid #1a3a24',
                              whiteSpace: 'nowrap'
                            }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '2px 7px',
                                borderRadius: '12px',
                                fontSize: '10px',
                                fontWeight: '500',
                                whiteSpace: 'nowrap',
                                background: s.side === 'LONG' ? 'rgba(29,158,117,0.15)' : 'rgba(226,75,74,0.15)',
                                color: s.side === 'LONG' ? '#1D9E75' : '#E24B4A',
                                border: `0.5px solid ${s.side === 'LONG' ? '#1D9E75' : '#E24B4A'}`
                              }}>
                                {s.side === 'LONG' ? '↑ Compra' : '↓ Venta'}
                              </span>
                            </td>
                            <td style={{
                              padding: '8px 6px',
                              textAlign: 'center',
                              color: '#fff',
                              fontWeight: '600',
                              fontSize: '11px',
                              borderTop: '1px solid #1a3a24',
                              borderBottom: '1px solid #1a3a24'
                            }}>
                              {s.total}
                            </td>
                            <td style={{
                              padding: '8px 6px',
                              textAlign: 'center',
                              color: '#1D9E75',
                              fontWeight: '500',
                              fontSize: '11px',
                              borderTop: '1px solid #1a3a24',
                              borderBottom: '1px solid #1a3a24'
                            }}>
                              {s.wins}
                            </td>
                            <td style={{
                              padding: '8px 6px',
                              textAlign: 'center',
                              color: '#E24B4A',
                              fontWeight: '500',
                              fontSize: '11px',
                              borderTop: '1px solid #1a3a24',
                              borderBottom: '1px solid #1a3a24'
                            }}>
                              {s.losses}
                            </td>
                            <td style={{
                              padding: '8px 6px',
                              textAlign: 'center',
                              color: '#F59E0B',
                              fontWeight: '500',
                              fontSize: '11px',
                              borderTop: '1px solid #1a3a24',
                              borderBottom: '1px solid #1a3a24'
                            }}>
                              {s.be}
                            </td>
                            <td style={{
                              padding: '8px 8px',
                              textAlign: 'right',
                              whiteSpace: 'nowrap',
                              borderTop: '1px solid #1a3a24',
                              borderBottom: '1px solid #1a3a24'
                            }}>
                              <span style={{ color: parseFloat(wr) >= 50 ? '#1D9E75' : '#E24B4A', fontWeight: '600', fontSize: '11px' }}>
                                {wr}%
                              </span>
                            </td>
                            <td style={{
                              padding: '8px 8px',
                              textAlign: 'right',
                              whiteSpace: 'nowrap',
                              borderRight: '1px solid #1a3a24',
                              borderTop: '1px solid #1a3a24',
                              borderBottom: '1px solid #1a3a24',
                              borderTopRightRadius: '6px',
                              borderBottomRightRadius: '6px'
                            }}>
                              <span style={{ color: pnlVal >= 0 ? '#1D9E75' : '#E24B4A', fontWeight: '600', fontSize: '11px' }}>
                                {formattedPnl}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* GLOBAL MODALS */}
            {showSetupModal && (
                <SetupManagerModal onClose={() => setShowSetupModal(false)} />
            )}
        </div>
    );
}
