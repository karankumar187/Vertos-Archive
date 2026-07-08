import { useState, useEffect } from "react";
import { adminAPI } from "../../services/api";

const IconUsers = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c8861a" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IconDocs = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c8861a" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
const IconActive = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const IconDownload = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;

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

export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const CACHE_KEY = "admin_analytics_cache";
    const CACHE_TTL = 5 * 60 * 1000;

    const fetchData = async () => {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const { timestamp, stats } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_TTL) {
            setData(stats);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error("Cache parse error", e);
        }
      }

      try {
        const res = await adminAPI.getAnalytics();
        const newStats = res.data?.data || {};
        setData(newStats);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), stats: newStats }));
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
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", fontWeight: 700, color: "#1f1209", margin: "0 0 8px 0" }}>Analytics</h1>
          <p style={{ color: "#6b4d1f", fontSize: "0.95rem", margin: 0 }}>Track performance and platform insights.</p>
        </div>
        <select style={{ padding: "10px 16px", borderRadius: "10px", border: "1px solid #e9dcc8", background: "#fff", color: "#1f1209", fontWeight: 600, fontSize: "0.9rem", outline: "none", cursor: "pointer" }}>
          <option>This Month</option>
          <option>This Year</option>
          <option>All Time</option>
        </select>
      </div>

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "24px" }}>
        <StatCard title="Total Users" value={loading ? "..." : (data?.totalUsers?.toLocaleString() || 0)} icon={<IconUsers />} change="12.5%" isPositive={true} />
        <StatCard title="Active Users" value={loading ? "..." : (data?.activeUsers?.toLocaleString() || 0)} icon={<IconActive />} change="15.2%" isPositive={true} />
        <StatCard title="Total Documents" value={loading ? "..." : (data?.totalDocs?.toLocaleString() || 0)} icon={<IconDocs />} change="18.7%" isPositive={true} />
        <StatCard title="Downloads" value={loading ? "..." : "12,540"} icon={<IconDownload />} change="22.1%" isPositive={true} />
      </div>

      {/* Charts Area */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", flex: 1 }}>
        
        {/* User Growth */}
        <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", border: "1px solid #f0e6d2", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#1f1209" }}>User Growth</h3>
            <span style={{ fontSize: "0.8rem", color: "#8b5e0a", fontWeight: 600 }}>Last 30 Days ▾</span>
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: "2px", justifyContent: "space-between", border: "1px dashed #e9dcc8", borderRadius: "12px", padding: "10px" }}>
            {data?.userGrowth && data.userGrowth.map((point, i) => {
                const max = Math.max(...data.userGrowth.map(p => p.count), 1);
                const height = `${(point.count / max) * 100}%`;
                return (
                    <div key={i} title={`${point.date}: ${point.count}`} style={{ width: "10px", height: height, background: "#2563eb", borderRadius: "2px", minHeight: point.count > 0 ? "4px" : "0" }} />
                );
            })}
          </div>
        </div>

        {/* Documents Uploaded */}
        <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", border: "1px solid #f0e6d2", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#1f1209" }}>Documents Uploaded</h3>
            <span style={{ fontSize: "0.8rem", color: "#8b5e0a", fontWeight: 600 }}>Last 30 Days ▾</span>
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: "2px", justifyContent: "space-between", border: "1px dashed #e9dcc8", borderRadius: "12px", padding: "10px" }}>
            {data?.uploadTrend && data.uploadTrend.map((point, i) => {
                const max = Math.max(...data.uploadTrend.map(p => p.count), 1);
                const height = `${(point.count / max) * 100}%`;
                return (
                    <div key={i} title={`${point.date}: ${point.count}`} style={{ width: "10px", height: height, background: "#c8861a", borderRadius: "2px", minHeight: point.count > 0 ? "4px" : "0" }} />
                );
            })}
          </div>
        </div>

        {/* Top Subjects */}
        <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", border: "1px solid #f0e6d2", display: "flex", flexDirection: "column" }}>
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#1f1209", marginBottom: "24px" }}>Top Subjects</h3>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "32px", padding: "0 20px" }}>
            {/* Placeholder Donut based on top subjects */}
            <div style={{ width: 140, height: 140, borderRadius: "50%", background: "conic-gradient(#c8861a 0% 35%, #0ea5e9 35% 65%, #dc2626 65% 85%, #f59e0b 85% 100%)", position: "relative" }}>
              <div style={{ position: "absolute", inset: "25px", background: "#fff", borderRadius: "50%" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
              {data?.topSubjects && data.topSubjects.length > 0 ? data.topSubjects.map((s, i) => {
                  const colors = ["#c8861a", "#0ea5e9", "#dc2626", "#f59e0b"];
                  const total = data.topSubjects.reduce((acc, curr) => acc + curr.count, 0) || 1;
                  const pct = Math.round((s.count / total) * 100);
                  return (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                          <span style={{ color: colors[i % colors.length], fontWeight: 600 }}>{s.subject}</span>
                          <span>{pct}% ({s.count})</span>
                      </div>
                  );
              }) : <div style={{ fontSize: "0.85rem", color: "#8b5e0a" }}>No document data yet.</div>}
            </div>
          </div>
        </div>

        {/* Removed AI Queries box completely as requested by removing all mock data */}
      </div>
    </div>
  );
}
