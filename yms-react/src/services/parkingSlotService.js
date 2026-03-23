import { api } from "./api.js";

const PARKING_SLOTS_API = "/api/parking-slots";

export const getParkingSlots = async ({
  search = "",
  facilityId = "",
  locationId = "",
  status = "",
  skip = 0,
  take = 6,
} = {}) => {
  const res = await api.get(PARKING_SLOTS_API, {
    params: { search, facilityId, locationId, status, skip, take },
  });
  return res.data;
};

export const createParkingSlot = async (payload) => {
  const res = await api.post(PARKING_SLOTS_API, payload);
  return res.data;
};

export const updateParkingSlot = async (id, payload) => {
  const res = await api.put(`${PARKING_SLOTS_API}/${id}`, payload);
  return res.data;
};

export const deleteParkingSlot = async (id) => {
  const res = await api.delete(`${PARKING_SLOTS_API}/${id}`);
  return res.data;
};
