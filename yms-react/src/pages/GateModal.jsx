import "../styles/dashboard.css";


export default function GateModal({ open,
editingId, facilities, form, setForm, loading, onClose, onSave,
}) {
if (!open) return null;


return (
<div className="adm-modalOverlay" onClick={onClose}>
<div className="adm-modal glass" onClick={(e) => e.stopPropagation()}>
<div className="adm-modalTop">
<h3 className="adm-modalTitle">{editingId ? "Edit Gate" : "Add Gate"}</h3>

</div>


<form className="ym-modalBody gate-modal-body" onSubmit={onSave}>
<div className="ym-form">
<div className="ym-field">
<label>Facility</label>
<select value={form.facilityId}
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
<label>Gate Name</label>
<input className="gate-equal-field" value={form.gateName}
onChange={(e) => setForm((p) => ({ ...p, gateName: e.target.value }))} placeholder="e.g. Gate A"
/>
</div>

<div className="ym-field">
<label>Gate Type</label>
<select value={form.gateType}
onChange={(e) => setForm((p) => ({ ...p, gateType: e.target.value }))}
>
<option value="ENTRY">Entry</option>
<option value="EXIT">Exit</option>
<option value="BOTH">Both</option>
</select>
</div>


<div className="ym-field">
<label>Status</label>
<select value={form.status}
onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
>
<option value="ACTIVE">Active</option>
<option value="INACTIVE">Inactive</option>
</select>
</div>


<div className="ym-actions">
<button type="button" className="dm-btn dm-btnGhost" onClick={onClose}> Cancel
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
