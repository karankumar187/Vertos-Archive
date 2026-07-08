import { useState } from "react";
import { eventsAPI, announcementsAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const UsersIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const LinkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

export default function EventDetailsModal({ event, onClose, onRegisterSuccess }) {
  const { user } = useAuth();
  const [registering, setRegistering] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [registeredCount, setRegisteredCount] = useState(
    event._fromAnnouncement
      ? (event.registeredUsers?.length || 0)
      : (event.registeredUsers?.length || 0)
  );

  const isAlreadyRegistered = event.registeredUsers?.some(
    id => id?.toString() === (user?._id || user?.id)?.toString()
  );

  const handleRegister = async () => {
    if (!user) return alert("Please log in to register.");
    if (registering || registered || isAlreadyRegistered) return;

    setRegistering(true);
    try {
      let res;
      if (event._fromAnnouncement) {
        res = await announcementsAPI.registerForAnnouncement(event._id);
      } else {
        res = await eventsAPI.registerForEvent(event._id);
      }
      if (res.data?.success) {
        setRegistered(true);
        setRegisteredCount(res.data.registeredCount ?? registeredCount + 1);
        if (onRegisterSuccess) onRegisterSuccess(event._id, res.data.registeredCount);
        // Open external link after registering
        if (event.registrationLink) {
          window.open(event.registrationLink, "_blank", "noopener,noreferrer");
        }
      }
    } catch (e) {
      console.error("Registration error:", e);
      alert("Failed to register. Please try again.");
    } finally {
      setRegistering(false);
    }
  };

  const alreadyDone = registered || isAlreadyRegistered;
  const dateObj = event.eventDate ? new Date(event.eventDate) : (event.date ? new Date(event.date) : null);

  const typeColors = {
    Hackathon: { bg: "#fdf4ff", border: "#e9d5ff", badge: "#a855f7", text: "#7e22ce" },
    Workshop:  { bg: "#eff6ff", border: "#bfdbfe", badge: "#3b82f6", text: "#1d4ed8" },
    Seminar:   { bg: "#f0fdf4", border: "#bbf7d0", badge: "#22c55e", text: "#15803d" },
    Event:     { bg: "#fff7ed", border: "#fed7aa", badge: "#f97316", text: "#c2410c" },
    Other:     { bg: "#f9fafb", border: "#e5e7eb", badge: "#6b7280", text: "#374151" },
  };
  const tc = typeColors[event.type || event.typeBadge] || typeColors["Other"];

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,8,2,0.6)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", borderRadius: "20px", width: "100%", maxWidth: "560px", boxShadow: "0 24px 64px rgba(30,10,0,0.25)", border: "1px solid #e9dcc8", overflow: "hidden" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header with type colour stripe */}
        <div style={{ background: tc.bg, borderBottom: `1px solid ${tc.border}`, padding: "24px 28px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
          <div>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: tc.text, background: tc.badge + "22", border: `1px solid ${tc.badge}44`, borderRadius: "20px", padding: "3px 10px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {event.type || event.typeBadge || "Event"}
            </span>
            <h2 style={{ margin: "10px 0 0", fontSize: "1.4rem", fontWeight: 800, color: "#1f1209", lineHeight: 1.3 }}>{event.title}</h2>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8b5e0a", cursor: "pointer", padding: "4px", flexShrink: 0, display: "flex", marginTop: "2px" }}>
            <CloseIcon />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Meta row */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
            {dateObj && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", color: "#6b4d1f", fontWeight: 600 }}>
                <CalendarIcon />
                {dateObj.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </div>
            )}
            {(event.audience || event.location) && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", color: "#6b4d1f", fontWeight: 600 }}>
                <UsersIcon />
                {event.audience || event.location}
              </div>
            )}
          </div>

          {/* Description */}
          <div style={{ fontSize: "0.95rem", color: "#3d2c1a", lineHeight: 1.7, background: "#fdf8f1", borderRadius: "12px", padding: "16px 18px", border: "1px solid #f0e6d2" }}>
            {event.description || event.content || "No description provided."}
          </div>

          {/* Registration count */}
          <div style={{ fontSize: "0.82rem", color: "#8b5e0a", fontWeight: 600 }}>
            👥 {registeredCount} {registeredCount === 1 ? "person" : "people"} registered
          </div>

          {/* Registration link info */}
          {event.registrationLink && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: "#2563eb" }}>
              <LinkIcon />
              <span>Registration link available — click "Register" below to open it.</span>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "12px", marginTop: "4px" }}>
            {alreadyDone ? (
              <div style={{ flex: 1, textAlign: "center", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px", padding: "14px", fontSize: "0.9rem", fontWeight: 700, color: "#15803d" }}>
                ✓ You're registered!
              </div>
            ) : (
              <button
                onClick={handleRegister}
                disabled={registering}
                style={{
                  flex: 1, background: "linear-gradient(135deg, #c8861a, #b45309)", color: "#fff",
                  border: "none", borderRadius: "12px", padding: "14px", fontSize: "0.95rem",
                  fontWeight: 700, cursor: registering ? "wait" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  opacity: registering ? 0.7 : 1, fontFamily: "inherit",
                  boxShadow: "0 4px 16px rgba(200,134,26,0.25)"
                }}
              >
                {registering ? "Registering..." : event.registrationLink ? "Register & Open Link" : "Register"}
              </button>
            )}
            <button
              onClick={onClose}
              style={{ padding: "14px 20px", background: "#fff", border: "1px solid #e5d9c5", borderRadius: "12px", fontSize: "0.9rem", fontWeight: 600, color: "#6b4d1f", cursor: "pointer", fontFamily: "inherit" }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
