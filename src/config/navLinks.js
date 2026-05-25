/** Shared primary nav links (desktop + mobile header). */
export const PRIMARY_NAV_LINKS = [
  {
    label: "Services",
    // Render as dropdown in the header — contains plan/listings/guarantee
    children: [
      { label: "Flat Plan", path: "/plan" },
      { label: "Listings", path: "/listings" },
      { label: "Guarantee", path: "/guarantee" },
    ],
  },
  { label: "Agents", path: "/agents" },
  { label: "About Us", path: "/about" },
  { label: "Contact", path: "/contact" },
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
