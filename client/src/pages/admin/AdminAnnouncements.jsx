import { useState, useEffect } from "react";
import { adminAPI } from "../../services/api";

const IconEdit = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IconTrash = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>;

function AnnouncementModal({ announcement, onClose, onSuccess }) {
  const [form, setForm] = useState({
    title: announcement?.title || '',
    content: announcement?.content || '',
    type: announcement?.type || 'General',
    audience: announcement?.audience || 'All Students',
    status: announcement?.status || 'draft',
    eventDate: announcement?.eventDate ? new Date(announcement.eventDate).toISOString().split('T')[0] : '',
    registrationLink: announcement?.registrationLink || ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (announcement?._id) {
        await adminAPI.updateAnnouncement(announcement._id, form);
      } else {
        await adminAPI.createAnnouncement(form);
      }
      onSuccess();
    } catch (err) {
      console.error(err);
      alert('Failed to save announcement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(31,18,9,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={onClose}>
      <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: '18px', padding: '32px', width: '100%', maxWidth: '560px', boxShadow: '0 20px 60px rgba(30,10,0,0.22)', border: '1px solid #e9dcc8' }} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', fontWeight: 700, color: '#1f1209', margin: '0 0 24px 0' }}>
          {announcement ? 'Edit Announcement' : 'New Announcement'}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#5c4021', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Title</label>
            <input required type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} style={{ width: '100%', padding: '10px 14px', border: '1px solid #ddd0b8', borderRadius: '8px', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#5c4021', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Content</label>
            <textarea required rows={4} value={form.content} onChange={e => setForm({...form, content: e.target.value})} style={{ width: '100%', padding: '10px 14px', border: '1px solid #ddd0b8', borderRadius: '8px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#5c4021', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Type</label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} style={{ width: '100%', padding: '10px 14px', border: '1px solid #ddd0b8', borderRadius: '8px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
                {['General', 'Exam', 'Placement', 'Event', 'Maintenance', 'Academic'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#5c4021', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Audience</label>
              <select value={form.audience} onChange={e => setForm({...form, audience: e.target.value})} style={{ width: '100%', padding: '10px 14px', border: '1px solid #ddd0b8', borderRadius: '8px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
                {['All Students', '1st Sem', '2nd Sem', '3rd Sem', '4th Sem', '5th Sem', '6th Sem', '7th Sem', '8th Sem'].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          {/* Event Date & Registration Link — only shown for Event type */}
          {form.type === 'Event' && (
            <>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#5c4021', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Event Date</label>
                <input type="date" value={form.eventDate} onChange={e => setForm({...form, eventDate: e.target.value})} style={{ width: '100%', padding: '10px 14px', border: '1px solid #ddd0b8', borderRadius: '8px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#5c4021', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Registration Link (optional)</label>
                <input type="url" placeholder="https://forms.google.com/..." value={form.registrationLink} onChange={e => setForm({...form, registrationLink: e.target.value})} style={{ width: '100%', padding: '10px 14px', border: '1px solid #ddd0b8', borderRadius: '8px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </>
          )}

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#5c4021', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Status</label>
            <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} style={{ width: '100%', padding: '10px 14px', border: '1px solid #ddd0b8', borderRadius: '8px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={{ padding: '10px 20px', background: '#fff', border: '1px solid #ddd0b8', borderRadius: '8px', fontWeight: 600, color: '#5c4021', cursor: 'pointer' }}>Cancel</button>
          <button type="submit" disabled={loading} style={{ padding: '10px 24px', background: '#c8861a', border: 'none', borderRadius: '8px', fontWeight: 600, color: '#fff', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Saving...' : 'Save Announcement'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, ann: null });

  const fetchAnnouncements = async (force = false) => {
    const CACHE_KEY = "admin_announcements_cache";
    const CACHE_TTL = 5 * 60 * 1000;

    if (!force) {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const { timestamp, data } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_TTL) {
            setAnnouncements(data);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error("Cache parse error", e);
        }
      }
    }

    setLoading(true);
    try {
      const res = await adminAPI.getAnnouncements();
      const newData = res.data?.data || [];
      setAnnouncements(newData);
      localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: newData }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this announcement?")) return;
    try {
      await adminAPI.deleteAnnouncement(id);
      fetchAnnouncements(true);
    } catch (err) {
      alert("Failed to delete");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", fontWeight: 700, color: "#1f1209", margin: "0 0 8px 0" }}>Announcements</h1>
          <p style={{ color: "#6b4d1f", fontSize: "0.95rem", margin: 0 }}>Create and manage announcements for students.</p>
        </div>
        <button onClick={() => setModal({ open: true, ann: null })} style={{ padding: "10px 20px", background: "#c8861a", border: "none", borderRadius: "10px", color: "#fff", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" }}>
          + New Announcement
        </button>
      </div>

      <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #f0e6d2", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 2px 8px rgba(160,110,40,0.03)" }}>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div style={{ padding: "24px", color: "#6b4d1f" }}>Loading announcements...</div>
          ) : announcements.length === 0 ? (
            <div style={{ padding: "24px", color: "#6b4d1f" }}>No announcements found.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #f0e6d2", color: "#8b5e0a", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  <th style={{ padding: "16px 24px", fontWeight: 600 }}>Title</th>
                  <th style={{ padding: "16px 24px", fontWeight: 600 }}>Type</th>
                  <th style={{ padding: "16px 24px", fontWeight: 600 }}>Audience</th>
                  <th style={{ padding: "16px 24px", fontWeight: 600 }}>Posted On</th>
                  <th style={{ padding: "16px 24px", fontWeight: 600 }}>Status</th>
                  <th style={{ padding: "16px 24px", fontWeight: 600, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {announcements.map(ann => (
                  <tr key={ann._id} style={{ borderBottom: "1px solid #f9f5f0", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "#fdf8f1"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "16px 24px", fontSize: "0.9rem", color: "#1f1209", fontWeight: 600 }}>{ann.title}</td>
                    <td style={{ padding: "16px 24px", fontSize: "0.85rem", color: "#6b4d1f" }}>{ann.type}</td>
                    <td style={{ padding: "16px 24px", fontSize: "0.85rem", color: "#6b4d1f" }}>{ann.audience}</td>
                    <td style={{ padding: "16px 24px", fontSize: "0.85rem", color: "#6b4d1f" }}>{new Date(ann.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: "16px 24px" }}>
                      <span style={{ 
                        padding: "4px 10px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 600,
                        background: ann.status === 'published' ? "#ecfdf5" : "#fef3c7",
                        color: ann.status === 'published' ? "#059669" : "#d97706"
                      }}>
                        {ann.status.charAt(0).toUpperCase() + ann.status.slice(1)}
                      </span>
                    </td>
                    <td style={{ padding: "16px 24px", textAlign: "right" }}>
                      <button onClick={() => setModal({ open: true, ann })} style={{ background: "none", border: "none", color: "#8b5e0a", cursor: "pointer", marginRight: "16px" }}><IconEdit /></button>
                      <button onClick={() => handleDelete(ann._id)} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer" }}><IconTrash /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      
      {modal.open && <AnnouncementModal announcement={modal.ann} onClose={() => setModal({ open: false, ann: null })} onSuccess={() => { setModal({ open: false, ann: null }); fetchAnnouncements(true); }} />}
    </div>
  );
}
