// src/pages/AdminPage.jsx
// Owner product & business management — upload menu items with photos,
// set prices, manage availability, update business details.
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const EMPTY_PRODUCT = { name: "", description: "", price: "", category: "General", available: true, image_url: "" };

export default function AdminPage() {
  const navigate = useNavigate();
  const [user, setUser]           = useState(null);
  const [business, setBusiness]   = useState(null);
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [savingBiz, setSavingBiz] = useState(false);
  const [tab, setTab]             = useState("products"); // "products" | "business"
  const [editingProduct, setEditingProduct] = useState(null); // null | product obj | "new"
  const [uploadingImg, setUploadingImg]     = useState(false);
  const [toast, setToast]         = useState(null);
  const fileRef = useRef();

  // Business form state
  const [bizForm, setBizForm] = useState({ name: "", description: "", slug: "", accent_color: "#f97316" });

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 4000); }

  // ── Auth + Load ─────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate("/login"); return; }
      setUser(session.user);
      loadData(session.user.id);
    });
  }, [navigate]);

  async function loadData(userId) {
    const { data: biz } = await supabase
      .from("businesses")
      .select("*")
      .eq("owner_id", userId)
      .single();

    if (biz) {
      setBusiness(biz);
      setBizForm({ name: biz.name, description: biz.description || "", slug: biz.slug, accent_color: biz.accent_color || "#f97316" });
      const { data: prods } = await supabase
        .from("products")
        .select("*")
        .eq("business_id", biz.id)
        .order("sort_order");
      setProducts(prods || []);
    }
    setLoading(false);
  }

  // ── Business setup / update ──────────────────────────────────
  async function saveBusiness() {
    setSavingBiz(true);
    try {
      const cleanSlug = bizForm.slug.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      if (!cleanSlug) { alert("Please enter a unique URL slug for your shop."); return; }

      if (business) {
        // Update existing
        const { error } = await supabase
          .from("businesses")
          .update({ name: bizForm.name, description: bizForm.description, slug: cleanSlug, accent_color: bizForm.accent_color })
          .eq("id", business.id);
        if (error) throw error;
        setBusiness(b => ({ ...b, name: bizForm.name, description: bizForm.description, slug: cleanSlug, accent_color: bizForm.accent_color }));
      } else {
        // Create new
        const { data, error } = await supabase
          .from("businesses")
          .insert({ owner_id: user.id, name: bizForm.name, description: bizForm.description, slug: cleanSlug, accent_color: bizForm.accent_color })
          .select()
          .single();
        if (error) throw error;
        setBusiness(data);
      }
      showToast("Business info saved! ✅");
    } catch (err) {
      alert(err.message || "Failed to save. The URL slug might already be taken — try a different one.");
    } finally {
      setSavingBiz(false);
    }
  }

  // ── Image upload ─────────────────────────────────────────────
  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    try {
      const ext  = file.name.split(".").pop();
      const path = `${business.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      setEditingProduct(p => ({ ...p, image_url: data.publicUrl }));
    } catch (err) {
      alert("Image upload failed: " + err.message);
    } finally {
      setUploadingImg(false);
    }
  }

  // ── Save product ─────────────────────────────────────────────
  async function saveProduct() {
    if (!editingProduct.name.trim()) { alert("Product needs a name!"); return; }
    if (!editingProduct.price || isNaN(editingProduct.price)) { alert("Enter a valid price."); return; }
    if (!business) { alert("Please set up your business info first."); return; }

    const payload = {
      business_id: business.id,
      name:        editingProduct.name.trim(),
      description: editingProduct.description.trim(),
      price:       parseFloat(parseFloat(editingProduct.price).toFixed(2)),
      category:    editingProduct.category || "General",
      available:   editingProduct.available,
      image_url:   editingProduct.image_url || null,
    };

    if (editingProduct.id) {
      // Update
      const { error } = await supabase.from("products").update(payload).eq("id", editingProduct.id);
      if (error) { alert("Failed to save: " + error.message); return; }
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, ...payload } : p));
      showToast("Product updated! ✅");
    } else {
      // Insert
      const { data, error } = await supabase
        .from("products")
        .insert({ ...payload, sort_order: products.length })
        .select()
        .single();
      if (error) { alert("Failed to add: " + error.message); return; }
      setProducts(prev => [...prev, data]);
      showToast("Product added! 🎉");
    }
    setEditingProduct(null);
  }

  async function toggleAvailability(product) {
    const { error } = await supabase
      .from("products")
      .update({ available: !product.available })
      .eq("id", product.id);
    if (!error) {
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, available: !p.available } : p));
      showToast(`${product.name} ${!product.available ? "enabled" : "hidden"}`);
    }
  }

  async function deleteProduct(id) {
    if (!window.confirm("Remove this product from your menu?")) return;
    await supabase.from("products").delete().eq("id", id);
    setProducts(prev => prev.filter(p => p.id !== id));
    showToast("Product removed.");
  }

  if (loading) return (
    <div style={s.center}>
      <div style={s.spinner} />
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
            <div style={s.brandSub}>Admin</div>
          </div>
        </div>

        <nav style={s.nav}>
          <button onClick={() => setTab("products")} style={{ ...s.navBtn, ...(tab === "products" ? s.navActive : {}) }}>
            <span>🏷️</span><span>Products</span>
          </button>
          <button onClick={() => setTab("business")} style={{ ...s.navBtn, ...(tab === "business" ? s.navActive : {}) }}>
            <span>🏪</span><span>Business Settings</span>
          </button>
          <button onClick={() => navigate("/dashboard")} style={s.navBtn}>
            <span>📦</span><span>Back to Orders</span>
          </button>
        </nav>

        {business?.slug && (
          <div style={s.linkBox}>
            <div style={s.linkLabel}>Your customer link</div>
            <div style={s.linkUrl}>/order/{business.slug}</div>
            <button
              onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/order/${business.slug}`); showToast("Copied! 📋"); }}
              style={s.copyBtn}
            >Copy link</button>
          </div>
        )}
      </aside>

      {/* Main */}
      <main style={s.main}>

        {/* ── PRODUCTS ── */}
        {tab === "products" && (
          <div>
            <div style={s.pageHead}>
              <div>
                <h1 style={s.pageTitle}>Your Menu</h1>
                <p style={s.pageSub}>Add products, set prices, and upload photos.</p>
              </div>
              <button onClick={() => setEditingProduct({ ...EMPTY_PRODUCT })} style={s.addBtn}>
                + Add product
              </button>
            </div>

            {!business && (
              <div style={s.warningBox}>
                ⚠️ Set up your business info first (click "Business Settings" in the sidebar) before adding products.
              </div>
            )}

            <div style={s.productGrid}>
              {products.map((p, i) => (
                <div key={p.id} style={{ ...s.productCard, opacity: p.available ? 1 : 0.55 }}>
                  {p.image_url
                    ? <img src={p.image_url} alt={p.name} style={s.productImg} />
                    : <div style={s.productImgPlaceholder}>{p.name.charAt(0)}</div>
                  }
                  <div style={s.productCardBody}>
                    <div style={s.productName}>{p.name}</div>
                    <div style={s.productCat}>{p.category}</div>
                    <div style={s.productDesc}>{p.description}</div>
                    <div style={s.productPrice}>${parseFloat(p.price).toFixed(2)}</div>
                    <div style={s.productActions}>
                      <button onClick={() => setEditingProduct({ ...p })} style={s.editBtn}>Edit</button>
                      <button onClick={() => toggleAvailability(p)} style={s.toggleBtn}>
                        {p.available ? "Hide" : "Show"}
                      </button>
                      <button onClick={() => deleteProduct(p.id)} style={s.deleteBtn}>✕</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {products.length === 0 && (
              <div style={s.emptyState}>
                <div style={{ fontSize: 56, marginBottom: 12 }}>🍽️</div>
                <div style={s.emptyTitle}>No products yet</div>
                <div style={s.emptySub}>Click "Add product" to start building your menu.</div>
              </div>
            )}
          </div>
        )}

        {/* ── BUSINESS SETTINGS ── */}
        {tab === "business" && (
          <div>
            <div style={s.pageHead}>
              <div>
                <h1 style={s.pageTitle}>Business Settings</h1>
                <p style={s.pageSub}>Set up how your ordering page looks to customers.</p>
              </div>
            </div>

            <div style={s.settingsCard}>
              <label style={s.label}>Business name *</label>
              <input style={s.input} value={bizForm.name} onChange={e => setBizForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. The Corner Café" />

              <label style={s.label}>Description (shown to customers)</label>
              <textarea style={{ ...s.input, height: 80, resize: "vertical" }} value={bizForm.description} onChange={e => setBizForm(f => ({ ...f, description: e.target.value }))} placeholder="Fresh coffee and homemade pastries…" />

              <label style={s.label}>
                Your unique URL slug *
                <span style={s.slugHelp}> — customers visit: /order/<strong>{bizForm.slug || "your-slug"}</strong></span>
              </label>
              <input style={s.input} value={bizForm.slug} onChange={e => setBizForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") }))} placeholder="e.g. corner-cafe" />

              <label style={s.label}>Brand colour (used on customer order page)</label>
              <div style={s.colorRow}>
                <input type="color" value={bizForm.accent_color} onChange={e => setBizForm(f => ({ ...f, accent_color: e.target.value }))} style={s.colorPicker} />
                <span style={{ ...s.colorSwatch, background: bizForm.accent_color }} />
                <span style={s.colorVal}>{bizForm.accent_color}</span>
              </div>

              {/* Preview */}
              <div style={{ ...s.preview, borderColor: bizForm.accent_color + "44", background: bizForm.accent_color + "11" }}>
                <div style={{ ...s.previewName, color: bizForm.accent_color }}>{bizForm.name || "Your Business Name"}</div>
                <div style={s.previewDesc}>{bizForm.description || "Your description will appear here."}</div>
              </div>

              <button onClick={saveBusiness} disabled={savingBiz} style={s.saveBtn}>
                {savingBiz ? "Saving…" : business ? "Save changes" : "Create my business →"}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── Product Edit Modal ── */}
      {editingProduct && (
        <div style={s.overlay} onClick={() => setEditingProduct(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h2 style={s.modalTitle}>{editingProduct.id ? "Edit product" : "Add new product"}</h2>

            {/* Image */}
            <div style={s.imgUploadArea} onClick={() => fileRef.current?.click()}>
              {editingProduct.image_url
                ? <img src={editingProduct.image_url} alt="" style={s.imgPreview} />
                : <div style={s.imgPlaceholder}>
                    {uploadingImg ? "Uploading…" : "📷 Click to add a photo"}
                  </div>
              }
              {editingProduct.image_url && !uploadingImg && (
                <div style={s.changeImgBtn}>Change photo</div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />

            <label style={s.label}>Name *</label>
            <input style={s.input} value={editingProduct.name} onChange={e => setEditingProduct(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Flat White" />

            <label style={s.label}>Description</label>
            <textarea style={{ ...s.input, height: 64, resize: "none" }} value={editingProduct.description} onChange={e => setEditingProduct(p => ({ ...p, description: e.target.value }))} placeholder="Short description…" />

            <div style={s.twoCol}>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Price ($) *</label>
                <input style={s.input} type="number" step="0.01" value={editingProduct.price} onChange={e => setEditingProduct(p => ({ ...p, price: e.target.value }))} placeholder="0.00" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Category</label>
                <input style={s.input} value={editingProduct.category} onChange={e => setEditingProduct(p => ({ ...p, category: e.target.value }))} placeholder="e.g. Drinks" />
              </div>
            </div>

            <label style={s.checkRow}>
              <input type="checkbox" checked={editingProduct.available} onChange={e => setEditingProduct(p => ({ ...p, available: e.target.checked }))} />
              <span style={s.checkLabel}>Available on menu (customers can order this)</span>
            </label>

            <div style={s.modalBtns}>
              <button onClick={() => setEditingProduct(null)} style={s.cancelBtn}>Cancel</button>
              <button onClick={saveProduct} style={s.saveProdBtn}>
                {editingProduct.id ? "Save changes" : "Add to menu"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes popIn  { from { opacity:0; transform:scale(0.93); } to { opacity:1; transform:scale(1); } }
        @keyframes spin   { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

const s = {
  root: { display: "flex", minHeight: "100vh", background: "#fdf8f3", fontFamily: "'Nunito', sans-serif" },
  center: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" },
  spinner: { width: 36, height: 36, border: "4px solid #f0e8dc", borderTop: "4px solid #f97316", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  toast: { position: "fixed", bottom: 24, right: 24, zIndex: 9999, background: "#1c1917", color: "#fef3c7", padding: "13px 22px", borderRadius: 14, fontSize: 14, fontWeight: 600, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" },

  sidebar: { width: 240, background: "#fff", borderRight: "1.5px solid #f0e8dc", padding: "24px 16px", display: "flex", flexDirection: "column", gap: 18, position: "sticky", top: 0, height: "100vh", overflowY: "auto" },
  brand: { display: "flex", alignItems: "center", gap: 10 },
  brandIcon: { fontSize: 26, background: "#fff7ed", borderRadius: 10, width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid #fed7aa" },
  brandName: { fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 700, color: "#1c1917" },
  brandSub: { fontSize: 12, color: "#f97316", fontWeight: 700 },

  nav: { display: "flex", flexDirection: "column", gap: 3 },
  navBtn: { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: "none", background: "transparent", color: "#78716c", fontSize: 13, fontWeight: 600, fontFamily: "'Nunito', sans-serif", textAlign: "left" },
  navActive: { background: "#fff7ed", color: "#c2410c" },

  linkBox: { background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: 12, padding: "12px", marginTop: "auto" },
  linkLabel: { fontSize: 10, fontWeight: 800, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 },
  linkUrl: { fontSize: 13, fontWeight: 600, color: "#1c1917", fontFamily: "monospace", marginBottom: 8 },
  copyBtn: { background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, fontFamily: "'Nunito', sans-serif", width: "100%" },

  main: { flex: 1, padding: "36px 40px" },
  pageHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 },
  pageTitle: { fontFamily: "'Fraunces', serif", fontSize: 32, fontWeight: 700, color: "#1c1917" },
  pageSub: { color: "#a8a29e", fontSize: 14, marginTop: 4, fontWeight: 500 },
  addBtn: { background: "#f97316", color: "#fff", border: "none", borderRadius: 12, padding: "10px 20px", fontSize: 14, fontWeight: 800, fontFamily: "'Nunito', sans-serif", whiteSpace: "nowrap" },

  warningBox: { background: "#fffbeb", border: "1.5px solid #fde68a", color: "#92400e", borderRadius: 10, padding: "12px 16px", fontSize: 14, fontWeight: 600, marginBottom: 20 },

  productGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 },
  productCard: { background: "#fff", borderRadius: 16, border: "1.5px solid #f0e8dc", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column" },
  productImg: { width: "100%", height: 140, objectFit: "cover" },
  productImgPlaceholder: { width: "100%", height: 140, background: "#f0e8dc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, fontWeight: 700, color: "#a8a29e" },
  productCardBody: { padding: "14px", flex: 1, display: "flex", flexDirection: "column", gap: 4 },
  productName: { fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 600, color: "#1c1917" },
  productCat: { fontSize: 11, fontWeight: 700, color: "#a8a29e", textTransform: "uppercase", letterSpacing: "0.05em" },
  productDesc: { fontSize: 12, color: "#78716c", fontWeight: 500, lineHeight: 1.4, flex: 1 },
  productPrice: { fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 700, color: "#1c1917", marginTop: 4 },
  productActions: { display: "flex", gap: 6, marginTop: 8 },
  editBtn: { flex: 1, background: "#fafaf9", border: "1.5px solid #e7e5e4", color: "#57534e", borderRadius: 8, padding: "6px", fontSize: 12, fontWeight: 700, fontFamily: "'Nunito', sans-serif" },
  toggleBtn: { flex: 1, background: "#fff7ed", border: "1.5px solid #fed7aa", color: "#c2410c", borderRadius: 8, padding: "6px", fontSize: 12, fontWeight: 700, fontFamily: "'Nunito', sans-serif" },
  deleteBtn: { background: "#fef2f2", border: "1.5px solid #fecaca", color: "#dc2626", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 700, fontFamily: "'Nunito', sans-serif" },

  emptyState: { textAlign: "center", padding: "80px 0" },
  emptyTitle: { fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 600, color: "#1c1917", marginBottom: 8 },
  emptySub: { color: "#a8a29e", fontSize: 15 },

  settingsCard: { background: "#fff", borderRadius: 20, border: "1.5px solid #f0e8dc", padding: "32px", maxWidth: 560, boxShadow: "0 2px 12px rgba(0,0,0,0.05)" },
  label: { display: "block", fontSize: 13, fontWeight: 700, color: "#57534e", marginBottom: 5, marginTop: 4 },
  input: { width: "100%", border: "1.5px solid #e7ddd0", borderRadius: 10, padding: "10px 14px", fontSize: 15, color: "#1c1917", background: "#fafaf9", marginBottom: 12, outline: "none" },
  slugHelp: { fontWeight: 400, color: "#a8a29e", fontSize: 12 },
  colorRow: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 },
  colorPicker: { width: 44, height: 44, border: "none", borderRadius: 10, cursor: "pointer", padding: 0 },
  colorSwatch: { width: 32, height: 32, borderRadius: 8, border: "1.5px solid rgba(0,0,0,0.1)" },
  colorVal: { fontSize: 13, fontWeight: 600, color: "#57534e", fontFamily: "monospace" },
  preview: { border: "2px solid", borderRadius: 14, padding: "16px 20px", marginBottom: 20 },
  previewName: { fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, marginBottom: 4 },
  previewDesc: { fontSize: 14, color: "#78716c", fontWeight: 500 },
  saveBtn: { width: "100%", background: "#f97316", color: "#fff", border: "none", borderRadius: 12, padding: "13px", fontSize: 15, fontWeight: 800, fontFamily: "'Nunito', sans-serif" },

  overlay: { position: "fixed", inset: 0, background: "rgba(28,25,23,0.45)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24 },
  modal: { background: "#fff", borderRadius: 22, padding: "28px 32px", maxWidth: 480, width: "100%", boxShadow: "0 24px 80px rgba(0,0,0,0.14)", animation: "popIn 0.25s ease", overflowY: "auto", maxHeight: "90vh" },
  modalTitle: { fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, color: "#1c1917", marginBottom: 18 },
  imgUploadArea: { border: "2px dashed #e7ddd0", borderRadius: 14, overflow: "hidden", cursor: "pointer", marginBottom: 16, position: "relative", minHeight: 120 },
  imgPreview: { width: "100%", height: 150, objectFit: "cover" },
  imgPlaceholder: { height: 120, display: "flex", alignItems: "center", justifyContent: "center", color: "#a8a29e", fontSize: 15, fontWeight: 600, background: "#fafaf9" },
  changeImgBtn: { position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.6)", color: "#fff", padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600 },
  twoCol: { display: "flex", gap: 12 },
  checkRow: { display: "flex", alignItems: "center", gap: 10, margin: "6px 0 18px", cursor: "pointer" },
  checkLabel: { fontSize: 14, fontWeight: 500, color: "#57534e" },
  modalBtns: { display: "flex", gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, padding: "11px", border: "1.5px solid #e7e5e4", borderRadius: 12, background: "#fafaf9", color: "#78716c", fontSize: 14, fontWeight: 700, fontFamily: "'Nunito', sans-serif" },
  saveProdBtn: { flex: 2, padding: "11px", border: "none", borderRadius: 12, background: "#f97316", color: "#fff", fontSize: 14, fontWeight: 800, fontFamily: "'Nunito', sans-serif" },
};
