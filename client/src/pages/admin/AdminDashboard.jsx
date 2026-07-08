import { useState, useEffect } from "react";
import { adminAPI } from "../../services/api";

const IconUsers = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c8861a" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IconDocs = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c8861a" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
const IconPending = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IconAI = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;

function StatCard({ title, value, icon, change, isPositive }) {
  return (
    <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", border: "1px solid #f0e6d2", display: "flex", flexDirection: "column", gap: "16px", boxShadow: "0 2px 8px rgba(160,110,40,0.03)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{ width: 48, height: 48, borderRadius: "12px", background: "#fdf8f1", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {icon}
        </div>
        <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#6b4d1f" }}>{title}</div>
      </div>
      <div>
        <div style={{ fontSize: "2rem", fontWeight: 700, color: "#1f1209", lineHeight: 1.2 }}>{value}</div>
        <div style={{ fontSize: "0.8rem", fontWeight: 600, color: isPositive === false ? "#dc2626" : "#059669", marginTop: "4px" }}>
          {isPositive === false ? "↓" : "↑"} {change}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const CACHE_KEY = "admin_dashboard_cache";
    const CACHE_TTL = 5 * 60 * 1000;

    const fetchData = async () => {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const { timestamp, stats, recentLogs } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_TTL) {
            setData(stats);
            setLogs(recentLogs);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error("Cache parse error", e);
        }
      }

      try {
        const [statsRes, logsRes] = await Promise.all([
          adminAPI.getAnalytics().catch(() => ({ data: { data: {} } })),
          adminAPI.getActivityLogs().catch(() => ({ data: { data: [] } }))
        ]);
        const newStats = statsRes.data?.data || {};
        const newLogs = logsRes.data?.data?.slice(0, 5) || [];
        setData(newStats);
        setLogs(newLogs);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), stats: newStats, recentLogs: newLogs }));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px", height: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", fontWeight: 700, color: "#1f1209", margin: "0 0 8px 0" }}>Good morning, Admin ☀️</h1>
          <p style={{ color: "#6b4d1f", fontSize: "0.95rem", margin: 0 }}>Here's what's happening with Vertos Archive today.</p>
        </div>
        <select style={{ padding: "10px 16px", borderRadius: "10px", border: "1px solid #e9dcc8", background: "#fff", color: "#1f1209", fontWeight: 600, fontSize: "0.9rem", outline: "none", cursor: "pointer" }}>
          <option>This Month</option>
          <option>This Week</option>
          <option>Today</option>
        </select>
      </div>

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px" }}>
        <StatCard title="Total Users" value={loading ? "..." : (data?.totalUsers?.toLocaleString() || 0)} icon={<IconUsers />} change="12.5%" isPositive={true} />
        <StatCard title="Total Documents" value={loading ? "..." : (data?.totalDocs?.toLocaleString() || 0)} icon={<IconDocs />} change="18.7%" isPositive={true} />
        <StatCard title="Pending Approvals" value={loading ? "..." : "0"} icon={<IconPending />} change="8.4%" isPositive={false} />
        <StatCard title="AI Queries Today" value={loading ? "..." : (data?.aiQueries?.toLocaleString() || 0)} icon={<IconAI />} change="15.3%" isPositive={true} />
      </div>

      {/* Main Content Area */}
      <div style={{ display: "flex", gap: "24px", flex: 1, minHeight: 0 }}>
        
        {/* Chart */}
        <div style={{ flex: 2, background: "#fff", borderRadius: "16px", padding: "24px", border: "1px solid #f0e6d2", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#1f1209" }}>Upload Trend</h3>
            <span style={{ fontSize: "0.8rem", color: "#8b5e0a", fontWeight: 600 }}>Last 30 Days</span>
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: "4px", justifyContent: "space-between", border: "1px dashed #e9dcc8", borderRadius: "12px", padding: "10px" }}>
            {data?.uploadTrend && data.uploadTrend.length > 0 ? data.uploadTrend.map((point, i) => {
                const max = Math.max(...data.uploadTrend.map(p => p.count), 1);
                const height = `${(point.count / max) * 100}%`;
                return (
                    <div key={i} title={`${point.date}: ${point.count}`} style={{ flex: 1, height: height, background: "#c8861a", borderRadius: "2px", minHeight: point.count > 0 ? "4px" : "0" }} />
                );
            }) : <div style={{ width: "100%", textAlign: "center", color: "#8b5e0a", fontSize: "0.9rem" }}>No data</div>}
          </div>
        </div>

        {/* Recent Activity */}
        <div style={{ flex: 1, background: "#fff", borderRadius: "16px", padding: "24px", border: "1px solid #f0e6d2", display: "flex", flexDirection: "column" }}>
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#1f1209", marginBottom: "24px" }}>Recent Activity</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px", overflowY: "auto", flex: 1, paddingRight: "8px" }}>
            {loading ? <div style={{ color: "#8b5e0a", fontSize: "0.9rem" }}>Loading...</div> : 
             logs.length > 0 ? logs.map((log) => (
              <div key={log._id} style={{ display: "flex", gap: "12px" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#fdf8f1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "0.8rem" }}>
                  {log.action.includes('Upload') ? '📄' : log.action.includes('User') ? '👥' : '⚙️'}
                </div>
                <div>
                  <div style={{ fontSize: "0.85rem", color: "#1f1209" }}>
                    <span style={{ fontWeight: 600 }}>{log.adminId?.name || 'Admin'}</span> {log.action.toLowerCase()} <span style={{ fontWeight: 600 }}>{log.targetName}</span>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#8b5e0a", marginTop: "4px" }}>
                    {new Date(log.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            )) : <div style={{ color: "#8b5e0a", fontSize: "0.9rem" }}>No recent activity.</div>}
          </div>
        </div>

      </div>
    </div>
  );
}
