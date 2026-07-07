import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import campusBanner from "../assets/community-banner.jpg";
import LeaderboardComponent from "./LeaderboardComponent";
import ContributePage from "./ContributePage";
import QueriesTab from "./QueriesTab";
import ArchiveTab from "./ArchiveTab";
import HappeningTab from "./HappeningTab";
import { queriesAPI, eventsAPI, leaderboardAPI } from "../services/api";

/* ─── SVG Icon Components ───────────────────────────────────── */
const TrophyIcon = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="36" height="36" rx="10" fill="#FFF3CC"/>
    <path d="M18 23v3m-4 1h8M11 9h2m10 0h2M13 9v7a5 5 0 0010 0V9H13z" stroke="#c8861a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M11 9c0 3 1 5 2 6M25 9c0 3-1 5-2 6" stroke="#c8861a" strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="18" cy="14" r="2" fill="#c8861a" opacity="0.4"/>
  </svg>
);
const QueriesIcon = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="36" height="36" rx="10" fill="#EDE9FE"/>
    <path d="M10 13a2 2 0 012-2h10a2 2 0 012 2v5a2 2 0 01-2 2h-2l-3 3v-3h-5a2 2 0 01-2-2v-5z" stroke="#7c3aed" strokeWidth="1.8" strokeLinejoin="round"/>
    <path d="M14 22v1a2 2 0 002 2h6l3 2v-2a2 2 0 002-2v-4a2 2 0 00-2-2h-1" stroke="#7c3aed" strokeWidth="1.8" strokeLinejoin="round"/>
    <circle cx="14" cy="15.5" r="1" fill="#7c3aed"/>
    <circle cx="18" cy="15.5" r="1" fill="#7c3aed"/>
    <circle cx="22" cy="15.5" r="1" fill="#7c3aed"/>
  </svg>
);
const ArchiveIcon = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="36" height="36" rx="10" fill="#D1FAE5"/>
    <path d="M10 12h16v2H10zM11 14h14v10a1 1 0 01-1 1H12a1 1 0 01-1-1V14z" stroke="#059669" strokeWidth="1.8" strokeLinejoin="round"/>
    <path d="M16 18h4" stroke="#059669" strokeWidth="1.8" strokeLinecap="round"/>
    <rect x="14" y="10" width="8" height="2" rx="1" fill="#059669" opacity="0.4"/>
  </svg>
);
const HappeningIcon = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="36" height="36" rx="10" fill="#FEE2E2"/>
    <rect x="10" y="12" width="16" height="14" rx="2" stroke="#dc2626" strokeWidth="1.8"/>
    <path d="M10 16h16M14 10v4M22 10v4" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round"/>
    <rect x="14" y="19" width="3" height="3" rx="0.5" fill="#dc2626" opacity="0.5"/>
    <rect x="19" y="19" width="3" height="3" rx="0.5" fill="#dc2626" opacity="0.5"/>
  </svg>
);
const ContributeIcon = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="36" height="36" rx="10" fill="#FCE7F3"/>
    <path d="M18 22v-8M15 17l3-3 3 3" stroke="#db2777" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M13 24h10" stroke="#db2777" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M22 13a4 4 0 012 3.5c0 .8-.2 1.5-.5 2.1" stroke="#db2777" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
    <path d="M14 13a4 4 0 00-2 3.5c0 .8.2 1.5.5 2.1" stroke="#db2777" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
  </svg>
);

/* Stat icons */
const PeopleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c8861a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
  </svg>
);
const DocIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c8861a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/>
  </svg>
);
const ChatIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c8861a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
  </svg>
);
const StarIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c8861a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
  </svg>
);
const ArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/>
  </svg>
);
const FireIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 01-7 7 7 7 0 01-7-7c0-1.53.4-2.973 1.1-4.22L8.5 14.5z"/>
  </svg>
);
const CalIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c8861a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

/* ─── Placeholder Tabs ──────────────────────────────────────── */
// (Removed PlaceholderTab since we use real components now)

