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
    <div className="min-h-screen bg-white antialiased">
      <Navbar />

      <main className="relative">
        <Hero />

        <div className="relative z-30 -mt-6 sm:-mt-12 lg:-mt-16">
          <Stats />
        </div>

        <div className="relative z-10 mt-0 sm:-mt-6 lg:-mt-8">
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