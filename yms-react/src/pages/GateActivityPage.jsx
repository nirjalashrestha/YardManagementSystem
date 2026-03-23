// src/pages/GateActivityPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "../styles/dashboard.css";
import { FiEdit2, FiTrash2, FiSearch, FiPlus, FiRefreshCw, FiFileText, FiEye } from "react-icons/fi";
import JsBarcode from "jsbarcode";

import { getCarriers } from "../services/carrierService";
import { getFacilities } from "../services/facilityService";
import { getLocations } from "../services/locationService";
import { getVehicles } from "../services/vehicleService";
import { getGates } from "../services/gateService";
import { getDrivers } from "../services/userService";
import { getTrailerTypes } from "../services/trailerTypeService";
import { getGoods } from "../services/goodsService";
import { getYardMoves } from "../services/yardMoveService";

import {
  getArrivals,
  createArrival,
  updateArrival,
  deleteArrival,
  getDepartures,
  createDeparture,
  updateDeparture,
  deleteDeparture,
} from "../services/gateactivityService";

import { DASHBOARD_REFRESH } from "../utils/events";

const PAGE_SIZE = 6;
const FETCH_BATCH_SIZE = 200;

const today = () => new Date().toISOString().slice(0, 10);
const nowTime = () => new Date().toTimeString().slice(0, 5);

// ✅ Activity ID generator (client-side)
const genActivityId = (prefix = "ARR") => {
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${ymd}-${rand}`;
};

const ARRIVAL_STATUS = ["Waiting", "Entered", "Rejected"];
const LOAD_TYPES = ["Live Load", "Drop Load", "Empty"];
const PURPOSE_OPTIONS = ["Load", "Unload"];

// ✅ from your second code
const LOADING_STATUS = ["Completed", "Partial", "Cancelled"];
const FINAL_STATUS = ["Exited", "Hold", "Re-check Required"];

const TRAILER_TYPES = [
  "Container Chassis",
  "Flatbed Trailer",
  "Reefer Trailer",
  "Dry Van Trailer",
  "Tanker Trailer",
  "Box Trailer",
];

const pick = (obj, keys, fallback = "") => {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
  }
  return fallback;
};

const toBool = (v) => {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v.toLowerCase() === "true";
  if (typeof v === "number") return v === 1;
  return !!v;
};
const boolToYN = (b) => (b ? "Yes" : "No");
const ynToBool = (s) => String(s || "").toLowerCase() === "yes";
const normTrailerNumber = (v) => String(v || "").toUpperCase().replace(/\s+/g, "");

const normCarrier = (c) => ({
  id: String(pick(c, ["id", "Id"], "")),
  carrierName: String(pick(c, ["carrierName", "CarrierName", "name", "Name"], "")),
  facilityId: String(pick(c, ["facilityId", "FacilityId"], "")),
});

const normFacility = (f) => ({
  id: String(pick(f, ["id", "Id"], "")),
  facilityName: String(pick(f, ["facilityName", "FacilityName", "name", "Name"], "")),
});

const normLocation = (l) => ({
  id: String(pick(l, ["id", "Id"], "")),
  locationName: String(pick(l, ["locationName", "LocationName"], "")),
  facilityId: String(pick(l, ["facilityId", "FacilityId"], "")),
  locationType: String(
    pick(l, ["locationType", "LocationType", "type", "Type", "location_type", "locationtype"], "")
  ).toUpperCase(),
});

const normYardMoveRef = (m) => ({
  id: String(pick(m, ["id", "Id", "yardMoveId", "YardMoveId", "yard_move_id"], "")),
  refId: String(pick(m, ["refId", "RefId", "referenceId", "ReferenceId", "ref_id"], "")),
  trailerNumber: String(pick(m, ["trailerNumber", "TrailerNumber", "trailer_number"], "")).toUpperCase(),
  facilityId: String(pick(m, ["facilityId", "FacilityId", "facility_id"], "")),
  toLocationId: String(pick(m, ["toLocationId", "ToLocationId", "to_location_id"], "")),
  toLocationName: String(pick(m, ["toLocationName", "ToLocationName", "to_location_name"], "")),
  toLocationType: String(pick(m, ["toLocationType", "ToLocationType", "to_location_type"], "")).toUpperCase(),
  moveDateTime: String(pick(m, ["moveDateTime", "MoveDateTime", "move_date_time"], "")),
  updatedAt: String(pick(m, ["updatedAt", "UpdatedAt", "updated_at"], "")),
  createdAt: String(pick(m, ["createdAt", "CreatedAt", "created_at"], "")),
});

const normVehicle = (v) => ({
  id: String(pick(v, ["id", "Id"], "")),
  trailerNumber: String(pick(v, ["trailerNumber", "TrailerNumber"], "")).toUpperCase(),
  vehicleType: String(pick(v, ["vehicleType", "VehicleType"], "")),
});

const normGate = (g) => ({
  id: String(pick(g, ["id", "Id", "gateId", "GateId"], "")),
  gateName: String(pick(g, ["gateName", "GateName", "name", "Name"], "")),
  gateType: String(pick(g, ["gateType", "GateType", "type", "Type"], "")), // ENTRY/EXIT/BOTH
  status: String(pick(g, ["status", "Status"], "")), // ACTIVE/INACTIVE
  facilityId: String(pick(g, ["facilityId", "FacilityId"], "")),
});

const normDriver = (d) => ({
  id: String(pick(d, ["id", "Id"], "")),
  fullName: String(pick(d, ["fullName", "FullName", "name", "Name"], "")),
  userId: String(pick(d, ["userId", "UserId"], "")),
});

const normGoods = (g) => ({
  id: String(pick(g, ["id", "Id"], "")),
  goodsName: String(pick(g, ["goodsName", "GoodsName", "name", "Name"], "")),
  facilityId: String(pick(g, ["facilityId", "FacilityId"], "")),
  status: String(pick(g, ["status", "Status"], "")),
});

const formatClock12h = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "-";
  if (/\b(am|pm)\b/i.test(raw)) return raw.toUpperCase();

  const m = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!m) return raw;
  const h = Number(m[1]);
  const min = m[2];
  if (Number.isNaN(h) || h < 0 || h > 23) return raw;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${min} ${suffix}`;
};

