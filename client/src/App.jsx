import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Hero from "./components/Hero";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import UploadPage from "./pages/UploadPage";
import ChatPage from "./pages/ChatPage";
import LeaderboardPage from "./pages/LeaderboardPage";

function Layout({ children, noFooter }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f8f4ee" }}>
      <Navbar />
      <main className="flex-1 flex flex-col">{children}</main>
      {!noFooter && <Footer />}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          <Layout>
            <Hero />
          </Layout>
        } />
        <Route path="/login" element={
          <Layout>
            <LoginPage />
          </Layout>
        } />
        <Route path="/register" element={
          <Layout>
            <RegisterPage />
          </Layout>
        } />
        <Route path="/dashboard" element={
          <Layout>
            <DashboardPage />
          </Layout>
        } />
        <Route path="/upload" element={
          <Layout>
            <UploadPage />
          </Layout>
        } />
        <Route path="/leaderboard" element={
          <Layout>
            <LeaderboardPage />
          </Layout>
        } />
        {/* Chat has its own full-height layout, no footer needed */}
        <Route path="/chat" element={
          <Layout noFooter>
            <ChatPage />
          </Layout>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;