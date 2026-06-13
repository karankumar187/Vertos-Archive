import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import campusSketch from "../assets/campus-sketch.png";
import { useAuth } from "../context/AuthContext";
import { uploadAPI, analyticsAPI } from "../services/api";

const quickActions = [
  { to: "/chat", icon: "💬", label: "New Chat", desc: "Ask Vertos Archive anything" },
  { to: "/upload", icon: "📄", label: "Upload Doc", desc: "Contribute notes or PYQs" },
  { to: "/leaderboard", icon: "🏆", label: "Leaderboard", desc: "Top contributors this month" },
];

function StatCard({ value, label, icon }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #e9dcc8", borderRadius: "12px",
      padding: "20px 24px", display: "flex", flexDirection: "column", gap: "6px",
      boxShadow: "0 2px 12px rgba(160,110,40,0.06)", flex: "1 1 140px",
      transition: "transform 0.2s, box-shadow 0.2s",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(160,110,40,0.12)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(160,110,40,0.06)"; }}
    >
      <span style={{ fontSize: "22px" }}>{icon}</span>
      <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.75rem", fontWeight: 700, color: "#1f1209" }}>{value}</span>
      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.78rem", color: "#8b6535", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUploads: 0,
    approvedUploads: 0,
    pendingUploads: 0,
    points: 0,
    rank: "N/A"
  });
  
  const [homepageData, setHomepageData] = useState({
    popularSubjects: [],
    recentUploads: [],
    suggestedQuestions: [],
    trendingSearches: []
  });
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, analyticsRes] = await Promise.all([
          uploadAPI.getStats(),
          analyticsAPI.getHomepageData()
        ]);
        
        if (statsRes.data?.success) {
          setStats({
            ...statsRes.data.stats,
            rank: statsRes.data.stats.points > 0 ? "Ranked" : "New"
          });
        }

        if (analyticsRes.data?.success) {
          setHomepageData(analyticsRes.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const initials = user?.name
    ? user.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <div style={{ background: "#faf8f4", minHeight: "calc(100vh - 68px)", padding: "40px 24px", position: "relative" }}>
      {/* Fixed Background Image */}
      <div style={{ position: "fixed", inset: 0, backgroundImage: `url(${campusSketch})`, backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", zIndex: 0, pointerEvents: "none" }} />
      {/* Fade overlay */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, background: "linear-gradient(to bottom, #faf8f4 0%, #faf8f4 40%, rgba(250,248,244,0.85) 65%, rgba(250,248,244,0.2) 100%)" }}/>
      
      <div style={{ maxWidth: "1300px", margin: "0 auto", position: "relative", zIndex: 1 }}>

        {/* ── Welcome Header ── */}
        <div className="anim-up d1" style={{
          background: "#ffffff", border: "1px solid #e9dcc8", borderRadius: "16px",
          padding: "28px 32px", marginBottom: "24px", boxShadow: "0 2px 16px rgba(160,110,40,0.07)",
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "20px",
          position: "relative", overflow: "hidden",
        }}>
          {/* Gold accent top */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(to right, #d97706, #c8861a, #d4a96a, #c8861a, #d97706)" }} />

          <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
            <div style={{
              width: "58px", height: "58px",
              background: "linear-gradient(135deg, #d97706, #b45309)", borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
              color: "#fff", fontWeight: 700, fontSize: "1.4rem", fontFamily: "'Playfair Display', serif",
              boxShadow: "0 4px 14px rgba(180,83,9,0.25)",
            }}>
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : initials}
            </div>
            <div>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", fontWeight: 700, color: "#1f1209", marginBottom: "4px" }}>
                Welcome back, {user?.name?.split(" ")[0]} ✦
              </h1>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.82rem", color: "#8b6535" }}>
                {user?.reg_no || 'No Reg No'} · {user?.authProvider === 'google' ? 'Google Account' : 'Standard Account'}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              background: "#fef3dc", border: "1px solid #e8c96a", borderRadius: "999px", padding: "6px 14px",
              fontFamily: "'Inter', sans-serif", fontSize: "0.8rem", fontWeight: 600, color: "#92620a",
            }}>
              🏆 {stats.rank}
            </div>
            <Link to="/upload" style={{
              padding: "9px 18px", background: "linear-gradient(135deg, #d97706, #b45309)",
              borderRadius: "9px", color: "#fff", fontFamily: "'Inter', sans-serif", fontSize: "0.85rem", fontWeight: 600,
              textDecoration: "none", letterSpacing: "0.02em", boxShadow: "0 3px 12px rgba(180,83,9,0.25)",
            }}>+ Upload Doc</Link>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="anim-up d2" style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "24px" }}>
          <StatCard value={stats.totalUploads} label="My Contributions" icon="📚" />
          <StatCard value={stats.approvedUploads} label="Approved" icon="✅" />
          <StatCard value={stats.pendingUploads} label="Pending" icon="⏳" />
          <StatCard value={stats.points} label="Total Points" icon="⭐" />
        </div>

        <div className="mobile-grid-1" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "24px" }}>

          {/* ── Main Dashboard Content ── */}
          <div className="anim-up d3" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            
            {/* Suggested Questions */}
            {homepageData.suggestedQuestions.length > 0 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <span style={{ fontSize: "1.1rem" }}>✨</span>
                  <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", fontWeight: 700, color: "#1f1209" }}>Suggested Questions</h2>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                  {homepageData.suggestedQuestions.map((q, idx) => (
                    <button key={idx} 
                      onClick={() => navigate(`/chat?q=${encodeURIComponent(q)}`)}
                      style={{
                        padding: "10px 16px", background: "#fff", border: "1px solid #e9dcc8",
                        borderRadius: "999px", fontFamily: "'Inter', sans-serif", fontSize: "0.85rem",
                        color: "#5c4021", cursor: "pointer", transition: "all 0.15s",
                        boxShadow: "0 2px 8px rgba(160,110,40,0.05)"
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "#c8861a"; e.currentTarget.style.color = "#b45309"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "#e9dcc8"; e.currentTarget.style.color = "#5c4021"; e.currentTarget.style.transform = "none"; }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Trending Searches */}
            {homepageData.trendingSearches.length > 0 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <span style={{ fontSize: "1.1rem" }}>🔥</span>
                  <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", fontWeight: 700, color: "#1f1209" }}>Trending Topics</h2>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {homepageData.trendingSearches.map((t, idx) => (
                    <span key={idx} style={{
                      padding: "6px 12px", background: "#fef7e9", border: "1px solid #f0e6d2",
                      borderRadius: "6px", fontFamily: "'Inter', sans-serif", fontSize: "0.78rem",
                      color: "#92620a", fontWeight: 500,
                    }}>
                      # {t.toLowerCase()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mobile-grid-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              {/* Community Uploads */}
              <div style={{ background: "#ffffff", border: "1px solid #e9dcc8", borderRadius: "14px", overflow: "hidden", boxShadow: "0 2px 12px rgba(160,110,40,0.06)" }}>
                <div style={{ padding: "18px 24px", borderBottom: "1px solid #f0e6d2", display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ color: "#c8861a" }}>✦</span>
                  <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.05rem", fontWeight: 700, color: "#1f1209" }}>Community Uploads</h2>
                </div>
                <div style={{ padding: "8px 0" }}>
                  {loading ? (
                    <p style={{ padding: "14px 24px", color: "#7a5a2a", fontSize: "0.9rem" }}>Loading activity...</p>
                  ) : homepageData.recentUploads.length === 0 ? (
                    <p style={{ padding: "14px 24px", color: "#7a5a2a", fontSize: "0.9rem" }}>No recent uploads found.</p>
                  ) : (
                    homepageData.recentUploads.map(doc => (
                      <div key={doc._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", borderBottom: "1px solid #faf4eb", transition: "background 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#fdf8f0"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <span style={{ fontSize: "16px" }}>📄</span>
                          <div>
                            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.85rem", fontWeight: 500, color: "#2d1f0a", maxWidth: "160px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{doc.title}</p>
                            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.7rem", color: "#9a7845" }}>{doc.category} · {doc.subject}</p>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.7rem", color: "#c8861a", background: "#fef3dc", padding: "3px 8px", borderRadius: "4px" }}>New</span>
                          {doc.fileUrl && (
                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.7rem", color: "#fff", background: "#c8861a", padding: "3px 8px", borderRadius: "4px", textDecoration: "none", fontWeight: 600, transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "#a86d10"} onMouseLeave={e => e.currentTarget.style.background = "#c8861a"}>
                              Open ↗
                            </a>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Popular Subjects */}
              <div style={{ background: "#ffffff", border: "1px solid #e9dcc8", borderRadius: "14px", overflow: "hidden", boxShadow: "0 2px 12px rgba(160,110,40,0.06)" }}>
                <div style={{ padding: "18px 24px", borderBottom: "1px solid #f0e6d2", display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ color: "#c8861a" }}>✦</span>
                  <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.05rem", fontWeight: 700, color: "#1f1209" }}>Popular Subjects</h2>
                </div>
                <div style={{ padding: "12px 24px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  {homepageData.popularSubjects.map((sub, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ width: "28px", height: "28px", background: "#fef7e9", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", color: "#c8861a", fontWeight: "bold", fontSize: "0.8rem" }}>
                        {idx + 1}
                      </div>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.85rem", color: "#5c4021", fontWeight: 500 }}>{sub}</span>
                    </div>
                  ))}
                  {homepageData.popularSubjects.length === 0 && !loading && (
                    <p style={{ color: "#7a5a2a", fontSize: "0.85rem" }}>No popular subjects yet.</p>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* ── Quick Actions (Right Sidebar) ── */}
          <div className="anim-up d4" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ background: "#ffffff", border: "1px solid #e9dcc8", borderRadius: "14px", overflow: "hidden", boxShadow: "0 2px 12px rgba(160,110,40,0.06)" }}>
              <div style={{ padding: "18px 24px", borderBottom: "1px solid #f0e6d2", display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ color: "#c8861a" }}>✦</span>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.05rem", fontWeight: 700, color: "#1f1209" }}>Quick Actions</h2>
              </div>
              <div style={{ padding: "12px" }}>
                {quickActions.map(({ to, icon, label, desc }) => (
                  <Link key={to} to={to} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 16px", borderRadius: "10px", textDecoration: "none", transition: "background 0.15s", marginBottom: "4px" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#fdf5e8"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <span style={{ fontSize: "20px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", background: "#fef3dc", borderRadius: "8px" }}>{icon}</span>
                    <div>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.875rem", fontWeight: 600, color: "#1f1209" }}>{label}</p>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.75rem", color: "#9a7845" }}>{desc}</p>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c8861a" strokeWidth="2.5" style={{ marginLeft: "auto" }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            </div>

            {/* Contribution badge */}
            <div style={{ background: "linear-gradient(135deg, #1f1209 0%, #3d2408 100%)", border: "1px solid #5a3a10", borderRadius: "14px", padding: "22px", textAlign: "center", boxShadow: "0 4px 20px rgba(30,10,0,0.2)" }}>
              <div style={{ fontSize: "28px", marginBottom: "8px" }}>🌟</div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 700, color: "#f0d090", marginBottom: "6px" }}>Top Contributor!</h3>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.78rem", color: "#c8a060", lineHeight: 1.6 }}>
                You're making great contributions to Vertos Archive!
              </p>
              <div style={{ marginTop: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                <span style={{ color: "#c8861a", fontSize: "11px" }}>✦</span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.78rem", fontWeight: 600, color: "#d4a96a", letterSpacing: "0.08em" }}>{stats.points} POINTS</span>
                <span style={{ color: "#c8861a", fontSize: "11px" }}>✦</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
