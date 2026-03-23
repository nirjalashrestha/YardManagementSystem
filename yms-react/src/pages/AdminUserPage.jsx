import { useEffect, useMemo, useState } from "react";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  uploadUserPhoto,
  deleteUserPhoto,
} from "../services/userService";
import "../styles/dashboard.css";
import { FiEdit2, FiTrash2, FiEye, FiSearch } from "react-icons/fi";

const API_ORIGIN = "https://localhost:7096";
const PAGE_SIZE = 6;

const toFullPhotoUrl = (raw) => {
  if (!raw) return "";
  return raw.startsWith("http") ? raw : `${API_ORIGIN}${raw}`;
};

const genId = (role) => {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rnd = Math.floor(100 + Math.random() * 900);
  const prefix = role === "Driver" ? "DRV" : "USR";
  return `${prefix}-${d}-${rnd}`;
};

const ROLES = [
  "Admin",
  "Yard Manager",
  "Yard Jockey",
  "Gate Security",
  "Driver",
  "View Only",
];
const STATUSES = ["Active", "Inactive"];

export default function AdminUserPage() {
  const [users, setUsers] = useState([]);
  const [loadError, setLoadError] = useState("");

  // viewer role
  const myRole = (localStorage.getItem("role") || "").toLowerCase();
  const isAdminViewer = myRole === "admin";

  // modal
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null); // internal GUID
  const [mode, setMode] = useState("add"); // "add" | "edit" | "view"
  const [deleteTarget, setDeleteTarget] = useState(null);

  // photo
  const [previewUrl, setPreviewUrl] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [removePhoto, setRemovePhoto] = useState(false);

  // filters
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // pagination
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // form
  const [form, setForm] = useState({
    role: "Driver",
    userId: genId("Driver"),
    fullName: "",
    email: "",
    countryCode: "+977",
    phoneNumber: "",
    address: "",
    status: "Active",
    licenseNumber: "",
    password: "",
    confirmPassword: "",
  });

  const toUserList = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  };

  const resetForm = (role = "Driver") => {
    setMode("add");
    setForm({
      role,
      userId: genId(role),
      fullName: "",
      email: "",
      countryCode: "+977",
      phoneNumber: "",
      address: "",
      status: "Active",
      licenseNumber: "",
      password: "",
      confirmPassword: "",
    });

    setPreviewUrl((old) => {
      if (old?.startsWith("blob:")) URL.revokeObjectURL(old);
      return "";
    });
    setPhotoFile(null);
    setRemovePhoto(false);
    setEditingId(null);
  };

  useEffect(() => {
    (async () => {
      try {
        const data = await getUsers();
        setUsers(toUserList(data));
        setLoadError("");
      } catch (e) {
        console.error("Failed to load users", e);
        setUsers([]);
        setLoadError(
          e?.response?.data?.message ||
            e?.response?.data ||
            e?.message ||
            "Failed to load users."
        );
      }
    })();
  }, []);

  const openAdd = () => {
    resetForm("Driver");
    setMode("add");
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    resetForm("Driver");
  };

  const onChange = (key) => (e) => {
    let val = e.target.value;

    if (key === "phoneNumber") val = val.replace(/\D/g, "").slice(0, 10);
    if (key === "licenseNumber") val = val.replace(/\D/g, "").slice(0, 6);

    setForm((p) => ({ ...p, [key]: val }));
  };

  const onRoleChange = (e) => {
    const role = e.target.value;
    setForm((p) => ({
      ...p,
      role,
      userId: genId(role),
      licenseNumber: role === "Driver" ? p.licenseNumber : "",
    }));
  };

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreviewUrl((old) => {
      if (old?.startsWith("blob:")) URL.revokeObjectURL(old);
      return "";
    });

    setPhotoFile(file);
    setRemovePhoto(false);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const deletePhotoLocal = () => {
    setPreviewUrl((old) => {
      if (old?.startsWith("blob:")) URL.revokeObjectURL(old);
      return "";
    });
    setPhotoFile(null);

    if (editingId) setRemovePhoto(true);
  };

  const isValid = useMemo(() => {
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
    const phoneOk = form.phoneNumber.length === 10;

    const driverOk =
      form.role !== "Driver" ||
      (form.licenseNumber && form.licenseNumber.length === 6);

    const passOk =
      editingId
        ? true
        : form.password.length >= 6 && form.password === form.confirmPassword;

    return (
      form.fullName.trim().length >= 2 &&
      emailOk &&
      phoneOk &&
      form.address.trim().length >= 3 &&
      driverOk &&
      passOk
    );
  }, [form, editingId]);

  const onSave = async (e) => {
    e.preventDefault();
    if (mode === "view") return;
    if (!isValid) return;

    try {
      const payload = {
        userId: form.userId.trim(),
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        countryCode: "+977",
        phoneNumber: form.phoneNumber.trim(),
        address: form.address.trim(),
        role: form.role,
        status: form.status,
        licenseNumber:
          form.role === "Driver" ? form.licenseNumber.trim() : null,
        password: editingId ? null : form.password,
      };

      let saved = editingId
        ? await updateUser(editingId, payload)
        : await createUser(payload);

      const publicId = saved.userId || saved.UserId || form.userId;

      if (editingId && removePhoto) {
        await deleteUserPhoto(publicId);
        saved = { ...saved, photoUrl: null, PhotoUrl: null };
      }

      if (photoFile) {
        const r = await uploadUserPhoto(publicId, photoFile);
        const newUrl = r.photoUrl || r.PhotoUrl || null;
        saved = { ...saved, photoUrl: newUrl, PhotoUrl: newUrl };
      }

      const data = await getUsers();
      setUsers(toUserList(data));
      setLoadError("");

      setRemovePhoto(false);
      closeModal();
    } catch (err) {
      console.error("SAVE ERROR:", err?.response?.data || err);
      alert(
        typeof err?.response?.data === "string"
          ? err.response.data
          : JSON.stringify(err?.response?.data, null, 2) || err.message
      );
    }
  };

  const fillFormFromUser = (u) => {
    const internalId = u.id || u.Id;
    const publicId = u.userId || u.UserId;

    setEditingId(internalId);
    setRemovePhoto(false);

    const role = u.role || u.Role || "View Only";
    setForm({
      role,
      userId: publicId,
      fullName: u.fullName || u.FullName || "",
      email: u.email || u.Email || "",
      countryCode: "+977",
      phoneNumber: u.phoneNumber || u.PhoneNumber || "",
      address: u.address || u.Address || "",
      status: u.status || u.Status || "Active",
      licenseNumber: u.licenseNumber || u.LicenseNumber || "",
      password: "",
      confirmPassword: "",
    });

    setPreviewUrl(
      toFullPhotoUrl(
        u.profileImageUrl ||
          u.ProfileImageUrl ||
          u.photoUrl ||
          u.PhotoUrl ||
          ""
      )
    );
    setPhotoFile(null);
  };

  const onEdit = (u) => {
    fillFormFromUser(u);
    setMode("edit");
    setOpen(true);
  };

  const onView = (u) => {
    fillFormFromUser(u);
    setMode("view");
    setOpen(true);
  };

  const closeDeleteConfirm = () => setDeleteTarget(null);

  const requestDelete = (u) => {
    const internalId = u?.id || u?.Id || null;
    if (!internalId) return;
    setDeleteTarget({
      id: internalId,
      fullName: u?.fullName || u?.FullName || "",
      email: u?.email || u?.Email || "",
    });
  };

  const onDelete = async () => {
    if (!deleteTarget?.id) return;
    try {
      await deleteUser(deleteTarget.id);
      const data = await getUsers();
      setUsers(toUserList(data));
      setLoadError("");
      closeDeleteConfirm();
    } catch (err) {
      console.error(err);
      alert(
        err?.response?.data?.message ||
          err?.response?.data ||
          err.message ||
          "Delete failed"
      );
    }
  };

  const isView = mode === "view";

  const filteredUsers = useMemo(() => {
    const text = q.trim().toLowerCase();

    return (users || []).filter((u) => {
      const name = (u.fullName || u.FullName || "").toLowerCase();
      const email = (u.email || u.Email || "").toLowerCase();
      const phone = (u.phoneNumber || u.PhoneNumber || "").toLowerCase();
      const role = (u.role || u.Role || "").toLowerCase().trim();
      const status = (u.status || u.Status || "").toLowerCase().trim();

      const matchText =
        !text ||
        name.includes(text) ||
        email.includes(text) ||
        phone.includes(text);

      const matchRole = roleFilter === "all" || role === roleFilter;
      const matchStatus = statusFilter === "all" || status === statusFilter;

      return matchText && matchRole && matchStatus;
    });
  }, [users, q, roleFilter, statusFilter]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [q, roleFilter, statusFilter]);

  const totalUsers = filteredUsers.length;
  const pagedUsers = filteredUsers.slice(0, visibleCount);
  const canLoadMore = visibleCount < totalUsers;
  const loadMore = () => setVisibleCount((c) => c + PAGE_SIZE);

  return (
    <div className="adm-page">
      <div className="adm-card glass">
        {/* HEADER */}
        <div className="adm-head">
          <div>
            <h2 className="adm-title">User Management</h2>
          </div>

          <button className="adm-addBtn" onClick={openAdd}>
            + Add User
          </button>
        </div>

        {/* MODAL */}
        {open && (
          <div className="adm-modalOverlay" onClick={closeModal}>
            <div className="adm-modal glass" onClick={(e) => e.stopPropagation()}>
              <div className="adm-modalTop">
                <h3 className="adm-modalTitle">
                  {mode === "view"
                    ? "View User"
                    : editingId
                    ? "Edit User"
                    : "Add New User"}
                </h3>
              </div>

              <form className="dm-layout dm-layout-modal" onSubmit={onSave}>
                {/* LEFT PHOTO */}
                <div className="dm-photo">
                  <div className="dm-photoFrame">
                    {previewUrl ? (
                      <img className="dm-photoImg" src={previewUrl} alt="User" />
                    ) : (
                      <div className="dm-photoEmpty">No Photo</div>
                    )}
                  </div>

                  {!isView && (
                    <div className="dm-photoBtns">
                      <label className="dm-btn dm-btnPhoto">
                        Add Photo
                        <input
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={handlePhoto}
                        />
                      </label>

                      <button
                        type="button"
                        className="dm-btn dm-btnGhost"
                        onClick={deletePhotoLocal}
                        disabled={!previewUrl && !photoFile}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                {/* RIGHT FORM */}
                <div className="dm-form">
                  {isAdminViewer && (
                    <div className="dm-field">
                      <label>Role</label>
                      <select
                        value={form.role}
                        onChange={onRoleChange}
                        disabled={isView}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="dm-field">
                    <label>
                      {form.role === "Driver" ? "Driver ID" : "User ID"}
                    </label>
                    <input value={form.userId} disabled />
                  </div>

                  <div className="dm-field">
                    <label>Full Name</label>
                    <input
                      value={form.fullName}
                      onChange={onChange("fullName")}
                      placeholder="Full Name"
                      disabled={isView}
                    />
                  </div>

                  <div className="dm-field">
                    <label>Email</label>
                    <input
                      value={form.email}
                      onChange={onChange("email")}
                      placeholder="email@gmail.com"
                      disabled={isView}
                    />
                  </div>

                  <div className="dm-field">
                    <label>Phone Number</label>
                    <div className="phone-one">
                      <span className="phone-prefix">+977</span>
                      <input
                        className="phone-one-input"
                        value={form.phoneNumber}
                        onChange={onChange("phoneNumber")}
                        placeholder="**********"
                        inputMode="numeric"
                        disabled={isView}
                      />
                    </div>
                  </div>

                  <div className="dm-field">
                    <label>Address</label>
                    <input
                      value={form.address}
                      onChange={onChange("address")}
                      placeholder="Address"
                      disabled={isView}
                    />
                  </div>

                  {form.role === "Driver" && (
                    <div className="dm-field">
                      <label>License Number</label>
                      <input
                        value={form.licenseNumber}
                        onChange={onChange("licenseNumber")}
                        placeholder="******"
                        maxLength={6}
                        inputMode="numeric"
                        disabled={isView}
                      />
                    </div>
                  )}

                  <div className="dm-field">
                    <label>Status</label>
                    <select
                      value={form.status}
                      onChange={onChange("status")}
                      disabled={isView}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  {mode === "add" && (
                    <>
                      <div className="dm-field">
                        <label>Password</label>
                        <input
                          type="password"
                          value={form.password}
                          onChange={onChange("password")}
                          placeholder="Password"
                        />
                      </div>

                      <div className="dm-field">
                        <label>Confirm Password</label>
                        <input
                          type="password"
                          value={form.confirmPassword}
                          onChange={onChange("confirmPassword")}
                          placeholder="Confirm password"
                        />
                      </div>
                    </>
                  )}

                  <div className="dm-actions">
                    <button
                      type="button"
                      className="dm-btn dm-btnGhost"
                      onClick={closeModal}
                    >
                      {isView ? "Close" : "Cancel"}
                    </button>

                    {!isView && (
                      <button
                        type="submit"
                        className="dm-btn dm-btnSave"
                        disabled={!isValid}
                      >
                        SAVE
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* FILTER BAR */}
        <div className="adm-filters">
          <div className="adm-search">
            <FiSearch className="adm-searchIcon" aria-hidden="true" />
            <input
              className="adm-searchInput"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, email..."
            />
          </div>

          <div className="adm-filterRight">
            <select
              className="adm-filterSelect"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">All Roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r.toLowerCase()}>
                  {r}
                </option>
              ))}
            </select>

            <select
              className="adm-filterSelect"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              {STATUSES.map((s) => (
                <option key={s} value={s.toLowerCase()}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loadError && <div className="adm-error">{String(loadError)}</div>}

        {/* TABLE */}
        <div className="adm-tableWrap">
          <div className="adm-tableTitleRow">
            <div className="adm-tableTitle">Registered Users</div>
            <div className="adm-tableMeta">
              Total Users:{" "}
              <span className="adm-tableMetaNum">{totalUsers}</span>
            </div>
          </div>

          <table className="adm-table">
            <thead>
              <tr>
                
                <th>Name</th>
                <th>Email</th>
               

                {isAdminViewer && <th>Role</th>}

                <th>Status</th>
                <th style={{ width: 170 }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {pagedUsers.length === 0 ? (
                <tr>
                  <td colSpan={isAdminViewer ? 5 : 4} className="adm-empty">
                    No users found.
                  </td>
                </tr>
              ) : (
                pagedUsers.map((u) => {
                  const internalId = u.id || u.Id;
                  const role = u.role || u.Role || "-";
                  const status = u.status || u.Status || "Active";
                  const photo = toFullPhotoUrl(
                    u.profileImageUrl ||
                      u.ProfileImageUrl ||
                      u.photoUrl ||
                      u.PhotoUrl ||
                      ""
                  );

                  return (
                    <tr key={internalId}>
                      
                      <td>{u.fullName || u.FullName}</td>
                      <td>{u.email || u.Email}</td>
                    

                      {isAdminViewer && (
                        <td>
                          <span className={`badge ${roleToColor(role)}`}>
                            {role}
                          </span>
                        </td>
                      )}

                      <td>
                        <span className={`badge ${statusToColor(status)}`}>
                          {status}
                        </span>
                      </td>

                      <td className="adm-actions-cell">
                        <button
                          className="adm-act adm-view"
                          title="View"
                          onClick={() => onView(u)}
                        >
                          <FiEye size={16} />
                        </button>

                        <button
                          className="adm-act adm-edit"
                          title="Edit"
                          onClick={() => onEdit(u)}
                        >
                          <FiEdit2 size={16} />
                        </button>

                        <button
                          className="adm-act adm-del"
                          title="Delete"
                          onClick={() => requestDelete(u)}
                          type="button"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* LOAD MORE */}
          {totalUsers > 0 && (
            <div className="adm-loadMoreRow">
              <div className="adm-loadMoreInfo">
                Showing{" "}
                <span className="adm-tableMetaNum">
                  {Math.min(visibleCount, totalUsers)}
                </span>{" "}
                of <span className="adm-tableMetaNum">{totalUsers}</span>
              </div>

              {canLoadMore ? (
                <button className="adm-loadMoreBtn" onClick={loadMore}>
                  Load More
                </button>
              ) : (
                <div className="adm-loadMoreEnd">All users loaded</div>
              )}
            </div>
          )}
        </div>
      </div>

      {deleteTarget && (
        <div className="ga-confirmOverlay" onClick={closeDeleteConfirm}>
          <div
            className="ga-confirmModal"
            role="dialog"
            aria-modal="true"
            aria-label="Delete user confirmation"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ga-confirmHead">
              <h3>Delete user</h3>
            </div>
            <div className="ga-confirmBody">
              <p>Are you sure you want to delete this user?</p>
              <div className="ga-confirmMeta">
                <strong>{deleteTarget.fullName || "User"}</strong>
                <span>{deleteTarget.email || "No email"}</span>
              </div>
            </div>
            <div className="ga-confirmActions">
              <button
                type="button"
                className="ga-confirmBtn ga-confirmBtn--ghost"
                onClick={closeDeleteConfirm}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ga-confirmBtn ga-confirmBtn--danger"
                onClick={onDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function statusToColor(s = "") {
  const v = (s || "").toLowerCase();
  if (v.includes("active")) return "green";
  return "red";
}

function roleToColor(r = "") {
  const v = (r || "").toLowerCase();
  if (v.includes("admin")) return "red";
  if (v.includes("yard manager")) return "pink";
  if (v.includes("yard jockey")) return "orange";
  if (v.includes("yard")) return "blue";
  if (v.includes("dispatch")) return "yellow";
  if (v.includes("security")) return "blue";
  if (v.includes("driver")) return "green";
  return "gray";
}
