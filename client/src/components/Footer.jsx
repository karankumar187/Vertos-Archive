export default function Footer() {
  return (
    <footer style={{ background: "#faf8f4" }}>
      {/* Gold accent line */}
      <div style={{
        width: "100%", height: "2px",
        background: "linear-gradient(to right, transparent 0%, #c8861a 30%, #d4a96a 50%, #c8861a 70%, transparent 100%)",
      }}/>

      <div style={{
        maxWidth: "1200px", margin: "0 auto",
        padding: "18px 32px",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        flexWrap: "wrap",
      }}>
        {/* Left */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="#8b6535" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
          </svg>
          <span style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "12px", color: "#7a5a2a",
            letterSpacing: "0.02em",
          }}>
            Trusted knowledge. Verified sources. Always.
          </span>
        </div>

        {/* Centre */}
        <span style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "12px", color: "#9a7845",
          letterSpacing: "0.02em",
        }}>
          © 2026 Vertos Archive · All rights reserved.
        </span>

        {/* Right */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ color: "#c8861a", fontSize: "12px" }}>✦</span>
          <span style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "12px", color: "#7a5a2a",
          }}>
            Powered by <strong style={{ color: "#4a2e0a" }}>Advanced AI</strong>
          </span>
        </div>
      </div>
    </footer>
  );
}
