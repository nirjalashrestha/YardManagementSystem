import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/dashboard.css";
import {
  getMyProfile,
  updateMyProfile,
  uploadProfilePhoto,
  deleteProfilePhoto,
} from "../services/settingsService";

const API_ORIGIN = "https://localhost:7096";

const toFullPhotoUrl = (raw) => {
  if (!raw) return "";
  return raw.startsWith("http") ? raw : `${API_ORIGIN}${raw}`;
};

export default function SettingsEditProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const takePhotoRef = useRef(null);
  const pickPhotoRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getMyProfile();
        setProfile({
          publicId: data.publicId || "",
          fullName: data.fullName || "",
          email: data.email || "",
          phoneNumber: data.phoneNumber || "",
          address: data.address || "",
          profileImageUrl: data.profileImageUrl || "",
        });
      } catch (e) {
        setErr(e?.message || String(e));
      }
    })();
  }, []);

  const onSave = async () => {
    if (!profile) return;
    setSaving(true);
    setErr("");
    try {
      await updateMyProfile({
        fullName: profile.fullName,
        email: profile.email,
        phoneNumber: profile.phoneNumber,
        address: profile.address,
      });
      window.dispatchEvent(new Event("profilechange"));
      navigate("/dashboard/settings");
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  const handlePhoto = async (file) => {
    if (!file) return;
    setSaving(true);
    setErr("");
    try {
      const res = await uploadProfilePhoto(file, profile?.publicId || "");
      const url = res?.profileImageUrl || res?.photoUrl || "";
      setProfile((p) => ({ ...p, profileImageUrl: url }));
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setSaving(false);
      setSheetOpen(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!profile) return;
    if (!window.confirm("Delete profile picture?")) return;
    setSaving(true);
    setErr("");
    try {
      await deleteProfilePhoto(profile.publicId || "");
      setProfile((p) => ({ ...p, profileImageUrl: "" }));
      window.dispatchEvent(new Event("profilechange"));
      setSheetOpen(false);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  const photoUrl = toFullPhotoUrl(profile?.profileImageUrl || "");

  return (
    <div className="adm-page">
      <div className="adm-card glass">
        <div className="settings-edit-header">
          <button className="dm-btn dm-btnGhost" onClick={() => navigate(-1)} type="button">
            ← Back
          </button>
          <h2>Edit Profile</h2>
        </div>

        {err && <div className="adm-error">{err}</div>}

        <div className="settings-edit-body">
          <div className="settings-edit-photo">
            {photoUrl ? (
              <img className="profile-avatar lg" src={photoUrl} alt="Profile" />
            ) : (
              <div className="profile-avatar lg ph" />
            )}

            <button className="dm-btn dm-btnSave" onClick={() => setSheetOpen(true)} type="button">
              Edit picture
            </button>
            <button
              className="dm-btn dm-btnGhost"
              onClick={handleDeletePhoto}
              disabled={saving || !photoUrl}
              type="button"
            >
              Delete picture
            </button>
          </div>

          <div className="settings-edit-form">
            <div className="ym-field">
              <label>Name</label>
              <input
                value={profile?.fullName || ""}
                onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))}
                placeholder="Full name"
              />
            </div>

            <div className="ym-field">
              <label>Email</label>
              <input
                value={profile?.email || ""}
                onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                placeholder="Email"
              />
            </div>

            <div className="ym-field">
              <label>Phone Number</label>
              <input
                value={profile?.phoneNumber || ""}
                onChange={(e) => setProfile((p) => ({ ...p, phoneNumber: e.target.value }))}
                placeholder="Phone number"
              />
            </div>

            <div className="ym-field">
              <label>Address</label>
              <input
                value={profile?.address || ""}
                onChange={(e) => setProfile((p) => ({ ...p, address: e.target.value }))}
                placeholder="Address"
              />
            </div>

            <button className="dm-btn dm-btnSave" onClick={onSave} disabled={saving} type="button">
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {sheetOpen && (
        <div className="adm-modalOverlay" onClick={() => setSheetOpen(false)}>
          <div className="adm-modal glass settings-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="adm-modalTop">
              <h3 className="adm-modalTitle">Edit picture</h3>
            </div>
            <div className="settings-sheet-body">
              <button type="button" className="settings-sheet-btn" onClick={() => takePhotoRef.current?.click()}>
                Take a photo
              </button>
              <button type="button" className="settings-sheet-btn" onClick={() => pickPhotoRef.current?.click()}>
                Pick from camera roll
              </button>
              <button
                type="button"
                className="settings-sheet-btn danger"
                onClick={handleDeletePhoto}
                disabled={saving || !photoUrl}
              >
                Delete picture
              </button>
              <button type="button" className="settings-sheet-btn ghost" onClick={() => setSheetOpen(false)}>
                Close
              </button>
            </div>

            <input
              ref={takePhotoRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => handlePhoto(e.target.files?.[0])}
            />
            <input
              ref={pickPhotoRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => handlePhoto(e.target.files?.[0])}
            />
          </div>
        </div>
      )}
    </div>
  );
}
