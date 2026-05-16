/** Shared primary nav links (desktop + mobile header). */
export const PRIMARY_NAV_LINKS = [
  { label: "Services", path: "/services" },
  { label: "Guarantee", path: "/guarantee" },
  { label: "Listings", path: "/listings" },
  { label: "Flat Plan", path: "/plan" },
  { label: "Agents", path: "/agents" },
  { label: "Contact", path: "/contact" },
  { label: "Terms", path: "/terms" },
  { label: "Privacy", path: "/privacy" },
];

export const HEADER_CTA = {
  label: "Book a Free Consultation Now.",
  path: "/contact",
};

/** Flat-search checkout CTA (used on agents, contact secondary actions, etc.). */
export const FLAT_SEARCH_CTA = {
  label: "Start my flat search",
  path: "/checkout?sku=flat-search",
};

/** Whether a nav item should show the active underline. */
export function isNavLinkActive(pathname, path) {
  if (path === "/") return pathname === "/";
  if (path === "/listings") {
    return (
      pathname === "/listings" ||
      pathname === "/map" ||
      pathname.startsWith("/map/")
    );
  }
  if (path === "/plan") {
    return pathname === "/plan";
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}
