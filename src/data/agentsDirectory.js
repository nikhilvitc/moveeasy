/**
 * Demo directory data — Zillow-style fields for area experts & partner brokers.
 * Replace with Firestore / API when live broker profiles exist.
 */
export const SPECIALTY_OPTIONS = ["All", "Rentals", "PG & coliving", "Luxury", "Investment", "Commercial"];
export const LANGUAGE_OPTIONS = ["All", "English", "Hindi", "Kannada", "Tamil", "Telugu", "Malayalam", "Gujarati"];
export const BUDGET_OPTIONS = ["All", "Under ₹15k/mo", "₹15k – ₹30k/mo", "₹30k – ₹50k/mo", "₹50k+/mo"];

/** @typedef {{ id: string, tab: "experts"|"brokers", name: string, initials: string, team: boolean, brokerage: string, rating: number, reviewCount: number, priceRangeLabel: string, recentActivity: string, localExpertise: string, specialties: string[], languages: string[], areas: string[], topRated: boolean, rentFocus: boolean, buyFocus: boolean, budgetTier: 1|2|3|4 }} AgentProfile */

/** @type {AgentProfile[]} */
export const AGENTS = [];
