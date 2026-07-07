import { useState, useEffect } from "react";
import { leaderboardAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

// Sparkly Trophy SVG (no background)
const TrophyImg = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Sparkles */}
    <path d="M52 8 L53.5 10 L52 12 L50.5 10 Z" fill="#f59e0b"/>
    <path d="M51 9.5 L53 10 L51 10.5 L49 10 Z" fill="#f59e0b"/>
    <path d="M12 10 L13 11.5 L12 13 L11 11.5 Z" fill="#d97706"/>
    <path d="M11.5 11 L13 12 L11.5 12.5 L10 12 Z" fill="#d97706"/>
    <path d="M56 22 L57 23.5 L56 25 L55 23.5 Z" fill="#f59e0b" opacity="0.7"/>
    <path d="M8 28 L9 29 L8 30 L7 29 Z" fill="#d97706" opacity="0.6"/>
    {/* Cup body */}
    <path d="M20 12 H44 V34 C44 41.7 38.6 48 31.8 49.5 L32 50 L27 50 L27.2 49.5 C20.4 48 15 41.7 15 34 V12 Z" fill="url(#cupGrad)" rx="2"/>
    {/* Handles */}
    <path d="M20 16 C14 16 10 20 10 25 C10 30 14 33 20 32" stroke="#d97706" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
    <path d="M44 16 C50 16 54 20 54 25 C54 30 50 33 44 32" stroke="#d97706" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
    {/* Shine */}
    <path d="M24 16 C24 16 26 20 25 28" stroke="#fde68a" strokeWidth="2" opacity="0.6" strokeLinecap="round"/>
    {/* Stem */}
    <rect x="28" y="50" width="8" height="6" fill="#d97706" rx="1"/>
    {/* Base */}
    <rect x="22" y="56" width="20" height="4" fill="#b45309" rx="2"/>
    <defs>
      <linearGradient id="cupGrad" x1="15" y1="12" x2="44" y2="50" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fcd34d"/>
        <stop offset="0.5" stopColor="#d97706"/>
        <stop offset="1" stopColor="#b45309"/>
      </linearGradient>
    </defs>
  </svg>
);

// --- SVGs ---
const CrownIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="#c8861a" stroke="#c8861a" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="2 20 22 20 19 6 15.5 10 12 4 8.5 10 5 6 2 20"/>
  </svg>
);

const CalendarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

const ChevronUpIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="18 15 12 9 6 15"/>
  </svg>
);

const DocIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b6535" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>
);

// Trend Icons
const TrendFireIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
  </svg>
);
const TrendUpIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
    <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
  </svg>
);
const TrendDownIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
  </svg>
);
const TrendFlatIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5">
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

// Stats Icons
const UsersIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1f1209" strokeWidth="1.75">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const BookIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1f1209" strokeWidth="1.75">
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
  </svg>
);
const StarIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1f1209" strokeWidth="1.75">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
const FlameStatIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.75">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
  </svg>
);

// Laurel wreath SVG
const LaurelLeft = ({ color }) => (
  <svg width="52" height="28" viewBox="0 0 52 28" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
    <path d="M48 22 C38 18 28 20 18 22"/>
    <path d="M44 20 C36 12 28 10 20 14"/>
    <path d="M38 18 C32 12 24 12 18 16"/>
    <path d="M32 17 C28 14 22 14 18 18"/>
  </svg>
);
const LaurelRight = ({ color }) => (
  <svg width="52" height="28" viewBox="0 0 52 28" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
    <path d="M4 22 C14 18 24 20 34 22"/>
    <path d="M8 20 C16 12 24 10 32 14"/>
    <path d="M14 18 C20 12 28 12 34 16"/>
    <path d="M20 17 C24 14 30 14 34 18"/>
  </svg>
);

// --- Avatar ---
// Badge icons for overlay
const BadgeIcon = ({ badge }) => {
  if (badge === 'Elite Verto') return (
    <div title="Elite Verto" style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#7c3aed,#4f46e5)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="#fff"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
    </div>
  );
  // Top Contributor (gold star)
  return (
    <div title="Top Contributor" style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#d97706,#b45309)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="#fff"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
    </div>
  );
};

