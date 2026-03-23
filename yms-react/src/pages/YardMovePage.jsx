import { useEffect, useMemo, useState } from "react";
import "../styles/dashboard.css";
import { FiEdit2, FiTrash2, FiSearch, FiPlus, FiRefreshCw } from "react-icons/fi";
import { getFacilities } from "../services/facilityService";
import { getLocations } from "../services/locationService";
import { getArrivals } from "../services/gateactivityService";
import { getYardMoves, createYardMove, updateYardMove, deleteYardMove } from "../services/yardMoveService";

const PAGE_SIZE = 6;
const STATUS_OPTIONS = ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

const toDateInput = (dt) => {
  if (!dt) return "";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const toTimeInput = (dt) => {
  if (!dt) return "";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const combineDateTime = (date, time) => {
  if (!date || !time) return null;
  return new Date(`${date}T${time}:00`).toISOString();
};

const toDisplayDateTime = (dt) => {
  if (!dt) return "-";
  const raw = String(dt).trim();
  const hasZone = /(?:Z|[+\-]\d{2}:\d{2})$/i.test(raw);
  const d = new Date(hasZone ? raw : `${raw}Z`);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-NP", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const readFromLocationName = (row) =>
  row?.fromLocationName ||
  row?.fromlocationName ||
  row?.fromLocation ||
  row?.from_location_name ||
  "";

const pick = (obj, keys, fallback = "") => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null) return v;
  }
  return fallback;
};

const statusClass = (status) => {
  const s = String(status || "").toUpperCase();
  if (s === "PENDING") return "ym-pill--pending";
  if (s === "IN_PROGRESS") return "ym-pill--progress";
  if (s === "COMPLETED") return "ym-pill--completed";
  if (s === "CANCELLED") return "ym-pill--cancelled";
  return "ym-pill--pending";
};

const getActorLabel = () => {
  const fullName = String(localStorage.getItem("fullName") || "").trim();
  const role = String(localStorage.getItem("role") || "").trim();
  if (fullName && role) return `${fullName} (${role})`;
  if (fullName) return fullName;
  if (role) return role;
  return "";
};

const getCreatedByLabel = (value, actorLabel) => {
  const v = String(value || "").trim();
  if (!v || v.toLowerCase() === "system") return actorLabel || "system";
  return v;
};

