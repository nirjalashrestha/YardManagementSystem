import { Fragment, useMemo, useState, useEffect, useRef } from "react";
import { NavLink, Navigate, Outlet, useNavigate, useLocation } from "react-router-dom"; import "../styles/dashboard.css";
import logo from "../assets/logo.png";
import YmsAssistant from "../components/YmsAssistant";
import { getMyProfile } from "../services/settingsService";
import { getNotifications, markNotificationRead } from "../services/notificationService";
import { normalizeRole, ROLE } from "../constants/rbac";


import { LuLayoutDashboard, LuMapPin, LuUserPlus, LuDoorOpen, LuTruck, LuPackage, LuChartBar,
LuBell, LuSettings, LuLogOut, LuSearch, LuUser, LuShuffle,
LuClipboardCheck, LuShieldCheck,

LuChevronDown, LuDatabase, LuBuilding2, LuNavigation, LuBadgeCheck,
} from "react-icons/lu";

const API_ORIGIN = "https://localhost:7096";
const toFullPhotoUrl = (raw) => {
if (!raw) return "";
return raw.startsWith("http") ? raw : `${API_ORIGIN}${raw}`;
};


export default function Dashboard() { const navigate = useNavigate(); const location = useLocation();

const [collapsed, setCollapsed] = useState(false);
const [searchText, setSearchText] = useState("");


// theme
const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark"); const toggleTheme = () => {
const next = theme === "dark" ? "light" : "dark"; setTheme(next);
localStorage.setItem("theme", next);
window.dispatchEvent(new CustomEvent("themechange", { detail: { theme: next } }));
};
useEffect(() => {
document.body.setAttribute("data-theme", theme);
}, [theme]);

useEffect(() => {
const syncTheme = () => {
const next = localStorage.getItem("theme") || document.body.getAttribute("data-theme") || "dark";
setTheme(next);
};
window.addEventListener("themechange", syncTheme);
return () => window.removeEventListener("themechange", syncTheme);
}, []);


// auth
const token = localStorage.getItem("token");
const fallbackRoleDisplay = localStorage.getItem("role") || "View Only";
const roleKey = normalizeRole(localStorage.getItem("roleKey") || fallbackRoleDisplay) || ROLE.VIEW_ONLY;
const [profile, setProfile] = useState({
fullName: "User",
role: fallbackRoleDisplay,
profileImageUrl: "",
photoUrl: "",
});
const role = profile.role || fallbackRoleDisplay;
const fullName = profile.fullName || "User";
const profileImage = toFullPhotoUrl(profile.profileImageUrl || profile.photoUrl || "");
const [unreadCount, setUnreadCount] = useState(0);
const [notifOpen, setNotifOpen] = useState(false);
const [notifLoading, setNotifLoading] = useState(false);
const [notifications, setNotifications] = useState([]);
const notifWrapRef = useRef(null);


const isAdmin = useMemo(() => roleKey === ROLE.ADMIN, [roleKey]);
const isYardManager = useMemo(() => roleKey === ROLE.YARD_MANAGER, [roleKey]);
const isYardJockey = useMemo(() => roleKey === ROLE.YARD_JOCKEY, [roleKey]);
const isGateSecurity = useMemo(() => roleKey === ROLE.GATE_SECURITY, [roleKey]);
const isDriver = useMemo(() => roleKey === ROLE.DRIVER, [roleKey]);
const isViewOnly = useMemo(() => roleKey === ROLE.VIEW_ONLY, [roleKey]);


const logout = () => { localStorage.removeItem("token"); localStorage.removeItem("role"); localStorage.removeItem("roleKey"); navigate("/login");
};


const masterRoutes = useMemo( () => [
"/dashboard/manage-carrier", "/dashboard/manage-facility", "/dashboard/manage-location", "/dashboard/manage-gate", "/dashboard/manage-trailer-type", "/dashboard/manage-goods",
],
[]
);


const isOnMaster = useMemo(
() => masterRoutes.some((r) => location.pathname.startsWith(r)), [masterRoutes, location.pathname]
);


const [masterOpen, setMasterOpen] = useState(false);

useEffect(() => {
if (isOnMaster) setMasterOpen(true);
}, [isOnMaster]);

