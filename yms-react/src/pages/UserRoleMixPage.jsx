import { useEffect, useMemo, useState } from "react";
import { FiPieChart, FiRefreshCw } from "react-icons/fi";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { getUsers } from "../services/userService";
import "../styles/dashboard.css";
import "../styles/reports.css";

const PIE_COLORS = ["#4cc9f0", "#80ed99", "#f9c74f", "#f8961e", "#f94144", "#9b5de5"];

const pick = (obj, keys, fallback = null) => {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null) return value;
  }
  return fallback;
};

export default function UserRoleMixPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [users, setUsers] = useState([]);

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getUsers();
      setUsers(Array.isArray(res) ? res : []);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load user roles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const rolePieData = useMemo(() => {
    const counts = {};
    users.forEach((u) => {
      const role = String(pick(u, ["role", "Role"], "Unknown"));
      counts[role] = (counts[role] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [users]);

  return (
    <div className="rp-page">
      <div className="rp-header glass">
        <div>
          <h2 className="adm-title">User Role Mix</h2>
          <p className="rp-sub">Role distribution from current user directory.</p>
        </div>
        <div className="rp-actions">
          <button type="button" className="dm-btn dm-btnGhost" onClick={loadUsers} disabled={loading}>
            <FiRefreshCw /> {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && <div className="adm-error">{error}</div>}

      <div className="adm-card glass rp-chartCard">
        <div className="rp-chartHead">
          <h3><FiPieChart /> User Role Mix</h3>
          <span>Current active directory</span>
        </div>
        <div className="rp-chartBody">
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie data={rolePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={105} label>
                {rolePieData.map((entry, idx) => (
                  <Cell key={`${entry.name}-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
