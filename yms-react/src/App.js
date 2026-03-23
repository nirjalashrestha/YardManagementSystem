import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Auth pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import ConfirmEmail from "./pages/ConfirmEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

// Layout + pages
import Dashboard from "./pages/Dashboard";
import DashboardHome from "./pages/DashboardHome";
import VehiclesPage from "./pages/VehiclesPage";
import GateActivityPage from "./pages/GateActivityPage";
import AddUserPage from "./pages/AdminUserPage";
import GateSecurityDashboard from "./pages/GateSecurityDashboard";
import DockManagementPage from "./pages/DockManagementPage";
import ParkingManagementPage from "./pages/ParkingManagementPage";
import YardMapPage from "./pages/YardMapPage";
import ReportsPage from "./pages/ReportsPage";
import UserRoleMixPage from "./pages/UserRoleMixPage";

import YardMovePage from "./pages/YardMovePage";
import YardCheckPage from "./pages/YardCheckPage";
import InspectionPage from "./pages/InspectionPage";
import SettingsPage from "./pages/SettingsPage";
import SettingsEditProfilePage from "./pages/SettingsEditProfilePage";
import SettingsChangePasswordPage from "./pages/SettingsChangePasswordPage";



// Role guard
import RequireRole from "./components/RequireRole";


// master data pages
import ManageCarrier from "./pages/ManageCarrier";
import ManageFacility from "./pages/ManageFacility";
import ManageLocation from "./pages/ManageLocation";
import ManageGate from "./pages/ManageGate";
import ManageTrailerType from "./pages/ManageTrailerType";
import ManageGoods from "./pages/ManageGoods";
import { ROLE } from "./constants/rbac";

const RBAC = {
  DASHBOARD_ACCESS: [ROLE.ADMIN, ROLE.YARD_MANAGER, ROLE.VIEW_ONLY],
  YARD_MAP_ACCESS: [ROLE.ADMIN, ROLE.YARD_MANAGER, ROLE.YARD_JOCKEY, ROLE.VIEW_ONLY, ROLE.DRIVER],
  REPORT_ACCESS: [ROLE.ADMIN, ROLE.YARD_MANAGER, ROLE.VIEW_ONLY],
  ADMIN_ONLY: [ROLE.ADMIN],
  YARD_MOVE_ACCESS: [ROLE.ADMIN, ROLE.YARD_MANAGER, ROLE.YARD_JOCKEY],
  YARD_MANAGER_OPS: [ROLE.ADMIN, ROLE.YARD_MANAGER],
  YARD_LOCATION_VIEW: [ROLE.ADMIN, ROLE.YARD_MANAGER, ROLE.YARD_JOCKEY],
  GATE_ACCESS: [ROLE.ADMIN, ROLE.GATE_SECURITY, ROLE.VIEW_ONLY],
  VEHICLE_ACCESS: [ROLE.ADMIN, ROLE.GATE_SECURITY],
};

function DashboardIndexRedirect() {
  const token = localStorage.getItem("token");
  const roleKeyRaw = String(localStorage.getItem("roleKey") || "").trim();
  const roleKey = roleKeyRaw.toUpperCase().replace(/\s+/g, "_");

  if (!token) return <Navigate to="/login" replace />;
  if (roleKey === ROLE.GATE_SECURITY) return <Navigate to="/dashboard/gate-activity" replace />;
  if (RBAC.DASHBOARD_ACCESS.includes(roleKey)) return <DashboardHome />;
  return <Navigate to="/dashboard/yardmap" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Auth routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<Navigate to="/confirm-email" replace />} />
        <Route path="/confirm-email" element={<ConfirmEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* DASHBOARD LAYOUT */}
        <Route path="/dashboard" element={<Dashboard />}>
          <Route
            index
            element={<DashboardIndexRedirect />}
          />

         
          <Route
            path="yardmap"
            element={
              <RequireRole allowed={RBAC.YARD_MAP_ACCESS}>
                <YardMapPage />
              </RequireRole>
            }
          />

          <Route
            path="vehicles"
            element={
              <RequireRole allowed={RBAC.VEHICLE_ACCESS}>
                <VehiclesPage />
              </RequireRole>
            }
          />

          <Route
            path="gate-activity"
            element={
              <RequireRole allowed={RBAC.GATE_ACCESS}>
                <GateActivityPage forcedTab="arrival" />
              </RequireRole>
            }
          />

          <Route
            path="gate-departure"
            element={
              <RequireRole allowed={RBAC.GATE_ACCESS}>
                <GateActivityPage forcedTab="departure" />
              </RequireRole>
            }
          />

          <Route
  path="yard-move"
  element={
    <RequireRole allowed={RBAC.YARD_MOVE_ACCESS}>
      <YardMovePage />
    </RequireRole>
  }
/>

          <Route
  path="yard-check"
  element={
    <RequireRole allowed={RBAC.YARD_MANAGER_OPS}>
      <YardCheckPage />
    </RequireRole>
  }
/>
 <Route
         path="docks"
         element={
              <RequireRole allowed={RBAC.YARD_LOCATION_VIEW}>
               <DockManagementPage />
            </RequireRole>          }
         />
 <Route
         path="parking"
         element={
              <RequireRole allowed={RBAC.YARD_LOCATION_VIEW}>
               <ParkingManagementPage />
            </RequireRole>          }
         />
 <Route
         path="reports"
         element={
              <RequireRole allowed={RBAC.REPORT_ACCESS}>
               <ReportsPage />
            </RequireRole>          }
         />
 <Route
         path="reports-user-role"
         element={
              <RequireRole allowed={RBAC.REPORT_ACCESS}>
               <UserRoleMixPage />
            </RequireRole>          }
         />


     <Route
       path="inspection"
       element={
         <RequireRole allowed={RBAC.YARD_MANAGER_OPS}>
           <InspectionPage />
         </RequireRole>
       }
     />


     
          <Route path="manage-carrier" element={<RequireRole allowed={RBAC.ADMIN_ONLY}><ManageCarrier /></RequireRole>} />
          <Route path="manage-facility" element={<RequireRole allowed={RBAC.ADMIN_ONLY}><ManageFacility /></RequireRole>} />
          <Route path="manage-location" element={<RequireRole allowed={RBAC.ADMIN_ONLY}><ManageLocation /></RequireRole>} />
          <Route path="manage-gate" element={<RequireRole allowed={RBAC.ADMIN_ONLY}><ManageGate /></RequireRole>} />
          <Route path="manage-trailer-type" element={<RequireRole allowed={RBAC.ADMIN_ONLY}><ManageTrailerType /></RequireRole>} />
          <Route path="manage-goods" element={<RequireRole allowed={RBAC.ADMIN_ONLY}><ManageGoods /></RequireRole>} />




         


      

          {/* ADMIN ONLY */}
          <Route
            path="admin/add-users"
            element={
              <RequireRole allowed={RBAC.ADMIN_ONLY}>
                <AddUserPage />
              </RequireRole>
            }
          />

          {/* GATE SECURITY ONLY */}
          <Route
            path="gate-security"
            element={
              <RequireRole allowed={[ROLE.GATE_SECURITY]}>
                <GateSecurityDashboard />
              </RequireRole>
            }
          />

          <Route path="settings" element={<SettingsPage />} />
          <Route path="settings/profile/edit" element={<SettingsEditProfilePage />} />
          <Route path="settings/change-password" element={<SettingsChangePasswordPage />} />
        </Route>
       

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
