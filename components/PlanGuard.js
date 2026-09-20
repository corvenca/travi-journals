'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PlanGuard({ children }) {
  const router = useRouter()
  const [planStatus, setPlanStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/trading/plan-check')
      .then(r => r.json())
      .then(data => {
        setPlanStatus(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a1a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#1D9E75', fontSize: '14px' }}>Cargando...</div>
    </div>
  )

  // Bloquear acceso si llegó a 30 operaciones en plan free
  if (planStatus?.isBlocked) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a1a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ background: '#0d1f14', border: '0.5px solid #1a3a24', borderRadius: '16px', padding: '40px', maxWidth: '480px', width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
          <h2 style={{ fontSize: '20px', fontWeight: '500', color: '#fff', marginBottom: '8px' }}>
            Has alcanzado el límite del plan Free
          </h2>
          <p style={{ fontSize: '14px', color: 'rgba(159,225,203,0.6)', marginBottom: '24px', lineHeight: '1.6' }}>
            Has registrado <strong style={{ color: '#E24B4A' }}>{planStatus.opsCount} operaciones</strong> y has alcanzado el máximo del plan Free (30). Actualiza a Pro para continuar registrando sin límites.
          </p>

          <div style={{ background: '#0a1a0f', borderRadius: '10px', padding: '16px', marginBottom: '24px', border: '0.5px solid #1a3a24' }}>
            <div style={{ fontSize: '12px', color: 'rgba(159,225,203,0.4)', marginBottom: '8px' }}>TUS DATOS ESTÁN SEGUROS</div>
            <p style={{ fontSize: '13px', color: '#9FE1CB', margin: 0, lineHeight: '1.6' }}>
              Todas tus operaciones, setups y cuentas están guardadas. Al actualizar a Pro recuperas acceso inmediato a todo tu historial.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <a href="https://app.travitrade.com/upgrade"
              style={{ display: 'block', padding: '14px', background: '#1D9E75', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: '500', textDecoration: 'none' }}>
              🚀 Actualizar a Pro — $5.99/mes
            </a>
            <a href="https://app.travitrade.com/upgrade?plan=annual"
              style={{ display: 'block', padding: '14px', background: '#0f2e1a', border: '0.5px solid #1D9E75', borderRadius: '10px', color: '#1D9E75', fontSize: '13px', textDecoration: 'none' }}>
              💰 Plan Anual — $50/año ($4.16/mes) · Ahorras $21.88
            </a>
            <button onClick={() => router.push('/trading/dashboard')}
              style={{ padding: '10px', background: 'transparent', border: '0.5px solid #1a3a24', borderRadius: '10px', color: 'rgba(159,225,203,0.5)', fontSize: '13px', cursor: 'pointer' }}>
              Ver mi dashboard →
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Banner de advertencia cuando está cerca del límite */}
      {planStatus?.isWarning && !planStatus?.isBlocked && (
        <div style={{
          background: 'rgba(226,75,74,0.1)', borderBottom: '0.5px solid #E24B4A',
          padding: '10px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px'
        }}>
          <div style={{ fontSize: '13px', color: '#E24B4A' }}>
            ⚠️ Te quedan <strong>{planStatus.remaining} operaciones</strong> disponibles en tu plan Free
          </div>
          <a href="https://app.travitrade.com/upgrade"
            style={{ padding: '5px 14px', background: '#1D9E75', borderRadius: '20px', color: '#fff', fontSize: '12px', fontWeight: '500', textDecoration: 'none', whiteSpace: 'nowrap' }}>
            Actualizar a Pro →
          </a>
        </div>
      )}
      {children}
    </>
  )
}
