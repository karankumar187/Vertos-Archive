import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import campusSketch from "../assets/campus-sketch.png";
import { analyticsAPI } from "../services/api";

/* ─── Data ──────────────────────────────────────────────────── */
const categories = [
  { id: "notes",           label: "Notes" },
  { id: "syllabus",        label: "Syllabus" },
  { id: "previous-papers", label: "Previous Papers" },
  { id: "university-info", label: "University Info" },
];

/* ─── Component ─────────────────────────────────────────────── */
export default function Hero() {
  const [query, setQuery]               = useState("");
  const [selected, setSelected]         = useState(null); // selected category
  const navigate                        = useNavigate();
  const [suggestions, setSuggestions]   = useState([
    "What are important DBMS topics?",
    "Show previous year ETP papers",
    "Hostel rules and regulations",
    "What scholarships are available?",
    "Upcoming events at LPU",
    "How to join a student club?",
  ]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const res = await analyticsAPI.getHomepageData();
        if (res.data?.success && res.data.data?.suggestedQuestions?.length > 0) {
          setSuggestions(res.data.data.suggestedQuestions);
        }
      } catch (err) {
        console.error("Failed to fetch homepage suggestions:", err);
      }
    };
    fetchSuggestions();
  }, []);

  const handleAsk = () => {
    const q = query.trim();
    if (!q && !selected) return;
    // Build URL: include category if one is selected, include query if typed
    const params = new URLSearchParams();
    if (q)        params.set("q", q);
    if (selected) params.set("category", selected.label);
    navigate(`/chat?${params.toString()}`);
  };

  return (
    <section
      style={{
        minHeight: "calc(100vh - 72px)",
        background: "#faf8f4",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
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

      {/* ── Content column ── */}
      <div style={{
        position: "relative", zIndex: 1,
        display: "flex", flexDirection: "column", alignItems: "center",
        width: "100%",
        paddingTop: "32px",
        paddingBottom: "48px",
        paddingLeft: "24px",
        paddingRight: "24px",
      }}>

        {/* AI badge */}
        <div className="anim-in" style={{
          display: "flex", alignItems: "center", gap: "8px",
          background: "#fef3dc", border: "1px solid #e8c96a",
          borderRadius: "999px", padding: "6px 16px",
          marginBottom: "20px",
        }}>
          <span style={{ color: "#c8861a", fontSize: "13px" }}>✦</span>
          <span style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "12px", fontWeight: 500,
            letterSpacing: "0.08em", textTransform: "uppercase",
            color: "#92620a",
          }}>AI-Powered University Assistant</span>
          <span style={{ color: "#c8861a", fontSize: "13px" }}>✦</span>
        </div>

        {/* Heading */}
        <h1 className="anim-up d1" style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: "clamp(2.4rem, 5.5vw, 3.8rem)",
          fontWeight: 700, color: "#1f1209",
          textAlign: "center", lineHeight: 1.2,
          marginBottom: "12px",
        }}>
          <span style={{ color: "#c8861a" }}>Vertos</span> Archive
        </h1>

        {/* Decorative divider */}
        <div className="anim-up d2" style={{
          display: "flex", alignItems: "center", gap: "12px",
          width: "100%", maxWidth: "360px", marginBottom: "16px",
        }}>
          <div style={{ flex: 1, height: "1px", background: "linear-gradient(to right, transparent, #d4a96a)" }}/>
          <span style={{ color: "#c8861a", fontSize: "16px" }}>✦</span>
          <div style={{ flex: 1, height: "1px", background: "linear-gradient(to left, transparent, #d4a96a)" }}/>
        </div>

        {/* Subtitle */}
        <p className="anim-up d2" style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "1rem", color: "#6b4d1f",
          textAlign: "center", lineHeight: 1.75,
          maxWidth: "680px", marginBottom: "24px",
        }}>
          Ask anything about notes, previous year papers,
          or any information about Lovely Professional University.
        </p>

        {/* ── Search bar ── */}
        <form
          id="search-form"
          onSubmit={e => { e.preventDefault(); handleAsk(); }}
          className="anim-up d3"
          style={{ width: "100%", maxWidth: "900px", marginBottom: selected ? "12px" : "24px" }}
        >
          <div className="search-bar" style={{
            display: "flex", alignItems: "center", gap: "12px",
            background: "#ffffff",
            border: "1.5px solid #ddd0b8",
            borderRadius: "12px",
            padding: "14px 18px",
            boxShadow: "0 2px 20px rgba(160,110,40,0.08)",
            transition: "all 0.25s ease",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="#a07840" strokeWidth="2" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35" strokeLinecap="round"/>
            </svg>

            <input
              id="search-input"
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={selected ? `Ask about ${selected.label}…` : "Ask Vertos Archive…"}
              style={{
                flex: 1, background: "none", border: "none", outline: "none",
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.97rem",
                color: "#1f1209",
              }}
            />

            <button
              id="search-submit-btn"
              type="submit"
              disabled={!query.trim() && !selected}
              style={{
                flexShrink: 0,
                display: "flex", alignItems: "center", gap: "7px",
                padding: "9px 22px",
                background: (query.trim() || selected)
                  ? "linear-gradient(135deg, #d97706 0%, #b45309 100%)"
                  : "#e9dcc8",
                border: "none", borderRadius: "8px",
                color: (query.trim() || selected) ? "#fff" : "#b0916a",
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.875rem", fontWeight: 600,
                cursor: (query.trim() || selected) ? "pointer" : "not-allowed",
                letterSpacing: "0.03em",
                transition: "all 0.2s",
              }}
              onMouseEnter={e => { if (query.trim() || selected) e.currentTarget.style.opacity = "0.88"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
            >
              Ask
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        </form>

        {/* Selected category hint */}
        {selected && (
          <div className="anim-in" style={{
            display: "flex", alignItems: "center", gap: "8px",
            marginBottom: "16px",
            fontFamily: "'Inter', sans-serif",
            fontSize: "0.8rem", color: "#8b6535",
          }}>
            <span style={{ color: "#c8861a" }}>✦</span>
            Browsing <strong style={{ color: "#5c4021" }}>{selected.label}</strong>
            <button onClick={() => setSelected(null)} style={{
              background: "none", border: "none", cursor: "pointer",
              color: "#c8861a", fontSize: "16px", lineHeight: 1,
              padding: 0, marginLeft: "2px",
            }}>×</button>
          </div>
        )}

        {/* ── Category chips (select before asking) ── */}
        <div className="anim-up d4" style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px 8px",
          maxWidth: "900px",
          width: "100%",
          marginBottom: "32px",
          padding: "0 16px",
        }}>
          {categories.map((cat, index) => {
            const isActive = selected?.id === cat.id;
            return (
              <div key={cat.id} style={{ display: "flex", alignItems: "center" }}>
                <button
                  id={`category-${cat.id}`}
                  onClick={() => setSelected(isActive ? null : cat)}
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "0.85rem",
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? "#7a4f0d" : "#5c4021",
                    letterSpacing: "0.03em",
                    background: isActive ? "#fef3dc" : "none",
                    border: isActive ? "1.5px solid #e8c96a" : "1.5px solid transparent",
                    cursor: "pointer",
                    padding: "5px 14px",
                    borderRadius: "999px",
                    transition: "all 0.18s ease",
                    boxShadow: isActive ? "0 2px 8px rgba(200,134,26,0.15)" : "none",
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      e.currentTarget.style.color = "#c8861a";
                      e.currentTarget.style.background = "#fef9f0";
                      e.currentTarget.style.border = "1.5px solid #e8c96a88";
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      e.currentTarget.style.color = "#5c4021";
                      e.currentTarget.style.background = "none";
                      e.currentTarget.style.border = "1.5px solid transparent";
                    }
                  }}
                >
                  {isActive && <span style={{ marginRight: "5px", fontSize: "10px" }}>✦</span>}
                  {cat.label}
                </button>
                {index < categories.length - 1 && (
                  <span style={{
                    color: "#c8861a", marginLeft: "8px",
                    fontSize: "10px", opacity: 0.5, userSelect: "none",
                  }}>✦</span>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Popular Searches ── */}
        <div className="anim-up d5" style={{ width: "100%", maxWidth: "900px" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: "10px",
            marginBottom: "16px",
          }}>
            <span style={{ color: "#c8861a", fontSize: "14px" }}>✦</span>
            <span style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "11px", fontWeight: 600,
              letterSpacing: "0.18em", textTransform: "uppercase",
              color: "#8b6535",
            }}>Popular Searches</span>
            <div style={{ flex: 1, height: "1px", background: "linear-gradient(to right, #d4a96a55, transparent)" }}/>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {suggestions.map((s, i) => (
              <button
                key={i}
                id={`popular-search-${i}`}
                className="sug-chip"
                onClick={() => navigate(`/chat?q=${encodeURIComponent(s)}`)}
                style={{
                  display: "flex", alignItems: "center", gap: "7px",
                  justifyContent: "space-between",
                  flex: "1 1 auto",
                  padding: "6px 12px",
                  background: "#ffffff",
                  border: "1px solid #ddd0b8",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "0.75rem", fontWeight: 400,
                  color: "#4a3218",
                }}
              >
                {s}
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" style={{ opacity: 0.45 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Spacer so campus sketch fills bottom */}
      <div style={{ flex: 1, minHeight: "40px" }}/>
    </section>
  );
}
