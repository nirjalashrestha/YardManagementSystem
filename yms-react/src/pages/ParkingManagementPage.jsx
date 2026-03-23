import { useEffect, useMemo, useState } from "react";
import "../styles/dashboard.css";
import { FiEdit2, FiTrash2, FiSearch, FiPlus, FiRefreshCw, FiFileText } from "react-icons/fi";
import { getFacilities } from "../services/facilityService";
import { getLocations } from "../services/locationService";
import { getArrivals } from "../services/gateactivityService";
import { getParkingSlots, createParkingSlot, updateParkingSlot, deleteParkingSlot } from "../services/parkingSlotService";
import { getParkingAssignments, getAvailableParkingSlots, assignParking as assignParkingApi, releaseParking as releaseParkingApi } from "../services/parkingAssignmentService";
import { getDockAssignments } from "../services/dockAssignmentService";

const PAGE_SIZE = 6;
const ARRIVAL_PAGE_SIZE = 4;
const ASSIGNMENT_PAGE_SIZE = 4;
const SLOT_TYPES = ["GENERAL", "REEFER", "HAZMAT", "OVERSIZE"];
const SLOT_STATUS = ["AVAILABLE", "OCCUPIED", "MAINTENANCE", "BLOCKED"];
const FINAL_STATUS = ["COMPLETED", "DELAYED", "DAMAGED"];
const toOptionLabel = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const isParkingLocation = (loc) => {
  const t = String(loc?.locationType || "").toUpperCase();
  if (!t) return true;
  return t.includes("PARK");
};

const pick = (obj, keys, fallback = "") => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null) return v;
  }
  return fallback;
};

const formatDuration = (startAt) => {
  if (!startAt) return "";
  const raw = String(startAt).trim();
  const hasZone = /(?:Z|[+\-]\d{2}:\d{2})$/i.test(raw);
  const start = new Date(hasZone ? raw : `${raw}Z`).getTime();
  if (Number.isNaN(start)) return "";
  const diff = Math.max(0, Date.now() - start);
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return hrs <= 0 ? `${rem}m` : `${hrs}h ${rem}m`;
};

