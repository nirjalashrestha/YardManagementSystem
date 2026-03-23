
import { useEffect, useMemo, useState } from "react";
import "../styles/dashboard.css";
import { FiEdit2, FiTrash2, FiSearch, FiPlus, FiRefreshCw, FiFileText } from "react-icons/fi";

import {
  getFacilities,
  createFacility,
  updateFacility,
  deleteFacility,
} from "../services/facilityService";

const PAGE_SIZE = 6;

const FACILITY_TYPES = [
  "Yard",
  "Warehouse",
  "Logistics Center"
];

const genFacilityCode = (name = "") => {
  const clean = (name || "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .map((w) => w[0])
    .join("");

  const suffix = Math.floor(100 + Math.random() * 900);
  return `${clean || "FC"}${suffix}`;
};

const getApiErrorMessage = (e) => {
  const data = e?.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (typeof data?.message === "string" && data.message.trim()) return data.message;
  if (typeof data?.title === "string" && data.title.trim()) return data.title;
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    const first = data.errors[0];
    if (typeof first === "string") return first;
    if (typeof first?.description === "string") return first.description;
  }
  if (e?.response?.status === 500) {
    return "Cannot delete this facility because it is used by other records (locations, arrivals, vehicles, etc.). Remove related records first.";
  }
  return e?.message || String(e);
};

