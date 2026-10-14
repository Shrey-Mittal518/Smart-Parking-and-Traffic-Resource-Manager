import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { Sidebar } from '../dashboard.jsx'

function BookSlot() {
  const navigate = useNavigate()
  const user     = JSON.parse(localStorage.getItem('sptrm_user') || '{}')
  const [slots,    setSlots]    = useState([])
  const [chargers, setChargers] = useState([])
  const [form,     setForm]     = useState({
    slotId: '', chargerId: '', vehicleType: 'CAR',
    startTime: '', endTime: '',
  })
  const [msg,     setMsg]     = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.slots({ status: 'AVAILABLE' }).then(setSlots).catch(console.error)
    api.chargers().then(c => setChargers(c.filter(x => x.status === 'AVAILABLE'))).catch(console.error)
  }, [])

  async function handleBook(e) {
    e.preventDefault()
    setMsg('')
    setLoading(true)
    try {
      const data = await api.book({
        slotId     : parseInt(form.slotId),
        chargerId  : form.chargerId ? parseInt(form.chargerId) : null,
        vehicleType: form.vehicleType,
        startTime  : form.startTime,
        endTime    : form.endTime,
      })
      setMsg(`✅ ${data.message} (Reservation #${data.reservationId})`)
      // Confirm immediately for simplicity
      await api.confirm(data.reservationId)
      setTimeout(() => navigate('/my-bookings'), 1500)
    } catch (err) {
      setMsg(`❌ ${err.message}`)
    } finally { setLoading(false) }
  }

  return (
    <div className="dashboard">
      <Sidebar user={user} />
      <div className="right-panel">
        <div className="header"><div className="header-left"><h1>Book a Parking Slot</h1></div></div>

        <div className="form-card">
          {msg && <div className={`msg-banner ${msg.startsWith('✅') ? 'success' : 'error'}`}>{msg}</div>}
          <form onSubmit={handleBook} className="book-form">

            <label>Select Slot
              <select required value={form.slotId} onChange={e => setForm({...form, slotId: e.target.value})}>
                <option value="">-- Choose available slot --</option>
                {slots.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.slot_number} · {s.slot_type} · {s.lot_name}
                  </option>
                ))}
              </select>
            </label>

            <label>Vehicle Type
              <select value={form.vehicleType} onChange={e => setForm({...form, vehicleType: e.target.value})}>
                <option value="CAR">Car</option>
                <option value="BIKE">Bike</option>
                <option value="EV">Electric Vehicle (EV)</option>
                <option value="EMERGENCY">Emergency</option>
              </select>
            </label>

            {form.vehicleType === 'EV' && (
              <label>EV Charger (optional)
                <select value={form.chargerId} onChange={e => setForm({...form, chargerId: e.target.value})}>
                  <option value="">-- No charger --</option>
                  {chargers.map(c => (
                    <option key={c.id} value={c.id}>{c.charger_code}</option>
                  ))}
                </select>
              </label>
            )}

            <label>Start Time
              <input type="datetime-local" required value={form.startTime}
                onChange={e => setForm({...form, startTime: e.target.value})} />
            </label>

            <label>End Time
              <input type="datetime-local" required value={form.endTime}
                onChange={e => setForm({...form, endTime: e.target.value})} />
            </label>

            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? 'Booking…' : '🅿️ Book Now'}
            </button>
          </form>
        </div>

        <div className="info-box">
          <h3>💡 How it works (OS concepts)</h3>
          <ul>
            <li><strong>Mutex Lock</strong>: Your slot is locked the moment you submit — no two users can book the same slot simultaneously.</li>
            <li><strong>Stored Procedure</strong>: Booking runs inside an ACID transaction — either all steps succeed or nothing changes.</li>
            <li><strong>RAG Check</strong>: If your EV + slot request would cause a deadlock, it's detected and rejected before the DB is touched.</li>
            <li><strong>Priority</strong>: Emergency vehicles skip the queue (priority = 1).</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default BookSlot
