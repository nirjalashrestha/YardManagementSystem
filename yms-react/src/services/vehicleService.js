// src/services/vehicleService.js
import axios from "axios";

const API = "https://localhost:7096/api/vehicles";

const normTN = (tn) => (tn || "").toUpperCase().replace(/\s+/g, "").trim();

export async function getVehicles() {
  const res = await axios.get(API);
  return res.data;
}


export async function createVehicle(payload) {
  const res = await axios.post(API, payload);
  return res.data;
}


export async function updateVehicle(trailerNumber, payload) {
  const tn = normTN(trailerNumber);
  const res = await axios.put(`${API}/${encodeURIComponent(tn)}`, payload);
  return res.data;
}


export async function deleteVehicle(trailerNumber) {
  const tn = normTN(trailerNumber);
  const res = await axios.delete(`${API}/${encodeURIComponent(tn)}`);
  return res.data;
}


export async function uploadVehiclePhoto(trailerNumber, file) {
  const tn = normTN(trailerNumber);

  const fd = new FormData();
  fd.append("file", file);

  const res = await axios.post(`${API}/${encodeURIComponent(tn)}/photo`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return res.data; 
}


export async function deleteVehiclePhoto(trailerNumber) {
  const tn = normTN(trailerNumber);
  const res = await axios.delete(`${API}/${encodeURIComponent(tn)}/photo`);
  return res.data;
}