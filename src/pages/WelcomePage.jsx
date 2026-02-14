// src/pages/WelcomePage.jsx
// Public-facing landing page at the root URL.
// Shows a hero, explains the concept, and lets customers enter a
// business slug to jump to that business's menu.
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function WelcomePage() {
  const [slug, setSlug] = useState("");
  const navigate = useNavigate();

  function handleGo(e) {
    e.preventDefault();
    const clean = slug.trim().toLowerCase().replace(/\s+/g, "-");
    if (clean) navigate(`/order/${clean}`);
  }

  return (
    <div style={s.root}>
      {/* Background blobs */}
      <div style={s.blob1} />
      <div style={s.blob2} />

      <main style={s.main}>
        {/* Nav bar */}
        <nav style={s.nav}>
          <div style={s.logoRow}>
            <span style={s.logoIcon}>🛍️</span>
            <span style={s.logoText}>OrderAhead</span>
          </div>
          <button onClick={() => navigate("/login")} style={s.ownerBtn}>
            Owner login →
          </button>
        </nav>

        {/* Hero */}
        <section style={s.hero}>
          <div style={s.pill}>✨ Skip the wait. Order before you arrive.</div>
          <h1 style={s.heading}>
            Your order,<br />
            <em style={s.headingItalic}>ready when you are.</em>
          </h1>
          <p style={s.subheading}>
            Order from your favourite local spot ahead of time so it's waiting for you
            the moment you walk in — no queuing, no waiting around.
          </p>

          {/* Slug entry */}
          <form onSubmit={handleGo} style={s.form}>
            <div style={s.inputRow}>
              <span style={s.inputPrefix}>orderahead.app/order/</span>
              <input
                style={s.input}
                placeholder="your-shop-name"
                value={slug}
                onChange={e => setSlug(e.target.value)}
                autoFocus
              />
            </div>
            <button type="submit" style={s.goBtn} disabled={!slug.trim()}>
              Go to my order page →
            </button>
          </form>
          <p style={s.hint}>Your business will give you their unique link.</p>
        </section>

        {/* How it works */}
        <section style={s.howSection}>
          <h2 style={s.howTitle}>How it works</h2>
          <div style={s.steps}>
            {[
              { icon: "🔗", step: "1", title: "Get the link", desc: "Your local shop shares their unique OrderAhead link with you." },
              { icon: "🛒", step: "2", title: "Place your order", desc: "Browse the menu, add what you want, and submit. Takes 30 seconds." },
              { icon: "🔔", step: "3", title: "They get notified", desc: "The shop gets an instant notification and starts preparing your order." },
              { icon: "🏃", step: "4", title: "Pick it up", desc: "Head over and your order is ready and waiting. No queue, no stress." },
            ].map(item => (
              <div key={item.step} style={s.stepCard}>
                <div style={s.stepEmoji}>{item.icon}</div>
                <div style={s.stepNum}>Step {item.step}</div>
                <div style={s.stepTitle}>{item.title}</div>
                <div style={s.stepDesc}>{item.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Owner CTA */}
        <section style={s.ownerSection}>
          <div style={s.ownerCard}>
            <div style={s.ownerEmoji}>🏪</div>
            <div>
              <h3 style={s.ownerCardTitle}>Are you a business owner?</h3>
              <p style={s.ownerCardDesc}>
                Set up your menu, get a shareable link, and start receiving orders with
                real-time push notifications on your phone — for free.
              </p>
            </div>
            <button onClick={() => navigate("/login")} style={s.ownerCTA}>
              Get started free →
            </button>
          </div>
        </section>

        <footer style={s.footer}>
          <span>© 2025 OrderAhead</span>
          <span style={{ color: "#d4c5b0" }}>·</span>
          <span>Made for small businesses</span>
        </footer>
      </main>
    </div>
  );
}

const s = {
  root: {
    minHeight: "100vh",
    background: "#fdf8f3",
    position: "relative",
    overflow: "hidden",
  },
  blob1: {
    position: "absolute", top: -120, right: -120,
    width: 500, height: 500, borderRadius: "50%",
    background: "radial-gradient(circle, #fed7aa 0%, transparent 70%)",
    opacity: 0.5, pointerEvents: "none",
  },
  blob2: {
    position: "absolute", bottom: -80, left: -80,
    width: 400, height: 400, borderRadius: "50%",
    background: "radial-gradient(circle, #fef9c3 0%, transparent 70%)",
    opacity: 0.6, pointerEvents: "none",
  },
  main: {
    position: "relative", zIndex: 1,
    maxWidth: 900, margin: "0 auto",
    padding: "0 24px 60px",
  },
  nav: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "24px 0",
  },
  logoRow: { display: "flex", alignItems: "center", gap: 10 },
  logoIcon: { fontSize: 28 },
  logoText: {
    fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, color: "#1c1917",
  },
  ownerBtn: {
    background: "transparent", border: "1.5px solid #e7ddd0",
    color: "#78716c", padding: "8px 18px", borderRadius: 24,
    fontSize: 14, fontWeight: 600,
    transition: "background 0.15s",
  },
  hero: {
    textAlign: "center", padding: "60px 0 50px",
    animation: "fadeUp 0.5s ease both",
  },
  pill: {
    display: "inline-block", background: "#fff7ed",
    border: "1.5px solid #fed7aa", color: "#c2410c",
    padding: "6px 18px", borderRadius: 24,
    fontSize: 14, fontWeight: 700, marginBottom: 24,
  },
  heading: {
    fontFamily: "'Fraunces', serif",
    fontSize: "clamp(42px, 7vw, 72px)",
    fontWeight: 700, lineHeight: 1.1,
    color: "#1c1917", marginBottom: 20,
  },
  headingItalic: { color: "#f97316", fontStyle: "italic" },
  subheading: {
    fontSize: 18, color: "#78716c", fontWeight: 500,
    lineHeight: 1.6, maxWidth: 560, margin: "0 auto 36px",
  },
  form: {
    display: "flex", flexDirection: "column",
    alignItems: "center", gap: 14, marginBottom: 12,
  },
  inputRow: {
    display: "flex", alignItems: "center",
    background: "#fff", border: "2px solid #e7ddd0",
    borderRadius: 14, overflow: "hidden",
    width: "100%", maxWidth: 520,
    boxShadow: "0 4px 20px rgba(0,0,0,0.07)",
    transition: "border-color 0.15s",
  },
  inputPrefix: {
    padding: "0 12px 0 16px",
    color: "#a8a29e", fontSize: 14, fontWeight: 600,
    whiteSpace: "nowrap", userSelect: "none",
  },
  input: {
    flex: 1, border: "none", outline: "none",
    padding: "14px 16px 14px 0",
    fontSize: 15, fontWeight: 600, color: "#1c1917",
    background: "transparent",
  },
  goBtn: {
    background: "#f97316", color: "#fff",
    border: "none", borderRadius: 12,
    padding: "14px 28px",
    fontSize: 15, fontWeight: 800,
    width: "100%", maxWidth: 520,
    transition: "filter 0.15s",
    opacity: 1,
  },
  hint: { color: "#a8a29e", fontSize: 13, fontWeight: 500 },

  howSection: { padding: "20px 0 50px" },
  howTitle: {
    fontFamily: "'Fraunces', serif", fontSize: 32,
    fontWeight: 700, textAlign: "center", marginBottom: 32,
    color: "#1c1917",
  },
  steps: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: 18,
  },
  stepCard: {
    background: "#fff", borderRadius: 18,
    padding: "24px 20px", border: "1.5px solid #f0e8dc",
    boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
    animation: "fadeUp 0.4s ease both",
  },
  stepEmoji: { fontSize: 32, marginBottom: 10 },
  stepNum: { fontSize: 11, fontWeight: 800, letterSpacing: "0.07em", color: "#f97316", textTransform: "uppercase", marginBottom: 4 },
  stepTitle: { fontSize: 17, fontWeight: 700, color: "#1c1917", marginBottom: 6 },
  stepDesc: { fontSize: 14, color: "#78716c", fontWeight: 500, lineHeight: 1.5 },

  ownerSection: { paddingBottom: 40 },
  ownerCard: {
    background: "linear-gradient(135deg, #fff7ed, #fef9ee)",
    border: "1.5px solid #fed7aa", borderRadius: 20,
    padding: "28px 32px",
    display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap",
  },
  ownerEmoji: { fontSize: 48 },
  ownerCardTitle: {
    fontFamily: "'Fraunces', serif", fontSize: 22,
    fontWeight: 700, color: "#1c1917", marginBottom: 6,
  },
  ownerCardDesc: { fontSize: 15, color: "#78716c", fontWeight: 500, lineHeight: 1.5, maxWidth: 420 },
  ownerCTA: {
    marginLeft: "auto", background: "#f97316",
    color: "#fff", border: "none", borderRadius: 12,
    padding: "12px 24px", fontSize: 15, fontWeight: 800,
    whiteSpace: "nowrap",
  },

  footer: {
    textAlign: "center", color: "#a8a29e",
    fontSize: 13, fontWeight: 500,
    paddingTop: 20, display: "flex",
    justifyContent: "center", gap: 10,
  },
};
