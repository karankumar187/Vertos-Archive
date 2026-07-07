import { useState, useEffect } from "react";
import { queriesAPI } from "../services/api";
import campusSketch from "../assets/campus-sketch.png";
import { cacheGet, cacheSet, cacheInvalidate } from "../utils/localCache";
import { useAuth } from "../context/AuthContext";

const QueryCard = ({ query, onClick, currentUser, onDelete }) => {
  const dateObj = new Date(query.createdAt);
  const timeStr = dateObj.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div 
      onClick={() => onClick(query)}
      style={{
        background: "#fff", borderRadius: "12px", padding: "20px",
        border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
        cursor: "pointer", transition: "all 0.2s",
        display: "flex", flexDirection: "column", gap: "12px"
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "#7c3aed44"}
      onMouseLeave={e => e.currentTarget.style.borderColor = "#e2e8f0"}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#1e293b", fontWeight: 600, lineHeight: 1.4 }}>{query.title}</h3>
        <span style={{ fontSize: "0.8rem", color: "#7c3aed", background: "#EDE9FE", padding: "4px 10px", borderRadius: "12px", fontWeight: 700, whiteSpace: "nowrap", marginLeft: "12px" }}>
          {query.answers?.length || 0} answers
        </span>
        {currentUser && (query.author?._id === (currentUser._id || currentUser.id) || currentUser.role === 'admin') && (
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(query._id); }}
            style={{ 
              background: "none", border: "none", color: "#ef4444", cursor: "pointer", 
              padding: "4px", marginLeft: "8px", display: "flex", alignItems: "center", justifyContent: "center" 
            }}
            title="Delete Query"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>
        )}
      </div>
      
      <p style={{ margin: 0, fontSize: "0.9rem", color: "#64748b", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {query.description}
      </p>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {query.tags?.map((tag, i) => (
          <span key={i} style={{ fontSize: "0.7rem", background: "#f1f5f9", color: "#475569", padding: "3px 8px", borderRadius: "4px" }}>
            {tag}
          </span>
        ))}
      </div>
      
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px", borderTop: "1px solid #f1f5f9", paddingTop: "12px" }}>
        {query.author?.avatar ? (
          <img src={query.author.avatar} alt="avatar" style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: 24, height: 24, borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed, #4c1d95)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "0.6rem", fontWeight: 700 }}>
            {query.author?.name?.charAt(0) || '?'}
          </div>
        )}
        <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
          <strong style={{ color: "#334155" }}>{query.author?.name || 'Anonymous'}</strong> asked on {timeStr}
        </span>
      </div>
    </div>
  );
};

