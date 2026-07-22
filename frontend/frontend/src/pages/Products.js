import React, { useEffect, useState } from "react";
import { getProducts, createProduct, updateProduct, deleteProduct } from "../api";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

const EMPTY_FORM = { name: "", description: "", price: "", specs: "", image_url: "", video_url: "" };
const BASE = "https://smart-desk-backend-11.onrender.com";

function ProductModal({ initial, onClose, onSaved }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const isEdit = !!initial?.id;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const payload = { ...form, price: form.price ? parseFloat(form.price) : null };
      if (isEdit) await updateProduct(initial.id, payload);
      else         await createProduct(payload);
      toast.success(isEdit ? "Product updated!" : "Product created!");
      onSaved();
    } catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2 className="modal-title">{isEdit ? "✏️ Edit Product" : "➕ New Product"}</h2>
        <form onSubmit={save}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input className="form-input" value={form.name} onChange={e=>set("name",e.target.value)} placeholder="Product name" />
            </div>
            <div className="form-group">
              <label className="form-label">Price (₹)</label>
              <input className="form-input" type="number" value={form.price} onChange={e=>set("price",e.target.value)} placeholder="0.00" step="0.01" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={form.description} onChange={e=>set("description",e.target.value)} placeholder="Product description" />
          </div>
          <div className="form-group">
            <label className="form-label">Specs</label>
            <textarea className="form-textarea" value={form.specs} onChange={e=>set("specs",e.target.value)} placeholder="e.g. Size: 15cm, Weight: 200g" style={{ minHeight: 70 }} />
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Image URL</label>
              <input className="form-input" value={form.image_url} onChange={e=>set("image_url",e.target.value)} placeholder="https://..." />
            </div>
            <div className="form-group">
              <label className="form-label">Video URL</label>
              <input className="form-input" value={form.video_url} onChange={e=>set("video_url",e.target.value)} placeholder="https://youtube.com/..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Save Product"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null); // null | "new" | product object
  const [search, setSearch]     = useState("");

  const load = () => {
    setLoading(true);
    getProducts().then(r => setProducts(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const drop = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    try { await deleteProduct(id); toast.success("Deleted"); load(); } catch { toast.error("Delete failed"); }
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h2>📦 Products</h2>
        <div style={{ display: "flex", gap: 12 }}>
          <input className="search-input" placeholder="Search products…" value={search} onChange={e=>setSearch(e.target.value)} />
          <button className="btn btn-primary" onClick={() => setModal("new")}>+ Add Product</button>
        </div>
      </div>

      {loading
        ? <div className="loading-center"><div className="spinner" /></div>
        : filtered.length === 0
          ? <div className="empty"><div className="empty-icon">📦</div><h3>No products found</h3><p>Add your first product to get started</p></div>
          : <div className="card-grid">
              {filtered.map(p => (
                <div className="product-card" key={p.id}>
                  {p.image_url
                    ? <img className="product-thumb" src={p.image_url} alt={p.name} onError={e=>{e.target.style.display="none"}} />
                    : <div className="product-thumb-placeholder">📦</div>
                  }
                  <div className="product-body">
                    <div className="product-name">{p.name}</div>
                    <div className="product-price">{p.price ? `₹${p.price.toLocaleString()}` : "Price N/A"}</div>
                    <div className="product-desc">{p.description || "No description"}</div>
                    {p.qr_code_path && (
                      <img className="product-qr" src={`${BASE}/${p.qr_code_path}`} alt="QR" />
                    )}
                    <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 12 }}>
                      <Link to={`/products/${p.id}`} className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: "center" }}>👁 View</Link>
                      <button className="btn btn-ghost btn-sm" onClick={() => setModal(p)}>✏️</button>
                      <button className="btn btn-danger btn-sm" onClick={() => drop(p.id)}>🗑</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
      }

      {modal && (
        <ProductModal
          initial={modal === "new" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
