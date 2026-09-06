'use client'
import { useState, useEffect } from 'react'
import { useActiveAccount } from '@/components/trading/AccountContext'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'

const DIRECTIONS = ['LONG', 'SHORT', 'BOTH']
const COLORS = ['#1D9E75', '#3b82f6', '#E24B4A', '#F59E0B', '#9FE1CB', '#0F6E56', '#a855f7', '#f97316']

export default function SetupsPage() {
  const { activeAccount, isLoaded } = useActiveAccount()
  const router = useRouter()
  const [setups, setSetups] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ name: '', direction: 'BOTH', color: '#1D9E75', description: '' })
  const [deleting, setDeleting] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!isLoaded) return
    fetchSetups()
  }, [isLoaded])

  const fetchSetups = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/trading/setups')
      const data = await res.json()
      setSetups(Array.isArray(data) ? data : [])
    } catch {}
    setLoading(false)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setError('El nombre es obligatorio'); return }
    if (!form.direction) { setError('La dirección es obligatoria'); return }
    setError('')
    try {
      const method = isEditing ? 'PUT' : 'POST'
      const body = isEditing ? { id: editId, ...form } : form
      const res = await fetch('/api/trading/setups', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (res.ok) {
        setSuccess(isEditing ? 'Setup actualizado correctamente' : 'Setup creado correctamente')
        setShowModal(false)
        setForm({ name: '', direction: 'BOTH', color: '#1D9E75', description: '' })
        setIsEditing(false)
        setEditId(null)
        fetchSetups()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const data = await res.json()
        setError(data.error || 'Error al guardar')
      }
    } catch { setError('Error de conexión') }
  }

  const handleEdit = (setup) => {
    setForm({ name: setup.name, direction: setup.direction, color: setup.color || '#1D9E75', description: setup.description || '' })
    setEditId(setup.id)
    setIsEditing(true)
    setShowModal(true)
    setError('')
  }

  const handleDelete = async (id) => {
    setDeleting(id)
    try {
      const res = await fetch(`/api/trading/setups?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setSuccess('Setup eliminado. Las operaciones existentes se mantienen.')
        setConfirmDelete(null)
        fetchSetups()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const data = await res.json()
        setError(data.error || 'Error al eliminar')
      }
    } catch { setError('Error de conexión') }
    setDeleting(null)
  }

  if (!isLoaded) return null

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Gestión de Setups</h1>
          <p className={styles.subtitle}>Crea, edita y elimina tus setups de trading</p>
        </div>
        <button onClick={() => { setShowModal(true); setIsEditing(false); setForm({ name: '', direction: 'BOTH', color: '#1D9E75', description: '' }); setError('') }}
          style={{ padding: '9px 18px', background: '#1D9E75', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
          + Nuevo Setup
        </button>
      </div>

      {success && (
        <div style={{ background: 'rgba(29,158,117,0.1)', border: '0.5px solid #1D9E75', borderRadius: '8px', padding: '10px 14px', color: '#1D9E75', fontSize: '13px', marginBottom: '16px' }}>
          ✓ {success}
        </div>
      )}

      {loading ? (
        <div style={{ color: 'rgba(159,225,203,0.5)', fontSize: '13px', textAlign: 'center', padding: '40px' }}>Cargando setups...</div>
      ) : setups.length === 0 ? (
        <div style={{ color: 'rgba(159,225,203,0.4)', fontSize: '13px', textAlign: 'center', padding: '40px' }}>No tienes setups creados aún</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {setups.map(setup => (
            <div key={setup.id} style={{ background: '#0d1f14', border: '0.5px solid #1a3a24', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: setup.color || '#1D9E75', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#fff' }}>{setup.name}</div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: '#0a1a0f', border: '0.5px solid #1a3a24', color: setup.direction === 'LONG' ? '#1D9E75' : setup.direction === 'SHORT' ? '#E24B4A' : '#F59E0B' }}>
                    {setup.direction}
                  </span>
                  {setup.description && <span style={{ fontSize: '11px', color: 'rgba(159,225,203,0.5)' }}>{setup.description}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => handleEdit(setup)}
                  style={{ padding: '6px 14px', background: 'transparent', border: '0.5px solid #1a3a24', borderRadius: '6px', color: '#9FE1CB', fontSize: '12px', cursor: 'pointer' }}>
                  Editar
                </button>
                <button onClick={() => setConfirmDelete(setup.id)}
                  style={{ padding: '6px 14px', background: 'transparent', border: '0.5px solid #E24B4A', borderRadius: '6px', color: '#E24B4A', fontSize: '12px', cursor: 'pointer' }}>
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal crear/editar */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: '#0d1f14', border: '0.5px solid #1a3a24', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '420px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '500', color: '#fff', marginBottom: '20px' }}>
              {isEditing ? 'Editar Setup' : 'Nuevo Setup'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'rgba(159,225,203,0.5)', letterSpacing: '1px', marginBottom: '6px', display: 'block' }}>NOMBRE *</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="Ej: 2DA MANIPULACION ABAJO"
                  style={{ width: '100%', background: '#0a1a0f', border: '0.5px solid #1a3a24', borderRadius: '8px', padding: '9px 12px', color: '#9FE1CB', fontSize: '13px', outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'rgba(159,225,203,0.5)', letterSpacing: '1px', marginBottom: '6px', display: 'block' }}>DIRECCIÓN *</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {DIRECTIONS.map(d => (
                    <button key={d} type="button" onClick={() => setForm({...form, direction: d})}
                      style={{ flex: 1, padding: '8px', borderRadius: '8px', border: `0.5px solid ${form.direction === d ? (d === 'LONG' ? '#1D9E75' : d === 'SHORT' ? '#E24B4A' : '#F59E0B') : '#1a3a24'}`, background: form.direction === d ? '#0a1a0f' : 'transparent', color: form.direction === d ? (d === 'LONG' ? '#1D9E75' : d === 'SHORT' ? '#E24B4A' : '#F59E0B') : 'rgba(159,225,203,0.5)', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'rgba(159,225,203,0.5)', letterSpacing: '1px', marginBottom: '6px', display: 'block' }}>COLOR</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {COLORS.map(c => (
                    <div key={c} onClick={() => setForm({...form, color: c})}
                      style={{ width: '28px', height: '28px', borderRadius: '50%', background: c, cursor: 'pointer', border: form.color === c ? '3px solid #fff' : '2px solid transparent' }} />
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'rgba(159,225,203,0.5)', letterSpacing: '1px', marginBottom: '6px', display: 'block' }}>DESCRIPCIÓN</label>
                <input value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  placeholder="Descripción opcional"
                  style={{ width: '100%', background: '#0a1a0f', border: '0.5px solid #1a3a24', borderRadius: '8px', padding: '9px 12px', color: '#9FE1CB', fontSize: '13px', outline: 'none' }} />
              </div>
            </div>
            {error && <div style={{ color: '#E24B4A', fontSize: '12px', marginTop: '12px', padding: '8px', background: 'rgba(226,75,74,0.1)', borderRadius: '6px' }}>{error}</div>}
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={handleSave}
                style={{ flex: 1, padding: '10px', background: '#1D9E75', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
                {isEditing ? 'Guardar cambios' : 'Crear setup'}
              </button>
              <button onClick={() => { setShowModal(false); setError('') }}
                style={{ flex: 1, padding: '10px', background: 'transparent', border: '0.5px solid #1a3a24', borderRadius: '8px', color: '#9FE1CB', fontSize: '13px', cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminación */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: '#0d1f14', border: '0.5px solid #E24B4A', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '380px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '500', color: '#fff', marginBottom: '10px' }}>¿Eliminar setup?</h2>
            <p style={{ fontSize: '13px', color: 'rgba(159,225,203,0.6)', marginBottom: '20px', lineHeight: '1.6' }}>
              Las operaciones registradas con este setup se mantendrán pero quedarán sin setup asignado. Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => handleDelete(confirmDelete)} disabled={deleting === confirmDelete}
                style={{ flex: 1, padding: '10px', background: '#E24B4A', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '500', cursor: 'pointer', opacity: deleting ? 0.6 : 1 }}>
                {deleting === confirmDelete ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
              <button onClick={() => setConfirmDelete(null)}
                style={{ flex: 1, padding: '10px', background: 'transparent', border: '0.5px solid #1a3a24', borderRadius: '8px', color: '#9FE1CB', fontSize: '13px', cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
