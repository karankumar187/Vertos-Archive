import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Footer from "./components/Footer";

function App() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f8f4ee" }}>
      <Navbar />
      <main className="flex-1 flex flex-col">
        <Hero />
      </main>
      <Footer />
    </div>
  );
}

export default App;