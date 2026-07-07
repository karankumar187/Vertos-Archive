import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import campusSketch from "../assets/campus-sketch.png";

// Import existing components that will now be tabs
import LeaderboardComponent from "./LeaderboardComponent";
import ContributePage from "./ContributePage";

// Mock Components for new tabs
function QueriesTab() {
  return (
    <div style={{ padding: "40px 20px", textAlign: "center" }}>
      <h2>Queries</h2>
      <p>Ask questions and share knowledge. (Coming Soon)</p>
    </div>
  );
}

function ArchiveTab() {
  return (
    <div style={{ padding: "40px 20px", textAlign: "center" }}>
      <h2>Archive</h2>
      <p>Explore all uploaded resources categorized by course. (Coming Soon)</p>
    </div>
  );
}

function HappeningTab() {
  return (
    <div style={{ padding: "40px 20px", textAlign: "center" }}>
      <h2>Happening</h2>
      <p>Stay updated with events, hackathons, and seminars. (Coming Soon)</p>
    </div>
  );
}

// Sub-components for Home Tab
function StatCard({ icon, value, label, trend, trendColor }) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: "12px",
      padding: "20px",
      display: "flex",
      alignItems: "center",
      gap: "16px",
      boxShadow: "0 2px 8px rgba(160,110,40,0.06)",
      border: "1px solid #f0e6d2",
    }}>
      <div style={{
        width: "50px", height: "50px",
        borderRadius: "50%", background: "#fef3dc",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "24px"
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#1f1209" }}>{value}</div>
        <div style={{ fontSize: "0.875rem", color: "#6b4d1f", fontWeight: 500 }}>{label}</div>
        {trend && (
          <div style={{ fontSize: "0.75rem", color: trendColor || "#10b981", marginTop: "4px", fontWeight: 600 }}>
            ↑ {trend}
          </div>
        )}
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description, buttonText, onClick, accentColor = "#c8861a" }) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: "16px",
      padding: "24px",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      boxShadow: "0 4px 12px rgba(160,110,40,0.05)",
      border: "1px solid #f0e6d2",
      transition: "transform 0.2s, box-shadow 0.2s",
      cursor: "pointer",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = "translateY(-4px)";
      e.currentTarget.style.boxShadow = "0 8px 24px rgba(160,110,40,0.12)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = "0 4px 12px rgba(160,110,40,0.05)";
    }}
    onClick={onClick}
    >
      <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>{icon}</div>
      <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1f1209", margin: 0 }}>{title}</h3>
      <p style={{ fontSize: "0.85rem", color: "#6b4d1f", margin: 0, flex: 1, lineHeight: 1.5 }}>{description}</p>
      
      <button style={{
        marginTop: "16px",
        background: "transparent",
        border: "none",
        color: accentColor,
        fontWeight: 600,
        fontSize: "0.875rem",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: 0,
        cursor: "pointer"
      }}>
        {buttonText} <span>→</span>
      </button>
    </div>
  );
}

