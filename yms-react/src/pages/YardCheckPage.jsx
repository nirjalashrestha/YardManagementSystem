import { useEffect, useMemo, useState } from "react";
import "../styles/dashboard.css";
import { FiEdit2, FiTrash2, FiSearch, FiPlus, FiRefreshCw, FiEye } from "react-icons/fi";

import { getFacilities } from "../services/facilityService";
import { getLocations } from "../services/locationService";
import { getVehicles } from "../services/vehicleService";
import { getArrivals } from "../services/gateactivityService";
import { getMyProfile } from "../services/settingsService";

import { getYardChecks, createYardCheck, updateYardCheck, deleteYardCheck } from "../services/yardCheckService";

const PAGE_SIZE = 6;
const STATUS_OPTIONS = [
  { value: "Pending", label: "Pending" },
  { value: "In Progress", label: "In Progress" },
  { value: "Completed", label: "Passed" },
  { value: "Cancelled", label: "Failed" },
];

const today = () => new Date().toISOString().slice(0, 10);
const nowTime = () => new Date().toTimeString().slice(0, 5);
const getCreatedByLabel = (value) => {
  const v = String(value || "").trim();
  return v || "-";
};
const statusClass = (status) => {
  const s = String(status || "").trim().toUpperCase().replace(/\s+/g, "_");
  if (s === "PENDING") return "ym-pill--pending";
  if (s === "IN_PROGRESS") return "ym-pill--progress";
  if (s === "COMPLETED" || s === "PASSED") return "ym-pill--completed";
  if (s === "CANCELLED" || s === "FAILED") return "ym-pill--cancelled";
  return "ym-pill--pending";
};
const statusLabel = (status) => {
  const s = String(status || "").trim().toUpperCase();
  if (s === "COMPLETED") return "PASSED";
  if (s === "CANCELLED") return "FAILED";
  return s.replace(/\s+/g, "_");
};
const toDisplayDateTime = (date, time) => {
  const d = String(date || "").trim();
  const t = String(time || "").trim();
  if (!d && !t) return "-";
  if (!d) return t;
  if (!t) return d;

  const m = t.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return `${d} ${t}`.trim();

  let hh = Number(m[1]);
  const mm = m[2];
  const ampm = hh >= 12 ? "PM" : "AM";
  hh = hh % 12;
  if (hh === 0) hh = 12;
  return `${d} ${hh}:${mm} ${ampm}`;
};

