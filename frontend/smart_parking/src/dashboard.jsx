import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { api } from './api.js'
import './dashboard.css'

function Sidebar({ user }) {
  const location = useNavigate ? useLocation() : { pathname: '' }
  const isAdmin  = user?.role === 'ADMIN'

  const nav = [
    { to: '/dashboard',   label: '📊 Dashboard' },
    { to: '/book',        label: '🅿️  Book Slot' },
    { to: '/my-bookings', label: '📋 My Bookings' },
    { to: '/scheduler',   label: '⚙️  Scheduler / OS' },
    ...(isAdmin ? [{ to: '/admin', label: '🔧 Admin Panel' }] : []),
  ]

  function logout() {
    localStorage.clear()
    window.location.href = '/'
  }

  return (
    <div className="left-panel">
      <div className="logo">SPTRM</div>
      {nav.map(n => (
        <Link key={n.to} to={n.to}
          className={`nav-item ${location.pathname === n.to ? 'active' : ''}`}>
          {n.label}
        </Link>
      ))}
      <button className="nav-item logout-btn" onClick={logout}>🚪 Logout</button>
    </div>
  )
}

function Dashboard() {
  const navigate = useNavigate()
  const user     = JSON.parse(localStorage.getItem('sptrm_user') || '{}')
  const [metrics, setMetrics] = useState(null)
  const [slots,   setSlots]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.dashboard()
       .then(d => { setMetrics(d.metrics); setSlots(d.slots) })
       .catch(err => { if (err.message.includes('Invalid')) navigate('/') })
       .finally(() => setLoading(false))
  }, [navigate])

  const cards = metrics ? [
    { label: 'Total Slots',     value: metrics.total_slots,         color: '#4f46e5' },
    { label: 'Available',       value: metrics.available_slots,     color: '#16a34a' },
    { label: 'Occupied',        value: metrics.occupied_slots,      color: '#dc2626' },
    { label: 'EV Slots',        value: metrics.ev_slots,            color: '#0891b2' },
    { label: 'Active Bookings', value: metrics.active_reservations, color: '#d97706' },
    { label: 'Today\'s Bookings', value: metrics.bookings_today,    color: '#7c3aed' },
  ] : []

  return (
    <div className="dashboard">
      <Sidebar user={user} />
      <div className="right-panel">
        <div className="header">
          <div className="header-left">
            <h1>Dashboard</h1>
            <p>Welcome back, <strong>{user.name}</strong> ({user.role})</p>
          </div>
        </div>

        {loading ? <div className="loading">Loading metrics…</div> : (
          <>
            <div className="metrics-grid">
              {cards.map(c => (
                <div key={c.label} className="metric-card" style={{ borderTop: `4px solid ${c.color}` }}>
                  <div className="metric-value" style={{ color: c.color }}>{c.value ?? '—'}</div>
                  <div className="metric-label">{c.label}</div>
                </div>
              ))}
            </div>

            <h2 style={{ margin: '24px 0 12px' }}>Parking Slot Map</h2>
            <div className="slot-grid">
              {slots.map(s => (
                <div key={s.id} className={`slot-cell ${s.status.toLowerCase()} ${s.slot_type.toLowerCase()}`}
                  title={`${s.slot_number} · ${s.slot_type} · ${s.status}`}>
                  {s.slot_number}
                </div>
              ))}
            </div>

            <div className="slot-legend">
              <span className="legend-item available">Available</span>
              <span className="legend-item occupied">Occupied</span>
              <span className="legend-item reserved">Reserved</span>
              <span className="legend-item ev_charging">EV</span>
              <span className="legend-item emergency">Emergency</span>
            </div>

            <div className="quick-actions">
              <h2>Quick Actions</h2>
              <div className="action-row">
                <button onClick={() => navigate('/book')}>🅿️ Book a Slot</button>
                <button onClick={() => navigate('/my-bookings')}>📋 My Bookings</button>
                <button onClick={() => navigate('/scheduler')}>⚙️ Run Scheduler</button>
                {user.role === 'ADMIN' && <button onClick={() => navigate('/admin')}>🔧 Admin Panel</button>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export { Sidebar }
export default Dashboard
