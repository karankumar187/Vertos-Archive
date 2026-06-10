import { useState } from "react";
import { Link } from "react-router-dom";
import campusSketch from "../assets/campus-sketch.png";

/* ── Data ── */
const leaderboard = [
  { rank: 1,  name: "Priya Sharma",  regNo: "12304567", points: 1840, docs: 38, avatar: "P", badge: "🥇", course: "B.Tech CSE" },
  { rank: 2,  name: "Rohit Verma",   regNo: "12298741", points: 1620, docs: 31, avatar: "R", badge: "🥈", course: "B.Tech ECE" },
  { rank: 3,  name: "Karan Kumar",   regNo: "12345678", points: 820,  docs: 14, avatar: "K", badge: "🥉", course: "B.Tech CSE AI&ML" },
  { rank: 4,  name: "Anjali Singh",  regNo: "12312890", points: 760,  docs: 13, avatar: "A", badge: null, course: "B.Tech IT" },
  { rank: 5,  name: "Dev Patel",     regNo: "12278432", points: 640,  docs: 11, avatar: "D", badge: null, course: "BCA" },
  { rank: 6,  name: "Meera Nair",    regNo: "12265109", points: 510,  docs:  9, avatar: "M", badge: null, course: "B.Tech CSE" },
  { rank: 7,  name: "Arjun Reddy",   regNo: "12309876", points: 480,  docs:  8, avatar: "A", badge: null, course: "B.Tech ME" },
  { rank: 8,  name: "Sneha Gupta",   regNo: "12341230", points: 390,  docs:  7, avatar: "S", badge: null, course: "B.Sc CS" },
  { rank: 9,  name: "Nikhil Joshi",  regNo: "12356780", points: 310,  docs:  6, avatar: "N", badge: null, course: "B.Tech CSE" },
  { rank: 10, name: "Pooja Rao",     regNo: "12367823", points: 270,  docs:  5, avatar: "P", badge: null, course: "B.Tech IT" },
];

const ME = "Karan Kumar";

const stats = [
  { label: "Total Contributors", value: "1,240+", icon: "👥" },
  { label: "Documents Shared",   value: "8,500+", icon: "📚" },
  { label: "Points Awarded",     value: "94,200", icon: "⭐" },
  { label: "Active This Month",  value: "382",    icon: "🔥" },
];

const PERIODS = ["This Month", "All Time", "This Week"];