function HomeTab({ setActiveTab }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px", paddingBottom: "48px" }}>
      {/* Hero Section */}
      <div style={{
        background: "#fff",
        borderRadius: "20px",
        padding: "40px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        boxShadow: "0 4px 16px rgba(160,110,40,0.06)",
        border: "1px solid #f0e6d2",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Background Sketch (subtle) */}
        <div style={{
          position: "absolute",
          right: "-10%",
          top: "-20%",
          width: "60%",
          height: "140%",
          backgroundImage: `url(${campusSketch})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.15,
          pointerEvents: "none",
          zIndex: 0
        }} />
        
        <div style={{ position: "relative", zIndex: 1, maxWidth: "600px" }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#c8861a", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "1.2rem" }}>👥</span> COMMUNITY
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "3rem", fontWeight: 800, color: "#1f1209", lineHeight: 1.1, margin: "0 0 16px 0" }}>
            Together. Stronger.<br/><span style={{ color: "#c8861a" }}>Smarter.</span>
          </h1>
          <p style={{ fontSize: "1rem", color: "#6b4d1f", lineHeight: 1.6, marginBottom: "32px" }}>
            A community built to learn, share and grow together. Explore. Contribute. Make an impact.
          </p>
          <button 
            onClick={() => setActiveTab('queries')}
            style={{
              background: "#c8861a", color: "#fff", border: "none", borderRadius: "8px",
              padding: "12px 24px", fontSize: "0.95rem", fontWeight: 600, cursor: "pointer",
              boxShadow: "0 4px 12px rgba(200, 134, 26, 0.3)",
              transition: "transform 0.2s, background 0.2s"
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#b47817"}
            onMouseLeave={e => e.currentTarget.style.background = "#c8861a"}
          >
            Explore Community →
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px" }}>
        <StatCard icon="👥" value="2,543" label="Active Members" trend="12% this week" />
        <StatCard icon="📄" value="18.9K" label="Resources" trend="18% this week" />
        <StatCard icon="💬" value="1,284" label="Queries Solved" trend="20% this week" />
        <StatCard icon="🏆" value="856" label="Top Contributors" trend="15% this week" />
      </div>

      {/* Feature Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
        <FeatureCard 
          icon="🏆" title="Leaderboard" description="See top contributors and rising stars." 
          buttonText="View Leaderboard" onClick={() => setActiveTab('leaderboard')} 
        />
        <FeatureCard 
          icon="💬" title="Queries" description="Ask questions, share knowledge and get help quickly." 
          buttonText="Go to Queries" onClick={() => setActiveTab('queries')} accentColor="#8b5cf6"
        />
        <FeatureCard 
          icon="🗂️" title="Archive" description="Explore all uploaded resources with proper categories." 
          buttonText="Explore Archive" onClick={() => setActiveTab('archive')} accentColor="#10b981"
        />
        <FeatureCard 
          icon="📅" title="Happening" description="Stay updated with all events and activities in the university." 
          buttonText="View Events" onClick={() => setActiveTab('happening')} accentColor="#f43f5e"
        />
        <FeatureCard 
          icon="☁️" title="Contribute" description="Upload resources and help make our community stronger." 
          buttonText="Contribute Now" onClick={() => setActiveTab('contribute')} accentColor="#ec4899"
        />
      </div>

      {/* Bottom Layout (3 columns) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
        
        {/* Top Contributors Mini */}
        <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", border: "1px solid #f0e6d2", boxShadow: "0 2px 8px rgba(160,110,40,0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#1f1209" }}>🏆 Top Contributors</h3>
            <button onClick={() => setActiveTab('leaderboard')} style={{ background: "none", border: "none", color: "#c8861a", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}>View All</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Mock Users */}
            {[
              { name: "Riya Sharma", dept: "CSE • Semester 7", pts: "2,450" },
              { name: "Rahul Verma", dept: "IT • Semester 5", pts: "2,140" },
              { name: "Aman Verma", dept: "CSE • Semester 5", pts: "1,820" },
            ].map((u, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ color: "#d4a96a", fontWeight: 700, fontSize: "0.9rem" }}>{i + 1}</span>
                  <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#f0e6d2", display: "flex", alignItems: "center", justifyItems: "center" }}>
                     <span style={{ margin: "auto", fontSize: "0.8rem", color: "#8b5e0a", fontWeight: "bold" }}>{u.name.charAt(0)}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#1f1209" }}>{u.name}</div>
                    <div style={{ fontSize: "0.75rem", color: "#8b5e0a" }}>{u.dept}</div>
                  </div>
                </div>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#c8861a" }}>{u.pts} pts</div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Discussions Mini */}
        <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", border: "1px solid #f0e6d2", boxShadow: "0 2px 8px rgba(160,110,40,0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#1f1209" }}>🔥 Active Discussions</h3>
            <button onClick={() => setActiveTab('queries')} style={{ background: "none", border: "none", color: "#c8861a", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}>View All</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {[
              { q: "How to prepare for DBMS end semester?", tag: "DBMS" },
              { q: "What are the important topics in OS Unit 3?", tag: "OS" },
              { q: "Need help in understanding CNN architecture.", tag: "AI/ML" }
            ].map((d, i) => (
              <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start", justifyContent: "space-between", paddingBottom: "12px", borderBottom: i < 2 ? "1px solid #f5efeb" : "none" }}>
                <div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#1f1209", marginBottom: "4px" }}>{d.q}</div>
                  <div style={{ fontSize: "0.75rem", color: "#8b5e0a" }}>Asked by Student • {i+2}h ago</div>
                </div>
                <span style={{ fontSize: "0.7rem", padding: "2px 8px", background: "#fef3dc", color: "#c8861a", borderRadius: "12px", fontWeight: 600 }}>{d.tag}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Events Mini */}
        <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", border: "1px solid #f0e6d2", boxShadow: "0 2px 8px rgba(160,110,40,0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#1f1209" }}>📅 Upcoming Events</h3>
            <button onClick={() => setActiveTab('happening')} style={{ background: "none", border: "none", color: "#c8861a", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}>View All</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {[
              { date: "MAY 25", title: "HackVerse 2024", desc: "Hackathon • Main Auditorium" },
              { date: "MAY 28", title: "AI & ML Workshop", desc: "Workshop • Lab 3, Block C" },
              { date: "JUN 02", title: "Tech Talk: Future of Dev", desc: "Seminar • Seminar Hall" }
            ].map((e, i) => (
              <div key={i} style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "45px" }}>
                  <span style={{ fontSize: "0.7rem", fontWeight: 700, color: i === 2 ? "#10b981" : "#c8861a" }}>{e.date.split(" ")[0]}</span>
                  <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1f1209" }}>{e.date.split(" ")[1]}</span>
                </div>
                <div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#1f1209", marginBottom: "2px" }}>{e.title}</div>
                  <div style={{ fontSize: "0.75rem", color: "#8b5e0a" }}>{e.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState("home");
  const location = useLocation();

  // Handle URL hash routing if user manually navigates to /community#contribute etc.
  useEffect(() => {
    if (location.hash) {
      const tab = location.hash.replace("#", "");
      if (["home", "leaderboard", "queries", "archive", "happening", "contribute"].includes(tab)) {
        setActiveTab(tab);
      }
    }
  }, [location.hash]);

  const updateTab = (tab) => {
    setActiveTab(tab);
    window.location.hash = tab;
  };

  const tabs = [
    { id: "home", label: "🏠 Home" },
    { id: "leaderboard", label: "🏆 Leaderboard" },
    { id: "queries", label: "💬 Queries" },
    { id: "archive", label: "🗂️ Archive" },
    { id: "happening", label: "📅 Happening" },
    { id: "contribute", label: "☁️ Contribute" },
  ];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#f8f4ee" }}>
      
      {/* Secondary Navbar (Double Navbar Design) */}
      <div style={{ 
        position: "sticky", top: 68, zIndex: 40, width: "100%", 
        background: "rgba(253,250,245,0.96)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid #e9dcc8", boxShadow: "0 1px 4px rgba(160,110,40,0.04)"
      }}>
        <div style={{ 
          maxWidth: 1280, margin: "0 auto", padding: "12px 24px",
          display: "flex", alignItems: "center", gap: "12px",
          overflowX: "auto", scrollbarWidth: "none"
        }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => updateTab(t.id)}
              style={{
                padding: "8px 16px", borderRadius: "20px", border: "none",
                background: activeTab === t.id ? "#fef3dc" : "transparent",
                color: activeTab === t.id ? "#92620a" : "#6b4d1f",
                fontWeight: activeTab === t.id ? 700 : 500,
                fontSize: "0.85rem", cursor: "pointer", whiteSpace: "nowrap",
                transition: "all 0.2s",
                display: "flex", alignItems: "center", gap: "6px"
              }}
              onMouseEnter={e => { if (activeTab !== t.id) { e.currentTarget.style.background = "#fdf5e8"; } }}
              onMouseLeave={e => { if (activeTab !== t.id) { e.currentTarget.style.background = "transparent"; } }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ maxWidth: 1280, margin: "0 auto", width: "100%", padding: "24px", flex: 1 }}>
        {activeTab === "home" && <HomeTab setActiveTab={updateTab} />}
        {activeTab === "leaderboard" && <LeaderboardComponent />}
        {activeTab === "queries" && <QueriesTab />}
        {activeTab === "archive" && <ArchiveTab />}
        {activeTab === "happening" && <HappeningTab />}
        {activeTab === "contribute" && <ContributePage />}
      </div>
      
    </div>
  );
}