useEffect(() => {
let active = true;

const loadProfile = async () => {
if (!token) return;
try {
const me = await getMyProfile();
if (!active) return;
setProfile((p) => ({
...p,
fullName: me?.fullName || "User",
role: me?.role || p.role || fallbackRoleDisplay,
profileImageUrl: me?.profileImageUrl || "",
photoUrl: me?.photoUrl || "",
}));
} catch {
// Keep fallback data from local auth state.
}
};

loadProfile();
window.addEventListener("profilechange", loadProfile);
return () => {
active = false;
window.removeEventListener("profilechange", loadProfile);
};
}, [token, fallbackRoleDisplay]);

useEffect(() => {
let active = true;

const loadNotifications = async () => {
if (!token) return;
try {
const data = await getNotifications(0, 20);
if (!active) return;
setUnreadCount(Number(data?.unread || 0));
if (notifOpen) setNotifications(Array.isArray(data?.items) ? data.items : []);
} catch {
if (!active) return;
setUnreadCount(0);
if (notifOpen) setNotifications([]);
}
};

loadNotifications();
const id = setInterval(loadNotifications, 15000);
return () => {
active = false;
clearInterval(id);
};
}, [token, notifOpen]);

useEffect(() => {
if (!notifOpen) return;
const onDocClick = (e) => {
if (!notifWrapRef.current) return;
if (!notifWrapRef.current.contains(e.target)) setNotifOpen(false);
};
document.addEventListener("mousedown", onDocClick);
return () => document.removeEventListener("mousedown", onDocClick);
}, [notifOpen]);

const openNotifications = async () => {
setNotifOpen(true);
setNotifLoading(true);
try {
const data = await getNotifications(0, 20);
setUnreadCount(Number(data?.unread || 0));
setNotifications(Array.isArray(data?.items) ? data.items : []);
} catch {
setNotifications([]);
} finally {
setNotifLoading(false);
}
};

const onClickNotification = async (item) => {
if (!item || item.isRead) return;
setNotifications((prev) => prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)));
setUnreadCount((c) => Math.max(0, c - 1));
try {
await markNotificationRead(item.id);
} catch {
// Re-sync if API call fails.
try {
const data = await getNotifications(0, 20);
setUnreadCount(Number(data?.unread || 0));
setNotifications(Array.isArray(data?.items) ? data.items : []);
} catch {}
}
};


const showMasterData = isAdmin;

// Sidebar menu according to role matrix
const menu = useMemo(() => {
const canDashboard = isAdmin || isYardManager || isViewOnly;
const canYardMap = isAdmin || isYardManager || isYardJockey || isViewOnly || isDriver;
const canVehicles = isAdmin || isGateSecurity;
const canGateActivity = isAdmin || isGateSecurity || isViewOnly;
const canYardMove = isAdmin || isYardManager || isYardJockey;
const canYardCheck = isAdmin || isYardManager;
const canInspection = isAdmin || isYardManager;
const canDockManagement = isAdmin || isYardManager || isYardJockey;
const canParkingManagement = isAdmin || isYardManager || isYardJockey;
const canReports = isAdmin || isYardManager || isViewOnly;

return [
...(canDashboard ? [{ to: "/dashboard", icon: <LuLayoutDashboard size={18} />, label: "Dashboard" }] : []),
...(canYardMap ? [{ to: "/dashboard/yardmap", icon: <LuMapPin size={18} />, label: "Yard Map" }] : []),
...(canVehicles ? [{ to: "/dashboard/vehicles", icon: <LuTruck size={18} />, label: "Vehicles" }] : []),
...(canGateActivity ? [{ to: "/dashboard/gate-activity", icon: <LuDoorOpen size={18} />, label: "Arrivals" }] : []),
...(canGateActivity ? [{ to: "/dashboard/gate-departure", icon: <LuLogOut size={18} />, label: "Departures" }] : []),
...(canYardMove ? [{ to: "/dashboard/yard-move", icon: <LuShuffle size={18} />, label: "Yard Move" }] : []),
...(canYardCheck ? [{ to: "/dashboard/yard-check", icon: <LuClipboardCheck size={18} />, label: "Yard Check" }] : []),
...(canInspection ? [{ to: "/dashboard/inspection", icon: <LuShieldCheck size={18} />, label: "Add Inspection" }] : []),
...(canDockManagement ? [{ to: "/dashboard/docks", icon: <LuPackage size={18} />, label: "Dock Management" }] : []),
...(canParkingManagement ? [{ to: "/dashboard/parking", icon: <LuNavigation size={18} />, label: "Parking Management" }] : []),
...(isAdmin ? [{ to: "/dashboard/admin/add-users", icon: <LuUserPlus size={18} />, label: "User Management" }] : []),
...(canReports ? [{ to: "/dashboard/reports", icon: <LuChartBar size={18} />, label: "Reports" }] : []),
{ to: "/dashboard/settings", icon: <LuSettings size={18} />, label: "Settings" },
];
}, [isAdmin, isYardManager, isYardJockey, isGateSecurity, isDriver, isViewOnly]);

