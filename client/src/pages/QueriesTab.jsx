import { useState, useEffect, useRef } from "react";
import { queriesAPI } from "../services/api";
import { cacheGet, cacheSet, cacheInvalidate } from "../utils/localCache";
import { useAuth } from "../context/AuthContext";

// --- SVGs ---
const SearchIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const SendIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
const TrashIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>;
const PlusIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const MessageIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>;

// --- Helper Functions ---
const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
};

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' • ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

// Avatar component
const Avatar = ({ user, size = 40 }) => {
  if (!user) return <div style={{ width: size, height: size, borderRadius: "50%", background: "#e2e8f0", flexShrink: 0 }} />;
  if (user.avatar) return <img src={user.avatar} alt={user.name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg, #c8861a, #92400e)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: size * 0.4, fontWeight: 700, flexShrink: 0 }}>
      {user.name?.charAt(0) || '?'}
    </div>
  );
};

export default function QueriesTab() {
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Ask form
  const [showAskForm, setShowAskForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  
  // Answers
  const [answerContent, setAnswerContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { user: currentUser } = useAuth();
  const messagesEndRef = useRef(null);

  const fetchQueries = async (background = false) => {
    try {
      if (!background) setLoading(true);
      const { data } = await queriesAPI.getQueries();
      if (data.success) {
        setQueries(data.data);
        cacheSet('community_queries', data.data);
        
        // Update selected query if it exists
        if (selectedQuery) {
          const updated = data.data.find(q => q._id === selectedQuery._id);
          if (updated) setSelectedQuery(updated);
        }
      }
    } catch (error) {
      console.error("Error fetching queries:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cached = cacheGet('community_queries');
    if (cached) {
      setQueries(cached);
      setLoading(false);
      fetchQueries(true);
    } else {
      fetchQueries();
    }
  }, []);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedQuery?.answers]);

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!title || !description || isSubmitting) return;
    try {
      setIsSubmitting(true);
      const tagArray = tags.split(',').map(t => t.trim()).filter(t => t);
      if (tagArray.length === 0) tagArray.push("General");
      
      const { data } = await queriesAPI.createQuery({ title, description, tags: tagArray });
      if (data.success) {
        setShowAskForm(false);
        setTitle(""); setDescription(""); setTags("");
        cacheInvalidate('community_queries');
        fetchQueries();
        setSelectedQuery(data.data); // Open the new discussion immediately
      }
    } catch (error) {
      console.error("Error asking query:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnswer = async (e) => {
    e.preventDefault();
    if (!answerContent.trim() || !selectedQuery || isSubmitting) return;
    
    const content = answerContent;
    const currentQueryId = selectedQuery._id;
    const tempId = 'temp-' + Date.now();
    
    // 1. Optimistic Update
    const optimisticAnswer = {
      _id: tempId,
      content,
      author: currentUser,
      createdAt: new Date().toISOString(),
      isOptimistic: true 
    };

    const updatedQueryOptimistic = {
      ...selectedQuery,
      answers: [...(selectedQuery.answers || []), optimisticAnswer]
    };
    
    setSelectedQuery(updatedQueryOptimistic);
    setAnswerContent("");
    
    setQueries(prev => prev.map(q => q._id === currentQueryId ? updatedQueryOptimistic : q));

    try {
      setIsSubmitting(true);
      // 2. API Call
      const { data } = await queriesAPI.addAnswer(currentQueryId, { content });
      
      if (data.success) {
        setSelectedQuery(data.data);
        cacheInvalidate('community_queries');
        setQueries(prev => prev.map(q => q._id === currentQueryId ? data.data : q));
      }
    } catch (error) {
      console.error("Error adding answer:", error);
      alert("Failed to send message. Please try again.");
      const rolledBackQuery = {
        ...selectedQuery,
        answers: selectedQuery.answers.filter(a => a._id !== tempId)
      };
      setSelectedQuery(rolledBackQuery);
      setQueries(prev => prev.map(q => q._id === currentQueryId ? rolledBackQuery : q));
      setAnswerContent(content); 
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this discussion entirely?")) return;
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
    if (!window.confirm("Are you sure you want to delete this message?")) return;
    try {
      const { data } = await queriesAPI.deleteAnswer(queryId, answerId);
      if (data.success) {
        cacheInvalidate('community_queries');
        if (selectedQuery && selectedQuery._id === queryId) {
          const updatedQuery = {
            ...selectedQuery,
            answers: selectedQuery.answers.filter(a => a._id !== answerId)
          };
          setSelectedQuery(updatedQuery);
          setQueries(prev => prev.map(q => q._id === queryId ? updatedQuery : q));
        }
      }
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  const filteredQueries = queries.filter(q => 
    q.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    q.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: "flex", gap: "0", background: "#fff", border: "1px solid #e5d9c5", borderRadius: "12px", overflow: "hidden", height: "calc(100vh - 140px)", minHeight: "600px", boxShadow: "0 10px 30px rgba(160,110,40,0.05)" }}>
      
      {/* ─── LEFT SIDEBAR (DISCUSSION LIST) ─── */}
      <div style={{ width: "420px", background: "#f8f4ee", display: "flex", flexDirection: "column", borderRight: "1px solid #e5d9c5", flexShrink: 0 }}>
        
        {/* Top Header & Search */}
        <div style={{ padding: "20px", borderBottom: "1px solid #e5d9c5", background: "#fff" }}>
          <button onClick={() => setShowAskForm(true)} style={{ width: "100%", marginBottom: "16px", background: "linear-gradient(135deg, #c8861a, #b45309)", color: "#fff", border: "none", padding: "12px", borderRadius: "8px", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", boxShadow: "0 4px 12px rgba(200,134,26,0.2)" }}>
            <PlusIcon /> Start New Discussion
          </button>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#8b6535", display: "flex" }}>
              <SearchIcon />
            </div>
            <input 
              type="text" 
              placeholder="Search discussions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: "100%", padding: "10px 14px 10px 38px", borderRadius: "100px", border: "1px solid #e5d9c5", outline: "none", fontSize: "0.9rem", boxSizing: "border-box", background: "#f8f4ee", fontFamily: "'Inter', sans-serif" }}
            />
          </div>
        </div>

        {/* Discussions List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "30px", color: "#8b6535", fontSize: "0.9rem" }}>Loading...</div>
          ) : filteredQueries.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px", color: "#8b6535", fontSize: "0.9rem" }}>No discussions found.</div>
          ) : (
            filteredQueries.map(q => {
              const isSelected = selectedQuery?._id === q._id;
              const lastMessage = q.answers?.length > 0 ? q.answers[q.answers.length - 1] : null;
              const primaryTag = q.tags && q.tags[0] ? q.tags[0] : "General";
              
              // Get unique commenters for the avatar pile
              const commenters = [];
              if (q.answers) {
                const seen = new Set();
                q.answers.forEach(a => {
                  const id = a.author?._id || a.author?.name;
                  if (id && !seen.has(id)) {
                    seen.add(id);
                    commenters.push(a.author);
                  }
                });
              }
              
              return (
                <div 
                  key={q._id} 
                  onClick={() => setSelectedQuery(q)}
                  style={{ 
                    padding: "20px", 
                    cursor: "pointer", 
                    background: "#fff",
                    border: isSelected ? "2px solid #c8861a" : "1px solid #e5d9c5",
                    borderRadius: "12px",
                    display: "flex", gap: "16px",
                    position: "relative",
                    transition: "all 0.2s",
                    boxShadow: isSelected ? "0 4px 12px rgba(200,134,26,0.15)" : "0 2px 4px rgba(0,0,0,0.02)"
                  }}
                >
                  {/* Floating Tag */}
                  <div style={{ 
                    position: "absolute", top: -12, right: 16, 
                    background: "#fff", border: "1px solid #f0e6d2", 
                    borderRadius: "100px", padding: "2px 10px", 
                    display: "flex", alignItems: "center", gap: "6px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#2563eb" }} />
                    <span style={{ fontSize: "0.6rem", fontWeight: 800, color: "#6b4d1f", textTransform: "uppercase", letterSpacing: "0.05em" }}>{primaryTag}</span>
                  </div>

                  <div style={{ flexShrink: 0 }}>
                    <Avatar user={q.author} size={48} />
                  </div>
                  
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                      <h4 style={{ margin: 0, fontSize: "1.05rem", color: "#1f1209", fontWeight: 800, lineHeight: 1.3, paddingRight: "8px" }}>
                        {q.title}
                      </h4>
                      {currentUser && (q.author?._id === (currentUser._id || currentUser.id) || currentUser.role === 'admin') && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(q._id); }}
                          style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "2px", opacity: 0.6, flexShrink: 0 }}
                          onMouseEnter={e => e.currentTarget.style.opacity = 1}
                          onMouseLeave={e => e.currentTarget.style.opacity = 0.6}
                          title="Delete Discussion"
                        >
                          <TrashIcon />
                        </button>
                      )}
                    </div>
                    
                    <div style={{ fontSize: "0.75rem", color: "#8b6535", marginBottom: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 015.5 5.5v0a5.5 5.5 0 01-5.5 5.5H11"/></svg>
                      {lastMessage ? (
                        <>Latest reply from <strong style={{ color: "#4b3823" }}>@{lastMessage.author?.name?.split(' ')[0] || 'someone'}</strong> {timeAgo(lastMessage.createdAt)}</>
                      ) : (
                        <>Asked by <strong style={{ color: "#4b3823" }}>@{q.author?.name?.split(' ')[0] || 'someone'}</strong> {timeAgo(q.createdAt)}</>
                      )}
                    </div>
                    
                    <p style={{ margin: 0, fontSize: "0.85rem", color: "#6b4d1f", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: "12px" }}>
                      {q.description}
                    </p>
                    
                    <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "12px", marginTop: "auto" }}>
                      {/* Avatar Pile */}
                      <div style={{ display: "flex" }}>
                        {commenters.slice(0, 3).map((c, i) => (
                          <div key={i} style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid #fff", marginLeft: i > 0 ? "-8px" : 0, zIndex: 10 - i }}>
                            <Avatar user={c} size={20} />
                          </div>
                        ))}
                      </div>
                      
                      {/* Comment count */}
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.8rem", fontWeight: 700, color: "#8b6535" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                        {q.answers?.length || 0} Comments
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ─── RIGHT MAIN PANEL (CHAT SCREEN) ─── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#fff", position: "relative" }}>
        
        {/* NEW DISCUSSION MODAL OVERLAY */}
        {showAskForm && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.9)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
            <div style={{ background: "#fff", width: "100%", maxWidth: "500px", padding: "32px", borderRadius: "16px", border: "1px solid #c8861a", boxShadow: "0 12px 40px rgba(200,134,26,0.15)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <h2 style={{ margin: 0, color: "#1f1209", fontSize: "1.4rem" }}>Start New Discussion</h2>
                <button onClick={() => setShowAskForm(false)} style={{ background: "none", border: "none", fontSize: "1.5rem", color: "#8b6535", cursor: "pointer" }}>&times;</button>
              </div>
              <form onSubmit={handleAsk}>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#4b3823", marginBottom: "6px" }}>Topic Title</label>
                  <input value={title} onChange={e => setTitle(e.target.value)} type="text" placeholder="What's the main topic?" required style={{ width: "100%", padding: "12px 16px", borderRadius: "8px", border: "1px solid #e5d9c5", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#4b3823", marginBottom: "6px" }}>Initial Message</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Type your first message..." rows={4} required style={{ width: "100%", padding: "12px 16px", borderRadius: "8px", border: "1px solid #e5d9c5", outline: "none", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }} />
                </div>
                <div style={{ marginBottom: "24px" }}>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#4b3823", marginBottom: "6px" }}>Tags (optional, comma separated)</label>
                  <input value={tags} onChange={e => setTags(e.target.value)} type="text" placeholder="e.g. Help, General" style={{ width: "100%", padding: "12px 16px", borderRadius: "8px", border: "1px solid #e5d9c5", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button type="submit" disabled={isSubmitting} style={{ background: isSubmitting ? "#e5c898" : "#c8861a", color: "#fff", border: "none", padding: "12px 28px", borderRadius: "8px", fontWeight: 700, fontSize: "0.95rem", cursor: isSubmitting ? "not-allowed" : "pointer" }}>
                    {isSubmitting ? "Starting..." : "Start Chat"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {!selectedQuery ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#8b6535", flexDirection: "column", gap: "16px", background: "#fcfcfb" }}>
            <div style={{ opacity: 0.5 }}><MessageIcon /></div>
            <div style={{ fontSize: "1.1rem", fontWeight: 600 }}>Select a discussion to start chatting</div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div style={{ padding: "16px 24px", borderBottom: "1px solid #e5d9c5", background: "#fff", zIndex: 10, display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 2px 10px rgba(160,110,40,0.03)" }}>
              <div>
                <h2 style={{ margin: "0 0 4px 0", color: "#1f1209", fontSize: "1.1rem", fontWeight: 800 }}>{selectedQuery.title}</h2>
                <div style={{ fontSize: "0.8rem", color: "#8b6535", display: "flex", gap: "8px", alignItems: "center" }}>
                  Started by <strong style={{ color: "#4b3823" }}>{selectedQuery.author?.name || 'Anonymous'}</strong> • {new Date(selectedQuery.createdAt).toLocaleDateString()}
                  {selectedQuery.tags?.map((t, i) => (
                    <span key={i} style={{ background: "#f8f4ee", padding: "2px 6px", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 600 }}>{t}</span>
                  ))}
                </div>
              </div>
              
              {currentUser && (selectedQuery.author?._id === (currentUser._id || currentUser.id) || currentUser.role === 'admin') && (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(selectedQuery._id); }}
                  style={{ background: "#fff", border: "1px solid #fee2e2", color: "#ef4444", cursor: "pointer", padding: "8px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#fee2e2"}
                  onMouseLeave={e => e.currentTarget.style.background = "#fff"}
                  title="Delete Discussion"
                >
                  <TrashIcon />
                </button>
              )}
            </div>

            {/* Chat Feed */}
            <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "24px", background: "#f8f4ee" }}>
              
              {/* Original Question as first "message" */}
              <div style={{ display: "flex", gap: "12px" }}>
                <Avatar user={selectedQuery.author} size={36} />
                <div style={{ maxWidth: "80%" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "4px" }}>
                    <span style={{ fontWeight: 700, color: "#1f1209", fontSize: "0.9rem" }}>{selectedQuery.author?.name || 'Anonymous'}</span>
                    <span style={{ fontSize: "0.7rem", color: "#8b6535" }}>{formatDate(selectedQuery.createdAt)}</span>
                  </div>
                  <div style={{ background: "#fff", padding: "12px 16px", borderRadius: "0 12px 12px 12px", border: "1px solid #e5d9c5", color: "#1f1209", fontSize: "0.95rem", lineHeight: 1.5, whiteSpace: "pre-wrap", boxShadow: "0 1px 2px rgba(160,110,40,0.05)" }}>
                    {selectedQuery.description}
                  </div>
                </div>
              </div>

              {/* Chat Replies */}
              {selectedQuery.answers?.map((ans, i) => {
                const isMe = currentUser && ans.author && (ans.author._id === (currentUser._id || currentUser.id));
                
                return (
                  <div key={ans._id || i} style={{ 
                    display: "flex", gap: "12px", 
                    opacity: ans.isOptimistic ? 0.6 : 1,
                    transition: "opacity 0.2s",
                    flexDirection: isMe ? "row-reverse" : "row"
                  }}>
                    <Avatar user={ans.author} size={36} />
                    
                    <div style={{ maxWidth: "80%", display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "4px", flexDirection: isMe ? "row-reverse" : "row" }}>
                        <span style={{ fontWeight: 700, color: "#1f1209", fontSize: "0.9rem" }}>{ans.author?.name || 'Anonymous'}</span>
                        <span style={{ fontSize: "0.7rem", color: "#8b6535" }}>{formatDate(ans.createdAt)}</span>
                        {ans.isOptimistic && <span style={{ fontSize: "0.7rem", color: "#c8861a", fontWeight: 700, fontStyle: "italic" }}>Sending...</span>}
                      </div>
                      
                      <div style={{ position: "relative", group: "message" }}>
                        <div style={{ 
                          background: isMe ? "#c8861a" : "#fff", 
                          color: isMe ? "#fff" : "#1f1209",
                          padding: "12px 16px", 
                          borderRadius: isMe ? "12px 0 12px 12px" : "0 12px 12px 12px", 
                          border: isMe ? "none" : "1px solid #e5d9c5", 
                          fontSize: "0.95rem", lineHeight: 1.5, whiteSpace: "pre-wrap", 
                          boxShadow: "0 1px 2px rgba(160,110,40,0.05)" 
                        }}>
                          {ans.content}
                        </div>
                        
                        {/* Delete Button (hover or always visible depending on preference, we'll place it below for simplicity) */}
                        {!ans.isOptimistic && (isMe || currentUser?.role === 'admin') && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteAnswer(selectedQuery._id, ans._id); }}
                            style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "0.7rem", padding: "4px 0", marginTop: "2px", opacity: 0.8, alignSelf: isMe ? "flex-end" : "flex-start", display: "flex", alignItems: "center", gap: "2px" }}
                          >
                            <TrashIcon /> Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area (Sticky Bottom) */}
            <div style={{ padding: "16px 24px", background: "#fff", borderTop: "1px solid #e5d9c5", zIndex: 10 }}>
              <form onSubmit={handleAnswer} style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <div style={{ flex: 1, border: "1px solid #e5d9c5", borderRadius: "100px", background: "#f8f4ee", display: "flex", alignItems: "center", padding: "0 16px", transition: "border 0.2s" }} onFocus={e => e.currentTarget.style.borderColor = "#c8861a"} onBlur={e => e.currentTarget.style.borderColor = "#e5d9c5"}>
                  <input 
                    type="text"
                    value={answerContent} 
                    onChange={e => setAnswerContent(e.target.value)}
                    placeholder="Type a message..." 
                    style={{ 
                      width: "100%", padding: "14px 0", border: "none", outline: "none", 
                      fontFamily: "inherit", background: "transparent", fontSize: "0.95rem", color: "#1f1209"
                    }}
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isSubmitting || !answerContent.trim()} 
                  style={{ 
                    background: (isSubmitting || !answerContent.trim()) ? "#e5d9c5" : "linear-gradient(135deg, #c8861a, #b45309)", 
                    color: "#fff", border: "none", width: "48px", height: "48px", borderRadius: "50%", 
                    cursor: (isSubmitting || !answerContent.trim()) ? "not-allowed" : "pointer", 
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    boxShadow: (isSubmitting || !answerContent.trim()) ? "none" : "0 4px 12px rgba(200,134,26,0.3)"
                  }}
                >
                  <SendIcon />
                </button>
              </form>
            </div>
          </>
        )}
      </div>
      
    </div>
  );
}
