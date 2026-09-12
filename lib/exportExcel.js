import * as XLSX from 'xlsx'

export function exportToExcel({ account, operations, stats }) {
  const wb = XLSX.utils.book_new()

  // ─── HOJA 1: RESUMEN ───────────────────────────────────────
  const resumenData = [
    ['TRAVI JOURNALS — REPORTE DE TRADING'],
    [],
    ['INFORMACIÓN DE LA CUENTA'],
    ['Cuenta', account.name],
    ['Broker', account.broker || '—'],
    ['Tipo', account.type || 'REAL'],
    ['Capital Inicial', `$${parseFloat(account.initial_capital || 0).toFixed(2)}`],
    ['Trader', account.trader_name || '—'],
    ['Email', account.trader_email || '—'],
    [],
    ['ESTADÍSTICAS GENERALES'],
    ['Total Operaciones', stats.total],
    ['Operaciones Ganadas', stats.wins],
    ['Operaciones Perdidas', stats.losses],
    ['Break Even', stats.be],
    ['Win Rate', `${stats.winRate}%`],
    ['PNL Total', `$${parseFloat(stats.total_pnl || 0).toFixed(2)}`],
    ['Comisiones Totales', `$${parseFloat(stats.total_comision || 0).toFixed(2)}`],
    ['PNL Neto', `$${(parseFloat(stats.total_pnl || 0) - parseFloat(stats.total_comision || 0)).toFixed(2)}`],
    ['Mejor Trade', `$${parseFloat(stats.best_trade || 0).toFixed(2)}`],
    ['Peor Trade', `$${parseFloat(stats.worst_trade || 0).toFixed(2)}`],
    ['Promedio por Trade', `$${parseFloat(stats.avg_pnl || 0).toFixed(2)}`],
  ]

  const wsResumen = XLSX.utils.aoa_to_sheet(resumenData)
  wsResumen['!cols'] = [{ wch: 25 }, { wch: 30 }]
  wsResumen['A1'] = { v: 'TRAVI JOURNALS — REPORTE DE TRADING', t: 's' }
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')

  // ─── HOJA 2: OPERACIONES ───────────────────────────────────
  const headers = [
    'ID', 'Fecha', 'Símbolo', 'Dirección', 'Sesión/Hora',
    'Setup', 'Dir. Setup', 'Contratos', 'PNL ($)',
    'Riesgo ($)', 'Comisión ($)', 'R:R', 'Resultado',
    'Notas', 'Imagen/Captura'
  ]

  const rows = operations.map(op => [
    op.id,
    op.date,
    op.symbol,
    op.side,
    op.sesion || '—',
    op.setup_name || 'Sin setup',
    op.setup_direction || '—',
    op.contratos || 1,
    parseFloat(op.pnl || 0).toFixed(2),
    parseFloat(op.riesgo_amount || 0).toFixed(2),
    parseFloat(op.comision || 0).toFixed(2),
    parseFloat(op.result_r || 0).toFixed(2),
    op.result_type === 'GANADA' ? 'GANADA ✓' : op.result_type === 'PERDIDA' ? 'PERDIDA ✗' : 'BREAK EVEN —',
    op.notes || '',
    op.image_url || ''
  ])

  const wsOps = XLSX.utils.aoa_to_sheet([headers, ...rows])

  // Anchos de columnas
  wsOps['!cols'] = [
    { wch: 6 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
    { wch: 30 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
    { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 14 },
    { wch: 30 }, { wch: 50 }
  ]

  XLSX.utils.book_append_sheet(wb, wsOps, 'Operaciones')

  // ─── HOJA 3: ANÁLISIS POR SETUP ────────────────────────────
  const setupMap = {}
  operations.forEach(op => {
    const key = op.setup_name || 'Sin setup'
    if (!setupMap[key]) {
      setupMap[key] = { name: key, direction: op.setup_direction || '—', total: 0, wins: 0, losses: 0, be: 0, pnl: 0 }
    }
    setupMap[key].total++
    setupMap[key].pnl += parseFloat(op.pnl || 0)
    if (op.result_type === 'GANADA') setupMap[key].wins++
    else if (op.result_type === 'PERDIDA') setupMap[key].losses++
    else setupMap[key].be++
  })

  const setupHeaders = ['Setup', 'Dirección', 'Total', 'Ganadas', 'Perdidas', 'BE', 'Win Rate', 'PNL Total']
  const setupRows = Object.values(setupMap)
    .sort((a, b) => b.pnl - a.pnl)
    .map(s => [
      s.name,
      s.direction,
      s.total,
      s.wins,
      s.losses,
      s.be,
      `${s.total > 0 ? ((s.wins / s.total) * 100).toFixed(1) : 0}%`,
      `$${s.pnl.toFixed(2)}`
    ])

  const wsSetups = XLSX.utils.aoa_to_sheet([setupHeaders, ...setupRows])
  wsSetups['!cols'] = [{ wch: 35 }, { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, wsSetups, 'Análisis por Setup')

  // ─── HOJA 4: ANÁLISIS POR DÍA ──────────────────────────────
  const dayMap = {}
  operations.forEach(op => {
    const day = op.date
    if (!dayMap[day]) dayMap[day] = { date: day, total: 0, wins: 0, losses: 0, be: 0, pnl: 0 }
    dayMap[day].total++
    dayMap[day].pnl += parseFloat(op.pnl || 0)
    if (op.result_type === 'GANADA') dayMap[day].wins++
    else if (op.result_type === 'PERDIDA') dayMap[day].losses++
    else dayMap[day].be++
  })

  const dayHeaders = ['Fecha', 'Operaciones', 'Ganadas', 'Perdidas', 'BE', 'Win Rate', 'PNL del Día']
  const dayRows = Object.values(dayMap)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(d => [
      d.date,
      d.total,
      d.wins,
      d.losses,
      d.be,
      `${d.total > 0 ? ((d.wins / d.total) * 100).toFixed(1) : 0}%`,
      `$${d.pnl.toFixed(2)}`
    ])

  const wsDays = XLSX.utils.aoa_to_sheet([dayHeaders, ...dayRows])
  wsDays['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(wb, wsDays, 'Análisis por Día')

  // ─── EXPORTAR ───────────────────────────────────────────────
  const fileName = `TraviJournals_${account.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`
  XLSX.writeFile(wb, fileName)
}
