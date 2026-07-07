import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import AITools from "./components/AITools";
import HowItWorks from "./components/HowItWorks";
import Pricing from "./components/Pricing";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <div className="section-divider" />
        <AITools />
        <div className="section-divider" />
        <Pricing />
        <div className="section-divider" />
        <HowItWorks />
      </main>
      <Footer />
    </>
  );
}
