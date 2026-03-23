import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../styles/auth.css";
import { sendOtp } from "../services/authService";

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState(location.state?.email || "");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.body.classList.remove("page-login");
    document.body.classList.add("page-register");
    return () => document.body.classList.remove("page-register");
  }, []);

  const onSend = async (e) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await sendOtp(cleanEmail);
      setMsg(res?.message || "OTP sent. Check your email.");

      
      setTimeout(() => {
        navigate("/confirm-email", { state: { email } });
      }, 700);
    } catch (err) {
      setMsg(err?.response?.data || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-grid auth-grid-reverse">
         
          <div className="auth-right">
            <h2 className="auth-heading">Verify Email</h2>

            <form onSubmit={onSend} className="auth-form">
              <label className="auth-field">
                <span className="auth-ico" aria-hidden="true">📧</span>
                <input
                  className="auth-input"
                  type="email"
                  required
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email"
                />
              </label>

              <button className="auth-btn" type="submit" disabled={loading}>
                {loading ? "Sending..." : "Send OTP"}
              </button>

              {msg && <div className="auth-msg">{msg}</div>}

              <div className="auth-row">
                <Link className="auth-link" to="/login">Back to Login</Link>
              </div>
            </form>
          </div>

         
          <div className="auth-left">
            <h2 className="auth-title">Almost done!</h2>
            <p className="auth-sub">We’ll send a 6-digit OTP to your email.</p>
            <div className="auth-left-glow" />
          </div>
        </div>
      </div>
    </div>
  );
}