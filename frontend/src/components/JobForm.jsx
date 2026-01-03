import { useState } from "react";

export default function JobForm({ onAddJob }) {
  const [company, setCompany] = useState("");
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("Applied");
  const [appliedDate, setAppliedDate] = useState("");
  const [location, setLocation] = useState("");
  const [link, setLink] = useState("");
  const [notes, setNotes] = useState("");

  function handleSubmit(e) {
    e.preventDefault();

    if (!company.trim() || !title.trim()) return;

    onAddJob({
      company,
      title,
      status,
      applied_date: appliedDate || null,
      location,
      link,
      notes,
    });

    setCompany("");
    setTitle("");
    setStatus("Applied");
    setAppliedDate("");
    setLocation("");
    setLink("");
    setNotes("");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-semibold">Company *</label>
        <input
          className="w-full rounded-lg border px-3 py-2"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Google"
          required
        />
      </div>

      <div>
        <label className="text-sm font-semibold">Title *</label>
        <input
          className="w-full rounded-lg border px-3 py-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Software Engineer"
          required
        />
      </div>

      <div>
        <label className="text-sm font-semibold">Status</label>
        <select
          className="w-full rounded-lg border px-3 py-2"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option>Applied</option>
          <option>Interview</option>
          <option>Offer</option>
          <option>Rejected</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-semibold">Applied Date</label>
        <input
          className="w-full rounded-lg border px-3 py-2"
          type="date"
          value={appliedDate}
          onChange={(e) => setAppliedDate(e.target.value)}
        />
      </div>

      <div>
        <label className="text-sm font-semibold">Location</label>
        <input
          className="w-full rounded-lg border px-3 py-2"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Dallas, TX"
        />
      </div>

      <div>
        <label className="text-sm font-semibold">Job Link</label>
        <input
          className="w-full rounded-lg border px-3 py-2"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://..."
        />
      </div>

      <div>
        <label className="text-sm font-semibold">Notes</label>
        <textarea
          className="w-full rounded-lg border px-3 py-2"
          rows="3"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Recruiter name, follow-up date, etc."
        />
      </div>

      <button
        type="submit"
        className="w-full rounded-lg bg-black py-2 font-semibold text-white"
      >
        Add Job
      </button>
    </form>
  );
}
