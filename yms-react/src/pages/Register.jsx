import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiFileText, FiMail, FiPhone, FiLock } from "react-icons/fi";
import "../styles/auth.css";
import { register } from "../services/authService";

const getApiErrorMessage = (err) => {
  const data = err?.response?.data;

  if (data?.errors) {
    const firstKey = Object.keys(data.errors)[0];
    return data.errors[firstKey]?.[0] || "Validation error";
  }

  if (data?.title) return data.title;
  if (data?.detail) return data.detail;

  if (typeof data === "string") return data;

  return err?.message || "Register failed";
};

export default function Register() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.remove("page-login");
    document.body.classList.add("page-register");
    return () => document.body.classList.remove("page-register");
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");

    if (!firstName.trim() || !lastName.trim()) {
      setMsg("First name and last name are required");
      return;
    }

    if (!phoneNumber.trim()) {
      setMsg("Phone number is required");
      return;
    }

    if (password !== confirmPassword) {
      setMsg("Passwords do not match");
      return;
    }

    try {
      const res = await register(firstName, lastName, email, phoneNumber, password, confirmPassword);
      setMsg(res?.message || "Registered successfully");

      setTimeout(() => {
        navigate("/confirm-email", { state: { email } });
      }, 700);
    } catch (err) {
      setMsg(getApiErrorMessage(err));
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-grid auth-grid-reverse">
          <div className="auth-right">
            <h2 className="auth-heading">Registration</h2>

            <form onSubmit={onSubmit} className="auth-form">
              <div className="auth-field">
                <span className="auth-ico"><FiFileText size={16} /></span>
                <input
                  className="auth-input"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First Name"
                />
              </div>

              <div className="auth-field">
                <span className="auth-ico"><FiFileText size={16} /></span>
                <input
                  className="auth-input"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last Name"
                />
              </div>

              <div className="auth-field">
                <span className="auth-ico"><FiMail size={16} /></span>
                <input
                  className="auth-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                />
              </div>

              <div className="auth-field">
                <span className="auth-ico"><FiPhone size={16} /></span>
                <input
                  className="auth-input"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="Phone Number"
                />
              </div>

              <div className="auth-field">
                <span className="auth-ico"><FiLock size={16} /></span>
                <input
                  className="auth-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                />
              </div>

              <div className="auth-field">
                <span className="auth-ico"><FiLock size={16} /></span>
                <input
                  className="auth-input"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm Password"
                />
              </div>

              <button className="auth-btn" type="submit">
                Register
              </button>

              {msg && <div className="auth-msg">{msg}</div>}
            </form>
          </div>

          <div className="auth-left auth-left-right">
            <h2 className="auth-title">Welcome Back!</h2>
            <p className="auth-sub">Already have an account?</p>

            <Link to="/login" className="auth-cta">
              Login
            </Link>

            <div className="auth-left-glow" />
          </div>
        </div>
      </div>
    </div>
  );
}
