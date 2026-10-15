import './css/mybooking.css';
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


function MyBookings()
{
    return(
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
                        <h1>My Bookings</h1>
                        <p>View and manage all your parking reservations.</p>
                    </div>
                    <div className="header-right">
                        <div className="notification-icon"></div>
                        <div className="user-profile"></div>
                    </div>
                </div>

                <div className="content">
                    <div className="stat-card total-bookings"><div className="stat-sub"></div></div>
                    <div className="stat-card completed-bookings"><div className="stat-sub"></div></div>
                    <div className="stat-card active-bookings"><div className="stat-sub"></div></div>
                    <div className="stat-card cancelled-bookings"><div className="stat-sub"></div></div>
                </div>

                <div className="toolbar">
                    <div className="tabs">
                        <div className="tab tab-all active"></div>
                        <div className="tab tab-active"></div>
                        <div className="tab tab-completed"></div>
                        <div className="tab tab-cancelled"></div>
                    </div>
                    <div className="search-box"></div>
                    <div className="filter-date"></div>
                </div>

                <div className="bookings-table">
                    <div className="table-head">
                        <div className="th th-id"></div>
                        <div className="th th-slot"></div>
                        <div className="th th-vehicle"></div>
                        <div className="th th-datetime"></div>
                        <div className="th th-duration"></div>
                        <div className="th th-amount"></div>
                        <div className="th th-status"></div>
                        <div className="th th-actions"></div>
                    </div>
                    <div className="table-body">
                        <div className="booking-row r1 st-active">
                            <div className="c-id"></div>
                            <div className="c-slot"><div className="thumb"></div><div className="slot-text"></div></div>
                            <div className="c-vehicle"></div>
                            <div className="c-datetime"></div>
                            <div className="c-duration"></div>
                            <div className="c-amount"></div>
                            <div className="c-status"></div>
                            <div className="c-actions"><div className="btn-view"></div><div className="btn-cancel"></div></div>
                        </div>
                        <div className="booking-row r2 st-active">
                            <div className="c-id"></div>
                            <div className="c-slot"><div className="thumb"></div><div className="slot-text"></div></div>
                            <div className="c-vehicle"></div>
                            <div className="c-datetime"></div>
                            <div className="c-duration"></div>
                            <div className="c-amount"></div>
                            <div className="c-status"></div>
                            <div className="c-actions"><div className="btn-view"></div><div className="btn-cancel"></div></div>
                        </div>
                        <div className="booking-row r3 st-completed">
                            <div className="c-id"></div>
                            <div className="c-slot"><div className="thumb"></div><div className="slot-text"></div></div>
                            <div className="c-vehicle"></div>
                            <div className="c-datetime"></div>
                            <div className="c-duration"></div>
                            <div className="c-amount"></div>
                            <div className="c-status"></div>
                            <div className="c-actions"><div className="btn-view"></div></div>
                        </div>
                        <div className="booking-row r4 st-completed">
                            <div className="c-id"></div>
                            <div className="c-slot"><div className="thumb"></div><div className="slot-text"></div></div>
                            <div className="c-vehicle"></div>
                            <div className="c-datetime"></div>
                            <div className="c-duration"></div>
                            <div className="c-amount"></div>
                            <div className="c-status"></div>
                            <div className="c-actions"><div className="btn-view"></div></div>
                        </div>
                        <div className="booking-row r5 st-cancelled">
                            <div className="c-id"></div>
                            <div className="c-slot"><div className="thumb"></div><div className="slot-text"></div></div>
                            <div className="c-vehicle"></div>
                            <div className="c-datetime"></div>
                            <div className="c-duration"></div>
                            <div className="c-amount"></div>
                            <div className="c-status"></div>
                            <div className="c-actions"><div className="btn-view"></div></div>
                        </div>
                    </div>
                </div>

                <div className="bottom-grid">
                    <div className="history-card">
                        <div className="history-title"></div>
                        <div className="history-legend"></div>
                        <div className="chart">
                            <div className="y-axis"></div>
                            <div className="plot">
                                <div className="bar"></div>
                                <div className="bar"></div>
                                <div className="bar"></div>
                                <div className="bar"></div>
                                <div className="bar"></div>
                                <div className="bar"></div>
                                <div className="bar"></div>
                            </div>
                        </div>
                    </div>

                    <div className="popular-card">
                        <div className="popular-head">
                            <div className="popular-title"></div>
                            <div className="popular-link"></div>
                        </div>
                        <div className="popular-row pr1"><div className="pop-thumb"></div><div className="pop-info"></div><div className="pop-stat"></div></div>
                        <div className="popular-row pr2"><div className="pop-thumb"></div><div className="pop-info"></div><div className="pop-stat"></div></div>
                        <div className="popular-row pr3"><div className="pop-thumb"></div><div className="pop-info"></div><div className="pop-stat"></div></div>
                    </div>
                </div>
            </div>
        </div>
        </>
    )
}

export default MyBookings;