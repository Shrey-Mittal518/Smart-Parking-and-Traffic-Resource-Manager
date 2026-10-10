import "./dashboard.css";


function Dashboard()
{
    return(
        <>
        <div className="dashboard">
            <div className="left-panel">
                <div className="logo"></div>
                <div className="nav-item">Dashboard</div>
                <div className="nav-item">Parking Map</div>
                <div className="nav-item">Book Slot</div>
                <div className="nav-item">My Bookings</div>
                <div className="nav-item">Payments</div>
                <div className="nav-item">Traffic Monitor</div>
                <div className="nav-item">Reports</div>
                <div className="nav-item">Users</div>
                <div className="nav-item">Slot Management</div>
                <div className="nav-item">Logout</div>
            </div>
           <div className="right-panel">
             <div ClassName="header">
                <div className="header-left">
                  <h1>Dashboard</h1>
                  <p>Welcome to Smart Parking & Traffic Resource Manager</p>
                </div>
                <div className="header-right">
                  <div className="notification-icon"></div>
                  <div className="user-profile"></div>
                </div>
             </div>
             <div className="Content">
                <div className="Total-slots"></div>
                <div className="Available-slots"> </div>
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
        
        
        </>
    )
}

export default Dashboard