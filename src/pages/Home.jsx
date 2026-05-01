import Navbar from "../components/layout/Navbar";
import Hero from "../components/sections/Hero";
import Stats from "../components/sections/Stats";
import Features from "../components/sections/Features";
import HowItWorks from "../components/sections/HowItWorks";
import Comparison from "../components/sections/Comparison";
import SmartMatch from "../components/sections/SmartMatch";
import GuaranteePlan from "../components/sections/GuaranteePlan";
import Reviews from "../components/sections/Reviews";
import CityCTA from "../components/sections/CityCTA";
import Footer from "../components/layout/Footer";

export default function Home() {
  return (
    <div className="min-h-screen antialiased text-ink bg-transparent">
      <Navbar />

      <main className="relative">
        <Hero />

        {/* Pull-up overlap only on large screens — negative margin on mobile covered the hero + broker strip */}
        <div className="relative z-20 mt-8 px-2 sm:mt-10 sm:px-0 lg:-mt-14 lg:z-30">
          <Stats />
        </div>

        <div className="relative z-10 mt-8 sm:mt-10 lg:-mt-6">
          <Features />
          <SmartMatch />
          <HowItWorks />
          <Comparison />
          <GuaranteePlan />
          <Reviews />
          <CityCTA />
        </div>
      </main>

      <Footer />
    </div>
  );
}