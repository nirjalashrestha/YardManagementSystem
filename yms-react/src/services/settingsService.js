import { api } from "./api.js";

export const getMyProfile = async () => {
  try {
    const res = await api.get("/api/profile/me");
    return res.data;
  } catch (e) {
    const status = e?.response?.status;
    if (status !== 404) throw e;
    const fallback = await api.get("/api/users/me");
    const u = fallback.data || {};
    return {
      id: u.id || u.Id || "",
      publicId: u.userId || u.UserId || "",
      fullName: u.fullName || u.FullName || "",
      email: u.email || u.Email || "",
      role: u.role || u.Role || "",
      phoneNumber: u.phoneNumber || u.PhoneNumber || "",
      address: u.address || u.Address || "",
      profileImageUrl: u.profileImageUrl || u.ProfileImageUrl || u.photoUrl || u.PhotoUrl || "",
      themePreference: u.themePreference || u.ThemePreference || "dark",
      notifyArrivals: u.notifyArrivals ?? u.NotifyArrivals ?? true,
      notifyDepartures: u.notifyDepartures ?? u.NotifyDepartures ?? true,
      notifyEmail: u.notifyEmail ?? u.NotifyEmail ?? true,
      notifySms: u.notifySms ?? u.NotifySms ?? false,
    };
  }
};

export const updateMyProfile = async (payload) => {
  const res = await api.put("/api/profile/me", payload);
  return res.data;
};

export const uploadProfilePhoto = async (file, publicId = "") => {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await api.post("/api/profile/me/photo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  } catch (e) {
    const status = e?.response?.status;
    if (status !== 404 || !publicId) throw e;
    const res = await api.post(`/api/users/${publicId}/photo`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  }
};

export const updatePreferences = async (payload) => {
  const res = await api.put("/api/settings/preferences", payload);
  return res.data;
};

export const changePassword = async (payload) => {
  const res = await api.post("/api/auth/change-password", payload);
  return res.data;
};

export const sendAiSupport = async (payload) => {
  try {
    const res = await api.post("/api/assistant/ask", payload);
    return res.data;
  } catch (e) {
    const status = Number(e?.response?.status || 0);
    // Backward compatibility with older endpoint if new one is not added yet
    if (status === 404 || status === 405) {
      const fallback = await api.post("/api/settings/ai-support", payload);
      return fallback.data;
    }
    throw e;
  }
};

export const deleteProfilePhoto = async (publicId = "") => {
  try {
    const res = await api.delete("/api/profile/me/photo");
    return res.data;
  } catch (e) {
    const status = e?.response?.status;
    if (status !== 404 || !publicId) throw e;
    const res = await api.delete(`/api/users/${publicId}/photo`);
    return res.data;
  }
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("fullName");
  localStorage.removeItem("profileImageUrl");
};

