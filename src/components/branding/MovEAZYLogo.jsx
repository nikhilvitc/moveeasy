/**
 * Transparent wordmark for dark or light headers — avoids raster logo “box” on #000 bars.
 */
export default function MovEAZYLogo({ variant = "onDark", size = "md", className = "" }) {
  const mov = variant === "onDark" ? "text-white" : "text-stone-900";
  const sizeClass =
    size === "sm"
      ? "text-[16px] leading-none"
      : size === "lg"
        ? "text-[20px] sm:text-[24px] leading-none"
        : "text-[18px] sm:text-[21px] leading-none";

  return (
    <span
      className={`inline-flex items-end gap-0.5 font-extrabold tracking-tight ${sizeClass} ${className}`}
      role="img"
      aria-label="MovEAZY"
    >
      <span className={mov}>Mov</span>
      <span className="text-[#FF3131]">EAZY</span>
      <svg
        className="mb-[2px] shrink-0 text-[#FF3131]"
        width="11"
        height="14"
        viewBox="0 0 24 28"
        aria-hidden="true"
      >
        <path
          fill="currentColor"
          d="M12 0C7 0 3 4 3 9c0 6.5 9 19 9 19s9-12.5 9-19c0-5-4-9-9-9zm0 12.5a3.5 3.5 0 110-7 3.5 3.5 0 010 7z"
        />
      </svg>
    </span>
  );
}
