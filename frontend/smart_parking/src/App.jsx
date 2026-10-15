import { useState } from 'react'
import Login from './login.jsx' 
import Dashboard from './dashboard.jsx'
import ParkingMap from './parkingmap.jsx'
import BookSlot from './bookslot.jsx'
import MyBookings from './mybookings.jsx'
import Reports from './report.jsx'

function App() {

  return (
    <>
      <Login />
      <Dashboard />
      <ParkingMap />
      <BookSlot />
      <MyBookings />

    </>
  )
}

export default App
