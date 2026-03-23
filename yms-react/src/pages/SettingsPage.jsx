import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/dashboard.css";
import {
  FiUser,
  FiLock,
  FiBell,
  FiMoon,
  FiSun,
  FiLogOut,
  FiInfo,
  FiShield,
  FiFileText,
  FiHelpCircle,
} from "react-icons/fi";
import {
  getMyProfile,
  updateMyProfile,
  uploadProfilePhoto,
  updatePreferences,
  changePassword,
  logout as logoutLocal,
  sendAiSupport,
} from "../services/settingsService";

const API_ORIGIN = "https://localhost:7096";

const LEGAL_CONTENT = {
  about: {
    title: "About",
    icon: "info",
    paragraphs: [
      "A web-based Real-Time Yard Management System designed to visualize yard operations through an intuitive user interface.",
      "The system manages facilities, gates, docks, parking areas, vehicles, trailers, and goods while providing time-based yard visibility.",
      "It includes Gate Activity, Yard Move, Yard Check, Inspection, Dock Management, Parking Management, Reports, and role-based access.",
      "This project is built for practical operations, testing, and continuous improvement with backend-driven workflows.",
    ],
  },
  privacy: {
    title: "Privacy Policy",
    icon: "shield",
    paragraphs: [
      "This application stores only operational and account data required to run yard workflows.",
      "Data is used for gate control, yard movement, dock and parking assignment, and reporting.",
      "Access is role-based (Admin, Yard Manager, Yard Jockey, Gate Security, Driver, View Only).",
      "Data handling, retention, and access must follow your organization policy and deployment controls.",
    ],
  },
  terms: {
    title: "Terms of Service",
    icon: "file",
    paragraphs: [
      "This system is provided for yard operations and demonstration use.",
      "It does not replace official legal, compliance, or safety procedures.",
      "Users must enter accurate records and protect account credentials.",
      "By using this application, you agree to follow your organization’s operational and security policies.",
    ],
  },
};

LEGAL_CONTENT.terms.paragraphs = [
  "This system is provided for yard operations and demonstration use.",
  "It does not replace official legal, compliance, or safety procedures.",
  "Users must enter accurate records and protect account credentials.",
  "By using this application, you agree to your organization's usage policies.",
];

const toFullPhotoUrl = (raw) => {
  if (!raw) return "";
  return raw.startsWith("http") ? raw : `${API_ORIGIN}${raw}`;
};

