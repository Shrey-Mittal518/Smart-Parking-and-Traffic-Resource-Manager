import { Routes, Route, Navigate } from 'react-router-dom'
import Login      from './login.jsx'
import Dashboard  from './dashboard.jsx'
import BookSlot   from './pages/BookSlot.jsx'
import MyBookings from './pages/MyBookings.jsx'
import Scheduler  from './pages/Scheduler.jsx'
import AdminPanel from './pages/AdminPanel.jsx'

function PrivateRoute({ children }) {
  return localStorage.getItem('sptrm_token') ? children : <Navigate to="/" replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/"            element={<Login />} />
      <Route path="/dashboard"   element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/book"        element={<PrivateRoute><BookSlot /></PrivateRoute>} />
      <Route path="/my-bookings" element={<PrivateRoute><MyBookings /></PrivateRoute>} />
      <Route path="/scheduler"   element={<PrivateRoute><Scheduler /></PrivateRoute>} />
      <Route path="/admin"       element={<PrivateRoute><AdminPanel /></PrivateRoute>} />
      <Route path="*"            element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