const currentPageTitle = useMemo(() => {
const path = location.pathname || "";

const routeTitles = [
{ startsWith: "/dashboard/manage-carrier", title: "Manage Carrier" },
{ startsWith: "/dashboard/manage-facility", title: "Manage Facility" },
{ startsWith: "/dashboard/manage-location", title: "Manage Location" },
{ startsWith: "/dashboard/manage-gate", title: "Manage Gate" },
{ startsWith: "/dashboard/manage-trailer-type", title: "Manage Trailer Type" },
{ startsWith: "/dashboard/manage-goods", title: "Manage Goods" },
{ startsWith: "/dashboard/admin/add-users", title: "User Management" },
];

const masterMatch = routeTitles.find((r) => path.startsWith(r.startsWith));
if (masterMatch) return masterMatch.title;

const menuMatch = [...menu]
.sort((a, b) => String(b.to || "").length - String(a.to || "").length)
.find((m) => path === m.to || (m.to !== "/dashboard" && path.startsWith(`${m.to}/`)));
if (menuMatch?.label) return menuMatch.label;

return "Dashboard";
}, [location.pathname, menu]);

const SEARCH_TARGETS = useMemo(() => ([
...menu.map((m) => ({ keys: [String(m.label || "").toLowerCase()], to: m.to })),
...(menu.some((m) => m.to === "/dashboard/vehicles") ? [{ keys: ["truck", "trucks", "container", "containers"], to: "/dashboard/vehicles" }] : []),
...(menu.some((m) => m.to === "/dashboard/gate-activity") ? [{ keys: ["arrival", "arrivals", "entry"], to: "/dashboard/gate-activity" }] : []),
...(menu.some((m) => m.to === "/dashboard/gate-departure") ? [{ keys: ["departure", "departures", "exit"], to: "/dashboard/gate-departure" }] : []),
...(menu.some((m) => m.to === "/dashboard/yardmap") ? [{ keys: ["map"], to: "/dashboard/yardmap" }] : []),
{ keys: ["profile", "setting", "settings"], to: "/dashboard/settings" },
]), [menu]);

const onSearch = (e) => {
e.preventDefault();
const q = (searchText || "").trim().toLowerCase();
if (!q) return;

const byKeyword = SEARCH_TARGETS.find((item) => item.keys.some((k) => q.includes(k)));
if (byKeyword) {
navigate(byKeyword.to);
setSearchText("");
return;
}

const byMenuLabel = menu.find((m) => q.includes(String(m.label || "").toLowerCase()));
if (byMenuLabel?.to) {
navigate(byMenuLabel.to);
setSearchText("");
}
};


if (!token) return <Navigate to="/login" replace />;


