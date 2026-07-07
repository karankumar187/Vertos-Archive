import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/chat", label: "Chat" },
  { to: "/community", label: "Community" },
  { to: "/about", label: "About" },
];

/** Renders a single dropdown menu item */
function DropdownItem({ icon, label, onClick, danger }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: "10px",
        width: "100%", background: hovered ? (danger ? "#fff5f5" : "#fef3dc") : "transparent",
        border: "none", borderRadius: "7px",
        padding: "9px 12px", cursor: "pointer", textAlign: "left",
        fontFamily: "'Inter', sans-serif", fontSize: "0.875rem",
        fontWeight: 500, color: danger ? "#dc2626" : "#3d2a0e",
        transition: "background 0.15s",
      }}
    >
      <span style={{ fontSize: "1rem", minWidth: 20, textAlign: "center" }}>{icon}</span>
      {label}
    </button>
  );
}

export default function Navbar() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { user, logout } = useAuth();

  const [menuOpen,    setMenuOpen]    = useState(false);  // mobile hamburger
  const [dropOpen,    setDropOpen]    = useState(false);  // avatar dropdown
  const dropRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setDropOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close dropdown on route change
  useEffect(() => { setDropOpen(false); setMenuOpen(false); }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  /** Avatar — shows Google photo if available, else initials */
  const Avatar = ({ size = 36, withRing = false }) => {
    const initials = user?.name
      ? user.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
      : "?";
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%",
        overflow: "hidden", flexShrink: 0,
        border: withRing ? "2px solid #c8861a" : "2px solid #e9dcc8",
        boxShadow: "0 1px 6px rgba(160,110,40,0.18)",
        cursor: "pointer", transition: "border-color 0.2s",
        background: "linear-gradient(135deg, #d97706, #b45309)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {user?.avatar ? (
          <img src={user.avatar} alt={user.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span style={{ color: "#fff", fontWeight: 700, fontSize: size * 0.38, fontFamily: "'Inter', sans-serif" }}>
            {initials}
          </span>
        )}
      </div>
    );
  };

  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 50, width: "100%",
      background: "rgba(253,250,245,0.96)", backdropFilter: "blur(12px)",
      borderBottom: "1px solid #e9dcc8",
      boxShadow: "0 1px 8px rgba(160,110,40,0.07)",
    }}>
      <div style={{
        maxWidth: 1280, margin: "0 auto", padding: "0 24px",
        minHeight: 68, display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>

        {/* Brand */}
        <Link to="/" style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: "1.45rem", fontWeight: 700, color: "#1f1209",
          textDecoration: "none", letterSpacing: "-0.01em",
          display: "flex", alignItems: "center", gap: 5,
        }}>
          <span style={{ color: "#c8861a" }}>Vertos</span>
          <span>Archive</span>
        </Link>

        {/* Desktop links */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }} className="hidden-mobile">
          {NAV_LINKS.map(({ to, label }) => {
            const active = location.pathname === to;
            return (
              <Link key={to} to={to} style={{
                fontFamily: "'Inter', sans-serif", fontSize: "0.875rem", fontWeight: 500,
                color: active ? "#c8861a" : "#5c4021", textDecoration: "none",
                padding: "7px 14px", borderRadius: 7,
                background: active ? "#fef3dc" : "transparent",
                borderBottom: active ? "2px solid #c8861a" : "2px solid transparent",
                transition: "all 0.18s ease",
              }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "#fdf5e8"; e.currentTarget.style.color = "#8b5e0a"; } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#5c4021"; } }}
              >{label}</Link>
            );
          })}
        </div>

        {/* Mobile Hamburger */}
        <button 
          className="mobile-only-flex"
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            background: "none", border: "none", padding: "8px", cursor: "pointer",
            alignItems: "center", justifyContent: "center", color: "#5c4021"
          }}
          aria-label="Toggle mobile menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {menuOpen ? (
              <path d="M18 6L6 18M6 6l12 12" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        {/* Right side — auth */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {user ? (
            /* ── Logged-in: Avatar + Dropdown ── */
            <div ref={dropRef} style={{ position: "relative" }}>
              <button
                id="nav-avatar-btn"
                onClick={() => setDropOpen(o => !o)}
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 8 }}
                aria-label="User menu"
              >
                <Avatar size={36} withRing={dropOpen} />
                <span style={{
                  fontFamily: "'Inter', sans-serif", fontSize: "0.8rem",
                  fontWeight: 600, color: "#5c4021", maxWidth: 100,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }} className="hidden-mobile">
                  {user.name?.split(" ")[0]}
                </span>
                <span style={{ color: "#9a7845", fontSize: "0.7rem", transition: "transform 0.2s",
                  display: "inline-block", transform: dropOpen ? "rotate(180deg)" : "none" }}>▾</span>
              </button>

              {/* Dropdown panel */}
              {dropOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 10px)", right: 0,
                  width: 230, background: "#fff",
                  border: "1px solid #e9dcc8", borderRadius: 12,
                  boxShadow: "0 8px 32px rgba(160,110,40,0.14), 0 2px 8px rgba(0,0,0,0.06)",
                  padding: "8px 8px 6px", zIndex: 100,
                  animation: "dropIn 0.18s ease",
                }}>
                  {/* User info header */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 12px 12px", borderBottom: "1px solid #f0e8d8", marginBottom: 6,
                  }}>
                    <Avatar size={40} />
                    <div style={{ overflow: "hidden" }}>
                      <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600,
                        fontSize: "0.875rem", color: "#1f1209",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {user.name}
                      </div>
                      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.75rem",
                        color: "#9a7845", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {user.email}
                      </div>
                      {user.authProvider === "google" && (
                        <div style={{ marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ fontSize: "0.65rem", background: "#f0f9ff", color: "#0369a1",
                            border: "1px solid #bae6fd", borderRadius: 999, padding: "1px 7px",
                            fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
                            Google account
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <DropdownItem icon="📊" label="Dashboard" onClick={() => { navigate("/dashboard"); setDropOpen(false); }} />
                  <DropdownItem icon="👤" label="My Profile" onClick={() => { navigate("/profile"); setDropOpen(false); }} />
                  <DropdownItem icon="🔑" label="Change Password" onClick={() => { navigate("/change-password"); setDropOpen(false); }} />
                  {user.role === "admin" && (
                    <DropdownItem icon="⚙️" label="Admin Panel" onClick={() => { navigate("/admin"); setDropOpen(false); }} />
                  )}

                  <div style={{ borderTop: "1px solid #f0e8d8", margin: "6px 0" }} />
                  <DropdownItem icon="🚪" label="Logout" onClick={handleLogout} danger />
                </div>
              )}
            </div>
          ) : (
            /* ── Logged-out: Login + Register ── */
            <>
              <Link to="/login" style={{
                fontFamily: "'Inter', sans-serif", fontSize: "0.875rem", fontWeight: 500,
                color: "#8b5e0a", textDecoration: "none", padding: "8px 18px",
                border: "1.5px solid #c8861a", borderRadius: 7, transition: "all 0.18s",
              }}
                onMouseEnter={e => e.currentTarget.style.background = "#fef3dc"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >Login</Link>
              <Link className="hidden-mobile" to="/register" style={{
                fontFamily: "'Inter', sans-serif", fontSize: "0.875rem", fontWeight: 600,
                color: "#fff", textDecoration: "none", padding: "8px 18px",
                background: "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
                borderRadius: 7, border: "1.5px solid transparent", transition: "opacity 0.18s",
              }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}
              >Register</Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <div className="mobile-only" style={{
          position: "absolute", top: "100%", left: 0, right: 0,
          background: "#fff", borderBottom: "1px solid #e9dcc8",
          boxShadow: "0 4px 12px rgba(160,110,40,0.1)",
          padding: "8px 16px 16px", zIndex: 90,
          animation: "dropIn 0.2s ease"
        }}>
          {NAV_LINKS.map(({ to, label }) => {
            const active = location.pathname === to;
            return (
              <Link key={to} to={to} onClick={() => setMenuOpen(false)} style={{
                display: "block", fontFamily: "'Inter', sans-serif", fontSize: "1rem", fontWeight: 500,
                color: active ? "#c8861a" : "#5c4021", textDecoration: "none",
                padding: "12px 16px", borderRadius: 8,
                background: active ? "#fef3dc" : "transparent",
                marginBottom: 4
              }}>
                {label}
              </Link>
            );
          })}
          {!user && (
            <Link to="/register" onClick={() => setMenuOpen(false)} style={{
              display: "block", textAlign: "center", marginTop: 8,
              fontFamily: "'Inter', sans-serif", fontSize: "1rem", fontWeight: 600,
              color: "#fff", textDecoration: "none", padding: "12px 16px",
              background: "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
              borderRadius: 8
            }}>
              Register Now
            </Link>
          )}
        </div>
      )}

      <style>{`
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 768px) { .hidden-mobile { display: none !important; } }
      `}</style>
    </nav>
  );
}
