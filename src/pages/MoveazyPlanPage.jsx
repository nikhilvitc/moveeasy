import { useEffect, useMemo } from "react";

function planHtmlUrl() {
  const base = import.meta.env.BASE_URL || "/";
  const normalized = base.endsWith("/") ? base : `${base}/`;
  return `${normalized}moveazy-plan-page.html`;
}

export default function MoveazyPlanPage() {
  const src = useMemo(() => planHtmlUrl(), []);

  useEffect(() => {
    const prev = document.title;
    document.title = "Moveazy — Your Flat-Finding Plan";
    return () => {
      document.title = prev;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black">
      <iframe
        title="Moveazy flat-finding plan"
        src={src}
        className="h-full w-full flex-1 border-0 bg-[#F7F4F0]"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
