import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import PageShell from "../components/layout/PageShell";
import MovEAZYLogo from "../components/branding/MovEAZYLogo";
import {
  getAllUsers,
  getListings,
  getSellerRequests,
  removeListing,
  upsertListing,
  addUserLocally,
  removeUserLocally,
  updateUserLocally,
  getInterestsGlobal,
  updateInterestGlobal,
  getAssignments,
  addAssignment,
  getNotificationsLocal,
  markNotificationLocalRead,
  getUserActivityEvents,
  pushNotificationLocal,
} from "../lib/store";
import { ingestBrokerListings, ingestPartnerListings, normalizeBrokerListings, normalizePartnerListings } from "../lib/externalFeeds";
import { isFirebaseConfigured, db, functions } from "../lib/firebase";
import { httpsCallable } from "firebase/functions";
import { collection, doc, getDocs, onSnapshot, orderBy, query, setDoc, updateDoc } from "firebase/firestore";
import {
  addUserProfileData,
  getAllUsersData,
  getAdminListingsData,
  getSellerRequestsData,
  removeListingData,
  removeUserProfileData,
  uploadListingFiles,
  upsertListingData,
  getVisitsData,
  updateUserProfileData,
  getInterestsData,
  getAssignmentsData,
  getAdminNotificationsData,
  markNotificationReadData,
  updateInterestStatusData,
  getActivityEventsForEmail,
  addAssignmentData,
  addNotificationData,
  upsertListingPrivateData,
  getListingPrivateData,
} from "../lib/firestoreStore";
import { notifyCustomerInterestStatusChanged, notifyCustomerListingAssigned } from "../lib/crmSync";
import { reportClientError } from "../lib/clientLog";
import { fetchBrokerContacts } from "../lib/brokerContactLog";
import MediaUploadField from "../components/MediaUploadField";
import ListingMapPicker from "../components/ListingMapPicker";
import { getBookings } from "../lib/userActivity";
import {
  CONTACT_GRADIENTS,
  DEFAULT_SITE_PUBLIC,
  fetchSitePublicSettings,
  saveSitePublicSettings,
} from "../lib/sitePublicSettings";
import {
  fetchDirectoryAgents,
  getDefaultDirectoryAgents,
  saveDirectoryAgents,
} from "../lib/directoryAgentsSettings";

const DEFAULT_FORM = {
  title: "",
  price: "",
  bhk: "2 BHK",
  address: "",
  seller: "",
  sellerEmail: "",
  agentPhonePrivate: "",
  ownerPhonePrivate: "",
  image: "",
  imagesText: "",
  source: "manual",
  sourceUrl: "",
  description: "",
  monthlyRent: 25000,
  availability: "Immediate",
  propertyType: "Apartment",
  furnishing: "Semi",
  preferredTenants: ["Family", "Bachelor"],
  parking: ["2 Wheeler"],
  securityDeposit: "",
  maintenanceCost: "",
  brokerage: "",
  builtUpArea: "",
  areaUnit: "sq ft",
  bathrooms: "",
  balcony: "",
  floorNumber: "",
  totalFloors: "",
  leaseType: "",
  ageOfProperty: "",
  parkingInfo: "",
  gasPipeline: "",
  gatedCommunity: "",
  amenitiesText: "",
  furnishingsText: "",
  lat: 12.9716,
  lng: 77.5946,
};

