import { useEffect, useMemo, useState } from "react";
import Login from "./Login";
import { api, clearToken, getToken } from "./api";

/** ---------- Toast helpers ---------- */
function Toasts({ items, onClose }) {
  const s = {
    wrap: { position: "fixed", right: 16, top: 16, display: "grid", gap: 10, zIndex: 9999 },
    toast: (type) => ({
      minWidth: 280,
      maxWidth: 380,
      padding: "12px 12px",
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.12)",
      background:
        type === "success"
          ? "rgba(16,185,129,0.14)"
          : type === "error"
          ? "rgba(239,68,68,0.14)"
          : "rgba(255,255,255,0.08)",
      backdropFilter: "blur(10px)",
      boxShadow: "0 18px 60px rgba(0,0,0,0.45)",
      color: "#e5e7eb",
      display: "flex",
      gap: 10,
      alignItems: "flex-start",
    }),
    title: { fontWeight: 800, fontSize: 13, margin: 0 },
    msg: { margin: "2px 0 0 0", opacity: 0.85, fontSize: 13, lineHeight: 1.25 },
    close: {
      marginLeft: "auto",
      border: "1px solid rgba(255,255,255,0.14)",
      background: "rgba(0,0,0,0.18)",
      color: "#e5e7eb",
      borderRadius: 10,
      padding: "6px 10px",
      cursor: "pointer",
    },
  };

  return (
    <div style={s.wrap}>
      {items.map((t) => (
        <div key={t.id} style={s.toast(t.type)}>
          <div>
            <p style={s.title}>
              {t.type === "success" ? "✅ Success" : t.type === "error" ? "⛔ Error" : "ℹ️ Info"}
            </p>
            <p style={s.msg}>{t.message}</p>
          </div>
          <button style={s.close} onClick={() => onClose(t.id)}>
            Close
          </button>
        </div>
      ))}
    </div>
  );
}

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function statusLabel(s) {
  const v = (s || "applied").toLowerCase();
  if (v === "interview") return "Interview";
  if (v === "offer") return "Offer";
  if (v === "rejected") return "Rejected";
  return "Applied";
}

function StatusBadge({ status }) {
  const v = (status || "applied").toLowerCase();
  const badge =
    {
      applied: { bg: "rgba(99,102,241,0.18)", bd: "rgba(99,102,241,0.55)", fg: "#c7d2fe" },
      interview: { bg: "rgba(251,191,36,0.16)", bd: "rgba(251,191,36,0.45)", fg: "#fde68a" },
      offer: { bg: "rgba(16,185,129,0.16)", bd: "rgba(16,185,129,0.45)", fg: "#a7f3d0" },
      rejected: { bg: "rgba(239,68,68,0.14)", bd: "rgba(239,68,68,0.45)", fg: "#fecaca" },
    }[v] || { bg: "rgba(255,255,255,0.10)", bd: "rgba(255,255,255,0.14)", fg: "#e5e7eb" };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 999,
        border: `1px solid ${badge.bd}`,
        background: badge.bg,
        color: badge.fg,
        fontSize: 12,
        fontWeight: 800,
        width: "fit-content",
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 99, background: badge.fg, opacity: 0.9 }} />
      {statusLabel(v)}
    </span>
  );
}

