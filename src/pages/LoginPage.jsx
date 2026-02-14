// src/pages/LoginPage.jsx
// Owner login / sign-up page using Supabase Auth (magic link or email+password).
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode]         = useState("login"); // "login" | "signup"
  const [loading, setLoading]   = useState(false);
  const [message, setMessage]   = useState(null);
  const [error, setError]       = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("Check your email to confirm your account, then come back and log in!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.root}>
      <div style={s.blob1} />
      <div style={s.blob2} />

      <div style={s.card}>
        {/* Logo */}
        <div style={s.logoRow}>
          <span style={s.logoIcon}>🛍️</span>
          <span style={s.logoText}>OrderAhead</span>
        </div>

        <h1 style={s.title}>{mode === "login" ? "Welcome back!" : "Create your account"}</h1>
        <p style={s.subtitle}>
          {mode === "login"
            ? "Log in to manage your orders and products."
            : "Get set up in minutes — it's completely free."}
        </p>

        {message && <div style={s.successBox}>{message}</div>}
        {error   && <div style={s.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} style={s.form}>
          <label style={s.label}>Email address</label>
          <input
            style={s.input}
            type="email"
            placeholder="you@yourbusiness.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
          />

          <label style={s.label}>Password</label>
          <input
            style={s.input}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />

          <button type="submit" disabled={loading} style={s.submitBtn}>
            {loading ? "Just a moment…" : mode === "login" ? "Log in to dashboard →" : "Create account →"}
          </button>
        </form>

        <div style={s.switchRow}>
          {mode === "login" ? (
            <>New here? <button onClick={() => { setMode("signup"); setError(null); }} style={s.switchBtn}>Create an account</button></>
          ) : (
            <>Already have one? <button onClick={() => { setMode("login"); setError(null); }} style={s.switchBtn}>Log in</button></>
          )}
        </div>

        <button onClick={() => navigate("/")} style={s.backLink}>← Back to home</button>
      </div>
    </div>
  );
}

const s = {
  root: {
    minHeight: "100vh", background: "#fdf8f3",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 24, position: "relative", overflow: "hidden",
  },
  blob1: {
    position: "absolute", top: -100, right: -100,
    width: 400, height: 400, borderRadius: "50%",
    background: "radial-gradient(circle, #fed7aa, transparent 70%)",
    opacity: 0.5, pointerEvents: "none",
  },
  blob2: {
    position: "absolute", bottom: -80, left: -80,
    width: 350, height: 350, borderRadius: "50%",
    background: "radial-gradient(circle, #fef9c3, transparent 70%)",
    opacity: 0.6, pointerEvents: "none",
  },
  card: {
    background: "#fff", borderRadius: 24, padding: "40px 36px",
    maxWidth: 440, width: "100%",
    boxShadow: "0 8px 40px rgba(0,0,0,0.09)",
    border: "1.5px solid #f0e8dc",
    position: "relative", zIndex: 1,
    animation: "fadeUp 0.4s ease",
  },
  logoRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 28 },
  logoIcon: { fontSize: 28 },
  logoText: { fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, color: "#1c1917" },
  title: { fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 700, color: "#1c1917", marginBottom: 6 },
  subtitle: { color: "#78716c", fontSize: 15, fontWeight: 500, lineHeight: 1.5, marginBottom: 24 },
  successBox: {
    background: "#f0fdf4", border: "1.5px solid #bbf7d0", color: "#15803d",
    borderRadius: 10, padding: "12px 14px", fontSize: 14, fontWeight: 600, marginBottom: 20,
  },
  errorBox: {
    background: "#fef2f2", border: "1.5px solid #fecaca", color: "#dc2626",
    borderRadius: 10, padding: "12px 14px", fontSize: 14, fontWeight: 600, marginBottom: 20,
  },
  form: { display: "flex", flexDirection: "column" },
  label: { fontSize: 13, fontWeight: 700, color: "#57534e", marginBottom: 5 },
  input: {
    border: "1.5px solid #e7ddd0", borderRadius: 10,
    padding: "12px 14px", fontSize: 15, color: "#1c1917",
    background: "#fafaf9", marginBottom: 16, outline: "none",
    transition: "border-color 0.15s",
  },
  submitBtn: {
    background: "#f97316", color: "#fff", border: "none",
    borderRadius: 12, padding: "14px", fontSize: 16,
    fontWeight: 800, marginTop: 4, transition: "opacity 0.15s",
  },
  switchRow: {
    textAlign: "center", marginTop: 20,
    fontSize: 14, fontWeight: 500, color: "#78716c",
  },
  switchBtn: {
    background: "none", border: "none", color: "#f97316",
    fontWeight: 700, fontSize: 14, textDecoration: "underline",
    cursor: "pointer", padding: "0 4px",
  },
  backLink: {
    display: "block", marginTop: 16, textAlign: "center",
    background: "none", border: "none", color: "#a8a29e",
    fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
};
