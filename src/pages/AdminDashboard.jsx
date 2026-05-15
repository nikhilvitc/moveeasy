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
import { doc, onSnapshot } from "firebase/firestore";
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
import { AGENT_TABS } from "../data/agentsDirectory";

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
  const [adminListingMsg, setAdminListingMsg] = useState("");
  const [adminListingMsgKind, setAdminListingMsgKind] = useState("ok");
  const [adminListingWarning, setAdminListingWarning] = useState("");

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
        setAgentsDraft(
          agentRows.map((a) => ({
            ...a,
            specialties: Array.isArray(a.specialties) ? a.specialties.join(", ") : "",
            languages: Array.isArray(a.languages) ? a.languages.join(", ") : "",
            areas: Array.isArray(a.areas) ? a.areas.join(", ") : "",
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
      await saveDirectoryAgents(agentsDraft);
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
      const body = `New lead assignment: ${custLine} for “${listingTitle || `Listing #${assignListingId}`}” (#${assignListingId}).${assignNotes.trim() ? ` Notes: ${assignNotes.trim()}` : ""}`;
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

  const btn = { padding: "8px 16px", borderRadius: "8px", border: "none", fontWeight: 600, fontSize: "13px", cursor: "pointer" };
  const sectionCard = { background: "white", padding: isMobile ? "12px" : "16px", borderRadius: "12px", marginBottom: "16px" };

  return (
    <PageShell variant="marketing" overlayOnly className="bg-slate-100">
      <div style={{ background: "#000000", color: "white", padding: isMobile ? "12px 14px" : "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            onClick={() => navigate("/")}
            style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
          >
            <MovEAZYLogo variant="onDark" size={isMobile ? "sm" : "lg"} />
          </div>
          {!isMobile && (
            <div style={{ borderLeft: "1px solid #3f3f46", paddingLeft: "16px" }}>
              <div style={{ fontSize: "16px", fontWeight: 800 }}>Admin Dashboard</div>
              <div style={{ fontSize: "11px", opacity: 0.6 }}>{user?.email}</div>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button onClick={() => navigate("/map")} style={{ ...btn, background: "#262626", border: "1px solid #404040", color: "white" }}>Map</button>
          <button onClick={() => navigate("/")} style={{ ...btn, background: "#262626", border: "1px solid #404040", color: "white" }}>Home</button>
          <button onClick={() => { logout(); navigate("/login"); }} style={{ ...btn, background: "#7f1d1d", border: "1px solid #991b1b", color: "white" }}>Logout</button>
        </div>
      </div>

      <div style={{ padding: isMobile ? "12px" : "20px 24px" }}>
        {showDebugBanner ? (
          <div
            style={{
              background: "#0f172a",
              color: "#e2e8f0",
              borderRadius: "10px",
              padding: "10px 12px",
              marginBottom: "14px",
              fontSize: "12px",
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: "#93c5fd" }}>Debug session:</strong>{" "}
            email=<span style={{ color: "#f8fafc" }}>{user?.email || "—"}</span>{" · "}
            role=<span style={{ color: "#f8fafc" }}>{user?.role || "—"}</span>{" · "}
            source=<span style={{ color: "#f8fafc" }}>{isFirebaseConfigured ? "firestore" : "localStorage"}</span>{" · "}
            host=<span style={{ color: "#f8fafc" }}>{typeof window !== "undefined" ? window.location.host : "—"}</span>{" · "}
            listings=<span style={{ color: "#f8fafc" }}>{listings.length}</span>{" · "}
            users=<span style={{ color: "#f8fafc" }}>{users.length}</span>
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
            paddingBottom: 12,
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <div
            role="tablist"
            aria-label="Admin sections"
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {[
              ["overview", "Overview"],
              ["site", "Site & contact"],
              ["agents", "Agents"],
              ["operations", "Leads & queue"],
              ["users", "Users"],
              ["listings", "Listings"],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={adminSection === id}
                onClick={() => setAdminSection(id)}
                style={{
                  ...btn,
                  fontSize: isMobile ? "12px" : "13px",
                  padding: isMobile ? "8px 12px" : "10px 16px",
                  background: adminSection === id ? "#0f172a" : "#fff",
                  color: adminSection === id ? "#fff" : "#334155",
                  border: `1px solid ${adminSection === id ? "#0f172a" : "#cbd5e1"}`,
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => navigate("/crm")} style={{ ...btn, background: "#0f766e", color: "#fff", border: "1px solid #0d9488", fontWeight: 800 }}>
            Staff CRM
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
          <div style={{ ...sectionCard, marginBottom: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>At a glance</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(auto-fit, minmax(130px, 1fr))",
                gap: 10,
              }}
            >
              {[
                ["Users", users.length],
                ["Customers", customersList.length],
                ["Sellers", sellersList.length],
                ["Consultants", consultantsList.length],
                ["Sub-admins", subAdminsList.length],
                ["Admins", adminsList.length],
                ["Listings", listings.length],
              ].map(([k, v]) => (
                <div key={k} style={{ background: "#f8fafc", borderRadius: 10, padding: 12, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>{k}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 12, lineHeight: 1.6 }}>
              <strong>Leads &amp; ops:</strong> {interestsState.length} listing interests · {assignmentsState.length} assignments ·{" "}
              {visitRequests.length} visit requests · {adminNotifs.filter((n) => !n.read).length} unread admin notifications
            </div>
            <div style={{ fontSize: 12, color: "#475569", marginTop: 10, lineHeight: 1.55, maxWidth: 720 }}>
              <strong>Broker privacy:</strong> Agent and owner numbers are stored in <code style={{ fontSize: 11 }}>listingPrivate</code> only, not on public{" "}
              <code style={{ fontSize: 11 }}>listings</code> documents, so scraping open Firestore reads cannot harvest phones. Only admins, sub-admins, consultants, and the listing owner can read private phone docs (see Firestore rules). Firebase sign-in already requires a verified email.
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14, alignItems: "center" }}>
              <button type="button" onClick={() => navigate("/crm")} style={{ ...btn, background: "#0f766e", color: "#fff", border: "1px solid #0d9488" }}>
                Open staff CRM
              </button>
              <button type="button" onClick={() => setRefreshTick((x) => x + 1)} style={{ ...btn, background: "#2563eb", color: "#fff" }}>
                Refresh all data
              </button>
              <span style={{ fontSize: 12, color: "#64748b" }}>Use the tabs above for forms and directory tables.</span>
            </div>
          </div>
        )}
        {adminSection === "site" && (
        <div style={{ ...sectionCard, border: "1px solid #bfdbfe", background: "#f0f9ff", marginBottom: "20px" }}>
          <div style={{ fontSize: "18px", fontWeight: 800, marginBottom: "6px", color: "#0c4a6e" }}>Website — Contact page & legal lines</div>
          <p style={{ fontSize: "13px", color: "#0369a1", marginBottom: "14px", lineHeight: 1.5 }}>
            Public read, admin-only write (<code style={{ fontSize: 12 }}>siteSettings/public</code>). Contact cards appear on{" "}
            <strong>/contact</strong>; support email, privacy email, and main phone appear in Terms &amp; Privacy.
          </p>
          <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "8px", color: "#0f172a" }}>Consultant cards ({sitePublicDraft.contacts.length} / 12)</div>
          {sitePublicDraft.contacts.map((c, idx) => (
            <div
              key={`row-${idx}`}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: 12,
                marginBottom: 10,
                background: "#fff",
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8 }}>
                <input
                  placeholder="Name"
                  value={c.name}
                  onChange={(e) => updateContactField(idx, "name", e.target.value)}
                  style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14 }}
                />
                <input
                  placeholder="Title (e.g. Sales Lead)"
                  value={c.title}
                  onChange={(e) => updateContactField(idx, "title", e.target.value)}
                  style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14 }}
                />
                <input
                  placeholder="Phone (+91 … or digits for WhatsApp)"
                  value={c.phone}
                  onChange={(e) => updateContactField(idx, "phone", e.target.value)}
                  style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, gridColumn: isMobile ? undefined : "1 / -1" }}
                />
                <label style={{ fontSize: 12, color: "#64748b", gridColumn: isMobile ? undefined : "1 / -1", display: "flex", flexDirection: "column", gap: 4 }}>
                  Optional: WhatsApp digits only (auto-filled from phone if empty)
                  <input
                    placeholder="9170…"
                    value={c.phoneRaw}
                    onChange={(e) => updateContactField(idx, "phoneRaw", e.target.value.replace(/\D/g, ""))}
                    style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14 }}
                  />
                </label>
              </div>
              <button type="button" onClick={() => removeContactRow(idx)} style={{ ...btn, marginTop: 8, background: "#f1f5f9", color: "#64748b", fontSize: "12px" }}>
                Remove card
              </button>
            </div>
          ))}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            <button type="button" onClick={addContactRow} disabled={sitePublicDraft.contacts.length >= 12} style={{ ...btn, background: "#0ea5e9", color: "white" }}>
              + Add contact card
            </button>
            <button type="button" onClick={() => navigate("/contact")} style={{ ...btn, background: "#e0f2fe", color: "#0369a1" }}>
              Preview contact page
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "flex", flexDirection: "column", gap: 4 }}>
              Terms — support email
              <input
                value={sitePublicDraft.supportEmail}
                onChange={(e) => setSitePublicDraft((p) => ({ ...p, supportEmail: e.target.value }))}
                style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14 }}
              />
            </label>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "flex", flexDirection: "column", gap: 4 }}>
              Privacy — DPO email
              <input
                value={sitePublicDraft.privacyEmail}
                onChange={(e) => setSitePublicDraft((p) => ({ ...p, privacyEmail: e.target.value }))}
                style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14 }}
              />
            </label>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "flex", flexDirection: "column", gap: 4, gridColumn: isMobile ? undefined : "1 / -1" }}>
              Terms &amp; Privacy — main phone (display text)
              <input
                value={sitePublicDraft.legalPhoneDisplay}
                onChange={(e) => setSitePublicDraft((p) => ({ ...p, legalPhoneDisplay: e.target.value }))}
                style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14 }}
              />
            </label>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
            <button type="button" onClick={handleSaveSitePublic} style={{ ...btn, background: "#0284c7", color: "white", fontWeight: 800 }}>
              Save to Firestore
            </button>
            {sitePublicStatus ? <span style={{ fontSize: 13, color: sitePublicStatus.startsWith("Saved") ? "#15803d" : "#b91c1c" }}>{sitePublicStatus}</span> : null}
          </div>
        </div>
        )}

        {adminSection === "agents" && (
        <div style={{ ...sectionCard, border: "1px solid #fde68a", background: "#fffbeb", marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6, color: "#78350f" }}>Agents directory</div>
          <p style={{ fontSize: 13, color: "#92400e", marginBottom: 14, lineHeight: 1.5 }}>
            Public read, admin-only write (<code style={{ fontSize: 12 }}>siteSettings/directoryAgents</code>). Order on{" "}
            <strong>/agents</strong> follows the list — use ↑ ↓ to rearrange. Ratings/reviews are hidden for now.
          </p>
          {agentsDraft.map((a, idx) => (
            <div key={a.id || `agent-${idx}`} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12, marginBottom: 10, background: "#fff" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 10 }}>
                <strong style={{ fontSize: 14, color: "#0f172a" }}>#{idx + 1}</strong>
                <button type="button" disabled={idx === 0} onClick={() => moveAgentRow(idx, -1)} style={{ ...btn, fontSize: 12, padding: "4px 10px" }}>↑</button>
                <button type="button" disabled={idx >= agentsDraft.length - 1} onClick={() => moveAgentRow(idx, 1)} style={{ ...btn, fontSize: 12, padding: "4px 10px" }}>↓</button>
                <button type="button" onClick={() => setAgentsDraft((rows) => rows.filter((_, i) => i !== idx))} style={{ ...btn, fontSize: 12, padding: "4px 10px", background: "#fef2f2", color: "#b91c1c" }}>Remove</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8 }}>
                <input placeholder="Name" value={a.name} onChange={(e) => setAgentsDraft((rows) => rows.map((r, i) => (i === idx ? { ...r, name: e.target.value } : r)))} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14 }} />
                <select value={a.tab} onChange={(e) => setAgentsDraft((rows) => rows.map((r, i) => (i === idx ? { ...r, tab: e.target.value } : r)))} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14 }}>
                  {AGENT_TABS.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
                <input placeholder="Brokerage" value={a.brokerage} onChange={(e) => setAgentsDraft((rows) => rows.map((r, i) => (i === idx ? { ...r, brokerage: e.target.value } : r)))} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, gridColumn: isMobile ? undefined : "1 / -1" }} />
                <input placeholder="Price range label" value={a.priceRangeLabel} onChange={(e) => setAgentsDraft((rows) => rows.map((r, i) => (i === idx ? { ...r, priceRangeLabel: e.target.value } : r)))} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14 }} />
                <input placeholder="Recent activity" value={a.recentActivity} onChange={(e) => setAgentsDraft((rows) => rows.map((r, i) => (i === idx ? { ...r, recentActivity: e.target.value } : r)))} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14 }} />
                <input placeholder="Local expertise" value={a.localExpertise} onChange={(e) => setAgentsDraft((rows) => rows.map((r, i) => (i === idx ? { ...r, localExpertise: e.target.value } : r)))} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, gridColumn: isMobile ? undefined : "1 / -1" }} />
                <input placeholder="Specialties (comma-separated)" value={a.specialties} onChange={(e) => setAgentsDraft((rows) => rows.map((r, i) => (i === idx ? { ...r, specialties: e.target.value } : r)))} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, gridColumn: isMobile ? undefined : "1 / -1" }} />
                <input placeholder="Languages (comma-separated)" value={a.languages} onChange={(e) => setAgentsDraft((rows) => rows.map((r, i) => (i === idx ? { ...r, languages: e.target.value } : r)))} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14 }} />
                <input placeholder="Areas (comma-separated)" value={a.areas} onChange={(e) => setAgentsDraft((rows) => rows.map((r, i) => (i === idx ? { ...r, areas: e.target.value } : r)))} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14 }} />
                <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="checkbox" checked={a.team} onChange={(e) => setAgentsDraft((rows) => rows.map((r, i) => (i === idx ? { ...r, team: e.target.checked } : r)))} /> Team
                </label>
                <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="checkbox" checked={a.rentFocus} onChange={(e) => setAgentsDraft((rows) => rows.map((r, i) => (i === idx ? { ...r, rentFocus: e.target.checked } : r)))} /> Rentals
                </label>
                <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="checkbox" checked={a.buyFocus} onChange={(e) => setAgentsDraft((rows) => rows.map((r, i) => (i === idx ? { ...r, buyFocus: e.target.checked } : r)))} /> Buy / invest
                </label>
              </div>
            </div>
          ))}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <button
              type="button"
              onClick={() =>
                setAgentsDraft((rows) => [
                  ...rows,
                  {
                    id: `agent-${Date.now()}`,
                    tab: "experts",
                    name: "",
                    initials: "",
                    team: false,
                    brokerage: "MovEazy · Verified area guide",
                    priceRangeLabel: "",
                    recentActivity: "",
                    localExpertise: "",
                    specialties: "Rentals",
                    languages: "English, Hindi",
                    areas: "",
                    rentFocus: true,
                    buyFocus: false,
                    budgetTier: 2,
                  },
                ])
              }
              style={{ ...btn, background: "#d97706", color: "white" }}
            >
              + Add agent
            </button>
            <button type="button" onClick={() => navigate("/agents")} style={{ ...btn, background: "#e0f2fe", color: "#0369a1" }}>Preview /agents</button>
            <button type="button" onClick={handleSaveAgents} style={{ ...btn, background: "#0284c7", color: "white", fontWeight: 800 }}>Save agents</button>
            {agentsSaveStatus ? <span style={{ fontSize: 13, color: agentsSaveStatus.startsWith("Saved") ? "#15803d" : "#b91c1c" }}>{agentsSaveStatus}</span> : null}
          </div>
        </div>
        )}

        {adminSection === "operations" && (
        <>
        <div style={{ ...sectionCard, marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Queue summary</div>
          <div style={{ fontSize: 13, color: "#475569", display: "flex", flexWrap: "wrap", gap: "10px 22px", lineHeight: 1.6 }}>
            <span><strong>Interests:</strong> {interestsState.length}</span>
            <span><strong>Assignments:</strong> {assignmentsState.length}</span>
            <span><strong>Visit requests:</strong> {visitRequests.length}</span>
            <span><strong>Admin alerts:</strong> {adminNotifs.length}</span>
            <span><strong>Pending seller requests:</strong> {sellerReqs.length}</span>
            <span><strong>Pending badge reviews:</strong> {pendingSellerBadgeApps.length}</span>
          </div>
        </div>
        {pendingSellerBadgeApps.length > 0 && (
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#0f766e", marginBottom: "10px" }}>
              Pending verified seller badge ({pendingSellerBadgeApps.length})
            </div>
            {pendingSellerBadgeApps.map((p) => (
              <div key={p.email} style={{ background: "white", padding: "12px 16px", borderRadius: "8px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", flexDirection: isMobile ? "column" : "row", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>{p.email}</div>
                </div>
                <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                  <button type="button" onClick={() => handleApproveSellerBadge(p.email)} style={{ ...btn, background: "#16a34a", color: "white", fontSize: "12px" }}>Approve badge</button>
                  <button type="button" onClick={() => handleRejectSellerBadge(p.email)} style={{ ...btn, background: "#dc2626", color: "white", fontSize: "12px" }}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {sellerReqs.length > 0 && (
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#dc2626", marginBottom: "10px" }}>Pending Seller Requests ({sellerReqs.length})</div>
            {sellerReqs.map((r) => (
              <div key={r.email} style={{ background: "white", padding: "12px 16px", borderRadius: "8px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", flexDirection: isMobile ? "column" : "row", gap: "10px" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{r.name}</div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>{r.email}</div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => handleApprove(r.email)} style={{ ...btn, background: "#16a34a", color: "white", fontSize: "12px" }}>Approve</button>
                  <button onClick={() => handleReject(r.email)} style={{ ...btn, background: "#dc2626", color: "white", fontSize: "12px" }}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {visitRequests.length > 0 && (
          <div style={{ background: "#fffbeb", padding: "16px", borderRadius: "12px", marginBottom: "16px", border: "1px solid #fcd34d" }}>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#b45309", marginBottom: "10px" }}>Global Visit Requests</div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))", gap: "12px" }}>
              {visitRequests.map((v) => (
                <div key={v.id} style={{ background: "white", padding: "12px", borderRadius: "8px", border: "1px solid #fde68a" }}>
                  <div style={{ fontSize: "13px", color: "#92400e" }}><strong>Time:</strong> {v.visitTime}</div>
                  <div style={{ fontSize: "13px", color: "#92400e" }}><strong>Phone:</strong> {v.customerPhone}</div>
                  <div style={{ fontSize: "12px", color: "#78350f", marginTop: "4px" }}>Customer: {v.customerEmail}</div>
                  <div style={{ fontSize: "12px", color: "#78350f" }}>Seller: {v.sellerEmail}</div>
                  <div style={{ fontSize: "12px", color: "#78350f" }}>Listing: #{v.listingId}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {adminNotifs.length > 0 && (
          <div style={{ ...sectionCard, border: "1px solid #fecdd3", background: "#fff1f2" }}>
            <div style={{ fontSize: "18px", fontWeight: 800, color: "#9f1239", marginBottom: "10px" }}>Admin notifications ({adminNotifs.filter((n) => !n.read).length} unread)</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: 280, overflowY: "auto" }}>
              {adminNotifs.map((n) => (
                <div key={n.id} style={{ background: "white", borderRadius: "10px", padding: "10px 12px", border: n.read ? "1px solid #e2e8f0" : "2px solid #f43f5e", opacity: n.read ? 0.85 : 1 }}>
                  <div style={{ fontWeight: 800, fontSize: "14px", color: "#0f172a" }}>{n.title}</div>
                  <div style={{ fontSize: "13px", color: "#475569", marginTop: "4px", lineHeight: 1.45 }}>{n.body}</div>
                  {!n.read ? (
                    <button type="button" onClick={() => handleNotifRead(n)} style={{ ...btn, marginTop: "8px", background: "#0f172a", color: "white", fontSize: "12px" }}>
                      Mark read
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={sectionCard}>
          <div style={{ fontSize: "18px", fontWeight: 800, marginBottom: "10px", color: "#0f172a" }}>Listing interests and applications</div>
          <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "12px", lineHeight: 1.5 }}>
            Every “Submit interest” from the map is stored here. Update status as your team progresses the lead.
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
            <div style={{ marginTop: "16px" }}>
              <div style={{ fontWeight: 700, marginBottom: "8px", fontSize: "14px" }}>Recent assignments</div>
              <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "13px", color: "#475569", lineHeight: 1.6 }}>
                {assignmentsState.slice(0, 15).map((a) => (
                  <li key={a.id}>
                    {a.listingTitle ? `“${a.listingTitle}”` : `Listing #${a.listingId}`} → {a.customerName ? `${a.customerName} · ` : ""}
                    {a.customerEmail}
                    {a.customerPhone ? ` · ${a.customerPhone}` : ""} · seller {a.sellerName || a.sellerEmail || "—"}
                    {a.sellerContactPhone ? ` (listing phone: ${a.sellerContactPhone})` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        </>
        )}

        {adminSection === "users" && (
        <>
        {/* User Management Section */}
        <div style={sectionCard}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center", marginBottom: "12px" }}>
            <div style={{ fontSize: "18px", fontWeight: 700 }}>Users</div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {[
                ["all", `All (${users.length})`],
                ["admin", `Admins (${adminsList.length})`],
                ["consultant", `Consultants (${consultantsList.length})`],
                ["sub_admin", `Sub-admins (${subAdminsList.length})`],
                ["customer", `Customers (${customersList.length})`],
                ["seller", `Sellers (${sellersList.length})`],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setUserListTab(key)}
                  style={{
                    ...btn,
                    fontSize: "12px",
                    padding: "6px 12px",
                    background: userListTab === key ? "#1e3a8a" : "#f1f5f9",
                    color: userListTab === key ? "white" : "#334155",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "10px", color: "#64748b" }}>Directory · {displayUsers.length} shown</div>
          
          <form onSubmit={handleAddUser} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1fr) minmax(0,1.1fr) minmax(0,1fr) minmax(100px,0.75fr) auto", gap: "10px", marginBottom: "16px" }}>
            <input placeholder="Full Name" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} required style={{ padding: "8px", border: "1px solid #ccc", borderRadius: "6px" }} />
            <input type="email" placeholder="Email Address" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} required style={{ padding: "8px", border: "1px solid #ccc", borderRadius: "6px" }} />
            <input type="tel" placeholder="Phone (optional) — +91 9876543210" value={newUserPhone} onChange={(e) => setNewUserPhone(e.target.value)} style={{ padding: "8px", border: "1px solid #ccc", borderRadius: "6px" }} />
            <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)} style={{ padding: "8px", border: "1px solid #ccc", borderRadius: "6px" }}>
              <option value="customer">Customer</option>
              <option value="seller">Seller / Broker</option>
              <option value="consultant">Consultant (CRM)</option>
              <option value="sub_admin">Sub-admin (CRM + private phones)</option>
              <option value="admin">Admin</option>
            </select>
            <button type="submit" style={{ ...btn, background: "#16a34a", color: "white" }}>Add User</button>
          </form>

          <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
            {displayUsers.map((u) => (
              <div key={u.uid || u.email} style={{ padding: "10px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", flexDirection: isMobile ? "column" : "row", gap: isMobile ? "10px" : 0 }}>
                {editingUserEmail === u.email ? (
                  <form onSubmit={handleUpdateUser} style={{ flex: 1, display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    <input value={editUserForm.name} onChange={(e) => setEditUserForm(p => ({...p, name: e.target.value}))} placeholder="Name" style={{ padding: "6px", border: "1px solid #cbd5e1", borderRadius: "4px" }} />
                    <input value={editUserForm.phone} onChange={(e) => setEditUserForm(p => ({...p, phone: e.target.value}))} placeholder="Phone" style={{ padding: "6px", border: "1px solid #cbd5e1", borderRadius: "4px" }} />
                    <select value={editUserForm.role} onChange={(e) => setEditUserForm(p => ({...p, role: e.target.value}))} style={{ padding: "6px", border: "1px solid #cbd5e1", borderRadius: "4px" }}>
                      <option value="customer">Customer</option>
                      <option value="seller">Seller</option>
                      <option value="consultant">Consultant</option>
                      <option value="sub_admin">Sub-admin</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button type="submit" style={{ ...btn, background: "#16a34a", color: "white", padding: "6px 12px" }}>Save</button>
                    <button type="button" onClick={() => setEditingUserEmail(null)} style={{ ...btn, background: "#94a3b8", color: "white", padding: "6px 12px" }}>Cancel</button>
                  </form>
                ) : (
                  <>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>
                        {u.name}{" "}
                        <span
                          style={{
                            fontSize: "11px",
                            color: "white",
                            background:
                              canonicalRole(u) === "admin"
                                ? "#7c3aed"
                                : canonicalRole(u) === "seller"
                                  ? "#f59e0b"
                                  : canonicalRole(u) === "consultant"
                                    ? "#0d9488"
                                    : canonicalRole(u) === "sub_admin"
                                      ? "#4f46e5"
                                      : "#3b82f6",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            marginLeft: "6px",
                          }}
                        >
                          {canonicalRole(u)}
                        </span>
                        {u.sellerBadgeStatus && canonicalRole(u) === "seller" ? (
                          <span style={{ fontSize: "10px", marginLeft: "6px", color: "#64748b" }}>badge: {u.sellerBadgeStatus}</span>
                        ) : null}
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b", lineHeight: 1.5 }}>
                        <div><strong>Email:</strong> {u.email}</div>
                        <div><strong>Phone:</strong> {u.phone?.trim() ? u.phone : "—"}</div>
                        <div style={{ fontSize: "11px", wordBreak: "break-all" }}><strong>User id:</strong> {u.uid || "—"}</div>
                        {(u.customerOfficeLocation || (Array.isArray(u.customerFlatTypes) && u.customerFlatTypes.length)) ? (
                          <div style={{ fontSize: "11px", color: "#475569", marginTop: "4px" }}>
                            {u.customerOfficeLocation ? <span><strong>Office:</strong> {u.customerOfficeLocation}</span> : null}
                            {Array.isArray(u.customerFlatTypes) && u.customerFlatTypes.length ? (
                              <span>{u.customerOfficeLocation ? " · " : null}<strong>Flat types:</strong> {u.customerFlatTypes.join(", ")}</span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {(canonicalRole(u) === "customer" || canonicalRole(u) === "seller" || canonicalRole(u) === "consultant" || canonicalRole(u) === "sub_admin") && !String(u.uid || "").startsWith("reserved") ? (
                        <button type="button" onClick={() => setHistoryUser(u)} style={{ ...btn, background: "#ecfdf5", color: "#166534", fontSize: "12px", padding: "6px 12px" }}>
                          History
                        </button>
                      ) : null}
                      <button type="button" onClick={() => handleEditUser(u)} style={{ ...btn, background: "#dbeafe", color: "#1d4ed8", fontSize: "12px", padding: "6px 12px" }}>Edit</button>
                      {String(u.uid || "").startsWith("reserved-admin") ? null : (
                        <button type="button" onClick={() => handleRemoveUser(u.email)} style={{ ...btn, background: "#fef2f2", color: "#dc2626", fontSize: "12px", padding: "6px 12px" }}>Remove</button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
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
                  This is the media already saved in Firestore (`images[]`). Use “Listing Media Upload” below to add more.
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
