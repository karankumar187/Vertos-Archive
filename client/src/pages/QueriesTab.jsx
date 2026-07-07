import { useState, useEffect, useMemo, useRef } from "react";
import { queriesAPI } from "../services/api";
import { cacheGet, cacheSet, cacheInvalidate } from "../utils/localCache";
import { useAuth } from "../context/AuthContext";

// --- SVGs ---
const SearchIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const ChevronDown = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>;
const ChevronUp = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>;
const SendIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
const TrashIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>;
const PlusIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;

// --- Helper Functions ---
const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} minutes ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hours ago`;
  return `${Math.floor(h / 24)} days ago`;
};

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ' • ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

// Avatar component
const Avatar = ({ user, size = 40 }) => {
  if (!user) return <div style={{ width: size, height: size, borderRadius: "50%", background: "#e2e8f0" }} />;
  if (user.avatar) return <img src={user.avatar} alt={user.name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />;
  
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg, #c8861a, #92400e)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: size * 0.4, fontWeight: 700 }}>
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

  // Accordion state for sidebar
  const [expandedTags, setExpandedTags] = useState({});

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
    const cached = cacheGet('community_queries');
    if (cached) {
      setQueries(cached);
      setLoading(false);
      fetchQueries(true);
    } else {
      fetchQueries();
    }
  }, []);

  // Auto-scroll to bottom of answers
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
      isOptimistic: true // flag to show faded state
    };

    const updatedQueryOptimistic = {
      ...selectedQuery,
      answers: [...(selectedQuery.answers || []), optimisticAnswer]
    };
    
    setSelectedQuery(updatedQueryOptimistic);
    setAnswerContent("");
    
    // Also optimistically update the queries list
    setQueries(prev => prev.map(q => q._id === currentQueryId ? updatedQueryOptimistic : q));

    try {
      setIsSubmitting(true);
      // 2. API Call
      const { data } = await queriesAPI.addAnswer(currentQueryId, { content });
      
      if (data.success) {
        // Replace temp answer with real answer
        setSelectedQuery(data.data);
        cacheInvalidate('community_queries');
        setQueries(prev => prev.map(q => q._id === currentQueryId ? data.data : q));
      }
    } catch (error) {
      console.error("Error adding answer:", error);
      alert("Failed to post answer. Please try again.");
      // Rollback optimistic update
      const rolledBackQuery = {
        ...selectedQuery,
        answers: selectedQuery.answers.filter(a => a._id !== tempId)
      };
      setSelectedQuery(rolledBackQuery);
      setQueries(prev => prev.map(q => q._id === currentQueryId ? rolledBackQuery : q));
      setAnswerContent(content); // restore their text
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this discussion?")) return;
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
        
        // Optimistically update
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
      console.error("Error deleting answer:", error);
    }
  };

  // Group queries by primary tag for the sidebar
  const groupedQueries = useMemo(() => {
    const groups = {};
    const filtered = queries.filter(q => q.title.toLowerCase().includes(searchQuery.toLowerCase()));
    
    filtered.forEach(q => {
      const tag = q.tags && q.tags.length > 0 ? q.tags[0] : "General";
      if (!groups[tag]) groups[tag] = [];
      groups[tag].push(q);
    });
    
    // Initialize expanded tags to true for all new groups if search is active, else default open all
    const allTags = Object.keys(groups);
    const newExpanded = { ...expandedTags };
    allTags.forEach(t => {
      if (newExpanded[t] === undefined) newExpanded[t] = true;
    });
    // Set expanded state outside of render cycle if needed, but doing it this way is fine for now
    
    return { groups, allTags };
  }, [queries, searchQuery]);

  const toggleTag = (tag) => {
    setExpandedTags(prev => ({ ...prev, [tag]: !prev[tag] }));
  };

  return (
    <div style={{ display: "flex", gap: "0", background: "#f8f4ee", border: "1px solid #e5d9c5", borderRadius: "12px", overflow: "hidden", height: "calc(100vh - 140px)", minHeight: "600px", boxShadow: "0 10px 30px rgba(160,110,40,0.05)" }}>
      
      {/* ─── LEFT SIDEBAR (FORUM NAV) ─── */}
      <div style={{ width: "320px", background: "#fff", display: "flex", flexDirection: "column", borderRight: "1px solid #e5d9c5", flexShrink: 0 }}>
        
        {/* Search */}
        <div style={{ padding: "20px", borderBottom: "1px solid #e5d9c5" }}>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#8b6535", display: "flex" }}>
              <SearchIcon />
            </div>
            <input 
              type="text" 
              placeholder="Cari judul forum..." // Match screenshot vibe
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: "100%", padding: "12px 14px 12px 40px", borderRadius: "8px", border: "1px solid #e5d9c5", outline: "none", fontSize: "0.9rem", boxSizing: "border-box", background: "#faf7f2", fontFamily: "'Inter', sans-serif" }}
            />
          </div>
          <button onClick={() => setShowAskForm(true)} style={{ width: "100%", marginTop: "12px", background: "#c8861a", color: "#fff", border: "none", padding: "10px", borderRadius: "8px", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
            <PlusIcon /> New Discussion
          </button>
        </div>

        {/* Sidebar List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 0" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "20px", color: "#8b6535", fontSize: "0.85rem" }}>Loading...</div>
          ) : groupedQueries.allTags.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px", color: "#8b6535", fontSize: "0.85rem" }}>No forums found.</div>
          ) : (
            groupedQueries.allTags.sort().map(tag => {
              const isExpanded = expandedTags[tag] !== false; // default true
              return (
                <div key={tag} style={{ borderBottom: "1px solid #f5efeb" }}>
                  <div 
                    onClick={() => toggleTag(tag)}
                    style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: isExpanded ? "#fdfaf5" : "#fff", transition: "background 0.2s" }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: "#1f1209", fontSize: "0.9rem", marginBottom: "2px" }}>{tag}</div>
                      <div style={{ fontSize: "0.75rem", color: "#8b6535" }}>{groupedQueries.groups[tag].length} Discussion{groupedQueries.groups[tag].length !== 1 && 's'}</div>
                    </div>
                    <div style={{ color: "#8b6535" }}>
                      {isExpanded ? <ChevronUp /> : <ChevronDown />}
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      {groupedQueries.groups[tag].map((q, idx) => {
                        const isSelected = selectedQuery?._id === q._id;
                        return (
                          <div 
                            key={q._id} 
                            onClick={() => setSelectedQuery(q)}
                            style={{ 
                              padding: "16px 20px 16px 36px", 
                              cursor: "pointer", 
                              background: isSelected ? "#fcf6ed" : "#fff",
                              position: "relative"
                            }}
                          >
                            {isSelected && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "4px", background: "#c8861a" }} />}
                            
                            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                              <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#e5d9c5", display: "flex", alignItems: "center", justifyContent: "center", color: "#8b6535", fontSize: "0.7rem", fontWeight: 700, flexShrink: 0, marginTop: "2px" }}>
                                {idx + 1}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: isSelected ? 700 : 600, color: isSelected ? "#b45309" : "#1f1209", fontSize: "0.9rem", marginBottom: "4px", lineHeight: 1.3 }}>
                                  {q.title}
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <div style={{ fontSize: "0.75rem", color: "#8b6535" }}>
                                    {new Date(q.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </div>
                                  {q.answers?.length > 0 && (
                                    <div style={{ background: "#ef4444", color: "#fff", fontSize: "0.65rem", fontWeight: 700, padding: "2px 6px", borderRadius: "10px" }}>
                                      {q.answers.length}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ─── RIGHT MAIN PANEL (CHAT / DISCUSSION) ─── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#fcfcfb", position: "relative" }}>
        
        {/* NEW DISCUSSION MODAL OVERLAY */}
        {showAskForm && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.95)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
            <div style={{ background: "#fff", width: "100%", maxWidth: "500px", padding: "32px", borderRadius: "16px", border: "1px solid #c8861a", boxShadow: "0 12px 40px rgba(200,134,26,0.15)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <h2 style={{ margin: 0, color: "#1f1209", fontSize: "1.4rem" }}>Start New Discussion</h2>
                <button onClick={() => setShowAskForm(false)} style={{ background: "none", border: "none", fontSize: "1.5rem", color: "#8b6535", cursor: "pointer" }}>&times;</button>
              </div>
              <form onSubmit={handleAsk}>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#4b3823", marginBottom: "6px" }}>Discussion Title</label>
                  <input value={title} onChange={e => setTitle(e.target.value)} type="text" placeholder="What's on your mind?" required style={{ width: "100%", padding: "12px 16px", borderRadius: "8px", border: "1px solid #e5d9c5", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#4b3823", marginBottom: "6px" }}>Details</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Provide more context..." rows={4} required style={{ width: "100%", padding: "12px 16px", borderRadius: "8px", border: "1px solid #e5d9c5", outline: "none", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }} />
                </div>
                <div style={{ marginBottom: "24px" }}>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#4b3823", marginBottom: "6px" }}>Tags (comma separated)</label>
                  <input value={tags} onChange={e => setTags(e.target.value)} type="text" placeholder="e.g. IFB001, Announcements" style={{ width: "100%", padding: "12px 16px", borderRadius: "8px", border: "1px solid #e5d9c5", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button type="submit" disabled={isSubmitting} style={{ background: isSubmitting ? "#e5c898" : "#c8861a", color: "#fff", border: "none", padding: "12px 28px", borderRadius: "8px", fontWeight: 700, fontSize: "0.95rem", cursor: isSubmitting ? "not-allowed" : "pointer" }}>
                    {isSubmitting ? "Posting..." : "Post Discussion"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {!selectedQuery ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#8b6535", flexDirection: "column", gap: "16px" }}>
            <MessageIcon />
            <div style={{ fontSize: "1.1rem", fontWeight: 600 }}>Select a discussion to view details</div>
          </div>
        ) : (
          <>
            {/* Header / Query Details */}
            <div style={{ padding: "32px", borderBottom: "1px solid #e5d9c5", background: "#fff", zIndex: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <h2 style={{ margin: 0, color: "#1f1209", fontSize: "1.5rem", fontWeight: 800 }}>{selectedQuery.title}</h2>
                {currentUser && (selectedQuery.author?._id === (currentUser._id || currentUser.id) || currentUser.role === 'admin') && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(selectedQuery._id); }}
                    style={{ background: "#fee2e2", border: "none", color: "#ef4444", cursor: "pointer", padding: "6px", borderRadius: "6px" }}
                    title="Delete Discussion"
                  >
                    <TrashIcon />
                  </button>
                )}
              </div>
              <div style={{ fontSize: "0.9rem", color: "#6b4d1f", marginBottom: "16px", display: "flex", gap: "8px" }}>
                {selectedQuery.tags?.map((t, i) => (
                  <span key={i} style={{ background: "#f8f4ee", padding: "2px 8px", borderRadius: "4px" }}>{t}</span>
                ))}
              </div>
              <div style={{ fontSize: "0.85rem", color: "#8b6535", display: "flex", alignItems: "center", gap: "12px", borderBottom: "1px solid #f5efeb", paddingBottom: "24px", marginBottom: "24px" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  {formatDate(selectedQuery.createdAt)}
                </span>
                <span>•</span>
                <span style={{ fontWeight: 600, color: "#4b3823" }}>{selectedQuery.author?.name || 'Anonymous'}</span>
              </div>

              {/* Warning/Info Box matched from design */}
              <div style={{ background: "#fef3c7", borderLeft: "4px solid #f59e0b", padding: "12px 16px", borderRadius: "4px", fontSize: "0.85rem", color: "#92400e", display: "flex", alignItems: "center", gap: "10px" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                This is a community space. Please be respectful and helpful in your replies.
              </div>
              
              {/* Original Question Content */}
              <div style={{ marginTop: "24px", background: "#f8f4ee", padding: "24px", borderRadius: "12px", display: "flex", gap: "16px" }}>
                 <div style={{ flexShrink: 0 }}><Avatar user={selectedQuery.author} size={40} /></div>
                 <div>
                   <div style={{ fontWeight: 700, color: "#1f1209", fontSize: "0.95rem", marginBottom: "6px" }}>{selectedQuery.author?.name || 'Anonymous'}</div>
                   <p style={{ margin: 0, color: "#4b3823", lineHeight: 1.6, whiteSpace: "pre-wrap", fontSize: "0.95rem" }}>
                     {selectedQuery.description}
                   </p>
                 </div>
              </div>
            </div>

            {/* Answers Feed */}
            <div style={{ flex: 1, overflowY: "auto", padding: "32px", display: "flex", flexDirection: "column", gap: "24px", background: "#fcfcfb" }}>
              {selectedQuery.answers?.length === 0 ? (
                <div style={{ textAlign: "center", color: "#8b6535", fontSize: "0.9rem", padding: "20px" }}>No replies yet. Be the first to answer!</div>
              ) : (
                selectedQuery.answers?.map((ans, i) => (
                  <div key={ans._id || i} style={{ 
                    display: "flex", gap: "16px", 
                    opacity: ans.isOptimistic ? 0.6 : 1, // faded if posting
                    transition: "opacity 0.2s" 
                  }}>
                    <div style={{ flexShrink: 0 }}>
                      <Avatar user={ans.author} size={40} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <span style={{ fontWeight: 700, color: "#1f1209", fontSize: "0.95rem" }}>{ans.author?.name || 'Anonymous'}</span>
                        <span style={{ fontSize: "0.75rem", color: "#8b6535" }}>{formatDate(ans.createdAt)}</span>
                        {ans.isOptimistic && <span style={{ fontSize: "0.7rem", color: "#c8861a", fontWeight: 700, fontStyle: "italic" }}>Posting...</span>}
                      </div>
                      <p style={{ margin: 0, color: "#4b3823", lineHeight: 1.6, whiteSpace: "pre-wrap", fontSize: "0.95rem" }}>
                        {ans.content}
                      </p>
                      
                      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "10px" }}>
                        {currentUser && !ans.isOptimistic && (ans.author?._id === (currentUser._id || currentUser.id) || currentUser.role === 'admin') && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteAnswer(selectedQuery._id, ans._id); }}
                            style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px", padding: 0 }}
                          >
                            <TrashIcon /> Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {/* Invisible element to scroll to */}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area (Sticky Bottom) */}
            <div style={{ padding: "20px 32px", background: "#fff", borderTop: "1px solid #e5d9c5", zIndex: 10 }}>
              <form onSubmit={handleAnswer} style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
                <div style={{ flex: 1, border: "1px solid #e5d9c5", borderRadius: "12px", background: "#fcfcfb", display: "flex", flexDirection: "column", padding: "4px" }}>
                  <textarea 
                    value={answerContent} 
                    onChange={e => setAnswerContent(e.target.value)}
                    placeholder="Tulis komentar..." // matched from design
                    rows={1}
                    style={{ 
                      width: "100%", padding: "12px 14px", border: "none", outline: "none", 
                      fontFamily: "inherit", resize: "vertical", minHeight: "48px", maxHeight: "150px",
                      background: "transparent", fontSize: "0.95rem"
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAnswer(e);
                      }
                    }}
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isSubmitting || !answerContent.trim()} 
                  style={{ 
                    background: (isSubmitting || !answerContent.trim()) ? "#e5d9c5" : "#0066ff", // Using the blue from screenshot for the send button accent
                    color: "#fff", border: "none", width: "48px", height: "48px", borderRadius: "12px", 
                    cursor: (isSubmitting || !answerContent.trim()) ? "not-allowed" : "pointer", 
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    transition: "background 0.2s"
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
