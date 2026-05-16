import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Navbar from "../components/layout/Navbar";
import PremiumPageBackdrop from "../components/ui/PremiumPageBackdrop";

const NAV_OFFSET_PX = 48;
/** Fallback only before first measure — not forced once content height is known */
const MIN_IFRAME_PX = 480;

function planHtmlUrl() {
  const base = import.meta.env.BASE_URL || "/";
  const normalized = base.endsWith("/") ? base : `${base}/`;
  const v = import.meta.env.VITE_PLAN_PAGE_ASSET_VERSION ?? "20260516h";
  return `${normalized}moveazy-plan-page.html?embed=1&v=${encodeURIComponent(v)}`;
}

function measureIframeDocument(iframe) {
  try {
    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!doc) return null;
    const height = Math.max(
      doc.documentElement?.scrollHeight ?? 0,
      doc.body?.scrollHeight ?? 0,
      doc.documentElement?.offsetHeight ?? 0
    );
    return height > 400 ? height : null;
  } catch {
    return null;
  }
}

export default function MoveazyPlanPage() {
  const src = useMemo(() => planHtmlUrl(), []);
  const iframeRef = useRef(null);
  const [iframeHeight, setIframeHeight] = useState(null);

  const syncIframeHeight = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const measured = measureIframeDocument(iframe);
    if (!measured) return;
    setIframeHeight(Math.ceil(measured + 8));
  }, []);

  useEffect(() => {
    const prev = document.title;
    document.title = "MovEazy — Your Flat-Finding Plan";
    return () => {
      document.title = prev;
    };
  }, []);

  useEffect(() => {
    const onMessage = (event) => {
      if (event.data?.type !== "moveazy-plan-iframe-height") return;
      const height = Number(event.data.height);
      if (!Number.isFinite(height) || height < 400) return;
      setIframeHeight(Math.ceil(height + 8));
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    const delays = [0, 120, 400, 1000, 2500];
    const timers = delays.map((ms) => window.setTimeout(syncIframeHeight, ms));
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [syncIframeHeight, src]);

  const fallbackHeight =
    typeof window !== "undefined"
      ? `max(${MIN_IFRAME_PX}px, calc(100dvh - ${NAV_OFFSET_PX}px))`
      : `${MIN_IFRAME_PX}px`;

  const iframeStyle = {
    width: "100%",
    minHeight: fallbackHeight,
    height: iframeHeight ? `${iframeHeight}px` : fallbackHeight,
    display: "block",
    border: "none",
  };

  const handleIframeLoad = () => {
    syncIframeHeight();
    try {
      iframeRef.current?.contentWindow?.postMessage(
        { type: "moveazy-plan-request-height" },
        "*"
      );
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="relative min-h-0 bg-gradient-to-b from-[#fff5f2] via-white to-[#fff7f5] antialiased">
      <PremiumPageBackdrop variant="marketing" overlayOnly />
      <div className="relative z-30">
        <Navbar />
      </div>
      <main className="relative z-10 w-full">
        <iframe
          ref={iframeRef}
          title="MovEazy flat-finding plan"
          src={src}
          style={iframeStyle}
          className="w-full bg-transparent"
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={handleIframeLoad}
        />
      </main>
    </div>
  );
}
