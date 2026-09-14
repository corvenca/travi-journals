'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ImpersonatePage() {
  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')

    if (!token) {
      router.push('/login')
      return
    }

    // Guardar el token como journals_token
    fetch('/api/auth/impersonate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    }).then(r => r.json()).then(data => {
      if (data.success) {
        router.push('/trading/dashboard')
      } else {
        router.push('/login')
      }
    }).catch(() => router.push('/login'))
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#0a1a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '14px', color: '#1D9E75', marginBottom: '8px' }}>Accediendo como usuario...</div>
        <div style={{ fontSize: '12px', color: 'rgba(159,225,203,0.5)' }}>Por favor espera</div>
      </div>
    </div>
  )
}
