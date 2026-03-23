import { api } from "./api.js";

const GATE_ACTIVITY_API = "/api/GateActivity";

const pick = (obj, keys, fallback = null) => {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null) return value;
  }
  return fallback;
};

const toBool = (v) => {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v.toLowerCase() === "true";
  if (typeof v === "number") return v === 1;
  return !!v;
};

const normalizeArrival = (row = {}) => {
  const id = String(pick(row, ["id", "Id"], ""));
  return {
    id,
    arrivalId: id,
    activityId: String(pick(row, ["activityId", "ActivityId"], "")),
    date: String(pick(row, ["date", "Date"], "")),
    timeIn: String(pick(row, ["timeIn", "TimeIn"], "")),
    gateNo: String(pick(row, ["gateNo", "GateNo"], "")),
    facilityId: String(pick(row, ["facilityId", "FacilityId"], "")),
    facilityName: String(pick(row, ["facilityName", "FacilityName"], "")),
    locationId: pick(row, ["locationId", "LocationId"], null),
    locationName: pick(row, ["locationName", "LocationName"], null),
    locationType: pick(row, ["locationType", "LocationType"], null),
    carrierId: pick(row, ["carrierId", "CarrierId"], null),
    carrierName: pick(row, ["carrierName", "CarrierName"], null),
    goodsId: pick(row, ["goodsId", "GoodsId"], null),
    goodsName: pick(row, ["goodsName", "GoodsName"], null),
    trailerType: pick(row, ["trailerType", "TrailerType"], null),
    trailerNumber: pick(row, ["trailerNumber", "TrailerNumber"], null),
    driverUserId: pick(row, ["driverUserId", "DriverUserId"], null),
    driverId: pick(row, ["driverId", "DriverId"], null),
    driverName: pick(row, ["driverName", "DriverName"], null),
    purpose: String(pick(row, ["purpose", "Purpose"], "")),
    status: String(pick(row, ["status", "Status"], "")),
    documentVerified: toBool(pick(row, ["documentVerified", "DocumentVerified"], false)),
    licenseVerified: toBool(pick(row, ["licenseVerified", "LicenseVerified"], false)),
    securityCleared: toBool(pick(row, ["securityCleared", "SecurityCleared"], false)),
    remarks: pick(row, ["remarks", "Remarks"], null),
  };
};

const normalizePaged = (data = {}, mapItem = (x) => x) => ({
  total: Number(pick(data, ["total", "Total"], 0)),
  shown: Number(pick(data, ["shown", "Shown"], 0)),
  items: (pick(data, ["items", "Items"], []) || []).map(mapItem),
});

// ARRIVALS
export const getArrivals = async ({ search = "", skip = 0, take = 6 } = {}) => {
  const res = await api.get(`${GATE_ACTIVITY_API}/arrivals`, { params: { search, skip, take } });
  return normalizePaged(res.data, normalizeArrival);
};

export const createArrival = async (payload) => {
  const res = await api.post(`${GATE_ACTIVITY_API}/arrivals`, payload);
  return res.data;
};

export const updateArrival = async (id, payload) => {
  const res = await api.put(`${GATE_ACTIVITY_API}/arrivals/${id}`, payload);
  return res.data;
};

export const deleteArrival = async (id) => {
  const res = await api.delete(`${GATE_ACTIVITY_API}/arrivals/${id}`);
  return res.data;
};

// DEPARTURES
export const getDepartures = async ({ search = "", skip = 0, take = 6 } = {}) => {
  const res = await api.get(`${GATE_ACTIVITY_API}/departures`, { params: { search, skip, take } });
  return res.data;
};

export const createDeparture = async (payload) => {
  const res = await api.post(`${GATE_ACTIVITY_API}/departures`, payload);
  return res.data;
};

export const updateDeparture = async (id, payload) => {
  const res = await api.put(`${GATE_ACTIVITY_API}/departures/${id}`, payload);
  return res.data;
};

export const deleteDeparture = async (id) => {
  const res = await api.delete(`${GATE_ACTIVITY_API}/departures/${id}`);
  return res.data;
};

// DASHBOARD
export const getRecentGateActivity = async ({ skip = 0, take = 6, facilityId = "" } = {}) => {
  const params = { skip, take };
  if (facilityId) params.facilityId = facilityId;
  const res = await api.get(`${GATE_ACTIVITY_API}/recent`, { params });
  return res.data;
};

export const getCountsToday = async ({ facilityId = "" } = {}) => {
  const params = {};
  if (facilityId) params.facilityId = facilityId;
  const res = await api.get(`${GATE_ACTIVITY_API}/counts-today`, { params });
  return res.data;
};

export const getWeeklyStats = async ({ days = 7, facilityId = "" } = {}) => {
  const params = { days };
  if (facilityId) params.facilityId = facilityId;
  const res = await api.get(`${GATE_ACTIVITY_API}/weekly-stats`, { params });
  return res.data;
};

