'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useActiveAccount } from '@/components/trading/AccountContext';
import { Plus, Settings, X, Loader2, Link as LinkIcon, Trash2, Eye, ArrowUp, ArrowDown, Edit } from 'lucide-react';
import SetupManagerModal from '@/components/trading/SetupManagerModal';
import InstrumentSelector from '@/components/trading/InstrumentSelector';
import styles from './page.module.css';

export default function TradingOperationsLog() {
    const router = useRouter();
    const { activeAccount, isLoaded } = useActiveAccount();
    
    const [operations, setOperations] = useState([]);
    const [setups, setSetups] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showSetupModal, setShowSetupModal] = useState(false);
    const [selectedOp, setSelectedOp] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Edit states
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    
    const [resultType, setResultType] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        symbol: '',
        side: '', // LONG | SHORT
        sesion: '09:30',
        setupId: '',
        pnl: '',
        riesgo: '',
        comision: '',
        contratos: '',
        notes: '',
        imageUrl: '' // Enlace de la captura, ej. TradingView
    });


    // Calc RR
    const pnlVal = parseFloat(formData.pnl) || 0;
    const riesgoVal = parseFloat(formData.riesgo) || 0;
    const calculatedRR = riesgoVal > 0 ? (pnlVal / riesgoVal).toFixed(2) : '0.00';

    useEffect(() => {
        if (!isLoaded) return;
        if (!activeAccount) {
            router.push('/trading');
            return;
        }

        fetchData();
        fetchSetups();
    }, [activeAccount, isLoaded]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/trading/operations?accountId=${activeAccount.id}`);
            if (res.ok) {
                const data = await res.json();
                setOperations(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSetups = async () => {
        try {
            const res = await fetch(`/api/trading/setups`);
            if (res.ok) {
                const data = await res.json();
                setSetups(data);
            }
        } catch (err) {
            console.error(err);
            setSetups([]);
        }
    };

    const handleOpenModal = () => {

        setFormData({
            date: new Date().toISOString().split('T')[0],
            symbol: '',
            side: '',
            sesion: '09:30',
            setupId: '',
            pnl: '',
            riesgo: '',
            comision: '',
            contratos: '',
            notes: '',
            imageUrl: ''
        });
        setIsEditing(false);
        setEditId(null);
        setResultType('');
        setShowModal(true);
    };

    const handleEdit = (op) => {

        setFormData({
            date: op.date || new Date().toISOString().split('T')[0],
            symbol: op.symbol || '',
            side: op.side || '',
            sesion: op.sesion || '09:30',
            setupId: op.setupId || '',
            pnl: op.pnl ?? '',
            riesgo: op.riesgoAmount ?? (op.riskPercent ?? ''), // Compatibility fallback
            comision: op.comision ?? '',
            contratos: op.contratos ?? '',
            notes: op.notes || '',
            imageUrl: op.imageUrl || ''
        });
        setIsEditing(true);
        setEditId(op.id);
        
        let initialResultType = '';
        if (op.resultType === 'GANADA' || op.pnl > 0) initialResultType = 'TP';
        else if (op.resultType === 'PERDIDA' || op.pnl < 0) initialResultType = 'SL';
        else if (op.resultType === 'BREAK_EVEN' || op.pnl === 0) initialResultType = 'BE';
        setResultType(initialResultType);
        
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const parsedContratos = parseInt(formData.contratos, 10);
        if (!formData.date || !formData.symbol || !formData.side || !formData.riesgo || parseFloat(formData.riesgo) <= 0) {
            alert('Faltan campos obligatorios o el riesgo es inválido');
            return;
        }
        if (isNaN(parsedContratos) || parsedContratos < 1) {
            alert('Introduce una cantidad válida de contratos (entero > 0).');
            return;
        }

        setIsSubmitting(true);
        try {
            const submitData = {
                id: isEditing ? editId : undefined,
                accountId: activeAccount.id,
                date: formData.date,
                symbol: formData.symbol,
                side: formData.side,
                sesion: formData.sesion,
                setupId: formData.setupId,
                pnl: parseFloat(formData.pnl),
                riesgo: parseFloat(formData.riesgo),
                comision: parseFloat(formData.comision) || 0,
                contratos: parseInt(formData.contratos, 10),
                notes: formData.notes,
                imageUrl: formData.imageUrl,
                resultType: resultType,
            };

            const url = isEditing ? `/api/trading/operations/${editId}` : '/api/trading/operations';
            const method = isEditing ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submitData)
            });

            if (res.ok) {
                setShowModal(false);
                fetchData();
            } else {
                const responseData = await res.json();
                alert('Error: ' + responseData.error);
            }
        } catch (error) {
            alert('Server error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const viewDetail = (op) => {
        setSelectedOp(op);
        setShowDetailModal(true);
    };

    const handleDelete = async (id) => {
        if(confirm('¿Seguro que deseas eliminar esta operación?')) {
            try {
                const res = await fetch(`/api/trading/operations/${id}`, {
                    method: 'DELETE'
                });
                if(res.ok) {
                    fetchData();
                } else {
                    const data = await res.json();
                    alert(data.error);
                }
            } catch (err) {
                alert('Error al intentar eliminar');
            }
        }
    }

    if (!isLoaded || loading) return <div className={styles.container}><Loader2 className="animate-spin" /> Cargando bitácora...</div>;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Bitácora de Operaciones</h1>
                    <p className={styles.subtitle}>
                        Cuenta Activa: <strong>{activeAccount?.name}</strong> 
                        <span style={{ marginLeft: '8px', color: 'var(--text-muted)' }}>({operations.length} operaciones registradas)</span>
                    </p>
                </div>
                <button className={styles.btnPrimary} onClick={handleOpenModal}>
                    <Plus size={20} /> NUEVA OPERACIÓN
                </button>
            </div>

            <div className={styles.cardList}>
                {operations.length === 0 ? (
                    <div style={{textAlign: 'center', color: '#64748b', padding: '2rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)'}}>
                        No hay operaciones registradas.
                    </div>
                ) : operations.map(op => (
                    <div key={op.id} className={styles.opCard}>
                        
                        {/* IZQUIERDA: Icono Arrow */}
                        <div className={`${styles.cardIcon} ${op.side === 'LONG' ? styles.long : styles.short}`}>
                            {op.side === 'LONG' ? <ArrowUp size={32} /> : <ArrowDown size={32} />}
                        </div>

                        {/* CENTRO: Info Principal */}
                        <div className={styles.cardInfo}>
                            <div className={styles.cardTitle}>
                                <span>{op.symbol}</span>
                                <span className={`${styles.badge} ${op.side.toLowerCase() === 'long' ? styles.long : styles.short}`}>
                                    {op.side}
                                </span>
                            </div>
                            <div className={styles.cardMeta}>
                                <span>{op.date}</span>
                                <span>•</span>
                                <span className={`${styles.badge} ${styles.setup}`}>{op.setupName || 'Sin Setup'}</span>
                                <span>•</span>
                                <span className={`${styles.badge} ${styles.sesion}`}>{op.sesion || 'N/A'}</span>
                                <span>•</span>
                                <span className={`${styles.badge}`}>Contratos: {op.contratos ?? '-'}</span>
                            </div>
                            {op.imageUrl && (
                                <a href={op.imageUrl} target="_blank" rel="noopener noreferrer" className={styles.cardLink}>
                                    <LinkIcon size={14} /> Ver imagen
                                </a>
                            )}
                        </div>

                        {/* DERECHA: Financieros */}
                        <div className={styles.cardFinancials}>
                            <div className={styles.cardPnl} style={{ color: op.resultType === 'BREAK_EVEN' ? '#F59E0B' : op.pnl >= 0 ? '#1D9E75' : '#E24B4A', fontWeight: 'bold' }}>
                                {op.pnl >= 0 ? '+' : ''}${Math.abs(op.pnl).toLocaleString('en-US', {minimumFractionDigits: 2})}
                            </div>
                            <div className={styles.cardRisk}>
                                Riesgo: ${(op.riesgoAmount || Number(op.riskPercent)).toLocaleString('en-US', {minimumFractionDigits: 2})}
                            </div>
                            {op.comision > 0 && (
                                <div className={styles.cardRisk} style={{ color: '#ef4444', marginTop: '2px' }}>
                                    Comisión: -${op.comision.toFixed(2)}
                                </div>
                            )}
                            <div className={styles.cardRisk}>
                                Riesgo: ${(op.riesgoAmount || Number(op.riskPercent)).toLocaleString('en-US', {minimumFractionDigits: 2})}
                            </div>
                            <div className={styles.cardBadgeBox}>
                                <div className={`${styles.rrBox} ${op.resultR > 0 ? styles.positive : op.resultR < 0 ? styles.negative : ''}`}>
                                    {op.resultR > 0 ? '+' : ''}{Number(op.resultR).toFixed(2)}R
                                </div>
                            </div>
                        </div>

                        {/* EXTREMO DERECHO: Acciones */}
                        <div className={styles.cardActions}>
                            <button className={styles.btnAction} onClick={() => handleEdit(op)} title="Editar"><Edit size={18} /></button>
                            <button className={styles.btnAction} onClick={() => viewDetail(op)} title="Ver Detalles"><Eye size={18} /></button>
                            <button className={styles.btnAction} onClick={() => handleDelete(op.id)} title="Eliminar"><Trash2 size={18} /></button>
                        </div>

                    </div>
                ))}
            </div>

            {/* Modal Nueva Operacion */}
            {showModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h2>{isEditing ? 'Editar Operación' : 'Registrar Operación'} (Bitácora)</h2>
                            <button className={styles.btnAction} onClick={() => setShowModal(false)}><X size={24} /></button>
                        </div>
                        <form className={styles.modalBody} onSubmit={handleSubmit}>
                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label>Fecha</label>
                                    <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Instrumento</label>
                                    <InstrumentSelector
                                        value={formData.symbol}
                                        onChange={(val) => setFormData({...formData, symbol: val})}
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Dirección</label>
                                <div className={styles.directionToggle}>
                                    <button 
                                        type="button" 
                                        className={`${styles.dirBtn} ${formData.side === 'LONG' ? styles.activeLong : ''}`} 
                                        onClick={() => setFormData({...formData, side: 'LONG', setupId: ''})}>
                                        LONG
                                    </button>
                                    <button 
                                        type="button" 
                                        className={`${styles.dirBtn} ${formData.side === 'SHORT' ? styles.activeShort : ''}`} 
                                        onClick={() => setFormData({...formData, side: 'SHORT', setupId: ''})}>
                                        SHORT
                                    </button>
                                </div>
                            </div>

                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label>Setup</label>
                                    <div className={styles.setupContainer}>
                                        <select value={formData.setupId} onChange={e => setFormData({...formData, setupId: e.target.value})}>
                                            <option value="">Seleccionar setup</option>
                                            {setups
                                                .filter(s => !formData.side || s.direction === formData.side)
                                                .map(s => <option key={s.id} value={s.id}>{s.name} ({s.direction})</option>)
                                            }
                                        </select>
                                        <button type="button" className={styles.btnAction} onClick={() => setShowSetupModal(true)}>
                                            <Settings size={20} />
                                        </button>
                                    </div>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Hora de entrada</label>
                                    <input
                                        type="time"
                                        value={formData.sesion || ''}
                                        onChange={(e) => setFormData({...formData, sesion: e.target.value})}
                                        style={{
                                            background: '#0d1f14',
                                            border: '0.5px solid #1a3a24',
                                            borderRadius: '6px',
                                            padding: '7px 10px',
                                            color: '#9FE1CB',
                                            fontSize: '13px',
                                            width: '140px'
                                        }}
                                    />
                                </div>
                            </div>

                            <div className={styles.formGrid} style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                                <div className={styles.formGroup}>
                                    <label>Riesgo Asumido ($)</label>
                                    <input type="number" step="0.01" required value={formData.riesgo} onChange={e => setFormData({...formData, riesgo: e.target.value})} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Contratos</label>
                                    <input type="number" min="1" step="1" required placeholder="Ej. 2" value={formData.contratos} onChange={e => setFormData({...formData, contratos: e.target.value})} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Comisión ($) Opcional</label>
                                    <input type="number" step="0.01" placeholder="Ej: 2.74" value={formData.comision} onChange={e => setFormData({...formData, comision: e.target.value})} />
                                </div>
                            </div>

                            <div className={styles.formGrid} style={{ gridTemplateColumns: 'repeat(1, 1fr)' }}>
                                <div className={styles.formGroup}>
                                  <label>Resultado</label>
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    {['TP', 'BE', 'SL'].map(type => (
                                      <button
                                        key={type}
                                        type="button"
                                        onClick={() => {
                                          setResultType(type)
                                          if (type === 'BE') {
                                            setFormData({...formData, pnl: '0'})
                                          } else if (type === 'SL') {
                                            const currentPnl = parseFloat(formData.pnl) || 0
                                            setFormData({...formData, pnl: String(-Math.abs(currentPnl))})
                                          } else if (type === 'TP') {
                                            const currentPnl = parseFloat(formData.pnl) || 0
                                            setFormData({...formData, pnl: String(Math.abs(currentPnl))})
                                          }
                                        }}
                                        style={{
                                          flex: 1,
                                          padding: '8px',
                                          borderRadius: '8px',
                                          border: `1.5px solid ${resultType === type ? (type === 'SL' ? '#E24B4A' : type === 'BE' ? '#F59E0B' : '#1D9E75') : '#1a3a24'}`,
                                          background: resultType === type ? (type === 'SL' ? 'rgba(226,75,74,0.15)' : type === 'BE' ? 'rgba(245,158,11,0.15)' : 'rgba(29,158,117,0.15)') : '#0a1a0f',
                                          color: resultType === type ? (type === 'SL' ? '#E24B4A' : type === 'BE' ? '#F59E0B' : '#1D9E75') : '#9FE1CB',
                                          fontSize: '13px',
                                          fontWeight: '500',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        {type === 'TP' ? '✓ TP' : type === 'BE' ? '— BE' : '✕ SL'}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div className={styles.formGroup}>
                                  <label>PNL ($)</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={formData.pnl}
                                    onChange={(e) => {
                                      const val = e.target.value
                                      setFormData({...formData, pnl: val})
                                      if (resultType === 'SL' && parseFloat(val) > 0) {
                                        setFormData({...formData, pnl: String(-Math.abs(parseFloat(val)))})
                                      }
                                    }}
                                    style={{
                                      background: '#0d1f14',
                                      border: `1.5px solid ${resultType === 'SL' ? '#E24B4A' : resultType === 'TP' ? '#1D9E75' : resultType === 'BE' ? '#F59E0B' : '#1a3a24'}`,
                                      borderRadius: '6px',
                                      padding: '8px 10px',
                                      color: resultType === 'SL' ? '#E24B4A' : resultType === 'TP' ? '#1D9E75' : resultType === 'BE' ? '#F59E0B' : '#9FE1CB',
                                      fontSize: '14px',
                                      fontWeight: '500',
                                      width: '100%'
                                    }}
                                  />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label>R:R Calculado</label>
                                <div className={`${styles.rrDisplay} ${calculatedRR > 0 ? styles.positive : calculatedRR < 0 ? styles.negative : ''}`}>
                                    {calculatedRR > 0 ? '+' : ''}{calculatedRR}R
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Notas (Opcional)</label>
                                <textarea rows="3" placeholder="Observaciones sobre el trade..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}></textarea>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Enlace de imagen</label>
                                <input type="url" placeholder="https://www.tradingview.com/x/..." value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} />
                            </div>

                            <div className={styles.modalFooter}>
                                <button type="button" className={styles.btnCancel} onClick={() => setShowModal(false)} disabled={isSubmitting}>Cancelar</button>
                                <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar Operación'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Detail */}
            {showDetailModal && selectedOp && (
                <div className={styles.modalOverlay} onClick={() => setShowDetailModal(false)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Detalles del Trade ({selectedOp.symbol} - {selectedOp.side})</h2>
                            <button className={styles.btnAction} onClick={() => setShowDetailModal(false)}><X size={24} /></button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.formGrid}>
                                <div><strong>Fecha:</strong> {selectedOp.date}</div>
                                <div><strong>Sesión:</strong> {selectedOp.sesion || '-'}</div>
                                <div><strong>Setup:</strong> {selectedOp.setupName || 'Ninguno'}</div>
                                <div><strong>Riesgo ($):</strong> ${selectedOp.riesgoAmount || 0}</div>
                                <div><strong>Comisión:</strong> ${selectedOp.comision || 0}</div>
                                <div><strong>P&L:</strong> ${selectedOp.pnl}</div>
                                <div><strong>R:R:</strong> {selectedOp.resultR}R</div>
                                <div><strong>Contratos:</strong> {selectedOp.contratos ?? '-'}</div>
                            </div>
                            <div className={styles.formGroup} style={{marginTop: '1rem'}}>
                                <strong>Notas:</strong>
                                <p style={{color: 'var(--text-secondary)', padding: '1rem', background: 'var(--bg-primary)', borderRadius: '4px', whiteSpace: 'pre-wrap'}}>
                                    {selectedOp.notes || 'Sin notas registradas.'}
                                </p>
                            </div>
                            {selectedOp.imageUrl && (
                                <div className={styles.formGroup}>
                                    <strong>Enlace de Captura:</strong>
                                    <a href={selectedOp.imageUrl} target="_blank" rel="noopener noreferrer" style={{color: 'var(--accent-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem'}}>
                                        <LinkIcon size={18} /> Abrir imagen en una nueva pestaña (TradingView)
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showSetupModal && (
                <SetupManagerModal 
                    onClose={() => setShowSetupModal(false)} 
                    onSetupCreated={(newSetup) => {
                        setSetups([newSetup, ...setups]);
                    }}
                />
            )}
        </div>
    );
}
