import { api } from "./api.js";

const TRAILER_TYPES_API = "/api/trailertypes";

export const getTrailerTypes = async ({
  search = "",
  facilityId = "",
  skip = 0,
  take = 6,
} = {}) => {
  const res = await api.get(TRAILER_TYPES_API, {
    params: { search, facilityId, skip, take },
  });
  return res.data;
};

export const createTrailerType = async (payload) => {
  const res = await api.post(TRAILER_TYPES_API, payload);
  return res.data;
};

export const updateTrailerType = async (id, payload) => {
  const res = await api.put(`${TRAILER_TYPES_API}/${id}`, payload);
  return res.data;
};

export const deleteTrailerType = async (id) => {
  const res = await api.delete(`${TRAILER_TYPES_API}/${id}`);
  return res.data;
};