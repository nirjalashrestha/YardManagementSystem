import axios from "axios";

const BASE_URL = "https://localhost:7096";

export const register = async (firstName, lastName, email, phoneNumber, password, confirmPassword) => {
  const fullName = `${String(firstName || "").trim()} ${String(lastName || "").trim()}`.trim();
  const res = await axios.post(`${BASE_URL}/api/Auth/register`, {
    firstName,
    lastName,
    fullName,
    email,
    phoneNumber,
    password,
    confirmPassword,
  });
  return res.data;
};

export const sendOtp = async (email) => {
  const res = await axios.post(`${BASE_URL}/api/Auth/send-otp`, { email });
  return res.data;
};

export const confirmOtp = async (email, code) => {
  const res = await axios.post(`${BASE_URL}/api/Auth/confirm-otp`, {
    email,
    code,
  });
  return res.data;
};


export const login = async (email, password) => {
  const res = await axios.post(`${BASE_URL}/api/Auth/login`, {
    email,
    password,
  });
  return res.data; 
};

export const forgotPassword = async (email) => {
  const res = await axios.post(`${BASE_URL}/api/Auth/forgot-password`, { email });
  return res.data;
};

export const resetPassword = async (email, token, newPassword, confirmPassword) => {
  const res = await axios.post(`${BASE_URL}/api/Auth/reset-password`, {
    email,
    token,
    newPassword,
    confirmPassword,
  });
  return res.data;
};
