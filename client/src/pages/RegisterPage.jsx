import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Field({ label, id, type = "text", value, onChange, placeholder, hint }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
      <label htmlFor={id} style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: "0.82rem", fontWeight: 600,
        color: "#5c4021", letterSpacing: "0.04em", textTransform: "uppercase",
      }}>{label}</label>
      <input
        id={id} type={type} value={value} onChange={onChange} placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          padding: "12px 16px", background: "#ffffff",
          border: focused ? "1.5px solid #c8861a" : "1.5px solid #ddd0b8",
          borderRadius: "9px",
          fontFamily: "'Inter', sans-serif", fontSize: "0.9rem", color: "#1f1209",
          outline: "none",
          boxShadow: focused ? "0 0 0 3px rgba(200,134,26,0.12)" : "0 1px 6px rgba(160,110,40,0.05)",
          transition: "all 0.2s ease",
        }}
      />
      {hint && <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.75rem", color: "#9a7845" }}>{hint}</span>}
    </div>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", registrationNo: "", password: "", confirm: "" });
  const [agreed, setAgreed] = useState(false);

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
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "40px 20px", position: "relative", overflow: "hidden",
    }}>
      {/* Ornaments */}
      <div style={{ position: "absolute", top: "-60px", left: "-60px", width: "380px", height: "380px", background: "radial-gradient(circle, rgba(200,134,26,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "-80px", right: "-80px", width: "400px", height: "400px", background: "radial-gradient(circle, rgba(200,134,26,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div className="anim-up d1" style={{
        width: "100%", maxWidth: "480px",
        background: "#ffffff",
        border: "1px solid #e9dcc8",
        borderRadius: "16px",
        boxShadow: "0 8px 48px rgba(160,110,40,0.1), 0 2px 12px rgba(0,0,0,0.04)",
        overflow: "hidden",
      }}>
        <div style={{ height: "4px", background: "linear-gradient(to right, #d97706, #c8861a, #d4a96a, #c8861a, #d97706)" }} />

        <div style={{ padding: "36px 40px 40px" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              background: "#fef3dc", border: "1px solid #e8c96a",
              borderRadius: "999px", padding: "5px 14px", marginBottom: "16px",
            }}>
              <span style={{ color: "#c8861a", fontSize: "11px" }}>✦</span>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#92620a" }}>Join the Archive</span>
              <span style={{ color: "#c8861a", fontSize: "11px" }}>✦</span>
            </div>
            <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.85rem", fontWeight: 700, color: "#1f1209", marginBottom: "8px" }}>Create Account</h1>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.875rem", color: "#7a5a2a" }}>
              Join thousands of LPU students
            </p>
          </div>

          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <Field label="Full Name" id="reg-name" value={form.name} onChange={handle("name")} placeholder="Karan Kumar" />
            <Field label="LPU Email" id="reg-email" type="email" value={form.email} onChange={handle("email")} placeholder="12345678@lpu.in" hint="Use your official LPU email address" />
            <Field label="Registration Number" id="reg-rno" value={form.registrationNo} onChange={handle("registrationNo")} placeholder="12345678" />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <Field label="Password" id="reg-password" type="password" value={form.password} onChange={handle("password")} placeholder="Min. 8 characters" />
              <Field label="Confirm" id="reg-confirm" type="password" value={form.confirm} onChange={handle("confirm")} placeholder="Repeat password" />
            </div>

            {/* Terms */}
            <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
              <input type="checkbox" id="reg-agree" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                style={{ marginTop: "3px", accentColor: "#c8861a", width: "15px", height: "15px" }} />
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.8rem", color: "#7a5a2a", lineHeight: 1.5 }}>
                I agree to the{" "}
                <a href="#" style={{ color: "#c8861a", textDecoration: "none", fontWeight: 500 }}>Terms of Service</a>
                {" "}and{" "}
                <a href="#" style={{ color: "#c8861a", textDecoration: "none", fontWeight: 500 }}>Privacy Policy</a>
              </span>
            </label>

            <button id="register-submit" type="submit" disabled={!agreed} style={{
              width: "100%", padding: "13px",
              background: agreed ? "linear-gradient(135deg, #d97706 0%, #b45309 100%)" : "#e9dcc8",
              border: "none", borderRadius: "9px",
              color: agreed ? "#fff" : "#a08060",
              fontFamily: "'Inter', sans-serif",
              fontSize: "0.92rem", fontWeight: 600,
              cursor: agreed ? "pointer" : "not-allowed",
              letterSpacing: "0.02em",
              boxShadow: agreed ? "0 4px 14px rgba(180,83,9,0.3)" : "none",
              transition: "all 0.2s ease",
            }}
              onMouseEnter={e => { if (agreed) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(180,83,9,0.35)"; } }}
              onMouseLeave={e => { if (agreed) { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(180,83,9,0.3)"; } }}
            >
              Create My Account
            </button>

            <p style={{ textAlign: "center", fontFamily: "'Inter', sans-serif", fontSize: "0.875rem", color: "#7a5a2a" }}>
              Already a member?{" "}
              <Link to="/login" style={{ color: "#c8861a", fontWeight: 600, textDecoration: "none" }}
                onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}
              >Sign in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
