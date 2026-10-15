import "./css/parking.css";
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
} from "react-icons/fi";

function ParkingMap() {
  return (
    <>
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
              <h1>Parking Map</h1>
              <p>View real-time parking slot availability across all blocks.</p>
            </div>
            <div className="header-right">
              <div className="notification-icon"></div>
              <div className="user-profile"></div>
            </div>
          </div>
          <div className="content">
            <div className="total-slots"></div>
            <div className="available-slots"></div>
            <div className="occupied-slots"></div>
            <div className="ev-charging-slots"></div>
          </div>
          <div className="content-2">
            <div className="map-section">
              <div className="view-toggle">
                <div className="map-view"></div>
                <div className="list-view"></div>
              </div>
              <div className="compass"></div>
              <div className="block-a"></div>
              <div className="block-b"></div>
              <div className="block-c"></div>
              <div className="block-d"></div>
              <div className="center-road"></div>
              <div className="roundabout"></div>
              <div className="main-gate">
                <div className="entry"></div>
                <div className="exit"></div>
              </div>
              <div className="zoom-controls">
                <div className="zoom-in"></div>
                <div className="zoom-out"></div>
              </div>
            </div>
            <div className="side-panel">
              <div className="filter-slots">
                <div className="filter-header"></div>
                <div className="filter-block"></div>
                <div className="filter-slot-type"></div>
                <div className="filter-slot-status"></div>
                <div className="apply-filters"></div>
              </div>
              <div className="legend"></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default ParkingMap;
