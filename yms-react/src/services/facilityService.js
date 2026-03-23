import { api } from "./api.js";

const FACILITIES_API = "/api/facilities";


export const getFacilities = async ({ search = "", skip = 0, take = 6 } = {}) => {
  const res = await api.get(FACILITIES_API, {
    params: { search, skip, take },
  });

  return res.data;
};


export const createFacility = async (payload) => {
  const res = await api.post(FACILITIES_API, payload);
  return res.data;
};


export const updateFacility = async (id, payload) => {
  const res = await api.put(`${FACILITIES_API}/${id}`, payload);
  return res.data;
};


export const deleteFacility = async (id) => {
  const res = await api.delete(`${FACILITIES_API}/${id}`);
  return res.data;
};
