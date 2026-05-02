import { isFirebaseConfigured } from "./firebase";
import {
  addActivityEventData,
  addInterestRequestData,
  addNotificationData,
} from "./firestoreStore";
import { appendInterestApplication, syncBookingApplicationStatus } from "./userActivity";
import { appendInterestGlobal, appendUserActivityEvent, pushNotificationLocal } from "./store";
import { triggerListingInterestEmails, triggerCustomerApplicationStatusEmail } from "./emailService";

function tenancyLabel(k) {
  const m = {
    entire_unit: "Whole unit",
    seeking_flatmate: "Seeking flatmate",
    open_to_share: "Open to share",
  };
  return m[k] || k || "";
}

/** Human-readable pipeline step for customer dashboard + emails. */
export function interestStatusToCustomerLabel(code) {
  const m = {
    new: "Received — we will review your application",
    contacted: "In progress — our team has reached out",
    visit_scheduled: "Visit scheduled",
    closed_won: "Congratulations — this home is matched to you",
    closed_lost: "Not matched on this listing — you can keep browsing",
    assigned: "Assigned — MovEazy matched you with a broker",
  };
  return m[code] || (code ? String(code).replace(/_/g, " ") : "Updated");
}

/**
 * After admin changes CRM status: sync local booking row, in-app notification, customer email.
 * `row` should still reflect the previous `status` (before the admin update).
 */
export async function notifyCustomerInterestStatusChanged(row, newStatus) {
  const cust = String(row.customerEmail || "").toLowerCase().trim();
  if (!cust) return;
  const prev = row.status || "new";
  const label = interestStatusToCustomerLabel(newStatus);
  syncBookingApplicationStatus(cust, row.listingId, newStatus, label);

  const listingTitle = row.listingTitle || `Listing #${row.listingId}`;
  const title = "Application status update";
  const body = `Your application for “${listingTitle}” is now: ${label}.`;
  const message = `${body} Previous step: ${interestStatusToCustomerLabel(prev)}.`;

  try {
    if (isFirebaseConfigured) {
      await addNotificationData({
        audience: "customer",
        targetEmail: cust,
        title,
        body,
        type: "interest_status",
        meta: { listingId: String(row.listingId), status: newStatus, previousStatus: prev },
      });
    } else {
      pushNotificationLocal({
        audience: "customer",
        targetEmail: cust,
        title,
        body,
        type: "interest_status",
        meta: { listingId: String(row.listingId), status: newStatus },
      });
    }
  } catch (e) {
    console.warn("Customer in-app notification failed", e);
  }

  try {
    await triggerCustomerApplicationStatusEmail({
      to_email: cust,
      customer_name: row.customerName || "there",
      listing_title: String(row.listingTitle || ""),
      listing_id: row.listingId,
      status: newStatus,
      status_label: label,
      previous_status: interestStatusToCustomerLabel(prev),
      message,
    });
  } catch (e) {
    console.warn("Customer status email failed", e);
  }
}

/** After admin assigns a customer to a listing + broker. */
export async function notifyCustomerListingAssigned({ customerEmail, listingId, listingTitle, notes, sellerEmail }) {
  const cust = String(customerEmail || "").toLowerCase().trim();
  if (!cust) return;
  const title = "You have been matched to a listing";
  const lt = listingTitle || `Listing #${listingId}`;
  const broker = String(sellerEmail || "").trim().toLowerCase();
  const body = `An admin assigned you to “${lt}”.${broker ? ` Broker contact: ${broker}.` : ""}${notes ? ` Note: ${notes}` : ""}`;
  syncBookingApplicationStatus(cust, listingId, "assigned", interestStatusToCustomerLabel("assigned"));

  try {
    if (isFirebaseConfigured) {
      await addNotificationData({
        audience: "customer",
        targetEmail: cust,
        title,
        body,
        type: "assignment",
        meta: { listingId: String(listingId), sellerEmail: broker },
      });
    } else {
      pushNotificationLocal({
        audience: "customer",
        targetEmail: cust,
        title,
        body,
        type: "assignment",
        meta: { listingId: String(listingId) },
      });
    }
  } catch (e) {
    console.warn("Customer assignment notification failed", e);
  }

  try {
    await triggerCustomerApplicationStatusEmail({
      to_email: cust,
      customer_name: "there",
      listing_title: String(listingTitle || ""),
      listing_id: listingId,
      status: "assigned",
      status_label: interestStatusToCustomerLabel("assigned"),
      previous_status: "—",
      message: body,
    });
  } catch (e) {
    console.warn("Customer assignment email failed", e);
  }
}

