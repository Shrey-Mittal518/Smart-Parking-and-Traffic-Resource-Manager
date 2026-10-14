import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from './api.js'
import smartParking from './assets/smart-parking.png'
import './login.css'

function Login() {
  const navigate = useNavigate()
  const [form,    setForm]    = useState({ email: '', password: '' })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [mode,    setMode]    = useState('login')   // 'login' | 'register'
  const [regForm, setRegForm] = useState({ name: '', email: '', password: '', role: 'USER' })

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.login(form)
      localStorage.setItem('sptrm_token', data.token)
      localStorage.setItem('sptrm_user',  JSON.stringify(data.user))
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally { setLoading(false) }
  }

  async function handleRegister(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.register(regForm)
      setMode('login')
      setForm({ email: regForm.email, password: '' })
      setError('Registered! Please log in.')
    } catch (err) {
      setError(err.message)
    } finally { setLoading(false) }
  }

  return (
    <div className="login-page">
      <div className="left-image-container">
        <img src={smartParking} alt="Smart Parking" className="logo" />
        <h2>SPTRM</h2>
        <p>Smart Parking &amp; Traffic Resource Manager</p>
        <p className="subtitle">Team Levengers | OS+DBMS 2026-27</p>
      </div>

      <div className="right-login-container">
        {mode === 'login' ? (
          <>
            <h1>Welcome Back</h1>
            <p>Login to SPTRM Dashboard</p>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={handleLogin}>
              <input type="email"    placeholder="Email"    required
                value={form.email}    onChange={e => setForm({...form, email: e.target.value})} />
              <input type="password" placeholder="Password" required
                value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
              <button type="submit" disabled={loading} className="login-button">
                {loading ? 'Logging in…' : 'Login'}
              </button>
            </form>
            <p className="switch-mode">
              No account? <button onClick={() => setMode('register')}>Register</button>
            </p>
            <div className="demo-creds">
              <small>Demo: admin@sptrm.com / <code>admin123</code></small><br/>
              <small>Demo: shrey@sptrm.com / <code>user123</code></small>
            </div>
          </>
        ) : (
          <>
            <h1>Create Account</h1>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={handleRegister}>
              <input type="text"  placeholder="Full Name" required
                value={regForm.name}     onChange={e => setRegForm({...regForm, name: e.target.value})} />
              <input type="email" placeholder="Email"     required
                value={regForm.email}    onChange={e => setRegForm({...regForm, email: e.target.value})} />
              <input type="password" placeholder="Password" required
                value={regForm.password} onChange={e => setRegForm({...regForm, password: e.target.value})} />
              <select value={regForm.role} onChange={e => setRegForm({...regForm, role: e.target.value})}>
                <option value="USER">Regular User</option>
                <option value="EMERGENCY_SERVICE">Emergency Service</option>
              </select>
              <button type="submit" disabled={loading} className="login-button">
                {loading ? 'Registering…' : 'Register'}
              </button>
            </form>
            <p className="switch-mode">
              Have an account? <button onClick={() => setMode('login')}>Login</button>
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default Login
