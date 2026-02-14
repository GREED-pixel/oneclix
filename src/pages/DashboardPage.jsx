// src/pages/DashboardPage.jsx
// Owner's live order dashboard — receives real-time order updates via
// Supabase Realtime and push notifications via Web Push.
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { subscribeToPush, isSubscribed } from "../lib/push";

const STATUS_FLOW = ["pending", "preparing", "ready", "fulfilled"];

const STATUS_META = {
  pending:   { label: "Pending",   emoji: "🔴", color: "#f97316", bg: "#fff7ed", border: "#fed7aa" },
  preparing: { label: "Preparing", emoji: "🟡", color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  ready:     { label: "Ready!",    emoji: "🟢", color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
  fulfilled: { label: "Done",      emoji: "✅", color: "#a8a29e", bg: "#fafaf9", border: "#e7e5e4" },
};

function timeAgo(date) {
  const secs = Math.floor((new Date() - new Date(date)) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser]           = useState(null);
  const [business, setBusiness]   = useState(null);
  const [orders, setOrders]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [pushOn, setPushOn]       = useState(false);
  const [tab, setTab]             = useState("active"); // "active" | "fulfilled"
  const [toast, setToast]         = useState(null);
  const [justFulfilled, setJustFulfilled] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  // ── Auth + Load ─────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate("/login"); return; }
      setUser(session.user);
      loadData(session.user.id);
    });
  }, [navigate]);

  async function loadData(userId) {
    // Get business
    const { data: biz } = await supabase
      .from("businesses")
      .select("*")
      .eq("owner_id", userId)
      .single();

    if (!biz) {
      // Owner hasn't set up a business yet — send to admin
      navigate("/admin");
      return;
    }
    setBusiness(biz);

    // Load orders with items
    const { data: ordersData } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("business_id", biz.id)
      .order("created_at", { ascending: false })
      .limit(100);

    setOrders(ordersData || []);
    setLoading(false);

    // Check push subscription
    const subscribed = await isSubscribed();
    setPushOn(subscribed);
  }

  // ── Realtime subscription ────────────────────────────────────
  useEffect(() => {
    if (!business) return;

    const channel = supabase
      .channel(`orders:${business.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "orders",
        filter: `business_id=eq.${business.id}`,
      }, async (payload) => {
        // Fetch the full order with items
        const { data } = await supabase
          .from("orders")
          .select("*, order_items(*)")
          .eq("id", payload.new.id)
          .single();

        if (data) {
          setOrders(prev => [data, ...prev]);
          showToast(`🛒 New order from ${data.customer_name}!`);
        }
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "orders",
        filter: `business_id=eq.${business.id}`,
      }, (payload) => {
        setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o));
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [business]);

  // ── Actions ─────────────────────────────────────────────────
  async function advanceStatus(order) {
    const currentIdx = STATUS_FLOW.indexOf(order.status);
    if (currentIdx >= STATUS_FLOW.length - 1) return;
    const nextStatus = STATUS_FLOW[currentIdx + 1];

    if (nextStatus === "fulfilled") {
      setJustFulfilled(order.id);
      setTimeout(() => setJustFulfilled(null), 400);
    }

    await supabase
      .from("orders")
      .update({
        status: nextStatus,
        ...(nextStatus === "fulfilled" ? { fulfilled_at: new Date().toISOString() } : {}),
      })
      .eq("id", order.id);

    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: nextStatus } : o));
    showToast(`Order ${order.id.slice(-6).toUpperCase()} → ${STATUS_META[nextStatus].label}`);
  }

  async function handleEnablePush() {
    const ok = await subscribeToPush(business.id);
    setPushOn(ok);
    if (ok) showToast("🔔 Push notifications enabled on this device!");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  // ── Sorted orders ────────────────────────────────────────────
  const activeOrders    = orders.filter(o => o.status !== "fulfilled");
  const fulfilledOrders = orders.filter(o => o.status === "fulfilled");
  const visibleOrders   = tab === "active" ? activeOrders : fulfilledOrders;

  const todayRevenue = fulfilledOrders
    .filter(o => new Date(o.fulfilled_at || o.created_at).toDateString() === new Date().toDateString())
    .reduce((s, o) => s + parseFloat(o.total), 0);

  if (loading) return (
    <div style={s.center}>
      <div style={s.spinner} />
      <p style={{ color: "#a8a29e", fontWeight: 600 }}>Loading your dashboard…</p>
    </div>
  );

  return (
    <div style={s.root}>
      {toast && <div style={s.toast}>{toast}</div>}

      {/* Sidebar */}
      <aside style={s.sidebar}>
        <div style={s.brand}>
          <div style={s.brandIcon}>🛍️</div>
          <div>
            <div style={s.brandName}>OrderAhead</div>
            <div style={s.brandSub}>{business?.name || "My Shop"}</div>
          </div>
        </div>

        <div style={s.greeting}>
          <div style={s.greetHi}>Hey there! 👋</div>
          <div style={s.greetMsg}>Here's what's coming in.</div>
        </div>

        <nav style={s.nav}>
          {[
            { id: "active", label: "Active Orders", icon: "📦", badge: activeOrders.length },
            { id: "fulfilled", label: "Completed", icon: "✅" },
          ].map(item => (
            <button key={item.id} onClick={() => setTab(item.id)}
              style={{ ...s.navBtn, ...(tab === item.id ? s.navActive : {}) }}>
              <span>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge > 0 && <span style={s.badge}>{item.badge}</span>}
            </button>
          ))}
          <button onClick={() => navigate("/admin")} style={s.navBtn}>
            <span>⚙️</span><span style={{ flex: 1 }}>Products & Settings</span>
          </button>
        </nav>

        <div style={s.statsBox}>
          <div style={s.statsTitle}>Today at a glance</div>
          {[
            { label: "💰 Revenue", value: `$${todayRevenue.toFixed(2)}`, color: "#16a34a" },
            { label: "📦 Active", value: activeOrders.length, color: activeOrders.length > 0 ? "#f97316" : "#a8a29e" },
            { label: "✅ Completed", value: fulfilledOrders.length, color: "#1c1917" },
          ].map(stat => (
            <div key={stat.label} style={s.statRow}>
              <span style={s.statLabel}>{stat.label}</span>
              <strong style={{ color: stat.color, fontSize: 15 }}>{stat.value}</strong>
            </div>
          ))}
        </div>

        {/* Push notification toggle */}
        {!pushOn && (
          <button onClick={handleEnablePush} style={s.pushBtn}>
            🔔 Enable order alerts
          </button>
        )}
        {pushOn && (
          <div style={s.pushOn}>🔔 Notifications active on this device</div>
        )}

        <button onClick={handleLogout} style={s.logoutBtn}>Log out</button>
      </aside>

      {/* Main */}
      <main style={s.main}>
        <div style={s.pageHead}>
          <div>
            <h1 style={s.pageTitle}>{tab === "active" ? "Active Orders" : "Completed Orders"}</h1>
            <p style={s.pageSub}>
              {tab === "active"
                ? "Tap a card to expand and advance the order status."
                : "All orders your team has fulfilled today."}
            </p>
          </div>
          {/* Share link */}
          {business?.slug && (
            <div style={s.shareBox}>
              <span style={s.shareLabel}>Customer link</span>
              <div style={s.shareLink}>
                <span style={s.shareLinkText}>/order/{business.slug}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/order/${business.slug}`);
                    showToast("Link copied to clipboard! 📋");
                  }}
                  style={s.copyBtn}
                >Copy</button>
              </div>
            </div>
          )}
        </div>

        {visibleOrders.length === 0 ? (
          <div style={s.empty}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>
              {tab === "active" ? "🎉" : "📭"}
            </div>
            <div style={s.emptyTitle}>
              {tab === "active" ? "All caught up!" : "Nothing completed yet today"}
            </div>
            <div style={s.emptySub}>
              {tab === "active"
                ? "New orders will appear here automatically."
                : "Fulfilled orders will show up here."}
            </div>
          </div>
        ) : (
          <div style={s.orderList}>
            {visibleOrders.map((order, i) => {
              const meta = STATUS_META[order.status] || STATUS_META.pending;
              const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1];
              const isExpanded = expandedOrder === order.id;
              const isFulfilling = justFulfilled === order.id;

              return (
                <div
                  key={order.id}
                  style={{
                    ...s.orderCard,
                    borderColor: meta.border,
                    animation: isFulfilling
                      ? "sinkOut 0.4s ease forwards"
                      : `fadeUp 0.3s ease ${Math.min(i, 5) * 0.04}s both`,
                  }}
                >
                  {/* Card header — always visible */}
                  <div style={s.orderHeader} onClick={() => setExpandedOrder(isExpanded ? null : order.id)}>
                    <div style={s.orderHeaderLeft}>
                      <div style={{ ...s.statusPill, background: meta.bg, color: meta.color, border: `1.5px solid ${meta.border}` }}>
                        {meta.emoji} {meta.label}
                      </div>
                      <div style={s.orderMeta}>
                        <span style={s.orderName}>{order.customer_name}</span>
                        <span style={s.orderTime}>{timeAgo(order.created_at)}</span>
                      </div>
                    </div>
                    <div style={s.orderHeaderRight}>
                      <span style={s.orderTotal}>${parseFloat(order.total).toFixed(2)}</span>
                      <span style={s.chevron}>{isExpanded ? "▲" : "▼"}</span>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div style={s.orderDetail}>
                      {/* Items */}
                      <div style={s.itemsList}>
                        {(order.order_items || []).map(item => (
                          <div key={item.id} style={s.itemRow}>
                            <span style={s.itemQty}>{item.quantity}×</span>
                            <span style={s.itemName}>{item.name}</span>
                            <span style={s.itemPrice}>${(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>

                      {order.customer_note && (
                        <div style={s.noteBox}>
                          <span style={s.noteLabel}>📝 Note:</span> {order.customer_note}
                        </div>
                      )}

                      {/* Advance button */}
                      {nextStatus && (
                        <button
                          onClick={() => advanceStatus(order)}
                          style={{ ...s.advanceBtn, background: STATUS_META[nextStatus].color }}
                        >
                          Mark as {STATUS_META[nextStatus].label} {STATUS_META[nextStatus].emoji}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <style>{`
        @keyframes sinkOut { 0% { opacity:1; transform:translateY(0) scale(1); } 100% { opacity:0.2; transform:translateY(8px) scale(0.98); } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin    { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

const s = {
  root: { display: "flex", minHeight: "100vh", background: "#fdf8f3", fontFamily: "'Nunito', sans-serif" },
  center: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 },
  spinner: { width: 36, height: 36, border: "4px solid #f0e8dc", borderTop: "4px solid #f97316", borderRadius: "50%", animation: "spin 0.8s linear infinite" },

  toast: {
    position: "fixed", bottom: 24, right: 24, zIndex: 9999,
    background: "#1c1917", color: "#fef3c7",
    padding: "13px 22px", borderRadius: 14, fontSize: 14, fontWeight: 600,
    boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
  },

  sidebar: { width: 260, background: "#fff", borderRight: "1.5px solid #f0e8dc", padding: "28px 18px", display: "flex", flexDirection: "column", gap: 20, position: "sticky", top: 0, height: "100vh", overflowY: "auto" },
  brand: { display: "flex", alignItems: "center", gap: 12 },
  brandIcon: { fontSize: 28, background: "#fff7ed", borderRadius: 12, width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid #fed7aa" },
  brandName: { fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 700, color: "#1c1917" },
  brandSub: { fontSize: 12, color: "#a8a29e", fontWeight: 500 },

  greeting: { background: "linear-gradient(135deg,#fff7ed,#fef9ee)", borderRadius: 14, padding: "14px 16px", border: "1.5px solid #fed7aa" },
  greetHi: { fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 600, color: "#c2410c", marginBottom: 3 },
  greetMsg: { fontSize: 13, color: "#78716c", fontWeight: 500 },

  nav: { display: "flex", flexDirection: "column", gap: 3 },
  navBtn: { display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderRadius: 12, border: "none", background: "transparent", color: "#78716c", fontSize: 14, fontWeight: 600, fontFamily: "'Nunito', sans-serif", textAlign: "left" },
  navActive: { background: "#fff7ed", color: "#c2410c" },
  badge: { background: "#f97316", color: "#fff", borderRadius: 10, fontSize: 11, fontWeight: 800, padding: "2px 8px" },

  statsBox: { background: "#fafaf9", borderRadius: 14, padding: "14px", border: "1.5px solid #f0e8dc" },
  statsTitle: { fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: "#a8a29e", textTransform: "uppercase", marginBottom: 10 },
  statRow: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: "#57534e", fontWeight: 500, padding: "5px 0", borderBottom: "1px solid #f0e8dc" },
  statLabel: { color: "#78716c" },

  pushBtn: { background: "#fff7ed", border: "1.5px solid #fed7aa", color: "#c2410c", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 700, fontFamily: "'Nunito', sans-serif" },
  pushOn: { background: "#f0fdf4", border: "1.5px solid #bbf7d0", color: "#16a34a", borderRadius: 10, padding: "10px 14px", fontSize: 12, fontWeight: 600, textAlign: "center" },
  logoutBtn: { marginTop: "auto", background: "transparent", border: "1.5px solid #e7e5e4", color: "#a8a29e", borderRadius: 10, padding: "9px", fontSize: 13, fontWeight: 600, fontFamily: "'Nunito', sans-serif" },

  main: { flex: 1, padding: "36px 40px", maxWidth: 800 },
  pageHead: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, gap: 20, flexWrap: "wrap" },
  pageTitle: { fontFamily: "'Fraunces', serif", fontSize: 32, fontWeight: 700, color: "#1c1917", lineHeight: 1.1 },
  pageSub: { color: "#a8a29e", fontSize: 14, marginTop: 4, fontWeight: 500 },

  shareBox: { background: "#fff", border: "1.5px solid #f0e8dc", borderRadius: 14, padding: "12px 16px" },
  shareLabel: { fontSize: 11, fontWeight: 800, color: "#a8a29e", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 6 },
  shareLink: { display: "flex", alignItems: "center", gap: 10 },
  shareLinkText: { fontSize: 14, fontWeight: 600, color: "#78716c", fontFamily: "monospace" },
  copyBtn: { background: "#f97316", color: "#fff", border: "none", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 700, fontFamily: "'Nunito', sans-serif" },

  empty: { textAlign: "center", padding: "80px 0" },
  emptyTitle: { fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 600, color: "#1c1917", marginBottom: 8 },
  emptySub: { color: "#a8a29e", fontSize: 15 },

  orderList: { display: "flex", flexDirection: "column", gap: 12 },
  orderCard: { background: "#fff", borderRadius: 16, border: "1.5px solid #f0e8dc", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", overflow: "hidden" },
  orderHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", cursor: "pointer" },
  orderHeaderLeft: { display: "flex", alignItems: "center", gap: 12 },
  statusPill: { fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 20, whiteSpace: "nowrap" },
  orderMeta: { display: "flex", flexDirection: "column" },
  orderName: { fontWeight: 700, fontSize: 15, color: "#1c1917" },
  orderTime: { fontSize: 12, color: "#a8a29e", fontWeight: 500 },
  orderHeaderRight: { display: "flex", alignItems: "center", gap: 12 },
  orderTotal: { fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: "#1c1917" },
  chevron: { color: "#a8a29e", fontSize: 11 },

  orderDetail: { borderTop: "1px solid #f0e8dc", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 },
  itemsList: { display: "flex", flexDirection: "column", gap: 8 },
  itemRow: { display: "flex", alignItems: "center", gap: 10 },
  itemQty: { fontWeight: 800, fontSize: 14, color: "#f97316", minWidth: 24 },
  itemName: { flex: 1, fontSize: 14, fontWeight: 600, color: "#1c1917" },
  itemPrice: { fontSize: 14, fontWeight: 700, color: "#78716c" },
  noteBox: { background: "#fafaf9", border: "1.5px solid #f0e8dc", borderRadius: 10, padding: "10px 14px", fontSize: 14, color: "#57534e", fontWeight: 500 },
  noteLabel: { fontWeight: 700 },
  advanceBtn: { color: "#fff", border: "none", borderRadius: 12, padding: "12px", fontSize: 15, fontWeight: 800, fontFamily: "'Nunito', sans-serif" },
};
