import { api } from "./api.js";

const YARD_MOVES_API = "/api/yard-moves";

const pick = (obj, keys, fallback = null) => {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null) return value;
  }
  return fallback;
};

const normalizeYardMove = (row = {}) => ({
  id: String(pick(row, ["id", "Id"], "")),
  vehicleId: pick(row, ["vehicleId", "VehicleId"], null),
  trailerNumber: String(pick(row, ["trailerNumber", "TrailerNumber"], "")),
  facilityId: String(pick(row, ["facilityId", "FacilityId"], "")),
  facilityName: String(pick(row, ["facilityName", "FacilityName"], "")),
  carrierId: pick(row, ["carrierId", "CarrierId"], null),
  carrierName: pick(row, ["carrierName", "CarrierName"], null),
  fromLocationId: pick(row, ["fromLocationId", "FromLocationId"], null),
  fromLocationName: pick(row, ["fromLocationName", "FromLocationName"], null),
  fromLocationType: pick(row, ["fromLocationType", "FromLocationType"], null),
  toLocationId: String(pick(row, ["toLocationId", "ToLocationId"], "")),
  toLocationName: String(pick(row, ["toLocationName", "ToLocationName"], "")),
  toLocationType: pick(row, ["toLocationType", "ToLocationType"], null),
  moveDateTime: pick(row, ["moveDateTime", "MoveDateTime"], null),
  status: String(pick(row, ["status", "Status"], "")),
  remarks: pick(row, ["remarks", "Remarks"], null),
  createdAt: pick(row, ["createdAt", "CreatedAt"], null),
  updatedAt: pick(row, ["updatedAt", "UpdatedAt"], null),
  createdBy: pick(row, ["createdBy", "CreatedBy"], null),
  updatedBy: pick(row, ["updatedBy", "UpdatedBy"], null),
  refId: pick(row, ["refId", "RefId"], null),
});

const normalizePaged = (data = {}) => ({
  total: Number(pick(data, ["total", "Total"], 0)),
  shown: Number(pick(data, ["shown", "Shown"], 0)),
  items: (pick(data, ["items", "Items"], []) || []).map(normalizeYardMove),
});

export const getYardMoves = async ({
  search = "",
  facilityId = "",
  status = "",
  skip = 0,
  take = 6,
} = {}) => {
  const res = await api.get(YARD_MOVES_API, {
    params: { search, facilityId, status, skip, take },
  });
  return normalizePaged(res.data);
};

export const createYardMove = async (payload) => {
  const res = await api.post(YARD_MOVES_API, payload);
  return res.data;
};

export const updateYardMove = async (id, payload) => {
  const res = await api.put(`${YARD_MOVES_API}/${id}`, payload);
  return res.data;
};

export const deleteYardMove = async (id) => {
  const res = await api.delete(`${YARD_MOVES_API}/${id}`);
  return res.data;
};
