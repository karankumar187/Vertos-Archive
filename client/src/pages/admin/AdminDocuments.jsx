import { useState, useEffect } from "react";
import { adminAPI } from "../../services/api";

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
            <div style={{
                background: '#fff', borderRadius: '18px', padding: '32px',
                width: '100%', maxWidth: '560px',
                boxShadow: '0 20px 60px rgba(30,10,0,0.22)',
                border: '1px solid #e9dcc8',
                position: 'relative',
                maxHeight: '90vh', overflowY: 'auto'
            }} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '1.4rem' }}>{isApprove ? '✅' : '❌'}</span>
                        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3rem', fontWeight: 700, color: '#1f1209', margin: 0 }}>
                            {isApprove ? 'Approve Document' : 'Reject Document'}
                        </h2>
                    </div>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.82rem', color: '#9a7845', margin: 0 }}>
                        {isApprove
                            ? "You can edit the title, subject, and category before approving. Your note will be visible to the uploader."
                            : "Please provide a clear reason for rejection so the student can improve their submission."}
                    </p>
                </div>

                {/* Preview File Link & Extracted Text */}
                <div style={{ marginBottom: '20px' }}>
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', fontSize: '0.85rem', color: '#c8861a', fontWeight: 600, textDecoration: 'none', padding: '8px 14px', background: '#fdf8f1', borderRadius: '8px', border: '1px solid #e9dcc8', marginBottom: '12px' }}>
                        📄 View Uploaded File
                    </a>
                    {doc.extractedText && (
                        <div>
                            <button onClick={() => setShowExtractedText(!showExtractedText)} style={{ background: 'none', border: 'none', color: '#8b5e0a', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                                {showExtractedText ? 'Hide Extracted Text' : 'Show Extracted Text snippet...'}
                            </button>
                            {showExtractedText && (
                                <div style={{ marginTop: '8px', padding: '12px', background: '#f8f4ee', borderRadius: '8px', fontSize: '0.75rem', color: '#5c4021', maxHeight: '120px', overflowY: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'monospace', border: '1px solid #e9dcc8' }}>
                                    {doc.extractedText.slice(0, 800)}{doc.extractedText.length > 800 ? '...' : ''}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Editable fields — only shown for approve */}
                {isApprove && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#5c4021', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Title</label>
                            <input
                                type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                style={{ width: '100%', padding: '9px 13px', border: '1px solid #ddd0b8', borderRadius: '8px', fontSize: '0.875rem', color: '#1f1209', outline: 'none', boxSizing: 'border-box' }}
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#5c4021', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Subject</label>
                                <input
                                    type="text" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g. CSE332"
                                    style={{ width: '100%', padding: '9px 13px', border: '1px solid #ddd0b8', borderRadius: '8px', fontSize: '0.875rem', color: '#1f1209', outline: 'none', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#5c4021', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Category</label>
                                <select
                                    value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                                    style={{ width: '100%', padding: '9px 13px', border: '1px solid #ddd0b8', borderRadius: '8px', fontSize: '0.875rem', color: '#1f1209', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                                >
                                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* Review note */}
                <div style={{ marginBottom: '24px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#5c4021', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                        {isApprove ? 'Note for Student (optional)' : 'Rejection Reason *'}
                    </label>
                    <textarea
                        value={form.reviewComment} onChange={e => setForm(f => ({ ...f, reviewComment: e.target.value }))}
                        placeholder={isApprove ? "e.g. Great submission! Minor formatting issues corrected." : "e.g. This document appears to be a duplicate. Please upload a different version."}
                        rows={3}
                        style={{ width: '100%', padding: '10px 13px', border: '1px solid #ddd0b8', borderRadius: '8px', fontSize: '0.875rem', color: '#1f1209', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                    />
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button onClick={onClose} disabled={loading}
                        style={{ padding: '10px 20px', background: '#fff', border: '1px solid #ddd0b8', borderRadius: '9px', fontSize: '0.85rem', fontWeight: 600, color: '#5c4021', cursor: 'pointer' }}>
                        Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={loading}
                        style={{
                            padding: '10px 24px', background: isApprove ? 'linear-gradient(135deg, #16a34a, #15803d)' : 'linear-gradient(135deg, #dc2626, #b91c1c)',
                            border: 'none', borderRadius: '9px', fontSize: '0.85rem', fontWeight: 600, color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                        }}>
                        {loading ? '...' : isApprove ? '✓ Approve' : '✗ Reject'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function AdminDocuments() {
  const [activeTab, setActiveTab] = useState("Pending"); // Pending, Approved, Rejected
  const [pendingDocs, setPendingDocs] = useState([]);
  const [liveDocs, setLiveDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [reviewModal, setReviewModal] = useState({ open: false, doc: null, mode: null });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pendingRes, liveRes] = await Promise.all([
        adminAPI.getPending(),
        adminAPI.getLiveDocuments()
      ]);
      setPendingDocs(pendingRes.data.data || []);
      setLiveDocs(liveRes.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSuccess = (id) => {
    setReviewModal({ open: false, doc: null, mode: null });
    fetchData();
  };

  const handleDeleteLive = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this document? This cannot be undone.')) return;
    try {
      await adminAPI.deleteDocument(id);
      setLiveDocs(prev => prev.filter(d => d._id !== id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete document');
    }
  };

  // Currently we don't have an API to fetch "Rejected" documents that were soft-deleted/marked rejected.
  // The backend currently just updates pending status to rejected but pending uploads get cleaned up or ignored.
  // We'll show an empty list for rejected for now, or just focus on Pending & Approved.
  
  const renderTable = () => {
    if (loading) return <div style={{ padding: "24px", color: "#6b4d1f" }}>Loading documents...</div>;

    if (activeTab === "Pending") {
      if (pendingDocs.length === 0) return <div style={{ padding: "24px", color: "#6b4d1f" }}>No pending documents.</div>;
      return (
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #f0e6d2", color: "#8b5e0a", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              <th style={{ padding: "16px 24px", fontWeight: 600 }}>Document</th>
              <th style={{ padding: "16px 24px", fontWeight: 600 }}>Uploader</th>
              <th style={{ padding: "16px 24px", fontWeight: 600 }}>Subject</th>
              <th style={{ padding: "16px 24px", fontWeight: 600 }}>Category</th>
              <th style={{ padding: "16px 24px", fontWeight: 600 }}>Uploaded On</th>
              <th style={{ padding: "16px 24px", fontWeight: 600, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pendingDocs.map(doc => (
              <tr key={doc._id} style={{ borderBottom: "1px solid #f9f5f0", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "#fdf8f1"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <td style={{ padding: "16px 24px", fontSize: "0.9rem", color: "#1f1209", fontWeight: 500, maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#c8861a", textDecoration: "none" }}>{doc.title}</a>
                </td>
                <td style={{ padding: "16px 24px", fontSize: "0.85rem", color: "#6b4d1f" }}>{doc.uploaderId?.name || 'Unknown'}</td>
                <td style={{ padding: "16px 24px", fontSize: "0.85rem", color: "#6b4d1f" }}>{doc.subject}</td>
                <td style={{ padding: "16px 24px" }}><span style={{ padding: "4px 10px", background: "#f5efeb", color: "#8b5e0a", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 600 }}>{doc.category}</span></td>
                <td style={{ padding: "16px 24px", fontSize: "0.85rem", color: "#6b4d1f" }}>{new Date(doc.uploadedAt).toLocaleDateString()}</td>
                <td style={{ padding: "16px 24px", textAlign: "right" }}>
                  <button onClick={() => setReviewModal({ open: true, doc, mode: 'approve' })} style={{ background: "none", border: "none", color: "#16a34a", cursor: "pointer", fontSize: "1rem", marginRight: "12px" }} title="Approve">✅</button>
                  <button onClick={() => setReviewModal({ open: true, doc, mode: 'reject' })} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: "1rem" }} title="Reject">❌</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (activeTab === "Approved") {
      if (liveDocs.length === 0) return <div style={{ padding: "24px", color: "#6b4d1f" }}>No approved documents yet.</div>;
      return (
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #f0e6d2", color: "#8b5e0a", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              <th style={{ padding: "16px 24px", fontWeight: 600 }}>Document</th>
              <th style={{ padding: "16px 24px", fontWeight: 600 }}>Uploader</th>
              <th style={{ padding: "16px 24px", fontWeight: 600 }}>Subject</th>
              <th style={{ padding: "16px 24px", fontWeight: 600 }}>Category</th>
              <th style={{ padding: "16px 24px", fontWeight: 600 }}>Published On</th>
              <th style={{ padding: "16px 24px", fontWeight: 600, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {liveDocs.map(doc => (
              <tr key={doc._id} style={{ borderBottom: "1px solid #f9f5f0", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "#fdf8f1"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <td style={{ padding: "16px 24px", fontSize: "0.9rem", color: "#1f1209", fontWeight: 500, maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#c8861a", textDecoration: "none" }}>{doc.title}</a>
                </td>
                <td style={{ padding: "16px 24px", fontSize: "0.85rem", color: "#6b4d1f" }}>{doc.uploaderID?.name || 'Unknown'}</td>
                <td style={{ padding: "16px 24px", fontSize: "0.85rem", color: "#6b4d1f" }}>{doc.subject}</td>
                <td style={{ padding: "16px 24px" }}><span style={{ padding: "4px 10px", background: "#f5efeb", color: "#8b5e0a", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 600 }}>{doc.category}</span></td>
                <td style={{ padding: "16px 24px", fontSize: "0.85rem", color: "#6b4d1f" }}>{new Date(doc.createdAt).toLocaleDateString()}</td>
                <td style={{ padding: "16px 24px", textAlign: "right" }}>
                  <button onClick={() => handleDeleteLive(doc._id)} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: "1rem" }} title="Delete Document">🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    return <div style={{ padding: "24px", color: "#6b4d1f" }}>No documents found.</div>;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", height: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", fontWeight: 700, color: "#1f1209", margin: "0 0 8px 0" }}>Documents</h1>
          <p style={{ color: "#6b4d1f", fontSize: "0.95rem", margin: 0 }}>Manage and review all uploaded documents.</p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button style={{ padding: "10px 20px", background: "#fff", border: "1px solid #e9dcc8", borderRadius: "10px", color: "#1f1209", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" }}>Export</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "32px", borderBottom: "1px solid #f0e6d2" }}>
        {["Pending", "Approved", "Rejected"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: "none", border: "none", padding: "0 0 12px 0", cursor: "pointer",
              fontSize: "0.95rem", fontWeight: 600,
              color: activeTab === tab ? "#c8861a" : "#8b5e0a",
              borderBottom: activeTab === tab ? "2px solid #c8861a" : "2px solid transparent",
              transition: "all 0.2s"
            }}
          >
            {tab} {tab === "Pending" && pendingDocs.length > 0 && `(${pendingDocs.length})`}
            {tab === "Approved" && liveDocs.length > 0 && `(${liveDocs.length})`}
          </button>
        ))}
      </div>

      {/* Table Area */}
      <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #f0e6d2", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 2px 8px rgba(160,110,40,0.03)" }}>
        {/* Filters */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #f0e6d2", display: "flex", gap: "16px", alignItems: "center" }}>
          <input type="text" placeholder="Search documents..." style={{ flex: 1, padding: "10px 16px", borderRadius: "10px", border: "1px solid #e9dcc8", outline: "none", fontSize: "0.9rem" }} />
          <select style={{ padding: "10px 16px", borderRadius: "10px", border: "1px solid #e9dcc8", background: "#fff", outline: "none", fontSize: "0.9rem", color: "#6b4d1f" }}><option>Subject</option></select>
          <select style={{ padding: "10px 16px", borderRadius: "10px", border: "1px solid #e9dcc8", background: "#fff", outline: "none", fontSize: "0.9rem", color: "#6b4d1f" }}><option>Category</option></select>
        </div>

        {/* Table Content */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {renderTable()}
        </div>
      </div>

      {reviewModal.open && <ReviewModal doc={reviewModal.doc} mode={reviewModal.mode} onClose={() => setReviewModal({ open: false })} onSuccess={handleReviewSuccess} />}
    </div>
  );
}
