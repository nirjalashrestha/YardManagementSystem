import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../styles/auth.css";
import { confirmOtp, sendOtp } from "../services/authService";

export default function ConfirmEmail() {
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState(location.state?.email || "");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.body.classList.remove("page-login");
    document.body.classList.add("page-register");
    return () => document.body.classList.remove("page-register");
  }, []);

  const onConfirm = async (e) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      const res = await confirmOtp(email, code);
      setMsg(res?.message || "Email verified successfully.");

      setTimeout(() => navigate("/login"), 800);
    } catch (err) {
      setMsg(err?.response?.data?.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    setMsg("");
    try {
      const res = await sendOtp(email);
      setMsg(res?.message || "OTP resent. Check your email.");
    } catch (err) {
      setMsg(err?.response?.data?.message || "Failed to resend OTP");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-grid auth-grid-reverse">
          <div className="auth-right">
            <h2 className="auth-heading">Confirm Email</h2>

            <form onSubmit={onConfirm} className="auth-form">
              <label className="auth-field">
                <span className="auth-ico" aria-hidden="true">📧</span>
                <input
                  className="auth-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email"
                />
              </label>

              <label className="auth-field">
                <span className="auth-ico" aria-hidden="true">🔢</span>
                <input
                  className="auth-input"
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="6-digit OTP"
                />
              </label>

              <button className="auth-btn" type="submit" disabled={loading}>
                {loading ? "Verifying..." : "Confirm OTP"}
              </button>

              <button type="button" className="auth-cta" onClick={onResend} style={{ marginTop: 10 }}>
                Resend OTP
              </button>

              {msg && <div className="auth-msg">{msg}</div>}

              <div className="auth-row">
                <Link className="auth-link" to="/login">Back to Login</Link>
              </div>
            </form>
          </div>

          <div className="auth-left">
            <h2 className="auth-title">Enter OTP</h2>
            <p className="auth-sub">Check your email and paste the 6-digit code.</p>
            <div className="auth-left-glow" />
          </div>
        </div>
      </div>
    </div>
  );
}