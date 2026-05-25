import Navbar from "../components/layout/Navbar";
import PremiumPageBackdrop from "../components/ui/PremiumPageBackdrop";
import Hero from "../components/sections/Hero";
import Stats from "../components/sections/Stats";
import Features from "../components/sections/Features";
import HowItWorks from "../components/sections/HowItWorks";
import Comparison from "../components/sections/Comparison";
import SmartMatch from "../components/sections/SmartMatch";
import GuaranteePlan from "../components/sections/GuaranteePlan";
import CityCTA from "../components/sections/CityCTA";
import Footer from "../components/layout/Footer";

/** Same shell as Services / marketing pages — home hero stays full-bleed dark inside. */
export default function Home() {
  return (
    <div className="relative min-h-[100dvh] bg-gradient-to-b from-[#fff5f2] via-white to-[#fff7f5] antialiased text-ink">
      <PremiumPageBackdrop variant="marketing" overlayOnly />

      <Navbar />

      <main className="relative z-10">
        <Hero />

        <div className="relative z-20 mt-8 px-4 sm:mt-10 sm:px-6 lg:-mt-14 lg:px-8 lg:z-30">
          <Stats />
        </div>

        <div className="relative z-10 mt-8 sm:mt-10 lg:-mt-6">
          <Features />
          <SmartMatch />
          <HowItWorks />
          <Comparison />
          <GuaranteePlan />
          <CityCTA />
        </div>
      </main>

      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}