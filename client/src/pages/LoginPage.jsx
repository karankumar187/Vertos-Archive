import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import campusSketch from "../assets/campus-sketch.png";

/* ── Shared field component ── */
function Field({ label, id, type = "text", value, onChange, placeholder }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
      <label htmlFor={id} style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: "0.82rem", fontWeight: 600,
        color: "#5c4021", letterSpacing: "0.04em",
        textTransform: "uppercase",
      }}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          padding: "12px 16px",
          background: "#ffffff",
          border: focused ? "1.5px solid #c8861a" : "1.5px solid #ddd0b8",
          borderRadius: "9px",
          fontFamily: "'Inter', sans-serif",
          fontSize: "0.9rem",
          color: "#1f1209",
          outline: "none",
          boxShadow: focused ? "0 0 0 3px rgba(200,134,26,0.12)" : "0 1px 6px rgba(160,110,40,0.05)",
          transition: "all 0.2s ease",
        }}
      />
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });

  const handle = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const onSubmit = (e) => {
    e.preventDefault();
    // TODO: API call
    navigate("/dashboard");
  };

  return (
    <div style={{
      minHeight: "calc(100vh - 68px)",
      background: "#faf8f4",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 20px",
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
      {/* Background ornament */}
      <div style={{
        position: "absolute", top: "-80px", right: "-80px",
        width: "400px", height: "400px",
        background: "radial-gradient(circle, rgba(200,134,26,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: "-60px", left: "-60px",
        width: "320px", height: "320px",
        background: "radial-gradient(circle, rgba(200,134,26,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div className="anim-up d1" style={{
        width: "100%",
        maxWidth: "520px",
        background: "#ffffff",
        border: "1px solid #e9dcc8",
        borderRadius: "16px",
        boxShadow: "0 8px 48px rgba(160,110,40,0.1), 0 2px 12px rgba(0,0,0,0.04)",
        overflow: "hidden",
        position: "relative",
        zIndex: 1,
      }}>
        {/* Top gold bar */}
        <div style={{
          height: "4px",
          background: "linear-gradient(to right, #d97706, #c8861a, #d4a96a, #c8861a, #d97706)",
        }} />

        <div style={{ padding: "36px 40px 40px" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              background: "#fef3dc", border: "1px solid #e8c96a",
              borderRadius: "999px", padding: "5px 14px",
              marginBottom: "18px",
            }}>
              <span style={{ color: "#c8861a", fontSize: "11px" }}>✦</span>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#92620a" }}>
                Welcome Back
              </span>
              <span style={{ color: "#c8861a", fontSize: "11px" }}>✦</span>
            </div>
            <h1 style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "1.85rem", fontWeight: 700,
              color: "#1f1209", marginBottom: "8px",
            }}>Sign In</h1>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.875rem", color: "#7a5a2a" }}>
              Access your Vertos Archive account
            </p>
          </div>

          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <Field label="Email Address" id="login-email" type="email" value={form.email}
              onChange={handle("email")} placeholder="you@example.com" />
            <Field label="Password" id="login-password" type="password" value={form.password}
              onChange={handle("password")} placeholder="Enter your password" />

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <a href="#" style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.8rem", color: "#c8861a", textDecoration: "none" }}
                onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}
              >Forgot password?</a>
            </div>

            <button id="login-submit" type="submit" style={{
              width: "100%",
              padding: "13px",
              background: "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
              border: "none", borderRadius: "9px",
              color: "#fff",
              fontFamily: "'Inter', sans-serif",
              fontSize: "0.92rem", fontWeight: 600,
              cursor: "pointer",
              letterSpacing: "0.02em",
              boxShadow: "0 4px 14px rgba(180,83,9,0.3)",
              transition: "all 0.2s ease",
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(180,83,9,0.35)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(180,83,9,0.3)"; }}
            >
              Sign In to Archive
            </button>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ flex: 1, height: "1px", background: "#e9dcc8" }} />
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.75rem", color: "#9a7845" }}>or</span>
              <div style={{ flex: 1, height: "1px", background: "#e9dcc8" }} />
            </div>

            <p style={{ textAlign: "center", fontFamily: "'Inter', sans-serif", fontSize: "0.875rem", color: "#7a5a2a" }}>
              Don't have an account?{" "}
              <Link to="/register" style={{ color: "#c8861a", fontWeight: 600, textDecoration: "none" }}
                onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}
              >Create one</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
