'use client';
import { useState, useEffect } from 'react';
import { useActiveAccount } from '@/components/trading/AccountContext';
import styles from './page.module.css';
import { Search, DollarSign, ExternalLink, Calendar, PlusCircle } from 'lucide-react';

export default function CommissionsPage() {
    const { activeAccount, isLoaded } = useActiveAccount();
    const [commissions, setCommissions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isLoaded) return;
        if (!activeAccount) {
            setLoading(false);
            return;
        }
        
        fetchCommissions();
    }, [activeAccount, isLoaded]);

    const fetchCommissions = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/trading/commissions?accountId=${activeAccount.id}`);
            if (res.ok) {
                const data = await res.json();
                setCommissions(data);
            } else {
                console.error("Error al cargar comisiones");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (!isLoaded || loading) {
        return <div className={styles.container}><div className={styles.emptyState}>Cargando comisiones...</div></div>;
    }

    if (!activeAccount) {
        return (
            <div className={styles.container}>
                <div className={styles.emptyState}>
                    <h2>Selecciona una cuenta</h2>
                    <p>Debes seleccionar una cuenta activa en el menú lateral para ver el histórico de gastos.</p>
                </div>
            </div>
        );
    }

    // Calcular Métricas
    const totalC = commissions.reduce((acc, c) => acc + c.amount, 0);
    const todayStr = new Date().toISOString().split('T')[0];
    const thisMonthStr = todayStr.substring(0, 7);
    const monthC = commissions.filter(c => c.date.startsWith(thisMonthStr)).reduce((acc, c) => acc + c.amount, 0);
    const avgC = commissions.length > 0 ? (totalC / commissions.length) : 0;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Histórico de Comisiones</h1>
                    <p className={styles.subtitle}>Registro contable independiente de fees y comisiones.</p>
                </div>
            </header>

            <div className={styles.metricsGrid}>
                <div className={styles.metricCard}>
                    <h3 className={styles.metricTitle}><DollarSign size={16}/> Comisiones Históricas</h3>
                    <p className={`${styles.metricValue} ${styles.negative}`}>
                        -${totalC.toFixed(2)}
                    </p>
                </div>
                <div className={styles.metricCard}>
                    <h3 className={styles.metricTitle}><Calendar size={16}/> Pagado este Mes</h3>
                    <p className={`${styles.metricValue} ${styles.negative}`}>
                        -${monthC.toFixed(2)}
                    </p>
                </div>
                <div className={styles.metricCard}>
                    <h3 className={styles.metricTitle}>Promedio por Registro</h3>
                    <p className={`${styles.metricValue}`}>
                        ${avgC.toFixed(2)}
                    </p>
                </div>
                <div className={styles.metricCard}>
                    <h3 className={styles.metricTitle}>Total Transacciones</h3>
                    <p className={`${styles.metricValue}`}>
                        {commissions.length}
                    </p>
                </div>
            </div>

            {commissions.length === 0 ? (
                <div className={styles.emptyState}>
                    <h3>No hay comisiones registradas</h3>
                    <p>Las comisiones operativas surgirán aquí cuando ingreses trades con costos.</p>
                </div>
            ) : (
                <table className={styles.commissionsTable}>
                    <thead>
                        <tr>
                            <th>FECHA</th>
                            <th>DESCRIPCIÓN</th>
                            <th>OPERACIÓN VINCULADA</th>
                            <th>IMPORTE ($)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {commissions.map(c => (
                            <tr key={c.id}>
                                <td>{c.date}</td>
                                <td>{c.description || 'Comisión de Operación'}</td>
                                <td>
                                    {c.operationId ? (
                                        <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                            <span style={{background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem'}}>#{c.operationId}</span>
                                            {c.symbol} {c.side}
                                        </div>
                                    ) : '-'}
                                </td>
                                <td className={styles.amount}>-${c.amount.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
