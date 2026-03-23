import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, updateCurrentUser } from "../utils/userStore";
import EditProfilePictureSheet from "../components/EditProfilePictureSheet";

export default function EditProfilePage() {
  const navigate = useNavigate();
  const user = getCurrentUser() || {};

  // Profile states
  const [name, setName] = useState(user.fullName || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [profilePic, setProfilePic] = useState(user.avatar || "");
  const [sheetOpen, setSheetOpen] = useState(false);

  // Change password (collapsed first)
  const [showPassword, setShowPassword] = useState(false);
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");

  // Save profile
  const saveProfile = () => {
    updateCurrentUser({
      ...user,
      fullName: name,
      phone,
      avatar: profilePic,
    });
    alert("Profile updated successfully");
    navigate("/dashboard/profile");
  };

  // Change password (demo)
  const changePassword = () => {
    if (!newPwd || !confirmPwd) {
      alert("Please fill both password fields");
      return;
    }
    if (newPwd !== confirmPwd) {
      alert("Passwords do not match");
      return;
    }
    alert("Password changed successfully (demo)");
    setNewPwd("");
    setConfirmPwd("");
    setShowPassword(false);
  };

  // Handle picture pick (demo)
  const handlePick = () => {
    setProfilePic("https://i.pravatar.cc/300");
    setSheetOpen(false);
  };

  return (
    <div className="edit-profile-page">
      {/* Header */}
      <div className="edit-profile-header">
        <button className="back-btn" onClick={() => navigate(-1)} type="button">
          ←
        </button>
        <h2>Edit Profile</h2>
      </div>

      {/* Profile Picture */}
      <div className="edit-profile-picture">
        {profilePic ? (
          <img src={profilePic} alt="Profile" />
        ) : (
          <div className="profile-pic-placeholder" />
        )}

        <button
          className="edit-picture-btn"
          onClick={() => setSheetOpen(true)}
          type="button"
        >
          Edit picture
        </button>
      </div>

      {/* Profile Form (each field in its own box) */}
      <div className="profile-form">
        <div className="pf-field">
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="pf-field">
          <label>Email</label>
          <input value={user.email || ""} disabled />
        </div>

        <div className="pf-field">
          <label>Role</label>
          <input value={user.role || ""} disabled />
        </div>

        <div className="pf-field">
          <label>Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>

        <div className="pf-field">
          <label>Last login</label>
          <input
            value={user.lastLogin ? new Date(user.lastLogin).toLocaleString() : ""}
            disabled
          />
        </div>
      </div>

      {/* Change Password (collapsed first) */}
      <div className="change-password-section">
        <button
          type="button"
          className="pw-toggle"
          onClick={() => setShowPassword((v) => !v)}
          aria-expanded={showPassword}
        >
          <span>Change Password</span>
          <span className={`pw-caret ${showPassword ? "open" : ""}`}>▾</span>
        </button>

        {showPassword && (
          <div className="pw-body">
            <input
              type="password"
              placeholder="New password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
            />

            <input
              type="password"
              placeholder="Confirm password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
            />

            <button className="secondary big-btn" onClick={changePassword} type="button">
              Update Password
            </button>
          </div>
        )}
      </div>

      {/* Save Button */}
      <button className="primary big-btn save-profile-btn" onClick={saveProfile} type="button">
        Save Changes
      </button>

      {/* Bottom Sheet */}
      <EditProfilePictureSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onPick={handlePick}
      />
    </div>
  );
}