import { useEffect, useMemo, useState } from "react";
import "../styles/dashboard.css";
import { FiEdit2, FiTrash2, FiSearch, FiEye, FiRefreshCw, FiFileText } from "react-icons/fi";
import { getFacilities } from "../services/facilityService";
import { getTrailerTypes } from "../services/trailerTypeService";

import {
  getVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  uploadVehiclePhoto,
  deleteVehiclePhoto,
} from "../services/vehicleService";

const API_ORIGIN = "https://localhost:7096";
const PAGE_SIZE = 6;

const toFullPhotoUrl = (raw) => {
  if (!raw) return "";
  return raw.startsWith("http") ? raw : `${API_ORIGIN}${raw}`;
};

const normTN = (tn) => (tn || "").toUpperCase().replace(/\s+/g, "").trim();

const FALLBACK_TRAILER_TYPES = [
  "Container Chassis",
  "Flatbed Trailer",
  "Reefer Trailer",
  "Dry Van Trailer",
  "Tanker Trailer",
  "Box Trailer",
];

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [trailerTypes, setTrailerTypes] = useState([]);

  // modal
  const [open, setOpen] = useState(false);
  const [editingTrailerNumber, setEditingTrailerNumber] = useState(null);
  const [mode, setMode] = useState("add"); // add | edit | view

  // photo
  const [previewUrl, setPreviewUrl] = useState("");
  const [photoFile, setPhotoFile] = useState(null);

  // filters
  const [q, setQ] = useState("");
  const [facilityFilter, setFacilityFilter] = useState("all");

  // pagination
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // ui state
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  // form
  const [form, setForm] = useState({
    facilityId: "",
    vehicleNumber: "",
    vehicleType: "Container Chassis",
    trailerNumber: "",
    status: "ACTIVE",
    driverRefId: "",
    carrierName: "",
    notes: "",
  });

  const cleanupPreview = () => {
    setPreviewUrl((old) => {
      if (old?.startsWith("blob:")) URL.revokeObjectURL(old);
      return "";
    });
  };

  const resetForm = () => {
    setMode("add");
    setForm({
      facilityId: facilities[0]?.id || "",
      vehicleNumber: "",
      vehicleType: "Container Chassis",
      trailerNumber: "",
      status: "ACTIVE",
      driverRefId: "",
      carrierName: "",
      notes: "",
    });

    cleanupPreview();
    setPhotoFile(null);
    setEditingTrailerNumber(null);
  };

  const fetchVehicles = async () => {
    setLoading(true);
    setErr("");
    try {
      const data = await getVehicles();
      setVehicles(Array.isArray(data) ? data : []);
      setVisibleCount(PAGE_SIZE);
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await getFacilities({ search: "", skip: 0, take: 200 });
        const list = res.items || [];
        setFacilities(list);
        if (list.length > 0) {
          setForm((p) => ({ ...p, facilityId: p.facilityId || list[0].id }));
        }
      } catch (e) {
        setErr(e?.message || String(e));
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!form.facilityId) {
        setTrailerTypes([]);
        return;
      }
      try {
        const res = await getTrailerTypes({ facilityId: form.facilityId, search: "", skip: 0, take: 200 });
        const list = res.items || [];
        setTrailerTypes(list);
        if (list.length && !list.find((t) => t.trailerTypeName === form.vehicleType)) {
          setForm((p) => ({ ...p, vehicleType: list[0].trailerTypeName }));
        }
      } catch (e) {
        setTrailerTypes([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.facilityId]);

  const openAdd = () => {
    resetForm();
    setMode("add");
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    resetForm();
  };

  const onChange = (key) => (e) => {
    let val = e.target.value;

    if (key === "trailerNumber") val = val.toUpperCase().replace(/\s+/g, "");
    if (key === "vehicleNumber") val = val.toUpperCase().replace(/\s+/g, "");

    setForm((p) => ({ ...p, [key]: val }));
  };

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    cleanupPreview();
    setPhotoFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const deletePhotoLocal = () => {
    cleanupPreview();
    setPhotoFile(null);
  };

  const deletePhotoBackend = async () => {
    if (!editingTrailerNumber) return;
    try {
      await deleteVehiclePhoto(editingTrailerNumber);

      cleanupPreview();
      setPhotoFile(null);

      setVehicles((prev) =>
        prev.map((v) =>
          normTN(v.trailerNumber) === normTN(editingTrailerNumber)
            ? { ...v, photoUrl: null }
            : v
        )
      );
    } catch (e) {
      setErr(e?.response?.data?.message || e?.response?.data || e?.message || "Failed to delete photo");
    }
  };

  const isValid = useMemo(() => {
    return (
      form.facilityId &&
      form.vehicleType.trim().length >= 3 &&
      form.trailerNumber.trim().length >= 3
    );
  }, [form]);

  const onSave = async (e) => {
    e.preventDefault();
    if (mode === "view") return;
    if (!isValid) return;

    setLoading(true);
    setErr("");

    try {
      const payload = {
        facilityId: form.facilityId,
        vehicleNumber: form.vehicleNumber.trim() || null,
        vehicleType: form.vehicleType.trim(),
        trailerNumber: normTN(form.trailerNumber),
        status: form.status,
        driverRefId: form.driverRefId.trim() || null,
        carrierName: form.carrierName.trim() || null,
        notes: form.notes.trim() || null,
      };

      let saved;

      if (mode === "edit" && editingTrailerNumber) {
        saved = await updateVehicle(editingTrailerNumber, payload);
      } else {
        saved = await createVehicle(payload);
      }

      const savedTN = normTN(saved.trailerNumber || payload.trailerNumber);

      if (photoFile) {
        const up = await uploadVehiclePhoto(savedTN, photoFile);
        saved = { ...saved, photoUrl: up.photoUrl };
      }

      setVehicles((prev) => {
        const without = prev.filter((v) => normTN(v.trailerNumber) !== savedTN);
        return [saved, ...without];
      });

      closeModal();
    } catch (err) {
      setErr(
        err?.response?.data?.message ||
          err?.response?.data ||
          err.message ||
          "Save failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const fillFormFromVehicle = (v) => {
    const tn = normTN(v.trailerNumber || "");
    setEditingTrailerNumber(tn);

    setForm({
      facilityId: v.facilityId || facilities[0]?.id || "",
      vehicleNumber: v.vehicleNumber || "",
      vehicleType: v.vehicleType || "Container Chassis",
      trailerNumber: v.trailerNumber || "",
      status: (v.status || "ACTIVE").toUpperCase(),
      driverRefId: v.driverRefId || "",
      carrierName: v.carrierName || "",
      notes: v.notes || "",
    });

    cleanupPreview();
    setPreviewUrl(toFullPhotoUrl(v.photoUrl || ""));
    setPhotoFile(null);
  };

  const onEdit = (v) => {
    fillFormFromVehicle(v);
    setMode("edit");
    setOpen(true);
  };

  const onView = (v) => {
    fillFormFromVehicle(v);
    setMode("view");
    setOpen(true);
  };

  const onDelete = async () => {
    if (!deleteTarget?.kind) return;
    setLoading(true);
    setErr("");

    try {
      if (deleteTarget.kind === "vehicle") {
        await deleteVehicle(deleteTarget.value);
        setVehicles((prev) =>
          prev.filter((v) => normTN(v.trailerNumber) !== normTN(deleteTarget.value))
        );
      } else if (deleteTarget.kind === "photo") {
        await deletePhotoBackend();
      }
      setDeleteTarget(null);
    } catch (err) {
      setErr(err?.response?.data?.message || err?.message || "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  const requestDeleteVehicle = (vehicle) => {
    setDeleteTarget({
      kind: "vehicle",
      value: vehicle?.trailerNumber,
      title: vehicle?.trailerNumber || "Vehicle",
      subtitle: vehicle?.facilityName || vehicle?.facility?.facilityName || "Facility",
    });
  };

  const requestDeletePhoto = () => {
    if (!editingTrailerNumber) return;
    setDeleteTarget({
      kind: "photo",
      value: editingTrailerNumber,
      title: editingTrailerNumber,
      subtitle: "Vehicle photo",
    });
  };

  const closeDeleteConfirm = () => {
    if (loading) return;
    setDeleteTarget(null);
  };

  const isView = mode === "view";

  const filteredVehicles = useMemo(() => {
    const text = q.trim().toLowerCase();

    return (vehicles || []).filter((v) => {
      const type = (v.vehicleType || "").toLowerCase();
      const tn = (v.trailerNumber || "").toLowerCase();
      const vn = (v.vehicleNumber || "").toLowerCase();
      const driver = (v.driverRefId || "").toLowerCase();
      const carrier = (v.carrierName || "").toLowerCase();

      const facilityName = (v.facilityName || v.facility?.facilityName || "").toLowerCase();
      const matchText =
        !text ||
        tn.includes(text) ||
        vn.includes(text) ||
        type.includes(text) ||
        driver.includes(text) ||
        carrier.includes(text) ||
        facilityName.includes(text);

      const vehicleFacilityId = String(v.facilityId || v.facility?.id || "");
      const matchFacility =
        facilityFilter === "all" || vehicleFacilityId === String(facilityFilter);

      return matchText && matchFacility;
    });
  }, [vehicles, q, facilityFilter]);

  useEffect(() => setVisibleCount(PAGE_SIZE), [q, facilityFilter]);

  const total = filteredVehicles.length;
  const paged = filteredVehicles.slice(0, visibleCount);
  const canLoadMore = visibleCount < total;
  const shown = Math.min(visibleCount, total);

  const onExportCsv = () => {
    const header = ["Facility", "Trailer Number", "Trailer Type", "Status"];
    const lines = [
      header.join(","),
      ...filteredVehicles.map((v) =>
        [v.facilityName || v.facility?.facilityName, v.trailerNumber, v.vehicleType, v.status]
          .map((x) => `"${String(x ?? "").replace(/"/g, '""')}"`)
          .join(",")
      ),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vehicles_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="adm-page">
      <div className="adm-card glass">
        <div className="adm-head">
          <h2 className="adm-title">Vehicle Management</h2>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button className="adm-act" title="Refresh" type="button" onClick={fetchVehicles}>
              <FiRefreshCw />
            </button>
            <button className="adm-act" title="Export CSV" type="button" onClick={onExportCsv}>
              <FiFileText />
            </button>

            <button className="adm-addBtn" onClick={openAdd} type="button">
              + Add Vehicle
            </button>
          </div>
        </div>

        {err && <div className="adm-error">{err}</div>}

        {/* MODAL */}
        {open && (
          <div className="adm-modalOverlay" onClick={closeModal}>
            <div className="adm-modal glass" onClick={(e) => e.stopPropagation()}>
              <div className="adm-modalTop">
                <h3 className="adm-modalTitle">
                  {mode === "view"
                    ? "View Vehicle"
                    : mode === "edit"
                    ? "Edit Vehicle"
                    : "Add New Vehicle"}
                </h3>
              </div>

              <form className="dm-layout dm-layout-modal vm-layout-modal" onSubmit={onSave}>
                <div className="dm-photo">
                  <div className="dm-photoFrame">
                    {previewUrl ? (
                      <img className="dm-photoImg" src={previewUrl} alt="Vehicle" />
                    ) : (
                      <div className="dm-photoEmpty">No Photo</div>
                    )}
                  </div>

                  {!isView && (
                    <div className="dm-photoBtns">
                      <label className="dm-btn dm-btnPhoto">
                        Add Photo
                        <input type="file" accept="image/*" hidden onChange={handlePhoto} />
                      </label>

                      {photoFile ? (
                        <button type="button" className="dm-btn dm-btnGhost" onClick={deletePhotoLocal} disabled={!previewUrl}>
                          Remove
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="dm-btn dm-btnGhost"
                          onClick={requestDeletePhoto}
                          disabled={!previewUrl || !editingTrailerNumber}
                          title={!editingTrailerNumber ? "Save vehicle first" : "Delete saved photo"}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="dm-form">
                  <div className="dm-field">
                    <label>Facility</label>
                    <select
                      value={form.facilityId}
                      onChange={onChange("facilityId")}
                      disabled={isView}
                    >
                      {facilities.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.facilityName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="dm-field">
                    <label>Trailer Type</label>
                    <select value={form.vehicleType} onChange={onChange("vehicleType")} disabled={isView}>
                      {(trailerTypes.length ? trailerTypes.map((t) => t.trailerTypeName) : FALLBACK_TRAILER_TYPES).map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="dm-field">
                    <label>Trailer Number (Key)</label>
                    <input
                      value={form.trailerNumber}
                      onChange={onChange("trailerNumber")}
                      placeholder="TRL-0001"
                      disabled={isView || mode === "edit"}
                    />
                  </div>

                  <div className="dm-field">
                    <label>Status</label>
                    <select value={form.status} onChange={onChange("status")} disabled={isView}>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>

                  <div className="dm-field">
                    <label>Notes (optional)</label>
                    <input value={form.notes} onChange={onChange("notes")} placeholder="Notes" disabled={isView} />
                  </div>

                  <div className="dm-actions">
                    <button type="button" className="dm-btn dm-btnGhost" onClick={closeModal}>
                      {isView ? "Close" : "Cancel"}
                    </button>

                    {!isView && (
                      <button type="submit" className="dm-btn dm-btnSave" disabled={!isValid || loading}>
                        SAVE
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* FILTERS */}
        <div className="adm-filters">
          <div className="adm-search">
            <FiSearch className="adm-searchIcon" aria-hidden="true" />
            <input
              className="adm-searchInput"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search trailer number, vehicle number, driver, carrier..."
            />
          </div>

          <div className="adm-filterRight">
            <select className="adm-filterSelect" value={facilityFilter} onChange={(e) => setFacilityFilter(e.target.value)}>
              <option value="all">All Facilities</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.facilityName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* TABLE */}
        <div className="adm-tableWrap">
          <div className="adm-tableTitleRow">
            <div className="adm-tableTitle">Registered Vehicles</div>
            <div className="adm-tableMeta">
              Total: <span className="adm-tableMetaNum">{total}</span>
            </div>
          </div>

          <table className="adm-table">
            <thead>
              <tr>
                <th>Facility</th>
                <th>Trailer Number</th>
                <th>Trailer Type</th>
                <th>Status</th>
                
                <th style={{ width: 170 }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {paged.length === 0 ? (
                <tr>
                
                  <td colSpan="5" className="adm-empty">
                    No vehicles found.
                  </td>
                </tr>
              ) : (
                paged.map((v) => (
                  <tr key={v.trailerNumber}>
                    <td>{v.facilityName || v.facility?.facilityName || "-"}</td>
                    <td className="mono">{v.trailerNumber}</td>
                    <td>{v.vehicleType || "-"}</td>
                   <td>
  <span
    className={`status-badge ${
      (v.status || "ACTIVE").toUpperCase() === "ACTIVE"
        ? "status-active"
        : "status-inactive"
    }`}
  >
    {(v.status || "ACTIVE").toUpperCase()}
  </span>
</td>
                  
                    <td className="adm-actions-cell">
                      <button className="adm-act adm-view" title="View" onClick={() => onView(v)} type="button">
                        <FiEye size={16} />
                      </button>
                      <button className="adm-act adm-edit" title="Edit" onClick={() => onEdit(v)} type="button">
                        <FiEdit2 size={16} />
                      </button>
                      <button className="adm-act adm-del" title="Delete" onClick={() => requestDeleteVehicle(v)} type="button">
                        <FiTrash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {total > 0 && (
            <div className="adm-loadMoreRow">
              <div className="adm-loadMoreInfo">
                Showing <span className="adm-tableMetaNum">{shown}</span> of{" "}
                <span className="adm-tableMetaNum">{total}</span>
              </div>

              {canLoadMore ? (
                <button
                  className="adm-loadMoreBtn"
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  disabled={loading}
                >
                  {loading ? "Loading..." : "Load More"}
                </button>
              ) : (
                <div className="adm-loadMoreEnd">All loaded</div>
              )}
            </div>
          )}
        </div>

        {!!deleteTarget && (
          <div className="ga-confirmOverlay" onClick={closeDeleteConfirm}>
            <div className="ga-confirmModal" onClick={(e) => e.stopPropagation()}>
              <div className="ga-confirmHead">
                <h3>{deleteTarget.kind === "photo" ? "Delete Vehicle Photo?" : "Delete Vehicle?"}</h3>
              </div>
              <div className="ga-confirmBody">
                <p>This action cannot be undone.</p>
                <div className="ga-confirmMeta">
                  <span>{deleteTarget.title}</span>
                  <span>{deleteTarget.subtitle}</span>
                </div>
              </div>
              <div className="ga-confirmActions">
                <button type="button" className="ga-confirmBtn ga-confirmBtn--ghost" onClick={closeDeleteConfirm} disabled={loading}>
                  Cancel
                </button>
                <button type="button" className="ga-confirmBtn ga-confirmBtn--danger" onClick={onDelete} disabled={loading}>
                  {loading ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