return (
<div className={`yms-shell theme-${theme}`}>
{/* SIDEBAR */}
<aside className={`yms-sidebar glass ${collapsed ? "collapsed" : ""}`}>
<div className="yms-side-top">
<div className="yms-logo">
<div className="logo-box">
<img src={logo} alt="YMS Logo" className="logo-img" />
</div>
{!collapsed && <div className="logo-text">YMS</div>}
</div>


<button className="collapse-btn"

onClick={() => setCollapsed((v) => !v)} title={collapsed ? "Expand" : "Collapse"} type="button"
>
{collapsed ? "»" : "«"}
</button>
</div>


<nav className="yms-nav">
{menu.map((m) => (
<Fragment key={m.to}>
<NavLink key={m.to} to={m.to}
end={m.to === "/dashboard"}
className={({ isActive }) => `yms-link ${isActive ? "active" : ""}`}
>
<span className="yms-ico">{m.icon}</span>
{!collapsed && <span className="yms-text">{m.label}</span>}
</NavLink>

{showMasterData && m.to === "/dashboard/parking" && (
<>
<button type="button"
className={`yms-link yms-link-group ${masterOpen ? "open" : ""} ${ isOnMaster ? "active-group" : ""
}`}
onClick={() => setMasterOpen((v) => !v)}
title="Master Data"
>
<span className="yms-ico">
<LuDatabase size={18} />
</span>

{!collapsed && (
<>
<span className="yms-text">Master Data</span>
<span className={`yms-caret ${masterOpen ? "rot" : ""}`}>
<LuChevronDown size={16} />
</span>
</>
)}
</button>

{/* submenu */}
<div className={`yms-submenu ${masterOpen && !collapsed ? "show" : ""}`}>
<NavLink to="/dashboard/manage-carrier"
className={({ isActive }) => `yms-sublink ${isActive ? "active" : ""}`}
>
<span className="yms-ico">
<LuBadgeCheck size={16} />
</span>
<span className="yms-text">Manage Carrier</span>
</NavLink>

<NavLink to="/dashboard/manage-facility"
className={({ isActive }) => `yms-sublink ${isActive ? "active" : ""}`}
>
<span className="yms-ico">
<LuBuilding2 size={16} />
</span>
<span className="yms-text">Manage Facility</span>
</NavLink>

<NavLink
to="/dashboard/manage-location"
className={({ isActive }) => `yms-sublink ${isActive ? "active" : ""}`}
>
<span className="yms-ico">
<LuNavigation size={16} />
</span>
<span className="yms-text">Manage Location</span>
</NavLink>

<NavLink to="/dashboard/manage-gate"
className={({ isActive }) => `yms-sublink ${isActive ? "active" : ""}`}
>
<span className="yms-ico">
<LuDoorOpen size={16} />
</span>
<span className="yms-text">Manage Gate</span>
</NavLink>

<NavLink to="/dashboard/manage-trailer-type"
className={({ isActive }) => `yms-sublink ${isActive ? "active" : ""}`}
>
<span className="yms-ico">
<LuTruck size={16} />
</span>
<span className="yms-text">Manage Trailer Type</span>
</NavLink>

<NavLink to="/dashboard/manage-goods"
className={({ isActive }) => `yms-sublink ${isActive ? "active" : ""}`}
>
<span className="yms-ico">
<LuPackage size={16} />
</span>
<span className="yms-text">Manage Goods</span>
</NavLink>
</div>
</>
)}
</Fragment>
))}
</nav>


<div className="yms-side-bottom">
<div className="yms-user">
<div className="yms-avatar">
{profileImage ? <img src={profileImage} alt="Profile" className="yms-avatar-img" /> : <LuUser size={18} />}
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
<div className="yms-title">{currentPageTitle}</div>
<div className="yms-role">{role}</div>
</div>


<form className="yms-search glass" onSubmit={onSearch}>
<span className="yms-ico">
<LuSearch size={18} />
</span>
<input
placeholder="Search trucks, containers, docks..."
value={searchText}
onChange={(e) => setSearchText(e.target.value)}
/>

</form>


<div className="yms-actions">
<div className="yms-notif-wrap" ref={notifWrapRef}>
<button
className="yms-icon-btn yms-bell-btn"
title="Notifications"
type="button"
onClick={() => (notifOpen ? setNotifOpen(false) : openNotifications())}
>
<LuBell size={18} />
{unreadCount > 0 && <span className="yms-bell-badge">{unreadCount}</span>}
</button>
{notifOpen && (
<div className="yms-notif-panel">
<div className="yms-notif-head">Notifications</div>
{notifLoading ? (
<div className="yms-notif-empty">Loading...</div>
) : notifications.length === 0 ? (
<div className="yms-notif-empty">No notifications yet.</div>
) : (
<div className="yms-notif-list">
{notifications.map((item) => (
<button
key={item.id}
type="button"
className={`yms-notif-item ${item.isRead ? "read" : "unread"}`}
onClick={() => onClickNotification(item)}
>
<div className="yms-notif-title">{item.title || "Notification"}</div>
<div className="yms-notif-msg">{item.message || ""}</div>
</button>
))}
</div>
)}
</div>
)}
</div>


<button className="yms-icon-btn" onClick={toggleTheme} title="Toggle theme" type="button">
{theme === "dark" ? "🌙" : "☀️"}
</button>


<button
className="yms-icon-btn yms-profile-btn" title="Profile"
type="button"
onClick={() => navigate("/dashboard/settings")}
>
{profileImage ? <img src={profileImage} alt="Profile" className="yms-top-avatar" /> : <LuUser size={18} />}
</button>
</div>
</header>


<section className="yms-content">
<Outlet />
</section>
</main>

<YmsAssistant />
</div>
);
}



