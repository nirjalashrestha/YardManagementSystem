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
import {
  getGoods,
  createGoods,
  updateGoods,
  deleteGoods,
} from "../services/goodsService";

const PAGE_SIZE = 6;

const genGoodsCode = (name = "") => {
  const clean = (name || "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .map((w) => w[0])
    .join("");
  const suffix = Math.floor(100 + Math.random() * 900);
  return `${clean || "GD"}${suffix}`;
};

export default function ManageGoods() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [facilityFilter, setFacilityFilter] = useState("all");
  const [facilities, setFacilities] = useState([]);

  const [total, setTotal] = useState(0);
  const [shown, setShown] = useState(0);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    goodsName: "",
    goodsCode: "",
    facilityId: "",
    weight: "",
    quantity: "",
    status: "ACTIVE",
    sortOrder: 1,
  });

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const allLoaded = shown >= total;

  useEffect(() => {
    (async () => {
      try {
        const res = await getFacilities({ search: "", skip: 0, take: 200 });
        const list = res.items || [];
        setFacilities(list);
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
      const data = await getGoods({
        search: q,
        facilityId: facilityFilter === "all" ? "" : facilityFilter,
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
  }, [q, facilityFilter]);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      goodsName: "",
      goodsCode: "",
      facilityId: facilities[0]?.id || "",
      weight: "",
      quantity: "",
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
      goodsName: r.goodsName || "",
      goodsCode: r.goodsCode || "",
      facilityId: r.facilityId || facilities[0]?.id || "",
      weight: r.weight ?? "",
      quantity: r.quantity ?? "",
      status: (r.status || "ACTIVE").toUpperCase(),
      sortOrder: r.sortOrder ?? 1,
    });
    setOpen(true);
  };

  const onSave = async (e) => {
    e.preventDefault();
    setErr("");

    const payload = {
      goodsName: (form.goodsName || "").trim(),
      goodsCode: (form.goodsCode || "").trim().toUpperCase(),
      facilityId: form.facilityId,
      weight: form.weight === "" ? null : Number(form.weight),
      quantity: form.quantity === "" ? null : Number(form.quantity),
      status: (form.status || "ACTIVE").toUpperCase(),
      sortOrder: Number(form.sortOrder || 1),
    };

    if (!payload.goodsName || !payload.facilityId) return;

    setLoading(true);
    try {
      if (editingId) await updateGoods(editingId, payload);
      else await createGoods(payload);

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
      await deleteGoods(deleteTarget.id);
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
      title: row?.goodsName || "Goods",
      subtitle: row?.facilityName || "Facility",
    });
  };

  const closeDeleteConfirm = () => {
    if (loading) return;
    setDeleteTarget(null);
  };

  const onRefresh = () => fetchPage({ reset: true });

  const onExportCsv = () => {
    const header = ["Goods", "Goods Code", "Facility", "Weight", "Quantity", "Status", "Sort Order"];
    const lines = [
      header.join(","),
      ...rows.map((r) =>
        [r.goodsName, r.goodsCode, r.facilityName, r.weight, r.quantity, r.status, r.sortOrder]
          .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
          .join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `goods_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onLoadMore = () => {
    if (!loading && !allLoaded) fetchPage({ reset: false });
  };

  const visibleRows = useMemo(() => rows.slice(0, visibleCount), [rows, visibleCount]);

  return (
    <div className="adm-page">
      <div className="adm-card glass">
        <div className="adm-head">
          <h2 className="adm-title">Manage Goods</h2>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button className="adm-act" title="Refresh" type="button" onClick={onRefresh}>
              <FiRefreshCw />
            </button>
            <button className="adm-act" title="Export CSV" type="button" onClick={onExportCsv}>
              <FiFileText />
            </button>
            <button className="adm-addBtn" onClick={openAdd} type="button">
              <FiPlus /> Add Goods
            </button>
          </div>
        </div>

        <div className="adm-filters">
          <div className="adm-search">
            <FiSearch />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search goods, code, facility..."
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
            <div className="adm-tableTitle">Goods List</div>
            <div className="adm-totalPill">Total: {total}</div>
          </div>

          <table className="adm-table">
            <thead>
              <tr>
                <th>Goods</th>
                <th>Goods Code</th>
                <th>Facility</th>
                <th style={{ width: 120 }}>Weight</th>
                <th style={{ width: 120 }}>Quantity</th>
                <th>Status</th>
                <th style={{ width: 120 }}>Sort Order</th>
                <th style={{ width: 140 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {total === 0 && !loading ? (
                <tr>
                  <td colSpan="8" className="adm-empty">No goods found.</td>
                </tr>
              ) : (
                visibleRows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.goodsName}</td>
                    <td className="mono">{r.goodsCode}</td>
                    <td>{r.facilityName || "-"}</td>
                    <td className="mono">{r.weight ?? "-"}</td>
                    <td className="mono">{r.quantity ?? "-"}</td>
                    <td>
                      <span
                        className={`ym-status-badge ${
                          (r.status || "").toUpperCase() === "ACTIVE"
                            ? "ym-status-active"
                            : "ym-status-inactive"
                        }`}
                      >
                        {(r.status || "").toUpperCase()}
                      </span>
                    </td>
                    <td className="mono">{r.sortOrder}</td>
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
              Showing <strong>{shown}</strong> of <strong>{total}</strong>
            </div>
            <div className="adm-footerRight">
              {total > 0 && !allLoaded && (
                <button type="button" className="adm-loadMoreBtn" onClick={onLoadMore} disabled={loading}>
                  {loading ? "Loading..." : "Load more"}
                </button>
              )}
              {total > 0 && allLoaded && <span className="adm-allLoaded">All loaded</span>}
            </div>
          </div>
        </div>

        {open && (
          <div className="adm-modalOverlay" onClick={closeModal}>
            <div className="adm-modal glass" onClick={(e) => e.stopPropagation()}>
              <div className="adm-modalTop">
                <h3 className="adm-modalTitle">{editingId ? "Edit Goods" : "Add Goods"}</h3>
              </div>

              <form className="ym-modalBody goods-modal-body" onSubmit={onSave}>
                <div className="ym-form">
                  <div className="ym-field">
                    <label>Goods</label>
                    <input
                      className="goods-equal-field"
                      value={form.goodsName}
                      onChange={(e) => {
                        const v = e.target.value;
                        setForm((p) => ({
                          ...p,
                          goodsName: v,
                          goodsCode: p.goodsCode || genGoodsCode(v),
                        }));
                      }}
                      placeholder="Goods Name"
                    />
                  </div>

                  <div className="ym-field">
                    <label>Goods Code</label>
                    <input
                      className="goods-equal-field"
                      value={form.goodsCode}
                      onChange={(e) => setForm((p) => ({ ...p, goodsCode: e.target.value.toUpperCase() }))}
                      placeholder="Goods Code"
                    />
                  </div>

                  <div className="ym-field">
                    <label>Facility</label>
                    <select
                      value={form.facilityId}
                      onChange={(e) => setForm((p) => ({ ...p, facilityId: e.target.value }))}
                    >
                      {facilities.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.facilityName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="ym-field">
                    <label>Status</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>

                  <div className="ym-field">
                    <label>Weight</label>
                    <input
                      className="goods-equal-field"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.weight}
                      onChange={(e) => setForm((p) => ({ ...p, weight: e.target.value }))}
                      placeholder="e.g. 1250.50"
                    />
                  </div>

                  <div className="ym-field">
                    <label>Quantity</label>
                    <input
                      className="goods-equal-field"
                      type="number"
                      min="0"
                      value={form.quantity}
                      onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
                      placeholder="e.g. 40"
                    />
                  </div>

                  <div className="ym-field">
                    <label>Sort Order</label>
                    <input
                      className="goods-equal-field"
                      type="number"
                      min="1"
                      value={form.sortOrder}
                      onChange={(e) => setForm((p) => ({ ...p, sortOrder: e.target.value }))}
                    />
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
                <h3>Delete Goods?</h3>
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
