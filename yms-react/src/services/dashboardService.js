import { api } from "./api";

const DASHBOARD_API = "/api/dashboard";

export const getDashboardKpis = async () => {
  const res = await api.get(`${DASHBOARD_API}/kpis`);
  return res.data;
};

export const getRecentGateActivity = async ({ skip = 0, take = 6 } = {}) => {
  const res = await api.get(`${DASHBOARD_API}/recent-gate-activity`, {
    params: { skip, take },
  });
  return res.data;
};

export const getWeeklyArrivals = async ({ days = 7 } = {}) => {
  const res = await api.get(`${DASHBOARD_API}/weekly-arrivals`, { params: { days } });
  return res.data;
};

export const getWeeklyDepartures = async ({ days = 7 } = {}) => {
  const res = await api.get(`${DASHBOARD_API}/weekly-departures`, { params: { days } });
  return res.data;
};
