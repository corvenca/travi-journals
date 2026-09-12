'use client'
import { useState } from 'react'
import { useActiveAccount } from '@/components/trading/AccountContext'
import { exportToExcel } from '@/lib/exportExcel'

export default function RespaldoPage() {
  const { activeAccount, isLoaded } = useActiveAccount()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const handleExport = async () => {
    if (!activeAccount) { setError('No hay cuenta activa'); return }
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`/api/trading/export?accountId=${activeAccount.id}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error al exportar'); return }
      exportToExcel(data)
      setSuccess(`✓ Archivo exportado correctamente — ${data.operations.length} operaciones`)
    } catch (err) {
      setError('Error al generar el archivo: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isLoaded) return null

  return (
    <div style={{ padding: '24px', background: '#0a1a0f', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '20px', fontWeight: '500', color: '#fff', marginBottom: '6px' }}>Respaldo de Datos</h1>
      <p style={{ fontSize: '13px', color: 'rgba(159,225,203,0.5)', marginBottom: '24px' }}>Exporta todas tus operaciones a Excel</p>

      <div style={{ background: '#0d1f14', border: '0.5px solid #1a3a24', borderRadius: '12px', padding: '24px', maxWidth: '500px' }}>
        <div style={{ fontSize: '14px', fontWeight: '500', color: '#fff', marginBottom: '8px' }}>Exportar a Excel</div>
        <p style={{ fontSize: '13px', color: 'rgba(159,225,203,0.6)', marginBottom: '6px', lineHeight: '1.6' }}>
          El archivo incluirá:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
          {[
            '📊 Hoja de Resumen — estadísticas generales',
            '📋 Hoja de Operaciones — todas las entradas con enlaces de imágenes',
            '🎯 Hoja de Análisis por Setup — rendimiento por setup',
            '📅 Hoja de Análisis por Día — resumen diario',
          ].map(item => (
            <div key={item} style={{ fontSize: '12px', color: 'rgba(159,225,203,0.7)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {item}
            </div>
          ))}
        </div>

        <div style={{ fontSize: '12px', color: 'rgba(159,225,203,0.5)', marginBottom: '16px', padding: '10px', background: '#0a1a0f', borderRadius: '8px', border: '0.5px solid #1a3a24' }}>
          Cuenta activa: <span style={{ color: '#1D9E75', fontWeight: '500' }}>{activeAccount?.name || 'Ninguna'}</span>
        </div>

        {success && <div style={{ background: 'rgba(29,158,117,0.1)', border: '0.5px solid #1D9E75', borderRadius: '8px', padding: '10px', color: '#1D9E75', fontSize: '12px', marginBottom: '14px' }}>{success}</div>}
        {error && <div style={{ background: 'rgba(226,75,74,0.1)', border: '0.5px solid #E24B4A', borderRadius: '8px', padding: '10px', color: '#E24B4A', fontSize: '12px', marginBottom: '14px' }}>{error}</div>}

        <button onClick={handleExport} disabled={loading || !activeAccount}
          style={{ width: '100%', padding: '11px', background: loading ? '#0f2e1a' : '#1D9E75', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer', opacity: !activeAccount ? 0.5 : 1 }}>
          {loading ? 'Generando archivo...' : '⬇ Descargar Excel'}
        </button>
      </div>
    </div>
  )
}
