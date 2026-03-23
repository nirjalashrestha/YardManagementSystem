import { api } from "./api.js";

const GATES_API = "/api/gates";


export const getGates = async ({
  search = "",
  facilityId = "",
  status = "",
  type = "",
  skip = 0,
  take = 6,
} = {}) => {
  const res = await api.get(GATES_API, {
    params: {
      search,
      skip,
      take,
      ...(facilityId && { facilityId }),
      ...(status && { status }),
      ...(type && { type }),
    },
  });

  return res.data;
};

export const createGate = async (payload) => {
  const res = await api.post(GATES_API, payload);
  return res.data;
};

export const updateGate = async (id, payload) => {
  await api.put(`${GATES_API}/${id}`, payload);
};


export const deleteGate = async (id) => {
  await api.delete(`${GATES_API}/${id}`);
};
