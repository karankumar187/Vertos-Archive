import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { leaderboardAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

// --- SVGs ---
const TrophyIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#c8861a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
    <path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
    <path d="M18 2H6v7c0 3.31 2.69 6 6 6s6-2.69 6-6V2Z"/>
  </svg>
);

const UsersIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const BookIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
    <path d="M6.5 2L6 20"/>
    <path d="M16 6H8"/><path d="M16 10H8"/>
  </svg>
);

const StarIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

const FlameIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
  </svg>
);

const TrendUpIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
  </svg>
);

const TrendFlatIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);

// --- Avatar Component ---
const Avatar = ({ user, size = 40, style = {} }) => {
  if (!user) return <div style={{ width: size, height: size, borderRadius: "50%", background: "#e2e8f0", flexShrink: 0, ...style }} />;
  if (user.avatar) return <img src={user.avatar} alt={user.name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, ...style }} />;
  
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: user.color ? `${user.color}dd` : "linear-gradient(135deg, #c8861a, #92400e)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: size * 0.4, fontWeight: 700, flexShrink: 0, ...style }}>
      {user.name?.charAt(0).toUpperCase() || '?'}
    </div>
  );
};


const PERIODS = ["This Month", "All Time", "This Week"];

function TopPodium({ entries }) {
  if (!entries || entries.length === 0) return null;
  // Arrange: 2nd | 1st | 3rd
  const order = [entries[1], entries[0], entries[2]].filter(Boolean);
  const heights = ["80px", "110px", "64px"];
  const sizes   = ["1rem", "1.2rem", "0.95rem"];

  return (
    <div style={{
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center",
      gap: "16px",
      marginBottom: "32px",
    }}>
      {order.map((entry, i) => {
        const medalColor = i === 1 ? "#fcd34d" : i === 0 ? "#cbd5e1" : "#cd7f32";
        const medalText = i === 1 ? "#1" : i === 0 ? "#2" : "#3";
        return (
          <div key={entry.rank} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", flex: "0 0 auto" }}>
            {/* Avatar */}
            <div style={{ position: "relative" }}>
              <Avatar 
                user={{ ...entry, color: i === 1 ? '#b45309' : i === 0 ? '#64748b' : '#8b5e0a' }} 
                size={i === 1 ? 68 : 54} 
                style={{
                  boxShadow: i === 1 ? "0 6px 20px rgba(180,83,9,0.35)" : "0 3px 12px rgba(0,0,0,0.15)",
                  border: i === 1 ? "3px solid #fcd34d" : "3px solid rgba(255,255,255,0.5)"
                }}
              />
              <div style={{
                position: "absolute", bottom: "-6px", right: "-6px",
                width: i === 1 ? "24px" : "20px", height: i === 1 ? "24px" : "20px",
                background: medalColor, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: i === 1 ? "12px" : "10px", fontWeight: 800, color: "#1f1209",
                border: "2px solid #fff", boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
              }}>
                {medalText}
              </div>
            </div>
            
            {/* Name */}
            <div style={{ textAlign: "center" }}>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: sizes[i], fontWeight: 700, color: "#1f1209", margin: 0 }}>
                {entry.name.split(" ")[0]}
              </p>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.72rem", color: "#9a7845", margin: 0, marginTop: "2px" }}>
                {entry.points.toLocaleString()} pts
              </p>
            </div>
            
            {/* Podium block */}
            <div style={{
              width: i === 1 ? "100px" : "80px",
              height: heights[i],
              background: i === 1
                ? "linear-gradient(to bottom, #d97706, #b45309)"
                : i === 0
                ? "linear-gradient(to bottom, #94a3b8, #64748b)"
                : "linear-gradient(to bottom, #c8861a, #8b5e0a)",
              borderRadius: "10px 10px 0 0",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: i === 1 ? "0 -4px 16px rgba(180,83,9,0.2)" : "none",
            }}>
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.3rem", fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>
                #{entry.rank}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Row({ entry, isMe }) {
  const top3 = entry.rank <= 3;
  
  const renderRankBadge = () => {
    if (entry.rank === 1) return <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#fcd34d", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 800, color: "#1f1209" }}>1</div>;
    if (entry.rank === 2) return <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#cbd5e1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 800, color: "#1f1209" }}>2</div>;
    if (entry.rank === 3) return <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#cd7f32", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 800, color: "#fff" }}>3</div>;
    return <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 700, color: "#9a7845" }}>#{entry.rank}</span>;
  };

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "52px 1fr 110px 90px 90px",
      alignItems: "center",
      gap: "12px",
      padding: "14px 24px",
      background: isMe ? "#fdfaf5" : "#fff",
      borderBottom: "1px solid #f0e6d2",
      borderLeft: isMe ? "3px solid #c8861a" : top3 ? "3px solid #f0e6d2" : "3px solid transparent",
      transition: "background 0.15s",
    }}
      onMouseEnter={e => { e.currentTarget.style.background = "#fdfaf5"; }}
      onMouseLeave={e => { e.currentTarget.style.background = isMe ? "#fdfaf5" : "#fff"; }}
    >
      {/* Rank */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        {renderRankBadge()}
      </div>

      {/* Name + course */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <Avatar user={{ ...entry, color: top3 ? '#b45309' : '#9a7845' }} size={38} style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }} />
        <div>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.875rem", fontWeight: isMe ? 700 : 600, color: "#1f1209", margin: 0 }}>
            {entry.name}
            {isMe && <span style={{ marginLeft: "6px", fontSize: "0.7rem", color: "#c8861a", fontWeight: 600 }}>(you)</span>}
          </p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.72rem", color: "#9a7845", margin: 0, marginTop: "2px" }}>
            {entry.regNo} {entry.trustScore ? `· Trust Score: ${entry.trustScore}` : ''}
          </p>
        </div>
      </div>

      {/* Docs */}
      <div style={{ textAlign: "center" }}>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.9rem", fontWeight: 600, color: "#1f1209" }}>
          {entry.docs}
        </span>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.72rem", color: "#9a7845", marginLeft: "4px" }}>docs</span>
      </div>

      {/* Points */}
      <div style={{ textAlign: "right" }}>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 800, color: top3 ? "#c8861a" : "#1f1209" }}>
          {entry.points.toLocaleString()}
        </span>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.7rem", color: "#9a7845", marginLeft: "4px" }}>pts</span>
      </div>

      {/* Trend */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
        {entry.rank <= 5 ? <TrendUpIcon /> : <TrendFlatIcon />}
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState("This Month");
  const [leaderboard, setLeaderboard] = useState([]);
  
  // Base stats config using SVGs
  const statConfig = {
    "Total Contributors": <UsersIcon />,
    "Documents Shared": <BookIcon />,
    "Points Awarded": <StarIcon />,
    "Active This Month": <FlameIcon />
  };
  
  const [stats, setStats] = useState([
    { label: "Total Contributors", value: "0" },
    { label: "Documents Shared",   value: "0" },
    { label: "Points Awarded",     value: "0" },
    { label: "Active This Month",  value: "0" },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await leaderboardAPI.getLeaderboard();
        if (res.data?.success) {
          setLeaderboard(res.data.leaderboard);
          if (res.data.stats) {
            setStats(res.data.stats);
          }
        }
      } catch (error) {
        console.error("Failed to fetch leaderboard", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [period]);

  const myEntry = leaderboard.find(entry => entry.userId === user?.id || entry.name === user?.name);

  return (
    <div style={{ position: "relative", paddingBottom: "64px" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto", position: "relative", zIndex: 1 }}>

        {/* ── Header ── */}
        <div className="anim-up d1" style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            background: "#fff", border: "1px solid #f0e6d2",
            borderRadius: "999px", padding: "6px 16px", marginBottom: "16px",
            boxShadow: "0 2px 4px rgba(160,110,40,0.02)"
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#c8861a" }} />
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.65rem", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6b4d1f" }}>
              COMMUNITY
            </span>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#c8861a" }} />
          </div>
          
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
            <TrophyIcon />
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.8rem", fontWeight: 800, color: "#1f1209", margin: 0 }}>
              Leaderboard
            </h1>
          </div>
          
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.95rem", color: "#6b4d1f", maxWidth: "480px", margin: "0 auto", lineHeight: 1.6 }}>
            Top contributors who share knowledge and help the LPU community grow. Upload documents to earn points and climb the ranks.
          </p>
        </div>

        {/* ── Stat bar ── */}
        <div className="anim-up d2" style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px",
          marginBottom: "40px",
        }}>
          {stats.map(s => (
            <div key={s.label} style={{
              background: "#fff", border: "1px solid #f0e6d2",
              borderRadius: "16px", padding: "24px 20px",
              textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center",
              boxShadow: "0 4px 16px rgba(160,110,40,0.03)",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(160,110,40,0.08)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(160,110,40,0.03)"; }}
            >
              <div style={{ marginBottom: "12px" }}>{statConfig[s.label]}</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.8rem", fontWeight: 800, color: "#c8861a", lineHeight: 1.2 }}>{s.value}</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.75rem", color: "#8b6535", fontWeight: 600, marginTop: "4px" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Main card ── */}
        <div className="anim-up d3" style={{
          background: "#fff", border: "1px solid #f0e6d2",
          borderRadius: "20px", overflow: "hidden",
          boxShadow: "0 8px 32px rgba(160,110,40,0.06)",
        }}>
          {/* Dark header */}
          <div style={{
            background: "linear-gradient(135deg, #2a1a0f 0%, #1f1209 100%)",
            padding: "24px 32px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: "16px",
          }}>
            <div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.3rem", fontWeight: 700, color: "#fdfaf5", margin: "0 0 6px 0" }}>
                Top Contributors
              </h2>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.8rem", color: "#c8a060", margin: 0 }}>
                {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })} · Updated daily
              </p>
            </div>
            {/* Period toggle */}
            <div style={{ display: "flex", gap: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "12px", padding: "6px" }}>
              {PERIODS.map(p => (
                <button key={p} onClick={() => setPeriod(p)} style={{
                  padding: "8px 16px",
                  background: period === p ? "rgba(200,134,26,0.9)" : "transparent",
                  border: "none", borderRadius: "8px",
                  fontFamily: "'Inter', sans-serif", fontSize: "0.8rem", fontWeight: 600,
                  color: period === p ? "#fff" : "#c8a060",
                  cursor: "pointer", transition: "all 0.2s",
                }}>{p}</button>
              ))}
            </div>
          </div>

          {/* Podium */}
          {!loading && leaderboard.length >= 3 && (
            <div style={{ padding: "40px 32px 0", background: "linear-gradient(to bottom, #fdfaf5, #fff)" }}>
              <TopPodium entries={leaderboard.slice(0, 3)} />
            </div>
          )}

          {/* Column headers */}
          <div style={{
            display: "grid", gridTemplateColumns: "52px 1fr 110px 90px 90px",
            padding: "12px 24px", background: "#fdfaf5",
            borderTop: "1px solid #f0e6d2", borderBottom: "1px solid #f0e6d2",
          }}>
            {["#", "Contributor", "Docs", "Points", "Trend"].map((h, i) => (
              <span key={h} style={{
                fontFamily: "'Inter', sans-serif", fontSize: "0.75rem",
                fontWeight: 700, color: "#8b6535",
                letterSpacing: "0.08em", textTransform: "uppercase",
                textAlign: i === 0 ? "center" : i >= 2 ? "right" : "left",
              }}>{h}</span>
            ))}
          </div>

          {/* Rows */}
          {loading ? (
             <div style={{ padding: "40px", textAlign: "center", color: "#9a7845", fontWeight: 500 }}>Loading leaderboard...</div>
          ) : leaderboard.length === 0 ? (
             <div style={{ padding: "40px", textAlign: "center", color: "#9a7845", fontWeight: 500 }}>No contributors found. Be the first to upload!</div>
          ) : (
            leaderboard.map(entry => (
              <Row key={entry.rank} entry={entry} isMe={entry.userId === user?.id || entry.name === user?.name} />
            ))
          )}

        </div>

        {/* My ranking card */}
        {user && myEntry && (
          <div className="anim-up d4" style={{
            marginTop: "24px",
            background: "linear-gradient(135deg, #fdfaf5 0%, #fff 100%)",
            border: "1px solid #c8861a",
            borderRadius: "16px",
            padding: "24px 32px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: "20px",
            boxShadow: "0 8px 24px rgba(200,134,26,0.12)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <Avatar user={user} size={56} style={{ border: "2px solid #c8861a" }} />
              <div>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 800, color: "#1f1209", margin: "0 0 4px 0" }}>
                  Your Current Ranking
                </p>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.85rem", color: "#6b4d1f", margin: 0, fontWeight: 500 }}>
                  {user.name} · {user.reg_no || 'Standard User'}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "32px", background: "#fff", padding: "12px 24px", borderRadius: "12px", border: "1px solid #f0e6d2" }}>
              {[
                ["Rank", `#${myEntry.rank}`.trim()], 
                ["Points", myEntry.points.toLocaleString()], 
                ["Docs", myEntry.docs.toString()]
              ].map(([k, v]) => (
                <div key={k} style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.4rem", fontWeight: 800, color: "#c8861a", margin: "0 0 2px 0" }}>{v}</div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.7rem", color: "#8b6535", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700 }}>{k}</div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
