import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { Sidebar } from '../dashboard.jsx'

const STATUS_COLOR = {
  PENDING  : '#d97706',
  CONFIRMED: '#16a34a',
  CANCELLED: '#6b7280',
  COMPLETED: '#4f46e5',
}

function MyBookings() {
  const user = JSON.parse(localStorage.getItem('sptrm_user') || '{}')
  const [bookings, setBookings] = useState([])
  const [msg,      setMsg]      = useState('')
  const [loading,  setLoading]  = useState(true)

  function load() {
    setLoading(true)
    api.myBookings()
       .then(setBookings)
       .catch(err => setMsg(err.message))
       .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function handleCancel(id) {
    try {
      const d = await api.cancel(id)
      setMsg('✅ ' + d.message)
      load()
    } catch (err) { setMsg('❌ ' + err.message) }
  }

  async function handleStartSession(reservationId) {
    try {
      const d = await api.startSession({ reservationId })
      setMsg(`✅ Session started (ID: ${d.sessionId})`)
    } catch (err) { setMsg('❌ ' + err.message) }
  }

  return (
    <div className="dashboard">
      <Sidebar user={user} />
      <div className="right-panel">
        <div className="header"><div className="header-left"><h1>My Bookings</h1></div></div>

        {msg && <div className="msg-banner">{msg}</div>}

        {loading ? <div className="loading">Loading…</div> : (
          bookings.length === 0
            ? <div className="empty-state">No bookings yet. <a href="/book">Book a slot →</a></div>
            : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th><th>Slot</th><th>Type</th><th>Vehicle</th>
                      <th>Start</th><th>End</th><th>Status</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map(b => (
                      <tr key={b.id}>
                        <td>{b.id}</td>
                        <td>{b.slot_number} <small>({b.lot_name})</small></td>
                        <td>{b.slot_type}</td>
                        <td>{b.vehicle_type}</td>
                        <td>{new Date(b.start_time).toLocaleString()}</td>
                        <td>{new Date(b.end_time).toLocaleString()}</td>
                        <td>
                          <span className="status-badge" style={{ background: STATUS_COLOR[b.status] }}>
                            {b.status}
                          </span>
                        </td>
                        <td className="action-cell">
                          {b.status === 'CONFIRMED' && (
                            <button className="btn-sm btn-start" onClick={() => handleStartSession(b.id)}>
                              ▶ Start
                            </button>
                          )}
                          {['PENDING','CONFIRMED'].includes(b.status) && (
                            <button className="btn-sm btn-cancel" onClick={() => handleCancel(b.id)}>
                              ✕ Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        )}
      </div>
    </div>
  )
}

export default MyBookings
