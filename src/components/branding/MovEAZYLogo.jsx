import logoSvg from "../../assets/logo/moveasy.svg";

/**
 * Brand mark only — raster/SVG logo, no separate wordmark beside it (avoids redundant “Moveazy” text).
 * Light frame on dark bars keeps the mark readable.
 */
export default function MovEAZYLogo({ variant = "onDark", size = "md", className = "" }) {
  const frame =
    variant === "onDark"
      ? "rounded-lg bg-white/95 p-1 shadow-md ring-1 ring-white/25"
      : "rounded-lg bg-white p-1 shadow-sm ring-1 ring-stone-200/80";

  const imgClass =
    size === "sm"
      ? "h-7 w-auto max-w-[132px] sm:max-w-[150px] object-contain object-left"
      : size === "lg"
        ? "h-9 w-auto max-w-[200px] sm:h-10 sm:max-w-[240px] object-contain object-left"
        : "h-8 w-auto max-w-[168px] sm:h-9 sm:max-w-[200px] object-contain object-left";

  return (
    <span className={`inline-flex items-center shrink-0 ${className}`} role="img" aria-label="MovEazy">
      <span className={`inline-flex shrink-0 ${frame}`}>
        <img src={logoSvg} alt="" draggable={false} className={imgClass} />
      </span>
    </span>
  );
}
