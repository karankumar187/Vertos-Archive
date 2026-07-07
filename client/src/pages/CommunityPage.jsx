import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import campusBanner from "../assets/community-banner.jpg";
import LeaderboardComponent from "./LeaderboardComponent";
import ContributePage from "./ContributePage";

/* ─── SVG Icons ─────────────────────────────────────────────── */
const TrophyIcon = ({ size = 28, color = "#c8861a" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/>
    <path d="M4 22h16M8 22V10a6 6 0 0012 0v-6H4v6a6 6 0 004.8 5.86"/>
    <circle cx="12" cy="12" r="1.5" fill={color} opacity="0.5"/>
  </svg>
);
const QueriesIcon = ({ size = 28, color = "#7c3aed" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    <line x1="9" y1="10" x2="9" y2="10"/><line x1="12" y1="10" x2="12" y2="10"/><line x1="15" y1="10" x2="15" y2="10"/>
  </svg>
);
const ArchiveIcon = ({ size = 28, color = "#059669" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="21,8 21,21 3,21 3,8"/><rect x="1" y="3" width="22" height="5"/>
    <line x1="10" y1="12" x2="14" y2="12"/>
  </svg>
);
const HappeningIcon = ({ size = 28, color = "#dc2626" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>
  </svg>
);
const ContributeIcon = ({ size = 28, color = "#db2777" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16,16 12,12 8,16"/><line x1="12" y1="12" x2="12" y2="21"/>
    <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/>
  </svg>
);
const PeopleIcon = ({ size = 22, color = "#fff" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
  </svg>
);
const DocIcon = ({ size = 22, color = "#fff" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);
const ChatIcon2 = ({ size = 22, color = "#fff" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
  </svg>
);
const StarIcon = ({ size = 22, color = "#fff" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
  </svg>
);
const ArrowRight = ({ size = 15, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/>
  </svg>
);

/* ─── Placeholder Tab ───────────────────────────────────────── */
function PlaceholderTab({ title, desc, IconComp, grad }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "55vh", gap: "20px", padding: "64px 24px" }}>
      <div style={{ width: 90, height: 90, borderRadius: "24px", background: grad, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}>
        <IconComp size={44} color="#fff" />
      </div>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", color: "#1f1209", margin: 0, textAlign: "center" }}>{title}</h2>
      <p style={{ color: "#8b6a3e", fontSize: "1rem", margin: 0, maxWidth: 420, textAlign: "center", lineHeight: 1.65 }}>{desc}</p>
      <span style={{ background: grad, color: "#fff", padding: "8px 20px", borderRadius: "20px", fontSize: "0.82rem", fontWeight: 700, boxShadow: "0 4px 14px rgba(0,0,0,0.15)" }}>Coming Soon</span>
    </div>
  );
}

/* ─── Stat Card ─────────────────────────────────────────────── */
function StatCard({ IconComp, value, label, trend, gradient, iconColor }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? gradient.replace("0.85", "0.95") : gradient,
        borderRadius: "16px", padding: "20px 20px 16px 20px",
        display: "flex", flexDirection: "column", gap: "10px",
        boxShadow: hov ? "0 12px 28px rgba(0,0,0,0.15)" : "0 4px 12px rgba(0,0,0,0.08)",
        border: "1px solid rgba(255,255,255,0.5)",
        transition: "all 0.22s ease",
        transform: hov ? "translateY(-4px)" : "none",
        cursor: "default",
      }}>
      <div style={{ width: 44, height: 44, borderRadius: "12px", background: "rgba(255,255,255,0.22)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
        <IconComp size={22} color={iconColor || "#fff"} />
      </div>
      <div>
        <div style={{ fontSize: "1.7rem", fontWeight: 800, color: "#fff", fontFamily: "'Playfair Display', serif", lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.8)", fontWeight: 500, marginTop: "2px" }}>{label}</div>
        {trend && <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.9)", marginTop: "4px", fontWeight: 700, display: "flex", alignItems: "center", gap: "2px" }}>↑ {trend}</div>}
      </div>
    </div>
  );
}

/* ─── Feature Card ──────────────────────────────────────────── */
function FeatureCard({ IconComp, title, description, buttonText, onClick, gradient, iconColor, textColor, btnColor }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onClick}
      style={{
        background: gradient,
        borderRadius: "18px", padding: "28px 24px 24px",
        display: "flex", flexDirection: "column", gap: "10px",
        boxShadow: hov ? "0 16px 40px rgba(0,0,0,0.18)" : "0 4px 16px rgba(0,0,0,0.07)",
        border: "1px solid rgba(255,255,255,0.4)",
        transition: "all 0.22s ease", cursor: "pointer",
        transform: hov ? "translateY(-6px) scale(1.01)" : "none",
      }}>
      <div style={{ width: 54, height: 54, borderRadius: "15px", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
        <IconComp size={28} color={iconColor || "#fff"} />
      </div>
      <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: textColor || "#fff", margin: "6px 0 0", fontFamily: "'Inter', sans-serif" }}>{title}</h3>
      <p style={{ fontSize: "0.8rem", color: textColor ? textColor + "cc" : "rgba(255,255,255,0.78)", margin: 0, flex: 1, lineHeight: 1.6 }}>{description}</p>
      <button style={{
        marginTop: "10px", background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.35)",
        color: btnColor || "#fff", fontWeight: 700, fontSize: "0.8rem",
        display: "flex", alignItems: "center", gap: "5px",
        padding: "8px 14px", cursor: "pointer", borderRadius: "8px",
        backdropFilter: "blur(4px)", alignSelf: "flex-start",
        fontFamily: "'Inter', sans-serif", transition: "background 0.18s",
      }}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.3)"}
      onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.18)"}
      >
        {buttonText} <ArrowRight size={13} />
      </button>
    </div>
  );
}

/* ─── Home Tab ──────────────────────────────────────────────── */
function HomeTab({ setActiveTab }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px", paddingBottom: "64px" }}>

      {/* ── HERO BANNER ── */}
      <div style={{
        borderRadius: "22px", overflow: "hidden", position: "relative",
        background: "linear-gradient(135deg, #fff8ee 0%, #fef3dc 40%, #fde8b0 100%)",
        boxShadow: "0 8px 32px rgba(200,134,26,0.15)",
        border: "1px solid #f0d99a",
        display: "flex", minHeight: "300px",
      }}>
        {/* Decorative background circles */}
        <div style={{ position: "absolute", top: -60, left: -60, width: 260, height: 260, borderRadius: "50%", background: "rgba(200,134,26,0.08)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -80, left: 200, width: 200, height: 200, borderRadius: "50%", background: "rgba(200,134,26,0.06)", pointerEvents: "none" }} />

        {/* Left Text */}
        <div style={{ flex: "0 0 50%", padding: "44px 40px", display: "flex", flexDirection: "column", justifyContent: "center", gap: "16px", zIndex: 1 }}>
          <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "#c8861a", letterSpacing: "0.14em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px" }}>
            <PeopleIcon size={14} color="#c8861a" /> Community Hub
          </span>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(1.9rem, 3.5vw, 2.8rem)", fontWeight: 900, color: "#1f1209", lineHeight: 1.1, margin: 0 }}>
            Together.<br/>Stronger.<br/><span style={{ color: "#c8861a" }}>Smarter.</span>
          </h1>
          <p style={{ fontSize: "0.88rem", color: "#6b4d1f", lineHeight: 1.7, margin: 0, maxWidth: "340px" }}>
            A community built to learn, share and grow together. Explore. Contribute. Make an impact.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "8px", flexWrap: "wrap" }}>
            <button onClick={() => setActiveTab('queries')} style={{
              background: "linear-gradient(135deg, #c8861a, #a36514)", color: "#fff", border: "none", borderRadius: "10px",
              padding: "12px 22px", fontSize: "0.88rem", fontWeight: 700, cursor: "pointer",
              boxShadow: "0 6px 20px rgba(200,134,26,0.4)", display: "flex", alignItems: "center", gap: "6px",
              fontFamily: "'Inter', sans-serif", transition: "all 0.18s"
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 28px rgba(200,134,26,0.5)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(200,134,26,0.4)"; }}>
              Explore Community <ArrowRight size={14} />
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ display: "flex" }}>
                {["#c8861a","#b45309","#92400e"].map((c,i) => (
                  <div key={i} style={{ width: 30, height: 30, borderRadius: "50%", background: `linear-gradient(135deg, ${c}, #5c3406)`, border: "2.5px solid #fef3dc", marginLeft: i > 0 ? -10 : 0, zIndex: 3-i, boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }} />
                ))}
              </div>
              <div>
                <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#1f1209" }}>2.5K+ Members</div>
                <div style={{ fontSize: "0.68rem", color: "#8b6a3e" }}>Active this week</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Banner Img */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <img src={campusBanner} alt="Community" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }} />
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "120px", background: "linear-gradient(to right, #fef3dc, transparent)", zIndex: 1 }} />
          {/* Quote overlay */}
          <div style={{ position: "absolute", top: "50%", right: 20, transform: "translateY(-50%)", zIndex: 2, background: "rgba(255,255,255,0.88)", borderRadius: "16px", padding: "18px 20px", maxWidth: "195px", backdropFilter: "blur(12px)", boxShadow: "0 8px 24px rgba(0,0,0,0.1)", border: "1px solid rgba(255,255,255,0.7)" }}>
            <div style={{ fontSize: "2rem", color: "#c8861a", lineHeight: 0.8, marginBottom: "10px", fontFamily: "Georgia" }}>"</div>
            <p style={{ fontSize: "0.75rem", fontStyle: "italic", color: "#3d2a0e", margin: "0 0 10px", lineHeight: 1.55 }}>
              The best way to find yourself is to lose yourself in the service of others.
            </p>
            <p style={{ fontSize: "0.68rem", fontWeight: 800, color: "#c8861a", margin: 0, letterSpacing: "0.03em" }}>— Mahatma Gandhi</p>
          </div>
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))", gap: "16px" }}>
        <StatCard IconComp={PeopleIcon} value="2,543" label="Active Members" trend="12% this week" gradient="linear-gradient(135deg, #d97706 0%, #b45309 100%)" />
        <StatCard IconComp={DocIcon} value="18.9K" label="Resources" trend="18% this week" gradient="linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)" />
        <StatCard IconComp={ChatIcon2} value="1,284" label="Queries Solved" trend="20% this week" gradient="linear-gradient(135deg, #059669 0%, #047857 100%)" />
        <StatCard IconComp={TrophyIcon} value="856" label="Top Contributors" trend="15% this week" gradient="linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)" />
        <StatCard IconComp={StarIcon} value="4.8/5" label="Community Rating" gradient="linear-gradient(135deg, #db2777 0%, #be185d 100%)" />
      </div>

      {/* ── FEATURE CARDS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(185px, 1fr))", gap: "16px" }}>
        <FeatureCard IconComp={TrophyIcon} title="Leaderboard" description="See top contributors and rising stars in the community." buttonText="View Leaderboard" onClick={() => setActiveTab('leaderboard')} gradient="linear-gradient(135deg, #fef3dc 0%, #fde8b0 60%, #fbd76a 100%)" iconColor="#c8861a" textColor="#1f1209" />
        <FeatureCard IconComp={QueriesIcon} title="Queries" description="Ask questions, share knowledge and get help quickly." buttonText="Go to Queries" onClick={() => setActiveTab('queries')} gradient="linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)" />
        <FeatureCard IconComp={ArchiveIcon} title="Archive" description="Explore all uploaded resources with proper categories." buttonText="Explore Archive" onClick={() => setActiveTab('archive')} gradient="linear-gradient(135deg, #10b981 0%, #047857 100%)" />
        <FeatureCard IconComp={HappeningIcon} title="Happening" description="Stay updated with all events and activities in the university." buttonText="View Events" onClick={() => setActiveTab('happening')} gradient="linear-gradient(135deg, #f43f5e 0%, #be123c 100%)" />
        <FeatureCard IconComp={ContributeIcon} title="Contribute" description="Upload resources and help make our community stronger." buttonText="Contribute Now" onClick={() => setActiveTab('contribute')} gradient="linear-gradient(135deg, #ec4899 0%, #be185d 100%)" />
      </div>

      {/* ── BOTTOM GRID ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(295px, 1fr))", gap: "20px" }}>

        {/* Top Contributors */}
        <div style={{ background: "linear-gradient(160deg, #1f1209 0%, #3d2a0e 100%)", borderRadius: "18px", padding: "24px 24px 20px", boxShadow: "0 8px 28px rgba(31,18,9,0.25)", border: "1px solid rgba(200,134,26,0.2)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#fef3dc", display: "flex", alignItems: "center", gap: "8px" }}>
              <TrophyIcon size={18} color="#c8861a" /> Top Contributors
            </h3>
            <button onClick={() => setActiveTab('leaderboard')} style={{ background: "rgba(200,134,26,0.15)", border: "1px solid rgba(200,134,26,0.3)", color: "#c8861a", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", borderRadius: "20px", padding: "4px 12px" }}>View All</button>
          </div>
          {[
            { name: "Riya Sharma", dept: "CSE • Sem 7", pts: "2,450", medal: "🥇" },
            { name: "Rahul Verma", dept: "IT • Sem 5", pts: "2,140", medal: "🥈" },
            { name: "Aman Verma", dept: "CSE • Sem 5", pts: "1,820", medal: "🥉" },
          ].map((u, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", justifyContent: "space-between", marginBottom: i < 2 ? "14px" : 0, paddingBottom: i < 2 ? "14px" : 0, borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.07)" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "1.1rem" }}>{u.medal}</span>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #c8861a, #7a4f0d)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
                  <span style={{ color: "#fff", fontWeight: 800, fontSize: "0.82rem" }}>{u.name.charAt(0)}</span>
                </div>
                <div>
                  <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#fef3dc" }}>{u.name}</div>
                  <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.45)" }}>{u.dept}</div>
                </div>
              </div>
              <div style={{ background: "rgba(200,134,26,0.2)", borderRadius: "8px", padding: "4px 10px", fontSize: "0.82rem", fontWeight: 700, color: "#fbbf24" }}>{u.pts}</div>
            </div>
          ))}
        </div>

        {/* Active Discussions */}
        <div style={{ background: "linear-gradient(160deg, #2e1065 0%, #4c1d95 100%)", borderRadius: "18px", padding: "24px 24px 20px", boxShadow: "0 8px 28px rgba(46,16,101,0.3)", border: "1px solid rgba(139,92,246,0.25)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#ede9fe", display: "flex", alignItems: "center", gap: "8px" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 01-7 7 7 7 0 01-7-7c0-1.53.4-2.973 1.1-4.22L8.5 14.5z"/></svg>
              Active Discussions
            </h3>
            <button onClick={() => setActiveTab('queries')} style={{ background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.35)", color: "#a78bfa", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", borderRadius: "20px", padding: "4px 12px" }}>View All</button>
          </div>
          {[
            { q: "How to prepare for DBMS end semester?", by: "Priyanshu", ago: "2h", tag: "DBMS", tagC: "#fbbf24", tagB: "rgba(251,191,36,0.15)" },
            { q: "What are the important topics in OS Unit 3?", by: "Mehak", ago: "4h", tag: "OS", tagC: "#34d399", tagB: "rgba(52,211,153,0.15)" },
            { q: "Need help in understanding CNN architecture.", by: "Arjun", ago: "6h", tag: "AI/ML", tagC: "#f87171", tagB: "rgba(248,113,113,0.15)" },
          ].map((d, i) => (
            <div key={i} style={{ paddingBottom: i < 2 ? "14px" : 0, marginBottom: i < 2 ? "14px" : 0, borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "5px", gap: "10px" }}>
                <div style={{ fontSize: "0.86rem", fontWeight: 600, color: "#ede9fe", flex: 1, lineHeight: 1.45 }}>{d.q}</div>
                <span style={{ fontSize: "0.66rem", padding: "3px 8px", background: d.tagB, color: d.tagC, borderRadius: "10px", fontWeight: 800, whiteSpace: "nowrap", border: `1px solid ${d.tagC}44` }}>{d.tag}</span>
              </div>
              <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.45)" }}>Asked by <b style={{ color: "rgba(255,255,255,0.65)" }}>{d.by}</b> • {d.ago} ago</div>
            </div>
          ))}
        </div>

        {/* Events + CTA stacked */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ background: "linear-gradient(160deg, #064e3b 0%, #065f46 100%)", borderRadius: "18px", padding: "24px", flex: 1, boxShadow: "0 8px 28px rgba(6,78,59,0.3)", border: "1px solid rgba(52,211,153,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#d1fae5", display: "flex", alignItems: "center", gap: "8px" }}>
                <HappeningIcon size={18} color="#34d399" /> Upcoming Events
              </h3>
              <button onClick={() => setActiveTab('happening')} style={{ background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.3)", color: "#34d399", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", borderRadius: "20px", padding: "4px 12px" }}>View All</button>
            </div>
            {[
              { month: "MAY", day: "25", title: "HackVerse 2024", desc: "Hackathon • Main Auditorium", n: 120 },
              { month: "MAY", day: "28", title: "AI & ML Workshop", desc: "Workshop • Lab 3, Block C", n: 85 },
              { month: "JUN", day: "02", title: "Tech Talk: Future of Dev", desc: "Seminar Hall", n: 60 },
            ].map((ev, i) => (
              <div key={i} style={{ display: "flex", gap: "14px", alignItems: "center", marginBottom: i < 2 ? "14px" : 0, paddingBottom: i < 2 ? "14px" : 0, borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                <div style={{ width: 46, height: 46, borderRadius: "12px", background: "rgba(52,211,153,0.15)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1px solid rgba(52,211,153,0.25)" }}>
                  <span style={{ fontSize: "0.52rem", fontWeight: 700, color: "#34d399", textTransform: "uppercase" }}>{ev.month}</span>
                  <span style={{ fontSize: "1.15rem", fontWeight: 900, color: "#d1fae5", lineHeight: 1 }}>{ev.day}</span>
                </div>
                <div>
                  <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#d1fae5" }}>{ev.title}</div>
                  <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.45)" }}>{ev.desc}</div>
                  <div style={{ fontSize: "0.68rem", color: "#34d399", fontWeight: 600 }}>{ev.n} Interested</div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div style={{ borderRadius: "16px", padding: "22px 24px", background: "linear-gradient(135deg, #c8861a 0%, #92400e 100%)", boxShadow: "0 8px 24px rgba(200,134,26,0.35)", border: "1px solid rgba(255,255,255,0.15)" }}>
            <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "#fff", marginBottom: "6px" }}>Your contribution creates impact!</div>
            <div style={{ fontSize: "0.76rem", color: "rgba(255,255,255,0.8)", marginBottom: "16px", lineHeight: 1.55 }}>Share resources, help others and earn recognition in the community.</div>
            <button onClick={() => setActiveTab('contribute')} style={{
              background: "rgba(255,255,255,0.92)", color: "#c8861a", border: "none", borderRadius: "9px",
              padding: "9px 18px", fontSize: "0.82rem", fontWeight: 800, cursor: "pointer",
              display: "flex", alignItems: "center", gap: "5px", fontFamily: "'Inter', sans-serif",
            }}>
              Start Contributing <ArrowRight size={13} color="#c8861a" />
            </button>
          </div>
        </div>

      </div>

      {/* ── TRUST BADGES ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(195px, 1fr))", gap: "14px" }}>
        {[
          { grad: "linear-gradient(135deg, #c8861a22, #fbbf2411)", border: "#c8861a33", icon: "✓", iconC: "#c8861a", title: "Verified Resources", desc: "All resources are reviewed by our community experts." },
          { grad: "linear-gradient(135deg, #7c3aed22, #a78bfa11)", border: "#7c3aed33", icon: "🤝", iconC: "#7c3aed", title: "Safe & Supportive", desc: "A respectful space to learn and grow together." },
          { grad: "linear-gradient(135deg, #05966922, #34d39911)", border: "#05966933", icon: "📚", iconC: "#059669", title: "Knowledge for All", desc: "Open access to quality education and resources." },
          { grad: "linear-gradient(135deg, #db277722, #ec489911)", border: "#db277733", icon: "✦", iconC: "#db2777", title: "Make a Difference", desc: "Your small contribution can help thousands." },
        ].map((b, i) => (
          <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start", padding: "16px 18px", background: b.grad, borderRadius: "14px", border: `1px solid ${b.border}` }}>
            <div style={{ width: 36, height: 36, borderRadius: "10px", background: b.iconC + "18", border: `1px solid ${b.iconC}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0, color: b.iconC, fontWeight: 900 }}>{b.icon}</div>
            <div>
              <div style={{ fontSize: "0.84rem", fontWeight: 700, color: "#1f1209", marginBottom: "3px" }}>{b.title}</div>
              <div style={{ fontSize: "0.73rem", color: "#6b4d1f", lineHeight: 1.5 }}>{b.desc}</div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────── */
export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState("home");
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const tab = location.hash.replace("#", "");
      if (["home","leaderboard","queries","archive","happening","contribute"].includes(tab)) setActiveTab(tab);
    }
  }, [location.hash]);

  const updateTab = (tab) => { setActiveTab(tab); window.location.hash = tab; };

  const tabs = [
    { id: "home",        label: "Home" },
    { id: "leaderboard", label: "Leaderboard" },
    { id: "queries",     label: "Queries" },
    { id: "archive",     label: "Archive" },
    { id: "happening",   label: "Happening" },
    { id: "contribute",  label: "Contribute" },
  ];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#f5f0e8" }}>

      {/* Mesh gradient background */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse at 10% 30%, rgba(200,134,26,0.06) 0%, transparent 60%), radial-gradient(ellipse at 90% 70%, rgba(124,58,237,0.04) 0%, transparent 60%), radial-gradient(ellipse at 50% 90%, rgba(5,150,105,0.04) 0%, transparent 60%)",
      }} />

      {/* Secondary Navbar */}
      <div style={{ position: "sticky", top: 68, zIndex: 40, width: "100%", background: "rgba(253,250,245,0.97)", backdropFilter: "blur(16px)", borderBottom: "1px solid #e9dcc8" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "stretch", overflowX: "auto", scrollbarWidth: "none", height: "48px" }}>
          {tabs.map(t => {
            const active = activeTab === t.id;
            return (
              <button key={t.id} onClick={() => updateTab(t.id)} style={{
                padding: "0 20px", border: "none", background: "transparent",
                color: active ? "#c8861a" : "#6b4d1f", fontWeight: active ? 700 : 500,
                fontSize: "0.84rem", cursor: "pointer", whiteSpace: "nowrap",
                borderBottom: active ? "2.5px solid #c8861a" : "2.5px solid transparent",
                transition: "all 0.18s", fontFamily: "'Inter', sans-serif", marginBottom: "-1px",
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = "#8b5e0a"; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = "#6b4d1f"; }}>
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1, maxWidth: 1280, margin: "0 auto", width: "100%", padding: "28px 24px", flex: 1, boxSizing: "border-box" }}>
        {activeTab === "home"        && <HomeTab setActiveTab={updateTab} />}
        {activeTab === "leaderboard" && <LeaderboardComponent />}
        {activeTab === "queries"     && <PlaceholderTab title="Queries" desc="Ask questions and get answers from fellow students and admins." IconComp={QueriesIcon} grad="linear-gradient(135deg, #7c3aed, #5b21b6)" />}
        {activeTab === "archive"     && <PlaceholderTab title="Archive" desc="Browse all indexed resources, organized by course and category." IconComp={ArchiveIcon} grad="linear-gradient(135deg, #059669, #047857)" />}
        {activeTab === "happening"   && <PlaceholderTab title="Happening" desc="Hackathons, webinars, workshops — never miss a campus event again." IconComp={HappeningIcon} grad="linear-gradient(135deg, #dc2626, #b91c1c)" />}
        {activeTab === "contribute"  && <ContributePage />}
      </div>
    </div>
  );
}
