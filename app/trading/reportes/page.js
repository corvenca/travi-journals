'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useActiveAccount } from '@/components/trading/AccountContext';
import { Download, Filter, X, Calendar as CalIcon } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, ComposedChart, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import styles from './page.module.css';

const PIE_COLORS = ['#00d4aa', '#3b82f6', '#a855f7', '#f59e0b', '#ec4899', '#14b8a6', '#f97316'];

const formatPnl = (valor) => {
    if (valor === undefined || valor === null || Number.isNaN(Number(valor))) return '-';
    const abs = Math.abs(valor).toFixed(2);
    return valor >= 0 ? `$${abs}` : `-$${abs}`;
};

export default function ReportesDashboard() {
    const router = useRouter();
    const { activeAccount, isLoaded } = useActiveAccount();
    
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);
    
    const [startDate, setStartDate] = useState('2020-01-01');
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

    const [showPdfModal, setShowPdfModal] = useState(false);
    const [pdfMonth, setPdfMonth] = useState(() => {
        const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const refs = {
        equity: useRef(null),
        pnl: useRef(null),
        setupComposed: useRef(null),
        setupPie: useRef(null),
        instrumentComposed: useRef(null),
        instrumentPie: useRef(null),
        directionComposed: useRef(null),
        directionPie: useRef(null),
        sessionComposed: useRef(null),
        sessionPie: useRef(null)
    };

    const [chartData, setChartData] = useState({ equity: [], pnl: [], setupLines: [] });
    const [setupKeys, setSetupKeys] = useState([]);

    const [error, setError] = useState(null);

    useEffect(() => {
        if (!isLoaded) return;
        if (!activeAccount) {
            router.push('/trading');
            return;
        }
        const defaultStart = '2020-01-01';
        const defaultEnd = new Date().toISOString().split('T')[0];
        setStartDate(defaultStart);
        setEndDate(defaultEnd);
        fetchReport(defaultStart, defaultEnd);
    }, [activeAccount, isLoaded]);

    const fetchReport = async (overrideStart, overrideEnd) => {
        if (!activeAccount || !activeAccount.id) {
            setError("No hay una cuenta activa seleccionada.");
            setLoading(false);
            return;
        }

        console.log('Frontend enviando accountId:', activeAccount.id, 'Tipo:', typeof activeAccount.id);
        
        setLoading(true);
        setError(null);
        try {
            const start = typeof overrideStart === 'string' ? overrideStart : startDate;
            const end = typeof overrideEnd === 'string' ? overrideEnd : endDate;

            let url = `/api/trading/reportes?accountId=${activeAccount.id}`;
            if (start) url += `&startDate=${start}`;
            if (end) url += `&endDate=${end}`;
            
            const res = await fetch(url);
            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(data.error || 'Error al obtener reportes');
            }
            
            if (!data || !data.rawOperations || data.rawOperations.length === 0) {
                setReportData(data); // Para que al menos limpie si habia algo
                setError("No se encontraron operaciones para los filtros seleccionados.");
            } else {
                setReportData(data);
            }
        } catch (error) {
            console.error("Fetch Report Error:", error);
            setError(error.message || "Error al conectar con el servidor.");
        } finally {
            setLoading(false);
        }
    };

    const handleClearFilters = () => {
        const defaultStart = '2020-01-01';
        const defaultEnd = new Date().toISOString().split('T')[0];
        setStartDate(defaultStart);
        setEndDate(defaultEnd);
        fetchReport(defaultStart, defaultEnd);
    };

    const captureToPdf = async (ref, doc, x, y, widthTarget) => {
        if (!ref.current) return 0;
        try {
            const canvas = await html2canvas(ref.current, { scale: 2, backgroundColor: '#0d1117' });
            const imgData = canvas.toDataURL('image/png');
            const imgProps = doc.getImageProperties(imgData);
            const imgHeight = (imgProps.height * widthTarget) / imgProps.width;
            doc.addImage(imgData, 'PNG', x, y, widthTarget, imgHeight);
            return imgHeight;
        } catch (err) {
            console.warn(err);
            doc.setFontSize(10);
            doc.setTextColor(200, 50, 50);
            doc.text("Graph Error", x, y + 10);
            return 20;
        }
    };

    const generatePdfReport = async () => {
        setIsGeneratingPdf(true);
        try {
            const [year, month] = pdfMonth.split('-');
            const lastDayDate = new Date(year, parseInt(month), 0).getDate();
            const firstDay = `${year}-${month}-01`;
            const lastDay = `${year}-${month}-${lastDayDate.toString().padStart(2, '0')}`;

            let url = `/api/trading/reportes?accountId=${activeAccount.id}&startDate=${firstDay}&endDate=${lastDay}`;
            const res = await fetch(url);
            const data = await res.json();

            if (!data || !data.rawOperations || data.rawOperations.length === 0) {
                alert("No hay operaciones registradas para este mes.");
                setIsGeneratingPdf(false);
                return;
            }

            // Map standard data formats before generating
            let cumulative = data.general.initialCapital || 0;
            const cEquityData = [];
            const cPnlData = [];

            data.rawOperations.forEach((op, index) => {
                cumulative += op.pnl;
                cEquityData.push({ id: index + 1, date: op.date, equity: cumulative });
                cPnlData.push({ id: index + 1, pnl: op.pnl });
            });
            if (cEquityData.length === 0) cEquityData.push({ id: 0, date: firstDay, equity: cumulative });
            setChartData({ equity: cEquityData, pnl: cPnlData });

            // Compute Cumulative PnL for each Setup
            const sLines = {};
            data.rawOperations.forEach(op => {
                const sName = op.setupName || 'Sin Setup';
                if (!sLines[sName]) sLines[sName] = [0];
                const lastVal = sLines[sName][sLines[sName].length - 1];
                sLines[sName].push(lastVal + op.pnl);
            });
            
            let maxSteps = 0;
            const keys = Object.keys(sLines);
            keys.forEach(sName => {
                if (sLines[sName].length > maxSteps) maxSteps = sLines[sName].length;
            });
            
            const cSetupData = [];
            for (let i = 0; i < maxSteps; i++) {
                const point = { step: `Op ${i}` };
                keys.forEach(sName => {
                    point[sName] = i < sLines[sName].length ? sLines[sName][i] : sLines[sName][sLines[sName].length - 1];
                });
                cSetupData.push(point);
            }

            setChartData({ equity: cEquityData, pnl: cPnlData, setupLines: cSetupData });
            setSetupKeys(keys);

            // We update state for render hooks and await it
            setReportData(data); // Force UI state to match exact PDF month logic
            await new Promise(r => setTimeout(r, 1500));

            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            
            const addBg = () => {
                doc.setFillColor(13, 17, 23); // #0d1117
                doc.rect(0, 0, pageWidth, pageHeight, 'F');
            };
            addBg();

            // === PAGE 1: HEADER & RESUMEN ===
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(24);
            doc.setFont('helvetica', 'bold');
            doc.text(activeAccount.name.toUpperCase(), 14, 20);
            
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(200, 200, 200);
            const rX = pageWidth - 90;
            doc.text(`CUENTA: ${activeAccount.accountNumber || 'N/A'}`, rX, 14);
            doc.text(`BROKER: ${activeAccount.broker || 'No esp.'}`, rX, 19);
            doc.text(`TRADER: ${activeAccount.traderName || 'No esp.'}`, rX, 24);
            doc.text(`EMAIL: ${activeAccount.traderEmail || ''}`, rX, 29);
            
            const txtDireccion = `DIRECCIÓN: ${activeAccount.traderAddress || ''}`;
            const lineasDireccion = doc.splitTextToSize(txtDireccion, 75);
            doc.text(lineasDireccion, rX, 34);

            doc.setFillColor(26, 35, 50); // #1a2332
            doc.rect(14, 40, pageWidth - 28, 8, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(10);
            const monthNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
            doc.text(`REPORTE MENSUAL — ${monthNames[parseInt(month)-1].toUpperCase()} ${year}`, 16, 45.5);

            let currentY = 55;
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text("RESUMEN DE RENDIMIENTO", 14, currentY);
            doc.setDrawColor(0, 212, 170); // #00d4aa Teal
            doc.setLineWidth(0.5);
            doc.line(14, currentY + 2, 70, currentY + 2);
            
            currentY += 8;
            const g = data.general;
            
            const drawCard = (x, y, w, h, title, val, isMoney, positiveColorMode) => {
                doc.setDrawColor(40, 50, 60);
                doc.setFillColor(26, 35, 50); // #1a2332
                doc.roundedRect(x, y, w, h, 2, 2, 'FD');
                
                let numColor = [255,255,255];
                if (positiveColorMode === 'pnl') {
                    const rawVal = parseFloat(val.toString().replace(/[^0-9.-]+/g, ''));
                    if (rawVal > 0) numColor = [34, 197, 94]; // #22c55e
                    else if (rawVal < 0) numColor = [239, 68, 68]; // #ef4444
                    else numColor = [245, 158, 11]; // #f59e0b breakeven
                }
                if (positiveColorMode === 'be') numColor = [245, 158, 11]; // solid yellow

                doc.setFontSize(11);
                doc.setTextColor(...numColor);
                doc.setFont('helvetica', 'bold');
                doc.text(val, x + w / 2, y + h / 2 - 1, { align: 'center' });
                
                doc.setFontSize(6);
                doc.setTextColor(150, 150, 150);
                doc.setFont('helvetica', 'normal');
                doc.text(title, x + w / 2, y + h / 2 + 3.5, { align: 'center' });
            };

            const cw = 28.5; // Card width for 6 cols in ~180 space
            const ch = 14; 
            const calcPnlPct = g.initialCapital > 0 ? (g.thisMonthPnl / g.initialCapital) * 100 : 0;
            
            // Fila 1
            drawCard(14 + (cw+2)*0, currentY, cw, ch, 'CAPITAL INICIAL', `$${g.initialCapital.toFixed(2)}`);
            drawCard(14 + (cw+2)*1, currentY, cw, ch, 'P&L BRUTO', `$${g.totalPnl.toFixed(2)}`, true, 'pnl');
            drawCard(14 + (cw+2)*2, currentY, cw, ch, 'COMISIONES', `-$${(g.commissions || 0).toFixed(2)}`);
            drawCard(14 + (cw+2)*3, currentY, cw, ch, 'GANANCIA NETA', `$${g.pnlNeto.toFixed(2)}`, true, 'pnl');
            drawCard(14 + (cw+2)*4, currentY, cw, ch, 'RETORNO %', `${calcPnlPct.toFixed(2)}%`, false, 'pnl');
            drawCard(14 + (cw+2)*5, currentY, cw, ch, 'WIN RATE', `${g.winRate.toFixed(2)}%`);

            currentY += ch + 3;
            // Fila 2
            drawCard(14 + (cw+2)*0, currentY, cw, ch, 'TOTAL TRADES', `${g.totalTrades}`);
            drawCard(14 + (cw+2)*1, currentY, cw, ch, 'GANADORAS', `${g.winningTrades}`, false, 'pnl');
            drawCard(14 + (cw+2)*2, currentY, cw, ch, 'PERDEDORAS', `-${g.losingTrades}`, false, 'pnl'); // forcing red logic
            drawCard(14 + (cw+2)*3, currentY, cw, ch, 'BREAKEVEN', `${g.breakEvenTrades}`, false, 'be');
            drawCard(14 + (cw+2)*4, currentY, cw, ch, 'MEJOR TRADE', g.bestTrade ? `$${g.bestTrade.pnlBruto || g.bestTrade.pnl}` : '$0', false, 'pnl');
            drawCard(14 + (cw+2)*5, currentY, cw, ch, 'PEOR TRADE', g.worstTrade ? `$${g.worstTrade.pnlBruto || g.worstTrade.pnl}` : '$0', false, 'pnl');

            currentY += ch + 12;

            // === GRÁFICOS RENDIMIENTO ===
            doc.setFontSize(12);
            doc.setTextColor(255);
            doc.setFont('helvetica', 'bold');
            doc.text("GRÁFICOS DE RENDIMIENTO", 14, currentY);
            doc.setDrawColor(0, 212, 170); 
            doc.line(14, currentY + 2, 72, currentY + 2);
            currentY += 6;

            const graphW = (pageWidth - 30) / 2;
            const hEq = await captureToPdf(refs.equity, doc, 14, currentY, graphW);
            await captureToPdf(refs.pnl, doc, 14 + graphW + 2, currentY, graphW);
            
            // FOOTER HELPERS
            const writeFooterAndAddPage = () => {
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.setFont('helvetica', 'normal');
                doc.text(`Reporte Confidencial — ${activeAccount.traderName || activeAccount.name} | ${activeAccount.traderEmail || ''}`, 14, pageHeight - 10);
                // Pág numbering will be done exactly before saving via setPage loop to inject total pages!
                
                doc.addPage();
                addBg();
            };

            // === REGISTRO OPERACIONES ===
            currentY += hEq + 8;
            if (currentY > 230) {
                writeFooterAndAddPage();
                currentY = 20;
            }

            doc.setFontSize(12);
            doc.setTextColor(255);
            doc.setFont('helvetica', 'bold');
            doc.text("REGISTRO DE OPERACIONES", 14, currentY);
            doc.setDrawColor(0, 212, 170); 
            doc.line(14, currentY + 2, 74, currentY + 2);
            currentY += 6;

            let linksMap = [];
            const tbStylesOscuro = {
                theme: 'grid',
                headStyles: { fillColor: [0, 150, 136], textColor: 0, fontStyle: 'bold', halign: 'center', fontSize: 7 },
                styles: { fillColor: [13, 17, 23], textColor: 230, lineColor: [40, 50, 60], fontSize: 7, cellPadding: 2, overflow: 'ellipsize' },
                alternateRowStyles: { fillColor: [26, 35, 50] },
                columnStyles: { 
                    0: { cellWidth: 15 }, 
                    1: { cellWidth: 20 }, 
                    2: { halign: 'center', cellWidth: 12 }, 
                    3: { halign: 'right', cellWidth: 15 },
                    4: { halign: 'right', cellWidth: 15 }, 
                    5: { cellWidth: 32 }, 
                    6: { halign: 'center', cellWidth: 14 }, 
                    7: { halign: 'center', cellWidth: 14 }, 
                    8: { halign: 'right', cellWidth: 20 },
                    9: { halign: 'center', cellWidth: 10 }
                }
            };

            const opsBody = data.rawOperations.map((op, i) => {
                const isPos = op.pnl > 0;
                const isNeg = op.pnl < 0;
                
                let dirStyler = {};
                if (op.side === 'Long' || op.side === 'L' || op.side === 'LONG') dirStyler = { textColor: [34,197,94], fontStyle: 'bold' };
                else if (op.side === 'Short' || op.side === 'S' || op.side === 'SHORT') dirStyler = { textColor: [239,68,68], fontStyle: 'bold' };

                let indicator = '';
                if (g.bestTrade && op.id === g.bestTrade.id) indicator = ' ★';
                if (g.worstTrade && op.id === g.worstTrade.id) indicator = ' ▼';

                if (op.imageUrl && op.imageUrl !== '-') linksMap.push({ row: i, url: op.imageUrl });

                return [
                    op.date || '-',
                    op.symbol || '-',
                    op.contratos ?? '-',
                    formatPnl(op.riesgoAmount || 0),
                    op.commission ? formatPnl(-op.commission) : '-',
                    op.setupName || '-',
                    { content: op.side || '-', styles: dirStyler },
                    op.sesion || '-',
                    { content: `${formatPnl(op.pnl)}${indicator}`, styles: { textColor: isPos ? [34,197,94] : isNeg ? [239,68,68] : [245,158,11] } },
                    op.imageUrl && op.imageUrl !== '-' ? 'URL' : '-'
                ];
            });

            autoTable(doc, {
                startY: currentY,
                ...tbStylesOscuro,
                head: [['FECHA', 'INSTR.', 'CTTOS', 'RIESGO', 'COMISIÓN', 'SETUP', 'DIREC.', 'SESIÓN', 'PNL NETO', 'LINK']],
                body: opsBody,
                didDrawCell: function(dt) {
                    if (dt.column.index === 9 && dt.cell.raw === 'URL') {
                        const linkData = linksMap.find(l => l.row === dt.row.index);
                        if (linkData) {
                            doc.setTextColor(59, 130, 246);
                            doc.textWithLink(dt.cell.raw, dt.cell.x + 2, dt.cell.y + 4, { url: linkData.url });
                        }
                    }
                }
            });

            currentY = doc.lastAutoTable.finalY + 4;
            doc.setFontSize(7);
            doc.setTextColor(150);
            doc.text("★ Mejor trade   ▼ Peor trade   Long = verde | Short = rojo | Links: Copia URL en TradingView", 14, currentY);

            // ================= PAGE 3 =================
            writeFooterAndAddPage();
            currentY = 20;

            const drawSection = async (title, colorHex, refComposed, refPie, dataArray, cols, mapRowFunc) => {
                doc.setFontSize(12);
                doc.setTextColor(255);
                doc.setFont('helvetica', 'bold');
                doc.text(title, 14, currentY);
                
                // Color bar
                const h = parseInt(colorHex.substring(1,3), 16);
                const s = parseInt(colorHex.substring(3,5), 16);
                const l = parseInt(colorHex.substring(5,7), 16);
                doc.setDrawColor(h,s,l); 
                doc.line(14, currentY + 2, 70, currentY + 2);
                currentY += 6;

                const hw = (pageWidth - 30) / 2;
                const hh = await captureToPdf(refComposed, doc, 14, currentY, hw);
                await captureToPdf(refPie, doc, 14 + hw + 2, currentY, hw);
                currentY += hh + 4;

                autoTable(doc, {
                    startY: currentY, ...tbStylesOscuro,
                    head: [cols],
                    body: dataArray.map(mapRowFunc),
                    columnStyles: { 0: { cellWidth: 40 }, 5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' } }
                });
                currentY = doc.lastAutoTable.finalY + 10;
                
                if (currentY > 230) {
                    writeFooterAndAddPage();
                    currentY = 20;
                }
            };

            const coloredPnl = (val) => ({ content: `$${val.toFixed(2)}`, styles: { textColor: val>0?[34,197,94]:val<0?[239,68,68]:[245,158,11] } });
            
            // SETUP
            await drawSection("ANÁLISIS POR SETUP", "#00d4aa", refs.setupComposed, refs.setupPie, data.bySetup, 
                ['SETUP', 'TRADES', 'GANAD.', 'PERD.', 'WIN RATE', 'P&L BRUTO', 'COMISIONES', 'P&L NETO'],
                d => [d.label, d.trades, d.wins, d.losses, d.winRate.toFixed(1)+'%', coloredPnl(d.pnl), coloredPnl(-d.comisiones), coloredPnl(d.pnlNeto)]
            );

            // INSTRUMENT
            await drawSection("ANÁLISIS POR INSTRUMENTO", "#f97316", refs.instrumentComposed, refs.instrumentPie, data.byInstrument, 
                ['INSTRUMENTO', 'TRADES', 'GANAD.', 'PERD.', 'WIN RATE', 'P&L BRUTO', 'COMISIONES', 'P&L NETO'],
                d => [d.label, d.trades, d.wins, d.losses, d.winRate.toFixed(1)+'%', coloredPnl(d.pnl), coloredPnl(-d.comisiones), coloredPnl(d.pnlNeto)]
            );

            // DIRECTION
            await drawSection("ANÁLISIS POR DIRECCIÓN", "#a855f7", refs.directionComposed, refs.directionPie, data.byDirection, 
                ['DIRECCIÓN', 'TRADES', 'GANAD.', 'PERD.', 'WIN RATE', 'P&L BRUTO', 'COMISIONES', 'P&L NETO'],
                d => [d.label, d.trades, d.wins, d.losses, d.winRate.toFixed(1)+'%', coloredPnl(d.pnl), coloredPnl(-d.comisiones), coloredPnl(d.pnlNeto)]
            );

            // SESSION
            await drawSection("ANÁLISIS POR SESIÓN", "#3b82f6", refs.sessionComposed, refs.sessionPie, data.bySession, 
                ['SESIÓN', 'TRADES', 'GANAD.', 'PERD.', 'WIN RATE', 'P&L BRUTO', 'COMISIONES', 'P&L NETO'],
                d => [d.label, d.trades, d.wins, d.losses, d.winRate.toFixed(1)+'%', coloredPnl(d.pnl), coloredPnl(-d.comisiones), coloredPnl(d.pnlNeto)]
            );

            // ================= INJECTING ALL FOOTERS =================
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.setFont('helvetica', 'normal');
                if (i !== 1) { // Page 1 handles logic differently if we wanted, but we inject basic bottom tracking
                    doc.text(`Reporte Confidencial — ${activeAccount.traderName || activeAccount.name} | ${activeAccount.traderEmail || ''}`, 14, pageHeight - 10);
                }
                doc.text(`Pág. ${i} / ${pageCount}`, pageWidth - 25, pageHeight - 10);
                
                if (i === pageCount) {
                    doc.setFontSize(7);
                    doc.setTextColor(100);
                    doc.text("Reporte confidencial y exclusivo del titular. Los resultados pasados no garantizan rendimientos futuros. El trading de futuros involucra riesgo sustancial.", 14, pageHeight - 15);
                }
            }

            doc.save(`reporte_trading_${activeAccount.name.replace(/\s+/g,'_')}_${month}_${year}.pdf`);

        } catch (error) {
            console.error('Error al generar PDF:', error);
            alert('Error al generar el PDF: ' + error.message);
        } finally {
            setIsGeneratingPdf(false);
            setShowPdfModal(false);
        }
    };

    if (!isLoaded) return <div className={styles.loading}>Iniciando entorno...</div>;
    
    // Si hay error y no hay datos, mostrar error predominante
    if (error && (!reportData || !reportData.rawOperations || reportData.rawOperations.length === 0)) {
        return (
            <div className={styles.reportesContainer}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Módulo de Reportes</h1>
                    <p className={styles.subtitle}>Análisis y exportación oficial de {activeAccount?.name}</p>
                </div>
                <div className={styles.filterBar}>
                    <div className={styles.filterGroup}>
                        <label>Desde</label>
                        <input type="date" className={styles.filterInput} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    </div>
                    <div className={styles.filterGroup}>
                        <label>Hasta</label>
                        <input type="date" className={styles.filterInput} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                    <button type="button" className={styles.btnPrimary} onClick={fetchReport}>Reintentar</button>
                    <button type="button" className={styles.btnSecondary} onClick={handleClearFilters}>Limpiar Filtros</button>
                </div>
                <div style={{ textAlign: 'center', padding: '5rem 2rem', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '2rem' }}>
                    <div style={{ fontSize: '1.2rem', color: error.includes('encontraron') ? 'var(--text-secondary)' : 'var(--danger)', marginBottom: '1rem' }}>
                        {error}
                    </div>
                    <p style={{ color: 'var(--text-muted)' }}>
                        {error.includes('encontraron') 
                            ? 'Intenta ajustar los filtros de fecha o asegúrate de tener operaciones registradas en esta cuenta.' 
                            : 'Hubo un problema al cargar los datos. Verifica la consola o intenta reintentar.'}
                    </p>
                </div>
            </div>
        );
    }

    if (!reportData && loading) return <div className={styles.loading}>Procesando reportes...</div>;
    if (!activeAccount) return <div className={styles.loading}>Selecciona una cuenta para continuar...</div>;

    const g = reportData?.general;

    // Helper components for hidden charts
    const buildComposed = (dataArray, keyName, color) => (
        <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={dataArray} margin={{ top: 20, right: 30, bottom: 60, left: 20 }}>
                <XAxis dataKey={keyName} stroke="#94a3b8" fontSize={11} angle={-35} textAnchor="end" interval={0} height={70} />
                <YAxis yAxisId="left" width={75} stroke="#94a3b8" fontSize={11} tickFormatter={v=>`$${v}`} />
                <YAxis yAxisId="right" orientation="right" width={40} stroke="#00d4aa" fontSize={11} tickFormatter={v=>`${v}%`} />
                <Tooltip contentStyle={{background:'#1a2332', border:'1px solid #475569'}} />
                <Bar yAxisId="left" dataKey="pnl" fill={color}>
                    {dataArray.map((entry, index) => <Cell key={index} fill={entry.pnl >= 0 ? '#22c55e' : '#ef4444'} />)}
                </Bar>
                <Line yAxisId="right" type="step" dataKey="winRate" stroke="#00d4aa" strokeWidth={2} dot={false} strokeDasharray="3 3"/>
            </ComposedChart>
        </ResponsiveContainer>
    );

    const buildPie = (dataArray, keyName) => (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
                <Pie data={dataArray} dataKey="trades" nameKey={keyName} cx="50%" cy="40%" innerRadius={70} outerRadius={110} paddingAngle={2} label={({value})=>`${value}`}>
                    {dataArray.map((entry, index) => <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{background:'#1a2332', border:'1px solid #475569'}} />
                <Legend 
                    iconType="circle" 
                    wrapperStyle={{fontSize: '11px', paddingTop:'10px'}} 
                    layout="horizontal" 
                    verticalAlign="bottom" 
                    align="center"
                    formatter={(value, entry) => {
                        return `${value} (${entry.payload.trades})`;
                    }}
                />
            </PieChart>
        </ResponsiveContainer>
    );

    const buildSetupLineChart = () => (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData.setupLines} margin={{ top: 20, right: 30, bottom: 60, left: 20 }}>
                <XAxis dataKey="step" stroke="#94a3b8" fontSize={11} angle={-35} textAnchor="end" interval={0} height={70} />
                <YAxis width={75} stroke="#94a3b8" fontSize={11} tickFormatter={v=>`$${v}`} />
                <Tooltip contentStyle={{background:'#1a2332', border:'1px solid #475569'}} />
                <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="3 3" />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '11px', paddingTop:'10px'}} />
                {setupKeys.map((s, idx) => (
                    <Line key={s} type="monotone" dataKey={s} stroke={PIE_COLORS[idx % PIE_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} isAnimationActive={false} />
                ))}
            </LineChart>
        </ResponsiveContainer>
    );

    // === LÓGICA GRÁFICO EVOLUCIÓN P&L POR SETUP ===
    let setupEvolutionData = [];
    let setupsData = [];
    const operaciones = reportData?.rawOperations || [];

    if (operaciones.length > 0) {
        setupsData = [...new Set(operaciones.map(op => op.setupName).filter(Boolean))];
        
        setupEvolutionData = operaciones.map((op, index) => {
            const punto = { op: index + 1 };
            setupsData.forEach(setup => {
                punto[setup] = 0;
            });
            return punto;
        });

        let acumulados = {};
        setupsData.forEach(s => acumulados[s] = 0);

        operaciones.forEach((op, index) => {
            const nombre = op.setupName;
            if (nombre) {
                acumulados[nombre] = (acumulados[nombre] || 0) + (op.pnl || 0);
            }
            setupsData.forEach(setup => {
                setupEvolutionData[index][setup] = acumulados[setup] || 0;
            });
        });
    }

    console.log('=== GRAFICO SETUP DEBUG ===');
    console.log('Datos disponibles para el gráfico:', setupEvolutionData);
    console.log('Setups disponibles:', setupsData);
    console.log('Operaciones disponibles:', operaciones);

    return (
        <div className={styles.reportesContainer}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Módulo de Reportes</h1>
                    <p className={styles.subtitle}>Análisis y exportación oficial de {activeAccount.name}</p>
                </div>
            </div>

            <div className={styles.filterBar}>
                <div className={styles.filterGroup}>
                    <label>Desde</label>
                    <input type="date" className={styles.filterInput} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className={styles.filterGroup}>
                    <label>Hasta</label>
                    <input type="date" className={styles.filterInput} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
                <button type="button" className={styles.btnPrimary} onClick={fetchReport}>Aplicar Filtros</button>
                <button type="button" className={styles.btnSecondary} onClick={handleClearFilters}>Limpiar Todo</button>
                
                <button type="button" className={styles.btnExport} onClick={() => setShowPdfModal(true)}>
                    <Download size={18} /> GENERAR REPORTE PDF
                </button>
            </div>

            {reportData && (
                <>
                    <div className={styles.sectionBlock}>
                        <h2 className={styles.sectionTitle}>Vista Web General (Reporte en PDF es Avanzado)</h2>
                        <div className={styles.metricsGrid}>
                            <div className={styles.metricCard}><span className={styles.metricLbl}>Capital Inicial</span><span className={styles.metricVal}>${g.initialCapital?.toLocaleString('en-US',{minimumFractionDigits:2})}</span></div>
                            <div className={styles.metricCard}><span className={styles.metricLbl}>P&L Bruto</span><span className={`${styles.metricVal} ${g.totalPnl >= 0 ? styles.positive : styles.negative}`}>{formatPnl(g.totalPnl)}</span></div>
                            <div className={styles.metricCard}><span className={styles.metricLbl}>Comisiones Pagadas</span><span className={`${styles.metricVal} ${styles.negative}`}>-{formatPnl(g.commissions)}</span></div>
                            <div className={styles.metricCard}><span className={styles.metricLbl}>P&L Neto Referencial</span><span className={`${styles.metricVal} ${g.pnlNeto >= 0 ? styles.positive : styles.negative}`}>{formatPnl(g.pnlNeto)}</span></div>
                            <div className={styles.metricCard}><span className={styles.metricLbl}>Win Rate</span><span className={styles.metricVal}>{g.winRate?.toFixed(2)}%</span></div>
                            <div className={styles.metricCard}><span className={styles.metricLbl}>Trades | Días Op</span><span className={styles.metricVal}>{g.totalTrades} | {g.daysOperated}d</span></div>
                        </div>
                    </div>

                    <div className={styles.sectionBlock}>
                        <h2 className={styles.sectionTitle}>Reporte por Setup</h2>
                        
                        {/* UI render of new line chart requested by user */}
                        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '400px', background: '#1a2332', padding: '15px', borderRadius: '4px' }}>
                                <p style={{ color:'#fff', margin:'0 0 10px', fontSize:14, fontWeight:'bold' }}>Evolución P&L por Setup</p>
                                <div style={{ height: '350px' }}>
                                    {setupEvolutionData.length === 0 || setupsData.length === 0 ? (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                                            No hay operaciones con setup asignado para mostrar en el gráfico.
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={setupEvolutionData} margin={{ top: 20, right: 30, bottom: 60, left: 20 }}>
                                                <XAxis dataKey="op" stroke="#94a3b8" fontSize={11} />
                                                <YAxis width={75} stroke="#94a3b8" fontSize={11} tickFormatter={v=>`$${v}`} />
                                                <Tooltip contentStyle={{background:'#0d1117', border:'1px solid #475569'}} />
                                                <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="3 3" />
                                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '11px', paddingTop:'10px'}} />
                                                {setupsData.map((s, idx) => (
                                                    <Line key={s} type="monotone" dataKey={s} stroke={PIE_COLORS[idx % PIE_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                                                ))}
                                            </LineChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className={styles.tableContainer}>
                            <table className={styles.dataTable}>
                                <thead><tr><th>Setup</th><th>Dirección</th><th>Trades</th><th>Ganadas</th><th>Perdidas</th><th>Win Rate</th><th>P&L Bruto</th><th>Comisiones</th><th>P&L Neto</th></tr></thead>
                                <tbody>
                                    {reportData.bySetup.map((item, i) => (
                                        <tr key={i}>
                                            <td><strong>{item.label}</strong></td><td>{item.direction}</td><td>{item.trades}</td><td>{item.wins}</td><td>{item.losses}</td><td>{item.winRate.toFixed(2)}%</td>
                                            <td className={item.pnl >= 0 ? styles.positive : styles.negative}>{formatPnl(item.pnl)}</td>
                                            <td className={styles.negative}>{formatPnl(-item.comisiones)}</td>
                                            <td className={item.pnlNeto >= 0 ? styles.positive : styles.negative}>{formatPnl(item.pnlNeto)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className={styles.sectionBlock}>
                        <h2 className={styles.sectionTitle}>Reporte por Instrumento</h2>
                        <div className={styles.tableContainer}>
                            <table className={styles.dataTable}>
                                <thead><tr><th>Instrumento</th><th>Trades</th><th>Ganadas</th><th>Perdidas</th><th>Win Rate</th><th>P&L Bruto</th><th>Comisiones</th><th>P&L Neto</th></tr></thead>
                                <tbody>
                                    {reportData.byInstrument.map((item, i) => (
                                        <tr key={i}>
                                            <td><strong>{item.label}</strong></td><td>{item.trades}</td><td>{item.wins}</td><td>{item.losses}</td><td>{item.winRate.toFixed(2)}%</td>
                                            <td className={item.pnl >= 0 ? styles.positive : styles.negative}>{formatPnl(item.pnl)}</td>
                                            <td className={styles.negative}>{formatPnl(-item.comisiones)}</td>
                                            <td className={item.pnlNeto >= 0 ? styles.positive : styles.negative}>{formatPnl(item.pnlNeto)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className={styles.sectionBlock}>
                        <h2 className={styles.sectionTitle}>Reporte por Dirección</h2>
                        <div className={styles.tableContainer}>
                            <table className={styles.dataTable}>
                                <thead><tr><th>Dirección</th><th>Trades</th><th>Ganadas</th><th>Perdidas</th><th>Win Rate</th><th>P&L Bruto</th><th>Comisiones</th><th>P&L Neto</th></tr></thead>
                                <tbody>
                                    {reportData.byDirection.map((item, i) => (
                                        <tr key={i}>
                                            <td><strong>{item.label}</strong></td><td>{item.trades}</td><td>{item.wins}</td><td>{item.losses}</td><td>{item.winRate.toFixed(2)}%</td>
                                            <td className={item.pnl >= 0 ? styles.positive : styles.negative}>{formatPnl(item.pnl)}</td>
                                            <td className={styles.negative}>{formatPnl(-item.comisiones)}</td>
                                            <td className={item.pnlNeto >= 0 ? styles.positive : styles.negative}>{formatPnl(item.pnlNeto)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className={styles.sectionBlock}>
                        <h2 className={styles.sectionTitle}>Reporte por Sesión</h2>
                        <div className={styles.tableContainer}>
                            <table className={styles.dataTable}>
                                <thead><tr><th>Sesión</th><th>Trades</th><th>Ganadas</th><th>Perdidas</th><th>Win Rate</th><th>P&L Bruto</th><th>Comisiones</th><th>P&L Neto</th></tr></thead>
                                <tbody>
                                    {reportData.bySession.map((item, i) => (
                                        <tr key={i}>
                                            <td><strong>{item.label}</strong></td><td>{item.trades}</td><td>{item.wins}</td><td>{item.losses}</td><td>{item.winRate.toFixed(2)}%</td>
                                            <td className={item.pnl >= 0 ? styles.positive : styles.negative}>{formatPnl(item.pnl)}</td>
                                            <td className={styles.negative}>{formatPnl(-item.comisiones)}</td>
                                            <td className={item.pnlNeto >= 0 ? styles.positive : styles.negative}>{formatPnl(item.pnlNeto)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* MODAL */}
            {showPdfModal && (
                <div style={{position:'fixed', top:0, left:0, width:'100vw', height:'100vh', background:'rgba(0,0,0,0.8)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center'}}>
                    <div style={{background:'var(--bg-secondary)', padding:'2rem', borderRadius:'8px', width:'400px', border:'1px solid var(--border-color)'}}>
                        <h3 style={{marginTop:0, color:'var(--white)'}}>Generar PDF Ejecutivo Institucional</h3>
                        <p style={{color:'var(--text-muted)', fontSize:'0.85rem', marginBottom:'1.5rem'}}>Este proceso renderizará gráficos analíticos nativos de nivel corporativo en 4 hojas.</p>
                        
                        <div style={{display:'flex', flexDirection:'column', gap:'0.5rem', marginBottom:'1.5rem'}}>
                            <label style={{color:'var(--white)', fontSize:'0.85rem'}}>Mes del Reporte:</label>
                            <input 
                                type="month" 
                                value={pdfMonth} 
                                onChange={(e) => setPdfMonth(e.target.value)} 
                                style={{padding:'0.5rem', borderRadius:'4px', border:'1px solid var(--border-color)', background:'var(--bg-primary)', color:'var(--white)', colorScheme:'dark'}}
                            />
                        </div>

                        <div style={{display:'flex', gap:'1rem', justifyContent:'flex-end'}}>
                            <button onClick={()=>setShowPdfModal(false)} style={{padding:'0.5rem 1rem', background:'transparent', color:'var(--white)', border:'1px solid var(--border-color)', borderRadius:'4px', cursor:'pointer'}} disabled={isGeneratingPdf}>
                                Cancelar
                            </button>
                            <button onClick={generatePdfReport} style={{padding:'0.5rem 1rem', background:'var(--danger)', color:'var(--white)', border:'none', borderRadius:'4px', cursor:'pointer', fontWeight:'bold'}} disabled={isGeneratingPdf}>
                                {isGeneratingPdf ? 'Calculando Geometrías...' : 'GENERAR REPORTE PDF'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* THE HIDDEN DOM (10 CHARTS) FOR PDF EXPORT */}
            <div style={{ position: 'absolute', top: '-10000px', left: 0, width: 1700, background: '#0d1117', padding: '20px' }}> 
                
                {/* 1. EQUITY CURVE */}
                <div ref={refs.equity} style={{ width: 800, height: 400, padding: 10, background: '#1a2332', borderRadius: 4, display: 'inline-block', margin: '10px' }}>
                    <p style={{ color:'#fff', margin:'0 0 10px', fontSize:14, fontWeight:'bold' }}>EQUITY CURVE</p>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData.equity} margin={{ top: 20, right: 30, bottom: 60, left: 20 }} isAnimationActive={false}>
                            <XAxis dataKey="id" stroke="#94a3b8" fontSize={11} />
                            <YAxis width={75} domain={['auto', 'auto']} stroke="#94a3b8" fontSize={11} tickFormatter={(v)=>`$${v}`} />
                            <Tooltip contentStyle={{background:'#1a2332', border:'none'}} />
                            <Area type="monotone" dataKey="equity" stroke="#00ff88" fill="#00ff88" fillOpacity={0.2} strokeWidth={2} isAnimationActive={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* 2. PNL BY OPERATION */}
                <div ref={refs.pnl} style={{ width: 800, height: 400, padding: 10, background: '#1a2332', borderRadius: 4, display: 'inline-block', margin: '10px' }}>
                    <p style={{ color:'#fff', margin:'0 0 10px', fontSize:14, fontWeight:'bold' }}>P&L POR OPERACIÓN</p>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData.pnl} margin={{ top: 20, right: 30, bottom: 60, left: 20 }} isAnimationActive={false}>
                            <XAxis dataKey="id" stroke="#94a3b8" fontSize={11} />
                            <YAxis width={75} stroke="#94a3b8" fontSize={11} tickFormatter={(v)=>`$${v}`} />
                            <Tooltip contentStyle={{background:'#1a2332', border:'none'}} />
                            <Bar dataKey="pnl" isAnimationActive={false}>
                                {chartData.pnl.map((entry, index) => <Cell key={index} fill={entry.pnl >= 0 ? '#22c55e' : '#ef4444'} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* 3 & 4. SETUP */}
                <div ref={refs.setupComposed} style={{ width: 800, height: 400, padding: 10, background: '#1a2332', display: 'inline-block', margin: '10px' }}>
                    <p style={{ color:'#fff', margin:'0 0 10px', fontSize:14, fontWeight:'bold' }}>EVOLUCIÓN P&L POR SETUP</p>
                    {reportData && buildSetupLineChart()}
                </div>
                <div ref={refs.setupPie} style={{ width: 800, height: 400, padding: 10, background: '#1a2332', display: 'inline-block', margin: '10px' }}>
                    <p style={{ color:'#fff', margin:'0 0 10px', fontSize:14, fontWeight:'bold' }}>DISTRIBUCIÓN DE TRADES</p>
                    {reportData && buildPie(reportData.bySetup, 'label')}
                </div>

                {/* 5 & 6. INSTRUMENT */}
                <div ref={refs.instrumentComposed} style={{ width: 800, height: 400, padding: 10, background: '#1a2332', display: 'inline-block', margin: '10px' }}>
                    <p style={{ color:'#fff', margin:'0 0 10px', fontSize:14, fontWeight:'bold' }}>P&L Y WIN RATE POR INST.</p>
                    {reportData && buildComposed(reportData.byInstrument, 'label', '#f97316')}
                </div>
                <div ref={refs.instrumentPie} style={{ width: 800, height: 400, padding: 10, background: '#1a2332', display: 'inline-block', margin: '10px' }}>
                    <p style={{ color:'#fff', margin:'0 0 10px', fontSize:14, fontWeight:'bold' }}>DISTRIBUCIÓN DE TRADES</p>
                    {reportData && buildPie(reportData.byInstrument, 'label')}
                </div>

                {/* 7 & 8. DIRECTION */}
                <div ref={refs.directionComposed} style={{ width: 800, height: 400, padding: 10, background: '#1a2332', display: 'inline-block', margin: '10px' }}>
                    <p style={{ color:'#fff', margin:'0 0 10px', fontSize:14, fontWeight:'bold' }}>Análisis P&L y Win Rate</p>
                    {reportData && buildComposed(reportData.byDirection, 'label', '#a855f7')}
                </div>
                <div ref={refs.directionPie} style={{ width: 800, height: 400, padding: 10, background: '#1a2332', display: 'inline-block', margin: '10px' }}>
                    <p style={{ color:'#fff', margin:'0 0 10px', fontSize:14, fontWeight:'bold' }}>Distribución</p>
                    {reportData && buildPie(reportData.byDirection, 'label')}
                </div>

                {/* 9 & 10. SESSION */}
                <div ref={refs.sessionComposed} style={{ width: 800, height: 400, padding: 10, background: '#1a2332', display: 'inline-block', margin: '10px' }}>
                    <p style={{ color:'#fff', margin:'0 0 10px', fontSize:14, fontWeight:'bold' }}>Análisis P&L y Win Rate</p>
                    {reportData && buildComposed(reportData.bySession, 'label', '#3b82f6')}
                </div>
                <div ref={refs.sessionPie} style={{ width: 800, height: 400, padding: 10, background: '#1a2332', display: 'inline-block', margin: '10px' }}>
                    <p style={{ color:'#fff', margin:'0 0 10px', fontSize:14, fontWeight:'bold' }}>Distribución</p>
                    {reportData && buildPie(reportData.bySession, 'label')}
                </div>
            </div>

        </div>
    );
}
