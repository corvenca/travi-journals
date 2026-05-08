'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useActiveAccount } from '@/components/trading/AccountContext';
import { Plus, Briefcase, ChevronRight, Loader2, Trash2 } from 'lucide-react';
import styles from './page.module.css';

export default function TradingAccountsPage() {
    const router = useRouter();
    const { activeAccount, setAccount, isLoaded } = useActiveAccount();
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    
    // Check URL params for auto-opening modal
    useEffect(() => {
        if (typeof window !== "undefined") {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('action') === 'create') {
                setShowModal(true);
            }
        }
    }, []);
    
    // Form state
    const [formData, setFormData] = useState({
        id: null,
        name: '',
        broker: '',
        type: 'REAL',
        initialCapital: '',
        riskPercent: '1',
        traderName: '',
        traderEmail: '',
        traderAddress: '',
        accountNumber: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        try {
            const res = await fetch('/api/trading/accounts');
            if (res.ok) {
                const data = await res.json();
                setAccounts(data);
            }
        } catch (error) {
            console.error("Error fetching accounts:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAccount = (acc) => {
        setAccount(acc);
        router.push(`/trading/dashboard`);
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (confirm('¿Estás seguro de eliminar esta cuenta? Se perderán sus historiales.')) {
            try {
                const res = await fetch(`/api/trading/accounts?id=${id}`, { method: 'DELETE' });
                if (res.ok) {
                    if (activeAccount?.id === id) setAccount(null);
                    await fetchAccounts();
                } else {
                    alert('Error al eliminar cuenta');
                }
            } catch (err) {
                console.error(err);
            }
        }
    };

    const handleEdit = (e, acc) => {
        e.stopPropagation();
        setFormData({
            id: acc.id,
            name: acc.name || '',
            broker: acc.broker || '',
            type: acc.type || 'REAL',
            initialCapital: acc.initialCapital || '',
            riskPercent: acc.riskPercent || '1',
            traderName: acc.traderName || '',
            traderEmail: acc.traderEmail || '',
            traderAddress: acc.traderAddress || '',
            accountNumber: acc.accountNumber || ''
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const isEditing = !!formData.id;
        const method = isEditing ? 'PUT' : 'POST';
        
        try {
            const res = await fetch('/api/trading/accounts', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: formData.id,
                    name: formData.name,
                    broker: formData.broker,
                    type: formData.type,
                    initialCapital: parseFloat(formData.initialCapital) || 0,
                    riskPercent: parseFloat(formData.riskPercent) || 1,
                    traderName: formData.traderName,
                    traderEmail: formData.traderEmail,
                    traderAddress: formData.traderAddress,
                    accountNumber: formData.accountNumber
                })
            });

            if (res.ok) {
                await fetchAccounts();
                setShowModal(false);
                setFormData({ id: null, name: '', broker: '', type: 'REAL', initialCapital: '', riskPercent: '1', traderName: '', traderEmail: '', traderAddress: '', accountNumber: '' });
            } else {
                alert('Error al guardar la cuenta');
            }
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isLoaded || loading) {
        return <div className={styles.loadingWrapper}><Loader2 className="animate-spin" size={32} /></div>;
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Centro de Cuentas</h1>
                    <p className={styles.subtitle}>Selecciona una cuenta para operar o crea una nueva.</p>
                </div>
                <button className={styles.btnPrimary} onClick={() => setShowModal(true)}>
                    <Plus size={20} /> NUEVA CUENTA
                </button>
            </header>

            {accounts.length === 0 ? (
                <div className={styles.emptyState}>
                    <Briefcase size={48} className={styles.emptyIcon} />
                    <h2>Aún no tienes cuentas de trading</h2>
                    <p>Crea tu primera cuenta para empezar a registrar tus operaciones y medir tu consistencia.</p>
                    <button className={styles.btnPrimary} onClick={() => setShowModal(true)} style={{ marginTop: '1.5rem' }}>
                        <Plus size={20} /> Crear Mi Primera Cuenta
                    </button>
                </div>
            ) : (
                <div className={styles.accountsGrid}>
                    {accounts.map(acc => {
                        const operationsCount = acc.operationsCount || 0;
                        const totalPnl = acc.totalPnl || 0;
                        const initialCapital = acc.initialCapital || 0;
                        const equity = initialCapital + totalPnl;
                        const riskAmount = equity * ((acc.riskPercent || 1) / 100);
                        
                        return (
                        <div 
                            key={acc.id} 
                            className={`${styles.accountCard} ${activeAccount?.id === acc.id ? styles.activeCard : ''}`}
                        >
                            <div className={styles.cardHeader}>
                                <div className={styles.headerLeft}>
                                    <h3 className={styles.accountName}>{acc.name}</h3>
                                    <span className={`${styles.accountType} ${styles[acc.type.toLowerCase()]}`}>
                                        {acc.type}
                                    </span>
                                </div>
                                <div className={styles.headerActions}>
                                    {/* Action buttons later */}
                                    <button className={styles.btnIcon} onClick={(e) => handleEdit(e, acc)}>
                                        E
                                    </button>
                                    <button className={styles.btnIconDelete} onClick={(e) => handleDelete(e, acc.id)}>
                                        X
                                    </button>
                                </div>
                            </div>
                            <div className={styles.operationsBadge}>
                                {operationsCount} operaciones registradas
                            </div>
                            
                            <div className={styles.cardBody}>
                                <div className={styles.block}>
                                    <h4 className={styles.blockTitle}>DATOS GENERALES</h4>
                                    <div className={styles.dataRow}>
                                        <span className={styles.label}>Capital Inicial</span>
                                        <span className={styles.value}>USD {initialCapital.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                                    </div>
                                    <div className={styles.dataRow}>
                                        <span className={styles.label}>PnL Acumulado</span>
                                        <span className={`${styles.value} ${totalPnl >= 0 ? styles.positiveText : styles.negativeText}`}>
                                            {totalPnl >= 0 ? '+' : '-'}USD {Math.abs(totalPnl).toLocaleString('en-US', {minimumFractionDigits: 2})}
                                        </span>
                                    </div>
                                    <div className={styles.dataRow}>
                                        <span className={styles.label}>Equity Actual</span>
                                        <span className={`${styles.value} ${styles.highlightValue}`}>
                                            USD {equity.toLocaleString('en-US', {minimumFractionDigits: 2})}
                                        </span>
                                    </div>
                                </div>

                                <div className={styles.block}>
                                    <h4 className={styles.blockTitle}>GESTIÓN DE RIESGO</h4>
                                    <div className={styles.dataRow}>
                                        <span className={styles.label}>% diario configurado</span>
                                        <span className={styles.value}>{acc.riskPercent}%</span>
                                    </div>
                                    <div className={styles.dataRow}>
                                        <span className={styles.label}>Riesgo recomendado hoy</span>
                                        <span className={`${styles.value} ${styles.riskText}`}>
                                            USD {riskAmount.toLocaleString('en-US', {minimumFractionDigits: 2})}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className={styles.cardFooter}>
                                <button className={styles.btnEnter} onClick={() => handleSelectAccount(acc)}>
                                    ENTRAR A ESTA CUENTA
                                </button>
                            </div>
                        </div>
                        );
                    })}
                </div>
            )}

            {/* Modal de Nueva Cuenta */}
            {showModal && (
                <div className={styles.modalOverlay} style={{ overflowY: 'auto' }}>
                    <div className={styles.modalContent} style={{ overflowY: 'auto', maxHeight: '85vh' }}>
                        <h2 className={styles.modalTitle}>Crear Nueva Cuenta</h2>
                        <form onSubmit={handleSubmit}>
                            <div className={styles.formGroup}>
                                <label>Nombre de la Cuenta</label>
                                <input 
                                    type="text" 
                                    required 
                                    value={formData.name} 
                                    onChange={(e) => setFormData({...formData, name: e.target.value})} 
                                    placeholder="Ej: Fondeo 50K, Demo MT5..."
                                />
                            </div>
                            
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Broker (Opcional)</label>
                                    <input 
                                        type="text" 
                                        value={formData.broker} 
                                        onChange={(e) => setFormData({...formData, broker: e.target.value})} 
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Tipo</label>
                                    <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}>
                                        <option value="REAL">Real</option>
                                        <option value="DEMO">Demo</option>
                                        <option value="FUNDEO">Fondeo</option>
                                    </select>
                                </div>
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Capital Inicial ($)</label>
                                    <input 
                                        type="number" 
                                        required 
                                        step="0.01"
                                        value={formData.initialCapital} 
                                        onChange={(e) => setFormData({...formData, initialCapital: e.target.value})} 
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Riesgo Promedio (%)</label>
                                    <input 
                                        type="number" 
                                        required 
                                        step="0.1"
                                        value={formData.riskPercent} 
                                        onChange={(e) => setFormData({...formData, riskPercent: e.target.value})} 
                                    />
                                </div>
                            </div>

                            <hr style={{margin: '1.5rem 0', borderColor: 'var(--border-color)', borderBottom: 'none'}} />
                            <h3 style={{fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem'}}>DATOS DEL TRADER (Para Reportes Oficiales)</h3>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Nombre del Trader</label>
                                    <input 
                                        type="text" 
                                        value={formData.traderName} 
                                        onChange={(e) => setFormData({...formData, traderName: e.target.value})} 
                                        placeholder="Ej: Juan Pérez"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Correo Electrónico</label>
                                    <input 
                                        type="email" 
                                        value={formData.traderEmail} 
                                        onChange={(e) => setFormData({...formData, traderEmail: e.target.value})} 
                                    />
                                </div>
                            </div>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Número de Cuenta</label>
                                    <input 
                                        type="text" 
                                        value={formData.accountNumber} 
                                        onChange={(e) => setFormData({...formData, accountNumber: e.target.value})} 
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Dirección Oficial</label>
                                    <input 
                                        type="text" 
                                        value={formData.traderAddress} 
                                        onChange={(e) => setFormData({...formData, traderAddress: e.target.value})} 
                                    />
                                </div>
                            </div>
                            
                            <div className={styles.modalActions}>
                                <button type="button" className={styles.btnCancel} onClick={() => setShowModal(false)} disabled={isSubmitting}>
                                    Cancelar
                                </button>
                                <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
                                    {isSubmitting ? 'Guardando...' : 'Guardar Cuenta'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
