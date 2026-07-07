import { useState, useEffect } from "react";
import { archiveAPI } from "../services/api";
import campusSketch from "../assets/campus-sketch.png";

const DocumentCard = ({ doc }) => {
  return (
    <div style={{
      background: "#fff", borderRadius: "12px", padding: "20px",
      border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
      display: "flex", flexDirection: "column", gap: "12px"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <h4 style={{ margin: 0, fontSize: "1.1rem", color: "#1e293b", fontWeight: 600 }}>{doc.title}</h4>
        <span style={{ fontSize: "0.75rem", background: "#fef3dc", color: "#c8861a", padding: "4px 8px", borderRadius: "8px", fontWeight: 600 }}>{doc.subject}</span>
      </div>
      <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b", flex: 1, lineHeight: 1.5 }}>
        {doc.description || "No description provided."}
      </p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
        <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
          By {doc.uploadedBy?.name || 'Anonymous'}
        </span>
        <a href={doc.fileUrl} target="_blank" rel="noreferrer" style={{
          textDecoration: "none", fontSize: "0.85rem", fontWeight: 600, color: "#2563eb"
        }}>
          View File
        </a>
      </div>
    </div>
  );
};

export default function ArchiveTab() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [courseFilter, setCourseFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [expandedCourse, setExpandedCourse] = useState(null);

  const fetchArchive = async () => {
    try {
      setLoading(true);
      const params = {};
      if (courseFilter) params.courseCode = courseFilter;
      if (categoryFilter) params.category = categoryFilter;
      
      const { data } = await archiveAPI.getArchive(params);
      if (data.success) {
        setDocuments(data.data);
      }
    } catch (error) {
      console.error("Error fetching archive:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchive();
  }, [courseFilter, categoryFilter]);

  const groupedDocs = documents.reduce((acc, doc) => {
    const key = doc.subject ? doc.subject.replace(/\s+/g, '').toUpperCase() : 'OTHER';
    if (!acc[key]) acc[key] = [];
    acc[key].push(doc);
    return acc;
  }, {});

  const sortedCourses = Object.keys(groupedDocs).sort();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h2 style={{ margin: "0 0 8px 0", fontSize: "1.8rem", color: "#1f1209", fontFamily: "'Playfair Display', serif" }}>
            Resource Archive
          </h2>
          <p style={{ margin: 0, color: "#6b4d1f", fontSize: "0.95rem" }}>
            Browse through all community-verified resources.
          </p>
        </div>
        
        <div style={{ display: "flex", gap: "12px" }}>
          <input 
            type="text" 
            placeholder="Filter by Course (e.g. MTH174)"
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", minWidth: "220px" }}
          />
          <select 
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", background: "#fff" }}
          >
            <option value="">All Categories</option>
            <option value="notes">Notes</option>
            <option value="pyq">PYQ</option>
            <option value="syllabus">Syllabus</option>
            <option value="placements">Placements</option>
            <option value="faculty">Faculty</option>
            <option value="university">University</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>Loading archive...</div>
      ) : documents.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {sortedCourses.map(course => (
            <div key={course} style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e9dcc8", overflow: "hidden" }}>
              <button 
                onClick={() => setExpandedCourse(expandedCourse === course ? null : course)}
                style={{ 
                  width: "100%", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: expandedCourse === course ? "#fdfaf5" : "#fff", border: "none", cursor: "pointer", transition: "background 0.2s"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <h3 style={{ margin: 0, fontSize: "1.2rem", color: "#1f1209", fontFamily: "'Inter', sans-serif", fontWeight: 700 }}>
                    {course}
                  </h3>
                  <span style={{ fontSize: "0.75rem", background: "#fdf3e1", color: "#b47a18", padding: "2px 8px", borderRadius: "12px", fontWeight: 600 }}>
                    {groupedDocs[course].length} Resources
                  </span>
                </div>
                <span style={{ color: "#9a7845", transform: expandedCourse === course ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</span>
              </button>

              {/* Expanded Documents List */}
              {(expandedCourse === course || (courseFilter.trim() && sortedCourses.length === 1)) && (
                <div style={{ borderTop: "1px solid #e9dcc8", overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Inter', sans-serif", fontSize: "0.85rem", minWidth: "700px" }}>
                    <thead>
                      <tr style={{ background: "#fdfaf5", borderBottom: "1px solid #f0e6d2", textAlign: "left", color: "#8b6535", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.05em" }}>
                        <th style={{ padding: "12px 20px" }}>Document</th>
                        <th style={{ padding: "12px 20px" }}>Category</th>
                        <th style={{ padding: "12px 20px" }}>Uploader</th>
                        <th style={{ padding: "12px 20px", textAlign: "right" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedDocs[course].map(doc => (
                        <tr key={doc._id} style={{ borderBottom: "1px solid #f0e6d2", transition: "background 0.2s" }}
                            onMouseEnter={e => e.currentTarget.style.background = "#fcfaf7"} onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                          
                          <td style={{ padding: "12px 20px" }}>
                            <p style={{ fontWeight: 600, color: "#2d1f0a", margin: "0 0 4px 0" }}>{doc.title}</p>
                            <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b", maxWidth: "300px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {doc.description || "No description provided."}
                            </p>
                          </td>

                          <td style={{ padding: "12px 20px" }}>
                            <span style={{ display: "inline-block", background: "#fdf3e1", color: "#b47a18", padding: "4px 8px", borderRadius: "12px", fontSize: "0.7rem", fontWeight: 600, textTransform: "capitalize" }}>
                              {doc.category}
                            </span>
                          </td>

                          <td style={{ padding: "12px 20px" }}>
                            <p style={{ color: "#3d2800", fontWeight: 500, margin: 0 }}>{doc.uploaderID?.name || 'Anonymous'}</p>
                          </td>

                          <td style={{ padding: "12px 20px", textAlign: "right" }}>
                            <a href={doc.fileUrl} target="_blank" rel="noreferrer" style={{
                              textDecoration: "none", fontSize: "0.85rem", fontWeight: 600, color: "#c8861a", border: "1px solid #e9dcc8", padding: "6px 12px", borderRadius: "8px", display: "inline-block", transition: "all 0.2s"
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = "#fdfaf5"; e.currentTarget.style.borderColor = "#c8861a"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "#e9dcc8"; }}
                            >
                              View File
                            </a>
                          </td>

                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>No resources found.</div>
      )}
    </div>
  );
}
