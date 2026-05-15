import brandPng from "../../assets/logo/moveazy-brand.png";

/**
 * MovEAZY brand lockup (Mov + EAZY + pin).
 * Black in the PNG is knocked out on dark surfaces via mix-blend-screen.
 */
export default function MovEAZYLogo({ variant = "onDark", size = "md", className = "" }) {
  const imgClass =
    size === "sm"
      ? "h-7 w-auto max-w-[168px] object-contain object-left"
      : size === "lg"
        ? "h-11 w-auto max-w-[280px] sm:h-12 sm:max-w-[320px] object-contain object-left"
        : "h-8 w-auto max-w-[210px] sm:h-9 sm:max-w-[240px] object-contain object-left";

  const onLight = variant === "onLight";
  const knockout = !onLight;

  return (
    <span
      className={`inline-flex items-center shrink-0 ${knockout ? "isolation-auto" : ""} ${className}`}
      role="img"
      aria-label="MovEazy"
    >
      <img
        src={brandPng}
        alt=""
        draggable={false}
        className={`${imgClass} block ${knockout ? "mix-blend-screen" : ""}`}
      />
    </span>
  );
}