/**
 * Persists a renter interest (local bookings + CRM + optional emails).
 * Call after the user submits interest from the listing modal.
 */
export async function submitListingInterestFull(user, payload) {
  const created = appendInterestApplication(user, payload);
  const customerEmail = created.customerEmail;
  const customerName = created.customerName;
  const summary = `Interest in “${payload.listingTitle || "Listing"}” (#${payload.listingId})`;

  try {
    await triggerListingInterestEmails({
      listingId: payload.listingId,
      listingTitle: payload.listingTitle,
      customerEmail,
      customerName,
      sellerEmail: payload.sellerEmail,
      sellerName: payload.seller,
      preference: tenancyLabel(created.tenancyPreference),
      adultsSharing: created.adultsSharing,
      notes: created.notes,
    });
  } catch (e) {
    console.warn("Interest email delivery:", e);
  }

  const interestRow = {
    listingId: String(payload.listingId),
    listingTitle: payload.listingTitle,
    customerEmail,
    customerName,
    sellerEmail: (payload.sellerEmail || "").trim().toLowerCase(),
    seller: payload.seller || "",
    contact: payload.contact || "",
    tenancyPreference: created.tenancyPreference,
    adultsSharing: created.adultsSharing,
    notes: created.notes,
    status: "new",
    source: "map_modal",
    submittedAt: created.date,
  };

  if (isFirebaseConfigured) {
    try {
      await addInterestRequestData(interestRow);
      await addNotificationData({
        audience: "admin",
        title: "New listing interest",
        body: `${customerName} (${customerEmail}) applied for “${payload.listingTitle}”.`,
        type: "listing_interest",
        meta: { listingId: String(payload.listingId), customerEmail },
      });
      if (payload.sellerEmail?.trim()) {
        await addNotificationData({
          audience: "seller",
          targetEmail: payload.sellerEmail.trim().toLowerCase(),
          title: "New renter interest",
          body: `${customerName} submitted interest for “${payload.listingTitle}”. Open your seller dashboard.`,
          type: "listing_interest",
          meta: { listingId: String(payload.listingId), customerEmail },
        });
      }
      await addActivityEventData({
        actorEmail: customerEmail,
        type: "interest_submitted",
        summary,
        meta: {
          listingId: String(payload.listingId),
          tenancyPreference: created.tenancyPreference,
          adultsSharing: created.adultsSharing,
        },
      });
    } catch (e) {
      console.error("CRM Firestore sync failed", e);
    }
  } else {
    appendInterestGlobal({ ...interestRow, id: `i-${Date.now()}`, createdAt: created.date });
    pushNotificationLocal({
      audience: "admin",
      title: "New listing interest",
      body: `${customerName} (${customerEmail}) → “${payload.listingTitle}”.`,
      type: "listing_interest",
      meta: { listingId: String(payload.listingId) },
    });
    if (payload.sellerEmail?.trim()) {
      pushNotificationLocal({
        audience: "seller",
        targetEmail: payload.sellerEmail.trim().toLowerCase(),
        title: "New renter interest",
        body: `${customerName} → “${payload.listingTitle}”.`,
        type: "listing_interest",
        meta: { listingId: String(payload.listingId), customerEmail },
      });
    }
    appendUserActivityEvent({
      actorEmail: customerEmail,
      type: "interest_submitted",
      summary,
      meta: { listingId: String(payload.listingId) },
    });
  }

  return created;
}

/** Log heart save/unsave for admin “user journey” (best-effort). */
export async function logSavedListingChange(user, listingId, added, listingTitle = "") {
  const email = (user?.email || "").trim().toLowerCase() || "guest@local.moveasy";
  const name = (user?.name || "").trim() || "Guest";
  const summary = added
    ? `Saved listing #${listingId}${listingTitle ? ` — ${listingTitle}` : ""}`
    : `Removed save for #${listingId}`;
  if (isFirebaseConfigured) {
    try {
      await addActivityEventData({
        actorEmail: email,
        type: added ? "listing_saved" : "listing_unsaved",
        summary,
        meta: { listingId: String(listingId), listingTitle: String(listingTitle || "").slice(0, 200) },
      });
    } catch {
      /* ignore */
    }
  } else {
    appendUserActivityEvent({
      actorEmail: email,
      type: added ? "listing_saved" : "listing_unsaved",
      summary,
      meta: { listingId: String(listingId), displayName: name },
    });
  }
}
