import brandPng from "../../assets/logo/moveazy-brand.png";

/** MovEAZY brand lockup — designed for #000000 backgrounds. */
export default function MovEAZYLogo({ size = "md", className = "" }) {
  const imgClass =
    size === "nav"
      ? "h-8 w-auto max-w-[158px] object-contain object-left"
      : size === "sm"
        ? "h-7 w-auto max-w-[140px] object-contain object-left"
        : size === "lg"
          ? "h-11 w-auto max-w-[280px] sm:h-12 sm:max-w-[320px] object-contain object-left"
          : "h-8 w-auto max-w-[210px] sm:h-9 sm:max-w-[240px] object-contain object-left";

  return (
    <span className={`inline-flex items-center shrink-0 ${className}`} role="img" aria-label="MovEazy">
      <img src={brandPng} alt="" draggable={false} className={`${imgClass} block`} />
    </span>
  );
}
