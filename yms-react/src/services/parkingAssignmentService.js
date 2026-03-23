import { api } from "./api.js";

const PARKING_ASSIGNMENTS_API = "/api/parking-assignments";

export const getParkingAssignments = async ({
  facilityId = "",
  parkingSlotId = "",
  arrivalId = "",
  activeOnly = true,
  skip = 0,
  take = 6,
} = {}) => {
  const res = await api.get(PARKING_ASSIGNMENTS_API, {
    params: { facilityId, parkingSlotId, arrivalId, activeOnly, skip, take },
  });
  return res.data;
};

export const getAvailableParkingSlots = async ({
  facilityId = "",
  locationId = "",
} = {}) => {
  const res = await api.get(`${PARKING_ASSIGNMENTS_API}/available-slots`, {
    params: { facilityId, locationId },
  });
  return res.data;
};

export const assignParking = async (payload) => {
  const res = await api.post(`${PARKING_ASSIGNMENTS_API}/assign`, payload);
  return res.data;
};

export const releaseParking = async (id, payload) => {
  const res = await api.put(`${PARKING_ASSIGNMENTS_API}/${id}/release`, payload);
  return res.data;
};
