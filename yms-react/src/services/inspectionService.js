
import axios from "axios";

const API = "https://localhost:7096/api/inspections"; 

export async function getInspections({ search = "", status = "all", skip = 0, take = 6 } = {}) {
  const res = await axios.get(API, { params: { search, status, skip, take } });
  return res.data;
}

export async function createInspection(payload) {
  const res = await axios.post(API, payload);
  return res.data;
}

export async function updateInspection(id, payload) {
  const res = await axios.put(`${API}/${id}`, payload);
  return res.data;
}

export async function deleteInspection(id) {
  const res = await axios.delete(`${API}/${id}`);
  return res.data;
}