export default function ManageYardCheck() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [facilityFilter, setFacilityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");


  const [vehicles, setVehicles] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [locations, setLocations] = useState([]);

  // paging
  const [total, setTotal] = useState(0);
  const [shown, setShown] = useState(0);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // modal
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [mode, setMode] = useState("add"); 

  // ui
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [form, setForm] = useState({
    date: today(),
    time: nowTime(),
    trailerNumber: "",
    facilityId: "",
    locationId: "",
    createdBy: "",
    status: "Pending",
  });

  const isView = mode === "view";
  const allLoaded = shown >= total;

  const fallbackActorLabel = useMemo(() => {
    const fullName = String(localStorage.getItem("fullName") || "").trim();
    const role = String(localStorage.getItem("role") || "").trim();
    if (fullName && role) return `${fullName} (${role})`;
    if (fullName) return fullName;
    if (role) return role;
    return "system";
  }, []);
  const [actorLabel, setActorLabel] = useState(fallbackActorLabel);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const me = await getMyProfile();
        if (!active) return;
        const fullName = String(me?.fullName || "").trim();
        const role = String(me?.role || localStorage.getItem("role") || "").trim();
        const label = fullName && role ? `${fullName} (${role})` : (fullName || role || "system");
        setActorLabel(label);
      } catch {
        // keep fallback actor label from localStorage
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setForm((p) => {
      const current = String(p.createdBy || "").trim().toLowerCase();
      if (editingId) return p;
      if (!current || current === "system" || current === String(fallbackActorLabel).trim().toLowerCase()) {
        return { ...p, createdBy: actorLabel };
      }
      return p;
    });
  }, [actorLabel, editingId, fallbackActorLabel]);

  useEffect(() => {
    (async () => {
      try {
        setErr("");

        const [fRes, vRes] = await Promise.all([
          getFacilities({ search: "", skip: 0, take: 200 }),
          getVehicles({ search: "", skip: 0, take: 200 }),
        ]);

        const fList = fRes?.items || [];
        const vList = Array.isArray(vRes) ? vRes : (vRes?.items || []);

        setFacilities(fList);
        setVehicles(vList);

        const defaultFacilityId = fList[0]?.id || "";
        let locList = [];
        if (defaultFacilityId) {
          const locRes = await getLocations({ facilityId: defaultFacilityId, search: "", skip: 0, take: 200 });
          locList = locRes.items || [];
          setLocations(locList);
        } else {
          setLocations([]);
        }

        setForm((p) => ({
          ...p,
          facilityId: p.facilityId || defaultFacilityId,
          locationId: p.locationId || (locList[0]?.id || ""),
          createdBy: p.createdBy || actorLabel,
        }));
      } catch (e) {
        setErr(e?.message || String(e));
      }
    })();
  }, []);

  const loadLocationsForFacility = async (facilityId) => {
    try {
      if (!facilityId) {
        setLocations([]);
        return [];
      }
      const locRes = await getLocations({ facilityId, search: "", skip: 0, take: 200 });
      const fid = String(facilityId || "");
      const list = (locRes.items || []).filter((l) => !fid || String(l.facilityId || "") === fid);
      setLocations(list);
      return list;
    } catch (e) {
      setErr(e?.message || String(e));
      setLocations([]);
      return [];
    }
  };

  const resolveLocationFromTrailer = async (facilityId, trailerNumber, availableLocations = locations) => {
    try {
      const fid = String(facilityId || "");
      const trailer = String(trailerNumber || "").trim().toUpperCase();
      if (!fid || !trailer) return "";

      const arrRes = await getArrivals({ search: trailer, skip: 0, take: 200 });
      const arr = (arrRes?.items || []).find((a) => {
        const aFid = String(a?.facilityId || a?.FacilityId || "");
        const aTrailer = String(a?.trailerNumber || a?.TrailerNumber || "").trim().toUpperCase();
        return aFid === fid && aTrailer === trailer;
      });

      const locId = String(arr?.locationId || arr?.LocationId || "");
      if (!locId) return "";
      const exists = (availableLocations || []).some((l) => String(l?.id || "") === locId);
      return exists ? locId : "";
    } catch (e) {
      setErr(e?.message || String(e));
      return "";
    }
  };

 
  useEffect(() => {
    (async () => {
      if (!form.facilityId) {
        setLocations([]);
        setForm((p) => ({ ...p, locationId: "" }));
        return;
      }
      const locList = await loadLocationsForFacility(form.facilityId);
      const trackedLocationId = await resolveLocationFromTrailer(form.facilityId, form.trailerNumber, locList);
      setForm((p) => ({
        ...p,
        locationId: trackedLocationId || "",
      }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.facilityId, form.trailerNumber]);

 
  const fetchPage = async ({ reset } = { reset: true }) => {
    setLoading(true);
    setErr("");

    try {
      const skip = reset ? 0 : rows.length;
      const take = PAGE_SIZE;

      const data = await getYardChecks({ search: q, status: statusFilter, skip, take });
      const items = data.items || [];

      if (reset) {
        setRows(items);
        setVisibleCount(PAGE_SIZE);
      } else {
        setRows((prev) => [...prev, ...items]);
        setVisibleCount((prev) => prev + PAGE_SIZE);
      }

      setTotal(data.total ?? 0);
      setShown(data.shown ?? Math.min(skip + items.length, data.total ?? 0));
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPage({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, statusFilter]);

  const onRefresh = () => fetchPage({ reset: true });
  const onLoadMore = () => { if (!loading && !allLoaded) fetchPage({ reset: false }); };
  const filteredRows = useMemo(() => {
    if (facilityFilter === "all") return rows;
    return rows.filter((r) => String(r?.facilityId || "") === String(facilityFilter));
  }, [rows, facilityFilter]);
  const visibleRows = useMemo(() => filteredRows.slice(0, visibleCount), [filteredRows, visibleCount]);


  const resetForm = async () => {
    const defaultFacilityId = facilities[0]?.id || "";
    await (defaultFacilityId ? loadLocationsForFacility(defaultFacilityId) : Promise.resolve([]));

    setEditingId(null);
    setMode("add");
    setForm({
      date: today(),
      time: nowTime(),
      trailerNumber: "",
      facilityId: defaultFacilityId,
      locationId: "",
      createdBy: actorLabel,
      status: "Pending",
    });
  };

  const openAdd = async () => { await resetForm(); setOpen(true); };
  const closeModal = () => { setOpen(false); setEditingId(null); setMode("add"); };

  const openView = async (r) => {
    setEditingId(r.id);
    setMode("view");
    setOpen(true);

    const locList = await loadLocationsForFacility(r.facilityId);
    const firstLoc = locList[0]?.id || "";

    setForm({
      date: r.date,
      time: r.time,
      trailerNumber: r.trailerNumber || "",
      facilityId: r.facilityId,
      locationId: r.locationId || firstLoc,
      createdBy: String(r.createdBy || "").trim(),
      status: r.status || "Pending",
    });
  };

  const openEdit = async (r) => {
    setEditingId(r.id);
    setMode("edit");
    setOpen(true);

    const locList = await loadLocationsForFacility(r.facilityId);
    const firstLoc = locList[0]?.id || "";

    setForm({
      date: r.date,
      time: r.time,
      trailerNumber: r.trailerNumber || "",
      facilityId: r.facilityId,
      locationId: r.locationId || firstLoc,
      createdBy: String(r.createdBy || "").trim(),
      status: r.status || "Pending",
    });
  };


  const isValid = useMemo(() => {
    return (
      !!form.date &&
      !!form.time &&
      !!form.trailerNumber &&
      !!form.facilityId &&
      !!form.locationId &&
      !!form.status
    );
  }, [form]);

  const onSave = async (e) => {
    e.preventDefault();
    if (isView) return;
    if (!isValid) return;

    setLoading(true);
    setErr("");

    try {
      const payload = {
        date: form.date,
        time: form.time,
        trailerNumber: (form.trailerNumber || "").trim().toUpperCase().replace(/\s+/g, ""),
        facilityId: form.facilityId,
        locationId: form.locationId,
        createdBy: editingId ? String(form.createdBy || "").trim() : (form.createdBy || actorLabel),
        status: form.status,
      };

      if (editingId) await updateYardCheck(editingId, payload);
      else await createYardCheck(payload);

      closeModal();
      await fetchPage({ reset: true });
    } catch (e2) {
      setErr(e2?.message || String(e2));
    } finally {
      setLoading(false);
    }
  };

 
  const onDelete = async () => {
    if (!deleteTarget?.id) return;
    setLoading(true);
    setErr("");

    try {
      await deleteYardCheck(deleteTarget.id);
      await fetchPage({ reset: true });
      setDeleteTarget(null);
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const requestDelete = (row) => {
    setDeleteTarget({
      id: row?.id,
      trailerNumber: row?.trailerNumber || "",
      status: row?.status || "",
    });
  };

  const closeDeleteConfirm = () => {
    if (loading) return;
    setDeleteTarget(null);
  };

  return (
    <div className="adm-page">
      <div className="adm-card glass">
        <div className="adm-head">
          <h2 className="adm-title">Yard Check Management</h2>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button className="adm-act" title="Refresh" type="button" onClick={onRefresh}>
              <FiRefreshCw />
            </button>
            <button className="adm-addBtn" onClick={openAdd} type="button">
              <FiPlus /> Add Yard Check
            </button>
          </div>
        </div>

        <div className="adm-filters">
          <div className="adm-search">
            <FiSearch />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search trailer, facility, location..."
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

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {err && <div className="adm-error">{err}</div>}

        <div className="adm-tableWrap">
          <div className="adm-tableTitleRow">
            <div className="adm-tableTitle">Yard Check List</div>
            <div className="adm-totalPill">Total: {filteredRows.length}</div>
          </div>

          <table className="adm-table">
            <thead>
              <tr>
                <th>DateTime</th>
                <th>Trailer Number</th>
                <th>Facility</th>
                <th>Location</th>
                <th>Created By</th>
                <th>Status</th>
               
                <th style={{ width: 160 }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredRows.length === 0 && !loading ? (
                <tr>
                  <td colSpan="7" className="adm-empty">
                    No yard checks found.
                  </td>
                </tr>
              ) : (
                visibleRows.map((r) => (
                  <tr key={r.id}>
                    <td className="mono">{toDisplayDateTime(r.date, r.time)}</td>
                    <td className="mono">{r.trailerNumber}</td>
                    <td>{r.facilityName}</td>
                    <td>{r.locationName || "-"}</td>
                    <td>{getCreatedByLabel(r.createdBy)}</td>
                    <td>
                      <span className={`ym-pill ${statusClass(r.status)}`}>{statusLabel(r.status)}</span>
                    </td>

                    <td className="adm-actions-cell">
                      <button className="adm-act adm-view" title="View" type="button" onClick={() => openView(r)}>
                        <FiEye size={16} />
                      </button>
                      <button className="adm-act adm-edit" title="Edit" type="button" onClick={() => openEdit(r)}>
                        <FiEdit2 size={16} />
                      </button>
                      <button className="adm-act adm-del" title="Delete" type="button" onClick={() => requestDelete(r)}>
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
              Showing <strong>{Math.min(visibleCount, filteredRows.length)}</strong> of <strong>{filteredRows.length}</strong>
            </div>

            <div className="adm-footerRight">
              {filteredRows.length > PAGE_SIZE && visibleCount < filteredRows.length && (
                <button type="button" className="adm-loadMoreBtn" onClick={onLoadMore} disabled={loading}>
                  {loading ? "Loading..." : "Load more"}
                </button>
              )}
              {filteredRows.length > 0 && visibleCount >= filteredRows.length && <span className="adm-allLoaded">All loaded</span>}
            </div>
          </div>
        </div>

        {/* Modal */}
        {open && (
          <div className="ym-modalOverlay" onClick={closeModal}>
            <div className="ym-modal glass" onClick={(e) => e.stopPropagation()}>
              <div className="ym-modalTop">
                <h3 className="ym-modalTitle">
                  {mode === "view" ? "View Yard Check" : mode === "edit" ? "Edit Yard Check" : "Add Yard Check"}
                </h3>
              </div>

              <form className="ym-modalBody" onSubmit={onSave}>
                <div className="ym-form">
                  <div className="ym-field">
                    <label>Date</label>
                    <input type="date" value={form.date} disabled={isView}
                      onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
                  </div>

                  <div className="ym-field">
                    <label>Time</label>
                    <input type="time" value={form.time} disabled={isView}
                      onChange={(e) => setForm((p) => ({ ...p, time: e.target.value }))} />
                  </div>

                  <div className="ym-field">
                    <label>Trailer Number</label>
                    <input
                      value={form.trailerNumber}
                      disabled={isView}
                      onChange={(e) => setForm((p) => ({ ...p, trailerNumber: String(e.target.value || "").toUpperCase() }))}
                      placeholder="TRL-0001"
                    />
                  </div>

                  <div className="ym-field">
                    <label>Facility</label>
                    <select value={form.facilityId} disabled={isView}
                      onChange={(e) => {
                        const facilityId = e.target.value;
                        setForm((p) => ({ ...p, facilityId, locationId: "" }));
                      }}>
                      <option value="">Select</option>
                      {facilities.map((f) => (
                        <option key={f.id} value={f.id}>{f.facilityName}</option>
                      ))}
                    </select>
                  </div>

                  <div className="ym-field">
                    <label>Location</label>
                    <select value={form.locationId} disabled={true}
                      onChange={(e) => setForm((p) => ({ ...p, locationId: e.target.value }))}>
                      <option value="">Select</option>
                      {locations.map((l) => (
                        <option key={l.id} value={l.id}>{l.locationName}</option>
                      ))}
                    </select>
                  </div>

                  <div className="ym-field">
                    <label>Created By</label>
                    <input value={form.createdBy || "-"} readOnly />
                  </div>

                  <div className="ym-field">
                    <label>Status</label>
                    <select value={form.status} disabled={isView}
                      onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="ym-actions">
                    <button type="button" className="dm-btn dm-btnGhost" onClick={closeModal}>
                      {isView ? "Close" : "Cancel"}
                    </button>

                    {!isView && (
                      <button type="submit" className="dm-btn dm-btnSave" disabled={loading || !isValid}>
                        SAVE
                      </button>
                    )}
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
                <h3>Delete Yard Check?</h3>
              </div>
              <div className="ga-confirmBody">
                <p>This action cannot be undone.</p>
                <div className="ga-confirmMeta">
                  <span>{deleteTarget.trailerNumber || "No Trailer"}</span>
                  <span>{statusLabel(deleteTarget.status) || "Unknown Status"}</span>
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
