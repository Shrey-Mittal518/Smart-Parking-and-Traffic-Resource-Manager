import "./css/bookslot.css";
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

function BookSlot() {
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
              <h1>Book a Parking Slot</h1>
              <p>
                Select your vehicle, time and preferred slot to reserve a
                parking space.
              </p>
            </div>
            <div className="header-right">
              <div className="notification-icon"></div>
              <div className="user-profile"></div>
            </div>
          </div>

          <div className="stepper">
            <div className="step active step-1"></div>
            <div className="step-line active"></div>
            <div className="step step-2"></div>
            <div className="step-line"></div>
            <div className="step step-3"></div>
            <div className="step-line"></div>
            <div className="step step-4"></div>
          </div>

          <div className="main-grid">
            <div className="left-column">
              <div className="booking-form">
                <div className="form-row">
                  <div className="field field-vehicle"></div>
                  <div className="field field-parking-type"></div>
                  <div className="field field-date"></div>
                </div>
                <div className="form-row">
                  <div className="field field-entry-time"></div>
                  <div className="field field-exit-time"></div>
                  <div className="field field-duration"></div>
                </div>
              </div>

              <div className="select-slot">
                <div className="select-slot-title"></div>
                <div className="slot-tabs">
                  <div className="tab tab-all active"></div>
                  <div className="tab tab-normal"></div>
                  <div className="tab tab-ev"></div>
                  <div className="tab tab-disabled"></div>
                  <div className="tab tab-vip"></div>
                </div>
                <div className="parking-view">
                  <div className="legend-bar"></div>
                  <div className="compass"></div>
                  <div className="lot lot-top"></div>
                  <div className="lot lot-mid-1"></div>
                  <div className="lot lot-mid-2"></div>
                  <div className="lot lot-bottom"></div>
                  <div className="slot-a12"></div>
                  <div className="entry"></div>
                  <div className="exit"></div>
                  <div className="boom boom-left"></div>
                  <div className="boom boom-right"></div>
                  <div className="booth"></div>
                </div>
              </div>
            </div>

            <div className="right-column">
              <div className="booking-summary">
                <div className="summary-title"></div>
                <div className="slot-info">
                  <div className="slot-image"></div>
                  <div className="slot-details">
                    <div className="slot-name"></div>
                    <div className="slot-badge"></div>
                    <div className="slot-meta"></div>
                  </div>
                </div>
                <div className="summary-rows">
                  <div className="summary-row row-vehicle"></div>
                  <div className="summary-row row-date"></div>
                  <div className="summary-row row-entry"></div>
                  <div className="summary-row row-exit"></div>
                  <div className="summary-row row-duration"></div>
                </div>
                <div className="charges">
                  <div className="charge-row charge-rate"></div>
                  <div className="charge-row charge-duration"></div>
                  <div className="total-amount"></div>
                </div>
                <div className="confirm-btn"></div>
                <div className="cancel-btn"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default BookSlot;