function toList(value, fallback) {
  if (Array.isArray(value) && value.length) return value;
  if (typeof value === "string" && value.trim()) {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return fallback;
}

function normalizeUrlList(value) {
  const raw = [];
  if (Array.isArray(value)) raw.push(...value);
  else if (typeof value === "string" && value.trim()) raw.push(...value.split(/\r?\n|,/));
  return raw.map((x) => String(x || "").trim()).filter(Boolean);
}

function pickListingMediaUrls(listing) {
  const candidates = [
    listing?.images,
    listing?.photos,
    listing?.gallery,
    listing?.media,
    listing?.mediaUrls,
    listing?.imageUrls,
  ];
  const urls = [];
  candidates.forEach((c) => urls.push(...normalizeUrlList(c)));
  if (listing?.image) urls.unshift(String(listing.image).trim());
  const seen = new Set();
  const out = [];
  for (const u of urls) {
    const k = u.toLowerCase();
    if (!u || seen.has(k)) continue;
    seen.add(k);
    out.push(u);
  }
  return out;
}

function listingToForm(listing) {
  const mediaUrls = pickListingMediaUrls(listing);
  return {
    title: listing.title || "",
    price: listing.price || "",
    bhk: listing.bhk || "2 BHK",
    address: listing.address || "",
    seller: listing.seller || "",
    sellerEmail: listing.sellerEmail || "",
    image: listing.image || mediaUrls[0] || "",
    imagesText: mediaUrls.length ? mediaUrls.join("\n") : "",
    source: listing.source || "manual",
    sourceUrl: listing.sourceUrl || "",
    description: listing.description || "",
    monthlyRent: Number(listing.monthlyRent || 25000),
    availability: listing.availability || "Immediate",
    propertyType: listing.propertyType || "Apartment",
    furnishing: listing.furnishing || "Semi",
    preferredTenants: toList(listing.preferredTenants, ["Family"]),
    parking: toList(listing.parking, ["2 Wheeler"]),
    securityDeposit: listing.securityDeposit || "",
    maintenanceCost: listing.maintenanceCost || "",
    brokerage: listing.brokerage || "",
    builtUpArea: listing.builtUpArea || "",
    areaUnit: listing.areaUnit || "sq ft",
    bathrooms: listing.bathrooms || "",
    balcony: listing.balcony || "",
    floorNumber: listing.floorNumber || "",
    totalFloors: listing.totalFloors || "",
    leaseType: listing.leaseType || "",
    ageOfProperty: listing.ageOfProperty || "",
    parkingInfo: listing.parkingInfo || "",
    gasPipeline: listing.gasPipeline || "",
    gatedCommunity: listing.gatedCommunity || "",
    amenitiesText: Array.isArray(listing.amenities) ? listing.amenities.join(", ") : (listing.amenities || ""),
    furnishingsText: Array.isArray(listing.furnishings) ? listing.furnishings.join(", ") : (listing.furnishings || ""),
    lat: Number(listing.lat || 12.9716),
    lng: Number(listing.lng || 77.5946),
  };
}

export default function AdminDashboard() {
  const {
    user,
    logout,
    approveSeller,
    rejectSeller,
    getPendingSellerBadgeApplications,
    approveSellerBadge,
    rejectSellerBadge,
  } = useAuth();
  const navigate = useNavigate();

  const [refreshTick, setRefreshTick] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [pinPosition, setPinPosition] = useState([DEFAULT_FORM.lat, DEFAULT_FORM.lng]);
  const [feedJson, setFeedJson] = useState("");
  const [importBrokerName, setImportBrokerName] = useState("");
  const [importSourceName, setImportSourceName] = useState("manual-transfer");
  const [cloudImportProfileUrl, setCloudImportProfileUrl] = useState("");
  const [cloudImportJobId, setCloudImportJobId] = useState(null);
  const [cloudImportJobStatus, setCloudImportJobStatus] = useState(null);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("customer");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");
  const [listingsState, setListingsState] = useState([]);
  const [usersState, setUsersState] = useState([]);
  const [editingUserEmail, setEditingUserEmail] = useState(null);
  const [editUserForm, setEditUserForm] = useState({ name: "", role: "customer", phone: "" });
  const [sellerReqsState, setSellerReqsState] = useState([]);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [visitRequests, setVisitRequests] = useState([]);
  const [interestsState, setInterestsState] = useState([]);
  const [assignmentsState, setAssignmentsState] = useState([]);
  const [adminNotifs, setAdminNotifs] = useState([]);
  const [userListTab, setUserListTab] = useState("all");
  /** Primary nav: reduces vertical scroll as data grows */
  const [adminSection, setAdminSection] = useState("overview");
  const [loadErrors, setLoadErrors] = useState([]);
  const [historyUser, setHistoryUser] = useState(null);
  const [historyBundle, setHistoryBundle] = useState(null);
  const [assignCustomerEmail, setAssignCustomerEmail] = useState("");
  const [assignCustomerName, setAssignCustomerName] = useState("");
  const [assignCustomerPhone, setAssignCustomerPhone] = useState("");
  const [assignListingId, setAssignListingId] = useState("");
  const [assignPhonePreview, setAssignPhonePreview] = useState("");
  const [assignNotes, setAssignNotes] = useState("");
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth <= 900 : false);
  const [sitePublicDraft, setSitePublicDraft] = useState(() => ({
    ...DEFAULT_SITE_PUBLIC,
    contacts: DEFAULT_SITE_PUBLIC.contacts.map((c) => ({ ...c })),
  }));
  const [sitePublicStatus, setSitePublicStatus] = useState("");
  const [agentsDraft, setAgentsDraft] = useState(() =>
    getDefaultDirectoryAgents().map((a) => ({
      ...a,
      specialties: Array.isArray(a.specialties) ? a.specialties.join(", ") : "",
      languages: Array.isArray(a.languages) ? a.languages.join(", ") : "",
      areas: Array.isArray(a.areas) ? a.areas.join(", ") : "",
    })),
  );
  const [agentsSaveStatus, setAgentsSaveStatus] = useState("");
  const [brokersData, setBrokersData] = useState([]);
  const [adminListingMsg, setAdminListingMsg] = useState("");
  const [adminListingMsgKind, setAdminListingMsgKind] = useState("ok");
  const [adminListingWarning, setAdminListingWarning] = useState("");
  const [contactQueries, setContactQueries] = useState([]);
  const [contactQueriesFilter, setContactQueriesFilter] = useState("all");

  const parsedListingMediaUrls = useMemo(() => {
    const raw = String(form.imagesText || form.image || "")
      .split(/\r?\n|,/)
      .map((s) => s.trim())
      .filter(Boolean);
    const seen = new Set();
    const out = [];
    for (const url of raw) {
      const key = url.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(url);
    }
    return out.slice(0, 24);
  }, [form.imagesText, form.image]);

  const isVideoUrl = (url) => {
    const u = String(url || "").toLowerCase();
    return u.endsWith(".mp4") || u.endsWith(".webm") || u.endsWith(".ogg") || u.endsWith(".mov") || u.includes("video");
  };

  const showDebugBanner = useMemo(() => {
    if (import.meta.env.DEV) return true;
    if (typeof window === "undefined") return false;
    try {
      const qp = new URLSearchParams(window.location.search);
      return qp.get("debug") === "1" || window.localStorage.getItem("moveazy_debug") === "1";
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    let alive = true;
    async function load() {
      if (isFirebaseConfigured) {
        setLoadErrors([]);
        const labels = ["listings", "users", "sellerRequests", "visits", "interests", "assignments", "notifications", "siteSettings", "agents"];
        const settled = await Promise.allSettled([
          getAdminListingsData(),
          getAllUsersData(),
          getSellerRequestsData(),
          getVisitsData(),
          getInterestsData(),
          getAssignmentsData(),
          getAdminNotificationsData(),
          fetchSitePublicSettings(),
          fetchDirectoryAgents(),
        ]);
        if (!alive) return;
        const errs = [];
        settled.forEach((r, i) => {
          if (r.status === "rejected") errs.push(`${labels[i]}: ${String(r.reason?.message || r.reason)}`);
        });
        setLoadErrors(errs);
        setListingsState(settled[0].status === "fulfilled" ? settled[0].value : []);
        setUsersState(settled[1].status === "fulfilled" ? settled[1].value : []);
        setSellerReqsState(settled[2].status === "fulfilled" ? settled[2].value : []);
        setVisitRequests(settled[3].status === "fulfilled" ? settled[3].value : []);
        setInterestsState(settled[4].status === "fulfilled" ? settled[4].value : []);
        setAssignmentsState(settled[5].status === "fulfilled" ? settled[5].value : []);
        setAdminNotifs(settled[6].status === "fulfilled" ? settled[6].value : []);
        const sitePub = settled[7].status === "fulfilled" ? settled[7].value : { ...DEFAULT_SITE_PUBLIC, contacts: [...DEFAULT_SITE_PUBLIC.contacts] };
        setSitePublicDraft({
          ...sitePub,
          contacts: (sitePub.contacts || []).map((c) => ({ ...c })),
        });
        const agentRows = settled[8].status === "fulfilled" ? settled[8].value : getDefaultDirectoryAgents();
        // Fetch brokers with engagement counts
        let rawBrokers = [];
        try {
          const bSnap = await getDocs(query(collection(db, "brokers"), orderBy("engagementCount", "desc")));
          rawBrokers = bSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
          if (alive) setBrokersData(rawBrokers);
        } catch {
          // brokers fetch failed — engagement ranking will be empty
        }
        // Fetch contact form queries
        try {
          const cqSnap = await getDocs(query(collection(db, "contactQueries"), orderBy("createdAt", "desc")));
          if (alive) setContactQueries(cqSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        } catch {
          // contactQueries may not exist yet
        }
        if (!alive) return;
        // Merge any brokers not already in agentRows so they appear in the admin table
        const agentRowIds = new Set(agentRows.map((a) => a.id));
        const extraBrokerRows = rawBrokers
          .filter((b) => b.name && !agentRowIds.has(b.id))
          .map((b, i) => ({
            id: b.id,
            tab: "brokers",
            name: String(b.name || "").trim(),
            initials: "",
            team: false,
            brokerage: "",
            priceRangeLabel: "",
            recentActivity: "",
            localExpertise: String(b.area || "").trim(),
            specialties: "Rentals",
            languages: "English, Hindi, Kannada",
            areas: String(b.area || "").trim(),
            rentFocus: true,
            buyFocus: false,
            budgetTier: 2,
            rating: b.rating ?? null,
            sortOrder: agentRows.length + i,
            phone: String(b.phone || "").trim(),
          }));
        const mergedRows = [...agentRows, ...extraBrokerRows];
        setAgentsDraft(
          mergedRows.map((a) => ({
            ...a,
            specialties: Array.isArray(a.specialties) ? a.specialties.join(", ") : (a.specialties || ""),
            languages: Array.isArray(a.languages) ? a.languages.join(", ") : (a.languages || ""),
            areas: Array.isArray(a.areas) ? a.areas.join(", ") : (a.areas || ""),
            phone: a.phone || "",
          })),
        );
      } else {
        setLoadErrors([]);
        setListingsState(getListings());
        setUsersState(getAllUsers());
        setSellerReqsState(getSellerRequests().filter((r) => r.status === "pending"));
        setVisitRequests([]);
        setInterestsState(getInterestsGlobal());
        setAssignmentsState(getAssignments());
        setAdminNotifs(getNotificationsLocal().filter((n) => n.audience === "admin"));
      }
    }
    load().catch((e) => {
      if (alive) setLoadErrors([String(e?.message || e)]);
    });
    return () => { alive = false; };
  }, [refreshTick]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 900);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!cloudImportJobId || !isFirebaseConfigured) return;
    const unsub = onSnapshot(doc(db, "importJobs", cloudImportJobId), (snap) => {
      if (snap.exists()) {
        setCloudImportJobStatus(snap.data());
      }
    });
    return () => unsub();
  }, [cloudImportJobId]);

  const handleCloudImport = async (dryRun = false) => {
    if (!importBrokerName.trim() || !cloudImportProfileUrl.trim()) {
      alert("Enter broker name and profile URL");
      return;
    }
    setCloudImportJobId(null);
    setCloudImportJobStatus({ status: "initializing", message: "Calling Cloud Function..." });
    try {
      const trigger = httpsCallable(functions, "triggerBrokerImport");
      const res = await trigger({ 
        brokerName: importBrokerName.trim(), 
        profileUrl: cloudImportProfileUrl.trim(),
        dryRun
      });
      if (res.data.ok && res.data.jobId) {
        setCloudImportJobId(res.data.jobId);
        setRefreshTick((v) => v + 1);
      }
    } catch (e) {
      setCloudImportJobStatus({ status: "failed", error: e.message || String(e) });
    }
  };

  const listings = listingsState;
  const users = usersState;

  /** Normalize role for filters / badges (Firestore profile.role must not override userRoles). */
  function canonicalRole(u) {
    const r = String(u?.role ?? "")
      .toLowerCase()
      .trim();
    if (r === "admin") return "admin";
    if (r === "seller") return "seller";
    if (r === "consultant") return "consultant";
    if (r === "sub_admin") return "sub_admin";
    return "customer";
  }

  const sellerReqs = sellerReqsState;
  const pendingSellerBadgeApps = useMemo(() => {
    if (typeof getPendingSellerBadgeApplications === 'function') {
      return getPendingSellerBadgeApplications();
    }
    return [];
  }, [getPendingSellerBadgeApplications]);

  const addContactRow = () => {
    setSitePublicDraft((p) => ({
      ...p,
      contacts: [
        ...p.contacts,
        {
          name: "",
          title: "",
          phone: "",
          phoneRaw: "",
          avatar: "",
          gradient: CONTACT_GRADIENTS[p.contacts.length % CONTACT_GRADIENTS.length],
        },
      ].slice(0, 12),
    }));
  };

  const removeContactRow = (idx) => {
    setSitePublicDraft((p) => ({
      ...p,
      contacts: p.contacts.filter((_, i) => i !== idx),
    }));
  };

  const updateContactField = (idx, field, value) => {
    setSitePublicDraft((p) => ({
      ...p,
      contacts: p.contacts.map((row, i) => (i === idx ? { ...row, [field]: value } : row)),
    }));
  };

  const moveAgentRow = (idx, dir) => {
    setAgentsDraft((rows) => {
      const next = [...rows];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return rows;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  };

  const handleSaveAgents = async () => {
    if (!isFirebaseConfigured) {
      alert("Firebase is not configured — agents save is disabled.");
      return;
    }
    setAgentsSaveStatus("Saving…");
    try {
      const saved = await saveDirectoryAgents(agentsDraft);
      // Sync phone to brokers/{id} so WA connect always reads the latest number
      await Promise.all(
        agentsDraft
          .filter((a) => a.tab === "brokers" && a.id && !a.id.startsWith("agent-"))
          .map((a) =>
            setDoc(doc(db, "brokers", a.id), { phone: a.phone || "" }, { merge: true }),
          ),
      );
      setAgentsSaveStatus("Saved. /agents will show this order on refresh.");
      setTimeout(() => setAgentsSaveStatus(""), 5000);
    } catch (e) {
      setAgentsSaveStatus(String(e?.message || e || "Save failed"));
    }
  };

  const handleSaveSitePublic = async () => {
    if (!isFirebaseConfigured) {
      alert("Firebase is not configured — site settings save is disabled.");
      return;
    }
    setSitePublicStatus("Saving…");
    try {
      await saveSitePublicSettings(sitePublicDraft);
      setSitePublicStatus("Saved. Contact page and Terms/Privacy will pick this up on refresh.");
      setTimeout(() => setSitePublicStatus(""), 5000);
    } catch (e) {
      setSitePublicStatus(String(e?.message || e || "Save failed"));
    }
  };

  const handleSubmitListing = async (e) => {
    e.preventDefault();
    setAdminListingMsg("");
    setAdminListingWarning("");
    const rawSeller = String(form.sellerEmail || "").trim().toLowerCase();
    const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawSeller);
    const fallbackAdmin = String(user?.email || "").trim().toLowerCase();
    const email = looksLikeEmail ? rawSeller : fallbackAdmin;
    let monthlyRent = Number(form.monthlyRent);
    if (!Number.isFinite(monthlyRent) || monthlyRent < 0) monthlyRent = 0;
    const digitsFromPrice = parseInt(String(form.price || "").replace(/\D/g, ""), 10) || 0;
    if (monthlyRent <= 0 && digitsFromPrice > 0) monthlyRent = digitsFromPrice;

    const listingId = editingId || String(Date.now());
    try {
      const existing = editingId ? listingsState.find((l) => String(l?.id) === String(listingId)) : null;
      let uploadedImages = [];
      if (photoFiles.length) {
        try {
          uploadedImages = await uploadListingFiles(photoFiles, listingId);
        } catch (uploadErr) {
          reportClientError("admin_listing_media_upload", uploadErr);
          const uploadCode = String(uploadErr?.code || "");
          const uploadText = String(uploadErr?.message || "");
          if (
            uploadCode.includes("storage/") ||
            /storage|bucket|object/i.test(uploadText)
          ) {
            setAdminListingWarning(
              "Firebase Storage issue detected (media not uploaded). Listing was saved without media. Check Firebase Console -> Storage -> Get Started."
            );
          } else {
            setAdminListingWarning("Listing saved without uploaded media. You can re-edit and upload media again.");
          }
        }
      }
      const manualImages = String(form.imagesText || form.image || "")
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean);
      let allImages = [...uploadedImages, ...manualImages];
      // Important: when editing, do NOT wipe existing images if admin didn't re-upload / paste URLs.
      if (editingId && allImages.length === 0) {
        const prev = Array.isArray(existing?.images) ? existing.images.filter(Boolean) : [];
        allImages = prev;
      }
      const { contact: _legacyPublicPhone, ...formRest } = form;
      const payload = {
        ...formRest,
        id: listingId,
        title: String(form.title || "").trim() || "Untitled listing",
        price: String(form.price || "").trim() || "Rent on request",
        address: String(form.address || "").trim(),
        seller: String(form.seller || "").trim() || "Seller",
        sellerEmail: email,
        monthlyRent,
        lat: Number(pinPosition?.[0] ?? form.lat),
        lng: Number(pinPosition?.[1] ?? form.lng),
        preferredTenants: toList(form.preferredTenants, ["Family"]),
        parking: toList(form.parking, ["2 Wheeler"]),
        images: allImages,
        image: form.image || allImages[0] || existing?.image || "",
        amenities: String(form.amenitiesText || "").split(",").map((x) => x.trim()).filter(Boolean),
        furnishings: String(form.furnishingsText || "").split(",").map((x) => x.trim()).filter(Boolean),
        updatedAt: new Date().toISOString(),
      };
      const saved = isFirebaseConfigured ? await upsertListingData(payload, user) : upsertListing(payload);
      if (isFirebaseConfigured) {
        await upsertListingPrivateData(
          saved.id,
          {
            agentPhone: String(form.agentPhonePrivate || _legacyPublicPhone || "").trim(),
            ownerPhone: String(form.ownerPhonePrivate || "").trim(),
          },
          user
        );
      }
      setListingsState((prev) => {
        const withoutOld = prev.filter((l) => String(l.id) !== String(saved.id));
        return [saved, ...withoutOld];
      });
      setEditingId(null);
      setForm(DEFAULT_FORM);
      setPhotoFiles([]);
      setPinPosition([DEFAULT_FORM.lat, DEFAULT_FORM.lng]);
      setRefreshTick((v) => v + 1);
      setAdminListingMsgKind("ok");
      setAdminListingMsg("Listing saved successfully.");
      setTimeout(() => setAdminListingMsg(""), 6000);
    } catch (err) {
      reportClientError("admin_listing_save", err);
      setAdminListingMsgKind("err");
      const code = err?.code;
      let msg = err?.message || String(err) || "Save failed.";
      if (code === "permission-denied") {
        msg =
          "Permission denied: your account needs role \"admin\" in Firestore userRoles, or Storage rules blocked uploads. Check Firebase Console.";
      } else if (code === "storage/unauthorized" || code === "storage/canceled") {
        msg = `Media upload failed (${code}). Check Storage rules and sign-in.`;
      }
      if (code) msg = `${msg} [${code}]`;
      setAdminListingMsg(msg);
    }
  };

  const handleEdit = async (listing) => {
    setEditingId(listing._seedFromStatic ? null : listing.id);
    const nextForm = listingToForm(listing);
    if (isFirebaseConfigured && listing.id && !listing._seedFromStatic) {
      try {
        const priv = await getListingPrivateData(String(listing.id));
        if (priv) {
          nextForm.agentPhonePrivate = String(priv.agentPhone || "").trim();
          nextForm.ownerPhonePrivate = String(priv.ownerPhone || "").trim();
        }
      } catch {
        /* ignore */
      }
    }
    setForm(nextForm);
    setPinPosition([nextForm.lat, nextForm.lng]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    const row = listings.find((l) => String(l.id) === String(id));
    if (row?._seedFromStatic) {
      alert(
        "This row is bundled demo data (not stored in Firestore). Use Edit → Save listing to create a real cloud listing, or change samples in src/data/listingsData.js."
      );
      return;
    }
    if (isFirebaseConfigured) await removeListingData(id);
    else removeListing(id);
    setRefreshTick((v) => v + 1);
  };

  const handleApprove = async (email) => {
    await approveSeller(email);
    setRefreshTick((v) => v + 1);
  };

  const handleReject = (email) => {
    rejectSeller(email);
    setRefreshTick((v) => v + 1);
  };

  const handleApproveSellerBadge = async (email) => {
    await approveSellerBadge(email);
    setRefreshTick((v) => v + 1);
  };

  const handleRejectSellerBadge = async (email) => {
    await rejectSellerBadge(email);
    setRefreshTick((v) => v + 1);
  };

  const handleRemoveUser = async (email) => {
    if (isFirebaseConfigured) await removeUserProfileData(email);
    else removeUserLocally(email);
    setRefreshTick((v) => v + 1);
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUserEmail.trim()) return;
    if (isFirebaseConfigured) await addUserProfileData(newUserEmail, newUserName, newUserRole, newUserPhone);
    else addUserLocally(newUserEmail, newUserName, newUserRole, newUserPhone);
    setNewUserEmail("");
    setNewUserName("");
    setNewUserPhone("");
    setRefreshTick((v) => v + 1);
  };

  const handleEditUser = (u) => {
    setEditingUserEmail(u.email);
    setEditUserForm({ name: u.name || "", role: canonicalRole(u), phone: u.phone || "" });
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (isFirebaseConfigured) await updateUserProfileData(editingUserEmail, editUserForm);
    else updateUserLocally(editingUserEmail, editUserForm);
    setEditingUserEmail(null);
    setRefreshTick((v) => v + 1);
  };

  const customersList = useMemo(
    () => users.filter((u) => canonicalRole(u) === "customer" && !String(u.uid || "").startsWith("reserved")),
    [users]
  );
  const sellersList = useMemo(() => users.filter((u) => canonicalRole(u) === "seller"), [users]);
  const adminsList = useMemo(() => users.filter((u) => canonicalRole(u) === "admin"), [users]);
  const consultantsList = useMemo(() => users.filter((u) => canonicalRole(u) === "consultant"), [users]);
  const subAdminsList = useMemo(() => users.filter((u) => canonicalRole(u) === "sub_admin"), [users]);
  const displayUsers = useMemo(() => {
    if (userListTab === "customer") return customersList;
    if (userListTab === "seller") return sellersList;
    if (userListTab === "admin") return adminsList;
    if (userListTab === "consultant") return consultantsList;
    if (userListTab === "sub_admin") return subAdminsList;
    return users;
  }, [users, userListTab, customersList, sellersList, adminsList, consultantsList, subAdminsList]);

  const assignSelectedListing = useMemo(
    () => listings.find((l) => String(l.id) === String(assignListingId)),
    [listings, assignListingId]
  );

  useEffect(() => {
    let cancelled = false;
    if (!assignListingId || !isFirebaseConfigured) {
      setAssignPhonePreview("");
      return undefined;
    }
    (async () => {
      try {
        const priv = await getListingPrivateData(String(assignListingId));
        const line = String(priv?.agentPhone || priv?.ownerPhone || "").trim();
        if (!cancelled) setAssignPhonePreview(line || "—");
      } catch {
        if (!cancelled) setAssignPhonePreview("—");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assignListingId, isFirebaseConfigured]);

  const fillAssignCustomerFromDirectory = () => {
    const em = assignCustomerEmail.trim().toLowerCase();
    if (!em) return;
    const row = users.find((u) => String(u.email || "").toLowerCase().trim() === em);
    if (!row) {
      alert("No user in the directory with that exact email.");
      return;
    }
    if (String(row.name || "").trim()) setAssignCustomerName(String(row.name).trim());
    if (String(row.phone || "").trim()) setAssignCustomerPhone(String(row.phone).trim());
  };

  const handleInterestStatus = async (row, status) => {
    if (isFirebaseConfigured) await updateInterestStatusData(row.id, status);
    else updateInterestGlobal(row.id, { status });
    await notifyCustomerInterestStatusChanged(row, status);
    setRefreshTick((v) => v + 1);
  };

  const handleNotifRead = async (n) => {
    if (isFirebaseConfigured) await markNotificationReadData(n.id);
    else markNotificationLocalRead(n.id);
    setRefreshTick((v) => v + 1);
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    const listing = listings.find((l) => String(l.id) === String(assignListingId));
    if (!listing || !assignCustomerEmail.trim()) {
      alert("Pick a listing and customer email.");
      return;
    }
    const sellerEmail = (listing.sellerEmail || "").trim().toLowerCase();
    const customerName = assignCustomerName.trim();
    const customerPhone = assignCustomerPhone.trim();
    const sellerName = String(listing.seller || "").trim();
    let sellerContactPhone = "";
    if (isFirebaseConfigured) {
      try {
        const priv = await getListingPrivateData(String(listing.id));
        sellerContactPhone = String(priv?.agentPhone || priv?.ownerPhone || "").trim();
      } catch {
        sellerContactPhone = "";
      }
    } else {
      sellerContactPhone = String(listing.contact || "").trim();
    }
    const listingTitle = String(listing.title || "").trim();
    if (isFirebaseConfigured) {
      await addAssignmentData({
        listingId: assignListingId,
        customerEmail: assignCustomerEmail.trim().toLowerCase(),
        customerName,
        customerPhone,
        sellerEmail,
        sellerName,
        sellerContactPhone,
        listingTitle,
        notes: assignNotes,
        createdBy: user?.email,
      });
    } else {
      addAssignment({
        listingId: assignListingId,
        customerEmail: assignCustomerEmail.trim().toLowerCase(),
        customerName,
        customerPhone,
        sellerEmail,
        sellerName,
        sellerContactPhone,
        listingTitle,
        notes: assignNotes,
        createdBy: user?.email,
      });
    }
    if (sellerEmail) {
      const custLine = [assignCustomerEmail.trim().toLowerCase(), customerName || null, customerPhone || null].filter(Boolean).join(" · ");
      const body = `New lead assignment: ${custLine} for "${listingTitle || `Listing #${assignListingId}`}" (#${assignListingId}).${assignNotes.trim() ? ` Notes: ${assignNotes.trim()}` : ""}`;
      try {
        if (isFirebaseConfigured) {
          await addNotificationData({
            audience: "seller",
            targetEmail: sellerEmail,
            title: "New lead assignment",
            body,
            type: "assignment",
            meta: { listingId: String(assignListingId), customerEmail: assignCustomerEmail.trim().toLowerCase() },
          });
        } else {
          pushNotificationLocal({
            audience: "seller",
            targetEmail: sellerEmail,
            title: "New lead assignment",
            body,
            type: "assignment",
            meta: { listingId: String(assignListingId) },
          });
        }
      } catch {
        /* non-fatal */
      }
    }
    await notifyCustomerListingAssigned({
      customerEmail: assignCustomerEmail.trim().toLowerCase(),
      customerName,
      customerPhone,
      listingId: assignListingId,
      listingTitle: listing.title,
      notes: assignNotes,
      sellerEmail: listing.sellerEmail,
      sellerName,
      sellerContactPhone,
    });
    setAssignNotes("");
    setAssignListingId("");
    setAssignCustomerEmail("");
    setAssignCustomerName("");
    setAssignCustomerPhone("");
    alert("Assignment recorded. The seller sees this on their dashboard.");
    setRefreshTick((v) => v + 1);
  };

  useEffect(() => {
    if (!historyUser?.email) {
      setHistoryBundle(null);
      return;
    }
    let alive = true;
    (async () => {
      const email = String(historyUser.email).toLowerCase().trim();
      let acts = [];
      if (isFirebaseConfigured) {
        try {
          acts = await getActivityEventsForEmail(email);
        } catch {
          acts = [];
        }
      } else {
        acts = getUserActivityEvents(email);
      }
      const visits = visitRequests.filter((v) => String(v.customerEmail || "").toLowerCase() === email);
      const interests = interestsState.filter((i) => String(i.customerEmail || "").toLowerCase() === email);
      const bookings = getBookings().filter((b) => String(b.customerEmail || "").toLowerCase() === email);
      const assigns = assignmentsState.filter((a) => String(a.customerEmail || "").toLowerCase() === email);
      if (alive) setHistoryBundle({ acts, visits, interests, bookings, assigns });
    })();
    return () => {
      alive = false;
    };
  }, [historyUser, visitRequests, interestsState, assignmentsState, refreshTick]);

  const handleFeedImport = async () => {
    if (!feedJson.trim()) return;
    try {
      const parsed = JSON.parse(feedJson);
      const rows = normalizePartnerListings(parsed, "partner-import");
      if (isFirebaseConfigured) await Promise.all(rows.map((row) => upsertListingData(row, user)));
      else ingestPartnerListings(parsed, "partner-import");
      const result = { imported: rows.length };
      alert("Imported " + result.imported + " listings");
      setFeedJson("");
      setRefreshTick((v) => v + 1);
    } catch {
      alert("Invalid JSON feed format");
    }
  };

  const handleBrokerImport = async () => {
    if (!importBrokerName.trim()) {
      alert("Enter broker name first");
      return;
    }
    if (!feedJson.trim()) {
      alert("Paste broker listing export data first");
      return;
    }
    const rows = normalizeBrokerListings({ brokerName: importBrokerName.trim(), rawInput: feedJson });
    if (isFirebaseConfigured) await Promise.all(rows.map((row) => upsertListingData({ ...row, source: `${importSourceName || "manual-transfer"}:${importBrokerName.trim()}` }, user)));
    else ingestBrokerListings({
      brokerName: importBrokerName.trim(),
      rawInput: feedJson,
      sourceName: importSourceName || "manual-transfer",
    });
    const imported = rows.length;
    if (!imported) {
      alert("No listings imported.");
      return;
    }
    alert("Imported " + imported + " listings for broker " + importBrokerName.trim());
    setFeedJson("");
    setRefreshTick((v) => v + 1);
  };

  const btn = { padding: "9px 18px", borderRadius: "10px", border: "none", fontWeight: 700, fontSize: "13px", cursor: "pointer", transition: "opacity 0.15s" };
  const sectionCard = { background: "white", padding: isMobile ? "16px" : "28px", borderRadius: "20px", marginBottom: "20px", border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" };

  return (
    <PageShell variant="marketing" overlayOnly className="bg-zinc-50">
      <div style={{ background: "#09090b", color: "white", padding: isMobile ? "0 14px" : "0 28px", height: 56, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, borderBottom: "1px solid #27272a", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div onClick={() => navigate("/")} style={{ cursor: "pointer", display: "flex", alignItems: "center" }}>
            <MovEAZYLogo size={isMobile ? "sm" : "nav"} />
          </div>
          {!isMobile && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, padding: "5px 12px" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e" }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: "#a1a1aa", letterSpacing: "0.05em", textTransform: "uppercase" }}>Admin</span>
              <span style={{ fontSize: 12, color: "#52525b", margin: "0 4px" }}>·</span>
              <span style={{ fontSize: 12, color: "#d4d4d8" }}>{user?.email}</span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => navigate("/crm")} style={{ ...btn, background: "#18181b", border: "1px solid #3f3f46", color: "#e4e4e7", fontSize: 12, padding: "7px 14px" }}>CRM</button>
          <button onClick={() => navigate("/")} style={{ ...btn, background: "#18181b", border: "1px solid #3f3f46", color: "#e4e4e7", fontSize: 12, padding: "7px 14px" }}>Home</button>
          <button onClick={() => { logout(); navigate("/login"); }} style={{ ...btn, background: "#7f1d1d", border: "1px solid #991b1b", color: "white", fontSize: 12, padding: "7px 14px" }}>Logout</button>
        </div>
      </div>

      <div style={{ padding: isMobile ? "16px" : "28px 32px" }}>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-5 pb-5 border-b border-zinc-200">
          <div className="flex gap-1.5 flex-wrap">
            {[
              ["overview", "Overview"],
              ["site", "Site & contact"],
              ["agents", "Agents"],
              ["operations", "Leads & queue"],
              ["users", "Users"],
              ["listings", "Listings"],
              ["brokerContacts", "Broker Contacts"],
              ["contactQueries", "Contact Queries"],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={adminSection === id}
                onClick={() => setAdminSection(id)}
                className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all ${
                  adminSection === id
                    ? "bg-zinc-900 text-white shadow-sm"
                    : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => navigate("/crm")}
            className="px-4 py-2 rounded-xl text-[13px] font-bold bg-teal-700 text-white hover:bg-teal-800 transition-colors"
          >
            Staff CRM →
          </button>
        </div>
        {loadErrors.length > 0 ? (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#991b1b",
              padding: "12px 14px",
              borderRadius: 10,
              marginBottom: 16,
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            <strong>Some data failed to load.</strong> Use Refresh on Overview or check Firestore rules and composite indexes.
            <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
              {loadErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {adminSection === "overview" && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 mb-5">
              {[
                { label: "Users", value: users.length, color: "#6366f1" },
                { label: "Customers", value: customersList.length, color: "#3b82f6" },
                { label: "Sellers", value: sellersList.length, color: "#f59e0b" },
                { label: "Consultants", value: consultantsList.length, color: "#10b981" },
                { label: "Sub-admins", value: subAdminsList.length, color: "#8b5cf6" },
                { label: "Admins", value: adminsList.length, color: "#ef4444" },
                { label: "Listings", value: listings.length, color: "#0ea5e9" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: "white", borderRadius: 16, padding: "16px 18px", border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, marginBottom: 10 }} />
                  <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{value}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 6 }}>{label}</div>
                </div>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              {[
                { label: "Interests", value: interestsState.length, icon: "💬" },
                { label: "Assignments", value: assignmentsState.length, icon: "🔗" },
                { label: "Visit requests", value: visitRequests.length, icon: "📅" },
                { label: "Unread notifications", value: adminNotifs.filter((n) => !n.read).length, icon: "🔔" },
              ].map(({ label, value, icon }) => (
                <div key={label} style={{ background: "white", borderRadius: 16, padding: "16px 18px", border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{ fontSize: 22 }}>{icon}</span>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{value}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Agent engagement leaderboard */}
            {brokersData.length > 0 && (
              <div style={{ background: "white", borderRadius: 20, padding: "18px 20px", border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", marginBottom: 0 }}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Agent WhatsApp engagement</div>
                  <button type="button" onClick={() => setAdminSection("brokerContacts")} style={{ fontSize: 12, color: "#0ea5e9", fontWeight: 700, background: "none", border: "none", cursor: "pointer" }}>Full log →</button>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
                        <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700, color: "#94a3b8", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Rank</th>
                        <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700, color: "#94a3b8", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Agent</th>
                        <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700, color: "#94a3b8", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Area</th>
                        <th style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700, color: "#94a3b8", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Clicks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {brokersData.map((b, i) => {
                        const medals = ["🥇", "🥈", "🥉"];
                        const totalClicks = brokersData.reduce((s, x) => s + (Number(x.engagementCount) || 0), 0);
                        const clicks = Number(b.engagementCount) || 0;
                        const pct = totalClicks > 0 ? Math.round((clicks / totalClicks) * 100) : 0;
                        return (
                          <tr key={b.id} style={{ borderBottom: "1px solid #f8fafc" }}>
                            <td style={{ padding: "8px 8px", fontSize: 16 }}>{medals[i] || `#${i + 1}`}</td>
                            <td style={{ padding: "8px 8px", fontWeight: 700, color: "#0f172a" }}>{b.name || b.id}</td>
                            <td style={{ padding: "8px 8px", color: "#64748b" }}>{b.area || "—"}</td>
                            <td style={{ padding: "8px 8px", textAlign: "right" }}>
                              <div className="flex items-center justify-end gap-2">
                                <div style={{ width: 60, height: 5, borderRadius: 999, background: "#f1f5f9", overflow: "hidden" }}>
                                  <div style={{ height: "100%", width: `${pct}%`, background: "#22c55e", borderRadius: 999 }} />
                                </div>
                                <span style={{ fontWeight: 800, color: "#0f172a", minWidth: 20, textAlign: "right" }}>{clicks}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={{ background: "white", borderRadius: 20, padding: 24, border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              <button type="button" onClick={() => navigate("/crm")} style={{ ...btn, background: "#0f172a", color: "#fff" }}>Open Staff CRM</button>
              <button type="button" onClick={() => setRefreshTick((x) => x + 1)} style={{ ...btn, background: "#f1f5f9", color: "#334155", border: "1px solid #e2e8f0" }}>↻ Refresh data</button>
            </div>
          </>
        )}
        {adminSection === "site" && (
        <div style={{ ...sectionCard, marginBottom: 20 }}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Site & Contact</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>Contact cards on /contact · Legal lines in Terms & Privacy</div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button type="button" onClick={addContactRow} disabled={sitePublicDraft.contacts.length >= 12} style={{ ...btn, background: "#0ea5e9", color: "white" }}>+ Add card</button>
              <button type="button" onClick={() => navigate("/contact")} style={{ ...btn, background: "#f1f5f9", color: "#334155" }}>Preview</button>
            </div>
          </div>

          {/* Contact cards table */}
          <div style={{ overflowX: "auto", marginBottom: 16 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                  <th style={{ padding: "9px 10px", textAlign: "left", fontWeight: 700, color: "#475569", width: 28 }}>#</th>
                  <th style={{ padding: "9px 10px", textAlign: "left", fontWeight: 700, color: "#475569" }}>Name</th>
                  <th style={{ padding: "9px 10px", textAlign: "left", fontWeight: 700, color: "#475569" }}>Title</th>
                  <th style={{ padding: "9px 10px", textAlign: "left", fontWeight: 700, color: "#475569" }}>Phone (display)</th>
                  <th style={{ padding: "9px 10px", textAlign: "left", fontWeight: 700, color: "#475569" }}>WhatsApp digits</th>
                  <th style={{ padding: "9px 10px", textAlign: "right", fontWeight: 700, color: "#475569" }}></th>
                </tr>
              </thead>
              <tbody>
                {sitePublicDraft.contacts.map((c, idx) => (
                  <tr key={`contact-${idx}`} style={{ borderBottom: "1px solid #f1f5f9", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "8px 10px", color: "#94a3b8", fontWeight: 700 }}>{idx + 1}</td>
                    <td style={{ padding: "8px 10px" }}>
                      <input value={c.name} onChange={(e) => updateContactField(idx, "name", e.target.value)} placeholder="Name"
                        style={{ width: "100%", minWidth: 100, padding: "5px 8px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 13 }} />
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <input value={c.title} onChange={(e) => updateContactField(idx, "title", e.target.value)} placeholder="Sales Lead"
                        style={{ width: "100%", minWidth: 110, padding: "5px 8px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 13 }} />
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <input value={c.phone} onChange={(e) => updateContactField(idx, "phone", e.target.value)} placeholder="+91 …"
                        style={{ width: "100%", minWidth: 130, padding: "5px 8px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 13 }} />
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <input value={c.phoneRaw} onChange={(e) => updateContactField(idx, "phoneRaw", e.target.value.replace(/\D/g, ""))} placeholder="9170… (auto)"
                        style={{ width: "100%", minWidth: 110, padding: "5px 8px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 13 }} />
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "right" }}>
                      <button type="button" onClick={() => removeContactRow(idx)} style={{ ...btn, background: "#fef2f2", color: "#dc2626", padding: "4px 10px", fontSize: 12 }}>Remove</button>
                    </td>
                  </tr>
                ))}
                {sitePublicDraft.contacts.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: "16px 10px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No contact cards — click "+ Add card" to add one.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Legal fields compact row */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 10, marginBottom: 14, padding: "14px 16px", background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0" }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "flex", flexDirection: "column", gap: 4 }}>
              Support email (Terms)
              <input value={sitePublicDraft.supportEmail} onChange={(e) => setSitePublicDraft((p) => ({ ...p, supportEmail: e.target.value }))}
                style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, fontWeight: 400 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "flex", flexDirection: "column", gap: 4 }}>
              DPO email (Privacy)
              <input value={sitePublicDraft.privacyEmail} onChange={(e) => setSitePublicDraft((p) => ({ ...p, privacyEmail: e.target.value }))}
                style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, fontWeight: 400 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "flex", flexDirection: "column", gap: 4 }}>
              Main phone (display)
              <input value={sitePublicDraft.legalPhoneDisplay} onChange={(e) => setSitePublicDraft((p) => ({ ...p, legalPhoneDisplay: e.target.value }))}
                style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, fontWeight: 400 }} />
            </label>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
            <button type="button" onClick={handleSaveSitePublic} style={{ ...btn, background: "#0284c7", color: "white", fontWeight: 800 }}>Save to Firestore</button>
            {sitePublicStatus ? <span style={{ fontSize: 13, color: sitePublicStatus.startsWith("Saved") ? "#15803d" : "#b91c1c" }}>{sitePublicStatus}</span> : null}
          </div>
        </div>
        )}

        {adminSection === "agents" && (
        <div style={{ ...sectionCard, marginBottom: 20 }}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Agents directory</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>siteSettings/directoryAgents · phone saved to brokers collection</div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button type="button" onClick={() => setAgentsDraft((rows) => [...rows, { id: `agent-${Date.now()}`, tab: "brokers", name: "", initials: "", team: false, brokerage: "", priceRangeLabel: "", recentActivity: "", localExpertise: "", specialties: "Rentals", languages: "English, Hindi", areas: "", phone: "", rentFocus: true, buyFocus: false, budgetTier: 2, rating: null }])}
                style={{ ...btn, background: "#d97706", color: "white" }}>+ Add agent</button>
              <button type="button" onClick={() => navigate("/agents")} style={{ ...btn, background: "#f1f5f9", color: "#334155" }}>Preview</button>
              <button type="button" onClick={handleSaveAgents} style={{ ...btn, background: "#0284c7", color: "white", fontWeight: 800 }}>Save agents</button>
              {agentsSaveStatus ? <span style={{ fontSize: 13, color: agentsSaveStatus.startsWith("Saved") ? "#15803d" : "#b91c1c" }}>{agentsSaveStatus}</span> : null}
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                  <th style={{ padding: "9px 10px", textAlign: "left", fontWeight: 700, color: "#475569", width: 60 }}>Order</th>
                  <th style={{ padding: "9px 10px", textAlign: "left", fontWeight: 700, color: "#475569" }}>Name</th>
                  <th style={{ padding: "9px 10px", textAlign: "left", fontWeight: 700, color: "#475569" }}>Location</th>
                  <th style={{ padding: "9px 10px", textAlign: "left", fontWeight: 700, color: "#475569" }}>Specialties</th>
                  <th style={{ padding: "9px 10px", textAlign: "left", fontWeight: 700, color: "#475569" }}>Rating</th>
                  <th style={{ padding: "9px 10px", textAlign: "left", fontWeight: 700, color: "#475569" }}>Phone (WA connect)</th>
                  <th style={{ padding: "9px 10px", textAlign: "right", fontWeight: 700, color: "#475569" }}></th>
                </tr>
              </thead>
              <tbody>
                {agentsDraft.map((a, idx) => (
                  <tr key={a.id || `agent-${idx}`} style={{ borderBottom: "1px solid #f1f5f9", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button type="button" disabled={idx === 0} onClick={() => moveAgentRow(idx, -1)}
                          style={{ ...btn, fontSize: 11, padding: "3px 7px", opacity: idx === 0 ? 0.35 : 1 }}>↑</button>
                        <button type="button" disabled={idx >= agentsDraft.length - 1} onClick={() => moveAgentRow(idx, 1)}
                          style={{ ...btn, fontSize: 11, padding: "3px 7px", opacity: idx >= agentsDraft.length - 1 ? 0.35 : 1 }}>↓</button>
                      </div>
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <input value={a.name} onChange={(e) => setAgentsDraft((rows) => rows.map((r, i) => i === idx ? { ...r, name: e.target.value } : r))} placeholder="Name"
                        style={{ width: "100%", minWidth: 110, padding: "5px 8px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 13 }} />
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <input value={a.localExpertise} onChange={(e) => setAgentsDraft((rows) => rows.map((r, i) => i === idx ? { ...r, localExpertise: e.target.value } : r))} placeholder="Area"
                        style={{ width: "100%", minWidth: 100, padding: "5px 8px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 13 }} />
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <input value={a.specialties} onChange={(e) => setAgentsDraft((rows) => rows.map((r, i) => i === idx ? { ...r, specialties: e.target.value } : r))} placeholder="Rentals, Sales"
                        style={{ width: "100%", minWidth: 110, padding: "5px 8px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 13 }} />
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <input value={a.rating ?? ""} onChange={(e) => setAgentsDraft((rows) => rows.map((r, i) => i === idx ? { ...r, rating: e.target.value === "" ? null : Number(e.target.value) } : r))} placeholder="e.g. 4.5" type="number" min="0" max="5" step="0.1"
                        style={{ width: 70, padding: "5px 8px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 13 }} />
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <input value={a.phone || ""} onChange={(e) => setAgentsDraft((rows) => rows.map((r, i) => i === idx ? { ...r, phone: e.target.value } : r))} placeholder="+91 …"
                        style={{ width: "100%", minWidth: 120, padding: "5px 8px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 13 }} />
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "right" }}>
                      <button type="button" onClick={() => setAgentsDraft((rows) => rows.filter((_, i) => i !== idx))}
                        style={{ ...btn, background: "#fef2f2", color: "#dc2626", padding: "4px 10px", fontSize: 12 }}>Remove</button>
                    </td>
                  </tr>
                ))}
                {agentsDraft.length === 0 && (
                  <tr><td colSpan={8} style={{ padding: "16px 10px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No agents — click "+ Add agent" to add one.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {adminSection === "operations" && (
        <>
        {/* Queue summary chips */}
        <div style={{ ...sectionCard, marginBottom: 14, padding: "14px 18px" }}>
          <div className="flex flex-wrap gap-3">
            {[
              { label: "Interests", value: interestsState.length },
              { label: "Assignments", value: assignmentsState.length },
              { label: "Visits", value: visitRequests.length },
              { label: "Alerts", value: adminNotifs.length },
              { label: "Seller reqs", value: sellerReqs.length },
              { label: "Badge reviews", value: pendingSellerBadgeApps.length },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "7px 14px", fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                {value} <span style={{ fontWeight: 500, color: "#64748b" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Badge approvals table */}
        {pendingSellerBadgeApps.length > 0 && (
          <div style={{ ...sectionCard, marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#0f766e", marginBottom: 10 }}>Pending verified seller badge ({pendingSellerBadgeApps.length})</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                    <th style={{ padding: "9px 12px", textAlign: "left", fontWeight: 700, color: "#475569" }}>Name</th>
                    <th style={{ padding: "9px 12px", textAlign: "left", fontWeight: 700, color: "#475569" }}>Email</th>
                    <th style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700, color: "#475569" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingSellerBadgeApps.map((p, i) => (
                    <tr key={p.email} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: "9px 12px", fontWeight: 600, color: "#0f172a" }}>{p.name}</td>
                      <td style={{ padding: "9px 12px", color: "#475569" }}>{p.email}</td>
                      <td style={{ padding: "9px 12px", textAlign: "right", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <button type="button" onClick={() => handleApproveSellerBadge(p.email)} style={{ ...btn, background: "#16a34a", color: "white", fontSize: 12, padding: "5px 12px" }}>Approve</button>
                          <button type="button" onClick={() => handleRejectSellerBadge(p.email)} style={{ ...btn, background: "#fef2f2", color: "#dc2626", fontSize: 12, padding: "5px 12px" }}>Reject</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Seller requests table */}
        {sellerReqs.length > 0 && (
          <div style={{ ...sectionCard, marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#b91c1c", marginBottom: 10 }}>Pending seller requests ({sellerReqs.length})</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                    <th style={{ padding: "9px 12px", textAlign: "left", fontWeight: 700, color: "#475569" }}>Name</th>
                    <th style={{ padding: "9px 12px", textAlign: "left", fontWeight: 700, color: "#475569" }}>Email</th>
                    <th style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700, color: "#475569" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sellerReqs.map((r, i) => (
                    <tr key={r.email} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: "9px 12px", fontWeight: 600, color: "#0f172a" }}>{r.name}</td>
                      <td style={{ padding: "9px 12px", color: "#475569" }}>{r.email}</td>
                      <td style={{ padding: "9px 12px", textAlign: "right", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <button type="button" onClick={() => handleApprove(r.email)} style={{ ...btn, background: "#16a34a", color: "white", fontSize: 12, padding: "5px 12px" }}>Approve</button>
                          <button type="button" onClick={() => handleReject(r.email)} style={{ ...btn, background: "#fef2f2", color: "#dc2626", fontSize: 12, padding: "5px 12px" }}>Reject</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Visit requests table */}
        {visitRequests.length > 0 && (
          <div style={{ ...sectionCard, marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#b45309", marginBottom: 10 }}>Visit requests ({visitRequests.length})</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                    <th style={{ padding: "9px 12px", textAlign: "left", fontWeight: 700, color: "#475569" }}>Visit time</th>
                    <th style={{ padding: "9px 12px", textAlign: "left", fontWeight: 700, color: "#475569" }}>Customer</th>
                    <th style={{ padding: "9px 12px", textAlign: "left", fontWeight: 700, color: "#475569" }}>Phone</th>
                    <th style={{ padding: "9px 12px", textAlign: "left", fontWeight: 700, color: "#475569" }}>Seller</th>
                    <th style={{ padding: "9px 12px", textAlign: "left", fontWeight: 700, color: "#475569" }}>Listing</th>
                  </tr>
                </thead>
                <tbody>
                  {visitRequests.map((v, i) => (
                    <tr key={v.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: "9px 12px", whiteSpace: "nowrap", color: "#0f172a", fontWeight: 600 }}>{v.visitTime || "—"}</td>
                      <td style={{ padding: "9px 12px", color: "#475569" }}>{v.customerEmail}</td>
                      <td style={{ padding: "9px 12px", color: "#64748b", whiteSpace: "nowrap" }}>{v.customerPhone || "—"}</td>
                      <td style={{ padding: "9px 12px", color: "#475569" }}>{v.sellerEmail}</td>
                      <td style={{ padding: "9px 12px", color: "#64748b" }}>#{v.listingId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Admin notifications compact list */}
        {adminNotifs.length > 0 && (
          <div style={{ ...sectionCard, marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#9f1239", marginBottom: 10 }}>
              Admin notifications ({adminNotifs.filter((n) => !n.read).length} unread / {adminNotifs.length} total)
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                    <th style={{ padding: "9px 12px", textAlign: "left", fontWeight: 700, color: "#475569", width: 60 }}>Status</th>
                    <th style={{ padding: "9px 12px", textAlign: "left", fontWeight: 700, color: "#475569" }}>Title</th>
                    <th style={{ padding: "9px 12px", textAlign: "left", fontWeight: 700, color: "#475569" }}>Body</th>
                    <th style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700, color: "#475569" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {adminNotifs.map((n, i) => (
                    <tr key={n.id} style={{ borderBottom: "1px solid #f1f5f9", background: n.read ? (i % 2 === 0 ? "#fff" : "#fafafa") : "#fff1f2", opacity: n.read ? 0.8 : 1 }}>
                      <td style={{ padding: "9px 12px" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: n.read ? "#64748b" : "#e11d48", background: n.read ? "#f1f5f9" : "#ffe4e6", padding: "2px 7px", borderRadius: 6 }}>
                          {n.read ? "read" : "new"}
                        </span>
                      </td>
                      <td style={{ padding: "9px 12px", fontWeight: 700, color: "#0f172a" }}>{n.title}</td>
                      <td style={{ padding: "9px 12px", color: "#475569", maxWidth: 300 }}>{n.body}</td>
                      <td style={{ padding: "9px 12px", textAlign: "right" }}>
                        {!n.read && (
                          <button type="button" onClick={() => handleNotifRead(n)} style={{ ...btn, background: "#0f172a", color: "white", fontSize: 11, padding: "4px 10px" }}>Mark read</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={sectionCard}>
          <div style={{ fontSize: "18px", fontWeight: 800, marginBottom: "10px", color: "#0f172a" }}>Listing interests and applications</div>
          <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "12px", lineHeight: 1.5 }}>
            Every "Submit interest" from the map is stored here. Update status as your team progresses the lead.
          </p>
          {interestsState.length === 0 ? (
            <div style={{ fontSize: "14px", color: "#64748b" }}>No interests yet.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>
                    <th style={{ padding: "8px 6px" }}>When</th>
                    <th style={{ padding: "8px 6px" }}>Customer</th>
                    <th style={{ padding: "8px 6px" }}>Listing</th>
                    <th style={{ padding: "8px 6px" }}>Preference</th>
                    <th style={{ padding: "8px 6px" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {interestsState.map((row) => (
                    <tr key={row.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "8px 6px", color: "#64748b", whiteSpace: "nowrap" }}>
                        {row.createdAt?.toDate ? row.createdAt.toDate().toLocaleString() : row.submittedAt || row.createdAt || "—"}
                      </td>
                      <td style={{ padding: "8px 6px" }}>
                        <div style={{ fontWeight: 700 }}>{row.customerName}</div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>{row.customerEmail}</div>
                      </td>
                      <td style={{ padding: "8px 6px", maxWidth: 220 }}>
                        <div style={{ fontWeight: 600 }}>{row.listingTitle}</div>
                        <div style={{ fontSize: "11px", color: "#94a3b8" }}>#{row.listingId}</div>
                      </td>
                      <td style={{ padding: "8px 6px", fontSize: "12px" }}>
                        {row.tenancyPreference} · {row.adultsSharing} people
                      </td>
                      <td style={{ padding: "8px 6px" }}>
                        <select
                          value={row.status || "new"}
                          onChange={(e) => handleInterestStatus(row, e.target.value)}
                          style={{ padding: "6px 8px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12px" }}
                        >
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="visit_scheduled">Visit scheduled</option>
                          <option value="closed_won">Closed — won</option>
                          <option value="closed_lost">Closed — lost</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={sectionCard}>
          <div style={{ fontSize: "18px", fontWeight: 800, marginBottom: "8px", color: "#0f172a" }}>Assign apartment to customer</div>
          <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "12px", lineHeight: 1.5 }}>
            Saves a full lead handoff: customer contact, listing context, and seller/broker details. The seller sees this on their dashboard; the customer gets an in-app message (and email when configured).
          </p>
          {assignSelectedListing ? (
            <div
              style={{
                fontSize: "13px",
                color: "#334155",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "12px 14px",
                marginBottom: "14px",
                lineHeight: 1.55,
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: "6px", color: "#0f172a" }}>Selected listing (read-only)</div>
              <div><strong>Title:</strong> {assignSelectedListing.title || "—"}</div>
              <div><strong>Seller / broker:</strong> {assignSelectedListing.seller || "—"}</div>
              <div><strong>Seller email:</strong> {assignSelectedListing.sellerEmail || "—"}</div>
              <div><strong>Broker / owner phone (private):</strong> {assignPhonePreview || "—"}</div>
            </div>
          ) : (
            <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "12px" }}>Pick a listing below to preview seller details from the listing record.</div>
          )}
          <form onSubmit={handleAssignSubmit} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: "10px", alignItems: "end" }}>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", display: "block", marginBottom: "4px" }}>Customer email</label>
              <input
                value={assignCustomerEmail}
                onChange={(e) => setAssignCustomerEmail(e.target.value)}
                placeholder="customer@email.com"
                required
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "8px" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", display: "block", marginBottom: "4px" }}>Customer name (optional)</label>
              <input
                value={assignCustomerName}
                onChange={(e) => setAssignCustomerName(e.target.value)}
                placeholder="As you want it shown to seller"
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "8px" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", display: "block", marginBottom: "4px" }}>Customer phone (recommended)</label>
              <input
                type="tel"
                value={assignCustomerPhone}
                onChange={(e) => setAssignCustomerPhone(e.target.value)}
                placeholder="+91 98765 43210"
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "8px" }}
              />
            </div>
            <div style={{ gridColumn: isMobile ? "auto" : "1 / -1" }}>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", display: "block", marginBottom: "4px" }}>Listing</label>
              <select
                value={assignListingId}
                onChange={(e) => setAssignListingId(e.target.value)}
                required
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "8px" }}
              >
                <option value="">Select listing…</option>
                {listings.map((l) => (
                  <option key={l.id} value={String(l.id)}>
                    #{l.id} — {l.title?.slice(0, 60)}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ gridColumn: isMobile ? "auto" : "1 / -1", display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
              <button type="button" onClick={fillAssignCustomerFromDirectory} style={{ ...btn, background: "#e2e8f0", color: "#334155", fontSize: "12px" }}>
                Fill name &amp; phone from Users directory
              </button>
              <span style={{ fontSize: "11px", color: "#94a3b8" }}>Uses exact email match in your user list.</span>
            </div>
            <div style={{ gridColumn: isMobile ? "auto" : "1 / -1" }}>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", display: "block", marginBottom: "4px" }}>Notes (optional)</label>
              <input value={assignNotes} onChange={(e) => setAssignNotes(e.target.value)} placeholder="Visit window, budget, internal handoff…" style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "8px" }} />
            </div>
            <button type="submit" style={{ ...btn, background: "#b91c1c", color: "white", gridColumn: isMobile ? "auto" : "1 / -1" }}>
              Save assignment
            </button>
          </form>
          {assignmentsState.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14, color: "#0f172a" }}>Recent assignments ({assignmentsState.length})</div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                      <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "#475569" }}>Listing</th>
                      <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "#475569" }}>Customer</th>
                      <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "#475569" }}>Phone</th>
                      <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "#475569" }}>Seller</th>
                      <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "#475569" }}>Listing phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignmentsState.slice(0, 15).map((a, i) => (
                      <tr key={a.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                        <td style={{ padding: "8px 10px", fontWeight: 600, color: "#0f172a", maxWidth: 200 }}>
                          {a.listingTitle ? `"${a.listingTitle}"` : `Listing #${a.listingId}`}
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          {a.customerName && <div style={{ fontWeight: 600, color: "#0f172a" }}>{a.customerName}</div>}
                          <div style={{ color: "#475569" }}>{a.customerEmail}</div>
                        </td>
                        <td style={{ padding: "8px 10px", color: "#64748b", whiteSpace: "nowrap" }}>{a.customerPhone || "—"}</td>
                        <td style={{ padding: "8px 10px", color: "#475569" }}>{a.sellerName || a.sellerEmail || "—"}</td>
                        <td style={{ padding: "8px 10px", color: "#64748b", whiteSpace: "nowrap" }}>{a.sellerContactPhone || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        </>
        )}

        {adminSection === "users" && (
        <>
        <div style={sectionCard}>
          {/* Header + filter tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Users</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{displayUsers.length} shown</div>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {[
                ["all", "All", users.length],
                ["admin", "Admins", adminsList.length],
                ["consultant", "Consultants", consultantsList.length],
                ["sub_admin", "Sub-admins", subAdminsList.length],
                ["customer", "Customers", customersList.length],
                ["seller", "Sellers", sellersList.length],
              ].map(([key, label, count]) => (
                <button key={key} type="button" onClick={() => setUserListTab(key)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${userListTab === key ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}>
                  {label} <span className="opacity-60">{count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Add user form */}
          <form onSubmit={handleAddUser} className="flex flex-wrap gap-2 mb-4 p-3 rounded-xl bg-zinc-50 border border-zinc-200">
            <input placeholder="Full name" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} required
              className="flex-1 min-w-[140px] px-3 py-2 rounded-lg border border-zinc-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/20" />
            <input type="email" placeholder="Email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} required
              className="flex-1 min-w-[180px] px-3 py-2 rounded-lg border border-zinc-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/20" />
            <input type="tel" placeholder="Phone (optional)" value={newUserPhone} onChange={(e) => setNewUserPhone(e.target.value)}
              className="flex-1 min-w-[140px] px-3 py-2 rounded-lg border border-zinc-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/20" />
            <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)}
              className="px-3 py-2 rounded-lg border border-zinc-200 text-sm bg-white focus:outline-none">
              <option value="customer">Customer</option>
              <option value="seller">Seller</option>
              <option value="consultant">Consultant</option>
              <option value="sub_admin">Sub-admin</option>
              <option value="admin">Admin</option>
            </select>
            <button type="submit" style={{ ...btn, background: "#16a34a", color: "white", padding: "9px 18px" }}>+ Add</button>
          </form>

          {/* Compact table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "#475569", whiteSpace: "nowrap" }}>Name</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "#475569" }}>Email</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "#475569" }}>Phone</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "#475569" }}>Role</th>
                  <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: "#475569" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayUsers.map((u, i) => {
                  const role = canonicalRole(u);
                  const roleBg = role === "admin" ? "#7c3aed" : role === "seller" ? "#f59e0b" : role === "consultant" ? "#0d9488" : role === "sub_admin" ? "#4f46e5" : "#3b82f6";
                  const isEditing = editingUserEmail === u.email;
                  return (
                    <tr key={u.uid || u.email} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      {isEditing ? (
                        <td colSpan={5} style={{ padding: "8px 12px" }}>
                          <form onSubmit={handleUpdateUser} className="flex flex-wrap gap-2 items-center">
                            <input value={editUserForm.name} onChange={(e) => setEditUserForm(p => ({...p, name: e.target.value}))} placeholder="Name"
                              className="px-2.5 py-1.5 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/20 min-w-[120px]" />
                            <input value={editUserForm.phone} onChange={(e) => setEditUserForm(p => ({...p, phone: e.target.value}))} placeholder="Phone"
                              className="px-2.5 py-1.5 rounded-lg border border-zinc-300 text-sm focus:outline-none min-w-[120px]" />
                            <select value={editUserForm.role} onChange={(e) => setEditUserForm(p => ({...p, role: e.target.value}))}
                              className="px-2.5 py-1.5 rounded-lg border border-zinc-300 text-sm focus:outline-none">
                              <option value="customer">Customer</option>
                              <option value="seller">Seller</option>
                              <option value="consultant">Consultant</option>
                              <option value="sub_admin">Sub-admin</option>
                              <option value="admin">Admin</option>
                            </select>
                            <button type="submit" style={{ ...btn, background: "#16a34a", color: "white", padding: "6px 14px", fontSize: 12 }}>Save</button>
                            <button type="button" onClick={() => setEditingUserEmail(null)} style={{ ...btn, background: "#f1f5f9", color: "#64748b", padding: "6px 14px", fontSize: 12 }}>Cancel</button>
                          </form>
                        </td>
                      ) : (
                        <>
                          <td style={{ padding: "10px 12px", fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap" }}>{u.name || "—"}</td>
                          <td style={{ padding: "10px 12px", color: "#475569" }}>{u.email}</td>
                          <td style={{ padding: "10px 12px", color: "#64748b" }}>{u.phone?.trim() || "—"}</td>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "white", background: roleBg, padding: "2px 8px", borderRadius: 6, whiteSpace: "nowrap" }}>{role}</span>
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right", whiteSpace: "nowrap" }}>
                            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                              {["customer","seller","consultant","sub_admin"].includes(role) && !String(u.uid||"").startsWith("reserved") && (
                                <button type="button" onClick={() => setHistoryUser(u)} style={{ ...btn, background: "#f0fdf4", color: "#166534", padding: "5px 10px", fontSize: 11 }}>History</button>
                              )}
                              <button type="button" onClick={() => handleEditUser(u)} style={{ ...btn, background: "#eff6ff", color: "#1d4ed8", padding: "5px 10px", fontSize: 11 }}>Edit</button>
                              {!String(u.uid||"").startsWith("reserved-admin") && (
                                <button type="button" onClick={() => handleRemoveUser(u.email)} style={{ ...btn, background: "#fef2f2", color: "#dc2626", padding: "5px 10px", fontSize: 11 }}>Remove</button>
                              )}
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        </>
        )}

        {adminSection === "listings" && (
        <>
        <div style={sectionCard}>
          <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "10px" }}>{editingId ? "Edit listing" : "Create listing"}</div>
          <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "10px", lineHeight: 1.45 }}>
            For now, every field is optional. If seller email is empty or invalid, the listing is stored under your signed-in admin email. If monthly rent is 0, a number from the price label is used when possible.
          </div>
          {adminListingMsg ? (
            <div
              style={{
                marginBottom: "12px",
                padding: "10px 12px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 600,
                border: `1px solid ${adminListingMsgKind === "err" ? "#fecaca" : "#bbf7d0"}`,
                background: adminListingMsgKind === "err" ? "#fef2f2" : "#f0fdf4",
                color: adminListingMsgKind === "err" ? "#b91c1c" : "#15803d",
              }}
            >
              {adminListingMsg}
              {adminListingWarning ? (
                <div style={{ marginTop: "6px", fontSize: "12px", color: "#92400e", fontWeight: 600 }}>
                  {adminListingWarning}
                </div>
              ) : null}
            </div>
          ) : null}
          <form onSubmit={handleSubmitListing} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)", gap: "10px" }}>
            <input placeholder="Title (optional)" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
            <input placeholder="Price label (optional, e.g. ₹40,000 / month)" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} />
            <input
              type="number"
              min={0}
              step="any"
              placeholder="Monthly rent (optional)"
              value={Number.isFinite(Number(form.monthlyRent)) ? form.monthlyRent : 0}
              onChange={(e) => setForm((p) => ({ ...p, monthlyRent: e.target.value === "" ? 0 : Number(e.target.value) }))}
            />
            <select value={form.bhk} onChange={(e) => setForm((p) => ({ ...p, bhk: e.target.value }))}><option>1 BHK</option><option>2 BHK</option><option>3 BHK</option></select>
            <input placeholder="Address (optional)" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
            <input placeholder="Seller name (optional)" value={form.seller} onChange={(e) => setForm((p) => ({ ...p, seller: e.target.value }))} />
            <input type="text" placeholder="Seller email (optional)" value={form.sellerEmail} onChange={(e) => setForm((p) => ({ ...p, sellerEmail: e.target.value }))} />
            <div style={{ gridColumn: isMobile ? "auto" : "span 2", fontSize: 12, color: "#64748b", lineHeight: 1.45, padding: "6px 0" }}>
              Broker and owner numbers are stored only in <strong>private</strong> fields — they are not written to the public listing document, so they cannot be scraped from Firestore by unauthenticated clients.
            </div>
            <input placeholder="Agent / broker number (private)" value={form.agentPhonePrivate} onChange={(e) => setForm((p) => ({ ...p, agentPhonePrivate: e.target.value }))} />
            <input placeholder="Owner / landlord number (private)" value={form.ownerPhonePrivate} onChange={(e) => setForm((p) => ({ ...p, ownerPhonePrivate: e.target.value }))} />
            <input placeholder="Main photo URL" value={form.image} onChange={(e) => setForm((p) => ({ ...p, image: e.target.value }))} />
            <input placeholder="Source / portal" value={form.source} onChange={(e) => setForm((p) => ({ ...p, source: e.target.value }))} />
            <input placeholder="Source URL" value={form.sourceUrl} onChange={(e) => setForm((p) => ({ ...p, sourceUrl: e.target.value }))} />
            <textarea placeholder="Gallery photo URLs, one per line" value={form.imagesText} onChange={(e) => setForm((p) => ({ ...p, imagesText: e.target.value }))} style={{ gridColumn: isMobile ? "auto" : "span 2", minHeight: "70px" }} />
            <textarea placeholder="Listing description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} style={{ gridColumn: isMobile ? "auto" : "span 2", minHeight: "70px" }} />
            <input placeholder="Security deposit — e.g. 3 months or 126000" value={form.securityDeposit} onChange={(e) => setForm((p) => ({ ...p, securityDeposit: e.target.value }))} />
            <input placeholder="Maintenance cost (optional) — 2000 or Including" value={form.maintenanceCost} onChange={(e) => setForm((p) => ({ ...p, maintenanceCost: e.target.value }))} />
            <input placeholder="Preferred tenants — e.g. Family, Bachelor" value={Array.isArray(form.preferredTenants) ? form.preferredTenants.join(", ") : form.preferredTenants || ""} onChange={(e) => setForm((p) => ({ ...p, preferredTenants: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))} />
            <input placeholder="Brokerage (optional) — Half month rent" value={form.brokerage} onChange={(e) => setForm((p) => ({ ...p, brokerage: e.target.value }))} />
            <input placeholder="Built up area (optional) — 1200" value={form.builtUpArea} onChange={(e) => setForm((p) => ({ ...p, builtUpArea: e.target.value }))} />
            <input placeholder="Bathrooms (optional) — 2" value={form.bathrooms} onChange={(e) => setForm((p) => ({ ...p, bathrooms: e.target.value }))} />
            <input placeholder="Balcony (optional) — 1 wide" value={form.balcony} onChange={(e) => setForm((p) => ({ ...p, balcony: e.target.value }))} />
            <input placeholder="Floor no. (optional) — 4" value={form.floorNumber} onChange={(e) => setForm((p) => ({ ...p, floorNumber: e.target.value }))} />
            <input placeholder="Total floors (optional) — 12" value={form.totalFloors} onChange={(e) => setForm((p) => ({ ...p, totalFloors: e.target.value }))} />
            <input placeholder="Lease type (optional) — 11 months" value={form.leaseType} onChange={(e) => setForm((p) => ({ ...p, leaseType: e.target.value }))} />
            <input placeholder="Age of property (optional) — 3 years" value={form.ageOfProperty} onChange={(e) => setForm((p) => ({ ...p, ageOfProperty: e.target.value }))} />
            <input placeholder="Parking info (optional) — 1 covered car" value={form.parkingInfo} onChange={(e) => setForm((p) => ({ ...p, parkingInfo: e.target.value }))} />
            <input placeholder="Gas pipeline (optional) — Yes" value={form.gasPipeline} onChange={(e) => setForm((p) => ({ ...p, gasPipeline: e.target.value }))} />
            <input placeholder="Gated community (optional) — Yes" value={form.gatedCommunity} onChange={(e) => setForm((p) => ({ ...p, gatedCommunity: e.target.value }))} />
            <textarea placeholder="Furnishings (comma separated, optional) — Sofa, Fridge, Washing machine" value={form.furnishingsText} onChange={(e) => setForm((p) => ({ ...p, furnishingsText: e.target.value }))} style={{ gridColumn: isMobile ? "auto" : "span 2", minHeight: "64px" }} />
            <textarea placeholder="Amenities (comma separated, optional) — Gym, Pool, Power backup" value={form.amenitiesText} onChange={(e) => setForm((p) => ({ ...p, amenitiesText: e.target.value }))} style={{ gridColumn: isMobile ? "auto" : "span 2", minHeight: "64px" }} />
            {parsedListingMediaUrls.length > 0 ? (
              <div style={{ gridColumn: "1 / -1", border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, background: "#fff" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>
                  Current saved media ({parsedListingMediaUrls.length})
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(92px, 1fr))", gap: 8 }}>
                  {parsedListingMediaUrls.map((url) => (
                    <div key={url} style={{ borderRadius: 10, overflow: "hidden", border: "1px solid #e2e8f0", background: "#f8fafc" }}>
                      {isVideoUrl(url) ? (
                        <video src={url} controls style={{ width: "100%", height: 78, objectFit: "cover", display: "block" }} />
                      ) : (
                        <img src={url} alt="" loading="lazy" style={{ width: "100%", height: 78, objectFit: "cover", display: "block" }} />
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 8, fontSize: 11, color: "#64748b", lineHeight: 1.4 }}>
                  This is the media already saved in Firestore (`images[]`). Use "Listing Media Upload" below to add more.
                </div>
              </div>
            ) : null}
            <MediaUploadField files={photoFiles} setFiles={setPhotoFiles} maxFiles={12} title="Listing Media Upload" />
            <div style={{ gridColumn: isMobile ? "auto" : "span 4", marginTop: "4px", fontSize: "12px", fontWeight: 600, color: "#334155" }}>
              Map pin: {pinPosition?.[0]?.toFixed(4)}, {pinPosition?.[1]?.toFixed(4)} — search to move map, then click to place the pin.
            </div>
            <div style={{ gridColumn: isMobile ? "auto" : "span 4" }}>
              <ListingMapPicker
                key={String(editingId || "new")}
                markerPosition={pinPosition}
                onMarkerChange={setPinPosition}
                height={260}
                initialZoom={13}
              />
            </div>
            <button type="submit" style={{ ...btn, background: "#16a34a", color: "white", gridColumn: isMobile ? "auto" : "span 4", marginTop: "8px", padding: "12px 18px", fontSize: "15px" }}>
              {editingId ? "Update listing" : "Create listing"}
            </button>
          </form>
        </div>

        <div style={sectionCard}>
          <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "10px" }}>Broker Bulk Import</div>
          
          <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "16px" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "8px", color: "#0f172a" }}>Cloud Automated Import (Housing.com Profile)</div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
              <input placeholder="Broker name" value={importBrokerName} onChange={(e) => setImportBrokerName(e.target.value)} style={{ padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "8px" }} />
              <input placeholder="Housing.com Profile URL" value={cloudImportProfileUrl} onChange={(e) => setCloudImportProfileUrl(e.target.value)} style={{ padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "8px" }} />
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
              <button
                onClick={() => handleCloudImport(false)}
                disabled={!!cloudImportJobId || cloudImportJobStatus?.status === "initializing"}
                style={{ ...btn, background: "#7c3aed", color: "white" }}
              >
                Run Cloud Import
              </button>
              <button
                onClick={() => handleCloudImport(true)}
                disabled={!!cloudImportJobId || cloudImportJobStatus?.status === "initializing"}
                style={{ ...btn, background: "#f1f5f9", color: "#334155", border: "1px solid #cbd5e1" }}
              >
                Dry Run (Test)
              </button>
            </div>
            
            {cloudImportJobStatus && (
              <div style={{ marginTop: "12px", padding: "10px", background: "#fff", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}>
                <div style={{ fontWeight: 600, color: cloudImportJobStatus.status === "failed" ? "#dc2626" : cloudImportJobStatus.status === "succeeded" ? "#16a34a" : "#0f172a" }}>
                  Status: {cloudImportJobStatus.status.toUpperCase()}
                </div>
                <div style={{ color: "#475569", marginTop: "4px" }}>{cloudImportJobStatus.message}</div>
                {cloudImportJobStatus.error && <div style={{ color: "#dc2626", marginTop: "4px", fontSize: "12px", fontFamily: "monospace", overflowX: "auto" }}>{cloudImportJobStatus.error}</div>}
                {cloudImportJobStatus.status === "succeeded" && <div style={{ fontWeight: 600, color: "#16a34a", marginTop: "4px" }}>Listings processed: {cloudImportJobStatus.listingCount}</div>}
                {(cloudImportJobStatus.status === "succeeded" || cloudImportJobStatus.status === "failed") && (
                  <button onClick={() => { setCloudImportJobId(null); setCloudImportJobStatus(null); setCloudImportProfileUrl(""); }} style={{ ...btn, marginTop: "8px", background: "#e2e8f0", color: "#334155", fontSize: "11px", padding: "4px 8px" }}>Clear</button>
                )}
              </div>
            )}
          </div>

          <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "8px", color: "#0f172a" }}>Legacy JSON/CSV Import</div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
              <input placeholder="Source name (e.g. manual)" value={importSourceName} onChange={(e) => setImportSourceName(e.target.value)} style={{ padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "8px" }} />
              <input 
                type="file" 
                accept=".csv, .json, .txt, .tsv"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (evt) => setFeedJson(evt.target.result);
                  reader.readAsText(file);
                }}
                style={{ padding: "4px", border: "1px solid #e2e8f0", borderRadius: "6px", width: "100%", fontSize: "12px" }}
              />
            </div>
            <textarea
              value={feedJson}
              onChange={(e) => setFeedJson(e.target.value)}
              rows={4}
              style={{ width: "100%", padding: "8px", border: "1px solid #cbd5e1", borderRadius: "8px", marginBottom: "8px" }}
              placeholder={'JSON example: [{"title":"2 BHK in HSR","brokerName":"Rahul Estates","monthlyRent":28000,"lat":12.91,"lng":77.63}]'}
            />
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button onClick={handleBrokerImport} style={{ ...btn, background: "#0ea5e9", color: "white" }}>Parse Raw JSON with Broker Name</button>
              <button onClick={handleFeedImport} style={{ ...btn, background: "#475569", color: "white" }}>Generic Import (partner feed)</button>
            </div>
          </div>
        </div>

        <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "8px" }}>All Listings ({listings.length})</div>
        <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "14px", lineHeight: 1.45 }}>
          Firestore listings appear first; bundled map demos (same as on /map) follow with a <strong>Demo</strong> tag — Edit + Save creates a new cloud listing.
        </div>
        <div style={{ background: "white", borderRadius: "12px", overflow: "hidden" }}>
          {listings.map((l) => (
            <div key={l._seedFromStatic ? `seed-${l.id}` : l.id} style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", flexDirection: isMobile ? "column" : "row", gap: isMobile ? "8px" : 0 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  {l.title}
                  {l._seedFromStatic ? (
                    <span style={{ fontSize: "10px", fontWeight: 800, padding: "2px 8px", borderRadius: "999px", background: "#e0e7ff", color: "#3730a3" }}>Demo</span>
                  ) : null}
                </div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>
                  {l.bhk} | {l.address} | {l.seller} | {String(l.contact || "").trim() ? "legacy phone" : "private"} | {l.source}
                  {l.marketStatus && l.marketStatus !== "published" ? (
                    <span style={{ marginLeft: 8, fontWeight: 700, color: "#b45309" }}>· {l.marketStatus}</span>
                  ) : null}
                </div>
              </div>
              <div style={{ fontWeight: 700, color: "#16a34a", marginRight: isMobile ? 0 : "16px" }}>{l.price}</div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button onClick={() => handleEdit(l)} style={{ ...btn, background: "#dbeafe", color: "#1d4ed8", fontSize: "12px" }}>Edit</button>
                <button type="button" title="Permanent removal from database. Sellers can only withdraw (hide) their listings." onClick={() => handleDelete(l.id)} style={{ ...btn, background: "#fef2f2", color: "#dc2626", fontSize: "12px" }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
        </>
        )}

        {adminSection === "brokerContacts" && (
          <BrokerContactsTable sectionCard={sectionCard} brokersData={brokersData} />
        )}

        {adminSection === "contactQueries" && (
          <div style={sectionCard}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Contact Form Queries</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                  Submissions from the /contact page — {contactQueries.length} total
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {["all", "pending", "resolved", "spam"].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setContactQueriesFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold capitalize transition-all ${
                      contactQueriesFilter === f
                        ? "bg-zinc-900 text-white"
                        : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                    }`}
                  >
                    {f === "all" ? `All (${contactQueries.length})` : `${f} (${contactQueries.filter((q) => q.status === f).length})`}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setRefreshTick((v) => v + 1)}
                  style={{ ...btn, background: "#f1f5f9", color: "#334155" }}
                >
                  Refresh
                </button>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                    <th style={{ padding: "9px 10px", textAlign: "left", fontWeight: 700, color: "#475569", whiteSpace: "nowrap" }}>Date</th>
                    <th style={{ padding: "9px 10px", textAlign: "left", fontWeight: 700, color: "#475569" }}>Name</th>
                    <th style={{ padding: "9px 10px", textAlign: "left", fontWeight: 700, color: "#475569" }}>Email</th>
                    <th style={{ padding: "9px 10px", textAlign: "left", fontWeight: 700, color: "#475569" }}>Phone</th>
                    <th style={{ padding: "9px 10px", textAlign: "left", fontWeight: 700, color: "#475569" }}>Message</th>
                    <th style={{ padding: "9px 10px", textAlign: "left", fontWeight: 700, color: "#475569" }}>Status</th>
                    <th style={{ padding: "9px 10px", textAlign: "right", fontWeight: 700, color: "#475569" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(contactQueriesFilter === "all"
                    ? contactQueries
                    : contactQueries.filter((q) => q.status === contactQueriesFilter)
                  ).map((q, idx) => {
                    const ts = q.createdAt?.toDate ? q.createdAt.toDate() : null;
                    const dateStr = ts ? ts.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" }) : "—";
                    const timeStr = ts ? ts.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "";
                    const statusColors = {
                      pending: { bg: "#fef9c3", color: "#854d0e" },
                      resolved: { bg: "#dcfce7", color: "#14532d" },
                      spam: { bg: "#fee2e2", color: "#991b1b" },
                    };
                    const sc = statusColors[q.status] || statusColors.pending;

                    const updateStatus = async (newStatus) => {
                      try {
                        await updateDoc(doc(db, "contactQueries", q.id), { status: newStatus });
                        setContactQueries((prev) => prev.map((item) => item.id === q.id ? { ...item, status: newStatus } : item));
                      } catch (e) {
                        alert("Update failed: " + String(e?.message || e));
                      }
                    };

                    return (
                      <tr key={q.id} style={{ borderBottom: "1px solid #f1f5f9", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                        <td style={{ padding: "10px 10px", color: "#64748b", whiteSpace: "nowrap", verticalAlign: "top" }}>
                          <div style={{ fontWeight: 700, fontSize: 12 }}>{dateStr}</div>
                          <div style={{ fontSize: 11, color: "#94a3b8" }}>{timeStr}</div>
                        </td>
                        <td style={{ padding: "10px 10px", fontWeight: 700, color: "#0f172a", verticalAlign: "top", whiteSpace: "nowrap" }}>{q.name || "—"}</td>
                        <td style={{ padding: "10px 10px", color: "#334155", verticalAlign: "top" }}>
                          <a href={`mailto:${q.email}`} style={{ color: "#0ea5e9", textDecoration: "underline" }}>{q.email || "—"}</a>
                        </td>
                        <td style={{ padding: "10px 10px", color: "#334155", verticalAlign: "top", whiteSpace: "nowrap" }}>
                          {q.phone ? <a href={`tel:${q.phone}`} style={{ color: "#334155" }}>{q.phone}</a> : "—"}
                        </td>
                        <td style={{ padding: "10px 10px", color: "#475569", verticalAlign: "top", maxWidth: 280 }}>
                          <div style={{ fontSize: 12, lineHeight: 1.55, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
                            {q.message || <span style={{ color: "#94a3b8" }}>No message</span>}
                          </div>
                        </td>
                        <td style={{ padding: "10px 10px", verticalAlign: "top" }}>
                          <span style={{ display: "inline-block", borderRadius: 6, padding: "3px 9px", fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color }}>
                            {q.status || "pending"}
                          </span>
                        </td>
                        <td style={{ padding: "10px 10px", textAlign: "right", verticalAlign: "top" }}>
                          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                            {q.status !== "resolved" && (
                              <button type="button" onClick={() => updateStatus("resolved")} style={{ ...btn, background: "#dcfce7", color: "#15803d", padding: "4px 10px", fontSize: 11 }}>Resolved</button>
                            )}
                            {q.status !== "pending" && (
                              <button type="button" onClick={() => updateStatus("pending")} style={{ ...btn, background: "#fef9c3", color: "#854d0e", padding: "4px 10px", fontSize: 11 }}>Pending</button>
                            )}
                            {q.status !== "spam" && (
                              <button type="button" onClick={() => updateStatus("spam")} style={{ ...btn, background: "#fee2e2", color: "#991b1b", padding: "4px 10px", fontSize: 11 }}>Spam</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {(contactQueriesFilter === "all" ? contactQueries : contactQueries.filter((q) => q.status === contactQueriesFilter)).length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: "24px 10px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                        No {contactQueriesFilter !== "all" ? contactQueriesFilter : ""} queries yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {historyUser ? (
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 10000,
              background: "rgba(15, 23, 42, 0.55)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
            }}
            onClick={() => setHistoryUser(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "white",
                borderRadius: 16,
                maxWidth: 720,
                width: "100%",
                maxHeight: "90vh",
                overflow: "auto",
                padding: isMobile ? "16px" : "22px 24px",
                boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: "20px", fontWeight: 800, color: "#0f172a" }}>User journey</div>
                  <div style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>
                    {historyUser.name} · {historyUser.email} · {historyUser.role}
                  </div>
                </div>
                <button type="button" onClick={() => setHistoryUser(null)} style={{ ...btn, background: "#f1f5f9", color: "#334155" }}>
                  Close
                </button>
              </div>
              {!historyBundle ? (
                <div style={{ color: "#64748b" }}>Loading…</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <section>
                    <div style={{ fontWeight: 800, marginBottom: 8, color: "#1e293b" }}>Timeline (saves, interests)</div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#475569", lineHeight: 1.65 }}>
                      {(historyBundle.acts || []).slice(0, 80).map((a) => (
                        <li key={a.id}>
                          <strong>{a.type}</strong> — {a.summary}{" "}
                          <span style={{ color: "#94a3b8" }}>
                            ({a.createdAt?.toDate ? a.createdAt.toDate().toLocaleString() : a.createdAt})
                          </span>
                        </li>
                      ))}
                      {!(historyBundle.acts || []).length ? <li>No logged events yet.</li> : null}
                    </ul>
                  </section>
                  <section>
                    <div style={{ fontWeight: 800, marginBottom: 8, color: "#1e293b" }}>Interests / applications</div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#475569", lineHeight: 1.65 }}>
                      {(historyBundle.interests || []).map((i) => (
                        <li key={i.id}>
                          {i.listingTitle} (#{i.listingId}) — {i.status} — {i.tenancyPreference}
                        </li>
                      ))}
                      {!(historyBundle.interests || []).length ? <li>None.</li> : null}
                    </ul>
                  </section>
                  <section>
                    <div style={{ fontWeight: 800, marginBottom: 8, color: "#1e293b" }}>Visit requests</div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#475569", lineHeight: 1.65 }}>
                      {(historyBundle.visits || []).map((v) => (
                        <li key={v.id}>
                          Listing #{v.listingId} — {v.visitTime} — {v.customerPhone}
                        </li>
                      ))}
                      {!(historyBundle.visits || []).length ? <li>None.</li> : null}
                    </ul>
                  </section>
                  <section>
                    <div style={{ fontWeight: 800, marginBottom: 8, color: "#1e293b" }}>Bookings (this device)</div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#475569", lineHeight: 1.65 }}>
                      {(historyBundle.bookings || []).map((b, idx) => (
                        <li key={idx}>
                          {b.listingTitle} — {b.status} — {b.date ? new Date(b.date).toLocaleString() : ""}
                        </li>
                      ))}
                      {!(historyBundle.bookings || []).length ? <li>None.</li> : null}
                    </ul>
                  </section>
                  <section>
                    <div style={{ fontWeight: 800, marginBottom: 8, color: "#1e293b" }}>Assignments</div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#475569", lineHeight: 1.65 }}>
                      {(historyBundle.assigns || []).map((a) => (
                        <li key={a.id}>
                          {a.listingTitle || `Listing #${a.listingId}`} — {a.sellerName || a.sellerEmail || "—"}
                          {a.customerPhone ? ` · customer phone ${a.customerPhone}` : ""} — {a.notes || "no notes"}
                        </li>
                      ))}
                      {!(historyBundle.assigns || []).length ? <li>None.</li> : null}
                    </ul>
                  </section>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </PageShell>
  );
}

function BrokerContactsTable({ sectionCard, brokersData = [] }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterBroker, setFilterBroker] = useState("");

  useEffect(() => {
    fetchBrokerContacts()
      .then(setRows)
      .finally(() => setLoading(false));
  }, []);

  const fmt = (ts) => {
    if (!ts) return "—";
    return new Date(ts).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  };

  const medals = ["🥇", "🥈", "🥉"];
  const totalClicks = brokersData.reduce((s, b) => s + (Number(b.engagementCount) || 0), 0);

  // Leaderboard from brokers.engagementCount (live counter, source of truth)
  const leaderboard = [...brokersData]
    .sort((a, b) => (Number(b.engagementCount) || 0) - (Number(a.engagementCount) || 0));

  // Contact log filtered
  const filtered = filterBroker
    ? rows.filter((r) => (r.brokerName || "").toLowerCase().includes(filterBroker.toLowerCase()))
    : rows;

  return (
    <>
      {/* Leaderboard — reads engagementCount from brokers docs */}
      <div style={{ ...sectionCard, marginBottom: 14 }}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Agent Engagement Ranking</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>Live click count from brokers collection · updates on every WhatsApp tap</div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b" }}>{totalClicks} total tap{totalClicks !== 1 ? "s" : ""}</div>
        </div>

        {leaderboard.length === 0 ? (
          <p style={{ fontSize: 13, color: "#94a3b8" }}>No brokers yet — add brokers in the Agents section.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                  <th style={{ padding: "9px 12px", textAlign: "left", fontWeight: 700, color: "#475569", width: 50 }}>Rank</th>
                  <th style={{ padding: "9px 12px", textAlign: "left", fontWeight: 700, color: "#475569" }}>Agent</th>
                  <th style={{ padding: "9px 12px", textAlign: "left", fontWeight: 700, color: "#475569" }}>Area</th>
                  <th style={{ padding: "9px 12px", textAlign: "left", fontWeight: 700, color: "#475569" }}>Clicks</th>
                  <th style={{ padding: "9px 12px", textAlign: "left", fontWeight: 700, color: "#475569" }}>Share</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((b, i) => {
                  const clicks = Number(b.engagementCount) || 0;
                  const pct = totalClicks > 0 ? Math.round((clicks / totalClicks) * 100) : 0;
                  return (
                    <tr key={b.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: "10px 12px", fontSize: 18 }}>{medals[i] || `#${i + 1}`}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ fontWeight: 700, color: "#0f172a" }}>{b.name || "—"}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>{b.phone || ""}</div>
                      </td>
                      <td style={{ padding: "10px 12px", color: "#64748b" }}>{b.area || "—"}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 22, fontWeight: 800, color: clicks > 0 ? "#0f172a" : "#94a3b8" }}>{clicks}</span>
                          <div style={{ flex: 1, minWidth: 60, maxWidth: 120, height: 6, borderRadius: 999, background: "#f1f5f9", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: "#22c55e", borderRadius: 999, transition: "width 0.4s" }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>{pct}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Full contact log */}
      <div style={sectionCard}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>Full contact log</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>Every WhatsApp connect tap, newest first</div>
          </div>
          <input
            placeholder="Filter by broker…"
            value={filterBroker}
            onChange={(e) => setFilterBroker(e.target.value)}
            style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, minWidth: 180 }}
          />
        </div>

        {loading ? (
          <p style={{ fontSize: 13, color: "#94a3b8" }}>Loading…</p>
        ) : filtered.length === 0 ? (
          <p style={{ fontSize: 13, color: "#94a3b8" }}>{filterBroker ? "No matches." : "No contacts yet."}</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                  {["Time", "Client", "Client Email", "Broker", "Broker ID"].map((h) => (
                    <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontWeight: 700, color: "#475569", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "9px 12px", color: "#64748b", whiteSpace: "nowrap" }}>{fmt(r.timestamp)}</td>
                    <td style={{ padding: "9px 12px" }}>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>{r.clientName || "—"}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>{r.clientId || ""}</div>
                    </td>
                    <td style={{ padding: "9px 12px", color: "#334155" }}>{r.clientEmail || "—"}</td>
                    <td style={{ padding: "9px 12px", fontWeight: 600, color: "#0f172a" }}>{r.brokerName || "—"}</td>
                    <td style={{ padding: "9px 12px", color: "#94a3b8", fontFamily: "monospace", fontSize: 11 }}>{r.brokerId || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ marginTop: 10, fontSize: 11, color: "#94a3b8" }}>{filtered.length} record{filtered.length !== 1 ? "s" : ""}</p>
          </div>
        )}
      </div>
    </>
  );
}
