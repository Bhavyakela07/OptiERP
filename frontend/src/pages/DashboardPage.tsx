import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { GlassCard } from '../components/GlassCard';
import { StatusBadge } from '../components/StatusBadge';
import { Skeleton } from '../components/Skeleton';
import { getCustomers, getProducts, getChallans, addStockMovement, deleteCustomerApi, suspendCustomerApi, unsuspendCustomerApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  BarChartIcon,
  CustomersIcon,
  ChallansIcon,
  AlertTriangleIcon,
  PlusIcon,
  ArrowUpIcon,
  CheckCircleIcon,
  CrossIcon,
  EyeIcon,
  PauseIcon,
  PlayIcon,
  TrashIcon,
  ClockIcon,
  LightningIcon,
  CalendarIcon
} from '../components/Icons';
import type { Customer, Product, Challan } from '../types';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { show } = useToast();
  const role = user?.role || 'Admin';
  const isAdmin = role === 'Admin';

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [challans, setChallans] = useState<Challan[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick Restock State
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState(10);
  const [restocking, setRestocking] = useState(false);

  // Admin Delete Modal State inside Dashboard Preview
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Admin Suspend Modal State inside Dashboard Preview
  const [suspendTarget, setSuspendTarget] = useState<Customer | null>(null);
  const [suspendOption, setSuspendOption] = useState<'7' | '15' | '30' | '60' | 'indefinite' | 'custom'>('7');
  const [customSuspendDate, setCustomSuspendDate] = useState('');
  const [suspending, setSuspending] = useState(false);

  const loadData = async () => {
    try {
      const [custRes, prodRes, chalRes] = await Promise.all([
        getCustomers({ limit: 10 }),
        getProducts({ limit: 100 }),
        getChallans({ limit: 10 }),
      ]);
      setCustomers(custRes.data.data);
      setProducts(prodRes.data.data);
      setChallans(chalRes.data.data);
    } catch {
      show('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [role]);

  // Quick Restock Handler
  const handleRestock = async () => {
    if (!restockProduct || restockQty <= 0) return;
    setRestocking(true);
    try {
      await addStockMovement(restockProduct.id, {
        quantity: restockQty,
        movement_type: 'IN',
        reason: 'Dashboard rapid restock'
      });
      show(`Restocked +${restockQty} units of ${restockProduct.name}!`, 'success');
      setRestockProduct(null);
      loadData();
    } catch (err: any) {
      show(err.response?.data?.error || 'Restock failed', 'error');
    } finally {
      setRestocking(false);
    }
  };

  // Admin Customer Delete
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCustomerApi(deleteTarget.id);
      show(`Customer account "${deleteTarget.name}" deleted!`, 'success');
      setDeleteTarget(null);
      loadData();
    } catch (err: any) {
      show(err.response?.data?.error || 'Failed to delete customer', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Admin Customer Suspend
  const handleSuspendConfirm = async () => {
    if (!suspendTarget) return;
    setSuspending(true);
    try {
      let payload: { duration_days?: number; suspended_until?: string } = {};
      if (['7', '15', '30', '60'].includes(suspendOption)) {
        payload.duration_days = Number(suspendOption);
      } else if (suspendOption === 'custom' && customSuspendDate) {
        payload.suspended_until = new Date(customSuspendDate).toISOString();
      }

      await suspendCustomerApi(suspendTarget.id, payload);
      show(`Customer "${suspendTarget.name}" suspended!`, 'warning');
      setSuspendTarget(null);
      loadData();
    } catch (err: any) {
      show(err.response?.data?.error || 'Failed to suspend customer', 'error');
    } finally {
      setSuspending(false);
    }
  };

  // Admin Customer Unsuspend
  const handleUnsuspend = async (c: Customer, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await unsuspendCustomerApi(c.id);
      show(`Customer "${c.name}" account reactivated to Active!`, 'success');
      loadData();
    } catch (err: any) {
      show(err.response?.data?.error || 'Failed to reactivate customer', 'error');
    }
  };

  if (loading) {
    return (
      <>
        <Header title="Dashboard" />
        <div className="page-content">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '28px' }}>
            <Skeleton height="110px" /><Skeleton height="110px" /><Skeleton height="110px" /><Skeleton height="110px" />
          </div>
          <Skeleton height="320px" />
        </div>
      </>
    );
  }

  // Calculate Metrics
  const lowStockItems = products.filter(p => p.is_low_stock);
  const totalValuation = products.reduce((acc, p) => acc + (Number(p.current_stock) * Number(p.unit_price)), 0);
  const confirmedChallans = challans.filter(c => c.status === 'Confirmed');
  const totalGrossRevenue = confirmedChallans.reduce((sum, c) => sum + Number(c.total_amount), 0);

  const getSuspendedLabel = (c: Customer) => {
    if (c.status !== 'Suspended') return c.status;
    if (!c.suspended_until) return 'Suspended (Indefinite)';

    const until = new Date(c.suspended_until);
    const now = new Date();
    const diffDays = Math.ceil((until.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 0) return `Suspended (${diffDays} days left)`;
    return `Suspended until ${until.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`;
  };

  // Dynamic Dashboard Subtitle by Role
  const roleSubtitles: Record<string, string> = {
    Admin: 'Global Operations, Inventory Valuation & Enterprise Analytics',
    Sales: 'Customer Leads, Account Pipeline & Sales Challans',
    Warehouse: 'Stock Levels, Low-Stock Alerts & Rapid Logistics',
    Accounts: 'Financial Ledger, Revenue Valuation & Billing Summaries',
  };

  return (
    <>
      <Header title={`${role} Dashboard`} subtitle={roleSubtitles[role] || 'Operations Portal'} />
      <div className="page-content">

        {/* ─── 1. ADMIN DASHBOARD VIEW ─────────────────────────────────────── */}
        {role === 'Admin' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '28px' }}>
            <GlassCard>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Total Stock Valuation</div>
                  <div className="tabular-nums" style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                    ₹{totalValuation.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                </div>
                <BarChartIcon size={20} color="var(--text-primary)" />
              </div>
            </GlassCard>

            <GlassCard>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Active Customers</div>
                  <div className="tabular-nums" style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>{customers.length}</div>
                </div>
                <CustomersIcon size={20} color="var(--text-primary)" />
              </div>
            </GlassCard>

            <GlassCard>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Sales Challans</div>
                  <div className="tabular-nums" style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>{challans.length}</div>
                </div>
                <ChallansIcon size={20} color="var(--text-primary)" />
              </div>
            </GlassCard>

            <GlassCard>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Low Stock Alerts</div>
                  <div className="tabular-nums" style={{ fontSize: '24px', fontWeight: 800, color: lowStockItems.length > 0 ? 'var(--status-danger)' : 'var(--status-success)', marginTop: '4px' }}>
                    {lowStockItems.length}
                  </div>
                </div>
                <AlertTriangleIcon size={20} color={lowStockItems.length > 0 ? 'var(--status-danger)' : 'var(--text-primary)'} />
              </div>
            </GlassCard>
          </div>
        )}

        {/* ─── 2. SALES DASHBOARD VIEW ─────────────────────────────────────── */}
        {role === 'Sales' && (
          <>
            {/* Sales KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '28px' }}>
              <GlassCard>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Total Customers</div>
                <div className="tabular-nums" style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>{customers.length}</div>
              </GlassCard>
              <GlassCard>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Leads Pipeline</div>
                <div className="tabular-nums" style={{ fontSize: '24px', fontWeight: 800, color: 'var(--status-warning)', marginTop: '4px' }}>
                  {customers.filter(c => c.status === 'Lead').length}
                </div>
              </GlassCard>
              <GlassCard>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Draft Challans</div>
                <div className="tabular-nums" style={{ fontSize: '24px', fontWeight: 800, color: 'var(--status-info)', marginTop: '4px' }}>
                  {challans.filter(c => c.status === 'Draft').length}
                </div>
              </GlassCard>
              <GlassCard>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Confirmed Sales</div>
                <div className="tabular-nums" style={{ fontSize: '24px', fontWeight: 800, color: 'var(--status-success)', marginTop: '4px' }}>
                  {confirmedChallans.length}
                </div>
              </GlassCard>
            </div>

            {/* Quick Actions Bar */}
            <div style={{ display: 'flex', gap: '14px', marginBottom: '28px' }}>
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/challans/create')}>
                <PlusIcon size={18} />
                <span>Create Sales Challan</span>
              </button>
              <button className="btn btn-secondary btn-lg" onClick={() => navigate('/customers')}>
                <CustomersIcon size={18} />
                <span>Manage Customer Accounts</span>
              </button>
            </div>
          </>
        )}

        {/* ─── 3. WAREHOUSE DASHBOARD VIEW ──────────────────────────────────── */}
        {role === 'Warehouse' && (
          <>
            {/* Warehouse KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '28px' }}>
              <GlassCard>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Catalog SKUs</div>
                <div className="tabular-nums" style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>{products.length}</div>
              </GlassCard>
              <GlassCard>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Low Stock Items</div>
                <div className="tabular-nums" style={{ fontSize: '24px', fontWeight: 800, color: lowStockItems.length > 0 ? 'var(--status-danger)' : 'var(--status-success)', marginTop: '4px' }}>
                  {lowStockItems.length}
                </div>
              </GlassCard>
              <GlassCard>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Total Stock Units</div>
                <div className="tabular-nums" style={{ fontSize: '24px', fontWeight: 800, color: 'var(--status-info)', marginTop: '4px' }}>
                  {products.reduce((sum, p) => sum + Number(p.current_stock), 0)}
                </div>
              </GlassCard>
              <GlassCard>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Warehouse Valuation</div>
                <div className="tabular-nums" style={{ fontSize: '24px', fontWeight: 800, color: 'var(--status-success)', marginTop: '4px' }}>
                  ₹{totalValuation.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </div>
              </GlassCard>
            </div>
          </>
        )}

        {/* ─── 4. ACCOUNTS DASHBOARD VIEW ──────────────────────────────────── */}
        {role === 'Accounts' && (
          <>
            {/* Accounts KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '28px' }}>
              <GlassCard>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Confirmed Sales Revenue</div>
                <div className="tabular-nums" style={{ fontSize: '24px', fontWeight: 800, color: 'var(--status-success)', marginTop: '4px' }}>
                  ₹{totalGrossRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </GlassCard>
              <GlassCard>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Estimated GST (18%)</div>
                <div className="tabular-nums" style={{ fontSize: '24px', fontWeight: 800, color: 'var(--status-info)', marginTop: '4px' }}>
                  ₹{(totalGrossRevenue * 0.18).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </GlassCard>
              <GlassCard>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Confirmed Invoices</div>
                <div className="tabular-nums" style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                  {confirmedChallans.length}
                </div>
              </GlassCard>
              <GlassCard>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Active Billing Accounts</div>
                <div className="tabular-nums" style={{ fontSize: '24px', fontWeight: 800, color: 'var(--status-warning)', marginTop: '4px' }}>
                  {customers.filter(c => c.status === 'Active').length}
                </div>
              </GlassCard>
            </div>
          </>
        )}

        {/* ─── ADMIN CUSTOMERS PREVIEW TABLE WITH STANDALONE SVG ACTION BUTTONS ─── */}
        {isAdmin && (
          <GlassCard style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Customer Accounts Overview</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Admin preview with direct action controls</p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/customers')}>Manage All Customers</button>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Business</th>
                    <th>Mobile</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center', width: '130px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.slice(0, 5).map(c => (
                    <tr key={c.id} className="clickable" onClick={() => navigate(`/customers/${c.id}`)}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{c.business_name || '—'}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{c.mobile}</td>
                      <td><StatusBadge status={c.status} label={getSuspendedLabel(c)} /></td>
                      
                      {/* Standalone SVG Icon Action Buttons (No Outer Box) */}
                      <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                          
                          {/* 👁️ View Profile SVG Only */}
                          <button
                            type="button"
                            className="table-action-icon-btn"
                            title="View Customer Profile"
                            onClick={(e) => { e.stopPropagation(); navigate(`/customers/${c.id}`); }}
                            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-glass)' }}
                          >
                            <EyeIcon size={15} color="var(--text-primary)" />
                          </button>

                          {/* 🟠/🟢 Suspend or Reactivate SVG Only */}
                          <button
                            type="button"
                            className="table-action-icon-btn"
                            title={c.status === 'Suspended' ? 'Unsuspend Account' : 'Suspend Account (7d, 15d, 30d, 60d...)'}
                            onClick={(e) => c.status === 'Suspended' ? handleUnsuspend(c, e) : (e.stopPropagation(), setSuspendTarget(c))}
                            style={{
                              background: c.status === 'Suspended' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                              border: c.status === 'Suspended' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)'
                            }}
                          >
                            {c.status === 'Suspended' ? (
                              <PlayIcon size={15} color="var(--status-success)" />
                            ) : (
                              <PauseIcon size={15} color="var(--status-warning)" />
                            )}
                          </button>

                          {/* 🔴 Delete SVG Only */}
                          <button
                            type="button"
                            className="table-action-icon-btn"
                            title="Permanently Delete Customer"
                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(c); }}
                            style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)' }}
                          >
                            <TrashIcon size={15} color="var(--status-danger)" />
                          </button>

                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}

        {/* ─── SHARED SPLIT VIEW: Recent Challans & Low Stock Alerts ───────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

          {/* Recent Challans Panel */}
          <GlassCard>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Recent Challans</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/challans')}>View All</button>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Challan #</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {challans.length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>No challans recorded</td></tr>
                  ) : (
                    challans.slice(0, 5).map(c => (
                      <tr key={c.id} className="clickable" onClick={() => navigate(`/challans/${c.id}`)}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>{c.challan_number}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{c.customer_name || '—'}</td>
                        <td className="tabular-nums" style={{ fontWeight: 600 }}>₹{Number(c.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td><StatusBadge status={c.status} label={c.status} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>

          {/* Low Stock Alerts Panel with Quick Restock */}
          <GlassCard>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangleIcon size={16} color="var(--status-danger)" />
                <span>Low Stock Alerts</span>
              </h2>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/products')}>Inventory Catalog</button>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Stock</th>
                    <th>Alert Min</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockItems.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--status-success)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <CheckCircleIcon size={16} color="var(--status-success)" />
                          <span>All product stock levels healthy</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    lowStockItems.slice(0, 5).map(p => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</td>
                        <td className="tabular-nums" style={{ fontWeight: 800, color: 'var(--status-danger)' }}>{p.current_stock}</td>
                        <td className="tabular-nums" style={{ color: 'var(--text-secondary)' }}>{p.min_stock_alert}</td>
                        <td>
                          {(role === 'Admin' || role === 'Warehouse') && (
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => { setRestockProduct(p); setRestockQty(20); }}
                              style={{ padding: '4px 10px', fontSize: '11.5px' }}
                            >
                              <ArrowUpIcon size={12} />
                              <span>Restock</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>

        </div>

        {/* Rapid Restock Modal */}
        {restockProduct && (
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setRestockProduct(null)}>
            <div className="modal">
              <div className="modal-header">
                <h2 className="modal-title">Rapid Restock — {restockProduct.name}</h2>
                <button className="modal-close" onClick={() => setRestockProduct(null)}>
                  <CrossIcon size={16} />
                </button>
              </div>
              <div className="modal-body">
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Current stock: <strong>{restockProduct.current_stock} units</strong> (Min alert: {restockProduct.min_stock_alert})
                </p>
                <div className="form-group">
                  <label className="form-label">Quantity to Add (IN) *</label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    value={restockQty}
                    onChange={e => setRestockQty(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setRestockProduct(null)}>Cancel</button>
                <button type="button" className="btn btn-success" onClick={handleRestock} disabled={restocking}>
                  {restocking ? 'Adding...' : `Confirm +${restockQty} Units`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Admin Suspend Customer Modal inside Dashboard with SVG Preset Icons */}
        {suspendTarget && (
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSuspendTarget(null)}>
            <div className="modal" style={{ maxWidth: '480px' }}>
              <div className="modal-header">
                <h2 className="modal-title" style={{ color: 'var(--status-warning)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <PauseIcon size={18} color="var(--status-warning)" />
                  <span>Suspend Account — {suspendTarget.name}</span>
                </h2>
                <button className="modal-close" onClick={() => setSuspendTarget(null)}>
                  <CrossIcon size={16} />
                </button>
              </div>

              <div className="modal-body">
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '18px' }}>
                  Select suspension duration for <strong>{suspendTarget.name}</strong> ({suspendTarget.business_name || 'Individual'}).
                </p>

                <div className="form-group">
                  <label className="form-label">Suspension Duration *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                    {[
                      { id: '7', label: '7 Days', icon: <ClockIcon size={14} color="var(--status-warning)" /> },
                      { id: '15', label: '15 Days', icon: <ClockIcon size={14} color="var(--status-warning)" /> },
                      { id: '30', label: '30 Days', icon: <ClockIcon size={14} color="var(--status-warning)" /> },
                      { id: '60', label: '60 Days', icon: <ClockIcon size={14} color="var(--status-warning)" /> },
                      { id: 'indefinite', label: 'Indefinite', icon: <LightningIcon size={14} color="var(--status-warning)" /> },
                      { id: 'custom', label: 'Custom Date', icon: <CalendarIcon size={14} color="var(--status-warning)" /> },
                    ].map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSuspendOption(opt.id as any)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-md)',
                          border: suspendOption === opt.id ? '1px solid var(--status-warning)' : '1px solid var(--border-glass)',
                          background: suspendOption === opt.id ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-surface)',
                          color: suspendOption === opt.id ? 'var(--status-warning)' : 'var(--text-primary)',
                          fontWeight: 700,
                          fontSize: '13px',
                          cursor: 'pointer',
                          transition: 'var(--transition-fast)'
                        }}
                      >
                        {opt.icon}
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {suspendOption === 'custom' && (
                  <div className="form-group">
                    <label className="form-label">Suspend Until Date *</label>
                    <input
                      type="date"
                      className="input"
                      required
                      value={customSuspendDate}
                      onChange={e => setCustomSuspendDate(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setSuspendTarget(null)}>Cancel</button>
                <button
                  type="button"
                  className="btn btn-warning"
                  onClick={handleSuspendConfirm}
                  disabled={suspending || (suspendOption === 'custom' && !customSuspendDate)}
                >
                  {suspending ? 'Suspending...' : 'Confirm Suspension'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Admin Delete Confirmation Modal inside Dashboard */}
        {deleteTarget && (
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDeleteTarget(null)}>
            <div className="modal" style={{ maxWidth: '440px' }}>
              <div className="modal-header">
                <h2 className="modal-title" style={{ color: 'var(--status-danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrashIcon size={18} color="var(--status-danger)" />
                  <span>Permanently Delete Customer</span>
                </h2>
                <button className="modal-close" onClick={() => setDeleteTarget(null)}>
                  <CrossIcon size={16} />
                </button>
              </div>

              <div className="modal-body">
                <p style={{ fontSize: '13.5px', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                  Are you sure you want to permanently delete customer <strong>{deleteTarget.name}</strong> ({deleteTarget.mobile})?
                </p>
                <p style={{ fontSize: '12.5px', color: 'var(--status-danger)', marginTop: '8px', background: 'rgba(244, 63, 94, 0.1)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
                  ⚠️ This action cannot be undone. All linked follow-up records will also be removed.
                </p>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
                <button type="button" className="btn btn-danger" onClick={handleDeleteConfirm} disabled={deleting}>
                  {deleting ? 'Deleting...' : 'Permanently Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
