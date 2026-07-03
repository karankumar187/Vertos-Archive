import React, { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import vertoAiAvatar from "../assets/verto-ai.jpg";
import campusSketch from "../assets/campus-sketch.png";
import { chatAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import CodeBlock from "../components/CodeBlock";

/* ── Data ── */
const CATEGORIES = [
  "Notes",
  "Syllabus",
  "Previous Papers",
  "University Info",
];

const WELCOME = {
  role: "assistant",
  id: "w0",
  content: "Welcome to **Verto AI**! I'm your AI-powered university assistant. Ask me anything about LPU — notes, PYQs, syllabus, or campus life.",
  time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
};

const SUGGESTIONS = [
  "What are important DBMS topics for finals?",
  "Show previous year ETP papers",
  "How do I apply for hostel?",
  "Tell me about the library facilities",
];

const preprocessMath = (text) => {
    if (!text) return "";
    let res = text;
    // Fix standard escaped brackets used by some models
    res = res.replace(/\\\[([\s\S]*?)\\\]/g, '\n$$$$$1$$$$\n');
    res = res.replace(/\\\((.*?)\\\)/g, '$$$1$$');
    
    // Ensure block math $$ is on its own line to prevent remark-math parsing errors
    res = res.replace(/([^\n])\s*\$\$/g, '$1\n$$$$'); 
    res = res.replace(/\$\$\s*([^\n])/g, '$$$$\n$1');
    
    // Fix common AI math syntax error where \begin is used without $$
    // We wrap \begin{align}, \begin{matrix}, \begin{vmatrix}, \begin{equation} if they aren't wrapped
    // To be safe, we'll just rely on the $$ normalization above since the AI is instructed to use $$.
    return res;
};

const API_BASE = (import.meta?.env?.VITE_API_URL) || 'http://localhost:5001/api';
const FILE_PROXY_BASE = API_BASE.replace('/api', '');

// Returns a proxied URL so all file types open correctly in the browser
const getViewableUrl = (url, ext = '') => {
  if (!url || url === '#') return '#';
  if (url.startsWith('https://res.cloudinary.com/')) {
    return `${FILE_PROXY_BASE}/api/file/view?url=${encodeURIComponent(url)}&ext=${ext}`;
  }
  return url;
};

// Returns a proxied download URL that forces Content-Disposition: attachment
const getDownloadUrl = (url, ext = '') => {
  if (!url || url === '#') return '#';
  if (url.startsWith('https://res.cloudinary.com/')) {
    return `${FILE_PROXY_BASE}/api/file/view?url=${encodeURIComponent(url)}&ext=${ext}&download=1`;
  }
  return url;
};

const MessageBubble = React.memo(function MessageBubble({ msg, onRegenerate, user }) {
  const isUser = msg.role === "user";
  const [showSources, setShowSources] = useState(false);
  const uniqueSources = msg.sources ? [...new Map(msg.sources.map(s => [s.documentId, s])).values()] : [];
  
  return (
    <div style={{
      display: "flex",
      gap: "16px",
      alignSelf: isUser ? "flex-end" : "flex-start",
      flexDirection: isUser ? "row" : "row",
      width: "100%",
      justifyContent: isUser ? "flex-end" : "flex-start"
    }}>
      {!isUser && (
        <img src={vertoAiAvatar} alt="Verto AI" style={{
          width: "34px", height: "34px", borderRadius: "50%",
          boxShadow: "0 2px 8px rgba(180,83,9,0.15)", flexShrink: 0,
        }} />
      )}

      <div style={{ maxWidth: "85%", display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start", minWidth: 0 }}>
        <div style={{
          padding: "12px 16px",
          background: isUser
            ? "linear-gradient(135deg, #d97706 0%, #b45309 100%)"
            : "#ffffff",
          border: isUser ? "none" : "1px solid #e9dcc8",
          borderRadius: isUser ? "14px 14px 4px 14px" : "4px 14px 14px 14px",
          boxShadow: isUser ? "0 4px 14px rgba(180,83,9,0.22)" : "0 2px 10px rgba(160,110,40,0.07)",
          width: "100%",
          overflowX: "auto"
        }}>
          <div style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "0.875rem",
          color: isUser ? "#fff" : "#1f1209",
          lineHeight: 1.7,
          width: "100%"
        }} className="markdown-body">
          {isUser ? (
             <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{msg.content}</p>
          ) : (
             <ReactMarkdown 
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[[rehypeKatex, { strict: false, trust: true, throwOnError: false }]]}
                components={{
                  pre({ children }) {
                    return <>{children}</>;
                  },
                  code({ className, children, node, ...props }) {
                    const isBlock = /language-(\w+)/.test(className || "") || 
                                    (typeof children === "string" && children.includes("\n"));
                    if (isBlock) {
                      return (
                        <CodeBlock className={className} {...props}>
                          {children}
                        </CodeBlock>
                      );
                    }
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  }
                }}
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
                            background: '#fdfaf5', border: '1px solid #e9dcc8', padding: '4px 10px',
                            borderRadius: '12px', fontSize: '0.65rem', fontWeight: 600, color: '#9a7845',
                            cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '4px'
                        }}
                    >
                        {showSources ? 'Hide Sources' : 'View Sources'}
                        <svg style={{ transform: showSources ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                </div>

                {showSources && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                    {uniqueSources.map((src, i) => {
                        const fileExt = src.fileType === 'application/pdf' ? 'pdf' : src.fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ? 'docx' : 'txt';
                        const isDoc = fileExt === 'pdf' || fileExt === 'docx';
                        const primaryRawUrl = src.fileUrl || (src.files && src.files.length > 0 ? src.files[0] : '#');
                        const primaryUrl = getViewableUrl(primaryRawUrl, fileExt);
                        const downloadUrl = primaryRawUrl !== '#' ? getDownloadUrl(primaryRawUrl, fileExt) : null;

                        return (
                            <div key={i} style={{
                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                background: '#fff', border: '1px solid #e9dcc8',
                                borderRadius: '6px', padding: '4px 6px 4px 8px',
                                maxWidth: '200px', flexShrink: 0,
                            }}>
                                {/* Doc icon */}
                                {isDoc ? (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9a7845" strokeWidth="2.5" style={{ flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                ) : (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" style={{ flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                )}

                                {/* Title */}
                                <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#2d1a06', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}
                                    title={src.title}>{src.title}</span>

                                {/* Open button */}
                                <a href={primaryUrl} target="_blank" rel="noopener noreferrer"
                                    title="Open"
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '4px', background: 'rgba(200,134,26,0.08)', border: '1px solid rgba(200,134,26,0.2)', textDecoration: 'none', flexShrink: 0, transition: 'all 0.15s' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(200,134,26,0.18)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(200,134,26,0.08)'; }}
                                >
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9a7845" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                </a>

                                {/* Download button */}
                                {downloadUrl && (
                                    <a href={downloadUrl} target="_blank" rel="noopener noreferrer"
                                        title="Download"
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '4px', background: 'rgba(200,134,26,0.08)', border: '1px solid rgba(200,134,26,0.2)', textDecoration: 'none', flexShrink: 0, transition: 'all 0.15s' }}
                                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(200,134,26,0.18)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(200,134,26,0.08)'; }}
                                    >
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9a7845" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v13m0 0l-4-4m4 4l4-4M4 20h16" /></svg>
                                    </a>
                                )}
                            </div>
                        );
                    })}
                </div>
                )}
            </div>
        )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '12px', marginTop: '6px' }}>
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "0.7rem",
              color: "#b0916a",
              margin: 0,
            }}>{msg.time}</p>
            
            {!isUser && onRegenerate && (
                <button
                    onClick={() => onRegenerate(msg.id)}
                    style={{
                        background: "none", border: "none", cursor: "pointer",
                        display: "flex", alignItems: "center", padding: "4px",
                        color: "#a07840",
                        transition: "color 0.2s"
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = "#c8861a"}
                    onMouseLeave={e => e.currentTarget.style.color = "#a07840"}
                    title="Regenerate response"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            )}
        </div>
      </div>

      {isUser && (
        user?.avatar ? (
          <img src={user.avatar} alt="User" style={{
            width: "34px", height: "34px", flexShrink: 0,
            borderRadius: "50%", objectFit: "cover",
            boxShadow: "0 2px 8px rgba(180,83,9,0.15)"
          }} />
        ) : (
          <div style={{
            width: "34px", height: "34px", flexShrink: 0,
            background: "linear-gradient(135deg, #c8a87a, #9a7845)",
            borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 700, fontSize: "0.875rem",
            fontFamily: "'Inter', sans-serif",
          }}>{user?.name?.charAt(0).toUpperCase() || "U"}</div>
        )
      )}
    </div>
  );
});

