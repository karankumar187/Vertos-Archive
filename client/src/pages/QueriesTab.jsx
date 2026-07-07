import { useState, useEffect, useMemo } from "react";
import { queriesAPI } from "../services/api";
import { cacheGet, cacheSet, cacheInvalidate } from "../utils/localCache";
import { useAuth } from "../context/AuthContext";

// SVGs
const SearchIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const FilterIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>;
const CheckIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>;
const MessageIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>;
const PlusIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const StarIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const TrashIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>;

// Helper to get time ago
const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} minutes ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hours ago`;
  return `${Math.floor(h / 24)} days ago`;
};

const tagColors = {
  "FAQ's": "#f59e0b",
  "Off-Topic Chatter": "#10b981",
  "Feedback": "#8b5cf6",
  "Member Spotlight": "#ef4444",
  "Introductions": "#06b6d4",
  "Announcements": "#ec4899",
  "Showcase": "#94a3b8",
  "Jobs": "#d97706"
};

const getTagColor = (tag) => {
  if (tagColors[tag]) return tagColors[tag];
  // Hash string to color
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 50%)`;
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
  
  // Filters and Search
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All Discussion"); // category filter
  
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
    const cached = cacheGet('community_queries');
    if (cached) {
      setQueries(cached);
      setLoading(false);
      fetchQueries(true);
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
      // Default to Announcements or FAQ if empty
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
        setSelectedQuery(data.data);
        fetchQueries();
      }
    } catch (error) {
      console.error("Error adding answer:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Derived state for categories sidebar
  const uniqueTags = useMemo(() => {
    const tgs = new Set();
    queries.forEach(q => {
      if (q.tags) q.tags.forEach(t => tgs.add(t));
    });
    return Array.from(tgs).slice(0, 8); // limit to 8
  }, [queries]);

  // Filtered queries
  const filteredQueries = useMemo(() => {
    return queries.filter(q => {
      const matchesSearch = q.title.toLowerCase().includes(searchQuery.toLowerCase()) || q.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = activeFilter === "All Discussion" || activeFilter === "Following" || (q.tags && q.tags.includes(activeFilter));
      return matchesSearch && matchesFilter;
    });
  }, [queries, searchQuery, activeFilter]);

  // --- VIEW: SINGLE QUERY DETAIL ---
  if (selectedQuery) {
    return (
      <div style={{ maxWidth: "900px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
        <button 
          onClick={() => setSelectedQuery(null)}
          style={{ background: "none", border: "none", color: "#c8861a", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", padding: 0, alignSelf: "flex-start", fontFamily: "'Inter', sans-serif" }}
        >
          ← Back to Discussions
        </button>

        {/* Original Question Card */}
        <div style={{ background: "#fff", borderRadius: "16px", padding: "32px", border: "1px solid #f0e6d2", boxShadow: "0 2px 12px rgba(160,110,40,0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
            <h2 style={{ margin: 0, color: "#1f1209", fontSize: "1.7rem", fontFamily: "'Playfair Display', serif", fontWeight: 800 }}>{selectedQuery.title}</h2>
            {currentUser && (selectedQuery.author?._id === (currentUser._id || currentUser.id) || currentUser.role === 'admin') && (
              <button 
                onClick={(e) => { e.stopPropagation(); handleDelete(selectedQuery._id); }}
                style={{ background: "#fee2e2", border: "none", color: "#ef4444", cursor: "pointer", padding: "8px", borderRadius: "8px", marginLeft: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}
                title="Delete Query"
              >
                <TrashIcon />
              </button>
            )}
          </div>
          
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "24px" }}>
            {selectedQuery.tags?.map((tag, i) => (
              <span key={i} style={{ fontSize: "0.75rem", background: "#f8f4ee", color: getTagColor(tag), padding: "4px 12px", borderRadius: "100px", fontWeight: 700, border: `1px solid ${getTagColor(tag)}33` }}>
                {tag}
              </span>
            ))}
          </div>
          
          <p style={{ fontSize: "1.05rem", color: "#6b4d1f", lineHeight: 1.7, whiteSpace: "pre-wrap", margin: 0 }}>
            {selectedQuery.description}
          </p>
          
          <div style={{ marginTop: "32px", paddingTop: "20px", borderTop: "1px solid #f5efeb", display: "flex", alignItems: "center", gap: "12px" }}>
            <Avatar user={selectedQuery.author} size={44} />
            <div style={{ fontSize: "0.85rem", color: "#8b6535" }}>
              <div style={{ color: "#1f1209", fontWeight: 700, fontSize: "0.95rem" }}>{selectedQuery.author?.name || 'Anonymous'}</div>
              <div>{new Date(selectedQuery.createdAt).toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Answers Section */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "10px 0 0 0" }}>
          <h3 style={{ margin: 0, color: "#1f1209", fontSize: "1.2rem", fontWeight: 800 }}>{selectedQuery.answers?.length || 0} Replies</h3>
          <div style={{ height: "1px", flex: 1, background: "#f0e6d2" }} />
        </div>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {selectedQuery.answers?.map((ans, i) => (
            <div key={i} style={{ background: "#fff", borderRadius: "16px", padding: "24px", border: "1px solid #f0e6d2", display: "flex", gap: "16px" }}>
              <div style={{ flexShrink: 0 }}>
                <Avatar user={ans.author} size={40} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                  <div>
                    <span style={{ color: "#1f1209", fontWeight: 700, fontSize: "0.95rem", marginRight: "8px" }}>{ans.author?.name || 'Anonymous'}</span>
                    <span style={{ fontSize: "0.75rem", color: "#8b6535" }}>{timeAgo(ans.createdAt)}</span>
                  </div>
                  {currentUser && (ans.author?._id === (currentUser._id || currentUser.id) || currentUser.role === 'admin') && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteAnswer(selectedQuery._id, ans._id); }}
                      style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "4px" }}
                      title="Delete Answer"
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>
                <p style={{ margin: 0, color: "#4b3823", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{ans.content}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Post Answer Form */}
        <form onSubmit={handleAnswer} style={{ background: "#fff", borderRadius: "16px", padding: "24px", border: "1px dashed #c8861a", marginTop: "16px" }}>
          <h4 style={{ margin: "0 0 16px 0", color: "#1f1209", fontSize: "1.1rem" }}>Write a reply...</h4>
          <textarea 
            value={answerContent} onChange={e => setAnswerContent(e.target.value)}
            placeholder="Share your thoughts or answer the question. Be helpful and respectful!"
            rows={4} required
            style={{ width: "100%", padding: "16px", borderRadius: "12px", border: "1px solid #f0e6d2", outline: "none", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", marginBottom: "16px", fontSize: "0.95rem", background: "#fcfbf9" }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" disabled={isSubmitting} style={{ background: isSubmitting ? "#e5c898" : "linear-gradient(135deg, #c8861a, #b45309)", color: "#fff", border: "none", padding: "12px 28px", borderRadius: "100px", fontWeight: 700, fontSize: "0.95rem", cursor: isSubmitting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 4px 12px rgba(200,134,26,0.2)" }}>
              {isSubmitting ? "Posting..." : "Post Reply"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // --- VIEW: FORUM LAYOUT ---
  return (
    <div style={{ display: "flex", gap: "32px", maxWidth: "1200px", margin: "0 auto", alignItems: "flex-start" }}>
      
      {/* LEFT COLUMN: Search & List */}
      <div style={{ flex: 1, minWidth: 0 }}>
        
        {/* Search Bar */}
        <div style={{ position: "relative", marginBottom: "24px" }}>
          <div style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "#8b6535", display: "flex" }}>
            <SearchIcon />
          </div>
          <input 
            type="text" 
            placeholder="Search the forum..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: "100%", padding: "16px 16px 16px 44px", borderRadius: "100px", border: "1px solid #f0e6d2", outline: "none", fontSize: "1rem", boxSizing: "border-box", background: "#fff", boxShadow: "0 2px 8px rgba(160,110,40,0.04)", fontFamily: "'Inter', sans-serif" }}
          />
        </div>

        {/* Toolbar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ background: "#fff", border: "1px solid #f0e6d2", borderRadius: "8px", padding: "8px 14px", fontSize: "0.85rem", fontWeight: 600, color: "#1f1209", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
              Latest first <FilterIcon />
            </div>
          </div>
          <div style={{ fontSize: "0.85rem", color: "#8b6535", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }} onClick={() => { setActiveFilter("All Discussion"); setSearchQuery(""); }}>
            <CheckIcon /> Clear filters
          </div>
        </div>

        {/* Ask Form Inline (conditionally shown) */}
        {showAskForm && (
          <div style={{ background: "#fff", borderRadius: "16px", padding: "28px", border: "1px solid #c8861a", marginBottom: "24px", boxShadow: "0 8px 24px rgba(200,134,26,0.12)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, color: "#1f1209", fontSize: "1.3rem" }}>Start New Discussion</h3>
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
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#4b3823", marginBottom: "6px" }}>Tags (comma separated)</label>
                <input value={tags} onChange={e => setTags(e.target.value)} type="text" placeholder="e.g. Announcements, FAQ, Suggestions" style={{ width: "100%", padding: "12px 16px", borderRadius: "8px", border: "1px solid #e5d9c5", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" disabled={isSubmitting} style={{ background: isSubmitting ? "#e5c898" : "linear-gradient(135deg, #c8861a, #b45309)", color: "#fff", border: "none", padding: "12px 28px", borderRadius: "100px", fontWeight: 700, fontSize: "0.95rem", cursor: isSubmitting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                  {isSubmitting ? "Posting..." : "Post Discussion"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Queries List */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#8b6535", fontWeight: 600 }}>Loading discussions...</div>
        ) : filteredQueries.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 40px", background: "#fff", borderRadius: "16px", border: "1px dashed #e5d9c5", color: "#8b6535" }}>
            <div style={{ fontSize: "2rem", marginBottom: "12px" }}>🤔</div>
            <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "8px", color: "#1f1209" }}>No discussions found</div>
            <div>Try adjusting your search or filters.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {filteredQueries.map(q => {
              const primaryTag = q.tags && q.tags[0] ? q.tags[0] : "General";
              const tagColor = getTagColor(primaryTag);
              const latestReply = q.answers?.length > 0 ? q.answers[q.answers.length - 1] : null;
              
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
                <div key={q._id} 
                     onClick={() => setSelectedQuery(q)}
                     style={{ 
                       background: "#fff", borderRadius: "12px", border: "1px solid #f0e6d2", 
                       padding: "24px", position: "relative", cursor: "pointer",
                       transition: "all 0.2s", boxShadow: "0 2px 8px rgba(160,110,40,0.02)",
                       display: "flex", gap: "20px"
                     }}
                     onMouseEnter={e => {
                       e.currentTarget.style.borderColor = "#c8861a";
                       e.currentTarget.style.boxShadow = "0 6px 16px rgba(200,134,26,0.08)";
                     }}
                     onMouseLeave={e => {
                       e.currentTarget.style.borderColor = "#f0e6d2";
                       e.currentTarget.style.boxShadow = "0 2px 8px rgba(160,110,40,0.02)";
                     }}
                >
                  {/* Floating Tag */}
                  <div style={{ 
                    position: "absolute", top: -12, right: 32, 
                    background: "#fff", border: `1px solid ${tagColor}40`, 
                    borderRadius: "100px", padding: "4px 10px", 
                    display: "flex", alignItems: "center", gap: "6px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: tagColor }} />
                    <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#6b4d1f", textTransform: "uppercase", letterSpacing: "0.05em" }}>{primaryTag}</span>
                  </div>

                  {/* Author Avatar */}
                  <div style={{ flexShrink: 0 }}>
                    <Avatar user={q.author} size={48} />
                  </div>

                  {/* Main Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                      <h3 style={{ margin: 0, fontSize: "1.25rem", color: "#1f1209", fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {q.title}
                      </h3>
                      {currentUser && (q.author?._id === (currentUser._id || currentUser.id) || currentUser.role === 'admin') && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(q._id); }}
                          style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "4px", opacity: 0.6 }}
                          onMouseEnter={e => e.currentTarget.style.opacity = 1}
                          onMouseLeave={e => e.currentTarget.style.opacity = 0.6}
                          title="Delete Query"
                        >
                          <TrashIcon />
                        </button>
                      )}
                    </div>
                    
                    <div style={{ fontSize: "0.75rem", color: "#8b6535", marginBottom: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 015.5 5.5v0a5.5 5.5 0 01-5.5 5.5H11"/></svg>
                      {latestReply ? (
                        <>Latest reply from <strong>@{latestReply.author?.name?.split(' ')[0] || 'someone'}</strong> {timeAgo(latestReply.createdAt)}</>
                      ) : (
                        <>Asked by <strong>@{q.author?.name?.split(' ')[0] || 'someone'}</strong> {timeAgo(q.createdAt)}</>
                      )}
                    </div>
                    
                    <p style={{ margin: 0, fontSize: "0.9rem", color: "#6b4d1f", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {q.description}
                    </p>
                  </div>

                  {/* Right Side Stats */}
                  <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center", gap: "12px", width: "120px" }}>
                    {/* Avatar Pile */}
                    <div style={{ display: "flex", paddingRight: "8px" }}>
                      {commenters.slice(0, 4).map((c, i) => (
                        <div key={i} style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid #fff", marginLeft: i > 0 ? "-10px" : 0, zIndex: 10 - i }}>
                          <Avatar user={c} size={24} />
                        </div>
                      ))}
                      {commenters.length > 4 && (
                        <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid #fff", marginLeft: "-10px", background: "#f0e6d2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", fontWeight: 700, color: "#8b6535", zIndex: 5 }}>
                          +{commenters.length - 4}
                        </div>
                      )}
                    </div>
                    
                    {/* Comment count */}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", fontWeight: 700, color: "#8b6535" }}>
                      <MessageIcon /> {q.answers?.length || 0} Comments
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RIGHT SIDEBAR */}
      <div style={{ width: "260px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "32px", position: "sticky", top: "140px" }}>
        
        <button onClick={() => setShowAskForm(!showAskForm)} style={{ width: "100%", background: "linear-gradient(135deg, #c8861a, #b45309)", color: "#fff", border: "none", padding: "14px 20px", borderRadius: "12px", fontWeight: 800, fontSize: "1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", boxShadow: "0 4px 14px rgba(200,134,26,0.25)" }}>
          <PlusIcon /> Start New Discussion
        </button>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div 
            onClick={() => setActiveFilter("All Discussion")}
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", cursor: "pointer", borderRadius: "8px", background: activeFilter === "All Discussion" ? "#fdfaf5" : "transparent", color: activeFilter === "All Discussion" ? "#c8861a" : "#6b4d1f", fontWeight: activeFilter === "All Discussion" ? 700 : 600 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}><MessageIcon /> All Discussion</div>
            {activeFilter === "All Discussion" && <CheckIcon />}
          </div>
          <div 
            onClick={() => setActiveFilter("Following")}
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", cursor: "pointer", borderRadius: "8px", background: activeFilter === "Following" ? "#fdfaf5" : "transparent", color: activeFilter === "Following" ? "#c8861a" : "#6b4d1f", fontWeight: activeFilter === "Following" ? 700 : 600 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}><StarIcon /> Following</div>
            {activeFilter === "Following" && <CheckIcon />}
          </div>
        </div>

        <div style={{ height: "1px", background: "#f0e6d2", width: "80%", margin: "0 auto" }} />

        <div>
          <h4 style={{ margin: "0 0 16px 14px", color: "#1f1209", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 800 }}>Categories</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {["FAQ's", "Off-Topic Chatter", "Feedback", "Member Spotlight", "Introductions", "Announcements", "Showcase", "Jobs"].map((tag, i) => {
              // Only show predefined ones or dynamically collected ones
              const isActive = activeFilter === tag;
              return (
                <div 
                  key={i}
                  onClick={() => setActiveFilter(tag)}
                  style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", cursor: "pointer", borderRadius: "8px", background: isActive ? "#fdfaf5" : "transparent" }}
                >
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: getTagColor(tag), boxShadow: isActive ? `0 0 0 3px ${getTagColor(tag)}33` : "none" }} />
                  <span style={{ fontSize: "0.9rem", fontWeight: isActive ? 700 : 600, color: isActive ? "#1f1209" : "#6b4d1f" }}>{tag}</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
