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
    const [opsLimit, setOpsLimit] = useState(null);

    useEffect(() => {
      fetch('/api/trading/operations/count')
        .then(r => r.json())
        .then(data => setOpsLimit(data))
        .catch(() => {})
    }, [operations]);
    
    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showSetupModal, setShowSetupModal] = useState(false);
    const [selectedOp, setSelectedOp] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Edit states
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    
    const [setupNameFilter, setSetupNameFilter] = useState('');
    const [resultType, setResultType] = useState('');
    const [highlightedDate, setHighlightedDate] = useState(null);

    // Transfer states
    const [selectedOps, setSelectedOps] = useState([]);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [targetAccount, setTargetAccount] = useState('');
    const [accounts, setAccounts] = useState([]);
    const [transferring, setTransferring] = useState(false);
    const [transferSuccess, setTransferSuccess] = useState('');
    const [selectMode, setSelectMode] = useState(false);

    useEffect(() => {
      fetch('/api/trading/accounts')
        .then(r => r.json())
        .then(data => setAccounts(Array.isArray(data) ? data : []))
        .catch(() => {})
    }, []);

    const handleTransfer = async (actionType = 'transfer') => {
      if (!targetAccount || selectedOps.length === 0) return
      setTransferring(true)
      try {
        const res = await fetch('/api/trading/operations/transfer', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            operationIds: selectedOps,
            targetAccountId: parseInt(targetAccount),
            action: actionType
          })
        })
        const data = await res.json()
        if (res.ok) {
          setTransferSuccess(data.message)
          setShowTransferModal(false)
          setSelectedOps([])
          setSelectMode(false)
          setTargetAccount('')
          fetchData()
          setTimeout(() => setTransferSuccess(''), 3000)
        } else {
          alert('Error: ' + data.error)
        }
      } catch { alert('Error de conexión') }
      setTransferring(false)
    }

    useEffect(() => {
        if (typeof window !== "undefined") {
            const urlParams = new URLSearchParams(window.location.search);
            const dateParam = urlParams.get('date');
            if (dateParam) {
                setHighlightedDate(dateParam);
                const newUrl = window.location.pathname;
                window.history.replaceState({}, '', newUrl);
            }
            const setupParam = urlParams.get('setup');
            if (setupParam) {
                setSetupNameFilter(decodeURIComponent(setupParam));
            }
        }
    }, []);

    useEffect(() => {
        if (highlightedDate && operations.length > 0) {
            const matchingOp = operations.find(op => op.date === highlightedDate);
            if (matchingOp) {
                setTimeout(() => {
                    const element = document.getElementById(`op-${matchingOp.id}`);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 200);
            }
            const timer = setTimeout(() => {
                setHighlightedDate(null);
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [highlightedDate, operations]);

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
            const accountId = activeAccount?.id;
            const res = await fetch(`/api/trading/setups${accountId ? `?accountId=${accountId}` : ''}`);
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
            riesgo: op.riesgoAmount ?? op.riesgo_amount ?? (op.riskPercent ?? ''), // Compatibility fallback
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
                accountId: formData.accountId || activeAccount?.id,
                setupId: formData.setupId ? parseInt(formData.setupId, 10) : null,
                date: formData.date,
                symbol: formData.symbol,
                side: formData.side,
                sesion: formData.sesion,
                pnl: parseFloat(formData.pnl) || 0,
                riesgo: parseFloat(formData.riesgo) || parseFloat(formData.riesgoAmount) || 0,
                comision: parseFloat(formData.comision) || 0,
                contratos: parseInt(formData.contratos, 10) || 1,
                resultType: resultType,
                notes: formData.notes || '',
                imageUrl: formData.imageUrl,
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

    const filteredOperations = operations.filter(op => {
        if (!setupNameFilter) return true;
        const sName = op.setup_name || op.setupName || '';
        return sName === setupNameFilter || sName.toLowerCase().includes(setupNameFilter.toLowerCase());
    });

    if (!isLoaded || loading) return <div className={styles.container}><Loader2 className="animate-spin" /> Cargando bitácora...</div>;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Bitácora de Operaciones</h1>
                    <p className={styles.subtitle}>
                        Cuenta Activa: <strong>{activeAccount?.name}</strong> 
                        <span style={{ marginLeft: '8px', color: 'var(--text-muted)' }}>({filteredOperations.length} operaciones registradas)</span>
                    </p>
                </div>
                <button
                  onClick={() => opsLimit?.canAdd !== false ? handleOpenModal() : null}
                  disabled={opsLimit?.canAdd === false}
                  style={{
                    padding: '9px 18px',
                    background: opsLimit?.canAdd === false ? '#1a3a24' : '#1D9E75',
                    border: 'none', borderRadius: '8px', color: opsLimit?.canAdd === false ? 'rgba(159,225,203,0.3)' : '#fff',
                    fontSize: '13px', fontWeight: '500',
                    cursor: opsLimit?.canAdd === false ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px'
                  }}
                  title={opsLimit?.canAdd === false ? 'Límite de 30 operaciones alcanzado. Actualiza a Pro.' : ''}>
                  {opsLimit?.canAdd === false ? '🔒 Límite alcanzado' : <><Plus size={20} /> NUEVA OPERACIÓN</>}
                </button>
            </div>

            {/* BANNER DE LÍMITE */}
            {opsLimit && !opsLimit.isPro && (
              <>
                {opsLimit.warningLevel === 'critical' && (
                  <div style={{
                    background: 'rgba(226,75,74,0.1)', border: '0.5px solid #E24B4A',
                    borderRadius: '10px', padding: '12px 16px', marginBottom: '16px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px'
                  }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#E24B4A', marginBottom: '3px' }}>
                        ⚠️ Te quedan solo {opsLimit.remaining} operación{opsLimit.remaining !== 1 ? 'es' : ''} disponible{opsLimit.remaining !== 1 ? 's' : ''}
                      </div>
                      <div style={{ fontSize: '12px', color: 'rgba(159,225,203,0.6)' }}>
                        Has usado {opsLimit.count} de 30 registros. No puedes eliminar operaciones en este nivel.
                      </div>
                    </div>
                    <a href="https://travitrade.com/pages/precios.html"
                      style={{ padding: '7px 16px', background: '#1D9E75', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px', fontWeight: '500', cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                      Actualizar a Pro →
                    </a>
                  </div>
                )}
                {opsLimit.warningLevel === 'warning' && (
                  <div style={{
                    background: 'rgba(245,158,11,0.1)', border: '0.5px solid #F59E0B',
                    borderRadius: '10px', padding: '12px 16px', marginBottom: '16px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px'
                  }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#F59E0B', marginBottom: '3px' }}>
                        📊 Te quedan {opsLimit.remaining} operaciones disponibles
                      </div>
                      <div style={{ fontSize: '12px', color: 'rgba(159,225,203,0.6)' }}>
                        Plan Free: {opsLimit.count}/30 operaciones usadas.
                      </div>
                    </div>
                    <a href="https://travitrade.com/pages/precios.html"
                      style={{ padding: '7px 16px', background: '#F59E0B', border: 'none', borderRadius: '8px', color: '#0a1a0f', fontSize: '12px', fontWeight: '500', cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                      Ver Plan Pro →
                    </a>
                  </div>
                )}
              </>
            )}

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
              <button onClick={() => { setSelectMode(!selectMode); setSelectedOps([]) }}
                style={{ padding: '8px 16px', background: selectMode ? '#0f2e1a' : 'transparent', border: `0.5px solid ${selectMode ? '#1D9E75' : '#1a3a24'}`, borderRadius: '8px', color: selectMode ? '#1D9E75' : 'rgba(159,225,203,0.6)', fontSize: '13px', cursor: 'pointer' }}>
                {selectMode ? `✓ ${selectedOps.length} seleccionadas` : 'Seleccionar'}
              </button>

              {selectMode && selectedOps.length > 0 && (
                <button onClick={() => setShowTransferModal(true)}
                  style={{ padding: '8px 16px', background: '#1D9E75', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
                  Transferir o Copiar a otra cuenta →
                </button>
              )}

              {selectMode && (
                <button onClick={() => setSelectedOps(filteredOperations.map(o => o.id))}
                  style={{ padding: '8px 16px', background: 'transparent', border: '0.5px solid #1a3a24', borderRadius: '8px', color: 'rgba(159,225,203,0.5)', fontSize: '12px', cursor: 'pointer' }}>
                  Seleccionar todas
                </button>
              )}
            </div>

            {setupNameFilter && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#0f2e1a', border: '0.5px solid #1D9E75',
                borderRadius: '8px', padding: '8px 14px', marginBottom: '14px'
              }}>
                <span style={{ fontSize: '13px', color: '#1D9E75' }}>
                  🎯 Filtrando por setup: <strong>{setupNameFilter}</strong>
                </span>
                <button onClick={() => {
                  setSetupNameFilter('')
                  window.history.replaceState({}, '', '/trading/operations')
                }}
                  style={{ background: 'transparent', border: 'none', color: '#E24B4A', fontSize: '18px', cursor: 'pointer', lineHeight: 1 }}>
                  ×
                </button>
              </div>
            )}

            {transferSuccess && (
              <div style={{ background: 'rgba(29,158,117,0.1)', border: '0.5px solid #1D9E75', borderRadius: '8px', padding: '10px 14px', color: '#1D9E75', fontSize: '13px', marginBottom: '12px' }}>
                ✓ {transferSuccess}
              </div>
            )}

            <div className={styles.cardList}>
                {filteredOperations.length === 0 ? (
                    <div style={{textAlign: 'center', color: '#64748b', padding: '2rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)'}}>
                        No hay operaciones registradas.
                    </div>
                ) : filteredOperations.map(op => {
                    const isSelected = selectedOps.includes(op.id);
                    return (
                    <div 
                        key={op.id} 
                        id={`op-${op.id}`} 
                        onClick={() => {
                            if (!selectMode) setSelectMode(true);
                            setSelectedOps(prev => prev.includes(op.id) ? prev.filter(id => id !== op.id) : [...prev, op.id]);
                        }}
                        className={`${styles.opCard} ${op.date === highlightedDate ? styles.highlightedCard : ''}`}
                        style={{
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'all 0.2s ease',
                            ...(isSelected ? {
                                border: '1.5px solid #1D9E75',
                                boxShadow: '0 0 12px rgba(29, 158, 117, 0.35)',
                                background: 'rgba(29, 158, 117, 0.08)'
                            } : {})
                        }}
                    >
                        {isSelected && (
                          <div style={{
                            position: 'absolute',
                            top: '8px',
                            right: '12px',
                            background: '#1D9E75',
                            color: '#fff',
                            borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justify: 'center',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            boxShadow: '0 0 6px rgba(29,158,117,0.6)',
                            zIndex: 2
                          }}>
                            ✓
                          </div>
                        )}

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
                                {(op.setup_name || op.setupName) ? (
                                  <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                                    fontSize: '11px', padding: '2px 8px', borderRadius: '20px',
                                    background: '#0a1a0f', border: '0.5px solid #1a3a24',
                                    color: '#9FE1CB'
                                  }}>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: op.setup_color || op.setupColor || '#1D9E75', flexShrink: 0 }} />
                                    {op.setup_name || op.setupName}
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '11px', color: 'rgba(159,225,203,0.3)' }}>Sin setup</span>
                                )}
                                <span>•</span>
                                <span className={`${styles.badge} ${styles.sesion}`}>{op.sesion || 'N/A'}</span>
                                <span>•</span>
                                <span className={`${styles.badge}`}>Contratos: {op.contratos ?? '-'}</span>
                            </div>
                            {(op.imageUrl || op.image_url) && (
                                <a href={op.imageUrl || op.image_url} target="_blank" rel="noopener noreferrer" className={styles.cardLink} onClick={e => e.stopPropagation()}>
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
                                Riesgo: ${(op.riesgoAmount ?? op.riesgo_amount ?? Number(op.riskPercent ?? 0)).toLocaleString('en-US', {minimumFractionDigits: 2})}
                            </div>
                            {op.comision > 0 && (
                                <div className={styles.cardRisk} style={{ color: '#ef4444', marginTop: '2px' }}>
                                    Comisión: -${op.comision.toFixed(2)}
                                </div>
                            )}
                            <div className={styles.cardBadgeBox}>
                                <div className={`${styles.rrBox} ${(op.resultR ?? op.result_r ?? 0) > 0 ? styles.positive : (op.resultR ?? op.result_r ?? 0) < 0 ? styles.negative : ''}`}>
                                    {(op.resultR ?? op.result_r ?? 0) > 0 ? '+' : ''}{Number(op.resultR ?? op.result_r ?? 0).toFixed(2)}R
                                </div>
                            </div>
                        </div>

                        {/* EXTREMO DERECHO: Acciones */}
                        <div className={styles.cardActions}>
                            <button className={styles.btnAction} onClick={(e) => { e.stopPropagation(); handleEdit(op); }} title="Editar"><Edit size={18} /></button>
                            <button className={styles.btnAction} onClick={(e) => { e.stopPropagation(); viewDetail(op); }} title="Ver Detalles"><Eye size={18} /></button>
                            {opsLimit?.canDelete !== false ? (
                              <button className={styles.btnAction} onClick={(e) => { e.stopPropagation(); handleDelete(op.id); }} title="Eliminar"><Trash2 size={18} /></button>
                            ) : (
                              <span title="No puedes eliminar con 25+ operaciones en plan Free"
                                style={{ fontSize: '11px', color: 'rgba(159,225,203,0.2)', cursor: 'not-allowed', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px' }}>
                                🔒
                              </span>
                            )}
                        </div>

                    </div>
                    );
                })}
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
                                                .filter(s => !formData.side || s.direction === formData.side || s.direction === 'BOTH')
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
                                <div><strong>Riesgo ($):</strong> ${selectedOp.riesgoAmount ?? selectedOp.riesgo_amount ?? 0}</div>
                                <div><strong>Comisión:</strong> ${selectedOp.comision || 0}</div>
                                <div><strong>P&L:</strong> ${selectedOp.pnl}</div>
                                <div><strong>R:R:</strong> {selectedOp.resultR ?? selectedOp.result_r ?? 0}R</div>
                                <div><strong>Contratos:</strong> {selectedOp.contratos ?? '-'}</div>
                            </div>
                            <div className={styles.formGroup} style={{marginTop: '1rem'}}>
                                <strong>Notas:</strong>
                                <p style={{color: 'var(--text-secondary)', padding: '1rem', background: 'var(--bg-primary)', borderRadius: '4px', whiteSpace: 'pre-wrap'}}>
                                    {selectedOp.notes || 'Sin notas registradas.'}
                                </p>
                            </div>
                             {(selectedOp.imageUrl || selectedOp.image_url) && (
                                <div className={styles.formGroup}>
                                    <strong>Enlace de Captura:</strong>
                                    <a href={selectedOp.imageUrl || selectedOp.image_url} target="_blank" rel="noopener noreferrer" style={{color: 'var(--accent-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem'}}>
                                        <LinkIcon size={18} /> Abrir imagen en una nueva pestaña (TradingView)
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showTransferModal && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                <div style={{ background: '#0d1f14', border: '0.5px solid #1a3a24', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '440px' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: '500', color: '#fff', marginBottom: '6px' }}>Transferir o Copiar Operaciones</h2>
                  <p style={{ fontSize: '13px', color: 'rgba(159,225,203,0.5)', marginBottom: '20px' }}>
                    {selectedOps.length} operación(es) seleccionada(s)
                  </p>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ fontSize: '11px', color: 'rgba(159,225,203,0.5)', letterSpacing: '1px', marginBottom: '8px', display: 'block' }}>CUENTA DESTINO</label>
                    <select value={targetAccount} onChange={e => setTargetAccount(e.target.value)}
                      style={{ width: '100%', background: '#0a1a0f', border: '0.5px solid #1a3a24', borderRadius: '8px', padding: '10px 12px', color: '#9FE1CB', fontSize: '13px' }}>
                      <option value="">Selecciona la cuenta destino</option>
                      {accounts
                        .filter(a => a.id !== activeAccount?.id)
                        .map(a => <option key={a.id} value={a.id}>{a.name} — {a.broker || 'Sin broker'}</option>)
                      }
                    </select>
                  </div>
                  <div style={{ background: 'rgba(29,158,117,0.1)', border: '0.5px solid #1D9E75', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#9FE1CB', marginBottom: '20px', lineHeight: '1.5' }}>
                    • <strong>Transferir</strong>: Desplaza las operaciones seleccionadas a la otra cuenta.<br/>
                    • <strong>Copiar</strong>: Mantiene la operación en ambas cuentas.<br/>
                    <span style={{ color: 'rgba(159,225,203,0.6)', fontSize: '11px' }}>📅 En ambas cuentas se ordenan automáticamente según la fecha.</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={() => handleTransfer('transfer')} disabled={!targetAccount || transferring}
                        style={{ flex: 1, padding: '10px', background: '#1D9E75', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '500', cursor: 'pointer', opacity: !targetAccount || transferring ? 0.6 : 1 }}>
                        {transferring ? 'Procesando...' : 'Transferir'}
                      </button>
                      <button onClick={() => handleTransfer('copy')} disabled={!targetAccount || transferring}
                        style={{ flex: 1, padding: '10px', background: '#0f2e1a', border: '0.5px solid #1D9E75', borderRadius: '8px', color: '#1D9E75', fontSize: '13px', fontWeight: '500', cursor: 'pointer', opacity: !targetAccount || transferring ? 0.6 : 1 }}>
                        {transferring ? 'Procesando...' : 'Copiar'}
                      </button>
                    </div>
                    <button onClick={() => { setShowTransferModal(false); setTargetAccount('') }}
                      style={{ width: '100%', padding: '10px', background: 'transparent', border: '0.5px solid #1a3a24', borderRadius: '8px', color: 'rgba(159,225,203,0.5)', fontSize: '13px', cursor: 'pointer' }}>
                      Cancelar
                    </button>
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
