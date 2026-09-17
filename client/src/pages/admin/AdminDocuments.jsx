import { useState, useEffect } from "react";
import { adminAPI } from "../../services/api";
import { useSocket } from "../../context/SocketContext";

const CATEGORIES = [
  { label: "Notes",          value: "notes" },
  { label: "Syllabus",       value: "syllabus" },
  { label: "Previous Papers",value: "pyq" },
  { label: "University Info",value: "university" },
];

const EXAM_TYPES = [
  { label: "Class Assessment (CA)", value: "ca" },
  { label: "Mid Term",              value: "midterm" },
  { label: "End Term Exam (ETE)",   value: "ete" },
  { label: "Practical (ETP)",       value: "etp" },
  { label: "Other",                 value: "other" },
];

const UNIT_OPTIONS = [0, 1, 2, 3, 4, 5, 6];

const API_BASE = (import.meta?.env?.VITE_API_URL) || 'http://localhost:5001/api';
const FILE_PROXY_BASE = API_BASE.replace('/api', '');

const normalizeMediaUrl = (url) => {
  if (!url) return '';
  return url.replace(/https?:\/\/137\.23\.42\.121\.nip\.io\/api\/v1\/media/, 'https://drive-edge-cache.karan9302451907.workers.dev/api/v1/media');
};

const getViewableUrl = (rawUrl, title = '', ext = '') => {
  if (!rawUrl || rawUrl === '#') return '#';
  const url = normalizeMediaUrl(rawUrl);
  if (url.startsWith('https://res.cloudinary.com/') || url.includes('/api/v1/media') || url.includes('workers.dev')) {
    let proxyUrl = `${FILE_PROXY_BASE}/api/file/view?url=${encodeURIComponent(url)}&ext=${ext}`;
    if (title) proxyUrl += `&title=${encodeURIComponent(title)}`;
    return proxyUrl;
  }
  return url;
};