const Avatar = ({ user, size = 40, style = {}, showBadge = true }) => {
  const badges = user?.badges || [];
  const topBadge = badges.includes('Elite Verto') ? 'Elite Verto' : badges.includes('Top Contributor') ? 'Top Contributor' : null;
  const badgeSize = Math.max(14, Math.round(size * 0.35));

  const avatarEl = (() => {
    if (!user) return <div style={{ width: size, height: size, borderRadius: "50%", background: "#e2e8f0", flexShrink: 0, ...style }} />;
    if (user.avatar) return (
      <img src={user.avatar} alt={user.name}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, ...style }} />
    );
    const colors = ["#c8861a", "#7c3aed", "#059669", "#2563eb", "#dc2626"];
    const colorIdx = (user.name?.charCodeAt(0) || 0) % colors.length;
    return (
      <div style={{ width: size, height: size, borderRadius: "50%", background: user.color || colors[colorIdx],
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontSize: size * 0.4, fontWeight: 700, flexShrink: 0, ...style }}>
        {user.name?.charAt(0).toUpperCase() || '?'}
      </div>
    );
  })();

  if (!showBadge || !topBadge) return avatarEl;

  return (
    <div style={{ position: "relative", flexShrink: 0, width: size, height: size }}>
      {avatarEl}
      <div style={{ position: "absolute", bottom: -2, right: -2, width: badgeSize, height: badgeSize, borderRadius: "50%", border: "2px solid #fff", overflow: "hidden" }}>
        <BadgeIcon badge={topBadge} />
      </div>
    </div>
  );
};

const PERIODS = ["This Month", "All Time", "This Week"];
const INITIAL_SHOW = 15;
const MAX_SHOW = 999; 

// Rank badge colors
const rankBadge = (rank) => {
  if (rank === 1) return { bg: "#d97706", color: "#fff" };
  if (rank === 2) return { bg: "#9ca3af", color: "#fff" };
  if (rank === 3) return { bg: "#d97706", color: "#fff", opacity: 0.7 };
  return { bg: "#f3f4f6", color: "#6b7280", border: "1px solid #e5e7eb" };
};

