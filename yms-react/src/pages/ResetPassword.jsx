import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import "../styles/auth.css";
import axios from "axios";

const BASE_URL = "https://localhost:7096";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const email = useMemo(() => params.get("email") || "", [params]);
  const token = useMemo(() => params.get("token") || "", [params]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.body.classList.add("page-login");
    return () => document.body.classList.remove("page-login");
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");

    if (!email || !token) {
      setMsg("Invalid reset link (missing email/token).");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMsg("Passwords do not match.");
      return;
    }

    setLoading(true);
   
    try {
      const res = await axios.post(`${BASE_URL}/api/Auth/reset-password`, {
        email,
        token,
        newPassword,
        confirmPassword,
      });

      setMsg(res.data?.message || "Password reset successful.");
      setTimeout(() => navigate("/login"), 900);
    } catch (err) {
      setMsg(err?.response?.data?.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-grid auth-grid-reverse">
          <div className="auth-right">
            <h2 className="auth-heading">Reset Password</h2>

            <form onSubmit={onSubmit} className="auth-form">
              <div className="auth-field">
                <span className="auth-ico">🔒</span>
                <input
                  className="auth-input"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New Password"
                />
              </div>

              <div className="auth-field">
                <span className="auth-ico">🔒</span>
                <input
                  className="auth-input"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm New Password"
                />
              </div>

              <button className="auth-btn" type="submit" disabled={loading}>
                {loading ? "Resetting..." : "Reset Password"}
              </button>

              {msg && <div className="auth-msg">{msg}</div>}

              <div className="auth-row">
                <Link className="auth-link" to="/login">Back to Login</Link>
              </div>
            </form>
          </div>

          <div className="auth-left">
            <h2 className="auth-title">Almost there</h2>
            <p className="auth-sub">Set a new password for your account.</p>
            <div className="auth-left-glow" />
          </div>
        </div>
      </div>
    </div>
  );
}