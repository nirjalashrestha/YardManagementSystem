import { api } from "./api.js";

export const getNotifications = async (skip = 0, take = 20) => {
  const res = await api.get("/api/notifications", { params: { skip, take } });
  return res.data;
};

export const markNotificationRead = async (id) => {
  const res = await api.post(`/api/notifications/${id}/read`);
  return res.data;
};

export const markAllNotificationsRead = async () => {
  const res = await api.post("/api/notifications/read-all");
  return res.data;
};

