import './css/report.css';
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


function Reports()
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
                        <h1>Reports &amp; Analytics</h1>
                        <p>View parking usage, revenue, traffic trends and system performance.</p>
                    </div>
                    <div className="header-right">
                        <div className="header-top">
                            <div className="notification-icon"></div>
                            <div className="user-profile"></div>
                        </div>
                        <div className="header-actions">
                            <div className="date-range"></div>
                            <div className="export-btn"></div>
                        </div>
                    </div>
                </div>

                <div className="content">
                    <div className="stat-card total-vehicles"><div className="stat-sub"></div></div>
                    <div className="stat-card total-revenue"><div className="stat-sub"></div></div>
                    <div className="stat-card avg-duration"><div className="stat-sub"></div></div>
                    <div className="stat-card peak-hour"><div className="stat-sub"></div></div>
                </div>

                <div className="charts-row-1">
                    <div className="card trend-card">
                        <div className="card-title"></div>
                        <div className="chart-legend"></div>
                        <div className="chart">
                            <div className="y-axis"></div>
                            <div className="plot plot-line"></div>
                            <div className="x-axis">
                                <div className="xl"></div><div className="xl"></div><div className="xl"></div><div className="xl"></div>
                                <div className="xl"></div><div className="xl"></div><div className="xl"></div>
                            </div>
                        </div>
                    </div>

                    <div className="card occupancy-card">
                        <div className="card-title"></div>
                        <div className="chart-legend"></div>
                        <div className="chart">
                            <div className="y-axis"></div>
                            <div className="plot plot-groups">
                                <div className="grp"></div><div className="grp"></div><div className="grp"></div>
                                <div className="grp"></div><div className="grp"></div><div className="grp"></div>
                            </div>
                            <div className="x-axis">
                                <div className="xl"></div><div className="xl"></div><div className="xl"></div>
                                <div className="xl"></div><div className="xl"></div><div className="xl"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="charts-row-2">
                    <div className="card slot-usage-card">
                        <div className="card-title"></div>
                        <div className="donut donut-slots"><div className="donut-hole"></div></div>
                        <div className="legend-list"></div>
                    </div>

                    <div className="card revenue-card">
                        <div className="card-title"></div>
                        <div className="chart">
                            <div className="y-axis"></div>
                            <div className="plot plot-revenue">
                                <div className="rbar"></div><div className="rbar"></div><div className="rbar"></div><div className="rbar"></div>
                                <div className="rbar"></div><div className="rbar"></div><div className="rbar"></div>
                            </div>
                            <div className="x-axis">
                                <div className="xl"></div><div className="xl"></div><div className="xl"></div><div className="xl"></div>
                                <div className="xl"></div><div className="xl"></div><div className="xl"></div>
                            </div>
                        </div>
                    </div>

                    <div className="card vehicle-dist-card">
                        <div className="card-title"></div>
                        <div className="donut donut-vehicles"><div className="donut-hole"></div></div>
                        <div className="legend-list"></div>
                    </div>
                </div>

                <div className="tables-row">
                    <div className="card tx-card">
                        <div className="card-head"><div className="card-title"></div><div className="card-link"></div></div>
                        <div className="tx-table">
                            <div className="col"></div>
                            <div className="col"></div>
                            <div className="col"></div>
                            <div className="col"></div>
                            <div className="col"></div>
                            <div className="col"></div>
                            <div className="col"></div>
                            <div className="col col-status">
                                <div className="pill ok"></div>
                                <div className="pill act"></div>
                                <div className="pill ok"></div>
                                <div className="pill act"></div>
                                <div className="pill ok"></div>
                            </div>
                        </div>
                    </div>

                    <div className="card top-card">
                        <div className="card-head"><div className="card-title"></div><div className="card-link"></div></div>
                        <div className="top-table">
                            <div className="col"></div>
                            <div className="col"></div>
                            <div className="col col-type">
                                <div className="pill normal"></div>
                                <div className="pill normal"></div>
                                <div className="pill ev"></div>
                                <div className="pill vip"></div>
                                <div className="pill disabled"></div>
                            </div>
                            <div className="col"></div>
                            <div className="col"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </>
    )
}

export default Reports;