/** ---------- Search highlight ---------- */
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function Highlight({ text, query }) {
  const t = (text ?? "").toString();
  const q = (query ?? "").trim();
  if (!q) return t;

  // highlight multi-word queries by splitting and matching any word
  const words = q.split(/\s+/).filter(Boolean);
  if (words.length === 0) return t;

  const re = new RegExp(`(${words.map(escapeRegExp).join("|")})`, "ig");
  const parts = t.split(re);

  const markStyle = {
    background: "rgba(251,191,36,0.22)",
    border: "1px solid rgba(251,191,36,0.35)",
    color: "#fde68a",
    padding: "1px 4px",
    borderRadius: 6,
  };

  return parts.map((p, i) =>
    re.test(p) ? (
      <mark key={i} style={markStyle}>
        {p}
      </mark>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

/** ---------- CSV export ---------- */
function csvEscape(v) {
  const s = (v ?? "").toString();
  if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function downloadCSV(filename, rows) {
  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** ---------- Favorites (localStorage) ---------- */
function favKey() {
  // per-browser key; if you later want per-user, we can include user id/email
  return "jobtracker:favorites";
}
function loadFavorites() {
  try {
    const raw = localStorage.getItem(favKey());
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(arr.map((x) => Number(x)).filter((n) => Number.isFinite(n)));
  } catch {
    return new Set();
  }
}
function saveFavorites(set) {
  localStorage.setItem(favKey(), JSON.stringify([...set]));
}

export default function App() {
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState([]);
  function pushToast(type, message) {
    const id = makeId();
    setToasts((x) => [...x, { id, type, message }]);
    setTimeout(() => setToasts((x) => x.filter((t) => t.id !== id)), 3500);
  }
  function closeToast(id) {
    setToasts((x) => x.filter((t) => t.id !== id));
  }

  // Favorites
  const [favorites, setFavorites] = useState(() => loadFavorites());
  function toggleFavorite(jobId) {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      saveFavorites(next);
      return next;
    });
  }

  // Create form state
  const [company, setCompany] = useState("");
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("applied");
  const [location, setLocation] = useState("");
  const [link, setLink] = useState("");
  const [notes, setNotes] = useState("");
  const [appliedDate, setAppliedDate] = useState("");

  // Edit modal
  const [editing, setEditing] = useState(null);

  // Search/filter/sort
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFavOnly, setShowFavOnly] = useState(false);
  const [sortBy, setSortBy] = useState("newest"); // newest | oldest | company_az | status

  // Pagination
  const [pageSize, setPageSize] = useState(8);
  const [page, setPage] = useState(1);

  const isLoggedIn = !!getToken();

  async function loadJobs() {
    setError("");
    setLoading(true);
    try {
      const r = await api.listJobs();
      setJobs(r.jobs || []);
    } catch (e) {
      setError(e.message);
      pushToast("error", e.message);
      if ((e.message || "").toLowerCase().includes("unauthorized")) {
        clearToken();
        setJobs([]);
        setEditing(null);
        pushToast("info", "Session expired. Please login again.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isLoggedIn) loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreate(e) {
    e.preventDefault();
    setError("");

    if (!company.trim() || !title.trim()) {
      setError("Company and Title are required.");
      pushToast("error", "Company and Title are required.");
      return;
    }

    try {
      await api.createJob({
        company: company.trim(),
        title: title.trim(),
        status,
        location: location.trim() || null,
        link: link.trim() || null,
        notes: notes.trim() || null,
        applied_date: appliedDate || null,
      });

      setCompany("");
      setTitle("");
      setStatus("applied");
      setLocation("");
      setLink("");
      setNotes("");
      setAppliedDate("");

      await loadJobs();
      pushToast("success", "Job added!");
    } catch (e2) {
      setError(e2.message);
      pushToast("error", e2.message);
    }
  }

  function startEdit(job) {
    setEditing({
      ...job,
      status: (job.status || "applied").toLowerCase(),
      applied_date: job.applied_date || "",
    });
  }

  function cancelEdit() {
    setEditing(null);
  }

  async function saveEdit() {
    setError("");
    if (!editing.company?.trim() || !editing.title?.trim()) {
      setError("Company and Title are required.");
      pushToast("error", "Company and Title are required.");
      return;
    }

    try {
      await api.updateJob(editing.id, {
        company: editing.company.trim(),
        title: editing.title.trim(),
        status: editing.status || "applied",
        location: editing.location?.trim() || null,
        link: editing.link?.trim() || null,
        notes: editing.notes?.trim() || null,
        applied_date: editing.applied_date || null,
      });
      setEditing(null);
      await loadJobs();
      pushToast("success", "Job updated!");
    } catch (e) {
      setError(e.message);
      pushToast("error", e.message);
    }
  }

  async function removeJob(id) {
    setError("");
    if (!window.confirm("Delete this job?")) return;
    try {
      await api.deleteJob(id);
      // also remove from favorites locally
      setFavorites((prev) => {
        const next = new Set(prev);
        next.delete(id);
        saveFavorites(next);
        return next;
      });
      await loadJobs();
      pushToast("success", "Job deleted!");
    } catch (e) {
      setError(e.message);
      pushToast("error", e.message);
    }
  }

  async function quickStatus(id, newStatus) {
    const job = jobs.find((j) => j.id === id);
    if (!job) return;
    try {
      await api.updateJob(id, {
        company: job.company,
        title: job.title,
        status: newStatus,
        location: job.location,
        link: job.link,
        notes: job.notes,
        applied_date: job.applied_date,
      });
      await loadJobs();
      pushToast("success", `Status updated → ${statusLabel(newStatus)}`);
    } catch (e) {
      setError(e.message);
      pushToast("error", e.message);
    }
  }

  const stats = useMemo(() => {
    const counts = { applied: 0, interview: 0, offer: 0, rejected: 0 };
    for (const j of jobs) {
      const s = (j.status || "applied").toLowerCase();
      if (counts[s] !== undefined) counts[s]++;
    }
    return counts;
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = [...jobs];

    if (showFavOnly) list = list.filter((j) => favorites.has(j.id));

    if (statusFilter !== "all") {
      list = list.filter((j) => (j.status || "applied").toLowerCase() === statusFilter);
    }

    if (needle) {
      list = list.filter((j) => {
        const blob = [j.company, j.title, j.location, j.notes, j.link, j.status, j.applied_date]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return blob.includes(needle);
      });
    }

    const safeStr = (v) => (v || "").toString().toLowerCase();

    if (sortBy === "company_az") list.sort((a, b) => safeStr(a.company).localeCompare(safeStr(b.company)));
    else if (sortBy === "status") list.sort((a, b) => safeStr(a.status).localeCompare(safeStr(b.status)));
    else if (sortBy === "oldest") list.sort((a, b) => (a.id || 0) - (b.id || 0));
    else list.sort((a, b) => (b.id || 0) - (a.id || 0));

    // ⭐ Favorites pinned to top (after chosen sort)
    list.sort((a, b) => Number(favorites.has(b.id)) - Number(favorites.has(a.id)));

    return list;
  }, [jobs, q, statusFilter, sortBy, showFavOnly, favorites]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / pageSize));
  useEffect(() => setPage(1), [q, statusFilter, sortBy, pageSize, showFavOnly]);

  const pagedJobs = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredJobs.slice(start, start + pageSize);
  }, [filteredJobs, page, pageSize]);

  // Styles
  const s = {
    page: {
      minHeight: "100vh",
      background:
        "radial-gradient(1200px 600px at 20% 0%, rgba(99,102,241,0.18), transparent 60%), radial-gradient(1000px 500px at 80% 10%, rgba(16,185,129,0.14), transparent 55%), #0b1020",
      color: "#e5e7eb",
      padding: "28px 16px",
    },
    shell: { maxWidth: 1100, margin: "0 auto" },
    header: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18 },
    brand: { display: "flex", alignItems: "center", gap: 12 },
    logo: {
      width: 42,
      height: 42,
      borderRadius: 12,
      background: "linear-gradient(135deg, rgba(99,102,241,1), rgba(16,185,129,1))",
      boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
    },
    h1: { fontSize: 22, margin: 0, letterSpacing: 0.2 },
    sub: { margin: "3px 0 0 0", opacity: 0.7, fontSize: 13 },
    actions: { display: "flex", gap: 10, flexWrap: "wrap" },
    btn: {
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(255,255,255,0.06)",
      color: "#e5e7eb",
      padding: "10px 12px",
      borderRadius: 12,
      cursor: "pointer",
      backdropFilter: "blur(8px)",
    },
    btnPrimary: { border: "1px solid rgba(99,102,241,0.55)", background: "rgba(99,102,241,0.16)" },
    btnDanger: { border: "1px solid rgba(239,68,68,0.45)", background: "rgba(239,68,68,0.10)" },
    btnDisabled: { opacity: 0.55, cursor: "not-allowed" },
    grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
    card: {
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.10)",
      borderRadius: 18,
      padding: 16,
      boxShadow: "0 18px 60px rgba(0,0,0,0.35)",
      backdropFilter: "blur(10px)",
    },
    cardTitle: { margin: 0, fontSize: 16 },
    cardSub: { marginTop: 6, opacity: 0.75, fontSize: 13 },
    chips: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 },
    chip: {
      padding: "7px 10px",
      borderRadius: 999,
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(255,255,255,0.06)",
      fontSize: 12,
      opacity: 0.95,
    },
    form: { display: "grid", gap: 10, marginTop: 12 },
    row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
    input: {
      width: "100%",
      padding: "10px 12px",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.14)",
      background: "rgba(0,0,0,0.20)",
      color: "#e5e7eb",
      outline: "none",
    },
    textarea: {
      width: "100%",
      padding: "10px 12px",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.14)",
      background: "rgba(0,0,0,0.20)",
      color: "#e5e7eb",
      outline: "none",
      minHeight: 70,
      resize: "vertical",
    },
    select: {
      width: "100%",
      padding: "10px 12px",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.14)",
      background: "rgba(0,0,0,0.20)",
      color: "#e5e7eb",
      outline: "none",
    },
    error: {
      marginTop: 12,
      padding: "10px 12px",
      borderRadius: 12,
      border: "1px solid rgba(239,68,68,0.35)",
      background: "rgba(239,68,68,0.10)",
      color: "#fecaca",
      fontSize: 13,
    },
    tableWrap: { marginTop: 14 },
    tableHeader: {
      display: "grid",
      gridTemplateColumns: "1.2fr 1.3fr 0.95fr 1.1fr 1.05fr",
      gap: 10,
      padding: "10px 12px",
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.10)",
      background: "rgba(255,255,255,0.05)",
      fontSize: 12,
      opacity: 0.8,
    },
    row: {
      display: "grid",
      gridTemplateColumns: "1.2fr 1.3fr 0.95fr 1.1fr 1.05fr",
      gap: 10,
      padding: "12px 12px",
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.10)",
      background: "rgba(0,0,0,0.16)",
      marginTop: 10,
      alignItems: "center",
    },
    cellMain: { fontWeight: 800 },
    small: { fontSize: 12, opacity: 0.75, marginTop: 2 },
    link: { color: "#a5b4fc", textDecoration: "none" },
    rowActions: { display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" },
    starBtn: (on) => ({
      border: "1px solid rgba(255,255,255,0.14)",
      background: on ? "rgba(251,191,36,0.16)" : "rgba(255,255,255,0.06)",
      color: on ? "#fde68a" : "#e5e7eb",
      padding: "9px 10px",
      borderRadius: 12,
      cursor: "pointer",
      fontWeight: 900,
    }),
    modalBg: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 },
    modal: {
      width: 820,
      maxWidth: "100%",
      background: "#0b1020",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 18,
      padding: 16,
      boxShadow: "0 28px 90px rgba(0,0,0,0.55)",
    },
    modalHead: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" },
    pager: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 14, flexWrap: "wrap" },
    pagerLeft: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
    pagerRight: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  };

  if (!isLoggedIn) return <Login onAuth={() => loadJobs()} />;

  function exportFilteredCSV() {
    const rows = [
      ["favorite", "id", "company", "title", "status", "location", "link", "applied_date", "notes"],
      ...filteredJobs.map((j) => [
        favorites.has(j.id) ? "yes" : "no",
        csvEscape(j.id),
        csvEscape(j.company),
        csvEscape(j.title),
        csvEscape(j.status),
        csvEscape(j.location),
        csvEscape(j.link),
        csvEscape(j.applied_date),
        csvEscape(j.notes),
      ]),
    ];
    downloadCSV("jobs-export.csv", rows);
    pushToast("success", `Exported ${filteredJobs.length} job(s) to CSV`);
  }

  return (
    <div style={s.page}>
      <Toasts items={toasts} onClose={closeToast} />

      <div style={s.shell}>
        {/* Header */}
        <div style={s.header}>
          <div style={s.brand}>
            <div style={s.logo} />
            <div>
              <h1 style={s.h1}>Job Application Tracker</h1>
              <p style={s.sub}>⭐ Favorites • 🔦 Highlights • ⬇️ CSV Export • Pagination ✅</p>
            </div>
          </div>

          <div style={s.actions}>
            <button style={{ ...s.btn, ...s.btnPrimary, ...(loading ? s.btnDisabled : {}) }} onClick={loadJobs} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>

            <button style={s.btn} onClick={exportFilteredCSV} title="Exports the current filtered list">
              Export CSV
            </button>

            <button
              style={{ ...s.btn, ...s.btnDanger }}
              onClick={() => {
                clearToken();
                setJobs([]);
                setEditing(null);
                pushToast("info", "Logged out.");
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {/* Top cards */}
        <div style={s.grid}>
          {/* Stats + Controls */}
          <div style={s.card}>
            <h3 style={s.cardTitle}>Overview</h3>

            <div style={s.chips}>
              <span style={s.chip}>Applied: {stats.applied}</span>
              <span style={s.chip}>Interview: {stats.interview}</span>
              <span style={s.chip}>Offer: {stats.offer}</span>
              <span style={s.chip}>Rejected: {stats.rejected}</span>
              <span style={s.chip}>⭐ Favorites: {favorites.size}</span>
              <span style={s.chip}>Total: {jobs.length}</span>
            </div>

            {error && <div style={s.error}>{error}</div>}

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <input style={s.input} placeholder="Search company, title, notes, location…" value={q} onChange={(e) => setQ(e.target.value)} />

              <div style={s.row2}>
                <select style={s.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">All statuses</option>
                  <option value="applied">Applied</option>
                  <option value="interview">Interview</option>
                  <option value="offer">Offer</option>
                  <option value="rejected">Rejected</option>
                </select>

                <select style={s.select} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="newest">Sort: Newest</option>
                  <option value="oldest">Sort: Oldest</option>
                  <option value="company_az">Sort: Company A → Z</option>
                  <option value="status">Sort: Status</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <label style={{ display: "flex", gap: 8, alignItems: "center", opacity: 0.85, fontSize: 13 }}>
                  <input type="checkbox" checked={showFavOnly} onChange={(e) => setShowFavOnly(e.target.checked)} />
                  Show favorites only
                </label>

                <div style={{ opacity: 0.75, fontSize: 12 }}>
                  Showing <b>{filteredJobs.length}</b> of <b>{jobs.length}</b>
                </div>
              </div>

              {(q || statusFilter !== "all" || sortBy !== "newest" || showFavOnly) && (
                <button
                  style={s.btn}
                  onClick={() => {
                    setQ("");
                    setStatusFilter("all");
                    setSortBy("newest");
                    setShowFavOnly(false);
                    pushToast("info", "Filters cleared.");
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {/* Add Job */}
          <div style={s.card}>
            <h3 style={s.cardTitle}>Add a job</h3>
            <p style={s.cardSub}>Company + title required. Everything else optional.</p>

            <form onSubmit={onCreate} style={s.form}>
              <div style={s.row2}>
                <input style={s.input} placeholder="Company *" value={company} onChange={(e) => setCompany(e.target.value)} />
                <input style={s.input} placeholder="Title *" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>

              <div style={s.row2}>
                <select style={s.select} value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="applied">Applied</option>
                  <option value="interview">Interview</option>
                  <option value="offer">Offer</option>
                  <option value="rejected">Rejected</option>
                </select>

                <input style={s.input} placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>

              <div style={s.row2}>
                <input style={s.input} placeholder="Link (https://...)" value={link} onChange={(e) => setLink(e.target.value)} />
                <input style={s.input} placeholder="Applied Date (YYYY-MM-DD)" value={appliedDate} onChange={(e) => setAppliedDate(e.target.value)} />
              </div>

              <textarea style={s.textarea} placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />

              <button style={{ ...s.btn, ...s.btnPrimary, width: "fit-content" }} type="submit">
                Add Job
              </button>
            </form>
          </div>
        </div>

        {/* Jobs table */}
        <div style={{ ...s.card, marginTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <h3 style={{ ...s.cardTitle, margin: 0 }}>Jobs</h3>
            <span style={{ opacity: 0.7, fontSize: 12 }}>
              {filteredJobs.length === 0 ? "No results" : `${filteredJobs.length} result(s) • ⭐ pinned on top`}
            </span>
          </div>

          <div style={s.tableWrap}>
            <div style={s.tableHeader}>
              <div>Company / Title</div>
              <div>Notes</div>
              <div>Status</div>
              <div>Link / Location</div>
              <div style={{ textAlign: "right" }}>Actions</div>
            </div>

            {pagedJobs.length === 0 ? (
              <p style={{ marginTop: 14, opacity: 0.75 }}>
                {jobs.length === 0 ? "Add your first job from the form above 👆" : "No jobs match your search / filters."}
              </p>
            ) : (
              pagedJobs.map((j) => (
                <div key={j.id} style={s.row}>
                  <div>
                    <div style={s.cellMain}>
                      <Highlight text={j.company} query={q} />
                      {favorites.has(j.id) ? <span style={{ marginLeft: 8, color: "#fde68a" }}>★</span> : null}
                    </div>
                    <div style={s.small}>
                      <Highlight text={j.title} query={q} />
                      {j.applied_date ? ` • ${j.applied_date}` : ""}
                    </div>
                  </div>

                  <div style={{ fontSize: 13, opacity: 0.85 }}>
                    {j.notes ? <Highlight text={j.notes} query={q} /> : <span style={{ opacity: 0.55 }}>—</span>}
                  </div>

                  <div style={{ display: "grid", gap: 8 }}>
                    <StatusBadge status={j.status} />
                    <select style={s.select} value={(j.status || "applied").toLowerCase()} onChange={(e) => quickStatus(j.id, e.target.value)}>
                      <option value="applied">Applied</option>
                      <option value="interview">Interview</option>
                      <option value="offer">Offer</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>

                  <div style={{ fontSize: 13 }}>
                    {j.link ? (
                      <a style={s.link} href={j.link} target="_blank" rel="noreferrer">
                        Open link
                      </a>
                    ) : (
                      <span style={{ opacity: 0.55 }}>—</span>
                    )}
                    <div style={s.small}>
                      {j.location ? <Highlight text={j.location} query={q} /> : "—"}
                    </div>
                  </div>

                  <div style={s.rowActions}>
                    <button style={s.starBtn(favorites.has(j.id))} onClick={() => toggleFavorite(j.id)} title="Pin / Unpin">
                      {favorites.has(j.id) ? "★" : "☆"}
                    </button>
                    <button style={s.btn} onClick={() => startEdit(j)}>
                      Edit
                    </button>
                    <button style={{ ...s.btn, ...s.btnDanger }} onClick={() => removeJob(j.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}

            {/* Pagination controls */}
            <div style={s.pager}>
              <div style={s.pagerLeft}>
                <span style={{ opacity: 0.75, fontSize: 12 }}>
                  Page <b>{page}</b> of <b>{totalPages}</b>
                </span>

                <select style={{ ...s.select, width: 170 }} value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                  <option value={5}>5 per page</option>
                  <option value={8}>8 per page</option>
                  <option value={12}>12 per page</option>
                  <option value={20}>20 per page</option>
                </select>
              </div>

              <div style={s.pagerRight}>
                <button style={{ ...s.btn, ...(page <= 1 ? s.btnDisabled : {}) }} disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Prev
                </button>
                <button
                  style={{ ...s.btn, ...(page >= totalPages ? s.btnDisabled : {}) }}
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Edit modal */}
        {editing && (
          <div style={s.modalBg} onClick={cancelEdit}>
            <div style={s.modal} onClick={(e) => e.stopPropagation()}>
              <div style={s.modalHead}>
                <div>
                  <h3 style={{ margin: 0 }}>Edit Job</h3>
                  <p style={{ margin: "6px 0 0 0", opacity: 0.7, fontSize: 13 }}>Update fields, then hit Save.</p>
                </div>
                <button style={s.btn} onClick={cancelEdit}>
                  Close
                </button>
              </div>

              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                <div style={s.row2}>
                  <input style={s.input} placeholder="Company *" value={editing.company || ""} onChange={(e) => setEditing({ ...editing, company: e.target.value })} />
                  <input style={s.input} placeholder="Title *" value={editing.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
                </div>

                <div style={s.row2}>
                  <select style={s.select} value={editing.status || "applied"} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                    <option value="applied">Applied</option>
                    <option value="interview">Interview</option>
                    <option value="offer">Offer</option>
                    <option value="rejected">Rejected</option>
                  </select>

                  <input style={s.input} placeholder="Location" value={editing.location || ""} onChange={(e) => setEditing({ ...editing, location: e.target.value })} />
                </div>

                <div style={s.row2}>
                  <input style={s.input} placeholder="Link" value={editing.link || ""} onChange={(e) => setEditing({ ...editing, link: e.target.value })} />
                  <input
                    style={s.input}
                    placeholder="Applied Date (YYYY-MM-DD)"
                    value={editing.applied_date || ""}
                    onChange={(e) => setEditing({ ...editing, applied_date: e.target.value })}
                  />
                </div>

                <textarea style={s.textarea} placeholder="Notes" value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
                  <button style={s.btn} onClick={cancelEdit}>
                    Cancel
                  </button>
                  <button style={{ ...s.btn, ...s.btnPrimary }} onClick={saveEdit}>
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop: 18, opacity: 0.55, fontSize: 12 }}>Running: Frontend 5174 • Backend 8080</div>
      </div>
    </div>
  );
}
