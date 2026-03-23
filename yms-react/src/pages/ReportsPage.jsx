import { useEffect, useMemo, useRef, useState } from "react";
import "../styles/dashboard.css";
import "../styles/reports.css";
import {
  FiBarChart2,
  FiPieChart,
  FiRefreshCw,
  FiEye,
  FiX,
  FiTruck,
  FiLogIn,
  FiLogOut,
  FiMapPin,
  FiGrid,
  FiArrowRightCircle,
} from "react-icons/fi";
import {
  ResponsiveContainer,
  BarChart,
  LineChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { getArrivals, getDepartures } from "../services/gateactivityService";
import { getDockAssignments } from "../services/dockAssignmentService";
import { getParkingAssignments } from "../services/parkingAssignmentService";
import { getDocks } from "../services/dockService";
import { getVehicles } from "../services/vehicleService";
import { getFacilities } from "../services/facilityService";
import { getUsers } from "../services/userService";

const PAGE_SIZE = 50;
const PIE_COLORS = ["#4cc9f0", "#80ed99", "#f9c74f", "#f8961e", "#f94144", "#9b5de5"];
const KPI_ICONS = {
  "Total In Yard": FiTruck,
  Arrivals: FiLogIn,
  Departures: FiLogOut,
  "In Parking": FiMapPin,
  "Available Dock": FiGrid,
  "Exited From Dock": FiArrowRightCircle,
};

const pick = (obj, keys, fallback = null) => {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null) return value;
  }
  return fallback;
};

const toIsoDay = (value) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const toLabelDay = (isoDay) => {
  if (!isoDay) return "";
  const d = new Date(`${isoDay}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDay;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const toLabelWeekday = (isoDay) => {
  if (!isoDay) return "";
  const d = new Date(`${isoDay}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDay;
  return d.toLocaleDateString(undefined, { weekday: "short" });
};

const normalizePaged = (res) => ({
  total: Number(pick(res, ["total", "Total"], 0)),
  shown: Number(pick(res, ["shown", "Shown"], 0)),
  items: pick(res, ["items", "Items"], []) || [],
});

const formatDateTimeShort = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw || raw === "-") return "-";

  const matched = raw.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})/);
  if (matched) return `${matched[1]} ${matched[2]}`;

  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  }

  return raw;
};

const formatTime = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw || raw === "-") return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

async function fetchAllPaged(loader, params = {}) {
  let skip = 0;
  const all = [];
  let guard = 0;
  while (guard < 50) {
    guard += 1;
    const raw = await loader({ ...params, skip, take: PAGE_SIZE });
    const page = normalizePaged(raw);
    all.push(...page.items);
    if (!page.items.length) break;
    skip += page.items.length;
    if (skip >= page.total) break;
  }
  return all;
}

