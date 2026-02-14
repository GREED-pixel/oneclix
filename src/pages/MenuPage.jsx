// src/pages/MenuPage.jsx
// Customer-facing ordering page — loaded via /order/:slug
// Shows the business's menu, lets customers add items to a cart,
// enter their name, and submit. Shows a confirmation popup on success.
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function MenuPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [business, setBusiness]     = useState(null);
  const [products, setProducts]     = useState([]);
  const [cart, setCart]             = useState({});        // { productId: quantity }
  const [customerName, setCustomerName] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState(null);
  const [confirmed, setConfirmed]   = useState(false);
  const [orderId, setOrderId]       = useState(null);
  const [activeCategory, setActiveCategory] = useState("All");

  // ── Load business + products ───────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: biz, error: bizErr } = await supabase
        .from("businesses")
        .select("*")
        .eq("slug", slug)
        .single();

      if (bizErr || !biz) {
        setError("We couldn't find that business. Check the link and try again.");
        setLoading(false);
        return;
      }
      setBusiness(biz);

      const { data: prods } = await supabase
        .from("products")
        .select("*")
        .eq("business_id", biz.id)
        .eq("available", true)
        .order("sort_order");

      setProducts(prods || []);
      setLoading(false);
    }
    load();
  }, [slug]);

  // ── Cart helpers ───────────────────────────────────────────
  function addToCart(id) {
    setCart(c => ({ ...c, [id]: (c[id] || 0) + 1 }));
  }
  function removeFromCart(id) {
    setCart(c => {
      const next = { ...c };
      if (next[id] > 1) next[id]--;
      else delete next[id];
      return next;
    });
  }
  const cartItems = products.filter(p => cart[p.id]);
  const cartTotal = cartItems.reduce((s, p) => s + p.price * cart[p.id], 0);
  const cartCount = Object.values(cart).reduce((s, n) => s + n, 0);

  // ── Submit order ───────────────────────────────────────────
  async function submitOrder() {
    if (!customerName.trim()) { alert("Please enter your name so we know whose order it is!"); return; }
    if (cartItems.length === 0) { alert("Your cart is empty — add something first!"); return; }

    setSubmitting(true);
    try {
      // 1. Insert order
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          business_id: business.id,
          customer_name: customerName.trim(),
          customer_note: customerNote.trim() || null,
          status: "pending",
          total: parseFloat(cartTotal.toFixed(2)),
        })
        .select()
        .single();

      if (orderErr) throw orderErr;

      // 2. Insert line items
      const items = cartItems.map(p => ({
        order_id: order.id,
        product_id: p.id,
        name: p.name,
        price: p.price,
        quantity: cart[p.id],
      }));
      const { error: itemsErr } = await supabase.from("order_items").insert(items);
      if (itemsErr) throw itemsErr;

      setOrderId(order.id);
      setConfirmed(true);
    } catch (err) {
      alert("Something went wrong placing your order. Please try again!");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Categories ─────────────────────────────────────────────
  const categories = ["All", ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];
  const visibleProducts = activeCategory === "All"
    ? products
    : products.filter(p => p.category === activeCategory);

  const accent = business?.accent_color || "#f97316";

  // ── Loading state ──────────────────────────────────────────
  if (loading) return (
    <div style={s.center}>
      <div style={{ ...s.spinner, borderTopColor: accent }} />
      <p style={s.loadingText}>Loading menu…</p>
    </div>
  );

  if (error) return (
    <div style={s.center}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🔍</div>
      <h2 style={s.errorTitle}>Shop not found</h2>
      <p style={s.errorText}>{error}</p>
      <button onClick={() => navigate("/")} style={{ ...s.backBtn, background: accent }}>
        ← Back to home
      </button>
    </div>
  );

  return (
    <div style={s.root}>
      {/* ── Confirmation overlay ── */}
      {confirmed && (
        <ConfirmationModal
          businessName={business.name}
          customerName={customerName}
          orderId={orderId}
          accent={accent}
          onOrderAgain={() => {
            setCart({});
            setCustomerName("");
            setCustomerNote("");
            setConfirmed(false);
            setOrderId(null);
          }}
        />
      )}

      {/* ── Business header ── */}
      <header style={{ ...s.header, background: `linear-gradient(135deg, ${accent}22, ${accent}08)`, borderBottom: `1.5px solid ${accent}33` }}>
        <div style={s.headerInner}>
          {business.logo_url
            ? <img src={business.logo_url} alt={business.name} style={s.logo} />
            : <div style={{ ...s.logoPlaceholder, background: accent }}>
                {business.name.charAt(0).toUpperCase()}
              </div>
          }
          <div>
            <h1 style={s.bizName}>{business.name}</h1>
            {business.description && <p style={s.bizDesc}>{business.description}</p>}
          </div>
        </div>
      </header>

      <div style={s.body}>
        {/* ── Left: Menu ── */}
        <div style={s.menuCol}>
          {/* Category tabs */}
          {categories.length > 1 && (
            <div style={s.catRow}>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    ...s.catBtn,
                    ...(activeCategory === cat ? { background: accent, color: "#fff", borderColor: accent } : {}),
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Product grid */}
          <div style={s.productGrid}>
            {visibleProducts.map((p, i) => (
              <div key={p.id} style={{ ...s.productCard, animation: `fadeUp 0.3s ease ${i * 0.04}s both` }}>
                {p.image_url
                  ? <img src={p.image_url} alt={p.name} style={s.productImg} />
                  : <div style={s.productImgPlaceholder}>{p.name.charAt(0)}</div>
                }
                <div style={s.productInfo}>
                  <div style={s.productName}>{p.name}</div>
                  {p.description && <div style={s.productDesc}>{p.description}</div>}
                  <div style={s.productBottom}>
                    <span style={s.productPrice}>${p.price.toFixed(2)}</span>
                    <div style={s.qtyControls}>
                      {cart[p.id] > 0 && (
                        <>
                          <button onClick={() => removeFromCart(p.id)} style={s.qtyBtn}>−</button>
                          <span style={s.qtyNum}>{cart[p.id]}</span>
                        </>
                      )}
                      <button onClick={() => addToCart(p.id)} style={{ ...s.qtyBtn, ...s.addBtn, background: accent }}>
                        {cart[p.id] ? "+" : "Add"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Cart + Checkout ── */}
        <aside style={s.cartCol}>
          <div style={s.cartBox}>
            <h2 style={s.cartTitle}>Your order {cartCount > 0 && <span style={{ ...s.cartBadge, background: accent }}>{cartCount}</span>}</h2>

            {cartItems.length === 0 ? (
              <div style={s.emptyCart}>
                <div style={{ fontSize: 36 }}>🛒</div>
                <p>Nothing added yet.<br />Pick something from the menu!</p>
              </div>
            ) : (
              <div style={s.cartItems}>
                {cartItems.map(p => (
                  <div key={p.id} style={s.cartItem}>
                    <div style={s.cartItemName}>{p.name}</div>
                    <div style={s.cartItemRight}>
                      <div style={s.cartQtyRow}>
                        <button onClick={() => removeFromCart(p.id)} style={s.smallQtyBtn}>−</button>
                        <span style={s.cartQty}>{cart[p.id]}</span>
                        <button onClick={() => addToCart(p.id)} style={s.smallQtyBtn}>+</button>
                      </div>
                      <span style={s.cartItemPrice}>${(p.price * cart[p.id]).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
                <div style={s.cartTotal}>
                  <span>Total</span>
                  <strong>${cartTotal.toFixed(2)}</strong>
                </div>
              </div>
            )}

            {/* Customer details */}
            <div style={s.customerForm}>
              <label style={s.label}>Your name *</label>
              <input
                style={s.input}
                placeholder="e.g. Jamie"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
              />
              <label style={s.label}>Any special requests? (optional)</label>
              <textarea
                style={{ ...s.input, height: 72, resize: "none" }}
                placeholder="e.g. oat milk, no sugar…"
                value={customerNote}
                onChange={e => setCustomerNote(e.target.value)}
              />
            </div>

            <button
              onClick={submitOrder}
              disabled={submitting || cartItems.length === 0 || !customerName.trim()}
              style={{
                ...s.submitBtn,
                background: accent,
                opacity: (submitting || cartItems.length === 0 || !customerName.trim()) ? 0.5 : 1,
              }}
            >
              {submitting ? "Placing order…" : `Place order · $${cartTotal.toFixed(2)}`}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ── Confirmation Modal ─────────────────────────────────────────
function ConfirmationModal({ businessName, customerName, orderId, accent, onOrderAgain }) {
  const navigate = useNavigate();

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.successIcon}>🎉</div>
        <h2 style={s.modalTitle}>You're all set, {customerName.split(" ")[0]}!</h2>
        <p style={s.modalDesc}>
          Your order has been sent to <strong>{businessName}</strong>.
          They're on it — head over and it'll be ready for you!
        </p>

        <div style={s.orderIdBox}>
          <span style={s.orderIdLabel}>Order reference</span>
          <span style={s.orderIdVal}>#{orderId?.slice(-8).toUpperCase()}</span>
        </div>

        <div style={s.modalSteps}>
          {["Order received ✓", "Being prepared 🔥", "Ready for pickup 🏃"].map((step, i) => (
            <div key={i} style={{ ...s.modalStep, ...(i === 0 ? { color: accent, fontWeight: 700 } : {}) }}>
              {step}
            </div>
          ))}
        </div>

        <div style={s.modalBtns}>
          <button onClick={onOrderAgain} style={{ ...s.modalBtn, background: accent, color: "#fff" }}>
            Order something else
          </button>
          <button onClick={() => navigate("/")} style={s.modalBtnSecondary}>
            ← Back to home
          </button>
        </div>
      </div>
    </div>
  );
}

const s = {
  root: { minHeight: "100vh", background: "#fdf8f3" },
  center: {
    minHeight: "100vh", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    textAlign: "center", padding: 24,
  },
  spinner: {
    width: 40, height: 40, border: "4px solid #f0e8dc",
    borderRadius: "50%", animation: "spin 0.8s linear infinite", marginBottom: 16,
  },
  loadingText: { color: "#a8a29e", fontWeight: 600 },
  errorTitle: { fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 700, marginBottom: 8 },
  errorText: { color: "#78716c", fontSize: 15, marginBottom: 24 },
  backBtn: { color: "#fff", border: "none", borderRadius: 12, padding: "12px 24px", fontSize: 15, fontWeight: 700 },

  header: { padding: "20px 24px" },
  headerInner: { maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", gap: 16 },
  logo: { width: 60, height: 60, borderRadius: 14, objectFit: "cover", border: "2px solid #f0e8dc" },
  logoPlaceholder: {
    width: 60, height: 60, borderRadius: 14,
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#fff", fontSize: 26, fontWeight: 800,
  },
  bizName: { fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 700, color: "#1c1917" },
  bizDesc: { color: "#78716c", fontSize: 14, fontWeight: 500, marginTop: 2 },

  body: {
    maxWidth: 1100, margin: "0 auto", padding: "24px",
    display: "flex", gap: 24, alignItems: "flex-start",
  },
  menuCol: { flex: 1, minWidth: 0 },

  catRow: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 },
  catBtn: {
    padding: "7px 18px", border: "1.5px solid #e7ddd0", borderRadius: 24,
    background: "#fff", color: "#78716c", fontSize: 14, fontWeight: 600,
    transition: "all 0.15s",
  },

  productGrid: { display: "flex", flexDirection: "column", gap: 12 },
  productCard: {
    background: "#fff", borderRadius: 16, border: "1.5px solid #f0e8dc",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    display: "flex", overflow: "hidden",
  },
  productImg: { width: 110, height: 110, objectFit: "cover", flexShrink: 0 },
  productImgPlaceholder: {
    width: 110, height: 110, flexShrink: 0,
    background: "#f0e8dc", display: "flex", alignItems: "center",
    justifyContent: "center", fontSize: 32, fontWeight: 700, color: "#a8a29e",
  },
  productInfo: { flex: 1, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4 },
  productName: { fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 600, color: "#1c1917" },
  productDesc: { color: "#78716c", fontSize: 13, fontWeight: 500, lineHeight: 1.4 },
  productBottom: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: 8 },
  productPrice: { fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 700, color: "#1c1917" },
  qtyControls: { display: "flex", alignItems: "center", gap: 8 },
  qtyBtn: {
    width: 32, height: 32, borderRadius: 8, border: "1.5px solid #e7ddd0",
    background: "#fafaf9", color: "#57534e", fontSize: 16, fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  addBtn: { width: "auto", padding: "0 14px", color: "#fff", border: "none", fontSize: 14, fontWeight: 700 },
  qtyNum: { fontWeight: 700, fontSize: 15, minWidth: 20, textAlign: "center" },

  cartCol: { width: 320, flexShrink: 0, position: "sticky", top: 24 },
  cartBox: {
    background: "#fff", borderRadius: 20, border: "1.5px solid #f0e8dc",
    boxShadow: "0 4px 20px rgba(0,0,0,0.07)", padding: "24px",
  },
  cartTitle: { fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 10 },
  cartBadge: { color: "#fff", borderRadius: 20, fontSize: 13, fontWeight: 800, padding: "2px 10px" },
  emptyCart: { textAlign: "center", color: "#a8a29e", padding: "24px 0", fontSize: 14, fontWeight: 500, lineHeight: 1.6 },
  cartItems: { display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 },
  cartItem: { display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, borderBottom: "1px solid #f0e8dc" },
  cartItemName: { fontSize: 14, fontWeight: 600, color: "#1c1917", flex: 1 },
  cartItemRight: { display: "flex", alignItems: "center", gap: 12 },
  cartQtyRow: { display: "flex", alignItems: "center", gap: 6 },
  smallQtyBtn: {
    width: 24, height: 24, borderRadius: 6, border: "1.5px solid #e7ddd0",
    background: "#fafaf9", fontSize: 14, fontWeight: 700, color: "#57534e",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  cartQty: { fontSize: 14, fontWeight: 700, minWidth: 16, textAlign: "center" },
  cartItemPrice: { fontSize: 14, fontWeight: 700, color: "#1c1917", minWidth: 50, textAlign: "right" },
  cartTotal: {
    display: "flex", justifyContent: "space-between",
    fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700,
    paddingTop: 8, color: "#1c1917",
  },

  customerForm: { margin: "16px 0" },
  label: { display: "block", fontSize: 13, fontWeight: 700, color: "#57534e", marginBottom: 5 },
  input: {
    width: "100%", border: "1.5px solid #e7ddd0", borderRadius: 10,
    padding: "10px 14px", fontSize: 15, color: "#1c1917",
    background: "#fafaf9", marginBottom: 14, outline: "none",
  },

  submitBtn: {
    width: "100%", border: "none", borderRadius: 12,
    padding: "14px", fontSize: 16, fontWeight: 800, color: "#fff",
    transition: "opacity 0.15s",
  },

  overlay: {
    position: "fixed", inset: 0, background: "rgba(28,25,23,0.5)",
    backdropFilter: "blur(8px)", display: "flex",
    alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24,
  },
  modal: {
    background: "#fff", borderRadius: 24, padding: "40px 36px",
    maxWidth: 440, width: "100%", textAlign: "center",
    animation: "popIn 0.3s ease",
    boxShadow: "0 30px 80px rgba(0,0,0,0.18)",
  },
  successIcon: { fontSize: 60, marginBottom: 16 },
  modalTitle: { fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 700, color: "#1c1917", marginBottom: 10 },
  modalDesc: { color: "#78716c", fontSize: 15, fontWeight: 500, lineHeight: 1.6, marginBottom: 20 },
  orderIdBox: {
    background: "#fdf8f3", border: "1.5px solid #f0e8dc",
    borderRadius: 12, padding: "12px 20px",
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: 20,
  },
  orderIdLabel: { fontSize: 12, fontWeight: 700, color: "#a8a29e", textTransform: "uppercase", letterSpacing: "0.05em" },
  orderIdVal: { fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 700, color: "#1c1917" },
  modalSteps: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 24, textAlign: "left" },
  modalStep: { fontSize: 14, fontWeight: 500, color: "#a8a29e", padding: "4px 0" },
  modalBtns: { display: "flex", flexDirection: "column", gap: 10 },
  modalBtn: { border: "none", borderRadius: 12, padding: "13px", fontSize: 15, fontWeight: 800 },
  modalBtnSecondary: {
    background: "transparent", border: "1.5px solid #e7ddd0",
    borderRadius: 12, padding: "12px", fontSize: 15, fontWeight: 600, color: "#78716c",
  },
};