/* ─── Feature Card ──────────────────────────────────────────── */
function FeatureCard({ IconComp, title, description, buttonText, onClick, accentColor, bgColor }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{
        background: "#fff", borderRadius: "16px", padding: "28px 24px",
        display: "flex", flexDirection: "column", gap: "10px",
        boxShadow: hovered ? "0 12px 32px rgba(0,0,0,0.10)" : "0 2px 10px rgba(0,0,0,0.05)",
        border: `1px solid ${hovered ? accentColor + "44" : "#f0e6d2"}`,
        transition: "all 0.22s ease", cursor: "pointer",
        transform: hovered ? "translateY(-5px)" : "translateY(0)",
      }}>
      <IconComp />
      <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#1f1209", margin: "8px 0 0 0" }}>{title}</h3>
      <p style={{ fontSize: "0.82rem", color: "#6b4d1f", margin: 0, flex: 1, lineHeight: 1.6 }}>{description}</p>
      <button onClick={e => { e.stopPropagation(); onClick(); }} style={{
        marginTop: "12px", background: "transparent", border: "none",
        color: accentColor, fontWeight: 700, fontSize: "0.83rem",
        display: "flex", alignItems: "center", gap: "5px",
        padding: 0, cursor: "pointer", fontFamily: "'Inter', sans-serif",
      }}>
        {buttonText} <ArrowRight />
      </button>
    </div>
  );
}

