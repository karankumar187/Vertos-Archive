import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import vertoAiAvatar from "../assets/verto-ai.jpg";

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
  content: "Welcome to **Vertos Archive**! I'm your AI-powered university assistant. Ask me anything about LPU — notes, PYQs, syllabus, placements, faculty, or campus life.",
  time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
};

const SUGGESTIONS = [
  "What are important DBMS topics for finals?",
  "Show previous year ETP papers",
  "Tell me about LPU placement drives",
  "How do I apply for hostel?",
  "Faculty details for CSE department",
];

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{
      display: "flex",
      justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom: "16px",
      gap: "10px",
      alignItems: "flex-start",
    }}>
      {/* Avatar for assistant */}
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

      <div style={{
        maxWidth: "70%",
        padding: "13px 17px",
        background: isUser
          ? "linear-gradient(135deg, #d97706 0%, #b45309 100%)"
          : "#ffffff",
        border: isUser ? "none" : "1px solid #e9dcc8",
        borderRadius: isUser ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
        boxShadow: isUser ? "0 4px 14px rgba(180,83,9,0.22)" : "0 2px 10px rgba(160,110,40,0.07)",
      }}>
        {/* Render basic markdown bold */}
        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "0.875rem",
          color: isUser ? "#fff" : "#1f1209",
          lineHeight: 1.7,
          whiteSpace: "pre-wrap",
        }}
          dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
        />
        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "0.7rem",
          color: isUser ? "rgba(255,255,255,0.7)" : "#b0916a",
          marginTop: "6px",
          textAlign: "right",
        }}>{msg.time}</p>
      </div>

      {/* Avatar for user */}
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

let msgIdCounter = 1;