function TopPodium({ entries }) {
  if (!entries || entries.length === 0) return null;
  // 2nd | 1st | 3rd
  const order = [entries[1], entries[0], entries[2]].filter(Boolean);

  return (
    <div style={{
      background: "#fff", borderRadius: "20px",
      padding: "32px 24px 40px",
      boxShadow: "0 2px 16px rgba(160,110,40,0.05)",
      border: "1px solid #f0e6d2",
      marginBottom: "24px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "36px" }}>
        <CrownIcon />
        <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: "1.05rem", fontWeight: 700, color: "#1f1209", margin: 0 }}>
          Top 3 Contributors
        </h2>
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: "16px" }}>
        {order.map((entry, i) => {
          // i=0 is rank 2, i=1 is rank 1, i=2 is rank 3
          const isFirst = i === 1;
          const badgeColors = ["#94a3b8", "#d97706", "#c8861a"];
          const badgeColor = badgeColors[i];
          const laurelColor = isFirst ? "#d97706" : "#d4b483";
          const cardW = isFirst ? "200px" : "170px";
          const avatarSize = isFirst ? 88 : 72;

          return (
            <div key={entry.rank} style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              width: cardW,
              background: isFirst ? "#fdfaf5" : "#fff",
              border: isFirst ? "1.5px solid #e8c96a" : "1px solid #f0e6d2",
              borderRadius: "20px",
              padding: isFirst ? "28px 20px 24px" : "20px 16px 20px",
              position: "relative",
              boxShadow: isFirst ? "0 8px 28px rgba(200,134,26,0.10)" : "0 2px 8px rgba(160,110,40,0.04)",
              transition: "transform 0.2s",
            }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-4px)"}
              onMouseLeave={e => e.currentTarget.style.transform = ""}
            >
              {/* Rank Badge */}
              <div style={{
                position: "absolute", top: "-14px",
                width: "30px", height: "30px",
                background: badgeColor, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "13px", fontWeight: 800, color: "#fff",
                border: "3px solid #fff", boxShadow: "0 2px 8px rgba(0,0,0,0.12)"
              }}>
                {entry.rank}
              </div>

              {/* Avatar */}
              <Avatar user={entry} size={avatarSize} style={{
                marginBottom: "16px",
                boxShadow: isFirst ? "0 4px 16px rgba(200,134,26,0.2)" : "0 2px 8px rgba(0,0,0,0.08)",
                border: isFirst ? "3px solid #e8c96a" : "2px solid #f0e6d2"
              }} />

              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: isFirst ? "1.05rem" : "0.95rem", fontWeight: 700, color: "#1f1209", margin: "0 0 8px 0", textAlign: "center", lineHeight: 1.2 }}>
                {entry.name}
              </p>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: isFirst ? "1.4rem" : "1.2rem", fontWeight: 800, color: "#c8861a", margin: "0 0 16px 0" }}>
                {entry.points} <span style={{ fontSize: "0.75rem", fontWeight: 600, fontFamily: "'Inter', sans-serif", color: "#8b6535" }}>pts</span>
              </p>

              {/* Laurel Wreath */}
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <LaurelLeft color={laurelColor} />
                <LaurelRight color={laurelColor} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Row({ entry, isMe }) {
  const top3 = entry.rank <= 3;
  const badge = rankBadge(entry.rank);
  const getTrend = () => {
    if (entry.rank === 1) return <TrendFireIcon />;
    if (entry.rank <= 4) return <TrendUpIcon />;
    if (entry.rank <= 7) return <TrendFlatIcon />;
    return <TrendDownIcon />;
  };

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "56px 1fr 100px 110px 70px",
      alignItems: "center", gap: "16px",
      padding: "18px 28px",
      background: isMe ? "#fdfaf5" : "#fff",
      borderBottom: "1px solid #f5efeb",
      borderLeft: isMe ? "3px solid #c8861a" : "3px solid transparent",
      transition: "background 0.15s",
    }}
      onMouseEnter={e => e.currentTarget.style.background = "#fdfaf5"}
      onMouseLeave={e => e.currentTarget.style.background = isMe ? "#fdfaf5" : "#fff"}
    >
      {/* Rank */}
      <div style={{ display: "flex", alignItems: "center", paddingLeft: "4px" }}>
        <div style={{
          width: 30, height: 30, borderRadius: "50%",
          background: badge.bg, color: badge.color, border: badge.border,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "13px", fontWeight: 700, opacity: badge.opacity || 1
        }}>
          {entry.rank}
        </div>
      </div>

      {/* Contributor */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <Avatar user={entry} size={40} style={{
          border: top3 ? "2px solid #e8c96a" : "1.5px solid #f0e6d2"
        }} />
        <div>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.9rem", fontWeight: isMe ? 700 : 600, color: "#1f1209", margin: 0 }}>
            {entry.name}
            {isMe && <span style={{ marginLeft: "8px", fontSize: "0.7rem", color: "#c8861a", fontWeight: 600 }}>(you)</span>}
          </p>
          {entry.regNo && (
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.72rem", color: "#8b6535", margin: 0, marginTop: "2px" }}>
              {entry.regNo}
            </p>
          )}
        </div>
      </div>

      {/* Docs */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <DocIcon />
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.9rem", fontWeight: 600, color: "#4b3823" }}>
          {entry.docs}
        </span>
      </div>

      {/* Points */}
      <div>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.95rem", fontWeight: 700, color: top3 ? "#c8861a" : "#8b6535" }}>
          {entry.points.toLocaleString()}
        </span>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.75rem", color: "#8b6535", marginLeft: "3px" }}>pts</span>
      </div>

      {/* Trend */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        {getTrend()}
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState("This Month");
  const [leaderboard, setLeaderboard] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [stats, setStats] = useState({ contributors: "0", docs: "0", points: "0", active: "0" });
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
      } catch (err) {
        console.error("Failed to fetch leaderboard", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [period]);

  const visibleEntries = showAll ? leaderboard.slice(0, MAX_SHOW) : leaderboard.slice(0, INITIAL_SHOW);

  return (
    <div style={{ position: "relative", paddingBottom: "64px" }} onClick={() => showDropdown && setShowDropdown(false)}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>

        {/* ── Header Row ── */}
        <div className="anim-up d1" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "40px" }}>
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <TrophyImg />
            <div>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "3rem", fontWeight: 900, color: "#1f1209", margin: 0, lineHeight: 1 }}>
                Leaderboard
              </h1>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.95rem", color: "#6b4d1f", margin: "10px 0 0", lineHeight: 1.5 }}>
                Recognizing students who help<br />Vertos Archive grow.
              </p>
            </div>
          </div>

          {/* Period Selector */}
          <div style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                background: "#fff", border: "1px solid #e5d9c5",
                borderRadius: "100px", padding: "10px 20px",
                fontFamily: "'Inter', sans-serif", fontSize: "0.9rem", fontWeight: 600, color: "#c8861a",
                cursor: "pointer", boxShadow: "0 2px 8px rgba(160,110,40,0.06)",
                transition: "box-shadow 0.2s"
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 12px rgba(160,110,40,0.12)"}
              onMouseLeave={e => e.currentTarget.style.boxShadow = "0 2px 8px rgba(160,110,40,0.06)"}
            >
              <CalendarIcon /> {period} <ChevronDownIcon />
            </button>
            {showDropdown && (
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", right: 0,
                background: "#fff", border: "1px solid #f0e6d2", borderRadius: "14px",
                padding: "8px", boxShadow: "0 8px 28px rgba(160,110,40,0.12)",
                zIndex: 20, minWidth: "170px"
              }}>
                {PERIODS.map(p => (
                  <button key={p} onClick={() => { setPeriod(p); setShowDropdown(false); }}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      padding: "10px 16px", background: period === p ? "#fdfaf5" : "transparent",
                      border: "none", borderRadius: "8px",
                      fontFamily: "'Inter', sans-serif", fontSize: "0.9rem",
                      fontWeight: period === p ? 700 : 500,
                      color: period === p ? "#c8861a" : "#1f1209", cursor: "pointer"
                    }}>{p}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Podium ── */}
        {!loading && leaderboard.length >= 1 && (
          <div className="anim-up d2">
            <TopPodium entries={leaderboard.slice(0, 3)} />
          </div>
        )}

        {/* ── Rankings Table ── */}
        <div className="anim-up d3" style={{
          background: "#fff", border: "1px solid #f0e6d2",
          borderRadius: "20px", overflow: "hidden",
          boxShadow: "0 2px 16px rgba(160,110,40,0.04)",
          marginBottom: "24px"
        }}>
          {/* Header row */}
          <div style={{
            display: "grid", gridTemplateColumns: "56px 1fr 100px 110px 70px",
            padding: "16px 28px", background: "#fdfaf5",
            borderBottom: "1px solid #f0e6d2",
          }}>
            {["#", "Contributor", "Docs", "Points", "Trend"].map((h, i) => (
              <span key={h} style={{
                fontFamily: "'Inter', sans-serif", fontSize: "0.75rem", fontWeight: 700,
                color: "#8b6535", textTransform: "uppercase", letterSpacing: "0.06em",
                textAlign: i === 4 ? "center" : "left",
              }}>{h}</span>
            ))}
          </div>

          {/* Rows */}
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#8b6535" }}>Loading rankings...</div>
          ) : leaderboard.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#8b6535" }}>No contributors yet. Be the first to upload!</div>
          ) : (
            visibleEntries.map(entry => (
              <Row key={entry.rank} entry={entry} isMe={entry.userId === user?.id || entry.name === user?.name} />
            ))
          )}

          {/* View All / Collapse */}
          {!loading && leaderboard.length > INITIAL_SHOW && (
            <div style={{ padding: "20px", display: "flex", justifyContent: "center", borderTop: "1px solid #f5efeb", background: "#fff" }}>
              <button
                onClick={() => setShowAll(!showAll)}
                style={{
                  background: "none", border: "none", color: "#c8861a",
                  fontFamily: "'Inter', sans-serif", fontSize: "0.95rem", fontWeight: 700,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
                  padding: "8px 16px", borderRadius: "8px", transition: "background 0.2s"
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#fdfaf5"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}
              >
                {showAll ? (
                  <> Show Less <ChevronUpIcon /> </>
                ) : (
                  <> View All Rankings (Top {Math.min(MAX_SHOW, leaderboard.length)}) <ChevronRightIcon /> </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* ── Bottom Stats Strip ── */}
        <div className="anim-up d4" style={{
          background: "#fdfaf5", border: "1px solid #f0e6d2",
          borderRadius: "20px", padding: "28px 32px",
          display: "flex", justifyContent: "space-around", alignItems: "center",
          boxShadow: "0 2px 12px rgba(160,110,40,0.03)"
        }}>
          {[
            { value: stats.contributors, label: "Contributors", Icon: UsersIcon },
            { value: stats.docs, label: "Documents Shared", Icon: BookIcon },
            { value: stats.points, label: "Points Awarded", Icon: StarIcon },
            { value: stats.active, label: "Active This Month", Icon: FlameStatIcon },
          ].map((s, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, borderRight: i < 3 ? "1px solid #f0e6d2" : "none", padding: "0 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <s.Icon />
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", fontWeight: 800, color: "#1f1209" }}>{s.value}</span>
              </div>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.8rem", color: "#8b6535", fontWeight: 500 }}>{s.label}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
