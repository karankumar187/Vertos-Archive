import { useState, useEffect } from "react";
import { leaderboardAPI } from "../../services/api";

const IconTrophy = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c8861a" strokeWidth="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>;
const IconBadge = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c8861a" strokeWidth="2"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><line x1="9.09" y1="9" x2="9.09" y2="9.01"/><line x1="14.91" y1="9" x2="14.91" y2="9.01"/><line x1="9.09" y1="15" x2="9.09" y2="15.01"/><line x1="14.91" y1="15" x2="14.91" y2="15.01"/></svg>;

export default function AdminCommunity() {
  const [activeTab, setActiveTab] = useState("Leaderboard"); // Leaderboard, Badges, Points History
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async (force = false) => {
      const CACHE_KEY = "admin_community_cache";
      const CACHE_TTL = 5 * 60 * 1000;

      if (!force) {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          try {
            const { timestamp, data } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_TTL) {
              setLeaderboard(data);
              setLoading(false);
              return;
            }
          } catch (e) {
            console.error("Cache parse error", e);
          }
        }
      }

      setLoading(true);
      try {
        const res = await leaderboardAPI.getLeaderboard('All Time');
        const newUsers = res.data?.leaderboard || [];
        setLeaderboard(newUsers);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: newUsers }));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  const renderBadge = (badgeName) => {
    const badgeColors = {
      'Top Contributor': '#f59e0b',
      'Elite Verto': '#7c3aed',
      'Helpful Member': '#059669'
    };
    const color = badgeColors[badgeName] || '#94a3b8';
    return (
      <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: "50%", background: color, border: "2px solid #fff", marginRight: "-8px", zIndex: 1 }} title={badgeName}>
        <span style={{ fontSize: "0.6rem", color: "#fff" }}>★</span>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", height: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", fontWeight: 700, color: "#1f1209", margin: "0 0 8px 0" }}>Community</h1>
          <p style={{ color: "#6b4d1f", fontSize: "0.95rem", margin: 0 }}>Manage community, leaderboard and points.</p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button style={{ padding: "10px 20px", background: "#fff", border: "1px solid #e9dcc8", borderRadius: "10px", color: "#1f1209", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            Reset Leaderboard
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "32px", borderBottom: "1px solid #f0e6d2" }}>
        {["Leaderboard", "Badges", "Points History"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: "none", border: "none", padding: "0 0 12px 0", cursor: "pointer",
              fontSize: "0.95rem", fontWeight: 600,
              color: activeTab === tab ? "#c8861a" : "#8b5e0a",
              borderBottom: activeTab === tab ? "2px solid #c8861a" : "2px solid transparent",
              transition: "all 0.2s"
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Table Area */}
      <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #f0e6d2", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 2px 8px rgba(160,110,40,0.03)" }}>
        {activeTab === "Leaderboard" && (
          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: "24px", color: "#6b4d1f" }}>Loading leaderboard...</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #f0e6d2", color: "#8b5e0a", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    <th style={{ padding: "16px 24px", fontWeight: 600, width: "60px" }}>Rank</th>
                    <th style={{ padding: "16px 24px", fontWeight: 600 }}>User</th>
                    <th style={{ padding: "16px 24px", fontWeight: 600 }}>Points</th>
                    <th style={{ padding: "16px 24px", fontWeight: 600 }}>Documents</th>
                    <th style={{ padding: "16px 24px", fontWeight: 600 }}>Discussions</th>
                    <th style={{ padding: "16px 24px", fontWeight: 600 }}>Badges</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((user, index) => (
                    <tr key={user.userId} style={{ borderBottom: "1px solid #f9f5f0", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "#fdf8f1"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding: "16px 24px", fontSize: "1rem", fontWeight: 700, color: index < 3 ? "#c8861a" : "#1f1209" }}>
                        {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                      </td>
                      <td style={{ padding: "16px 24px", display: "flex", alignItems: "center", gap: "12px" }}>
                        <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=f0e6d2&color=8b5e0a`} alt={user.name} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
                        <div>
                          <div style={{ fontSize: "0.9rem", color: "#1f1209", fontWeight: 600 }}>{user.name}</div>
                          <div style={{ fontSize: "0.75rem", color: "#8b5e0a" }}>{user.regNo || 'N/A'}</div>
                        </div>
                      </td>
                      <td style={{ padding: "16px 24px", fontSize: "0.9rem", color: "#1f1209", fontWeight: 700 }}>{user.points}</td>
                      <td style={{ padding: "16px 24px", fontSize: "0.85rem", color: "#6b4d1f" }}>{user.docs}</td>
                      <td style={{ padding: "16px 24px", fontSize: "0.85rem", color: "#6b4d1f" }}>{user.discussions}</td>
                      <td style={{ padding: "16px 24px", display: "flex", alignItems: "center", minHeight: "69px" }}>
                        {user.badges && user.badges.length > 0 ? (
                          <div style={{ display: "flex", paddingRight: "8px" }}>
                            {user.badges.map((b, i) => <div key={i}>{renderBadge(b)}</div>)}
                          </div>
                        ) : <span style={{ fontSize: "0.85rem", color: "#a89680" }}>None</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        
        {activeTab !== "Leaderboard" && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#8b5e0a" }}>
            This feature is coming soon!
          </div>
        )}
      </div>
    </div>
  );
}