export default function ChatPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const didAutoSend = useRef(false);

  // Read URL params on first render and auto-send
  useEffect(() => {
    if (didAutoSend.current) return;
    const q = searchParams.get("q");
    const cat = searchParams.get("category");
    if (cat) setActiveCategory(cat);
    if (q) {
      didAutoSend.current = true;
      // Clear params from URL so refresh doesn't re-fire
      setSearchParams({}, { replace: true });
      // Slight delay so the component has rendered
      setTimeout(() => sendMessageDirect(q, cat), 100);
    } else if (cat) {
      didAutoSend.current = true;
      setSearchParams({}, { replace: true });
      setTimeout(() => sendMessageDirect(`Tell me about ${cat} resources available on Vertos Archive`, cat), 100);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Internal send — accepts explicit text so we can call before state settles
  const sendMessageDirect = (text, category) => {
    const q = text.trim();
    if (!q) return;
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages(prev => [...prev, { role: "user", id: `u${msgIdCounter++}`, content: q, time: now }]);
    setInput("");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const now2 = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const catHint = category ? ` under **${category}**` : "";
      setMessages(prev => [...prev, {
        role: "assistant",
        id: `a${msgIdCounter++}`,
        content: `I found relevant information${catHint} about **"${q}"** in the Vertos Archive knowledge base. This is a demo response — once the backend RAG pipeline is connected, I'll retrieve actual documents, notes, and university data to answer your query accurately.`,
        time: now2,
      }]);
    }, 1600);
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
      {/* ── Sidebar ── */}
      <aside style={{
        width: "260px",
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
            <span style={{ color: "#c8861a" }}>Vertos</span> Archive
          </p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.73rem", color: "#9a7845", marginTop: "2px" }}>
            AI University Assistant
          </p>
        </div>

        {/* New chat */}
        <div style={{ padding: "14px 14px 10px" }}>
          <button
            id="new-chat-sidebar"
            onClick={() => { setMessages([WELCOME]); setActiveCategory(null); }}
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

        {/* Quick topics */}
        <div style={{ padding: "4px 14px 12px" }}>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.68rem", fontWeight: 600, color: "#9a7845", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>Quick Topics</p>
          {SUGGESTIONS.map((s, i) => (
            <button key={i} id={`chat-suggestion-${i}`} onClick={() => sendMessage(s)}
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

        {/* Footer in sidebar */}
        <div style={{
          marginTop: "auto", padding: "14px 16px",
          borderTop: "1px solid #f0e8d8",
          background: "#fdfaf5",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "32px", height: "32px", borderRadius: "50%",
              background: "linear-gradient(135deg, #d97706, #b45309)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 700, fontSize: "0.8rem",
            }}>K</div>
            <div>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.78rem", fontWeight: 600, color: "#1f1209" }}>Karan Kumar</p>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.68rem", color: "#9a7845" }}>12345678</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Chat Area ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Chat header */}
        <div style={{
          padding: "14px 24px",
          background: "rgba(253,250,245,0.95)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid #e9dcc8",
          display: "flex", alignItems: "center", gap: "12px",
        }}>
          <img 
            src={vertoAiAvatar}
            alt="Verto AI"
            style={{
              width: "36px", height: "36px",
              borderRadius: "10px",
              objectFit: "cover",
            }} 
          />
          <div>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 700, color: "#1f1209" }}>Verto AI</p>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "7px", height: "7px", background: "#22c55e", borderRadius: "50%" }} />
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.72rem", color: "#7a5a2a" }}>Online · RAG-powered</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px",
        }}>
          {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}

          {/* Typing indicator */}
          {loading && (
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
          borderTop: "1px solid #e9dcc8",
          background: "rgba(253,250,245,0.97)",
          display: "flex",
          flexDirection: "column",
        }}>
          
          {/* Category Selector Chips */}
          <div style={{
            display: "flex", alignItems: "center", gap: "8px",
            padding: "12px 24px 0",
            overflowX: "auto",
            scrollbarWidth: "none",
          }}>
            <span style={{
              fontFamily: "'Inter', sans-serif", fontSize: "0.75rem",
              fontWeight: 600, color: "#8b6535", textTransform: "uppercase",
              letterSpacing: "0.05em", marginRight: "4px",
            }}>
              Category:
            </span>
            {CATEGORIES.map(c => {
              const isActive = activeCategory === c;
              return (
                <button
                  key={c}
                  onClick={() => setActiveCategory(isActive ? null : c)}
                  style={{
                    flexShrink: 0,
                    padding: "4px 12px",
                    fontFamily: "'Inter', sans-serif", fontSize: "0.75rem",
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? "#7a4f0d" : "#5c4021",
                    background: isActive ? "#fef3dc" : "#ffffff",
                    border: isActive ? "1px solid #e8c96a" : "1px solid #ddd0b8",
                    borderRadius: "999px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    boxShadow: isActive ? "0 2px 6px rgba(200,134,26,0.15)" : "none",
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.borderColor = "#c8861a"; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.borderColor = "#ddd0b8"; }}
                >
                  {c}
                </button>
              );
            })}
          </div>

          {/* Search Input Box */}
          <div style={{ padding: "12px 24px 20px" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: "12px",
              background: "#fff",
              border: "1.5px solid #ddd0b8",
              borderRadius: "14px",
              padding: "10px 16px",
              boxShadow: "0 2px 16px rgba(160,110,40,0.07)",
              transition: "border-color 0.2s, box-shadow 0.2s",
            }}
              onFocusCapture={e => { e.currentTarget.style.borderColor = "#c8861a"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(200,134,26,0.12)"; }}
              onBlurCapture={e => { e.currentTarget.style.borderColor = "#ddd0b8"; e.currentTarget.style.boxShadow = "0 2px 16px rgba(160,110,40,0.07)"; }}
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
                  flex: 1, background: "none", border: "none", outline: "none", resize: "none",
                  fontFamily: "'Inter', sans-serif", fontSize: "0.9rem", color: "#1f1209",
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
                  width: "38px", height: "38px",
                  background: input.trim() && !loading ? "linear-gradient(135deg, #d97706, #b45309)" : "#e9dcc8",
                  border: "none", borderRadius: "10px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                  transition: "all 0.2s",
                  boxShadow: input.trim() && !loading ? "0 3px 10px rgba(180,83,9,0.25)" : "none",
                }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={input.trim() && !loading ? "#fff" : "#b0916a"} strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.7rem", color: "#b0916a", textAlign: "center", marginTop: "8px" }}>
              Press Enter to send · Shift+Enter for new line
            </p>
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
