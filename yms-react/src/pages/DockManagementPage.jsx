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
import { getLocations } from "../services/locationService";
import { getArrivals } from "../services/gateactivityService";
import { getGoods } from "../services/goodsService";
import { getYardMoves } from "../services/yardMoveService";
import {
  getDocks,
  createDock,
  updateDock,
  deleteDock,
} from "../services/dockService";
import {
  getDockAssignments,
  getAvailableDocks,
  assignDock,
  releaseDock,
} from "../services/dockAssignmentService";

const PAGE_SIZE = 6;
const ARRIVAL_PAGE_SIZE = 4;
const ASSIGNMENT_PAGE_SIZE = 4;

const DOCK_TYPES = ["LOAD", "UNLOAD", "BOTH"];
const DOCK_STATUS = ["AVAILABLE", "OCCUPIED", "MAINTENANCE", "BLOCKED"];
const FINAL_STATUS = ["COMPLETED", "DELAYED", "DAMAGED"];

const formatDuration = (dockInAt) => {
  if (!dockInAt) return "";
  const raw = String(dockInAt).trim();
  const hasZone = /(?:Z|[+\-]\d{2}:\d{2})$/i.test(raw);
  const start = new Date(hasZone ? raw : `${raw}Z`).getTime();
  if (Number.isNaN(start)) return "";
  const diff = Math.max(0, Date.now() - start);
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hours <= 0) return `${rem}m`;
  return `${hours}h ${rem}m`;
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

const resolveArrivalGoodsName = (arrival, goodsById = {}) => {
  const directName =
    arrival?.goodsName ||
    arrival?.goods ||
    arrival?.goodsItemName ||
    arrival?.commodityName ||
    arrival?.cargoName;
  if (directName) return String(directName);

  const gid = String(arrival?.goodsId || arrival?.GoodsId || "").trim();
  if (gid && goodsById[gid]) return goodsById[gid];
  return "-";
};

const normText = (v) => String(v || "").trim();
const normTrailer = (v) => normText(v).toUpperCase().replace(/\s+/g, "");
const isDockLocation = (loc) =>
  String(loc?.locationType || "").toUpperCase().includes("DOCK");
const toOptionLabel = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
const toFlowCode = (v) => {
  const raw = String(v || "").trim().toUpperCase();
  if (raw === "INBOUND") return "LOAD";
  if (raw === "OUTBOUND") return "UNLOAD";
  return raw;
};
const toFlowLabel = (v) => {
  const code = toFlowCode(v);
  if (!code || code === "-") return "-";
  return toOptionLabel(code);
};
const toFlowProgressLabel = (v) => {
  const code = toFlowCode(v);
  if (code === "LOAD") return "Loading";
  if (code === "UNLOAD") return "Unloading";
  if (!code || code === "-") return "-";
  return toOptionLabel(code);
};

const dockStatusPillClass = (status) => {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "AVAILABLE") return "ga-pill--ok";
  if (normalized === "COMPLETED") return "ga-pill--ok";
  if (normalized === "OCCUPIED") return "ga-pill--warn";
  if (normalized === "DELAYED") return "ga-pill--warn";
  if (normalized === "BLOCKED") return "ga-pill--bad";
  if (normalized === "DAMAGED") return "ga-pill--bad";
  if (normalized === "MAINTENANCE") return "ga-pill--neutral";
  if (normalized === "WAITING") return "ga-pill--neutral";
  return "ga-pill--neutral";
};

