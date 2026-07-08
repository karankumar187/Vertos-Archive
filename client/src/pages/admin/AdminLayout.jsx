import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Simple SVG Icons
const IconDashboard = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>;
const IconDocs = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
const IconUsers = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IconAnalytics = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
const IconCommunity = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 15c-3.86 0-7-3.14-7-7V4h14v4c0 3.86-3.14 7-7 7z"/><line x1="12" y1="15" x2="12" y2="22"/><line x1="7" y1="22" x2="17" y2="22"/></svg>;
const IconAnnouncements = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/></svg>;
const IconReports = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>;
const IconSettings = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
const IconLogs = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><circle cx="12" cy="13" r="3"/><line x1="12" y1="16" x2="12" y2="19"/></svg>;
const IconBack = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11"/></svg>;

export default function AdminLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { to: "/admin/dashboard", icon: <IconDashboard />, label: "Dashboard" },
    { to: "/admin/documents", icon: <IconDocs />, label: "Documents" },
    { to: "/admin/users", icon: <IconUsers />, label: "Users" },
    { to: "/admin/analytics", icon: <IconAnalytics />, label: "Analytics" },
    { to: "/admin/community", icon: <IconCommunity />, label: "Community" },
    { to: "/admin/announcements", icon: <IconAnnouncements />, label: "Announcements" },
    { to: "/admin/reports", icon: <IconReports />, label: "Reports" },
    { to: "/admin/settings", icon: <IconSettings />, label: "Settings" },
    { to: "/admin/logs", icon: <IconLogs />, label: "Activity Logs" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#fcfaf7", fontFamily: "'Inter', sans-serif" }}>
      
      {/* Sidebar */}
      <aside style={{ width: "260px", background: "#fff", borderRight: "1px solid #f0e6d2", display: "flex", flexDirection: "column", padding: "24px 16px", position: "sticky", top: 0, height: "100vh" }}>
        <div style={{ padding: "0 12px", marginBottom: "32px", cursor: "pointer" }} onClick={() => navigate('/')}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.4rem", color: "#c8861a", margin: 0, fontWeight: 700 }}>
            Vertos <span style={{ color: "#1f1209" }}>Archive</span>
          </h1>
        </div>

        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", borderRadius: "10px",
                textDecoration: "none", fontSize: "0.9rem", fontWeight: 600,
                color: isActive ? "#92400e" : "#6b4d1f",
                background: isActive ? "#fdf8f1" : "transparent",
                transition: "all 0.15s"
              })}
            >
              {item.icon} {item.label}
            </NavLink>
          ))}
          
          <div style={{ borderTop: "1px solid #f0e6d2", margin: "16px 0" }} />
          
          <button onClick={() => navigate('/dashboard')} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", borderRadius: "10px", background: "none", border: "none", cursor: "pointer", color: "#6b4d1f", fontSize: "0.9rem", fontWeight: 600 }}>
            <IconBack /> Exit Admin
          </button>
        </nav>

        {/* User Profile Footer */}
        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: "12px", padding: "12px", background: "#fdf8f1", borderRadius: "12px" }}>
          <img src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name}&background=c8861a&color=fff`} alt="User" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1f1209", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.name}</div>
            <div style={{ fontSize: "0.75rem", color: "#8b5e0a" }}>Super Admin</div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", height: "100vh", overflowY: "auto" }}>
        <div style={{ padding: "32px 40px", maxWidth: "1200px", width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", flex: 1 }}>
          <Outlet />
        </div>
      </main>

    </div>
  );
}
