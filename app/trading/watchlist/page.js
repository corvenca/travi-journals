'use client'
import { useState, useEffect } from 'react'
import { Trash2, Plus, Loader2 } from 'lucide-react'

const CATEGORIES = ['Futuros', 'Forex', 'Commodities', 'Acciones', 'Cripto']

export default function WatchlistPage() {
    const [instruments, setInstruments] = useState([])
    const [loading, setLoading] = useState(true)
    const [newCategory, setNewCategory] = useState('Futuros')
    const [newTicker, setNewTicker] = useState('')
    const [newName, setNewName] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        fetchInstruments()
    }, [])

    const fetchInstruments = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/trading/instruments')
            if (res.ok) {
                const data = await res.json()
                setInstruments(data)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleAdd = async (e) => {
        e.preventDefault()
        if (!newTicker) return
        setIsSubmitting(true)
        try {
            const res = await fetch('/api/trading/instruments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category: newCategory, ticker: newTicker, name: newName || newTicker })
            })
            if (res.ok) {
                setNewTicker('')
                setNewName('')
                fetchInstruments()
            }
        } catch (error) {
            console.error(error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('¿Eliminar este instrumento de tu lista?')) return
        try {
            const res = await fetch(`/api/trading/instruments?id=${id}`, { method: 'DELETE' })
            if (res.ok) {
                fetchInstruments()
            }
        } catch (error) {
            console.error(error)
        }
    }

    const grouped = CATEGORIES.reduce((acc, cat) => {
        acc[cat] = instruments.filter(i => i.category === cat)
        return acc
    }, {})

    if (loading) return <div style={{display: 'flex', justifyContent: 'center', padding: '4rem', color: '#9FE1CB'}}><Loader2 className="animate-spin" size={32} /></div>

    return (
        <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#ffffff', marginBottom: '0.5rem' }}>Mis Instrumentos (Watchlist)</h1>
            <p style={{ color: '#9FE1CB', marginBottom: '2rem' }}>Gestiona los instrumentos que aparecen en tus formularios de operaciones.</p>

            <div style={{ background: '#0a1a0f', border: '1px solid #1a3a24', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.2rem', color: '#1D9E75', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Plus size={20} /> Agregar Instrumento
                </h2>
                <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '12px', color: '#9FE1CB', fontWeight: '500' }}>Categoría</label>
                        <select 
                            value={newCategory} 
                            onChange={e => setNewCategory(e.target.value)}
                            style={{ background: '#0d1f14', border: '1px solid #1a3a24', color: '#9FE1CB', padding: '10px', borderRadius: '8px', fontSize: '14px', width: '100%' }}
                        >
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '12px', color: '#9FE1CB', fontWeight: '500' }}>Ticker / Símbolo</label>
                        <input 
                            required
                            placeholder="Ej: NQ, TSLA..."
                            value={newTicker} 
                            onChange={e => setNewTicker(e.target.value.toUpperCase())}
                            style={{ background: '#0d1f14', border: '1px solid #1a3a24', color: '#9FE1CB', padding: '10px', borderRadius: '8px', fontSize: '14px', width: '100%' }}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '12px', color: '#9FE1CB', fontWeight: '500' }}>Nombre Descriptivo</label>
                        <input 
                            placeholder="Ej: Nasdaq Futures (Opcional)"
                            value={newName} 
                            onChange={e => setNewName(e.target.value)}
                            style={{ background: '#0d1f14', border: '1px solid #1a3a24', color: '#9FE1CB', padding: '10px', borderRadius: '8px', fontSize: '14px', width: '100%' }}
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        style={{ background: '#1D9E75', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', height: '41px' }}
                    >
                        {isSubmitting ? 'Guardando...' : 'Guardar'}
                    </button>
                </form>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {CATEGORIES.map(cat => (
                    grouped[cat]?.length > 0 && (
                        <div key={cat} style={{ background: '#0d1f14', border: '1px solid #1a3a24', borderRadius: '12px', overflow: 'hidden' }}>
                            <div style={{ background: '#0a1a0f', padding: '1rem', borderBottom: '1px solid #1a3a24' }}>
                                <h3 style={{ color: '#ffffff', fontWeight: '600', fontSize: '1.1rem' }}>{cat} <span style={{ color: '#1D9E75', fontSize: '0.9rem', marginLeft: '8px' }}>({grouped[cat].length})</span></h3>
                            </div>
                            <div style={{ padding: '0' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <tbody>
                                        {grouped[cat].map(inst => (
                                            <tr key={inst.id} style={{ borderBottom: '1px solid #1a3a24' }}>
                                                <td style={{ padding: '1rem', width: '150px' }}>
                                                    <span style={{ background: '#0f2a1a', color: '#1D9E75', padding: '4px 8px', borderRadius: '6px', fontWeight: '600', fontSize: '13px' }}>
                                                        {inst.ticker}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1rem', color: '#9FE1CB' }}>
                                                    {inst.name}
                                                </td>
                                                <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                    <button 
                                                        onClick={() => handleDelete(inst.id)}
                                                        style={{ background: 'transparent', border: 'none', color: '#E24B4A', cursor: 'pointer', opacity: 0.7 }}
                                                        onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                                        onMouseLeave={e => e.currentTarget.style.opacity = 0.7}
                                                        title="Eliminar instrumento"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )
                ))}
                
                {instruments.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#9FE1CB', background: '#0d1f14', border: '1px dashed #1a3a24', borderRadius: '12px' }}>
                        No tienes instrumentos configurados.
                    </div>
                )}
            </div>
        </div>
    )
}
