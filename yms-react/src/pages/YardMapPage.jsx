import { useEffect, useMemo, useState } from "react";
import "../styles/dashboard.css";
import { FiRefreshCw, FiMapPin, FiTruck, FiClock } from "react-icons/fi";

import { getFacilities } from "../services/facilityService";
import { getLocations } from "../services/locationService";
import { getDocks } from "../services/dockService";
import { getParkingSlots } from "../services/parkingSlotService";
import { getDockAssignments } from "../services/dockAssignmentService";
import { getParkingAssignments } from "../services/parkingAssignmentService";
import { getArrivals, getDepartures } from "../services/gateactivityService";
import { getYardMoves } from "../services/yardMoveService";
import { normalizeRole, ROLE } from "../constants/rbac";

const pick = (obj, keys, fallback = null) => {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null) return value;
  }
  return fallback;
};

const toUpper = (v) => String(v || "").trim().toUpperCase();

const normalizeTrailer = (v) =>
  String(v || "").trim().toUpperCase().replace(/\s+/g, "");

const toTs = (v) => {
  const t = new Date(v || 0).getTime();
  return Number.isNaN(t) ? 0 : t;
};

const normalizePaged = (res) => ({
  total: Number(pick(res, ["total", "Total"], 0)),
  items: pick(res, ["items", "Items"], []) || [],
});

async function fetchAllPaged(loader, params = {}, take = 100) {
  let skip = 0;
  let guard = 0;
  const rows = [];

  while (guard < 50) {
    guard += 1;
    const raw = await loader({ ...params, skip, take });
    const page = normalizePaged(raw);
    const items = Array.isArray(page.items) ? page.items : [];
    if (!items.length) break;
    rows.push(...items);
    skip += items.length;
    if (skip >= page.total) break;
  }
  return rows;
}

const classifySpotStatus = (status, occupied = false) => {
  if (occupied) return "occupied";
  const s = toUpper(status);
  if (s === "AVAILABLE") return "available";
  if (s === "MAINTENANCE" || s === "MAINTANENCE") return "maintenance";
  if (s === "BLOCKED" || s === "DAMAGED") return "blocked";
  return "neutral";
};

const isForbidden = (e) => Number(e?.response?.status || 0) === 403;