export default function QueriesTab() {
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuery, setSelectedQuery] = useState(null);
  
  // Form states
  const [showAskForm, setShowAskForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [answerContent, setAnswerContent] = useState("");
  
  const { user: currentUser } = useAuth();

  const fetchQueries = async (background = false) => {
    try {
      if (!background) setLoading(true);
      const { data } = await queriesAPI.getQueries();
      if (data.success) {
        setQueries(data.data);
        cacheSet('community_queries', data.data);
      }
    } catch (error) {
      console.error("Error fetching queries:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Show cached data instantly, then refresh in background
    const cached = cacheGet('community_queries');
    if (cached) {
      setQueries(cached);
      setLoading(false);
      fetchQueries(true); // silent background refresh
    } else {
      fetchQueries();
    }
  }, []);

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!title || !description || isSubmitting) return;
    try {
      setIsSubmitting(true);
      const tagArray = tags.split(',').map(t => t.trim()).filter(t => t);
      const { data } = await queriesAPI.createQuery({ title, description, tags: tagArray });
      if (data.success) {
        setShowAskForm(false);
        setTitle(""); setDescription(""); setTags("");
        cacheInvalidate('community_queries');
        fetchQueries();
      }
    } catch (error) {
      console.error("Error asking query:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this query?")) return;
    try {
      const { data } = await queriesAPI.deleteQuery(id);
      if (data.success) {
        cacheInvalidate('community_queries');
        if (selectedQuery && selectedQuery._id === id) {
          setSelectedQuery(null);
        }
        fetchQueries();
      }
    } catch (error) {
      console.error("Error deleting query:", error);
    }
  };

  const handleDeleteAnswer = async (queryId, answerId) => {
    if (!window.confirm("Are you sure you want to delete this answer?")) return;
    try {
      const { data } = await queriesAPI.deleteAnswer(queryId, answerId);
      if (data.success) {
        cacheInvalidate('community_queries');
        fetchQueries();
        // Optimistically update the selected query view
        if (selectedQuery && selectedQuery._id === queryId) {
          setSelectedQuery({
            ...selectedQuery,
            answers: selectedQuery.answers.filter(a => a._id !== answerId)
          });
        }
      }
    } catch (error) {
      console.error("Error deleting answer:", error);
    }
  };

  const handleAnswer = async (e) => {
    e.preventDefault();
    if (!answerContent || !selectedQuery || isSubmitting) return;
    try {
      setIsSubmitting(true);
      const { data } = await queriesAPI.addAnswer(selectedQuery._id, { content: answerContent });
      if (data.success) {
        setAnswerContent("");
        // Update local state to reflect new answer
        setSelectedQuery(data.data);
        fetchQueries();
      }
    } catch (error) {
      console.error("Error adding answer:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // View: Single Query Details
  if (selectedQuery) {
    return (
      <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px", position: "relative" }}>
        <button 
          onClick={() => setSelectedQuery(null)}
          style={{ background: "none", border: "none", color: "#7c3aed", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", padding: 0, alignSelf: "flex-start" }}
        >
          ← Back to Queries
        </button>

        {/* Original Question */}
        <div style={{ background: "#fff", borderRadius: "12px", padding: "28px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
            <h2 style={{ margin: 0, color: "#1e293b", fontSize: "1.5rem" }}>{selectedQuery.title}</h2>
            {currentUser && (selectedQuery.author?._id === (currentUser._id || currentUser.id) || currentUser.role === 'admin') && (
              <button 
                onClick={(e) => { e.stopPropagation(); handleDelete(selectedQuery._id); }}
                style={{ 
                  background: "none", border: "none", color: "#ef4444", cursor: "pointer", 
                  padding: "4px", marginLeft: "12px", display: "flex", alignItems: "center", justifyContent: "center" 
                }}
                title="Delete Query"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
            {selectedQuery.tags?.map((tag, i) => (
              <span key={i} style={{ fontSize: "0.75rem", background: "#EDE9FE", color: "#6d28d9", padding: "4px 10px", borderRadius: "6px", fontWeight: 600 }}>
                {tag}
              </span>
            ))}
          </div>
          <p style={{ fontSize: "1rem", color: "#475569", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
            {selectedQuery.description}
          </p>
          <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: "10px" }}>
            {selectedQuery.author?.avatar ? (
              <img src={selectedQuery.author.avatar} alt="avatar" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700 }}>
                {selectedQuery.author?.name?.charAt(0) || '?'}
              </div>
            )}
            <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
              <div style={{ color: "#334155", fontWeight: 600 }}>{selectedQuery.author?.name || 'Anonymous'}</div>
              <div>{new Date(selectedQuery.createdAt).toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Answers Section */}
        <h3 style={{ margin: "10px 0 0 0", color: "#1e293b" }}>{selectedQuery.answers?.length || 0} Answers</h3>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {selectedQuery.answers?.map((ans, i) => (
            <div key={i} style={{ background: "#fff", borderRadius: "12px", padding: "20px", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <p style={{ margin: "0 0 16px 0", color: "#334155", lineHeight: 1.6, whiteSpace: "pre-wrap", flex: 1 }}>{ans.content}</p>
                {currentUser && (ans.author?._id === (currentUser._id || currentUser.id) || currentUser.role === 'admin') && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteAnswer(selectedQuery._id, ans._id); }}
                    style={{ 
                      background: "none", border: "none", color: "#ef4444", cursor: "pointer", 
                      padding: "4px", marginLeft: "12px", display: "flex", alignItems: "center", justifyContent: "center" 
                    }}
                    title="Delete Answer"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                  </button>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {ans.author?.avatar ? (
                  <img src={ans.author.avatar} alt="avatar" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "0.7rem", fontWeight: 700 }}>
                    {ans.author?.name?.charAt(0) || '?'}
                  </div>
                )}
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  <span style={{ color: "#334155", fontWeight: 600 }}>{ans.author?.name || 'Anonymous'}</span> • {new Date(ans.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Post Answer Form */}
        <form onSubmit={handleAnswer} style={{ background: "#f8fafc", borderRadius: "12px", padding: "20px", border: "1px solid #e2e8f0", marginTop: "16px" }}>
          <h4 style={{ margin: "0 0 12px 0", color: "#1e293b" }}>Your Answer</h4>
          <textarea 
            value={answerContent} onChange={e => setAnswerContent(e.target.value)}
            placeholder="Type your answer here... Be helpful and respectful!"
            rows={4} required
            style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", marginBottom: "12px" }}
          />
          <button type="submit" disabled={isSubmitting} style={{ background: isSubmitting ? "#a78bfa" : "#7c3aed", color: "#fff", border: "none", padding: "12px 24px", borderRadius: "8px", fontWeight: 700, fontSize: "1rem", cursor: isSubmitting ? "not-allowed" : "pointer" }}>
            {isSubmitting ? "Posting..." : "Post Answer"}
          </button>
        </form>
      </div>
    );
  }

  // View: List of Queries
  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px", position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h2 style={{ margin: "0 0 8px 0", fontSize: "1.8rem", color: "#1f1209", fontFamily: "'Playfair Display', serif" }}>
            Student Queries
          </h2>
          <p style={{ margin: 0, color: "#6b4d1f", fontSize: "0.95rem" }}>
            Ask questions, share knowledge, and help your peers.
          </p>
        </div>
        <button 
          onClick={() => setShowAskForm(!showAskForm)}
          style={{ background: "#7c3aed", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
        >
          {showAskForm ? "Cancel" : "Ask a Question"}
        </button>
      </div>

      {showAskForm && (
        <form onSubmit={handleAsk} style={{ background: "#fff", borderRadius: "12px", padding: "24px", border: "1px solid #7c3aed44", boxShadow: "0 8px 24px rgba(124,58,237,0.08)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Question Title</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., How to approach DBMS Unit 3?" required style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Details</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Explain your question in detail..." rows={4} required style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", boxSizing: "border-box", resize: "vertical" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Tags (comma separated)</label>
              <input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g., DBMS, Semester 5, Midterms" style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", boxSizing: "border-box" }} />
            </div>
            <button type="submit" disabled={isSubmitting} style={{ background: isSubmitting ? "#a78bfa" : "#7c3aed", color: "#fff", border: "none", padding: "12px", borderRadius: "8px", fontWeight: 600, cursor: isSubmitting ? "not-allowed" : "pointer", marginTop: "8px" }}>
              {isSubmitting ? "Posting..." : "Post Question"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>Loading queries...</div>
      ) : queries.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {queries.map(q => <QueryCard key={q._id} query={q} onClick={setSelectedQuery} currentUser={currentUser} onDelete={handleDelete} />)}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "60px 20px", background: "#fff", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
          <p style={{ color: "#64748b", margin: 0 }}>No questions asked yet. Be the first!</p>
        </div>
      )}
    </div>
  );
}
