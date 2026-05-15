import { useEffect, useMemo } from "react";
import Navbar from "../components/layout/Navbar";
import PremiumPageBackdrop from "../components/ui/PremiumPageBackdrop";

function planHtmlUrl() {
  const base = import.meta.env.BASE_URL || "/";
  const normalized = base.endsWith("/") ? base : `${base}/`;
  /* embed=1 hides in-frame nav (React Navbar is the real chrome). v= bumps cache after edits. */
  const v = import.meta.env.VITE_PLAN_PAGE_ASSET_VERSION ?? "20260516b";
  return `${normalized}moveazy-plan-page.html?embed=1&v=${encodeURIComponent(v)}`;
}

export default function MoveazyPlanPage() {
  const src = useMemo(() => planHtmlUrl(), []);

  useEffect(() => {
    const prev = document.title;
    document.title = "MovEazy — Your Flat-Finding Plan";
    return () => {
      document.title = prev;
    };
  }, []);

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-x-hidden bg-gradient-to-b from-[#fff5f2] via-white to-[#fff7f5] antialiased">
      <PremiumPageBackdrop variant="marketing" overlayOnly />
      <div className="relative z-30 shrink-0">
        <Navbar />
      </div>
      <iframe
        title="MovEazy flat-finding plan"
        src={src}
        className="relative z-10 min-h-[calc(100dvh-3rem)] w-full flex-1 border-0 bg-transparent"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
