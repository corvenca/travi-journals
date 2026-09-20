'use client'

export default function UpgradeBanner({ planStatus }) {
  if (!planStatus || planStatus.isPro) return null

  return (
    <div style={{
      background: '#0d1f14', border: '0.5px solid #1D9E75',
      borderRadius: '10px', padding: '14px 16px', marginBottom: '20px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px'
    }}>
      <div>
        <div style={{ fontSize: '13px', fontWeight: '500', color: '#fff', marginBottom: '3px' }}>
          Plan Free — {planStatus.opsCount}/30 operaciones usadas
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(159,225,203,0.5)' }}>
          Actualiza a Pro para operaciones ilimitadas, cuentas ilimitadas y reportes avanzados.
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <a href="https://app.travitrade.com/upgrade"
          style={{ padding: '7px 14px', background: '#1D9E75', borderRadius: '8px', color: '#fff', fontSize: '12px', fontWeight: '500', textDecoration: 'none', whiteSpace: 'nowrap' }}>
          Pro $5.99/mes
        </a>
        <a href="https://app.travitrade.com/upgrade?plan=annual"
          style={{ padding: '7px 14px', background: 'transparent', border: '0.5px solid #1D9E75', borderRadius: '8px', color: '#1D9E75', fontSize: '12px', textDecoration: 'none', whiteSpace: 'nowrap' }}>
          Anual $50
        </a>
      </div>
    </div>
  )
}