export default function ChatPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [abortController, setAbortController] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  
  const [conversations, setConversations] = useState([]);
  // If coming from homepage with a query (?q= or ?category=), always start fresh
  const [activeConversationId, setActiveConversationId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('q') || params.get('category')) {
      localStorage.removeItem('activeConversationId');
      return null;
    }
    return localStorage.getItem('activeConversationId') || null;
  });
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
      // Only restore previous conversation if we're NOT starting fresh from homepage
      const params = new URLSearchParams(window.location.search);
      if (!params.get('q') && !params.get('category')) {
          const savedId = localStorage.getItem('activeConversationId');
          if (savedId) {
              selectConversation(savedId);
          }
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

  // Removed auto-scroll during generation to keep view anchored at the top of the new message
  // Users will now manually scroll down to read long generations.

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

  const stopGeneration = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setLoading(false);
    }
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

  // Handle regeneration logic
  const handleRegenerate = async (msgId) => {
    const index = messages.findIndex(m => m.id === msgId);
    if (index === -1) return;
    
    let lastUserMsg = null;
    let spliceIndex = index;
    for (let i = index - 1; i >= 0; i--) {
        if (messages[i].role === "user") {
            lastUserMsg = messages[i];
            spliceIndex = i;
            break;
        }
    }
    if (!lastUserMsg) return;

    setMessages(prev => prev.slice(0, spliceIndex)); 
    setTimeout(() => {
        sendMessageDirect(lastUserMsg.content, activeCategory);
    }, 50);
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
    const controller = new AbortController();
    setAbortController(controller);

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
            signal: controller.signal,
            body: JSON.stringify({ content: q, filters })
        });

        if (response.status === 404) {
            // Stale conversation ID — clear it and retry with a brand-new conversation
            console.warn('[Chat] Conversation not found (404), creating a new one and retrying...');
            localStorage.removeItem('activeConversationId');
            setActiveConversationId(null);
            const freshId = await createNewConversation();
            if (!freshId) throw new Error("Failed to create conversation");
            // Retry the same message in the new conversation
            const retryResponse = await fetch(`${VITE_API_URL}/chat/conversations/${freshId}/message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                signal: controller.signal,
                body: JSON.stringify({ content: q, filters })
            });
            if (!retryResponse.ok) throw new Error("Failed to send message");
            // Swap the response object so the stream reader below works seamlessly
            Object.defineProperty(response, 'body', { get: () => retryResponse.body });
            // Actually just reassign and use retryResponse from here
            const retryReader = retryResponse.body.getReader();
            const retryDecoder = new TextDecoder();
            let retryDone = false;
            let retryBuffer = '';
            let retryIsSourcesEvent = false;
            while (!retryDone) {
                const { value, done: rd } = await retryReader.read();
                retryDone = rd;
                if (value) {
                    retryBuffer += retryDecoder.decode(value, { stream: true });
                    const lines = retryBuffer.split('\n');
                    retryBuffer = lines.pop();
                    lines.forEach(line => {
                        if (line.startsWith('event: sources')) { retryIsSourcesEvent = true; }
                        else if (line.startsWith('data: ')) {
                            const dataStr = line.replace('data: ', '').trim();
                            if (dataStr === '[DONE]') { setLoading(false); loadConversations(); return; }
                            try {
                                const parsed = JSON.parse(dataStr);
                                if (retryIsSourcesEvent) {
                                    if (!assistantMsgId) { assistantMsgId = `a_${Date.now()}`; setMessages(prev => [...prev, { role: "assistant", id: assistantMsgId, content: "", time: now, sources: parsed }]); }
                                    else { setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, sources: parsed } : m)); }
                                    retryIsSourcesEvent = false;
                                } else if (parsed.token) {
                                    if (!assistantMsgId) { assistantMsgId = `a_${Date.now()}`; setMessages(prev => [...prev, { role: "assistant", id: assistantMsgId, content: parsed.token, time: now, sources: [] }]); }
                                    else { setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: m.content + parsed.token } : m)); }
                                } else if (parsed.message) {
                                    if (!assistantMsgId) { assistantMsgId = `a_${Date.now()}`; setMessages(prev => [...prev, { role: "assistant", id: assistantMsgId, content: "**Error:** " + parsed.message, time: now, sources: [] }]); }
                                }
                            } catch (e) { console.error("Retry parse error", e); }
                        }
                    });
                }
            }
            setAbortController(null);
            return;
        }

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
        setAbortController(null);
    } catch (err) {
        if (err.name === 'AbortError') {
            console.log("Generation stopped by user.");
            setAbortController(null);
            return;
        }
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
    // Shift+Enter: default behaviour (inserts newline) — no extra handling needed
  };

  // Auto-resize textarea like ChatGPT
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  return (
    <div style={{
      height: "calc(100vh - 68px)",
      display: "flex",
      background: "transparent",
      overflow: "hidden",
      position: "relative"
    }}>
      {/* Fixed Background Image */}
      <div style={{ position: "fixed", inset: 0, backgroundImage: `url(${campusSketch})`, backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", zIndex: 0, pointerEvents: "none", opacity: 0.9 }} />
      {/* Fade overlay — light wash only over the main chat area, not the sidebar */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, background: "rgba(250, 246, 238, 0.28)" }}/>

      {/* Mobile Backdrop */}
      <div className={`mobile-backdrop ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} style={{ zIndex: 20 }} />

      {/* ── Sidebar ── */}
      <aside className={`mobile-sidebar ${sidebarOpen ? 'open' : ''}`} style={{
        width: "230px",
        flexShrink: 0,
        background: "rgba(245, 238, 225, 0.55)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        borderRight: "1px solid rgba(210, 185, 145, 0.35)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
        zIndex: 1,
      }}>
        {/* Brand in sidebar */}
        <div style={{
          padding: "20px 18px 16px",
          borderBottom: "1px solid rgba(210, 185, 145, 0.35)",
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
                        background: activeConversationId === conv._id ? "rgba(200, 134, 26, 0.22)" : "transparent",
                        border: activeConversationId === conv._id ? "1px solid rgba(200, 134, 26, 0.45)" : "1px solid transparent",
                        fontFamily: "'Inter', sans-serif", fontSize: "0.78rem",
                        color: activeConversationId === conv._id ? "#7a3e00" : "#3d2a0e",
                        fontWeight: activeConversationId === conv._id ? 700 : 500,
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


      </aside>

      {/* ── Main Chat Area ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", zIndex: 1 }}>
        
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
          {messages.map(msg => <MessageBubble key={msg.id} msg={msg} onRegenerate={handleRegenerate} user={user} />)}

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

        {/* Input bar */}
        <div style={{
          background: "transparent",
          padding: "8px 20px 16px 20px",
          position: "relative",
          zIndex: 5,
        }}>
          <div
            id="chat-input-wrapper"
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "10px",
              background: "rgba(255,255,255,0.92)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              border: "1.5px solid #e8decb",
              borderRadius: "16px",
              padding: "10px 10px 10px 18px",
              boxShadow: "0 4px 24px rgba(160,110,40,0.10)",
              transition: "border-color 0.2s, box-shadow 0.2s",
            }}
            onFocusCapture={e => { e.currentTarget.style.borderColor = "#c8861a"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(200,134,26,0.10), 0 4px 24px rgba(160,110,40,0.10)"; }}
            onBlurCapture={e => { e.currentTarget.style.borderColor = "#e8decb"; e.currentTarget.style.boxShadow = "0 4px 24px rgba(160,110,40,0.10)"; }}
          >
            <textarea
              id="chat-input"
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={activeCategory ? `Ask about ${activeCategory}…` : "Ask anything about LPU…"}
              rows={1}
              style={{
                flex: 1,
                background: "none",
                border: "none",
                outline: "none",
                resize: "none",
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.92rem",
                color: "#1f1209",
                lineHeight: 1.6,
                padding: "4px 0",
                minHeight: "28px",
                maxHeight: "200px",
                overflowY: "auto",
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0, paddingBottom: "2px" }}>
              {/* Shift+Enter hint */}
              {input.length > 0 && (
                <span style={{
                  fontSize: "0.65rem", color: "#b09060",
                  fontFamily: "'Inter', sans-serif",
                  whiteSpace: "nowrap", marginRight: "4px",
                }}>⇧ Enter = new line</span>
              )}
              {loading ? (
                <button
                  id="chat-stop"
                  onClick={stopGeneration}
                  title="Stop generating"
                  style={{
                    width: "36px", height: "36px",
                    background: "linear-gradient(135deg, #d97706, #b45309)",
                    border: "none", borderRadius: "10px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(180,83,9,0.25)",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                    <rect x="5" y="5" width="14" height="14" rx="2"/>
                  </svg>
                </button>
              ) : (
                <button
                  id="chat-send"
                  onClick={() => sendMessage()}
                  disabled={!input.trim()}
                  title="Send (Enter)"
                  style={{
                    width: "36px", height: "36px",
                    background: input.trim()
                      ? "linear-gradient(135deg, #d97706, #b45309)"
                      : "rgba(200,134,26,0.12)",
                    border: "none", borderRadius: "10px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: input.trim() ? "pointer" : "not-allowed",
                    boxShadow: input.trim() ? "0 2px 8px rgba(180,83,9,0.25)" : "none",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={e => { if (input.trim()) e.currentTarget.style.transform = "scale(1.05)"; }}
                  onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke={input.trim() ? "#fff" : "#c8861a"} strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          {/* Bottom hint */}
          <p style={{
            textAlign: "center", fontFamily: "'Inter', sans-serif",
            fontSize: "0.65rem", color: "#b09060", marginTop: "8px",
          }}>Verto AI may make mistakes — always verify with official sources.</p>
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
