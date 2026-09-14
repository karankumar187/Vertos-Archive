import { useState, useRef } from "react";
import campusSketch from "../assets/campus-sketch.png";
import { uploadAPI } from "../services/api";

const CATEGORIES = [
  { label: "Notes",          value: "notes" },
  { label: "Syllabus",       value: "syllabus" },
  { label: "Previous Papers",value: "pyq" },
  { label: "University Info",value: "university" },
];

const EXAM_TYPES = [
  { label: "Class Assessment (CA)", value: "ca" },
  { label: "Mid Term",              value: "midterm" },
  { label: "End Term Exam (ETE)",   value: "ete" },
  { label: "Practical (ETP)",       value: "etp" },
  { label: "Other",                 value: "other" },
];

const UNIT_OPTIONS = [0, 1, 2, 3, 4, 5, 6];

export default function UploadPage() {
  const [category, setCategory]       = useState("");
  const [title, setTitle]             = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject]         = useState("");
  const [examType, setExamType]       = useState("ca");
  const [units, setUnits]             = useState([]);
  const [year, setYear]               = useState(new Date().getFullYear().toString());
  const [session, setSession]         = useState("");
  const [files, setFiles]             = useState([]);
  const [dragging, setDragging]       = useState(false);
  const [submitted, setSubmitted]     = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const fileRef = useRef();

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    
    // Filter large files
    const validFiles = droppedFiles.filter(f => f.size <= 25 * 1024 * 1024);
    if (validFiles.length < droppedFiles.length) {
      setError("Some files exceeded the 25 MB limit and were skipped.");
    }
    
    setFiles(prev => {
      const newFiles = [...prev, ...validFiles];
      if (newFiles.length > 10) {
        setError("Maximum 10 files allowed per document.");
        return newFiles.slice(0, 10);
      }
      return newFiles;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0 || !category || !title || !subject) return;
    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("category", category.value); // send the backend enum value
      formData.append("subject", subject);

      if (category.value === 'pyq') {
        if (examType) formData.append("examType", examType);
        if (units && units.length > 0) formData.append("units", JSON.stringify(units));
        if (year) formData.append("year", year);
        if (session) formData.append("session", session);
      } else if (category.value === 'notes') {
        if (units && units.length > 0) formData.append("units", JSON.stringify(units));
      }
      
      files.forEach(f => {
        formData.append("files", f);
      });

      await uploadAPI.uploadDocument(formData);
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to upload document.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setSubmitted(false); setFiles([]); setTitle("");
    setCategory(""); setDescription(""); setSubject(""); setError("");
  };

  return (
    <div style={{
      position: "relative",
    }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto", position: "relative", zIndex: 1 }}>

        {/* ── Page heading ── */}
        <div className="anim-up d1" style={{ marginBottom: "32px", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px",
            background: "#fef3dc", border: "1px solid #e8c96a",
            borderRadius: "999px", padding: "5px 16px", marginBottom: "16px" }}>
            <span style={{ color: "#c8861a", fontSize: "11px" }}>✦</span>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", fontWeight: 500,
              letterSpacing: "0.1em", textTransform: "uppercase", color: "#92620a" }}>Contribute</span>
            <span style={{ color: "#c8861a", fontSize: "11px" }}>✦</span>
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.2rem",
            fontWeight: 700, color: "#1f1209", marginBottom: "10px" }}>
            Upload a Document
          </h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.9rem",
            color: "#7a5a2a", maxWidth: "480px", lineHeight: 1.65, margin: "0 auto" }}>
            Share notes, PYQs, syllabi, or assignments. Admin will review before making
            them available. Earn <strong style={{ color: "#c8861a" }}>50–150 pts</strong> per approval.
          </p>
        </div>

        {/* ── Form card ── */}
        <div className="anim-up d2">
          {submitted ? (
            /* ── Success state ── */
            <div style={{
              background: "#fff", border: "1px solid #e9dcc8",
              borderRadius: "16px", padding: "60px 32px",
              textAlign: "center",
              boxShadow: "0 4px 24px rgba(160,110,40,0.09)",
            }}>
              <div style={{ fontSize: "52px", marginBottom: "16px" }}>📬</div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem",
                fontWeight: 700, color: "#1f1209", marginBottom: "10px" }}>Submission Received!</h2>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.9rem",
                color: "#7a5a2a", lineHeight: 1.7, marginBottom: "28px", maxWidth: "400px", margin: "0 auto 28px" }}>
                Your document <strong>"{title}"</strong> has been submitted for admin review.
                You'll earn points once it's approved!
              </p>
              <button onClick={reset} style={{
                padding: "11px 28px",
                background: "linear-gradient(135deg, #d97706, #b45309)",
                border: "none", borderRadius: "9px", color: "#fff",
                fontFamily: "'Inter', sans-serif", fontSize: "0.9rem", fontWeight: 600,
                cursor: "pointer", boxShadow: "0 4px 14px rgba(180,83,9,0.28)",
              }}>Upload Another Document</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{
              background: "#fff", border: "1px solid #e9dcc8",
              borderRadius: "16px", overflow: "hidden",
              boxShadow: "0 4px 24px rgba(160,110,40,0.09)",
            }}>
              {/* Gold top bar */}
              <div style={{ height: "3px", background: "linear-gradient(to right, #d97706, #c8861a, #d4a96a, #c8861a, #d97706)" }} />

              <div className="mobile-p-sm" style={{ padding: "32px 36px", display: "flex", flexDirection: "column", gap: "22px" }}>

                {/* ── Drop zone ── */}
                <div>
                  <label style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.82rem",
                    fontWeight: 600, color: "#5c4021", letterSpacing: "0.04em",
                    textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
                    File
                  </label>
                    <div
                      id="upload-dropzone"
                      onClick={(e) => { if (e.target.id === 'upload-dropzone' || e.target.id === 'dropzone-content') fileRef.current.click(); }}
                      onDragOver={e => { e.preventDefault(); setDragging(true); }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={handleDrop}
                      style={{
                        border: dragging ? "2px dashed #c8861a" : files.length > 0 ? "2px solid #c8861a" : "2px dashed #ddd0b8",
                        borderRadius: "12px",
                        background: dragging ? "#fef7e6" : files.length > 0 ? "#fef9f0" : "#fdfaf5",
                      padding: "36px 20px",
                      textAlign: "center",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      boxShadow: files.length > 0 ? "0 0 0 4px rgba(200,134,26,0.08)" : "none",
                    }}>
                    <input ref={fileRef} type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.webp"
                      style={{ display: "none" }} onChange={e => {
                        const selectedFiles = Array.from(e.target.files);
                        const validFiles = selectedFiles.filter(f => f.size <= 25 * 1024 * 1024);
                        if (validFiles.length < selectedFiles.length) {
                          setError("Some files exceeded the 25 MB limit and were skipped.");
                        } else {
                          setError("");
                        }
                        
                        setFiles(prev => {
                          const newFiles = [...prev, ...validFiles];
                          if (newFiles.length > 10) {
                            setError("Maximum 10 files allowed per document.");
                            return newFiles.slice(0, 10);
                          }
                          return newFiles;
                        });
                        
                        // Reset input so the same files can be re-selected if removed
                        e.target.value = null;
                      }} />
                    {files.length > 0 ? (
                      <div style={{ textAlign: "left" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.85rem", fontWeight: 600, color: "#1f1209" }}>
                            {files.length} File{files.length !== 1 ? 's' : ''} Selected
                          </span>
                          <button type="button" onClick={() => fileRef.current.click()} style={{ 
                            background: "none", border: "none", color: "#c8861a", 
                            fontFamily: "'Inter', sans-serif", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" 
                          }}>+ Add More</button>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {files.map((f, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", border: "1px solid #e9dcc8", borderRadius: "8px", padding: "8px 12px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden" }}>
                                <div style={{ fontSize: "20px" }}>📄</div>
                                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.85rem", fontWeight: 500, color: "#1f1209", margin: 0, textOverflow: "ellipsis", overflow: "hidden" }}>{f.name}</p>
                                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.75rem", color: "#9a7845", margin: 0 }}>{(f.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                              </div>
                              <button type="button" onClick={(e) => { e.stopPropagation(); setFiles(files.filter((_, idx) => idx !== i)); }} style={{ background: "none", border: "none", fontSize: "16px", cursor: "pointer", color: "#b0916a" }}>×</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div id="dropzone-content">
                        <div style={{ fontSize: "40px", marginBottom: "10px", pointerEvents: "none" }}>📁</div>
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.92rem", fontWeight: 500, color: "#5c4021", pointerEvents: "none" }}>
                          Drop your files here, or <span style={{ color: "#c8861a", textDecoration: "underline" }}>browse</span>
                        </p>
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.76rem", color: "#9a7845", marginTop: "6px", pointerEvents: "none" }}>
                          PDF, DOC, PPT, JPG, PNG, WEBP · Max 25 MB per file
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Category ── */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label htmlFor="upload-category" style={{ fontFamily: "'Inter', sans-serif",
                    fontSize: "0.82rem", fontWeight: 600, color: "#5c4021",
                    letterSpacing: "0.04em", textTransform: "uppercase" }}>Category</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {CATEGORIES.map(c => {
                      const active = category?.value === c.value;
                      return (
                        <button key={c.value} type="button" id={`cat-btn-${c.value}`}
                          onClick={() => setCategory(active ? "" : c)}
                          style={{
                            padding: "7px 16px",
                            fontFamily: "'Inter', sans-serif",
                            fontSize: "0.83rem", fontWeight: active ? 600 : 400,
                            color: active ? "#7a4f0d" : "#5c4021",
                            background: active ? "#fef3dc" : "#fdfaf5",
                            border: active ? "1.5px solid #e8c96a" : "1.5px solid #ddd0b8",
                            borderRadius: "999px", cursor: "pointer",
                            transition: "all 0.15s",
                            boxShadow: active ? "0 2px 8px rgba(200,134,26,0.15)" : "none",
                          }}
                          onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = "#c8861a88"; e.currentTarget.style.color = "#8b5e0a"; } }}
                          onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = "#ddd0b8"; e.currentTarget.style.color = "#5c4021"; } }}
                        >
                          {active && <span style={{ marginRight: "4px", fontSize: "9px" }}>✦</span>}
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                  {!category && (
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.75rem", color: "#b08050" }}>
                      Select a category to continue
                    </span>
                  )}
                </div>

                {/* ── Conditional PYQ Metadata ── */}
                {category?.value === "pyq" && (
                  <div style={{
                    background: "rgba(200, 134, 26, 0.05)",
                    border: "1.5px solid #e8c96a",
                    borderRadius: "12px",
                    padding: "16px 18px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "14px" }}>🎯</span>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.85rem", fontWeight: 700, color: "#7a4f0d" }}>
                        Paper Classification & Exam Details
                      </span>
                    </div>

                    {/* Exam Type */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.78rem", fontWeight: 600, color: "#5c4021", textTransform: "uppercase" }}>
                        Exam Type
                      </label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
                        {EXAM_TYPES.map(t => {
                          const active = examType === t.value;
                          return (
                            <button key={t.value} type="button"
                              onClick={() => setExamType(t.value)}
                              style={{
                                padding: "6px 14px",
                                fontFamily: "'Inter', sans-serif",
                                fontSize: "0.8rem",
                                fontWeight: active ? 600 : 400,
                                color: active ? "#fff" : "#5c4021",
                                background: active ? "#c8861a" : "#fff",
                                border: active ? "1.5px solid #b45309" : "1.5px solid #ddd0b8",
                                borderRadius: "8px",
                                cursor: "pointer",
                                transition: "all 0.15s",
                              }}
                            >
                              {t.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Units Multi-Select */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <label style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.78rem", fontWeight: 600, color: "#5c4021", textTransform: "uppercase" }}>
                          Units Covered in this Paper
                        </label>
                        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.72rem", color: "#9a7845" }}>
                          {units.length === 0 ? "Select applicable units" : `${units.length} unit(s) selected`}
                        </span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {UNIT_OPTIONS.map(u => {
                          const active = units.includes(u);
                          return (
                            <button key={u} type="button"
                              onClick={() => {
                                setUnits(prev => active ? prev.filter(x => x !== u) : [...prev, u].sort());
                              }}
                              style={{
                                padding: "5px 12px",
                                fontFamily: "'Inter', sans-serif",
                                fontSize: "0.8rem",
                                fontWeight: active ? 700 : 500,
                                color: active ? "#7a4f0d" : "#5c4021",
                                background: active ? "#fef3dc" : "#fff",
                                border: active ? "1.5px solid #c8861a" : "1.5px solid #ddd0b8",
                                borderRadius: "6px",
                                cursor: "pointer",
                                transition: "all 0.15s",
                              }}
                            >
                              {active ? `✓ Unit ${u}` : `Unit ${u}`}
                            </button>
                          );
                        })}
                        {units.length > 0 && (
                          <button type="button" onClick={() => setUnits([])}
                            style={{
                              padding: "5px 10px",
                              fontFamily: "'Inter', sans-serif",
                              fontSize: "0.75rem",
                              color: "#b08050",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              textDecoration: "underline",
                            }}
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Year + Session */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        <label style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.78rem", fontWeight: 600, color: "#5c4021", textTransform: "uppercase" }}>
                          Exam Year (Optional)
                        </label>
                        <input type="number" min="2015" max="2035" value={year}
                          onChange={e => setYear(e.target.value)}
                          placeholder="e.g. 2024"
                          style={{
                            padding: "9px 12px", background: "#fff",
                            border: "1.5px solid #ddd0b8", borderRadius: "8px",
                            fontFamily: "'Inter', sans-serif", fontSize: "0.85rem",
                            color: "#1f1209", outline: "none",
                          }}
                        />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        <label style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.78rem", fontWeight: 600, color: "#5c4021", textTransform: "uppercase" }}>
                          Session (Optional)
                        </label>
                        <select value={session} onChange={e => setSession(e.target.value)}
                          style={{
                            padding: "9px 12px", background: "#fff",
                            border: "1.5px solid #ddd0b8", borderRadius: "8px",
                            fontFamily: "'Inter', sans-serif", fontSize: "0.85rem",
                            color: "#1f1209", outline: "none",
                          }}
                        >
                          <option value="">Unspecified</option>
                          <option value="Jan-May">Jan-May (Spring Term)</option>
                          <option value="Aug-Dec">Aug-Dec (Autumn Term)</option>
                          <option value="Summer">Summer Term</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Conditional Notes Metadata ── */}
                {category?.value === "notes" && (
                  <div style={{
                    background: "rgba(200, 134, 26, 0.04)",
                    border: "1.5px solid #e8c96a88",
                    borderRadius: "12px",
                    padding: "14px 18px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.78rem", fontWeight: 600, color: "#5c4021", textTransform: "uppercase" }}>
                        Units Covered in these Notes (Optional)
                      </label>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.72rem", color: "#9a7845" }}>
                        {units.length === 0 ? "Select units if specific" : `${units.length} unit(s) tagged`}
                      </span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {UNIT_OPTIONS.map(u => {
                        const active = units.includes(u);
                        return (
                          <button key={u} type="button"
                            onClick={() => {
                              setUnits(prev => active ? prev.filter(x => x !== u) : [...prev, u].sort());
                            }}
                            style={{
                              padding: "5px 12px",
                              fontFamily: "'Inter', sans-serif",
                              fontSize: "0.8rem",
                              fontWeight: active ? 700 : 500,
                              color: active ? "#7a4f0d" : "#5c4021",
                              background: active ? "#fef3dc" : "#fff",
                              border: active ? "1.5px solid #c8861a" : "1.5px solid #ddd0b8",
                              borderRadius: "6px",
                              cursor: "pointer",
                              transition: "all 0.15s",
                            }}
                          >
                            {active ? `✓ Unit ${u}` : `Unit ${u}`}
                          </button>
                        );
                      })}
                      {units.length > 0 && (
                        <button type="button" onClick={() => setUnits([])}
                          style={{
                            padding: "5px 10px",
                            fontFamily: "'Inter', sans-serif",
                            fontSize: "0.75rem",
                            color: "#b08050",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            textDecoration: "underline",
                          }}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Two-col: Title + Subject ── */}
                <div className="mobile-grid-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                    <label htmlFor="upload-title" style={{ fontFamily: "'Inter', sans-serif",
                      fontSize: "0.82rem", fontWeight: 600, color: "#5c4021",
                      letterSpacing: "0.04em", textTransform: "uppercase" }}>Document Title</label>
                    <input id="upload-title" type="text" value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="e.g. DBMS Unit 3 – Normalization"
                      style={{ padding: "11px 14px", background: "#fff",
                        border: "1.5px solid #ddd0b8", borderRadius: "9px",
                        fontFamily: "'Inter', sans-serif", fontSize: "0.9rem",
                        color: "#1f1209", outline: "none" }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                    <label htmlFor="upload-subject" style={{ fontFamily: "'Inter', sans-serif",
                      fontSize: "0.82rem", fontWeight: 600, color: "#5c4021",
                      letterSpacing: "0.04em", textTransform: "uppercase" }}>Subject / Course</label>
                    <input id="upload-subject" type="text" value={subject}
                      onChange={e => setSubject(e.target.value)}
                      placeholder="e.g. CSE 301 – DBMS"
                      style={{ padding: "11px 14px", background: "#fff",
                        border: "1.5px solid #ddd0b8", borderRadius: "9px",
                        fontFamily: "'Inter', sans-serif", fontSize: "0.9rem",
                        color: "#1f1209", outline: "none" }} />
                  </div>
                </div>

                {/* ── Description ── */}
                <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                  <label htmlFor="upload-desc" style={{ fontFamily: "'Inter', sans-serif",
                    fontSize: "0.82rem", fontWeight: 600, color: "#5c4021",
                    letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    Description{" "}
                    <span style={{ fontWeight: 400, color: "#9a7845", textTransform: "none", letterSpacing: 0 }}>(optional)</span>
                  </label>
                  <textarea id="upload-desc" value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Brief description of what this document covers…"
                    rows={3} style={{ padding: "11px 14px", background: "#fff",
                      border: "1.5px solid #ddd0b8", borderRadius: "9px",
                      fontFamily: "'Inter', sans-serif", fontSize: "0.9rem",
                      color: "#1f1209", outline: "none", resize: "vertical" }} />
                </div>

                {/* ── Submit ── */}
                {error && (
                  <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "8px", padding: "10px 14px", fontFamily: "'Inter', sans-serif", fontSize: "0.83rem", color: "#b91c1c" }}>
                    {error}
                  </div>
                )}
                <button id="upload-submit" type="submit"
                  disabled={files.length === 0 || !category || !title || !subject || loading}
                  style={{
                    padding: "14px",
                    background: (files.length > 0 && category && title && subject && !loading)
                      ? "linear-gradient(135deg, #d97706 0%, #b45309 100%)"
                      : "#e9dcc8",
                    border: "none", borderRadius: "10px",
                    color: (files.length > 0 && category && title && subject && !loading) ? "#fff" : "#b0916a",
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "0.95rem", fontWeight: 600,
                    cursor: (files.length > 0 && category && title && subject && !loading) ? "pointer" : "not-allowed",
                    letterSpacing: "0.02em",
                    boxShadow: (files.length > 0 && category && title && subject && !loading) ? "0 4px 16px rgba(180,83,9,0.28)" : "none",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={e => { if (files.length > 0 && category && title && subject && !loading) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 22px rgba(180,83,9,0.35)"; } }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = (files.length > 0 && category && title && subject && !loading) ? "0 4px 16px rgba(180,83,9,0.28)" : "none"; }}
                >
                  {loading ? "Uploading Document..." : "Submit for Admin Review →"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