const toDisplayDate = (dt) => {
  if (!dt) return "";
  const raw = String(dt).trim();
  const hasZone = /(?:Z|[+\-]\d{2}:\d{2})$/i.test(raw);
  const d = new Date(hasZone ? raw : `${raw}Z`);
  if (Number.isNaN(d.getTime())) return "";
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

const pillClass = (status) => {
  const s = String(status || "").toUpperCase();
  if (s === "PARKED") return "ga-pill--parked";
  if (s === "AVAILABLE" || s === "COMPLETED") return "ga-pill--ok";
  if (s === "OCCUPIED" || s === "DELAYED") return "ga-pill--warn";
  if (s === "BLOCKED" || s === "DAMAGED") return "ga-pill--bad";
  return "ga-pill--neutral";
};

const StatusPill = ({ status }) => (
  <span className={`ga-pill ${pillClass(status)}`}>{toOptionLabel(status || "UNKNOWN")}</span>
);

const displayParkingStatus = (status) => {
  const s = String(status || "").toUpperCase();
  if (s === "OCCUPIED") return "PARKED";
  return s || "UNKNOWN";
};

function SlotModal({ open, editingId, facilities, locations, form, setForm, loading, onClose, onSave }) {
  if (!open) return null;
  return (
    <div className="adm-modalOverlay" onClick={onClose}>
      <div className="adm-modal glass" onClick={(e) => e.stopPropagation()}>
        <div className="adm-modalTop"><h3 className="adm-modalTitle">{editingId ? "Edit Parking Slot" : "Add Parking Slot"}</h3></div>
        <form className="ym-modalBody parking-slot-body" onSubmit={onSave}>
          <div className="ym-form">
            <div className="ym-field"><label>Facility</label><select value={form.facilityId} onChange={(e) => setForm((p) => ({ ...p, facilityId: e.target.value }))}>{facilities.map((f) => <option key={f.id} value={f.id}>{f.facilityName}</option>)}</select></div>
            <div className="ym-field"><label>Slot Code</label><input className="parking-equal-field" value={form.slotCode} onChange={(e) => setForm((p) => ({ ...p, slotCode: e.target.value.toUpperCase() }))} placeholder="e.g. A-12" /></div>
            <div className="ym-field"><label>Location</label><select value={form.locationId} onChange={(e) => setForm((p) => ({ ...p, locationId: e.target.value }))}>{locations.map((l) => <option key={l.id} value={l.id}>{l.locationName}</option>)}</select></div>
            <div className="ym-field"><label>Slot Type</label><select value={form.slotType} onChange={(e) => setForm((p) => ({ ...p, slotType: e.target.value }))}>{SLOT_TYPES.map((s) => <option key={s} value={s}>{toOptionLabel(s)}</option>)}</select></div>
            <div className="ym-field"><label>Status</label><select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>{SLOT_STATUS.map((s) => <option key={s} value={s}>{toOptionLabel(s)}</option>)}</select></div>
            <div className="ym-field"><label>Sort Order</label><input className="parking-equal-field" type="number" min="1" value={form.sortOrder} onChange={(e) => setForm((p) => ({ ...p, sortOrder: e.target.value }))} /></div>
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

function ReleaseModal({ open, loading, form, setForm, onClose, onSave }) {
  if (!open) return null;
  return (
    <div className="adm-modalOverlay" onClick={onClose}>
      <div className="adm-modal glass" onClick={(e) => e.stopPropagation()}>
        <div className="adm-modalTop"><h3 className="adm-modalTitle">Release Parking</h3></div>
        <form className="ym-modalBody parking-release-body" onSubmit={onSave}>
          <div className="ym-form">
            <div className="ym-field"><label>Final Status</label><select value={form.finalStatus} onChange={(e) => setForm((p) => ({ ...p, finalStatus: e.target.value }))}><option value="">Select...</option>{FINAL_STATUS.map((s) => <option key={s} value={s}>{toOptionLabel(s)}</option>)}</select></div>
            <div className="ym-field"><label>Notes</label><input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Optional notes" /></div>
            <div className="ym-actions">
              <button type="button" className="dm-btn dm-btnGhost" onClick={onClose}>Cancel</button>
              <button type="submit" className="dm-btn dm-btnSave" disabled={loading}>{loading ? "Saving..." : "RELEASE"}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ParkingManagementPage() {
  const [tab, setTab] = useState("slots");
  const [facilities, setFacilities] = useState([]);
  const [locations, setLocations] = useState([]);
  const [slotRows, setSlotRows] = useState([]);
  const [slotSearch, setSlotSearch] = useState("");
  const [slotFacilityFilter, setSlotFacilityFilter] = useState("");
  const [slotStatusFilter, setSlotStatusFilter] = useState("");
  const [slotTotal, setSlotTotal] = useState(0);
  const [slotShown, setSlotShown] = useState(0);
  const [slotVisibleCount, setSlotVisibleCount] = useState(PAGE_SIZE);
  const [slotModalOpen, setSlotModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [slotForm, setSlotForm] = useState({ facilityId: "", locationId: "", slotCode: "", slotType: "GENERAL", status: "AVAILABLE", sortOrder: 1 });
  const [assignFacilityId, setAssignFacilityId] = useState("");
  const [arrivalSearch, setArrivalSearch] = useState("");
  const [arrivals, setArrivals] = useState([]);
  const [arrivalVisibleCount, setArrivalVisibleCount] = useState(ARRIVAL_PAGE_SIZE);
  const [selectedArrival, setSelectedArrival] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [releasedFinalStatusMap, setReleasedFinalStatusMap] = useState({});
  const [assignmentVisibleCount, setAssignmentVisibleCount] = useState(ASSIGNMENT_PAGE_SIZE);
  const [assignConfirmOpen, setAssignConfirmOpen] = useState(false);
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [releaseTarget, setReleaseTarget] = useState(null);
  const [releaseForm, setReleaseForm] = useState({ finalStatus: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const visibleSlotRows = useMemo(() => slotRows.slice(0, slotVisibleCount), [slotRows, slotVisibleCount]);
  const activeArrivalKeys = useMemo(() => {
    const keys = new Set();
    assignments.forEach((r) => { if (r.arrivalId) keys.add(String(r.arrivalId)); if (r.arrivalActivityId) keys.add(String(r.arrivalActivityId)); });
    return keys;
  }, [assignments]);
  const visibleArrivals = useMemo(() => arrivals.filter((a) => !activeArrivalKeys.has(String(a.id || "")) && !activeArrivalKeys.has(String(a.activityId || ""))), [arrivals, activeArrivalKeys]);
  const displayedArrivals = useMemo(() => visibleArrivals.slice(0, arrivalVisibleCount), [visibleArrivals, arrivalVisibleCount]);
  const displayedAssignments = useMemo(() => assignments.slice(0, assignmentVisibleCount), [assignments, assignmentVisibleCount]);
  const availableSlotsForSelectedArrival = useMemo(() => !selectedArrival?.locationId ? availableSlots : availableSlots.filter((s) => String(s.locationId || "") === String(selectedArrival.locationId || "")), [availableSlots, selectedArrival]);
  const getArrivalParkingStatus = (arrival) => {
    // Parking queue state: entered arrivals waiting for parking assignment.
    return "WAITING";
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await getFacilities({ search: "", skip: 0, take: 200 });
        const list = res?.items || [];
        setFacilities(list);
        if (!list.length) return;
        const firstId = list[0].id;
        setSlotFacilityFilter(firstId);
        setAssignFacilityId(firstId);
        setSlotForm((p) => ({ ...p, facilityId: firstId }));
      } catch (e) { setErr(e?.message || String(e)); }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!slotForm.facilityId) return setLocations([]);
      try {
        const res = await getLocations({ facilityId: slotForm.facilityId, search: "", skip: 0, take: 200 });
        const all = res?.items || [];
        const filtered = all.filter(isParkingLocation);
        const final = filtered.length ? filtered : all;
        setLocations(final);
        if (!final.find((x) => x.id === slotForm.locationId)) setSlotForm((p) => ({ ...p, locationId: final[0]?.id || "" }));
      } catch { setLocations([]); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotForm.facilityId]);

  const fetchSlots = async ({ reset } = { reset: true }) => {
    setLoading(true); setErr("");
    try {
      const skip = reset ? 0 : slotRows.length;
      const res = await getParkingSlots({ search: slotSearch, facilityId: slotFacilityFilter, status: slotStatusFilter, skip, take: PAGE_SIZE });
      const items = res?.items || [];
      if (reset) { setSlotRows(items); setSlotVisibleCount(PAGE_SIZE); } else { setSlotRows((p) => [...p, ...items]); setSlotVisibleCount((p) => p + PAGE_SIZE); }
      setSlotTotal(res?.total ?? 0);
      setSlotShown(res?.shown ?? Math.min(skip + items.length, res?.total ?? 0));
    } catch (e) { setErr(e?.response?.data?.message || e?.message || String(e)); }
    finally { setLoading(false); }
  };

  const fetchArrivals = async (facilityId = assignFacilityId) => {
    try {
      const [arrRes, locRes] = await Promise.all([
        getArrivals({ search: arrivalSearch, skip: 0, take: 200 }),
        getLocations({ facilityId, search: "", skip: 0, take: 300 }),
      ]);

      const locationRows = locRes?.items || [];
      const parkingLocationIds = new Set(
        locationRows
          .filter(isParkingLocation)
          .map((l) => String(pick(l, ["id", "Id"], "")))
          .filter(Boolean)
      );

      const rows = (arrRes?.items || [])
        .filter((a) => String(pick(a, ["facilityId", "FacilityId"], "")) === String(facilityId || ""))
        .filter((a) => {
          const locId = String(pick(a, ["locationId", "LocationId"], ""));
          return locId && parkingLocationIds.has(locId);
        })
        .filter((a) => String(pick(a, ["status", "Status"], "")).toUpperCase() === "ENTERED")
        .map((a) => ({ ...a, _goodsName: a.goodsName || a.goods || "-" }));
      setArrivals(rows);
    } catch (e) { setErr(e?.response?.data?.message || e?.message || String(e)); setArrivals([]); }
  };

  const fetchAvailableSlots = async (facilityId = assignFacilityId) => {
    try { setAvailableSlots((await getAvailableParkingSlots({ facilityId })) || []); }
    catch (e) { setErr(e?.response?.data?.message || e?.message || String(e)); setAvailableSlots([]); }
  };

  const fetchAssignments = async (facilityId = assignFacilityId) => {
    try {
      const [parkRes, dockRes] = await Promise.all([
        getParkingAssignments({
          facilityId,
          activeOnly: false,
          skip: 0,
          take: 200,
        }),
        getDockAssignments({
          facilityId,
          activeOnly: false,
          skip: 0,
          take: 200,
        }),
      ]);

      const allItems = parkRes?.items || [];
      const activeItems = allItems.filter(
        (r) => r?.isActive === true || (!r?.parkOutAt && !r?.finalStatus)
      );

      const statusMap = {};
      allItems.forEach((r) => {
        const resolvedFinal = String(r?.finalStatus || r?.status || "").trim().toUpperCase();
        if (!["COMPLETED", "DELAYED", "DAMAGED"].includes(resolvedFinal)) return;
        const idKey = String(r?.arrivalId || "").trim();
        const activityKey = String(r?.arrivalActivityId || "").trim();
        if (idKey) statusMap[idKey] = resolvedFinal;
        if (activityKey) statusMap[activityKey] = resolvedFinal;
      });

      const allDockItems = dockRes?.items || [];
      allDockItems.forEach((r) => {
        const resolvedFinal = String(r?.finalStatus || r?.status || "").trim().toUpperCase();
        if (!["COMPLETED", "DELAYED", "DAMAGED"].includes(resolvedFinal)) return;
        const idKey = String(r?.arrivalId || "").trim();
        const activityKey = String(r?.arrivalActivityId || "").trim();
        if (idKey) statusMap[idKey] = resolvedFinal;
        if (activityKey) statusMap[activityKey] = resolvedFinal;
      });

      setReleasedFinalStatusMap(statusMap);
      setAssignments(activeItems);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || String(e));
      setAssignments([]);
      setReleasedFinalStatusMap({});
    }
  };

  useEffect(() => { if (tab === "slots") fetchSlots({ reset: true }); }, [tab, slotSearch, slotFacilityFilter, slotStatusFilter]); // eslint-disable-line
  useEffect(() => { if (tab === "assign") Promise.all([fetchArrivals(assignFacilityId), fetchAvailableSlots(assignFacilityId), fetchAssignments(assignFacilityId)]); }, [tab, assignFacilityId, arrivalSearch]); // eslint-disable-line
  useEffect(() => { setArrivalVisibleCount(ARRIVAL_PAGE_SIZE); setAssignmentVisibleCount(ASSIGNMENT_PAGE_SIZE); setSelectedArrival(null); setSelectedSlot(null); }, [assignFacilityId, tab]);

  const openAdd = () => { setEditingId(null); setSlotForm({ facilityId: facilities[0]?.id || "", locationId: locations[0]?.id || "", slotCode: "", slotType: "GENERAL", status: "AVAILABLE", sortOrder: 1 }); setSlotModalOpen(true); };
  const openEdit = (r) => { setEditingId(r.id); setSlotForm({ facilityId: r.facilityId || "", locationId: r.locationId || "", slotCode: r.slotCode || "", slotType: (r.slotType || "GENERAL").toUpperCase(), status: (r.status || "AVAILABLE").toUpperCase(), sortOrder: r.sortOrder ?? 1 }); setSlotModalOpen(true); };
  const closeSlot = () => { setSlotModalOpen(false); setEditingId(null); };

  const saveSlot = async (e) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const payload = { facilityId: slotForm.facilityId, locationId: slotForm.locationId, slotCode: String(slotForm.slotCode || "").trim().toUpperCase(), slotType: String(slotForm.slotType || "").toUpperCase(), status: String(slotForm.status || "").toUpperCase(), sortOrder: Number(slotForm.sortOrder) || 1 };
      if (!payload.facilityId || !payload.locationId || !payload.slotCode) throw new Error("Facility, location and slot code are required.");
      if (editingId) await updateParkingSlot(editingId, payload); else await createParkingSlot(payload);
      closeSlot(); await fetchSlots({ reset: true });
    } catch (e2) { setErr(e2?.response?.data?.message || e2?.message || String(e2)); }
    finally { setLoading(false); }
  };

  const removeSlot = async () => {
    if (!deleteTarget?.id) return;
    setLoading(true); setErr("");
    try { await deleteParkingSlot(deleteTarget.id); await fetchSlots({ reset: true }); setDeleteTarget(null); }
    catch (e) { setErr(e?.response?.data?.message || e?.message || String(e)); }
    finally { setLoading(false); }
  };

  const requestDeleteSlot = (row) => {
    setDeleteTarget({
      id: row?.id,
      slotCode: row?.slotCode || "",
      facilityName: row?.facilityName || "",
    });
  };

  const closeDeleteConfirm = () => {
    if (loading) return;
    setDeleteTarget(null);
  };

  const assignParking = async () => {
    if (!selectedArrival || !selectedSlot) return;
    setLoading(true); setErr("");
    try {
      await assignParkingApi({ parkingSlotId: selectedSlot.id, arrivalId: selectedArrival.id });
      setSelectedArrival(null); setSelectedSlot(null);
      await Promise.all([fetchArrivals(assignFacilityId), fetchAvailableSlots(assignFacilityId), fetchAssignments(assignFacilityId)]);
    } catch (e) { setErr(e?.response?.data?.message || e?.message || String(e)); }
    finally { setLoading(false); }
  };


  const requestAssignParking = () => {
    if (!selectedArrival || !selectedSlot || loading) return;
    setAssignConfirmOpen(true);
  };

  const closeAssignConfirm = () => {
    if (loading) return;
    setAssignConfirmOpen(false);
  };

  const openRelease = (r) => { setReleaseTarget(r); setReleaseForm({ finalStatus: "", notes: "" }); setReleaseOpen(true); };
  const closeRelease = () => { setReleaseTarget(null); setReleaseOpen(false); };

  const releaseParking = async (e) => {
    e.preventDefault();
    if (!releaseTarget) return;
    setLoading(true); setErr("");
    try {
      await releaseParkingApi(releaseTarget.id, { finalStatus: releaseForm.finalStatus || null, notes: (releaseForm.notes || "").trim() || null });
      const chosenFinalStatus = String(releaseForm.finalStatus || "").toUpperCase();
      if (chosenFinalStatus) {
        setReleasedFinalStatusMap((prev) => ({
          ...prev,
          [String(releaseTarget.arrivalId || "").trim()]: chosenFinalStatus,
          [String(releaseTarget.arrivalActivityId || "").trim()]: chosenFinalStatus,
        }));
      }
      closeRelease();
      await Promise.all([fetchArrivals(assignFacilityId), fetchAvailableSlots(assignFacilityId), fetchAssignments(assignFacilityId)]);
    } catch (e2) { setErr(e2?.response?.data?.message || e2?.message || String(e2)); }
    finally { setLoading(false); }
  };

  const exportSlotsCsv = () => {
    const header = ["Facility", "Location", "SlotCode", "SlotType", "Status", "SortOrder"];
    const lines = [
      header.join(","),
      ...slotRows.map((r) =>
        [r.facilityName || "", r.locationName || "", r.slotCode || "", r.slotType || "", r.status || "", r.sortOrder ?? ""]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `parking_slots_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAssignmentsCsv = () => {
    const header = ["TrailerNo", "ParkingSlot", "ArrivalId", "Goods", "Purpose", "ParkInAt", "Duration", "Status"];
    const lines = [
      header.join(","),
      ...assignments.map((r) =>
        [
          r.trailerNumber || "",
          r.slotCode || "",
          r.arrivalActivityId || r.arrivalId || "",
          r.goodsName || "-",
          r.purpose || "-",
          toDisplayDate(r.parkInAt),
          formatDuration(r.parkInAt),
          r.status || "",
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `parking_assignments_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="adm-page">
      <div className="adm-card glass">
        <div className="adm-head">
          <h2 className="adm-title">Parking Management</h2>
          {tab === "slots" ? (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button className="adm-act" type="button" onClick={() => fetchSlots({ reset: true })}><FiRefreshCw /></button>
              <button className="adm-act" type="button" onClick={exportSlotsCsv}><FiFileText /></button>
              <button className="adm-addBtn" type="button" onClick={openAdd}><FiPlus /> Add Slot</button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button className="adm-act" type="button" onClick={() => Promise.all([fetchArrivals(assignFacilityId), fetchAvailableSlots(assignFacilityId), fetchAssignments(assignFacilityId)])}><FiRefreshCw /></button>
              <button className="adm-act" type="button" onClick={exportAssignmentsCsv}><FiFileText /></button>
            </div>
          )}
        </div>

        <div className="ga-tabsRow">
          <button type="button" className={`ga-tabBtn ${tab === "slots" ? "is-active" : ""}`} onClick={() => setTab("slots")}>Manage Parking</button>
          <button type="button" className={`ga-tabBtn ${tab === "assign" ? "is-active" : ""}`} onClick={() => setTab("assign")}>Assign / Release Parking</button>
        </div>
        {err && <div className="adm-error">{err}</div>}

        {tab === "slots" ? (
          <>
            <div className="adm-filters">
              <div className="adm-search"><FiSearch /><input className="adm-searchInput" value={slotSearch} onChange={(e) => setSlotSearch(e.target.value)} placeholder="Search slot, facility..." /></div>
              <select value={slotFacilityFilter} onChange={(e) => setSlotFacilityFilter(e.target.value)}><option value="">All Facilities</option>{facilities.map((f) => <option key={f.id} value={f.id}>{f.facilityName}</option>)}</select>
              <select value={slotStatusFilter} onChange={(e) => setSlotStatusFilter(e.target.value)}><option value="">All Status</option>{SLOT_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}</select>
            </div>

            <div className="adm-tableWrap">
              <div className="adm-tableTitleRow"><div className="adm-tableTitle">Parking Slot List</div><div className="adm-totalPill">Total: {slotTotal}</div></div>
              <table className="adm-table">
                <thead><tr><th>Facility</th><th>Location</th><th>Slot Code</th><th>Slot Type</th><th>Status</th><th>Sort Order</th><th style={{ width: 120 }}>Actions</th></tr></thead>
                <tbody>
                  {slotTotal === 0 && !loading ? <tr><td colSpan="7" className="adm-empty">No parking slots found.</td></tr> : visibleSlotRows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.facilityName}</td><td>{r.locationName}</td><td className="mono">{r.slotCode}</td><td>{r.slotType}</td><td><StatusPill status={r.status} /></td><td>{r.sortOrder}</td>
                      <td className="adm-actions-cell"><button className="adm-act adm-edit" type="button" onClick={() => openEdit(r)}><FiEdit2 size={16} /></button><button className="adm-act adm-del" type="button" onClick={() => requestDeleteSlot(r)}><FiTrash2 size={16} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {slotTotal > 0 && <div className="adm-footerRow"><div className="adm-showingText">Showing <strong>{slotRows.length}</strong> of <strong>{slotTotal}</strong></div><div className="adm-footerRight">{slotShown < slotTotal ? <button type="button" className="adm-loadMoreBtn" onClick={() => fetchSlots({ reset: false })}>{loading ? "Loading..." : "Load more"}</button> : <span className="adm-allLoaded">All loaded</span>}</div></div>}
            </div>
          </>
        ) : (
          <>
            <div className="adm-filters">
              <div className="adm-search"><FiSearch /><input className="adm-searchInput" value={arrivalSearch} onChange={(e) => setArrivalSearch(e.target.value)} placeholder="Search arrival..." /></div>
              <select value={assignFacilityId} onChange={(e) => setAssignFacilityId(e.target.value)}>{facilities.map((f) => <option key={f.id} value={f.id}>{f.facilityName}</option>)}</select>
            </div>

            <div className="dock-assign-grid">
              <div className="glass dock-panel">
                <div className="dock-panel-title">Arrivals (Entered + Parking Available)</div>
                <div className="dock-panel-sub">Select one entered arrival (location must have available slot)</div>
                <div className="adm-tableWrap" style={{ marginTop: 10 }}>
                  <table className="adm-table">
                    <thead><tr><th>ArrivalId</th><th>TrailerNo</th><th>TrailerType</th><th>Goods</th><th>Status</th></tr></thead>
                    <tbody>
                      {displayedArrivals.length === 0 ? <tr><td colSpan="5" className="adm-empty">No entered arrivals with available parking in same location.</td></tr> : displayedArrivals.map((r) => (
                        <tr key={r.id} className={selectedArrival?.id === r.id ? "dock-row-selected" : ""} onClick={() => setSelectedArrival(r)}>
                          <td className="mono">{r.activityId}</td><td className="mono">{r.trailerNumber}</td><td>{r.trailerType || "-"}</td><td>{r._goodsName || "-"}</td><td><StatusPill status={getArrivalParkingStatus(r)} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {visibleArrivals.length > ARRIVAL_PAGE_SIZE && <div className="adm-footerRow"><div className="adm-showingText">Showing <strong>{Math.min(arrivalVisibleCount, visibleArrivals.length)}</strong> of <strong>{visibleArrivals.length}</strong></div><div className="adm-footerRight">{arrivalVisibleCount < visibleArrivals.length ? <button type="button" className="adm-loadMoreBtn" onClick={() => setArrivalVisibleCount((p) => p + ARRIVAL_PAGE_SIZE)}>Load more</button> : <span className="adm-allLoaded">All loaded</span>}</div></div>}
              </div>

              <div className="glass dock-panel">
                <div className="dock-panel-title">Available Parking Slots</div>
                <div className="dock-panel-sub">Select one slot, then assign</div>
                <div className="dock-card-list">
                  {availableSlots.length === 0 ? <div className="adm-empty">No available parking slots.</div> : (selectedArrival ? availableSlotsForSelectedArrival : availableSlots).map((s) => (
                    <button type="button" key={s.id} className={`dock-card ${selectedSlot?.id === s.id ? "selected" : ""}`} onClick={() => setSelectedSlot(s)}>
                      <div className="dock-card-title">{s.slotCode}</div><div className="dock-card-meta">{s.slotType} - {s.status}</div>
                    </button>
                  ))}
                  {selectedArrival && availableSlots.length > 0 && availableSlotsForSelectedArrival.length === 0 && <div className="adm-empty">No available parking slot in selected arrival location.</div>}
                </div>
                <button type="button" className="adm-addBtn" onClick={requestAssignParking} disabled={!selectedArrival || !selectedSlot || loading} style={{ marginTop: 12 }}>Assign Parking</button>
              </div>
            </div>

            <div className="adm-tableWrap" style={{ marginTop: 16 }}>
              <div className="adm-tableTitleRow"><div className="adm-tableTitle">Occupied Parking / Active Assignments</div><div className="adm-totalPill">Total: {assignments.length}</div></div>
              <table className="adm-table">
                <thead><tr><th>TrailerNo</th><th>TrailerType</th><th>ParkingSlot</th><th>Goods</th><th>ParkInAt</th><th>Duration</th><th>Status</th><th style={{ width: 120 }}>Actions</th></tr></thead>
                <tbody>
                  {displayedAssignments.length === 0 ? <tr><td colSpan="8" className="adm-empty">No active assignments.</td></tr> : displayedAssignments.map((r) => (
                    <tr key={r.id}>
                      <td className="mono">{r.trailerNumber}</td><td>{r.trailerType || "-"}</td><td>{r.slotCode}</td><td>{r.goodsName || "-"}</td><td>{toDisplayDate(r.parkInAt)}</td><td>{formatDuration(r.parkInAt)}</td><td><StatusPill status={displayParkingStatus(r.status || "OCCUPIED")} /></td>
                      <td className="adm-actions-cell"><button className="dm-btn dm-btnSave" type="button" onClick={() => openRelease(r)} style={{ padding: "8px 12px", minWidth: 84 }}>Release</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {assignments.length > ASSIGNMENT_PAGE_SIZE && <div className="adm-footerRow"><div className="adm-showingText">Showing <strong>{Math.min(assignmentVisibleCount, assignments.length)}</strong> of <strong>{assignments.length}</strong></div><div className="adm-footerRight">{assignmentVisibleCount < assignments.length ? <button type="button" className="adm-loadMoreBtn" onClick={() => setAssignmentVisibleCount((p) => p + ASSIGNMENT_PAGE_SIZE)}>Load more</button> : <span className="adm-allLoaded">All loaded</span>}</div></div>}
            </div>
          </>
        )}

        <SlotModal open={slotModalOpen} editingId={editingId} facilities={facilities} locations={locations} form={slotForm} setForm={setSlotForm} loading={loading} onClose={closeSlot} onSave={saveSlot} />
        <ReleaseModal open={releaseOpen} loading={loading} form={releaseForm} setForm={setReleaseForm} onClose={closeRelease} onSave={releaseParking} />

        {!!deleteTarget && (
          <div className="ga-confirmOverlay" onClick={closeDeleteConfirm}>
            <div className="ga-confirmModal" onClick={(e) => e.stopPropagation()}>
              <div className="ga-confirmHead">
                <h3>Delete Parking Slot?</h3>
              </div>
              <div className="ga-confirmBody">
                <p>This action cannot be undone.</p>
                <div className="ga-confirmMeta">
                  <span>{deleteTarget.slotCode || "No Slot Code"}</span>
                  <span>{deleteTarget.facilityName || "No Facility"}</span>
                </div>
              </div>
              <div className="ga-confirmActions">
                <button type="button" className="ga-confirmBtn ga-confirmBtn--ghost" onClick={closeDeleteConfirm} disabled={loading}>
                  Cancel
                </button>
                <button type="button" className="ga-confirmBtn ga-confirmBtn--danger" onClick={removeSlot} disabled={loading}>
                  {loading ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {assignConfirmOpen && (
          <div className="ga-confirmOverlay" onClick={closeAssignConfirm}>
            <div className="ga-confirmModal" role="dialog" aria-modal="true" aria-label="Assign parking confirmation" onClick={(e) => e.stopPropagation()}>
              <div className="ga-confirmHead">
                <h3>Assign Parking?</h3>
              </div>
              <div className="ga-confirmBody">
                <p>Confirm parking assignment for this trailer.</p>
                <div className="ga-confirmMeta">
                  <span>Trailer: <strong>{selectedArrival?.trailerNumber || "-"}</strong></span>
                  <span>Slot: <strong>{selectedSlot?.slotCode || "-"}</strong></span>
                </div>
              </div>
              <div className="ga-confirmActions">
                <button type="button" className="ga-confirmBtn ga-confirmBtn--ghost" onClick={closeAssignConfirm} disabled={loading}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="ga-confirmBtn ga-confirmBtn--danger"
                  onClick={async () => {
                    await assignParking();
                    setAssignConfirmOpen(false);
                  }}
                  disabled={loading}
                >
                  {loading ? "Assigning..." : "Assign Parking"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