export default function GateActivityPage({ forcedTab = null }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabFromQuery = searchParams.get("tab") === "departure" ? "departure" : "arrival";
  const fixedTab = forcedTab === "departure" || forcedTab === "arrival" ? forcedTab : null;
  const [tab, setTab] = useState(fixedTab || tabFromQuery); // arrival | departure
  const [q, setQ] = useState("");
  const [facilityFilter, setFacilityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [carriers, setCarriers] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [trailerTypes, setTrailerTypes] = useState([]);
  const [goods, setGoods] = useState([]);
  const [entryGates, setEntryGates] = useState([]);
  const [exitGates, setExitGates] = useState([]);

  // separate location lists to avoid overwriting each other
  const [aLocations, setALocations] = useState([]);
  const [dLocations, setDLocations] = useState([]);

  // ref arrivals list (eligible only)
  const [arrivalRefs, setArrivalRefs] = useState([]);
  const [yardMoveRefs, setYardMoveRefs] = useState([]);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [shown, setShown] = useState(0);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [mode, setMode] = useState("add"); // add | edit | view
  const isView = mode === "view";

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTab(fixedTab || tabFromQuery);
  }, [fixedTab, tabFromQuery]);
  const [err, setErr] = useState("");
  const [aErrors, setAErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);

  // ---------------------------
  // Forms
  // ---------------------------
  const [aForm, setAForm] = useState({
    activityId: genActivityId("ARR"), // ✅ auto now
    date: today(),
    timeIn: nowTime(), // read-only in UI
    carrierId: "",
    trailerType: "",
    goodsId: "",
    trailerNumber: "",
    driverName: "",
    loadType: "Live Load",
    purpose: "Load",
    documentVerifiedYN: "Yes",
    securityClearedYN: "Yes",
    status: "Waiting",
    remarks: "",
    facilityId: "",
    locationId: "",
    entryGateId: "",
  });

  const [dForm, setDForm] = useState({
    activityId: genActivityId("DEP"), // ✅ auto (optional)
    refId: "",
    refArrivalId: "", // optional
    date: today(),
    timeOut: nowTime(), // read-only in UI
    facilityId: "",
    locationId: "",
    exitGateId: "",
    trailerType: "",
    goodsId: "",
    trailerNumber: "",
    driverName: "",
    loadingStatus: "Completed", // ✅ from second code
    finalStatus: "Exited",       // ✅ from second code
    delayReason: "",
    damageNotes: "",
    securityRemarks: "",
  });

  const refSelected = !!(dForm.refId || dForm.refArrivalId);

  // ---------------------------
  // Barcode print (Arrival only)
  // ---------------------------
  const printArrivalBarcode = (arrivalRowOrId) => {
    const activityId =
      typeof arrivalRowOrId === "string"
        ? arrivalRowOrId
        : arrivalRowOrId?.activityId || "";

    if (!activityId) {
      alert("No Activity ID found to print barcode.");
      return;
    }

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    try {
      JsBarcode(svg, activityId, {
        format: "CODE128",
        displayValue: true,
        fontSize: 14,
        margin: 10,
        height: 70,
      });
    } catch {
      alert("Barcode generation failed. Make sure 'jsbarcode' is installed.");
      return;
    }

    const win = window.open("", "_blank", "width=600,height=500");
    if (!win) {
      alert("Popup blocked. Allow popups to print barcode.");
      return;
    }

    const svgHtml = new XMLSerializer().serializeToString(svg);

    win.document.open();
    win.document.write(`
      <html>
        <head>
          <title>Arrival Barcode</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            .box { border: 1px solid #ddd; padding: 18px; border-radius: 10px; max-width: 520px; }
            .row { margin-bottom: 10px; }
            .label { color: #555; font-size: 12px; }
            .value { font-weight: 700; font-size: 16px; }
            .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }
            .center { display: flex; justify-content: center; align-items: center; }
            @media print { body { padding: 0; } .box { border: none; } }
          </style>
        </head>
        <body>
          <div class="box">
            <div class="row">
              <div class="label">Arrival Activity ID</div>
              <div class="value mono">${activityId}</div>
            </div>
            <div class="center">${svgHtml}</div>
          </div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 200);
            };
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  // ---------------------------
  // Load helpers
  // ---------------------------
  const loadLocationsForFacility = async (facilityId, which) => {
    try {
      if (!facilityId) {
        if (which === "arrival") setALocations([]);
        if (which === "departure") setDLocations([]);
        return [];
      }
      const res = await getLocations({ facilityId, search: "", skip: 0, take: 200 });
      const list = (res?.items || []).map(normLocation).filter((x) => x.id);
      if (which === "arrival") setALocations(list);
      if (which === "departure") setDLocations(list);
      return list;
    } catch (e) {
      if (which === "arrival") setALocations([]);
      if (which === "departure") setDLocations([]);
      setErr(e?.message || String(e));
      return [];
    }
  };


  const loadArrivalRefs = async () => {
    try {
      const [aRes, dRes] = await Promise.all([
        getArrivals({ search: "", skip: 0, take: 500 }),
        getDepartures({ search: "", skip: 0, take: 500 }),
      ]);

      const arrivals = (aRes?.items || []).filter((a) => (a?.status || "") !== "Rejected");
      const departures = dRes?.items || [];

      const departedArrivalIds = new Set(
        departures
          .map((d) => String(d.refArrivalId || d.refArrivalActivityId || ""))
          .filter(Boolean)
      );

      const eligible = arrivals.filter((a) => {
        const aid = String(a.id || a.arrivalId || "");
        const act = String(a.activityId || "");
        if (aid && departedArrivalIds.has(aid)) return false;
        if (act && departedArrivalIds.has(act)) return false;
        return true;
      });

      setArrivalRefs(eligible);
      return eligible;
    } catch (e) {
      setArrivalRefs([]);
      setErr(e?.message || String(e));
      return [];
    }
  };

  // ---------------------------
  // Initial dropdown data
  // ---------------------------
  useEffect(() => {
    (async () => {
      setErr("");

      const results = await Promise.allSettled([
        getFacilities({ search: "", skip: 0, take: 200 }),
        getVehicles({ search: "", skip: 0, take: 200 }),
        getDrivers({ search: "", skip: 0, take: 200 }),
      ]);

      const [fRes, vRes, dRes] = results;

      if (fRes.status === "fulfilled") {
        setFacilities((fRes.value?.items || []).map(normFacility).filter((x) => x.id));
      }
      if (vRes.status === "fulfilled") {
        const raw = Array.isArray(vRes.value) ? vRes.value : vRes.value?.items || [];
        setVehicles(raw.map(normVehicle).filter((x) => x.trailerNumber));
      }
      if (dRes.status === "fulfilled") {
        const raw = Array.isArray(dRes.value) ? dRes.value : dRes.value?.items || [];
        setDrivers(raw.map(normDriver).filter((x) => x.fullName));
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!facilities.length) return;
      const defaultFacilityId = facilities[0].id;

      const [aLocs, dLocs, gates, carrierList, tTypes, gList] = await Promise.all([
        loadLocationsForFacility(defaultFacilityId, "arrival"),
        loadLocationsForFacility(defaultFacilityId, "departure"),
        loadGatesForFacility(defaultFacilityId),
        loadCarriersForFacility(defaultFacilityId),
        loadTrailerTypesForFacility(defaultFacilityId),
        loadGoodsForFacility(defaultFacilityId),
      ]);

      setAForm((p) => ({
        ...p,
        facilityId: p.facilityId || defaultFacilityId,
        locationId: p.locationId || (aLocs[0]?.id || ""),
        entryGateId: p.entryGateId || (gates.entry[0]?.id || ""),
        carrierId: p.carrierId || (carrierList[0]?.id || ""),
        goodsId: p.goodsId || (gList[0]?.id || ""),
        trailerType: p.trailerType || getDefaultTrailerType(tTypes),
      }));

      setDForm((p) => ({
        ...p,
        facilityId: p.facilityId || defaultFacilityId,
        locationId: p.locationId || (dLocs[0]?.id || ""),
        exitGateId: p.exitGateId || (gates.exit[0]?.id || ""),
        goodsId: p.goodsId || (gList[0]?.id || ""),
        trailerType: p.trailerType || getDefaultTrailerType(tTypes),
      }));

      await Promise.all([loadArrivalRefs(), loadYardMoveRefs()]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilities.length]);

  useEffect(() => {
    (async () => {
      if (!aForm.facilityId) {
        setCarriers([]);
        return;
      }
      const list = await loadCarriersForFacility(aForm.facilityId);
      if (!list.find((c) => c.id === aForm.carrierId)) {
        setAForm((p) => ({ ...p, carrierId: list[0]?.id || "" }));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aForm.facilityId]);

  useEffect(() => {
    (async () => {
      if (!aForm.facilityId) {
        setTrailerTypes([]);
        setAForm((p) => (p.trailerType ? { ...p, trailerType: "" } : p));
        return;
      }
      const list = await loadTrailerTypesForFacility(aForm.facilityId);
      const next = getDefaultTrailerType(list);
      setAForm((p) => (p.trailerType === next ? p : { ...p, trailerType: next }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aForm.facilityId]);

  useEffect(() => {
    (async () => {
      if (!aForm.facilityId) {
        setGoods([]);
        setAForm((p) => (p.goodsId ? { ...p, goodsId: "" } : p));
        return;
      }
      const list = await loadGoodsForFacility(aForm.facilityId);
      if (!list.find((g) => g.id === aForm.goodsId)) {
        setAForm((p) => ({ ...p, goodsId: list[0]?.id || "" }));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aForm.facilityId]);

  useEffect(() => setStatusFilter("all"), [tab]);

  useEffect(() => {
    (async () => {
      if (refSelected) return;
      if (!dForm.facilityId) {
        setDForm((p) => (p.trailerType ? { ...p, trailerType: "" } : p));
        return;
      }
      const list = await loadTrailerTypesForFacility(dForm.facilityId);
      const next = getDefaultTrailerType(list);
      setDForm((p) => (p.trailerType === next ? p : { ...p, trailerType: next }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dForm.facilityId, refSelected]);

  useEffect(() => {
    (async () => {
      if (!dForm.facilityId) {
        setDForm((p) => (p.goodsId ? { ...p, goodsId: "" } : p));
        return;
      }
      const list = await loadGoodsForFacility(dForm.facilityId);
      if (!list.find((g) => g.id === dForm.goodsId)) {
        setDForm((p) => ({ ...p, goodsId: list[0]?.id || "" }));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dForm.facilityId]);

  // ---------------------------
  // Fetch list
  // ---------------------------
  const fetchPage = async ({ reset } = { reset: true }) => {
    setLoading(true);
    setErr("");

    try {
      const take = FETCH_BATCH_SIZE;
      let skip = 0;
      let expectedTotal = 0;
      const allItems = [];

      // Load all pages so the table shows complete Arrivals/Departures, not only first 6.
      while (true) {
        const data =
          tab === "arrival"
            ? await getArrivals({ search: q, skip, take })
            : await getDepartures({ search: q, skip, take });

        const items = data?.items || [];
        expectedTotal = Number(data?.total ?? expectedTotal ?? 0);
        allItems.push(...items);

        if (!items.length) break;
        if (allItems.length >= expectedTotal) break;
        if (items.length < take) break;

        skip += items.length;
      }

      setRows(allItems);
      setTotal(expectedTotal || allItems.length);
      setVisibleCount(PAGE_SIZE);
      setShown(Math.min(PAGE_SIZE, allItems.length));
    } catch (e) {
      const msg =
        e?.response?.data?.title ||
        (e?.response?.data?.errors ? JSON.stringify(e.response.data.errors) : null) ||
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
  }, [tab, q]);

  const onRefresh = async () => {
    await Promise.all([loadArrivalRefs(), loadYardMoveRefs()]);
    await fetchPage({ reset: true });
  };

  const onLoadMore = () => {
    if (loading) return;
    setVisibleCount((prev) => prev + PAGE_SIZE);
    setShown((prev) => Math.min(prev + PAGE_SIZE, total));
  };

  const statusOptions = useMemo(() => {
    const base = tab === "arrival" ? ARRIVAL_STATUS : FINAL_STATUS;
    return ["all", ...base];
  }, [tab]);

  const filteredRows = useMemo(() => {
    let next = rows;

    if (facilityFilter !== "all") {
      next = next.filter((r) => String(r?.facilityId || "") === String(facilityFilter));
    }

    if (statusFilter === "all") return next;
    if (tab === "arrival") return next.filter((r) => (r?.status || "") === statusFilter);
    return next.filter((r) => (r?.finalStatus || "") === statusFilter);
  }, [rows, facilityFilter, statusFilter, tab]);

  const visibleRows = useMemo(
    () => filteredRows.slice(0, visibleCount),
    [filteredRows, visibleCount]
  );

  const tableTotal = filteredRows.length;
  const allLoaded = visibleRows.length >= tableTotal;

  const vehicleOptions = useMemo(() => {
    return vehicles
      .filter((v) => v.trailerNumber)
      .map((v) => ({ value: v.trailerNumber, label: `${v.vehicleType || "Vehicle"} / ${v.trailerNumber}` }));
  }, [vehicles]);

  const trailerNumberOptions = useMemo(
    () =>
      vehicles
        .filter((v) => v.trailerNumber)
        .map((v) => ({ value: v.trailerNumber, label: v.trailerNumber })),
    [vehicles]
  );

  const trailerTypeOptions = useMemo(() => {
    const unique = new Set(
      trailerTypes
        .map((t) => t.trailerTypeName)
        .filter((v) => v && String(v).trim())
    );
    if (!unique.size) {
      vehicles
        .map((v) => v.vehicleType)
        .filter((v) => v && String(v).trim())
        .forEach((v) => unique.add(v));
      TRAILER_TYPES.forEach((t) => unique.add(t));
    }
    return Array.from(unique).map((t) => ({ value: t, label: t }));
  }, [trailerTypes, vehicles]);

  const getDefaultTrailerType = (list = []) => {
    const fromList = list[0]?.trailerTypeName;
    if (fromList) return fromList;
    const fromVehicles = vehicles.find((v) => v.vehicleType)?.vehicleType;
    if (fromVehicles) return fromVehicles;
    return TRAILER_TYPES[0] || "";
  };

  const driverOptions = useMemo(
    () =>
      drivers
        .filter((d) => d.fullName)
        .map((d) => ({ value: d.fullName, label: d.fullName })),
    [drivers]
  );

  const carrierOptions = useMemo(
    () => carriers.map((c) => ({ value: c.id, label: c.carrierName })),
    [carriers]
  );

  const goodsOptions = useMemo(
    () => goods.map((g) => ({ value: g.id, label: g.goodsName })),
    [goods]
  );

  const refIdOptions = useMemo(() => {
    const base = yardMoveRefs
      .map((m) => {
        const refValue = String(m.refId || m.id);
        const trailerLabel = String(m.trailerNumber || "").trim().toUpperCase();
        return { value: refValue, label: trailerLabel || refValue };
      });

    const selectedRefId = String(dForm.refId || "").trim();
    const selectedTrailer = String(dForm.trailerNumber || "").trim().toUpperCase();
    if (selectedRefId && !base.some((o) => String(o.value) === selectedRefId)) {
      return [{ value: selectedRefId, label: selectedTrailer || selectedRefId }, ...base];
    }

    return base;
  }, [yardMoveRefs, dForm.refId, dForm.trailerNumber]);

  const isDuplicateTrailerInYard = (trailerNumber, currentId) => {
    const tn = normTrailerNumber(trailerNumber);
    if (!tn) return false;
    const current = String(currentId || "");
    return arrivalRefs.some((a) => {
      const id = String(a.id || a.arrivalId || "");
      if (current && id && id === current) return false;
      const atn = normTrailerNumber(a.trailerNumber);
      return atn && atn === tn;
    });
  };

  const loadCarriersForFacility = async (facilityId) => {
    try {
      if (!facilityId) {
        setCarriers([]);
        return [];
      }
      const res = await getCarriers({ facilityId, search: "", skip: 0, take: 200 });
      const list = (res?.items || []).map(normCarrier).filter((x) => x.id);
      setCarriers(list);
      return list;
    } catch (e) {
      setCarriers([]);
      setErr(e?.message || String(e));
      return [];
    }
  };

  const loadGatesForFacility = async (facilityId) => {
    try {
      if (!facilityId) {
        setEntryGates([]);
        setExitGates([]);
        return { entry: [], exit: [] };
      }

      const res = await getGates({ facilityId, search: "", skip: 0, take: 200 });
      const all = (res?.items || []).map(normGate);

      const active = all.filter((g) => (g.status || "").toUpperCase() === "ACTIVE");

      const entry = active.filter((g) => {
        const t = (g.gateType || "").toUpperCase();
        return t === "ENTRY" || t === "BOTH";
      });

      const exit = active.filter((g) => {
        const t = (g.gateType || "").toUpperCase();
        return t === "EXIT" || t === "BOTH";
      });

      setEntryGates(entry);
      setExitGates(exit);
      return { entry, exit };
    } catch (e) {
      setEntryGates([]);
      setExitGates([]);
      setErr(e?.message || String(e));
      return { entry: [], exit: [] };
    }
  };

  const loadTrailerTypesForFacility = async (facilityId) => {
    try {
      if (!facilityId) {
        setTrailerTypes([]);
        return [];
      }
      const res = await getTrailerTypes({ facilityId, search: "", skip: 0, take: 200 });
      const list = res?.items || [];
      setTrailerTypes(list);
      return list;
    } catch (e) {
      setTrailerTypes([]);
      setErr(e?.message || String(e));
      return [];
    }
  };

  const loadYardMoveRefs = async () => {
    try {
      const [movesRes, locationsRes, departuresRes] = await Promise.all([
        getYardMoves({ search: "", skip: 0, take: 1000 }),
        getLocations({ search: "", skip: 0, take: 1000 }),
        getDepartures({ search: "", skip: 0, take: 1000 }),
      ]);

      const gateLocationIds = new Set(
        (locationsRes?.items || [])
          .map(normLocation)
          .filter((l) => l.id && (l.locationType || "").includes("GATE"))
          .map((l) => l.id)
      );
      const gateLocationNames = new Set(
        (locationsRes?.items || [])
          .map(normLocation)
          .filter((l) => l.locationName && (l.locationType || "").includes("GATE"))
          .map((l) => String(l.locationName).trim().toLowerCase())
      );

      const consumedRefIds = new Set(
        (departuresRes?.items || [])
          .filter((d) => {
            const loadingStatus = String(pick(d, ["loadingStatus", "LoadingStatus"], "")).toUpperCase();
            const finalStatus = String(pick(d, ["finalStatus", "FinalStatus"], "")).toUpperCase();
            return loadingStatus === "COMPLETED" && finalStatus === "EXITED";
          })
          .map((d) =>
            String(
              pick(d, ["refYardMoveId", "RefYardMoveId", "refId", "RefId"], "")
            ).trim()
          )
          .filter(Boolean)
      );

      const normalizedMoves = (movesRes?.items || [])
        .map(normYardMoveRef)
        .filter((m) => m.id);

      // Keep only the latest move per trailer so old gate moves don't stay eligible
      // after the trailer is moved to parking/dock/other location.
      const latestMoveByTrailer = new Map();
      normalizedMoves.forEach((m) => {
        const tn = normTrailerNumber(m.trailerNumber);
        if (!tn) return;

        const time =
          Date.parse(m.moveDateTime || m.updatedAt || m.createdAt || "") ||
          0;

        const prev = latestMoveByTrailer.get(tn);
        if (!prev || time >= prev.time) {
          latestMoveByTrailer.set(tn, { move: m, time });
        }
      });

      const refs = Array.from(latestMoveByTrailer.values())
        .map((x) => x.move)
        .filter((m) => {
          if ((m.toLocationType || "").toUpperCase().includes("GATE")) return true;
          if (m.toLocationId && gateLocationIds.has(m.toLocationId)) return true;
          if (m.toLocationName && gateLocationNames.has(String(m.toLocationName).trim().toLowerCase())) return true;
          return false;
        })
        .filter((m) => {
          const refValue = String(m.refId || m.id).trim();
          const moveId = String(m.id || "").trim();
          return !consumedRefIds.has(refValue) && !consumedRefIds.has(moveId);
        })
        .sort((a, b) => String(b.id).localeCompare(String(a.id)));

      setYardMoveRefs(refs);
      return refs;
    } catch (e) {
      setYardMoveRefs([]);
      setErr(e?.message || String(e));
      return [];
    }
  };

  const loadGoodsForFacility = async (facilityId) => {
    try {
      if (!facilityId) {
        setGoods([]);
        return [];
      }
      const res = await getGoods({ facilityId, search: "", skip: 0, take: 200 });
      const list = (res?.items || [])
        .map(normGoods)
        .filter((x) => x.id && String(x.status || "").toUpperCase() !== "INACTIVE");
      setGoods(list);
      return list;
    } catch (e) {
      setGoods([]);
      setErr(e?.message || String(e));
      return [];
    }
  };


  // ---------------------------
  // Modal open/close
  // ---------------------------
  const resetForms = async () => {
    const defaultFacilityId = facilities[0]?.id || "";

    const [aLocs, dLocs, gates, carrierList, tTypes, gList] = await Promise.all([
      defaultFacilityId ? loadLocationsForFacility(defaultFacilityId, "arrival") : Promise.resolve([]),
      defaultFacilityId ? loadLocationsForFacility(defaultFacilityId, "departure") : Promise.resolve([]),
      defaultFacilityId ? loadGatesForFacility(defaultFacilityId) : Promise.resolve({ entry: [], exit: [] }),
      defaultFacilityId ? loadCarriersForFacility(defaultFacilityId) : Promise.resolve([]),
      defaultFacilityId ? loadTrailerTypesForFacility(defaultFacilityId) : Promise.resolve([]),
      defaultFacilityId ? loadGoodsForFacility(defaultFacilityId) : Promise.resolve([]),
    ]);

    setAForm({
      activityId: genActivityId("ARR"), // ✅ NOW it will show
      date: today(),
      timeIn: nowTime(),
      carrierId: carrierList[0]?.id || "",
      goodsId: gList[0]?.id || "",
      trailerType: "",
      trailerNumber: "",
      driverName: "",
      loadType: "Live Load",
      purpose: "Inbound",
      documentVerifiedYN: "Yes",
      securityClearedYN: "Yes",
      status: "Waiting",
      remarks: "",
      facilityId: defaultFacilityId,
      locationId: aLocs[0]?.id || "",
      entryGateId: gates.entry[0]?.id || "",
      trailerType: getDefaultTrailerType(tTypes),
    });

    setDForm({
      activityId: genActivityId("DEP"),
      refId: "",
      refArrivalId: "",
      date: today(),
      timeOut: nowTime(),
      facilityId: defaultFacilityId,
      locationId: dLocs[0]?.id || "",
      exitGateId: gates.exit[0]?.id || "",
      trailerType: getDefaultTrailerType(tTypes),
      goodsId: gList[0]?.id || "",
      trailerNumber: "",
      driverName: "",
      loadingStatus: "Completed",
      finalStatus: "Exited",
      delayReason: "",
      damageNotes: "",
      securityRemarks: "",
    });

    setAErrors({});
    await Promise.all([loadArrivalRefs(), loadYardMoveRefs()]);
  };

  const openAdd = async () => {
    setEditingId(null);
    setMode("add");
    await resetForms();
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setEditingId(null);
    setMode("add");
    setAErrors({});
  };

  // ---------------------------
  // Save Arrival
  // ---------------------------
  const saveArrival = async (e) => {
    e.preventDefault();
    if (isView) return;

    if (!aForm.facilityId) return setErr("Facility is required.");
    if (!aForm.locationId) return setErr("Location is required.");
    if (!aForm.entryGateId) return setErr("Entry Gate is required.");
    if (!aForm.carrierId) return setErr("Carrier is required.");
    if (!aForm.trailerNumber?.trim()) return setErr("Trailer Number is required.");

    if (isDuplicateTrailerInYard(aForm.trailerNumber, editingId)) {
      setAErrors({ trailerNumber: "The trailer is already inside the yard." });
      return;
    }

    setErr("");
    setAErrors({});
    setLoading(true);

    try {
      const selectedEntryGate = entryGates.find((g) => String(g.id) === String(aForm.entryGateId));
      const selectedEntryGateName = String(selectedEntryGate?.gateName || "").trim();
      if (!selectedEntryGateName) {
        setErr("Entry Gate is required.");
        setLoading(false);
        return;
      }

      const payload = {
        // ✅ send activityId too (if backend ignores, fine)
        activityId: aForm.activityId || genActivityId("ARR"),
        date: aForm.date,
        timeIn: aForm.timeIn,
        carrierId: aForm.carrierId,
        trailerType: (aForm.trailerType || "").trim() || null,
        goodsId: aForm.goodsId || null,
        trailerNumber: normTrailerNumber(aForm.trailerNumber),
        driverName: (aForm.driverName || "").trim() || null,
        loadType: aForm.loadType,
        purpose: aForm.purpose,
        documentVerified: ynToBool(aForm.documentVerifiedYN),
        securityCleared: ynToBool(aForm.securityClearedYN),
        status: aForm.status,
        remarks: (aForm.remarks || "").trim() || null,
        facilityId: aForm.facilityId,
        locationId: aForm.locationId,
        entryGateId: aForm.entryGateId,
        gateNo: selectedEntryGateName,
      };

      if (editingId) await updateArrival(editingId, payload);
      else await createArrival(payload);

      window.dispatchEvent(new Event(DASHBOARD_REFRESH));
      closeModal();
      await Promise.all([loadArrivalRefs(), loadYardMoveRefs()]);
      await fetchPage({ reset: true });
    } catch (e2) {
      const msg =
        e2?.response?.data?.title ||
        (e2?.response?.data?.errors ? JSON.stringify(e2.response.data.errors) : null) ||
        e2?.message ||
        String(e2);
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------
  // Ref Arrival change handler
  // ---------------------------
  const onSelectRefArrival = async (refId) => {
    if (!refId) {
      setDForm((p) => ({ ...p, refArrivalId: "", trailerType: "", trailerNumber: "" }));
      return;
    }

    const a =
      arrivalRefs.find((x) => String(x.id || x.arrivalId || "") === String(refId)) ||
      arrivalRefs.find((x) => String(x.activityId || "") === String(refId));

    if (!a) {
      setDForm((p) => ({ ...p, refArrivalId: refId }));
      return;
    }

    const fid = String(a.facilityId || "");
    let locs = dLocations;
    let nextExitGates = exitGates;

    if (fid && fid !== dForm.facilityId) {
      const [newLocs, gates] = await Promise.all([
        loadLocationsForFacility(fid, "departure"),
        loadGatesForFacility(fid),
        loadGoodsForFacility(fid),
      ]);
      locs = newLocs;
      nextExitGates = gates.exit || [];
    }

    setDForm((p) => ({
      ...p,
      refArrivalId: String(a.id || a.arrivalId || refId),
      facilityId: fid || p.facilityId,
      locationId: String(a.locationId || locs?.[0]?.id || p.locationId || ""),
      exitGateId: nextExitGates.some((g) => String(g.id) === String(p.exitGateId))
        ? p.exitGateId
        : (nextExitGates[0]?.id || ""),
      trailerType: a.trailerType || p.trailerType || "",
      goodsId: String(a.goodsId || p.goodsId || ""),
      trailerNumber: (a.trailerNumber || "").toUpperCase(),
      driverName: a.driverName || p.driverName || "",
    }));
  };

  const onSelectRefId = async (selectedRefId) => {
    if (!selectedRefId) {
      setDForm((p) => ({ ...p, refId: "" }));
      return;
    }

    const selectedMove = yardMoveRefs.find(
      (m) => String(m.refId || m.id) === String(selectedRefId)
    );

    if (!selectedMove) {
      setDForm((p) => ({ ...p, refId: selectedRefId }));
      return;
    }

    const nextFacilityId = String(selectedMove.facilityId || dForm.facilityId || "");
    let nextLocations = dLocations;
    let nextExitGates = exitGates;
    let nextTrailerType = dForm.trailerType;
    let nextGoodsId = dForm.goodsId;

    if (nextFacilityId && nextFacilityId !== dForm.facilityId) {
      const [locs, gates, tTypes, gList] = await Promise.all([
        loadLocationsForFacility(nextFacilityId, "departure"),
        loadGatesForFacility(nextFacilityId),
        loadTrailerTypesForFacility(nextFacilityId),
        loadGoodsForFacility(nextFacilityId),
      ]);
      nextLocations = locs;
      nextExitGates = gates.exit;
      nextTrailerType = getDefaultTrailerType(tTypes);
      nextGoodsId = gList[0]?.id || "";
    }

    const targetLocationId = String(selectedMove.toLocationId || "");
    const hasTargetLocation = nextLocations.some((l) => String(l.id) === targetLocationId);

    setDForm((p) => ({
      // Keep values valid for the selected reference facility.
      ...p,
      refId: selectedRefId,
      facilityId: nextFacilityId || p.facilityId,
      locationId: hasTargetLocation
        ? targetLocationId
        : nextLocations.some((l) => String(l.id) === String(p.locationId))
          ? p.locationId
          : (nextLocations[0]?.id || ""),
      exitGateId: nextExitGates.some((g) => String(g.id) === String(p.exitGateId))
        ? p.exitGateId
        : (nextExitGates[0]?.id || ""),
      trailerType: nextTrailerType || p.trailerType || "",
      goodsId: nextGoodsId || p.goodsId || "",
      trailerNumber: selectedMove.trailerNumber || p.trailerNumber || "",
    }));
  };

  // ---------------------------
  // Save Departure
  // ---------------------------
  const saveDeparture = async (e) => {
    e.preventDefault();
    if (isView) return;

    if (!dForm.facilityId) return setErr("Facility is required.");
    if (!dForm.locationId) return setErr("Location is required.");
    if (!dForm.exitGateId) return setErr("Exit Gate is required.");

    if (!dForm.refArrivalId && !dForm.refId) {
      if (!dForm.trailerNumber?.trim()) return setErr("Trailer Number is required.");
    }

    setErr("");
    setLoading(true);

    try {
      const selectedExitGate = exitGates.find((g) => String(g.id) === String(dForm.exitGateId));
      const selectedExitGateName = String(selectedExitGate?.gateName || "").trim();

      const payload = {
        activityId: dForm.activityId || genActivityId("DEP"),
        refId: dForm.refId || null,
        refYardMoveId: dForm.refId || null,
        refArrivalId: dForm.refArrivalId || null,
        date: dForm.date,
        timeOut: dForm.timeOut,
        facilityId: dForm.facilityId,
        locationId: dForm.locationId,
        exitGateId: dForm.exitGateId,
        exitGateNo: selectedExitGateName || null,
        trailerType: (dForm.trailerType || "").trim() || null,
        goodsId: dForm.goodsId || null,
        trailerNumber: (dForm.trailerNumber || "").trim().toUpperCase().replace(/\s+/g, ""),
        driverName: (dForm.driverName || "").trim() || null,
        loadingStatus: dForm.loadingStatus,
        finalStatus: dForm.finalStatus,
        delayReason: (dForm.delayReason || "").trim() || null,
        damageNotes: (dForm.damageNotes || "").trim() || null,
        securityRemarks: (dForm.securityRemarks || "").trim() || null,
      };

      if (editingId) await updateDeparture(editingId, payload);
      else await createDeparture(payload);

      window.dispatchEvent(new Event(DASHBOARD_REFRESH));
      closeModal();
      await Promise.all([loadArrivalRefs(), loadYardMoveRefs()]);
      await fetchPage({ reset: true });
    } catch (e2) {
      const msg =
        e2?.response?.data?.title ||
        (e2?.response?.data?.errors ? JSON.stringify(e2.response.data.errors) : null) ||
        e2?.message ||
        String(e2);
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------
  // Open view/edit
  // ---------------------------
  const openView = async (r) => {
    setEditingId(r.id);
    setMode("view");
    setOpen(true);

    const facilityId = String(r.facilityId || "");
    const [locs, gates] = await Promise.all([
      loadLocationsForFacility(facilityId, tab === "arrival" ? "arrival" : "departure"),
      loadGatesForFacility(facilityId),
    ]);
    await loadGoodsForFacility(facilityId);
    if (tab === "arrival") {
      await loadCarriersForFacility(facilityId);
    }

    await Promise.all([loadArrivalRefs(), loadYardMoveRefs()]);

    if (tab === "arrival") {
      const gateName = String(r.gateNo || r.GateNo || "").trim().toLowerCase();
      const matchedEntryGate = gates.entry?.find(
        (g) => String(g.gateName || "").trim().toLowerCase() === gateName
      );
      setAForm({
        activityId: r.activityId || "",
        date: r.date || today(),
        timeIn: r.timeIn || nowTime(),
        carrierId: String(r.carrierId || ""),
        trailerType: r.trailerType || "",
        goodsId: String(r.goodsId || ""),
        trailerNumber: (r.trailerNumber || "").toUpperCase(),
        driverName: r.driverName || "",
        loadType: r.loadType || "Live Load",
        purpose: r.purpose || "Inbound",
        documentVerifiedYN: boolToYN(toBool(r.documentVerified)),
        securityClearedYN: boolToYN(toBool(r.securityCleared)),
        status: r.status || "Waiting",
        remarks: r.remarks || "",
        facilityId,
        locationId: String(r.locationId || locs[0]?.id || ""),
        entryGateId: String(r.entryGateId || matchedEntryGate?.id || gates.entry?.[0]?.id || ""),
      });
    } else {
      const exitGateName = String(r.exitGateNo || r.ExitGateNo || "").trim().toLowerCase();
      const matchedExitGate = gates.exit?.find(
        (g) => String(g.gateName || "").trim().toLowerCase() === exitGateName
      );
      setDForm({
        activityId: r.activityId || "",
        refId: String(r.refId || r.refYardMoveId || ""),
        refArrivalId: String(r.refArrivalId || ""),
        date: r.date || today(),
        timeOut: r.timeOut || nowTime(),
        facilityId,
        locationId: String(r.locationId || locs[0]?.id || ""),
        exitGateId: String(r.exitGateId || matchedExitGate?.id || gates.exit?.[0]?.id || ""),
        trailerType: r.trailerType || "",
        goodsId: String(r.goodsId || ""),
        trailerNumber: (r.trailerNumber || "").toUpperCase(),
        driverName: r.driverName || "",
        loadingStatus: r.loadingStatus || "Completed",
        finalStatus: r.finalStatus || "Exited",
        delayReason: r.delayReason || "",
        damageNotes: r.damageNotes || "",
        securityRemarks: r.securityRemarks || "",
      });
    }
  };

  const openEdit = async (r) => {
    await openView(r);
    setMode("edit");
  };

  const onDelete = async () => {
    if (!deleteTarget?.id) return;
    setErr("");
    setLoading(true);

    try {
      if (deleteTarget.kind === "arrival") await deleteArrival(deleteTarget.id);
      else await deleteDeparture(deleteTarget.id);

      window.dispatchEvent(new Event(DASHBOARD_REFRESH));
      await Promise.all([loadArrivalRefs(), loadYardMoveRefs()]);
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
      kind: tab,
      activityId: row?.activityId || "",
      trailerNumber: row?.trailerNumber || "",
    });
  };

  const closeDeleteConfirm = () => {
    if (loading) return;
    setDeleteTarget(null);
  };

  // ---------------------------
  // Export CSV
  // ---------------------------
  const onExportCsv = () => {
    const header =
      tab === "arrival"
        ? ["ActivityId", "Date", "TimeIn", "Carrier", "TrailerNumber", "Facility", "Location", "Status"]
        : ["ActivityId", "Date", "TimeOut", "TrailerNumber", "Facility", "Location", "LoadingStatus", "FinalStatus"];

    const lines = [
      header.join(","),
      ...filteredRows.map((r) => {
        const arr =
          tab === "arrival"
            ? [
                r.activityId || "",
                r.date || "",  
                r.timeIn,
                r.carrierName || "",
                r.trailerNumber || "",
                r.facilityName || "",
                r.locationName || "",
                r.status || "",
              ]
            : [
                r.activityId || "",
                r.date,
                r.timeOut,
                r.trailerNumber || "",
                r.facilityName || "",
                r.locationName || "",
                r.loadingStatus || "",
                r.finalStatus || "",
              ];
        return arr.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",");
      }),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gate_${tab}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---------------------------
  // UI helpers
  // ---------------------------
  const badgeClass = (val) => {
    const v = (val || "").toLowerCase();
    if (v.includes("rejected") || v.includes("cancel")) return "ga-pill ga-pill--bad";
    if (v.includes("waiting") || v.includes("hold") || v.includes("re-check")) return "ga-pill ga-pill--warn";
    if (v.includes("entered") || v.includes("exited") || v.includes("completed")) return "ga-pill ga-pill--ok";
    return "ga-pill ga-pill--neutral";
  };

  const modalTitle = () => {
    const entity = tab === "arrival" ? "Arrival" : "Departure";
    if (mode === "view") return `View ${entity}`;
    if (mode === "edit") return `Edit ${entity}`;
    return `Add ${entity}`;
  };
  const pageTitle = fixedTab
    ? fixedTab === "arrival"
      ? "Arrival Management"
      : "Departure Management"
    : "Gate Activity";

  const onTabChange = (nextTab) => {
    if (fixedTab) {
      navigate(nextTab === "arrival" ? "/dashboard/gate-activity" : "/dashboard/gate-departure");
      return;
    }
    setTab(nextTab);
  };

  return (
    <div className="adm-page">
      <div className="adm-card glass">
        <div className="adm-head">
          <h2 className="adm-title">{pageTitle}</h2>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button className="adm-act" title="Refresh" type="button" onClick={onRefresh}>
              <FiRefreshCw />
            </button>

            <button className="adm-act" title="Export CSV" type="button" onClick={onExportCsv}>
              <FiFileText />
            </button>

            <button className="adm-addBtn" onClick={openAdd} type="button" disabled={!facilities.length}>
              <FiPlus /> Add {tab === "arrival" ? "Arrival" : "Departure"}
            </button>
          </div>
        </div>

        {!fixedTab && (
          <div className="ga-tabsRow">
            <button
              type="button"
              className={`ga-tabBtn ${tab === "arrival" ? "is-active" : ""}`}
              onClick={() => onTabChange("arrival")}
            >
              Arrivals
            </button>
            <button
              type="button"
              className={`ga-tabBtn ${tab === "departure" ? "is-active" : ""}`}
              onClick={() => onTabChange("departure")}
            >
              Departures
            </button>
          </div>
        )}

        <div className="adm-filters">
          <div className="adm-search">
            <FiSearch />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by trailer, facility, gate, status..." />
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
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All Status" : s}
              </option>
            ))}
          </select>
        </div>

        {err && <div className="adm-error">{err}</div>}

        <div className="adm-tableWrap">
          <div className="adm-tableTitleRow">
            <div className="adm-tableTitle">{tab === "arrival" ? "Arrival List" : "Departure List"}</div>
            <div className="adm-totalPill">Total: {tableTotal}</div>
          </div>

          <table className="adm-table">
            <thead>
              {tab === "arrival" ? (
                <tr>
                  <th>Date</th>
                  <th>Time In</th>
                  <th>Trailer No</th>
                  <th>Facility</th>
                  <th>Carrier</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th style={{ width: 200 }}>Actions</th>
                </tr>
              ) : (
                <tr>
                  <th>Date</th>
                  <th>Time Out</th>
                  <th>Trailer No</th>
                  <th>Facility</th>
                  <th>Location</th>
                  <th>Loading</th>
                  <th>Final</th>
                  <th style={{ width: 160 }}>Actions</th>
                </tr>
              )}
            </thead>

            <tbody>
              {tableTotal === 0 && !loading ? (
                <tr>
                  <td colSpan={8} className="adm-empty">
                    No records found.
                  </td>
                </tr>
              ) : (
                visibleRows.map((r) => (
                  <tr key={r.id}>
                    {tab === "arrival" ? (
                      <>
                        <td className="mono">{r.date}</td>
                        <td className="mono">{formatClock12h(r.timeIn)}</td>
                        <td className="mono">{r.trailerNumber || "-"}</td>
                        <td>{r.facilityName || "-"}</td>
                        <td>{r.carrierName || "-"}</td>
                        <td>{r.locationName || "-"}</td>
                        <td>
                          <span className={badgeClass(r.status)}>{r.status}</span>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="mono">{r.date}</td>
                        <td className="mono">{formatClock12h(r.timeOut)}</td>
                        <td className="mono">{r.trailerNumber || "-"}</td>
                        <td>{r.facilityName || "-"}</td>
                        <td>{r.locationName || "-"}</td>
                        <td>
                          <span className={badgeClass(r.loadingStatus)}>{r.loadingStatus}</span>
                        </td>
                        <td>
                          <span className={badgeClass(r.finalStatus)}>{r.finalStatus}</span>
                        </td>
                      </>
                    )}

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

                      {tab === "arrival" && (
                        <button className="adm-act" title="Print Barcode" type="button" onClick={() => printArrivalBarcode(r)}>
                          <FiFileText size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="adm-footerRow">
            <div className="adm-showingText">
              Showing <strong>{Math.min(visibleRows.length, tableTotal)}</strong> of <strong>{tableTotal}</strong>
            </div>

            <div className="adm-footerRight">
              {tableTotal > 0 && !allLoaded && (
                <button type="button" className="adm-loadMoreBtn" onClick={onLoadMore} disabled={loading}>
                  {loading ? "Loading..." : "Load more"}
                </button>
              )}
              {tableTotal > 0 && allLoaded && <span className="adm-allLoaded">All loaded</span>}
            </div>
          </div>
        </div>

        {/* MODAL */}
        {open && (
          <div className="ga-modalOverlay" onClick={closeModal}>
            <div className="ga-modal glass" onClick={(e) => e.stopPropagation()}>
              <div className="ga-modalTop">
                <h3 className="ga-modalTitle">{modalTitle()}</h3>

                {tab === "arrival" && (
                  <button
                    type="button"
                    className="adm-act"
                    title="Print Barcode"
                    onClick={() => printArrivalBarcode(aForm.activityId)}
                    disabled={!aForm.activityId}
                  >
                    <FiFileText />
                  </button>
                )}
              </div>

              {tab === "arrival" ? (
                <form className="ga-modalBody" onSubmit={saveArrival}>
                  <div className="ga-formGrid ga-formGrid--2">
                    <GAInput label="Activity ID" value={aForm.activityId} disabled />
                    <GAInput label="Time In" type="time" value={aForm.timeIn} disabled />

                    <GAInput
                      label="Date"
                      type="date"
                      value={aForm.date}
                      disabled={isView}
                      onChange={(v) => setAForm((p) => ({ ...p, date: v }))}
                    />

                    <GASelect
                      label="Facility"
                      value={aForm.facilityId}
                      disabled={isView}
                      onChange={async (v) => {
                        const [locs, gates, carrierList, tTypes, gList] = await Promise.all([
                          loadLocationsForFacility(v, "arrival"),
                          loadGatesForFacility(v),
                          loadCarriersForFacility(v),
                          loadTrailerTypesForFacility(v),
                          loadGoodsForFacility(v),
                        ]);
                        setAForm((p) => ({
                          ...p,
                          facilityId: v,
                          locationId: locs[0]?.id || "",
                          entryGateId: gates.entry?.[0]?.id || "",
                          carrierId: carrierList[0]?.id || "",
                          trailerType: getDefaultTrailerType(tTypes),
                          goodsId: gList[0]?.id || "",
                        }));
                      }}
                      options={facilities.map((f) => ({ value: f.id, label: f.facilityName }))}
                      placeholder={facilities.length ? "Select facility" : "No facilities"}
                    />

                    <GASelect
                      label="Carrier"
                      value={aForm.carrierId}
                      disabled={isView}
                      onChange={(v) => setAForm((p) => ({ ...p, carrierId: v }))}
                      options={carrierOptions}
                      placeholder={carrierOptions.length ? "Select carrier" : "No carriers"}
                    />

                    <GASelect
                      label="Location"
                      value={aForm.locationId}
                      disabled={isView || !aForm.facilityId}
                      onChange={(v) => setAForm((p) => ({ ...p, locationId: v }))}
                      options={aLocations.map((l) => ({ value: l.id, label: l.locationName }))}
                      placeholder={!aForm.facilityId ? "Select facility first" : "Select location"}
                    />

                    <GASelect
                      label="Entry Gate"
                      value={aForm.entryGateId}
                      disabled={isView || !aForm.facilityId}
                      onChange={(v) => setAForm((p) => ({ ...p, entryGateId: v }))}
                      options={entryGates.map((g) => ({ value: g.id, label: g.gateName }))}
                      placeholder={!aForm.facilityId ? "Select facility first" : "Select entry gate"}
                    />

                    <GASelect
                      label="Trailer Type"
                      value={aForm.trailerType}
                      disabled={isView}
                      onChange={(v) => setAForm((p) => ({ ...p, trailerType: v }))}
                      options={trailerTypeOptions}
                      placeholder="Select trailer type"
                    />

                    <GASelect
                      label="Goods"
                      value={aForm.goodsId}
                      disabled={isView || !aForm.facilityId}
                      onChange={(v) => setAForm((p) => ({ ...p, goodsId: v }))}
                      options={goodsOptions}
                      placeholder={goodsOptions.length ? "Select goods" : "No goods"}
                    />

                    <div className="ga-fieldStack">
                      <GADataList
                        label="Trailer Number"
                        value={(aForm.trailerNumber || "").toUpperCase()}
                        disabled={isView}
                        onChange={(v) => {
                          const cleaned = (v || "").toUpperCase();
                          const selected = vehicles.find((x) => x.trailerNumber === cleaned);
                          if (aErrors.trailerNumber) {
                            setAErrors((p) => ({ ...p, trailerNumber: "" }));
                          }
                          setAForm((p) => ({
                            ...p,
                            trailerNumber: cleaned,
                            trailerType: selected?.vehicleType || p.trailerType,
                          }));
                        }}
                        placeholder="Type trailer number"
                        options={trailerNumberOptions}
                        listId="arrival-trailer"
                      />
                      <div className="arrival-error-slot">
                        {aErrors.trailerNumber ? aErrors.trailerNumber : ""}
                      </div>
                    </div>

                    <GADataList
                      label="Driver Name"
                      value={aForm.driverName}
                      disabled={isView}
                      onChange={(v) => setAForm((p) => ({ ...p, driverName: v }))}
                      options={driverOptions}
                      placeholder="Type driver name"
                      listId="arrival-driver"
                    />

                    <GASelect
                      label="Purpose"
                      value={aForm.purpose}
                      disabled={isView}
                      onChange={(v) => setAForm((p) => ({ ...p, purpose: v }))}
                      options={PURPOSE_OPTIONS.map((x) => ({ value: x, label: x }))}
                    />

                    <GASelect
                      label="Document Verified"
                      value={aForm.documentVerifiedYN}
                      disabled={isView}
                      onChange={(v) => setAForm((p) => ({ ...p, documentVerifiedYN: v }))}
                      options={["Yes", "No"]}
                    />

                    <GASelect
                      label="Security Cleared"
                      value={aForm.securityClearedYN}
                      disabled={isView}
                      onChange={(v) => setAForm((p) => ({ ...p, securityClearedYN: v }))}
                      options={["Yes", "No"]}
                    />

                    <GASelect
                      label="Status"
                      value={aForm.status}
                      disabled={isView}
                      onChange={(v) => setAForm((p) => ({ ...p, status: v }))}
                      options={ARRIVAL_STATUS.map((x) => ({ value: x, label: x }))}
                    />

                    <div className="ga-span2">
                      <GAInput
                        label="Remarks (optional)"
                        value={aForm.remarks}
                        disabled={isView}
                        onChange={(v) => setAForm((p) => ({ ...p, remarks: v }))}
                        placeholder="Optional..."
                      />
                    </div>
                  </div>

                  <div className="ga-modalActions">
                    <button type="button" className="ga-btn ga-btn--ghost" onClick={closeModal}>
                      {isView ? "Close" : "Cancel"}
                    </button>
                    {!isView && (
                      <button type="submit" className="ga-btn ga-btn--primary" disabled={loading}>
                        {loading ? "Saving..." : "Save"}
                      </button>
                    )}
                  </div>
                </form>
              ) : (
                <form className="ga-modalBody" onSubmit={saveDeparture}>
                  <div className="ga-formGrid ga-formGrid--2">
                    <GAInput label="Activity ID" value={dForm.activityId} disabled />

                    <GASelect
                      label="Ref ID"
                      value={dForm.refId}
                      disabled={isView}
                      onChange={onSelectRefId}
                      options={refIdOptions}
                      placeholder={refIdOptions.length ? "Select ref id" : "No gate-move refs"}
                    />

                    <GAInput label="Time Out" type="time" value={dForm.timeOut} disabled />

                    <GAInput
                      label="Date"
                      type="date"
                      value={dForm.date}
                      disabled={isView}
                      onChange={(v) => setDForm((p) => ({ ...p, date: v }))}
                    />

                    <GASelect
                      label="Facility"
                      value={dForm.facilityId}
                      disabled={isView}
                      onChange={async (v) => {
                        const [locs, gates, tTypes, gList] = await Promise.all([
                          loadLocationsForFacility(v, "departure"),
                          loadGatesForFacility(v),
                          loadTrailerTypesForFacility(v),
                          loadGoodsForFacility(v),
                        ]);
                        setDForm((p) => ({
                          ...p,
                          refId: "",
                          facilityId: v,
                          locationId: locs[0]?.id || "",
                          exitGateId: gates.exit?.[0]?.id || "",
                          trailerType: refSelected ? p.trailerType : getDefaultTrailerType(tTypes),
                          goodsId: gList[0]?.id || "",
                        }));
                      }}
                      options={facilities.map((f) => ({ value: f.id, label: f.facilityName }))}
                      placeholder={facilities.length ? "Select facility" : "No facilities"}
                    />

                    <GASelect
                      label="Location"
                      value={dForm.locationId}
                      disabled={isView || !dForm.facilityId}
                      onChange={(v) => setDForm((p) => ({ ...p, locationId: v }))}
                      options={dLocations.map((l) => ({ value: l.id, label: l.locationName }))}
                      placeholder={!dForm.facilityId ? "Select facility first" : "Select location"}
                    />

                    <GASelect
                      label="Exit Gate"
                      value={dForm.exitGateId}
                      disabled={isView || !dForm.facilityId}
                      onChange={(v) => setDForm((p) => ({ ...p, exitGateId: v }))}
                      options={exitGates.map((g) => ({ value: g.id, label: g.gateName }))}
                      placeholder={!dForm.facilityId ? "Select facility first" : "Select exit gate"}
                    />

                    <GASelect
                      label="Trailer Type"
                      value={dForm.trailerType}
                      disabled={isView || refSelected}
                      onChange={(v) => setDForm((p) => ({ ...p, trailerType: v }))}
                      options={trailerTypeOptions}
                      placeholder="Select trailer type"
                    />

                    <GASelect
                      label="Goods"
                      value={dForm.goodsId}
                      disabled={isView || !dForm.facilityId}
                      onChange={(v) => setDForm((p) => ({ ...p, goodsId: v }))}
                      options={goodsOptions}
                      placeholder={goodsOptions.length ? "Select goods" : "No goods"}
                    />

                    <GADataList
                      label="Trailer Number"
                      value={(dForm.trailerNumber || "").toUpperCase()}
                      disabled={isView || refSelected}
                      onChange={async (v) => {
                        const cleaned = (v || "").toUpperCase();
                        const selected = vehicles.find((x) => x.trailerNumber === cleaned);
                        const nextFacilityId = String(selected?.facilityId || "");

                        if (nextFacilityId && nextFacilityId !== String(dForm.facilityId || "")) {
                          const [locs, gates, tTypes, gList] = await Promise.all([
                            loadLocationsForFacility(nextFacilityId, "departure"),
                            loadGatesForFacility(nextFacilityId),
                            loadTrailerTypesForFacility(nextFacilityId),
                            loadGoodsForFacility(nextFacilityId),
                          ]);

                          setDForm((p) => ({
                            ...p,
                            trailerNumber: cleaned,
                            facilityId: nextFacilityId,
                            locationId: locs.some((l) => String(l.id) === String(p.locationId))
                              ? p.locationId
                              : (locs[0]?.id || ""),
                            exitGateId: gates.exit?.some((g) => String(g.id) === String(p.exitGateId))
                              ? p.exitGateId
                              : (gates.exit?.[0]?.id || ""),
                            trailerType: selected?.vehicleType || getDefaultTrailerType(tTypes) || p.trailerType,
                            goodsId: gList.some((g) => String(g.id) === String(p.goodsId))
                              ? p.goodsId
                              : (gList[0]?.id || ""),
                          }));
                          return;
                        }

                        setDForm((p) => ({
                          ...p,
                          trailerNumber: cleaned,
                          trailerType: selected?.vehicleType || p.trailerType,
                        }));
                      }}
                      placeholder={refSelected ? "Auto from selected ref" : "Type trailer number"}
                      options={trailerNumberOptions}
                      listId="departure-trailer"
                    />

                    <GADataList
                      label="Driver Name"
                      value={dForm.driverName}
                      disabled={isView}
                      onChange={(v) => setDForm((p) => ({ ...p, driverName: v }))}
                      options={driverOptions}
                      placeholder="Type driver name"
                      listId="departure-driver"
                    />

                    <GASelect
                      label="Loading Status"
                      value={dForm.loadingStatus}
                      disabled={isView}
                      onChange={(v) => setDForm((p) => ({ ...p, loadingStatus: v }))}
                      options={LOADING_STATUS.map((x) => ({ value: x, label: x }))}
                    />

                    <GASelect
                      label="Final Status"
                      value={dForm.finalStatus}
                      disabled={isView}
                      onChange={(v) => setDForm((p) => ({ ...p, finalStatus: v }))}
                      options={FINAL_STATUS.map((x) => ({ value: x, label: x }))}
                    />

                    <GAInput
                      label="Delay Reason (optional)"
                      value={dForm.delayReason}
                      disabled={isView}
                      onChange={(v) => setDForm((p) => ({ ...p, delayReason: v }))}
                      placeholder="Optional..."
                    />

                    <GAInput
                      label="Damage Notes (optional)"
                      value={dForm.damageNotes}
                      disabled={isView}
                      onChange={(v) => setDForm((p) => ({ ...p, damageNotes: v }))}
                      placeholder="Optional..."
                    />

                    <div className="ga-span2">
                      <GAInput
                        label="Security Remarks (optional)"
                        value={dForm.securityRemarks}
                        disabled={isView}
                        onChange={(v) => setDForm((p) => ({ ...p, securityRemarks: v }))}
                        placeholder="Optional..."
                      />
                    </div>
                  </div>

                  <div className="ga-modalActions">
                    <button type="button" className="ga-btn ga-btn--ghost" onClick={closeModal}>
                      {isView ? "Close" : "Cancel"}
                    </button>
                    {!isView && (
                      <button type="submit" className="ga-btn ga-btn--primary" disabled={loading}>
                        {loading ? "Saving..." : "Save"}
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {!!deleteTarget && (
          <div className="ga-confirmOverlay" onClick={closeDeleteConfirm}>
            <div className="ga-confirmModal" onClick={(e) => e.stopPropagation()}>
              <div className="ga-confirmHead">
                <h3>Delete {deleteTarget.kind === "arrival" ? "Arrival" : "Departure"}?</h3>
              </div>
              <div className="ga-confirmBody">
                <p>This action cannot be undone.</p>
                <div className="ga-confirmMeta">
                  <span>{deleteTarget.activityId || "No Activity ID"}</span>
                  <span>{deleteTarget.trailerNumber || "No Trailer"}</span>
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

// ---------------------------
// Small input components
// ---------------------------
function GAInput({ label, value, onChange, type = "text", disabled = false, placeholder }) {
  return (
    <div className="ga-field">
      <label className="ga-label">{label}</label>
      <input
        className="ga-input"
        type={type}
        value={value ?? ""}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </div>
  );
}

function GASelect({ label, value, onChange, options = [], placeholder = "Select", disabled = false }) {
  return (
    <div className="ga-field">
      <label className="ga-label">{label}</label>
      <select
        className="ga-select"
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => {
          const v = typeof o === "string" ? o : o.value;
          const t = typeof o === "string" ? o : o.label;
          return (
            <option key={v} value={v}>
              {t}
            </option>
          );
        })}
      </select>
    </div>
  );
}

function GADataList({ label, value, onChange, options = [], placeholder = "Type or select", disabled = false, listId }) {
  const id = listId || `ga-list-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className="ga-field">
      <label className="ga-label">{label}</label>
      <input
        className="ga-input"
        list={id}
        value={value ?? ""}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
      />
      <datalist id={id}>
        {options.map((o) => {
          const v = typeof o === "string" ? o : o.value;
          const t = typeof o === "string" ? o : o.label;
          return (
            <option key={v} value={v}>
              {t}
            </option>
          );
        })}
      </datalist>
    </div>
  );
}