/* ─── Stat Card ─────────────────────────────────────────────── */
function StatCard({ IconComp, value, label, trend }) {
  return (
    <div style={{
      background: "#fff", borderRadius: "14px", padding: "20px 24px",
      display: "flex", alignItems: "center", gap: "16px",
      boxShadow: "0 2px 8px rgba(160,110,40,0.06)", border: "1px solid #f0e6d2",
    }}>
      <div style={{ width: 52, height: 52, borderRadius: "14px", background: "#FFF8EC", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <IconComp />
      </div>
      <div>
        <div style={{ fontSize: "1.55rem", fontWeight: 800, color: "#1f1209", fontFamily: "'Playfair Display', serif" }}>{value}</div>
        <div style={{ fontSize: "0.82rem", color: "#6b4d1f", fontWeight: 500 }}>{label}</div>
        {trend && <div style={{ fontSize: "0.72rem", color: "#10b981", marginTop: "2px", fontWeight: 600 }}>↑ {trend}</div>}
      </div>
    </div>
  );
}

/* ─── Home Tab ──────────────────────────────────────────────── */
function HomeTab({ setActiveTab }) {
  const [topContributors, setTopContributors] = useState([]);
  const [activeDiscussions, setActiveDiscussions] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const [ldbRes, qRes, evRes] = await Promise.all([
          leaderboardAPI.getLeaderboard('all_time').catch(()=>({data:{data:[]}})),
          queriesAPI.getQueries().catch(()=>({data:{data:[]}})),
          eventsAPI.getEvents().catch(()=>({data:{data:[]}}))
        ]);

        if (ldbRes.data?.data) {
          const formatted = ldbRes.data.data.slice(0, 3).map(u => ({
            name: u.userId?.name || 'Anonymous',
            dept: `${u.userId?.course || 'Student'}`,
            pts: u.totalPoints,
            color: "#c8861a"
          }));
          setTopContributors(formatted);
        }

        if (qRes.data?.data) {
          const sorted = qRes.data.data.sort((a, b) => b.answers?.length - a.answers?.length).slice(0, 3);
          const formatted = sorted.map(q => ({
            q: q.title,
            by: q.author?.name || 'Anonymous',
            ago: new Date(q.createdAt).toLocaleDateString(),
            answers: q.answers?.length || 0,
            tag: q.tags?.[0] || 'General',
            tagColor: "#7c3aed", tagBg: "#EDE9FE"
          }));
          setActiveDiscussions(formatted);
        }

        if (evRes.data?.data) {
          const formatted = evRes.data.data.slice(0, 3).map(ev => {
            const dateObj = new Date(ev.date);
            return {
              month: dateObj.toLocaleString('default', { month: 'short' }).toUpperCase(),
              day: dateObj.getDate(),
              title: ev.title,
              desc: `${ev.type} • ${ev.location}`,
              interested: ev.interestedUsers?.length || 0,
              color: "#c8861a"
            };
          });
          setUpcomingEvents(formatted);
        }
      } catch (err) {
        console.error("Error fetching home data", err);
      }
    };
    fetchHomeData();
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px", paddingBottom: "64px" }}>

      {/* ── HERO BANNER ── */}
      <div style={{
        borderRadius: "20px", overflow: "hidden", position: "relative",
        background: "#fff", boxShadow: "0 4px 24px rgba(160,110,40,0.08)",
        border: "1px solid #f0e6d2", display: "flex", minHeight: "280px",
      }}>
        {/* Left Text Content */}
        <div style={{ flex: "0 0 52%", padding: "40px 40px", display: "flex", flexDirection: "column", justifyContent: "center", gap: "16px", zIndex: 1 }}>
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#c8861a", letterSpacing: "0.12em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#c8861a"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
            Community
          </span>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)", fontWeight: 800, color: "#1f1209", lineHeight: 1.15, margin: 0 }}>
            Together. Stronger.<br/><span style={{ color: "#c8861a" }}>Smarter.</span>
          </h1>
          <p style={{ fontSize: "0.9rem", color: "#6b4d1f", lineHeight: 1.65, margin: 0 }}>
            A community built to learn, share and grow together.<br />Explore. Contribute. Make an impact.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "20px", marginTop: "8px" }}>
            <button
              onClick={() => setActiveTab('queries')}
              style={{
                background: "#c8861a", color: "#fff", border: "none", borderRadius: "10px",
                padding: "12px 22px", fontSize: "0.88rem", fontWeight: 700, cursor: "pointer",
                boxShadow: "0 4px 14px rgba(200,134,26,0.32)", display: "flex", alignItems: "center", gap: "6px",
                fontFamily: "'Inter', sans-serif", transition: "all 0.18s"
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#b47817"}
              onMouseLeave={e => e.currentTarget.style.background = "#c8861a"}
            >
              Explore Community <ArrowRight />
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ display: "flex" }}>
                {["#c8861a","#b45309","#92400e"].map((c,i) => (
                  <div key={i} style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: "2px solid #fff", marginLeft: i > 0 ? "-8px" : 0, zIndex: 3-i }} />
                ))}
              </div>
              <div>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#1f1209" }}>2.5K+</div>
                <div style={{ fontSize: "0.7rem", color: "#8b6a3e" }}>Active Members</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Banner Image */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <img src={campusBanner} alt="Community" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }} />
          {/* Fade Left */}
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "80px", background: "linear-gradient(to right, #fff, transparent)", zIndex: 1 }} />
          {/* Quote box */}
          <div style={{ position: "absolute", top: "50%", right: 24, transform: "translateY(-50%)", zIndex: 2, background: "rgba(255,255,255,0.95)", borderRadius: "14px", padding: "16px 20px", maxWidth: "200px", backdropFilter: "blur(8px)", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
            <div style={{ fontSize: "1.8rem", color: "#c8861a", lineHeight: 1, marginBottom: "8px" }}>"</div>
            <p style={{ fontSize: "0.78rem", fontStyle: "italic", color: "#3d2a0e", margin: "0 0 8px 0", lineHeight: 1.5 }}>
              The best way to find yourself is to lose yourself in the service of others.
            </p>
            <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "#c8861a", margin: 0 }}>— Mahatma Gandhi</p>
          </div>
        </div>
      </div>

      {/* ── STATS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
        <StatCard IconComp={PeopleIcon} value="2,543" label="Active Members" trend="12% this week" />
        <StatCard IconComp={DocIcon} value="18.9K" label="Resources" trend="18% this week" />
        <StatCard IconComp={ChatIcon} value="1,284" label="Queries Solved" trend="20% this week" />
        <StatCard IconComp={TrophyIcon} value="856" label="Top Contributors" trend="15% this week" />
        <StatCard IconComp={StarIcon} value="4.8/5" label="Community Rating" />
      </div>


      {/* ── BOTTOM 3-COL GRID ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: "20px" }}>

        {/* Top Contributors */}
        <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", border: "1px solid #f0e6d2", boxShadow: "0 2px 8px rgba(160,110,40,0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#1f1209", display: "flex", alignItems: "center", gap: "6px" }}>
              <TrophyIcon /> Top Contributors
            </h3>
            <button onClick={() => setActiveTab('leaderboard')} style={{ background: "none", border: "none", color: "#c8861a", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}>View All</button>
          </div>
          {topContributors.length > 0 ? topContributors.map((u, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", justifyContent: "space-between", marginBottom: i < 2 ? "14px" : 0, paddingBottom: i < 2 ? "14px" : 0, borderBottom: i < 2 ? "1px solid #f5efeb" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: u.color + "22", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: "0.7rem", fontWeight: 800, color: u.color }}>{i + 1}</span>
                </div>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #d97706, #b45309)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "#fff", fontWeight: 700, fontSize: "0.8rem" }}>{u.name.charAt(0)}</span>
                </div>
                <div>
                  <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#1f1209" }}>{u.name}</div>
                  <div style={{ fontSize: "0.72rem", color: "#8b5e0a" }}>{u.dept}</div>
                </div>
              </div>
              <div style={{ fontSize: "0.88rem", fontWeight: 700, color: u.color }}>{u.pts} pts</div>
            </div>
          )) : <div style={{ fontSize: "0.8rem", color: "#8b5e0a" }}>No data yet.</div>}
        </div>

        {/* Active Discussions */}
        <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", border: "1px solid #f0e6d2", boxShadow: "0 2px 8px rgba(160,110,40,0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#1f1209", display: "flex", alignItems: "center", gap: "6px" }}>
              <FireIcon /> Active Discussions
            </h3>
            <button onClick={() => setActiveTab('queries')} style={{ background: "none", border: "none", color: "#c8861a", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}>View All</button>
          </div>
          {activeDiscussions.length > 0 ? activeDiscussions.map((d, i) => (
            <div key={i} style={{ paddingBottom: i < 2 ? "14px" : 0, marginBottom: i < 2 ? "14px" : 0, borderBottom: i < 2 ? "1px solid #f5efeb" : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#1f1209", flex: 1, paddingRight: "10px", lineHeight: 1.4 }}>{d.q}</div>
                <span style={{ fontSize: "0.68rem", padding: "3px 8px", background: d.tagBg, color: d.tagColor, borderRadius: "12px", fontWeight: 700, whiteSpace: "nowrap" }}>{d.tag}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "0.72rem", color: "#8b5e0a" }}>Asked by <b>{d.by}</b> • {d.ago}</span>
                <span style={{ fontSize: "0.7rem", color: "#8b5e0a", display: "flex", alignItems: "center", gap: "3px" }}>
                  <ChatIcon style={{ width: 10 }} /> {d.answers} answers
                </span>
              </div>
            </div>
          )) : <div style={{ fontSize: "0.8rem", color: "#8b5e0a" }}>No active discussions yet.</div>}
        </div>

        {/* Upcoming Events + CTA */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", border: "1px solid #f0e6d2", boxShadow: "0 2px 8px rgba(160,110,40,0.04)", flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#1f1209", display: "flex", alignItems: "center", gap: "6px" }}>
                <CalIcon /> Upcoming Events
              </h3>
              <button onClick={() => setActiveTab('happening')} style={{ background: "none", border: "none", color: "#c8861a", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}>View All</button>
            </div>
            {upcomingEvents.length > 0 ? upcomingEvents.map((ev, i) => (
              <div key={i} style={{ display: "flex", gap: "14px", alignItems: "center", marginBottom: i < 2 ? "14px" : 0, paddingBottom: i < 2 ? "14px" : 0, borderBottom: i < 2 ? "1px solid #f5efeb" : "none" }}>
                <div style={{ width: 44, height: 44, borderRadius: "10px", background: ev.color + "1A", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: "0.55rem", fontWeight: 700, color: ev.color, textTransform: "uppercase" }}>{ev.month}</span>
                  <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1f1209", lineHeight: 1 }}>{ev.day}</span>
                </div>
                <div>
                  <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#1f1209" }}>{ev.title}</div>
                  <div style={{ fontSize: "0.72rem", color: "#8b5e0a" }}>{ev.desc}</div>
                  <div style={{ fontSize: "0.68rem", color: ev.color, fontWeight: 600 }}>{ev.interested} Interested</div>
                </div>
              </div>
            )) : <div style={{ fontSize: "0.8rem", color: "#8b5e0a" }}>No upcoming events scheduled.</div>}
          </div>

          {/* CTA Card */}
          <div style={{ background: "linear-gradient(135deg, #c8861a, #92400e)", borderRadius: "16px", padding: "20px 24px", color: "#fff" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "6px" }}>Your contribution creates impact!</div>
            <div style={{ fontSize: "0.75rem", opacity: 0.85, marginBottom: "14px", lineHeight: 1.5 }}>Share resources, help others and earn recognition.</div>
            <button
              onClick={() => setActiveTab('contribute')}
              style={{
                background: "#fff", color: "#c8861a", border: "none", borderRadius: "8px",
                padding: "8px 16px", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", gap: "5px", fontFamily: "'Inter', sans-serif"
              }}>
              Start Contributing <ArrowRight />
            </button>
          </div>
        </div>

      </div>

      {/* ── FEATURE CARDS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "16px" }}>
        <FeatureCard IconComp={TrophyIcon} title="Leaderboard" description="See top contributors and rising stars in the community." buttonText="View Leaderboard" onClick={() => setActiveTab('leaderboard')} accentColor="#c8861a" bgColor="#FFF3CC" />
        <FeatureCard IconComp={QueriesIcon} title="Queries" description="Ask questions, share knowledge and get help quickly." buttonText="Go to Queries" onClick={() => setActiveTab('queries')} accentColor="#7c3aed" bgColor="#EDE9FE" />
        <FeatureCard IconComp={ArchiveIcon} title="Archive" description="Explore all uploaded resources with proper categories." buttonText="Explore Archive" onClick={() => setActiveTab('archive')} accentColor="#059669" bgColor="#D1FAE5" />
        <FeatureCard IconComp={HappeningIcon} title="Happening" description="Stay updated with all events and activities in the university." buttonText="View Events" onClick={() => setActiveTab('happening')} accentColor="#dc2626" bgColor="#FEE2E2" />
        <FeatureCard IconComp={ContributeIcon} title="Contribute" description="Upload resources and help make our community stronger." buttonText="Contribute Now" onClick={() => setActiveTab('contribute')} accentColor="#db2777" bgColor="#FCE7F3" />
      </div>

      {/* ── TRUST BADGES ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", paddingTop: "8px" }}>
        {[
          { icon: "✓", title: "Verified Resources", desc: "All resources are reviewed by our community experts." },
          { icon: "🤝", title: "Safe & Supportive", desc: "A respectful space to learn and grow together." },
          { icon: "📚", title: "Knowledge for Everyone", desc: "Open access to quality education and resources." },
          { icon: "✦", title: "Make a Difference", desc: "Your small contribution can help thousands." },
        ].map((b, i) => (
          <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start", padding: "16px", background: "#fff", borderRadius: "12px", border: "1px solid #f0e6d2" }}>
            <div style={{ width: 36, height: 36, borderRadius: "10px", background: "#fef3dc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0 }}>{b.icon}</div>
            <div>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1f1209", marginBottom: "2px" }}>{b.title}</div>
              <div style={{ fontSize: "0.75rem", color: "#8b6a3e", lineHeight: 1.4 }}>{b.desc}</div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}

/* ─── Main Community Page ───────────────────────────────────── */
export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState("home");
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const tab = location.hash.replace("#", "");
      if (["home","leaderboard","queries","archive","happening","contribute"].includes(tab)) setActiveTab(tab);
    }
  }, [location.hash]);

  const updateTab = (tab) => {
    setActiveTab(tab);
    window.location.hash = tab;
  };

  const tabs = [
    { id: "home",        label: "Home",        Icon: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg> },
    { id: "leaderboard", label: "Leaderboard", Icon: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M8 21V11M16 21V3M12 21v-5"/></svg> },
    { id: "queries",     label: "Queries",     Icon: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> },
    { id: "archive",     label: "Archive",     Icon: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="21,8 21,21 3,21 3,8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg> },
    { id: "happening",   label: "Happening",   Icon: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
    { id: "contribute",  label: "Contribute",  Icon: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="16,16 12,12 8,16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg> },
  ];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#f8f4ee", position: "relative" }}>
      {/* Fixed campus background for entire Community section */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage: `url(${campusBanner})`,
        backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat",
        opacity: 0.06,
      }} />

      <div style={{
        position: "sticky", top: 68, zIndex: 40, width: "100%",
        background: "rgba(253,250,245,0.97)", backdropFilter: "blur(16px)",
        borderBottom: "1px solid #e9dcc8",
      }}>
        <div style={{
          maxWidth: 1280, margin: "0 auto", padding: "0 24px",
          display: "flex", alignItems: "stretch", gap: "0",
          overflowX: "auto", scrollbarWidth: "none", height: "48px",
        }}>
          {tabs.map(t => {
            const active = activeTab === t.id;
            return (
              <button key={t.id} onClick={() => updateTab(t.id)} style={{
                padding: "0 18px", border: "none", background: "transparent",
                color: active ? "#c8861a" : "#6b4d1f",
                fontWeight: active ? 700 : 500, fontSize: "0.83rem",
                cursor: "pointer", whiteSpace: "nowrap", display: "flex",
                alignItems: "center", gap: "7px", borderBottom: active ? "2px solid #c8861a" : "2px solid transparent",
                transition: "all 0.18s", fontFamily: "'Inter', sans-serif",
                marginBottom: "-1px",
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = "#8b5e0a"; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = "#6b4d1f"; }}
              >
                <t.Icon /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── TAB CONTENT ── */}
      <div style={{ maxWidth: 1280, margin: "0 auto", width: "100%", padding: "28px 24px", flex: 1, boxSizing: "border-box" }}>
        {activeTab === "home"        && <HomeTab setActiveTab={updateTab} />}
        {activeTab === "leaderboard" && <LeaderboardComponent />}
        {activeTab === "queries"     && <QueriesTab />}
        {activeTab === "archive"     && <ArchiveTab />}
        {activeTab === "happening"   && <HappeningTab />}
        {activeTab === "contribute"  && <ContributePage />}
      </div>
    </div>
  );
}
