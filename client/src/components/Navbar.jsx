import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/chat", label: "Chat" },
  { to: "/upload", label: "Upload" },
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/dashboard", label: "Dashboard" },
];

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  // Fake auth state — swap with real context later
  const isLoggedIn = false;

  return (
    <nav
      className="w-full sticky top-0 z-50"
      style={{
        background: "rgba(253,250,245,0.96)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid #e9dcc8",
        boxShadow: "0 1px 8px rgba(160,110,40,0.07)",
      }}
    >
      <div style={{
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "0 24px",
        minHeight: "68px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>

        {/* Brand */}
        <Link to="/" style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: "1.45rem",
          fontWeight: 700,
          color: "#1f1209",
          textDecoration: "none",
          letterSpacing: "-0.01em",
          display: "flex",
          alignItems: "center",
          gap: "5px",
        }}>
          <span style={{ color: "#c8861a" }}>Vertos</span>
          <span>Archive</span>
        </Link>

        {/* Desktop links */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }} className="hidden-mobile">
          {NAV_LINKS.map(({ to, label }) => {
            const active = location.pathname === to;
            return (
              <Link key={to} to={to} style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: active ? "#c8861a" : "#5c4021",
                textDecoration: "none",
                padding: "7px 14px",
                borderRadius: "7px",
                background: active ? "#fef3dc" : "transparent",
                borderBottom: active ? "2px solid #c8861a" : "2px solid transparent",
                transition: "all 0.18s ease",
              }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "#fdf5e8"; e.currentTarget.style.color = "#8b5e0a"; } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#5c4021"; } }}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* Auth Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {isLoggedIn ? (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {/* Avatar placeholder */}
              <div style={{
                width: "36px", height: "36px",
                background: "linear-gradient(135deg, #d97706, #b45309)",
                borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontWeight: 700, fontSize: "0.875rem",
                fontFamily: "'Inter', sans-serif",
                cursor: "pointer",
              }}>K</div>
            </div>
          ) : (
            <>
              <Link to="/login" style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.875rem", fontWeight: 500,
                color: "#8b5e0a", textDecoration: "none",
                padding: "8px 18px",
                border: "1.5px solid #c8861a",
                borderRadius: "7px",
                transition: "all 0.18s",
              }}
                onMouseEnter={e => { e.currentTarget.style.background = "#fef3dc"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              >Login</Link>
              <Link to="/register" style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.875rem", fontWeight: 600,
                color: "#fff", textDecoration: "none",
                padding: "8px 18px",
                background: "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
                borderRadius: "7px",
                border: "1.5px solid transparent",
                transition: "opacity 0.18s",
              }}
                onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
              >Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
