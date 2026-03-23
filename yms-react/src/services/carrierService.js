import { api } from "./api.js";

const CARRIERS_API = "/api/carriers";


export const getCarriers = async ({
  search = "",
  facilityId = "",
  skip = 0,
  take = 6,
} = {}) => {
  const res = await api.get(CARRIERS_API, {
    params: { search, facilityId, skip, take },
  });
  return res.data;
};

export const createCarrier = async (payload) => {
  const res = await api.post(CARRIERS_API, payload);
  return res.data;
};

export const updateCarrier = async (id, payload) => {
  const res = await api.put(`${CARRIERS_API}/${id}`, payload);
  return res.data;
};

export const deleteCarrier = async (id) => {
  const res = await api.delete(`${CARRIERS_API}/${id}`);
  return res.data;
};

