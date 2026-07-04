import { useState, useEffect } from "react";
import { adminAPI } from "../services/api";

const CATEGORIES = [
  { label: "Notes",          value: "notes" },
  { label: "Syllabus",       value: "syllabus" },
  { label: "Previous Papers",value: "pyq" },
  { label: "University Info",value: "university" },
];

function ReviewModal({ doc, mode, onClose, onSuccess }) {
    const [form, setForm] = useState({
        title: doc.title || '',
        subject: doc.subject || '',
        category: doc.category || '',
        reviewComment: '',
    });
    const [loading, setLoading] = useState(false);
    const [showExtractedText, setShowExtractedText] = useState(false);

    const isApprove = mode === 'approve';

    const handleSubmit = async () => {
        setLoading(true);
        try {
            if (isApprove) {
                const { data } = await adminAPI.approveUpload(doc._id, {
                    title: form.title,
                    subject: form.subject,
                    category: form.category,
                    reviewComment: form.reviewComment,
                });
                if (data.success) onSuccess(doc._id);
            } else {
                if (!form.reviewComment.trim()) {
                    alert("Please write a rejection reason.");
                    setLoading(false);
                    return;
                }
                const { data } = await adminAPI.rejectUpload(doc._id, form.reviewComment);
                if (data.success) onSuccess(doc._id);
            }
        } catch (err) {
            console.error(err);
            alert(`${isApprove ? 'Approval' : 'Rejection'} failed.`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(31,18,9,0.55)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        }} onClick={onClose}>
            <div className="mobile-p-sm" style={{
                background: '#fff', borderRadius: '18px', padding: '32px',
                width: '100%', maxWidth: '560px',
                boxShadow: '0 20px 60px rgba(30,10,0,0.22)',
                border: '1px solid #e9dcc8',
                position: 'relative',
            }} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '1.4rem' }}>{isApprove ? '✅' : '❌'}</span>
                        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3rem', fontWeight: 700, color: '#1f1209' }}>
                            {isApprove ? 'Approve Document' : 'Reject Document'}
                        </h2>
                    </div>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.82rem', color: '#9a7845' }}>
                        {isApprove
                            ? "You can edit the title, subject, and category before approving. Your note will be visible to the uploader."
                            : "Please provide a clear reason for rejection so the student can improve their submission."}
                    </p>
                </div>

                {/* Preview File Link & Extracted Text */}
                <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#fdfaf5', border: '1px solid #e9dcc8', borderRadius: showExtractedText ? '8px 8px 0 0' : '8px' }}>
                        <span style={{ fontSize: '1rem' }}>📄</span>
                        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.82rem', fontWeight: 600, color: '#3d2800', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {doc.title}
                        </span>
                        <button onClick={() => setShowExtractedText(!showExtractedText)}
                            style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.78rem', color: '#8b6535', fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer', padding: '3px 6px' }}>
                            {showExtractedText ? 'Hide Data' : 'View Data'}
                        </button>
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                            style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.78rem', color: '#c8861a', fontWeight: 600, textDecoration: 'none', flexShrink: 0, border: '1px solid #e8c96a', borderRadius: '6px', padding: '3px 10px' }}>
                            Preview ↗
                        </a>
                    </div>
                    
                    {showExtractedText && (
                        <div style={{ background: '#fcfaf7', border: '1px solid #e9dcc8', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '12px' }}>
                            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', fontWeight: 600, color: '#8b6535', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Extracted Data (Preview)</p>
                            <div style={{ 
                                background: '#fff', border: '1px solid #eee', borderRadius: '6px', 
                                padding: '12px', maxHeight: '180px', overflowY: 'auto',
                                fontFamily: "'Inter', sans-serif", fontSize: '0.8rem', color: '#333', lineHeight: 1.6, whiteSpace: 'pre-wrap'
                            }}>
                                {doc.extractedText ? doc.extractedText : <span style={{ color: '#9a7845', fontStyle: 'italic' }}>Extracted text is sparse or pending OCR. It will be generated during pipeline processing.</span>}
                            </div>
                        </div>
                    )}
                </div>

                {/* Editable fields — only shown for approve */}
                {isApprove && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                        <div>
                            <label style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', fontWeight: 600, color: '#5c4021', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                                Title
                            </label>
                            <input
                                type="text"
                                value={form.title}
                                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                style={{ width: '100%', padding: '9px 13px', border: '1px solid #ddd0b8', borderRadius: '8px', fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: '#1f1209', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                                onFocus={e => e.target.style.borderColor = '#c8861a'}
                                onBlur={e => e.target.style.borderColor = '#ddd0b8'}
                            />
                        </div>
                        <div className="mobile-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', fontWeight: 600, color: '#5c4021', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                                    Subject / Course Code
                                </label>
                                <input
                                    type="text"
                                    value={form.subject}
                                    onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                                    placeholder="e.g. CSE332"
                                    style={{ width: '100%', padding: '9px 13px', border: '1px solid #ddd0b8', borderRadius: '8px', fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: '#1f1209', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                                    onFocus={e => e.target.style.borderColor = '#c8861a'}
                                    onBlur={e => e.target.style.borderColor = '#ddd0b8'}
                                />
                            </div>
                            <div>
                                <label style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', fontWeight: 600, color: '#5c4021', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                                    Category
                                </label>
                                <select
                                    value={form.category}
                                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                                    style={{ width: '100%', padding: '9px 13px', border: '1px solid #ddd0b8', borderRadius: '8px', fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: '#1f1209', outline: 'none', background: '#fff', boxSizing: 'border-box', cursor: 'pointer' }}
                                >
                                    {CATEGORIES.map(c => (
                                        <option key={c.value} value={c.value}>{c.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* Review note / rejection reason */}
                <div style={{ marginBottom: '24px' }}>
                    <label style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', fontWeight: 600, color: '#5c4021', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                        {isApprove ? 'Note for Student (optional)' : 'Rejection Reason *'}
                    </label>
                    <textarea
                        value={form.reviewComment}
                        onChange={e => setForm(f => ({ ...f, reviewComment: e.target.value }))}
                        placeholder={isApprove
                            ? "e.g. Great submission! Minor formatting issues corrected."
                            : "e.g. This document appears to be a duplicate. Please upload a different version."}
                        rows={3}
                        style={{ width: '100%', padding: '10px 13px', border: '1px solid #ddd0b8', borderRadius: '8px', fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: '#1f1209', outline: 'none', resize: 'vertical', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                        onFocus={e => e.target.style.borderColor = isApprove ? '#c8861a' : '#dc2626'}
                        onBlur={e => e.target.style.borderColor = '#ddd0b8'}
                    />
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button onClick={onClose} disabled={loading}
                        style={{ padding: '10px 20px', background: '#fff', border: '1px solid #ddd0b8', borderRadius: '9px', fontFamily: "'Inter', sans-serif", fontSize: '0.85rem', fontWeight: 600, color: '#5c4021', cursor: 'pointer' }}>
                        Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={loading}
                        style={{
                            padding: '10px 24px',
                            background: isApprove ? 'linear-gradient(135deg, #16a34a, #15803d)' : 'linear-gradient(135deg, #dc2626, #b91c1c)',
                            border: 'none', borderRadius: '9px',
                            fontFamily: "'Inter', sans-serif", fontSize: '0.85rem', fontWeight: 600, color: '#fff',
                            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                            boxShadow: isApprove ? '0 3px 12px rgba(22,163,74,0.25)' : '0 3px 12px rgba(220,38,38,0.25)',
                        }}>
                        {loading ? '...' : isApprove ? '✓ Approve' : '✗ Reject'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function AdminDashboardPage() {
    const [pendingDocs, setPendingDocs] = useState([]);
    const [liveDocs, setLiveDocs] = useState([]);
    const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'live'
    const [loading, setLoading] = useState(true);
    const [duplicateChecks, setDuplicateChecks] = useState({});
    const [modal, setModal] = useState(null); // { doc, mode: 'approve'|'reject' }
    const [expandedCourse, setExpandedCourse] = useState(null);
    const [textPreviewDoc, setTextPreviewDoc] = useState(null);
    const [pendingCategoryFilter, setPendingCategoryFilter] = useState('all');

    useEffect(() => {
        if (activeTab === 'pending') {
            fetchPending();
        } else {
            fetchLiveDocs();
        }
    }, [activeTab]);

    const fetchPending = async () => {
        try {
            setLoading(true);
            const { data } = await adminAPI.getPending();
            if (data.success) {
                setPendingDocs(data.data);
            }
        } catch (error) {
            console.error("Failed to fetch pending documents", error);
            alert("Failed to load moderation queue.");
        } finally {
            setLoading(false);
        }
    };

    const fetchLiveDocs = async () => {
        try {
            setLoading(true);
            const { data } = await adminAPI.getLiveDocuments();
            if (data.success) {
                setLiveDocs(data.data);
            }
        } catch (error) {
            console.error("Failed to fetch live documents", error);
            alert("Failed to load live documents.");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteDoc = async (id) => {
        if (!window.confirm("Are you sure you want to permanently delete this document from MongoDB, Cloudinary, and Qdrant? This cannot be undone.")) return;
        
        try {
            const { data } = await adminAPI.deleteDocument(id);
            if (data.success) {
                setLiveDocs(prev => prev.filter(d => d._id !== id));
            }
        } catch (err) {
            console.error(err);
            alert("Failed to delete document.");
        }
    };

    const handleSuccess = (id) => {
        setPendingDocs(prev => prev.filter(doc => doc._id !== id));
        setModal(null);
    };

    const handleCheckDuplicate = async (doc) => {
        try {
            setDuplicateChecks(prev => ({ ...prev, [doc._id]: 'checking' }));
            const { data } = await adminAPI.checkDuplicate({ title: doc.title, subject: doc.subject, category: doc.category });
            setDuplicateChecks(prev => ({
                ...prev,
                [doc._id]: data.isLikelyDuplicate ? `⚠️ ${data.duplicates.length} duplicate(s)` : '✅ Clean'
            }));
        } catch (error) {
            setDuplicateChecks(prev => ({ ...prev, [doc._id]: '❌ Failed' }));
        }
    };

    const filteredPendingDocs = pendingCategoryFilter === 'all' 
        ? pendingDocs 
        : pendingDocs.filter(doc => doc.category === pendingCategoryFilter);

    const groupedLiveDocs = liveDocs.reduce((acc, doc) => {
        const subject = (doc.subject || 'Unknown').toUpperCase();
        if (!acc[subject]) acc[subject] = [];
        acc[subject].push(doc);
        return acc;
    }, {});
    const sortedCourses = Object.keys(groupedLiveDocs).sort();

    return (
        <div style={{ maxWidth: "1200px", margin: "40px auto", padding: "0 24px", width: "100%" }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.2rem", color: "#1f1209", marginBottom: "8px" }}>
                        Admin <span style={{ color: "#c8861a" }}>Dashboard</span>
                    </h1>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "1rem", color: "#7a5a2a" }}>
                        Manage moderation queue and live documents.
                    </p>
                </div>
                
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {activeTab === 'pending' && (
                        <select 
                            value={pendingCategoryFilter}
                            onChange={(e) => setPendingCategoryFilter(e.target.value)}
                            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd0b8', background: '#fff', color: '#5c4021', fontFamily: "'Inter', sans-serif", fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
                        >
                            <option value="all">All Categories</option>
                            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                    )}
                    <div style={{ display: 'flex', gap: '8px', background: '#fdfaf5', padding: '6px', borderRadius: '12px', border: '1px solid #e9dcc8' }}>
                        <button onClick={() => setActiveTab('pending')}
                        style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: activeTab === 'pending' ? '#c8861a' : 'transparent', color: activeTab === 'pending' ? '#fff' : '#8b6535', fontWeight: 600, cursor: 'pointer', transition: '0.2s' }}>
                        Pending Queue
                    </button>
                    <button onClick={() => setActiveTab('live')}
                        style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: activeTab === 'live' ? '#c8861a' : 'transparent', color: activeTab === 'live' ? '#fff' : '#8b6535', fontWeight: 600, cursor: 'pointer', transition: '0.2s' }}>
                        Live Documents
                    </button>
                </div>
            </div>

            <div style={{ background: "#ffffff", border: "1px solid #e9dcc8", borderRadius: "16px", overflowX: "auto", overflowY: "hidden", boxShadow: "0 4px 20px rgba(160,110,40,0.06)" }}>
                {loading ? (
                    <div style={{ padding: "40px", textAlign: "center", color: "#8b6535", fontFamily: "'Inter', sans-serif" }}>Loading queue...</div>
                ) : activeTab === 'pending' && filteredPendingDocs.length === 0 ? (
                    <div style={{ padding: "60px 40px", textAlign: "center" }}>
                        <div style={{ fontSize: "40px", marginBottom: "16px" }}>🎉</div>
                        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.4rem", color: "#1f1209" }}>{pendingDocs.length === 0 ? 'All caught up!' : 'No documents found'}</h3>
                        <p style={{ fontFamily: "'Inter', sans-serif", color: "#9a7845", marginTop: "8px" }}>{pendingDocs.length === 0 ? 'There are no pending documents in the queue.' : 'No pending documents match the selected category.'}</p>
                    </div>
                ) : activeTab === 'live' && liveDocs.length === 0 ? (
                    <div style={{ padding: "60px 40px", textAlign: "center" }}>
                        <p style={{ fontFamily: "'Inter', sans-serif", color: "#9a7845", marginTop: "8px" }}>No live documents found.</p>
                    </div>
                ) : activeTab === 'pending' ? (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Inter', sans-serif", fontSize: "0.9rem" }}>
                        <thead>
                            <tr style={{ background: "#fdfaf5", borderBottom: "1px solid #e9dcc8", textAlign: "left", color: "#8b6535", textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.05em" }}>
                                <th style={{ padding: "16px 20px" }}>Document</th>
                                <th style={{ padding: "16px 20px" }}>Category / Subject</th>
                                <th style={{ padding: "16px 20px" }}>Uploader</th>
                                <th style={{ padding: "16px 20px" }}>Duplicate Check</th>
                                <th style={{ padding: "16px 20px", textAlign: "right" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPendingDocs.map(doc => (
                                <tr key={doc._id} style={{ borderBottom: "1px solid #f0e8d8", transition: "background 0.15s" }}
                                    onMouseEnter={e => e.currentTarget.style.background = "#fdfaf8"}
                                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                    <td style={{ padding: "16px 20px", maxWidth: "280px" }}>
                                        <p style={{ fontWeight: 600, color: "#1f1209", marginBottom: "6px", wordBreak: "break-word" }}>{doc.title}</p>
                                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                                                style={{ color: "#c8861a", textDecoration: "none", fontSize: "0.78rem", fontWeight: 500, border: "1px solid #e8c96a", borderRadius: "5px", padding: "2px 8px" }}>
                                                Preview ↗
                                            </a>
                                            <span style={{ color: "#9a7845", fontSize: "0.78rem" }}>
                                                {(doc.fileSize / 1024 / 1024).toFixed(2)} MB
                                            </span>
                                            {doc.files && doc.files.length > 1 && (
                                                <span style={{ fontSize: "0.72rem", color: "#c8861a", background: "#fef3dc", padding: "2px 7px", borderRadius: "4px", fontWeight: 600 }}>
                                                    {doc.files.length} pages
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: "16px 20px" }}>
                                        <span style={{ display: "inline-block", padding: "4px 10px", background: "#fef3dc", border: "1px solid #e8c96a", borderRadius: "99px", color: "#7a4f0d", fontSize: "0.7rem", fontWeight: 600, textTransform: "capitalize", marginBottom: "6px" }}>
                                            {doc.category}
                                        </span>
                                        <p style={{ color: "#5c4021", fontSize: "0.85rem" }}>{doc.subject}</p>
                                    </td>
                                    <td style={{ padding: "16px 20px" }}>
                                        <p style={{ color: "#1f1209", fontWeight: 500 }}>{doc.uploaderId?.name || "Unknown"}</p>
                                        <p style={{ color: "#9a7845", fontSize: "0.8rem" }}>{new Date(doc.uploadedAt).toLocaleDateString()}</p>
                                    </td>
                                    <td style={{ padding: "16px 20px" }}>
                                        {duplicateChecks[doc._id] ? (
                                            <span style={{
                                                fontSize: "0.8rem", fontWeight: 600,
                                                color: duplicateChecks[doc._id].includes('⚠️') ? '#b45309' : duplicateChecks[doc._id].includes('checking') ? '#8b6535' : '#16a34a'
                                            }}>
                                                {duplicateChecks[doc._id] === 'checking' ? '⏳ Checking...' : duplicateChecks[doc._id]}
                                            </span>
                                        ) : (
                                            <button onClick={() => handleCheckDuplicate(doc)}
                                                style={{ padding: "6px 12px", background: "#fdfaf5", border: "1px solid #e9dcc8", borderRadius: "6px", color: "#7a5a2a", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
                                                onMouseEnter={e => e.currentTarget.style.borderColor = "#c8861a"}
                                                onMouseLeave={e => e.currentTarget.style.borderColor = "#e9dcc8"}>
                                                Run Check
                                            </button>
                                        )}
                                    </td>
                                    <td style={{ padding: "16px 20px", textAlign: "right" }}>
                                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                                            <button onClick={() => setModal({ doc, mode: 'approve' })}
                                                style={{ padding: "8px 16px", background: "linear-gradient(135deg, #16a34a, #15803d)", border: "none", borderRadius: "8px", color: "#fff", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 8px rgba(22,163,74,0.2)", transition: "opacity 0.15s" }}
                                                onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
                                                onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
                                                ✓ Approve
                                            </button>
                                            <button onClick={() => setModal({ doc, mode: 'reject' })}
                                                style={{ padding: "8px 16px", background: "#fff", border: "1px solid #dc2626", borderRadius: "8px", color: "#dc2626", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
                                                onMouseEnter={e => { e.currentTarget.style.background = "#fef2f2"; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = "#fff"; }}>
                                                ✗ Reject
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {sortedCourses.length === 0 && (
                            <p style={{ textAlign: "center", padding: "40px", color: "#9a7845", fontSize: "0.9rem" }}>No live documents found.</p>
                        )}
                        {sortedCourses.map(course => (
                            <div key={course} style={{ background: '#fff', border: '1px solid #e9dcc8', borderRadius: '12px', overflow: 'hidden' }}>
                                {/* Course Header */}
                                <button 
                                    onClick={() => setExpandedCourse(expandedCourse === course ? null : course)}
                                    style={{ 
                                        width: '100%', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        background: expandedCourse === course ? '#fcfaf7' : '#fff', border: 'none', cursor: 'pointer',
                                        transition: 'background 0.2s', textAlign: 'left'
                                    }}
                                    onMouseEnter={e => { if (expandedCourse !== course) e.currentTarget.style.background = '#fcfaf7'; }}
                                    onMouseLeave={e => { if (expandedCourse !== course) e.currentTarget.style.background = '#fff'; }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ fontSize: '1.2rem' }}>📚</span>
                                        <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: '1rem', fontWeight: 600, color: '#3d2800', margin: 0 }}>
                                            {course}
                                        </h3>
                                        <span style={{ background: '#fdf3e1', color: '#b47a18', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                                            {groupedLiveDocs[course].length} docs
                                        </span>
                                    </div>
                                    <span style={{ color: '#9a7845', transform: expandedCourse === course ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
                                </button>
                                
                                {/* Expanded Documents */}
                                {expandedCourse === course && (
                                    <div style={{ borderTop: '1px solid #e9dcc8', background: '#fff', overflowX: 'auto' }}>
                                        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Inter', sans-serif", fontSize: "0.85rem", minWidth: '700px' }}>
                                            <thead>
                                                <tr style={{ background: "#fdfaf5", borderBottom: "1px solid #f0e6d2", textAlign: "left", color: "#8b6535", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.05em" }}>
                                                    <th style={{ padding: "12px 20px" }}>Document</th>
                                                    <th style={{ padding: "12px 20px" }}>Category</th>
                                                    <th style={{ padding: "12px 20px" }}>Uploader</th>
                                                    <th style={{ padding: "12px 20px" }}>Uploaded</th>
                                                    <th style={{ padding: "12px 20px", textAlign: 'right' }}>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {groupedLiveDocs[course].map(doc => (
                                                    <tr key={doc._id} style={{ borderBottom: "1px solid #f0e6d2", transition: "background 0.2s" }}
                                                        onMouseEnter={e => e.currentTarget.style.background = "#fcfaf7"} onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                                                        
                                                        <td style={{ padding: "12px 20px" }}>
                                                            <p style={{ fontWeight: 600, color: "#2d1f0a", marginBottom: "4px" }}>{doc.title}</p>
                                                            {doc.pageCount && <span style={{ color: "#9a7845", fontSize: "0.75rem" }}>{doc.pageCount} Pages</span>}
                                                        </td>
                        
                                                        <td style={{ padding: "12px 20px" }}>
                                                            <span style={{ display: "inline-block", background: "#fdf3e1", color: "#b47a18", padding: "4px 8px", borderRadius: "12px", fontSize: "0.7rem", fontWeight: 600, textTransform: "capitalize" }}>
                                                                {doc.category}
                                                            </span>
                                                        </td>
                        
                                                        <td style={{ padding: "12px 20px" }}>
                                                            <p style={{ color: "#3d2800", fontWeight: 500 }}>{doc.uploaderID?.name || 'Unknown'}</p>
                                                            <p style={{ color: "#9a7845", fontSize: "0.75rem" }}>{doc.uploaderID?.email || ''}</p>
                                                        </td>
                        
                                                        <td style={{ padding: "12px 20px", color: "#7a5a2a" }}>
                                                            {new Date(doc.createdAt).toLocaleDateString('en-GB')}
                                                        </td>
                        
                                                        <td style={{ padding: "12px 20px", textAlign: 'right' }}>
                                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                                                <button onClick={() => setTextPreviewDoc(doc)}
                                                                    style={{ padding: '6px 12px', background: '#fdfaf5', border: '1px solid #e9dcc8', borderRadius: '6px', color: '#8b6535', fontWeight: 600, cursor: 'pointer', fontSize: '0.75rem', transition: 'all 0.2s' }}
                                                                    onMouseEnter={e => e.currentTarget.style.background = '#f5eedb'}
                                                                    onMouseLeave={e => e.currentTarget.style.background = '#fdfaf5'}>
                                                                    View Data
                                                                </button>
                                                                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" 
                                                                    style={{ padding: '6px 12px', background: '#fdfaf5', border: '1px solid #e8c96a', borderRadius: '6px', color: '#c8861a', fontWeight: 600, cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'none', transition: 'all 0.2s' }}
                                                                    onMouseEnter={e => e.currentTarget.style.background = '#fcf0c2'}
                                                                    onMouseLeave={e => e.currentTarget.style.background = '#fdfaf5'}>
                                                                    Preview ↗
                                                                </a>
                                                                <button onClick={() => handleDeleteDoc(doc._id)}
                                                                    style={{ padding: '6px 12px', background: '#fff', border: '1px solid #fecaca', borderRadius: '6px', color: '#dc2626', fontWeight: 600, cursor: 'pointer', fontSize: '0.75rem', transition: 'all 0.2s' }}
                                                                    onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                                                                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Review Modal */}
            {modal && (
                <ReviewModal
                    doc={modal.doc}
                    mode={modal.mode}
                    onClose={() => setModal(null)}
                    onSuccess={handleSuccess}
                />
            )}
            {/* Text Preview Modal */}
            {textPreviewDoc && (
                <TextPreviewModal
                    doc={textPreviewDoc}
                    onClose={() => setTextPreviewDoc(null)}
                />
            )}
        </div>
    );
}

function TextPreviewModal({ doc, onClose }) {
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(31,18,9,0.55)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        }} onClick={onClose}>
            <div style={{
                background: '#fff', borderRadius: '18px', padding: '32px',
                width: '100%', maxWidth: '700px', maxHeight: '85vh', display: 'flex', flexDirection: 'column',
                boxShadow: '0 20px 60px rgba(30,10,0,0.22)',
                border: '1px solid #e9dcc8',
            }} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div>
                        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', fontWeight: 700, color: '#1f1209', marginBottom: '4px' }}>
                            Extracted Data
                        </h2>
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.85rem', color: '#8b6535' }}>
                            {doc.title}
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#9a7845' }}>×</button>
                </div>
                
                {/* Content */}
                <div style={{ 
                    flex: 1, background: '#fdfaf5', border: '1px solid #e9dcc8', borderRadius: '8px', 
                    padding: '16px', overflowY: 'auto',
                    fontFamily: "'Inter', sans-serif", fontSize: '0.85rem', color: '#333', lineHeight: 1.6, whiteSpace: 'pre-wrap'
                }}>
                    {doc.extractedText ? doc.extractedText : <span style={{ color: '#9a7845', fontStyle: 'italic' }}>Extracted text is sparse or pending OCR. It will be generated during pipeline processing.</span>}
                </div>
            </div>
        </div>
    );
}
