import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/dashboard.css";
import { changePassword } from "../services/settingsService";

export default function SettingsChangePasswordPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ newPassword: "", confirmPassword: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const onSave = async () => {
    if (!form.newPassword || !form.confirmPassword) return;
    setSaving(true);
    setErr("");
    try {
      await changePassword(form);
      navigate("/dashboard/settings");
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="adm-page">
      <div className="adm-card glass">
        <div className="settings-edit-header">
          <button className="dm-btn dm-btnGhost" onClick={() => navigate(-1)} type="button">
            ← Back
          </button>
          <h2>Change Password</h2>
        </div>

        {err && <div className="adm-error">{err}</div>}

        <div className="settings-edit-form">
          <div className="ym-field">
            <label>New Password</label>
            <input
              type="password"
              value={form.newPassword}
              onChange={(e) => setForm((p) => ({ ...p, newPassword: e.target.value }))}
            />
          </div>

          <div className="ym-field">
            <label>Confirm Password</label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
            />
          </div>

          <button className="dm-btn dm-btnSave" onClick={onSave} disabled={saving} type="button">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
