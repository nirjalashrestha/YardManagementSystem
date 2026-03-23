import { Navigate } from "react-router-dom";
import { normalizeRole, ROLE } from "../constants/rbac";

export default function RequireRole({ allowed = [], children }) {
  const roleRaw = localStorage.getItem("roleKey") || localStorage.getItem("role") || "";
  const role = normalizeRole(roleRaw) || ROLE.VIEW_ONLY;
  const allowedNorm = allowed.map((r) => normalizeRole(r)).filter(Boolean);

  if (!allowedNorm.includes(role)) {
    return <Navigate to="/dashboard" replace />; // redirect if role not allowed
  }
  return children;
}
