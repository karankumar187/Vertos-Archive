import { useState, useEffect } from "react";
import { adminAPI } from "../../services/api";

const IconEdit = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IconBan = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>;
const IconCheck = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>;

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getUsers();
      setUsers(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSuspend = async (user) => {
    const isSuspending = user.status === 'Active';
    if (!window.confirm(`Are you sure you want to ${isSuspending ? 'suspend' : 'activate'} ${user.name}?`)) return;
    try {
      await adminAPI.suspendUser(user._id, isSuspending);
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert('Failed to update user status');
    }
  };

  const handleChangeRole = async (user) => {
    const newRole = prompt(`Change role for ${user.name} (admin/user):`, user.role);
    if (!newRole || newRole === user.role) return;
    if (!['admin', 'user'].includes(newRole)) {
      alert("Role must be 'admin' or 'user'");
      return;
    }
    try {
      await adminAPI.updateUserRole(user._id, newRole);
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert('Failed to update user role');
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.regNo || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", height: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", fontWeight: 700, color: "#1f1209", margin: "0 0 8px 0" }}>Users</h1>
          <p style={{ color: "#6b4d1f", fontSize: "0.95rem", margin: 0 }}>Manage all users and their activities.</p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button style={{ padding: "10px 20px", background: "#fff", border: "1px solid #e9dcc8", borderRadius: "10px", color: "#1f1209", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" }}>Export</button>
          <button style={{ padding: "10px 20px", background: "#c8861a", border: "none", borderRadius: "10px", color: "#fff", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" }}>+ Add User</button>
        </div>
      </div>

      {/* Table Area */}
      <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #f0e6d2", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 2px 8px rgba(160,110,40,0.03)" }}>
        
        {/* Filters */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #f0e6d2", display: "flex", gap: "16px", alignItems: "center" }}>
          <input 
            type="text" 
            placeholder="Search users..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ flex: 1, padding: "10px 16px", borderRadius: "10px", border: "1px solid #e9dcc8", outline: "none", fontSize: "0.9rem" }} 
          />
          <select style={{ padding: "10px 16px", borderRadius: "10px", border: "1px solid #e9dcc8", background: "#fff", outline: "none", fontSize: "0.9rem", color: "#6b4d1f" }}><option>Role</option></select>
          <select style={{ padding: "10px 16px", borderRadius: "10px", border: "1px solid #e9dcc8", background: "#fff", outline: "none", fontSize: "0.9rem", color: "#6b4d1f" }}><option>Status</option></select>
        </div>

        {/* Table Content */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div style={{ padding: "24px", color: "#6b4d1f" }}>Loading users...</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #f0e6d2", color: "#8b5e0a", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  <th style={{ padding: "16px 24px", fontWeight: 600 }}>User</th>
                  <th style={{ padding: "16px 24px", fontWeight: 600 }}>Registration No.</th>
                  <th style={{ padding: "16px 24px", fontWeight: 600 }}>Role</th>
                  <th style={{ padding: "16px 24px", fontWeight: 600 }}>Points</th>
                  <th style={{ padding: "16px 24px", fontWeight: 600 }}>Status</th>
                  <th style={{ padding: "16px 24px", fontWeight: 600, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user._id} style={{ borderBottom: "1px solid #f9f5f0", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "#fdf8f1"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "16px 24px", display: "flex", alignItems: "center", gap: "12px" }}>
                      <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=f0e6d2&color=8b5e0a`} alt={user.name} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
                      <div>
                        <div style={{ fontSize: "0.9rem", color: "#1f1209", fontWeight: 600 }}>{user.name}</div>
                        <div style={{ fontSize: "0.75rem", color: "#8b5e0a" }}>{user.email}</div>
                      </div>
                    </td>
                    <td style={{ padding: "16px 24px", fontSize: "0.85rem", color: "#6b4d1f" }}>{user.regNo || 'N/A'}</td>
                    <td style={{ padding: "16px 24px", fontSize: "0.85rem", color: "#6b4d1f", textTransform: "capitalize" }}>{user.role}</td>
                    <td style={{ padding: "16px 24px", fontSize: "0.85rem", color: "#6b4d1f", fontWeight: 600 }}>{user.points || 0}</td>
                    <td style={{ padding: "16px 24px" }}>
                      <span style={{ 
                        padding: "4px 10px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 600,
                        background: user.status === 'Active' ? "#ecfdf5" : "#fef2f2",
                        color: user.status === 'Active' ? "#059669" : "#dc2626"
                      }}>
                        {user.status}
                      </span>
                    </td>
                    <td style={{ padding: "16px 24px", textAlign: "right" }}>
                      <button onClick={() => handleChangeRole(user)} style={{ background: "none", border: "none", color: "#8b5e0a", cursor: "pointer", marginRight: "12px" }} title="Edit Role"><IconEdit /></button>
                      <button onClick={() => handleSuspend(user)} style={{ background: "none", border: "none", color: user.status === 'Active' ? "#dc2626" : "#059669", cursor: "pointer" }} title={user.status === 'Active' ? "Suspend User" : "Activate User"}>
                        {user.status === 'Active' ? <IconBan /> : <IconCheck />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
