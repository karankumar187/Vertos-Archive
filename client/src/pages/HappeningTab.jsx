import { useState, useEffect } from "react";
import { eventsAPI, announcementsAPI } from "../services/api";
import campusSketch from "../assets/campus-sketch.png";
import { cacheGet, cacheSet } from "../utils/localCache";

const EventCard = ({ event, currentUserId, onInterestToggle }) => {
  const isInterested = event.interestedUsers?.includes(currentUserId);
  const dateObj = new Date(event.date);
  const month = dateObj.toLocaleString('default', { month: 'short' }).toUpperCase();
  const day = dateObj.getDate();

  let accentColor = "#c8861a";
  if (event.type === 'Hackathon') accentColor = "#c8861a";
  else if (event.type === 'Workshop') accentColor = "#7c3aed";
  else if (event.type === 'Seminar') accentColor = "#059669";
  else accentColor = "#db2777";

  return (
    <div style={{
      background: "#fff", borderRadius: "16px", padding: "24px",
      border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
      display: "flex", gap: "20px"
    }}>
      <div style={{ width: 70, height: 70, borderRadius: "14px", background: accentColor + "1A", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: accentColor }}>{month}</span>
        <span style={{ fontSize: "1.8rem", fontWeight: 800, color: "#1f1209", lineHeight: 1 }}>{day}</span>
      </div>
      
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: "1.2rem", fontWeight: 700, color: "#1f1209" }}>{event.title}</h3>
          <span style={{ fontSize: "0.7rem", fontWeight: 700, color: accentColor, background: accentColor + "1A", padding: "4px 10px", borderRadius: "12px", flexShrink: 0 }}>
            {event.type}
          </span>
        </div>
        <p style={{ margin: "0 0 12px 0", fontSize: "0.88rem", color: "#64748b", lineHeight: 1.5 }}>
          {event.description}
        </p>
        
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "auto", paddingTop: "12px", borderTop: "1px solid #f1f5f9" }}>
          <div style={{ fontSize: "0.8rem", color: "#64748b", display: "flex", alignItems: "center", gap: "6px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            {event.location || event.audience || 'Campus'}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#64748b", display: "flex", alignItems: "center", gap: "6px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
            {event.interestedUsers?.length || 0} Interested
          </div>
          <div style={{ flex: 1 }}></div>
          {!event._fromAnnouncement && (
            <button 
              onClick={() => onInterestToggle(event._id)}
              style={{
                padding: "8px 16px", borderRadius: "8px", fontWeight: 600, fontSize: "0.85rem",
                cursor: "pointer", transition: "all 0.2s",
                background: isInterested ? accentColor : "transparent",
                color: isInterested ? "#fff" : accentColor,
                border: `1px solid ${accentColor}`,
              }}
            >
              {isInterested ? '\u2713 Interested' : 'Count me in'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default function HappeningTab() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

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
          type: 'Event',
          date: a.eventDate || a.createdAt,
          location: '',
          audience: a.audience,
          interestedUsers: []
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
    // Show cached data instantly, then refresh in background
    const cached = cacheGet('community_events');
    if (cached) {
      setEvents(cached);
      setLoading(false);
      fetchEvents(true); // silent background refresh
    } else {
      fetchEvents();
    }
  }, []);

  const handleInterestToggle = async (id) => {
    try {
      // Optimistic update
      setEvents(events.map(ev => {
        if (ev._id === id) {
          const hasInterest = ev.interestedUsers.includes(currentUser.id);
          return {
            ...ev,
            interestedUsers: hasInterest 
              ? ev.interestedUsers.filter(uid => uid !== currentUser.id)
              : [...ev.interestedUsers, currentUser.id]
          };
        }
        return ev;
      }));
      await eventsAPI.toggleInterest(id);
    } catch (error) {
      console.error("Error toggling interest:", error);
      fetchEvents(); // revert if failed
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "900px", margin: "0 auto", position: "relative" }}>
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
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {events.map(ev => (
            <EventCard key={ev._id} event={ev} currentUserId={currentUser.id} onInterestToggle={handleInterestToggle} />
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
