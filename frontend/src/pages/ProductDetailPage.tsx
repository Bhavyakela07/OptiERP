import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { GlassCard } from '../components/GlassCard';
import { StatusBadge } from '../components/StatusBadge';
import { Skeleton } from '../components/Skeleton';
import { getProduct, updateProduct, getStockMovements, addStockMovement, deleteProductApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  BarChartIcon,
  EditIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CrossIcon,
  TrashIcon
} from '../components/Icons';
import type { Product, StockMovement } from '../types';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { show } = useToast();
  const canWrite = user?.role === 'Admin' || user?.role === 'Warehouse';

  const [product, setProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [movTotal, setMovTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [movPage, setMovPage] = useState(1);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [saving, setSaving] = useState(false);

  // Stock IN / Stock OUT Modal State
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjType, setAdjType] = useState<'IN' | 'OUT'>('IN');
  const [adjQty, setAdjQty] = useState<number | ''>('');
  const [adjReason, setAdjReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  // Delete Product Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const movLimit = 8;

  const loadProduct = async () => {
    if (!id) return;
    try {
      const res = await getProduct(id);
      setProduct(res.data);
      setEditForm(res.data);
    } catch {
      show('Failed to load product details', 'error');
      navigate('/products');
    }
  };

  const loadMovements = async () => {
    if (!id) return;
    try {
      const res = await getStockMovements(id, { page: movPage, limit: movLimit });
      setMovements(res.data.data);
      setMovTotal(res.data.total);
    } catch {}
  };

  useEffect(() => {
    Promise.all([loadProduct(), loadMovements()]).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { loadMovements(); }, [movPage]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      const res = await updateProduct(id, {
        ...editForm,
        unit_price: Number(editForm.unit_price),
        min_stock_alert: Number(editForm.min_stock_alert),
      });
      show('Product updated successfully!', 'success');
      setProduct(res.data);
      setEditMode(false);
    } catch (err: any) {
      show(err.response?.data?.error || 'Update failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !adjQty || Number(adjQty) <= 0 || !product) return;
    
    const qtyNum = Number(adjQty);
    const newStockCount = adjType === 'IN' ? Number(product.current_stock) + qtyNum : Number(product.current_stock) - qtyNum;

    setAdjusting(true);
    try {
      await addStockMovement(id, {
        quantity: qtyNum,
        movement_type: adjType,
        reason: adjReason.trim() || `Manual stock ${adjType.toLowerCase()} adjustment`
      });

      // Optimistic Instant UI Update
      setProduct(prev => prev ? {
        ...prev,
        current_stock: newStockCount,
        is_low_stock: newStockCount <= prev.min_stock_alert
      } : null);

      show(`Stock ${adjType === 'IN' ? 'added' : 'deducted'} successfully!`, 'success');
      setShowAdjust(false);
      setAdjQty('');
      setAdjReason('');

      await Promise.all([loadProduct(), loadMovements()]);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.details?.[0]?.message || 'Adjustment failed';
      show(msg, 'error');
    } finally {
      setAdjusting(false);
    }
  };

  // Handle Permanent Product Deletion
  const handleDeleteConfirm = async () => {
    if (!product) return;
    setDeleting(true);
    try {
      await deleteProductApi(product.id);
      show(`Product "${product.name}" deleted successfully!`, 'success');
      navigate('/products');
    } catch (err: any) {
      show(err.response?.data?.error || 'Failed to delete product', 'error');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header title="Product Detail" />
        <div className="page-content">
          <Skeleton height="140px" style={{ marginBottom: '20px' }} />
          <Skeleton height="300px" />
        </div>
      </>
    );
  }

  if (!product) return null;

  const currentStockNum = Number(product.current_stock);
  const qtyNum = Number(adjQty || 0);
  const resultingStock = adjType === 'IN' ? currentStockNum + qtyNum : currentStockNum - qtyNum;
  const isAdjValid = qtyNum > 0 && (adjType === 'IN' || resultingStock >= 0);

  return (
    <>
      <Header title="Product Detail" subtitle={product.name} />
      <div className="page-content">
        
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/products')} style={{ marginBottom: '20px' }}>
          ← Back to Products
        </button>

        {/* Page Action Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>{product.name}</h1>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--accent-end)', background: 'rgba(99,102,241,0.1)', padding: '3px 8px', borderRadius: '4px' }}>
                {product.sku}
              </span>
              <StatusBadge status={product.is_low_stock ? 'danger' : 'success'} label={product.is_low_stock ? 'Low Stock' : 'In Stock'} />
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Category: {product.category || 'General'} · Location: {product.location || 'Warehouse Main'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {canWrite && (
              <button className="btn btn-primary" onClick={() => setShowAdjust(true)}>
                <BarChartIcon size={16} />
                <span>Adjust Stock (IN / OUT)</span>
              </button>
            )}
            {canWrite && (
              <button className="btn btn-secondary" onClick={() => setEditMode(!editMode)}>
                <EditIcon size={15} />
                <span>{editMode ? 'Cancel Edit' : 'Edit Details'}</span>
              </button>
            )}

            {/* Standalone Delete SVG Button Only */}
            {canWrite && (
              <button
                type="button"
                className="table-action-icon-btn"
                onClick={() => setShowDeleteModal(true)}
                title="Permanently Delete Product & Stocks"
                style={{ width: '38px', height: '38px', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)' }}
              >
                <TrashIcon size={16} color="var(--status-danger)" />
              </button>
            )}
          </div>
        </div>

        {/* Stock KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '28px' }}>
          <GlassCard>
            <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Current Stock</div>
            <div className="tabular-nums" style={{ fontSize: '26px', fontWeight: 800, color: product.is_low_stock ? 'var(--status-danger)' : 'var(--status-success)', marginTop: '4px' }}>
              {product.current_stock} <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>units</span>
            </div>
          </GlassCard>

          <GlassCard>
            <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Alert Threshold</div>
            <div className="tabular-nums" style={{ fontSize: '26px', fontWeight: 800, color: 'var(--status-warning)', marginTop: '4px' }}>
              {product.min_stock_alert} <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>units</span>
            </div>
          </GlassCard>

          <GlassCard>
            <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Unit Price & Valuation</div>
            <div className="tabular-nums" style={{ fontSize: '26px', fontWeight: 800, color: 'var(--accent-end)', marginTop: '4px' }}>
              ₹{Number(product.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="tabular-nums" style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Total Value: ₹{(currentStockNum * Number(product.unit_price)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </GlassCard>
        </div>

        {/* Edit Form Glass Card */}
        {editMode && (
          <GlassCard style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>Edit Product Information</h2>
            <form onSubmit={handleUpdate}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Product Name *</label>
                  <input className="input" required value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <input className="input" value={editForm.category || ''} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit Price (₹)</label>
                  <input className="input" type="number" step="0.01" value={editForm.unit_price || ''} onChange={e => setEditForm(f => ({ ...f, unit_price: Number(e.target.value) }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Low Stock Threshold</label>
                  <input className="input" type="number" value={editForm.min_stock_alert || ''} onChange={e => setEditForm(f => ({ ...f, min_stock_alert: Number(e.target.value) }))} />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Warehouse Location</label>
                  <input className="input" value={editForm.location || ''} onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setEditMode(false)}>Cancel</button>
              </div>
            </form>
          </GlassCard>
        )}

        {/* Stock Movement Log Table */}
        <GlassCard>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Stock Movement Audit Log ({movTotal})
            </h3>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Movement Type</th>
                  <th>Quantity</th>
                  <th>Reason / Reference</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)' }}>
                      No stock movement audit records available
                    </td>
                  </tr>
                ) : (
                  movements.map(m => (
                    <tr key={m.id}>
                      <td>
                        <StatusBadge
                          status={m.movement_type === 'IN' ? 'success' : 'danger'}
                          label={m.movement_type === 'IN' ? 'Stock IN' : 'Stock OUT'}
                          icon={m.movement_type === 'IN' ? <ArrowUpIcon size={12} /> : <ArrowDownIcon size={12} />}
                        />
                      </td>
                      <td className="tabular-nums" style={{ fontWeight: 800, color: m.movement_type === 'IN' ? 'var(--status-success)' : 'var(--status-danger)' }}>
                        {m.movement_type === 'IN' ? '+' : '−'}{m.quantity} units
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{m.reason || '—'}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '12.5px' }}>
                        {new Date(m.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>

        {/* Stock IN / Stock OUT Interactive Modal */}
        {showAdjust && (
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAdjust(false)}>
            <div className="modal">
              <div className="modal-header">
                <h2 className="modal-title">Adjust Stock Level</h2>
                <button className="modal-close" onClick={() => setShowAdjust(false)}>
                  <CrossIcon size={16} />
                </button>
              </div>

              <form onSubmit={handleAdjust}>
                <div className="modal-body">
                  
                  {/* Direction Tabs (Stock IN / Stock OUT) */}
                  <div className="form-group">
                    <label className="form-label">Movement Direction</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setAdjType('IN')}
                        style={{
                          padding: '10px',
                          borderRadius: 'var(--radius-md)',
                          border: adjType === 'IN' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-glass)',
                          background: adjType === 'IN' ? 'rgba(16, 185, 129, 0.14)' : 'var(--bg-surface)',
                          color: adjType === 'IN' ? 'var(--status-success)' : 'var(--text-secondary)',
                          fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                          transition: 'var(--transition-fast)'
                        }}
                      >
                        <ArrowUpIcon size={14} />
                        <span>Stock IN (+)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAdjType('OUT')}
                        style={{
                          padding: '10px',
                          borderRadius: 'var(--radius-md)',
                          border: adjType === 'OUT' ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid var(--border-glass)',
                          background: adjType === 'OUT' ? 'rgba(244, 63, 94, 0.14)' : 'var(--bg-surface)',
                          color: adjType === 'OUT' ? 'var(--status-danger)' : 'var(--text-secondary)',
                          fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                          transition: 'var(--transition-fast)'
                        }}
                      >
                        <ArrowDownIcon size={14} />
                        <span>Stock OUT (−)</span>
                      </button>
                    </div>
                  </div>

                  {/* Quantity Stepper Input */}
                  <div className="form-group">
                    <label className="form-label">Quantity *</label>
                    <input
                      className="input"
                      type="number"
                      min="1"
                      required
                      value={adjQty}
                      onChange={e => setAdjQty(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Enter quantity"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Reason / Reference (Optional)</label>
                    <input
                      className="input"
                      value={adjReason}
                      onChange={e => setAdjReason(e.target.value)}
                      placeholder="Stock audit, purchase arrival, damaged item replacement..."
                    />
                  </div>

                  {/* Live Result Preview Before Confirm */}
                  <div style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 16px',
                    fontSize: '13px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Current: <strong>{currentStockNum} units</strong></span>
                    <span className="tabular-nums" style={{ fontWeight: 800, fontSize: '15px', color: resultingStock < 0 ? 'var(--status-danger)' : 'var(--text-primary)' }}>
                      Resulting: {resultingStock} units
                    </span>
                  </div>

                  {resultingStock < 0 && (
                    <p style={{ color: 'var(--status-danger)', fontSize: '12.5px', marginTop: '8px' }}>
                      ⚠️ Cannot reduce stock below 0 units!
                    </p>
                  )}
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAdjust(false)}>Cancel</button>
                  <button
                    type="submit"
                    className={`btn ${adjType === 'IN' ? 'btn-success' : 'btn-danger'}`}
                    disabled={adjusting || !isAdjValid}
                  >
                    {adjusting ? 'Processing...' : `Confirm ${adjType === 'IN' ? 'Stock IN' : 'Stock OUT'}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Product Confirmation Modal */}
        {showDeleteModal && (
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowDeleteModal(false)}>
            <div className="modal" style={{ maxWidth: '440px' }}>
              <div className="modal-header">
                <h2 className="modal-title" style={{ color: 'var(--status-danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrashIcon size={18} color="var(--status-danger)" />
                  <span>Permanently Delete Product</span>
                </h2>
                <button className="modal-close" onClick={() => setShowDeleteModal(false)}>
                  <CrossIcon size={16} />
                </button>
              </div>

              <div className="modal-body">
                <p style={{ fontSize: '13.5px', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                  Are you sure you want to delete product <strong>{product.name}</strong> (SKU: {product.sku})?
                </p>
                <p style={{ fontSize: '12.5px', color: 'var(--status-danger)', marginTop: '8px', background: 'rgba(244, 63, 94, 0.1)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
                  ⚠️ This will remove the product record and all associated stock audit logs from the database.
                </p>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
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
