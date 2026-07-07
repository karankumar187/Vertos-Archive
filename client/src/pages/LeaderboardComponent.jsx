import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { leaderboardAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

// --- SVGs ---
const TrophyIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#c8861a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
    <path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
    <path d="M18 2H6v7c0 3.31 2.69 6 6 6s6-2.69 6-6V2Z"/>
    {/* Sparkles */}
    <path d="M19 1l2 2-2 2" stroke="#d97706" strokeWidth="1"/><path d="M20 3h3" stroke="#d97706" strokeWidth="1"/>
    <path d="M3 4l1.5 1.5-1.5 1.5" stroke="#d97706" strokeWidth="1"/><path d="M4 5.5H1" stroke="#d97706" strokeWidth="1"/>
  </svg>
);

const CalendarIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const ChevronDownIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>;

const CrownIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c8861a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="2 20 22 20 19 6 15.5 10 12 4 8.5 10 5 6 2 20"/></svg>;

const DocSmallIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b6535" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;

const TrendUpIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>;
const TrendDownIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>;
const TrendFlatIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const TrendFireIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>;

// Stats Icons
const UsersIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1f1209" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const BookIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1f1209" strokeWidth="1.5"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="M6.5 2L6 20"/><path d="M16 6H8"/><path d="M16 10H8"/></svg>;
const StarIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1f1209" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const FlameIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>;

