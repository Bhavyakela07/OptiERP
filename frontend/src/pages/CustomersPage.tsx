import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { GlassCard } from '../components/GlassCard';
import { StatusBadge } from '../components/StatusBadge';
import { TableSkeleton } from '../components/Skeleton';
import { getCustomers, createCustomer, createUserApi, deleteCustomerApi, suspendCustomerApi, unsuspendCustomerApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PlusIcon, CustomersIcon, CrossIcon, TrashIcon, PauseIcon, PlayIcon, EyeIcon, ClockIcon, LightningIcon, CalendarIcon } from '../components/Icons';
import type { Customer } from '../types';

export default function CustomersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { show } = useToast();
  const canWrite = user?.role === 'Admin' || user?.role === 'Sales';
  const isAdmin = user?.role === 'Admin';

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Field-level error messages state (downside input boxes)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Customer Form State
  const [form, setForm] = useState({
    name: '', mobile: '', email: '', business_name: '',
    gst_number: '', customer_type: 'Wholesale' as 'Wholesale' | 'Distributor' | 'Retail',
    address: '', status: 'Lead' as 'Lead' | 'Active' | 'Inactive' | 'Suspended', follow_up_date: '', notes: '',
  });

  // User Credentials State inside Add Customer Modal
  const [createCredentials, setCreateCredentials] = useState(true);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginRole, setLoginRole] = useState<'Sales' | 'Warehouse' | 'Accounts' | 'Admin'>('Sales');

  // Admin Delete Modal State
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Admin Suspend Modal State
  const [suspendTarget, setSuspendTarget] = useState<Customer | null>(null);
  const [suspendOption, setSuspendOption] = useState<'7' | '15' | '30' | '60' | 'indefinite' | 'custom'>('7');
  const [customSuspendDate, setCustomSuspendDate] = useState('');
  const [suspending, setSuspending] = useState(false);

  const limit = 10;

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCustomers({ page, limit, search: search || undefined, status: statusFilter || undefined });
      setCustomers(res.data.data);
      setTotal(res.data.total);
    } catch {
      show('Failed to load customers', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!form.name.trim()) {
      errors.name = 'Customer name is required';
    }

    if (!form.mobile.trim()) {
      errors.mobile = 'Mobile number is required';
    } else if (form.mobile.length !== 10) {
      errors.mobile = 'Mobile number must be at least 10 digits';
    }

    if (!form.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = 'Valid email address format required';
    }

    if (!form.business_name.trim()) {
      errors.business_name = 'Business / Company name is required';
    }

    if (!form.gst_number.trim()) {
      errors.gst_number = 'GST number is required';
    }

    if (createCredentials && isAdmin) {
      if (!loginPassword || loginPassword.length < 6) {
        errors.password = 'Password must be at least 6 characters';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSaving(true);
    try {
      const custRes = await createCustomer(form);

      if (createCredentials && isAdmin) {
        await createUserApi({
          name: form.name.trim(),
          email: form.email.trim(),
          password: loginPassword,
          role: loginRole
        });
        show(`Customer "${custRes.data.name}" and User Login ID (${form.email.trim()}) created successfully!`, 'success');
      } else {
        show(`Customer "${custRes.data.name}" created successfully!`, 'success');
      }

      setShowModal(false);
      setForm({ name: '', mobile: '', email: '', business_name: '', gst_number: '', customer_type: 'Wholesale', address: '', status: 'Lead', follow_up_date: '', notes: '' });
      setLoginPassword('');
      setFieldErrors({});
      setPage(1);
      await fetch();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to create customer and credentials';
      show(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Handle Admin Permanent Customer Deletion
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCustomerApi(deleteTarget.id);
      show(`Customer account "${deleteTarget.name}" permanently deleted!`, 'success');
      setDeleteTarget(null);
      await fetch();
    } catch (err: any) {
      show(err.response?.data?.error || 'Failed to delete customer', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Handle Admin Customer Suspension (7, 15, 30, 60 days, indefinite, custom date)
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
      
      const durationText = ['7', '15', '30', '60'].includes(suspendOption)
        ? `for ${suspendOption} days`
        : suspendOption === 'custom'
        ? `until ${customSuspendDate}`
        : 'indefinitely';

      show(`Customer "${suspendTarget.name}" suspended ${durationText}!`, 'warning');
      setSuspendTarget(null);
      await fetch();
    } catch (err: any) {
      show(err.response?.data?.error || 'Failed to suspend customer', 'error');
    } finally {
      setSuspending(false);
    }
  };

  // Handle Admin Customer Unsuspension / Reactivation
  const handleUnsuspend = async (c: Customer, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await unsuspendCustomerApi(c.id);
      show(`Customer "${c.name}" account reactivated to Active!`, 'success');
      await fetch();
    } catch (err: any) {
      show(err.response?.data?.error || 'Failed to reactivate customer', 'error');
    }
  };

  const totalPages = Math.ceil(total / limit);

  const getSuspendedLabel = (c: Customer) => {
    if (c.status !== 'Suspended') return c.status;
    if (!c.suspended_until) return 'Suspended (Indefinite)';

    const until = new Date(c.suspended_until);
    const now = new Date();
    const diffTime = until.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      return `Suspended (${diffDays} day${diffDays > 1 ? 's' : ''} left)`;
    }
    return `Suspended until ${until.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`;
  };

  return (
    <>
      <Header title="Customers" subtitle="Manage customer accounts, leads, and follow-up activities" />
      <div className="page-content">
        
        {/* Action Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Customer Accounts</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>{total} total records registered</p>
          </div>
          {canWrite && (
            <button id="add-customer-btn" className="btn btn-primary" onClick={() => { setFieldErrors({}); setLoginPassword(''); setShowModal(true); }}>
              <PlusIcon size={16} />
              <span>Add Customer & Login ID</span>
            </button>
          )}
        </div>

        {/* Search & Pill Filters */}
        <div className="filters-bar">
          <input
            id="customer-search"
            className="input input-search"
            style={{ width: '280px' }}
            placeholder="Search name, mobile, business..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          {/* Pill Style Filter Selection */}
          <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-surface)', padding: '4px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-glass)' }}>
            {[
              { id: '', label: 'All Status' },
              { id: 'Lead', label: 'Lead' },
              { id: 'Active', label: 'Active' },
              { id: 'Inactive', label: 'Inactive' },
              { id: 'Suspended', label: 'Suspended' },
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                style={{
                  padding: '5px 14px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  border: 'none',
                  background: statusFilter === f.id ? 'var(--accent-btn-bg)' : 'transparent',
                  color: statusFilter === f.id ? 'var(--accent-btn-text)' : 'var(--text-secondary)',
                  transition: 'var(--transition-fast)'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Data Table */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Business Entity</th>
                <th>Mobile</th>
                <th>Type</th>
                <th>Status</th>
                <th>Next Follow-up</th>
                <th style={{ textAlign: 'center', width: '130px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={5} cols={7} />
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <CustomersIcon size={32} color="var(--text-disabled)" />
                      <p style={{ fontSize: '14px', fontWeight: 600 }}>No matching customer records found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                customers.map(c => (
                  <tr key={c.id} className="clickable" onClick={() => navigate(`/customers/${c.id}`)}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{c.business_name || '—'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{c.mobile}</td>
                    <td><StatusBadge status="info" label={c.customer_type} /></td>
                    <td><StatusBadge status={c.status} label={getSuspendedLabel(c)} /></td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '12.5px' }}>
                      {c.follow_up_date ? new Date(c.follow_up_date).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—'}
                    </td>
                    
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
                        {isAdmin && (
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
                        )}

                        {/* 🔴 Delete SVG Only */}
                        {isAdmin && (
                          <button
                            type="button"
                            className="table-action-icon-btn"
                            title="Permanently Delete Customer"
                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(c); }}
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
                Showing {Math.min((page - 1) * limit + 1, total)}–{Math.min(page * limit, total)} of {total} records
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
                <button className="btn btn-secondary btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
              </div>
            </div>
          )}
        </div>

        {/* Add Customer Glass Modal with Downside Field-Level Errors */}
        {showModal && (
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
            <div className="modal" style={{ maxWidth: '620px' }}>
              <div className="modal-header">
                <div>
                  <h2 className="modal-title">Add New Customer</h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Fill in customer details and optionally generate portal login credentials.
                  </p>
                </div>
                <button className="modal-close" onClick={() => setShowModal(false)}>
                  <CrossIcon size={16} />
                </button>
              </div>
              <form onSubmit={handleCreate}>
                <div className="modal-body">
                  <div className="form-grid">
                    
                    {/* Contact Name */}
                    <div className="form-group">
                      <label className="form-label">Contact Name *</label>
                      <input
                        className={`input ${fieldErrors.name ? 'input-error' : ''}`}
                        value={form.name}
                        onChange={e => {
                          setForm(f => ({ ...f, name: e.target.value }));
                          if (fieldErrors.name) setFieldErrors(err => ({ ...err, name: '' }));
                        }}
                        placeholder="e.g. John Doe"
                      />
                      {fieldErrors.name && (
                        <p style={{ fontSize: '12px', color: 'var(--status-danger)', marginTop: '4px', fontWeight: 500 }}>
                          {fieldErrors.name}
                        </p>
                      )}
                    </div>

                    {/* Mobile Number */}
                    <div className="form-group">
                      <label className="form-label">Mobile Number *</label>
                      <input
                        className={`input ${fieldErrors.mobile ? 'input-error' : ''}`}
                        type="tel"
                        maxLength={10}
                        value={form.mobile}
                        onChange={e => {
                          setForm(f => ({ ...f, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }));
                          if (fieldErrors.mobile) setFieldErrors(err => ({ ...err, mobile: '' }));
                        }}
                        placeholder="e.g. 9876543210"
                      />
                      {fieldErrors.mobile ? (
                        <p style={{ fontSize: '12px', color: 'var(--status-danger)', marginTop: '4px', fontWeight: 500 }}>
                          {fieldErrors.mobile}
                        </p>
                      ) : (
                        <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          Mobile number must be at least 10 digits
                        </p>
                      )}
                    </div>

                    {/* Email Address (Compulsory) */}
                    <div className="form-group">
                      <label className="form-label">Email Address *</label>
                      <input
                        className={`input ${fieldErrors.email ? 'input-error' : ''}`}
                        type="email"
                        value={form.email}
                        onChange={e => {
                          setForm(f => ({ ...f, email: e.target.value }));
                          if (fieldErrors.email) setFieldErrors(err => ({ ...err, email: '' }));
                        }}
                        placeholder="e.g. john@company.com"
                      />
                      {fieldErrors.email && (
                        <p style={{ fontSize: '12px', color: 'var(--status-danger)', marginTop: '4px', fontWeight: 500 }}>
                          {fieldErrors.email}
                        </p>
                      )}
                    </div>

                    {/* Business Name (Compulsory) */}
                    <div className="form-group">
                      <label className="form-label">Business / Company Name *</label>
                      <input
                        className={`input ${fieldErrors.business_name ? 'input-error' : ''}`}
                        value={form.business_name}
                        onChange={e => {
                          setForm(f => ({ ...f, business_name: e.target.value }));
                          if (fieldErrors.business_name) setFieldErrors(err => ({ ...err, business_name: '' }));
                        }}
                        placeholder="e.g. Acme Logistics Pvt Ltd"
                      />
                      {fieldErrors.business_name && (
                        <p style={{ fontSize: '12px', color: 'var(--status-danger)', marginTop: '4px', fontWeight: 500 }}>
                          {fieldErrors.business_name}
                        </p>
                      )}
                    </div>

                    {/* GST Number (Compulsory) */}
                    <div className="form-group">
                      <label className="form-label">GST Number *</label>
                      <input
                        className={`input ${fieldErrors.gst_number ? 'input-error' : ''}`}
                        value={form.gst_number}
                        onChange={e => {
                          setForm(f => ({ ...f, gst_number: e.target.value }));
                          if (fieldErrors.gst_number) setFieldErrors(err => ({ ...err, gst_number: '' }));
                        }}
                        placeholder="e.g. 27AAAAA0000A1Z5"
                      />
                      {fieldErrors.gst_number && (
                        <p style={{ fontSize: '12px', color: 'var(--status-danger)', marginTop: '4px', fontWeight: 500 }}>
                          {fieldErrors.gst_number}
                        </p>
                      )}
                    </div>

                    {/* Customer Type */}
                    <div className="form-group">
                      <label className="form-label">Customer Type</label>
                      <select className="select" value={form.customer_type} onChange={e => setForm(f => ({ ...f, customer_type: e.target.value as any }))}>
                        <option value="Retail">Retail</option>
                        <option value="Wholesale">Wholesale</option>
                        <option value="Distributor">Distributor</option>
                      </select>
                    </div>

                    {/* Follow-up Date */}
                    <div className="form-group">
                      <label className="form-label">Follow-up Reminder Date</label>
                      <input
                        className="input"
                        type="date"
                        value={form.follow_up_date}
                        onChange={e => setForm(f => ({ ...f, follow_up_date: e.target.value }))}
                      />
                    </div>

                    {/* Address */}
                    <div className="form-group">
                      <label className="form-label">Billing Address</label>
                      <input className="input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Street, City, State, PIN" />
                    </div>

                  </div>

                  {/* Notes */}
                  <div className="form-group">
                    <label className="form-label">Initial Notes</label>
                    <textarea className="textarea" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Add key notes, requirements, or deal status..." />
                  </div>

                  {/* 🔑 Integrated User Credentials & Password Generation Section */}
                  {isAdmin && (
                    <div style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                      marginTop: '16px',
                      marginBottom: '16px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="checkbox"
                            id="create-creds-check"
                            checked={createCredentials}
                            onChange={e => setCreateCredentials(e.target.checked)}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                          <label htmlFor="create-creds-check" style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)', cursor: 'pointer' }}>
                            Also create a Portal Login Account for this person
                          </label>
                        </div>
                      </div>

                      {createCredentials && (
                        <div className="form-grid" style={{ marginTop: '12px' }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Login Password *</label>
                            <input
                              className={`input ${fieldErrors.password ? 'input-error' : ''}`}
                              type="text"
                              minLength={6}
                              placeholder="e.g. password123"
                              value={loginPassword}
                              onChange={e => {
                                setLoginPassword(e.target.value);
                                if (fieldErrors.password) setFieldErrors(err => ({ ...err, password: '' }));
                              }}
                            />
                            {fieldErrors.password ? (
                              <p style={{ fontSize: '12px', color: 'var(--status-danger)', marginTop: '4px', fontWeight: 500 }}>
                                {fieldErrors.password}
                              </p>
                            ) : (
                              <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                Password must be at least 6 characters
                              </p>
                            )}
                          </div>

                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Assigned System Role *</label>
                            <select className="select" value={loginRole} onChange={e => setLoginRole(e.target.value as any)}>
                              <option value="Sales">Sales</option>
                              <option value="Accounts">Accounts</option>
                              <option value="Warehouse">Warehouse</option>
                              <option value="Admin">Admin</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Create Customer'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Admin Suspend Customer Options Modal */}
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

        {/* Admin Delete Confirmation Modal */}
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
