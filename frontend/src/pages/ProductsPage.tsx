import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { GlassCard } from '../components/GlassCard';
import { StatusBadge } from '../components/StatusBadge';
import { TableSkeleton } from '../components/Skeleton';
import { getProducts, createProduct, deleteProductApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PlusIcon, ProductsIcon, AlertTriangleIcon, BarChartIcon, CrossIcon, EyeIcon, TrashIcon } from '../components/Icons';
import type { Product } from '../types';

export default function ProductsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { show } = useToast();
  const canWrite = user?.role === 'Admin' || user?.role === 'Warehouse';

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Delete Product Modal State
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    name: '', sku: '', category: 'Hardware', unit_price: '', current_stock: '', min_stock_alert: '10', location: '',
  });
  const limit = 10;

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getProducts({
        page,
        limit,
        search: search || undefined,
        low_stock: lowStockFilter || undefined
      });
      setProducts(res.data.data);
      setTotal(res.data.total);
    } catch {
      show('Failed to load products', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, lowStockFilter]);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => { setPage(1); }, [search, lowStockFilter, categoryFilter]);

  // Compute Live Inventory Valuation on Current Filtered View
  const liveValuation = products
    .filter(p => !categoryFilter || p.category === categoryFilter)
    .reduce((sum, p) => sum + (Number(p.current_stock) * Number(p.unit_price)), 0);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!form.name.trim() || !form.sku.trim() || !form.unit_price) {
      setValidationError('Please complete Product Name, SKU, and Unit Price.');
      return;
    }

    setSaving(true);
    try {
      const res = await createProduct({
        ...form,
        unit_price: Number(form.unit_price),
        current_stock: Number(form.current_stock || 0),
        min_stock_alert: Number(form.min_stock_alert || 0),
      });
      show(`Product "${res.data.name}" created successfully!`, 'success');
      setShowModal(false);
      setForm({ name: '', sku: '', category: 'Hardware', unit_price: '', current_stock: '', min_stock_alert: '10', location: '' });
      setPage(1);
      await fetch();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to create product';
      setValidationError(msg);
      show(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Delete Product Handler
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteProductApi(deleteTarget.id);
      show(`Product "${deleteTarget.name}" deleted successfully!`, 'success');
      setDeleteTarget(null);
      await fetch();
    } catch (err: any) {
      show(err.response?.data?.error || 'Failed to delete product', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <>
      <Header title="Products & Stock" subtitle="Track product inventory, SKU pricing & live valuation" />
      <div className="page-content">

        {/* Action Header & Live Inventory Valuation Calculator Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '20px', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Products & Inventory</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>{total} total products in catalog</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Live Inventory Valuation Calculator Strip */}
            <GlassCard style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '34px', height: '34px', borderRadius: '10px',
                background: 'var(--bg-elevated)', border: '1px solid var(--border-glass)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <BarChartIcon size={16} color="var(--text-primary)" />
              </div>
              <div>
                <div style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Live View Valuation
                </div>
                <div className="tabular-nums" style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  ₹{liveValuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </GlassCard>

            {canWrite && (
              <button id="add-product-btn" className="btn btn-primary" onClick={() => { setValidationError(''); setShowModal(true); }}>
                <PlusIcon size={16} />
                <span>Add Product</span>
              </button>
            )}
          </div>
        </div>

        {/* Search, Category & Gradient Toggle Switch Bar */}
        <div className="filters-bar">
          <input
            id="product-search"
            className="input input-search"
            style={{ width: '280px' }}
            placeholder="Search product name, SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <select
            className="select"
            style={{ width: '160px' }}
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            <option value="Hardware">Hardware</option>
            <option value="Industrial">Industrial</option>
            <option value="Electronics">Electronics</option>
            <option value="Electrical">Electrical</option>
          </select>

          {/* Low Stock Only Gradient Toggle Switch */}
          <button
            type="button"
            onClick={() => setLowStockFilter(!lowStockFilter)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-full)',
              fontSize: '12.5px',
              fontWeight: 600,
              border: lowStockFilter ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid var(--border-glass)',
              background: lowStockFilter ? 'rgba(244, 63, 94, 0.14)' : 'var(--bg-surface)',
              color: lowStockFilter ? 'var(--status-danger)' : 'var(--text-secondary)',
              transition: 'var(--transition-fast)',
              cursor: 'pointer'
            }}
          >
            <AlertTriangleIcon size={14} color={lowStockFilter ? 'var(--status-danger)' : 'var(--text-secondary)'} />
            <span>Low Stock Only</span>
          </button>
        </div>

        {/* Table */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Product Name</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Unit Price</th>
                <th>Stock Quantity</th>
                <th>Inventory Status</th>
                <th style={{ textAlign: 'center', width: '130px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={5} cols={7} />
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <ProductsIcon size={32} color="var(--text-disabled)" />
                      <p style={{ fontSize: '14px', fontWeight: 600 }}>No product records match criteria</p>
                    </div>
                  </td>
                </tr>
              ) : (
                products
                  .filter(p => !categoryFilter || p.category === categoryFilter)
                  .map(p => (
                    <tr key={p.id} className="clickable" onClick={() => navigate(`/products/${p.id}`)}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-primary)', background: 'var(--bg-elevated)', padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--border-glass)' }}>
                          {p.sku}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{p.category || '—'}</td>
                      <td className="tabular-nums" style={{ fontWeight: 600 }}>
                        ₹{Number(p.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="tabular-nums">
                        <span style={{ fontWeight: 800, color: p.is_low_stock ? 'var(--status-danger)' : 'var(--text-primary)' }}>
                          {p.current_stock}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '4px' }}>units</span>
                      </td>
                      <td>
                        <StatusBadge
                          status={p.is_low_stock ? 'danger' : 'success'}
                          label={p.is_low_stock ? 'Low Stock' : 'In Stock'}
                        />
                      </td>

                      {/* Standalone SVG Icon Action Buttons */}
                      <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                          
                          {/* 👁️ View Product Details SVG Only */}
                          <button
                            type="button"
                            className="table-action-icon-btn"
                            title="View Product Details"
                            onClick={(e) => { e.stopPropagation(); navigate(`/products/${p.id}`); }}
                            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-glass)' }}
                          >
                            <EyeIcon size={15} color="var(--text-primary)" />
                          </button>

                          {/* 🔴 Delete Product & Stocks SVG Only */}
                          {canWrite && (
                            <button
                              type="button"
                              className="table-action-icon-btn"
                              title="Permanently Delete Product & Stocks"
                              onClick={(e) => { e.stopPropagation(); setDeleteTarget(p); }}
                              style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)' }}
                            >
                              <TrashIcon size={15} color="var(--status-danger)" />
                            </button>
                          )}

                        </div>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderTop: '1px solid var(--border-glass)' }}>
              <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                Showing page {page} of {totalPages} ({total} products total)
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
                <button className="btn btn-secondary btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
              </div>
            </div>
          )}
        </div>

        {/* Add Product Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
            <div className="modal">
              <div className="modal-header">
                <h2 className="modal-title">Add New Product</h2>
                <button className="modal-close" onClick={() => setShowModal(false)}>
                  <CrossIcon size={16} />
                </button>
              </div>
              <form onSubmit={handleCreate}>
                <div className="modal-body">
                  {validationError && (
                    <div style={{
                      background: 'rgba(244, 63, 94, 0.12)',
                      border: '1px solid rgba(244, 63, 94, 0.25)',
                      color: 'var(--status-danger)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 14px',
                      fontSize: '13px',
                      marginBottom: '16px'
                    }}>
                      {validationError}
                    </div>
                  )}

                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Product Name *</label>
                      <input
                        className={`input ${validationError && !form.name ? 'input-error' : ''}`}
                        required
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Steel Hex Bolt M12"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">SKU Code *</label>
                      <input
                        className={`input ${validationError && !form.sku ? 'input-error' : ''}`}
                        required
                        value={form.sku}
                        onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                        placeholder="SKU-BOLT-M12"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Category</label>
                      <select className="select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                        <option value="Hardware">Hardware</option>
                        <option value="Industrial">Industrial</option>
                        <option value="Electronics">Electronics</option>
                        <option value="Electrical">Electrical</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Unit Price (₹) *</label>
                      <input
                        className={`input ${validationError && !form.unit_price ? 'input-error' : ''}`}
                        type="number"
                        step="0.01"
                        required
                        value={form.unit_price}
                        onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))}
                        placeholder="150.00"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Initial Stock *</label>
                      <input
                        className="input"
                        type="number"
                        required
                        value={form.current_stock}
                        onChange={e => setForm(f => ({ ...f, current_stock: e.target.value }))}
                        placeholder="100"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Low Stock Alert Threshold</label>
                      <input
                        className="input"
                        type="number"
                        value={form.min_stock_alert}
                        onChange={e => setForm(f => ({ ...f, min_stock_alert: e.target.value }))}
                        placeholder="10"
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Warehouse Location</label>
                    <input className="input" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Rack A-01, Warehouse 1" />
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Create Product'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Product Confirmation Modal */}
        {deleteTarget && (
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDeleteTarget(null)}>
            <div className="modal" style={{ maxWidth: '440px' }}>
              <div className="modal-header">
                <h2 className="modal-title" style={{ color: 'var(--status-danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrashIcon size={18} color="var(--status-danger)" />
                  <span>Permanently Delete Product</span>
                </h2>
                <button className="modal-close" onClick={() => setDeleteTarget(null)}>
                  <CrossIcon size={16} />
                </button>
              </div>

              <div className="modal-body">
                <p style={{ fontSize: '13.5px', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                  Are you sure you want to delete product <strong>{deleteTarget.name}</strong> (SKU: {deleteTarget.sku})?
                </p>
                <p style={{ fontSize: '12.5px', color: 'var(--status-danger)', marginTop: '8px', background: 'rgba(244, 63, 94, 0.1)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
                  ⚠️ This will remove the product record and all associated stock audit logs from the database.
                </p>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
                <button type="button" className="btn btn-danger" onClick={handleDeleteConfirm} disabled={deleting}>
                  {deleting ? 'Deleting...' : 'Delete Product & Stocks'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
