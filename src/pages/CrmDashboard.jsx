import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../components/layout/PageShell";
import { useAuth } from "../context/AuthContext";
import { isFirebaseConfigured } from "../lib/firebase";
import {
  addCrmTaskData,
  addNotificationData,
  createCrmLeadData,
  getAdminNotificationsData,
  getConsultantNotificationsData,
  getCrmLeadsForStaff,
  getCrmTasksForStaff,
  markNotificationReadData,
  setCrmTaskCompletedData,
  updateCrmLeadData,
} from "../lib/firestoreStore";

const STATUS_OPTIONS = ["new", "contacted", "not_visited", "visited", "follow_up", "won", "lost", "on_hold"];
const VISIT_OPTIONS = ["not_visited", "visited"];

function formatTs(ts) {
  if (ts?.toDate) return ts.toDate().toLocaleString();
  if (ts?.toMillis) return new Date(ts.toMillis()).toLocaleString();
  if (typeof ts === "string") return new Date(ts).toLocaleString();
  return "—";
}

function digitsForWa(phone) {
  const d = String(phone || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.length === 10) return `91${d}`;
  return d;
}

export default function CrmDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("leads");
  const [leads, setLeads] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [tick, setTick] = useState(0);
  const [savingId, setSavingId] = useState(null);
  const [msg, setMsg] = useState("");

  const isAdmin = user?.role === "admin";
  const isConsultant = user?.role === "consultant";

  const [newLead, setNewLead] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    assigneeEmail: "",
    assigneeName: "",
    requirements: "",
    visitStatus: "not_visited",
    status: "new",
    nextFollowUpAt: "",
  });

  const [taskDraft, setTaskDraft] = useState({ leadId: "", title: "", dueAt: "", assigneeEmail: "" });

  const load = async () => {
    if (!isFirebaseConfigured || !user) return;
    try {
      const [l, t] = await Promise.all([getCrmLeadsForStaff(user), getCrmTasksForStaff(user)]);
      setLeads(l);
      setTasks(t);
      if (isConsultant || isAdmin) {
        const n = isConsultant ? await getConsultantNotificationsData(user.email) : [];
        setNotifs(n);
      }
    } catch (e) {
      setMsg(String(e?.message || e || "Load failed"));
    }
  };

  useEffect(() => {
    load();
  }, [user, tick]);

  const openTasks = useMemo(() => tasks.filter((t) => !t.completed), [tasks]);

  const saveLeadPatch = async (id, patch) => {
    setSavingId(id);
    setMsg("");
    try {
      await updateCrmLeadData(id, patch, user);
      setTick((x) => x + 1);
    } catch (e) {
      setMsg(String(e?.message || e));
    } finally {
      setSavingId(null);
    }
  };

  const createLead = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    setMsg("");
    try {
      await createCrmLeadData(newLead, user);
      setNewLead({
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        assigneeEmail: "",
        assigneeName: "",
        requirements: "",
        visitStatus: "not_visited",
        status: "new",
        nextFollowUpAt: "",
      });
      setTick((x) => x + 1);
      setMsg("Lead created.");
    } catch (err) {
      setMsg(String(err?.message || err));
    }
  };

  const addTask = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!taskDraft.leadId || !taskDraft.assigneeEmail) {
      setMsg("Pick a lead and assignee email for the task.");
      return;
    }
    setMsg("");
    try {
      const due = taskDraft.dueAt ? new Date(taskDraft.dueAt) : null;
      await addCrmTaskData(
        {
          leadId: taskDraft.leadId,
          title: taskDraft.title || "Follow up call",
          dueAt: due,
          assigneeEmail: taskDraft.assigneeEmail,
        },
        user
      );
      const assignee = taskDraft.assigneeEmail.trim().toLowerCase();
      const taskTitle = taskDraft.title || "Follow up";
      await addNotificationData({
        audience: "consultant",
        targetEmail: assignee,
        title: "CRM follow-up task",
        body: `New task: ${taskTitle} (lead #${taskDraft.leadId.slice(0, 8)}…).`,
        type: "crm_task",
        meta: { leadId: taskDraft.leadId, taskTitle },
      });
      await addNotificationData({
        audience: "admin",
        targetEmail: "",
        title: "CRM follow-up scheduled",
        body: `${assignee} · ${taskTitle} · lead #${taskDraft.leadId.slice(0, 8)}…`,
        type: "crm_task",
        meta: { leadId: taskDraft.leadId, taskTitle, assigneeEmail: assignee },
      });
      setTaskDraft({ leadId: "", title: "", dueAt: "", assigneeEmail: "" });
      setTick((x) => x + 1);
      setMsg("Task added and consultant notified in-app.");
    } catch (err) {
      setMsg(String(err?.message || err));
    }
  };

  const toggleTask = async (task) => {
    try {
      await setCrmTaskCompletedData(task.id, !task.completed, user);
      setTick((x) => x + 1);
    } catch (e) {
      setMsg(String(e?.message || e));
    }
  };

  const markRead = async (n) => {
    try {
      await markNotificationReadData(n.id);
      setTick((x) => x + 1);
    } catch (e) {
      setMsg(String(e?.message || e));
    }
  };

  if (!user || (!isAdmin && !isConsultant)) {
    return (
      <PageShell variant="marketing" overlayOnly className="bg-slate-100">
        <div style={{ padding: 40, textAlign: "center" }}>
          <p style={{ color: "#64748b" }}>This area is for staff only.</p>
          <button type="button" onClick={() => navigate("/login")} style={{ marginTop: 16, padding: "10px 20px", fontWeight: 700 }}>
            Sign in
          </button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell variant="marketing" overlayOnly className="bg-slate-100 min-h-screen">
      <div style={{ background: "#000", color: "#e5e5e5", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontWeight: 800, fontSize: 18 }}>
          Mov<span style={{ color: "#ff3131" }}>EAZY</span> · Staff CRM
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {isAdmin ? (
            <button type="button" onClick={() => navigate("/admin")} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #52525b", background: "#262626", color: "#fafafa", fontWeight: 700, fontSize: 12 }}>
              Admin
            </button>
          ) : null}
          <button type="button" onClick={() => navigate("/map")} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #52525b", background: "#262626", color: "#fafafa", fontWeight: 700, fontSize: 12 }}>
            Map
          </button>
          <button type="button" onClick={() => { logout(); navigate("/login"); }} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #991b1b", background: "#450a0a", color: "#fecaca", fontWeight: 700, fontSize: 12 }}>
            Logout
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 16px 48px" }}>
        <p style={{ color: "#64748b", fontSize: 14, marginBottom: 16, lineHeight: 1.5 }}>
          Track customers, visit status, requirements, and consultant follow-ups. Alerts use the in-app notification feed; use{" "}
          <strong>WhatsApp</strong> for instant pings (opens wa.me with a prefilled message). Customers never see this page — deploy latest{" "}
          <strong>Firestore rules</strong> so `crmLeads` / `crmTasks` stay staff-only.
        </p>

        {msg ? (
          <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 10, background: "#fef9c3", color: "#854d0e", fontSize: 13 }}>{msg}</div>
        ) : null}

        <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
          {[
            ["leads", `Leads (${leads.length})`],
            ["tasks", `Follow-ups (${openTasks.length} open)`],
            ...(isConsultant || isAdmin ? [["alerts", `Alerts (${notifs.filter((n) => !n.read).length} unread)`]] : []),
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                border: `1px solid ${tab === id ? "#1e3a8a" : "#cbd5e1"}`,
                background: tab === id ? "#1e3a8a" : "#fff",
                color: tab === id ? "#fff" : "#334155",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "leads" && isAdmin ? (
          <form onSubmit={createLead} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, marginBottom: 20, display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
            <div style={{ gridColumn: "1 / -1", fontWeight: 800, color: "#0f172a" }}>Add lead (admin)</div>
            <input required placeholder="Customer name" value={newLead.customerName} onChange={(e) => setNewLead((p) => ({ ...p, customerName: e.target.value }))} style={{ padding: 8, borderRadius: 8, border: "1px solid #cbd5e1" }} />
            <input required type="email" placeholder="Customer email" value={newLead.customerEmail} onChange={(e) => setNewLead((p) => ({ ...p, customerEmail: e.target.value }))} style={{ padding: 8, borderRadius: 8, border: "1px solid #cbd5e1" }} />
            <input placeholder="Customer phone" value={newLead.customerPhone} onChange={(e) => setNewLead((p) => ({ ...p, customerPhone: e.target.value }))} style={{ padding: 8, borderRadius: 8, border: "1px solid #cbd5e1" }} />
            <input required type="email" placeholder="Consultant email (assignee)" value={newLead.assigneeEmail} onChange={(e) => setNewLead((p) => ({ ...p, assigneeEmail: e.target.value }))} style={{ padding: 8, borderRadius: 8, border: "1px solid #cbd5e1" }} />
            <input placeholder="Consultant display name" value={newLead.assigneeName} onChange={(e) => setNewLead((p) => ({ ...p, assigneeName: e.target.value }))} style={{ padding: 8, borderRadius: 8, border: "1px solid #cbd5e1" }} />
            <select value={newLead.visitStatus} onChange={(e) => setNewLead((p) => ({ ...p, visitStatus: e.target.value }))} style={{ padding: 8, borderRadius: 8, border: "1px solid #cbd5e1" }}>
              {VISIT_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {v === "not_visited" ? "Not visited" : "Visited"}
                </option>
              ))}
            </select>
            <select value={newLead.status} onChange={(e) => setNewLead((p) => ({ ...p, status: e.target.value }))} style={{ padding: 8, borderRadius: 8, border: "1px solid #cbd5e1" }}>
              {STATUS_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            <input type="datetime-local" value={newLead.nextFollowUpAt} onChange={(e) => setNewLead((p) => ({ ...p, nextFollowUpAt: e.target.value }))} style={{ padding: 8, borderRadius: 8, border: "1px solid #cbd5e1" }} />
            <textarea placeholder="Requirements (BHK, budget, area…)" value={newLead.requirements} onChange={(e) => setNewLead((p) => ({ ...p, requirements: e.target.value }))} style={{ gridColumn: "1 / -1", minHeight: 72, padding: 8, borderRadius: 8, border: "1px solid #cbd5e1" }} />
            <button type="submit" style={{ gridColumn: "1 / -1", padding: "10px 16px", borderRadius: 10, background: "#16a34a", color: "#fff", fontWeight: 800, border: "none", cursor: "pointer" }}>
              Save lead
            </button>
          </form>
        ) : null}

        {tab === "leads" ? (
          <div style={{ overflowX: "auto", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", background: "#f8fafc", color: "#64748b" }}>
                  <th style={{ padding: 10 }}>Customer</th>
                  <th style={{ padding: 10 }}>Consultant</th>
                  <th style={{ padding: 10 }}>Visit</th>
                  <th style={{ padding: 10 }}>Status</th>
                  <th style={{ padding: 10 }}>Next follow-up</th>
                  <th style={{ padding: 10 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((row) => (
                  <LeadRow key={row.id} row={row} isAdmin={isAdmin} savingId={savingId} onPatch={saveLeadPatch} />
                ))}
              </tbody>
            </table>
            {leads.length === 0 ? <div style={{ padding: 24, color: "#64748b", textAlign: "center" }}>No leads yet. Admins can add one above.</div> : null}
          </div>
        ) : null}

        {tab === "tasks" ? (
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 }}>
            {isAdmin ? (
              <form onSubmit={addTask} style={{ display: "grid", gap: 10, marginBottom: 20, gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
                <div style={{ gridColumn: "1 / -1", fontWeight: 800 }}>Schedule follow-up (admin)</div>
                <select required value={taskDraft.leadId} onChange={(e) => setTaskDraft((p) => ({ ...p, leadId: e.target.value }))} style={{ padding: 8, borderRadius: 8, border: "1px solid #cbd5e1" }}>
                  <option value="">Select lead…</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.customerName} — {l.customerEmail}
                    </option>
                  ))}
                </select>
                <input placeholder="Task title" value={taskDraft.title} onChange={(e) => setTaskDraft((p) => ({ ...p, title: e.target.value }))} style={{ padding: 8, borderRadius: 8, border: "1px solid #cbd5e1" }} />
                <input type="datetime-local" value={taskDraft.dueAt} onChange={(e) => setTaskDraft((p) => ({ ...p, dueAt: e.target.value }))} style={{ padding: 8, borderRadius: 8, border: "1px solid #cbd5e1" }} />
                <input required type="email" placeholder="Consultant email" value={taskDraft.assigneeEmail} onChange={(e) => setTaskDraft((p) => ({ ...p, assigneeEmail: e.target.value }))} style={{ padding: 8, borderRadius: 8, border: "1px solid #cbd5e1" }} />
                <button type="submit" style={{ padding: "10px 16px", borderRadius: 10, background: "#1e3a8a", color: "#fff", fontWeight: 800, border: "none", cursor: "pointer" }}>
                  Add task + notify
                </button>
              </form>
            ) : null}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {tasks.map((t) => (
                <div key={t.id} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center", opacity: t.completed ? 0.65 : 1 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{t.title}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      Lead: {t.leadId?.slice(0, 8)}… · Due: {formatTs(t.dueAt)} · Assignee: {t.assigneeEmail}
                    </div>
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, cursor: "pointer" }}>
                    <input type="checkbox" checked={Boolean(t.completed)} onChange={() => toggleTask(t)} />
                    Done
                  </label>
                </div>
              ))}
              {tasks.length === 0 ? <div style={{ color: "#64748b" }}>No tasks.</div> : null}
            </div>
          </div>
        ) : null}

        {tab === "alerts" && (isConsultant || isAdmin) ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {notifs.map((n) => (
              <div key={n.id} style={{ border: n.read ? "1px solid #e2e8f0" : "2px solid #2563eb", borderRadius: 12, padding: 14, background: "#fff" }}>
                <div style={{ fontWeight: 800 }}>{n.title}</div>
                <div style={{ fontSize: 14, color: "#475569", marginTop: 6 }}>{n.body}</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>{formatTs(n.createdAt)}</div>
                {!n.read ? (
                  <button type="button" onClick={() => markRead(n)} style={{ marginTop: 10, padding: "6px 12px", borderRadius: 8, background: "#0f172a", color: "#fff", fontWeight: 700, fontSize: 12, border: "none", cursor: "pointer" }}>
                    Mark done (read)
                  </button>
                ) : null}
              </div>
            ))}
            {notifs.length === 0 ? <div style={{ color: "#64748b" }}>No alerts.</div> : null}
          </div>
        ) : null}
      </div>
    </PageShell>
  );
}

