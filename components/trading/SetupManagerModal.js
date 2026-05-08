import React, { useState, useEffect } from 'react';
import { X, Trash2, Edit, Loader2 } from 'lucide-react';
import styles from '@/app/trading/operations/page.module.css';

export default function SetupManagerModal({ onClose, onSetupCreated }) {
    const [setups, setSetups] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Form state
    const [formData, setFormData] = useState({ id: null, name: '', direction: 'LONG' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchSetups();
    }, []);

    const fetchSetups = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/trading/setups');
            if (res.ok) {
                const data = await res.json();
                setSetups(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name) return;

        setIsSubmitting(true);
        const isEditing = !!formData.id;
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const res = await fetch('/api/trading/setups', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                const result = await res.json();
                
                if (isEditing) {
                    setSetups(setups.map(s => s.id === formData.id ? { ...formData } : s));
                } else {
                    const createdSetup = {
                        id: result.id,
                        name: formData.name,
                        direction: formData.direction
                    };
                    setSetups([createdSetup, ...setups]);
                    if (onSetupCreated) onSetupCreated(createdSetup);
                }
                
                setFormData({ id: null, name: '', direction: 'LONG' });
            } else {
                alert('Error al guardar el Setup');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditClick = (setup) => {
        setFormData({ id: setup.id, name: setup.name, direction: setup.direction });
    };

    const handleCancelEdit = () => {
        setFormData({ id: null, name: '', direction: 'LONG' });
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este Setup? No afectará a las operaciones pasadas pero no podrás seleccionarlo más.')) return;
        
        try {
            const res = await fetch(`/api/trading/setups?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                setSetups(setups.filter(s => s.id !== id));
                if (formData.id === id) handleCancelEdit();
            } else {
                alert('Error al eliminar');
            }
        } catch(error) {
            console.error(error);
        }
    };

    return (
        <div className={styles.modalOverlay} style={{ zIndex: 1100 }}>
            <div className={styles.modalContent} style={{ maxWidth: '500px' }}>
                <div className={styles.modalHeader}>
                    <h2>Gestión de Setups</h2>
                    <button type="button" className={styles.btnAction} onClick={onClose}><X size={24} /></button>
                </div>
                <div className={styles.modalBody}>
                    
                    {/* Formulario fijo arriba */}
                    <form onSubmit={handleSubmit} style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                        <h3 style={{ marginBottom: '1rem', fontSize: '1rem', color: 'var(--white)' }}>
                            {formData.id ? 'Editar Setup' : 'Nuevo Setup'}
                        </h3>
                        
                        <div className={styles.formGroup} style={{ marginBottom: '1rem' }}>
                            <label>Nombre del Setup</label>
                            <input 
                                type="text" 
                                required 
                                placeholder="Ej: Engulfing + EMA"
                                value={formData.name} 
                                onChange={e => setFormData({...formData, name: e.target.value})} 
                            />
                        </div>

                        <div className={styles.formGroup} style={{ marginBottom: '1.5rem' }}>
                            <label>Dirección del Trade</label>
                            <div className={styles.directionToggle} style={{ display: 'flex', gap: '0.5rem' }}>
                                <button 
                                    type="button" 
                                    className={`${styles.dirBtn} ${formData.direction === 'LONG' ? styles.activeLong : ''}`} 
                                    onClick={() => setFormData({...formData, direction: 'LONG'})}
                                >
                                    LONG
                                </button>
                                <button 
                                    type="button" 
                                    className={`${styles.dirBtn} ${formData.direction === 'SHORT' ? styles.activeShort : ''}`} 
                                    onClick={() => setFormData({...formData, direction: 'SHORT'})}
                                >
                                    SHORT
                                </button>
                            </div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            {formData.id && (
                                <button type="button" className={styles.btnCancel} onClick={handleCancelEdit}>Cancelar Edición</button>
                            )}
                            <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
                                {isSubmitting ? 'Guardando...' : (formData.id ? 'Actualizar Setup' : 'Guardar Setup')}
                            </button>
                        </div>
                    </form>

                    {/* Lista abajo */}
                    <div style={{ marginTop: '1.5rem' }}>
                        <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Setups Registrados</h3>
                        
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}><Loader2 className="animate-spin" /></div>
                        ) : setups.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2rem', background: 'var(--bg-primary)', borderRadius: '8px', color: 'var(--text-muted)' }}>
                                No hay setups registrados.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                                {setups.map(setup => (
                                    <div key={setup.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                        <div>
                                            <div style={{ fontWeight: 'bold', color: 'var(--white)' }}>{setup.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: setup.direction === 'LONG' ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold' }}>{setup.direction}</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button type="button" className={styles.btnAction} onClick={() => handleEditClick(setup)}>
                                                <Edit size={18} />
                                            </button>
                                            <button type="button" className={styles.btnAction} onClick={() => handleDelete(setup.id)}>
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
