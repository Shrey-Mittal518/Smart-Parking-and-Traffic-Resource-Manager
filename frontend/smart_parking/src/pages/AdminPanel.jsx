import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { Sidebar } from '../dashboard.jsx'

function AdminPanel() {
  const user = JSON.parse(localStorage.getItem('sptrm_user') || '{}')
  const [tab,      setTab]      = useState('slots')
  const [slots,    setSlots]    = useState([])
  const [users,    setUsers]    = useState([])
  const [payments, setPayments] = useState([])
  const [allRes,   setAllRes]   = useState([])
  const [msg,      setMsg]      = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      const [s, u, p, r] = await Promise.all([
        api.slots(),
        api.adminUsers(),
        api.adminPayments(),
        api.adminAllRes(),
      ])
      setSlots(s); setUsers(u); setPayments(p); setAllRes(r)
    } catch (err) { setMsg('❌ ' + err.message) }
  }

  async function updateSlotStatus(id, status) {
    try {
      await api.updateSlot(id, { status })
      setMsg('✅ Slot updated')
      loadAll()
    } catch (err) { setMsg('❌ ' + err.message) }
  }

  const tabs = [
    { id: 'slots',    label: '🅿️ Slots' },
    { id: 'users',    label: '👥 Users' },
    { id: 'payments', label: '💳 Payments' },
    { id: 'res',      label: '📋 Reservations' },
  ]

  return (
    <div className="dashboard">
      <Sidebar user={user} />
      <div className="right-panel">
        <div className="header"><div className="header-left"><h1>Admin Panel</h1></div></div>

        {msg && <div className="msg-banner">{msg}</div>}

        <div className="tab-bar">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`tab-btn ${tab === t.id ? 'active' : ''}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'slots' && (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr><th>ID</th><th>Slot</th><th>Type</th><th>Status</th><th>Change Status</th></tr>
              </thead>
              <tbody>
                {slots.map(s => (
                  <tr key={s.id}>
                    <td>{s.id}</td>
                    <td>{s.slot_number}</td>
                    <td>{s.slot_type}</td>
                    <td><span className={`status-badge slot-${s.status?.toLowerCase()}`}>{s.status}</span></td>
                    <td>
                      {['AVAILABLE','OCCUPIED','MAINTENANCE'].map(st => (
                        s.status !== st && (
                          <button key={st} className="btn-sm" onClick={() => updateSlotStatus(s.id, st)}
                            style={{ marginRight: 4 }}>
                            {st}
                          </button>
                        )
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'users' && (
          <div className="table-wrapper">
            <table className="data-table">
              <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.id}</td><td>{u.name}</td><td>{u.email}</td>
                    <td><span className="status-badge">{u.role}</span></td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'payments' && (
          <div className="table-wrapper">
            <table className="data-table">
              <thead><tr><th>ID</th><th>User</th><th>Slot</th><th>Amount</th><th>Status</th><th>Time</th></tr></thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td>{p.id}</td><td>{p.user_name}</td><td>{p.slot_number}</td>
                    <td>₹{p.amount}</td>
                    <td><span className="status-badge">{p.payment_status}</span></td>
                    <td>{new Date(p.transaction_time).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'res' && (
          <div className="table-wrapper">
            <table className="data-table">
              <thead><tr><th>ID</th><th>User</th><th>Slot</th><th>Vehicle</th><th>Priority</th><th>Status</th><th>Start</th></tr></thead>
              <tbody>
                {allRes.map(r => (
                  <tr key={r.reservation_id}>
                    <td>{r.reservation_id}</td><td>{r.user_name}</td>
                    <td>{r.slot_number}</td><td>{r.vehicle_type}</td>
                    <td>{r.priority}</td>
                    <td><span className="status-badge">{r.status}</span></td>
                    <td>{new Date(r.start_time).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminPanel
