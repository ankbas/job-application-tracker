function badge(status) {
  const base = "px-2 py-1 rounded-full text-xs font-semibold";
  if (status === "Offer") return `${base} bg-green-100 text-green-700`;
  if (status === "Interview") return `${base} bg-blue-100 text-blue-700`;
  if (status === "Rejected") return `${base} bg-red-100 text-red-700`;
  return `${base} bg-gray-100 text-gray-700`;
}

export default function JobList({ jobs }) {
  if (!jobs.length) {
    return (
      <div className="text-sm text-gray-500">
        No jobs yet. Add your first one 👇
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border rounded-xl">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr className="text-left">
            <th className="p-3">Company</th>
            <th className="p-3">Title</th>
            <th className="p-3">Status</th>
            <th className="p-3">Location</th>
            <th className="p-3">Applied</th>
            <th className="p-3">Link</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((j) => (
            <tr key={j.id} className="border-t">
              <td className="p-3 font-medium">{j.company}</td>
              <td className="p-3">{j.title}</td>
              <td className="p-3">
                <span className={badge(j.status)}>{j.status}</span>
              </td>
              <td className="p-3">{j.location || "-"}</td>
              <td className="p-3">{j.applied_date || "-"}</td>
              <td className="p-3">
                {j.link ? (
                  <a
                    className="text-blue-600 underline"
                    href={j.link}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open
                  </a>
                ) : (
                  "-"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
