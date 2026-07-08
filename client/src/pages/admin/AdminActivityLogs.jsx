import { useState, useEffect } from "react";
import { adminAPI } from "../../services/api";

export default function AdminActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const CACHE_KEY = "admin_activity_logs_cache";
    const CACHE_TTL = 5 * 60 * 1000;

    const fetchLogs = async () => {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const { timestamp, data } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_TTL) {
            setLogs(data);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error("Cache parse error", e);
        }
      }

      setLoading(true);
      try {
        const res = await adminAPI.getActivityLogs();
        const newData = res.data?.data || [];
        setLogs(newData);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: newData }));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", fontWeight: 700, color: "#1f1209", margin: "0 0 8px 0" }}>Activity Logs</h1>
          <p style={{ color: "#6b4d1f", fontSize: "0.95rem", margin: 0 }}>System-wide audit trail of administrative actions.</p>
        </div>
        <button style={{ padding: "10px 20px", background: "#fff", border: "1px solid #e9dcc8", borderRadius: "10px", color: "#1f1209", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" }}>
          Export Logs
        </button>
      </div>

      <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #f0e6d2", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 2px 8px rgba(160,110,40,0.03)" }}>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div style={{ padding: "24px", color: "#6b4d1f" }}>Loading logs...</div>
          ) : logs.length === 0 ? (
            <div style={{ padding: "24px", color: "#6b4d1f" }}>No activity logs found.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #f0e6d2", color: "#8b5e0a", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  <th style={{ padding: "16px 24px", fontWeight: 600 }}>Date & Time</th>
                  <th style={{ padding: "16px 24px", fontWeight: 600 }}>Admin</th>
                  <th style={{ padding: "16px 24px", fontWeight: 600 }}>Action</th>
                  <th style={{ padding: "16px 24px", fontWeight: 600 }}>Target</th>
                  <th style={{ padding: "16px 24px", fontWeight: 600 }}>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log._id} style={{ borderBottom: "1px solid #f9f5f0", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "#fdf8f1"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "16px 24px", fontSize: "0.85rem", color: "#6b4d1f" }}>{new Date(log.createdAt).toLocaleString()}</td>
                    <td style={{ padding: "16px 24px", fontSize: "0.9rem", color: "#1f1209", fontWeight: 600 }}>{log.adminId?.name || 'System'}</td>
                    <td style={{ padding: "16px 24px", fontSize: "0.85rem", color: "#6b4d1f" }}>
                      <span style={{ padding: "4px 10px", background: "#f5efeb", color: "#8b5e0a", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 600 }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: "16px 24px", fontSize: "0.85rem", color: "#1f1209" }}><span style={{ color: "#8b5e0a" }}>{log.targetType}:</span> {log.targetName}</td>
                    <td style={{ padding: "16px 24px", fontSize: "0.8rem", color: "#9ca3af", fontFamily: "monospace" }}>{log.ipAddress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
