// src/pages/Guarantee.jsx
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import GuaranteeHero from "../components/sections/GuaranteeHero";
import DepositTrap from "../components/sections/DepositTrap";
import GuaranteeHowItWorks from "../components/sections/GuaranteeHowItWorks";
import SavingsBanner from "../components/sections/SavingsBanner";
import GuaranteeFAQ from "../components/sections/GuaranteeFAQ";
import GuaranteeEnrollCTA from "../components/sections/GuaranteeEnrollCTA";

export default function Guarantee() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff4f3] via-white to-[#fff8f6] antialiased">
      <Navbar />

      <main className="relative">
        <GuaranteeHero />
        <DepositTrap />
        <GuaranteeHowItWorks />
        <SavingsBanner />
        <GuaranteeFAQ />
        <GuaranteeEnrollCTA />
      </main>

      <Footer />
    </div>
  );
}
