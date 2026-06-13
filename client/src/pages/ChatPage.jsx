import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import vertoAiAvatar from "../assets/verto-ai.jpg";
import { chatAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

/* ── Data ── */
const CATEGORIES = [
  "Notes",
  "Syllabus",
  "Previous Papers",
  "Placements",
  "Faculty",
  "University Info",
];

const WELCOME = {
  role: "assistant",
  id: "w0",
  content: "Welcome to **Verto AI**! I'm your AI-powered university assistant. Ask me anything about LPU — notes, PYQs, syllabus, placements, faculty, or campus life.",
  time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
};

const SUGGESTIONS = [
  "What are important DBMS topics for finals?",
  "Show previous year ETP papers",
  "Tell me about LPU placement drives",
  "How do I apply for hostel?",
  "Faculty details for CSE department",
];

const preprocessMath = (text) => {
    if (!text) return "";
    let res = text;
    // Fix standard escaped brackets
    res = res.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$');
    res = res.replace(/\\\((.*?)\\\)/g, '$$$1$$');
    
    // Fix raw [ ... ] for block math if it contains \begin, \frac, \int, ^, \, or =
    // Only if not followed by ( to avoid breaking markdown links
    res = res.replace(/\[\s*([^[\]]*?[\^\\=][^[\]]*?)\s*\](?!\()/g, '$$$$ $1 $$$$');

    // Fix raw ( ... ) for inline math if it contains ^, \, or =
    res = res.replace(/\(\s*([^()]*?[\^\\=][^()]*?)\s*\)/g, '$$ $1 $$');
    return res;
};

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  const [showSources, setShowSources] = useState(false);
  const uniqueSources = msg.sources ? [...new Map(msg.sources.map(s => [s.documentId, s])).values()] : [];
  
  return (
    <div style={{
      display: "flex",
      justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom: "16px",
      gap: "10px",
      alignItems: "flex-start",
    }}>
      {!isUser && (
        <img 
          src={vertoAiAvatar} 
          alt="Verto AI"
          style={{
            width: "34px", height: "34px", flexShrink: 0,
            borderRadius: "10px",
            objectFit: "cover",
            boxShadow: "0 2px 10px rgba(180,83,9,0.2)",
          }}
        />
      )}

      <div style={{ maxWidth: "85%", display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start" }}>
        <div style={{
          padding: "12px 16px",
          background: isUser
            ? "linear-gradient(135deg, #d97706 0%, #b45309 100%)"
            : "#ffffff",
          border: isUser ? "none" : "1px solid #e9dcc8",
          borderRadius: isUser ? "14px 14px 4px 14px" : "4px 14px 14px 14px",
          boxShadow: isUser ? "0 4px 14px rgba(180,83,9,0.22)" : "0 2px 10px rgba(160,110,40,0.07)",
        }}>
          <div style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "0.875rem",
          color: isUser ? "#fff" : "#1f1209",
          lineHeight: 1.7,
        }} className="markdown-body">
          {isUser ? (
             <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{msg.content}</p>
          ) : (
             <ReactMarkdown 
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
             >
               {preprocessMath(msg.content)}
             </ReactMarkdown>
          )}
        </div>
        {uniqueSources.length > 0 && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #e9dcc8' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showSources ? '12px' : '0' }}>
                    <p style={{
                        fontSize: '0.68rem', color: '#9a7845', fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                        display: 'flex', alignItems: 'center', gap: '4px', margin: 0
                    }}>
                        📚 {uniqueSources.length} Sources
                    </p>
                    <button 
                        onClick={() => setShowSources(!showSources)}
                        style={{
                            background: showSources ? '#fef3dc' : 'transparent',
                            border: '1px solid #e8c96a',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            color: '#8b5e0a',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '4px',
                            transition: 'all 0.2s'
                        }}
                    >
                        {showSources ? 'Hide' : 'Show'} Sources {showSources ? '▲' : '▼'}
                    </button>
                </div>

                {/* Deduplicate by documentId */}
                {showSources && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {uniqueSources.map((src, i) => {
                        const primaryUrl = src.fileUrl ||
                            (src.files && src.files.length > 0
                                ? (typeof src.files[0] === 'string' ? src.files[0] : src.files[0]?.url)
                                : null);

                        return (
                            <div key={i} style={{
                                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                                padding: '8px 10px',
                                background: '#fdfaf5',
                                border: '1px solid #e9dcc8',
                                borderRadius: '8px',
                                minWidth: '220px', maxWidth: '300px', flex: '1 1 auto',
                                gap: '8px',
                            }}>
                                {/* Top: icon + title + badge */}
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                    <span style={{ fontSize: '0.8rem', marginTop: '1px' }}>
                                        {src.fileType?.startsWith('image/') ? '🖼️' :
                                         src.fileType === 'application/pdf' ? '📄' :
                                         src.fileType?.includes('word') || src.fileType?.includes('presentation') ? '📝' : '📄'}
                                    </span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                            <span style={{
                                                fontSize: '0.72rem', fontWeight: 600, color: '#3d2800',
                                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                maxWidth: '140px'
                                            }} title={src.title}>{src.title}</span>
                                            {src.category && (
                                                <span style={{
                                                    fontSize: '0.58rem', fontWeight: 600,
                                                    padding: '1px 5px', borderRadius: '4px',
                                                    background: '#fef3dc', color: '#8b5e0a',
                                                    border: '1px solid #e8c96a', flexShrink: 0
                                                }}>{src.category}</span>
                                            )}
                                        </div>
                                        {src.subject && (
                                            <p style={{ fontSize: '0.62rem', color: '#9a7845', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{src.subject}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Bottom: Action Buttons */}
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end', borderTop: '1px solid #f0e8d8', paddingTop: '6px', marginTop: 'auto' }}>
                                    {/* Numbered page buttons for multi-file docs */}
                                    {src.files && src.files.length > 1 && (
                                        <div style={{ display: 'flex', gap: '3px', marginRight: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                                            {src.files.map((f, idx) => {
                                                const url = typeof f === 'string' ? f : f?.url;
                                                if (!url) return null;
                                                return (
                                                    <a key={idx} href={url} target="_blank" rel="noopener noreferrer" title={`Page ${idx + 1}`}
                                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', background: '#f5ead5', borderRadius: '4px', textDecoration: 'none', color: '#8b5e0a', fontSize: '0.58rem', fontWeight: 700, transition: 'background 0.15s' }}
                                                        onMouseEnter={e => e.currentTarget.style.background = '#e9dcc8'} onMouseLeave={e => e.currentTarget.style.background = '#f5ead5'}>
                                                        {idx + 1}
                                                    </a>
                                                );
                                            })}
                                        </div>
                                    )}
                                    
                                    {/* Open + Download */}
                                    {primaryUrl && (
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <a href={primaryUrl} target="_blank" rel="noopener noreferrer" title="Open Document"
                                                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0 8px', height: '22px', background: 'linear-gradient(135deg, #d97706, #b45309)', borderRadius: '4px', textDecoration: 'none', boxShadow: '0 1px 3px rgba(180,83,9,0.2)', transition: 'opacity 0.15s' }}
                                                onMouseEnter={e => e.currentTarget.style.opacity = '0.85'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6m0 0v6m0-6L10 14" />
                                                </svg>
                                                <span style={{ fontSize: '0.62rem', fontWeight: 600, color: '#fff' }}>Open</span>
                                            </a>
                                            <a href={primaryUrl} download={src.title || 'document'} title="Download"
                                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', background: '#fff', border: '1px solid #ddd0b8', borderRadius: '4px', textDecoration: 'none', transition: 'all 0.15s' }}
                                                onMouseEnter={e => { e.currentTarget.style.background = '#fdf5e8'; e.currentTarget.style.borderColor = '#c8861a'; }} onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#ddd0b8'; }}>
                                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2.5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v13m0 0l-4-4m4 4l4-4M4 20h16" />
                                                </svg>
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                )}
            </div>
        )}
        </div>
        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "0.7rem",
          color: "#b0916a",
          marginTop: "6px",
        }}>{msg.time}</p>
      </div>

      {isUser && (
        <div style={{
          width: "34px", height: "34px", flexShrink: 0,
          background: "linear-gradient(135deg, #c8a87a, #9a7845)",
          borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontWeight: 700, fontSize: "0.875rem",
          fontFamily: "'Inter', sans-serif",
        }}>K</div>
      )}
    </div>
  );
}

export default function ChatPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(localStorage.getItem('activeConversationId') || null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const endRef = useRef(null);
  const chatScrollRef = useRef(null);
  const inputRef = useRef(null);
  const didAutoSend = useRef(false);

  // Load sidebar conversations
  const loadConversations = async () => {
      try {
          const res = await chatAPI.getConversations();
          if (res.data.success) {
              setConversations(res.data.conversations);
          }
      } catch (err) {
          console.error("Failed to load conversations", err);
      }
  };

  useEffect(() => {
      loadConversations();
      const savedId = localStorage.getItem('activeConversationId');
      if (savedId) {
          selectConversation(savedId);
      }
  }, []);

  // Read URL params on first render and auto-send
  useEffect(() => {
    if (didAutoSend.current) return;
    const q = searchParams.get("q");
    const cat = searchParams.get("category");
    if (cat) setActiveCategory(cat);
    if (q) {
      didAutoSend.current = true;
      setSearchParams({}, { replace: true });
      setTimeout(() => sendMessageDirect(q, cat), 100);
    } else if (cat) {
      didAutoSend.current = true;
      setSearchParams({}, { replace: true });
      setTimeout(() => sendMessageDirect(`Tell me about ${cat} resources available on Vertos Archive`, cat), 100);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    if (isNearBottom) {
      endRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [messages, loading]);

  const createNewConversation = async () => {
      try {
          const res = await chatAPI.createConversation();
          const newId = res.data.conversation._id;
          setActiveConversationId(newId);
          localStorage.setItem('activeConversationId', newId);
          loadConversations();
          return newId;
      } catch (err) {
          console.error("Failed to create conversation", err);
          return null;
      }
  };

  const handleNewChatClick = async () => {
      localStorage.removeItem('activeConversationId');
      setActiveConversationId(null);
      setMessages([WELCOME]);
  };

  const selectConversation = async (id) => {
      setActiveConversationId(id);
      localStorage.setItem('activeConversationId', id);
      try {
          const res = await chatAPI.getMessages(id);
          if (res.data.messages.length === 0) {
              setMessages([WELCOME]);
          } else {
              setMessages(res.data.messages.map(m => ({
                  ...m,
                  id: m._id,
                  time: new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              })));
              setTimeout(() => endRef.current?.scrollIntoView({ behavior: "auto" }), 100);
          }
      } catch (err) {
          console.error("Failed to fetch messages", err);
      }
  };

  // Internal send — accepts explicit text so we can call before state settles
  const sendMessageDirect = async (text, category) => {
    const q = text.trim();
    if (!q) return;
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    
    // Optimistically add user message
    setMessages(prev => [...prev, { role: "user", id: `u_${Date.now()}`, content: q, time: now }]);
    setInput("");
    setLoading(true);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    // Get or create conversation ID
    let currentConvId = activeConversationId;
    if (!currentConvId) {
        currentConvId = await createNewConversation();
    }

    let assistantMsgId = null;

    try {
        const token = localStorage.getItem('token');
        const filters = category ? { category: category.toLowerCase() } : {};
        const VITE_API_URL = (import.meta?.env?.VITE_API_URL) || 'http://localhost:5001/api';

        const response = await fetch(`${VITE_API_URL}/chat/conversations/${currentConvId}/message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ content: q, filters })
        });

        if (!response.ok) {
            throw new Error("Failed to send message");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let buffer = '';
        let isSourcesEvent = false;

        while (!done) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;
            if (value) {
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                // The last line might be incomplete, so we pop it back into the buffer
                buffer = lines.pop();

                lines.forEach(line => {
                    if (line.startsWith('event: sources')) {
                        isSourcesEvent = true;
                    } else if (line.startsWith('data: ')) {
                        const dataStr = line.replace('data: ', '').trim();
                        if (dataStr === '[DONE]') {
                            setLoading(false);
                            loadConversations(); // refresh title
                            return;
                        }

                        try {
                            const parsed = JSON.parse(dataStr);
                            if (isSourcesEvent) {
                                if (!assistantMsgId) {
                                    assistantMsgId = `a_${Date.now()}`;
                                    setMessages(prev => [...prev, { role: "assistant", id: assistantMsgId, content: "", time: now, sources: parsed }]);
                                } else {
                                    setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, sources: parsed } : m));
                                }
                                isSourcesEvent = false;
                            } else if (parsed.token) {
                                if (!assistantMsgId) {
                                    assistantMsgId = `a_${Date.now()}`;
                                    setMessages(prev => [...prev, { role: "assistant", id: assistantMsgId, content: parsed.token, time: now, sources: [] }]);
                                } else {
                                    setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: m.content + parsed.token } : m));
                                }
                            } else if (parsed.message) { // error
                                if (!assistantMsgId) {
                                    assistantMsgId = `a_${Date.now()}`;
                                    setMessages(prev => [...prev, { role: "assistant", id: assistantMsgId, content: "\n\n**Error:** " + parsed.message, time: now, sources: [] }]);
                                } else {
                                    setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: m.content + "\n\n**Error:** " + parsed.message } : m));
                                }
                            }
                        } catch (e) {
                            console.error("Error parsing stream chunk", e, dataStr);
                        }
                    }
                });
            }
        }
    } catch (err) {
        console.error("Stream error", err);
        if (!assistantMsgId) {
            setMessages(prev => [...prev, { role: "assistant", id: `a_${Date.now()}`, content: "*(Error connecting to server)*", time: now, sources: [] }]);
        } else {
            setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: m.content + "\n\n*(Error connecting to server)*" } : m));
        }
        setLoading(false);
    }
  };

  const sendMessage = (text) => sendMessageDirect(text || input, activeCategory);

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={{
      height: "calc(100vh - 68px)",
      display: "flex",
      background: "#faf8f4",
      overflow: "hidden",
    }}>
      {/* Mobile Backdrop */}
      <div className={`mobile-backdrop ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

      {/* ── Sidebar ── */}
      <aside className={`mobile-sidebar ${sidebarOpen ? 'open' : ''}`} style={{
        width: "230px",
        flexShrink: 0,
        background: "#ffffff",
        borderRight: "1px solid #e9dcc8",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Brand in sidebar */}
        <div style={{
          padding: "20px 18px 16px",
          borderBottom: "1px solid #f0e8d8",
        }}>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 700, color: "#1f1209" }}>
            <span style={{ color: "#c8861a" }}>Verto</span> AI
          </p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.73rem", color: "#9a7845", marginTop: "2px" }}>
            University Assistant
          </p>
        </div>

        {/* New chat */}
        <div style={{ padding: "14px 14px 10px" }}>
          <button
            id="new-chat-sidebar"
            onClick={handleNewChatClick}
            style={{
              width: "100%", padding: "10px",
              background: "linear-gradient(135deg, #d97706, #b45309)",
              border: "none", borderRadius: "9px", color: "#fff",
              fontFamily: "'Inter', sans-serif", fontSize: "0.82rem", fontWeight: 600,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
              boxShadow: "0 3px 12px rgba(180,83,9,0.22)",
            }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" d="M12 5v14M5 12h14" />
            </svg>
            New Conversation
          </button>
        </div>

        {/* History */}
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 14px 12px" }}>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.68rem", fontWeight: 600, color: "#9a7845", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>Recent Chats</p>
            {conversations.map((conv) => (
                <button key={conv._id} onClick={() => { selectConversation(conv._id); setSidebarOpen(false); }}
                    style={{
                        display: "block", width: "100%", textAlign: "left",
                        padding: "9px 12px", borderRadius: "8px",
                        background: activeConversationId === conv._id ? "#fdf5e8" : "transparent",
                        border: "none",
                        fontFamily: "'Inter', sans-serif", fontSize: "0.78rem", color: "#5c4021",
                        cursor: "pointer", marginBottom: "2px",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                    }}
                >{conv.title}</button>
            ))}
        </div>

        {/* Quick topics */}
        {!activeConversationId && (
            <div style={{ padding: "4px 14px 12px" }}>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.68rem", fontWeight: 600, color: "#9a7845", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>Quick Topics</p>
            {SUGGESTIONS.slice(0,3).map((s, i) => (
                <button key={i} onClick={() => sendMessage(s)}
                style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "9px 12px", borderRadius: "8px",
                    background: "transparent", border: "none",
                    fontFamily: "'Inter', sans-serif", fontSize: "0.78rem", color: "#5c4021",
                    cursor: "pointer", marginBottom: "2px",
                    transition: "background 0.15s",
                    lineHeight: 1.4,
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#fdf5e8"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >{s}</button>
            ))}
            </div>
        )}

        {/* Footer in sidebar */}
        <div style={{
          marginTop: "auto", padding: "14px 16px",
          borderTop: "1px solid #f0e8d8",
          background: "#fdfaf5",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0,
              background: "linear-gradient(135deg, #d97706, #b45309)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 700, fontSize: "0.8rem",
            }}>{user?.name?.charAt(0) || 'U'}</div>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.78rem", fontWeight: 600, color: "#1f1209", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.name || 'User'}</p>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.68rem", color: "#9a7845", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.email || ''}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Chat Area ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
        
        {/* Mobile Sidebar Toggle - Floating */}
        <div className="mobile-only-flex" style={{ position: "absolute", top: "16px", left: "16px", zIndex: 10 }}>
          <button 
            onClick={() => setSidebarOpen(true)}
            style={{
              background: "rgba(253,250,245,0.9)", border: "1px solid #e9dcc8", borderRadius: "8px", padding: "8px", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", color: "#5c4021",
              backdropFilter: "blur(4px)", boxShadow: "0 2px 10px rgba(160,110,40,0.15)"
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div 
          ref={chatScrollRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px 20px 0 20px",
            scrollBehavior: "smooth"
          }}
        >
          {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}

          {/* Typing indicator */}
          {loading && messages[messages.length - 1]?.role === "user" && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "16px" }}>
              <img 
                src={vertoAiAvatar}
                alt="Verto AI"
                style={{
                  width: "34px", height: "34px", flexShrink: 0,
                  borderRadius: "10px",
                  objectFit: "cover",
                }}
              />
              <div style={{
                padding: "13px 17px",
                background: "#ffffff",
                border: "1px solid #e9dcc8",
                borderRadius: "4px 16px 16px 16px",
                display: "flex", alignItems: "center", gap: "5px",
              }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: "7px", height: "7px",
                    background: "#c8861a",
                    borderRadius: "50%",
                    animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input bar - Floating Style */}
        <div style={{
          background: "transparent",
          display: "flex",
          flexDirection: "column",
          padding: "16px 24px 24px 24px",
          position: "relative",
          zIndex: 5,
        }}>
          {/* Search Input Box */}
          <div style={{
            display: "flex", alignItems: "center", gap: "10px",
            background: "#fff",
            border: "1px solid #ddd0b8",
            borderRadius: "24px",
            padding: "8px 12px 8px 20px",
            boxShadow: "0 4px 24px rgba(160,110,40,0.1)",
            transition: "border-color 0.2s, box-shadow 0.2s",
            marginBottom: "16px",
          }}
            onFocusCapture={e => { e.currentTarget.style.borderColor = "#c8861a"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(200,134,26,0.12)"; }}
            onBlurCapture={e => { e.currentTarget.style.borderColor = "#ddd0b8"; e.currentTarget.style.boxShadow = "0 4px 24px rgba(160,110,40,0.1)"; }}
          >
            <span style={{ color: "#c8861a", fontWeight: 300, fontSize: "1.4rem", marginRight: "4px" }}>+</span>
            <textarea
              id="chat-input"
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={activeCategory ? `Ask about ${activeCategory}…` : "Ask anything about LPU…"}
              rows={1}
              style={{
                flex: 1, background: "none", border: "none", outline: "none", resize: "none",
                fontFamily: "'Inter', sans-serif", fontSize: "0.95rem", color: "#1f1209",
                lineHeight: 1.6,
                maxHeight: "120px",
                overflowY: "auto",
              }}
            />
            <button
              id="chat-send"
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              style={{
                flexShrink: 0,
                width: "36px", height: "36px",
                background: input.trim() && !loading ? "linear-gradient(135deg, #d97706, #b45309)" : "#fdfaf5",
                border: "none", borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                transition: "all 0.2s",
                boxShadow: input.trim() && !loading ? "0 3px 10px rgba(180,83,9,0.25)" : "none",
              }}>
              {input.trim() && !loading ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#b0916a" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 1v22M17 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2z" />
                </svg>
              )}
            </button>
          </div>

          {/* Category Selector Pills */}
          <div style={{
            display: "flex", alignItems: "center", gap: "8px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}>
            {CATEGORIES.map(c => {
              const isActive = activeCategory === c;
              return (
                <button
                  key={c}
                  onClick={() => setActiveCategory(isActive ? null : c)}
                  style={{
                    flexShrink: 0,
                    padding: "6px 14px",
                    fontFamily: "'Inter', sans-serif", fontSize: "0.75rem",
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? "#fff" : "#5c4021",
                    background: isActive ? "#c8861a" : "transparent",
                    border: "1px solid #ddd0b8",
                    borderRadius: "999px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    display: "flex", alignItems: "center", gap: "6px",
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#fdf5e8"; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {c}
                </button>
              );
            })}
          </div>

        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40%            { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
