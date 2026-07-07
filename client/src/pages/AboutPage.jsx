import { Link } from "react-router-dom";
import campusSketch from "../assets/campus-sketch.png";

export default function AboutPage() {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#f8f4ee" }}>
      
      {/* Background layer */}
      <div style={{
        position: "fixed",
        inset: 0,
        backgroundImage: `url(${campusSketch})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        zIndex: 0,
        opacity: 0.25,
        pointerEvents: "none",
      }} />
      <div style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
        background: "linear-gradient(to bottom, rgba(248,244,238,0.7) 0%, #f8f4ee 40%, #f8f4ee 100%)",
      }}/>

      <div style={{ position: "relative", zIndex: 1, maxWidth: "800px", margin: "0 auto", padding: "64px 24px", width: "100%", display: "flex", flexDirection: "column", gap: "40px" }}>
        
        {/* Header */}
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "3rem", fontWeight: 800, color: "#1f1209", marginBottom: "16px" }}>
            About <span style={{ color: "#c8861a" }}>Vertos Archive</span>
          </h1>
          <p style={{ fontSize: "1.1rem", color: "#6b4d1f", lineHeight: 1.6, maxWidth: "600px", margin: "0 auto" }}>
            An intelligent, community-driven platform designed to simplify academic resource sharing and discovery for LPU students.
          </p>
        </div>

        {/* Description Section */}
        <div style={{ background: "#fff", borderRadius: "16px", padding: "32px", border: "1px solid #f0e6d2", boxShadow: "0 4px 16px rgba(160,110,40,0.04)" }}>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#1f1209", marginBottom: "16px" }}>Our Mission</h2>
          <p style={{ fontSize: "1rem", color: "#5c4021", lineHeight: 1.7, marginBottom: "20px" }}>
            Vertos Archive is built with a singular mission: to eliminate the friction in finding and sharing academic resources. We recognized that students often struggle to locate past year papers, structured syllabi, and quality notes across scattered WhatsApp groups and local drives.
          </p>
          <p style={{ fontSize: "1rem", color: "#5c4021", lineHeight: 1.7 }}>
            By leveraging modern AI (Vector Search and LLMs), this platform not only indexes these documents but genuinely understands them. You can ask natural questions, and our AI assistant will dive deep into the university's material to extract exactly what you need.
          </p>
        </div>

        {/* Features Mini */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div style={{ background: "#fff", borderRadius: "12px", padding: "24px", border: "1px solid #f0e6d2", display: "flex", flexDirection: "column", gap: "12px" }}>
            <span style={{ fontSize: "2rem" }}>🤖</span>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: "#1f1209" }}>AI-Powered RAG</h3>
            <p style={{ fontSize: "0.9rem", color: "#6b4d1f", margin: 0, lineHeight: 1.5 }}>Our system uses Retrieval-Augmented Generation to read and comprehend uploaded PDFs, giving you precise, contextual answers.</p>
          </div>
          <div style={{ background: "#fff", borderRadius: "12px", padding: "24px", border: "1px solid #f0e6d2", display: "flex", flexDirection: "column", gap: "12px" }}>
            <span style={{ fontSize: "2rem" }}>🌍</span>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: "#1f1209" }}>Community Driven</h3>
            <p style={{ fontSize: "0.9rem", color: "#6b4d1f", margin: 0, lineHeight: 1.5 }}>Every resource is uploaded by students, for students. A verified contribution system ensures high quality material.</p>
          </div>
        </div>

        {/* Developers / Open Source */}
        <div style={{ background: "#fff", borderRadius: "16px", padding: "32px", border: "1px solid #f0e6d2", boxShadow: "0 4px 16px rgba(160,110,40,0.04)" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "16px" }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#1f1209", margin: 0 }}>Open Source & Built by Students</h2>
            <p style={{ fontSize: "1rem", color: "#5c4021", lineHeight: 1.7, maxWidth: "500px" }}>
              Vertos Archive is a community project. We welcome contributions, bug reports, and feature requests. Feel free to explore the source code or join the development team!
            </p>
            
            <a 
              href="https://github.com/karankumar187/Vertos-Archive" 
              target="_blank" 
              rel="noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                background: "#1f1209", color: "#fff", padding: "12px 24px",
                borderRadius: "8px", textDecoration: "none", fontWeight: 600,
                fontSize: "0.95rem", marginTop: "8px", transition: "background 0.2s"
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#3d2a0e"}
              onMouseLeave={e => e.currentTarget.style.background = "#1f1209"}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.03-2.682-.103-.253-.447-1.27.098-2.646 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.376.202 2.394.1 2.646.64.699 1.026 1.591 1.026 2.682 0 3.841-2.337 4.687-4.565 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
              </svg>
              View on GitHub
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
