// src/pages/Guarantee.jsx
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import PageShell from "../components/layout/PageShell";
import GuaranteeHero from "../components/sections/GuaranteeHero";
import DepositTrap from "../components/sections/DepositTrap";
import GuaranteeHowItWorks from "../components/sections/GuaranteeHowItWorks";
import SavingsBanner from "../components/sections/SavingsBanner";
import GuaranteeFAQ from "../components/sections/GuaranteeFAQ";
import GuaranteeEnrollCTA from "../components/sections/GuaranteeEnrollCTA";

export default function Guarantee() {
  return (
    <PageShell
      variant="marketing"
      overlayOnly
      className="antialiased bg-gradient-to-b from-[#fff4f3] via-white to-[#fff8f6]"
    >
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
    </PageShell>
  );
}
