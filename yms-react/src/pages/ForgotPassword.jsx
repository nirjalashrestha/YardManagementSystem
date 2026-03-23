import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/auth.css";
import axios from "axios";

const BASE_URL = "https://localhost:7096";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.body.classList.add("page-login");
    return () => document.body.classList.remove("page-login");
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);
    try {
      const res = await axios.post(`${BASE_URL}/api/Auth/forgot-password`, { email });
      setMsg(res.data?.message || "If email exists, reset link sent.");
    } catch (err) {
      setMsg(err?.response?.data?.message || "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-grid auth-grid-reverse">
          <div className="auth-right">
            <h2 className="auth-heading">Forgot Password</h2>

            <form onSubmit={onSubmit} className="auth-form">
              <div className="auth-field">
                <span className="auth-ico">📧</span>
                <input
                  className="auth-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                />
              </div>

              <button className="auth-btn" type="submit" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link"}
              </button>

              {msg && <div className="auth-msg">{msg}</div>}

              <div className="auth-row">
                <Link className="auth-link" to="/login">Back to Login</Link>
              </div>
            </form>
          </div>

          <div className="auth-left">
            <h2 className="auth-title">Reset Password</h2>
            <p className="auth-sub">We’ll email you a reset link.</p>
            <div className="auth-left-glow" />
          </div>
        </div>
      </div>
    </div>
  );
}