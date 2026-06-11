import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authAPI } from "../services/api";
import campusSketch from "../assets/campus-sketch.png";

function Field({ label, id, type = "text", value, onChange, placeholder, disabled, hint }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={id} style={{
        fontFamily: "'Inter', sans-serif", fontSize: "0.82rem", fontWeight: 600,
        color: "#5c4021", letterSpacing: "0.04em", textTransform: "uppercase",
      }}>{label}</label>
      <input
        id={id} type={type} value={value} onChange={onChange} placeholder={placeholder}
        disabled={disabled}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          padding: "12px 16px",
          background: disabled ? "#f9f5ef" : "#fff",
          border: focused ? "1.5px solid #c8861a" : "1.5px solid #ddd0b8",
          borderRadius: 9, fontFamily: "'Inter', sans-serif", fontSize: "0.9rem",
          color: disabled ? "#9a7845" : "#1f1209", outline: "none",
          boxShadow: focused ? "0 0 0 3px rgba(200,134,26,0.12)" : "none",
          transition: "all 0.2s", cursor: disabled ? "not-allowed" : "text",
        }}
      />
      {hint && <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.75rem", color: "#9a7845" }}>{hint}</span>}
    </div>
  );
}

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [form, setForm]       = useState({ name: "", email: "", reg_no: "" });
  const [success, setSuccess] = useState("");
  const [error, setError]     = useState("");
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        name:   user.name   || "",
        email:  user.email  || "",
        reg_no: user.reg_no || "",
      });
    }
  }, [user]);

  const handle = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    setSaving(true);
    try {
      const res = await authAPI.updateProfile({
        name:   form.name,
        reg_no: form.reg_no ? Number(form.reg_no) : undefined,
      });
      updateUser(res.data.user);
      setSuccess("Profile updated successfully!");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const initials = user?.name
    ? user.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <div style={{ minHeight: "calc(100vh - 68px)", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 20px" }}>
      {/* Fixed background */}
      <div style={{ position: "fixed", inset: 0, backgroundImage: `url(${campusSketch})`, backgroundSize: "cover", backgroundPosition: "center", zIndex: 0, pointerEvents: "none" }} />
      <div style={{ position: "fixed", inset: 0, background: "linear-gradient(to bottom, rgba(250,248,244,0.97) 0%, rgba(250,248,244,0.88) 100%)", zIndex: 0, pointerEvents: "none" }} />

      <div style={{
        position: "relative", zIndex: 1, width: "100%", maxWidth: 580,
        background: "#fff", border: "1px solid #e9dcc8", borderRadius: 18,
        boxShadow: "0 8px 48px rgba(160,110,40,0.11), 0 2px 12px rgba(0,0,0,0.04)",
        overflow: "hidden",
      }}>
        {/* Gold top bar */}
        <div style={{ height: 4, background: "linear-gradient(to right, #d97706, #c8861a, #d4a96a, #c8861a, #d97706)" }} />

        <div style={{ padding: "36px 40px 40px" }}>
          {/* Avatar section */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 32 }}>
            <div style={{
              width: 88, height: 88, borderRadius: "50%", overflow: "hidden",
              border: "3px solid #c8861a", boxShadow: "0 4px 20px rgba(200,134,26,0.2)",
              background: "linear-gradient(135deg, #d97706, #b45309)",
              display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12,
            }}>
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ color: "#fff", fontWeight: 700, fontSize: "2rem", fontFamily: "'Inter', sans-serif" }}>{initials}</span>
              )}
            </div>
            <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.6rem", fontWeight: 700, color: "#1f1209", marginBottom: 4 }}>
              My Profile
            </h1>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.8rem", color: "#9a7845" }}>
              {user?.authProvider === "google" ? "Google account" : `Member since ${new Date(user?.createdAt).getFullYear()}`}
            </p>
            {user?.role === "admin" && (
              <span style={{ marginTop: 6, fontSize: "0.7rem", background: "#fef3dc", color: "#92620a", border: "1px solid #e8c96a", borderRadius: 999, padding: "2px 10px", fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
                Admin
              </span>
            )}
          </div>

          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {error && (
              <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", fontFamily: "'Inter', sans-serif", fontSize: "0.83rem", color: "#b91c1c" }}>{error}</div>
            )}
            {success && (
              <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "10px 14px", fontFamily: "'Inter', sans-serif", fontSize: "0.83rem", color: "#166534" }}>✓ {success}</div>
            )}

            <Field label="Full Name" id="profile-name" value={form.name} onChange={handle("name")} placeholder="Your name" />
            <Field label="Email" id="profile-email" value={form.email} disabled
              hint={user?.authProvider === "google" ? "Email is managed by Google and cannot be changed here." : "Contact support to change your email."}
            />
            <Field label="Registration Number" id="profile-regno" value={form.reg_no} onChange={handle("reg_no")} placeholder="12345678"
              hint={user?.authProvider === "google" && !user?.reg_no ? "Add your LPU registration number." : ""}
            />

            <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
              <button type="button" onClick={() => navigate(-1)} style={{
                flex: 1, padding: "13px", background: "#f9f5ef",
                border: "1.5px solid #ddd0b8", borderRadius: 9,
                fontFamily: "'Inter', sans-serif", fontSize: "0.92rem", fontWeight: 600,
                color: "#7a5a2a", cursor: "pointer", transition: "all 0.2s",
              }}
                onMouseEnter={e => e.currentTarget.style.background = "#f0e8d8"}
                onMouseLeave={e => e.currentTarget.style.background = "#f9f5ef"}
              >Cancel</button>

              <button type="submit" disabled={saving} style={{
                flex: 2, padding: "13px",
                background: saving ? "#e9dcc8" : "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
                border: "none", borderRadius: 9,
                fontFamily: "'Inter', sans-serif", fontSize: "0.92rem", fontWeight: 600,
                color: saving ? "#a08060" : "#fff",
                cursor: saving ? "not-allowed" : "pointer",
                boxShadow: saving ? "none" : "0 4px 14px rgba(180,83,9,0.3)",
                transition: "all 0.2s",
              }}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>

          <div style={{ marginTop: 20, textAlign: "center" }}>
            <button onClick={() => navigate("/change-password")} style={{
              background: "none", border: "none", cursor: "pointer",
              fontFamily: "'Inter', sans-serif", fontSize: "0.8rem", color: "#c8861a", fontWeight: 500,
              textDecoration: "underline",
            }}>
              Change Password →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
