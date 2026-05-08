'use client';
import { useState, useRef } from 'react';
import { useActiveAccount } from '@/components/trading/AccountContext';
import { Download, Upload, AlertCircle, FileSpreadsheet, CheckCircle2, Database } from 'lucide-react';
import * as XLSX from 'xlsx';
import styles from './page.module.css';

export default function RespaldoPage() {
    const { activeAccount } = useActiveAccount() || {};
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [importResult, setImportResult] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const fileInputRef = useRef(null);

    const handleExport = async () => {
        if (!activeAccount) {
            alert('Seleccione una cuenta activa para exportar.');
            return;
        }

        setIsExporting(true);
        try {
            const res = await fetch(`/api/trading/backup?accountId=${activeAccount.id}`);
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Error al descargar datos');

            const wb = XLSX.utils.book_new();
            
            // HOJA 1: OPERACIONES
            const opsRows = [
                ['RESPALDO DE OPERACIONES – TRADING'],
                [`Cuenta: ${activeAccount.name}`],
                [`Fecha de exportación: ${new Date().toLocaleString()}`],
                [],
                // Encabezados
                ['ID', 'FECHA', 'INSTRUMENTO', 'DIRECCIÓN', 'CONTRATOS', 'SETUP', 'SESIÓN', 'RIESGO ($)', 'RESULTADO P&L ($)', 'RR', 'NOTAS', 'LINK TRADINGVIEW', 'CUENTA ID', 'SETUP ID', 'FECHA CREACIÓN']
            ];

            data.operations.forEach(op => {
                opsRows.push([
                    op.id,
                    op.date,
                    op.symbol,
                    op.side,
                    op.contratos,
                    op.setupName || '',
                    op.sesion || '',
                    op.riesgoAmount || 0,
                    op.pnl,
                    op.resultR || 0,
                    op.notes || '',
                    op.imageUrl || '',
                    op.accountId,
                    op.setupId || '',
                    op.created_at || ''
                ]);
            });

            const wsOps = XLSX.utils.aoa_to_sheet(opsRows);
            wsOps['!cols'] = [{wch: 6}, {wch: 12}, {wch: 15}, {wch: 12}, {wch: 12}, {wch: 15}, {wch: 10}, {wch: 12}, {wch: 18}, {wch: 8}, {wch: 30}, {wch: 25}, {wch: 10}, {wch: 10}, {wch: 20}];
            XLSX.utils.book_append_sheet(wb, wsOps, 'OPERACIONES');

            // HOJA 2: SETUPS
            const setupsRows = [
                ['RESPALDO DE SETUPS'],
                [`Fecha de exportación: ${new Date().toLocaleString()}`],
                [],
                ['ID', 'NOMBRE', 'DIRECCIÓN', 'ESTADO', 'FECHA CREACIÓN']
            ];

            data.setups.forEach(s => {
                setupsRows.push([
                    s.id,
                    s.name,
                    s.direction,
                    s.isActive === 1 ? 'Activo' : 'Inactivo',
                    s.created_at || ''
                ]);
            });

            const wsSetups = XLSX.utils.aoa_to_sheet(setupsRows);
            wsSetups['!cols'] = [{wch: 6}, {wch: 25}, {wch: 12}, {wch: 10}, {wch: 20}];
            XLSX.utils.book_append_sheet(wb, wsSetups, 'SETUPS');

            // Descargar
            const cleanAcc = activeAccount.name.replace(/[^a-zA-Z0-9]/g, '_');
            const d = new Date();
            const dateStr = `${d.getFullYear()}_${(d.getMonth()+1).toString().padStart(2,'0')}_${d.getDate().toString().padStart(2,'0')}`;
            
            XLSX.writeFile(wb, `respaldo_trading_${cleanAcc}_${dateStr}.xlsx`);
            
        } catch (e) {
            console.error(e);
            alert('Error al exportar: ' + e.message);
        } finally {
            setIsExporting(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setErrorMsg('');
        setImportResult(null);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });

                if (!wb.SheetNames.includes('OPERACIONES') || !wb.SheetNames.includes('SETUPS')) {
                    throw new Error('El archivo no tiene el formato correcto (Faltan hojas OPERACIONES o SETUPS)');
                }

                // Parse OPERACIONES skipping first 4 rows
                const wsOps = wb.Sheets['OPERACIONES'];
                const rawOps = XLSX.utils.sheet_to_json(wsOps, { header: 1 });
                const opsData = XLSX.utils.sheet_to_json(wsOps, { range: 4 });

                // Parse SETUPS skipping first 3 rows
                const wsSetups = wb.Sheets['SETUPS'];
                const setupsData = XLSX.utils.sheet_to_json(wsSetups, { range: 3 });

                setPreviewData({
                    operations: opsData,
                    setups: setupsData,
                    fileName: file.name
                });

            } catch (err) {
                setErrorMsg(err.message);
            }
            e.target.value = null; // reset
        };
        reader.readAsBinaryString(file);
    };

    const confirmImport = async () => {
        if (!activeAccount || !previewData) return;

        setIsImporting(true);
        setErrorMsg('');
        
        try {
            const res = await fetch('/api/trading/backup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    accountId: activeAccount.id,
                    setups: previewData.setups,
                    operations: previewData.operations
                })
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Error al subir los datos');

            setImportResult(result);
            setPreviewData(null);
            
        } catch (e) {
            setErrorMsg(e.message);
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}><Database size={28} /> Respaldo de Datos</h1>
                <p className={styles.subtitle}>Exporta o restaura operaciones y setups de la cuenta {activeAccount?.name}</p>
            </div>

            {errorMsg && (
                <div className={styles.statusError} style={{marginBottom: '2rem'}}>
                    <AlertCircle size={20} />
                    <span>{errorMsg}</span>
                </div>
            )}

            <div className={styles.cardsGrid}>
                {/* EXPORT CARD */}
                <div className={styles.card}>
                    <div className={`${styles.cardIcon} ${styles.export}`}>
                        <Download size={32} />
                    </div>
                    <h2 className={styles.cardTitle}>Exportar a Excel</h2>
                    <p className={styles.cardDesc}>Descarga un archivo .xlsx estructurado con todo el historial de transacciones y Setups construidos en la cuenta activa.</p>
                    <button 
                        className={`${styles.btnPrimary} ${styles.btnExport}`} 
                        onClick={handleExport}
                        disabled={isExporting || !activeAccount}
                    >
                        {isExporting ? 'Exportando...' : 'EXPORTAR A EXCEL'}
                    </button>
                </div>

                {/* IMPORT CARD */}
                <div className={styles.card}>
                    <div className={`${styles.cardIcon} ${styles.import}`}>
                        <Upload size={32} />
                    </div>
                    <h2 className={styles.cardTitle}>Importar desde Excel</h2>
                    <p className={styles.cardDesc}>Sube un archivo de respaldo previo para restaurar operaciones hacia la cuenta activa mapeando y omitiendo replicados.</p>
                    <input 
                        type="file" 
                        accept=".xlsx, .xls" 
                        ref={fileInputRef} 
                        className={styles.hiddenInput} 
                        onChange={handleFileChange}
                    />
                    <button 
                        className={`${styles.btnPrimary} ${styles.btnImport}`} 
                        onClick={() => fileInputRef.current.click()}
                        disabled={isImporting || !activeAccount}
                    >
                        {isImporting ? 'Cargando archivo...' : 'IMPORTAR DESDE EXCEL'}
                    </button>
                </div>
            </div>

            {/* PREVIEW MODAL */}
            {previewData && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <FileSpreadsheet size={24} color="#3b82f6" />
                            <h2>Vista Previa de Importación</h2>
                        </div>
                        
                        <div className={styles.modalBody}>
                            <div className={styles.summaryBox}>
                                <div className={styles.summaryRow}>
                                    <span>Archivo a leer:</span>
                                    <strong>{previewData.fileName}</strong>
                                </div>
                                <div className={styles.summaryRow}>
                                    <span>Setups Detectados:</span>
                                    <strong>{previewData.setups.length}</strong>
                                </div>
                                <div className={styles.summaryRow}>
                                    <span>Operaciones Detectadas:</span>
                                    <strong>{previewData.operations.length}</strong>
                                </div>
                            </div>

                            <h3 style={{fontSize: '1rem', color:'var(--text-muted)', marginBottom: '0.5rem'}}>Muestra de las primeras 5 operaciones:</h3>
                            <table className={styles.previewTable}>
                                <thead>
                                    <tr><th>Fecha</th><th>Inst.</th><th>Side</th><th>Setup</th><th>P&L</th></tr>
                                </thead>
                                <tbody>
                                    {previewData.operations.slice(0, 5).map((op, i) => (
                                        <tr key={i}>
                                            <td>{op['FECHA']}</td>
                                            <td>{op['INSTRUMENTO']}</td>
                                            <td>{op['DIRECCIÓN']}</td>
                                            <td>{op['SETUP'] || '-'}</td>
                                            <td style={{color: parseFloat(op['RESULTADO P&L ($)']) >= 0 ? '#10b981' : '#ef4444'}}>
                                                ${parseFloat(op['RESULTADO P&L ($)']).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                    {previewData.operations.length === 0 && (
                                        <tr><td colSpan="5" style={{textAlign:'center'}}>No hay operaciones en el archivo</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className={styles.modalActions}>
                            <button className={styles.btnCancel} onClick={() => setPreviewData(null)}>Cancelar</button>
                            <button className={styles.btnPrimary} style={{background: '#3b82f6', width: 'auto'}} onClick={confirmImport} disabled={isImporting}>
                                {isImporting ? 'Insertando...' : 'Confirmar Importación'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* RESPONSE RESULT */}
            {importResult && (
                <div className={styles.statusSuccess}>
                    <div style={{display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'1rem'}}>
                        <CheckCircle2 size={24} />
                        <h2 style={{margin:0, fontSize:'1.25rem'}}>Importación Finalizada</h2>
                    </div>

                    <div style={{display: 'flex', gap: '2rem'}}>
                        <div>
                            <strong>SETUPS</strong>
                            <ul style={{marginTop:'0.5rem'}}>
                                <li>Nuevos Importados: {importResult.setups.imported}</li>
                                <li>Duplicados Omitidos: {importResult.setups.duplicates}</li>
                                <li>Errores: {importResult.setups.errors.length}</li>
                            </ul>
                            {importResult.setups.errors.length > 0 && (
                                <div className={styles.errorList}>
                                    {importResult.setups.errors.slice(0,5).map((e,i) => <div key={i}>Fila {e.row}: {e.reason}</div>)}
                                    {importResult.setups.errors.length > 5 && <div>...y más</div>}
                                </div>
                            )}
                        </div>

                        <div>
                            <strong>OPERACIONES</strong>
                            <ul style={{marginTop:'0.5rem'}}>
                                <li>Nuevas Insertadas: {importResult.operations.imported}</li>
                                <li>Duplicadas Omitidas: {importResult.operations.duplicates}</li>
                                <li>Errores: {importResult.operations.errors.length}</li>
                            </ul>
                            {importResult.operations.errors.length > 0 && (
                                <div className={styles.errorList}>
                                    {importResult.operations.errors.slice(0,5).map((e,i) => <div key={i}>Fila {e.row}: {e.reason}</div>)}
                                    {importResult.operations.errors.length > 5 && <div>...y más</div>}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
