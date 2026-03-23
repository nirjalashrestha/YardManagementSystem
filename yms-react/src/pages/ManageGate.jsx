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

import {
  getGates,
  createGate,
  updateGate,
  deleteGate,
} from "../services/gateService";
import { getFacilities } from "../services/facilityService";
import GateModal from "./GateModal";

const PAGE_SIZE = 6;

export default function ManageGatePage() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [facilityFilter, setFacilityFilter] = useState("all");

  // keep facilities for Add/Edit modal dropdown
  const [facilities, setFacilities] = useState([]);

  const [total, setTotal] = useState(0);
  const [shown, setShown] = useState(0);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    facilityId: "",
    gateName: "",
    gateType: "BOTH",
    status: "ACTIVE",
    sortOrder: 1,
  });

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const allLoaded = shown >= total;

  // Load facilities once (for modal)
  useEffect(() => {
    (async () => {
      try {
        const res = await getFacilities({ search: "", skip: 0, take: 200 });
        const list = res.items || [];
        setFacilities(list);

        // set default facility for modal form
        if (list.length > 0) {
          setForm((p) => ({ ...p, facilityId: p.facilityId || list[0].id }));
        }
      } catch (e) {
        setErr(e?.message || String(e));
      }
    })();
  }, []);

  const fetchPage = async ({ reset } = { reset: true }) => {
    setLoading(true);
    setErr("");

    try {
      const skip = reset ? 0 : rows.length;
      const take = PAGE_SIZE;

      // ✅ no facility filter now
      const data = await getGates({
        search: q,
        facilityId: facilityFilter === "all" ? "" : facilityFilter,
        status: "",
        type: "",
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
      setShown(
        data.shown ?? Math.min(skip + items.length, data.total ?? 0)
      );
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  // Refetch on search change only
  useEffect(() => {
    fetchPage({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, facilityFilter]);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      facilityId: facilities[0]?.id || "",
      gateName: "",
      gateType: "BOTH",
      status: "ACTIVE",
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
      facilityId: r.facilityId || facilities[0]?.id || "",
      gateName: r.gateName || "",
      gateType: (r.gateType || "BOTH").toUpperCase(),
      status: (r.status || "ACTIVE").toUpperCase(),
      sortOrder: r.sortOrder ?? 1,
    });
    setOpen(true);
  };

  const onSave = async (e) => {
    e.preventDefault();
    setErr("");

    const payload = {
      facilityId: form.facilityId,
      gateName: (form.gateName || "").trim(),
      gateType: (form.gateType || "BOTH").toUpperCase(),
      status: (form.status || "ACTIVE").toUpperCase(),
      sortOrder: Number(form.sortOrder || 1),
    };

    if (!payload.gateName || !payload.facilityId) return;

    setLoading(true);
    try {
      if (editingId) await updateGate(editingId, payload);
      else await createGate(payload);

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
    setErr("");

    setLoading(true);
    try {
      await deleteGate(deleteTarget.id);
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
      title: row?.gateName || "Gate",
      subtitle: row?.facilityName || "Facility",
    });
  };

  const closeDeleteConfirm = () => {
    if (loading) return;
    setDeleteTarget(null);
  };

  const onRefresh = () => fetchPage({ reset: true });

  const onExportCsv = () => {
    const header = ["Facility", "Gate Name", "Gate Type", "Status"];
    const lines = [
      header.join(","),
      ...rows.map((r) =>
        [r.facilityName, r.gateName, r.gateType, r.status]
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
    a.download = `gates_${new Date().toISOString().slice(0, 10)}.csv`;
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
          <h2 className="adm-title">Manage Gate</h2>

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

            <button className="adm-addBtn" onClick={openAdd} type="button">
              <FiPlus /> Add Gate
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="adm-filters">
          <div className="adm-search">
            <FiSearch />
            <input
              className="adm-searchInput"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search gate, facility..."
            />
          </div>

          <select
            className="adm-select"
            value={facilityFilter}
            onChange={(e) => setFacilityFilter(e.target.value)}
          >
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
            <div className="adm-tableTitle">Gate List</div>
            <div className="adm-totalPill">Total: {total}</div>
          </div>

          <table className="adm-table">
            <thead>
              <tr>
                <th>Facility</th>
                <th>Gate Name</th>
                <th>Gate Type</th>
                <th>Status</th>
                <th style={{ width: 140 }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {total === 0 && !loading ? (
                <tr>
                  <td colSpan="5" className="adm-empty">
                    No gates found.
                  </td>
                </tr>
              ) : (
                visibleRows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.facilityName}</td>
                    <td>{r.gateName}</td>
                    <td className="mono">{(r.gateType || "").toUpperCase()}</td>
                    <td>
  <span
    className={`status-badge ${
      (r.status || "ACTIVE").toUpperCase() === "ACTIVE"
        ? "status-active"
        : "status-inactive"
    }`}
  >
    {(r.status || "ACTIVE").toUpperCase()}
  </span>
</td>
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
              Showing <strong>{shown}</strong> of <strong>{total}</strong>
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

        <GateModal
          open={open}
          editingId={editingId}
          facilities={facilities}
          form={form}
          setForm={setForm}
          loading={loading}
          onClose={closeModal}
          onSave={onSave}
        />

        {!!deleteTarget && (
          <div className="ga-confirmOverlay" onClick={closeDeleteConfirm}>
            <div className="ga-confirmModal" onClick={(e) => e.stopPropagation()}>
              <div className="ga-confirmHead">
                <h3>Delete Gate?</h3>
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
