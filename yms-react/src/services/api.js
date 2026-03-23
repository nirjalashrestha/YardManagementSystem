import axios from "axios";

export const api = axios.create({
  baseURL: "https://localhost:7096",
});

api.interceptors.request.use((config) => {
  const token = String(localStorage.getItem("token") || "").trim();
  if (token && token !== "null" && token !== "undefined") {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    // ✅ This will show the REAL reason for 400 in console
    console.error("API ERROR URL:", error?.config?.url);
    console.error("API ERROR STATUS:", error?.response?.status);
    console.error("API ERROR DATA:", error?.response?.data);
    console.error("API ERROR MSG:", error?.message);

    return Promise.reject(error);
  }
);
