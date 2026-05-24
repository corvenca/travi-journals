'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (res.ok) {
        router.push('/trading/dashboard')
      } else {
        setError(data.error || 'Credenciales incorrectas')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a1a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '36px', fontWeight: '700', color: '#fff', marginBottom: '12px', letterSpacing: '-0.5px' }}>
            Travi<span style={{ color: '#1D9E75' }}>trade</span>
          </div>
          <div style={{ fontSize: '15px', color: 'rgba(159,225,203,0.6)' }}>Ingresa a tu cuenta para continuar</div>
        </div>

        <div style={{ background: 'transparent', border: '1px solid #1a3a24', borderRadius: '12px', padding: '32px' }}>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '14px', fontWeight: '500', color: '#e5e7eb', marginBottom: '8px', display: 'block' }}>Correo Electrónico</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                style={{ width: '100%', background: 'transparent', border: '1px solid #1a3a24', borderRadius: '6px', padding: '12px 14px', color: '#e5e7eb', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s' }}
                onFocus={(e) => e.target.style.borderColor = '#1D9E75'}
                onBlur={(e) => e.target.style.borderColor = '#1a3a24'}
              />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '14px', fontWeight: '500', color: '#e5e7eb', marginBottom: '8px', display: 'block' }}>Contraseña</label>
              <input
                type="password" required value={password} onChange={e => setPassword(e.target.value)}
                style={{ width: '100%', background: 'transparent', border: '1px solid #1a3a24', borderRadius: '6px', padding: '12px 14px', color: '#e5e7eb', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s' }}
                onFocus={(e) => e.target.style.borderColor = '#1D9E75'}
                onBlur={(e) => e.target.style.borderColor = '#1a3a24'}
              />
            </div>
            {error && (
              <div style={{ background: 'rgba(226,75,74,0.1)', border: '1px solid rgba(226,75,74,0.3)', borderRadius: '6px', padding: '12px', color: '#E24B4A', fontSize: '13px', marginBottom: '20px', textAlign: 'center' }}>
                {error}
              </div>
            )}
            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '12px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s' }}
              onMouseOver={(e) => e.target.style.background = '#17815f'}
              onMouseOut={(e) => e.target.style.background = '#1D9E75'}
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', margin: '28px 0', color: 'rgba(159,225,203,0.5)', fontSize: '14px' }}>
            <div style={{ flex: 1, height: '1px', background: '#1a3a24' }}></div>
            <span style={{ padding: '0 16px' }}>¿No tienes cuenta?</span>
            <div style={{ flex: 1, height: '1px', background: '#1a3a24' }}></div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <a href="https://app.travitrade.com/registro" style={{ color: '#1D9E75', textDecoration: 'none', fontSize: '15px', fontWeight: '500', transition: 'color 0.2s' }}
               onMouseOver={(e) => e.target.style.color = '#17815f'}
               onMouseOut={(e) => e.target.style.color = '#1D9E75'}
            >
              Regístrate
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
