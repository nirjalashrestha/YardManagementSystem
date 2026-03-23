import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiMail, FiLock } from "react-icons/fi";
import "../styles/auth.css";
import { login } from "../services/authService";
import { normalizeRole, ROLE, toRoleDisplay } from "../constants/rbac";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalText, setModalText] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.remove("page-register");
    document.body.classList.add("page-login");
    return () => document.body.classList.remove("page-login");
  }, []);

  const openModal = (text) => {
    setModalText(text);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalText("");
  };

  const getErrorMessage = (err) => {
    const data = err?.response?.data;

    if (typeof data === "string") return data;
    if (typeof data?.message === "string") return data.message;

    if (Array.isArray(data?.errors) && data.errors.length > 0) {
      const first = data.errors[0];
      if (typeof first === "string") return first;
      if (typeof first?.description === "string") return first.description;
    }

    if (typeof err?.message === "string") return err.message;

    try {
      return JSON.stringify(data);
    } catch {
      return "Login failed";
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");

    const safeEmail = email.trim();

    if (!safeEmail) {
      openModal("Enter your email to log in.");
      return;
    }

    if (!password) {
      openModal("Enter your password to log in.");
      return;
    }

    try {
      const raw = await login(safeEmail, password);
      const data = raw?.data && typeof raw.data === "object" ? raw.data : raw;

      localStorage.removeItem("token");
      localStorage.removeItem("roleKey");
      localStorage.removeItem("role");
      localStorage.removeItem("fullName");
      localStorage.removeItem("profileImageUrl");

      const roleKey =
        normalizeRole(data?.roleKey || data?.role || data?.RoleKey || data?.Role) ||
        ROLE.VIEW_ONLY;

      const authToken = String(
        data?.token ||
          data?.Token ||
          data?.accessToken ||
          data?.AccessToken ||
          data?.jwt ||
          data?.Jwt ||
          ""
      ).trim();

      if (!authToken) {
        openModal("Login succeeded but token is missing. Please check backend login response.");
        return;
      }

      localStorage.setItem("token", authToken);
      localStorage.setItem("roleKey", roleKey);
      localStorage.setItem(
        "role",
        String(data?.role || data?.Role || toRoleDisplay(roleKey)).trim()
      );
      localStorage.setItem(
        "fullName",
        String(data?.fullName || data?.FullName || "").trim()
      );

      setMsg("Login success");

      setTimeout(() => {
        if (roleKey === ROLE.GATE_SECURITY) {
          navigate("/dashboard/gate-activity");
        } else {
          navigate("/dashboard");
        }
      }, 200);
    } catch (err) {
      const message = getErrorMessage(err);
      openModal(message);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-grid">
          <div className="auth-left">
            <h2 className="auth-title">Hello, Welcome!</h2>
            <p className="auth-sub">Create an account</p>

            <Link to="/register" className="auth-cta">
              Register
            </Link>
          </div>

          <div className="auth-right">
            <h2 className="auth-heading">Login</h2>

            <form onSubmit={onSubmit} className="auth-form">
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
                <span className="auth-ico"><FiLock size={16} /></span>
                <input
                  className="auth-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                />
              </div>

              <div className="auth-row">
                <Link to="/forgot-password" className="auth-link">
                  Forgot Password?
                </Link>
              </div>

              <button className="auth-btn" type="submit">
                Login
              </button>

              {msg && <div className="auth-msg">{msg}</div>}
            </form>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="auth-modal-backdrop" onClick={closeModal}>
          <div className="auth-modal-glass" onClick={(e) => e.stopPropagation()}>
            <div className="auth-modal-text">{modalText}</div>
            <button className="auth-modal-ok" type="button" onClick={closeModal}>
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
