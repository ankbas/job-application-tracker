const API_URL = import.meta.env.VITE_API_URL;

export function getToken() {
  return localStorage.getItem("token");
}

export function setToken(token) {
  localStorage.setItem("token", token);
}

export function clearToken() {
  localStorage.removeItem("token");
}

async function request(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Request failed");
  return data;
}

export const api = {
  signup: (email, password) => request("/auth/signup", { method: "POST", body: { email, password } }),
  login: (email, password) => request("/auth/login", { method: "POST", body: { email, password } }),

  listJobs: () => request("/jobs", { auth: true }),
  createJob: (job) => request("/jobs", { method: "POST", body: job, auth: true }),
  updateJob: (id, job) => request(`/jobs/${id}`, { method: "PUT", body: job, auth: true }),
  deleteJob: (id) => request(`/jobs/${id}`, { method: "DELETE", auth: true })
};