export default function SettingsPage() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [savingPref, setSavingPref] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [err, setErr] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [editProfile, setEditProfile] = useState(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const [legalOpen, setLegalOpen] = useState(null); // "privacy" | "terms" | "about" | null
  const [aiOpen, setAiOpen] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiChat, setAiChat] = useState([]);
  const profilePhotoRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getMyProfile();
        setProfile(data);

        const storedTheme = localStorage.getItem("theme");
        const theme = storedTheme || data?.themePreference || "dark";
        localStorage.setItem("theme", theme);
        document.body.setAttribute("data-theme", theme);
        window.dispatchEvent(new CustomEvent("themechange", { detail: { theme } }));
      } catch (e) {
        setErr(e?.message || String(e));
      }
    })();
  }, []);

  const theme = localStorage.getItem("theme") || profile?.themePreference || "dark";

  const onTogglePref = async (patch) => {
    if (!profile) return;
    const next = {
      themePreference: profile.themePreference || "dark",
      notifyArrivals: !!profile.notifyArrivals,
      notifyDepartures: !!profile.notifyDepartures,
      notifyEmail: !!profile.notifyEmail,
      notifySms: !!profile.notifySms,
      ...patch,
    };

    // Apply theme instantly for responsive UI, then persist via API.
    if (patch.themePreference) {
      localStorage.setItem("theme", patch.themePreference);
      document.body.setAttribute("data-theme", patch.themePreference);
      window.dispatchEvent(new CustomEvent("themechange", { detail: { theme: patch.themePreference } }));
    }

    setProfile((p) => ({ ...p, ...next }));
    setSavingPref(true);
    setErr("");
    try {
      await updatePreferences(next);
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setSavingPref(false);
    }
  };

  const onLogout = () => {
    logoutLocal();
    navigate("/login");
  };

  const openProfileModal = () => {
    const p = profile || {};
    setEditProfile({
      publicId: p.publicId || "",
      fullName: p.fullName || "",
      email: p.email || "",
      phoneNumber: p.phoneNumber || "",
      address: p.address || "",
      profileImageUrl: p.profileImageUrl || p.photoUrl || "",
    });
    setProfileOpen(true);
  };

  const onSaveProfile = async () => {
    if (!editProfile) return;
    setSavingProfile(true);
    setErr("");
    try {
      await updateMyProfile({
        fullName: editProfile.fullName,
        email: editProfile.email,
        phoneNumber: editProfile.phoneNumber,
        address: editProfile.address,
      });

      setProfile((p) => ({ ...p, ...editProfile }));
      window.dispatchEvent(new Event("profilechange"));
      setProfileOpen(false);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || String(e));
    } finally {
      setSavingProfile(false);
    }
  };

  const onPickProfilePhoto = async (file) => {
    if (!file || !editProfile) return;
    setSavingProfile(true);
    setErr("");
    try {
      const res = await uploadProfilePhoto(file, editProfile.publicId || "");
      const url = res?.profileImageUrl || res?.photoUrl || "";
      setEditProfile((p) => ({ ...p, profileImageUrl: url }));
      setProfile((p) => ({ ...p, profileImageUrl: url, photoUrl: url }));
      window.dispatchEvent(new Event("profilechange"));
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || String(e));
    } finally {
      setSavingProfile(false);
    }
  };

  const openPasswordModal = () => {
    setPasswordForm({ newPassword: "", confirmPassword: "" });
    setPasswordOpen(true);
  };

  const onSavePassword = async () => {
    if (!passwordForm.newPassword || !passwordForm.confirmPassword) return;
    setSavingPassword(true);
    setErr("");
    try {
      await changePassword(passwordForm);
      setPasswordOpen(false);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || String(e));
    } finally {
      setSavingPassword(false);
    }
  };

  const onAskAi = async () => {
    const msg = aiText.trim();
    if (!msg) return;
    setAiText("");
    setAiChat((c) => [...c, { role: "user", text: msg }]);
    try {
      const res = await sendAiSupport({ message: msg });
      setAiChat((c) => [...c, { role: "ai", text: res?.response || "Thanks for your question." }]);
    } catch (e) {
      setAiChat((c) => [...c, { role: "ai", text: "AI Support is unavailable right now." }]);
    }
  };

  const profileImage = toFullPhotoUrl(profile?.profileImageUrl || profile?.photoUrl || "");

  const themeLabel = useMemo(() => (theme === "dark" ? "Dark Mode" : "Light Mode"), [theme]);

  return (
    <div className="adm-page">
      <div className="adm-card glass">
        <div className="adm-head">
          <h2 className="adm-title">Settings</h2>
        </div>

        {err && <div className="adm-error">{err}</div>}

        <div className="settings-grid-main">
          {/* PROFILE SUMMARY */}
          <section className="settings-card glass profile-card">
            <div className="profile-left">
              {profileImage ? (
                <img className="profile-avatar" src={profileImage} alt="Profile" />
              ) : (
                <div className="profile-avatar ph" />
              )}
              <div className="profile-meta">
                <div className="profile-name">{profile?.fullName || "User"}</div>
                <div className="profile-role">{profile?.role || "View Only"}</div>
                <div className="profile-email">{profile?.email || ""}</div>
              </div>
            </div>

            <div className="profile-actions">
              <button className="dm-btn dm-btnSave" onClick={openProfileModal}>
                <FiUser /> Edit Profile
              </button>
              <button className="dm-btn dm-btnGhost" onClick={openPasswordModal}>
                <FiLock /> Change Password
              </button>
            </div>
          </section>

          {/* QUICK TOGGLES */}
          <section className="settings-card glass">
            <div className="settings-card-title">
              <FiBell /> Quick Toggles
            </div>
            <div className="settings-toggle-list">
              <ToggleRow
                label="Arrivals notifications"
                checked={!!profile?.notifyArrivals}
                onChange={(v) => onTogglePref({ notifyArrivals: v })}
              />
              <ToggleRow
                label="Departures notifications"
                checked={!!profile?.notifyDepartures}
                onChange={(v) => onTogglePref({ notifyDepartures: v })}
              />
              <div className="settings-sep" />
              <ToggleRow
                label={themeLabel}
                checked={theme === "dark"}
                icon={theme === "dark" ? <FiMoon /> : <FiSun />}
                onChange={(v) => onTogglePref({ themePreference: v ? "dark" : "light" })}
              />
            </div>

            {savingPref && <div className="settings-hint">Saving preferences...</div>}
          </section>
        </div>

        <div className="settings-grid-lower">
          {/* LEGAL */}
          <section className="settings-card glass">
            <div className="settings-card-title">
              <FiShield /> Legal & Information
            </div>
            <div className="settings-link-list">
              <button type="button" className="settings-link" onClick={() => setLegalOpen("privacy")}>
                <FiShield /> Privacy Policy
              </button>
              <button type="button" className="settings-link" onClick={() => setLegalOpen("terms")}>
                <FiFileText /> Terms of Service
              </button>
              <button type="button" className="settings-link" onClick={() => setLegalOpen("about")}>
                <FiInfo /> About
              </button>
            </div>
          </section>

          {/* AI SUPPORT */}
          <section className="settings-card glass">
            <div className="settings-card-title">
              <FiHelpCircle /> AI Support
            </div>
            <div className="settings-card-sub">
              Ask questions about workflows, troubleshooting, and feature usage.
            </div>
            <button className="dm-btn dm-btnSave" onClick={() => setAiOpen(true)}>
              Open AI Support
            </button>
          </section>

          {/* ACCOUNT */}
          <section className="settings-card glass">
            <div className="settings-card-title">Account</div>
            <div className="settings-link-list">
              <button type="button" className="settings-link danger" onClick={onLogout}>
                <FiLogOut /> Logout
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* LEGAL MODAL */}
      {legalOpen && (
        <Modal
          title={LEGAL_CONTENT[legalOpen]?.title || "Legal"}
          titleIcon={
            LEGAL_CONTENT[legalOpen]?.icon === "shield"
              ? <FiShield />
              : LEGAL_CONTENT[legalOpen]?.icon === "file"
              ? <FiFileText />
              : <FiInfo />
          }
          onClose={() => setLegalOpen(null)}
          hideFooter
        >
          <div className="settings-legal-sheet">
            <div className="settings-legal-body">
              {(LEGAL_CONTENT[legalOpen]?.paragraphs || []).map((line, idx) => (
                <p key={idx}>{line}</p>
              ))}
            </div>

            <div className="settings-legal-actions">
              <button type="button" className="dm-btn dm-btnSave" onClick={() => setLegalOpen(null)}>
                OK
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* AI SUPPORT MODAL */}
      {aiOpen && (
        <Modal title="AI Support" onClose={() => setAiOpen(false)}>
          <div className="ai-chat">
            {aiChat.length === 0 ? (
              <div className="ai-empty">Ask a question to get started.</div>
            ) : (
              aiChat.map((m, i) => (
                <div key={i} className={`ai-msg ${m.role}`}>
                  {m.text}
                </div>
              ))
            )}
          </div>
          <div className="ai-input-row">
            <input
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              placeholder="Type your question..."
            />
            <button className="dm-btn dm-btnSave" onClick={onAskAi} type="button">
              Send
            </button>
          </div>
        </Modal>
      )}

      {/* EDIT PROFILE MODAL */}
      {profileOpen && editProfile && (
        <div className="adm-modalOverlay" onClick={() => setProfileOpen(false)}>
          <div className="adm-modal glass settings-modal settings-modal--profile" onClick={(e) => e.stopPropagation()}>
            <div className="adm-modalTop">
              <h3 className="adm-modalTitle">Edit Profile</h3>
            </div>

            <div className="ym-modalBody">
              <div className="settings-edit-shell">
                <div className="settings-edit-photoCol">
                  {toFullPhotoUrl(editProfile.profileImageUrl) ? (
                    <img
                      className="profile-avatar lg"
                      src={toFullPhotoUrl(editProfile.profileImageUrl)}
                      alt="Profile"
                    />
                  ) : (
                    <div className="profile-avatar lg ph" />
                  )}
                  <button className="dm-btn dm-btnSave" type="button" onClick={() => profilePhotoRef.current?.click()}>
                    Edit picture
                  </button>
                  <input
                    ref={profilePhotoRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => onPickProfilePhoto(e.target.files?.[0])}
                  />
                </div>

                <div className="settings-edit-formCol">
                  <div className="settings-edit-row">
                    <label>Name</label>
                    <input
                      value={editProfile.fullName}
                      onChange={(e) => setEditProfile((p) => ({ ...p, fullName: e.target.value }))}
                      placeholder="Full name"
                    />
                  </div>

                  <div className="settings-edit-row">
                    <label>Email</label>
                    <input
                      value={editProfile.email}
                      onChange={(e) => setEditProfile((p) => ({ ...p, email: e.target.value }))}
                      placeholder="Email"
                    />
                  </div>

                  <div className="settings-edit-row">
                    <label>Phone Number</label>
                    <input
                      value={editProfile.phoneNumber}
                      onChange={(e) => setEditProfile((p) => ({ ...p, phoneNumber: e.target.value }))}
                      placeholder="Phone number"
                    />
                  </div>

                  <div className="settings-edit-row">
                    <label>Address</label>
                    <input
                      value={editProfile.address}
                      onChange={(e) => setEditProfile((p) => ({ ...p, address: e.target.value }))}
                      placeholder="Address"
                    />
                  </div>

                  <div className="settings-edit-actions">
                    <button type="button" className="dm-btn dm-btnGhost" onClick={() => setProfileOpen(false)} disabled={savingProfile}>
                      Cancel
                    </button>
                    <button type="button" className="dm-btn dm-btnSave" onClick={onSaveProfile} disabled={savingProfile}>
                      {savingProfile ? "Saving..." : "SAVE"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE PASSWORD MODAL */}
      {passwordOpen && (
        <div className="adm-modalOverlay" onClick={() => setPasswordOpen(false)}>
          <div className="adm-modal glass settings-modal settings-modal--password" onClick={(e) => e.stopPropagation()}>
            <div className="adm-modalTop">
              <h3 className="adm-modalTitle">Change Password</h3>
            </div>
            <div className="ym-modalBody">
              <div className="settings-password-form">
                <div className="settings-edit-row">
                  <label>New Password</label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                    placeholder="New password"
                  />
                </div>
                <div className="settings-edit-row">
                  <label>Confirm Password</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                    placeholder="Confirm password"
                  />
                </div>
                <div className="settings-edit-actions">
                  <button type="button" className="dm-btn dm-btnGhost" onClick={() => setPasswordOpen(false)} disabled={savingPassword}>
                    Cancel
                  </button>
                  <button type="button" className="dm-btn dm-btnSave" onClick={onSavePassword} disabled={savingPassword}>
                    {savingPassword ? "Saving..." : "SAVE"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleRow({ label, checked, onChange, icon }) {
  return (
    <div className="settings-toggle-row">
      <div className="settings-toggle-label">
        {icon} {label}
      </div>
      <label className="switch">
        <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="slider" />
      </label>
    </div>
  );
}

function Modal({ title, titleIcon = null, children, onClose, hideFooter = false }) {
  return (
    <div className="adm-modalOverlay" onClick={onClose}>
      <div className="adm-modal glass settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="adm-modalTop">
          <h3 className="adm-modalTitle">
            {titleIcon ? <span className="settings-legal-icon">{titleIcon}</span> : null}
            {title}
          </h3>
        </div>
        <div className="ym-modalBody">{children}</div>
        {!hideFooter && (
          <div className="ym-actions settings-modal-actions">
            <button type="button" className="dm-btn dm-btnGhost" onClick={onClose}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