function YardMoveModal({
  open,
  editingId,
  facilities,
  locations,
  form,
  setForm,
  onFacilityChange,
  loading,
  onClose,
  onSave,
}) {
  if (!open) return null;
  return (
    <div className="ym-modalOverlay" onClick={onClose}>
      <div className="ym-modal glass" onClick={(e) => e.stopPropagation()}>
        <div className="ym-modalTop">
          <h3 className="ym-modalTitle">{editingId ? "Edit Yard Move" : "Add Yard Move"}</h3>
        </div>
        <form className="ym-modalBody" onSubmit={onSave}>
          <div className="ym-form">
            <div className="ym-field">
              <label>Date</label>
              <input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
            </div>
            <div className="ym-field">
              <label>Time</label>
              <input type="time" value={form.time} readOnly />
            </div>
            <div className="ym-field">
              <label>Trailer Number</label>
              <input value={form.trailerNumber} onChange={(e) => setForm((p) => ({ ...p, trailerNumber: e.target.value.toUpperCase() }))} placeholder="TRL-0001" />
            </div>
            <div className="ym-field">
              <label>Facility</label>
              <select
                value={form.facilityId}
                onChange={(e) => {
                  const nextFacilityId = e.target.value;
                  setForm((p) => ({ ...p, facilityId: nextFacilityId }));
                  onFacilityChange?.(nextFacilityId, form.trailerNumber);
                }}
              >
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>{f.facilityName}</option>
                ))}
              </select>
            </div>
            <div className="ym-field">
              <label>From Location</label>
              <select value={form.fromLocationId} onChange={(e) => setForm((p) => ({ ...p, fromLocationId: e.target.value }))}>
                <option value="">Select From Location</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.locationName}</option>
                ))}
              </select>
            </div>
            <div className="ym-field">
              <label>To Location</label>
              <select value={form.toLocationId} onChange={(e) => setForm((p) => ({ ...p, toLocationId: e.target.value }))}>
                <option value="">Select To Location</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.locationName}</option>
                ))}
              </select>
            </div>
            <div className="ym-field">
              <label>Created By</label>
              <input value={form.createdBy || "Auto from login"} readOnly />
            </div>
            <div className="ym-field">
              <label>Status</label>
              <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="ym-actions">
              <button type="button" className="dm-btn dm-btnGhost" onClick={onClose}>Cancel</button>
              <button type="submit" className="dm-btn dm-btnSave" disabled={loading}>{loading ? "Saving..." : "SAVE"}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function YardMovePage() {
  const actorLabel = useMemo(() => getActorLabel(), []);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [facilityFilter, setFacilityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [total, setTotal] = useState(0);
  const [shown, setShown] = useState(0);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [facilities, setFacilities] = useState([]);
  const [locations, setLocations] = useState([]);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    date: "",
    time: "",
    trailerNumber: "",
    facilityId: "",
    fromLocationId: "",
    toLocationId: "",
    createdBy: "",
    status: "PENDING",
  });

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const allLoaded = shown >= total;
  const visibleRows = useMemo(() => rows.slice(0, visibleCount), [rows, visibleCount]);

  const loadFacilityRefs = async (facilityId) => {
    if (!facilityId) {
      setLocations([]);
      return { locations: [] };
    }
    const lRes = await getLocations({ facilityId, search: "", skip: 0, take: 200 });
    const l = lRes?.items || [];
    setLocations(l);
      setForm((p) => ({
        ...p,
        toLocationId: l.find((x) => x.id === p.toLocationId) ? p.toLocationId : "",
        fromLocationId: l.find((x) => x.id === p.fromLocationId) ? p.fromLocationId : "",
        createdBy: p.createdBy || actorLabel,
      }));
    return { locations: l };
  };

  const handleFacilityChange = async (facilityId, trailerNo) => {
    await loadFacilityRefs(facilityId);
    if (!open || editingId) return;
    const t = String(trailerNo || "").trim();
    if (!t) return;
    await resolveFromLocationFromLatestArrival(facilityId, t);
  };

  const resolveFromLocationFromLatestArrival = async (facilityId, trailerNo) => {
    const trailer = String(trailerNo || "").trim().toUpperCase();
    if (!facilityId || !trailer) return "";

    try {
      const res = await getArrivals({ search: trailer, skip: 0, take: 200 });
      const arrivals = res?.items || [];

      const match = arrivals.find((a) => {
        const aFacilityId = String(pick(a, ["facilityId", "FacilityId"], ""));
        const aTrailer = String(pick(a, ["trailerNumber", "TrailerNumber"], "")).trim().toUpperCase();
        return aFacilityId === String(facilityId) && aTrailer === trailer;
      });

      const matchedLocationId = String(pick(match, ["locationId", "LocationId"], "") || "");
      if (!matchedLocationId) return "";
      const existsInFacility = locations.some((l) => String(l.id) === matchedLocationId);
      if (!existsInFacility) return "";

      setForm((p) => {
        const toSameAsFrom = String(p.toLocationId || "") === matchedLocationId;
        const fallbackTo = locations.find((l) => String(l.id) !== matchedLocationId)?.id || "";
        return {
          ...p,
          fromLocationId: matchedLocationId,
          toLocationId: toSameAsFrom ? fallbackTo : p.toLocationId,
        };
      });
      return matchedLocationId;
    } catch {
      // Keep form usable even if auto-resolve fails.
      return "";
    }
  };

  const fetchRows = async ({ reset } = { reset: true }) => {
    setLoading(true);
    setErr("");
    try {
      const skip = reset ? 0 : rows.length;
      const data = await getYardMoves({
        search,
        facilityId: facilityFilter,
        status: statusFilter,
        skip,
        take: PAGE_SIZE,
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
      setErr(e?.response?.data?.message || e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const fRes = await getFacilities({ search: "", skip: 0, take: 200 });
        const fList = fRes?.items || [];
        setFacilities(fList);
        const firstFacilityId = fList[0]?.id || "";
        if (firstFacilityId) {
          setFacilityFilter(firstFacilityId);
          setForm((p) => ({ ...p, facilityId: firstFacilityId }));
        }
      } catch (e) {
        setErr(e?.message || String(e));
      }
    })();
  }, []);

  useEffect(() => {
    if (form.facilityId) loadFacilityRefs(form.facilityId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.facilityId]);

  useEffect(() => {
    if (!open || editingId) return;
    if (!form.facilityId || !form.trailerNumber || locations.length === 0) return;

    const t = setTimeout(() => {
      resolveFromLocationFromLatestArrival(form.facilityId, form.trailerNumber);
    }, 350);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingId, form.facilityId, form.trailerNumber, locations]);

  useEffect(() => {
    fetchRows({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, facilityFilter, statusFilter]);

  const openAdd = async () => {
    const facilityId = facilityFilter || facilities[0]?.id || "";
    const refs = facilityId ? await loadFacilityRefs(facilityId) : { locations: [] };
    const now = new Date();
    setEditingId(null);
    setForm({
      date: now.toISOString().slice(0, 10),
      time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
      trailerNumber: "",
      facilityId,
      fromLocationId: "",
      toLocationId: "",
      createdBy: actorLabel,
      status: "PENDING",
    });
    setOpen(true);
  };

  const openEdit = async (r) => {
    const refs = r.facilityId ? await loadFacilityRefs(r.facilityId) : { locations: [] };
    setEditingId(r.id);
    setForm({
      date: toDateInput(r.moveDateTime),
      time: toTimeInput(r.moveDateTime),
      trailerNumber: r.trailerNumber || "",
      facilityId: r.facilityId || facilityFilter,
      fromLocationId: r.fromLocationId || "",
      toLocationId: r.toLocationId || refs.locations[0]?.id || "",
      createdBy: getCreatedByLabel(r.createdBy, actorLabel),
      status: (r.status || "PENDING").toUpperCase(),
    });
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setEditingId(null);
  };

  const onSave = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      let resolvedFromLocationId = form.fromLocationId || "";
      if (!resolvedFromLocationId) {
        resolvedFromLocationId = await resolveFromLocationFromLatestArrival(form.facilityId, form.trailerNumber);
      }

      const moveDateTime = combineDateTime(form.date, form.time);
      if (!moveDateTime) throw new Error("Date and time are required.");
      if (!form.trailerNumber.trim()) throw new Error("Trailer number is required.");
      if (!form.facilityId) throw new Error("Facility is required.");
      if (!form.toLocationId) throw new Error("To location is required.");

      const payload = {
        trailerNumber: form.trailerNumber.trim().toUpperCase(),
        facilityId: form.facilityId,
        fromLocationId: resolvedFromLocationId || null,
        toLocationId: form.toLocationId,
        moveDateTime,
        status: form.status,
      };

      if (editingId) await updateYardMove(editingId, payload);
      else await createYardMove(payload);

      closeModal();
      await fetchRows({ reset: true });
    } catch (e2) {
      setErr(e2?.response?.data?.message || e2?.message || String(e2));
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    if (!deleteTarget?.id) return;
    setLoading(true);
    setErr("");
    try {
      await deleteYardMove(deleteTarget.id);
      await fetchRows({ reset: true });
      setDeleteTarget(null);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || String(e));
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
          <h2 className="adm-title">Yard Move Management</h2>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button className="adm-act" type="button" onClick={() => fetchRows({ reset: true })}><FiRefreshCw /></button>
            <button className="adm-addBtn" onClick={openAdd} type="button"><FiPlus /> Add Yard Move</button>
          </div>
        </div>

        <div className="adm-filters">
          <div className="adm-search">
            <FiSearch />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search trailer, carrier, from/to location..." />
          </div>
          <select value={facilityFilter} onChange={(e) => setFacilityFilter(e.target.value)}>
            <option value="">All Facilities</option>
            {facilities.map((f) => <option key={f.id} value={f.id}>{f.facilityName}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {err && <div className="adm-error">{err}</div>}

        <div className="adm-tableWrap">
          <div className="adm-tableTitleRow">
            <div className="adm-tableTitle">Yard Move List</div>
            <div className="adm-totalPill">Total: {total}</div>
          </div>
          <table className="adm-table">
            <thead>
              <tr>
                <th>DateTime</th>
                <th>TrailerNo</th>
                <th>Facility</th>
                <th>FromLocation</th>
                <th>ToLocation</th>
                <th>CreatedBy</th>
                <th>Status</th>
                <th style={{ width: 140 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {total === 0 && !loading ? (
                <tr><td colSpan="8" className="adm-empty">No yard moves found.</td></tr>
              ) : (
                visibleRows.map((r) => (
                  <tr key={r.id}>
                    <td>{toDisplayDateTime(r.moveDateTime)}</td>
                    <td className="mono">{r.trailerNumber}</td>
                    <td>{r.facilityName}</td>
                    <td>{readFromLocationName(r) || "-"}</td>
                    <td>{r.toLocationName || "-"}</td>
                    <td>{getCreatedByLabel(r.createdBy, actorLabel)}</td>
                    <td><span className={`ym-pill ${statusClass(r.status)}`}>{String(r.status || "").toUpperCase()}</span></td>
                    <td className="adm-actions-cell">
                      <button className="adm-act adm-edit" type="button" onClick={() => openEdit(r)}><FiEdit2 size={16} /></button>
                      <button className="adm-act adm-del" type="button" onClick={() => requestDelete(r)}><FiTrash2 size={16} /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {total > 0 && (
            <div className="adm-footerRow">
              <div className="adm-showingText">Showing <strong>{shown}</strong> of <strong>{total}</strong></div>
              <div className="adm-footerRight">
                {!allLoaded ? (
                  <button type="button" className="adm-loadMoreBtn" onClick={() => fetchRows({ reset: false })} disabled={loading}>
                    {loading ? "Loading..." : "Load more"}
                  </button>
                ) : (
                  <span className="adm-allLoaded">All loaded</span>
                )}
              </div>
            </div>
          )}
        </div>

        <YardMoveModal
          open={open}
          editingId={editingId}
          facilities={facilities}
          locations={locations}
          form={form}
          setForm={setForm}
          onFacilityChange={handleFacilityChange}
          loading={loading}
          onClose={closeModal}
          onSave={onSave}
        />

        {!!deleteTarget && (
          <div className="ga-confirmOverlay" onClick={closeDeleteConfirm}>
            <div className="ga-confirmModal" onClick={(e) => e.stopPropagation()}>
              <div className="ga-confirmHead">
                <h3>Delete Yard Move?</h3>
              </div>
              <div className="ga-confirmBody">
                <p>This action cannot be undone.</p>
                <div className="ga-confirmMeta">
                  <span>{deleteTarget.trailerNumber || "No Trailer"}</span>
                  <span>{String(deleteTarget.status || "").toUpperCase() || "Unknown Status"}</span>
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
