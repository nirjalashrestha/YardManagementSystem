import { api } from "./api.js";

const API = "/api/yardchecks";

export async function getYardChecks({ search = "", status = "all", skip = 0, take = 6 } = {}) {
  const params = { search, skip, take };
  if (status && status !== "all") params.status = status;
  const res = await api.get(API, { params });
  return res.data; 
}

export async function createYardCheck(payload) {
  const res = await api.post(API, payload);
  return res.data;
}

export async function updateYardCheck(id, payload) {
  const res = await api.put(`${API}/${id}`, payload);
  return res.data;
}

export async function deleteYardCheck(id) {
  const res = await api.delete(`${API}/${id}`);
  return res.data;
}
