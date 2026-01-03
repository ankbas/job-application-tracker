import { useState } from "react";
import { api, setToken } from "./api";

export default function Login({ onAuth }) {
  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setMsg("");

    if (!email.trim()) return setMsg("Email is required");
    if (!password) return setMsg("Password is required");
    if (mode === "signup" && password.length < 8) return setMsg("Password must be at least 8 characters");

    setLoading(true);
    try {
      const result =
        mode === "login"
          ? await api.login(email.trim(), password)
          : await api.signup(email.trim(), password);

      // ✅ save token using helper
      setToken(result.token);

      // ✅ tell parent we are logged in
      onAuth?.(result.user);
    } catch (err) {
      setMsg(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "60px auto", padding: 16 }}>
      <h2 style={{ marginBottom: 12 }}>
        {mode === "login" ? "Login" : "Create account"}
      </h2>

      <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
        <input
          placeholder="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          placeholder="Password (8+ chars)"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit" disabled={loading}>
          {loading ? "Please wait..." : mode === "login" ? "Login" : "Sign up"}
        </button>
      </form>

      {msg && <p style={{ color: "crimson", marginTop: 12 }}>{msg}</p>}

      <button
        onClick={() => {
          setMsg("");
          setMode(mode === "login" ? "signup" : "login");
        }}
        style={{ marginTop: 12 }}
      >
        Switch to {mode === "login" ? "Sign up" : "Login"}
      </button>
    </div>
  );
}
