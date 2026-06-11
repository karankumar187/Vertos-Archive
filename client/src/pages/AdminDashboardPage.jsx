import { useState, useEffect } from "react";
import { adminAPI } from "../services/api";

export default function AdminDashboardPage() {
    const [pendingDocs, setPendingDocs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [duplicateChecks, setDuplicateChecks] = useState({});

    useEffect(() => {
        fetchPending();
    }, []);

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

    const handleApprove = async (id) => {
        try {
            setActionLoading(true);
            const { data } = await adminAPI.approveUpload(id);
            if (data.success) {
                setPendingDocs(prev => prev.filter(doc => doc._id !== id));
            }
        } catch (error) {
            console.error("Approve failed", error);
            alert("Approval failed.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async (id) => {
        const reason = prompt("Enter reason for rejection (optional):");
        if (reason === null) return; // user cancelled
        try {
            setActionLoading(true);
            const { data } = await adminAPI.rejectUpload(id, reason);
            if (data.success) {
                setPendingDocs(prev => prev.filter(doc => doc._id !== id));
            }
        } catch (error) {
            console.error("Reject failed", error);
            alert("Rejection failed.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleCheckDuplicate = async (doc) => {
        try {
            setDuplicateChecks(prev => ({ ...prev, [doc._id]: 'checking' }));
            const { data } = await adminAPI.checkDuplicate({ title: doc.title, subject: doc.subject, category: doc.category });
            
            setDuplicateChecks(prev => ({ 
                ...prev, 
                [doc._id]: data.isLikelyDuplicate ? `⚠️ Potential Duplicates: ${data.duplicates.length}` : '✅ Clean' 
            }));
        } catch (error) {
            setDuplicateChecks(prev => ({ ...prev, [doc._id]: '❌ Check Failed' }));
        }
    };

    return (
        <div style={{
            maxWidth: "1100px", margin: "40px auto", padding: "0 24px",
            width: "100%",
        }}>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.2rem", color: "#1f1209", marginBottom: "8px" }}>
                Moderation <span style={{ color: "#c8861a" }}>Queue</span>
            </h1>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "1rem", color: "#7a5a2a", marginBottom: "32px" }}>
                Review, approve, and manage community uploads.
            </p>

            <div style={{
                background: "#ffffff",
                border: "1px solid #e9dcc8",
                borderRadius: "16px",
                overflow: "hidden",
                boxShadow: "0 4px 20px rgba(160,110,40,0.06)",
            }}>
                {loading ? (
                    <div style={{ padding: "40px", textAlign: "center", color: "#8b6535", fontFamily: "'Inter', sans-serif" }}>
                        Loading queue...
                    </div>
                ) : pendingDocs.length === 0 ? (
                    <div style={{ padding: "60px 40px", textAlign: "center" }}>
                        <div style={{ fontSize: "40px", marginBottom: "16px" }}>🎉</div>
                        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.4rem", color: "#1f1209" }}>All caught up!</h3>
                        <p style={{ fontFamily: "'Inter', sans-serif", color: "#9a7845", marginTop: "8px" }}>There are no pending documents in the queue.</p>
                    </div>
                ) : (
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
                            {pendingDocs.map(doc => (
                                <tr key={doc._id} style={{ borderBottom: "1px solid #f0e8d8" }}>
                                    <td style={{ padding: "16px 20px" }}>
                                        <p style={{ fontWeight: 600, color: "#1f1209" }}>{doc.title}</p>
                                        <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#c8861a", textDecoration: "underline", fontSize: "0.8rem", fontWeight: 500 }}>
                                                Preview File
                                            </a>
                                            <span style={{ color: "#c1b19a", fontSize: "0.8rem" }}>|</span>
                                            <span style={{ color: "#9a7845", fontSize: "0.8rem" }}>
                                                {(doc.fileSize / 1024 / 1024).toFixed(2)} MB
                                            </span>
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
                                                color: duplicateChecks[doc._id].includes('⚠️') ? '#b45309' : '#16a34a' 
                                            }}>
                                                {duplicateChecks[doc._id]}
                                            </span>
                                        ) : (
                                            <button 
                                                onClick={() => handleCheckDuplicate(doc)}
                                                style={{
                                                    padding: "6px 12px", background: "#fdfaf5", border: "1px solid #e9dcc8", borderRadius: "6px", color: "#7a5a2a", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", transition: "all 0.2s"
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.borderColor = "#c8861a"}
                                                onMouseLeave={e => e.currentTarget.style.borderColor = "#e9dcc8"}
                                            >
                                                Run Check
                                            </button>
                                        )}
                                    </td>
                                    <td style={{ padding: "16px 20px", textAlign: "right" }}>
                                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                                            <button 
                                                disabled={actionLoading}
                                                onClick={() => handleApprove(doc._id)}
                                                style={{
                                                    padding: "8px 16px", background: "linear-gradient(135deg, #16a34a, #15803d)", border: "none", borderRadius: "8px", color: "#fff", fontSize: "0.8rem", fontWeight: 600, cursor: actionLoading ? "not-allowed" : "pointer", boxShadow: "0 2px 8px rgba(22,163,74,0.2)"
                                                }}
                                            >
                                                Approve
                                            </button>
                                            <button 
                                                disabled={actionLoading}
                                                onClick={() => handleReject(doc._id)}
                                                style={{
                                                    padding: "8px 16px", background: "#fff", border: "1px solid #dc2626", borderRadius: "8px", color: "#dc2626", fontSize: "0.8rem", fontWeight: 600, cursor: actionLoading ? "not-allowed" : "pointer"
                                                }}
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
