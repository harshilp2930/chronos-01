import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import LiveStatusBar from "@/components/LiveStatusBar";
import ModelStatsSection from "@/components/ModelStatsSection";
import NavBar from "@/components/NavBar";
import TechStackSection from "@/components/TechStackSection";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-x-clip bg-[#05080f] text-white">
      <NavBar />
      <HeroSection />
      <LiveStatusBar />
      <HowItWorksSection />
      <ModelStatsSection />
      <TechStackSection />
      <Footer />
    </main>
  );
}