function toDatetimeLocalValue(ts) {
  let d = null;
  if (ts?.toDate) d = ts.toDate();
  else if (typeof ts?.seconds === "number") d = new Date(ts.seconds * 1000);
  if (!d || Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function LeadRow({ row, isAdmin, savingId, onPatch }) {
  const [visitStatus, setVisitStatus] = useState(row.visitStatus || "not_visited");
  const [status, setStatus] = useState(row.status || "new");
  const [requirements, setRequirements] = useState(row.requirements || "");
  const [consultantNotes, setConsultantNotes] = useState(row.consultantNotes || "");
  const [adminNotes, setAdminNotes] = useState(row.adminNotes || "");
  const [listingTitle, setListingTitle] = useState(row.listingVisitedTitle || "");
  const [nextFollowUp, setNextFollowUp] = useState(() => toDatetimeLocalValue(row.nextFollowUpAt));

  useEffect(() => {
    setVisitStatus(row.visitStatus || "not_visited");
    setStatus(row.status || "new");
    setRequirements(row.requirements || "");
    setConsultantNotes(row.consultantNotes || "");
    setAdminNotes(row.adminNotes || "");
    setListingTitle(row.listingVisitedTitle || "");
    setNextFollowUp(toDatetimeLocalValue(row.nextFollowUpAt));
  }, [row]);

  const wa = digitsForWa(row.customerPhone);
  const waHref = wa
    ? `https://wa.me/${wa}?text=${encodeURIComponent(`Hi ${row.customerName || "there"}, this is Moveazy follow-up regarding your home search.`)}`
    : "";

  return (
    <Fragment>
    <tr style={{ borderTop: "1px solid #f1f5f9", verticalAlign: "top" }}>
      <td style={{ padding: 10 }}>
        <div style={{ fontWeight: 700 }}>{row.customerName}</div>
        <div style={{ fontSize: 12, color: "#64748b" }}>{row.customerEmail}</div>
        <div style={{ fontSize: 12 }}>{row.customerPhone || "—"}</div>
      </td>
      <td style={{ padding: 10, fontSize: 12 }}>
        {row.assigneeName || "—"}
        <br />
        {row.assigneeEmail}
      </td>
      <td style={{ padding: 10 }}>
        <select value={visitStatus} onChange={(e) => setVisitStatus(e.target.value)} style={{ width: "100%", padding: 6, borderRadius: 6, border: "1px solid #cbd5e1" }}>
          {VISIT_OPTIONS.map((v) => (
            <option key={v} value={v}>
              {v === "not_visited" ? "Not visited" : "Visited"}
            </option>
          ))}
        </select>
      </td>
      <td style={{ padding: 10 }}>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: "100%", padding: 6, borderRadius: 6, border: "1px solid #cbd5e1" }}>
          {STATUS_OPTIONS.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </td>
      <td style={{ padding: 10 }}>
        <input type="datetime-local" value={nextFollowUp} onChange={(e) => setNextFollowUp(e.target.value)} style={{ width: "100%", padding: 6, borderRadius: 6, border: "1px solid #cbd5e1" }} />
      </td>
      <td style={{ padding: 10, minWidth: 140 }}>
        <button
          type="button"
          disabled={savingId === row.id}
          onClick={() =>
            onPatch(row.id, {
              visitStatus,
              status,
              requirements,
              consultantNotes,
              adminNotes: isAdmin ? adminNotes : undefined,
              listingVisitedTitle: listingTitle,
              nextFollowUpAt: nextFollowUp ? new Date(nextFollowUp) : null,
            })
          }
          style={{ width: "100%", padding: "8px 10px", borderRadius: 8, background: "#1e3a8a", color: "#fff", fontWeight: 700, border: "none", cursor: "pointer", marginBottom: 6 }}
        >
          Save row
        </button>
        {waHref ? (
          <a href={waHref} target="_blank" rel="noopener noreferrer" style={{ display: "block", textAlign: "center", padding: "8px 10px", borderRadius: 8, background: "#22c55e", color: "#fff", fontWeight: 700, fontSize: 12, textDecoration: "none" }}>
            WhatsApp
          </a>
        ) : (
          <span style={{ fontSize: 11, color: "#94a3b8" }}>Add phone for WhatsApp</span>
        )}
      </td>
    </tr>
    <tr style={{ background: "#fafafa", borderTop: "1px solid #f1f5f9" }}>
      <td colSpan={6} style={{ padding: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6 }}>Requirements &amp; notes</div>
        <textarea value={requirements} onChange={(e) => setRequirements(e.target.value)} placeholder="Customer requirements (BHK, budget, localities…)" rows={2} style={{ width: "100%", marginBottom: 8, padding: 8, borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }} />
        <textarea value={consultantNotes} onChange={(e) => setConsultantNotes(e.target.value)} placeholder="Consultant follow-up notes" rows={2} style={{ width: "100%", marginBottom: 8, padding: 8, borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }} />
        {isAdmin ? (
          <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Admin-only notes" rows={2} style={{ width: "100%", marginBottom: 8, padding: 8, borderRadius: 8, border: "1px solid #fecaca", fontSize: 13 }} />
        ) : null}
        <input value={listingTitle} onChange={(e) => setListingTitle(e.target.value)} placeholder="Property visited (title)" style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }} />
      </td>
    </tr>
    </Fragment>
  );
}
