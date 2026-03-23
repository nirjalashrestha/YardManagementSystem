// src/pages/DriversPage.jsx
import { useEffect, useMemo, useState } from "react";
import "../styles/dashboard.css";
import { FiEdit2, FiTrash2 } from "react-icons/fi";

import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  uploadUserPhoto,
} from "../services/userService";

const API_ORIGIN = "https://localhost:7096";

const toFullPhotoUrl = (raw) => {
  if (!raw) return "";
  return raw.startsWith("http") ? raw : `${API_ORIGIN}${raw}`;
};

const genDriverId = () =>
  `DRV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
    100 + Math.random() * 900
  )}`;

export default function DriversPage() {
  const [drivers, setDrivers] = useState([]);


  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [previewUrl, setPreviewUrl] = useState("");
  const [photoFile, setPhotoFile] = useState(null);

  const [form, setForm] = useState({
    driverId: genDriverId(),
    fullName: "",
    licenseNumber: "",
    countryCode: "+977",
    phoneNumber: "",
    email: "",
    address: "",
    status: "Active",
    password: "",
    confirmPassword: "",
  });

  const loadDrivers = async () => {
    const all = await getUsers();
    const onlyDrivers = (Array.isArray(all) ? all : []).filter(
      (u) => String(u.role || u.Role || "").toLowerCase() === "driver"
    );
    setDrivers(onlyDrivers);
  };

  useEffect(() => {
    (async () => {
      try {
        await loadDrivers();
      } catch (e) {
        console.error("Failed to load drivers", e);
      }
    })();
  }, []);

  const resetForm = () => {
    setForm({
      driverId: genDriverId(),
      fullName: "",
      licenseNumber: "",
      countryCode: "+977",
      phoneNumber: "",
      email: "",
      address: "",
      status: "Active",
      password: "",
      confirmPassword: "",
    });

    setPreviewUrl((old) => {
      if (old?.startsWith("blob:")) URL.revokeObjectURL(old);
      return "";
    });

    setPhotoFile(null);
    setEditingId(null);
  };

  const openAdd = () => {
    resetForm();
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    resetForm();
  };

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreviewUrl((old) => {
      if (old?.startsWith("blob:")) URL.revokeObjectURL(old);
      return old;
    });

    setPhotoFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const deletePhotoLocal = () => {
    setPreviewUrl((old) => {
      if (old?.startsWith("blob:")) URL.revokeObjectURL(old);
      return "";
    });
    setPhotoFile(null);
  };

  const onChange = (key) => (e) => {
    let val = e.target.value;

    if (key === "licenseNumber") val = val.replace(/\D/g, "").slice(0, 6);
    if (key === "phoneNumber") val = val.replace(/\D/g, "").slice(0, 10);

    setForm((p) => ({ ...p, [key]: val }));
  };

  const isValid = useMemo(() => {
    const emailOk =
      form.email.trim().length === 0 ||
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());

    // create: password required
    // edit: password optional (only if filled + match + >=6)
    const passwordOk = editingId
      ? (form.password.trim().length === 0 &&
          form.confirmPassword.trim().length === 0) ||
        (form.password.length >= 6 && form.password === form.confirmPassword)
      : form.password.length >= 6 && form.password === form.confirmPassword;

    return (
      form.driverId.trim().length >= 5 &&
      form.fullName.trim().length >= 2 &&
      form.licenseNumber.length === 6 &&
      form.phoneNumber.length === 10 &&
      emailOk &&
      form.address.trim().length >= 3 &&
      passwordOk
    );
  }, [form, editingId]);

  const onSave = async (e) => {
    e.preventDefault();
    if (!isValid) return;

    try {
      const payload = {
        userId: form.driverId.trim(),
        fullName: form.fullName.trim(),
        email: form.email?.trim() ? form.email.trim() : null,
        countryCode: form.countryCode,
        phoneNumber: form.phoneNumber,
        address: form.address.trim(),
        role: "Driver",
        status: form.status,
        licenseNumber: form.licenseNumber,
        
        password: form.password.trim().length ? form.password : null,
        photoUrl: null,
      };

      let saved = editingId
        ? await updateUser(editingId, payload)
        : await createUser(payload);

      const savedId = saved.userId || saved.UserId || form.driverId;

      
      if (photoFile) {
        const up = await uploadUserPhoto(savedId, photoFile);
        const newUrl = up.photoUrl || up.PhotoUrl;
        saved = { ...saved, photoUrl: newUrl, PhotoUrl: newUrl };
      }

      await loadDrivers();
      closeModal();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || err.message || "Save failed");
    }
  };

  const onEdit = (d) => {
    const id = d.userId || d.UserId;
    setEditingId(id);

    setForm({
      driverId: id,
      fullName: d.fullName || d.FullName || "",
      licenseNumber: d.licenseNumber || d.LicenseNumber || "",
      countryCode: d.countryCode || d.CountryCode || "+977",
      phoneNumber: d.phoneNumber || d.PhoneNumber || "",
      email: d.email || d.Email || "",
      address: d.address || d.Address || "",
      status: d.status || d.Status || "Active",
      password: "",
      confirmPassword: "",
    });

    setPreviewUrl(toFullPhotoUrl(d.photoUrl || d.PhotoUrl || ""));
    setPhotoFile(null);
    setOpen(true);
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this driver?")) return;
    try {
      await deleteUser(id);
      await loadDrivers();
    } catch (err) {
      console.error(err);
      alert(err.message || "Delete failed");
    }
  };

  const onToggleStatus = async (d) => {
    const id = d.userId || d.UserId;
    const current = String(d.status || d.Status || "Active").toLowerCase();
    const nextStatus = current === "active" ? "Inactive" : "Active";

    try {
      const payload = {
        userId: id,
        fullName: d.fullName || d.FullName || "",
        email: d.email || d.Email || null,
        countryCode: d.countryCode || d.CountryCode || "+977",
        phoneNumber: d.phoneNumber || d.PhoneNumber || "",
        address: d.address || d.Address || "",
        role: "Driver",
        status: nextStatus,
        licenseNumber: d.licenseNumber || d.LicenseNumber || "",
        password: null, 
        photoUrl: d.photoUrl || d.PhotoUrl || null,
      };

      await updateUser(id, payload);
      await loadDrivers();
    } catch (err) {
      console.error(err);
      alert(err.message || "Status update failed");
    }
  };

  const statusBadgeClass = (s) =>
    String(s || "").toLowerCase().trim() === "active"
      ? "badge badge-ok"
      : "badge badge-off";

  return (
    <div className="adm-page">
      <div className="adm-card glass">
      
        <div className="adm-head">
          <div>
            <h2 className="adm-title">Driver Management</h2>
          </div>

          <button className="adm-addBtn" onClick={openAdd} type="button">
            + Add Driver
          </button>
        </div>

        
        {open && (
          <div className="adm-inlineForm glass">
            <div className="adm-inlineTop">
              <h3 className="adm-inlineTitle">
                {editingId ? "Edit Driver" : "Add Driver"}
              </h3>

              <button type="button" className="adm-closeBtn" onClick={closeModal}>
                Close
              </button>
            </div>

            <form className="dm-layout" onSubmit={onSave}>
              {/* LEFT PHOTO */}
              <div className="dm-photo">
                <div className="dm-photoFrame">
                  {previewUrl ? (
                    <img className="dm-photoImg" src={previewUrl} alt="Driver" />
                  ) : (
                    <div className="dm-photoEmpty">No Photo</div>
                  )}
                </div>

                <div className="dm-photoBtns">
                  <label className="dm-btn dm-btnPhoto">
                    Add Photo
                    <input type="file" accept="image/*" hidden onChange={handlePhoto} />
                  </label>

                  <button
                    type="button"
                    className="dm-btn dm-btnGhost"
                    onClick={deletePhotoLocal}
                    disabled={!previewUrl}
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* RIGHT FORM */}
              <div className="dm-form">
                <div className="dm-field">
                  <label>Driver ID</label>
                  <input value={form.driverId} disabled />
                </div>

                <div className="dm-field">
                  <label>Driver Name</label>
                  <input
                    value={form.fullName}
                    onChange={onChange("fullName")}
                    placeholder="Full Name"
                  />
                </div>

                <div className="dm-field">
                  <label>License Number</label>
                  <input
                    value={form.licenseNumber}
                    onChange={onChange("licenseNumber")}
                    placeholder="******"
                    maxLength={6}
                    inputMode="numeric"
                  />
                </div>

                <div className="phone-email-row">
                  <div className="dm-field">
                    <label>Phone Number</label>
                    <div className="phone-row">
                      <select
                        className="phone-code"
                        value={form.countryCode}
                        onChange={(e) => setForm((p) => ({ ...p, countryCode: e.target.value }))}
                      >
                        <option value="+977">🇳🇵 +977</option>
                        <option value="+91">🇮🇳 +91</option>
                        <option value="+1">🇺🇸 +1</option>
                      </select>

                      <input
                        className="phone-input"
                        value={form.phoneNumber}
                        onChange={onChange("phoneNumber")}
                        placeholder="**********"
                        inputMode="numeric"
                      />
                    </div>
                  </div>

                  <div className="dm-field">
                    <label>Email</label>
                    <input
                      value={form.email}
                      onChange={onChange("email")}
                      placeholder="email@gmail.com"
                    />
                  </div>
                </div>

                <div className="dm-field">
                  <label>Address</label>
                  <input
                    value={form.address}
                    onChange={onChange("address")}
                    placeholder="Address"
                  />
                </div>

                <div className="dm-field">
                  <label>Status</label>
                  <select value={form.status} onChange={onChange("status")}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="phone-email-row">
                  <div className="dm-field">
                    <label>Password</label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={onChange("password")}
                      placeholder={editingId ? "Leave blank to keep unchanged" : "Password"}
                    />
                  </div>

                  <div className="dm-field">
                    <label>Confirm Password</label>
                    <input
                      type="password"
                      value={form.confirmPassword}
                      onChange={onChange("confirmPassword")}
                      placeholder="Confirm Password"
                    />
                  </div>
                </div>

                <div className="dm-actions">
                  <button type="button" className="dm-btn dm-btnGhost" onClick={closeModal}>
                    Cancel
                  </button>

                  <button type="submit" className="dm-btn dm-btnSave" disabled={!isValid}>
                    SAVE
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* TABLE BOTTOM (NO LICENSE + NO PHONE) */}
        <div className="adm-tableWrap">
          <div className="adm-tableTitle">Registered Drivers</div>

          <table className="adm-table">
            <thead>
              <tr>
                <th>Driver ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Address</th>
                <th>Status</th>
                <th style={{ width: 260 }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {drivers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="adm-empty">
                    No drivers yet. Click “+ Add Driver”.
                  </td>
                </tr>
              ) : (
                drivers.map((d) => {
                  const id = d.userId || d.UserId;
                  const status = d.status || d.Status || "Active";
                  const isActive = String(status).toLowerCase() === "active";

                  return (
                    <tr key={id}>
                      <td className="mono">{id}</td>
                      <td>{d.fullName || d.FullName}</td>
                      <td>{d.email || d.Email || "-"}</td>
                      <td className="adm-addr">{d.address || d.Address}</td>

                      <td>
                        <span className={statusBadgeClass(status)}>{status}</span>
                      </td>

                      <td className="adm-actions-cell">
                        <button
                          className="adm-act adm-edit"
                          title="Edit Driver"
                          onClick={() => onEdit(d)}
                          type="button"
                        >
                          <FiEdit2 size={16} />
                        </button>

                        <button
                          className="adm-act adm-del"
                          title="Delete Driver"
                          onClick={() => onDelete(id)}
                          type="button"
                        >
                          <FiTrash2 size={16} />
                        </button>

                        <button
                          type="button"
                          className={`adm-act ${isActive ? "adm-deactivate" : "adm-activate"}`}
                          title={isActive ? "Deactivate" : "Activate"}
                          onClick={() => onToggleStatus(d)}
                          style={{ padding: "6px 10px", borderRadius: 10 }}
                        >
                          {isActive ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}