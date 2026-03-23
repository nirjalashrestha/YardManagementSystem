import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/dashboard.css";
import logo from "../assets/logo.png";
import { getMyProfile } from "../services/settingsService";

import {
  LuLayoutDashboard,
  LuUser,
  LuTruck,
  LuChartBar,
  LuSettings,
  LuLogOut,
  LuSearch,
} from "react-icons/lu";

export default function GateSecurityHome() {
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const fallbackRole = localStorage.getItem("role") || "Gate Security";
  const [profile, setProfile] = useState({
    fullName: "Gate Security",
    role: fallbackRole,
  });
  const role = profile.role || fallbackRole;
  const fullName = profile.fullName || "Gate Security";

  const [collapsed, setCollapsed] = useState(false);
  const [active, setActive] = useState("dashboard"); // dashboard | drivers | vehicles | reports | settings | profile

  // basic guard
  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      if (!token) return;
      try {
        const me = await getMyProfile();
        if (!active) return;
        setProfile((p) => ({
          ...p,
          fullName: me?.fullName || p.fullName,
          role: me?.role || p.role,
        }));
      } catch {
        // Keep fallback role/name if profile API fails.
      }
    };

    loadProfile();
    window.addEventListener("profilechange", loadProfile);
    return () => {
      active = false;
      window.removeEventListener("profilechange", loadProfile);
    };
  }, [token]);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/login");
  };

  const menu = [
    { key: "dashboard", icon: <LuLayoutDashboard size={18} />, label: "Dashboard" },
    { key: "drivers", icon: <LuUser size={18} />, label: "Drivers" },
    { key: "vehicles", icon: <LuTruck size={18} />, label: "Vehicles" },
    { key: "reports", icon: <LuChartBar size={18} />, label: "Reports" },
    { key: "settings", icon: <LuSettings size={18} />, label: "Settings" },
    { key: "profile", icon: <LuUser size={18} />, label: "Profile" },
  ];

  return (
    <div className={`yms-shell`}>
      {/* SIDEBAR */}
      <aside className={`yms-sidebar glass ${collapsed ? "collapsed" : ""}`}>
        <div className="yms-side-top">
          <div className="yms-logo">
            <div className="logo-box">
              <img src={logo} alt="YMS Logo" className="logo-img" />
            </div>
            {!collapsed && <div className="logo-text">YMS</div>}
          </div>

          <button
            className="collapse-btn"
            onClick={() => setCollapsed((v) => !v)}
            title={collapsed ? "Expand" : "Collapse"}
            type="button"
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>

        <nav className="yms-nav">
          {menu.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setActive(m.key)}
              className={`yms-link ${active === m.key ? "active" : ""}`}
              style={{ width: "100%", textAlign: "left" }}
            >
              <span className="yms-ico">{m.icon}</span>
              {!collapsed && <span className="yms-text">{m.label}</span>}
            </button>
          ))}
        </nav>

        <div className="yms-side-bottom">
          <div className="yms-user">
            <div className="yms-avatar">
              <LuUser size={18} />
            </div>

            {!collapsed && (
              <div className="yms-user-meta">
                <div className="yms-name">{fullName}</div>
                <div className="yms-sub">{role}</div>
              </div>
            )}
          </div>

          <button className="yms-logout" onClick={logout} title="Logout" type="button">
            <span className="yms-ico">
              <LuLogOut size={18} />
            </span>
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="yms-main">
        <header className="yms-topbar glass">
          <div className="yms-top-left">
            <div className="yms-title">
              {active === "dashboard" && "Dashboard"}
              {active === "drivers" && "Drivers"}
              {active === "vehicles" && "Vehicles"}
              {active === "reports" && "Reports"}
              {active === "settings" && "Settings"}
              {active === "profile" && "Profile"}
            </div>
            <div className="yms-role">{role}</div>
          </div>

          <div className="yms-search glass">
            <span className="yms-ico">
              <LuSearch size={18} />
            </span>
            <input placeholder="Search trucks, containers, docks..." />
          </div>
        </header>

        <section className="yms-content">
          {active === "dashboard" && <GateSecurityDashboardSection />}
          {active === "drivers" && <GateSecurityDriversSection />}
          {active === "vehicles" && <GateSecurityVehiclesSection />}
          {active === "reports" && <GateSecurityReportsSection />}
          {active === "settings" && <GateSecuritySettingsSection />}
          {active === "profile" && <GateSecurityProfileSection fullName={fullName} role={role} />}
        </section>
      </main>
    </div>
  );
}



function GateSecurityDashboardSection() {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        <div className="card card-pad"><div className="label">Entries Today</div><div className="value">0</div></div>
        <div className="card card-pad"><div className="label">Available Docks</div><div className="value">0</div></div>
        <div className="card card-pad"><div className="label">Trucks in Parking</div><div className="value">0</div></div>
        <div className="card card-pad"><div className="label">Exits Today</div><div className="value">0</div></div>
      </div>

      <div className="adm-card glass" style={{ padding: 16 }}>
        <h3>Recent Gate Activity</h3>
        <table className="adm-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Driver</th>
              <th>Vehicle</th>
              <th>Status</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Incoming</td>
              <td>Ram Basnet</td>
              <td>BA-2-KHA-1234</td>
              <td>Entered</td>
              <td>10:45 AM</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GateSecurityDriversSection() {
  return (
    <div className="adm-card glass" style={{ padding: 16 }}>
      <h3>Drivers</h3>
      <p>Search / view drivers list here.</p>
    </div>
  );
}

function GateSecurityVehiclesSection() {
  return (
    <div className="adm-card glass" style={{ padding: 16 }}>
      <h3>Vehicles</h3>
      <p>Search / view vehicles list here.</p>
    </div>
  );
}

function GateSecurityReportsSection() {
  return (
    <div className="adm-card glass" style={{ padding: 16 }}>
      <h3>Reports</h3>
      <p>Daily entries/exits + incidents report.</p>
    </div>
  );
}

function GateSecuritySettingsSection() {
  return (
    <div className="adm-card glass" style={{ padding: 16 }}>
      <h3>Settings</h3>
      <p>Theme, password, preferences.</p>
    </div>
  );
}

function GateSecurityProfileSection({ fullName, role }) {
  return (
    <div className="adm-card glass" style={{ padding: 16 }}>
      <h3>My Profile</h3>
      <div style={{ marginTop: 10 }}>
        <div><b>Name:</b> {fullName}</div>
        <div><b>Role:</b> {role}</div>
      </div>
    </div>
  );
}
