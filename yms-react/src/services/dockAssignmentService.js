import { api } from "./api.js";

const DOCK_ASSIGNMENTS_API = "/api/dock-assignments";

export const getDockAssignments = async ({
  facilityId = "",
  dockId = "",
  arrivalId = "",
  activeOnly = true,
  skip = 0,
  take = 6,
} = {}) => {
  const res = await api.get(DOCK_ASSIGNMENTS_API, {
    params: { facilityId, dockId, arrivalId, activeOnly, skip, take },
  });
  return res.data;
};

export const getAvailableDocks = async ({ facilityId = "", locationId = "" } = {}) => {
  const res = await api.get(`${DOCK_ASSIGNMENTS_API}/available-docks`, {
    params: { facilityId, locationId },
  });
  return res.data;
};

export const assignDock = async (payload) => {
  const res = await api.post(`${DOCK_ASSIGNMENTS_API}/assign`, payload);
  return res.data;
};

export const releaseDock = async (id, payload) => {
  const res = await api.put(`${DOCK_ASSIGNMENTS_API}/${id}/release`, payload);
  return res.data;
};