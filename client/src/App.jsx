import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Hero from "./components/Hero";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import UploadPage from "./pages/ContributePage"; // We'll keep Upload logic here for now or route it via Community
import ChatPage from "./pages/ChatPage";
import CommunityPage from "./pages/CommunityPage";
import AboutPage from "./pages/AboutPage";
import ProfilePage from "./pages/ProfilePage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";

// New Admin Panel
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminDocuments from "./pages/admin/AdminDocuments";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminCommunity from "./pages/admin/AdminCommunity";
import AdminAnnouncements from "./pages/admin/AdminAnnouncements";
import AdminActivityLogs from "./pages/admin/AdminActivityLogs";

const Placeholder = ({ title }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "24px", height: "100%" }}>
    <div>
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", fontWeight: 700, color: "#1f1209", margin: "0 0 8px 0" }}>{title}</h1>
      <p style={{ color: "#6b4d1f", fontSize: "0.95rem", margin: 0 }}>This module is currently under construction.</p>
    </div>
    <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #f0e6d2", flex: 1, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(160,110,40,0.03)", color: "#8b5e0a", fontSize: "1.1rem" }}>
      Coming Soon
    </div>
  </div>
);
// (We will import the nested admin pages directly here as we build them, or use a lazy loader. 
// For now, let's create simple dummy components inside App.jsx or import them as we create them.)

function Layout({ children, noFooter }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f8f4ee" }}>
      <Navbar />
      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>{children}</main>
      {!noFooter && <Footer />}
    </div>
  );
}

/** Redirects to /login if user is not authenticated */
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div style={{ fontFamily: "'Inter', sans-serif", color: "#8b5e0a", fontSize: "1rem" }}>Loading…</div>
    </div>
  );
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

/** Redirects to / if user is already authenticated */
function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div style={{ fontFamily: "'Inter', sans-serif", color: "#8b5e0a", fontSize: "1rem" }}>Loading…</div>
    </div>
  );
  if (user) return <Navigate to="/" replace />;
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Layout><Hero /></Layout>} />
          <Route path="/login" element={<PublicOnlyRoute><Layout><LoginPage /></Layout></PublicOnlyRoute>} />
          <Route path="/register" element={<PublicOnlyRoute><Layout><RegisterPage /></Layout></PublicOnlyRoute>} />
          <Route path="/community" element={<Layout><CommunityPage /></Layout>} />
          <Route path="/about" element={<Layout><AboutPage /></Layout>} />

          {/* OAuth callback — no Navbar needed, just processes token */}
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          {/* Protected */}
          {/* Main App Protected */}
          <Route path="/dashboard" element={<Layout><ProtectedRoute><DashboardPage /></ProtectedRoute></Layout>} />
          <Route path="/chat" element={<Layout noFooter><ProtectedRoute><ChatPage /></ProtectedRoute></Layout>} />
          <Route path="/profile" element={<Layout><ProtectedRoute><ProfilePage /></ProtectedRoute></Layout>} />
          <Route path="/change-password" element={<Layout><ProtectedRoute><ChangePasswordPage /></ProtectedRoute></Layout>} />

          {/* New Admin Panel (No Main Layout Navbar/Footer) */}
          <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            {/* The rest will go here as we build them */}
            <Route path="documents" element={<AdminDocuments />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="community" element={<AdminCommunity />} />
            <Route path="announcements" element={<AdminAnnouncements />} />
            <Route path="reports" element={<Placeholder title="Reports" />} />
            <Route path="settings" element={<Placeholder title="Settings" />} />
            <Route path="logs" element={<AdminActivityLogs />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;