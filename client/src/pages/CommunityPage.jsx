import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import campusBanner from "../assets/community-banner.jpg";
import LeaderboardComponent from "./LeaderboardComponent";
import ContributePage from "./ContributePage";

/* ─── Icon Components (themed, amber/dark) ──────────────────── */
const Icon = ({ children, bg = "#fef3dc", size = 44 }) => (
  <div style={{
    width: size, height: size, borderRadius: "12px", background: bg,
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  }}>
    {children}
  </div>
);

const TrophyIcon  = ({ s = 22, c = "#c8861a" }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16M11 22V16.5M13 22V16.5M8 4h8v5a4 4 0 01-8 0V4z"/></svg>;
const QueriesIcon = ({ s = 22, c = "#c8861a" }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>;
const ArchiveIcon = ({ s = 22, c = "#c8861a" }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><polyline points="21,8 21,21 3,21 3,8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>;
const CalIcon     = ({ s = 22, c = "#c8861a" }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const UploadIcon  = ({ s = 22, c = "#c8861a" }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><polyline points="16,16 12,12 8,16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>;
const PeopleIcon  = ({ s = 20, c = "#c8861a" }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>;
const DocIcon     = ({ s = 20, c = "#c8861a" }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
const ChatIcon    = ({ s = 20, c = "#c8861a" }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>;
const StarIcon    = ({ s = 20, c = "#c8861a" }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>;
const Arrow       = ({ s = 14 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/></svg>;

/* ─── Reusable card wrapper ─────────────────────────────────── */
function Card({ children, style = {}, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: "#fff",
        borderRadius: "16px",
        border: `1px solid ${hov && onClick ? "#e0c070" : "#ede5d4"}`,
        boxShadow: hov ? "0 8px 28px rgba(160,110,40,0.1)" : "0 2px 10px rgba(160,110,40,0.05)",
        transition: "all 0.2s ease",
        transform: hov && onClick ? "translateY(-3px)" : "none",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ─── Stat Card ─────────────────────────────────────────────── */
function StatCard({ IconComp, value, label, trend }) {
  return (
    <Card style={{ padding: "20px 18px", display: "flex", alignItems: "center", gap: "14px" }}>
      <Icon bg="#fef3dc"><IconComp /></Icon>
      <div>
        <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1f1209", fontFamily: "'Playfair Display', serif", lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: "0.78rem", color: "#8b6a3e", fontWeight: 500, marginTop: "2px" }}>{label}</div>
        {trend && <div style={{ fontSize: "0.68rem", color: "#10b981", fontWeight: 700, marginTop: "3px" }}>↑ {trend}</div>}
      </div>
    </Card>
  );
}

/* ─── Feature Card ──────────────────────────────────────────── */
function FeatureCard({ IconComp, title, desc, cta, onClick }) {
  return (
    <Card onClick={onClick} style={{ padding: "24px 22px", display: "flex", flexDirection: "column", gap: "10px" }}>
      <Icon bg="#fef3dc" size={48}><IconComp /></Icon>
      <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#1f1209", margin: "6px 0 0", fontFamily: "'Inter', sans-serif" }}>{title}</h3>
      <p style={{ fontSize: "0.8rem", color: "#8b6a3e", margin: 0, lineHeight: 1.6, flex: 1 }}>{desc}</p>
      <span style={{ marginTop: "8px", fontSize: "0.8rem", fontWeight: 700, color: "#c8861a", display: "flex", alignItems: "center", gap: "4px" }}>
        {cta} <Arrow s={13} />
      </span>
    </Card>
  );
}

/* ─── Placeholder Tab ───────────────────────────────────────── */
function PlaceholderTab({ title, desc, IconComp }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "55vh", gap: "18px", padding: "64px 24px" }}>
      <div style={{ width: 84, height: 84, borderRadius: "22px", background: "#fef3dc", border: "1px solid #e8c96a", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 18px rgba(200,134,26,0.1)" }}>
        <IconComp s={40} />
      </div>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.9rem", color: "#1f1209", margin: 0 }}>{title}</h2>
      <p style={{ color: "#8b6a3e", fontSize: "0.95rem", margin: 0, maxWidth: 400, textAlign: "center", lineHeight: 1.7 }}>{desc}</p>
      <span style={{ background: "#fef3dc", color: "#c8861a", padding: "7px 20px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 700, border: "1px solid #e8c96a" }}>Coming Soon</span>
    </div>
  );
}

/* ─── Home Tab ──────────────────────────────────────────────── */
function HomeTab({ setActiveTab }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", paddingBottom: "60px" }}>

      {/* ── HERO BANNER ── */}
      <div style={{
        borderRadius: "20px", overflow: "hidden", position: "relative",
        background: "#fffbf3",
        boxShadow: "0 4px 24px rgba(160,110,40,0.08)",
        border: "1px solid #ede5d4",
        display: "flex", minHeight: "280px",
      }}>
        {/* Subtle background ring decoration */}
        <div style={{ position: "absolute", top: -100, left: -100, width: 360, height: 360, borderRadius: "50%", border: "1px solid rgba(200,134,26,0.08)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: -60, left: -60, width: 240, height: 240, borderRadius: "50%", border: "1px solid rgba(200,134,26,0.06)", pointerEvents: "none" }} />

        {/* Left text */}
        <div style={{ flex: "0 0 50%", padding: "44px 44px", display: "flex", flexDirection: "column", justifyContent: "center", gap: "14px", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#c8861a" }} />
            <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "#c8861a", letterSpacing: "0.12em", textTransform: "uppercase" }}>Community Hub</span>
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(1.9rem, 3.2vw, 2.7rem)", fontWeight: 900, color: "#1f1209", lineHeight: 1.12, margin: 0 }}>
            Together.<br/>Stronger.<br/><span style={{ color: "#c8861a" }}>Smarter.</span>
          </h1>
          <p style={{ fontSize: "0.87rem", color: "#6b4d1f", lineHeight: 1.7, margin: 0, maxWidth: "320px" }}>
            A community built to learn, share and grow together. Explore. Contribute. Make an impact.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "6px", flexWrap: "wrap" }}>
            <button onClick={() => setActiveTab('queries')} style={{
              background: "#c8861a", color: "#fff", border: "none", borderRadius: "10px",
              padding: "11px 22px", fontSize: "0.87rem", fontWeight: 700, cursor: "pointer",
              boxShadow: "0 4px 16px rgba(200,134,26,0.35)", display: "flex", alignItems: "center", gap: "6px",
              fontFamily: "'Inter', sans-serif", transition: "all 0.18s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#a36514"; e.currentTarget.style.boxShadow = "0 6px 22px rgba(200,134,26,0.45)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#c8861a"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(200,134,26,0.35)"; }}>
              Explore Community <Arrow s={14} />
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ display: "flex" }}>
                {["#d97706","#b45309","#92400e"].map((c, i) => (
                  <div key={i} style={{ width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg, ${c}, #5c3406)`, border: "2px solid #fffbf3", marginLeft: i > 0 ? -9 : 0, zIndex: 3 - i }} />
                ))}
              </div>
              <div>
                <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#1f1209" }}>2.5K+ Members</div>
                <div style={{ fontSize: "0.67rem", color: "#8b6a3e" }}>Active this week</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: image */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <img src={campusBanner} alt="Community" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }} />
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "100px", background: "linear-gradient(to right, #fffbf3, transparent)", zIndex: 1 }} />
          {/* Quote card */}
          <div style={{ position: "absolute", top: "50%", right: 20, transform: "translateY(-50%)", zIndex: 2, background: "rgba(255,251,243,0.92)", borderRadius: "14px", padding: "16px 18px", maxWidth: "185px", backdropFilter: "blur(10px)", boxShadow: "0 6px 20px rgba(160,110,40,0.12)", border: "1px solid #ede5d4" }}>
            <div style={{ fontSize: "1.8rem", color: "#c8861a", lineHeight: 0.7, marginBottom: "10px", fontFamily: "Georgia" }}>"</div>
            <p style={{ fontSize: "0.73rem", fontStyle: "italic", color: "#3d2a0e", margin: "0 0 8px", lineHeight: 1.55 }}>The best way to find yourself is to lose yourself in the service of others.</p>
            <p style={{ fontSize: "0.65rem", fontWeight: 800, color: "#c8861a", margin: 0, letterSpacing: "0.02em" }}>— Mahatma Gandhi</p>
          </div>
        </div>
      </div>

      {/* ── STATS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))", gap: "14px" }}>
        <StatCard IconComp={() => <PeopleIcon />} value="2,543" label="Active Members" trend="12% this week" />
        <StatCard IconComp={() => <DocIcon />} value="18.9K" label="Resources" trend="18% this week" />
        <StatCard IconComp={() => <ChatIcon />} value="1,284" label="Queries Solved" trend="20% this week" />
        <StatCard IconComp={() => <TrophyIcon />} value="856" label="Top Contributors" trend="15% this week" />
        <StatCard IconComp={() => <StarIcon />} value="4.8/5" label="Community Rating" />
      </div>

      {/* ── FEATURE CARDS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(185px, 1fr))", gap: "14px" }}>
        <FeatureCard IconComp={TrophyIcon} title="Leaderboard" desc="See top contributors and rising stars." cta="View Leaderboard" onClick={() => setActiveTab('leaderboard')} />
        <FeatureCard IconComp={QueriesIcon} title="Queries" desc="Ask questions and get help quickly from peers." cta="Go to Queries" onClick={() => setActiveTab('queries')} />
        <FeatureCard IconComp={ArchiveIcon} title="Archive" desc="All uploaded resources with proper categories." cta="Explore Archive" onClick={() => setActiveTab('archive')} />
        <FeatureCard IconComp={CalIcon} title="Happening" desc="Events, hackathons, and webinars at the university." cta="View Events" onClick={() => setActiveTab('happening')} />
        <FeatureCard IconComp={UploadIcon} title="Contribute" desc="Upload resources and help the community grow." cta="Contribute Now" onClick={() => setActiveTab('contribute')} />
      </div>

      {/* ── BOTTOM 3-COL ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: "18px" }}>

        {/* Top Contributors — one dark card for visual contrast */}
        <div style={{ borderRadius: "16px", background: "#1f1209", padding: "24px", boxShadow: "0 6px 24px rgba(31,18,9,0.2)", border: "1px solid rgba(200,134,26,0.15)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#fef3dc", display: "flex", alignItems: "center", gap: "7px" }}>
              <TrophyIcon s={16} c="#c8861a" /> Top Contributors
            </h3>
            <button onClick={() => setActiveTab('leaderboard')} style={{ background: "rgba(200,134,26,0.12)", border: "1px solid rgba(200,134,26,0.25)", color: "#c8861a", fontSize: "0.73rem", fontWeight: 700, cursor: "pointer", borderRadius: "20px", padding: "4px 12px", fontFamily: "'Inter', sans-serif" }}>View All</button>
          </div>
          {[
            { name: "Riya Sharma", dept: "CSE • Sem 7", pts: "2,450", medal: "🥇" },
            { name: "Rahul Verma", dept: "IT • Sem 5", pts: "2,140", medal: "🥈" },
            { name: "Aman Verma", dept: "CSE • Sem 5", pts: "1,820", medal: "🥉" },
          ].map((u, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: i < 2 ? "14px" : 0, paddingBottom: i < 2 ? "14px" : 0, borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "1rem" }}>{u.medal}</span>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #d97706, #92400e)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "#fff", fontWeight: 800, fontSize: "0.78rem" }}>{u.name.charAt(0)}</span>
                </div>
                <div>
                  <div style={{ fontSize: "0.86rem", fontWeight: 600, color: "#fef3dc" }}>{u.name}</div>
                  <div style={{ fontSize: "0.68rem", color: "rgba(254,243,220,0.45)" }}>{u.dept}</div>
                </div>
              </div>
              <div style={{ background: "rgba(200,134,26,0.15)", borderRadius: "8px", padding: "4px 10px", fontSize: "0.8rem", fontWeight: 700, color: "#fbbf24" }}>{u.pts} pts</div>
            </div>
          ))}
        </div>

        {/* Active Discussions */}
        <Card style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#1f1209", display: "flex", alignItems: "center", gap: "7px" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c8861a" strokeWidth="2"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 01-7 7 7 7 0 01-7-7c0-1.53.4-2.973 1.1-4.22L8.5 14.5z"/></svg>
              Active Discussions
            </h3>
            <button onClick={() => setActiveTab('queries')} style={{ background: "none", border: "none", color: "#c8861a", fontSize: "0.73rem", fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>View All</button>
          </div>
          {[
            { q: "How to prepare for DBMS end semester?", by: "Priyanshu", ago: "2h", tag: "DBMS" },
            { q: "What are important topics in OS Unit 3?", by: "Mehak", ago: "4h", tag: "OS" },
            { q: "Need help understanding CNN architecture.", by: "Arjun", ago: "6h", tag: "AI/ML" },
          ].map((d, i) => (
            <div key={i} style={{ paddingBottom: i < 2 ? "14px" : 0, marginBottom: i < 2 ? "14px" : 0, borderBottom: i < 2 ? "1px solid #f5efeb" : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "5px" }}>
                <span style={{ fontSize: "0.86rem", fontWeight: 600, color: "#1f1209", lineHeight: 1.45, flex: 1 }}>{d.q}</span>
                <span style={{ fontSize: "0.65rem", padding: "2px 9px", background: "#fef3dc", color: "#c8861a", borderRadius: "10px", fontWeight: 700, border: "1px solid #e8c96a", whiteSpace: "nowrap" }}>{d.tag}</span>
              </div>
              <span style={{ fontSize: "0.7rem", color: "#8b6a3e" }}>Asked by <b style={{ color: "#5c4021" }}>{d.by}</b> · {d.ago} ago</span>
            </div>
          ))}
        </Card>

        {/* Events + CTA stacked */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <Card style={{ padding: "24px", flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#1f1209", display: "flex", alignItems: "center", gap: "7px" }}>
                <CalIcon s={16} /> Upcoming Events
              </h3>
              <button onClick={() => setActiveTab('happening')} style={{ background: "none", border: "none", color: "#c8861a", fontSize: "0.73rem", fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>View All</button>
            </div>
            {[
              { month: "MAY", day: "25", title: "HackVerse 2024", desc: "Hackathon • Main Auditorium", n: 120 },
              { month: "MAY", day: "28", title: "AI & ML Workshop", desc: "Workshop • Lab 3, Block C", n: 85 },
              { month: "JUN", day: "02", title: "Tech Talk: Future of Dev", desc: "Seminar Hall", n: 60 },
            ].map((ev, i) => (
              <div key={i} style={{ display: "flex", gap: "13px", alignItems: "center", marginBottom: i < 2 ? "14px" : 0, paddingBottom: i < 2 ? "14px" : 0, borderBottom: i < 2 ? "1px solid #f5efeb" : "none" }}>
                <div style={{ width: 44, height: 44, borderRadius: "10px", background: "#fef3dc", border: "1px solid #e8c96a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: "0.5rem", fontWeight: 800, color: "#c8861a", textTransform: "uppercase" }}>{ev.month}</span>
                  <span style={{ fontSize: "1.1rem", fontWeight: 900, color: "#1f1209", lineHeight: 1 }}>{ev.day}</span>
                </div>
                <div>
                  <div style={{ fontSize: "0.87rem", fontWeight: 700, color: "#1f1209" }}>{ev.title}</div>
                  <div style={{ fontSize: "0.7rem", color: "#8b6a3e" }}>{ev.desc}</div>
                  <div style={{ fontSize: "0.67rem", color: "#c8861a", fontWeight: 700, marginTop: "1px" }}>{ev.n} Interested</div>
                </div>
              </div>
            ))}
          </Card>

          {/* CTA strip */}
          <div style={{ borderRadius: "14px", padding: "20px 22px", background: "linear-gradient(135deg, #c8861a 0%, #92400e 100%)", boxShadow: "0 6px 20px rgba(200,134,26,0.3)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "#fff", marginBottom: "4px" }}>Your contribution creates impact!</div>
            <div style={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.8)", marginBottom: "14px", lineHeight: 1.55 }}>Share resources, help others and earn recognition.</div>
            <button onClick={() => setActiveTab('contribute')} style={{
              background: "rgba(255,255,255,0.9)", color: "#c8861a", border: "none", borderRadius: "8px",
              padding: "8px 16px", fontSize: "0.8rem", fontWeight: 800, cursor: "pointer",
              display: "flex", alignItems: "center", gap: "5px", fontFamily: "'Inter', sans-serif",
            }}>
              Start Contributing <Arrow s={13} />
            </button>
          </div>
        </div>

      </div>

      {/* ── TRUST BADGES ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(195px, 1fr))", gap: "12px" }}>
        {[
          { icon: "✓", title: "Verified Resources", desc: "All resources reviewed by community experts." },
          { icon: "🤝", title: "Safe & Supportive", desc: "A respectful space to learn and grow together." },
          { icon: "📚", title: "Knowledge for Everyone", desc: "Open access to quality education and resources." },
          { icon: "✦", title: "Make a Difference", desc: "Your small contribution can help thousands." },
        ].map((b, i) => (
          <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start", padding: "14px 16px", background: "#fffbf3", borderRadius: "12px", border: "1px solid #ede5d4" }}>
            <div style={{ width: 34, height: 34, borderRadius: "9px", background: "#fef3dc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem", flexShrink: 0 }}>{b.icon}</div>
            <div>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#1f1209", marginBottom: "2px" }}>{b.title}</div>
              <div style={{ fontSize: "0.72rem", color: "#8b6a3e", lineHeight: 1.5 }}>{b.desc}</div>
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
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#f8f4ee" }}>

      {/* Secondary Navbar */}
      <div style={{ position: "sticky", top: 68, zIndex: 40, width: "100%", background: "rgba(253,250,245,0.97)", backdropFilter: "blur(14px)", borderBottom: "1px solid #e9dcc8" }}>
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
      <div style={{ maxWidth: 1280, margin: "0 auto", width: "100%", padding: "28px 24px", flex: 1, boxSizing: "border-box" }}>
        {activeTab === "home"        && <HomeTab setActiveTab={updateTab} />}
        {activeTab === "leaderboard" && <LeaderboardComponent />}
        {activeTab === "queries"     && <PlaceholderTab title="Queries" desc="Ask questions and get answers from fellow students and admins." IconComp={QueriesIcon} />}
        {activeTab === "archive"     && <PlaceholderTab title="Archive" desc="Browse all indexed resources, organized by course and category." IconComp={ArchiveIcon} />}
        {activeTab === "happening"   && <PlaceholderTab title="Happening" desc="Hackathons, webinars, workshops — never miss a campus event again." IconComp={CalIcon} />}
        {activeTab === "contribute"  && <ContributePage />}
      </div>
    </div>
  );
}
