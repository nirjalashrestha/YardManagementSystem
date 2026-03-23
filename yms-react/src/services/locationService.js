// src/services/locationService.js
import { api } from "./api.js";

const LOCATIONS_API = "/api/locations";

const pick = (obj, keys, fallback = null) => {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null) return value;
  }
  return fallback;
};

const normalizeLocation = (row = {}) => ({
  id: String(pick(row, ["id", "Id"], "")),
  facilityId: String(pick(row, ["facilityId", "FacilityId"], "")),
  facilityName: String(pick(row, ["facilityName", "FacilityName"], "")),
  locationName: String(pick(row, ["locationName", "LocationName"], "")),
  locationType: String(pick(row, ["locationType", "LocationType"], "")).toUpperCase(),
  locationCode: String(pick(row, ["locationCode", "LocationCode"], "")),
  capacity: pick(row, ["capacity", "Capacity"], null),
  sortOrder: Number(pick(row, ["sortOrder", "SortOrder"], 1)),
});

const normalizePaged = (data = {}) => ({
  total: Number(pick(data, ["total", "Total"], 0)),
  shown: Number(pick(data, ["shown", "Shown"], 0)),
  items: (pick(data, ["items", "Items"], []) || []).map(normalizeLocation),
});

/**
 * Get locations (paged)
 * Backend: GET /api/locations?search=&facilityId=&skip=&take=
 */
export const getLocations = async ({
  search = "",
  facilityId = "",
  skip = 0,
  take = 6,
} = {}) => {
  const params = {
    search,
    skip,
    take,
  };

  // ✅ include facilityId only when it exists (avoids sending empty string to Guid?)
  if (facilityId) params.facilityId = facilityId;

  const res = await api.get(LOCATIONS_API, { params });
  return normalizePaged(res.data);
};

/**
 * Create location
 * Backend: POST /api/locations
 */
export const createLocation = async (payload) => {
  const res = await api.post(LOCATIONS_API, payload);
  return res.data;
};

/**
 * Update location
 * Backend: PUT /api/locations/{id}
 */
export const updateLocation = async (id, payload) => {
  const res = await api.put(`${LOCATIONS_API}/${id}`, payload);
  return res.data;
};

/**
 * Delete location
 * Backend: DELETE /api/locations/{id}
 */
export const deleteLocation = async (id) => {
  const res = await api.delete(`${LOCATIONS_API}/${id}`);
  return res.data;
};
