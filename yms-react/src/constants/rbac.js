export const ROLE = {
  ADMIN: "ADMIN",
  YARD_MANAGER: "YARD_MANAGER",
  YARD_JOCKEY: "YARD_JOCKEY",
  GATE_SECURITY: "GATE_SECURITY",
  DRIVER: "DRIVER",
  VIEW_ONLY: "VIEW_ONLY",
};

export function normalizeRole(input = "") {
  const raw = String(input || "").trim();
  if (!raw) return "";

  const compact = raw.replace(/\s+/g, "").toUpperCase();
  if (compact === "ADMIN") return ROLE.ADMIN;
  if (compact === "YARDMANAGER") return ROLE.YARD_MANAGER;
  if (compact === "YARD_JOCKEY" || compact === "YARDJOCKEY") return ROLE.YARD_JOCKEY;
  if (compact === "GATESECURITY" || compact === "GATE_SECURITY") return ROLE.GATE_SECURITY;
  if (compact === "DRIVER") return ROLE.DRIVER;
  if (compact === "VIEWONLY" || compact === "VIEW_ONLY" || compact === "USER") return ROLE.VIEW_ONLY;

  const upper = raw.toUpperCase().replace(/\s+/g, "_");
  if (upper in ROLE) return upper;
  return "";
}

export function toRoleDisplay(roleCode = "") {
  const r = normalizeRole(roleCode);
  if (r === ROLE.ADMIN) return "Admin";
  if (r === ROLE.YARD_MANAGER) return "Yard Manager";
  if (r === ROLE.YARD_JOCKEY) return "Yard Jockey";
  if (r === ROLE.GATE_SECURITY) return "Gate Security";
  if (r === ROLE.DRIVER) return "Driver";
  return "View Only";
}

