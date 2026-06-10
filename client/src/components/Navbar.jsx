export default function Navbar() {
  return (
    <nav
      className="w-full sticky top-0 z-50 flex items-center justify-between px-8"
      style={{
        background: "#fdfaf5",
        borderBottom: "1px solid #e9dcc8",
        boxShadow: "0 1px 8px rgba(160,110,40,0.07)",
        minHeight: "72px",
      }}
    >
      {/* Project Name */}
      <a
        href="/"
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: "1.5rem",
          fontWeight: 700,
          color: "#1f1209",
          textDecoration: "none",
          letterSpacing: "-0.01em",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginLeft: "15px",
        }}
      >
        <span style={{ color: "#c8861a" }}>Vertos</span>
        <span>Archive</span>
      </a>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        <button
          id="new-chat-btn"
          className="flex items-center gap-2 font-medium text-sm transition-all duration-200"
          style={{
            padding: "9px 20px",
            border: "1.5px solid #c8861a",
            borderRadius: "6px",
            color: "#8b5e0a",
            background: "transparent",
            fontFamily: "'Inter', sans-serif",
            cursor: "pointer",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "#c8861a";
            e.currentTarget.style.color = "#fff";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "#8b5e0a";
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" d="M12 5v14M5 12h14"/>
          </svg>
          New Chat
        </button>

        <button
          id="menu-btn"
          style={{
            width: "36px", height: "36px", border: "none",
            background: "none", cursor: "pointer",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: "5px",
            borderRadius: "6px",
            marginRight: "15px",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "#f0e5d0"}
          onMouseLeave={e => e.currentTarget.style.background = "none"}
        >
          <span style={{ display: "block", width: "20px", height: "1.5px", background: "#6b4d1f", borderRadius: "2px" }}/>
          <span style={{ display: "block", width: "14px", height: "1.5px", background: "#6b4d1f", borderRadius: "2px" }}/>
          <span style={{ display: "block", width: "20px", height: "1.5px", background: "#6b4d1f", borderRadius: "2px" }}/>
        </button>
      </div>
    </nav>
  );
}
