import { api } from "./api.js";

const DOCKS_API = "/api/docks";

export const getDocks = async ({
  search = "",
  facilityId = "",
  locationId = "",
  status = "",
  skip = 0,
  take = 6,
} = {}) => {
  const res = await api.get(DOCKS_API, {
    params: { search, facilityId, locationId, status, skip, take },
  });
  return res.data;
};

export const createDock = async (payload) => {
  const res = await api.post(DOCKS_API, payload);
  return res.data;
};

export const updateDock = async (id, payload) => {
  const res = await api.put(`${DOCKS_API}/${id}`, payload);
  return res.data;
};

export const deleteDock = async (id) => {
  const res = await api.delete(`${DOCKS_API}/${id}`);
  return res.data;
};