function TopPodium({ entries }) {
  // Arrange: 2nd | 1st | 3rd
  const order = [entries[1], entries[0], entries[2]];
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
      {order.map((entry, i) => (
        <div key={entry.rank} style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
          flex: "0 0 auto",
        }}>
          {/* Avatar */}
          <div style={{ position: "relative" }}>
            <div style={{
              width: i === 1 ? "68px" : "54px",
              height: i === 1 ? "68px" : "54px",
              borderRadius: "50%",
              background: i === 1
                ? "linear-gradient(135deg, #d97706, #b45309)"
                : i === 0
                ? "linear-gradient(135deg, #94a3b8, #64748b)"
                : "linear-gradient(135deg, #c8861a, #8b5e0a)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 700,
              fontSize: i === 1 ? "1.4rem" : "1.1rem",
              fontFamily: "'Inter', sans-serif",
              boxShadow: i === 1
                ? "0 6px 20px rgba(180,83,9,0.35)"
                : "0 3px 12px rgba(0,0,0,0.15)",
              border: i === 1 ? "3px solid #fcd34d" : "3px solid rgba(255,255,255,0.5)",
            }}>{entry.avatar}</div>
            <span style={{
              position: "absolute", bottom: "-4px", right: "-4px",
              fontSize: i === 1 ? "22px" : "18px",
            }}>{entry.badge}</span>
          </div>
          {/* Name */}
          <div style={{ textAlign: "center" }}>
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: sizes[i], fontWeight: 700,
              color: "#1f1209",
            }}>{entry.name.split(" ")[0]}</p>
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "0.72rem", color: "#9a7845",
            }}>{entry.points.toLocaleString()} pts</p>
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
            <span style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.3rem", fontWeight: 700, color: "rgba(255,255,255,0.9)",
            }}>#{entry.rank}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Row({ entry, isMe }) {
  const top3 = entry.rank <= 3;
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "52px 1fr 110px 90px 90px",
      alignItems: "center",
      gap: "12px",
      padding: "14px 24px",
      background: isMe ? "#fef7e9" : "#fff",
      borderBottom: "1px solid #f0e8d8",
      borderLeft: isMe ? "3px solid #c8861a" : top3 ? "3px solid #e8c96a66" : "3px solid transparent",
      transition: "background 0.15s",
    }}
      onMouseEnter={e => { e.currentTarget.style.background = "#fdf8f0"; }}
      onMouseLeave={e => { e.currentTarget.style.background = isMe ? "#fef7e9" : "#fff"; }}
    >
      {/* Rank */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        {entry.badge
          ? <span style={{ fontSize: "22px" }}>{entry.badge}</span>
          : <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 700, color: "#9a7845" }}>#{entry.rank}</span>
        }
      </div>

      {/* Name + course */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{
          width: "38px", height: "38px", borderRadius: "50%", flexShrink: 0,
          background: top3
            ? "linear-gradient(135deg, #d97706, #b45309)"
            : "linear-gradient(135deg, #c8a87a, #9a7845)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontWeight: 700, fontSize: "0.9rem",
          fontFamily: "'Inter', sans-serif",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}>{entry.avatar}</div>
        <div>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.875rem",
            fontWeight: isMe ? 700 : 500, color: "#1f1209" }}>
            {entry.name}
            {isMe && <span style={{ marginLeft: "6px", fontSize: "0.7rem",
              color: "#c8861a", fontWeight: 600 }}>(you)</span>}
          </p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.72rem", color: "#9a7845" }}>
            {entry.regNo} · {entry.course}
          </p>
        </div>
      </div>

      {/* Docs */}
      <div style={{ textAlign: "center" }}>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.9rem", fontWeight: 600, color: "#5c4021" }}>
          {entry.docs}
        </span>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.72rem", color: "#9a7845" }}> docs</span>
      </div>

      {/* Points */}
      <div style={{ textAlign: "right" }}>
        <span style={{
          fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 700,
          color: top3 ? "#c8861a" : "#5c4021",
        }}>{entry.points.toLocaleString()}</span>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.7rem", color: "#9a7845", marginLeft: "3px" }}>pts</span>
      </div>

      {/* Trend placeholder */}
      <div style={{ textAlign: "right" }}>
        <span style={{ fontSize: "14px" }}>{entry.rank <= 3 ? "🔥" : entry.rank <= 6 ? "📈" : "➡️"}</span>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const [period, setPeriod] = useState("This Month");

  return (
    <div style={{
      background: "#faf8f4",
      minHeight: "calc(100vh - 68px)",
      padding: "48px 24px",
      position: "relative",
    }}>
      {/* Fixed Background Image */}
      <div style={{
        position: "fixed",
        inset: 0,
        backgroundImage: `url(${campusSketch})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        zIndex: 0,
        pointerEvents: "none",
      }} />
      {/* Fade overlay */}
      <div style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
        background: "linear-gradient(to bottom, #faf8f4 0%, #faf8f4 40%, rgba(250,248,244,0.85) 65%, rgba(250,248,244,0.2) 100%)",
      }}/>
      <div style={{ maxWidth: "1200px", margin: "0 auto", position: "relative", zIndex: 1 }}>

        {/* ── Header ── */}
        <div className="anim-up d1" style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            background: "#fef3dc", border: "1px solid #e8c96a",
            borderRadius: "999px", padding: "5px 16px", marginBottom: "16px",
          }}>
            <span style={{ color: "#c8861a", fontSize: "11px" }}>✦</span>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", fontWeight: 500,
              letterSpacing: "0.1em", textTransform: "uppercase", color: "#92620a" }}>Community</span>
            <span style={{ color: "#c8861a", fontSize: "11px" }}>✦</span>
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.4rem",
            fontWeight: 700, color: "#1f1209", marginBottom: "10px" }}>
            🏆 Leaderboard
          </h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.9rem",
            color: "#7a5a2a", maxWidth: "460px", margin: "0 auto", lineHeight: 1.65 }}>
            Top contributors who share knowledge and help the LPU community grow.
            Upload documents to earn points and climb the ranks.
          </p>
        </div>

        {/* ── Stat bar ── */}
        <div className="anim-up d2" style={{
          display: "flex", flexWrap: "wrap", gap: "14px",
          justifyContent: "center", marginBottom: "36px",
        }}>
          {stats.map(s => (
            <div key={s.label} style={{
              background: "#fff", border: "1px solid #e9dcc8",
              borderRadius: "12px", padding: "16px 22px",
              textAlign: "center", minWidth: "140px", flex: "1 1 130px",
              boxShadow: "0 2px 10px rgba(160,110,40,0.06)",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 18px rgba(160,110,40,0.1)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 2px 10px rgba(160,110,40,0.06)"; }}
            >
              <div style={{ fontSize: "22px", marginBottom: "4px" }}>{s.icon}</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", fontWeight: 700, color: "#c8861a" }}>{s.value}</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.72rem", color: "#8b6535", fontWeight: 500, marginTop: "2px" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Main card ── */}
        <div className="anim-up d3" style={{
          background: "#fff", border: "1px solid #e9dcc8",
          borderRadius: "16px", overflow: "hidden",
          boxShadow: "0 4px 28px rgba(160,110,40,0.1)",
        }}>
          {/* Dark header */}
          <div style={{
            background: "linear-gradient(135deg, #1f1209 0%, #3d2408 100%)",
            padding: "24px 28px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: "14px",
          }}>
            <div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.2rem",
                fontWeight: 700, color: "#f0d090", marginBottom: "4px" }}>
                Top Contributors
              </h2>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.75rem", color: "#c8a060" }}>
                June 2026 · Updated daily
              </p>
            </div>
            {/* Period toggle */}
            <div style={{ display: "flex", gap: "6px", background: "rgba(255,255,255,0.07)", borderRadius: "10px", padding: "4px" }}>
              {PERIODS.map(p => (
                <button key={p} onClick={() => setPeriod(p)} style={{
                  padding: "6px 14px",
                  background: period === p ? "rgba(200,134,26,0.85)" : "transparent",
                  border: "none", borderRadius: "7px",
                  fontFamily: "'Inter', sans-serif", fontSize: "0.78rem", fontWeight: 500,
                  color: period === p ? "#fff" : "#c8a060",
                  cursor: "pointer", transition: "all 0.18s",
                }}>{p}</button>
              ))}
            </div>
          </div>

          {/* Podium */}
          <div style={{ padding: "32px 28px 0", background: "linear-gradient(to bottom, #fdfaf5, #fff)" }}>
            <TopPodium entries={leaderboard.slice(0, 3)} />
          </div>

          {/* Column headers */}
          <div style={{
            display: "grid", gridTemplateColumns: "52px 1fr 110px 90px 90px",
            padding: "10px 24px", background: "#fdfaf5",
            borderTop: "1px solid #ede5d5", borderBottom: "1px solid #ede5d5",
          }}>
            {["#", "Contributor", "Docs", "Points", "Trend"].map((h, i) => (
              <span key={h} style={{
                fontFamily: "'Inter', sans-serif", fontSize: "0.72rem",
                fontWeight: 600, color: "#8b6535",
                letterSpacing: "0.08em", textTransform: "uppercase",
                textAlign: i === 0 ? "center" : i >= 2 ? "right" : "left",
              }}>{h}</span>
            ))}
          </div>

          {/* Rows */}
          {leaderboard.map(entry => (
            <Row key={entry.rank} entry={entry} isMe={entry.name === ME} />
          ))}

          {/* Footer CTA */}
          <div style={{
            padding: "20px 28px",
            background: "#fdfaf5",
            borderTop: "1px solid #ede5d5",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: "12px",
          }}>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.8rem", color: "#9a7845" }}>
              ✦ Upload approved docs to climb the leaderboard
            </p>
            <Link to="/upload" style={{
              padding: "8px 20px",
              background: "linear-gradient(135deg, #d97706, #b45309)",
              borderRadius: "8px", color: "#fff",
              fontFamily: "'Inter', sans-serif", fontSize: "0.82rem", fontWeight: 600,
              textDecoration: "none",
              boxShadow: "0 3px 10px rgba(180,83,9,0.22)",
            }}>+ Upload a Document</Link>
          </div>
        </div>

        {/* My ranking card */}
        <div className="anim-up d4" style={{
          marginTop: "24px",
          background: "linear-gradient(135deg, #1f1209 0%, #3d2408 100%)",
          border: "1px solid #5a3a10",
          borderRadius: "14px",
          padding: "22px 28px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: "16px",
          boxShadow: "0 4px 20px rgba(30,10,0,0.18)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{
              width: "48px", height: "48px", borderRadius: "50%",
              background: "linear-gradient(135deg, #d97706, #b45309)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 700, fontSize: "1.1rem",
              border: "2px solid #fcd34d",
            }}>K</div>
            <div>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 700, color: "#f0d090" }}>
                Your Current Ranking
              </p>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.78rem", color: "#c8a060" }}>
                Karan Kumar · 12345678
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "28px" }}>
            {[["Rank", "#3 🥉"], ["Points", "820"], ["Docs", "14"]].map(([k, v]) => (
              <div key={k} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.3rem", fontWeight: 700, color: "#f0d090" }}>{v}</div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.7rem", color: "#c8a060", letterSpacing: "0.06em", textTransform: "uppercase" }}>{k}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