export default function ManageFacility() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");


  const [total, setTotal] = useState(0);
  const [shown, setShown] = useState(0);


  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // modal
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    facilityName: "",
    facilityCode: "",
    type: FACILITY_TYPES[0],
  });

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const allLoaded = shown >= total;

  const fetchPage = async ({ reset } = { reset: true }) => {
    setLoading(true);
    setErr("");

    try {
      const skip = reset ? 0 : rows.length;
      const take = PAGE_SIZE;

      const data = await getFacilities({
        search: q,
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
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchPage({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

 
  const resetForm = () => {
    setEditingId(null);
    setForm({
      facilityName: "",
      facilityCode: "",
      type: FACILITY_TYPES[0],
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
      facilityName: r.facilityName || "",
      facilityCode: r.facilityCode || "",
      type: r.type || FACILITY_TYPES[0],
    });
    setOpen(true);
  };


  const onSave = async (e) => {
    e.preventDefault();
    setErr("");

    const payload = {
      facilityName: (form.facilityName || "").trim(),
      facilityCode: (form.facilityCode || "").trim().toUpperCase(),
      type: form.type,
    };

    if (!payload.facilityName) return;

    setLoading(true);
    try {
      if (editingId) {
        await updateFacility(editingId, payload);
      } else {
        await createFacility(payload);
      }

      closeModal();
      await fetchPage({ reset: true }); // reload from first page
    } catch (e2) {
      setErr(getApiErrorMessage(e2));
    } finally {
      setLoading(false);
    }
  };


  const onDelete = async () => {
    if (!deleteTarget?.id) return;
    setErr("");

    setLoading(true);
    try {
      await deleteFacility(deleteTarget.id);
      await fetchPage({ reset: true });
      setDeleteTarget(null);
    } catch (e) {
      setErr(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const requestDelete = (row) => {
    setDeleteTarget({
      id: row?.id,
      title: row?.facilityName || "Facility",
      subtitle: row?.facilityCode || "Code",
    });
  };

  const closeDeleteConfirm = () => {
    if (loading) return;
    setDeleteTarget(null);
  };

 
  const onRefresh = () => fetchPage({ reset: true });

  const onExportCsv = () => {
    const header = ["Facility Name", "Facility Code", "Type"];
    const lines = [
      header.join(","),
      ...rows.map((r) =>
        [r.facilityName, r.facilityCode, r.type]
          .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
          .join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `facilities_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onLoadMore = () => {
    if (!loading && !allLoaded) fetchPage({ reset: false });
  };

 
  const filteredRows = useMemo(() => {
    if (typeFilter === "all") return rows;
    return rows.filter((r) => String(r.type || "").toLowerCase() === typeFilter);
  }, [rows, typeFilter]);

  const visibleRows = useMemo(() => filteredRows.slice(0, visibleCount), [filteredRows, visibleCount]);
  const totalForView = filteredRows.length;
  const shownForView = Math.min(visibleCount, totalForView);
  const allLoadedForView = shownForView >= totalForView;

  return (
    <div className="adm-page">
      <div className="adm-card glass">
        <div className="adm-head">
          <h2 className="adm-title">Manage Facility</h2>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button className="adm-act" title="Refresh" type="button" onClick={onRefresh}>
              <FiRefreshCw />
            </button>
            <button className="adm-act" title="Export CSV" type="button" onClick={onExportCsv}>
              <FiFileText />
            </button>
            <button className="adm-addBtn" onClick={openAdd} type="button">
              <FiPlus /> Add Facility
            </button>
          </div>
        </div>

        <div className="adm-filters">
          <div className="adm-search">
            <FiSearch />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search facility name, code, type..."
            />
          </div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">All Types</option>
            {FACILITY_TYPES.map((t) => (
              <option key={t} value={t.toLowerCase()}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {err && <div className="adm-error">{err}</div>}

        <div className="adm-tableWrap">
          <div className="adm-tableTitleRow">
            <div className="adm-tableTitle">Facility List</div>
            <div className="adm-totalPill">Total: {total}</div>
          </div>

          <table className="adm-table">
            <thead>
              <tr>
                <th>Facility Name</th>
                <th>Facility Code</th>
                <th>Type</th>
                <th style={{ width: 140 }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {total === 0 && !loading ? (
                <tr>
                  <td colSpan="4" className="adm-empty">
                    No facilities found.
                  </td>
                </tr>
              ) : (
                visibleRows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.facilityName}</td>
                    <td className="mono">{r.facilityCode}</td>
                    <td>{r.type}</td>
                    <td className="adm-actions-cell">
                      <button className="adm-act adm-edit" title="Edit" type="button" onClick={() => onEdit(r)}>
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
              {totalForView > 0 && !allLoadedForView && (
                <button type="button" className="adm-loadMoreBtn" onClick={onLoadMore} disabled={loading}>
                  {loading ? "Loading..." : "Load more"}
                </button>
              )}

              {totalForView > 0 && allLoadedForView && <span className="adm-allLoaded">All loaded</span>}
            </div>
          </div>
        </div>

        {/* MODAL */}
        {open && (
          <div className="adm-modalOverlay" onClick={closeModal}>
            <div className="adm-modal glass" onClick={(e) => e.stopPropagation()}>
              <div className="adm-modalTop">
                <h3 className="adm-modalTitle">{editingId ? "Edit Facility" : "Add Facility"}</h3>
              </div>

              <form className="ym-modalBody facility-modal-body" onSubmit={onSave}>
                <div className="ym-form">
                  <div className="ym-field">
                    <label>Facility Name</label>
                    <input
                      className="facility-equal-field"
                      value={form.facilityName}
                      onChange={(e) => {
                        const v = e.target.value;
                        setForm((p) => ({
                          ...p,
                          facilityName: v,
                          facilityCode: p.facilityCode || genFacilityCode(v),
                        }));
                      }}
                      placeholder="Facility Name"
                    />
                  </div>

                  <div className="ym-field">
                    <label>Facility Code</label>
                    <input
                      className="facility-equal-field"
                      value={form.facilityCode}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, facilityCode: e.target.value.toUpperCase() }))
                      }
                      placeholder="Facility Code"
                    />
                  </div>

                  <div className="ym-field">
                    <label>Type</label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                    >
                      {FACILITY_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="ym-actions">
                    <button type="button" className="dm-btn dm-btnGhost" onClick={closeModal}>
                      Cancel
                    </button>
                    <button type="submit" className="dm-btn dm-btnSave" disabled={loading}>
                      SAVE
                    </button>
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
                <h3>Delete Facility?</h3>
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
