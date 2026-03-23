import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

import YardActivityChart from "../components/YardActivityChart";
import WeatherCard from "../components/WeatherCard";

import { getArrivals, getDepartures } from "../services/gateactivityService";
import { getDocks } from "../services/dockService";
import { getFacilities } from "../services/facilityService";
import { getParkingAssignments } from "../services/parkingAssignmentService";

import { DASHBOARD_REFRESH } from "../utils/events";

const RECENT_PAGE = 4;
const FETCH_PAGE = 50;
const DONUT_COLORS = ["#60a5fa", "#22c55e", "#f59e0b"];

const renderDonutValueLabel = ({ cx, cy, midAngle, outerRadius, value, fill }) => {
  const RADIAN = Math.PI / 180;
  const x = cx + (outerRadius + 16) * Math.cos(-midAngle * RADIAN);
  const y = cy + (outerRadius + 16) * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill={fill}
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      style={{ fontSize: 12, fontWeight: 700 }}
    >
      {value}
    </text>
  );
};

const pick = (obj, ...keys) => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
};

const normalizePaged = (res) => ({
  total: Number(pick(res, "total", "Total") || 0),
  items: pick(res, "items", "Items") || [],
});

async function fetchAllPaged(loader, params = {}) {
  let skip = 0;
  let guard = 0;
  const all = [];

  while (guard < 60) {
    guard += 1;
    const raw = await loader({ ...params, skip, take: FETCH_PAGE });
    const page = normalizePaged(raw);
    const items = Array.isArray(page.items) ? page.items : [];

    if (!items.length) break;
    all.push(...items);
    skip += items.length;
    if (skip >= page.total) break;
  }

  return all;
}

