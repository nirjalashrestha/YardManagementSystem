
import { useEffect, useMemo, useState } from "react";
import "../styles/dashboard.css";
import {
  FiEdit2,
  FiTrash2,
  FiSearch,
  FiPlus,
  FiRefreshCw,
  FiFileText,
  FiEye,
} from "react-icons/fi";

import { getCarriers } from "../services/carrierService";
import { getFacilities } from "../services/facilityService";
import { getLocations } from "../services/locationService";
import { getVehicles } from "../services/vehicleService";
import { getArrivals } from "../services/gateactivityService";

import {
  getInspections,
  createInspection,
  updateInspection,
  deleteInspection,
} from "../services/inspectionService";

const PAGE_SIZE = 6;

const STATUS_OPTIONS = [
  { value: "Pending", label: "Pending" },
  { value: "In Progress", label: "In Progress" },
  { value: "Completed", label: "Passed" },
  { value: "Cancelled", label: "Failed" },
];
const statusLabel = (status) => {
  const s = String(status || "").trim().toLowerCase();
  if (s === "completed") return "Passed";
  if (s === "cancelled") return "Failed";
  return status;
};
const statusClass = (status) => {
  const s = String(status || "").trim().toUpperCase().replace(/\s+/g, "_");
  if (s === "PENDING") return "ym-pill--pending";
  if (s === "IN_PROGRESS") return "ym-pill--progress";
  if (s === "COMPLETED" || s === "PASSED") return "ym-pill--completed";
  if (s === "CANCELLED" || s === "FAILED") return "ym-pill--cancelled";
  return "ym-pill--pending";
};

const ISSUE_OPTIONS = [
  "Brake Issue",
  "Light Issue",
  "Tire Issue",
  "Door Issue",
  "Leak",
  "Damage",
  "Missing Seal",
  "Other",
];

const AREA_OPTIONS = [
  "Front",
  "Back",
  "Left",
  "Right",
  "Top",
  "Underbody",
  "Inside",
  "Other",
];

const today = () => new Date().toISOString().slice(0, 10);
const nowTime = () => new Date().toTimeString().slice(0, 5);
const toDisplayTime = (time) => {
  const t = String(time || "").trim();
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return t || "-";
  let hh = Number(m[1]);
  const mm = m[2];
  const ampm = hh >= 12 ? "PM" : "AM";
  hh = hh % 12;
  if (hh === 0) hh = 12;
  return `${hh}:${mm} ${ampm}`;
};