function ReportModal({
  open,
  onClose,
  mode = "flow",
  arrivalRows,
  departureRows,
  vehicleRows,
  dockRows,
  parkingRows,
  facilities,
  selectedFacilityId,
  onFacilityChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}) {
  const [arrivalVisible, setArrivalVisible] = useState(6);
  const [departureVisible, setDepartureVisible] = useState(6);
  const [vehicleVisible, setVehicleVisible] = useState(6);
  const [dockVisible, setDockVisible] = useState(6);
  const [parkingVisible, setParkingVisible] = useState(6);
  const [flowTab, setFlowTab] = useState("arrivals");

  useEffect(() => {
    if (open) {
      setArrivalVisible(6);
      setDepartureVisible(6);
      setVehicleVisible(6);
      setDockVisible(6);
      setParkingVisible(6);
      setFlowTab("arrivals");
    }
  }, [open, arrivalRows, departureRows, vehicleRows, dockRows, parkingRows, mode]);

  const canLoadMoreArrivals = arrivalVisible < arrivalRows.length;
  const canLoadMoreDepartures = departureVisible < departureRows.length;
  const canLoadMoreVehicles = vehicleVisible < vehicleRows.length;
  const canLoadMoreDock = dockVisible < dockRows.length;
  const canLoadMoreParking = parkingVisible < parkingRows.length;

  const csvCell = (value) => {
    const s = String(value ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const getExportData = () => {
    if (mode === "vehicle") {
      const header = ["Facility", "Trailer Number", "Trailer Type", "Status"];
      const rows = vehicleRows.map((v) => [
        pick(v, ["facilityName", "FacilityName"], "") || pick(v?.facility, ["facilityName", "FacilityName"], "-"),
        pick(v, ["trailerNumber", "TrailerNumber", "vehicleNumber", "VehicleNumber"], "-"),
        pick(v, ["vehicleType", "VehicleType"], "-"),
        String(pick(v, ["status", "Status"], "-")).toUpperCase(),
      ]);
      return { name: "vehicle_status_report", header, rows };
    }
    if (mode === "dock") {
      const header = ["Facility", "Trailer", "Status", "Date"];
      const rows = dockRows.map((d) => [
        pick(d, ["facilityName", "FacilityName"], "") || pick(d?.facility, ["facilityName", "FacilityName"], "-"),
        pick(d, ["trailerNumber", "TrailerNumber", "vehicleNumber", "VehicleNumber"], "-"),
        (d?.isActive === true || d?.IsActive === true) ? "ACTIVE" : "RELEASED",
        pick(d, ["date", "Date", "assignedDate", "AssignedDate", "createdAt", "CreatedAt"], "-"),
      ]);
      return { name: "dock_utilization_report", header, rows };
    }
    if (mode === "parking") {
      const header = ["Facility", "Trailer", "Status", "Date"];
      const rows = parkingRows.map((p) => [
        pick(p, ["facilityName", "FacilityName"], "") || pick(p?.facility, ["facilityName", "FacilityName"], "-"),
        pick(p, ["trailerNumber", "TrailerNumber", "vehicleNumber", "VehicleNumber"], "-"),
        (p?.isActive === true || p?.IsActive === true) ? "ACTIVE" : "RELEASED",
        pick(p, ["date", "Date", "assignedDate", "AssignedDate", "createdAt", "CreatedAt"], "-"),
      ]);
      return { name: "parking_utilization_report", header, rows };
    }
    if (flowTab === "departures") {
      const header = ["Activity", "Trailer", "Driver", "Status"];
      const rows = departureRows.map((r) => [
        pick(r, ["activityId", "ActivityId"], "-"),
        pick(r, ["trailerNumber", "TrailerNumber"], "-"),
        pick(r, ["driverName", "DriverName"], "-"),
        pick(r, ["finalStatus", "FinalStatus"], "-"),
      ]);
      return { name: "departure_report", header, rows };
    }
    const header = ["Activity", "Trailer", "Driver", "Status"];
    const rows = arrivalRows.map((r) => [
      pick(r, ["activityId", "ActivityId"], "-"),
      pick(r, ["trailerNumber", "TrailerNumber"], "-"),
      pick(r, ["driverName", "DriverName"], "-"),
      pick(r, ["status", "Status"], "-"),
    ]);
    return { name: "arrival_report", header, rows };
  };

  const downloadTextFile = (filename, content, mime) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onExportCsv = () => {
    const { name, header, rows } = getExportData();
    const lines = [header.map(csvCell).join(","), ...rows.map((r) => r.map(csvCell).join(","))];
    downloadTextFile(`${name}.csv`, `${lines.join("\n")}\n`, "text/csv;charset=utf-8;");
  };

  if (!open) return null;
  return (
    <div className="rp-modalOverlay" onClick={onClose}>
      <div className="rp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rp-modalHead">
          <h3>
            {mode === "vehicle"
              ? "Vehicle Status Report"
              : mode === "dock"
                ? "Dock Utilization Report"
                : mode === "parking"
                  ? "Parking Utilization Report"
                  : "Report Preview"}
          </h3>
          <div className="rp-modalActions">
            <button type="button" className="dm-btn dm-btnGhost" onClick={onExportCsv}>
              Export CSV
            </button>
            <button type="button" className="dm-btn dm-btnGhost" onClick={onClose}>
              <FiX /> Close
            </button>
          </div>
        </div>

        <div className="rp-preview">
          {mode === "flow" && (
            <div className="rp-previewToolbar">
              <div className="rp-switchTabs">
                <button
                  type="button"
                  className={`rp-switchBtn ${flowTab === "arrivals" ? "is-active" : ""}`}
                  onClick={() => setFlowTab("arrivals")}
                >
                  Arrivals
                </button>
                <button
                  type="button"
                  className={`rp-switchBtn ${flowTab === "departures" ? "is-active" : ""}`}
                  onClick={() => setFlowTab("departures")}
                >
                  Departures
                </button>
              </div>
              <div className="rp-previewFilters">
                <select
                  className="rp-facilitySelect"
                  value={selectedFacilityId}
                  onChange={(e) => onFacilityChange(e.target.value)}
                >
                  <option value="all">All Facilities</option>
                  {facilities.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.facilityName}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => onDateFromChange(e.target.value)}
                  max={dateTo || undefined}
                  aria-label="From date"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => onDateToChange(e.target.value)}
                  min={dateFrom || undefined}
                  aria-label="To date"
                />
              </div>
            </div>
          )}

          <div className="rp-previewGrid">
            {mode === "vehicle" ? (
              <div className="rp-previewCard">
                <h4>Vehicle Status (Active / Inactive)</h4>
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Facility</th>
                      <th>Trailer Number</th>
                      <th>Trailer Type</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicleRows.slice(0, vehicleVisible).map((v, idx) => (
                      <tr key={`${pick(v, ["id", "Id", "trailerNumber", "TrailerNumber", "vehicleNumber", "VehicleNumber"], "veh")}-${idx}`}>
                        <td>{pick(v, ["facilityName", "FacilityName"], "") || pick(v?.facility, ["facilityName", "FacilityName"], "-")}</td>
                        <td>{pick(v, ["trailerNumber", "TrailerNumber", "vehicleNumber", "VehicleNumber"], "-")}</td>
                        <td>{pick(v, ["vehicleType", "VehicleType"], "-")}</td>
                        <td>{String(pick(v, ["status", "Status"], "-")).toUpperCase()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {canLoadMoreVehicles && (
                  <div className="rp-loadMoreWrap">
                    <button
                      type="button"
                      className="dm-btn dm-btnGhost"
                      onClick={() => setVehicleVisible((n) => n + 6)}
                    >
                      Load More
                    </button>
                  </div>
                )}
              </div>
            ) : mode === "dock" ? (
              <div className="rp-previewCard">
                <h4>Dock Assignments (Active / Released)</h4>
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Facility</th>
                      <th>Trailer</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dockRows.slice(0, dockVisible).map((d, idx) => (
                      <tr key={`${pick(d, ["id", "Id", "assignmentId", "AssignmentId"], "dock")}-${idx}`}>
                        <td>{pick(d, ["facilityName", "FacilityName"], "") || pick(d?.facility, ["facilityName", "FacilityName"], "-")}</td>
                        <td>{pick(d, ["trailerNumber", "TrailerNumber", "vehicleNumber", "VehicleNumber"], "-")}</td>
                        <td>{(d?.isActive === true || d?.IsActive === true) ? "ACTIVE" : "RELEASED"}</td>
                        <td>{formatDateTimeShort(pick(d, ["date", "Date", "assignedDate", "AssignedDate", "createdAt", "CreatedAt"], "-"))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {canLoadMoreDock && (
                  <div className="rp-loadMoreWrap">
                    <button
                      type="button"
                      className="dm-btn dm-btnGhost"
                      onClick={() => setDockVisible((n) => n + 6)}
                    >
                      Load More
                    </button>
                  </div>
                )}
              </div>
            ) : mode === "parking" ? (
              <div className="rp-previewCard">
                <h4>Parking Assignments (Active / Released)</h4>
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Facility</th>
                      <th>Trailer</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parkingRows.slice(0, parkingVisible).map((p, idx) => (
                      <tr key={`${pick(p, ["id", "Id", "assignmentId", "AssignmentId"], "park")}-${idx}`}>
                        <td>{pick(p, ["facilityName", "FacilityName"], "") || pick(p?.facility, ["facilityName", "FacilityName"], "-")}</td>
                        <td>{pick(p, ["trailerNumber", "TrailerNumber", "vehicleNumber", "VehicleNumber"], "-")}</td>
                        <td>{(p?.isActive === true || p?.IsActive === true) ? "ACTIVE" : "RELEASED"}</td>
                        <td>{formatDateTimeShort(pick(p, ["date", "Date", "assignedDate", "AssignedDate", "createdAt", "CreatedAt"], "-"))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {canLoadMoreParking && (
                  <div className="rp-loadMoreWrap">
                    <button
                      type="button"
                      className="dm-btn dm-btnGhost"
                      onClick={() => setParkingVisible((n) => n + 6)}
                    >
                      Load More
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="rp-previewCard">
                <h4>{flowTab === "departures" ? "Departure List" : "Arrival List"}</h4>
                <table className="adm-table">
                  <thead>
                    {flowTab === "departures" ? (
                      <tr>
                        <th>Date</th>
                        <th>Time Out</th>
                        <th>Trailer No</th>
                        <th>Facility</th>
                        <th>Location</th>
                        <th>Loading</th>
                        <th>Final</th>
                      </tr>
                    ) : (
                      <tr>
                        <th>Date</th>
                        <th>Time In</th>
                        <th>Trailer No</th>
                        <th>Facility</th>
                        <th>Carrier</th>
                        <th>Location</th>
                        <th>Status</th>
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {(flowTab === "departures"
                      ? departureRows.slice(0, departureVisible)
                      : arrivalRows.slice(0, arrivalVisible)
                    ).map((r, idx) => {
                      const dt = pick(
                        r,
                        ["date", "Date", "timeOut", "TimeOut", "timeIn", "TimeIn", "createdAt", "CreatedAt"],
                        ""
                      );
                      const datePart = toIsoDay(dt) || "-";
                      const timePart = formatTime(dt) || "-";
                      return flowTab === "departures" ? (
                        <tr key={`${pick(r, ["id", "Id"], "dep")}-${idx}`}>
                          <td>{datePart}</td>
                          <td>{timePart}</td>
                          <td>{pick(r, ["trailerNumber", "TrailerNumber", "vehicleNumber", "VehicleNumber"], "-")}</td>
                          <td>{pick(r, ["facilityName", "FacilityName"], "") || pick(r?.facility, ["facilityName", "FacilityName"], "-")}</td>
                          <td>{pick(r, ["location", "Location"], "-")}</td>
                          <td>{pick(r, ["status", "Status", "loadingStatus", "LoadingStatus"], "-")}</td>
                          <td>{pick(r, ["finalStatus", "FinalStatus"], "-")}</td>
                        </tr>
                      ) : (
                        <tr key={`${pick(r, ["id", "Id"], "arr")}-${idx}`}>
                          <td>{datePart}</td>
                          <td>{timePart}</td>
                          <td>{pick(r, ["trailerNumber", "TrailerNumber", "vehicleNumber", "VehicleNumber"], "-")}</td>
                          <td>{pick(r, ["facilityName", "FacilityName"], "") || pick(r?.facility, ["facilityName", "FacilityName"], "-")}</td>
                          <td>{pick(r, ["carrier", "Carrier", "transportCompany", "TransportCompany"], "-")}</td>
                          <td>{pick(r, ["location", "Location"], "-")}</td>
                          <td>{pick(r, ["status", "Status"], "-")}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {flowTab === "departures" ? (
                  canLoadMoreDepartures && (
                    <div className="rp-loadMoreWrap">
                      <button
                        type="button"
                        className="dm-btn dm-btnGhost"
                        onClick={() => setDepartureVisible((n) => n + 6)}
                      >
                        Load More
                      </button>
                    </div>
                  )
                ) : (
                  canLoadMoreArrivals && (
                    <div className="rp-loadMoreWrap">
                      <button
                        type="button"
                        className="dm-btn dm-btnGhost"
                        onClick={() => setArrivalVisible((n) => n + 6)}
                      >
                        Load More
                      </button>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const userRoleMixRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportMode, setReportMode] = useState("flow");
  const [selectedFacilityId, setSelectedFacilityId] = useState("all");
  const [focusSection, setFocusSection] = useState("all");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [usersVisible, setUsersVisible] = useState(6);
  const [inboundVisible, setInboundVisible] = useState(6);
  const [outboundVisible, setOutboundVisible] = useState(6);

  const [arrivals, setArrivals] = useState([]);
  const [departures, setDepartures] = useState([]);
  const [dockAssignments, setDockAssignments] = useState([]);
  const [availableDocks, setAvailableDocks] = useState([]);
  const [parkingAssignments, setParkingAssignments] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [users, setUsers] = useState([]);
  const [facilities, setFacilities] = useState([]);

  const focusUserRoleMix = () => {
    setFocusSection("users");
    if (!userRoleMixRef.current) return;
    const scrollHost = userRoleMixRef.current.closest(".yms-content");
    if (scrollHost) {
      const top = userRoleMixRef.current.offsetTop - 150;
      scrollHost.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
      return;
    }
    const top = userRoleMixRef.current.getBoundingClientRect().top + window.scrollY - 150;
    window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
  };

  const normFacility = (f) => ({
    id: String(pick(f, ["id", "Id"], "")),
    facilityName: String(pick(f, ["facilityName", "FacilityName", "name", "Name"], "")),
  });

  const getRowFacilityId = (row) =>
    String(pick(row, ["facilityId", "FacilityId", "facility_id"], ""));

  const normTrailer = (v) => String(v || "").trim().toUpperCase().replace(/\s+/g, "");

  const filterByFacilityAndDate = (rows, dateKeys) =>
    rows.filter((row) => {
      if (selectedFacilityId !== "all" && getRowFacilityId(row) !== String(selectedFacilityId)) {
        return false;
      }

      const iso = toIsoDay(pick(row, dateKeys, ""));
      if (!iso) return true;
      if (dateFrom && iso < dateFrom) return false;
      if (dateTo && iso > dateTo) return false;
      return true;
    });

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const results = await Promise.allSettled([
        fetchAllPaged(getArrivals),
        fetchAllPaged(getDepartures),
        fetchAllPaged((p) => getDockAssignments({ ...p, activeOnly: false })),
        fetchAllPaged((p) => getDocks({ ...p, status: "AVAILABLE" })),
        fetchAllPaged((p) => getParkingAssignments({ ...p, activeOnly: false })),
        getUsers(),
        getVehicles(),
        getFacilities({ search: "", skip: 0, take: 200 }),
      ]);

      setArrivals(results[0].status === "fulfilled" ? results[0].value : []);
      setDepartures(results[1].status === "fulfilled" ? results[1].value : []);
      setDockAssignments(results[2].status === "fulfilled" ? results[2].value : []);
      setAvailableDocks(results[3].status === "fulfilled" ? results[3].value : []);
      setParkingAssignments(results[4].status === "fulfilled" ? results[4].value : []);
      setUsers(results[5].status === "fulfilled" && Array.isArray(results[5].value) ? results[5].value : []);
      setVehicles(results[6].status === "fulfilled" && Array.isArray(results[6].value) ? results[6].value : []);
      const rawFacilities = results[7].status === "fulfilled"
        ? (Array.isArray(results[7].value) ? results[7].value : (results[7].value?.items || []))
        : [];
      setFacilities(rawFacilities.map(normFacility).filter((x) => x.id));
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load report data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (focusSection === "users") setUsersVisible(6);
  }, [focusSection]);

  useEffect(() => {
    if (focusSection === "inbound") setInboundVisible(6);
    if (focusSection === "outbound") setOutboundVisible(6);
  }, [focusSection]);

  const filteredArrivals = useMemo(() => {
    return filterByFacilityAndDate(arrivals, ["date", "Date", "createdAtUtc", "CreatedAtUtc", "createdAt", "CreatedAt"]);
  }, [arrivals, selectedFacilityId, dateFrom, dateTo]);

  const filteredDepartures = useMemo(() => {
    return filterByFacilityAndDate(departures, ["date", "Date", "createdAtUtc", "CreatedAtUtc", "createdAt", "CreatedAt"]);
  }, [departures, selectedFacilityId, dateFrom, dateTo]);

  const filteredDockAssignments = useMemo(() => {
    return filterByFacilityAndDate(dockAssignments, [
      "date",
      "Date",
      "assignedDate",
      "AssignedDate",
      "dockInAt",
      "DockInAt",
      "createdAtUtc",
      "CreatedAtUtc",
      "createdAt",
      "CreatedAt",
    ]);
  }, [dockAssignments, selectedFacilityId, dateFrom, dateTo]);

  const filteredAvailableDocks = useMemo(() => {
    if (selectedFacilityId === "all") return availableDocks;
    return availableDocks.filter((r) => getRowFacilityId(r) === String(selectedFacilityId));
  }, [availableDocks, selectedFacilityId]);

  const filteredParkingAssignments = useMemo(() => {
    return filterByFacilityAndDate(parkingAssignments, [
      "date",
      "Date",
      "assignedDate",
      "AssignedDate",
      "parkingInAt",
      "ParkingInAt",
      "createdAtUtc",
      "CreatedAtUtc",
      "createdAt",
      "CreatedAt",
    ]);
  }, [parkingAssignments, selectedFacilityId, dateFrom, dateTo]);

  const filteredVehicles = useMemo(() => {
    return filterByFacilityAndDate(vehicles, ["date", "Date", "createdAtUtc", "CreatedAtUtc", "createdAt", "CreatedAt"]);
  }, [vehicles, selectedFacilityId, dateFrom, dateTo]);

  const filteredUsers = useMemo(() => {
    const dateKeys = ["createdAtUtc", "CreatedAtUtc", "createdAt", "CreatedAt"];
    const inDate = users.filter((u) => {
      const iso = toIsoDay(pick(u, dateKeys, ""));
      if (!iso) return true;
      if (dateFrom && iso < dateFrom) return false;
      if (dateTo && iso > dateTo) return false;
      return true;
    });
    if (selectedFacilityId === "all") return inDate;
    const byFacility = inDate.filter((u) => getRowFacilityId(u) === String(selectedFacilityId));
    return byFacility.length ? byFacility : inDate;
  }, [users, selectedFacilityId, dateFrom, dateTo]);

  const snapshot = useMemo(
    () => ({
      users: filteredUsers.length,
      inbound: filteredArrivals.length,
      outbound: filteredDepartures.length,
    }),
    [filteredUsers, filteredArrivals, filteredDepartures]
  );

  const kpis = useMemo(() => {
    const checkedIn = filteredArrivals.length;
    const checkedOut = filteredDepartures.length;
    const availableDock = filteredAvailableDocks.length;
    const inYardSlot = filteredParkingAssignments.filter((x) => x?.isActive === true || x?.IsActive === true).length;
    const exitedFromDock = filteredDockAssignments.filter((x) =>
      Boolean(pick(x, ["finalStatus", "FinalStatus", "status", "Status"], ""))
    ).length;
    const totalInYard = Math.max(0, checkedIn - checkedOut);

    return [
      { label: "Total In Yard", value: totalInYard },
      { label: "Arrivals", value: checkedIn },
      { label: "Departures", value: checkedOut },
      { label: "In Parking", value: inYardSlot },
      { label: "Available Dock", value: availableDock },
      { label: "Exited From Dock", value: exitedFromDock },
    ];
  }, [filteredArrivals, filteredDepartures, filteredDockAssignments, filteredAvailableDocks, filteredParkingAssignments]);

  const weeklyFlowData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      days.push({ iso, day: toLabelWeekday(iso), arrivals: 0, departures: 0 });
    }
    const map = new Map(days.map((d) => [d.iso, d]));

    filteredArrivals.forEach((r) => {
      const iso = toIsoDay(pick(r, ["date", "Date"], ""));
      if (map.has(iso)) map.get(iso).arrivals += 1;
    });
    filteredDepartures.forEach((r) => {
      const iso = toIsoDay(pick(r, ["date", "Date"], ""));
      if (map.has(iso)) map.get(iso).departures += 1;
    });

    return days.map(({ day, arrivals: a, departures: d }) => ({ day, arrivals: a, departures: d }));
  }, [filteredArrivals, filteredDepartures]);

  const rolePieData = useMemo(() => {
    const counts = {};
    users.forEach((u) => {
      const role = String(pick(u, ["role", "Role"], "Unknown"));
      counts[role] = (counts[role] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [users]);

  const roleSummaryText = useMemo(() => {
    if (!rolePieData.length) return "No roles";
    return rolePieData.map((r) => `${r.name}: ${r.value}`).join(" | ");
  }, [rolePieData]);

  const inboundArrivals = useMemo(() => {
    const withPurpose = filteredArrivals.filter((r) => {
      const p = String(pick(r, ["purpose", "Purpose"], "")).toLowerCase();
      return p === "inbound";
    });
    return withPurpose.length ? withPurpose : filteredArrivals;
  }, [filteredArrivals]);

  const outboundArrivals = useMemo(() => {
    const withPurpose = filteredArrivals.filter((r) => {
      const p = String(pick(r, ["purpose", "Purpose"], "")).toLowerCase();
      return p === "outbound";
    });
    return withPurpose.length ? withPurpose : filteredDepartures;
  }, [filteredArrivals, filteredDepartures]);

  const activeDockTrailers = useMemo(() => {
    return new Set(
      filteredDockAssignments
        .filter((x) => x?.isActive === true || x?.IsActive === true)
        .map((x) => normTrailer(pick(x, ["trailerNumber", "TrailerNumber", "vehicleNumber", "VehicleNumber"], "")))
        .filter(Boolean)
    );
  }, [filteredDockAssignments]);

  const activeParkingTrailers = useMemo(() => {
    return new Set(
      filteredParkingAssignments
        .filter((x) => x?.isActive === true || x?.IsActive === true)
        .map((x) => normTrailer(pick(x, ["trailerNumber", "TrailerNumber", "vehicleNumber", "VehicleNumber"], "")))
        .filter(Boolean)
    );
  }, [filteredParkingAssignments]);

  const departedTrailers = useMemo(() => {
    return new Set(
      filteredDepartures
        .map((x) => normTrailer(pick(x, ["trailerNumber", "TrailerNumber", "vehicleNumber", "VehicleNumber"], "")))
        .filter(Boolean)
    );
  }, [filteredDepartures]);

  const inboundStatsData = useMemo(() => {
    const total = inboundArrivals.length;
    let onDock = 0;
    let onYard = 0;
    let departed = 0;
    inboundArrivals.forEach((r) => {
      const t = normTrailer(pick(r, ["trailerNumber", "TrailerNumber", "vehicleNumber", "VehicleNumber"], ""));
      if (!t) return;
      if (activeDockTrailers.has(t)) onDock += 1;
      else if (activeParkingTrailers.has(t)) onYard += 1;
      else if (departedTrailers.has(t)) departed += 1;
    });
    const remaining = Math.max(0, total - (onDock + onYard + departed));
    return [
      { name: "On Dock", value: onDock },
      { name: "On Yard", value: onYard },
      { name: "Departed", value: departed },
      { name: "Remaining", value: remaining },
    ];
  }, [inboundArrivals, activeDockTrailers, activeParkingTrailers, departedTrailers]);

  const outboundStatsData = useMemo(() => {
    const total = outboundArrivals.length;
    let onDock = 0;
    let onYard = 0;
    let departed = 0;
    outboundArrivals.forEach((r) => {
      const t = normTrailer(pick(r, ["trailerNumber", "TrailerNumber", "vehicleNumber", "VehicleNumber"], ""));
      if (!t) return;
      if (activeDockTrailers.has(t)) onDock += 1;
      else if (activeParkingTrailers.has(t)) onYard += 1;
      else if (departedTrailers.has(t)) departed += 1;
    });
    const remaining = Math.max(0, total - (onDock + onYard + departed));
    return [
      { name: "On Dock", value: onDock },
      { name: "On Yard", value: onYard },
      { name: "Departed", value: departed },
      { name: "Remaining", value: remaining },
    ];
  }, [outboundArrivals, activeDockTrailers, activeParkingTrailers, departedTrailers]);

  const vehicleStatusData = useMemo(() => {
    const counts = {};
    filteredVehicles.forEach((v) => {
      const status = String(pick(v, ["status", "Status"], "UNKNOWN")).toUpperCase();
      counts[status] = (counts[status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredVehicles]);

  const dockWeeklyUtilizationData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      days.push({ iso, day: toLabelWeekday(iso), available: 0, released: 0 });
    }
    const map = new Map(days.map((d) => [d.iso, d]));

    filteredDockAssignments.forEach((r) => {
      const iso = toIsoDay(
        pick(
          r,
          ["date", "Date", "assignedDate", "AssignedDate", "createdAt", "CreatedAt", "updatedAt", "UpdatedAt"],
          ""
        )
      );
      if (!map.has(iso)) return;

      const isActive = r?.isActive === true || r?.IsActive === true;
      if (isActive) map.get(iso).available += 1;
      else map.get(iso).released += 1;
    });

    return days.map(({ day, available, released }) => ({ day, available, released }));
  }, [filteredDockAssignments]);

  const parkingWeeklyUtilizationData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      days.push({ iso, day: toLabelWeekday(iso), active: 0, released: 0 });
    }
    const map = new Map(days.map((d) => [d.iso, d]));

    filteredParkingAssignments.forEach((r) => {
      const iso = toIsoDay(
        pick(
          r,
          ["date", "Date", "assignedDate", "AssignedDate", "createdAt", "CreatedAt", "updatedAt", "UpdatedAt"],
          ""
        )
      );
      if (!map.has(iso)) return;

      const isActive = r?.isActive === true || r?.IsActive === true;
      if (isActive) map.get(iso).active += 1;
      else map.get(iso).released += 1;
    });

    return days.map(({ day, active, released }) => ({ day, active, released }));
  }, [filteredParkingAssignments]);

  return (
    <div className="rp-page">
      <div className="rp-header glass">
        <div>
          <h2 className="adm-title">Reports & Analytics</h2>
          <p className="rp-sub">Charts built from your current yard system data.</p>
          <div className="rp-snapshot">
            <button
              type="button"
              className={`rp-snapshotBtn ${focusSection === "all" ? "rp-snapshotBtnTitle" : ""}`}
              onClick={() => setFocusSection("all")}
            >
              Snapshot
            </button>
            <button
              type="button"
              className={`rp-snapshotBtn rp-snapshotBtnClick ${focusSection === "users" ? "rp-snapshotBtnTitle" : ""}`}
              onClick={focusUserRoleMix}
              title={roleSummaryText}
            >
              Users
            </button>
            <button
              type="button"
              className={`rp-snapshotBtn rp-snapshotBtnClick ${focusSection === "inbound" ? "rp-snapshotBtnTitle" : ""}`}
              onClick={() => setFocusSection("inbound")}
            >
              Inbound
            </button>
            <button
              type="button"
              className={`rp-snapshotBtn rp-snapshotBtnClick ${focusSection === "outbound" ? "rp-snapshotBtnTitle" : ""}`}
              onClick={() => setFocusSection("outbound")}
            >
              Outbound
            </button>
          </div>
        </div>
        <div className="rp-actions">
          <div className="rp-topControls">
            <select
              className="rp-facilitySelect"
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
            <button type="button" className="dm-btn dm-btnGhost" onClick={loadData} disabled={loading}>
              <FiRefreshCw />
            </button>
          </div>
          <div className="rp-dateRange">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              aria-label="From date"
            />
            <span>to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              aria-label="To date"
            />
          </div>
        </div>
      </div>

      {error && <div className="adm-error">{error}</div>}

      {focusSection === "all" && (
        <>
          <div className="rp-kpiGrid">
            {kpis.map((k) => {
              const Icon = KPI_ICONS[k.label] || FiBarChart2;
              return (
                <div key={k.label} className="adm-card glass rp-kpiCard">
                  <div className="rp-kpiIcon">
                    <Icon />
                  </div>
                  <div className="rp-kpiInfo">
                    <div className="rp-kpiValue">{k.value}</div>
                    <div className="rp-kpiLabel">{k.label}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rp-chartGrid">
            <div className="adm-card glass rp-chartCard">
              <div className="rp-chartHead">
                <h3><FiBarChart2 /> Arrival vs Departure Trend</h3>
                <span>Last 7 days</span>
              </div>
              <div className="rp-chartBody">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={weeklyFlowData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.35)" />
                    <XAxis dataKey="day" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="arrivals" fill="#4cc9f0" name="Arrivals" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="departures" fill="#80ed99" name="Departures" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="rp-chartFooter rp-chartFooterEnd">
                <button
                  type="button"
                  className="dm-btn dm-btnSave"
                  onClick={() => {
                    setReportMode("flow");
                    setReportOpen(true);
                  }}
                >
                  <FiEye /> View Report
                </button>
              </div>
            </div>

            <div className="adm-card glass rp-chartCard">
              <div className="rp-chartHead">
                <h3><FiPieChart /> Vehicle Status Distribution</h3>
                <span>Fleet health snapshot</span>
              </div>
              <div className="rp-chartBody">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={vehicleStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95} label>
                      {vehicleStatusData.map((entry, idx) => (
                        <Cell key={`${entry.name}-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="rp-chartFooter rp-chartFooterEnd">
                <button
                  type="button"
                  className="dm-btn dm-btnSave"
                  onClick={() => {
                    setReportMode("vehicle");
                    setReportOpen(true);
                  }}
                >
                  <FiEye /> View Report
                </button>
              </div>
            </div>

            <div className="adm-card glass rp-chartCard">
              <div className="rp-chartHead">
                <h3><FiBarChart2 /> Dock Utilization</h3>
                <span>Weekly available vs released</span>
              </div>
              <div className="rp-chartBody">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={dockWeeklyUtilizationData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.35)" />
                    <XAxis dataKey="day" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="available" name="Available Dock" stroke="#60a5fa" strokeWidth={2.5} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="released" name="Dock Released" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="rp-chartFooter rp-chartFooterEnd">
                <button
                  type="button"
                  className="dm-btn dm-btnSave"
                  onClick={() => {
                    setReportMode("dock");
                    setReportOpen(true);
                  }}
                >
                  <FiEye /> View Report
                </button>
              </div>
            </div>

            <div className="adm-card glass rp-chartCard">
              <div className="rp-chartHead">
                <h3><FiBarChart2 /> Parking Utilization</h3>
                <span>Weekly active vs released</span>
              </div>
              <div className="rp-chartBody">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={parkingWeeklyUtilizationData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.35)" />
                    <XAxis dataKey="day" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="active" name="Parking Active" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="released" name="Parking Released" stroke="#f97316" strokeWidth={2.5} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="rp-chartFooter rp-chartFooterEnd">
                <button
                  type="button"
                  className="dm-btn dm-btnSave"
                  onClick={() => {
                    setReportMode("parking");
                    setReportOpen(true);
                  }}
                >
                  <FiEye /> View Report
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {focusSection === "users" && (
        <>
          <div className="rp-usersChartWrap">
            <div ref={userRoleMixRef} className="adm-card glass rp-chartCard rp-usersChartCard">
              <div className="rp-chartHead">
                <h3><FiPieChart /> User Role Mix</h3>
                <span>Current active directory</span>
              </div>
              <div className="rp-chartBody">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={rolePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95} label>
                      {rolePieData.map((entry, idx) => (
                        <Cell key={`${entry.name}-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="adm-card glass rp-chartCard">
            <div className="rp-chartHead">
              <h3><FiBarChart2 /> Users Report</h3>
              <span>User management table</span>
            </div>
            <div className="rp-userTableWrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.slice(0, usersVisible).map((u, idx) => (
                    <tr key={`${pick(u, ["id", "Id", "email", "Email"], "usr")}-${idx}`}>
                      <td>{pick(u, ["fullName", "FullName"], "-")}</td>
                      <td>{pick(u, ["email", "Email"], "-")}</td>
                      <td>{pick(u, ["role", "Role"], "-")}</td>
                      <td>{pick(u, ["status", "Status"], "Active")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {usersVisible < filteredUsers.length && (
              <div className="rp-loadMoreWrap">
                <button
                  type="button"
                  className="dm-btn dm-btnGhost"
                  onClick={() => setUsersVisible((n) => n + 6)}
                >
                  Load More
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {focusSection === "inbound" && (
        <>
          <div className="rp-usersChartWrap">
            <div className="adm-card glass rp-chartCard rp-usersChartCard">
              <div className="rp-chartHead">
                <h3><FiPieChart /> Inbound Statistics</h3>
                <span>From arrivals list</span>
              </div>
              <div className="rp-chartBody">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={inboundStatsData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={58} outerRadius={95} label>
                      {inboundStatsData.map((entry, idx) => (
                        <Cell key={`${entry.name}-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="adm-card glass rp-chartCard">
            <div className="rp-chartHead">
              <h3><FiBarChart2 /> Inbound List</h3>
              <span>Arrival records</span>
            </div>
            <div className="rp-userTableWrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Activity</th>
                    <th>Trailer</th>
                    <th>Driver</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {inboundArrivals.slice(0, inboundVisible).map((r, idx) => (
                    <tr key={`${pick(r, ["id", "Id", "activityId", "ActivityId"], "in")}-${idx}`}>
                      <td>{pick(r, ["activityId", "ActivityId"], "-")}</td>
                      <td>{pick(r, ["trailerNumber", "TrailerNumber", "vehicleNumber", "VehicleNumber"], "-")}</td>
                      <td>{pick(r, ["driverName", "DriverName"], "-")}</td>
                      <td>{pick(r, ["status", "Status"], "-")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {inboundVisible < inboundArrivals.length && (
              <div className="rp-loadMoreWrap">
                <button
                  type="button"
                  className="dm-btn dm-btnGhost"
                  onClick={() => setInboundVisible((n) => n + 6)}
                >
                  Load More
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {focusSection === "outbound" && (
        <>
          <div className="rp-usersChartWrap">
            <div className="adm-card glass rp-chartCard rp-usersChartCard">
              <div className="rp-chartHead">
                <h3><FiPieChart /> Outbound Statistics</h3>
                <span>From arrivals/departures flow</span>
              </div>
              <div className="rp-chartBody">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={outboundStatsData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={58} outerRadius={95} label>
                      {outboundStatsData.map((entry, idx) => (
                        <Cell key={`${entry.name}-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="adm-card glass rp-chartCard">
            <div className="rp-chartHead">
              <h3><FiBarChart2 /> Outbound List</h3>
              <span>Outbound records</span>
            </div>
            <div className="rp-userTableWrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Activity</th>
                    <th>Trailer</th>
                    <th>Driver</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {outboundArrivals.slice(0, outboundVisible).map((r, idx) => (
                    <tr key={`${pick(r, ["id", "Id", "activityId", "ActivityId"], "out")}-${idx}`}>
                      <td>{pick(r, ["activityId", "ActivityId"], "-")}</td>
                      <td>{pick(r, ["trailerNumber", "TrailerNumber", "vehicleNumber", "VehicleNumber"], "-")}</td>
                      <td>{pick(r, ["driverName", "DriverName"], "-")}</td>
                      <td>{pick(r, ["status", "Status", "finalStatus", "FinalStatus"], "-")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {outboundVisible < outboundArrivals.length && (
              <div className="rp-loadMoreWrap">
                <button
                  type="button"
                  className="dm-btn dm-btnGhost"
                  onClick={() => setOutboundVisible((n) => n + 6)}
                >
                  Load More
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        mode={reportMode}
        arrivalRows={filteredArrivals}
        departureRows={filteredDepartures}
        vehicleRows={filteredVehicles}
        dockRows={filteredDockAssignments}
        parkingRows={filteredParkingAssignments}
        facilities={facilities}
        selectedFacilityId={selectedFacilityId}
        onFacilityChange={setSelectedFacilityId}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
      />
    </div>
  );
}
