import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import ServicesHero from "../components/sections/ServicesHero";
import StorySection from "../components/sections/StorySection";
import CoreValues from "../components/sections/CoreValues";
import ServicesTimeline from "../components/sections/ServicesTimeline";
import BuiltMoveazy from "../components/sections/BuiltMoveazy";
import ServiceRecap from "../components/sections/ServiceRecap";
import ServicesCTA from "../components/sections/ServicesCTA";

export default function Services() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff5f2] via-white to-[#fff7f5] antialiased">
      <Navbar />

      <main className="relative">
        <ServicesHero />
        <StorySection />
        <CoreValues />
        <ServicesTimeline />
        <BuiltMoveazy />
        <ServiceRecap />
        <ServicesCTA />
      </main>

      <Footer />
    </div>
  );
}
