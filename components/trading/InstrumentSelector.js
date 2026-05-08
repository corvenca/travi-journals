'use client'
import { useState, useEffect } from 'react'

const CATEGORIES = ['Futuros', 'Forex', 'Commodities', 'Acciones', 'Cripto']

const SUGGESTIONS = {
  Futuros: ['NQ','MNQ','ES','MES','YM','MYM','RTY','CL','MCL','GC','MGC','SI','ZB','ZN'],
  Forex: ['EUR/USD','GBP/USD','USD/JPY','USD/CHF','AUD/USD','USD/CAD','NZD/USD','EUR/GBP','EUR/JPY','GBP/JPY'],
  Commodities: ['XAU/USD','XAG/USD','WTI','BRENT','GAS','COBRE'],
  Acciones: ['AAPL','TSLA','NVDA','MSFT','AMZN','META','GOOGL','AMD','NFLX','SPY','QQQ'],
  Cripto: ['BTC/USD','ETH/USD','SOL/USD','BNB/USD','XRP/USD','ADA/USD','DOGE/USD']
}

export default function InstrumentSelector({ value, onChange }) {
  const [instruments, setInstruments] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [showAddNew, setShowAddNew] = useState(false)
  const [newTicker, setNewTicker] = useState('')
  const [newCategory, setNewCategory] = useState('Futuros')
  const [newName, setNewName] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    fetch(`/api/trading/instruments?t=${Date.now()}`)
      .then(r => r.json())
      .then(setInstruments)
  }, [])

  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = instruments.filter(i => i.category === cat)
    return acc
  }, {})

  const handleAddNew = async () => {
    if (!newTicker) return
    try {
      const res = await fetch('/api/trading/instruments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          category: newCategory, 
          ticker: newTicker.toUpperCase(), 
          name: newName || newTicker.toUpperCase() 
        })
      })
      if (res.ok) {
        const updated = await fetch(`/api/trading/instruments?t=${Date.now()}`).then(r => r.json())
        setInstruments(updated)
        onChange(newTicker.toUpperCase())
        setShowAddNew(false)
        setNewTicker('')
        setNewName('')
      } else {
        const err = await res.json()
        alert('Error: ' + err.error)
      }
    } catch (err) {
      console.error('Error agregando instrumento:', err)
      alert('Error al conectar con el servidor')
    }
  }

  const handleDelete = async (e, id) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('=== INICIANDO BORRADO ===')
    console.log('1. ID recibido:', id)
    
    if (!confirm('¿Eliminar este instrumento de tu lista?')) {
      console.log('2. BORRADO CANCELADO: El usuario dijo No, o el navegador bloqueó el confirm()')
      return
    }
    
    console.log('3. Confirmación aceptada. Haciendo fetch DELETE a la API...')
    try {
      const res = await fetch('/api/trading/instruments?id=' + id, { method: 'DELETE' })
      console.log('4. Respuesta del servidor - Status:', res.status, '| res.ok:', res.ok)
      
      if (res.ok) {
        console.log('5. API respondió OK. Actualizando lista en pantalla...')
        setInstruments(function(prev) { return prev.filter(function(i) { return i.id !== id }) })
        const deleted = instruments.find(function(i) { return i.id === id })
        if (deleted && value === deleted.ticker) {
          console.log('6. Se borró el que estaba seleccionado. Limpiando input principal.')
          onChange('')
        }
        console.log('=== BORRADO COMPLETADO CON ÉXITO ===')
      } else {
        const errorData = await res.text()
        console.error('ERROR EN API:', errorData)
        alert('Hubo un error en el servidor: ' + errorData)
      }
    } catch (err) {
      console.error('ERROR CATASTRÓFICO DE RED O CÓDIGO:', err)
      alert('Error crítico de red: ' + err.message)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ position: 'relative' }}>
        <div onClick={() => setIsOpen(!isOpen)}
          style={{ background: '#0d1f14', border: '0.5px solid #1a3a24', borderRadius: '6px', padding: '8px 12px', color: '#9FE1CB', fontSize: '13px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{value || 'Seleccionar instrumento...'}</span>
          <span style={{ opacity: 0.5 }}>▾</span>
        </div>

        {isOpen && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: '#0d1f14', border: '0.5px solid #1a3a24', borderRadius: '6px', marginTop: '4px', maxHeight: '220px', overflowY: 'auto' }}>
            {CATEGORIES.map(cat => (
              grouped[cat]?.length > 0 && (
                <div key={cat}>
                  <div style={{ padding: '6px 12px', fontSize: '10px', color: '#1D9E75', fontWeight: '500', letterSpacing: '1px', background: '#0a1a0f' }}>{cat.toUpperCase()}</div>
                  {grouped[cat].map(inst => (
                    <div key={inst.id} 
                      onClick={() => { onChange(inst.ticker); setIsOpen(false) }}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', cursor: 'pointer', color: value === inst.ticker ? '#1D9E75' : '#9FE1CB', background: value === inst.ticker ? '#0f2a1a' : 'transparent' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#0f2a1a'}
                      onMouseLeave={e => e.currentTarget.style.background = value === inst.ticker ? '#0f2a1a' : 'transparent'}>
                      <span style={{ flex: 1, fontSize: '13px' }}>{inst.ticker}</span>
                      <span onClick={function(e) { handleDelete(e, inst.id) }}
                        style={{ color: '#E24B4A', fontSize: '14px', fontWeight: 'bold', padding: '0 4px', opacity: 0.7, lineHeight: 1 }}>×</span>
                    </div>
                  ))}
                </div>
              )
            ))}
            <div onClick={() => { setIsOpen(false); setShowAddNew(true) }}
              style={{ padding: '8px 12px', color: '#1D9E75', fontSize: '12px', cursor: 'pointer', borderTop: '0.5px solid #1a3a24' }}>
              + Agregar nuevo instrumento
            </div>
          </div>
        )}
      </div>

      {instruments.length === 0 && (
        <div style={{ fontSize: '12px', color: '#9FE1CB', opacity: 0.6, padding: '6px 0' }}>
          No tienes instrumentos agregados. Usa "+ Agregar nuevo instrumento" para añadir los activos que operas.
        </div>
      )}

      {showAddNew && (
        <div style={{ background: '#0d1f14', border: '0.5px solid #1D9E75', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '12px', color: '#1D9E75', fontWeight: '500', marginBottom: '4px' }}>Agregar nuevo instrumento</div>
          <select value={newCategory} onChange={e => setNewCategory(e.target.value)}
            style={{ background: '#0a1a0f', border: '0.5px solid #1a3a24', borderRadius: '6px', padding: '6px', color: '#9FE1CB', fontSize: '12px' }}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', margin: '4px 0' }}>
            {SUGGESTIONS[newCategory]?.map(s => (
              <span key={s} onClick={() => setNewTicker(s)}
                style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer',
                  background: newTicker === s ? '#1D9E75' : '#0a1a0f',
                  color: newTicker === s ? '#fff' : '#9FE1CB',
                  border: `0.5px solid ${newTicker === s ? '#1D9E75' : '#1a3a24'}` }}>
                {s}
              </span>
            ))}
          </div>
          <input placeholder="Ticker (ej: NQ, EUR/USD)" value={newTicker} onChange={e => setNewTicker(e.target.value)}
            style={{ background: '#0a1a0f', border: '0.5px solid #1a3a24', borderRadius: '6px', padding: '6px', color: '#9FE1CB', fontSize: '12px' }} />
          <input placeholder="Nombre (opcional)" value={newName} onChange={e => setNewName(e.target.value)}
            style={{ background: '#0a1a0f', border: '0.5px solid #1a3a24', borderRadius: '6px', padding: '6px', color: '#9FE1CB', fontSize: '12px' }} />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={handleAddNew}
              style={{ flex: 1, background: '#1D9E75', border: 'none', borderRadius: '6px', padding: '7px', color: '#fff', fontSize: '12px', cursor: 'pointer' }}>
              Agregar
            </button>
            <button type="button" onClick={() => setShowAddNew(false)}
              style={{ flex: 1, background: 'transparent', border: '0.5px solid #1a3a24', borderRadius: '6px', padding: '7px', color: '#9FE1CB', fontSize: '12px', cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
