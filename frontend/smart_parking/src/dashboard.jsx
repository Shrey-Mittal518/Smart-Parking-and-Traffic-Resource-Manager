
import './css/dashboard.css';

import {
  FiHome,
  FiCalendar,
  FiMapPin,
  FiBarChart2,
  FiSettings,
  FiMap,
  FiFileText,
  FiActivity,
  FiLogOut,
} from 'react-icons/fi';

function Dashboard() {
  return (
    <div className="dashboard">
      <div className="left-panel">
        <div className="logo"></div>

        <div className="nav-item active">
          <FiHome className="nav-icon" />
          <span>Dashboard</span>
        </div>

        <div className="nav-item">
          <FiMap className="nav-icon" />
          <span>Parking Map</span>
        </div>

        <div className="nav-item">
          <FiCalendar className="nav-icon" />
          <span>Book Slot</span>
        </div>

        <div className="nav-item">
          <FiFileText className="nav-icon" />
          <span>My Bookings</span>
        </div>

        <div className="nav-item">
          <FiActivity className="nav-icon" />
          <span>Traffic Monitor</span>
        </div>

        <div className="nav-item">
          <FiBarChart2 className="nav-icon" />
          <span>Reports</span>
        </div>

        <div className="nav-item">
          <FiLogOut className="nav-icon" />
          <span>Logout</span>
        </div>
      </div>

      <div className="right-panel">
        <div className="header">
          <div className="header-left">
            <h1>Dashboard</h1>
            <p>
              Welcome to Smart Parking &amp; Traffic Resource Manager
            </p>
          </div>

          <div className="header-right">
            <div className="notification-icon"></div>
            <div className="user-profile"></div>
          </div>
        </div>

        <div className="Content">
          <div className="Total-slots"></div>
          <div className="Available-slots"></div>
          <div className="Occupied-slots"></div>
          <div className="Ev-charging-slots"></div>
        </div>

        <div className="content-2">
          <div className="parking-overview"></div>
          <div className="Recent-activity"></div>
        </div>

        <div className="content-3">
          <div className="Slot-occupancy"></div>
          <div className="Traffic"></div>

          <div className="Quick-actions">
            <div className="action-1"></div>
            <div className="action-2"></div>
            <div className="action-3"></div>
            <div className="action-4"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
