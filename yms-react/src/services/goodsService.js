import { api } from "./api.js";

const GOODS_API = "/api/goods";

export const getGoods = async ({
  search = "",
  facilityId = "",
  skip = 0,
  take = 6,
} = {}) => {
  const res = await api.get(GOODS_API, {
    params: { search, facilityId, skip, take },
  });
  return res.data;
};

export const createGoods = async (payload) => {
  const res = await api.post(GOODS_API, payload);
  return res.data;
};

export const updateGoods = async (id, payload) => {
  const res = await api.put(`${GOODS_API}/${id}`, payload);
  return res.data;
};

export const deleteGoods = async (id) => {
  const res = await api.delete(`${GOODS_API}/${id}`);
  return res.data;
};

