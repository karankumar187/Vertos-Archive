import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authAPI } from "../services/api";
import campusSketch from "../assets/campus-sketch.png";

function Field({ label, id, value, onChange, placeholder, disabled }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={id} style={{
        fontFamily: "'Inter', sans-serif", fontSize: "0.82rem", fontWeight: 600,
        color: "#5c4021", letterSpacing: "0.04em", textTransform: "uppercase",
      }}>{label}</label>
      <input
        id={id} type="password" value={value} onChange={onChange}
        placeholder={placeholder} disabled={disabled}
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
    </div>
  );
}

export default function ChangePasswordPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm]       = useState({ current: "", newPass: "", confirm: "" });
  const [success, setSuccess] = useState("");
  const [error, setError]     = useState("");
  const [saving, setSaving]   = useState(false);

  const handle = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const isGoogleOnly = user?.authProvider === "google";

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (form.newPass !== form.confirm) {
      setError("New passwords do not match."); return;
    }
    if (form.newPass.length < 6) {
      setError("New password must be at least 6 characters."); return;
    }
    setSaving(true);
    try {
      await authAPI.changePassword({ currentPassword: form.current, newPassword: form.newPass });
      setSuccess("Password changed successfully!");
      setForm({ current: "", newPass: "", confirm: "" });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to change password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: "calc(100vh - 68px)", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 20px" }}>
      {/* Fixed background */}
      <div style={{ position: "fixed", inset: 0, backgroundImage: `url(${campusSketch})`, backgroundSize: "cover", backgroundPosition: "center", zIndex: 0, pointerEvents: "none" }} />
      <div style={{ position: "fixed", inset: 0, background: "linear-gradient(to bottom, rgba(250,248,244,0.97) 0%, rgba(250,248,244,0.88) 100%)", zIndex: 0, pointerEvents: "none" }} />

      <div style={{
        position: "relative", zIndex: 1, width: "100%", maxWidth: 500,
        background: "#fff", border: "1px solid #e9dcc8", borderRadius: 18,
        boxShadow: "0 8px 48px rgba(160,110,40,0.11), 0 2px 12px rgba(0,0,0,0.04)",
        overflow: "hidden",
      }}>
        <div style={{ height: 4, background: "linear-gradient(to right, #d97706, #c8861a, #d4a96a, #c8861a, #d97706)" }} />

        <div style={{ padding: "36px 40px 40px" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: "2.2rem", marginBottom: 10 }}>🔑</div>
            <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.6rem", fontWeight: 700, color: "#1f1209", marginBottom: 6 }}>
              Change Password
            </h1>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.875rem", color: "#7a5a2a" }}>
              Keep your account secure
            </p>
          </div>

          {/* Google-only notice */}
          {isGoogleOnly && (
            <div style={{
              background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10,
              padding: "14px 16px", marginBottom: 20, display: "flex", gap: 10, alignItems: "flex-start",
            }}>
              <span style={{ fontSize: "1.2rem" }}>ℹ️</span>
              <div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "0.85rem", color: "#0369a1", marginBottom: 4 }}>
                  Google account detected
                </div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.8rem", color: "#0369a1", lineHeight: 1.5 }}>
                  Your account uses Google sign-in. To change your password, go to your{" "}
                  <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer"
                    style={{ color: "#0284c7", fontWeight: 600 }}>Google Account Security settings</a>.
                </div>
              </div>
            </div>
          )}

          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {error && (
              <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", fontFamily: "'Inter', sans-serif", fontSize: "0.83rem", color: "#b91c1c" }}>{error}</div>
            )}
            {success && (
              <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "10px 14px", fontFamily: "'Inter', sans-serif", fontSize: "0.83rem", color: "#166534" }}>✓ {success}</div>
            )}

            <Field label="Current Password" id="cp-current" value={form.current} onChange={handle("current")} placeholder="Your current password" disabled={isGoogleOnly} />
            <Field label="New Password" id="cp-new" value={form.newPass} onChange={handle("newPass")} placeholder="At least 6 characters" disabled={isGoogleOnly} />
            <Field label="Confirm New Password" id="cp-confirm" value={form.confirm} onChange={handle("confirm")} placeholder="Repeat new password" disabled={isGoogleOnly} />

            <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
              <button type="button" onClick={() => navigate(-1)} style={{
                flex: 1, padding: 13, background: "#f9f5ef",
                border: "1.5px solid #ddd0b8", borderRadius: 9,
                fontFamily: "'Inter', sans-serif", fontSize: "0.92rem", fontWeight: 600,
                color: "#7a5a2a", cursor: "pointer", transition: "all 0.2s",
              }}
                onMouseEnter={e => e.currentTarget.style.background = "#f0e8d8"}
                onMouseLeave={e => e.currentTarget.style.background = "#f9f5ef"}
              >Back</button>

              <button type="submit" disabled={saving || isGoogleOnly} style={{
                flex: 2, padding: 13,
                background: (saving || isGoogleOnly) ? "#e9dcc8" : "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
                border: "none", borderRadius: 9,
                fontFamily: "'Inter', sans-serif", fontSize: "0.92rem", fontWeight: 600,
                color: (saving || isGoogleOnly) ? "#a08060" : "#fff",
                cursor: (saving || isGoogleOnly) ? "not-allowed" : "pointer",
                boxShadow: (saving || isGoogleOnly) ? "none" : "0 4px 14px rgba(180,83,9,0.3)",
                transition: "all 0.2s",
              }}>
                {saving ? "Updating…" : "Update Password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
