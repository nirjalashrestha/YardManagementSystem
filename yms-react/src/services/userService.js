import { api } from "./api.js";

const USERS_API = "/api/users";


export const getUsers = async () => {
  const res = await api.get(USERS_API);
  return res.data;
};


export const createUser = async (payload) => {
  const res = await api.post(USERS_API, payload);
  return res.data;
};


export const updateUser = async (id, payload) => {
  const res = await api.put(`${USERS_API}/${id}`, payload);
  return res.data;
};


export const deleteUser = async (id) => {
  const res = await api.delete(`${USERS_API}/${id}`);
  return res.data;
};


export const uploadUserPhoto = async (publicId, file) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await api.post(`${USERS_API}/${publicId}/photo`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return res.data; 
};


export const deleteUserPhoto = async (publicId) => {
  const res = await api.delete(`${USERS_API}/${publicId}/photo`);
  return res.data;
};


export const toggleUserStatus = async (id) => {
  const res = await api.post(`${USERS_API}/${id}/toggle-status`);
  return res.data;
};


export const getMyProfile = async () => {
  const res = await api.get(`${USERS_API}/me`);
  return res.data;
};



export const getDrivers = async ({ search = "", skip = 0, take = 200 } = {}) => {
  const res = await api.get(`${USERS_API}/drivers`, { params: { search, skip, take } });

  return res.data;
};