export default function ManageInspection() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [facilityFilter, setFacilityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // dropdown sources
  const [carriers, setCarriers] = useState([]);
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
  const [mode, setMode] = useState("add"); // add | edit | view

  // ui
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const allLoaded = shown >= total;

  const [form, setForm] = useState({
    date: today(),
    time: nowTime(),
    carrierId: "",
    trailerNumber: "",
    facilityId: "",
    locationId: "",
    issue: ISSUE_OPTIONS[0],
    area: AREA_OPTIONS[0],
    status: "Pending",
    remarks: "",
  });

  const isView = mode === "view";

  const ensureCarrierId = (carrierId, list) => {
    if (carrierId && list.some((c) => c.id === carrierId)) return carrierId;
    return list[0]?.id || "";
  };

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
        const carrierRes = defaultFacilityId
          ? await getCarriers({ search: "", facilityId: defaultFacilityId, skip: 0, take: 200 })
          : { items: [] };
        const cList = carrierRes?.items || [];
        setCarriers(cList);
        const defaultCarrierId = cList[0]?.id || "";

        let locList = [];
        if (defaultFacilityId) {
          const locRes = await getLocations({
            facilityId: defaultFacilityId,
            search: "",
            skip: 0,
            take: 200,
          });
          locList = locRes.items || [];
          setLocations(locList);
        } else {
          setLocations([]);
        }

        setForm((p) => ({
          ...p,
          carrierId: p.carrierId || defaultCarrierId,
          facilityId: p.facilityId || defaultFacilityId,
          locationId: p.locationId || (locList[0]?.id || ""),
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
      const locRes = await getLocations({
        facilityId,
        search: "",
        skip: 0,
        take: 200,
      });
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

  const loadCarriersForFacility = async (facilityId) => {
    try {
      if (!facilityId) {
        setCarriers([]);
        return [];
      }
      const cRes = await getCarriers({ search: "", facilityId, skip: 0, take: 200 });
      const list = cRes?.items || [];
      setCarriers(list);
      return list;
    } catch (e) {
      setErr(e?.message || String(e));
      setCarriers([]);
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
        setCarriers([]);
        setForm((p) => ({ ...p, locationId: "", carrierId: "" }));
        return;
      }
      const [locList, cList] = await Promise.all([
        loadLocationsForFacility(form.facilityId),
        loadCarriersForFacility(form.facilityId),
      ]);
      const trackedLocationId = await resolveLocationFromTrailer(
        form.facilityId,
        form.trailerNumber,
        locList
      );
      setForm((p) => ({
        ...p,
        locationId: trackedLocationId || "",
        carrierId: ensureCarrierId(p.carrierId, cList),
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

      const data = await getInspections({
        search: q,
        status: statusFilter,
        skip,
        take,
      });

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

  const onLoadMore = () => {
    if (!loading && !allLoaded) fetchPage({ reset: false });
  };

  const filteredRows = useMemo(() => {
    if (facilityFilter === "all") return rows;
    return rows.filter((r) => String(r?.facilityId || "") === String(facilityFilter));
  }, [rows, facilityFilter]);
  const visibleRows = useMemo(() => filteredRows.slice(0, visibleCount), [filteredRows, visibleCount]);
  const allLoadedFiltered = visibleCount >= filteredRows.length;


  const resetForm = async () => {
    const defaultFacilityId = facilities[0]?.id || "";

    const [locList, cList] = await Promise.all([
      defaultFacilityId ? loadLocationsForFacility(defaultFacilityId) : Promise.resolve([]),
      defaultFacilityId ? loadCarriersForFacility(defaultFacilityId) : Promise.resolve([]),
    ]);
    const defaultLocationId = locList[0]?.id || "";
    const defaultCarrierId = cList[0]?.id || "";

    setEditingId(null);
    setMode("add");
    setForm({
      date: today(),
      time: nowTime(),
      carrierId: defaultCarrierId,
      trailerNumber: "",
      facilityId: defaultFacilityId,
      locationId: defaultLocationId,
      issue: ISSUE_OPTIONS[0],
      area: AREA_OPTIONS[0],
      status: "Pending",
      remarks: "",
    });
  };

  const openAdd = async () => {
    await resetForm();
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setEditingId(null);
    setMode("add");
  };

  const openView = async (r) => {
    setEditingId(r.id);
    setMode("view");
    setOpen(true);

    const [locList, cList] = await Promise.all([
      loadLocationsForFacility(r.facilityId),
      loadCarriersForFacility(r.facilityId),
    ]);
    const firstLoc = locList[0]?.id || "";

    setForm({
      date: r.date,
      time: r.time,
      carrierId: ensureCarrierId(r.carrierId, cList),
      trailerNumber: r.trailerNumber || "",
      facilityId: r.facilityId,
      locationId: r.locationId || firstLoc,
      issue: r.issue || ISSUE_OPTIONS[0],
      area: r.area || AREA_OPTIONS[0],
      status: r.status || "Pending",
      remarks: r.remarks || "",
    });
  };

  const openEdit = async (r) => {
    setEditingId(r.id);
    setMode("edit");
    setOpen(true);

    const [locList, cList] = await Promise.all([
      loadLocationsForFacility(r.facilityId),
      loadCarriersForFacility(r.facilityId),
    ]);
    const firstLoc = locList[0]?.id || "";

    setForm({
      date: r.date,
      time: r.time,
      carrierId: ensureCarrierId(r.carrierId, cList),
      trailerNumber: r.trailerNumber || "",
      facilityId: r.facilityId,
      locationId: r.locationId || firstLoc,
      issue: r.issue || ISSUE_OPTIONS[0],
      area: r.area || AREA_OPTIONS[0],
      status: r.status || "Pending",
      remarks: r.remarks || "",
    });
  };


  const isValid = useMemo(() => {
    return (
      !!form.date &&
      !!form.time &&
      !!form.carrierId &&
      !!form.trailerNumber &&
      !!form.facilityId &&
      !!form.locationId &&
      !!form.issue &&
      !!form.area &&
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
        carrierId: form.carrierId,
        trailerNumber: (form.trailerNumber || "").trim().toUpperCase().replace(/\s+/g, ""),
        facilityId: form.facilityId,
        locationId: form.locationId,
        issue: form.issue,
        area: form.area,
        status: form.status,
        remarks: (form.remarks || "").trim() || null,
      };

      if (editingId) await updateInspection(editingId, payload);
      else await createInspection(payload);

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
      await deleteInspection(deleteTarget.id);
      await fetchPage({ reset: true });
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
      issue: row?.issue || "",
    });
  };

  const closeDeleteConfirm = () => {
    if (loading) return;
    setDeleteTarget(null);
  };


  const onExportCsv = () => {
    const header = ["Date", "Time", "Carrier", "Trailer", "Facility", "Location", "Issue", "Area", "Status", "Remarks"];

    const lines = [
      header.join(","),
      ...rows.map((r) =>
        [
          r.date,
          r.time,
          r.carrierName,
          r.trailerNumber,
          r.facilityName,
          r.locationName,
          r.issue,
          r.area,
          r.status,
          r.remarks,
        ]
          .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
          .join(",")
      ),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inspections_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="adm-page">
      <div className="adm-card glass">
        <div className="adm-head">
          <h2 className="adm-title">Inspection Management</h2>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button className="adm-act" title="Refresh" type="button" onClick={onRefresh}>
              <FiRefreshCw />
            </button>
            <button className="adm-act" title="Export CSV" type="button" onClick={onExportCsv}>
              <FiFileText />
            </button>
            <button className="adm-addBtn" onClick={openAdd} type="button">
              <FiPlus /> Add Inspection
            </button>
          </div>
        </div>

        <div className="adm-filters">
          <div className="adm-search">
            <FiSearch />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search trailer, carrier, facility, location..." />
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
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {err && <div className="adm-error">{err}</div>}

        <div className="adm-tableWrap">
          <div className="adm-tableTitleRow">
            <div className="adm-tableTitle">Inspection List</div>
            <div className="adm-totalPill">Total: {filteredRows.length}</div>
          </div>

          <table className="adm-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Carrier</th>
                <th>Trailer</th>
                <th>Facility</th>
                <th>Location</th>
                <th>Issue</th>
                <th>Area</th>
                <th>Status</th>
               
                <th style={{ width: 160 }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredRows.length === 0 && !loading ? (
                <tr>
                  <td colSpan="10" className="adm-empty">No inspections found.</td>
                </tr>
              ) : (
                visibleRows.map((r) => (
                  <tr key={r.id}>
                    <td className="mono">{r.date}</td>
                    <td className="mono">{toDisplayTime(r.time)}</td>
                    <td>{r.carrierName}</td>
                    <td className="mono">{r.trailerNumber}</td>
                    <td>{r.facilityName}</td>
                    <td>{r.locationName || "-"}</td>
                    <td>{r.issue || "-"}</td>
                    <td>{r.area || "-"}</td>
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
              {filteredRows.length > 0 && !allLoadedFiltered && (
                <button type="button" className="adm-loadMoreBtn" onClick={onLoadMore} disabled={loading}>
                  {loading ? "Loading..." : "Load more"}
                </button>
              )}
              {filteredRows.length > 0 && allLoadedFiltered && <span className="adm-allLoaded">All loaded</span>}
            </div>
          </div>
        </div>

        {/* MODAL */}
        {open && (
          <div className="ym-modalOverlay" onClick={closeModal}>
            <div className="ym-modal glass" onClick={(e) => e.stopPropagation()}>
              <div className="ym-modalTop">
                <h3 className="ym-modalTitle">
                  {mode === "view" ? "View Inspection" : mode === "edit" ? "Edit Inspection" : "Add Inspection"}
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
                      list="inspection-trailer-options"
                      value={form.trailerNumber}
                      disabled={isView}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          trailerNumber: String(e.target.value || "").toUpperCase(),
                        }))
                      }
                      placeholder="TRL-0001"
                    />
                    <datalist id="inspection-trailer-options">
                      {vehicles.map((v) => (
                        <option key={(v.trailerNumber || "").toUpperCase()} value={(v.trailerNumber || "").toUpperCase()} />
                      ))}
                    </datalist>
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
                    <label>Carrier</label>
                    <select value={form.carrierId} disabled={isView || !form.facilityId}
                      onChange={(e) => setForm((p) => ({ ...p, carrierId: e.target.value }))}>
                      {!form.facilityId && <option value="">Select facility first</option>}
                      {form.facilityId && carriers.length === 0 && (
                        <option value="">No carriers for this facility</option>
                      )}
                      {form.facilityId &&
                        carriers.map((c) => (
                          <option key={c.id} value={c.id}>{c.carrierName}</option>
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
                    <label>Issue</label>
                    <select value={form.issue} disabled={isView}
                      onChange={(e) => setForm((p) => ({ ...p, issue: e.target.value }))}>
                      {ISSUE_OPTIONS.map((x) => <option key={x} value={x}>{x}</option>)}
                    </select>
                  </div>

                  <div className="ym-field">
                    <label>Area</label>
                    <select value={form.area} disabled={isView}
                      onChange={(e) => setForm((p) => ({ ...p, area: e.target.value }))}>
                      {AREA_OPTIONS.map((x) => <option key={x} value={x}>{x}</option>)}
                    </select>
                  </div>

                  <div className="ym-field">
                    <label>Status</label>
                    <select value={form.status} disabled={isView}
                      onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                      {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>

                  <div className="ym-field">
                    <label>Remarks (optional)</label>
                    <input value={form.remarks} disabled={isView}
                      onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))} />
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
                <h3>Delete Inspection?</h3>
              </div>
              <div className="ga-confirmBody">
                <p>This action cannot be undone.</p>
                <div className="ga-confirmMeta">
                  <span>{deleteTarget.trailerNumber || "No Trailer"}</span>
                  <span>{deleteTarget.issue || "No Issue"}</span>
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