// Laurel Wreath
const LaurelWreath = ({ color = "#e5d9c5" }) => (
  <svg width="100" height="24" viewBox="0 0 100 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }}>
    <path d="M20 20C30 18 40 22 50 22C60 22 70 18 80 20"/>
    <path d="M30 19C25 12 20 8 10 10"/>
    <path d="M40 20.5C35 15 30 12 22 14"/>
    <path d="M70 19C75 12 80 8 90 10"/>
    <path d="M60 20.5C65 15 70 12 78 14"/>
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

  return (
    <div style={{
      background: "#fff",
      borderRadius: "24px",
      padding: "40px 32px",
      boxShadow: "0 4px 24px rgba(160,110,40,0.06)",
      border: "1px solid #f0e6d2",
      marginBottom: "32px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "40px" }}>
        <CrownIcon />
        <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: "1.1rem", fontWeight: 700, color: "#1f1209", margin: 0 }}>
          Top 3 Contributors
        </h2>
      </div>

      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "24px",
      }}>
        {order.map((entry, i) => {
          const isFirst = i === 1;
          const bgColors = isFirst ? "#fdfaf5" : "#fff";
          const borderColors = isFirst ? "1px solid #e8c96a" : "1px solid #f0e6d2";
          const badgeColor = i === 1 ? "#d97706" : i === 0 ? "#94a3b8" : "#cd7f32";
          const laurelColor = isFirst ? "#d97706" : "#e5d9c5";
          const cardHeight = isFirst ? "280px" : "240px";
          const cardPadding = isFirst ? "40px 24px" : "24px";
          
          return (
            <div key={entry.rank} style={{ 
              display: "flex", flexDirection: "column", alignItems: "center", 
              flex: "0 0 200px",
              background: bgColors,
              border: borderColors,
              borderRadius: "20px",
              padding: cardPadding,
              position: "relative",
              boxShadow: isFirst ? "0 8px 32px rgba(200,134,26,0.12)" : "0 4px 16px rgba(160,110,40,0.03)",
              height: cardHeight,
              boxSizing: "border-box",
              justifyContent: "center"
            }}>
              
              {/* Floating Rank Badge */}
              <div style={{
                position: "absolute", top: "-14px",
                width: "32px", height: "32px",
                background: badgeColor, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "14px", fontWeight: 700, color: "#fff",
                border: "3px solid #fff", boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
              }}>
                {entry.rank}
              </div>

              {/* Avatar */}
              <Avatar 
                user={{ ...entry, color: badgeColor }} 
                size={80} 
                style={{
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  marginBottom: "16px"
                }}
              />
              
              {/* Name */}
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "1rem", fontWeight: 700, color: "#1f1209", margin: "0 0 8px 0", textAlign: "center" }}>
                {entry.name}
              </p>
              
              {/* Points */}
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.4rem", fontWeight: 800, color: isFirst ? "#c8861a" : "#8b6535", margin: "0 0 12px 0" }}>
                {entry.points.toLocaleString()} <span style={{ fontSize: "0.85rem", fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>pts</span>
              </p>

              {/* Laurel */}
              <LaurelWreath color={laurelColor} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Row({ entry, isMe }) {
  
  const getRankBadge = () => {
    if (entry.rank === 1) return { bg: "#fcd34d", color: "#1f1209" };
    if (entry.rank === 2) return { bg: "#e2e8f0", color: "#1f1209" };
    if (entry.rank === 3) return { bg: "#d4a373", color: "#fff" };
    return { bg: "#fdfaf5", color: "#8b6535", border: "1px solid #f0e6d2" };
  };

  const badge = getRankBadge();
  const top3 = entry.rank <= 3;

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "60px 1fr 100px 100px 80px",
      alignItems: "center",
      gap: "16px",
      padding: "20px 32px",
      background: isMe ? "#fdfaf5" : "#fff",
      borderBottom: "1px solid #f0e6d2",
      borderLeft: isMe ? "3px solid #c8861a" : "3px solid transparent",
      transition: "background 0.15s",
    }}
      onMouseEnter={e => { e.currentTarget.style.background = "#fdfaf5"; }}
      onMouseLeave={e => { e.currentTarget.style.background = isMe ? "#fdfaf5" : "#fff"; }}
    >
      {/* Rank */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ 
          width: 28, height: 28, borderRadius: "50%", 
          background: badge.bg, color: badge.color, border: badge.border || "none",
          display: "flex", alignItems: "center", justifyContent: "center", 
          fontSize: "12px", fontWeight: 700 
        }}>
          {entry.rank}
        </div>
      </div>

      {/* Name */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <Avatar user={{ ...entry, color: top3 ? '#c8861a' : '#9a7845' }} size={40} style={{ border: top3 ? "2px solid #e5d9c5" : "none" }} />
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.95rem", fontWeight: isMe ? 700 : 600, color: "#1f1209", margin: 0 }}>
          {entry.name}
          {isMe && <span style={{ marginLeft: "8px", fontSize: "0.75rem", color: "#c8861a", fontWeight: 600 }}>(you)</span>}
        </p>
      </div>

      {/* Docs */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <DocSmallIcon />
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.95rem", fontWeight: 600, color: "#1f1209" }}>
          {entry.docs}
        </span>
      </div>

      {/* Points */}
      <div>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "1rem", fontWeight: 700, color: top3 ? "#c8861a" : "#8b6535" }}>
          {entry.points.toLocaleString()}
        </span>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.75rem", color: "#8b6535", marginLeft: "4px" }}>pts</span>
      </div>

      {/* Trend */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        {entry.rank <= 3 ? <TrendFireIcon /> : entry.rank <= 6 ? <TrendUpIcon /> : entry.rank <= 9 ? <TrendFlatIcon /> : <TrendDownIcon />}
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState("This Month");
  const [leaderboard, setLeaderboard] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [stats, setStats] = useState({
    contributors: "0",
    docs: "0",
    points: "0",
    active: "0"
  });
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await leaderboardAPI.getLeaderboard();
        if (res.data?.success) {
          setLeaderboard(res.data.leaderboard);
          if (res.data.stats) {
            const getStat = (label) => res.data.stats.find(s => s.label === label)?.value || "0";
            setStats({
              contributors: getStat("Total Contributors"),
              docs: getStat("Documents Shared"),
              points: getStat("Points Awarded"),
              active: getStat("Active This Month")
            });
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

  return (
    <div style={{ position: "relative", paddingBottom: "64px" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto", position: "relative", zIndex: 1 }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "40px" }}>
          
          <div className="anim-up d1" style={{ display: "flex", gap: "20px" }}>
            <div style={{ flexShrink: 0, marginTop: "8px" }}>
              <TrophyIcon />
            </div>
            <div>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "3.2rem", fontWeight: 800, color: "#1f1209", margin: "0 0 12px 0", lineHeight: 1 }}>
                Leaderboard
              </h1>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "1rem", color: "#6b4d1f", margin: 0, maxWidth: "340px", lineHeight: 1.5, fontWeight: 500 }}>
                Recognizing students who help Vertos Archive grow.
              </p>
            </div>
          </div>

          <div className="anim-up d2" style={{ position: "relative" }}>
            <button 
              onClick={() => setShowDropdown(!showDropdown)}
              style={{ 
                display: "flex", alignItems: "center", gap: "8px", 
                background: "#fff", border: "1px solid #f0e6d2", 
                borderRadius: "100px", padding: "10px 20px", 
                fontFamily: "'Inter', sans-serif", fontSize: "0.9rem", fontWeight: 600, color: "#c8861a",
                cursor: "pointer", boxShadow: "0 2px 8px rgba(160,110,40,0.05)"
              }}
            >
              <CalendarIcon />
              {period}
              <ChevronDownIcon />
            </button>
            
            {showDropdown && (
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", right: 0,
                background: "#fff", border: "1px solid #f0e6d2", borderRadius: "12px",
                padding: "8px", boxShadow: "0 8px 24px rgba(160,110,40,0.1)",
                zIndex: 10, minWidth: "160px"
              }}>
                {PERIODS.map(p => (
                  <button 
                    key={p} 
                    onClick={() => { setPeriod(p); setShowDropdown(false); }}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      padding: "10px 16px", background: period === p ? "#fdfaf5" : "transparent",
                      border: "none", borderRadius: "8px",
                      fontFamily: "'Inter', sans-serif", fontSize: "0.9rem", fontWeight: period === p ? 700 : 500,
                      color: period === p ? "#c8861a" : "#1f1209", cursor: "pointer"
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* ── Top Contributors Podium ── */}
        {!loading && leaderboard.length >= 3 && (
          <div className="anim-up d2">
            <TopPodium entries={leaderboard.slice(0, 3)} />
          </div>
        )}

        {/* ── Rankings List ── */}
        <div className="anim-up d3" style={{
          background: "#fff", border: "1px solid #f0e6d2",
          borderRadius: "24px", overflow: "hidden",
          boxShadow: "0 4px 24px rgba(160,110,40,0.04)",
          marginBottom: "32px"
        }}>
          {/* Column headers */}
          <div style={{
            display: "grid", gridTemplateColumns: "60px 1fr 100px 100px 80px",
            padding: "20px 32px", background: "#fdfaf5",
            borderBottom: "1px solid #f0e6d2",
          }}>
            {["#", "Contributor", "Docs", "Points", "Trend"].map((h, i) => (
              <span key={h} style={{
                fontFamily: "'Inter', sans-serif", fontSize: "0.8rem",
                fontWeight: 600, color: "#6b4d1f",
                textAlign: i === 0 || i === 4 ? "center" : "left",
              }}>{h}</span>
            ))}
          </div>

          {/* Rows */}
          {loading ? (
             <div style={{ padding: "40px", textAlign: "center", color: "#8b6535", fontWeight: 500 }}>Loading rankings...</div>
          ) : leaderboard.length === 0 ? (
             <div style={{ padding: "40px", textAlign: "center", color: "#8b6535", fontWeight: 500 }}>No contributors found yet.</div>
          ) : (
            leaderboard.map(entry => (
              <Row key={entry.rank} entry={entry} isMe={entry.userId === user?.id || entry.name === user?.name} />
            ))
          )}

          {/* View All Button */}
          <div style={{ padding: "20px", display: "flex", justifyContent: "center" }}>
            <button style={{ 
              background: "none", border: "none", color: "#c8861a", 
              fontFamily: "'Inter', sans-serif", fontSize: "0.95rem", fontWeight: 700, 
              cursor: "pointer", display: "flex", alignItems: "center", gap: "6px"
            }}>
              View All Rankings 
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>

        {/* ── Bottom Stats Strip ── */}
        <div className="anim-up d4" style={{
          background: "#fdfaf5", border: "1px solid #f0e6d2",
          borderRadius: "24px", padding: "32px 40px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          boxShadow: "0 4px 16px rgba(160,110,40,0.03)"
        }}>
          {[
            { value: stats.contributors, label: "Contributors", Icon: UsersIcon },
            { value: stats.docs, label: "Documents Shared", Icon: BookIcon },
            { value: stats.points, label: "Points Awarded", Icon: StarIcon },
            { value: stats.active, label: "Active This Month", Icon: FlameIcon, isRed: true },
          ].map((s, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, borderRight: i < 3 ? "1px solid #f0e6d2" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <s.Icon />
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", fontWeight: 700, color: "#1f1209" }}>{s.value}</span>
              </div>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.8rem", color: "#8b6535", fontWeight: 500 }}>{s.label}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
