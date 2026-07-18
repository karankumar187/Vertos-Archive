import { useState, useEffect, useRef, useCallback } from "react";
import { archiveAPI } from "../services/api";
import { cacheGet, cacheSet } from "../utils/localCache";

/* ── Programmatic download via backend proxy — supports multi-file documents ── */
const handleDownload = async (doc) => {
  try {
    const totalFiles = (doc.files && doc.files.length) || 1;
    if (totalFiles <= 1) {
      // Single file — download normally
      const res = await archiveAPI.downloadDocument(doc._id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const ext = doc.fileType ? '.' + doc.fileType.split('/').pop().split('+')[0] : '.pdf';
      link.setAttribute('download', `${doc.title}${ext}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } else {
      // Multi-file — download each page sequentially with a short delay
      for (let i = 0; i < totalFiles; i++) {
        await new Promise(resolve => setTimeout(resolve, i === 0 ? 0 : 600));
        try {
          const res = await archiveAPI.downloadDocument(doc._id, i);
          const url = window.URL.createObjectURL(new Blob([res.data]));
          const link = document.createElement('a');
          link.href = url;
          const fileType = (doc.files[i] && doc.files[i].type) || doc.fileType || 'image/jpeg';
          const ext = '.' + fileType.split('/').pop().split('+')[0];
          link.setAttribute('download', `${doc.title} - Page ${i + 1}${ext}`);
          document.body.appendChild(link);
          link.click();
          link.parentNode.removeChild(link);
          window.URL.revokeObjectURL(url);
        } catch (pageErr) {
          console.error(`Download failed for page ${i + 1}:`, pageErr);
        }
      }
    }
  } catch (err) {
    console.error('Download failed:', err);
    window.open(getViewableUrl(doc.fileUrl, doc.title), '_blank');
  }
};

/* ── Image Gallery Modal ─────────────────────────────────── */
const API_BASE = (import.meta?.env?.VITE_API_URL) || 'http://localhost:5001/api';
const FILE_PROXY_BASE = API_BASE.replace('/api', '');

const getViewableUrl = (url, title = '', ext = '') => {
  if (!url || url === '#') return '#';
  if (url.startsWith('https://res.cloudinary.com/')) {
    let params = `url=${encodeURIComponent(url)}`;
    if (title) params += `&title=${encodeURIComponent(title)}`;
    if (ext) params += `&ext=${ext}`;
    return `${FILE_PROXY_BASE}/api/file/view?${params}`;
  }
  return url;
};

const isDocImage = (doc) => {
  const type = doc.fileType || (doc.files && doc.files.length > 0 && doc.files[0].type) || '';
  if (type.startsWith('image/')) return true;
  const url = doc.fileUrl || (doc.files && doc.files.length > 0 && doc.files[0].url) || '';
  const ext = url.split('.').pop().toLowerCase();
  return ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
};

function GalleryModal({ doc, onClose }) {
  const [index, setIndex] = useState(0);
  const allFiles = (doc.files && doc.files.length > 0) ? doc.files : [{ url: doc.fileUrl, type: doc.fileType }];
  const total = allFiles.length;
  const current = allFiles[index];
  const urlExt = current.url ? current.url.split('.').pop().toLowerCase() : '';
  const ext = current.type ? current.type.split('/').pop().split('+')[0] : urlExt;
  const isImage = (current.type || '').startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(urlExt);
  const proxiedUrl = getViewableUrl(current.url, doc.title, ext);
  const downloadUrl = proxiedUrl.includes('/api/file/view')
    ? proxiedUrl.replace('/api/file/view?', '/api/file/view?download=1&')
    : proxiedUrl;

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowRight') setIndex(i => Math.min(i + 1, total - 1));
      if (e.key === 'ArrowLeft') setIndex(i => Math.max(i - 1, 0));
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [total, onClose]);

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.88)', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center'
    }}>
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', justifyContent: 'space-between' }}>
          <span style={{ color: '#e8d5b0', fontFamily: "'Inter', sans-serif", fontSize: '0.9rem', fontWeight: 600 }}>
            {doc.title} &mdash; Page {index + 1} / {total}
          </span>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
        {/* Image shows inline; PDFs/docs open in new tab */}
        {isImage ? (
          <img src={proxiedUrl} alt={`Page ${index + 1}`} style={{ maxWidth: '85vw', maxHeight: '75vh', borderRadius: 12, objectFit: 'contain', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }} />
        ) : (
          <div style={{
            width: 420, maxWidth: '85vw', background: 'rgba(255,255,255,0.06)', borderRadius: 16,
            border: '1px solid rgba(200,134,26,0.25)', padding: '40px 32px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, textAlign: 'center'
          }}>
            <div style={{ fontSize: 64 }}>📄</div>
            <div>
              <p style={{ color: '#e8d5b0', fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', fontWeight: 700, margin: 0, marginBottom: 6 }}>{doc.title}</p>
              <p style={{ color: 'rgba(232,213,176,0.55)', fontFamily: "'Inter', sans-serif", fontSize: '0.8rem', margin: 0 }}>
                {ext ? ext.toUpperCase() : 'Document'} · Page {index + 1} of {total}
              </p>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'Inter', sans-serif", fontSize: '0.82rem', margin: 0 }}>
              PDF and document files open in a new tab for the best viewing experience.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <a href={proxiedUrl} target="_blank" rel="noopener noreferrer"
                style={{ padding: '10px 22px', background: 'linear-gradient(135deg, #c8861a, #d97706)', border: 'none', borderRadius: 9, color: '#fff', fontFamily: "'Inter', sans-serif", fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'none', transition: 'all 0.2s' }}>
                👁 Open Document
              </a>
              <a href={downloadUrl} target="_blank" rel="noopener noreferrer"
                style={{ padding: '10px 22px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(200,134,26,0.4)', borderRadius: 9, color: '#e8d5b0', fontFamily: "'Inter', sans-serif", fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'none', transition: 'all 0.2s' }}>
                ⬇ Download
              </a>
            </div>
          </div>
        )}
        {/* Navigation */}
        {total > 1 && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button onClick={() => setIndex(i => Math.max(i - 1, 0))} disabled={index === 0}
              style={{ background: index === 0 ? 'rgba(255,255,255,0.1)' : 'rgba(200,134,26,0.8)', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 20px', cursor: index === 0 ? 'not-allowed' : 'pointer', fontWeight: 600, fontFamily: "'Inter', sans-serif", transition: 'all 0.15s' }}>
              ← Prev
            </button>
            <div style={{ display: 'flex', gap: 6 }}>
              {allFiles.map((_, i) => (
                <button key={i} onClick={() => setIndex(i)} style={{ width: 10, height: 10, borderRadius: '50%', border: 'none', background: i === index ? '#c8861a' : 'rgba(255,255,255,0.35)', cursor: 'pointer', padding: 0, transition: 'all 0.15s' }} />
              ))}
            </div>
            <button onClick={() => setIndex(i => Math.min(i + 1, total - 1))} disabled={index === total - 1}
              style={{ background: index === total - 1 ? 'rgba(255,255,255,0.1)' : 'rgba(200,134,26,0.8)', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 20px', cursor: index === total - 1 ? 'not-allowed' : 'pointer', fontWeight: 600, fontFamily: "'Inter', sans-serif", transition: 'all 0.15s' }}>
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


/* ── Category metadata ─────────────────────────────────── */
const CATEGORIES = [
  {
    id: "notes",
    label: "Notes",
    color: "#c8861a",
    bg: "linear-gradient(135deg, #c8861a 0%, #e6a832 100%)",
    icon: () => (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <rect x="6" y="3" width="20" height="26" rx="3" stroke="white" strokeWidth="2" fill="none"/>
        <line x1="4" y1="8" x2="6" y2="8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        <line x1="4" y1="13" x2="6" y2="13" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        <line x1="4" y1="18" x2="6" y2="18" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        <line x1="10" y1="11" x2="22" y2="11" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        <line x1="10" y1="16" x2="22" y2="16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        <line x1="10" y1="21" x2="18" y2="21" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: "pyq",
    label: "PYQ",
    color: "#b45c3a",
    bg: "linear-gradient(135deg, #b45c3a 0%, #d4783e 100%)",
    icon: () => (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <path d="M8 6h14l6 6v18H8V6z" stroke="white" strokeWidth="2" fill="none" strokeLinejoin="round"/>
        <path d="M22 6v6h6" stroke="white" strokeWidth="2" strokeLinejoin="round" fill="none"/>
        <path d="M15 19a3 3 0 100-6 3 3 0 000 6z" stroke="white" strokeWidth="1.8" fill="none"/>
        <path d="M17.5 19.5l3 3" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: "syllabus",
    label: "Syllabus",
    color: "#5a6e3a",
    bg: "linear-gradient(135deg, #5a6e3a 0%, #7a9450 100%)",
    icon: () => (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <rect x="6" y="5" width="24" height="26" rx="3" stroke="white" strokeWidth="2" fill="none"/>
        <line x1="11" y1="12" x2="25" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        <line x1="11" y1="17" x2="25" y2="17" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        <line x1="11" y1="22" x2="19" y2="22" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="9.5" cy="12" r="1.5" fill="white"/>
        <circle cx="9.5" cy="17" r="1.5" fill="white"/>
        <circle cx="9.5" cy="22" r="1.5" fill="white"/>
      </svg>
    ),
  },
];

/* ── Course folder icon ─────────────────────────────────── */
const FolderIcon = ({ color = "#c8861a" }) => (
  <svg width="28" height="24" viewBox="0 0 28 24" fill="none">
    <path d="M2 5a2 2 0 012-2h6l2 2h12a2 2 0 012 2v13a2 2 0 01-2 2H4a2 2 0 01-2-2V5z" fill={color + "33"} stroke={color} strokeWidth="1.5"/>
    <path d="M2 9h24" stroke={color} strokeWidth="1.5"/>
  </svg>
);

/* ── File type icon ─────────────────────────────────── */
const FileIcon = ({ category }) => {
  const cat = CATEGORIES.find(c => c.id === category) || CATEGORIES[0];
  return (
    <div style={{
      width: 40, height: 40, borderRadius: 10, background: cat.bg,
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
    }}>
      <cat.icon />
    </div>
  );
};

/* ── Stats pill ─────────────────────────────────────── */
const StatPill = ({ icon, label, value }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 10,
    background: "#fff", borderRadius: 12, padding: "14px 20px",
    border: "1px solid #f0e6d2", boxShadow: "0 2px 8px rgba(160,110,40,0.06)"
  }}>
    <div style={{
      width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg,#fdf3e1,#fce4b3)",
      display: "flex", alignItems: "center", justifyContent: "center"
    }}>{icon}</div>
    <div>
      <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#1f1209", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: "0.75rem", color: "#9a7845", fontWeight: 500, marginTop: 2 }}>{label}</div>
    </div>
  </div>
);

/* ── Main Component ────────────────────────────────────── */
export default function ArchiveTab() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [courseSearch, setCourseSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [expandedCourse, setExpandedCourse] = useState(null);
  const [viewMode, setViewMode] = useState("folders"); // "folders" | "list"
  const [galleryDoc, setGalleryDoc] = useState(null); // doc to show in gallery modal
  const searchRef = useRef(null);
  const closeGallery = useCallback(() => setGalleryDoc(null), []);

  const PUBLIC_CATEGORIES = ["notes", "pyq", "syllabus"];

  const fetchArchive = async (background = false) => {
    try {
      if (!background) setLoading(true);
      const { data } = await archiveAPI.getArchive({});
      if (data.success) {
        const filtered = data.data.filter(d => PUBLIC_CATEGORIES.includes(d.category?.toLowerCase()));
        setDocuments(filtered);
        cacheSet("community_archive_all", filtered);
      }
    } catch (err) {
      console.error("Error fetching archive:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cached = cacheGet("community_archive_all");
    if (cached) {
      setDocuments(cached);
      setLoading(false);
      fetchArchive(true);
    } else {
      fetchArchive();
    }
  }, []);

  /* ── Derived data ───────────────────────────────── */
  const visibleDocs = documents.filter(doc => {
    const subjectMatch =
      courseSearch.trim() === "" ||
      doc.subject?.replace(/\s+/g, "").toUpperCase().includes(courseSearch.replace(/\s+/g, "").toUpperCase()) ||
      doc.title?.toLowerCase().includes(courseSearch.toLowerCase());
    const categoryMatch =
      categoryFilter === "all" || doc.category?.toLowerCase() === categoryFilter;
    return subjectMatch && categoryMatch;
  });

  const groupedDocs = visibleDocs.reduce((acc, doc) => {
    const key = doc.subject ? doc.subject.replace(/\s+/g, "").toUpperCase() : "OTHER";
    if (!acc[key]) acc[key] = [];
    acc[key].push(doc);
    return acc;
  }, {});
  const sortedCourses = Object.keys(groupedDocs).sort();

  const catCounts = PUBLIC_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = documents.filter(d => d.category?.toLowerCase() === cat).length;
    return acc;
  }, {});

  const recentDocs = [...documents].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  /* ── Styles ─────────────────────────────────────── */
  const inputStyle = {
    outline: "none", border: "none", background: "transparent",
    fontFamily: "'Inter', sans-serif", fontSize: "0.9rem", color: "#1f1209", width: "100%"
  };

  return (
    <>
      {galleryDoc && <GalleryModal doc={galleryDoc} onClose={closeGallery} />}
      <div style={{ display: "flex", gap: 28, alignItems: "flex-start" }}>

      {/* ── LEFT MAIN PANEL ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 28, minWidth: 0 }}>

        {/* Search Bar */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          background: "#fff", borderRadius: 14, padding: "12px 20px",
          border: "1.5px solid #f0e6d2", boxShadow: "0 4px 16px rgba(160,110,40,0.07)"
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9a7845" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            ref={searchRef}
            type="text"
            placeholder="Search by course code or document name…"
            value={courseSearch}
            onChange={e => { setCourseSearch(e.target.value); setExpandedCourse(null); }}
            style={inputStyle}
          />
          {courseSearch && (
            <button onClick={() => setCourseSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#9a7845", padding: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>

        {/* Category Cards */}
        <div>
          <h3 style={{ margin: "0 0 14px 0", fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", color: "#1f1209" }}>
            Categories
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(categoryFilter === cat.id ? "all" : cat.id)}
                style={{
                  background: categoryFilter === cat.id ? cat.bg : "#fff",
                  border: categoryFilter === cat.id ? "none" : "1.5px solid #f0e6d2",
                  borderRadius: 16, padding: "18px 20px", cursor: "pointer",
                  textAlign: "left", transition: "all 0.22s",
                  boxShadow: categoryFilter === cat.id
                    ? `0 8px 24px ${cat.color}40`
                    : "0 2px 8px rgba(160,110,40,0.05)"
                }}
                onMouseEnter={e => { if (categoryFilter !== cat.id) e.currentTarget.style.borderColor = cat.color; }}
                onMouseLeave={e => { if (categoryFilter !== cat.id) e.currentTarget.style.borderColor = "#f0e6d2"; }}
              >
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: categoryFilter === cat.id ? "rgba(255,255,255,0.25)" : cat.bg,
                  display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12
                }}>
                  <cat.icon />
                </div>
                <div style={{
                  fontWeight: 700, fontSize: "1rem",
                  color: categoryFilter === cat.id ? "#fff" : "#1f1209",
                  fontFamily: "'Inter', sans-serif"
                }}>{cat.label}</div>
                <div style={{
                  fontSize: "0.8rem", marginTop: 3,
                  color: categoryFilter === cat.id ? "rgba(255,255,255,0.8)" : "#9a7845"
                }}>{catCounts[cat.id] || 0} resources</div>
              </button>
            ))}
          </div>
        </div>

        {/* Courses / Files Section */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", color: "#1f1209" }}>
              {courseSearch ? `Results for "${courseSearch}"` : categoryFilter !== "all" ? `${CATEGORIES.find(c=>c.id===categoryFilter)?.label} Resources` : "All Courses"}
            </h3>
            <div style={{ display: "flex", gap: 6, background: "#fff", border: "1px solid #f0e6d2", borderRadius: 10, padding: 4 }}>
              {[["folders", (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>
              )], ["list", (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              )]].map(([mode, icon]) => (
                <button key={mode} onClick={() => setViewMode(mode)} style={{
                  padding: "6px 10px", border: "none", borderRadius: 8, cursor: "pointer",
                  background: viewMode === mode ? "#fdf3e1" : "transparent",
                  color: viewMode === mode ? "#c8861a" : "#9a7845", transition: "all 0.18s"
                }}>{icon}</button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ height: 60, borderRadius: 12, background: "linear-gradient(90deg,#f8f4ee,#f0e6d2,#f8f4ee)", backgroundSize: "200%", animation: "shimmer 1.4s infinite" }}/>
              ))}
            </div>
          ) : visibleDocs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 20px", background: "#fff", borderRadius: 16, border: "1.5px dashed #e9dcc8" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d4b896" strokeWidth="1.5" style={{ marginBottom: 16 }}>
                <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>
                <line x1="12" y1="11" x2="12" y2="15"/><circle cx="12" cy="17" r="0.5" fill="#d4b896"/>
              </svg>
              <p style={{ margin: 0, fontWeight: 700, color: "#1f1209", fontSize: "1rem" }}>
                {courseSearch || categoryFilter !== "all" ? `No resources found for "${courseSearch || categoryFilter}"` : "No resources yet"}
              </p>
              <p style={{ margin: "6px 0 0", color: "#9a7845", fontSize: "0.85rem" }}>
                {courseSearch || categoryFilter !== "all" ? "Try a different search or category." : "Be the first to contribute!"}
              </p>
            </div>
          ) : viewMode === "folders" ? (
            /* FOLDER GRID VIEW */
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {sortedCourses.map(course => (
                <div key={course} style={{
                  background: "#fff", borderRadius: 14,
                  border: `1.5px solid ${expandedCourse === course ? "#c8861a" : "#f0e6d2"}`,
                  overflow: "hidden", transition: "border-color 0.2s",
                  boxShadow: expandedCourse === course ? "0 4px 20px rgba(200,134,26,0.1)" : "0 2px 8px rgba(160,110,40,0.04)"
                }}>
                  <button
                    onClick={() => setExpandedCourse(expandedCourse === course ? null : course)}
                    style={{
                      width: "100%", padding: "16px 20px", display: "flex", alignItems: "center", gap: 16,
                      background: "transparent", border: "none", cursor: "pointer", textAlign: "left"
                    }}
                  >
                    <FolderIcon color={expandedCourse === course ? "#c8861a" : "#b47a18"} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: "1rem", color: "#1f1209", fontFamily: "'Inter', sans-serif" }}>{course}</div>
                      <div style={{ fontSize: "0.78rem", color: "#9a7845", marginTop: 2 }}>{groupedDocs[course].length} resource{groupedDocs[course].length > 1 ? "s" : ""}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {/* category pills */}
                      {[...new Set(groupedDocs[course].map(d => d.category))].map(cat => {
                        const c = CATEGORIES.find(x => x.id === cat);
                        return c ? (
                          <span key={cat} style={{ fontSize: "0.68rem", fontWeight: 700, background: c.color + "22", color: c.color, padding: "3px 8px", borderRadius: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                            {c.label}
                          </span>
                        ) : null;
                      })}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9a7845" strokeWidth="2.2"
                        style={{ transform: expandedCourse === course ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s", marginLeft: 4 }}>
                        <path d="m6 9 6 6 6-6"/>
                      </svg>
                    </div>
                  </button>

                  {(expandedCourse === course || (courseSearch.trim() && sortedCourses.length === 1)) && (
                    <div style={{ borderTop: "1.5px solid #f0e6d2", overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Inter', sans-serif", fontSize: "0.84rem", minWidth: 600 }}>
                        <thead>
                          <tr style={{ background: "#fdfaf5", textAlign: "left" }}>
                            {["Document", "Category", "Uploader", "Action"].map((h, i) => (
                              <th key={h} style={{ padding: "11px 18px", color: "#9a7845", fontWeight: 600, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: i === 3 ? "right" : "left" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {groupedDocs[course].map(doc => {
                            const cat = CATEGORIES.find(c => c.id === doc.category) || CATEGORIES[0];
                            return (
                              <tr key={doc._id} style={{ borderTop: "1px solid #f8f4f0", transition: "background 0.15s" }}
                                onMouseEnter={e => e.currentTarget.style.background = "#fdfaf5"}
                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                <td style={{ padding: "13px 18px", display: "flex", alignItems: "center", gap: 12 }}>
                                  <FileIcon category={doc.category} />
                                  <div>
                                    <div style={{ fontWeight: 600, color: "#1f1209" }}>{doc.title}</div>
                                    {doc.pageCount > 0 && <div style={{ fontSize: "0.73rem", color: "#9a7845", marginTop: 2 }}>{doc.pageCount} pages</div>}
                                  </div>
                                </td>
                                <td style={{ padding: "13px 18px" }}>
                                  <span style={{ fontSize: "0.72rem", fontWeight: 700, background: cat.color + "20", color: cat.color, padding: "4px 10px", borderRadius: 8, textTransform: "capitalize" }}>{cat.label}</span>
                                </td>
                                <td style={{ padding: "13px 18px", color: "#6b4d1f", fontWeight: 500 }}>{doc.uploaderID?.name || "Anonymous"}</td>
                                <td style={{ padding: "13px 18px", textAlign: "right" }}>
                                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                                    {isDocImage(doc) ? (
                                      <button onClick={() => setGalleryDoc(doc)} style={{
                                        display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer",
                                        fontSize: "0.82rem", fontWeight: 600, color: "#c8861a", background: "transparent",
                                        border: "1.5px solid #e9dcc8", padding: "7px 14px", borderRadius: 9,
                                        transition: "all 0.18s"
                                      }}
                                      onMouseEnter={e => { e.currentTarget.style.background = "#fdf3e1"; e.currentTarget.style.borderColor = "#c8861a"; }}
                                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "#e9dcc8"; }}>
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                                        View
                                      </button>
                                    ) : (
                                      <a href={getViewableUrl(doc.fileUrl, doc.title)} target="_blank" rel="noopener noreferrer" style={{
                                        display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", textDecoration: "none",
                                        fontSize: "0.82rem", fontWeight: 600, color: "#c8861a", background: "transparent",
                                        border: "1.5px solid #e9dcc8", padding: "7px 14px", borderRadius: 9,
                                        transition: "all 0.18s"
                                      }}
                                      onMouseEnter={e => { e.currentTarget.style.background = "#fdf3e1"; e.currentTarget.style.borderColor = "#c8861a"; }}
                                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "#e9dcc8"; }}>
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                                        View
                                      </a>
                                    )}
                                    <button
                                      onClick={() => handleDownload(doc)}
                                      style={{
                                        display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer",
                                        fontSize: "0.82rem", fontWeight: 600, color: "#6b4d1f",
                                        background: "#f8f4ee", border: "1.5px solid #f0e6d2", padding: "7px 14px", borderRadius: 9,
                                        textDecoration: "none", transition: "all 0.18s"
                                      }}
                                      onMouseEnter={e => { e.currentTarget.style.background = "#e9dcc8"; e.currentTarget.style.borderColor = "#d4b896"; }}
                                      onMouseLeave={e => { e.currentTarget.style.background = "#f8f4ee"; e.currentTarget.style.borderColor = "#f0e6d2"; }}>
                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                      Download
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* FLAT LIST VIEW */
            <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #f0e6d2", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Inter', sans-serif", fontSize: "0.84rem" }}>
                <thead>
                  <tr style={{ background: "#fdfaf5" }}>
                    {["Document", "Course", "Category", "Uploader", "Action"].map((h, i) => (
                      <th key={h} style={{ padding: "12px 18px", color: "#9a7845", fontWeight: 600, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: i === 4 ? "right" : "left", borderBottom: "1.5px solid #f0e6d2" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleDocs.map(doc => {
                    const cat = CATEGORIES.find(c => c.id === doc.category) || CATEGORIES[0];
                    return (
                      <tr key={doc._id} style={{ borderBottom: "1px solid #f8f4f0", transition: "background 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#fdfaf5"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <td style={{ padding: "13px 18px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <FileIcon category={doc.category} />
                            <div>
                              <div style={{ fontWeight: 600, color: "#1f1209" }}>{doc.title}</div>
                              {doc.pageCount > 0 && <div style={{ fontSize: "0.72rem", color: "#9a7845" }}>{doc.pageCount} pages</div>}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "13px 18px", fontWeight: 600, color: "#6b4d1f" }}>{doc.subject?.replace(/\s+/g, "").toUpperCase()}</td>
                        <td style={{ padding: "13px 18px" }}>
                          <span style={{ fontSize: "0.72rem", fontWeight: 700, background: cat.color + "20", color: cat.color, padding: "4px 10px", borderRadius: 8 }}>{cat.label}</span>
                        </td>
                        <td style={{ padding: "13px 18px", color: "#6b4d1f" }}>{doc.uploaderID?.name || "Anonymous"}</td>
                        <td style={{ padding: "13px 18px", textAlign: "right" }}>
                          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                            {isDocImage(doc) ? (
                              <button onClick={() => setGalleryDoc(doc)} style={{
                                display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer",
                                fontSize: "0.82rem", fontWeight: 600, color: "#c8861a", background: "transparent",
                                border: "1.5px solid #e9dcc8", padding: "7px 14px", borderRadius: 9,
                                transition: "all 0.18s"
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = "#fdf3e1"; e.currentTarget.style.borderColor = "#c8861a"; }}
                              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "#e9dcc8"; }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                                View
                              </button>
                            ) : (
                              <a href={getViewableUrl(doc.fileUrl, doc.title)} target="_blank" rel="noopener noreferrer" style={{
                                display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", textDecoration: "none",
                                fontSize: "0.82rem", fontWeight: 600, color: "#c8861a", background: "transparent",
                                border: "1.5px solid #e9dcc8", padding: "7px 14px", borderRadius: 9,
                                transition: "all 0.18s"
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = "#fdf3e1"; e.currentTarget.style.borderColor = "#c8861a"; }}
                              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "#e9dcc8"; }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                                View
                              </a>
                            )}
                            <button
                              onClick={() => handleDownload(doc)}
                              style={{
                                display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer",
                                fontSize: "0.82rem", fontWeight: 600, color: "#6b4d1f",
                                background: "#f8f4ee", border: "1.5px solid #f0e6d2", padding: "7px 14px", borderRadius: 9,
                                textDecoration: "none", transition: "all 0.18s"
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = "#e9dcc8"; e.currentTarget.style.borderColor = "#d4b896"; }}
                              onMouseLeave={e => { e.currentTarget.style.background = "#f8f4ee"; e.currentTarget.style.borderColor = "#f0e6d2"; }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                              Download
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT SIDEBAR ── */}
      <div style={{ width: 280, flexShrink: 0, display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Stats */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #f0e6d2", padding: 20, boxShadow: "0 4px 16px rgba(160,110,40,0.06)" }}>
          <h4 style={{ margin: "0 0 16px 0", fontFamily: "'Playfair Display', serif", fontSize: "1rem", color: "#1f1209" }}>Archive Stats</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { label: "Total Resources", value: documents.length, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c8861a" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg> },
              { label: "Courses Covered", value: Object.keys(documents.reduce((a,d)=>{a[d.subject||"?"]=1;return a},{})).length, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c8861a" strokeWidth="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg> },
              { label: "Notes", value: catCounts.notes || 0, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c8861a" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> },
              { label: "PYQs", value: catCounts.pyq || 0, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c8861a" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
              { label: "Syllabi", value: catCounts.syllabus || 0, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c8861a" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> },
            ].map(({ label, value, icon }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f8f4f0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#6b4d1f", fontSize: "0.85rem" }}>
                  {icon} {label}
                </div>
                <span style={{ fontWeight: 700, color: "#1f1209", fontSize: "0.95rem" }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Uploads */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #f0e6d2", padding: 20, boxShadow: "0 4px 16px rgba(160,110,40,0.06)" }}>
          <h4 style={{ margin: "0 0 16px 0", fontFamily: "'Playfair Display', serif", fontSize: "1rem", color: "#1f1209" }}>Recent Uploads</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {recentDocs.length === 0 ? (
              <p style={{ color: "#9a7845", fontSize: "0.83rem", margin: 0 }}>No uploads yet.</p>
            ) : recentDocs.map(doc => {
              const cat = CATEGORIES.find(c => c.id === doc.category) || CATEGORIES[0];
              return (
                <React.Fragment key={doc._id}>
                  {isDocImage(doc) ? (
                    <button onClick={() => setGalleryDoc(doc)}
                      style={{ display: "flex", alignItems: "center", gap: 12, border: "none", background: "transparent", cursor: "pointer", width: "100%", textAlign: "left", padding: "8px 0", borderBottom: "1px solid #f8f4f0", transition: "all 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "#fdfaf5"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                      <div style={{ width: 36, height: 36, borderRadius: 9, background: cat.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <cat.icon />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: "0.83rem", color: "#1f1209", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{doc.title}</div>
                        <div style={{ fontSize: "0.72rem", color: "#9a7845", marginTop: 1 }}>{doc.subject?.replace(/\s+/g, "").toUpperCase()} · {cat.label}</div>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c8861a" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/>
                      </svg>
                    </button>
                  ) : (
                    <a href={getViewableUrl(doc.fileUrl, doc.title)} target="_blank" rel="noopener noreferrer"
                      style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", background: "transparent", width: "100%", padding: "8px 0", borderBottom: "1px solid #f8f4f0", transition: "all 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "#fdfaf5"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                      <div style={{ width: 36, height: 36, borderRadius: 9, background: cat.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <cat.icon />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: "0.83rem", color: "#1f1209", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{doc.title}</div>
                        <div style={{ fontSize: "0.72rem", color: "#9a7845", marginTop: 1 }}>{doc.subject?.replace(/\s+/g, "").toUpperCase()} · {cat.label}</div>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c8861a" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/>
                      </svg>
                    </a>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Quick filter chips */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #f0e6d2", padding: 20, boxShadow: "0 4px 16px rgba(160,110,40,0.06)" }}>
          <h4 style={{ margin: "0 0 14px 0", fontFamily: "'Playfair Display', serif", fontSize: "1rem", color: "#1f1209" }}>Quick Filter</h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {["all", ...CATEGORIES.map(c => c.id)].map(id => {
              const cat = CATEGORIES.find(c => c.id === id);
              const active = categoryFilter === id;
              return (
                <button key={id} onClick={() => setCategoryFilter(id)} style={{
                  padding: "6px 14px", borderRadius: 100, border: "1.5px solid",
                  borderColor: active ? (cat?.color || "#c8861a") : "#e9dcc8",
                  background: active ? (cat?.color || "#c8861a") : "#fdfaf5",
                  color: active ? "#fff" : "#6b4d1f",
                  fontWeight: 600, fontSize: "0.78rem", cursor: "pointer", transition: "all 0.18s",
                  fontFamily: "'Inter', sans-serif"
                }}>
                  {id === "all" ? "All" : cat?.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
    </div>
    </>
  );
}
