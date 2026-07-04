import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import campusSketch from "../assets/campus-sketch.png";
import { authAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";



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
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const [form, setForm]     = useState({ email: "", password: "" });
  const [error, setError]   = useState(searchParams.get("error") === "google_failed" ? "Google sign-in failed. Please try again." : "");
  const [loading, setLoading] = useState(false);

  const handle = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await authAPI.login({ email: form.email, password: form.password });
      await login(res.data.token);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    window.location.href = authAPI.googleAuthUrl();
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

        <div className="mobile-p-sm" style={{ padding: "36px 40px 40px" }}>
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

          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {/* Google Sign-In */}
            <button id="login-google" type="button" onClick={handleGoogle} style={{
              width: "100%", padding: "12px",
              background: "#fff", border: "1.5px solid #ddd0b8",
              borderRadius: "9px", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
              fontFamily: "'Inter', sans-serif", fontSize: "0.9rem", fontWeight: 600, color: "#3d2a0e",
              boxShadow: "0 1px 6px rgba(160,110,40,0.08)",
              transition: "all 0.2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.background = "#fef9f2"; e.currentTarget.style.borderColor = "#c8861a"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#ddd0b8"; }}
            >
              <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16.1 19 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4c-7.8 0-14.5 4.4-17.7 10.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.5 35.5 26.9 36 24 36c-5.2 0-9.7-2.9-11.3-7.1L6 33.9C9.2 39.5 16.1 44 24 44z"/><path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.5l6.2 5.2C41.1 35.5 44 30.1 44 24c0-1.3-.1-2.7-.4-4z"/></svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ flex: 1, height: "1px", background: "#e9dcc8" }} />
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.75rem", color: "#9a7845" }}>or email login</span>
              <div style={{ flex: 1, height: "1px", background: "#e9dcc8" }} />
            </div>

            {error && (
              <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", fontFamily: "'Inter', sans-serif", fontSize: "0.83rem", color: "#b91c1c" }}>{error}</div>
            )}
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

            <button id="login-submit" type="submit" disabled={loading} style={{
              width: "100%", padding: "13px",
              background: loading ? "#e9dcc8" : "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
              border: "none", borderRadius: "9px",
              color: loading ? "#a08060" : "#fff",
              fontFamily: "'Inter', sans-serif", fontSize: "0.92rem", fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: loading ? "none" : "0 4px 14px rgba(180,83,9,0.3)",
              transition: "all 0.2s ease",
            }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = "translateY(-1px)"; } }}
              onMouseLeave={e => { e.currentTarget.style.transform = "none"; }}
            >
              {loading ? "Signing in…" : "Sign In to Archive"}
            </button>



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
