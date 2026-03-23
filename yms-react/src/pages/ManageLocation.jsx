// src/pages/ManageLocation.jsx
import { useEffect, useMemo, useState } from "react";
import "../styles/dashboard.css";
import {
  FiEdit2,
  FiTrash2,
  FiSearch,
  FiPlus,
  FiRefreshCw,
  FiFileText,
} from "react-icons/fi";

import { getFacilities } from "../services/facilityService";
import {
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation,
} from "../services/locationService";

const PAGE_SIZE = 6;

const genLocationCode = (name = "") => {
  const clean = (name || "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .map((w) => w[0])
    .join("");

  const suffix = Math.floor(100 + Math.random() * 900);
  return `${clean || "LC"}${suffix}`;
};

export default function ManageLocation() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [facilityFilter, setFacilityFilter] = useState("all");

  const [facilities, setFacilities] = useState([]);

  const [total, setTotal] = useState(0);
  const [shown, setShown] = useState(0);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    facilityId: "",
    locationName: "",
    locationType: "GATE",
    locationCode: "",
    capacity: "",
    sortOrder: 1,
  });

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const allLoaded = shown >= total;

  // -------------------------
  // Load facilities
  // -------------------------
  useEffect(() => {
    (async () => {
      try {
        const res = await getFacilities({ search: "", skip: 0, take: 200 });
        const list = res?.items || [];
        setFacilities(list);

        // set default facilityId once
        if (list.length > 0) {
          setForm((p) => ({ ...p, facilityId: p.facilityId || list[0].id }));
        }
      } catch (e) {
        setErr(e?.message || String(e));
      }
    })();
  }, []);

  // -------------------------
  // Fetch locations (paged)
  // -------------------------
  const fetchPage = async ({ reset } = { reset: true }) => {
    setLoading(true);
    setErr("");

    try {
      const skip = reset ? 0 : rows.length;
      const take = PAGE_SIZE;

      const data = await getLocations({
        search: q,
        facilityId: facilityFilter === "all" ? "" : facilityFilter,
        skip,
        take,
      });
      const items = data?.items || [];

      if (reset) {
        setRows(items);
        setVisibleCount(PAGE_SIZE);
      } else {
        setRows((prev) => [...prev, ...items]);
        setVisibleCount((prev) => prev + PAGE_SIZE);
      }

      setTotal(data?.total ?? 0);
      setShown(data?.shown ?? Math.min(skip + items.length, data?.total ?? 0));
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.title ||
        e?.message ||
        String(e);
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPage({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, facilityFilter]);

  // -------------------------
  // Helpers
  // -------------------------
  const resetForm = () => {
    setEditingId(null);
    setForm({
      facilityId: facilities[0]?.id || "",
      locationName: "",
      locationType: "GATE",
      locationCode: "",
      capacity: "",
      sortOrder: 1,
    });
  };

  const openAdd = () => {
    resetForm();
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    resetForm();
  };

  const onEdit = (r) => {
    setEditingId(r.id);
    setForm({
      facilityId: r.facilityId,
      locationName: r.locationName || "",
      locationType: String(r.locationType || "GATE").toUpperCase(),
      locationCode: r.locationCode || "",
      capacity: r.capacity ?? "",
      sortOrder: r.sortOrder ?? 1,
    });
    setOpen(true);
  };

  const onSave = async (e) => {
    e.preventDefault();
    setErr("");

    const payload = {
      facilityId: form.facilityId,
      locationName: (form.locationName || "").trim(),
      locationType: String(form.locationType || "GATE").trim().toUpperCase(),
      locationCode: String(form.locationCode || "").trim().toUpperCase(),
      capacity: form.capacity === "" ? null : Number(form.capacity),
      sortOrder: Number(form.sortOrder || 1),
    };

    if (!payload.facilityId) {
      setErr("Facility is required.");
      return;
    }
    if (!payload.locationName) {
      setErr("Location name is required.");
      return;
    }
    if (!payload.locationCode) {
      setErr("Location code is required.");
      return;
    }

    setLoading(true);
    try {
      if (editingId) await updateLocation(editingId, payload);
      else await createLocation(payload);

      closeModal();
      await fetchPage({ reset: true });
    } catch (e2) {
      const msg =
        e2?.response?.data?.message ||
        e2?.response?.data?.title ||
        e2?.message ||
        String(e2);
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    if (!deleteTarget?.id) return;
    setErr("");
    setLoading(true);

    try {
      await deleteLocation(deleteTarget.id);
      await fetchPage({ reset: true });
      setDeleteTarget(null);
    } catch (e) {
      const msg =
        e?.response?.data?.message || e?.response?.data?.title || e?.message || String(e);
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  const requestDelete = (row) => {
    setDeleteTarget({
      id: row?.id,
      title: row?.locationName || "Location",
      subtitle: row?.facilityName || "Facility",
    });
  };

  const closeDeleteConfirm = () => {
    if (loading) return;
    setDeleteTarget(null);
  };

  const onRefresh = () => fetchPage({ reset: true });

  const onExportCsv = () => {
    const header = [
      "Facility",
      "Location",
      "Location Type",
      "Location Code",
      "Capacity",
      "Sort Order",
    ];

    const lines = [
      header.join(","),
      ...rows.map((r) =>
        [
          r.facilityName,
          r.locationName,
          r.locationType,
          r.locationCode,
          r.capacity,
          r.sortOrder,
        ]
          .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
          .join(",")
      ),
    ];

    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `locations_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onLoadMore = () => {
    if (!loading && !allLoaded) fetchPage({ reset: false });
  };

  const visibleRows = useMemo(
    () => rows.slice(0, visibleCount),
    [rows, visibleCount]
  );

  return (
    <div className="adm-page">
      <div className="adm-card glass">
        <div className="adm-head">
          <h2 className="adm-title">Manage Location</h2>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              className="adm-act"
              title="Refresh"
              type="button"
              onClick={onRefresh}
            >
              <FiRefreshCw />
            </button>

            <button
              className="adm-act"
              title="Export CSV"
              type="button"
              onClick={onExportCsv}
            >
              <FiFileText />
            </button>

            <button
              className="adm-addBtn"
              onClick={openAdd}
              type="button"
              disabled={!facilities.length}
            >
              <FiPlus /> Add Location
            </button>
          </div>
        </div>

        <div className="adm-filters">
          <div className="adm-search">
            <FiSearch />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search facility, location, code..."
            />
          </div>
          <select value={facilityFilter} onChange={(e) => setFacilityFilter(e.target.value)}>
            <option value="all">All Facilities</option>
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.facilityName}
              </option>
            ))}
          </select>
        </div>

        {err && <div className="adm-error">{err}</div>}

        <div className="adm-tableWrap">
          <div className="adm-tableTitleRow">
            <div className="adm-tableTitle">Location List</div>
            <div className="adm-totalPill">Total: {total}</div>
          </div>

          <table className="adm-table">
            <thead>
              <tr>
                <th>Facility</th>
                <th>Location</th>
                <th>Location Type</th>
                <th>Location Code</th>
                <th style={{ width: 120 }}>Capacity</th>
                <th style={{ width: 120 }}>Sort Order</th>
                <th style={{ width: 140 }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {total === 0 && !loading ? (
                <tr>
                  <td colSpan="7" className="adm-empty">
                    No locations found.
                  </td>
                </tr>
              ) : (
                visibleRows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.facilityName}</td>
                    <td>{r.locationName}</td>
                    <td className="mono">
                      {String(r.locationType || "").toUpperCase()}
                    </td>
                    <td className="mono">{r.locationCode}</td>
                    <td className="mono">{r.capacity ?? "-"}</td>
                    <td className="mono">{r.sortOrder}</td>
                    <td className="adm-actions-cell">
                      <button
                        className="adm-act adm-edit"
                        title="Edit"
                        type="button"
                        onClick={() => onEdit(r)}
                      >
                        <FiEdit2 size={16} />
                      </button>
                      <button
                        className="adm-act adm-del"
                        title="Delete"
                        type="button"
                        onClick={() => requestDelete(r)}
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="adm-footerRow">
            <div className="adm-showingText">
              Showing <strong>{shown}</strong> of{" "}
              <strong>{total}</strong>
            </div>

            <div className="adm-footerRight">
              {total > 0 && !allLoaded && (
                <button
                  type="button"
                  className="adm-loadMoreBtn"
                  onClick={onLoadMore}
                  disabled={loading}
                >
                  {loading ? "Loading..." : "Load more"}
                </button>
              )}
              {total > 0 && allLoaded && (
                <span className="adm-allLoaded">All loaded</span>
              )}
            </div>
          </div>
        </div>

        {/* MODAL */}
        {open && (
          <div className="adm-modalOverlay" onClick={closeModal}>
            <div className="adm-modal glass" onClick={(e) => e.stopPropagation()}>
              <div className="adm-modalTop">
                <h3 className="adm-modalTitle">
                  {editingId ? "Edit Location" : "Add Location"}
                </h3>
              </div>

              <form className="ym-modalBody location-modal-body" onSubmit={onSave}>
                <div className="ym-form">
                  <div className="ym-field">
                    <label>Facility</label>
                    <select
                      value={form.facilityId}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, facilityId: e.target.value }))
                      }
                    >
                      {facilities.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.facilityName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="ym-field">
                    <label>Location</label>
                    <input
                      className="location-equal-field"
                      value={form.locationName}
                      onChange={(e) => {
                        const v = e.target.value;
                        setForm((p) => ({
                          ...p,
                          locationName: v,
                          locationCode: p.locationCode || genLocationCode(v),
                        }));
                      }}
                      placeholder="e.g. Gate A"
                    />
                  </div>

                  <div className="ym-field">
                    <label>Location Type</label>
                    <select
                      value={form.locationType}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, locationType: e.target.value }))
                      }
                    >
                      <option value="GATE">Gate</option>
                      <option value="DOCK">Dock</option>
                      <option value="PARKING">Parking</option>
                    </select>
                  </div>

                  <div className="ym-field">
                    <label>Location Code</label>
                    <input
                      className="location-equal-field"
                      value={form.locationCode}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          locationCode: e.target.value.toUpperCase(),
                        }))
                      }
                      placeholder="e.g. YA123"
                    />
                  </div>

                  <div className="ym-field">
                    <label>Capacity (optional)</label>
                    <input
                      className="location-equal-field"
                      type="number"
                      min="0"
                      value={form.capacity}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, capacity: e.target.value }))
                      }
                      placeholder="e.g. 25"
                    />
                  </div>

                  <div className="ym-field">
                    <label>Sort Order</label>
                    <input
                      className="location-equal-field"
                      type="number"
                      min="1"
                      value={form.sortOrder}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, sortOrder: e.target.value }))
                      }
                    />
                  </div>

                  <div className="ym-actions">
                    <button
                      type="button"
                      className="dm-btn dm-btnGhost"
                      onClick={closeModal}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="dm-btn dm-btnSave"
                      disabled={loading}
                    >
                      {loading ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {!!deleteTarget && (
          <div className="ga-confirmOverlay" onClick={closeDeleteConfirm}>
            <div className="ga-confirmModal" onClick={(e) => e.stopPropagation()}>
              <div className="ga-confirmHead">
                <h3>Delete Location?</h3>
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
