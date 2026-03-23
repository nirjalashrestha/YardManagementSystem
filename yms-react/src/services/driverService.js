const API_BASE = "https://localhost:7096/api/drivers";

export async function getDrivers(token) {
  const res = await fetch(API_BASE, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to load drivers");
  }

  return res.json();
}

export async function createDriver(payload, token) {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to create driver");
  }

  return res.json();
}

export async function updateDriver(driverId, payload, token) {
  const res = await fetch(`${API_BASE}/${encodeURIComponent(driverId)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to update driver");
  }

  return res.json();
}

export async function deleteDriver(driverId, token) {
  const res = await fetch(`${API_BASE}/${encodeURIComponent(driverId)}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  // 204 is success (NoContent)
  if (res.status === 204) return true;

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to delete driver");
  }

  return true;
}

export async function uploadDriverPhoto(driverId, file, token) {
  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch(`${API_BASE}/${encodeURIComponent(driverId)}/photo`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: fd,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to upload photo");
  }
  return res.json(); // { photoUrl }
}

export async function getDriverById(driverId, token) {
  const res = await fetch(`${API_BASE}/${encodeURIComponent(driverId)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    // If not found, return null (so UI doesn't show error popup)
    if (res.status === 404) return null;

    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to load driver");
  }

  return res.json();
}