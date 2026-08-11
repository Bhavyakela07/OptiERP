import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { GlassCard } from '../components/GlassCard';
import { getCustomers, getProducts, createChallan } from '../api/endpoints';
import { useToast } from '../context/ToastContext';
import { ChallansIcon, AlertTriangleIcon, PlusIcon, CrossIcon } from '../components/Icons';
import type { Customer, Product } from '../types';

interface LineItem {
  product_id: string;
  quantity: number;
}

export default function CreateChallanPage() {
  const navigate = useNavigate();
  const { show } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState<LineItem[]>([{ product_id: '', quantity: 1 }]);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    Promise.all([
      getCustomers({ limit: 200 }),
      getProducts({ limit: 200 }),
    ]).then(([cRes, pRes]) => {
      setCustomers(cRes.data.data);
      setProducts(pRes.data.data);
    });
  }, []);

  const productMap = Object.fromEntries(products.map(p => [p.id, p]));

  const addItem = () => setItems(prev => [...prev, { product_id: '', quantity: 1 }]);
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof LineItem, value: string | number) =>
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));

  const lineTotal = (item: LineItem) => {
    const p = productMap[item.product_id];
    return p ? Number(p.unit_price) * item.quantity : 0;
  };

  const subtotal = items.reduce((sum, item) => sum + lineTotal(item), 0);
  const tax = subtotal * 0.18; // 18% GST estimate
  const grandTotal = subtotal + tax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!customerId) {
      setValidationError('Please select a customer account.');
      show('Please select a customer', 'error');
      return;
    }

    const validItems = items.filter(i => i.product_id && i.quantity > 0);
    if (validItems.length === 0) {
      setValidationError('Please add at least one valid product line item.');
      show('Add at least one product', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await createChallan({ customer_id: customerId, items: validItems });
      show(`Challan ${res.data.challan_number} created in Draft status!`, 'success');
      navigate(`/challans/${res.data.id}`);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to create challan';
      setValidationError(msg);
      show(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Header title="Create Sales Challan" subtitle="Generate new dispatch note with dynamic price snapshot locking" />
      <div className="page-content">
        
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/challans')} style={{ marginBottom: '20px' }}>
          ← Back to Challans
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>New Dispatch Challan</h1>
        </div>

        <form onSubmit={handleSubmit}>
          
          {/* Customer Selection Card */}
          <GlassCard style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px', color: 'var(--text-primary)' }}>
              1. Customer Account
            </h2>

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

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Select Registered Customer *</label>
              <select
                className="select"
                required
                value={customerId}
                onChange={e => setCustomerId(e.target.value)}
              >
                <option value="">— Choose customer account —</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.business_name ? `(${c.business_name})` : ''} — {c.mobile}
                  </option>
                ))}
              </select>
            </div>
          </GlassCard>

          {/* Dynamic Line-Item Builder */}
          <GlassCard style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                2. Products & Line Items
              </h2>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-start)" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                <span>Prices snapshot-locked at creation</span>
              </div>
            </div>

            {items.map((item, idx) => {
              const prod = productMap[item.product_id];
              return (
                <div key={idx} style={{ padding: '14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)', marginBottom: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 40px', gap: '12px', alignItems: 'end' }}>
                    
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Product SKU *</label>
                      <select
                        className="select"
                        value={item.product_id}
                        onChange={e => updateItem(idx, 'product_id', e.target.value)}
                        required
                      >
                        <option value="">— Select product —</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku}) — ₹{Number(p.unit_price).toFixed(2)} (Stock: {p.current_stock})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Quantity *</label>
                      <input
                        className="input"
                        type="number"
                        min="1"
                        required
                        value={item.quantity}
                        onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                      />
                    </div>

                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => removeItem(idx)}
                      disabled={items.length === 1}
                      style={{ height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <CrossIcon size={16} />
                    </button>

                  </div>

                  {/* Price Snapshot Lock & Shortfall Warning Info */}
                  {prod && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.04)', fontSize: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent-end)" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                        <span>Price locked at ₹{Number(prod.unit_price).toFixed(2)}</span>

                        {item.quantity > prod.current_stock && (
                          <span style={{ color: 'var(--status-danger)', fontWeight: 600, marginLeft: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <AlertTriangleIcon size={12} color="var(--status-danger)" />
                            Exceeds stock ({prod.current_stock} available)
                          </span>
                        )}
                      </div>

                      <div className="tabular-nums" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        Line Total: ₹{lineTotal(item).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={addItem}
              style={{ marginTop: '4px' }}
            >
              <PlusIcon size={14} />
              <span>Add Line Item</span>
            </button>

            {/* Live Financial Breakdown Card */}
            <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
              <div style={{ display: 'flex', gap: '32px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <span>Subtotal:</span>
                <span className="tabular-nums" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              <div style={{ display: 'flex', gap: '32px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <span>Estimated GST (18%):</span>
                <span className="tabular-nums" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>₹{tax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              <div style={{ display: 'flex', gap: '32px', fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '6px' }}>
                <span>Grand Total:</span>
                <span className="tabular-nums" style={{ color: 'var(--accent-end)' }}>₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </GlassCard>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/challans')}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
              <ChallansIcon size={18} />
              <span>{saving ? 'Creating...' : 'Create Draft Challan'}</span>
            </button>
          </div>

        </form>
      </div>
    </>
  );
}
