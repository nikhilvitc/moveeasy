import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";

export default function Terms() {
  return (
    <div className="min-h-screen bg-white antialiased">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-gray-400 text-sm mb-10">Last updated: April 2026</p>

        <div className="prose prose-gray max-w-none space-y-6 text-[15px] leading-relaxed text-gray-600">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing and using the MovEazy platform ("Service"), you agree to be bound by these Terms of Service.
              If you do not agree, you may not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">2. Description of Service</h2>
            <p>
              MovEazy provides a digital platform connecting tenants with verified property listings in Bangalore.
              Our services include property discovery, broker verification, the Guarantee Plan (legal protection),
              and relocation assistance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">3. User Accounts</h2>
            <p>
              You must provide accurate and complete information when creating an account. You are responsible
              for maintaining the confidentiality of your login credentials. MovEazy reserves the right to
              suspend or terminate accounts that violate these terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">4. Guarantee Plan</h2>
            <p>
              The MovEazy Guarantee Plan (₹1,999) provides legal contract verification and deposit protection.
              Refunds are issued only when a deal falls through due to verified broker negligence, as determined
              by our legal team. Processing time for refunds is 7–14 business days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">5. Limitation of Liability</h2>
            <p>
              MovEazy acts as a technology intermediary and is not a party to any rental agreement between
              tenants and landlords. We do not guarantee the accuracy of all listing details and encourage
              users to independently verify property conditions before signing agreements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">6. Intellectual Property</h2>
            <p>
              All content, branding, and technology on the MovEazy platform are the property of
              MovEazy Architectural Relocation. Unauthorized reproduction or distribution is prohibited.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">7. Contact</h2>
            <p>
              For questions about these terms, contact us at{" "}
              <a href="mailto:support@moveazy.in" className="text-red-500 hover:underline">support@moveazy.in</a>
              {" "}or call +91 70559 54373.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