function ReviewModal({ doc, mode, onClose, onSuccess }) {
    const [form, setForm] = useState({
        title: doc.title || '',
        subject: doc.subject || '',
        category: doc.category || '',
        examType: doc.examType || (doc.category === 'pyq' ? 'ca' : ''),
        units: doc.units || [],
        year: doc.year || '',
        session: doc.session || '',
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
                    examType: form.category === 'pyq' ? form.examType : null,
                    units: form.units,
                    year: form.year,
                    session: form.session,
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
                    <a href={getViewableUrl(doc.fileUrl, doc.title)} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', fontSize: '0.85rem', color: '#c8861a', fontWeight: 600, textDecoration: 'none', padding: '8px 14px', background: '#fdf8f1', borderRadius: '8px', border: '1px solid #e9dcc8', marginBottom: '12px' }}>
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

                        {form.category === 'pyq' && (
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#5c4021', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Exam Type</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {EXAM_TYPES.map(t => (
                                        <button
                                            key={t.value} type="button"
                                            onClick={() => setForm(f => ({ ...f, examType: t.value }))}
                                            style={{
                                                padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px',
                                                border: form.examType === t.value ? '1.5px solid #b45309' : '1px solid #ddd0b8',
                                                background: form.examType === t.value ? '#c8861a' : '#fff',
                                                color: form.examType === t.value ? '#fff' : '#5c4021',
                                                cursor: 'pointer', fontWeight: form.examType === t.value ? 600 : 400
                                            }}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#5c4021', textTransform: 'uppercase' }}>Units Covered</label>
                                <span style={{ fontSize: '0.72rem', color: '#9a7845' }}>{form.units.length} unit(s) selected</span>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {UNIT_OPTIONS.map(u => {
                                    const active = form.units.includes(u);
                                    return (
                                        <button
                                            key={u} type="button"
                                            onClick={() => setForm(f => ({
                                                ...f,
                                                units: active ? f.units.filter(x => x !== u) : [...f.units, u].sort()
                                            }))}
                                            style={{
                                                padding: '3px 8px', fontSize: '0.75rem', borderRadius: '6px',
                                                border: active ? '1.5px solid #c8861a' : '1px solid #ddd0b8',
                                                background: active ? '#fef3dc' : '#fff',
                                                color: active ? '#7a4f0d' : '#5c4021',
                                                cursor: 'pointer', fontWeight: active ? 700 : 500
                                            }}
                                        >
                                            {active ? `✓ U${u}` : `U${u}`}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#5c4021', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Year</label>
                                <input
                                    type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} placeholder="e.g. 2024"
                                    style={{ width: '100%', padding: '9px 13px', border: '1px solid #ddd0b8', borderRadius: '8px', fontSize: '0.875rem', color: '#1f1209', outline: 'none', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#5c4021', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Session</label>
                                <select
                                    value={form.session} onChange={e => setForm(f => ({ ...f, session: e.target.value }))}
                                    style={{ width: '100%', padding: '9px 13px', border: '1px solid #ddd0b8', borderRadius: '8px', fontSize: '0.875rem', color: '#1f1209', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                                >
                                    <option value="">Unspecified</option>
                                    <option value="Jan-May">Jan-May</option>
                                    <option value="Aug-Dec">Aug-Dec</option>
                                    <option value="Summer">Summer</option>
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

function EditMetadataModal({ doc, onClose, onSuccess }) {
    const [form, setForm] = useState({
        title: doc.title || '',
        subject: doc.subject || '',
        category: doc.category || 'notes',
        examType: doc.examType || '',
        units: doc.units || [],
        year: doc.year || '',
        session: doc.session || '',
        triggerReindex: true,
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                title: form.title,
                subject: form.subject,
                category: form.category,
                examType: form.category === 'pyq' ? (form.examType || 'other') : null,
                units: form.units,
                year: form.year ? Number(form.year) : null,
                session: form.session || null,
                triggerReindex: form.triggerReindex,
            };
            const { data } = await adminAPI.updateDocumentMetadata(doc._id, payload);
            if (data.success) {
                onSuccess(data.data);
            }
        } catch (err) {
            console.error(err);
            alert("Failed to update document metadata.");
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
                width: '100%', maxWidth: '580px',
                boxShadow: '0 20px 60px rgba(30,10,0,0.22)',
                border: '1px solid #e9dcc8',
                position: 'relative',
                maxHeight: '90vh', overflowY: 'auto'
            }} onClick={e => e.stopPropagation()}>
                <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '1.4rem' }}>⚙️</span>
                        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3rem', fontWeight: 700, color: '#1f1209', margin: 0 }}>
                            Edit Document Metadata
                        </h2>
                    </div>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.82rem', color: '#9a7845', margin: 0 }}>
                        Update exam type, units, and classification to ensure surgical RAG retrieval and accurate exam generation.
                    </p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#5c4021', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Title</label>
                        <input
                            type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                            style={{ width: '100%', padding: '9px 13px', border: '1px solid #ddd0b8', borderRadius: '8px', fontSize: '0.875rem', color: '#1f1209', outline: 'none', boxSizing: 'border-box' }}
                            required
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#5c4021', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Subject</label>
                            <input
                                type="text" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g. CSE 332"
                                style={{ width: '100%', padding: '9px 13px', border: '1px solid #ddd0b8', borderRadius: '8px', fontSize: '0.875rem', color: '#1f1209', outline: 'none', boxSizing: 'border-box' }}
                                required
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

                    {/* Conditional examType if category === pyq */}
                    {form.category === 'pyq' && (
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#5c4021', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Exam Type</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {EXAM_TYPES.map(t => (
                                    <button
                                        key={t.value} type="button"
                                        onClick={() => setForm(f => ({ ...f, examType: t.value }))}
                                        style={{
                                            padding: '5px 12px', fontSize: '0.8rem', borderRadius: '6px',
                                            border: form.examType === t.value ? '1.5px solid #b45309' : '1px solid #ddd0b8',
                                            background: form.examType === t.value ? '#c8861a' : '#fff',
                                            color: form.examType === t.value ? '#fff' : '#5c4021',
                                            cursor: 'pointer', fontWeight: form.examType === t.value ? 600 : 400
                                        }}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Units Covered */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#5c4021', textTransform: 'uppercase' }}>Units Covered</label>
                            <span style={{ fontSize: '0.72rem', color: '#9a7845' }}>{form.units.length} unit(s) selected</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {UNIT_OPTIONS.map(u => {
                                const active = form.units.includes(u);
                                return (
                                    <button
                                        key={u} type="button"
                                        onClick={() => setForm(f => ({
                                            ...f,
                                            units: active ? f.units.filter(x => x !== u) : [...f.units, u].sort()
                                        }))}
                                        style={{
                                            padding: '4px 10px', fontSize: '0.78rem', borderRadius: '6px',
                                            border: active ? '1.5px solid #c8861a' : '1px solid #ddd0b8',
                                            background: active ? '#fef3dc' : '#fff',
                                            color: active ? '#7a4f0d' : '#5c4021',
                                            cursor: 'pointer', fontWeight: active ? 700 : 500
                                        }}
                                    >
                                        {active ? `✓ U${u}` : `U${u}`}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Year & Session */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#5c4021', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Year (Optional)</label>
                            <input
                                type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                                placeholder="e.g. 2024"
                                style={{ width: '100%', padding: '9px 13px', border: '1px solid #ddd0b8', borderRadius: '8px', fontSize: '0.875rem', color: '#1f1209', outline: 'none', boxSizing: 'border-box' }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#5c4021', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Session (Optional)</label>
                            <select
                                value={form.session} onChange={e => setForm(f => ({ ...f, session: e.target.value }))}
                                style={{ width: '100%', padding: '9px 13px', border: '1px solid #ddd0b8', borderRadius: '8px', fontSize: '0.875rem', color: '#1f1209', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                            >
                                <option value="">Unspecified</option>
                                <option value="Jan-May">Jan-May (Spring)</option>
                                <option value="Aug-Dec">Aug-Dec (Autumn)</option>
                                <option value="Summer">Summer Term</option>
                            </select>
                        </div>
                    </div>

                    {/* Trigger Reindex Checkbox */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                        <input
                            type="checkbox" id="triggerReindex" checked={form.triggerReindex}
                            onChange={e => setForm(f => ({ ...f, triggerReindex: e.target.checked }))}
                            style={{ cursor: 'pointer', accentColor: '#c8861a' }}
                        />
                        <label htmlFor="triggerReindex" style={{ fontSize: '0.8rem', color: '#5c4021', cursor: 'pointer' }}>
                            Sync vector database payload & contextualized embeddings (Recommended)
                        </label>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
                        <button type="button" onClick={onClose} disabled={loading}
                            style={{ padding: '10px 20px', background: '#fff', border: '1px solid #ddd0b8', borderRadius: '9px', fontSize: '0.85rem', fontWeight: 600, color: '#5c4021', cursor: 'pointer' }}>
                            Cancel
                        </button>
                        <button type="submit" disabled={loading}
                            style={{
                                padding: '10px 24px', background: 'linear-gradient(135deg, #c8861a, #b45309)',
                                border: 'none', borderRadius: '9px', fontSize: '0.85rem', fontWeight: 600, color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                            }}>
                            {loading ? 'Saving...' : 'Save Metadata'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function AdminDocuments() {
  const [activeTab, setActiveTab] = useState("pending"); // "pending" | "live"
  const [pendingDocs, setPendingDocs] = useState([]);
  const [liveDocs, setLiveDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCourse, setExpandedCourse] = useState(null); // For accordion
  
  const [reviewModal, setReviewModal] = useState({ open: false, doc: null, mode: null });
  const [textModal, setTextModal] = useState({ open: false, text: '' });
  const [editMetaModal, setEditMetaModal] = useState({ open: false, doc: null });
  
  const socket = useSocket();

  const handleMetaSuccess = (updatedDoc) => {
    setLiveDocs(prev => prev.map(d => d._id === updatedDoc._id ? updatedDoc : d));
    setEditMetaModal({ open: false, doc: null });
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('new_document_pending', (doc) => {
      setPendingDocs(prev => [doc, ...prev]);
    });
    return () => {
      socket.off('new_document_pending');
    };
  }, [socket]);

  const fetchData = async (force = false) => {
    const CACHE_KEY = "admin_documents_cache";
    const CACHE_TTL = 5 * 60 * 1000;

    if (!force) {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const { timestamp, pending, live } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_TTL) {
            setPendingDocs(pending);
            setLiveDocs(live);
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
      const [pendingRes, liveRes] = await Promise.all([
        adminAPI.getPending(),
        adminAPI.getLiveDocuments()
      ]);
      const newPending = pendingRes.data?.data || [];
      const newLive = liveRes.data?.data || [];
      setPendingDocs(newPending);
      setLiveDocs(newLive);
      localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), pending: newPending, live: newLive }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSuccess = (id) => {
    setReviewModal({ open: false, doc: null, mode: null });
    fetchData(true);
  };

  const handleDeleteLive = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this document? This cannot be undone.')) return;
    try {
      await adminAPI.deleteDocument(id);
      fetchData(true);
    } catch (err) {
      console.error(err);
      alert('Failed to delete document');
    }
  };

  const handleReprocess = async (id) => {
    if (!window.confirm('Are you sure you want to reprocess this document?')) return;
    try {
      await adminAPI.reprocessDocument(id);
      alert('Reprocessing started in the background.');
      fetchData(true);
    } catch (err) {
      console.error(err);
      alert('Failed to trigger reprocessing');
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
                  <a href={getViewableUrl(doc.fileUrl, doc.title)} target="_blank" rel="noopener noreferrer" style={{ color: "#c8861a", textDecoration: "none" }}>{doc.title}</a>
                </td>
                <td style={{ padding: "16px 24px", fontSize: "0.85rem", color: "#6b4d1f" }}>{doc.uploaderId?.name || 'Unknown'}</td>
                <td style={{ padding: "16px 24px", fontSize: "0.85rem", color: "#6b4d1f" }}>{doc.subject}</td>
                <td style={{ padding: "16px 24px" }}><span style={{ padding: "4px 10px", background: "#f5efeb", color: "#8b5e0a", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 600 }}>{doc.category}</span></td>
                <td style={{ padding: "16px 24px", fontSize: "0.85rem", color: "#6b4d1f" }}>{new Date(doc.uploadedAt).toLocaleDateString()}</td>
                <td style={{ padding: "16px 24px", textAlign: "right" }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <a href={getViewableUrl(doc.fileUrl, doc.title)} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", borderRadius: "8px", background: "#f0fdf4", color: "#16a34a", textDecoration: "none" }} title="View Document">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    </a>
                    {doc.extractedText && (
                        <button onClick={() => setTextModal({ open: true, text: doc.extractedText })} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", borderRadius: "8px", background: "#fdf8f1", color: "#c8861a", border: "none", cursor: "pointer" }} title="Show Extracted Text">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                        </button>
                    )}
                    <button onClick={() => setReviewModal({ open: true, doc, mode: 'approve' })} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", borderRadius: "8px", background: "#ecfccb", color: "#4d7c0f", border: "none", cursor: "pointer" }} title="Approve">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                    </button>
                    <button onClick={() => setReviewModal({ open: true, doc, mode: 'reject' })} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", borderRadius: "8px", background: "#fee2e2", color: "#b91c1c", border: "none", cursor: "pointer" }} title="Reject">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (activeTab === "Approved") {
      if (liveDocs.length === 0) return <div style={{ padding: "24px", color: "#6b4d1f" }}>No approved documents yet.</div>;
      
      // Group by subject (normalized)
      const grouped = liveDocs.reduce((acc, doc) => {
        let sub = doc.subject || 'Unknown Course';
        const normSub = sub.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        
        const existingKey = Object.keys(acc).find(k => k.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === normSub);
        if (existingKey) {
            sub = existingKey;
        }

        if (!acc[sub]) acc[sub] = [];
        acc[sub].push(doc);
        return acc;
      }, {});

      return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {Object.keys(grouped).sort().map(course => (
            <div key={course} style={{ borderBottom: '1px solid #f0e6d2' }}>
              <div 
                onClick={() => setExpandedCourse(expandedCourse === course ? null : course)}
                style={{ padding: "16px 24px", background: expandedCourse === course ? "#fdf8f1" : "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", transition: "background 0.2s" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "1.2rem" }}>{expandedCourse === course ? '📂' : '📁'}</span>
                  <span style={{ fontSize: "1rem", fontWeight: 700, color: "#1f1209" }}>{course}</span>
                  <span style={{ padding: "2px 8px", background: "#e9dcc8", color: "#5c4021", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 600 }}>{grouped[course].length} resources</span>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5e0a" strokeWidth="2" style={{ transform: expandedCourse === course ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
              
              {expandedCourse === course && (
                <div style={{ padding: "0", background: "#faf7f2" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                      <tr style={{ color: "#8b5e0a", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", background: "#f5efeb" }}>
                        <th style={{ padding: "12px 24px", fontWeight: 600 }}>Document</th>
                        <th style={{ padding: "12px 24px", fontWeight: 600 }}>Uploader</th>
                        <th style={{ padding: "12px 24px", fontWeight: 600 }}>Category</th>
                        <th style={{ padding: "12px 24px", fontWeight: 600 }}>Published On</th>
                        <th style={{ padding: "12px 24px", fontWeight: 600, textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grouped[course].map(doc => (
                        <tr key={doc._id} style={{ borderBottom: "1px solid #f0e6d2", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "#fdf8f1"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <td style={{ padding: "12px 24px", fontSize: "0.9rem", color: "#1f1209", fontWeight: 500, maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {doc.title}
                          </td>
                          <td style={{ padding: "12px 24px", fontSize: "0.85rem", color: "#6b4d1f" }}>{doc.uploaderID?.name || 'Unknown'}</td>
                          <td style={{ padding: "12px 24px" }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center' }}>
                              <span style={{ padding: "4px 10px", background: "#fff", border: "1px solid #e9dcc8", color: "#8b5e0a", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 600 }}>{doc.category}</span>
                              {doc.examType && (
                                <span style={{ padding: "3px 8px", background: "#fef3dc", border: "1px solid #e8c96a", color: "#7a4f0d", borderRadius: "10px", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase" }}>
                                  {doc.examType}
                                </span>
                              )}
                              {doc.units && doc.units.length > 0 && (
                                <span style={{ padding: "3px 8px", background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#047857", borderRadius: "10px", fontSize: "0.7rem", fontWeight: 600 }}>
                                  U: {doc.units.join(',')}
                                </span>
                              )}
                              {doc.year && (
                                <span style={{ padding: "3px 6px", background: "#f1f5f9", border: "1px solid #cbd5e1", color: "#475569", borderRadius: "10px", fontSize: "0.68rem", fontWeight: 500 }}>
                                  {doc.year}
                                </span>
                              )}
                              {doc.indexed === false && (
                                  <span style={{ padding: "4px 8px", background: "#fee2e2", color: "#b91c1c", borderRadius: "12px", fontSize: "0.65rem", fontWeight: 700 }}>Indexing Failed</span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: "12px 24px", fontSize: "0.85rem", color: "#6b4d1f" }}>{new Date(doc.createdAt).toLocaleDateString()}</td>
                          <td style={{ padding: "12px 24px", textAlign: "right" }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                              <a href={getViewableUrl(doc.fileUrl, doc.title)} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "30px", height: "30px", borderRadius: "8px", background: "#fff", border: "1px solid #e9dcc8", color: "#16a34a", textDecoration: "none" }} title="View Document">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                              </a>
                              {doc.extractedText && (
                                  <button onClick={() => setTextModal({ open: true, text: doc.extractedText })} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "30px", height: "30px", borderRadius: "8px", background: "#fff", border: "1px solid #e9dcc8", color: "#c8861a", cursor: "pointer" }} title="Show Extracted Text">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                                  </button>
                              )}
                              <button onClick={() => setEditMetaModal({ open: true, doc })} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "30px", height: "30px", borderRadius: "8px", background: "#fef3dc", color: "#b45309", border: "1px solid #fde68a", cursor: "pointer" }} title="Edit Metadata">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              </button>
                              <button onClick={() => handleDeleteLive(doc._id)} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "30px", height: "30px", borderRadius: "8px", background: "#fee2e2", color: "#b91c1c", border: "none", cursor: "pointer" }} title="Delete Document">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                              </button>
                              <button onClick={() => handleReprocess(doc._id)} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "30px", height: "30px", borderRadius: "8px", background: "#eff6ff", color: "#2563eb", border: "none", cursor: "pointer" }} title="Reprocess Document">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 2v6h6"/></svg>
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

      {/* Text Modal */}
      {textModal.open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(31,18,9,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={() => setTextModal({ open: false, text: '' })}>
          <div style={{ background: '#fff', borderRadius: '18px', padding: '32px', width: '100%', maxWidth: '800px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(30,10,0,0.22)', border: '1px solid #e9dcc8' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', fontWeight: 700, color: '#1f1209', margin: 0 }}>Extracted Text</h2>
              <button onClick={() => setTextModal({ open: false, text: '' })} style={{ background: 'none', border: 'none', color: '#8b5e0a', cursor: 'pointer' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', background: '#fcfaf7', border: '1px solid #e9dcc8', borderRadius: '12px', padding: '20px', fontFamily: 'monospace', fontSize: '0.85rem', color: '#1f1209', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
              {textModal.text || 'No text extracted.'}
            </div>
          </div>
        </div>
      )}

      {reviewModal.open && <ReviewModal doc={reviewModal.doc} mode={reviewModal.mode} onClose={() => setReviewModal({ open: false })} onSuccess={handleReviewSuccess} />}
      
      {editMetaModal.open && (
        <EditMetadataModal
          doc={editMetaModal.doc}
          onClose={() => setEditMetaModal({ open: false, doc: null })}
          onSuccess={handleMetaSuccess}
        />
      )}
    </div>
  );
}