function DockStatusPill({ status }) {
  const normalized = String(status || "UNKNOWN").toUpperCase();
  return <span className={`ga-pill ${dockStatusPillClass(normalized)}`}>{toOptionLabel(normalized)}</span>;
}
function DockModal({
  open,
  editingId,
  facilities,
  locations,
  form,
  setForm,
  loading,
  onClose,
  onSave,
}) {
  if (!open) return null;

  return (
    <div className="adm-modalOverlay" onClick={onClose}>
      <div className="adm-modal glass" onClick={(e) => e.stopPropagation()}>
        <div className="adm-modalTop">
          <h3 className="adm-modalTitle">
            {editingId ? "Edit Dock" : "Add Dock"}
          </h3>
        </div>

        <form className="ym-modalBody dock-add-body" onSubmit={onSave}>
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
              <label>Dock Name</label>
              <input
                className="dock-equal-field"
                value={form.dockName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, dockName: e.target.value }))
                }
                placeholder="e.g. Dock A"
              />
            </div>

            <div className="ym-field">
              <label>Location</label>
              <select
                disabled={!locations.length}
                value={form.locationId}
                onChange={(e) =>
                  setForm((p) => ({ ...p, locationId: e.target.value }))
                }
              >
                {locations.length === 0 ? (
                  <option value="">No dock locations</option>
                ) : (
                  locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.locationName}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="ym-field">
              <label>Dock Type</label>
              <select
                value={form.dockType}
                onChange={(e) =>
                  setForm((p) => ({ ...p, dockType: e.target.value }))
                }
              >
                {DOCK_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t[0] + t.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="ym-field">
              <label>Status</label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((p) => ({ ...p, status: e.target.value }))
                }
              >
                {DOCK_STATUS.map((s) => (
                  <option key={s} value={s}>
                    {s[0] + s.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="ym-field">
              <label>Sort Order</label>
              <input
                className="dock-equal-field"
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
                onClick={onClose}
              >
                Cancel
              </button>

              <button type="submit" className="dm-btn dm-btnSave" disabled={loading}>
                {loading ? "Saving..." : "SAVE"}
              </button>
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
        <div className="adm-modalTop">
          <h3 className="adm-modalTitle">Release Dock</h3>
        </div>

        <form className="ym-modalBody dock-release-body" onSubmit={onSave}>
          <div className="ym-form">
            <div className="ym-field">
              <label>Final Status</label>
              <select
                value={form.finalStatus}
                onChange={(e) =>
                  setForm((p) => ({ ...p, finalStatus: e.target.value }))
                }
              >
                <option value="">Select...</option>
                {FINAL_STATUS.map((s) => (
                  <option key={s} value={s}>
                    {s[0] + s.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="ym-field">
              <label>Notes</label>
              <input
                value={form.notes}
                onChange={(e) =>
                  setForm((p) => ({ ...p, notes: e.target.value }))
                }
                placeholder="Optional notes"
              />
            </div>

            <div className="ym-actions">
              <button
                type="button"
                className="dm-btn dm-btnGhost"
                onClick={onClose}
              >
                Cancel
              </button>

              <button type="submit" className="dm-btn dm-btnSave" disabled={loading}>
                {loading ? "Saving..." : "RELEASE"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DockManagementPage() {
  const [tab, setTab] = useState("docks");

  const [facilities, setFacilities] = useState([]);
  const [locations, setLocations] = useState([]);
  const [dockRows, setDockRows] = useState([]);
  const [dockSearch, setDockSearch] = useState("");
  const [dockFacilityFilter, setDockFacilityFilter] = useState("");
  const [dockStatusFilter, setDockStatusFilter] = useState("");
  const [dockTotal, setDockTotal] = useState(0);
  const [dockShown, setDockShown] = useState(0);
  const [dockVisibleCount, setDockVisibleCount] = useState(PAGE_SIZE);

  const [dockModalOpen, setDockModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [dockForm, setDockForm] = useState({
    facilityId: "",
    locationId: "",
    dockName: "",
    dockType: "BOTH",
    status: "AVAILABLE",
    sortOrder: 1,
  });

  const [assignFacilityId, setAssignFacilityId] = useState("");
  const [arrivals, setArrivals] = useState([]);
  const [arrivalSearch, setArrivalSearch] = useState("");
  const [arrivalVisibleCount, setArrivalVisibleCount] = useState(ARRIVAL_PAGE_SIZE);
  const [selectedArrival, setSelectedArrival] = useState(null);

  const [availableDocks, setAvailableDocks] = useState([]);
  const [selectedDock, setSelectedDock] = useState(null);

  const [assignments, setAssignments] = useState([]);
  const [assignmentVisibleCount, setAssignmentVisibleCount] = useState(ASSIGNMENT_PAGE_SIZE);
  const [releasedFinalStatusMap, setReleasedFinalStatusMap] = useState({});
  const activeArrivalKeys = useMemo(() => {
    const keys = new Set();
    assignments.forEach((r) => {
      const idKey = String(r.arrivalId || "").trim();
      const activityKey = String(r.arrivalActivityId || "").trim();
      if (idKey) keys.add(idKey);
      if (activityKey) keys.add(activityKey);
    });
    return keys;
  }, [assignments]);

  const visibleArrivals = useMemo(
    () =>
      arrivals.filter((a) => {
        const idKey = String(a.id || "").trim();
        const activityKey = String(a.activityId || "").trim();
        return !activeArrivalKeys.has(idKey) && !activeArrivalKeys.has(activityKey);
      }),
    [arrivals, activeArrivalKeys]
  );

  const getArrivalDockStatus = (arrival) => {
    const idKey = String(arrival?.id || "").trim();
    const activityKey = String(arrival?.activityId || "").trim();
    const releasedStatus =
      releasedFinalStatusMap[idKey] ||
      releasedFinalStatusMap[activityKey] ||
      arrival?.finalStatus;
    if (releasedStatus) return String(releasedStatus).toUpperCase();
    return "WAITING";
  };

  const displayedArrivals = useMemo(
    () => visibleArrivals.slice(0, arrivalVisibleCount),
    [visibleArrivals, arrivalVisibleCount]
  );
  const allArrivalsLoaded = arrivalVisibleCount >= visibleArrivals.length;
  const displayedAssignments = useMemo(
    () => assignments.slice(0, assignmentVisibleCount),
    [assignments, assignmentVisibleCount]
  );
  const allAssignmentsLoaded = assignmentVisibleCount >= assignments.length;

  const [releaseOpen, setReleaseOpen] = useState(false);
  const [releaseTarget, setReleaseTarget] = useState(null);
  const [releaseForm, setReleaseForm] = useState({
    finalStatus: "",
    notes: "",
  });
  const [assignConfirmOpen, setAssignConfirmOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const allLoaded = dockShown >= dockTotal;

  useEffect(() => {
    (async () => {
      try {
        const res = await getFacilities({ search: "", skip: 0, take: 200 });
        const list = res.items || [];
        setFacilities(list);
        if (list.length > 0) {
          const initialFacilityId = list[0].id;
          const locRes = await getLocations({ facilityId: initialFacilityId, search: "", skip: 0, take: 200 });
          const allLocs = locRes?.items || [];
          const locs = allLocs.filter(isDockLocation);
          setLocations(locs);

          setDockForm((p) => ({
            ...p,
            facilityId: p.facilityId || initialFacilityId,
            locationId: p.locationId || locs[0]?.id || "",
          }));
          setDockFacilityFilter((p) => p || list[0].id);
          setAssignFacilityId((p) => p || list[0].id);
        }
      } catch (e) {
        setErr(e?.message || String(e));
      }
    })();
  }, []);

  const fetchDocks = async ({ reset } = { reset: true }) => {
    setLoading(true);
    setErr("");
    try {
      const skip = reset ? 0 : dockRows.length;
      const take = PAGE_SIZE;
      const data = await getDocks({
        search: dockSearch,
        facilityId: dockFacilityFilter,
        status: dockStatusFilter,
        skip,
        take,
      });

      const items = data.items || [];
      if (reset) {
        setDockRows(items);
        setDockVisibleCount(PAGE_SIZE);
      } else {
        setDockRows((prev) => [...prev, ...items]);
        setDockVisibleCount((prev) => prev + PAGE_SIZE);
      }

      setDockTotal(data.total ?? 0);
      setDockShown(data.shown ?? Math.min(skip + items.length, data.total ?? 0));
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab !== "docks") return;
    fetchDocks({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, dockSearch, dockFacilityFilter, dockStatusFilter]);

  const resetDockForm = () => {
    setEditingId(null);
    setDockForm({
      facilityId: facilities[0]?.id || "",
      locationId: locations[0]?.id || "",
      dockName: "",
      dockType: "BOTH",
      status: "AVAILABLE",
      sortOrder: 1,
    });
  };

  const openAddDock = () => {
    resetDockForm();
    setDockModalOpen(true);
  };

  const closeDockModal = () => {
    setDockModalOpen(false);
    resetDockForm();
  };

  const onEditDock = (r) => {
    setEditingId(r.id);
    setDockForm({
      facilityId: r.facilityId || facilities[0]?.id || "",
      locationId: r.locationId || locations[0]?.id || "",
      dockName: r.dockName || "",
      dockType: (r.dockType || "BOTH").toUpperCase(),
      status: (r.status || "AVAILABLE").toUpperCase(),
      sortOrder: r.sortOrder ?? 1,
    });
    setDockModalOpen(true);
  };

  const onSaveDock = async (e) => {
    e.preventDefault();
    setErr("");

    const payload = {
      facilityId: dockForm.facilityId,
      locationId: dockForm.locationId,
      dockName: (dockForm.dockName || "").trim(),
      dockType: (dockForm.dockType || "BOTH").toUpperCase(),
      status: (dockForm.status || "AVAILABLE").toUpperCase(),
      sortOrder: Number(dockForm.sortOrder || 1),
    };

    if (!payload.dockName || !payload.facilityId || !payload.locationId) return;

    setLoading(true);
    try {
      if (editingId) await updateDock(editingId, payload);
      else await createDock(payload);

      closeDockModal();
      await fetchDocks({ reset: true });
    } catch (e2) {
      setErr(e2?.message || String(e2));
    } finally {
      setLoading(false);
    }
  };

  const onDeleteDock = async () => {
    if (!deleteTarget?.id) return;
    setErr("");
    setLoading(true);
    try {
      await deleteDock(deleteTarget.id);
      await fetchDocks({ reset: true });
      setDeleteTarget(null);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const requestDeleteDock = (row) => {
    setDeleteTarget({
      id: row?.id,
      dockName: row?.dockName || "",
      facilityName: row?.facilityName || "",
    });
  };

  const closeDeleteConfirm = () => {
    if (loading) return;
    setDeleteTarget(null);
  };

  const onExportDockCsv = () => {
    const header = ["Facility", "Location", "Dock Name", "Dock Type", "Status", "Sort Order"];
    const lines = [
      header.join(","),
      ...dockRows.map((r) =>
        [r.facilityName, r.locationName, r.dockName, toFlowCode(r.dockType), r.status, r.sortOrder]
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
    a.download = `docks_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const visibleDockRows = useMemo(
    () => dockRows.slice(0, dockVisibleCount),
    [dockRows, dockVisibleCount]
  );

  const fetchArrivals = async (
    facilityId = assignFacilityId,
    docksForFacility = availableDocks
  ) => {
    try {
      const [arrRes, goodsRes, yardMoveRes, locRes] = await Promise.all([
        getArrivals({ search: arrivalSearch, skip: 0, take: 200 }),
        getGoods({ facilityId, search: "", skip: 0, take: 200 }),
        getYardMoves({ facilityId, search: "", skip: 0, take: 1000 }),
        getLocations({ facilityId, search: "", skip: 0, take: 300 }),
      ]);
      const items = arrRes?.items || [];
      const goodsById = Object.fromEntries(
        (goodsRes?.items || []).map((g) => [String(g.id || ""), String(g.goodsName || "")])
      );
      const gateLocationIds = new Set(
        (locRes?.items || [])
          .filter((l) => String(l.locationType || "").toUpperCase().includes("GATE"))
          .map((l) => String(l.id || ""))
          .filter(Boolean)
      );
      const dockLocationIds = new Set(
        (locRes?.items || [])
          .filter((l) => String(l.locationType || "").toUpperCase().includes("DOCK"))
          .map((l) => String(l.id || ""))
          .filter(Boolean)
      );

      const latestMoveByTrailer = new Map();
      (yardMoveRes?.items || []).forEach((m) => {
        const tn = normTrailer(m.trailerNumber);
        if (!tn) return;
        const time =
          Date.parse(m.moveDateTime || m.updatedAt || m.createdAt || "") ||
          0;
        const prev = latestMoveByTrailer.get(tn);
        if (!prev || time >= prev.time) {
          latestMoveByTrailer.set(tn, { row: m, time });
        }
      });

      const filtered = items.filter((a) => {
        const sameFacility = String(a.facilityId || "") === String(facilityId || "");
        const hasLocation = !!a.locationId;
        const arrivalLocationId = String(a.locationId || "");
        const isDockLocation = arrivalLocationId && dockLocationIds.has(arrivalLocationId);
        const status = String(a.status || "").toLowerCase();
        if (!(sameFacility && hasLocation && isDockLocation && status === "entered")) return false;

        const latest = latestMoveByTrailer.get(normTrailer(a.trailerNumber))?.row;
        if (!latest) return true;

        const toLocationId = String(latest.toLocationId || "");
        const toLocationType = String(latest.toLocationType || "").toUpperCase();
        const toLocationName = String(latest.toLocationName || "").toUpperCase();
        const movedToGate =
          toLocationType.includes("GATE") ||
          (toLocationId && gateLocationIds.has(toLocationId)) ||
          toLocationName.includes("GATE");

        return !movedToGate;
      });
      const withGoods = filtered.map((a) => ({
        ...a,
        _goodsName: resolveArrivalGoodsName(a, goodsById),
      }));
      setArrivals(withGoods);
      return withGoods;
    } catch (e) {
      setErr(e?.message || String(e));
      setArrivals([]);
      return [];
    }
  };

  const fetchAvailableDocks = async (facilityId) => {
    try {
      const list = await getAvailableDocks({ facilityId });
      setAvailableDocks(list || []);
      return list || [];
    } catch (e) {
      setErr(e?.message || String(e));
      setAvailableDocks([]);
      return [];
    }
  };

  useEffect(() => {
    (async () => {
      if (!dockForm.facilityId) {
        setLocations([]);
        return;
      }
      try {
        const locRes = await getLocations({ facilityId: dockForm.facilityId, search: "", skip: 0, take: 200 });
        const locs = (locRes?.items || []).filter(isDockLocation);
        setLocations(locs);
        if (!locs.find((x) => x.id === dockForm.locationId)) {
          setDockForm((p) => ({ ...p, locationId: locs[0]?.id || "" }));
        }
      } catch (e) {
        setLocations([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dockForm.facilityId]);

  const fetchAssignments = async (facilityId) => {
    try {
      const res = await getDockAssignments({
        facilityId,
        activeOnly: false,
        skip: 0,
        take: 200,
      });
      const allItems = res?.items || [];
      const activeItems = allItems.filter(
        (r) => r?.isActive === true || (!r?.dockOutAt && !r?.finalStatus)
      );

      const statusMap = {};
      allItems.forEach((r) => {
        const resolvedFinal =
          String(r?.finalStatus || r?.status || "")
            .trim()
            .toUpperCase();
        if (!["COMPLETED", "DELAYED", "DAMAGED"].includes(resolvedFinal)) return;

        const idKey = String(r?.arrivalId || "").trim();
        const activityKey = String(r?.arrivalActivityId || "").trim();
        if (idKey) statusMap[idKey] = resolvedFinal;
        if (activityKey) statusMap[activityKey] = resolvedFinal;
      });

      setReleasedFinalStatusMap(statusMap);
      setAssignments(activeItems);
      return activeItems;
    } catch (e) {
      setErr(e?.message || String(e));
      setAssignments([]);
      setReleasedFinalStatusMap({});
      return [];
    }
  };

  useEffect(() => {
    if (tab !== "assign") return;
    (async () => {
      const docks = await fetchAvailableDocks(assignFacilityId);
      await fetchArrivals(assignFacilityId, docks);
      await fetchAssignments(assignFacilityId);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, arrivalSearch, assignFacilityId]);

  useEffect(() => {
    setArrivalVisibleCount(ARRIVAL_PAGE_SIZE);
  }, [arrivalSearch, assignFacilityId, tab]);

  useEffect(() => {
    setAssignmentVisibleCount(ASSIGNMENT_PAGE_SIZE);
  }, [assignFacilityId, tab]);

  const onAssignDock = async () => {
    if (!selectedArrival || !selectedDock) return;
    setErr("");
    setSuccessMsg("");
    setLoading(true);
    try {
      await assignDock({
        dockId: selectedDock.id,
        arrivalId: selectedArrival.id,
      });

      setSuccessMsg("Dock assigned successfully.");
      setTimeout(() => setSuccessMsg(""), 2500);
      setSelectedDock(null);
      setSelectedArrival(null);
      const docks = await fetchAvailableDocks(assignFacilityId);
      await Promise.all([
        fetchArrivals(assignFacilityId, docks),
        fetchAssignments(assignFacilityId),
      ]);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const requestAssignDock = () => {
    if (!selectedArrival || !selectedDock || loading) return;
    setAssignConfirmOpen(true);
  };

  const closeAssignConfirm = () => {
    if (loading) return;
    setAssignConfirmOpen(false);
  };

  const openRelease = (row) => {
    setReleaseTarget(row);
    setReleaseForm({
      finalStatus: "",
      notes: "",
    });
    setReleaseOpen(true);
  };

  const closeRelease = () => {
    setReleaseOpen(false);
    setReleaseTarget(null);
  };

  const onRelease = async (e) => {
    e.preventDefault();
    if (!releaseTarget) return;
    setErr("");
    setLoading(true);
    try {
      await releaseDock(releaseTarget.id, {
        finalStatus: releaseForm.finalStatus || null,
        notes: (releaseForm.notes || "").trim() || null,
      });
      const chosenFinalStatus = String(releaseForm.finalStatus || "").toUpperCase();
      if (chosenFinalStatus) {
        setReleasedFinalStatusMap((prev) => ({
          ...prev,
          [String(releaseTarget.arrivalId || "").trim()]: chosenFinalStatus,
          [String(releaseTarget.arrivalActivityId || "").trim()]: chosenFinalStatus,
        }));
      }
      const docks = await fetchAvailableDocks(assignFacilityId);
      await Promise.all([
        fetchArrivals(assignFacilityId, docks),
        fetchAssignments(assignFacilityId),
      ]);
      closeRelease();
    } catch (e2) {
      setErr(e2?.response?.data?.message || e2?.message || String(e2));
    } finally {
      setLoading(false);
    }
  };

  const onExportAssignmentsCsv = () => {
    const header = [
      "TrailerNo",
      "Dock",
      "ArrivalId",
      "Goods",
      "Purpose",
      "DockInAt",
      "Duration",
      "FinalStatus",
    ];
    const lines = [
      header.join(","),
      ...assignments.map((r) =>
        [
          r.trailerNumber,
          r.dockName,
          r.arrivalActivityId || r.arrivalId,
          r.goodsName || r.arrivalGoodsName || r._goodsName || "-",
          toFlowLabel(r.purpose || r.arrivalPurpose || r.visitPurpose || "-"),
          toDisplayDate(r.dockInAt),
          formatDuration(r.dockInAt),
          r.finalStatus,
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
    a.download = `dock_assignments_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const availableDocksForSelectedArrival = useMemo(() => {
    if (!selectedArrival?.locationId) return [];
    const flow = String(
      selectedArrival.purpose ||
      selectedArrival.direction ||
      selectedArrival.flow ||
      ""
    ).toUpperCase();

    const allowedDockTypes = flow.includes("LOAD") || flow.includes("INBOUND")
      ? new Set(["LOAD", "INBOUND", "BOTH"])
      : flow.includes("UNLOAD") || flow.includes("OUTBOUND")
        ? new Set(["UNLOAD", "OUTBOUND", "BOTH"])
        : null;

    return availableDocks.filter(
      (d) =>
        String(d.locationId || "") === String(selectedArrival.locationId || "") &&
        (!allowedDockTypes || allowedDockTypes.has(String(d.dockType || "").toUpperCase()))
    );
  }, [availableDocks, selectedArrival]);

  useEffect(() => {
    if (!selectedDock) return;
    if (!availableDocksForSelectedArrival.some((d) => d.id === selectedDock.id)) {
      setSelectedDock(null);
    }
  }, [availableDocksForSelectedArrival, selectedDock]);

  useEffect(() => {
    if (!selectedArrival) return;
    if (!visibleArrivals.some((a) => a.id === selectedArrival.id)) {
      setSelectedArrival(null);
    }
  }, [selectedArrival, visibleArrivals]);

  return (
    <div className="adm-page">
      <div className="adm-card glass">
        <div className="adm-head">
          <h2 className="adm-title">Dock Management</h2>

          {tab === "docks" ? (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                className="adm-act"
                title="Refresh"
                type="button"
                onClick={() => fetchDocks({ reset: true })}
              >
                <FiRefreshCw />
              </button>

              <button
                className="adm-act"
                title="Export CSV"
                type="button"
                onClick={onExportDockCsv}
              >
                <FiFileText />
              </button>

              <button className="adm-addBtn" onClick={openAddDock} type="button">
                <FiPlus /> Add Dock
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                className="adm-act"
                title="Refresh"
                type="button"
                onClick={() => {
                  (async () => {
                    const docks = await fetchAvailableDocks(assignFacilityId);
                    await fetchArrivals(assignFacilityId, docks);
                    await fetchAssignments(assignFacilityId);
                  })();
                }}
              >
                <FiRefreshCw />
              </button>

              <button
                className="adm-act"
                title="Export CSV"
                type="button"
                onClick={onExportAssignmentsCsv}
              >
                <FiFileText />
              </button>
            </div>
          )}
        </div>

        <div className="ga-tabsRow">
          <button
            type="button"
            className={`ga-tabBtn ${tab === "docks" ? "is-active" : ""}`}
            onClick={() => setTab("docks")}
          >
            Manage Docks
          </button>
          <button
            type="button"
            className={`ga-tabBtn ${tab === "assign" ? "is-active" : ""}`}
            onClick={() => setTab("assign")}
          >
            Assign / Release Dock
          </button>
        </div>

        {err && <div className="adm-error">{err}</div>}
        {successMsg && <div className="ga-successBar">{successMsg}</div>}

        {tab === "docks" ? (
          <>
            <div className="adm-filters">
              <div className="adm-search">
                <FiSearch />
                <input
                  className="adm-searchInput"
                  value={dockSearch}
                  onChange={(e) => setDockSearch(e.target.value)}
                  placeholder="Search dock, facility..."
                />
              </div>

              <select
                value={dockFacilityFilter}
                onChange={(e) => setDockFacilityFilter(e.target.value)}
              >
                <option value="">All Facilities</option>
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.facilityName}
                  </option>
                ))}
              </select>

              <select
                value={dockStatusFilter}
                onChange={(e) => setDockStatusFilter(e.target.value)}
              >
                <option value="">All Status</option>
                {["AVAILABLE", "OCCUPIED", "MAINTENANCE", "BLOCKED"].map((s) => (
                  <option key={s} value={s}>
                    {s[0] + s.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="adm-tableWrap">
              <div className="adm-tableTitleRow">
                <div className="adm-tableTitle">Dock List</div>
                <div className="adm-totalPill">Total: {dockTotal}</div>
              </div>

              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Facility</th>
                    <th>Location</th>
                    <th>Dock Name</th>
                    <th>Dock Type</th>
                    <th>Status</th>
                    <th>Sort Order</th>
                    <th style={{ width: 140 }}>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {dockTotal === 0 && !loading ? (
                    <tr>
                      <td colSpan="7" className="adm-empty">
                        No docks found.
                      </td>
                    </tr>
                  ) : (
                    visibleDockRows.map((r) => (
                      <tr key={r.id}>
                        <td>{r.facilityName}</td>
                        <td>{r.locationName || "-"}</td>
                        <td>{r.dockName}</td>
                        <td className="mono">{toFlowCode(r.dockType || "")}</td>
                        <td><DockStatusPill status={(r.status || "").toUpperCase()} /></td>
                        <td className="mono">{r.sortOrder}</td>
                        <td className="adm-actions-cell">
                          <button
                            className="adm-act adm-edit"
                            title="Edit"
                            type="button"
                            onClick={() => onEditDock(r)}
                          >
                            <FiEdit2 size={16} />
                          </button>

                          <button
                            className="adm-act adm-del"
                            title="Delete"
                            type="button"
                            onClick={() => requestDeleteDock(r)}
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
                  Showing <strong>{dockShown}</strong> of{" "}
                  <strong>{dockTotal}</strong>
                </div>

                <div className="adm-footerRight">
                  {dockTotal > 0 && !allLoaded && (
                    <button
                      type="button"
                      className="adm-loadMoreBtn"
                      onClick={() => fetchDocks({ reset: false })}
                      disabled={loading}
                    >
                      {loading ? "Loading..." : "Load more"}
                    </button>
                  )}
                  {dockTotal > 0 && allLoaded && (
                    <span className="adm-allLoaded">All loaded</span>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="adm-filters">
              <div className="adm-search">
                <FiSearch />
                <input
                  className="adm-searchInput"
                  value={arrivalSearch}
                  onChange={(e) => setArrivalSearch(e.target.value)}
                  placeholder="Search arrival..."
                />
              </div>

              <select
                value={assignFacilityId}
                onChange={(e) => setAssignFacilityId(e.target.value)}
              >
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.facilityName}
                  </option>
                ))}
              </select>
            </div>

            <div className="dock-assign-grid">
              <div className="glass dock-panel">
                <div className="dock-panel-title">Arrivals (Entered + Dock Available)</div>
                <div className="dock-panel-sub">
                  Select one entered arrival (location must have available dock)
                </div>

                <div className="dock-table-wrap">
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>ArrivalId</th>
                        <th>TrailerType</th>
                        <th>TrailerNo</th>
                        <th>Goods</th>
                        <th>Purpose</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleArrivals.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="adm-empty">
                            No entered arrivals with available dock in same location.
                          </td>
                        </tr>
                      ) : (
                        displayedArrivals.map((r) => (
                          <tr
                            key={r.id}
                            className={
                              selectedArrival?.id === r.id
                                ? "dock-row-selected"
                                : ""
                            }
                            onClick={() => setSelectedArrival(r)}
                          >
                            <td className="mono">{r.activityId}</td>
                            <td>{r.trailerType}</td>
                            <td className="mono">{r.trailerNumber}</td>
                            <td>{r._goodsName || "-"}</td>
                            <td>{toFlowLabel(r.purpose || r.visitPurpose || "-")}</td>
                            <td><DockStatusPill status={getArrivalDockStatus(r)} /></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {visibleArrivals.length > ARRIVAL_PAGE_SIZE && (
                  <div className="adm-footerRow">
                    <div className="adm-showingText">
                      Showing <strong>{Math.min(arrivalVisibleCount, visibleArrivals.length)}</strong> of{" "}
                      <strong>{visibleArrivals.length}</strong>
                    </div>
                    <div className="adm-footerRight">
                      {!allArrivalsLoaded ? (
                        <button
                          type="button"
                          className="adm-loadMoreBtn"
                          onClick={() => setArrivalVisibleCount((p) => p + ARRIVAL_PAGE_SIZE)}
                        >
                          Load more
                        </button>
                      ) : (
                        <span className="adm-allLoaded">All loaded</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="glass dock-panel">
                <div className="dock-panel-title">Available Docks</div>
                <div className="dock-panel-sub">
                  Select one dock, then assign
                </div>

                <div className="dock-card-list">
                  {availableDocks.length === 0 ? (
                    <div className="adm-empty">No available docks.</div>
                  ) : (
                    (selectedArrival ? availableDocksForSelectedArrival : availableDocks).map((d) => (
                      <button
                        type="button"
                        key={d.id}
                        className={`dock-card ${
                          selectedDock?.id === d.id ? "selected" : ""
                        }`}
                        onClick={() => setSelectedDock(d)}
                      >
                        <div className="dock-card-title">{d.dockName}</div>
                        <div className="dock-card-meta">
                          {toFlowCode(d.dockType)} • {d.status}
                        </div>
                      </button>
                    ))
                  )}
                  {selectedArrival && availableDocks.length > 0 && availableDocksForSelectedArrival.length === 0 && (
                    <div className="adm-empty">No available dock in selected arrival location.</div>
                  )}
                </div>

                <button
                  type="button"
                  className="adm-addBtn"
                  onClick={requestAssignDock}
                  disabled={!selectedArrival || !selectedDock || loading}
                  style={{ marginTop: 12 }}
                >
                  Assign Dock
                </button>
              </div>
            </div>

            <div className="adm-tableWrap" style={{ marginTop: 16 }}>
              <div className="adm-tableTitleRow">
                <div className="adm-tableTitle">Occupied Docks / Active Assignments</div>
                <div className="adm-totalPill">Total: {assignments.length}</div>
              </div>

              <table className="adm-table">
                <thead>
                  <tr>
                    <th>TrailerNo</th>
                    <th>Dock</th>
                    <th>Goods</th>
                    <th>Purpose</th>
                    <th>DockInAt</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th style={{ width: 120 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="adm-empty">
                        No active assignments.
                      </td>
                    </tr>
                  ) : (
                    displayedAssignments.map((r) => (
                      <tr key={r.id}>
                        <td className="mono">{r.trailerNumber}</td>
                        <td>{r.dockName}</td>
                        <td>{r.goodsName || r.arrivalGoodsName || r._goodsName || "-"}</td>
                        <td>{toFlowProgressLabel(r.purpose || r.arrivalPurpose || r.visitPurpose || "-")}</td>
                        <td>{toDisplayDate(r.dockInAt)}</td>
                        <td>{formatDuration(r.dockInAt)}</td>
                        <td><DockStatusPill status={(r.status || "OCCUPIED").toUpperCase()} /></td>
                        <td className="adm-actions-cell">
                          <button
                            className="dm-btn dm-btnSave"
                            title="Release"
                            type="button"
                            onClick={() => openRelease(r)}
                            style={{ padding: "8px 12px", minWidth: 84 }}
                          >
                            Release
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {assignments.length > ASSIGNMENT_PAGE_SIZE && (
                <div className="adm-footerRow">
                  <div className="adm-showingText">
                    Showing <strong>{Math.min(assignmentVisibleCount, assignments.length)}</strong> of{" "}
                    <strong>{assignments.length}</strong>
                  </div>
                  <div className="adm-footerRight">
                    {!allAssignmentsLoaded ? (
                      <button
                        type="button"
                        className="adm-loadMoreBtn"
                        onClick={() =>
                          setAssignmentVisibleCount((p) => p + ASSIGNMENT_PAGE_SIZE)
                        }
                      >
                        Load more
                      </button>
                    ) : (
                      <span className="adm-allLoaded">All loaded</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <DockModal
          open={dockModalOpen}
          editingId={editingId}
          facilities={facilities}
          locations={locations}
          form={dockForm}
          setForm={setDockForm}
          loading={loading}
          onClose={closeDockModal}
          onSave={onSaveDock}
        />

        <ReleaseModal
          open={releaseOpen}
          loading={loading}
          form={releaseForm}
          setForm={setReleaseForm}
          onClose={closeRelease}
          onSave={onRelease}
        />

        {!!deleteTarget && (
          <div className="ga-confirmOverlay" onClick={closeDeleteConfirm}>
            <div className="ga-confirmModal" onClick={(e) => e.stopPropagation()}>
              <div className="ga-confirmHead">
                <h3>Delete Dock?</h3>
              </div>
              <div className="ga-confirmBody">
                <p>This action cannot be undone.</p>
                <div className="ga-confirmMeta">
                  <span>{deleteTarget.dockName || "No Dock Name"}</span>
                  <span>{deleteTarget.facilityName || "No Facility"}</span>
                </div>
              </div>
              <div className="ga-confirmActions">
                <button type="button" className="ga-confirmBtn ga-confirmBtn--ghost" onClick={closeDeleteConfirm} disabled={loading}>
                  Cancel
                </button>
                <button type="button" className="ga-confirmBtn ga-confirmBtn--danger" onClick={onDeleteDock} disabled={loading}>
                  {loading ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {assignConfirmOpen && (
          <div className="ga-confirmOverlay" onClick={closeAssignConfirm}>
            <div
              className="ga-confirmModal"
              role="dialog"
              aria-modal="true"
              aria-label="Assign dock confirmation"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="ga-confirmHead">
                <h3>Assign Dock?</h3>
              </div>
              <div className="ga-confirmBody">
                <p>Confirm dock assignment for this trailer.</p>
                <div className="ga-confirmMeta">
                  <span>
                    Trailer: <strong>{selectedArrival?.trailerNumber || "-"}</strong>
                  </span>
                  <span>
                    Dock: <strong>{selectedDock?.dockName || "-"}</strong>
                  </span>
                </div>
              </div>
              <div className="ga-confirmActions">
                <button
                  type="button"
                  className="ga-confirmBtn ga-confirmBtn--ghost"
                  onClick={closeAssignConfirm}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="ga-confirmBtn ga-confirmBtn--danger"
                  onClick={async () => {
                    await onAssignDock();
                    setAssignConfirmOpen(false);
                  }}
                  disabled={loading}
                >
                  {loading ? "Assigning..." : "Assign Dock"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}




