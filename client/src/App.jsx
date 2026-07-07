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
import AdminDashboardPage from "./pages/AdminDashboardPage";

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

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Layout><Hero /></Layout>} />
          <Route path="/login" element={<Layout><LoginPage /></Layout>} />
          <Route path="/register" element={<Layout><RegisterPage /></Layout>} />
          <Route path="/community" element={<Layout><CommunityPage /></Layout>} />
          <Route path="/about" element={<Layout><AboutPage /></Layout>} />

          {/* OAuth callback — no Navbar needed, just processes token */}
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          {/* Protected */}
          <Route path="/dashboard" element={<Layout><ProtectedRoute><DashboardPage /></ProtectedRoute></Layout>} />
          <Route path="/admin" element={<Layout><ProtectedRoute><AdminDashboardPage /></ProtectedRoute></Layout>} />
          <Route path="/chat" element={<Layout noFooter><ProtectedRoute><ChatPage /></ProtectedRoute></Layout>} />
          <Route path="/profile" element={<Layout><ProtectedRoute><ProfilePage /></ProtectedRoute></Layout>} />
          <Route path="/change-password" element={<Layout><ProtectedRoute><ChangePasswordPage /></ProtectedRoute></Layout>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;