export default function YardMapPage() {
  const roleKey = normalizeRole(localStorage.getItem("roleKey") || localStorage.getItem("role") || "") || ROLE.VIEW_ONLY;
  const isDriver = roleKey === ROLE.DRIVER;

  const [facilities, setFacilities] = useState([]);
  const [facilityId, setFacilityId] = useState("");

  const [locations, setLocations] = useState([]);
  const [docks, setDocks] = useState([]);
  const [parkingSlots, setParkingSlots] = useState([]);
  const [dockAssignments, setDockAssignments] = useState([]);
  const [parkingAssignments, setParkingAssignments] = useState([]);
  const [arrivals, setArrivals] = useState([]);
  const [departures, setDepartures] = useState([]);
  const [yardMoves, setYardMoves] = useState([]);

  const [selectedSpot, setSelectedSpot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await getFacilities({ search: "", skip: 0, take: 200 });
        const list = res?.items || [];
        setFacilities(list);
        if (list.length) setFacilityId(String(list[0].id || ""));
      } catch (e) {
        if (isForbidden(e)) {
          setFacilities([]);
          setFacilityId("");
          if (!isDriver) setError("You are not allowed to view facility list.");
          return;
        }
        setError(e?.response?.data?.message || e?.message || "Failed to load facilities.");
      }
    })();
  }, [isDriver]);

  const loadMapData = async () => {
    if (!facilityId) return;
    setLoading(true);
    setError("");
    try {
      const [
        locRows,
        dockRows,
        slotRows,
        dockAssignRows,
        parkingAssignRows,
        arrivalRows,
        departureRows,
        moveRows,
      ] = await Promise.all([
        fetchAllPaged((p) => getLocations({ facilityId, search: "", ...p }), {}, 200),
        fetchAllPaged((p) => getDocks({ facilityId, search: "", ...p }), {}, 100),
        fetchAllPaged((p) => getParkingSlots({ facilityId, search: "", ...p }), {}, 100),
        fetchAllPaged((p) => getDockAssignments({ facilityId, activeOnly: false, ...p }), {}, 100),
        fetchAllPaged((p) => getParkingAssignments({ facilityId, activeOnly: false, ...p }), {}, 100),
        fetchAllPaged((p) => getArrivals({ search: "", ...p }), {}, 50),
        fetchAllPaged((p) => getDepartures({ search: "", ...p }), {}, 50),
        fetchAllPaged((p) => getYardMoves({ facilityId, search: "", ...p }), {}, 100),
      ]);

      setLocations(locRows || []);
      setDocks(dockRows || []);
      setParkingSlots(slotRows || []);
      setDockAssignments(dockAssignRows || []);
      setParkingAssignments(parkingAssignRows || []);
      setArrivals((arrivalRows || []).filter((a) => String(a.facilityId || "") === String(facilityId)));
      setDepartures((departureRows || []).filter((d) => String(d.facilityId || "") === String(facilityId)));
      setYardMoves(moveRows || []);
    } catch (e) {
      if (isForbidden(e)) {
        if (!isDriver) setError("You are not allowed to view some yard map data.");
      } else {
        setError(e?.response?.data?.message || e?.message || "Failed to load yard map data.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMapData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilityId]);

  const locationsByType = useMemo(() => {
    const base = { GATE: [], DOCK: [], PARKING: [], INSPECTION: [] };
    (locations || []).forEach((l) => {
      const t = toUpper(l.locationType);
      if (!base[t]) return;
      base[t].push(l);
    });
    Object.values(base).forEach((arr) =>
      arr.sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0))
    );
    return base;
  }, [locations]);

  const activeDockAssignments = useMemo(
    () =>
      (dockAssignments || []).filter(
        (x) => x?.isActive === true || (!x?.dockOutAt && !x?.finalStatus)
      ),
    [dockAssignments]
  );

  const activeParkingAssignments = useMemo(
    () =>
      (parkingAssignments || []).filter(
        (x) => x?.isActive === true || (!x?.parkOutAt && !x?.finalStatus)
      ),
    [parkingAssignments]
  );

  const activeArrivals = useMemo(() => {
    const departedByRef = new Set(
      (departures || [])
        .map((d) => String(d.refArrivalActivityId || d.RefArrivalActivityId || "").trim())
        .filter(Boolean)
    );

    const latestDepartureByTrailer = new Map();
    (departures || []).forEach((d) => {
      const trailer = normalizeTrailer(d.trailerNumber || d.TrailerNumber);
      if (!trailer) return;
      const ts = toTs(d.createdAtUtc || d.CreatedAtUtc || d.date || d.Date);
      const prev = latestDepartureByTrailer.get(trailer) || 0;
      if (ts >= prev) latestDepartureByTrailer.set(trailer, ts);
    });

    return (arrivals || []).filter((a) => {
      const activityId = String(a.activityId || a.ActivityId || "").trim();
      if (activityId && departedByRef.has(activityId)) return false;

      const trailer = normalizeTrailer(a.trailerNumber || a.TrailerNumber);
      if (!trailer) return true;

      const depTs = latestDepartureByTrailer.get(trailer) || 0;
      const arrTs = toTs(a.createdAtUtc || a.CreatedAtUtc || a.date || a.Date);
      return depTs < arrTs;
    });
  }, [arrivals, departures]);

  const latestMoveByTrailer = useMemo(() => {
    const map = new Map();
    (yardMoves || []).forEach((m) => {
      const trailer = normalizeTrailer(m.trailerNumber || m.TrailerNumber);
      if (!trailer) return;
      const ts = toTs(m.moveDateTime || m.updatedAt || m.createdAt);
      const prev = map.get(trailer);
      if (!prev || ts >= prev.ts) map.set(trailer, { row: m, ts });
    });
    return map;
  }, [yardMoves]);

  const dockAssignmentByDockId = useMemo(() => {
    const map = new Map();
    activeDockAssignments.forEach((a) => {
      const id = String(a.dockId || a.DockId || "");
      if (!id) return;
      map.set(id, a);
    });
    return map;
  }, [activeDockAssignments]);

  const parkingAssignmentBySlotId = useMemo(() => {
    const map = new Map();
    activeParkingAssignments.forEach((a) => {
      const id = String(a.parkingSlotId || a.ParkingSlotId || "");
      if (!id) return;
      map.set(id, a);
    });
    return map;
  }, [activeParkingAssignments]);

  const inspectionLoads = useMemo(() => {
    const inspectionIds = new Set(locationsByType.INSPECTION.map((x) => String(x.id)));
    const map = new Map();
    locationsByType.INSPECTION.forEach((x) => map.set(String(x.id), 0));

    activeArrivals.forEach((a) => {
      const trailer = normalizeTrailer(a.trailerNumber || a.TrailerNumber);
      const moved = latestMoveByTrailer.get(trailer)?.row;
      const toLocationId = String(moved?.toLocationId || moved?.ToLocationId || "");
      if (!inspectionIds.has(toLocationId)) return;
      map.set(toLocationId, (map.get(toLocationId) || 0) + 1);
    });
    return map;
  }, [activeArrivals, latestMoveByTrailer, locationsByType]);

  const pendingMoves = useMemo(
    () =>
      (yardMoves || []).filter((m) => {
        const s = toUpper(m.status || m.Status);
        return s === "PENDING" || s === "IN_PROGRESS";
      }),
    [yardMoves]
  );

  const waitingArrivals = useMemo(
    () => activeArrivals.filter((a) => toUpper(a.status || a.Status) === "WAITING"),
    [activeArrivals]
  );

  const facilityTypeLabel = useMemo(() => {
    const current = facilities.find((f) => String(f.id) === String(facilityId));
    const t = String(current?.type || "").trim();
    return t || "Warehouse";
  }, [facilities, facilityId]);

  const kpis = useMemo(() => {
    const occupiedDocks = activeDockAssignments.length;
    const occupiedSlots = activeParkingAssignments.length;
    const waitingAtGate = waitingArrivals.length;
    return {
      inYard: activeArrivals.length,
      occupiedDocks,
      occupiedSlots,
      waitingAtGate,
      pendingMoves: pendingMoves.length,
    };
  }, [activeArrivals.length, activeDockAssignments.length, activeParkingAssignments.length, waitingArrivals.length, pendingMoves.length]);

  return (
    <div className="ymap-page">
      <div className="ymap-head">
        <div>
          <h2 className="adm-title" style={{ marginBottom: 4 }}>Yard Map</h2>
          <div className="dock-panel-sub">Live visual layout from gate, dock, parking, and yard move data.</div>
        </div>
        <div className="ymap-head-actions">
          <select value={facilityId} onChange={(e) => setFacilityId(e.target.value)} className="kpi-facilitySelect">
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>{f.facilityName}</option>
            ))}
          </select>
          <button type="button" className="adm-act" onClick={loadMapData} title="Refresh">
            <FiRefreshCw />
          </button>
        </div>
      </div>

      {error && <div className="adm-error">{error}</div>}

      <div className="ymap-kpis">
        <div className="ymap-kpi"><FiTruck /> In Yard: <b>{kpis.inYard}</b></div>
        <div className="ymap-kpi">Occupied Docks: <b>{kpis.occupiedDocks}</b></div>
        <div className="ymap-kpi">Occupied Slots: <b>{kpis.occupiedSlots}</b></div>
        <div className="ymap-kpi"><FiMapPin /> Waiting Gate: <b>{kpis.waitingAtGate}</b></div>
        <div className="ymap-kpi"><FiClock /> Pending Moves: <b>{kpis.pendingMoves}</b></div>
      </div>

      <div className="ymap-legend">
        <span className="ymap-dot available" /> Available
        <span className="ymap-dot occupied" /> Occupied
        <span className="ymap-dot maintenance" /> Maintenance
        <span className="ymap-dot blocked" /> Blocked
      </div>

      <div className="ymap-grid">
        <section className="glass ymap-canvas">
          <div className="ymap-mapBox">
            <div className="ymap-yardField">
              <div className="ymap-warehouse">{facilityTypeLabel}</div>

              <div className="ymap-lane ymap-lane-dock">
                {docks.length === 0 && <div className="ymap-emptyLine">No docks configured.</div>}
                {docks.map((d) => {
                  const a = dockAssignmentByDockId.get(String(d.id));
                  const occupied = !!a;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      className={`ymap-bay ${classifySpotStatus(d.status, occupied)}`}
                      onClick={() => setSelectedSpot({
                        type: "dock",
                        title: d.dockName,
                        subtitle: a
                          ? `Trailer: ${a.trailerNumber || "-"}`
                          : `Status: ${toUpper(d.status || "AVAILABLE")}`,
                      })}
                      title={d.dockName}
                      aria-label={d.dockName}
                    />
                  );
                })}
              </div>

              <div className="ymap-lane ymap-lane-parking">
                {parkingSlots.length === 0 && <div className="ymap-emptyLine">No parking slots configured.</div>}
                {parkingSlots.map((s) => {
                  const a = parkingAssignmentBySlotId.get(String(s.id));
                  const occupied = !!a;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className={`ymap-bay ymap-bay-small ${classifySpotStatus(s.status, occupied)}`}
                      onClick={() => setSelectedSpot({
                        type: "parking",
                        title: s.slotCode,
                        subtitle: a
                          ? `Trailer: ${a.trailerNumber || "-"}`
                          : `Status: ${toUpper(s.status || "AVAILABLE")}`,
                      })}
                      title={s.slotCode}
                      aria-label={s.slotCode}
                    />
                  );
                })}
              </div>

              <div className="ymap-gateRow">
                {locationsByType.INSPECTION.map((i) => {
                  const load = inspectionLoads.get(String(i.id)) || 0;
                  const occupied = load > 0;
                  return (
                    <button
                      key={i.id}
                      type="button"
                      className={`ymap-chip ${classifySpotStatus("", occupied)}`}
                      onClick={() => setSelectedSpot({
                        type: "inspection",
                        title: i.locationName,
                        subtitle: `${load} truck(s) currently routed here`,
                      })}
                    >
                      {i.locationCode || i.locationName}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </section>

        <aside className="glass ymap-side">
          <div className="ymap-side-block">
            <div className="ymap-side-title">Queue</div>
            <div className="dock-panel-sub">Waiting arrivals and pending yard moves.</div>
            <div className="ymap-queue-list">
              {waitingArrivals.slice(0, 6).map((a) => (
                <div key={`w_${a.id}`} className="ymap-queue-item">
                  <b>{a.trailerNumber || "-"}</b>
                  <span>{a.purpose || "Waiting"}</span>
                </div>
              ))}
              {pendingMoves.slice(0, 6).map((m) => (
                <div key={`m_${m.id}`} className="ymap-queue-item">
                  <b>{m.trailerNumber || "-"}</b>
                  <span>{`${m.fromLocationName || "?"} -> ${m.toLocationName || "?"}`}</span>
                </div>
              ))}
              {waitingArrivals.length === 0 && pendingMoves.length === 0 && (
                <div className="adm-empty">No waiting appointments.</div>
              )}
            </div>
          </div>

          <div className="ymap-side-block">
            <div className="ymap-side-title">Selected Spot</div>
            {selectedSpot ? (
              <div className="ymap-selected">
                <div className="ymap-selected-title">{selectedSpot.title}</div>
                <div className="ymap-selected-sub">{selectedSpot.subtitle}</div>
              </div>
            ) : (
              <div className="dock-panel-sub">Click any map block to inspect details.</div>
            )}
          </div>

        </aside>
      </div>

      {loading && <div className="dock-panel-sub" style={{ marginTop: 10 }}>Loading yard map data...</div>}
    </div>
  );
}


