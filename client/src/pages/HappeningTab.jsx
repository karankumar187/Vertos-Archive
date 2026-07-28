import { useState, useEffect } from "react";
import { eventsAPI, announcementsAPI } from "../services/api";
import { cacheGet, cacheSet } from "../utils/localCache";
import { useSocket } from "../context/SocketContext";
import EventDetailsModal from "../components/EventDetailsModal";

const EventCard = ({ event, onClick }) => {
  const dateObj = new Date(event.date || event.eventDate);
  const month = dateObj.toLocaleString('default', { month: 'short' }).toUpperCase();
  const day = dateObj.getDate();

  let accentColor = "#c8861a";
  if (event.type === 'Hackathon') accentColor = "#c8861a";
  else if (event.type === 'Workshop') accentColor = "#7c3aed";
  else if (event.type === 'Seminar') accentColor = "#059669";
  else accentColor = "#db2777";

  const registeredCount = event.registeredUsers?.length || 0;
  const hasRegLink = !!event.registrationLink;

  return (
    <div
      className="happening-card"
      onClick={onClick}
      style={{
        background: "#fff", borderRadius: "16px", padding: "22px 24px",
        border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
        display: "flex", gap: "20px", cursor: "pointer",
        transition: "box-shadow 0.2s, transform 0.15s",
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 24px rgba(200,134,26,0.12)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.03)"; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      <div className="happening-date-box" style={{ width: 70, height: 70, borderRadius: "14px", background: accentColor + "1A", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: accentColor }}>{month}</span>
        <span style={{ fontSize: "1.8rem", fontWeight: 800, color: "#1f1209", lineHeight: 1 }}>{day}</span>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
          <h3 style={{ margin: "0 0 6px 0", fontSize: "1.15rem", fontWeight: 700, color: "#1f1209" }}>{event.title}</h3>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
            {hasRegLink && (
              <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#2563eb", background: "#eff6ff", border: "1px solid #bfdbfe", padding: "3px 8px", borderRadius: "10px" }}>
                Register
              </span>
            )}
            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: accentColor, background: accentColor + "1A", padding: "4px 10px", borderRadius: "12px" }}>
              {event.type}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "10px", paddingTop: "10px", borderTop: "1px solid #f1f5f9" }}>
          <div style={{ fontSize: "0.8rem", color: "#64748b", display: "flex", alignItems: "center", gap: "6px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            {event.location || event.audience || 'Campus'}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#64748b", display: "flex", alignItems: "center", gap: "6px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
            {registeredCount} Registered
          </div>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: "0.78rem", color: accentColor, fontWeight: 600 }}>Click to view details →</span>
        </div>
      </div>
    </div>
  );
};

export default function HappeningTab() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const socket = useSocket();

  const fetchEvents = async (background = false) => {
    try {
      if (!background) setLoading(true);
      const [evRes, annRes] = await Promise.all([
        eventsAPI.getEvents(),
        announcementsAPI.getPublished()
      ]);
      const regularEvents = evRes.data?.success ? evRes.data.data : [];
      const announcementEvents = (annRes.data?.data || [])
        .filter(a => a.type === 'Event')
        .map(a => ({
          _fromAnnouncement: true,
          _id: a._id,
          title: a.title,
          description: a.content,
          content: a.content,
          type: 'Event',
          date: a.eventDate || a.createdAt,
          eventDate: a.eventDate || a.createdAt,
          location: '',
          audience: a.audience,
          registrationLink: a.registrationLink || null,
          registeredUsers: a.registeredUsers || []
        }));
      const merged = [...regularEvents, ...announcementEvents];
      setEvents(merged);
      cacheSet('community_events', merged);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cached = cacheGet('community_events');
    if (cached) {
      setEvents(cached);
      setLoading(false);
      fetchEvents(true);
    } else {
      fetchEvents();
    }
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('new_event', (event) => {
      setEvents(prev => [...prev, event]); // Push to events
    });
    socket.on('new_announcement', (ann) => {
      if (ann.type === 'Event') {
        const formattedAnn = {
          _fromAnnouncement: true,
          _id: ann._id,
          title: ann.title,
          description: ann.content,
          content: ann.content,
          type: 'Event',
          date: ann.eventDate || ann.createdAt,
          eventDate: ann.eventDate || ann.createdAt,
          location: '',
          audience: ann.audience,
          registrationLink: ann.registrationLink || null,
          registeredUsers: ann.registeredUsers || []
        };
        setEvents(prev => [...prev, formattedAnn]);
      }
    });

    return () => {
      socket.off('new_event');
      socket.off('new_announcement');
    };
  }, [socket]);

  const handleRegisterSuccess = (eventId, newCount) => {
    setEvents(prev => prev.map(ev => {
      if (ev._id === eventId) {
        return { ...ev, registeredUsers: Array(newCount).fill(null) };
      }
      return ev;
    }));
    if (selectedEvent?._id === eventId) {
      setSelectedEvent(prev => ({ ...prev, registeredUsers: Array(newCount).fill(null) }));
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "900px", margin: "0 auto", position: "relative" }}>
      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onRegisterSuccess={handleRegisterSuccess}
        />
      )}

      <div style={{ textAlign: "center", marginBottom: "12px" }}>
        <h2 style={{ margin: "0 0 12px 0", fontSize: "2rem", color: "#1f1209", fontFamily: "'Playfair Display', serif" }}>
          Campus Happenings
        </h2>
        <p style={{ margin: 0, color: "#6b4d1f", fontSize: "1rem" }}>
          Hackathons, workshops, and seminars. Never miss what's happening around you.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>Loading events...</div>
      ) : events.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {events.map(ev => (
            <EventCard key={ev._id} event={ev} onClick={() => setSelectedEvent(ev)} />
          ))}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "60px 20px", background: "#fff", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
          <p style={{ color: "#64748b", margin: 0 }}>No upcoming events right now. Check back later!</p>
        </div>
      )}
    </div>
  );
}
