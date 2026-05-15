import wordmarkPng from "../../assets/logo/moveazy-wordmark.png";

/**
 * Transparent MovEazy wordmark (no separate text label beside it).
 */
export default function MovEAZYLogo({ variant = "onDark", size = "md", className = "" }) {
  const imgClass =
    size === "sm"
      ? "h-7 w-auto max-w-[140px] object-contain object-left"
      : size === "lg"
        ? "h-10 w-auto max-w-[220px] sm:h-11 sm:max-w-[260px] object-contain object-left"
        : "h-8 w-auto max-w-[180px] sm:h-9 sm:max-w-[210px] object-contain object-left";

  const onLight = variant === "onLight";

  return (
    <span className={`inline-flex items-center shrink-0 ${className}`} role="img" aria-label="MovEazy">
      <img
        src={wordmarkPng}
        alt=""
        draggable={false}
        className={`${imgClass} ${onLight ? "" : "brightness-100"}`}
      />
    </span>
  );
}