const toIsoDay = (value) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const toDayLabel = (isoDay) => {
  if (!isoDay) return "";
  const d = new Date(`${isoDay}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? isoDay
    : d.toLocaleDateString(undefined, { weekday: "short" });
};

const getRowFacilityId = (row) =>
  String(pick(row, "facilityId", "FacilityId", "facility_id") || "");

const getRowFacilityKey = (row) => {
  const byId = getRowFacilityId(row).trim();
  if (byId) return byId;
  return String(pick(row, "facilityName", "FacilityName") || "").trim().toLowerCase();
};

const normalizeTrailer = (value) =>
  String(value || "").trim().toUpperCase().replace(/\s+/g, "");

const parseDateTime = (dateValue, timeValue, fallback) => {
  const date = String(dateValue || "").trim();
  const time = String(timeValue || "").trim();

  if (fallback) {
    const dt = new Date(fallback);
    if (!Number.isNaN(dt.getTime())) return dt;
  }

  if (!date) return null;

  const isoCandidate = `${date}${time ? `T${time}` : "T00:00:00"}`;
  const dt = new Date(isoCandidate);
  if (!Number.isNaN(dt.getTime())) return dt;

  const onlyDate = new Date(date);
  if (!Number.isNaN(onlyDate.getTime())) return onlyDate;

  return null;
};

const formatYardDuration = (entryAt, exitAt) => {
  if (!entryAt) return "-";
  const start = new Date(entryAt).getTime();
  const end = new Date(exitAt || Date.now()).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return "-";

  const totalMinutes = Math.floor((end - start) / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const mins = totalMinutes % 60;

  if (days > 0) {
    if (hours > 0) return `${days} day${days > 1 ? "s" : ""} ${hours}h`;
    return `${days} day${days > 1 ? "s" : ""}`;
  }
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
};

const mergeRecent = (arrivals, departures) => {
  const byKey = new Map();
  const arrivalByActivityId = new Map();

  const getRowKey = (raw) => {
    const facilityKey = getRowFacilityKey(raw);
    const trailer = normalizeTrailer(pick(raw, "trailerNumber", "TrailerNumber", "vehicleNumber", "VehicleNumber"));
    if (!trailer) return "";
    return `${facilityKey}__${trailer}`;
  };

  const rowTime = (raw) =>
    new Date(
      pick(raw, "createdAtUtc", "CreatedAtUtc", "updatedAt", "UpdatedAt") ||
      pick(raw, "date", "Date", "timeIn", "TimeIn", "timeOut", "TimeOut") ||
      0
    ).getTime();

  const upsert = (raw, type) => {
    const key = getRowKey(raw);
    if (!key) return;

    const trailerNumber = String(
      pick(raw, "trailerNumber", "TrailerNumber", "vehicleNumber", "VehicleNumber") || ""
    ).trim();
    const createdAtUtc =
      pick(raw, "createdAtUtc", "CreatedAtUtc", "updatedAt", "UpdatedAt") ||
      pick(raw, "date", "Date", "timeIn", "TimeIn", "timeOut", "TimeOut") ||
      null;
    const rowId = pick(raw, "id", "Id", "activityId", "ActivityId") || `${type}_${key}_${createdAtUtc}`;

    const existing = byKey.get(key) || {
      id: rowId,
      trailerType: null,
      trailerNumber,
      facilityId: null,
      facilityName: null,
      locationName: null,
      timeIn: null,
      timeOut: null,
      gateIn: null,
      gateOut: null,
      carrierName: null,
      arrivalPurpose: null,
      departurePurpose: null,
      arrivalStatus: null,
      departureStatus: null,
      refArrivalActivityId: null,
      arrivalCreatedAtUtc: null,
      departureCreatedAtUtc: null,
      createdAtUtc: null,
      entryAt: null,
      exitAt: null,
    };

    existing.trailerNumber = trailerNumber || existing.trailerNumber;
    existing.trailerType = pick(raw, "trailerType", "TrailerType", "vehicleType", "VehicleType") || existing.trailerType;
    existing.facilityId = getRowFacilityId(raw) || existing.facilityId;
    existing.facilityName = pick(raw, "facilityName", "FacilityName") || existing.facilityName;
    existing.locationName = pick(raw, "locationName", "LocationName") || existing.locationName;
    existing.carrierName = pick(raw, "carrierName", "CarrierName") || existing.carrierName;

    const incomingTs = rowTime(raw);

    if (type === "arrival") {
      const prevTs = new Date(existing.arrivalCreatedAtUtc || 0).getTime();
      if (!existing.arrivalCreatedAtUtc || incomingTs >= prevTs) {
        existing.timeIn = pick(raw, "timeIn", "TimeIn") || existing.timeIn;
        existing.gateIn = pick(raw, "gateNo", "GateNo", "gate", "Gate") || existing.gateIn;
        existing.arrivalPurpose = pick(raw, "purpose", "Purpose", "visitPurpose", "VisitPurpose") || existing.arrivalPurpose;
        const s = pick(raw, "status", "Status");
        if (s) existing.arrivalStatus = s;
        existing.arrivalCreatedAtUtc = createdAtUtc;
        const entryAt = parseDateTime(
          pick(raw, "date", "Date"),
          pick(raw, "timeIn", "TimeIn"),
          pick(raw, "createdAtUtc", "CreatedAtUtc")
        );
        if (entryAt) existing.entryAt = entryAt.toISOString();
      }
      const activityId = String(pick(raw, "activityId", "ActivityId") || "").trim();
      if (activityId) {
        arrivalByActivityId.set(activityId, {
          gateNo: pick(raw, "gateNo", "GateNo", "gate", "Gate") || null,
          entryAt: existing.entryAt,
        });
      }
    } else {
      const prevTs = new Date(existing.departureCreatedAtUtc || 0).getTime();
      if (!existing.departureCreatedAtUtc || incomingTs >= prevTs) {
        existing.timeOut = pick(raw, "timeOut", "TimeOut") || existing.timeOut;
        existing.gateOut =
          pick(raw, "exitGateNo", "ExitGateNo", "exitGate", "ExitGate") || existing.gateOut;
        existing.departurePurpose = pick(raw, "purpose", "Purpose", "visitPurpose", "VisitPurpose") || existing.departurePurpose;
        const s = pick(raw, "status", "Status", "finalStatus", "FinalStatus");
        if (s) existing.departureStatus = s;
        existing.refArrivalActivityId =
          pick(raw, "refArrivalActivityId", "RefArrivalActivityId") || existing.refArrivalActivityId;
        existing.departureCreatedAtUtc = createdAtUtc;
        const exitAt = parseDateTime(
          pick(raw, "date", "Date"),
          pick(raw, "timeOut", "TimeOut"),
          pick(raw, "createdAtUtc", "CreatedAtUtc")
        );
        if (exitAt) existing.exitAt = exitAt.toISOString();
      }
    }

    const latestTs = Math.max(
      new Date(existing.arrivalCreatedAtUtc || 0).getTime(),
      new Date(existing.departureCreatedAtUtc || 0).getTime()
    );
    existing.createdAtUtc = Number.isFinite(latestTs) && latestTs > 0 ? new Date(latestTs).toISOString() : existing.createdAtUtc;

    byKey.set(key, existing);
  };

  (arrivals || []).forEach((r) => upsert(r, "arrival"));
  (departures || []).forEach((r) => upsert(r, "departure"));

  return Array.from(byKey.values())
    .map((r) => {
      const byRef = r.refArrivalActivityId
        ? arrivalByActivityId.get(String(r.refArrivalActivityId).trim())
        : null;
      const gateIn = byRef?.gateNo || r.gateIn || null;
      const entryAt = byRef?.entryAt || r.entryAt || null;
      return {
        ...r,
        gateIn,
        entryAt,
        status: r.timeOut ? "Exited" : (r.arrivalStatus || "-"),
        yardDuration: formatYardDuration(entryAt, r.exitAt),
      };
    })
    .sort((a, b) => new Date(b.createdAtUtc || 0).getTime() - new Date(a.createdAtUtc || 0).getTime());
};

const statusToBadgeClass = (status = "") => {
  const s = String(status).toLowerCase().trim();
  if (s === "waiting") return "status-badge badge-waiting";
  if (s === "entered") return "status-badge badge-entered";
  if (s === "exited") return "status-badge badge-exited";
  return "status-badge";
};

export default function DashboardHome() {
  const [arrivals, setArrivals] = useState([]);
  const [departures, setDepartures] = useState([]);
  const [availableDocks, setAvailableDocks] = useState([]);
  const [parkingAssignments, setParkingAssignments] = useState([]);

  const [recentVisible, setRecentVisible] = useState(RECENT_PAGE);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentSearch, setRecentSearch] = useState("");

  const [pageError, setPageError] = useState("");
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState("");
  const [facilities, setFacilities] = useState([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState("all");

  const loadDashboardData = async () => {
    setRecentLoading(true);
    setPageError("");
    try {
      const [arrivalRows, departureRows, availableDockRows, parkingRows, facilityRes] = await Promise.all([
        fetchAllPaged(getArrivals),
        fetchAllPaged(getDepartures),
        fetchAllPaged((p) => getDocks({ ...p, status: "AVAILABLE" })),
        fetchAllPaged((p) => getParkingAssignments({ ...p, activeOnly: true })),
        getFacilities({ search: "", skip: 0, take: 200 }),
      ]);

      setArrivals(Array.isArray(arrivalRows) ? arrivalRows : []);
      setDepartures(Array.isArray(departureRows) ? departureRows : []);
      setAvailableDocks(Array.isArray(availableDockRows) ? availableDockRows : []);
      setParkingAssignments(Array.isArray(parkingRows) ? parkingRows : []);

      const rawFacilities = Array.isArray(facilityRes) ? facilityRes : (facilityRes?.items || []);
      const list = rawFacilities
        .map((f) => ({
          id: String(pick(f, "id", "Id") || ""),
          facilityName: String(pick(f, "facilityName", "FacilityName", "name", "Name") || ""),
        }))
        .filter((f) => f.id);
      setFacilities(list);
    } catch (err) {
      setPageError(err?.response?.data?.message || err?.message || "Dashboard API error.");
    } finally {
      setRecentLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    const handler = () => loadDashboardData();
    window.addEventListener(DASHBOARD_REFRESH, handler);
    return () => window.removeEventListener(DASHBOARD_REFRESH, handler);
  }, []);

  useEffect(() => {
    setRecentVisible(RECENT_PAGE);
  }, [selectedFacilityId, recentSearch]);

  useEffect(() => {
    const loadWeather = async () => {
      try {
        const city = "Kathmandu";
        const key = process.env.REACT_APP_OPENWEATHER_KEY;
        if (!key) {
          setWeatherError("Missing API key. Add REACT_APP_OPENWEATHER_KEY in .env and restart.");
          return;
        }
        const res = await axios.get(
          `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${key}&units=metric`
        );
        setWeather(res.data);
        setWeatherError("");
      } catch {
        setWeatherError("Weather unavailable (check key / internet).");
      }
    };
    loadWeather();
  }, []);

  const filteredArrivals = useMemo(() => {
    if (selectedFacilityId === "all") return arrivals;
    return arrivals.filter((r) => getRowFacilityId(r) === String(selectedFacilityId));
  }, [arrivals, selectedFacilityId]);

  const filteredDepartures = useMemo(() => {
    if (selectedFacilityId === "all") return departures;
    return departures.filter((r) => getRowFacilityId(r) === String(selectedFacilityId));
  }, [departures, selectedFacilityId]);

  const filteredAvailableDocks = useMemo(() => {
    if (selectedFacilityId === "all") return availableDocks;
    return availableDocks.filter((r) => getRowFacilityId(r) === String(selectedFacilityId));
  }, [availableDocks, selectedFacilityId]);

  const filteredParkingAssignments = useMemo(() => {
    if (selectedFacilityId === "all") return parkingAssignments;
    return parkingAssignments.filter((r) => getRowFacilityId(r) === String(selectedFacilityId));
  }, [parkingAssignments, selectedFacilityId]);

  const todayIso = toIsoDay(new Date());

  const counts = useMemo(() => {
    const arrivalsToday = filteredArrivals.filter((r) => {
      const day = toIsoDay(pick(r, "date", "Date", "createdAtUtc", "CreatedAtUtc", "timeIn", "TimeIn"));
      return day === todayIso;
    }).length;

    const departuresToday = filteredDepartures.filter((r) => {
      const day = toIsoDay(pick(r, "date", "Date", "createdAtUtc", "CreatedAtUtc", "timeOut", "TimeOut"));
      return day === todayIso;
    }).length;

    const availableDocksCount = filteredAvailableDocks.length;
    const trucksInParking = filteredParkingAssignments.length;
    const trucksInYard = Math.max(0, filteredArrivals.length - filteredDepartures.length);

    return { trucksInYard, arrivalsToday, availableDocksCount, trucksInParking, departuresToday };
  }, [filteredArrivals, filteredDepartures, filteredAvailableDocks, filteredParkingAssignments, todayIso]);

  const weekly = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      days.push({ iso, day: toDayLabel(iso), arrivals: 0, departures: 0 });
    }
    const map = new Map(days.map((d) => [d.iso, d]));

    filteredArrivals.forEach((r) => {
      const iso = toIsoDay(pick(r, "date", "Date", "createdAtUtc", "CreatedAtUtc", "timeIn", "TimeIn"));
      if (map.has(iso)) map.get(iso).arrivals += 1;
    });

    filteredDepartures.forEach((r) => {
      const iso = toIsoDay(pick(r, "date", "Date", "createdAtUtc", "CreatedAtUtc", "timeOut", "TimeOut"));
      if (map.has(iso)) map.get(iso).departures += 1;
    });

    return days.map(({ day, arrivals: a, departures: d }) => ({ day, arrivals: a, departures: d }));
  }, [filteredArrivals, filteredDepartures]);

  const mergedRecent = useMemo(
    () => mergeRecent(filteredArrivals, filteredDepartures),
    [filteredArrivals, filteredDepartures]
  );

  const filteredRecent = useMemo(() => {
    const s = recentSearch.trim().toLowerCase();
    return mergedRecent.filter((r) => {
      const trailer = String(r.trailerNumber || "").toLowerCase();
      const trailerType = String(r.trailerType || "").toLowerCase();
      const carrier = String(r.carrierName || "").toLowerCase();
      const facility = String(r.facilityName || "").toLowerCase();
      const location = String(r.locationName || "").toLowerCase();
      const arrivalPurpose = String(r.arrivalPurpose || "").toLowerCase();
      const status = String(r.status || "").toLowerCase();
      if (!s) return true;
      return trailer.includes(s) ||
        trailerType.includes(s) ||
        carrier.includes(s) ||
        facility.includes(s) ||
        location.includes(s) ||
        arrivalPurpose.includes(s) ||
        status.includes(s);
    });
  }, [mergedRecent, recentSearch]);

  const visibleRecent = useMemo(
    () => filteredRecent.slice(0, recentVisible),
    [filteredRecent, recentVisible]
  );
  const canLoadMoreRecent = recentVisible < filteredRecent.length;

  const inboundOutboundChartData = useMemo(() => {
    const departedTrailers = new Set(
      filteredDepartures
        .map((r) => normalizeTrailer(pick(r, "trailerNumber", "TrailerNumber", "vehicleNumber", "VehicleNumber")))
        .filter(Boolean)
    );

    const classify = (scope) => {
      const rows = filteredArrivals.filter((r) => {
        const p = String(pick(r, "purpose", "Purpose", "visitPurpose", "VisitPurpose") || "").toLowerCase();
        return p.includes(scope);
      });
      const total = rows.length;
      const departed = rows.filter((r) => {
        const t = normalizeTrailer(pick(r, "trailerNumber", "TrailerNumber", "vehicleNumber", "VehicleNumber"));
        return t && departedTrailers.has(t);
      }).length;
      const inYard = Math.max(0, total - departed);
      return [
        { name: "In Yard", value: inYard },
        { name: "Departed", value: departed },
      ];
    };

    return {
      inbound: classify("inbound"),
      outbound: classify("outbound"),
    };
  }, [filteredArrivals, filteredDepartures]);

  const kpis = useMemo(
    () => [
      { icon: "🚚", value: counts.trucksInYard ?? 0, label: "Trucks In Yard" },
      { icon: "🚛", value: counts.arrivalsToday ?? 0, label: "Arrivals Today" },
      { icon: "📦", value: counts.availableDocksCount ?? 0, label: "Available Docks" },
      { icon: "🅿️", value: counts.trucksInParking ?? 0, label: "Trucks in Parking" },
      { icon: "➡️", value: counts.departuresToday ?? 0, label: "Departures Today" },
    ],
    [counts]
  );

  return (
    <>
      {pageError && (
        <div className="adm-error" style={{ marginBottom: 12 }}>
          {pageError}
        </div>
      )}

      <div className="kpi-topbar">
        <select
          className="kpi-facilitySelect"
          value={selectedFacilityId}
          onChange={(e) => setSelectedFacilityId(e.target.value)}
        >
          <option value="all">All Facilities</option>
          {facilities.map((f) => (
            <option key={f.id} value={f.id}>
              {f.facilityName}
            </option>
          ))}
        </select>
      </div>

      <div className="kpi-grid">
        {kpis.map((k, idx) => (
          <div key={idx} className="kpi-card" style={{ textAlign: "left" }}>
            <div className="kpi-icon">{k.icon}</div>
            <div className="kpi-info">
              <div className="kpi-value">{k.value}</div>
              <div className="kpi-label">{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mid-row">
        <div className="mid-left">
          <YardActivityChart data={weekly} />
        </div>
        <div className="mid-right">
          <WeatherCard weather={weather} error={weatherError} />
        </div>
      </div>

      <div className="recent-row">
        <div className="table-panel glass">
          <div
            className="table-head"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            <div>
              <h3 style={{ margin: 0 }}>Recent Gate Activity</h3>
              <span className="table-sub">Latest arrival/departure updates</span>
            </div>
            <div style={{ opacity: 0.8 }}>
              Total: <b>{filteredRecent.length}</b>
            </div>
          </div>

          <div className="recent-search" style={{ margin: "10px 0 12px" }}>
            <input
              className="recent-search-input"
              placeholder="Search by trailer no, facility, location, purpose, status..."
              value={recentSearch}
              onChange={(e) => setRecentSearch(e.target.value)}
            />
          </div>

          <div className="table-wrap" style={{ overflowX: "auto" }}>
            <table className="yms-table recent-gate-table" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th>Trailer No</th>
                  <th>Facility</th>
                  <th>Entry Gate</th>
                  <th>Exit Gate</th>
                  <th>Time In Yard</th>
                  <th>Purpose</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {visibleRecent.map((r) => (
                  <tr key={r.id}>
                    <td className="mono">{r.trailerNumber || "-"}</td>
                    <td>{r.facilityName || "-"}</td>
                    <td>{r.gateIn || "-"}</td>
                    <td>{r.gateOut || "-"}</td>
                    <td>{r.yardDuration || "-"}</td>
                    <td>{r.arrivalPurpose || "-"}</td>
                    <td>
                      <span className={statusToBadgeClass(r.status)}>
                        {r.status || "-"}
                      </span>
                    </td>
                  </tr>
                ))}

                {visibleRecent.length === 0 && (
                  <tr>
                    <td
                      colSpan="7"
                      style={{ opacity: 0.7, textAlign: "center", padding: "18px" }}
                    >
                      No recent gate activity.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {canLoadMoreRecent && (
              <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                <button
                  className="adm-loadMoreBtn"
                  type="button"
                  disabled={recentLoading}
                  onClick={() => setRecentVisible((n) => n + RECENT_PAGE)}
                  style={{
                    background: "#fde8e8",
                    borderColor: "#f5c2c2",
                    color: "#7f1d1d",
                  }}
                >
                  {recentLoading ? "Loading..." : "Load more"}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="table-panel glass" style={{ padding: 12 }}>
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ border: "1px solid rgba(148,163,184,0.25)", borderRadius: 14, padding: 10 }}>
              <div style={{ fontWeight: 700, marginBottom: 2 }}>Inbound Statistics</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: "1 1 auto", minWidth: 0 }}>
                  <ResponsiveContainer width="100%" height={145}>
                    <PieChart>
                      <Pie
                        data={inboundOutboundChartData.inbound}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={38}
                        outerRadius={56}
                        labelLine
                        label={renderDonutValueLabel}
                      >
                        {inboundOutboundChartData.inbound.map((entry, idx) => (
                          <Cell key={`in-${entry.name}-${idx}`} fill={DONUT_COLORS[idx % DONUT_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: "grid", gap: 8, fontSize: 12, minWidth: 130 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: DONUT_COLORS[0], display: "inline-block" }} />
                    Blue = In Yard
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: DONUT_COLORS[1], display: "inline-block" }} />
                    Green = Departed
                  </span>
                </div>
              </div>
            </div>
            <div style={{ border: "1px solid rgba(148,163,184,0.25)", borderRadius: 14, padding: 10 }}>
              <div style={{ fontWeight: 700, marginBottom: 2 }}>Outbound Statistics</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: "1 1 auto", minWidth: 0 }}>
                  <ResponsiveContainer width="100%" height={145}>
                    <PieChart>
                      <Pie
                        data={inboundOutboundChartData.outbound}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={38}
                        outerRadius={56}
                        labelLine
                        label={renderDonutValueLabel}
                      >
                        {inboundOutboundChartData.outbound.map((entry, idx) => (
                          <Cell key={`out-${entry.name}-${idx}`} fill={DONUT_COLORS[idx % DONUT_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: "grid", gap: 8, fontSize: 12, minWidth: 130 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: DONUT_COLORS[0], display: "inline-block" }} />
                    Blue = In Yard
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: DONUT_COLORS[1], display: "inline-block" }} />
                    Green = Departed
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
